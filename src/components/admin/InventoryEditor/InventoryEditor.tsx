/**
 * Inventory Editor Component
 * 
 * Main component for editing package/campaign inventory with publication-level
 * pruning controls and item-level frequency adjustments. Provides real-time
 * cost updates and budget validation.
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, Layers, ListChecks } from 'lucide-react';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PublicationControls } from './PublicationControls';
import { ChannelControls } from './ChannelControls';
import { LineItemsDetail } from '../PackageBuilder/LineItemsDetail';
import {
  calculateCampaignTotal,
  calculateSummaryStats,
  validateBudget
} from '@/utils/inventoryPricing';

interface InventoryEditorProps {
  publications: HubPackagePublication[];
  originalPublications?: HubPackagePublication[]; // For restore functionality
  budget?: number; // Monthly budget
  duration: number; // Duration in months
  onChange: (publications: HubPackagePublication[]) => void;
  constraints?: {
    minPublicationSpend?: number;
    maxPublicationPercent?: number;
  };
  readOnly?: boolean;
  showSummary?: boolean;
}

export function InventoryEditor({
  publications,
  originalPublications,
  budget,
  duration,
  onChange,
  constraints = { minPublicationSpend: 500, maxPublicationPercent: 0.25 },
  readOnly = false,
  showSummary = true
}: InventoryEditorProps) {
  const [currentPublications, setCurrentPublications] = useState(publications);

  // Update when publications prop changes
  useEffect(() => {
    setCurrentPublications(publications);
  }, [publications]);

  // Calculate current summary stats (memoized to ensure recalculation on state change)
  const summary = useMemo(() => {
    return calculateSummaryStats(currentPublications, duration);
  }, [currentPublications, duration]);

  const budgetValidation = useMemo(() => {
    return budget 
      ? validateBudget(currentPublications, budget, duration)
      : null;
  }, [currentPublications, budget, duration]);

  // Handle publication change
  const handlePublicationChange = (index: number, updatedPublication: HubPackagePublication) => {
    const newPublications = [...currentPublications];
    newPublications[index] = updatedPublication;
    setCurrentPublications(newPublications);
    onChange(newPublications);
  };

  // Handle publication removal
  const handlePublicationRemove = (index: number) => {
    const newPublications = currentPublications.filter((_, i) => i !== index);
    setCurrentPublications(newPublications);
    onChange(newPublications);
  };

  // Handle item-level changes (from LineItemsDetail)
  const handleLineItemsUpdate = (updatedPublications: HubPackagePublication[]) => {
    setCurrentPublications(updatedPublications);
    onChange(updatedPublications);
  };

  // Get budget color
  const getBudgetColor = () => {
    if (!budgetValidation) return 'bg-blue-500';
    if (budgetValidation.percentageUsed < 90) return 'bg-green-500';
    if (budgetValidation.percentageUsed <= 110) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Get budget text color
  const getBudgetTextColor = () => {
    if (!budgetValidation) return 'text-foreground';
    if (budgetValidation.percentageUsed < 90) return 'text-green-600';
    if (budgetValidation.percentageUsed <= 110) return 'text-amber-600';
    return 'text-red-600';
  };

  // Group by channel for breakdown (memoized for performance)
  const channelBreakdown = useMemo(() => {
    return Object.entries(summary.channelBreakdown)
      .map(([channel, cost]) => ({ channel, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [summary.channelBreakdown]);

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      {showSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Cost Display */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className={`text-3xl font-bold ${getBudgetTextColor()}`}>
                  ${summary.monthlyCost.toLocaleString()}
                </p>
              </div>
              {budget && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Budget: ${budget.toLocaleString()}</p>
                  <p className={`text-xl font-semibold ${getBudgetTextColor()}`}>
                    {budgetValidation?.percentageUsed.toFixed(1)}% Used
                  </p>
                </div>
              )}
            </div>

            {/* Budget Gauge */}
            {budget && budgetValidation && (
              <div className="space-y-2">
                <Progress 
                  value={Math.min(budgetValidation.percentageUsed, 100)} 
                  className="h-2"
                  indicatorClassName={getBudgetColor()}
                />
                {!budgetValidation.valid && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Over budget by ${budgetValidation.overage.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
              <span>
                {summary.totalOutlets} Outlets • {summary.totalChannels} Channels • {summary.totalUnits} Units
              </span>
              <span>Duration: {duration} {duration === 1 ? 'month' : 'months'}</span>
            </div>

            {/* Total Campaign Cost */}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground cursor-help border-b border-dashed">
                        {duration}-Month Total
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs space-y-1 font-mono">
                        <p className="font-semibold">Campaign Total Formula:</p>
                        <p>${summary.monthlyCost.toLocaleString()}/mo × {duration} months</p>
                        <p className="font-bold">= ${summary.totalCost.toLocaleString()}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-xl font-bold">
                  ${summary.totalCost.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Editor Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="publications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="publications">
                <Package className="mr-2 h-4 w-4" />
                By Publication
              </TabsTrigger>
              <TabsTrigger value="channels">
                <Layers className="mr-2 h-4 w-4" />
                By Channel
              </TabsTrigger>
              <TabsTrigger value="lineitems">
                <ListChecks className="mr-2 h-4 w-4" />
                Line Items
              </TabsTrigger>
            </TabsList>

            {/* By Publication View */}
            <TabsContent value="publications" className="space-y-4 mt-4">
              {currentPublications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No publications in this package</p>
                </div>
              ) : (
                currentPublications.map((pub, index) => (
                  <PublicationControls
                    key={pub.publicationId || index}
                    publication={pub}
                    originalPublication={originalPublications?.[index]}
                    totalBudget={budget}
                    constraints={constraints}
                    onChange={(updated) => handlePublicationChange(index, updated)}
                    onRemove={readOnly ? undefined : () => handlePublicationRemove(index)}
                    durationMonths={duration}
                  />
                ))
              )}
            </TabsContent>

            {/* By Channel View */}
            <TabsContent value="channels" className="space-y-3 mt-4">
              {channelBreakdown.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No channel data available</p>
                </div>
              ) : (
                channelBreakdown.map(({ channel, cost }) => (
                  <ChannelControls
                    key={channel}
                    channel={channel}
                    channelCost={cost}
                    publications={currentPublications}
                    originalPublications={originalPublications || currentPublications}
                    totalBudget={budget}
                    onChange={(updatedPublications) => {
                      setCurrentPublications(updatedPublications);
                      onChange(updatedPublications);
                    }}
                    onRemove={readOnly ? undefined : () => {
                      // Channel removal is handled within ChannelControls
                      // This callback is just for additional actions if needed
                    }}
                    durationMonths={duration}
                  />
                ))
              )}
            </TabsContent>

            {/* Line Items View */}
            <TabsContent value="lineitems" className="mt-4">
              <LineItemsDetail
                publications={currentPublications}
                onUpdate={handleLineItemsUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

