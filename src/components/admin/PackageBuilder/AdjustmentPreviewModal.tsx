import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingDown, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { applyFrequencyStrategy, calculateMonthlyCost } from '@/utils/frequencyEngine';

interface AdjustmentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publications: HubPackagePublication[];
  strategy: 'standard' | 'reduced' | 'minimum';
  onConfirm: (updatedPublications: HubPackagePublication[]) => void;
}

interface ChangeItem {
  publicationName: string;
  itemName: string;
  fromFrequency: number;
  toFrequency: number;
  fromCost: number;
  toCost: number;
  savings: number;
}

export function AdjustmentPreviewModal({
  open,
  onOpenChange,
  publications,
  strategy,
  onConfirm
}: AdjustmentPreviewModalProps) {
  const [showAllChanges, setShowAllChanges] = useState(false);

  // Calculate changes
  const { beforeCost, afterCost, changes, updatedPublications } = useMemo(() => {
    let beforeCost = 0;
    let afterCost = 0;
    const changes: ChangeItem[] = [];
    
    const updatedPublications = publications.map(pub => {
      const updatedItems = pub.inventoryItems.map(item => {
        const fromFreq = item.currentFrequency || item.quantity || 1;
        const publicationType = item.publicationFrequencyType || 'custom';
        const toFreq = applyFrequencyStrategy(fromFreq, publicationType, strategy);
        
        const unitPrice = item.itemPricing?.hubPrice || 0;
        const fromCost = calculateMonthlyCost(unitPrice, fromFreq);
        const toCost = calculateMonthlyCost(unitPrice, toFreq);
        
        beforeCost += fromCost;
        afterCost += toCost;
        
        if (fromFreq !== toFreq) {
          changes.push({
            publicationName: pub.publicationName,
            itemName: item.itemName,
            fromFrequency: fromFreq,
            toFrequency: toFreq,
            fromCost,
            toCost,
            savings: fromCost - toCost
          });
        }
        
        return {
          ...item,
          currentFrequency: toFreq,
          quantity: toFreq
        };
      });
      
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + calculateMonthlyCost(
          item.itemPricing?.hubPrice || 0,
          item.currentFrequency || item.quantity || 1
        );
      }, 0);
      
      return {
        ...pub,
        inventoryItems: updatedItems,
        publicationTotal: newTotal
      };
    });
    
    return { beforeCost, afterCost, changes, updatedPublications };
  }, [publications, strategy]);

  const savings = beforeCost - afterCost;
  const savingsPercent = beforeCost > 0 ? (savings / beforeCost) * 100 : 0;
  
  // Sample changes (first 5)
  const sampleChanges = changes.slice(0, 5);
  const hasMoreChanges = changes.length > 5;

  const handleConfirm = () => {
    onConfirm(updatedPublications);
    onOpenChange(false);
  };

  const getStrategyLabel = () => {
    switch (strategy) {
      case 'standard':
        return 'standard frequencies';
      case 'reduced':
        return 'half frequency';
      case 'minimum':
        return 'minimum (1x)';
      default:
        return 'frequencies';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Confirm Frequency Adjustment
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Summary */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You're about to adjust all inventory to {getStrategyLabel()}. This will affect:
              </p>

              {/* Cost Impact */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">BEFORE</p>
                  <p className="text-lg font-semibold">${beforeCost.toLocaleString()}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">AFTER</p>
                  <p className="text-lg font-semibold">${afterCost.toLocaleString()}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SAVES</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${savings.toLocaleString()}/mo
                  </p>
                  {savingsPercent > 0 && (
                    <p className="text-xs text-green-600">
                      ({savingsPercent.toFixed(0)}% reduction)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sample Changes */}
            {changes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Sample Changes:</p>
                  <Badge variant="secondary">{changes.length} items affected</Badge>
                </div>

                <div className="space-y-2">
                  {(showAllChanges ? changes : sampleChanges).map((change, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{change.publicationName}</p>
                          <p className="text-xs text-muted-foreground">{change.itemName}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {change.savings > 0 ? `-$${change.savings.toFixed(0)}` : 'No change'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {change.fromFrequency}x → {change.toFrequency}x
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          ${change.fromCost.toFixed(0)} → ${change.toCost.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMoreChanges && !showAllChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAllChanges(true)}
                  >
                    <ChevronDown className="mr-2 h-4 w-4" />
                    View All {changes.length} Changes
                  </Button>
                )}

                {showAllChanges && hasMoreChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAllChanges(false)}
                  >
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Show Less
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">No Changes</p>
                    <p className="text-sm text-muted-foreground">
                      All items are already at {getStrategyLabel()}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={changes.length === 0}
          >
            {changes.length > 0 ? 'Confirm Adjustment' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

