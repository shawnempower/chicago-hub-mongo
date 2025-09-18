import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateBrandContextSummary, hasBrandContext } from '@/utils/documentUtils';

export interface ThreadMessage {
  id: string;
  type: 'user' | 'assistant' | 'outlets' | 'packages';
  content: string;
  outlets?: any[];
  packages?: any[];
  timestamp: Date;
  hasBrandContext?: boolean;
  conversationScore?: number;
  triggerKeywords?: string[];
}

export function useThreadMessages(threadId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandContext, setBrandContext] = useState<string>('');
  const [hasBrand, setHasBrand] = useState(false);

  const getInitialMessage = (hasBrandContext: boolean): ThreadMessage => ({
    id: 'initial',
    type: 'assistant',
    content: hasBrandContext 
      ? "Hi! I'm Lassie, your brand-aware Chicago media assistant. I can see you've set up your brand profile, so I'm ready to provide personalized recommendations that align with your specific goals and brand voice. What would you like to explore today?"
      : "Hi! I'm Lassie, your Chicago media assistant. I help brands discover the perfect combination of Chicago media outlets for their goals. For personalized recommendations, consider completing your brand profile in the dashboard. What brings you to Chicago media today?",
    timestamp: new Date(),
    hasBrandContext: hasBrandContext
  });

  const loadMessages = async () => {
    if (!user || !threadId) {
      const initialMessage = getInitialMessage(false);
      setMessages([initialMessage]);
      setLoading(false);
      return;
    }

    try {
      // Load brand context and messages in parallel
      const [contextResult, messagesResult, hasBrandResult] = await Promise.all([
        generateBrandContextSummary(user.id),
        supabase
          .from('assistant_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('conversation_thread_id', threadId)
          .order('created_at', { ascending: true }),
        hasBrandContext(user.id)
      ]);

      setBrandContext(contextResult);
      setHasBrand(hasBrandResult);
      
      const initialMessage = getInitialMessage(hasBrandResult);

      if (messagesResult.error) throw messagesResult.error;

      if (messagesResult.data && messagesResult.data.length > 0) {
        const loadedMessages: ThreadMessage[] = messagesResult.data.map(conv => ({
          id: conv.id,
          type: conv.message_type as 'user' | 'assistant' | 'outlets' | 'packages',
          content: conv.message_content,
          outlets: (conv.metadata as any)?.outlets,
          packages: (conv.metadata as any)?.packages,
          timestamp: new Date(conv.created_at),
          hasBrandContext: (conv.metadata as any)?.hasBrandContext,
          conversationScore: (conv.metadata as any)?.conversationScore,
          triggerKeywords: (conv.metadata as any)?.triggerKeywords
        }));
        setMessages([initialMessage, ...loadedMessages]);
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      const initialMessage = getInitialMessage(false);
      setMessages([initialMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [user, threadId]);

  const saveMessage = async (message: ThreadMessage) => {
    if (!user || !threadId || message.id === 'initial') return;

    try {
      const metadata: any = {};
      if (message.outlets) metadata.outlets = message.outlets;
      if (message.packages) metadata.packages = message.packages;
      if (message.hasBrandContext) metadata.hasBrandContext = message.hasBrandContext;
      if (message.conversationScore) metadata.conversationScore = message.conversationScore;
      if (message.triggerKeywords) metadata.triggerKeywords = message.triggerKeywords;

      const { error } = await supabase
        .from('assistant_conversations')
        .insert({
          user_id: user.id,
          conversation_thread_id: threadId,
          message_content: message.content,
          message_type: message.type,
          metadata
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const addMessage = async (message: ThreadMessage) => {
    // Validate and sanitize input
    if (message.type === 'user') {
      const sanitizedContent = message.content.trim().slice(0, 500);
      if (!sanitizedContent) return;
      message.content = sanitizedContent;
    }

    setMessages(prev => [...prev, message]);
    await saveMessage(message);
  };

  const clearMessages = async () => {
    if (!user || !threadId) return;

    try {
      const { error } = await supabase
        .from('assistant_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_thread_id', threadId);

      if (error) throw error;

      const initialMessage = getInitialMessage(hasBrand);
      setMessages([initialMessage]);
      
      toast({
        title: "Messages Cleared",
        description: "Conversation messages have been cleared"
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast({
        title: "Error",
        description: "Failed to clear messages",
        variant: "destructive"
      });
    }
  };

  const getConversationHistory = () => {
    return messages
      .filter(m => m.id !== 'initial' && (m.type === 'user' || m.type === 'assistant'))
      .slice(-10) // Last 10 messages for context
      .map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
  };

  return {
    messages,
    addMessage,
    clearMessages,
    loading,
    brandContext,
    hasBrandContext: hasBrand,
    getConversationHistory
  };
}