import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ConversationThread {
  id: string;
  title: string;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  message_count: number;
}

export function useConversationThreads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error loading conversation threads:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [user]);

  const createThread = async (): Promise<ConversationThread | null> => {
    if (!user) return null;

    try {
      const timestamp = new Date().toLocaleString();
      const { data, error } = await supabase
        .from('conversation_threads')
        .insert({
          user_id: user.id,
          title: `Chat ${timestamp}`,
          category: 'general'
        })
        .select()
        .single();

      if (error) throw error;

      const newThread = data as ConversationThread;
      setThreads(prev => [newThread, ...prev]);

      return newThread;
    } catch (error) {
      console.error('Error creating conversation thread:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateThread = async (threadId: string, updates: Partial<Pick<ConversationThread, 'title' | 'description' | 'category'>>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversation_threads')
        .update(updates)
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) throw error;

      setThreads(prev => 
        prev.map(thread => 
          thread.id === threadId 
            ? { ...thread, ...updates, updated_at: new Date().toISOString() }
            : thread
        )
      );

      toast({
        title: "Updated",
        description: "Conversation updated successfully"
      });
    } catch (error) {
      console.error('Error updating conversation thread:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation",
        variant: "destructive"
      });
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversation_threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) throw error;

      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      
      toast({
        title: "Deleted",
        description: "Conversation deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting conversation thread:', error);
      toast({
        title: "Error", 
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };

  const archiveThread = async (threadId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversation_threads')
        .update({ is_archived: true })
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) throw error;

      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      
      toast({
        title: "Archived",
        description: "Conversation archived successfully"
      });
    } catch (error) {
      console.error('Error archiving conversation thread:', error);
      toast({
        title: "Error",
        description: "Failed to archive conversation",
        variant: "destructive"
      });
    }
  };

  return {
    threads,
    loading,
    createThread,
    updateThread,
    deleteThread,
    archiveThread,
    refreshThreads: loadThreads
  };
}