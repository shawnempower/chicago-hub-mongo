import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateBrandContextSummary, hasBrandContext } from '@/utils/documentUtils';

interface Message {
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

export function useAssistantConversation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandContext, setBrandContext] = useState<string>('');
  const [hasBrand, setHasBrand] = useState(false);

  const getInitialMessage = (hasBrandContext: boolean): Message => ({
    id: '1',
    type: 'assistant',
    content: hasBrandContext 
      ? "Hi! I'm Lassie, your Chicago media assistant. I see your brand profile is set up. What would you like to explore?"
      : "Hi! I'm Lassie, your Chicago media assistant. I help brands discover Chicago media outlets. Complete your brand profile for personalized recommendations. What brings you here?",
    timestamp: new Date(),
    hasBrandContext: hasBrandContext
  });

  const loadConversation = async () => {
    if (!user) {
      const initialMessage = getInitialMessage(false);
      setMessages([initialMessage]);
      setLoading(false);
      return;
    }

    try {
      // Load brand context and conversation in parallel
      const [contextResult, conversationResult, hasBrandResult] = await Promise.all([
        generateBrandContextSummary(user.id),
        supabase
          .from('assistant_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        hasBrandContext(user.id)
      ]);

      setBrandContext(contextResult);
      setHasBrand(hasBrandResult);
      
      const initialMessage = getInitialMessage(hasBrandResult);

      if (conversationResult.error) throw conversationResult.error;

      if (conversationResult.data && conversationResult.data.length > 0) {
        const loadedMessages: Message[] = conversationResult.data.map(conv => ({
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
      console.error('Error loading conversation:', error);
      const initialMessage = getInitialMessage(false);
      setMessages([initialMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [user]);

  const saveMessage = async (message: Message) => {
    if (!user || message.id === '1') return; // Don't save the initial message

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
          message_content: message.content,
          message_type: message.type,
          metadata
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't show error to user as it's not critical for chat functionality
    }
  };

  const addMessage = async (message: Message) => {
    // Validate and sanitize input
    if (message.type === 'user') {
      const sanitizedContent = message.content.trim().slice(0, 500);
      if (!sanitizedContent) return;
      
      message.content = sanitizedContent;
    }

    setMessages(prev => [...prev, message]);
    await saveMessage(message);
  };

  const clearConversation = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('assistant_conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      const initialMessage = getInitialMessage(hasBrand);
      setMessages([initialMessage]);
      
      toast({
        title: "Conversation Cleared",
        description: "Your conversation history has been cleared"
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: "Error",
        description: "Failed to clear conversation",
        variant: "destructive"
      });
    }
  };

  const getConversationHistory = () => {
    return messages
      .filter(m => m.id !== '1' && (m.type === 'user' || m.type === 'assistant'))
      .slice(-10) // Last 10 messages for context
      .map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
  };

  return {
    messages,
    addMessage,
    clearConversation,
    loading,
    brandContext,
    hasBrandContext: hasBrand,
    getConversationHistory
  };
}