/*
  # Create notification_queue table for AutoMeet

  ## Overview
  Creates the notification_queue table to manage scheduled notifications
  for users (campaign alerts, meeting reminders, etc.).

  ## New Tables

  ### 1. notification_queue
  - `id` (uuid, primary key) - Unique identifier for each notification
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `notification_type` (text) - Type of notification: 'campaign_start', 'meeting_reminder', 'reply_received', etc.
  - `message` (text) - Notification message content
  - `scheduled_for` (timestamptz) - When the notification should be sent
  - `sent_at` (timestamptz) - When the notification was actually sent
  - `delivery_status` (text) - Status: 'pending', 'sent', 'failed', 'cancelled'
  - `priority` (integer) - Priority level (1-5, where 5 is highest)
  - `metadata` (jsonb) - Additional metadata for the notification
  - `created_at` (timestamptz) - When the notification was queued
  - `updated_at` (timestamptz) - When the notification was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access their own notifications
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on user_id, scheduled_for, delivery_status, and priority
  - Index on created_at for chronological ordering
*/

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'cancelled')),
  priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_delivery_status ON notification_queue(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at);

-- Enable Row Level Security
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Notification queue policies - Users can only access their own notifications
CREATE POLICY "Users can view own notification queue entries"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notification queue entries"
  ON notification_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification queue entries"
  ON notification_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update notification_queue.updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update notification queue timestamp when updated
CREATE TRIGGER update_notification_queue_timestamp
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_queue_timestamp();