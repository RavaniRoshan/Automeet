import { SupabaseClient } from '@supabase/supabase-js';

interface NotificationPreferences {
  notification_enabled?: boolean;
  email_notifications?: boolean;
  preferred_notification_time_start?: string; // in HH:MM:SS format
  preferred_notification_time_end?: string; // in HH:MM:SS format
  timezone?: string;
  campaign_start_notification_hours?: number;
  meeting_reminder_hours?: number;
  reply_notification_enabled?: boolean;
  meeting_request_notification_enabled?: boolean;
}

interface FullNotificationPreferences extends NotificationPreferences {
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gets a user's notification preferences
 */
export async function getUserNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<FullNotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error(`Error fetching notification preferences for user ${userId}:`, error);
      throw new Error(`Failed to fetch notification preferences: ${error.message}`);
    }

    // If no preferences exist, return defaults
    if (!data) {
      return createDefaultNotificationPreferences(userId);
    }

    // Return the existing preferences
    return {
      user_id: data.user_id,
      notification_enabled: data.notification_enabled ?? true,
      email_notifications: data.email_notifications ?? true,
      preferred_notification_time_start: data.preferred_notification_time_start ?? '09:00:00',
      preferred_notification_time_end: data.preferred_notification_time_end ?? '18:00:00',
      timezone: data.timezone ?? 'UTC',
      campaign_start_notification_hours: data.campaign_start_notification_hours ?? 24,
      meeting_reminder_hours: data.meeting_reminder_hours ?? 1,
      reply_notification_enabled: data.reply_notification_enabled ?? true,
      meeting_request_notification_enabled: data.meeting_request_notification_enabled ?? true,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error(`Error in getUserNotificationPreferences for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Updates a user's notification preferences
 */
export async function updateUserNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  preferences: NotificationPreferences
): Promise<FullNotificationPreferences> {
  try {
    // First, check if preferences already exist
    const { data: existing, error: fetchError } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // If there's an error other than "no rows found", throw it
      throw new Error(`Failed to fetch existing preferences: ${fetchError.message}`);
    }

    if (existing) {
      // If preferences exist, update them
      const { data, error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        console.error(`Error updating notification preferences for user ${userId}:`, error);
        throw new Error(`Failed to update notification preferences: ${error.message}`);
      }

      return data as FullNotificationPreferences;
    } else {
      // If preferences don't exist, insert them
      // Start with defaults and override with provided preferences
      const defaultPrefs = createDefaultNotificationPreferences(userId);
      const mergedPrefs = { ...defaultPrefs, ...preferences };
      
      // Remove the extra fields not in the DB schema
      const { user_id, created_at, updated_at, ...dbPrefs } = mergedPrefs;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...dbPrefs
        })
        .select('*')
        .single();

      if (error) {
        console.error(`Error inserting notification preferences for user ${userId}:`, error);
        throw new Error(`Failed to insert notification preferences: ${error.message}`);
      }

      // Return the created preferences with default values for missing fields
      return {
        user_id: data.user_id,
        notification_enabled: data.notification_enabled ?? true,
        email_notifications: data.email_notifications ?? true,
        preferred_notification_time_start: data.preferred_notification_time_start ?? '09:00:00',
        preferred_notification_time_end: data.preferred_notification_time_end ?? '18:00:00',
        timezone: data.timezone ?? 'UTC',
        campaign_start_notification_hours: data.campaign_start_notification_hours ?? 24,
        meeting_reminder_hours: data.meeting_reminder_hours ?? 1,
        reply_notification_enabled: data.reply_notification_enabled ?? true,
        meeting_request_notification_enabled: data.meeting_request_notification_enabled ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }
  } catch (error) {
    console.error(`Error in updateUserNotificationPreferences for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Checks if a notification should be sent based on user preferences and time
 */
export async function shouldSendNotification(
  supabase: SupabaseClient,
  userId: string,
  notificationType: string
): Promise<boolean> {
  try {
    const preferences = await getUserNotificationPreferences(supabase, userId);

    // Check if notifications are enabled globally
    if (!preferences.notification_enabled) {
      return false;
    }

    // Check if this specific notification type is enabled
    switch (notificationType) {
      case 'campaign_start':
        // No specific preference for campaign start, use general setting
        break;
      case 'meeting_reminder':
        // No specific preference for meeting reminder, use general setting
        break;
      case 'reply_received':
        if (!preferences.reply_notification_enabled) {
          return false;
        }
        break;
      case 'meeting_request':
        if (!preferences.meeting_request_notification_enabled) {
          return false;
        }
        break;
      default:
        // For unknown notification types, use general setting
        break;
    }

    // Check if notifications are enabled for the current time
    const now = new Date();
    
    // Convert to user's timezone for checking preferred hours
    // This is a simplified approach - in production, you'd need a more robust timezone conversion
    let userTime = now;
    if (preferences.timezone && preferences.timezone !== 'UTC') {
      // For simplicity, we'll just use the server time and assume user is in the same timezone
      // In a real app, you'd convert properly using timezone data
    }

    // Get the current hour in 24-hour format
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Parse preferred start and end times
    const [startHour, startMinute] = preferences.preferred_notification_time_start.split(':').map(Number);
    const [endHour, endMinute] = preferences.preferred_notification_time_end.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    // Check if current time is within preferred window
    if (startTimeInMinutes <= endTimeInMinutes) {
      // Normal case: start time is before end time (e.g., 9 AM to 6 PM)
      if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
        return false; // Outside preferred time window
      }
    } else {
      // Edge case: time window crosses midnight (e.g., 9 PM to 6 AM)
      if (currentTimeInMinutes < startTimeInMinutes && currentTimeInMinutes > endTimeInMinutes) {
        return false; // Outside preferred time window
      }
    }

    // All checks passed, notification can be sent
    return true;
  } catch (error) {
    console.error(`Error in shouldSendNotification for user ${userId}:`, error);
    // If there's an error checking preferences, default to allowing the notification
    return true;
  }
}

/**
 * Creates default notification preferences for a user
 */
function createDefaultNotificationPreferences(userId: string): FullNotificationPreferences {
  return {
    user_id: userId,
    notification_enabled: true,
    email_notifications: true,
    preferred_notification_time_start: '09:00:00',
    preferred_notification_time_end: '18:00:00',
    timezone: 'UTC',
    campaign_start_notification_hours: 24,
    meeting_reminder_hours: 1,
    reply_notification_enabled: true,
    meeting_request_notification_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Gets the preferred notification time for a specific notification type
 */
export async function getNotificationTiming(
  supabase: SupabaseClient,
  userId: string,
  notificationType: string
): Promise<number> {
  try {
    const preferences = await getUserNotificationPreferences(supabase, userId);

    switch (notificationType) {
      case 'campaign_start':
        return preferences.campaign_start_notification_hours;
      case 'meeting_reminder':
        return preferences.meeting_reminder_hours;
      default:
        // Default to 1 hour for other notification types
        return 1;
    }
  } catch (error) {
    console.error(`Error in getNotificationTiming for user ${userId}:`, error);
    // Default to 1 hour if there's an error
    return 1;
  }
}