/**
 * Campaign Analysis Step - Step 4 of Campaign Builder
 * 
 * Displays AI analysis results with selected inventory, pricing, and performance estimates
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles, AlertCircle, DollarSign, Target, TrendingUp, Package, CheckCircle2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { CampaignAnalysisResponse } from '@/integrations/mongodb/campaignSchema';
import { InventoryEditor } from '@/components/admin/InventoryEditor';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';

interface CampaignAnalysisStepProps {
  analyzing: boolean;
  result: CampaignAnalysisResponse | null;
  error: string | null;
  onReanalyze: () => void;
  onInventoryChange?: (publications: HubPackagePublication[]) => void;
  isSaved?: boolean;
  budget?: number;
  duration?: number;
}

// Algorithm icon mapping
const ALGORITHM_ICONS: Record<string, string> = {
  'all-inclusive': '🌍',
  'budget-friendly': '💰',
  'little-guys': '🏘️',
  'proportional': '📊',
};

export function CampaignAnalysisStep({ 
  analyzing, 
  result, 
  error, 
  onReanalyze, 
  onInventoryChange,
  isSaved,
  budget,
  duration = 1
}: CampaignAnalysisStepProps) {
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  // Debug logging
  console.log('CampaignAnalysisStep render:', { analyzing, hasResult: !!result, error, isSaved });
  if (result) {
    console.log('Result structure:', {
      hasSelectedInventory: !!result.selectedInventory,
      hasPricing: !!result.pricing,
      hasEstimatedPerformance: !!result.estimatedPerformance,
      hasAlgorithm: !!result.algorithm,
    });
    
    // Log first inventory item for debugging
    if (result.selectedInventory?.publications?.[0]?.inventoryItems?.[0]) {
      console.log('Sample inventory item:', result.selectedInventory.publications[0].inventoryItems[0]);
    }
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">AI is analyzing your requirements...</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The AI is reviewing all available inventory across publications, applying Press Forward principles, 
          and selecting the optimal mix for your campaign.
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Analyzing inventory items
          </p>
          <p className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Calculating pricing and discounts
          </p>
          <p className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Estimating reach and performance
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Analysis Failed</h3>
              <p className="text-sm text-red-800 mb-4">
                {error || 'There was an error analyzing your campaign. Please try again.'}
              </p>
              <Button
                onClick={onReanalyze}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No analysis results available</p>
        <Button onClick={onReanalyze} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Analyze Campaign
        </Button>
      </div>
    );
  }

  // Safely destructure with defaults
  const selectedInventory = result.selectedInventory || { publications: [], totalPublications: 0, totalInventoryItems: 0, channelBreakdown: {} };
  const pricing = result.pricing || { 
    finalPrice: 0, 
    total: 0,
    totalStandardPrice: 0, 
    packageDiscount: 0,
    subtotal: 0,
    hubDiscount: 0,
    finalPrice: 0
  };
  const estimatedPerformance = result.estimatedPerformance || { 
    reach: { min: 0, max: 0, description: '' }, 
    impressions: { min: 0, max: 0 },
    cpm: 0
  };

  // Get publications from selectedInventory
  const publications = Array.isArray(selectedInventory.publications) ? selectedInventory.publications : [];

  // Count channels
  const channelCounts = publications.reduce((acc, pub) => {
    if (pub?.inventoryItems && Array.isArray(pub.inventoryItems)) {
      pub.inventoryItems.forEach(item => {
        if (item?.channel) {
          acc[item.channel] = (acc[item.channel] || 0) + 1;
        }
      });
    }
    return acc;
  }, {} as Record<string, number>);

  // Safely get pricing values
  const finalPrice = pricing.finalPrice || pricing.total || 0;
  const totalStandardPrice = pricing.totalStandardPrice || pricing.subtotal || 0;
  const packageDiscount = pricing.packageDiscount || pricing.hubDiscount || 0;
  const savings = totalStandardPrice - finalPrice;

  return (
    <div className="space-y-6">
      {/* Saved Status Banner */}
      {isSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-green-900">Campaign Saved</h4>
            <p className="text-sm text-green-700">
              Your campaign has been automatically saved as a draft. You can view and edit it anytime.
            </p>
          </div>
        </div>
      )}

      {/* AI Analysis Info */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Analysis Complete
            </CardTitle>
            {result.algorithm && (
              <Badge variant="secondary">
                {ALGORITHM_ICONS[result.algorithm.id] || '🎯'} {result.algorithm.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Selected {selectedInventory.totalPublications} publications with {selectedInventory.totalInventoryItems} inventory items based on your campaign requirements.
            </p>
            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs font-semibold text-amber-900 mb-1">Warnings:</p>
                <ul className="text-xs text-amber-800 list-disc list-inside">
                  {result.warnings.slice(0, 3).map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Investment</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              ${finalPrice.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Standard: ${totalStandardPrice.toLocaleString()}</p>
              <p>Hub Discount: {packageDiscount.toFixed(1)}%</p>
              <p className="font-semibold text-green-600">
                Savings: ${savings.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Estimated Reach</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              {estimatedPerformance.reach.min.toLocaleString()}+
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Range: {estimatedPerformance.reach.min.toLocaleString()} - {estimatedPerformance.reach.max.toLocaleString()}</p>
              <p className="text-blue-600">{estimatedPerformance.reach.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Est. Impressions</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              {estimatedPerformance.impressions.min.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>CPM: ${estimatedPerformance.cpm?.toFixed(2) || 'N/A'}</p>
              <p>Total: {estimatedPerformance.impressions.min.toLocaleString()} - {estimatedPerformance.impressions.max.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Overview</CardTitle>
          <CardDescription>
            {selectedInventory.totalPublications} publications • {selectedInventory.totalInventoryItems} ad placements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Channel Breakdown */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Channels Included</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(channelCounts).map(([channel, count]) => (
                <Badge key={channel} variant="outline">
                  {channel}: {count} {count === 1 ? 'placement' : 'placements'}
                </Badge>
              ))}
            </div>
          </div>

          {/* Inventory by Publication */}
          <div>
            <h4 className="font-semibold mb-3">Selected Inventory</h4>
            {publications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No publications selected</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {publications.map((pub, pubIdx) => {
                  if (!pub) return null;
                  const pubInventoryItems = Array.isArray(pub.inventoryItems) ? pub.inventoryItems : [];
                  
                  return (
                    <div key={pubIdx} className="border rounded-lg p-4">
                      <h5 className="font-semibold mb-2">{pub.publicationName || 'Unknown Publication'}</h5>
                      <div className="space-y-2">
                        {pubInventoryItems.map((item, itemIdx) => {
                          if (!item) return null;
                          
                          // Get cost from multiple possible locations
                          const itemCost = item.itemPricing?.totalCost 
                            || item.campaignCost 
                            || item.monthlyCost 
                            || 0;
                          
                          // Build description from available fields
                          const pricingModel = item.itemPricing?.pricingModel || '';
                          const quantity = item.quantity || 0;
                          const frequency = item.frequency || '';
                          const duration = item.duration || '';
                          
                          let details = `${item.channel || 'N/A'}`;
                          if (pricingModel) details += ` • ${pricingModel}`;
                          if (quantity > 0) details += ` • Qty: ${quantity}`;
                          if (frequency) details += ` • ${frequency}`;
                          if (duration) details += ` • ${duration}`;
                          
                          return (
                            <div key={itemIdx} className="flex justify-between items-start text-sm bg-gray-50 p-2 rounded">
                              <div className="flex-1">
                                <p className="font-medium">{item.itemName || 'Unnamed Item'}</p>
                                <p className="text-xs text-muted-foreground">{details}</p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold">
                                  {itemCost > 0 ? `$${itemCost.toLocaleString()}` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 pt-2 border-t text-right">
                        <p className="text-sm font-semibold">Publication Total: ${pub.publicationTotal?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      {pricing.tiers && pricing.tiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Tiers</CardTitle>
            <CardDescription>Volume discounts for longer commitments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricing.tiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <h4 className="font-semibold mb-1">{tier.tierName}</h4>
                  <p className="text-2xl font-bold mb-2">${tier.price.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mb-2">{tier.commitmentLength}</p>
                  {tier.savingsPercentage > 0 && (
                    <Badge variant="secondary" className="text-green-600">
                      Save {tier.savingsPercentage}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fine-Tune Inventory Section */}
      {onInventoryChange && publications.length > 0 && (
        <Card>
          <CardHeader>
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            >
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">Fine-Tune Inventory</CardTitle>
                  <CardDescription>
                    Adjust publication volumes and frequencies to manage costs
                  </CardDescription>
                </div>
                {hasEdited && (
                  <Badge variant="secondary" className="ml-2">Edited</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm">
                {isEditorExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isEditorExpanded && (
            <CardContent>
              <InventoryEditor
                publications={publications}
                budget={budget}
                duration={duration}
                onChange={(updatedPublications) => {
                  setHasEdited(true);
                  onInventoryChange(updatedPublications);
                }}
                showSummary={false}
              />
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <p className="font-semibold mb-1">💡 Tip: Managing Costs</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>Use publication-level scale controls to adjust entire outlets</li>
                  <li>Fine-tune individual item frequencies in the Line Items tab</li>
                  <li>Remove publications if needed to stay within budget</li>
                  <li>All changes update pricing in real-time</li>
                </ul>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Reanalyze Option */}
      <div className="flex justify-center pt-4">
        <Button onClick={onReanalyze} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reanalyze with Different Parameters
        </Button>
      </div>
    </div>
  );
}

