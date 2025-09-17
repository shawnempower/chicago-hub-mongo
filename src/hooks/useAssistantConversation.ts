import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'outlets';
  content: string;
  outlets?: any[];
  timestamp: Date;
}

export function useAssistantConversation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const initialMessage: Message = {
    id: '1',
    type: 'assistant',
    content: "Hi! I'm Lassie, your Chicago media assistant. I help brands discover the perfect combination of Chicago media outlets for their goals. What brings you to Chicago media today?",
    timestamp: new Date()
  };

  const loadConversation = async () => {
    if (!user) {
      setMessages([initialMessage]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assistant_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map(conv => ({
          id: conv.id,
          type: conv.message_type as 'user' | 'assistant' | 'outlets',
          content: conv.message_content,
          outlets: (conv.metadata as any)?.outlets,
          timestamp: new Date(conv.created_at)
        }));
        setMessages([initialMessage, ...loadedMessages]);
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
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
      const { error } = await supabase
        .from('assistant_conversations')
        .insert({
          user_id: user.id,
          message_content: message.content,
          message_type: message.type,
          metadata: message.outlets ? { outlets: message.outlets } : {}
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
    loading
  };
}