/*
  # Create availability_rules table for AutoMeet

  ## Overview
  Creates the availability_rules table to define user availability preferences
  for scheduling meetings, including working hours and meeting limits.

  ## New Tables

  ### 1. availability_rules
  - `id` (uuid, primary key) - Unique identifier for each availability rule
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `day_of_week` (integer) - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  - `start_time` (time) - Start time of availability window
  - `end_time` (time) - End time of availability window
  - `buffer_minutes` (integer) - Buffer time before/after meetings
  - `max_meetings_per_day` (integer) - Maximum meetings allowed per day
  - `is_active` (boolean) - Whether this rule is currently active
  - `created_at` (timestamptz) - When the rule was created
  - `updated_at` (timestamptz) - When the rule was last updated

  ## Security
  - Row Level Security (RLS) enabled
  - Users can only access their own availability rules
  - Secure policies for select, insert, update, and delete operations

  ## Indexes
  - Performance indexes on user_id, day_of_week, and is_active
  - Index on created_at for chronological ordering
*/

-- Create availability_rules table
CREATE TABLE IF NOT EXISTS availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  buffer_minutes integer DEFAULT 15 CHECK (buffer_minutes >= 0),
  max_meetings_per_day integer DEFAULT 8 CHECK (max_meetings_per_day > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_rules_user_id ON availability_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_day_of_week ON availability_rules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_rules_is_active ON availability_rules(is_active);

-- Enable Row Level Security
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;

-- Availability rules policies - Users can only access their own rules
CREATE POLICY "Users can view own availability rules"
  ON availability_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own availability rules"
  ON availability_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability rules"
  ON availability_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability rules"
  ON availability_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update availability_rules.updated_at timestamp
CREATE OR REPLACE FUNCTION update_availability_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update availability rule timestamp when updated
CREATE TRIGGER update_availability_rule_timestamp
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_rule_timestamp();