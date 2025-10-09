import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface CalendarWebhookPayload {
  channel_id: string;
  resource_id: string;
  resource_uri: string;
  token?: string;
  message_number: number;
}

interface CalendarNotification {
  kind: string;
  resourceUri: string;
  resourceId: string;
  channelToken?: string;
  expiration?: string;
}

class CalendarWebhookReceiver {
  private supabase: SupabaseClient;
  private webhookSecret: string;

  constructor(supabaseClient: SupabaseClient, webhookSecret: string) {
    this.supabase = supabaseClient;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Verifies the signature of an incoming webhook request
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Create a HMAC-SHA256 hash of the payload using the webhook secret
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare the provided signature with the expected signature
      // Using timing-attack-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Handles incoming Google Calendar webhook notifications
   */
  async handleWebhookNotification(userId: string, payload: CalendarWebhookPayload): Promise<void> {
    try {
      console.log(`Handling calendar webhook for user ${userId}:`, payload);

      // The actual calendar change details are not in the initial notification
      // We need to query the calendar to get the updated event information
      await this.processCalendarChanges(userId, payload);
    } catch (error) {
      console.error(`Error handling webhook for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Processes calendar changes based on webhook notification
   */
  private async processCalendarChanges(userId: string, payload: CalendarWebhookPayload): Promise<void> {
    try {
      // In a real implementation, we would:
      // 1. Use the resource_id to query the specific changes
      // 2. Check what events have changed since the last sync
      // 3. Update our local database accordingly
      
      // For now, we'll trigger a sync of the user's calendar
      // In a real system, you'd want to be more targeted about what to sync
      await this.syncUserCalendar(userId);
    } catch (error) {
      console.error(`Error processing calendar changes for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Syncs the user's calendar after a webhook notification
   */
  private async syncUserCalendar(userId: string): Promise<void> {
    try {
      // Get the user's calendar settings to determine which calendar to sync
      const { data: userSettings, error: settingsError } = await this.supabase
        .from('user_calendar_settings')
        .select('calendar_id, timezone')
        .eq('user_id', userId)
        .single();

      if (settingsError) {
        console.error(`Error fetching calendar settings for user ${userId}:`, settingsError);
        throw new Error(`Failed to get calendar settings: ${settingsError.message}`);
      }

      if (!userSettings) {
        throw new Error(`No calendar settings found for user ${userId}`);
      }

      // Calculate the time range to sync (e.g., past week to next 3 months)
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 7); // Past week
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // Next 3 months

      // In a real implementation, you would use the Google Calendar API
      // to list events in this time range and sync them to your database
      // This would require the GoogleAuthService and CalendarService
      
      console.log(`Calendar sync triggered for user ${userId} in range: ${timeMin} to ${timeMax}`);
      
      // Update the last sync timestamp
      await this.supabase
        .from('user_calendar_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error(`Error syncing calendar for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Registers a webhook channel for a user's calendar
   * This would typically be called when a user first connects their calendar
   */
  async registerWebhook(userId: string, calendarId: string = 'primary'): Promise<{
    channelId: string;
    resourceUri: string;
    expiration: string;
  }> {
    try {
      console.log(`Registering webhook for user ${userId}, calendar ${calendarId}`);

      // In a real implementation, you would:
      // 1. Call the Google Calendar API to watch the calendar
      // 2. Provide your webhook endpoint URL
      // 3. Get back a channel ID and resource ID to track changes
      
      // For this example, we'll return mock data
      // In a real system, you'd need to make an API call like:
      // const response = await calendar.events.watch({
      //   calendarId: calendarId,
      //   requestBody: {
      //     id: `automeet-${userId}-${Date.now()}`,
      //     type: 'web_hook',
      //     address: 'https://yourdomain.com/webhooks/google-calendar',
      //   }
      // });
      
      const channelId = `automeet-${userId}-${Date.now()}`;
      const resourceUri = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
      const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      // Store the webhook subscription in our database
      await this.supabase
        .from('user_calendar_settings')
        .update({
          calendar_id: calendarId,
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      console.log(`Webhook registered for user ${userId} with channel ID: ${channelId}`);

      return {
        channelId,
        resourceUri,
        expiration
      };
    } catch (error) {
      console.error(`Error registering webhook for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unregisters a webhook channel for a user
   */
  async unregisterWebhook(userId: string, channelId: string): Promise<void> {
    try {
      console.log(`Unregistering webhook for user ${userId}, channel ${channelId}`);

      // In a real implementation, you would:
      // 1. Call the Google Calendar API to stop watching the calendar
      // 2. Delete the subscription
      
      // For this example, we'll just log it
      console.log(`Webhook unregistered for user ${userId}`);
    } catch (error) {
      console.error(`Error unregistering webhook for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Updates our local meeting records when calendar events change
   */
  async updateMeetingsFromCalendarChanges(userId: string): Promise<void> {
    try {
      // This would be called after receiving a webhook notification
      // It would sync calendar events and update corresponding meeting records
      
      // Get all meetings associated with this user that have Google event IDs
      const { data: meetings, error: meetingsError } = await this.supabase
        .from('meetings')
        .select('*')
        .neq('google_event_id', null)
        .join('campaigns', 'meetings.campaign_id', 'campaigns.id')
        .eq('campaigns.user_id', userId);

      if (meetingsError) {
        console.error(`Error fetching meetings for user ${userId}:`, meetingsError);
        throw new Error(`Failed to fetch meetings: ${meetingsError.message}`);
      }

      if (!meetings || meetings.length === 0) {
        console.log(`No meetings with Google event IDs found for user ${userId}`);
        return;
      }

      // In a real implementation, you would fetch updated event details from Google Calendar
      // and update the local meeting records accordingly
      for (const meeting of meetings) {
        // Fetch the event from Google Calendar and update local record
        // This is a simplified example
        console.log(`Would update meeting ${meeting.id} based on Google event ${meeting.google_event_id}`);
      }
    } catch (error) {
      console.error(`Error updating meetings from calendar changes for user ${userId}:`, error);
      throw error;
    }
  }
}

export default CalendarWebhookReceiver;