/**
 * Activity Log Viewer
 * 
 * Admin component for viewing and filtering user activity logs
 * Enhanced to show user names, publication names, and detailed change information
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  getHubActivities, 
  getPublicationActivities, 
  getUserActivities,
  UserInteraction,
  ActivityQueryOptions 
} from '@/api/activities';
import { formatDistanceToNow, format } from 'date-fns';
import { Calendar, RefreshCw, User, Building2, FileText, Globe, Clock, Edit3, Plus, Trash2, Package, Target, Users, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';

interface ActivityLogProps {
  /** Filter by hub ID */
  hubId?: string;
  /** Filter by publication ID */
  publicationId?: string;
  /** Filter by user ID */
  userId?: string;
  /** Show filters */
  showFilters?: boolean;
  /** Hide the card wrapper (for use in dialogs) */
  hideCard?: boolean;
}

// Cache for user and publication names to avoid repeated lookups
const userNameCache: Record<string, string> = {};
const publicationNameCache: Record<string, string> = {};

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
  publication_create: 'Publication Created',
  publication_update: 'Publication Updated',
  publication_delete: 'Publication Deleted',
  inventory_update: 'Inventory Updated',
  profile_update: 'Profile Updated',
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
  publication_create: 'default',
  publication_update: 'secondary',
  publication_delete: 'destructive',
  inventory_update: 'secondary',
  profile_update: 'secondary',
  storefront_update: 'secondary',
  settings_update: 'secondary',
  user_login: 'outline',
  user_logout: 'outline',
};

const ACTIVITY_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  campaign_create: Plus,
  campaign_update: Edit3,
  campaign_delete: Trash2,
  order_create: Plus,
  order_update: Edit3,
  order_delete: Trash2,
  package_create: Package,
  package_update: Package,
  package_delete: Trash2,
  lead_create: Users,
  lead_update: Users,
  lead_delete: Trash2,
  publication_create: Plus,
  publication_update: FileText,
  publication_delete: Trash2,
  inventory_update: Package,
  profile_update: User,
  storefront_update: Globe,
  settings_update: Settings,
  user_login: User,
  user_logout: User,
};

