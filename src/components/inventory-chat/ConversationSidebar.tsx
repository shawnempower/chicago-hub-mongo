/**
 * Conversation Sidebar
 * 
 * Manages conversation history and creation for inventory chat
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageSquarePlus, Trash2, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { listConversations, createConversation, deleteConversation, type Conversation } from '@/api/inventoryChat';
import { toast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  hubId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onConversationsChange?: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  hubId,
  selectedConversationId,
  onSelectConversation,
  onConversationsChange,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Load conversations
  const loadConversations = async () => {
    if (!hubId) return;
    
    setIsLoading(true);
    try {
      const data = await listConversations(hubId);
      setConversations(data);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [hubId]);

  // Handle creating a new conversation
  const handleCreateConversation = async () => {
    setIsCreating(true);
    try {
      const newConversation = await createConversation(hubId);
      setConversations(prev => [newConversation, ...prev]);
      onSelectConversation(newConversation.conversationId);
      onConversationsChange?.();
      
      toast({
        title: 'Success',
        description: 'New conversation created',
      });
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create conversation',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle deleting a conversation
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      await deleteConversation(conversationToDelete);
      setConversations(prev => prev.filter(c => c.conversationId !== conversationToDelete));
      
      // If deleted conversation was selected, clear selection
      if (selectedConversationId === conversationToDelete) {
        onSelectConversation(null as any);
      }
      
      onConversationsChange?.();
      
      toast({
        title: 'Success',
        description: 'Conversation deleted',
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete conversation',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const confirmDelete = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  // Refresh conversations (called from parent)
  useEffect(() => {
    const handleRefresh = () => {
      loadConversations();
    };
    
    // Listen for conversation updates
    window.addEventListener('inventory-chat-refresh', handleRefresh);
    return () => window.removeEventListener('inventory-chat-refresh', handleRefresh);
  }, [hubId]);

  return (
    <>
      <div className="flex h-full flex-col bg-slate-50/50">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">History</h3>
          <button
            onClick={handleCreateConversation}
            disabled={isCreating}
            className="p-1.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 mb-3">
                No chats yet
              </p>
              <button
                onClick={handleCreateConversation}
                disabled={isCreating}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + New Chat
              </button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-1.5 space-y-0.5">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.conversationId}
                    className={cn(
                      'group relative flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-all rounded-md',
                      selectedConversationId === conversation.conversationId
                        ? 'bg-white shadow-sm border border-slate-200'
                        : 'hover:bg-white/60'
                    )}
                    onClick={() => onSelectConversation(conversation.conversationId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-xs truncate leading-tight",
                        selectedConversationId === conversation.conversationId
                          ? "font-medium text-slate-800"
                          : "text-slate-600"
                      )}>
                        {conversation.title}
                      </div>
                    </div>
                    
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(conversation.conversationId);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

