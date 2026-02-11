import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagesApi } from '@/api/messages';
import type { ConversationListItem } from '@/api/messages';
import type { ConversationType } from '@/integrations/mongodb/messagingSchema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Plus,
  Megaphone,
  Search,
  Loader2,
  Inbox,
} from 'lucide-react';
import { ConversationList } from './ConversationList';
import { ConversationThread } from './ConversationThread';
import { NewConversationDialog } from './NewConversationDialog';
import { BroadcastComposer } from './BroadcastComposer';

// ===== Constants =====

const POLL_INTERVAL_MS = 30_000;

const FILTER_TABS: Array<{ value: string; label: string; type?: ConversationType }> = [
  { value: 'all', label: 'All' },
  { value: 'direct', label: 'Direct', type: 'direct' },
  { value: 'order', label: 'Order', type: 'order' },
  { value: 'broadcast', label: 'Broadcast', type: 'broadcast' },
];

// ===== Component =====

interface MessagingInboxProps {
  userType: 'hub' | 'publication';
  hubId?: string;    // For hub users (single hub context)
  hubIds?: string[]; // For publication users (may belong to multiple hubs)
}

export function MessagingInbox({ userType, hubId, hubIds }: MessagingInboxProps) {
  // For hub users, use the single hubId. For pub users, don't filter by hub so they see all.
  const effectiveHubId = userType === 'hub' ? hubId : undefined;
  // For compose dialogs: hub users use hubId; pub users get the full list
  const pubHubIds = hubIds ?? (hubId ? [hubId] : []);
  const [searchParams] = useSearchParams();

  // --- State ---
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversationId') ?? null,
  );
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // --- Data fetching ---

  const fetchConversations = useCallback(async () => {
    try {
      const filterTab = FILTER_TABS.find((t) => t.value === activeFilter);
      const { conversations: data } = await messagesApi.listConversations({
        type: filterTab?.type,
        hubId: effectiveHubId,
        search: searchQuery || undefined,
      });
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, hubId, searchQuery]);

  // Initial load + filter/search changes
  useEffect(() => {
    setIsLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  // Polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Auto-open conversation from URL param
  useEffect(() => {
    const urlConversationId = searchParams.get('conversationId');
    if (urlConversationId) {
      setSelectedConversationId(urlConversationId);
    }
  }, [searchParams]);

  // --- Handlers ---

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleConversationCreated = (conversationId: string) => {
    setIsNewMessageOpen(false);
    setSelectedConversationId(conversationId);
    fetchConversations();
  };

  const handleBroadcastSent = () => {
    setIsBroadcastOpen(false);
    fetchConversations();
  };

  // --- Derived state ---

  const unreadCount = conversations.filter((c) => c.hasUnreadMessages).length;

  // ===== Render =====

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2.5 text-xs font-medium">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {userType === 'hub' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBroadcastOpen(true)}
              className="gap-1.5"
            >
              <Megaphone className="h-4 w-4" />
              Broadcast
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setIsNewMessageOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {userType === 'hub' ? 'New Message' : 'Message Hub'}
          </Button>
        </div>
      </div>

      {/* Main two-panel layout */}
      <Card className="flex flex-1 overflow-hidden">
        {/* Left panel – Conversation list */}
        <div className="flex w-[350px] shrink-0 flex-col border-r">
          {/* Filter tabs */}
          <div className="border-b px-3 pt-3">
            <Tabs value={activeFilter} onValueChange={setActiveFilter}>
              <TabsList className="w-full">
                {FILTER_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1 text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Search bar */}
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Inbox className="h-10 w-10" />
                <p className="text-sm font-medium">No conversations</p>
                <p className="text-xs">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Start a new conversation to get going'}
                </p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId ?? undefined}
                onSelect={handleSelectConversation}
                userType={userType}
              />
            )}
          </ScrollArea>
        </div>

        {/* Right panel – Conversation thread */}
        <div className="flex flex-1 flex-col">
          {selectedConversationId ? (
            <ConversationThread
              conversationId={selectedConversationId}
              userType={userType}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="h-12 w-12 stroke-1" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">
                Choose a conversation from the list to view messages
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Dialogs */}
      <NewConversationDialog
        open={isNewMessageOpen}
        onOpenChange={setIsNewMessageOpen}
        hubId={hubId || pubHubIds[0] || ''}
        hubIds={pubHubIds}
        userType={userType}
        onCreated={handleConversationCreated}
      />
      {userType === 'hub' && (
        <BroadcastComposer
          open={isBroadcastOpen}
          onOpenChange={setIsBroadcastOpen}
          hubId={hubId || ''}
          onCreated={handleBroadcastSent}
        />
      )}
    </div>
  );
}
