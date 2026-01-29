/**
 * Message Bell Component
 * 
 * Shows unread message count and dropdown with orders that have unread messages.
 * Works for both hub and publication users with appropriate data filtering.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, User, Building2 } from 'lucide-react';
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

export function MessageBell() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userType, setUserType] = useState<'hub' | 'publication' | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const getOrderKey = (order: RecentOrder) => `${order.campaignId}-${order.publicationId}`;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/publication-orders/unread-message-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/publication-orders/with-recent-messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setUserType(data.userType || null);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) {
      fetchRecentOrders();
    }
  }, [open, fetchRecentOrders]);

  const handleOrderClick = async (order: RecentOrder) => {
    // Mark as viewed on server (only if currently unread)
    if (order.isUnread) {
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`${API_BASE_URL}/publication-orders/${order.campaignId}/${order.publicationId}/mark-viewed`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Update local state - mark as read
        setUnreadCount(prev => Math.max(0, prev - 1));
        setOrders(prev => prev.map(o => 
          getOrderKey(o) === getOrderKey(order) 
            ? { ...o, isUnread: false } 
            : o
        ));
      } catch (error) {
        console.error('Error marking order as viewed:', error);
      }
    }
    
    // Navigate to order detail
    if (userType === 'hub') {
      navigate(`/hubcentral?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`);
    } else {
      navigate(`/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`);
    }
    
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 bg-blue-500 hover:bg-blue-500 text-white text-xs font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Messages</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread conversation{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Orders List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Loading...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No recent messages</p>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => {
                const orderKey = getOrderKey(order);
                
                return (
                  <div
                    key={orderKey}
                    className={cn(
                      "px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                      order.isUnread && "bg-blue-50/50"
                    )}
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon based on sender */}
                      <div className="mt-0.5">
                        {userType === 'hub' ? (
                          <User className={cn("h-4 w-4", order.isUnread ? "text-blue-500" : "text-gray-400")} />
                        ) : (
                          <Building2 className={cn("h-4 w-4", order.isUnread ? "text-purple-500" : "text-gray-400")} />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-sm truncate",
                            order.isUnread ? "font-semibold" : "font-normal text-gray-600"
                          )}>
                            {userType === 'hub' ? order.publicationName : order.campaignName}
                          </p>
                          {order.isUnread && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {userType === 'hub' ? order.campaignName : order.publicationName}
                        </p>
                        <p className={cn(
                          "text-xs line-clamp-2 mt-1",
                          order.isUnread ? "text-gray-700" : "text-gray-500"
                        )}>
                          <span className="font-medium">{order.latestMessageSender}:</span>{' '}
                          {order.latestMessagePreview}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.latestMessageTimestamp && formatDistanceToNow(new Date(order.latestMessageTimestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {orders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm h-8"
                onClick={() => {
                  setOpen(false);
                  // Navigate to orders list
                  if (userType === 'hub') {
                    navigate('/hubcentral?tab=orders');
                  } else {
                    navigate('/dashboard?tab=orders');
                  }
                }}
              >
                View all orders
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
