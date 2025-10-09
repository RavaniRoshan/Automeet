/*
  # Create approval_requests table for AutoMeet

  ## Overview
  Creates the approval_requests table to manage meeting approval requests
  that require user confirmation before proceeding.

  ## New Tables

  ### 1. approval_requests
  - `id` (uuid, primary key) - Unique identifier for each approval request
  - `meeting_id` (uuid, foreign key) - Reference to meetings table
  - `request_type` (text) - Type of request: 'meeting_confirmation', 'reschedule'
  - `proposed_details` (jsonb) - JSON containing proposed meeting details
  - `approval_status` (text) - Status: 'pending', 'approved', 'rejected'
  - `requested_at` (timestamptz) - When the approval was requested
  - `responded_at` (timestamptz) - When the approval was responded to
  - `expires_at` (timestamptz) - When the approval request expires
  - `response_note` (text) - Optional note from user with response
  - `created_at` (timestamptz) - When the request was created
  - `updated_at` (timestamptz) - When the request was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access approval requests for their own meetings/campaigns
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on meeting_id, approval_status, and request_type
  - Index on created_at for chronological ordering
*/

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('meeting_confirmation', 'reschedule', 'cancellation')),
  proposed_details jsonb DEFAULT '{}'::jsonb,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz,
  expires_at timestamptz,
  response_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_meeting_id ON approval_requests(meeting_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approval_status ON approval_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_request_type ON approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_at ON approval_requests(requested_at);

-- Enable Row Level Security
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Approval requests policies - Users can access requests for their meetings
CREATE POLICY "Users can view approval requests for own meetings"
  ON approval_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = approval_requests.meeting_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = meetings.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create approval requests for own meetings"
  ON approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = approval_requests.meeting_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = meetings.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update approval requests for own meetings"
  ON approval_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = approval_requests.meeting_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = meetings.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = approval_requests.meeting_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = meetings.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete approval requests for own meetings"
  ON approval_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = approval_requests.meeting_id
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = meetings.campaign_id
        AND campaigns.user_id = auth.uid()
      )
    )
  );

-- Function to update approval_requests.updated_at timestamp
CREATE OR REPLACE FUNCTION update_approval_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update approval request timestamp when updated
CREATE TRIGGER update_approval_request_timestamp
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_request_timestamp();