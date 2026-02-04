/**
 * Publication Action Center
 * 
 * Shows publications what they need to do across all their campaigns.
 * Prioritizes urgent items and provides clear actions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  BarChart3,
  Calendar,
  ChevronRight,
  Inbox,
  Bell,
  Newspaper,
  Radio,
  Mic,
  Eye,
  ArrowRight,
  AlertTriangle,
  PlayCircle,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { format, differenceInDays, isPast, isFuture, addDays } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { usePublication } from '@/contexts/PublicationContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { isDigitalChannel, getChannelConfig } from '@/config/inventoryChannels';

// Action item types
type ActionType = 
  | 'overdue_report'      // Campaign ended, no results reported
  | 'missing_proof'       // Results submitted but no proof
  | 'needs_acceptance'    // New order waiting for response
  | 'awaiting_assets'     // Digital placement accepted but no scripts yet
  | 'ready_to_go_live'    // Accepted and ready (has scripts for digital, assets for offline)
  | 'starting_soon'       // Campaign starts in next 7 days
  | 'ending_soon'         // Campaign ends in next 7 days
  | 'in_progress'         // Currently running
  | 'completed';          // Fully reported

type ActionPriority = 'urgent' | 'soon' | 'info' | 'done';

interface ActionItem {
  id: string;
  type: ActionType;
  priority: ActionPriority;
  title: string;
  subtitle: string;
  campaignId: string;
  campaignName: string;
  publicationId: number;
  placementId?: string;
  placementName?: string;
  placementNames?: string[];  // For grouped items - list of placement names
  placementCount?: number;    // For grouped items - total count
  channel?: string;
  dueDate?: Date;
  actionLabel: string;
  actionUrl?: string;
}

interface OrderData {
  _id: string;
  campaignId: string;
  campaignName?: string;
  publicationId: number;
  publicationName: string;
  status: string;
  placementStatuses?: Record<string, string>;
  assetStatus?: {
    totalPlacements?: number;
    placementsWithAssets?: number;
    allAssetsReady?: boolean;
    pendingUpload?: boolean;
  };
  campaignData?: {
    name?: string;
    timeline?: {
      startDate?: string;
      endDate?: string;
    };
    selectedInventory?: {
      publications?: Array<{
        publicationId: number;
        inventoryItems?: Array<{
          itemPath?: string;
          sourcePath?: string;
          name?: string;
          channel?: string;
        }>;
      }>;
    };
  };
  performanceEntries?: Array<{ itemPath: string }>;
  proofs?: Array<{ itemPath?: string }>;
}

interface PublicationActionCenterProps {
  /** Limit number of items shown (0 = show all) */
  limit?: number;
  /** Show compact view */
  compact?: boolean;
  /** Called when an action is taken */
  onAction?: (item: ActionItem) => void;
}

