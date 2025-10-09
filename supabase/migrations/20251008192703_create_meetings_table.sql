/*
  # Create meetings table for AutoMeet

  ## Overview
  Creates the meetings table to store scheduled meetings between users and prospects,
  including status tracking and Google Meet integration.

  ## New Tables

  ### 1. meetings
  - `id` (uuid, primary key) - Unique identifier for each meeting
  - `campaign_id` (uuid, foreign key) - Reference to campaigns table
  - `prospect_id` (uuid, foreign key) - Reference to prospects table
  - `title` (text) - Meeting title
  - `description` (text) - Meeting description
  - `scheduled_time` (timestamptz) - When the meeting is scheduled
  - `duration_minutes` (integer) - Duration of the meeting in minutes
  - `meeting_link` (text) - Google Meet link for the meeting
  - `status` (text) - Meeting status: 'proposed', 'confirmed', 'completed', 'cancelled', 'no_show'
  - `confirmation_method` (text) - How the meeting was confirmed: 'email', 'calendar', 'auto'
  - `attendee_emails` (text[]) - Array of attendee email addresses
  - `google_event_id` (text) - Google Calendar event ID
  - `created_at` (timestamptz) - When the meeting was created
  - `updated_at` (timestamptz) - When the meeting was last updated
  - `confirmed_at` (timestamptz) - When the meeting was confirmed
  - `completed_at` (timestamptz) - When the meeting was completed

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access meetings from their own campaigns/prospects
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on campaign_id, prospect_id, scheduled_time, and status
  - Index on created_at for chronological ordering
*/

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  meeting_link text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'cancelled', 'no_show')),
  confirmation_method text CHECK (confirmation_method IN ('email', 'calendar', 'auto')),
  attendee_emails text[] DEFAULT '{}',
  google_event_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  confirmed_at timestamptz,
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_campaign_id ON meetings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meetings_prospect_id ON meetings(prospect_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at);

-- Enable Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Meetings policies - Users can access meetings from their campaigns
CREATE POLICY "Users can view meetings from own campaigns"
  ON meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = meetings.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create meetings for own campaigns"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = meetings.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meetings from own campaigns"
  ON meetings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = meetings.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = meetings.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meetings from own campaigns"
  ON meetings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = meetings.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Function to update meetings.updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update meeting timestamp when updated
CREATE TRIGGER update_meeting_timestamp
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_timestamp();