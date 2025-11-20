import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Save,
  Package as PackageIcon,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Trash2,
  X,
  Plus,
  Edit
} from 'lucide-react';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { BuilderResult } from '@/services/packageBuilderService';
import { LineItemsDetail } from './LineItemsDetail';
import { LineItemsTable } from './LineItemsTable';
import { calculateItemCost, calculatePublicationTotal } from '@/utils/inventoryPricing';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { downloadPackageInsertionOrder } from '@/utils/packageExport';
import { formatInsertionOrderQuantity, formatInsertionOrderAudienceWithBadge } from '@/utils/insertionOrderFormatting';
import { ReachSummary } from './ReachSummary';
import { calculatePackageReach } from '@/utils/reachCalculations';

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
  const { toast } = useToast();
  const [packageName, setPackageName] = useState(initialPackageName);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedOutlets, setExpandedOutlets] = useState<Set<number>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempPackageName, setTempPackageName] = useState(initialPackageName);
  const [generatingIO, setGeneratingIO] = useState(false);
  
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

  // Handle generate insertion order
  const handleGenerateInsertionOrder = () => {
    if (!packageName.trim()) {
      toast({
        title: 'Package Name Required',
        description: 'Please enter a package name before generating an insertion order.',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingIO(true);
    try {
      // Generate insertion order HTML with current reach data
      const summaryWithCurrentReach = {
        ...summary,
        totalMonthlyImpressions: currentReach.totalMonthlyImpressions,
        totalMonthlyExposures: currentReach.totalMonthlyExposures,
        estimatedTotalReach: currentReach.estimatedTotalReach,
        estimatedUniqueReach: currentReach.estimatedUniqueReach,
        channelAudiences: currentReach.channelAudiences,
        reachCalculationMethod: currentReach.calculationMethod,
        reachOverlapFactor: currentReach.overlapFactor
      };
      const html = generateInsertionOrderHTML(packageName, publications, summaryWithCurrentReach, duration);
      
      // Download the file
      downloadPackageInsertionOrder(html, 'html', packageName);
      
      toast({
        title: 'Success',
        description: 'Insertion order generated and downloaded successfully',
      });
    } catch (error) {
      console.error('Error generating insertion order:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate insertion order',
        variant: 'destructive'
      });
    } finally {
      setGeneratingIO(false);
    }
  };

  // Generate insertion order HTML
  const generateInsertionOrderHTML = (
    name: string, 
    pubs: HubPackagePublication[], 
    summaryData: any, 
    durationMonths: number
  ): string => {
    const formatCurrency = (amount: number) => 
      `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const formatDate = (date: Date) => 
      date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const totalPublications = pubs.length;
    const totalInventoryItems = pubs.reduce((sum, pub) => 
      sum + (pub.inventoryItems?.filter(item => !item.isExcluded).length || 0), 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Insertion Order - ${name}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1e40af; margin: 0 0 10px 0; font-size: 28px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1e40af; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .info-item { padding: 12px; background: #f8fafc; border-left: 3px solid #2563eb; }
        .info-label { font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; }
        .info-value { color: #1e293b; font-size: 14px; margin-top: 4px; }
        .placeholder { border-bottom: 1px solid #cbd5e1; min-width: 200px; display: inline-block; padding: 2px 4px; }
        .publication-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f9fafb; }
        .publication-header { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
        .publication-name { font-size: 18px; font-weight: 700; color: #1e293b; }
        .publication-total { font-size: 18px; font-weight: 700; color: #059669; }
        .inventory-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .inventory-table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; }
        .inventory-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .channel-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .channel-website { background: #dbeafe; color: #1e40af; }
        .channel-print { background: #f3e8ff; color: #6b21a8; }
        .channel-newsletter { background: #fef3c7; color: #92400e; }
        .pricing-summary { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-top: 20px; }
        .pricing-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; }
        .pricing-row.total { border-top: 2px solid #10b981; margin-top: 10px; padding-top: 15px; font-size: 20px; font-weight: 700; color: #065f46; }
        .terms-list { list-style: none; padding: 0; }
        .terms-list li { padding: 8px 0 8px 24px; position: relative; }
        .terms-list li:before { content: "•"; position: absolute; left: 8px; color: #2563eb; font-weight: bold; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Media Insertion Order</h1>
            <div style="color: #64748b; font-size: 14px; font-weight: 600;">Package: ${name}</div>
        </div>
        <div class="section">
            <h2>Client Information</h2>
            <div class="info-grid">
                <div class="info-item"><div class="info-label">Company Name</div><div class="info-value"><span class="placeholder">&nbsp;</span></div></div>
                <div class="info-item"><div class="info-label">Contact Name</div><div class="info-value"><span class="placeholder">&nbsp;</span></div></div>
                <div class="info-item"><div class="info-label">Contact Email</div><div class="info-value"><span class="placeholder">&nbsp;</span></div></div>
                <div class="info-item"><div class="info-label">Contact Phone</div><div class="info-value"><span class="placeholder">&nbsp;</span></div></div>
            </div>
        </div>
        <div class="section">
            <h2>Included Publications & Inventory</h2>
            <p style="color: #64748b; margin-bottom: 20px;">${totalPublications} publications • ${totalInventoryItems} ad placements</p>
            ${pubs.map(pub => `
                <div class="publication-card">
                    <div class="publication-header">
                        <div class="publication-name">${pub.publicationName}</div>
                        <div class="publication-total">${formatCurrency(pub.publicationTotal)}</div>
                    </div>
                    <table class="inventory-table">
                        <thead><tr><th>Channel</th><th>Ad Placement</th><th>Quantity</th><th>Audience Estimate</th><th>Cost</th></tr></thead>
                        <tbody>
                            ${pub.inventoryItems.map(item => {
                                const hubPrice = item.itemPricing?.hubPrice || 0;
                                
                                // Use standardized formatting functions
                                const quantityDisplay = formatInsertionOrderQuantity(item);
                                const audienceDisplay = formatInsertionOrderAudienceWithBadge(
                                  item, 
                                  (item as any).performanceMetrics,
                                  (item as any).audienceMetrics
                                );
                                
                                return `
                                <tr>
                                    <td><span class="channel-badge channel-${item.channel}">${item.channel}</span></td>
                                    <td>${item.itemName}</td>
                                    <td>${quantityDisplay}</td>
                                    <td style="font-size: 12px; color: #64748b;">${audienceDisplay}</td>
                                    <td>${formatCurrency(hubPrice)}</td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>
        <div class="section">
            <h2>Investment Summary</h2>
            <div class="pricing-summary">
                <div class="pricing-row"><span>Monthly Total:</span><span><strong>${formatCurrency(summaryData.monthlyCost)}</strong></span></div>
                <div class="pricing-row"><span>Campaign Duration:</span><span><strong>${durationMonths} months</strong></span></div>
                <div class="pricing-row total"><span>Total Package Investment:</span><span>${formatCurrency(summaryData.totalCost)}</span></div>
            </div>
        </div>
        ${summaryData.estimatedUniqueReach || summaryData.totalMonthlyExposures || summaryData.totalMonthlyImpressions ? `
        <div class="section">
            <h2>Estimated Reach & Frequency</h2>
            ${summaryData.estimatedUniqueReach ? `
                <div class="pricing-row">
                    <span>Unique Monthly Reach:</span>
                    <span><strong>~${summaryData.estimatedUniqueReach.toLocaleString()} people</strong></span>
                </div>
                <div style="font-size: 11px; color: #64748b; margin: 5px 0 15px 0; font-style: italic;">
                    Estimated number of unique individuals reached
                </div>
            ` : ''}
            ${summaryData.totalMonthlyExposures ? `
                <div class="pricing-row">
                    <span>Total Monthly Exposures:</span>
                    <span><strong>${summaryData.totalMonthlyExposures.toLocaleString()}</strong></span>
                </div>
                <div style="font-size: 11px; color: #64748b; margin: 5px 0 5px 0; font-style: italic;">
                    Total touchpoints including frequency (same person may see message multiple times)
                </div>
                ${summaryData.estimatedUniqueReach && summaryData.totalMonthlyExposures > summaryData.estimatedUniqueReach ? `
                    <div class="pricing-row" style="margin-top: 5px; margin-bottom: 15px;">
                        <span style="font-size: 12px; color: #64748b;">Average Frequency:</span>
                        <span style="font-size: 12px;"><strong>${(summaryData.totalMonthlyExposures / summaryData.estimatedUniqueReach).toFixed(1)}x</strong> per person</span>
                    </div>
                ` : '<div style="margin-bottom: 15px;"></div>'}
            ` : ''}
            ${summaryData.totalMonthlyImpressions ? `
                <div class="pricing-row">
                    <span>Total Monthly Impressions:</span>
                    <span><strong>${summaryData.totalMonthlyImpressions.toLocaleString()}</strong></span>
                </div>
                <div style="font-size: 11px; color: #64748b; margin: 5px 0 15px 0; font-style: italic;">
                    Impression-based metrics from CPM/CPV inventory
                </div>
            ` : ''}
            ${summaryData.estimatedUniqueReach && summaryData.estimatedTotalReach ? `
                <div style="font-size: 11px; color: #64748b; margin-top: 15px; padding: 10px; background: #f8fafc; border-left: 3px solid #2563eb;">
                    <strong>Methodology:</strong> 
                    ${summaryData.totalOutlets === 1 ? 
                        `Single publication across ${summaryData.totalChannels} channel${summaryData.totalChannels > 1 ? 's' : ''}. ` :
                        `${summaryData.totalOutlets} publications across ${summaryData.totalChannels} channel${summaryData.totalChannels > 1 ? 's' : ''}. `
                    }
                    Unique reach assumes ${Math.round((1 - (summaryData.reachOverlapFactor || 0.70)) * 100)}% audience overlap across channels 
                    (Total audience: ${summaryData.estimatedTotalReach?.toLocaleString()}).
                </div>
            ` : ''}
        </div>
        ` : ''}
        <div class="section">
            <h2>Terms & Conditions</h2>
            <ul class="terms-list">
                <li>Lead Time: 10 business days</li>
                <li>Material Deadline: 5 business days before campaign start</li>
                <li>Payment terms: Net 30 days from invoice date</li>
                <li>All pricing reflects Hub discounted rates</li>
            </ul>
        </div>
        <div class="footer">
            <p>Generated on ${formatDate(new Date())}</p>
            <p>Chicago Hub • Supporting Local Journalism • Press Forward Initiative</p>
        </div>
    </div>
</body>
</html>`;
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
              
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                title="Delete Package"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={handleGenerateInsertionOrder}
                variant="outline"
                size="sm"
                disabled={loading || generatingIO}
              >
                {generatingIO ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Order
                  </>
                )}
              </Button>
              
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channel">Package By Channel</TabsTrigger>
          <TabsTrigger value="outlet">Packages by Outlet</TabsTrigger>
          <TabsTrigger value="lineitems">Line Items</TabsTrigger>
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
                      acc[item.channel].push(item);
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

            {/* Line Items View with Frequency Controls */}
            <TabsContent value="lineitems">
              <LineItemsDetail
                publications={publications}
                originalPublications={originalPublications}
                onUpdate={onUpdatePublications}
              />
            </TabsContent>
      </Tabs>
    </div>
  );
}

