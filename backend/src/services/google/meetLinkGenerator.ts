import { google } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import GoogleAuthService from './googleAuthService';
import CalendarService from './calendarService';

interface MeetingConfig {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[]; // Email addresses
  timezone?: string;
  createMeetLink: boolean;
}

interface CreatedMeeting {
  eventId: string;
  meetLink?: string;
  calendarLink: string;
}

class MeetLinkGenerator {
  private supabase: SupabaseClient;
  private googleAuth: GoogleAuthService;
  private calendarService: CalendarService;

  constructor(
    supabaseClient: SupabaseClient, 
    googleAuthService: GoogleAuthService,
    calendarService: CalendarService
  ) {
    this.supabase = supabaseClient;
    this.googleAuth = googleAuthService;
    this.calendarService = calendarService;
  }

  /**
   * Creates a calendar event with an attached Google Meet link
   */
  async createMeetingWithMeetLink(userId: string, config: MeetingConfig): Promise<CreatedMeeting> {
    try {
      console.log(`Creating meeting with Google Meet link for user ${userId}`);

      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Prepare the event data with conference data for Google Meet
      const eventData: any = {
        summary: config.title,
        description: config.description || '',
        start: {
          dateTime: config.startTime.toISOString(),
          timeZone: config.timezone || 'UTC'
        },
        end: {
          dateTime: config.endTime.toISOString(),
          timeZone: config.timezone || 'UTC'
        },
        attendees: config.attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 10 }       // 10 minutes before
          ]
        }
      };

      // Add conference data to create a Google Meet link
      if (config.createMeetLink) {
        eventData.conferenceData = {
          createRequest: {
            requestId: `automeet-${Date.now()}`, // Unique request ID
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      // Get the user's calendar settings
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Create the event with Google Meet
      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: eventData,
        conferenceDataVersion: config.createMeetLink ? 1 : 0 // Include conference data if requested
      });

      const eventId = response.data.id;
      const meetLink = response.data.hangoutLink 
        || response.data.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === 'video'
        )?.uri;

      // Create a Google Calendar link for the event
      const calendarLink = `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(
        btoa(eventId).replace(/=+$/, '') // URL-safe base64 encode without padding
      )}&ctz=${encodeURIComponent(config.timezone || 'UTC')}`;

      console.log(`Meeting created successfully with ID: ${eventId}`);
      
      return {
        eventId,
        meetLink,
        calendarLink
      };
    } catch (error) {
      console.error('Error creating meeting with Google Meet link:', error);
      throw error;
    }
  }

  /**
   * Creates just a Google Meet link without adding to calendar (for embedding in emails)
   */
  async createMeetLinkOnly(userId: string, requestId?: string): Promise<string> {
    try {
      console.log(`Creating Google Meet link for user ${userId}`);

      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // To create a standalone Meet link, we need to create a temporary calendar event
      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Create a temporary event just to get the Meet link
      const tempEvent = {
        summary: 'Temporary Meet Link',
        description: 'Temporary event to generate Meet link',
        start: {
          dateTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes from now
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes from now
          timeZone: 'UTC'
        },
        conferenceData: {
          createRequest: {
            requestId: requestId || `automeet-temp-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      // Get the user's calendar settings
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Create the temporary event
      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: tempEvent,
        conferenceDataVersion: 1
      });

      const meetLink = response.data.hangoutLink 
        || response.data.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === 'video'
        )?.uri;

      // Delete the temporary event immediately
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: response.data.id
      });

      console.log(`Temporary Meet link generated: ${meetLink}`);
      return meetLink || '';
    } catch (error) {
      console.error('Error creating Google Meet link:', error);
      throw error;
    }
  }

  /**
   * Adds a Google Meet link to an existing calendar event
   */
  async addMeetLinkToEvent(userId: string, eventId: string): Promise<string> {
    try {
      console.log(`Adding Google Meet link to event ${eventId} for user ${userId}`);

      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Get the user's calendar settings
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Get the existing event
      const existingEvent = await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });

      // Update the event to add conference data
      const updatedEvent = await calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: {
          ...existingEvent.data,
          conferenceData: {
            createRequest: {
              requestId: `automeet-${eventId}-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        },
        conferenceDataVersion: 1
      });

      const meetLink = updatedEvent.data.hangoutLink 
        || updatedEvent.data.conferenceData?.entryPoints?.find(
          (ep: any) => ep.entryPointType === 'video'
        )?.uri;

      console.log(`Google Meet link added to event ${eventId}: ${meetLink}`);
      return meetLink || '';
    } catch (error) {
      console.error(`Error adding Meet link to event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a calendar event with Meet link and returns details for email inclusion
   */
  async createMeetingForEmail(userId: string, config: MeetingConfig): Promise<{
    calendarEventId: string;
    meetLink: string;
    icalContent: string;
    calendarLink: string;
  }> {
    try {
      // Create the meeting with Meet link
      const createdMeeting = await this.createMeetingWithMeetLink(userId, config);

      // Generate iCalendar content for email attachment
      const icalContent = this.generateICalContent(
        config.title,
        config.description || '',
        config.startTime,
        config.endTime,
        config.attendees,
        createdMeeting.calendarLink,
        createdMeeting.meetLink
      );

      return {
        ...createdMeeting,
        icalContent
      };
    } catch (error) {
      console.error('Error creating meeting for email:', error);
      throw error;
    }
  }

  /**
   * Generates iCalendar content for email attachments
   */
  private generateICalContent(
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    attendees: string[],
    eventLink: string,
    meetLink?: string
  ): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.[0-9]+Z$/, 'Z');
    };

    const attendeesList = attendees
      .map(email => `ATTENDEE;CN=${email};ROLE=REQ-PARTICIPANT:mailto:${email}`)
      .join('\\n');

    const meetLinkSection = meetLink 
      ? `CONFERENCE;VALUE=URI:${meetLink}\\n` 
      : '';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:AutoMeet
METHOD:REQUEST
BEGIN:VEVENT
UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${title}
DESCRIPTION:${description}
${meetLinkSection}
ORGANIZER:mailto:organizer@example.com
${attendeesList}
LOCATION:Google Meet
URL:${eventLink}
END:VEVENT
END:VCALENDAR`;
  }
}

export default MeetLinkGenerator;