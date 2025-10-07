import { supabase } from '../lib/supabase';
import type {
  Conversation,
  Message,
  ConversationWithMessages,
  CreateConversationInput,
  CreateMessageInput,
  UpdateConversationInput,
  UsageMetric,
} from '../types/database.types';

export class ConversationService {
  static async getConversations(
    userId: string,
    includeArchived: boolean = false
  ): Promise<Conversation[]> {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error('Failed to fetch conversations');
    }

    return data || [];
  }

  static async getConversationWithMessages(
    conversationId: string
  ): Promise<ConversationWithMessages | null> {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      throw new Error('Failed to fetch conversation');
    }

    if (!conversation) return null;

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      throw new Error('Failed to fetch messages');
    }

    return {
      ...conversation,
      messages: messages || [],
    };
  }

  static async createConversation(
    userId: string,
    input: CreateConversationInput = {}
  ): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: input.title || 'New Conversation',
        model: input.model || 'gemini-2.0-flash-exp',
        system_prompt: input.system_prompt,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens || 2048,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }

    return data;
  }

  static async updateConversation(
    conversationId: string,
    updates: UpdateConversationInput
  ): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      throw new Error('Failed to update conversation');
    }

    return data;
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  static async createMessage(input: CreateMessageInput): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        tokens_used: input.tokens_used || 0,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }

    return data;
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }

    return data || [];
  }

  static async logUsage(metric: Omit<UsageMetric, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('usage_metrics').insert(metric);

    if (error) {
      console.error('Error logging usage:', error);
    }
  }

  static async getUserUsageStats(userId: string, days: number = 30): Promise<{
    totalTokensInput: number;
    totalTokensOutput: number;
    totalApiCalls: number;
    averageResponseTime: number;
    errorCount: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());

    if (error) {
      console.error('Error fetching usage stats:', error);
      throw new Error('Failed to fetch usage statistics');
    }

    if (!data || data.length === 0) {
      return {
        totalTokensInput: 0,
        totalTokensOutput: 0,
        totalApiCalls: 0,
        averageResponseTime: 0,
        errorCount: 0,
      };
    }

    const stats = data.reduce(
      (acc, metric) => ({
        totalTokensInput: acc.totalTokensInput + (metric.tokens_input || 0),
        totalTokensOutput: acc.totalTokensOutput + (metric.tokens_output || 0),
        totalApiCalls: acc.totalApiCalls + (metric.api_calls || 0),
        totalResponseTime: acc.totalResponseTime + (metric.response_time_ms || 0),
        errorCount: acc.errorCount + (metric.error_occurred ? 1 : 0),
      }),
      {
        totalTokensInput: 0,
        totalTokensOutput: 0,
        totalApiCalls: 0,
        totalResponseTime: 0,
        errorCount: 0,
      }
    );

    return {
      totalTokensInput: stats.totalTokensInput,
      totalTokensOutput: stats.totalTokensOutput,
      totalApiCalls: stats.totalApiCalls,
      averageResponseTime:
        stats.totalApiCalls > 0 ? Math.round(stats.totalResponseTime / stats.totalApiCalls) : 0,
      errorCount: stats.errorCount,
    };
  }

  static async generateConversationTitle(firstMessage: string): Promise<string> {
    const words = firstMessage.split(' ').slice(0, 8).join(' ');
    return words.length < firstMessage.length ? `${words}...` : words;
  }
}
