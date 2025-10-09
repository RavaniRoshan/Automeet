/*
  # Create outreach_sequences table for AutoMeet

  ## Overview
  Creates the outreach_sequences table to define the email sequence for each campaign,
  including timing, templates, and trigger conditions.

  ## New Tables

  ### 1. outreach_sequences
  - `id` (uuid, primary key) - Unique identifier for each sequence step
  - `campaign_id` (uuid, foreign key) - Reference to campaigns table
  - `step_number` (integer) - Order of the sequence step (1, 2, 3, etc.)
  - `delay_days` (integer) - Number of days to wait before sending this step
  - `email_template` (text) - Email template content for this step
  - `trigger_condition` (jsonb) - JSON containing conditions for triggering this step
  - `is_active` (boolean) - Whether this sequence step is active
  - `created_at` (timestamptz) - When the sequence step was created
  - `updated_at` (timestamptz) - When the sequence step was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access sequences from their own campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on campaign_id, step_number, and is_active
  - Index on created_at for chronological ordering
*/

-- Create outreach_sequences table
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  step_number integer NOT NULL CHECK (step_number > 0),
  delay_days integer NOT NULL DEFAULT 0 CHECK (delay_days >= 0),
  email_template text NOT NULL,
  trigger_condition jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_campaign_id ON outreach_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_step_number ON outreach_sequences(step_number);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_is_active ON outreach_sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_campaign_step ON outreach_sequences(campaign_id, step_number);

-- Enable Row Level Security
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

-- Outreach sequences policies - Users can access sequences from their campaigns
CREATE POLICY "Users can view outreach sequences from own campaigns"
  ON outreach_sequences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = outreach_sequences.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create outreach sequences for own campaigns"
  ON outreach_sequences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = outreach_sequences.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update outreach sequences from own campaigns"
  ON outreach_sequences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = outreach_sequences.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = outreach_sequences.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outreach sequences from own campaigns"
  ON outreach_sequences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = outreach_sequences.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Function to update outreach_sequences.updated_at timestamp
CREATE OR REPLACE FUNCTION update_outreach_sequence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update outreach sequence timestamp when updated
CREATE TRIGGER update_outreach_sequence_timestamp
  BEFORE UPDATE ON outreach_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_sequence_timestamp();