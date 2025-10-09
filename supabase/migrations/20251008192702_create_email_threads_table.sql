/*
  # Create email_threads table for AutoMeet

  ## Overview
  Creates the email_threads table to track ongoing email conversations with prospects,
  including thread metadata and sentiment analysis.

  ## New Tables

  ### 1. email_threads
  - `id` (uuid, primary key) - Unique identifier for each email thread
  - `prospect_id` (uuid, foreign key) - Reference to prospects table
  - `campaign_id` (uuid, foreign key) - Reference to campaigns table
  - `thread_id` (text) - Gmail thread ID to track conversation threads
  - `subject` (text) - Email subject line
  - `last_message_body` (text) - Content of the most recent message
  - `sent_at` (timestamptz) - When the last message was sent
  - `last_reply_at` (timestamptz) - When the last reply was received
  - `reply_count` (integer) - Number of replies in the thread
  - `sentiment` (text) - Sentiment of the conversation: 'positive', 'negative', 'neutral', 'booking_intent'
  - `is_active` (boolean) - Whether the thread is still active for follow-up
  - `created_at` (timestamptz) - When the thread was created
  - `updated_at` (timestamptz) - When the thread was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access email threads from their own campaigns/prospects
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on prospect_id, campaign_id, thread_id, and sentiment
  - Index on created_at for chronological ordering
*/

-- Create email_threads table
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  thread_id text NOT NULL,
  subject text,
  last_message_body text,
  sent_at timestamptz,
  last_reply_at timestamptz,
  reply_count integer DEFAULT 0,
  sentiment text DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral', 'booking_intent')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_threads_prospect_id ON email_threads(prospect_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_campaign_id ON email_threads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_sentiment ON email_threads(sentiment);
CREATE INDEX IF NOT EXISTS idx_email_threads_is_active ON email_threads(is_active);
CREATE INDEX IF NOT EXISTS idx_email_threads_created_at ON email_threads(created_at);

-- Enable Row Level Security
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

-- Email threads policies - Users can access threads from their campaigns
CREATE POLICY "Users can view email threads from own campaigns"
  ON email_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_threads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create email threads for own campaigns"
  ON email_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_threads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update email threads from own campaigns"
  ON email_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_threads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_threads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete email threads from own campaigns"
  ON email_threads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_threads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Function to update email_threads.updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update email thread timestamp when updated
CREATE TRIGGER update_email_thread_timestamp
  BEFORE UPDATE ON email_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_email_thread_timestamp();