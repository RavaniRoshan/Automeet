/*
  # AI Chat Application Schema

  ## Overview
  Creates comprehensive database schema for AI-powered chat application with Gemini 2.5 Pro.
  
  ## New Tables
  
  ### 1. conversations
  - `id` (uuid, primary key) - Unique conversation identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `title` (text) - Conversation title (auto-generated or user-set)
  - `model` (text) - AI model used (e.g., "gemini-2.5-pro")
  - `system_prompt` (text) - Optional system instructions for the AI
  - `temperature` (decimal) - AI temperature parameter (0.0-1.0)
  - `max_tokens` (integer) - Maximum tokens per response
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last activity timestamp
  - `is_archived` (boolean) - Archive status
  
  ### 2. messages
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - Reference to conversations
  - `role` (text) - Message role: 'user' or 'assistant'
  - `content` (text) - Message content
  - `tokens_used` (integer) - Token count for this message
  - `metadata` (jsonb) - Additional metadata (timing, etc.)
  - `created_at` (timestamptz) - Message timestamp
  
  ### 3. user_preferences
  - `user_id` (uuid, primary key, foreign key) - Reference to auth.users
  - `default_model` (text) - Preferred AI model
  - `default_temperature` (decimal) - Preferred temperature setting
  - `default_max_tokens` (integer) - Preferred max tokens
  - `default_system_prompt` (text) - User's default system prompt
  - `theme_preference` (text) - UI theme preference
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 4. usage_metrics
  - `id` (uuid, primary key) - Unique metric entry
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `conversation_id` (uuid, foreign key) - Reference to conversations
  - `tokens_input` (integer) - Input tokens count
  - `tokens_output` (integer) - Output tokens count
  - `api_calls` (integer) - Number of API calls
  - `response_time_ms` (integer) - Response time in milliseconds
  - `error_occurred` (boolean) - Whether an error occurred
  - `error_message` (text) - Error details if any
  - `created_at` (timestamptz) - Metric timestamp
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
  - Secure policies for select, insert, update, and delete operations
  
  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
  - Index on conversation updated_at for sorting
  - Index on messages conversation_id for fast retrieval
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'New Conversation',
  model text NOT NULL DEFAULT 'gemini-2.5-pro',
  system_prompt text,
  temperature decimal(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  max_tokens integer DEFAULT 2048 CHECK (max_tokens > 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  is_archived boolean DEFAULT false NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  tokens_used integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_model text DEFAULT 'gemini-2.5-pro',
  default_temperature decimal(3,2) DEFAULT 0.7 CHECK (default_temperature >= 0 AND default_temperature <= 1),
  default_max_tokens integer DEFAULT 2048 CHECK (default_max_tokens > 0),
  default_system_prompt text,
  theme_preference text DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create usage_metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  api_calls integer DEFAULT 1,
  response_time_ms integer DEFAULT 0,
  error_occurred boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_archived ON conversations(user_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_created_at ON usage_metrics(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in own conversations"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in own conversations"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usage metrics policies
CREATE POLICY "Users can view own usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own usage metrics"
  ON usage_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update conversations.updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when new message is added
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();