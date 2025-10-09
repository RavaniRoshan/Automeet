/*
  # Create user_calendar_settings table for AutoMeet

  ## Overview
  Creates the user_calendar_settings table to store Google Calendar integration settings
  for each user including encrypted tokens and calendar preferences.

  ## New Tables

  ### 1. user_calendar_settings
  - `id` (uuid, primary key) - Unique identifier for each calendar setting record
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `google_access_token` (text) - Encrypted Google access token
  - `google_refresh_token` (text) - Encrypted Google refresh token
  - `calendar_id` (text) - Google Calendar ID to use
  - `timezone` (text) - User's timezone (e.g., 'America/New_York')
  - `sync_status` (text) - Status of calendar sync: 'active', 'paused', 'error'
  - `last_sync_at` (timestamptz) - When calendar was last synced
  - `created_at` (timestamptz) - When the settings were created
  - `updated_at` (timestamptz) - When the settings were last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access their own calendar settings
  - Tokens are stored encrypted (implementation to be handled by application layer)
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on user_id and sync_status
  - Index on created_at for chronological ordering
*/

-- Create user_calendar_settings table
CREATE TABLE IF NOT EXISTS user_calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_access_token text,  -- This should be encrypted by the application layer
  google_refresh_token text, -- This should be encrypted by the application layer
  calendar_id text DEFAULT 'primary',
  timezone text DEFAULT 'UTC',
  sync_status text DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error')),
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_calendar_settings_user_id ON user_calendar_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_settings_sync_status ON user_calendar_settings(sync_status);

-- Enable Row Level Security
ALTER TABLE user_calendar_settings ENABLE ROW LEVEL SECURITY;

-- User calendar settings policies - Users can only access their own settings
CREATE POLICY "Users can view own calendar settings"
  ON user_calendar_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar settings"
  ON user_calendar_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar settings"
  ON user_calendar_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar settings"
  ON user_calendar_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update user_calendar_settings.updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_calendar_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user calendar settings timestamp when updated
CREATE TRIGGER update_user_calendar_settings_timestamp
  BEFORE UPDATE ON user_calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_calendar_settings_timestamp();