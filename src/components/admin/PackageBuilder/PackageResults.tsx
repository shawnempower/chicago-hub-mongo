import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import {
  Download,
  Save,
  Package as PackageIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Plus,
  Edit,
  RefreshCw,
  CheckCircle,
  Clock,
  FileCheck,
  Archive
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { BuilderResult } from '@/services/packageBuilderService';
import { LineItemsTable } from './LineItemsTable';
import { calculateItemCost, calculatePublicationTotal } from '@/utils/inventoryPricing';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { ReachSummary } from './ReachSummary';
import { calculatePackageReach } from '@/utils/reachCalculations';

type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'archived';

interface PackageResultsProps {
  result: BuilderResult;
  budget?: number;
  duration: number;
  onBack: () => void;
  onSave: (packageName: string, approvalStatus: ApprovalStatus) => Promise<void>;
  onExportCSV: () => void;
  onUpdatePublications: (publications: HubPackagePublication[]) => void;
  onRefresh?: () => Promise<void>;
  onFindNewPublications?: (currentPublicationIds: (string | number)[]) => Promise<{ publications: HubPackagePublication[]; count: number; message: string; debug?: { totalInHub: number; alreadyInPackage: number; newBeforeGeoFilter?: number; geographyFilter?: string[] } }>;
  onDelete?: () => Promise<void>;
  loading?: boolean;
  initialPackageName?: string;
  initialApprovalStatus?: ApprovalStatus;
  isEditingExistingPackage?: boolean;
}

export function PackageResults({
  result,
  budget,
  duration,
  onBack,
  onSave,
  onExportCSV,
  onUpdatePublications,
  onRefresh,
  onFindNewPublications,
  onDelete,
  loading,
  initialPackageName = '',
  initialApprovalStatus = 'draft',
  isEditingExistingPackage = false
}: PackageResultsProps) {
  const { toast } = useToast();
  const [packageName, setPackageName] = useState(initialPackageName);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(initialApprovalStatus);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedOutlets, setExpandedOutlets] = useState<Set<number>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempPackageName, setTempPackageName] = useState(initialPackageName);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPubsDialog, setShowNewPubsDialog] = useState(false);
  const [findingNewPubs, setFindingNewPubs] = useState(false);
  const [newPublications, setNewPublications] = useState<HubPackagePublication[]>([]);
  const [selectedNewPubs, setSelectedNewPubs] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Store original publications to track removed items
  const [originalPublications] = useState<HubPackagePublication[]>(() => 
    JSON.parse(JSON.stringify(result.publications))
  );

  // Validate result data
  if (!result || !result.publications || !result.summary) {
    return (
      <Card className="p-8">
        <CardContent>
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Invalid Package Data</p>
            <p className="text-muted-foreground mb-4">
              The package data is missing or incomplete. Please try rebuilding the package.
            </p>
            <Button onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const { summary: originalSummary, publications } = result;
  
  // Recalculate monthlyCost from actual items to match the breakdown (excluding excluded items)
  const actualMonthlyCost = publications.reduce((sum, pub) => {
    if (!pub.inventoryItems) return sum;
    return sum + pub.inventoryItems
      .filter(item => !item.isExcluded) // Exclude items marked as excluded
      .reduce((pubSum, item) => {
        return pubSum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
      }, 0);
  }, 0);
  
  // Use recalculated value for summary
  const summary = {
    ...originalSummary,
    monthlyCost: actualMonthlyCost,
    totalCost: actualMonthlyCost * (duration || 1)
  };
  
  // Recalculate reach dynamically when publications change (accounts for excluded items and frequency changes)
  const currentReach = useMemo(() => {
    return calculatePackageReach(publications);
  }, [publications]);
  
  const budgetUsagePercent = budget ? (summary.monthlyCost / budget) * 100 : undefined;

  // Get budget color
  const getBudgetColor = () => {
    if (!budgetUsagePercent) return 'text-foreground';
    if (budgetUsagePercent < 90) return 'text-green-600';
    if (budgetUsagePercent <= 110) return 'text-amber-600';
    return 'text-red-600';
  };

  // Handle save
  const handleSave = async () => {
    if (!packageName.trim()) {
      alert('Please enter a package name');
      return;
    }
    await onSave(packageName.trim(), approvalStatus);
  };

  // Get approval status display info
  const getApprovalStatusInfo = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'pending_review':
        return { label: 'Pending Review', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
      case 'draft':
        return { label: 'Draft', icon: FileCheck, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'archived':
        return { label: 'Archived', icon: Archive, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
      default:
        return { label: 'Draft', icon: FileCheck, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete();
      toast({
        title: 'Package Deleted',
        description: 'The package has been deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete package',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
      toast({
        title: 'Package Refreshed',
        description: 'Publication inventory and pricing have been updated with the latest data.',
      });
    } catch (error) {
      console.error('Error refreshing package:', error);
      toast({
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Failed to refresh package data',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
      setShowRefreshDialog(false);
    }
  };

  // Handle finding new publications
  const handleFindNewPublications = async () => {
    if (!onFindNewPublications) return;
    
    setFindingNewPubs(true);
    try {
      // Pass the CURRENT publication IDs (from local state, not stale closure)
      const currentPublicationIds = publications.map(p => p.publicationId);
      const result = await onFindNewPublications(currentPublicationIds);
      setNewPublications(result.publications);
      // Select all by default
      setSelectedNewPubs(new Set(result.publications.map(p => p.publicationId)));
      
      if (result.publications.length === 0) {
        // Show the message from the API with debug info
        const debugInfo = result.debug 
          ? ` (Hub has ${result.debug.totalInHub} publications, ${result.debug.alreadyInPackage} already in package)`
          : '';
        toast({
          title: 'No New Publications',
          description: (result.message || 'All publications in the hub are already in this package.') + debugInfo,
        });
      } else {
        setShowNewPubsDialog(true);
      }
    } catch (error) {
      console.error('Error finding new publications:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to find new publications',
        variant: 'destructive'
      });
    } finally {
      setFindingNewPubs(false);
    }
  };

  // Handle adding selected new publications to the package
  const handleAddNewPublications = () => {
    console.log('[Add New Pubs] Selected IDs:', Array.from(selectedNewPubs));
    console.log('[Add New Pubs] New publications:', newPublications.map(p => ({ id: p.publicationId, type: typeof p.publicationId, name: p.publicationName })));
    
    // Convert to strings for comparison since publicationId might be number or string
    const selectedIdsAsStrings = new Set(Array.from(selectedNewPubs).map(id => String(id)));
    const pubsToAdd = newPublications.filter(p => selectedIdsAsStrings.has(String(p.publicationId)));
    
    console.log('[Add New Pubs] Pubs to add:', pubsToAdd.length, pubsToAdd.map(p => p.publicationName));
    
    if (pubsToAdd.length === 0) {
      toast({
        title: 'No Publications Selected',
        description: 'Please select at least one publication to add.',
        variant: 'destructive'
      });
      return;
    }

    // Merge new publications with existing ones
    const updatedPublications = [...publications, ...pubsToAdd];
    console.log('[Add New Pubs] Total publications after merge:', updatedPublications.length);
    onUpdatePublications(updatedPublications);
    
    toast({
      title: 'Publications Added',
      description: `Added ${pubsToAdd.length} new publication(s) to the package.`,
    });
    
    setShowNewPubsDialog(false);
    setNewPublications([]);
    setSelectedNewPubs(new Set());
  };

  // Toggle selection of a new publication
  const toggleNewPubSelection = (publicationId: string) => {
    setSelectedNewPubs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(publicationId)) {
        newSet.delete(publicationId);
      } else {
        newSet.add(publicationId);
      }
      return newSet;
    });
  };

  // Toggle channel expansion
  const toggleChannelExpand = (channel: string) => {
    setExpandedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channel)) {
        newSet.delete(channel);
      } else {
        newSet.add(channel);
      }
      return newSet;
    });
  };

  // Toggle outlet expansion
  const toggleOutletExpand = (publicationId: number) => {
    setExpandedOutlets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(publicationId)) {
        newSet.delete(publicationId);
      } else {
        newSet.add(publicationId);
      }
      return newSet;
    });
  };

  // Handle deleting an inventory item
  const handleDeleteItem = (publicationId: number, itemPath: string) => {
    const updatedPublications = publications.map(pub => {
      // Use == instead of === to handle type coercion (number vs string)
      // This handles cases where publicationId might be a string in some contexts
      if (pub.publicationId != publicationId) {
        return pub;
      }

      // Filter out the item by exact itemPath match
      const updatedItems = (pub.inventoryItems || []).filter(item => item.itemPath !== itemPath);

      // Recalculate publication total
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
      }, 0);

      return {
        ...pub,
        inventoryItems: updatedItems,
        publicationTotal: newTotal
      };
    });

    // Filter out publications with no inventory items
    const filteredPublications = updatedPublications.filter(pub => 
      pub.inventoryItems && pub.inventoryItems.length > 0
    );

    onUpdatePublications(filteredPublications);
  };

  // Handle frequency change for line items
  const handleFrequencyChange = (pubId: number, itemIndex: number, newFrequency: number) => {
    const updatedPublications = publications.map(pub => {
      if (pub.publicationId === pubId && pub.inventoryItems) {
        const updatedItems = pub.inventoryItems.map((item, idx) => {
          if (idx === itemIndex) {
            return {
              ...item,
              currentFrequency: newFrequency,
              quantity: newFrequency
            };
          }
          return item;
        });

        // Recalculate publication total using pricing service
        const newTotal = calculatePublicationTotal({
          ...pub,
          inventoryItems: updatedItems
        });

        return {
          ...pub,
          inventoryItems: updatedItems,
          publicationTotal: newTotal
        };
      }
      return pub;
    });

    onUpdatePublications(updatedPublications);
  };

  // Handle toggling item exclusion
  const handleToggleExclude = (pubId: number, itemIndex: number) => {
    const updatedPublications = publications.map(pub => {
      if (pub.publicationId === pubId && pub.inventoryItems) {
        const updatedItems = pub.inventoryItems.map((item, idx) => {
          if (idx === itemIndex) {
            return {
              ...item,
              isExcluded: !item.isExcluded
            };
          }
          return item;
        });

        // Recalculate publication total using pricing service (which now filters excluded items)
        const newTotal = calculatePublicationTotal({
          ...pub,
          inventoryItems: updatedItems
        });

        return {
          ...pub,
          inventoryItems: updatedItems,
          publicationTotal: newTotal
        };
      }
      return pub;
    });

    onUpdatePublications(updatedPublications);
  };

  // Helper: Get base path without tier suffix (e.g., "path[0]-tier1" -> "path[0]")
  const getBasePath = (path: string) => path.replace(/-tier\d+$/, '');
  
  // Helper: Get removed items for a publication
  const getRemovedItemsForPublication = (publicationId: number) => {
    const original = originalPublications.find(p => p.publicationId === publicationId);
    const current = publications.find(p => p.publicationId === publicationId);
    
    if (!original || !current) return [];
    
    // Build sets of both exact paths and base paths from current items
    const currentItemPaths = new Set(current.inventoryItems?.map(i => i.itemPath) || []);
    const currentBasePaths = new Set(current.inventoryItems?.map(i => getBasePath(i.itemPath)) || []);
    
    return (original.inventoryItems || []).filter(item => {
      // Don't show as removed if exact path exists
      if (currentItemPaths.has(item.itemPath)) return false;
      
      // Don't show as removed if this item's path (or base path) exists in current items
      // This handles the case where "Monthly Banner Ad" was replaced by "Monthly Banner Ad (Monthly)" and "(Weekly)"
      const basePath = getBasePath(item.itemPath);
      if (currentBasePaths.has(basePath) || currentBasePaths.has(item.itemPath)) return false;
      
      return true; // Actually removed
    });
  };

  // Helper: Get removed items for a publication AND channel
  const getRemovedItemsForPublicationAndChannel = (publicationId: number, channel: string) => {
    const allRemoved = getRemovedItemsForPublication(publicationId);
    return allRemoved.filter(item => item.channel === channel);
  };

  // Handler: Add item back
  const handleAddItem = (publicationId: number, itemToAdd: any) => {
    const updatedPublications = publications.map(pub => {
      if (pub.publicationId !== publicationId) return pub;
      
      // Add item back to the list
      const newItems = [...(pub.inventoryItems || []), itemToAdd];
      
      // Recalculate total
      const newTotal = newItems.reduce((sum, item) => {
        return sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
      }, 0);
      
      return {
        ...pub,
        inventoryItems: newItems,
        publicationTotal: newTotal
      };
    });
    
    onUpdatePublications(updatedPublications);
  };

  // Reusable Component: Removed Items Section
  const RemovedItemsSection = ({ 
    removedItems, 
    publicationId 
  }: { 
    removedItems: any[]; 
    publicationId: number;
  }) => {
    if (removedItems.length === 0) return null;
    
    return (
      <div className="border-t border-dashed pt-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-amber-600 uppercase">
            Removed Items ({removedItems.length})
          </span>
        </div>
        <div className="space-y-2">
          {removedItems.map((item) => {
            const monthlyCost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
            
            return (
              <div 
                key={item.itemPath}
                className="flex items-center justify-between p-3 bg-amber-50/50 rounded border border-amber-200 border-dashed group hover:bg-amber-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground line-through">
                      {item.itemName}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.channel}
                    </Badge>
                    {item.sourceName && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        {item.sourceName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatPrice(monthlyCost)}/month
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddItem(publicationId, item)}
                  className="ml-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Back
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Format price
  const formatPrice = (amount: number) => `$${Math.round(amount).toLocaleString()}`;

  // Group by channel for breakdown with full item details
  const channelBreakdown = publications.reduce((acc, pub) => {
    if (!pub.inventoryItems || !Array.isArray(pub.inventoryItems)) {
      return acc;
    }
    
    pub.inventoryItems.forEach(item => {
      if (!item || !item.channel) return;
      
      if (!acc[item.channel]) {
        acc[item.channel] = {
          outlets: new Set(),
          units: 0,
          cost: 0,
          items: []
        };
      }
      acc[item.channel].outlets.add(pub.publicationName || 'Unknown');
      
      // Only count units and cost for non-excluded items
      if (!item.isExcluded) {
        acc[item.channel].units += (item.currentFrequency || item.quantity || 1);
        const itemCost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
        acc[item.channel].cost += itemCost;
      }
      
      // But include ALL items in the array for display (they'll be styled differently)
      const itemCost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
      acc[item.channel].items.push({
        ...item,
        publicationId: pub.publicationId,  // Ensure publicationId is present
        publicationName: pub.publicationName,
        publicationFrequencyType: item.publicationFrequencyType || pub.publicationFrequencyType,  // Include frequency type
        frequency: item.frequency,  // Include frequency string (e.g., "Weekly")
        itemCost
      });
    });
    return acc;
  }, {} as Record<string, { outlets: Set<string>; units: number; cost: number; items: any[] }>);

  // Handle name edit
  const handleNameClick = () => {
    setTempPackageName(packageName);
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    setPackageName(tempPackageName);
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempPackageName(packageName);
    setIsEditingName(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        rootLabel="Packages"
        rootIcon={PackageIcon}
        currentLabel={packageName || 'New Package'}
        onBackClick={onBack}
      />

      {/* Package Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans">Package Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Package Name & Actions */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div className="flex items-center gap-3 flex-1 group">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={tempPackageName}
                    onChange={(e) => setTempPackageName(e.target.value)}
                    className="text-2xl font-medium h-auto py-1 font-sans"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                  />
                  <Button size="sm" onClick={handleNameSave}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleNameCancel}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={handleNameClick}
                >
                  <h3 className="text-2xl font-medium font-sans">
                    {packageName || 'Untitled Package'}
                  </h3>
                  <Edit className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                disabled={loading}
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {isEditingExistingPackage && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || deleting}
                  title="Delete Package"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {onRefresh && (
                <Button
                  onClick={() => setShowRefreshDialog(true)}
                  variant="outline"
                  size="sm"
                  disabled={loading || refreshing}
                  title="Refresh package data with latest publications and pricing"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {onFindNewPublications && (
                <Button
                  onClick={handleFindNewPublications}
                  variant="outline"
                  size="sm"
                  disabled={loading || findingNewPubs}
                  title="Add new publications from the hub"
                >
                  {findingNewPubs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {/* Approval Status Selector */}
              <Select
                value={approvalStatus}
                onValueChange={(value: ApprovalStatus) => setApprovalStatus(value)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue>
                    {(() => {
                      const info = getApprovalStatusInfo(approvalStatus);
                      const Icon = info.icon;
                      return (
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${info.color}`} />
                          <span>{info.label}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-blue-600" />
                      <span>Draft</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pending_review">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span>Pending Review</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Approved</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-gray-500" />
                      <span>Archived</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleSave}
                disabled={loading || !packageName.trim()}
                size="sm"
                className="bg-black text-white hover:bg-black/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3 bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Monthly</div>
              <div className={`text-lg font-bold ${getBudgetColor()}`}>
                ${summary.monthlyCost.toLocaleString()}
            </div>
            </Card>
            
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">{duration}-Mo Total</div>
              <div className="text-lg font-bold">
                ${summary.totalCost.toLocaleString()}
              </div>
            </Card>

            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">Outlets</div>
              <div className="text-lg font-bold">{summary.totalOutlets}</div>
            </Card>

            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">Channels</div>
              <div className="text-lg font-bold">{summary.totalChannels}</div>
            </Card>

            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">Units</div>
              <div className="text-lg font-bold">{summary.totalUnits}</div>
            </Card>
          </div>

          {/* Budget Usage Gauge (if budget exists) */}
          {budget && budgetUsagePercent !== undefined && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget: ${budget.toLocaleString()}</span>
                <span className={`font-semibold ${getBudgetColor()}`}>
                  {budgetUsagePercent.toFixed(0)}% Used
                </span>
              </div>
              <Progress
                value={Math.min(budgetUsagePercent, 100)}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reach Summary */}
      <ReachSummary
        totalMonthlyImpressions={currentReach.totalMonthlyImpressions}
        totalMonthlyExposures={currentReach.totalMonthlyExposures}
        estimatedTotalReach={currentReach.estimatedTotalReach}
        estimatedUniqueReach={currentReach.estimatedUniqueReach}
        channelAudiences={currentReach.channelAudiences}
        calculationMethod={currentReach.calculationMethod}
        overlapFactor={currentReach.overlapFactor}
        publicationsCount={currentReach.publicationsCount}
        channelsCount={currentReach.channelsCount}
      />

      {/* Tabs */}
      <Tabs defaultValue="channel" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="channel">Package By Channel</TabsTrigger>
          <TabsTrigger value="outlet">Packages by Outlet</TabsTrigger>
        </TabsList>

            {/* By Channel View */}
            <TabsContent value="channel" className="space-y-4">
              {/* Detailed Channel Breakdown */}
              <div className="space-y-3">
                {Object.entries(channelBreakdown)
                  .sort((a, b) => a[0].localeCompare(b[0])) // Sort by channel name alphabetically for stability
                  .map(([channel, data]) => {
                    const isExpanded = expandedChannels.has(channel);
                    
                    // Group items by publication
                    const itemsByPublication = data.items.reduce((acc, item) => {
                      const pubName = item.publicationName || 'Unknown';
                      if (!acc[pubName]) {
                        acc[pubName] = [];
                      }
                      acc[pubName].push(item);
                      return acc;
                    }, {} as Record<string, any[]>);

                    return (
                      <Card key={channel} className="overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleChannelExpand(channel)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Badge variant="secondary" className="capitalize text-base px-3 py-1">
                              {channel}
                            </Badge>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{data.outlets.size} outlets</span>
                              <span>•</span>
                              <span>{data.items.length} {data.items.length === 1 ? 'Ad Slot' : 'Ad Slots'}</span>
                              <span>•</span>
                              <span>{data.units} units/mo</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xl font-bold">{formatPrice(data.cost)}</div>
                              <div className="text-xs text-muted-foreground">per month</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-muted/20">
                            <div className="p-4 space-y-4">
                              {/* Group by Publication */}
                              {Object.entries(itemsByPublication).map(([pubName, items]) => {
                                const pubTotal = items
                                  .filter(item => !item.isExcluded)
                                  .reduce((sum, item) => sum + item.itemCost, 0);
                                
                                return (
                                  <div key={pubName} className="space-y-2">
                                    <div className="ml-4">
                                      <LineItemsTable
                                        title={pubName}
                                        items={items}
                                        publicationId={items[0]?.publicationId || 0}
                                        onFrequencyChange={(pubId, itemIndex, newFrequency) => {
                                          // Find the actual publication object
                                          const pub = publications.find(p => p.publicationId === pubId);
                                          // Find the item by matching the itemPath
                                          const item = items[itemIndex];
                                          const actualItemIndex = pub?.inventoryItems?.findIndex(i => i.itemPath === item.itemPath) ?? itemIndex;
                                          handleFrequencyChange(pubId, actualItemIndex, newFrequency);
                                        }}
                                        onToggleExclude={(pubId, itemIndex) => {
                                          // Find the actual publication object
                                          const pub = publications.find(p => p.publicationId === pubId);
                                          // Find the item by matching the itemPath
                                          const item = items[itemIndex];
                                          const actualItemIndex = pub?.inventoryItems?.findIndex(i => i.itemPath === item.itemPath) ?? itemIndex;
                                          handleToggleExclude(pubId, actualItemIndex);
                                        }}
                                        totalCost={pubTotal}
                                        defaultExpanded={true}
                                      />
                                      
                                      {/* Removed Items Section for By Channel */}
                                      {(() => {
                                        const pubId = items[0]?.publicationId;
                                        if (!pubId) return null;
                                        const removedItems = getRemovedItemsForPublicationAndChannel(pubId, channel);
                                        return <RemovedItemsSection removedItems={removedItems} publicationId={pubId} />;
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Channel Total */}
                              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                                <div className="space-y-1">
                                  <div className="font-semibold text-lg">
                                    {channel.charAt(0).toUpperCase() + channel.slice(1)} Total
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {Object.keys(itemsByPublication).length} publications, {data.items.length} {data.items.length === 1 ? 'Ad Slot' : 'Ad Slots'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-primary">
                                    {formatPrice(data.cost)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    per month
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>

            {/* By Outlet View */}
            <TabsContent value="outlet" className="space-y-4">
              {/* Detailed Outlet Breakdown */}
              <div className="space-y-3">
              {publications
                  .sort((a, b) => (a.publicationName || '').localeCompare(b.publicationName || '')) // Sort by name alphabetically for stability
                  .map((pub) => {
                    const isExpanded = expandedOutlets.has(pub.publicationId);
                    // Group items by channel (keep excluded items for display, they'll be styled differently)
                    const itemsByChannel = (pub.inventoryItems || []).reduce((acc, item) => {
                      if (!item || !item.channel) return acc;
                      if (!acc[item.channel]) {
                        acc[item.channel] = [];
                      }
                      // Ensure frequency type and frequency string are included from publication level if not on item
                      acc[item.channel].push({
                        ...item,
                        publicationFrequencyType: item.publicationFrequencyType || pub.publicationFrequencyType,
                        frequency: item.frequency  // Explicitly include frequency string
                      });
                      return acc;
                    }, {} as Record<string, any[]>);

                    const totalUnits = (pub.inventoryItems || [])
                      .filter(item => !item.isExcluded)
                      .reduce(
                        (sum, item) => sum + (item.currentFrequency || item.quantity || 1), 
                        0
                      );

                    // Recalculate publication total from actual items (excluding excluded items)
                    const actualPublicationTotal = (pub.inventoryItems || [])
                      .filter(item => !item.isExcluded)
                      .reduce(
                        (sum, item) => sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1),
                        0
                      );

                    return (
                      <Card key={pub.publicationId} className="overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleOutletExpand(pub.publicationId)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{pub.publicationName || 'Unknown'}</div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span>{Object.keys(itemsByChannel).length} channels</span>
                                <span>•</span>
                                <span>{pub.inventoryItems?.length || 0} {(pub.inventoryItems?.length || 0) === 1 ? 'Ad Slot' : 'Ad Slots'}</span>
                                <span>•</span>
                                <span>{totalUnits} units/mo</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xl font-bold">{formatPrice(actualPublicationTotal)}</div>
                              <div className="text-xs text-muted-foreground">per month</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-muted/20">
                            <div className="p-4 space-y-4">
                              {/* Group by Channel */}
                              {Object.entries(itemsByChannel)
                                .sort((a, b) => a[0].localeCompare(b[0])) // Sort by channel name alphabetically for stability
                                .map(([channel, items]) => {
                                  const channelTotal = items
                                    .filter(item => !item.isExcluded)
                                    .reduce((sum, item) => {
                                      return sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
                                    }, 0);

                                  return (
                                    <div key={channel} className="space-y-2">
                                      <div className="ml-4">
                                        <LineItemsTable
                                          title={channel.charAt(0).toUpperCase() + channel.slice(1)}
                                          items={items.map(item => {
                                            // Enrich items with their actual index for callbacks
                                            const actualItemIndex = pub.inventoryItems?.findIndex(i => i.itemPath === item.itemPath) ?? 0;
                                            return { ...item, actualItemIndex };
                                          })}
                                          publicationId={pub.publicationId}
                                          onFrequencyChange={(pubId, itemIndex, newFrequency) => {
                                            // Find the item by matching the itemPath
                                            const item = items[itemIndex];
                                            const actualItemIndex = pub.inventoryItems?.findIndex(i => i.itemPath === item.itemPath) ?? itemIndex;
                                            handleFrequencyChange(pubId, actualItemIndex, newFrequency);
                                          }}
                                          onToggleExclude={(pubId, itemIndex) => {
                                            // Find the item by matching the itemPath
                                            const item = items[itemIndex];
                                            const actualItemIndex = pub.inventoryItems?.findIndex(i => i.itemPath === item.itemPath) ?? itemIndex;
                                            handleToggleExclude(pubId, actualItemIndex);
                                          }}
                                          totalCost={channelTotal}
                                          defaultExpanded={true}
                                        />
                                        
                                        {/* Removed Items Section for By Outlet */}
                                        {(() => {
                                          const removedItems = getRemovedItemsForPublicationAndChannel(pub.publicationId, channel);
                                          return <RemovedItemsSection removedItems={removedItems} publicationId={pub.publicationId} />;
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                    </div>
                        )}
                      </Card>
                    );
                  })}
                  </div>
            </TabsContent>
      </Tabs>

      {/* Refresh Confirmation Dialog */}
      <AlertDialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh Package Data?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will refresh the package with the latest publication data while <strong>preserving your customizations</strong>:
              </p>
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="font-semibold text-green-800 mb-2">✓ What will be preserved:</p>
                <ul className="list-disc pl-6 space-y-1 text-green-700 text-sm">
                  <li>Excluded items stay excluded</li>
                  <li>Frequency adjustments are maintained</li>
                  <li>All manual customizations</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="font-semibold text-blue-800 mb-2">↻ What will be updated:</p>
                <ul className="list-disc pl-6 space-y-1 text-blue-700 text-sm">
                  <li>Latest pricing information</li>
                  <li>Updated specifications</li>
                  <li>New inventory items added</li>
                  <li>Current availability data</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refreshing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Package
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Package?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{packageName || 'this package'}"</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. The package and all its 
                  configuration will be permanently removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Package
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add New Publications Dialog */}
      <AlertDialog open={showNewPubsDialog} onOpenChange={setShowNewPubsDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Publications</AlertDialogTitle>
            <AlertDialogDescription>
              {newPublications.length > 0 
                ? `Found ${newPublications.length} new publication(s) that can be added to this package. Select which ones to add:`
                : 'No new publications found in the hub that match your package filters.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {newPublications.length > 0 && (
            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {/* Select All / None */}
              <div className="flex gap-2 mb-3 pb-3 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNewPubs(new Set(newPublications.map(p => p.publicationId)))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNewPubs(new Set())}
                >
                  Select None
                </Button>
                <span className="ml-auto text-sm text-muted-foreground self-center">
                  {selectedNewPubs.size} of {newPublications.length} selected
                </span>
              </div>
              
              {/* Publication List */}
              {newPublications.map((pub) => (
                <div
                  key={pub.publicationId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedNewPubs.has(pub.publicationId)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleNewPubSelection(pub.publicationId)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNewPubs.has(pub.publicationId)}
                      onChange={() => toggleNewPubSelection(pub.publicationId)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{pub.publicationName}</div>
                      <div className="text-sm text-muted-foreground">
                        {pub.inventoryItems?.length || 0} inventory items • 
                        ${(pub.publicationTotal || 0).toLocaleString()}/month
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...new Set(pub.inventoryItems?.map(item => item.channel) || [])].map(channel => (
                          <Badge key={channel} variant="secondary" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {newPublications.length > 0 && (
              <AlertDialogAction
                onClick={handleAddNewPublications}
                disabled={selectedNewPubs.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {selectedNewPubs.size} Publication{selectedNewPubs.size !== 1 ? 's' : ''}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

