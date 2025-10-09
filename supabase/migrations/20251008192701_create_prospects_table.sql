/*
  # Create prospects table for AutoMeet

  ## Overview
  Creates the prospects table to store contact information for campaign outreach,
  including engagement status and enrichment data.

  ## New Tables

  ### 1. prospects
  - `id` (uuid, primary key) - Unique identifier for each prospect
  - `campaign_id` (uuid, foreign key) - Reference to campaigns table
  - `company_name` (text) - Name of the prospect's company
  - `contact_name` (text) - Full name of the contact person
  - `email` (text) - Contact email address
  - `phone` (text) - Contact phone number
  - `job_title` (text) - Contact's job title
  - `industry` (text) - Industry of the prospect's company
  - `engagement_status` (text) - Status: 'new', 'contacted', 'replied', 'meeting_scheduled', 'completed'
  - `enrichment_data` (jsonb) - JSON containing additional data from enrichment services
  - `created_at` (timestamptz) - When prospect was added
  - `updated_at` (timestamptz) - When prospect was last updated
  - `last_contacted_at` (timestamptz) - When last contacted
  - `first_contacted_at` (timestamptz) - When first contacted

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access prospects from their own campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on campaign_id, email, and engagement_status
  - Index on created_at for chronological ordering
*/

-- Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  company_name text,
  contact_name text,
  email text,
  phone text,
  job_title text,
  industry text,
  engagement_status text NOT NULL DEFAULT 'new' CHECK (engagement_status IN ('new', 'contacted', 'replied', 'meeting_scheduled', 'completed')),
  enrichment_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_contacted_at timestamptz,
  first_contacted_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_engagement_status ON prospects(engagement_status);
CREATE INDEX IF NOT EXISTS idx_prospects_company_name ON prospects(company_name);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at);

-- Enable Row Level Security
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Prospects policies - Users can access prospects from their campaigns
CREATE POLICY "Users can view prospects from own campaigns"
  ON prospects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = prospects.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create prospects for own campaigns"
  ON prospects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = prospects.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update prospects from own campaigns"
  ON prospects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = prospects.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = prospects.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete prospects from own campaigns"
  ON prospects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = prospects.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Function to update prospects.updated_at timestamp
CREATE OR REPLACE FUNCTION update_prospect_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update prospect timestamp when updated
CREATE TRIGGER update_prospect_timestamp
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_timestamp();