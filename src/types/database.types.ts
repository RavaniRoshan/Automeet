export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  system_prompt: string | null;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
  default_system_prompt: string | null;
  theme_preference: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface UsageMetric {
  id: string;
  user_id: string;
  conversation_id: string | null;
  tokens_input: number;
  tokens_output: number;
  api_calls: number;
  response_time_ms: number;
  error_occurred: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationInput {
  title?: string;
  model?: string;
  system_prompt?: string | null;
  temperature?: number;
  max_tokens?: number;
}

export interface CreateMessageInput {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used?: number;
  metadata?: Record<string, any>;
}

export interface UpdateConversationInput {
  title?: string;
  system_prompt?: string | null;
  temperature?: number;
  max_tokens?: number;
  is_archived?: boolean;
}
