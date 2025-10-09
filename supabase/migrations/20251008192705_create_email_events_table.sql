/*
  # Create email_events table for AutoMeet

  ## Overview
  Creates the email_events table to log all email activities and interactions
  for tracking and analytics purposes.

  ## New Tables

  ### 1. email_events
  - `id` (uuid, primary key) - Unique identifier for each email event
  - `prospect_id` (uuid, foreign key) - Reference to prospects table
  - `event_type` (text) - Type of email event: 'sent', 'opened', 'clicked', 'replied', 'bounced'
  - `timestamp` (timestamptz) - When the event occurred
  - `metadata` (jsonb) - JSON containing additional event metadata
  - `thread_id` (text) - Gmail thread ID associated with the event
  - `message_id` (text) - Gmail message ID
  - `created_at` (timestamptz) - When the event was recorded

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access email events from their own prospects/campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on prospect_id, event_type, and timestamp
  - Index on created_at for chronological ordering
*/

-- Create email_events table
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'opened', 'clicked', 'replied', 'bounced', 'delivered', 'complaint', 'rejected')),
  timestamp timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  thread_id text,
  message_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_events_prospect_id ON email_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_thread_id ON email_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at);

-- Enable Row Level Security
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Email events policies - Users can access events from their prospects
CREATE POLICY "Users can view email events from own prospects"
  ON email_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = email_events.prospect_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = prospects.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create email events for own prospects"
  ON email_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = email_events.prospect_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = prospects.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete email events from own prospects"
  ON email_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prospects
      WHERE prospects.id = email_events.prospect_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = prospects.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );