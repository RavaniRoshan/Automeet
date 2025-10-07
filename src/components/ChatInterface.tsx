import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ConversationService } from '../services/conversationService';
import { supabase } from '../lib/supabase';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ConversationSidebar from './ConversationSidebar';
import type { Conversation, Message } from '../types/database.types';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ChatInterface() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const convs = await ConversationService.getConversations(user.id);
      setConversations(convs);

      if (convs.length > 0 && !currentConversationId) {
        setCurrentConversationId(convs[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const msgs = await ConversationService.getMessages(conversationId);
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = async () => {
    if (!user) return;

    try {
      const newConv = await ConversationService.createConversation(user.id, {
        title: 'New Conversation',
      });

      setConversations([newConv, ...conversations]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation');
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!user || !currentConversationId || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const conversation = conversations.find((c) => c.id === currentConversationId);
      if (!conversation) throw new Error('Conversation not found');

      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error('No active session');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: messageText,
          model: conversation.model,
          temperature: conversation.temperature,
          maxTokens: conversation.max_tokens,
          systemPrompt: conversation.system_prompt,
          history,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      if (data.success) {
        setMessages([...messages, data.userMessage, data.assistantMessage]);

        if (messages.length === 0) {
          const title = await ConversationService.generateConversationTitle(messageText);
          await ConversationService.updateConversation(currentConversationId, { title });
          await loadConversations();
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await ConversationService.deleteConversation(conversationId);

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      await loadConversations();
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await ConversationService.updateConversation(conversationId, { is_archived: true });
      await loadConversations();
    } catch (err) {
      console.error('Error archiving conversation:', err);
      setError('Failed to archive conversation');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to use the chat</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onArchiveConversation={handleArchiveConversation}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : currentConversationId ? (
            <>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Ask me anything, and I'll do my best to help!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isSending && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No conversation selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a new chat or select an existing one
                </p>
              </div>
            </div>
          )}
        </div>

        {currentConversationId && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isSending}
                placeholder="Type your message..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
