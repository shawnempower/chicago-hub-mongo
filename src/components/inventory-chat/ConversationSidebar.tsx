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
import { MessageSquarePlus, Trash2, Loader2, MessageSquare } from 'lucide-react';
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
      <div className="flex h-full flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground font-sans">Chat History</h3>
          <Button
            size="sm"
            onClick={handleCreateConversation}
            disabled={isCreating}
            className="h-8 px-3 bg-primary hover:bg-primary/90"
          >
            {isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs font-medium font-sans">New Chat</span>
              </>
            )}
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center font-sans">
              <div className="mb-4 p-3 rounded-full bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1 font-sans">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground mb-4 font-sans">
                Start a new chat to explore your inventory
              </p>
              <Button 
                size="sm" 
                onClick={handleCreateConversation} 
                disabled={isCreating}
                className="h-8 px-4"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-sans">New Chat</span>
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-0">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.conversationId}
                    className={cn(
                      'group relative flex items-center gap-2 p-3 cursor-pointer transition-all font-sans border-b border-border/40',
                      selectedConversationId === conversation.conversationId
                        ? 'bg-background/50'
                        : 'hover:bg-background/30'
                    )}
                    onClick={() => onSelectConversation(conversation.conversationId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate leading-tight text-foreground font-sans">
                        {conversation.title}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex-shrink-0 hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(conversation.conversationId);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
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

