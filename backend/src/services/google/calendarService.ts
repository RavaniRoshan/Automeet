import { google } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import GoogleAuthService from './googleAuthService';

interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
  timezone?: string;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet' | 'addOn';
      };
    };
  };
}

interface CalendarSyncResult {
  created: number;
  updated: number;
  deleted: number;
}

class CalendarService {
  private supabase: SupabaseClient;
  private googleAuth: GoogleAuthService;

  constructor(supabaseClient: SupabaseClient, googleAuthService: GoogleAuthService) {
    this.supabase = supabaseClient;
    this.googleAuth = googleAuthService;
  }

  /**
   * Creates a calendar event with optional Google Meet
   */
  async createEvent(userId: string, event: CalendarEvent): Promise<string> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Prepare the event data
      const eventData: any = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: event.start.toISOString(),
          timeZone: event.timezone || 'UTC'
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: event.timezone || 'UTC'
        },
        attendees: event.attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 10 }       // 10 minutes before
          ]
        }
      };

      // Add conference data if requested (for Google Meet)
      if (event.conferenceData) {
        eventData.conferenceData = event.conferenceData;
        eventData.hangoutLink = null; // Will be populated by Google
      }

      // Get the user's calendar settings to determine which calendar to use
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Create the event
      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: eventData,
        conferenceDataVersion: event.conferenceData ? 1 : 0
      });

      // Update the meeting record in our database with the Google event ID
      // First, find if this event corresponds to a meeting in our system
      const { data: meetings, error: meetingError } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('scheduled_time', event.start.toISOString())
        .eq('user_id', userId); // Assuming we have a user_id column or can join properly

      if (meetings && meetings.length > 0) {
        // Update the meeting with the Google event ID and meeting link
        for (const meeting of meetings) {
          await this.supabase
            .from('meetings')
            .update({
              google_event_id: response.data.id,
              meeting_link: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri
            })
            .eq('id', meeting.id);
        }
      }

      console.log(`Event created successfully with ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Updates an existing calendar event
   */
  async updateEvent(userId: string, eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Get the user's calendar ID
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Prepare the update data
      const updateData: any = {};
      if (event.title) updateData.summary = event.title;
      if (event.description) updateData.description = event.description;
      if (event.start) {
        updateData.start = {
          dateTime: event.start.toISOString(),
          timeZone: event.timezone || 'UTC'
        };
      }
      if (event.end) {
        updateData.end = {
          dateTime: event.end.toISOString(),
          timeZone: event.timezone || 'UTC'
        };
      }
      if (event.attendees) {
        updateData.attendees = event.attendees.map(email => ({ email }));
      }

      // Update the event
      await calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: updateData
      });

      console.log(`Event updated successfully: ${eventId}`);
    } catch (error) {
      console.error(`Error updating event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a calendar event
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Get the user's calendar ID
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Delete the event
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });

      // Update our local meeting record
      await this.supabase
        .from('meetings')
        .update({ 
          status: 'cancelled',
          google_event_id: null 
        })
        .eq('google_event_id', eventId);

      console.log(`Event deleted successfully: ${eventId}`);
    } catch (error) {
      console.error(`Error deleting event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Gets events within a specific time range
   */
  async getEvents(userId: string, timeMin: Date, timeMax: Date): Promise<any[]> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Get the user's calendar ID
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using primary calendar`);
      }

      // Get events in the specified time range
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      console.log(`Retrieved ${response.data.items?.length || 0} events`);
      return response.data.items || [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  }

  /**
   * Checks user's availability within a time range
   */
  async checkAvailability(userId: string, timeMin: Date, timeMax: Date): Promise<any[]> {
    try {
      // Ensure the user's credentials are set
      await this.googleAuth.setCredentials(userId);

      // Create the Calendar API instance
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth.getOAuth2Client() });

      // Get user's calendar ID
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id, timezone')
        .eq('user_id', userId)
        .single();

      const calendarId = userSettings?.calendar_id || 'primary';
      const timezone = userSettings?.timezone || 'UTC';

      if (settingsError) {
        console.warn(`Could not retrieve calendar settings for user ${userId}, using defaults`);
      }

      // First, get the user's calendar list to make sure we have the right calendar
      const calendarList = await calendar.calendarList.list();
      const userCalendar = calendarList.data.items?.find(cal => cal.id === calendarId);

      if (!userCalendar) {
        throw new Error(`Calendar with ID ${calendarId} not found for user ${userId}`);
      }

      // Get busy times using the freebusy API
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: calendarId }]
        }
      });

      const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
      return busyTimes;
    } catch (error) {
      console.error('Error checking calendar availability:', error);
      throw error;
    }
  }

  /**
   * Gets user's working hours based on availability rules
   */
  async getUserWorkingHours(userId: string, dayOfWeek: number): Promise<{ start: string; end: string } | null> {
    try {
      // Get user's availability rules from the database
      const { data: availabilityRules, error } = await this.supabase
        .from('availability_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`Error getting availability rules for user ${userId} and day ${dayOfWeek}:`, error);
        return null;
      }

      if (!availabilityRules) {
        console.log(`No availability rule found for user ${userId} on day ${dayOfWeek}`);
        return null;
      }

      return {
        start: availabilityRules.start_time,
        end: availabilityRules.end_time
      };
    } catch (error) {
      console.error(`Error in getUserWorkingHours for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Syncs calendar events with our local database
   */
  async syncCalendar(userId: string): Promise<CalendarSyncResult> {
    try {
      const result: CalendarSyncResult = {
        created: 0,
        updated: 0,
        deleted: 0
      };

      // Get events from Google Calendar for the past week and next 3 months
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 7); // Past week
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // Next 3 months

      const googleEvents = await this.getEvents(userId, timeMin, timeMax);

      // Sync each event with our local meetings table
      for (const event of googleEvents) {
        if (event.source?.title === 'AutoMeet') {
          // This is an event we created, so sync it to our meetings table
          await this.syncEventToMeeting(userId, event);
          result.updated++;
        }
      }

      // Update the last sync timestamp
      await this.supabase
        .from('user_calendar_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId);

      console.log(`Calendar sync completed for user ${userId}: ${result.updated} events processed`);
      return result;
    } catch (error) {
      console.error(`Error syncing calendar for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Syncs a Google Calendar event to our local meeting record
   */
  private async syncEventToMeeting(userId: string, event: any): Promise<void> {
    try {
      // Find if we have a matching meeting in our system
      const { data: existingMeeting, error } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('google_event_id', event.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error(`Error checking for existing meeting for event ${event.id}:`, error);
        return;
      }

      if (existingMeeting) {
        // Update existing meeting
        await this.supabase
          .from('meetings')
          .update({
            title: event.summary,
            description: event.description,
            scheduled_time: event.start?.dateTime || event.start?.date,
            meeting_link: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri
          })
          .eq('id', existingMeeting.id);
      } else {
        // Create new meeting record
        // First, try to find the campaign and prospect associated with this meeting
        // This would require matching based on event title, attendees, or some other identifier
        await this.supabase
          .from('meetings')
          .insert({
            google_event_id: event.id,
            title: event.summary,
            description: event.description,
            scheduled_time: event.start?.dateTime || event.start?.date,
            meeting_link: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
            status: 'confirmed'
          });
      }
    } catch (error) {
      console.error(`Error syncing event ${event.id} to meeting:`, error);
      throw error;
    }
  }
}

export default CalendarService;