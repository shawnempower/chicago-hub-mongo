import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateBrandContextSummary, hasBrandContext } from '@/utils/documentUtils';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'outlets';
  content: string;
  outlets?: any[];
  timestamp: Date;
  hasBrandContext?: boolean;
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
      ? "Hi! I'm Lassie, your brand-aware Chicago media assistant. I can see you've set up your brand profile, so I'm ready to provide personalized recommendations that align with your specific goals and brand voice. What would you like to explore today?"
      : "Hi! I'm Lassie, your Chicago media assistant. I help brands discover the perfect combination of Chicago media outlets for their goals. For personalized recommendations, consider completing your brand profile in the dashboard. What brings you to Chicago media today?",
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
          type: conv.message_type as 'user' | 'assistant' | 'outlets',
          content: conv.message_content,
          outlets: (conv.metadata as any)?.outlets,
          timestamp: new Date(conv.created_at),
          hasBrandContext: (conv.metadata as any)?.hasBrandContext
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
      if (message.hasBrandContext) metadata.hasBrandContext = message.hasBrandContext;

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

  return {
    messages,
    addMessage,
    clearConversation,
    loading,
    brandContext,
    hasBrandContext: hasBrand
  };
}