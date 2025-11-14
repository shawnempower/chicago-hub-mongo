import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { HubPackagePublication, HubPackageInventoryItem, PublicationFrequencyType } from '@/integrations/mongodb/hubPackageSchema';
import {
  getFrequencyOptionsWithLabels,
  getPublicationTypeLabel,
  isAtMaxFrequency
} from '@/utils/frequencyEngine';
import { calculateItemCost, calculatePublicationTotal } from '@/utils/inventoryPricing';
import { getFrequencyLabel, getFrequencyUnit } from '@/utils/frequencyLabels';
import { Button } from '@/components/ui/button';

interface LineItemsDetailProps {
  publications: HubPackagePublication[];
  originalPublications: HubPackagePublication[];
  onUpdate: (publications: HubPackagePublication[]) => void;
}

export function LineItemsDetail({ publications, originalPublications, onUpdate }: LineItemsDetailProps) {
  const [collapsedTypes, setCollapsedTypes] = useState<Set<PublicationFrequencyType>>(new Set());

  // Group publications by frequency type
  const publicationsByType = publications.reduce((acc, pub) => {
    const type = pub.publicationFrequencyType || 'custom';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(pub);
    return acc;
  }, {} as Record<PublicationFrequencyType, HubPackagePublication[]>);

  const toggleCollapse = (type: PublicationFrequencyType) => {
    setCollapsedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
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

  // Handler: Add item back
  const handleAddItem = (publicationId: number, itemToAdd: any) => {
    const updatedPublications = publications.map(pub => {
      if (pub.publicationId !== publicationId) return pub;
      
      // Add item back to the list
      const newItems = [...(pub.inventoryItems || []), itemToAdd];
      
      // Recalculate total
      const newTotal = calculatePublicationTotal({
        ...pub,
        inventoryItems: newItems
      });
      
      return {
        ...pub,
        inventoryItems: newItems,
        publicationTotal: newTotal
      };
    });
    
    onUpdate(updatedPublications);
  };

  // Format price helper
  const formatPrice = (amount: number) => `$${Math.round(amount).toLocaleString()}`;

  const handleFrequencyChange = (
    pubId: number,
    itemIndex: number,
    newFrequency: number
  ) => {
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

    onUpdate(updatedPublications);
  };

  const renderInventoryItem = (
    pub: HubPackagePublication,
    item: HubPackageInventoryItem,
    itemIndex: number
  ) => {
    const frequency = item.currentFrequency || item.quantity || 1;
    const unitPrice = item.itemPricing?.hubPrice || 0;
    const pricingModel = item.itemPricing?.pricingModel || 'flat';
    const monthlyCost = calculateItemCost(item, frequency);
    const publicationType = item.publicationFrequencyType || 'custom';
    
    // Determine if frequency should be adjustable based on pricing model
    // Only monthly/flat should be locked (already fixed monthly rate)
    // per_week, per_day represent "how many weeks/days per month"
    // cpm/cpv/cpc will use impression percentage instead of frequency
    const fixedFrequencyModels = ['monthly', 'flat'];
    const isFrequencyLocked = fixedFrequencyModels.includes(pricingModel);
    const isImpressionBased = ['cpm', 'cpv', 'cpc'].includes(pricingModel);
    
    // For per_week and per_day, create custom frequency options
    let frequencyOptions: Array<{value: number, label: string}> = [];
    if (!isFrequencyLocked && !isImpressionBased) {
      if (pricingModel === 'per_week') {
        // For weekly pricing, show 1-4 weeks (4 is full month)
        frequencyOptions = [
          { value: 4, label: '4 weeks (full month)' },
          { value: 3, label: '3 weeks' },
          { value: 2, label: '2 weeks' },
          { value: 1, label: '1 week' }
        ];
      } else if (pricingModel === 'per_day') {
        // For daily pricing, show common options
        frequencyOptions = [
          { value: 30, label: '30 days (full month)' },
          { value: 20, label: '20 days' },
          { value: 15, label: '15 days' },
          { value: 10, label: '10 days' },
          { value: 5, label: '5 days' },
          { value: 1, label: '1 day' }
        ];
      } else if (pricingModel === 'per_spot') {
        // For radio/podcast spots, show common options based on spots per month
        frequencyOptions = [
          { value: 30, label: '30 spots/month (daily)' },
          { value: 22, label: '22 spots/month (weekdays)' },
          { value: 17, label: '17 spots/month (4x/week)' },
          { value: 13, label: '13 spots/month (3x/week)' },
          { value: 9, label: '9 spots/month (2x/week)' },
          { value: 4, label: '4 spots/month (weekly)' },
          { value: 2, label: '2 spots/month (bi-weekly)' },
          { value: 1, label: '1 spot/month' }
        ];
      } else {
        // For other models, use standard publication frequency options
        frequencyOptions = getFrequencyOptionsWithLabels(publicationType);
      }
    }
    const atMax = isAtMaxFrequency(frequency, publicationType);

    // Get pricing model display label
    const getPricingModelLabel = (model: string) => {
      const labels: Record<string, string> = {
        'flat': 'Flat Rate',
        'monthly': 'Monthly',
        'per_week': 'Per Week',
        'per_day': 'Per Day',
        'per_send': 'Per Send',
        'per_spot': 'Per Spot',
        'per_post': 'Per Post',
        'per_ad': 'Per Ad',
        'per_episode': 'Per Episode',
        'per_story': 'Per Story',
        'cpm': 'CPM',
        'cpv': 'CPV',
        'cpc': 'CPC',
        'cpd': 'CPD'
      };
      return labels[model] || model.toUpperCase();
    };

    return (
      <div key={`${pub.publicationId}-${itemIndex}`} className="border rounded-lg p-4 space-y-3">
        {/* Item Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium">{item.itemName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {item.channel}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getPricingModelLabel(pricingModel)}
              </Badge>
              {(item as any).originalFrequency && (
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                  Show: {(item as any).originalFrequency}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                ${unitPrice.toFixed(2)} / unit
              </span>
            </div>
          </div>
        </div>

        {/* Frequency/Impression Control */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            {/* For impression-based pricing (CPM/CPV/CPC), show percentage selector */}
            {isImpressionBased && (item as any).monthlyImpressions ? (
              <>
                <label className="text-xs text-muted-foreground">Impression Coverage</label>
                <Select
                  value={frequency.toString()}
                  onValueChange={(value) => handleFrequencyChange(pub.publicationId, itemIndex, parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25% of impressions</SelectItem>
                    <SelectItem value="50">50% of impressions</SelectItem>
                    <SelectItem value="75">75% of impressions</SelectItem>
                    <SelectItem value="100">100% of impressions</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {Math.round(((item as any).monthlyImpressions * frequency) / 100).toLocaleString()} impressions/mo
                </p>
              </>
            ) : (
              /* Standard frequency control for other pricing models */
              <>
                <label className="text-xs text-muted-foreground">Frequency</label>
                {!isFrequencyLocked && frequencyOptions.length > 1 ? (
                  <Select
                    value={frequency.toString()}
                    onValueChange={(value) => handleFrequencyChange(pub.publicationId, itemIndex, parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label || getFrequencyLabel(opt.value, pricingModel)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                    <span className="text-sm">{getFrequencyLabel(frequency, pricingModel)}</span>
                  </div>
                )}
                {isFrequencyLocked && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Fixed monthly rate
                  </div>
                )}
                {!isFrequencyLocked && atMax && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Max frequency for {publicationType} publication
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Monthly Cost</label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
              <span className="text-sm font-semibold">${monthlyCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Cost Formula */}
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground mb-1 block">Cost Calculation</label>
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
            <p className="text-xs font-mono text-blue-900">
              {(() => {
                const unit = getFrequencyUnit(pricingModel);
                const totalImpressions = (item as any).monthlyImpressions;
                
                switch (pricingModel) {
                  case 'cpm':
                    if (totalImpressions) {
                      const purchasedImpressions = Math.round((totalImpressions * frequency) / 100);
                      return `(${purchasedImpressions.toLocaleString()} impressions [${frequency}%] ÷ 1,000) × $${unitPrice} CPM = $${monthlyCost.toFixed(2)}`;
                    }
                    return `$${unitPrice} CPM × ${frequency}% = $${monthlyCost.toFixed(2)}`;
                  case 'cpv':
                    if (totalImpressions) {
                      const purchasedViews = Math.round((totalImpressions * frequency) / 100);
                      return `(${purchasedViews.toLocaleString()} views [${frequency}%] ÷ 100) × $${unitPrice} CPV = $${monthlyCost.toFixed(2)}`;
                    }
                    return `$${unitPrice} CPV × ${frequency}% = $${monthlyCost.toFixed(2)}`;
                  case 'cpc':
                    if (totalImpressions) {
                      const purchasedImpressions = Math.round((totalImpressions * frequency) / 100);
                      const estimatedClicks = Math.round(purchasedImpressions * 0.01);
                      return `${estimatedClicks.toLocaleString()} clicks [${frequency}% × 1% CTR] × $${unitPrice} CPC = $${monthlyCost.toFixed(2)}`;
                    }
                    return `$${unitPrice} CPC × ${frequency}% = $${monthlyCost.toFixed(2)}`;
                  case 'per_week':
                    return `$${unitPrice}/week × ${frequency} weeks/month = $${monthlyCost.toFixed(2)}`;
                  case 'per_day':
                    return `$${unitPrice}/day × ${frequency} days/month = $${monthlyCost.toFixed(2)}`;
                  case 'per_spot':
                    return `$${unitPrice}/spot × ${frequency} spots/month = $${monthlyCost.toFixed(2)}`;
                  case 'per_send':
                    return `$${unitPrice}/send × ${frequency} sends/month = $${monthlyCost.toFixed(2)}`;
                  case 'per_post':
                    return `$${unitPrice}/post × ${frequency} posts/month = $${monthlyCost.toFixed(2)}`;
                  case 'per_episode':
                    return `$${unitPrice}/episode × ${frequency} episodes/month = $${monthlyCost.toFixed(2)}`;
                  case 'flat':
                  case 'monthly':
                    return `$${unitPrice}/month`;
                  default:
                    return `${frequency} ${unit} × $${unitPrice} = $${monthlyCost.toFixed(2)}`;
                }
              })()}
            </p>
          </div>
        </div>

        {/* Specifications */}
        {item.specifications && Object.keys(item.specifications).length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {Object.entries(item.specifications)
                .filter(([key, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' • ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPublicationGroup = (type: PublicationFrequencyType) => {
    const pubs = publicationsByType[type];
    if (!pubs || pubs.length === 0) return null;

    const isCollapsed = collapsedTypes.has(type);
    // Recalculate total cost from actual items instead of using stored publicationTotal
    const totalCost = pubs.reduce((sum, pub) => {
      const pubTotal = (pub.inventoryItems || []).reduce((itemSum, item) => {
        return itemSum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
      }, 0);
      return sum + pubTotal;
    }, 0);
    const totalItems = pubs.reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0);

    return (
      <div key={type} className="space-y-3">
        {/* Group Header */}
        <div
          className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
          onClick={() => toggleCollapse(type)}
        >
          <div className="flex items-center gap-3">
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-semibold">{getPublicationTypeLabel(type)}</h3>
              <p className="text-sm text-muted-foreground">
                {pubs.length} outlets • {totalItems} items
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">${totalCost.toLocaleString()}/mo</p>
          </div>
        </div>

        {/* Items */}
        {!isCollapsed && (
          <div className="space-y-6 pl-4">
            {pubs.map((pub) => {
              // Recalculate publication total from actual items
              const pubTotal = (pub.inventoryItems || []).reduce((itemSum, item) => {
                return itemSum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
              }, 0);
              
              return (
              <div key={pub.publicationId} className="border rounded-lg overflow-hidden bg-card">
                {/* Publication Header */}
                <div className="flex items-center justify-between p-4 bg-muted/30">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{pub.publicationName || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {pub.inventoryItems?.length || 0} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      ${pubTotal.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      per month
                    </div>
                  </div>
                </div>

                {/* Inventory Items */}
                <div className="p-4 space-y-2 bg-background">
                  {(pub.inventoryItems || []).map((item, idx) => 
                    renderInventoryItem(pub, item, idx)
                  )}
                  
                  {/* Removed Items Section for Line Items */}
                  {(() => {
                    const removedItems = getRemovedItemsForPublication(pub.publicationId);
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
                                className="flex items-center justify-between p-3 bg-amber-50/50 rounded border border-amber-200 border-dashed hover:bg-amber-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-muted-foreground line-through">
                                      {item.itemName}
                                    </span>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {item.channel}
                                    </Badge>
                                    {(item as any).sourceName && (
                                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                                        {(item as any).sourceName}
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
                                  onClick={() => handleAddItem(pub.publicationId, item)}
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
                  })()}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Define the order of publication types
  const typeOrder: PublicationFrequencyType[] = ['daily', 'weekly', 'bi-weekly', 'monthly', 'custom'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <p className="text-sm text-muted-foreground">
          Adjust frequencies for individual items
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Expand/collapse all
            if (collapsedTypes.size === 0) {
              setCollapsedTypes(new Set(typeOrder));
            } else {
              setCollapsedTypes(new Set());
            }
          }}
        >
          {collapsedTypes.size === 0 ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      <div className="space-y-6 mt-4">
        {typeOrder.map(type => renderPublicationGroup(type))}
      </div>
    </div>
  );
}

