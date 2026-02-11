/**
 * Message Bell Component
 * 
 * Shows unread message count and dropdown with recent messages.
 * Combines both order-embedded messages (legacy) and standalone messaging conversations.
 * Works for both hub and publication users with appropriate data filtering.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, User, Building2, FileText, Megaphone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_BASE_URL } from '@/config/api';
import { messagesApi } from '@/api/messages';
import type { ConversationListItem } from '@/api/messages';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface RecentOrder {
  campaignId: string;
  publicationId: number;
  campaignName: string;
  publicationName: string;
  latestMessagePreview: string;
  latestMessageSender: string;
  latestMessageTimestamp: string;
  isUnread: boolean;
}

// Unified item for display
interface MessageItem {
  id: string;
  source: 'order' | 'conversation';
  title: string;
  subtitle: string;
  preview: string;
  senderName: string;
  timestamp: string;
  isUnread: boolean;
  type?: 'direct' | 'order' | 'broadcast';
  // For navigation
  navigateTo: string;
  // For marking read
  orderData?: RecentOrder;
  conversationId?: string;
}

export function MessageBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MessageItem[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [userType, setUserType] = useState<'hub' | 'publication' | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Fetch both counts in parallel
      const [orderResponse, conversationCount] = await Promise.all([
        fetch(`${API_BASE_URL}/publication-orders/unread-message-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
        messagesApi.getUnreadCount().catch(() => 0),
      ]);

      setTotalUnreadCount((orderResponse.count || 0) + conversationCount);
    } catch (error) {
      console.error('Error fetching unread message counts:', error);
    }
  }, []);

  const fetchRecentItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Fetch both sources in parallel
      const [orderResponse, conversationsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/publication-orders/with-recent-messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : { orders: [], userType: null }).catch(() => ({ orders: [], userType: null })),
        messagesApi.listConversations({ limit: 10 }).catch(() => ({ conversations: [] })),
      ]);

      const orderUserType = orderResponse.userType || null;
      setUserType(orderUserType);

      // Convert orders to unified items
      const orderItems: MessageItem[] = (orderResponse.orders || []).map((order: RecentOrder) => ({
        id: `order-${order.campaignId}-${order.publicationId}`,
        source: 'order' as const,
        title: orderUserType === 'hub' ? order.publicationName : order.campaignName,
        subtitle: orderUserType === 'hub' ? order.campaignName : order.publicationName,
        preview: order.latestMessagePreview,
        senderName: order.latestMessageSender,
        timestamp: order.latestMessageTimestamp,
        isUnread: order.isUnread,
        type: 'order' as const,
        navigateTo: orderUserType === 'hub'
          ? `/hubcentral?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`
          : `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
        orderData: order,
      }));

      // Convert conversations to unified items
      const convItems: MessageItem[] = (conversationsResponse.conversations || []).map((conv: ConversationListItem) => {
        const otherParticipants = conv.participants?.filter(p => p.userType !== orderUserType) || [];
        const displayName = otherParticipants.map(p => p.publicationName || p.name).join(', ') || 'Unknown';
        const basePath = orderUserType === 'hub' ? '/hubcentral' : '/dashboard';

        return {
          id: `conv-${conv._id}`,
          source: 'conversation' as const,
          title: conv.subject || displayName,
          subtitle: conv.subject ? displayName : '',
          preview: conv.lastMessagePreview || '',
          senderName: conv.lastMessageSender || '',
          timestamp: conv.lastMessageAt ? String(conv.lastMessageAt) : '',
          isUnread: conv.hasUnreadMessages || false,
          type: conv.type,
          navigateTo: `${basePath}?tab=messages&conversationId=${conv._id}`,
          conversationId: String(conv._id),
        };
      });

      // Merge and sort by timestamp (most recent first)
      const allItems = [...orderItems, ...convItems].sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      }).slice(0, 20);

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching recent messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch count on mount and periodically
  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) {
      fetchRecentItems();
    }
  }, [open, fetchRecentItems]);

  const handleItemClick = async (item: MessageItem) => {
    // Mark as read
    if (item.isUnread) {
      try {
        if (item.source === 'order' && item.orderData) {
          const token = localStorage.getItem('auth_token');
          await fetch(`${API_BASE_URL}/publication-orders/${item.orderData.campaignId}/${item.orderData.publicationId}/mark-viewed`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } else if (item.source === 'conversation' && item.conversationId) {
          await messagesApi.markAsRead(item.conversationId);
        }
        
        setTotalUnreadCount(prev => Math.max(0, prev - 1));
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, isUnread: false } : i
        ));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    
    navigate(item.navigateTo);
    setOpen(false);
  };

  const getTypeIcon = (item: MessageItem) => {
    if (item.source === 'order') {
      return <FileText className={cn("h-4 w-4", item.isUnread ? "text-green-500" : "text-gray-400")} />;
    }
    if (item.type === 'broadcast') {
      return <Megaphone className={cn("h-4 w-4", item.isUnread ? "text-orange-500" : "text-gray-400")} />;
    }
    if (item.type === 'direct') {
      return <Mail className={cn("h-4 w-4", item.isUnread ? "text-blue-500" : "text-gray-400")} />;
    }
    return <MessageSquare className={cn("h-4 w-4", item.isUnread ? "text-blue-500" : "text-gray-400")} />;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 bg-blue-500 hover:bg-blue-500 text-white text-xs font-bold"
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Messages</h3>
          {totalUnreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalUnreadCount} unread
            </span>
          )}
        </div>

        {/* Messages List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Loading...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No recent messages</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    item.isUnread && "bg-blue-50/50"
                  )}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getTypeIcon(item)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          item.isUnread ? "font-semibold" : "font-normal text-gray-600"
                        )}>
                          {item.title}
                        </p>
                        {item.isUnread && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                      <p className={cn(
                        "text-xs line-clamp-2 mt-1",
                        item.isUnread ? "text-gray-700" : "text-gray-500"
                      )}>
                        {item.senderName && <span className="font-medium">{item.senderName}: </span>}
                        {item.preview}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.timestamp && formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm h-8"
                onClick={() => {
                  setOpen(false);
                  if (userType === 'hub') {
                    navigate('/hubcentral?tab=messages');
                  } else {
                    navigate('/dashboard?tab=messages');
                  }
                }}
              >
                View all messages
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
