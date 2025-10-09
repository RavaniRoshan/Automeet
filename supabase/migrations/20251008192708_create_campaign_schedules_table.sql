/*
  # Create campaign_schedules table for AutoMeet

  ## Overview
  Creates the campaign_schedules table to track scheduled campaign execution times
  and execution status for automated campaign launching.

  ## New Tables

  ### 1. campaign_schedules
  - `id` (uuid, primary key) - Unique identifier for each schedule entry
  - `campaign_id` (uuid, foreign key) - Reference to campaigns table
  - `execution_date` (date) - Date when the campaign should execute
  - `execution_time` (time) - Time when the campaign should execute
  - `status` (text) - Execution status: 'pending', 'processing', 'completed', 'failed'
  - `last_checked_at` (timestamptz) - When the scheduler last checked this entry
  - `executed_at` (timestamptz) - When the execution actually happened
  - `error_message` (text) - Error details if execution failed
  - `created_at` (timestamptz) - When the schedule was created
  - `updated_at` (timestamptz) - When the schedule was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access schedules for their own campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on campaign_id, execution_date, execution_time, and status
  - Index on created_at for chronological ordering
*/

-- Create campaign_schedules table
CREATE TABLE IF NOT EXISTS campaign_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  execution_date date NOT NULL,
  execution_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_checked_at timestamptz,
  executed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_campaign_id ON campaign_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_execution_date ON campaign_schedules(execution_date);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_execution_time ON campaign_schedules(execution_time);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_status ON campaign_schedules(status);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_execution_datetime ON campaign_schedules(execution_date, execution_time);

-- Enable Row Level Security
ALTER TABLE campaign_schedules ENABLE ROW LEVEL SECURITY;

-- Campaign schedules policies - Users can access schedules for their campaigns
CREATE POLICY "Users can view schedules for own campaigns"
  ON campaign_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_schedules.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create schedules for own campaigns"
  ON campaign_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_schedules.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedules for own campaigns"
  ON campaign_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_schedules.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_schedules.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete schedules for own campaigns"
  ON campaign_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_schedules.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Function to update campaign_schedules.updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign schedule timestamp when updated
CREATE TRIGGER update_campaign_schedule_timestamp
  BEFORE UPDATE ON campaign_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_schedule_timestamp();