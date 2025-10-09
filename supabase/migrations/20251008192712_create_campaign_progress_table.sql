/*
  # Create campaign_progress table for AutoMeet

  ## Overview
  Creates the campaign_progress table to track the current step and timing 
  for each prospect in a campaign sequence.

  ## New Tables

  ### 1. campaign_progress
  - `id` (uuid, primary key) - Unique identifier for each progress record
  - `campaign_id` (uuid, foreign key) - Reference to campaigns table
  - `prospect_id` (uuid, foreign key) - Reference to prospects table
  - `current_step` (integer) - The current step number in the sequence that has been sent
  - `last_sent_at` (timestamptz) - When the last email in the sequence was sent
  - `next_scheduled_at` (timestamptz) - When the next email is scheduled to be sent
  - `created_at` (timestamptz) - When the progress record was created
  - `updated_at` (timestamptz) - When the progress record was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access progress records from their own campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on campaign_id and prospect_id
  - Index on next_scheduled_at for scheduling queries
  - Composite index on campaign_id and prospect_id for lookups
*/

-- Create campaign_progress table
CREATE TABLE IF NOT EXISTS campaign_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE NOT NULL,
  current_step integer DEFAULT 0,
  last_sent_at timestamptz,
  next_scheduled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(campaign_id, prospect_id)  -- Each prospect can only have one progress record per campaign
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_progress_campaign_id ON campaign_progress(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_progress_prospect_id ON campaign_progress(prospect_id);
CREATE INDEX IF NOT EXISTS idx_campaign_progress_next_scheduled_at ON campaign_progress(next_scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_progress_campaign_prospect ON campaign_progress(campaign_id, prospect_id);

-- Enable Row Level Security
ALTER TABLE campaign_progress ENABLE ROW LEVEL SECURITY;

-- Campaign progress policies - Users can access progress for their campaigns
CREATE POLICY "Users can view campaign progress from own campaigns"
  ON campaign_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_progress.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create campaign progress for own campaigns"
  ON campaign_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_progress.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campaign progress for own campaigns"
  ON campaign_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_progress.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_progress.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaign progress for own campaigns"
  ON campaign_progress FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_progress.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Function to update campaign_progress.updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign progress timestamp when updated
CREATE TRIGGER update_campaign_progress_timestamp
  BEFORE UPDATE ON campaign_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_progress_timestamp();