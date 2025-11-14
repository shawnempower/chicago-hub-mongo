import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  Download,
  Save,
  Package as PackageIcon,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Plus
} from 'lucide-react';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { BuilderResult } from '@/services/packageBuilderService';
import { LineItemsDetail } from './LineItemsDetail';
import { calculateItemCost } from '@/utils/inventoryPricing';

interface PackageResultsProps {
  result: BuilderResult;
  budget?: number;
  duration: number;
  onBack: () => void;
  onSave: (packageName: string) => Promise<void>;
  onExportCSV: () => void;
  onUpdatePublications: (publications: HubPackagePublication[]) => void;
  loading?: boolean;
  initialPackageName?: string;
}

export function PackageResults({
  result,
  budget,
  duration,
  onBack,
  onSave,
  onExportCSV,
  onUpdatePublications,
  loading,
  initialPackageName = ''
}: PackageResultsProps) {
  const [packageName, setPackageName] = useState(initialPackageName);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedOutlets, setExpandedOutlets] = useState<Set<number>>(new Set());
  
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
  
  // Recalculate monthlyCost from actual items to match the breakdown
  const actualMonthlyCost = publications.reduce((sum, pub) => {
    if (!pub.inventoryItems) return sum;
    return sum + pub.inventoryItems.reduce((pubSum, item) => {
      return pubSum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
    }, 0);
  }, 0);
  
  // Use recalculated value for summary
  const summary = {
    ...originalSummary,
    monthlyCost: actualMonthlyCost,
    totalCost: actualMonthlyCost * (duration || 1)
  };
  
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
    await onSave(packageName.trim());
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

  // Helper: Get removed items for a publication
  const getRemovedItemsForPublication = (publicationId: number) => {
    const original = originalPublications.find(p => p.publicationId === publicationId);
    const current = publications.find(p => p.publicationId === publicationId);
    
    if (!original || !current) return [];
    
    const currentItemPaths = new Set(current.inventoryItems?.map(i => i.itemPath) || []);
    
    return (original.inventoryItems || []).filter(
      item => !currentItemPaths.has(item.itemPath)
    );
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
      acc[item.channel].units += (item.currentFrequency || item.quantity || 1);
      const itemCost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
      acc[item.channel].cost += itemCost;
      acc[item.channel].items.push({
        ...item,
        publicationId: pub.publicationId,  // Ensure publicationId is present
        publicationName: pub.publicationName,
        itemCost
      });
    });
    return acc;
  }, {} as Record<string, { outlets: Set<string>; units: number; cost: number; items: any[] }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Edit Parameters
        </Button>
      </div>

      {/* Package Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Package Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3 bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Monthly</div>
              <div className={`text-lg font-bold ${getBudgetColor()}`}>
                ${summary.monthlyCost.toLocaleString()}
            </div>
            </Card>
            
            <Card className="p-3 bg-primary/10 border-primary/30">
              <div className="text-xs text-primary mb-1">{duration}-Mo Total</div>
              <div className="text-lg font-bold text-primary">
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

      {/* Breakdown Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="channel" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="channel">By Channel</TabsTrigger>
              <TabsTrigger value="outlet">By Outlet</TabsTrigger>
              <TabsTrigger value="lineitems">Line Items</TabsTrigger>
            </TabsList>

            {/* By Channel View */}
            <TabsContent value="channel" className="space-y-4 mt-4">
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
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => toggleChannelExpand(channel)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Badge variant="secondary" className="capitalize text-base px-3 py-1">
                              {channel}
                            </Badge>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{data.outlets.size} outlets</span>
                              <span>•</span>
                              <span>{data.items.length} items</span>
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
                                const pubTotal = items.reduce((sum, item) => sum + item.itemCost, 0);
                                
                                return (
                                  <div key={pubName} className="space-y-2">
                                    <div className="flex items-center justify-between bg-background p-2 rounded-md">
                                      <div className="font-medium">{pubName}</div>
                                      <div className="text-sm font-semibold">{formatPrice(pubTotal)}/mo</div>
                                    </div>
                                    
                                    <div className="ml-4 space-y-2">
                                      {items.map((item, idx) => {
                                        // Determine outlet type icon/label based on channel
                                        const getOutletTypeLabel = () => {
                                          switch (channel) {
                                            case 'newsletter': return '📧 Newsletter';
                                            case 'print': return '📰 Newspaper';
                                            case 'radio': return '📻 Radio';
                                            case 'podcast': return '🎙️ Podcast';
                                            case 'website': return '🌐 Website';
                                            case 'social': return '📱 Social';
                                            case 'streaming': return '📺 Streaming';
                                            case 'events': return '🎪 Events';
                                            default: return '📍 ' + channel;
                                          }
                                        };
                                        
                                        // Use the sourceName field if available (newsletters, radio shows, podcasts, etc.)
                                        // Fall back to parsing itemName if sourceName not available (for legacy packages)
                                        let sourceName = (item as any).sourceName;
                                        if (!sourceName && item.itemName && item.itemName.includes(' - ')) {
                                          const parts = item.itemName.split(' - ');
                                          if (parts.length > 1) {
                                            sourceName = parts[0]; // Extract the source name before the dash
                                          }
                                        }
                                        
                                        return (
                                        <div key={idx} className="flex items-start justify-between p-3 bg-background rounded-lg border group hover:border-destructive/50 transition-colors">
                                          <div className="flex-1 space-y-1">
                                            {/* Outlet Type & Publication/Source Name - highlighted */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <Badge variant="secondary" className="text-xs font-semibold">
                                                {getOutletTypeLabel()}
                                              </Badge>
                                              <span className="text-xs font-semibold text-primary">
                                                {item.publicationName || 'Unknown Outlet'}
                                              </span>
                                              {sourceName && (
                                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                  📬 {sourceName}
                                                </span>
                                              )}
                                            </div>
                                            
                                            {/* Inventory Item Name */}
                                            <div className="font-medium text-sm">{item.itemName || 'Unnamed Item'}</div>
                                            
                                            {/* Specifications */}
                                            {item.specifications && Object.keys(item.specifications).length > 0 && (
                                              <div className="text-xs text-muted-foreground">
                                                {Object.entries(item.specifications)
                                                  .filter(([_, value]) => value)
                                                  .slice(0, 3)
                                                  .map(([key, value]) => `${key}: ${value}`)
                                                  .join(' • ')}
                                              </div>
                                            )}
                                            
                                            {/* Frequency */}
                                            <div className="text-xs text-muted-foreground">
                                              Frequency: {item.currentFrequency || item.quantity || 1}x per month
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 ml-4">
                                            <div className="text-right space-y-1">
                                              <div className="font-bold">{formatPrice(item.itemCost)}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {(() => {
                                                  const pricingModel = item.itemPricing?.pricingModel;
                                                  const hubPrice = item.itemPricing?.hubPrice || 0;
                                                  const freq = item.currentFrequency || item.quantity || 1;
                                                  
                                                  if (pricingModel === 'cpm' && (item as any).monthlyImpressions) {
                                                    const impressions = (item as any).monthlyImpressions;
                                                    return `$${hubPrice}/1000 impressions × ${(impressions / 1000).toLocaleString()}K`;
                                                  }
                                                  if (pricingModel === 'cpv' && (item as any).monthlyImpressions) {
                                                    const impressions = (item as any).monthlyImpressions;
                                                    return `$${hubPrice}/100 views × ${(impressions / 100).toLocaleString()}`;
                                                  }
                                                  if (pricingModel === 'cpc' && (item as any).monthlyImpressions) {
                                                    const impressions = (item as any).monthlyImpressions;
                                                    const clicks = Math.round(impressions * 0.01);
                                                    return `$${hubPrice}/click × ${clicks.toLocaleString()} clicks`;
                                                  }
                                                  
                                                  // Map pricing models to their display units
                                                  const modelUnits: Record<string, string> = {
                                                    'flat': '/month',
                                                    'monthly': '/month',
                                                    'per_week': '/week',
                                                    'per_day': '/day',
                                                    'per_send': '/send',
                                                    'per_spot': '/spot',
                                                    'per_post': '/post',
                                                    'per_ad': '/ad',
                                                    'per_episode': '/episode',
                                                    'per_story': '/story'
                                                  };
                                                  
                                                  const unit = modelUnits[pricingModel || 'flat'] || '';
                                                  return `$${hubPrice.toLocaleString()}${unit} × ${freq}`;
                                                })()}
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteItem(item.publicationId, item.itemPath);
                                              }}
                                              title="Remove item"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                    </div>
                        );
                                      })}
                                      
                                      {/* Publication Subtotal Calculation */}
                                      {items.length > 1 && (
                                        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                          <div className="font-medium mb-1">{pubName} Calculation:</div>
                                          <div className="space-y-0.5">
                                            {items.map((item, idx) => (
                                              <div key={idx}>
                                                {formatPrice(item.itemCost)}{idx < items.length - 1 ? ' +' : ''}
                  </div>
                ))}
                                            <div className="border-t border-muted-foreground/30 pt-1 font-semibold">
                                              = {formatPrice(pubTotal)}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
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
                              
                              {/* Channel Total Calculation */}
                              <Separator />
                              {Object.keys(itemsByPublication).length > 1 && (
                                <div className="p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                                  <div className="font-medium mb-2">
                                    {channel.charAt(0).toUpperCase() + channel.slice(1)} Channel Calculation:
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {Object.entries(itemsByPublication).map(([pubName, items], idx) => {
                                      const pubTotal = items.reduce((sum, item) => sum + item.itemCost, 0);
                                      return (
                                        <div key={idx} className="flex justify-between">
                                          <span className="truncate mr-2">{pubName}:</span>
                                          <span>{formatPrice(pubTotal)}</span>
                                        </div>
                                      );
                                    })}
                                    <div className="col-span-2 border-t border-muted-foreground/30 pt-1 mt-1 flex justify-between font-semibold">
                                      <span>Total:</span>
                                      <span>= {formatPrice(data.cost)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Channel Total */}
                              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                                <div className="space-y-1">
                                  <div className="font-semibold text-lg">
                                    {channel.charAt(0).toUpperCase() + channel.slice(1)} Total
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {Object.keys(itemsByPublication).length} publications, {data.items.length} items
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
            <TabsContent value="outlet" className="space-y-4 mt-4">
              {/* Detailed Outlet Breakdown */}
              <div className="space-y-3">
              {publications
                  .sort((a, b) => (a.publicationName || '').localeCompare(b.publicationName || '')) // Sort by name alphabetically for stability
                  .map((pub) => {
                    const isExpanded = expandedOutlets.has(pub.publicationId);
                    // Group items by channel
                    const itemsByChannel = (pub.inventoryItems || []).reduce((acc, item) => {
                      if (!item || !item.channel) return acc;
                      if (!acc[item.channel]) {
                        acc[item.channel] = [];
                      }
                      acc[item.channel].push(item);
                      return acc;
                    }, {} as Record<string, any[]>);

                    const totalUnits = (pub.inventoryItems || []).reduce(
                      (sum, item) => sum + (item.currentFrequency || item.quantity || 1), 
                      0
                    );

                    // Recalculate publication total from actual items
                    const actualPublicationTotal = (pub.inventoryItems || []).reduce(
                      (sum, item) => sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1),
                      0
                    );

                    return (
                      <Card key={pub.publicationId} className="overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => toggleOutletExpand(pub.publicationId)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">{pub.publicationName || 'Unknown'}</div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span>{Object.keys(itemsByChannel).length} channels</span>
                                <span>•</span>
                                <span>{pub.inventoryItems?.length || 0} items</span>
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
                                  const channelTotal = items.reduce((sum, item) => {
                                    return sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
                                  }, 0);

                                  return (
                                    <div key={channel} className="space-y-2">
                                      <div className="flex items-center justify-between bg-background p-2 rounded-md">
                                        <Badge variant="secondary" className="capitalize">
                                          {channel}
                                        </Badge>
                                        <div className="text-sm font-semibold">
                                          {formatPrice(channelTotal)}/mo
                                        </div>
                                      </div>

                                      <div className="ml-4 space-y-2">
                                        {items.map((item, idx) => {
                                          const itemCost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
                                          
                                          // Use the sourceName field if available (newsletters, radio shows, podcasts, etc.)
                                          // Fall back to parsing itemName if sourceName not available (for legacy packages)
                                          let sourceName = (item as any).sourceName;
                                          if (!sourceName && item.itemName && item.itemName.includes(' - ')) {
                                            const parts = item.itemName.split(' - ');
                                            if (parts.length > 1) {
                                              sourceName = parts[0]; // Extract the source name before the dash
                                            }
                                          }
                                          
                                          return (
                                            <div key={idx} className="flex items-start justify-between p-3 bg-background rounded-lg border group hover:border-destructive/50 transition-colors">
                                              <div className="flex-1 space-y-1">
                                                {/* Channel Badge & Source Name (for nested items like newsletters) */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <Badge variant="outline" className="capitalize text-xs">
                                                    {channel}
                                                  </Badge>
                                                  {sourceName && (
                                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                      📬 {sourceName}
                                                    </span>
                                                  )}
                                                </div>
                                                
                                                {/* Inventory Item Name */}
                                                <div className="font-medium text-sm">{item.itemName || 'Unnamed Item'}</div>
                                                
                                                {/* Specifications */}
                                                {item.specifications && Object.keys(item.specifications).length > 0 && (
                                                  <div className="text-xs text-muted-foreground">
                                                    {Object.entries(item.specifications)
                                                      .filter(([_, value]) => value)
                                                      .slice(0, 3)
                                                      .map(([key, value]) => `${key}: ${value}`)
                                                      .join(' • ')}
                                                  </div>
                                                )}
                                                
                                                {/* Frequency */}
                                                <div className="text-xs text-muted-foreground">
                                                  Frequency: {item.currentFrequency || item.quantity || 1}x per month
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-3 ml-4">
                                                <div className="text-right space-y-1">
                                                  <div className="font-bold">{formatPrice(itemCost)}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {(() => {
                                                      const pricingModel = item.itemPricing?.pricingModel;
                                                      const hubPrice = item.itemPricing?.hubPrice || 0;
                                                      const freq = item.currentFrequency || item.quantity || 1;
                                                      
                                                      if (pricingModel === 'cpm' && (item as any).monthlyImpressions) {
                                                        const impressions = (item as any).monthlyImpressions;
                                                        return `$${hubPrice}/1000 impressions × ${(impressions / 1000).toLocaleString()}K`;
                                                      }
                                                      if (pricingModel === 'cpv' && (item as any).monthlyImpressions) {
                                                        const impressions = (item as any).monthlyImpressions;
                                                        return `$${hubPrice}/100 views × ${(impressions / 100).toLocaleString()}`;
                                                      }
                                                      if (pricingModel === 'cpc' && (item as any).monthlyImpressions) {
                                                        const impressions = (item as any).monthlyImpressions;
                                                        const clicks = Math.round(impressions * 0.01);
                                                        return `$${hubPrice}/click × ${clicks.toLocaleString()} clicks`;
                                                      }
                                                      
                                                      // Map pricing models to their display units
                                                      const modelUnits: Record<string, string> = {
                                                        'flat': '/month',
                                                        'monthly': '/month',
                                                        'per_week': '/week',
                                                        'per_day': '/day',
                                                        'per_send': '/send',
                                                        'per_spot': '/spot',
                                                        'per_post': '/post',
                                                        'per_ad': '/ad',
                                                        'per_episode': '/episode',
                                                        'per_story': '/story'
                                                      };
                                                      
                                                      const unit = modelUnits[pricingModel || 'flat'] || '';
                                                      return `$${hubPrice.toLocaleString()}${unit} × ${freq}`;
                                                    })()}
                                                  </div>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteItem(pub.publicationId, item.itemPath);
                                                  }}
                                                  title="Remove item"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                        
                                        {/* Channel Items Calculation */}
                                        {items.length > 1 && (
                                          <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                            <div className="font-medium mb-1">
                                              {channel.charAt(0).toUpperCase() + channel.slice(1)} Calculation:
                                            </div>
                                            <div className="space-y-0.5">
                                              {items.map((item, idx) => {
                                                const itemCost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
                                                return (
                                                  <div key={idx}>
                                                    {formatPrice(itemCost)}{idx < items.length - 1 ? ' +' : ''}
                                                  </div>
                                                );
                                              })}
                                              <div className="border-t border-muted-foreground/30 pt-1 font-semibold">
                                                = {formatPrice(channelTotal)}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Removed Items Section for By Outlet */}
                                        {(() => {
                                          const removedItems = getRemovedItemsForPublicationAndChannel(pub.publicationId, channel);
                                          return <RemovedItemsSection removedItems={removedItems} publicationId={pub.publicationId} />;
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                              
                              {/* Outlet Total Calculation */}
                              <Separator />
                              {Object.keys(itemsByChannel).length > 1 && (
                                <div className="p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                                  <div className="font-medium mb-2">
                                    {pub.publicationName} Outlet Calculation:
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {Object.entries(itemsByChannel)
                                      .sort((a, b) => {
                                        const costA = a[1].reduce((sum, item) => 
                                          sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1), 0
                                        );
                                        const costB = b[1].reduce((sum, item) => 
                                          sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1), 0
                                        );
                                        return costB - costA;
                                      })
                                      .map(([channel, items], idx) => {
                                        const channelTotal = items.reduce((sum, item) => {
                                          return sum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
                                        }, 0);
                                        return (
                                          <div key={idx} className="flex justify-between">
                                            <span className="capitalize truncate mr-2">{channel}:</span>
                                            <span>{formatPrice(channelTotal)}</span>
                                          </div>
                                        );
                                      })}
                                    <div className="col-span-2 border-t border-muted-foreground/30 pt-1 mt-1 flex justify-between font-semibold">
                                      <span>Total:</span>
                                      <span>= {formatPrice(pub.publicationTotal || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                    </div>
                        )}
                      </Card>
                    );
                  })}
                  </div>
            </TabsContent>

            {/* Line Items View with Frequency Controls */}
            <TabsContent value="lineitems" className="mt-4">
              <LineItemsDetail
                publications={publications}
                originalPublications={originalPublications}
                onUpdate={onUpdatePublications}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save & Export Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="package-name">Package Name</Label>
            <Input
              id="package-name"
              placeholder="e.g., Q4 South Side Campaign"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading || !packageName.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Package
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={onExportCSV}
              disabled={loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              disabled={loading}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

