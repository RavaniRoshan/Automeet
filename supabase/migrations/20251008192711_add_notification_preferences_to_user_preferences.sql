/*
  # Extend user_preferences table with notification preferences

  ## Overview
  Adds notification preference columns to the existing user_preferences table
  to allow users to customize alert timing and channels for AutoMeet campaigns.

  ## Changes to user_preferences table
  - `notification_enabled` (boolean) - Whether notifications are enabled
  - `email_notifications` (boolean) - Whether to receive email notifications
  - `preferred_notification_time_start` (time) - Start of preferred notification window
  - `preferred_notification_time_end` (time) - End of preferred notification window
  - `timezone` (text) - User's timezone for scheduling notifications
  - `campaign_start_notification_hours` (integer) - Hours before campaign start to send notification
  - `meeting_reminder_hours` (integer) - Hours before meeting to send reminder
  - `reply_notification_enabled` (boolean) - Whether to get notifications on prospect replies
  - `meeting_request_notification_enabled` (boolean) - Whether to get notifications for meeting requests
  - `updated_at` (timestamptz) - When the preferences were last updated

  ## Security
  - Uses existing Row Level Security policies from user_preferences table
  - Users can only access and modify their own preferences
*/

-- Add notification preference columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_notification_time_start TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS preferred_notification_time_end TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS campaign_start_notification_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS meeting_reminder_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS reply_notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS meeting_request_notification_enabled BOOLEAN DEFAULT true;