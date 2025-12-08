/**
 * Activity Log Viewer
 * 
 * Admin component for viewing and filtering user activity logs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  getHubActivities, 
  getPublicationActivities, 
  getUserActivities,
  UserInteraction,
  ActivityQueryOptions 
} from '@/api/activities';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Filter, RefreshCw, User, Building2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActivityLogProps {
  /** Filter by hub ID */
  hubId?: string;
  /** Filter by publication ID */
  publicationId?: string;
  /** Filter by user ID */
  userId?: string;
  /** Show filters */
  showFilters?: boolean;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  campaign_create: 'Campaign Created',
  campaign_update: 'Campaign Updated',
  campaign_delete: 'Campaign Deleted',
  order_create: 'Order Created',
  order_update: 'Order Updated',
  order_delete: 'Order Deleted',
  package_create: 'Package Created',
  package_update: 'Package Updated',
  package_delete: 'Package Deleted',
  lead_create: 'Lead Created',
  lead_update: 'Lead Updated',
  lead_delete: 'Lead Deleted',
  publication_update: 'Publication Updated',
  inventory_update: 'Inventory Updated',
  storefront_update: 'Storefront Updated',
  settings_update: 'Settings Updated',
  user_login: 'User Login',
  user_logout: 'User Logout',
};

const ACTIVITY_TYPE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  campaign_create: 'default',
  campaign_update: 'secondary',
  campaign_delete: 'destructive',
  order_create: 'default',
  order_update: 'secondary',
  order_delete: 'destructive',
  package_create: 'default',
  package_update: 'secondary',
  package_delete: 'destructive',
  lead_create: 'default',
  lead_update: 'secondary',
  lead_delete: 'destructive',
  publication_update: 'secondary',
  inventory_update: 'secondary',
  storefront_update: 'secondary',
  settings_update: 'secondary',
  user_login: 'outline',
  user_logout: 'outline',
};

export function ActivityLog({ hubId, publicationId, userId, showFilters = true }: ActivityLogProps) {
  const [activities, setActivities] = useState<UserInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  
  const pageSize = 50;

  const fetchActivities = async (offset = 0, append = false) => {
    setLoading(true);
    try {
      const options: ActivityQueryOptions = {
        limit: pageSize,
        offset,
        activityType: filterType !== 'all' ? filterType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      let response;
      if (userId) {
        response = await getUserActivities(userId, options);
      } else if (publicationId) {
        response = await getPublicationActivities(publicationId, options);
      } else if (hubId) {
        response = await getHubActivities(hubId, options);
      } else {
        toast({
          title: 'Configuration Error',
          description: 'Must provide hubId, publicationId, or userId',
          variant: 'destructive',
        });
        return;
      }

      if (append) {
        setActivities(prev => [...prev, ...response.activities]);
      } else {
        setActivities(response.activities);
      }
      
      setHasMore(response.activities.length === pageSize);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchActivities(0, false);
  }, [filterType, startDate, endDate, hubId, publicationId, userId]);

  const handleLoadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchActivities(newPage * pageSize, true);
  };

  const handleRefresh = () => {
    setPage(0);
    fetchActivities(0, false);
  };

  const formatActivityLabel = (activity: UserInteraction) => {
    return ACTIVITY_TYPE_LABELS[activity.interactionType] || activity.interactionType;
  };

  const getActivityBadgeVariant = (activity: UserInteraction) => {
    return ACTIVITY_TYPE_COLORS[activity.interactionType] || 'default';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              View and filter user activities and changes
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Activity Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="campaign_create">Campaign Created</SelectItem>
                    <SelectItem value="campaign_update">Campaign Updated</SelectItem>
                    <SelectItem value="campaign_delete">Campaign Deleted</SelectItem>
                    <SelectItem value="order_create">Order Created</SelectItem>
                    <SelectItem value="order_update">Order Updated</SelectItem>
                    <SelectItem value="package_create">Package Created</SelectItem>
                    <SelectItem value="package_update">Package Updated</SelectItem>
                    <SelectItem value="lead_create">Lead Created</SelectItem>
                    <SelectItem value="lead_update">Lead Updated</SelectItem>
                    <SelectItem value="publication_update">Publication Updated</SelectItem>
                    <SelectItem value="inventory_update">Inventory Updated</SelectItem>
                    <SelectItem value="storefront_update">Storefront Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {loading && activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities found
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={activity._id || index}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActivityBadgeVariant(activity)}>
                          {formatActivityLabel(activity)}
                        </Badge>
                        
                        {activity.metadata?.resourceType && (
                          <span className="text-sm text-muted-foreground">
                            {activity.metadata.resourceType}
                            {activity.metadata.resourceId && ` #${activity.metadata.resourceId.substring(0, 8)}`}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>User: {activity.userId.substring(0, 8)}...</span>
                        </div>
                        
                        {activity.hubId && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>Hub: {activity.hubId}</span>
                          </div>
                        )}
                        
                        {activity.publicationId && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>Pub: {activity.publicationId}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      {activity.metadata?.path && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {activity.metadata.action} {activity.metadata.path}
                        </div>
                      )}
                      
                      {activity.ipAddress && (
                        <div className="text-xs text-muted-foreground">
                          IP: {activity.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}