export function PublicationActionCenter({ 
  limit = 0, 
  compact = false,
  onAction 
}: PublicationActionCenterProps) {
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [performanceData, setPerformanceData] = useState<Record<string, any>>({});

  // Fetch action center data when publication changes
  useEffect(() => {
    if (selectedPublication) {
      fetchData();
    }
  }, [selectedPublication?.publicationId]);

  const fetchData = async () => {
    if (!selectedPublication) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch all orders for this publication
      const ordersRes = await fetch(
        `${API_BASE_URL}/publication-orders?publicationId=${selectedPublication.publicationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
        
        // Fetch performance data for each order
        const perfData: Record<string, any> = {};
        for (const order of (data.orders || [])) {
          if (!order._id) continue;
          
          try {
            const [entriesRes, proofsRes] = await Promise.all([
              fetch(`${API_BASE_URL}/performance-entries/order/${order._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }),
              fetch(`${API_BASE_URL}/proof-of-performance/order/${order._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
            ]);
            
            const entries = entriesRes.ok ? await entriesRes.json() : { entries: [] };
            const proofs = proofsRes.ok ? await proofsRes.json() : { proofs: [] };
            
            perfData[order._id] = {
              entries: entries.entries || [],
              proofs: proofs.proofs || []
            };
          } catch (e) {
            perfData[order._id] = { entries: [], proofs: [] };
          }
        }
        setPerformanceData(perfData);
      }
    } catch (error) {
      console.error('Error fetching action center data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load action items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate action items from orders
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];
    const now = new Date();
    
    // Track grouped items by order + type for aggregation
    const groupedByOrder: Record<string, {
      type: ActionType;
      priority: ActionPriority;
      campaignId: string;
      campaignName: string;
      publicationId: number;
      dueDate?: Date;
      actionUrl: string;
      placements: string[];
    }> = {};

    for (const order of orders) {
      const orderId = order._id;
      const campaignName = order.campaignData?.name || order.campaignName || 'Campaign';
      const startDate = order.campaignData?.timeline?.startDate 
        ? new Date(order.campaignData.timeline.startDate) 
        : null;
      const endDate = order.campaignData?.timeline?.endDate 
        ? new Date(order.campaignData.timeline.endDate) 
        : null;
      
      const perf = performanceData[orderId] || { entries: [], proofs: [] };
      
      // Get placements for this order - compare as strings to handle type mismatches
      const publication = order.campaignData?.selectedInventory?.publications?.find(
        p => String(p.publicationId) === String(order.publicationId)
      );
      const placements = publication?.inventoryItems || [];
      
      // Check order status
      if (order.status === 'sent') {
        // Needs acceptance
        items.push({
          id: `accept-${orderId}`,
          type: 'needs_acceptance',
          priority: 'urgent',
          title: 'New order to review',
          subtitle: `${placements.length} placement${placements.length !== 1 ? 's' : ''} • Review and accept`,
          campaignId: order.campaignId,
          campaignName,
          publicationId: order.publicationId,
          actionLabel: 'Review Order',
          actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
        });
        continue;
      }

      // Check individual placements for reporting needs
      for (const placement of placements) {
        const itemPath = placement.itemPath || placement.sourcePath || '';
        const placementName = placement.name || 'Placement';
        const channel = placement.channel || 'other';
        const isDigital = isDigitalChannel(channel);
        
        // Look up placement status - check exact match first, then check for tier/dimension suffixes
        // Status keys may have suffixes like "-tier0", "-tier1", "_dim0", etc.
        let placementStatus: string = 'pending';
        if (order.placementStatuses) {
          if (order.placementStatuses[itemPath]) {
            placementStatus = order.placementStatuses[itemPath];
          } else {
            // Check for keys that start with this itemPath (handling tier/dimension variants)
            const matchingKey = Object.keys(order.placementStatuses).find(key => 
              key === itemPath || key.startsWith(itemPath + '-') || key.startsWith(itemPath + '_')
            );
            if (matchingKey) {
              // Use the "highest" status among all matching variants
              const matchingStatuses = Object.entries(order.placementStatuses)
                .filter(([key]) => key === itemPath || key.startsWith(itemPath + '-') || key.startsWith(itemPath + '_'))
                .map(([, status]) => status);
              
              // Priority: delivered > in_production > accepted > rejected > pending
              const statusPriority = ['delivered', 'in_production', 'accepted', 'rejected', 'pending'];
              placementStatus = matchingStatuses.reduce((best, current) => {
                return statusPriority.indexOf(current) < statusPriority.indexOf(best) ? current : best;
              }, 'pending');
            }
          }
        }
        
        const hasEntry = perf.entries.some((e: any) => e.itemPath === itemPath || e.itemPath?.startsWith(itemPath + '-') || e.itemPath?.startsWith(itemPath + '_'));
        const hasProof = perf.proofs.some((p: any) => p.itemPath === itemPath || p.itemPath?.startsWith(itemPath + '-') || p.itemPath?.startsWith(itemPath + '_') || !p.itemPath);
        
        // Check for accepted placements that should be taken live
        if (placementStatus === 'accepted') {
          const isStarted = startDate && isPast(startDate);
          const startsWithin7Days = startDate && isFuture(startDate) && differenceInDays(startDate, now) <= 7;
          
          // For digital placements, check if assets/scripts are ready
          const assetsReady = order.assetStatus?.allAssetsReady || !order.assetStatus?.pendingUpload;
          
          // Digital placements without scripts should show "awaiting assets"
          if (isDigital && !assetsReady) {
            const groupKey = `awaiting-${orderId}`;
            if (!groupedByOrder[groupKey]) {
              groupedByOrder[groupKey] = {
                type: 'awaiting_assets' as ActionType,
                priority: 'info' as ActionPriority,
                campaignId: order.campaignId,
                campaignName,
                publicationId: order.publicationId,
                dueDate: startDate || undefined,
                actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
                placements: []
              };
            }
            groupedByOrder[groupKey].placements.push(placementName);
            continue;
          }
          
          // Determine priority for ready placements
          let priority: ActionPriority = 'info';
          if (isStarted) priority = 'urgent';
          else if (startsWithin7Days) priority = 'soon';
          
          // Group key for aggregation
          const groupKey = `golive-${orderId}-${priority}`;
          if (!groupedByOrder[groupKey]) {
            groupedByOrder[groupKey] = {
              type: 'ready_to_go_live' as ActionType,
              priority,
              campaignId: order.campaignId,
              campaignName,
              publicationId: order.publicationId,
              dueDate: startDate || undefined,
              actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
              placements: []
            };
          }
          groupedByOrder[groupKey].placements.push(placementName);
          continue;
        }
        
        // Skip digital channels for reporting - they're tracked automatically
        if (isDigital) continue;
        
        // Only check placements that are in_production or delivered for reporting
        if (!['in_production', 'delivered'].includes(placementStatus)) continue;

        // Check if overdue (campaign ended, no report)
        if (endDate && isPast(endDate) && !hasEntry) {
          const groupKey = `overdue-${orderId}`;
          if (!groupedByOrder[groupKey]) {
            groupedByOrder[groupKey] = {
              type: 'overdue_report' as ActionType,
              priority: 'urgent' as ActionPriority,
              campaignId: order.campaignId,
              campaignName,
              publicationId: order.publicationId,
              dueDate: endDate,
              actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
              placements: []
            };
          }
          groupedByOrder[groupKey].placements.push(placementName);
        }
        // Check if missing proof (has entry but no proof)
        else if (hasEntry && !hasProof && ['print', 'radio'].includes(channel)) {
          const groupKey = `proof-${orderId}`;
          if (!groupedByOrder[groupKey]) {
            groupedByOrder[groupKey] = {
              type: 'missing_proof' as ActionType,
              priority: 'urgent' as ActionPriority,
              campaignId: order.campaignId,
              campaignName,
              publicationId: order.publicationId,
              actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
              placements: []
            };
          }
          groupedByOrder[groupKey].placements.push(placementName);
        }
        // Check if ending soon (within 7 days, not reported)
        else if (endDate && isFuture(endDate) && differenceInDays(endDate, now) <= 7 && !hasEntry) {
          const groupKey = `ending-${orderId}`;
          if (!groupedByOrder[groupKey]) {
            groupedByOrder[groupKey] = {
              type: 'ending_soon' as ActionType,
              priority: 'soon' as ActionPriority,
              campaignId: order.campaignId,
              campaignName,
              publicationId: order.publicationId,
              dueDate: endDate,
              actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
              placements: []
            };
          }
          groupedByOrder[groupKey].placements.push(placementName);
        }
        // Completed
        else if (hasEntry && (hasProof || channel === 'podcast')) {
          const groupKey = `done-${orderId}`;
          if (!groupedByOrder[groupKey]) {
            groupedByOrder[groupKey] = {
              type: 'completed' as ActionType,
              priority: 'done' as ActionPriority,
              campaignId: order.campaignId,
              campaignName,
              publicationId: order.publicationId,
              actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
              placements: []
            };
          }
          groupedByOrder[groupKey].placements.push(placementName);
        }
      }

      // Check for campaigns starting soon (this is already order-level, not per-placement)
      if (startDate && isFuture(startDate) && differenceInDays(startDate, now) <= 7) {
        if (order.status === 'confirmed') {
          items.push({
            id: `starting-${orderId}`,
            type: 'starting_soon',
            priority: 'soon',
            title: `Campaign starts ${format(startDate, 'MMM d')}`,
            subtitle: `${campaignName} • ${placements.length} placement${placements.length !== 1 ? 's' : ''}`,
            campaignId: order.campaignId,
            campaignName,
            publicationId: order.publicationId,
            placementCount: placements.length,
            dueDate: startDate,
            actionLabel: 'View Order',
            actionUrl: `/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`,
          });
        }
      }
    }

    // Convert grouped items to action items
    for (const [groupKey, group] of Object.entries(groupedByOrder)) {
      const count = group.placements.length;
      if (count === 0) continue;
      
      let title: string;
      let subtitle: string;
      let actionLabel: string;
      
      switch (group.type) {
        case 'awaiting_assets':
          title = count === 1 ? `Awaiting scripts for "${group.placements[0]}"` : `${count} placements awaiting scripts`;
          subtitle = `${group.campaignName} • Hub uploading creative assets`;
          actionLabel = 'View';
          break;
        case 'ready_to_go_live':
          if (group.priority === 'urgent') {
            title = count === 1 ? `Mark "${group.placements[0]}" as live` : `${count} placements to go live`;
            subtitle = count === 1 ? `${group.campaignName} • Campaign has started` : `${group.campaignName} • Campaign has started`;
            actionLabel = 'Go Live';
          } else if (group.priority === 'soon') {
            title = count === 1 ? `Ready: "${group.placements[0]}"` : `${count} placements ready`;
            subtitle = `${group.campaignName} • Starts ${group.dueDate ? format(group.dueDate, 'MMM d') : 'soon'}`;
            actionLabel = 'View';
          } else {
            title = count === 1 ? `Accepted: "${group.placements[0]}"` : `${count} placements accepted`;
            subtitle = `${group.campaignName}${group.dueDate ? ` • Starts ${format(group.dueDate, 'MMM d')}` : ''}`;
            actionLabel = 'View';
          }
          break;
        case 'overdue_report':
          title = count === 1 ? `Report results for "${group.placements[0]}"` : `${count} placements need reports`;
          const daysOverdue = group.dueDate ? differenceInDays(now, group.dueDate) : 0;
          subtitle = `${group.campaignName} • ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`;
          actionLabel = 'Report Now';
          break;
        case 'missing_proof':
          title = count === 1 ? `Add proof for "${group.placements[0]}"` : `${count} placements need proof`;
          subtitle = `${group.campaignName} • Results submitted, proof needed`;
          actionLabel = 'Add Proof';
          break;
        case 'ending_soon':
          title = count === 1 ? `"${group.placements[0]}" ending soon` : `${count} placements ending soon`;
          subtitle = `${group.campaignName} • Ends ${group.dueDate ? format(group.dueDate, 'MMM d') : 'soon'}`;
          actionLabel = 'View Order';
          break;
        case 'completed':
          title = count === 1 ? `"${group.placements[0]}" reported` : `${count} placements reported`;
          subtitle = `${group.campaignName} • ✓ Complete`;
          actionLabel = 'View';
          break;
        default:
          title = `${count} placement${count !== 1 ? 's' : ''}`;
          subtitle = group.campaignName;
          actionLabel = 'View';
      }
      
      items.push({
        id: groupKey,
        type: group.type,
        priority: group.priority,
        title,
        subtitle,
        campaignId: group.campaignId,
        campaignName: group.campaignName,
        publicationId: group.publicationId,
        placementNames: group.placements,
        placementCount: count,
        dueDate: group.dueDate,
        actionLabel,
        actionUrl: group.actionUrl,
      });
    }

    // Sort by priority
    const priorityOrder: Record<ActionPriority, number> = {
      urgent: 0,
      soon: 1,
      info: 2,
      done: 3,
    };
    
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return limit > 0 ? items.slice(0, limit) : items;
  }, [orders, performanceData, limit]);

  // Group items by priority
  const groupedItems = useMemo(() => {
    const urgent = actionItems.filter(i => i.priority === 'urgent');
    const soon = actionItems.filter(i => i.priority === 'soon');
    const info = actionItems.filter(i => i.priority === 'info');
    const done = actionItems.filter(i => i.priority === 'done');
    return { urgent, soon, info, done };
  }, [actionItems]);

  const handleAction = (item: ActionItem) => {
    onAction?.(item);
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'print': return <Newspaper className="w-4 h-4" />;
      case 'radio': return <Radio className="w-4 h-4" />;
      case 'podcast': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: ActionType) => {
    switch (type) {
      case 'overdue_report': return <AlertCircle className="w-4 h-4" />;
      case 'missing_proof': return <FileText className="w-4 h-4" />;
      case 'needs_acceptance': return <Inbox className="w-4 h-4" />;
      case 'awaiting_assets': return <Clock className="w-4 h-4" />;
      case 'ready_to_go_live': return <PlayCircle className="w-4 h-4" />;
      case 'starting_soon': return <PlayCircle className="w-4 h-4" />;
      case 'ending_soon': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityStyles = (priority: ActionPriority) => {
    switch (priority) {
      case 'urgent': return {
        bg: 'bg-red-50 border-red-200',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-700 border-0',
      };
      case 'soon': return {
        bg: 'bg-amber-50 border-amber-200',
        icon: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700 border-0',
      };
      case 'info': return {
        bg: 'bg-blue-50 border-blue-200',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700 border-0',
      };
      case 'done': return {
        bg: 'bg-green-50 border-green-200',
        icon: 'text-green-600',
        badge: 'bg-green-100 text-green-700 border-0',
      };
      default: return {
        bg: 'bg-muted/50 border-border',
        icon: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-700 border-0',
      };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCheck className="w-12 h-12 text-green-500 mb-4" />
          <p className="font-medium text-green-700">You're all caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">
            No pending actions at this time
          </p>
        </CardContent>
      </Card>
    );
  }

  const urgentCount = groupedItems.urgent.length;
  const soonCount = groupedItems.soon.length;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">
              {urgentCount} item{urgentCount !== 1 ? 's' : ''} need{urgentCount === 1 ? 's' : ''} your attention
            </p>
            <p className="text-sm text-red-600">
              {groupedItems.urgent.some(i => i.type === 'ready_to_go_live') && 'Placements to go live • '}
              {groupedItems.urgent.some(i => i.type === 'overdue_report') && 'Overdue reports • '}
              {groupedItems.urgent.some(i => i.type === 'missing_proof') && 'Missing proofs • '}
              {groupedItems.urgent.some(i => i.type === 'needs_acceptance') && 'Orders to review'}
            </p>
          </div>
        </div>
      )}

      {/* Urgent Items */}
      {groupedItems.urgent.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Needs Attention ({groupedItems.urgent.length})
          </h3>
          <div className="space-y-2">
            {groupedItems.urgent.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onAction={() => handleAction(item)}
                getChannelIcon={getChannelIcon}
                getTypeIcon={getTypeIcon}
                getPriorityStyles={getPriorityStyles}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Coming Up */}
      {groupedItems.soon.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Coming Up ({groupedItems.soon.length})
          </h3>
          <div className="space-y-2">
            {groupedItems.soon.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onAction={() => handleAction(item)}
                getChannelIcon={getChannelIcon}
                getTypeIcon={getTypeIcon}
                getPriorityStyles={getPriorityStyles}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ready to Go Live (info priority) */}
      {groupedItems.info.length > 0 && !compact && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <PlayCircle className="w-4 h-4" />
            Ready to Go Live ({groupedItems.info.length})
          </h3>
          <div className="space-y-2">
            {groupedItems.info.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onAction={() => handleAction(item)}
                getChannelIcon={getChannelIcon}
                getTypeIcon={getTypeIcon}
                getPriorityStyles={getPriorityStyles}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recently Completed */}
      {groupedItems.done.length > 0 && !compact && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Recently Completed ({groupedItems.done.length})
          </h3>
          <div className="space-y-1">
            {groupedItems.done.slice(0, 3).map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2 rounded text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer"
                onClick={() => handleAction(item)}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span>{item.placementName || item.campaignName}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual action item card
function ActionItemCard({
  item,
  onAction,
  getChannelIcon,
  getTypeIcon,
  getPriorityStyles,
  compact,
}: {
  item: ActionItem;
  onAction: () => void;
  getChannelIcon: (channel?: string) => React.ReactNode;
  getTypeIcon: (type: ActionType) => React.ReactNode;
  getPriorityStyles: (priority: ActionPriority) => { bg: string; icon: string; badge: string };
  compact: boolean;
}) {
  const styles = getPriorityStyles(item.priority);
  const config = item.channel ? getChannelConfig(item.channel) : null;

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm",
        styles.bg
      )}
      onClick={onAction}
    >
      {/* Icon */}
      <div className={cn("flex-shrink-0", styles.icon)}>
        {item.channel ? getChannelIcon(item.channel) : getTypeIcon(item.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
      </div>

      {/* Channel badge */}
      {item.channel && config && !compact && (
        <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
          {config.icon} {config.label}
        </Badge>
      )}

      {/* Action */}
      <Button 
        size="sm" 
        variant={item.priority === 'urgent' ? 'default' : 'outline'}
        className={cn(
          "flex-shrink-0 h-7 text-xs",
          item.priority === 'urgent' && "bg-red-600 hover:bg-red-700"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
      >
        {item.actionLabel}
        <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

export default PublicationActionCenter;





