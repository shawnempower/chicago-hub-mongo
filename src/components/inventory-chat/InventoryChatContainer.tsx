/**
 * Inventory Chat Container
 * 
 * Main container that combines the sidebar and chat interface
 * Simple collapsible design that works within Hub Central
 */

import React, { useState, useEffect } from 'react';
import { useHubContext } from '@/contexts/HubContext';
import { ConversationSidebar } from './ConversationSidebar';
import { InventoryChatInterface } from './InventoryChatInterface';
import { getConversation, type Conversation } from '@/api/inventoryChat';
import { Loader2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const InventoryChatContainer: React.FC = () => {
  const { selectedHubId } = useHubContext();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('inventory-chat-sidebar-open');
    return saved !== 'false'; // Default to open
  });

  // Load selected conversation details
  useEffect(() => {
    if (!selectedConversationId) {
      setCurrentConversation(null);
      return;
    }

    const loadConversation = async () => {
      setIsLoadingConversation(true);
      try {
        const conversation = await getConversation(selectedConversationId);
        setCurrentConversation(conversation);
      } catch (error) {
        console.error('Error loading conversation:', error);
        setCurrentConversation(null);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();
  }, [selectedConversationId]);

  const handleConversationUpdate = () => {
    // Trigger refresh in sidebar
    setRefreshTrigger(prev => prev + 1);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('inventory-chat-sidebar-open', String(newState));
      return newState;
    });
  };

  if (!selectedHubId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center font-sans">
          <p className="text-lg font-semibold mb-2 font-sans">No Hub Selected</p>
          <p className="text-sm text-muted-foreground font-sans">
            Please select a hub to start exploring inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden border border-border rounded-lg font-sans">
      {/* Collapsible Conversation Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-border/40 bg-muted/30 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-72" : "w-0"
        )}
      >
        <div className={cn("h-full w-72", !isSidebarOpen && "hidden")}>
          <ConversationSidebar
            hubId={selectedHubId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onConversationsChange={handleConversationUpdate}
            key={refreshTrigger}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {/* Floating Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-10 h-9 w-9 hover:bg-gray-100 bg-white/80 backdrop-blur-sm shadow-md border border-gray-200 rounded-full"
          title={isSidebarOpen ? "Hide conversations" : "Show conversations"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {isLoadingConversation ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InventoryChatInterface
              conversationId={selectedConversationId}
              onConversationUpdate={handleConversationUpdate}
              key={selectedConversationId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