export function ActivityLog({ hubId, publicationId, userId, showFilters = true, hideCard = false }: ActivityLogProps) {
  const [activities, setActivities] = useState<UserInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [publicationNames, setPublicationNames] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  const pageSize = 50;

  // Extract user and publication names from activity metadata (stored at tracking time)
  const extractNamesFromMetadata = (activitiesList: UserInteraction[]) => {
    const newUserNames: Record<string, string> = {};
    const newPubNames: Record<string, string> = {};
    
    activitiesList.forEach(activity => {
      // Extract user name from metadata - ensure userId is a string
      const userId = activity.userId;
      if (typeof userId === 'string' && userId && !userNameCache[userId]) {
        const email = activity.metadata?.userEmail;
        const name = activity.metadata?.userName;
        if (email || name) {
          userNameCache[userId] = name || email?.split('@')[0] || userId.substring(0, 8);
          newUserNames[userId] = userNameCache[userId];
        }
      }
      
      // Extract publication name from metadata - ensure publicationId is a string
      const pubId = activity.publicationId;
      if (typeof pubId === 'string' && pubId && !publicationNameCache[pubId]) {
        const pubName = activity.metadata?.publicationName || activity.metadata?.entityName;
        if (pubName) {
          publicationNameCache[pubId] = pubName;
          newPubNames[pubId] = pubName;
        }
      }
    });
    
    if (Object.keys(newUserNames).length > 0) {
      setUserNames(prev => ({ ...prev, ...newUserNames }));
    }
    if (Object.keys(newPubNames).length > 0) {
      setPublicationNames(prev => ({ ...prev, ...newPubNames }));
    }
  };

  // Fetch publication names for activities
  const fetchPublicationNames = async (pubIds: (string | unknown)[]) => {
    // Filter to only valid string IDs
    const uniqueIds = [...new Set(pubIds)]
      .filter((id): id is string => typeof id === 'string' && id.length > 0 && !publicationNameCache[id]);
    if (uniqueIds.length === 0) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      for (const pubId of uniqueIds) {
        try {
          const response = await fetch(`${API_BASE_URL}/publications/${pubId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const pub = await response.json();
            // Try multiple paths to find the name
            const name = pub.basicInfo?.name || pub.name || pub.publication?.basicInfo?.name || pub.publication?.name;
            publicationNameCache[pubId] = name || `Publication ${pubId.substring(0, 8)}`;
          } else {
            publicationNameCache[pubId] = `Publication ${pubId.substring(0, 8)}`;
          }
        } catch {
          publicationNameCache[pubId] = `Publication ${pubId.substring(0, 8)}`;
        }
      }
      setPublicationNames({ ...publicationNameCache });
    } catch (error) {
      console.error('Error fetching publication names:', error);
    }
  };

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

      const newActivities = append 
        ? [...activities, ...response.activities]
        : response.activities;
      
      setActivities(newActivities);
      setHasMore(response.activities.length === pageSize);
      
      // Extract user and publication names from activity metadata (stored at tracking time)
      extractNamesFromMetadata(newActivities);
      
      // Fetch publication names for any activities that don't have names in metadata
      const pubIdsWithoutNames = newActivities
        .filter(a => typeof a.publicationId === 'string' && a.publicationId && !publicationNameCache[a.publicationId] && !a.metadata?.publicationName)
        .map(a => a.publicationId as string);
      if (pubIdsWithoutNames.length > 0) {
        fetchPublicationNames(pubIdsWithoutNames);
      }
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

  const getActivityIcon = (activity: UserInteraction) => {
    return ACTIVITY_TYPE_ICONS[activity.interactionType] || Edit3;
  };

  const getUserDisplayName = (userId: unknown, activity?: UserInteraction): string => {
    // Priority: full email > cached name > metadata name > truncated ID
    const email = activity?.metadata?.userEmail;
    const name = activity?.metadata?.userName;
    
    // Show full email if available, otherwise show name
    if (email) return email;
    if (name) return name;
    
    // Handle case where userId might not be a string
    if (typeof userId !== 'string') {
      return 'Unknown User';
    }
    
    return userNames[userId] || userNameCache[userId] || userId.substring(0, 8) + '...';
  };

  const getPublicationDisplayName = (pubId: unknown): string => {
    // Handle case where pubId might not be a string
    if (typeof pubId !== 'string') {
      return 'Unknown Publication';
    }
    return publicationNames[pubId] || publicationNameCache[pubId] || `Publication ${pubId.substring(0, 8)}`;
  };

  // Format a description of what changed based on metadata
  const getChangeDescription = (activity: UserInteraction): string | null => {
    const meta = activity.metadata;
    if (!meta) return null;
    
    // If we have a list of changes, show them
    if (meta.changes && Array.isArray(meta.changes) && meta.changes.length > 0) {
      return `Changed: ${meta.changes.join(', ')}`;
    }
    
    // Generate description based on activity type
    const type = activity.interactionType;
    if (type.includes('campaign')) {
      return meta.campaignName ? `Campaign: ${meta.campaignName}` : null;
    }
    if (type.includes('lead')) {
      return meta.leadName || meta.companyName ? `Lead: ${meta.leadName || meta.companyName}` : null;
    }
    if (type.includes('package')) {
      return meta.packageName ? `Package: ${meta.packageName}` : null;
    }
    
    return null;
  };

  const content = (
    <>
      {!hideCard && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Activity Log</h2>
            <p className="text-sm text-muted-foreground">
              View and filter user activities and changes
            </p>
          </div>
        </div>
      )}

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
                  <SelectItem value="profile_update">Profile Updated</SelectItem>
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
          
          <div className="flex justify-end">
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
        <TooltipProvider>
          <div className="space-y-3">
              {activities.map((activity, index) => {
                const ActivityIcon = getActivityIcon(activity);
                const changeDescription = getChangeDescription(activity);
                
                return (
                  <div
                    key={activity._id || index}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Activity Icon */}
                      <div className={`mt-0.5 p-2 rounded-full ${
                        activity.interactionType.includes('delete') ? 'bg-red-100 text-red-600' :
                        activity.interactionType.includes('create') ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Header Row: Badge + Time */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Badge variant={getActivityBadgeVariant(activity)}>
                            {formatActivityLabel(activity)}
                          </Badge>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(activity.createdAt), 'PPpp')}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        
                        {/* Main Description */}
                        <div className="text-sm mb-2">
                          <span className="font-medium">{getUserDisplayName(activity.userId, activity)}</span>
                          {typeof activity.publicationId === 'string' && activity.publicationId && (
                            <>
                              {' '}updated{' '}
                              <span className="font-medium text-primary">
                                {getPublicationDisplayName(activity.publicationId)}
                              </span>
                            </>
                          )}
                          {activity.hubId && !activity.publicationId && (
                            <>
                              {' '}in{' '}
                              <span className="font-medium">{activity.hubId}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Change Details */}
                        {changeDescription && (
                          <div className="text-sm text-muted-foreground mb-2 bg-muted/50 rounded px-2 py-1">
                            {changeDescription}
                          </div>
                        )}
                        
                        {/* Context Tags */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {activity.hubId && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>{activity.hubId}</span>
                            </div>
                          )}
                          
                          {activity.metadata?.resourceType && (
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span>{activity.metadata.resourceType}</span>
                            </div>
                          )}
                          
                          {activity.ipAddress && activity.ipAddress !== '127.0.0.1' && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span>{activity.ipAddress}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* API Path (collapsible/subtle) */}
                        {activity.metadata?.path && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground/60 font-mono mt-1 truncate cursor-help">
                                {activity.metadata.action} {activity.metadata.path}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>API: {activity.metadata.action} {activity.metadata.path}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
          </TooltipProvider>
        )}
    </>
  );

  if (hideCard) {
    return <div>{content}</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  );
}



