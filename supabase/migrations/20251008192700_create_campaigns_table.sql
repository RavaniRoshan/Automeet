/*
  # Create campaigns table for AutoMeet

  ## Overview
  Creates the campaigns table to manage marketing campaigns with scheduling, status tracking,
  and performance metrics.

  ## New Tables

  ### 1. campaigns
  - `id` (uuid, primary key) - Unique identifier for each campaign
  - `user_id` (uuid, foreign key) - Reference to auth.users who owns the campaign
  - `name` (text) - Campaign name/title
  - `goal_description` (text) - Description of the campaign's goal
  - `target_criteria` (jsonb) - JSON containing targeting criteria (industry, company size, etc.)
  - `status` (text) - Campaign status: 'draft', 'scheduled', 'active', 'paused', 'completed'
  - `scheduled_start_time` (timestamptz) - When the campaign should start executing
  - `notification_sent` (boolean) - Whether start notification was sent to user
  - `performance_metrics` (jsonb) - JSON containing real-time performance metrics
  - `created_at` (timestamptz) - When campaign was created
  - `updated_at` (timestamptz) - When campaign was last updated
  - `started_at` (timestamptz) - When campaign was first activated
  - `completed_at` (timestamptz) - When campaign was completed

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access their own campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on user_id, status, and scheduled_start_time
  - Index on created_at for chronological ordering
*/

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  goal_description text,
  target_criteria jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  scheduled_start_time timestamptz,
  notification_sent boolean DEFAULT false,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  started_at timestamptz,
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_start_time ON campaigns(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update campaigns.updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign timestamp when updated
CREATE TRIGGER update_campaign_timestamp
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_timestamp();