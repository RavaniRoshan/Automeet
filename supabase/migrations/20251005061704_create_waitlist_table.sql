/*
  # Create waitlist table for AutoMeet

  1. New Tables
    - `waitlist`
      - `id` (uuid, primary key) - Unique identifier for each waitlist entry
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `email` (text) - User email address
      - `full_name` (text) - User's full name
      - `company` (text, optional) - Company name
      - `role` (text, optional) - Job role/title
      - `created_at` (timestamptz) - When they joined waitlist
      - `notified` (boolean) - Whether they've been notified of access
      - `position` (integer) - Their position in the waitlist

  2. Security
    - Enable RLS on `waitlist` table
    - Add policy for authenticated users to read their own waitlist entry
    - Add policy for authenticated users to insert their own waitlist entry
*/

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  company text DEFAULT '',
  role text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  position integer,
  UNIQUE(user_id),
  UNIQUE(email)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waitlist entry"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own waitlist entry"
  ON waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);

CREATE OR REPLACE FUNCTION set_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position FROM waitlist;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_waitlist_position
  BEFORE INSERT ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION set_waitlist_position();
