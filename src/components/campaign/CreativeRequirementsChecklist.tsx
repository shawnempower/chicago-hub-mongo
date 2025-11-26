/**
 * Creative Requirements Checklist
 * 
 * Shows campaign creators what creative assets and specifications are needed
 * for each inventory item in the campaign
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertTriangle, Upload, FileText } from 'lucide-react';
import { Campaign } from '@/integrations/mongodb/campaignSchema';
import { groupRequirementsBySpec } from '@/utils/creativeSpecsGrouping';
import { extractRequirementsForSelectedInventory } from '@/utils/creativeSpecsExtractor';

interface CreativeRequirementsChecklistProps {
  campaign: Campaign | null;
  analysisResult?: any; // For pre-creation view
  onUploadAssets?: () => void;
  compact?: boolean;
  uploadedAssets?: Map<string, any>; // Track uploaded assets
}

interface RequirementItem {
  publicationName: string;
  publicationId: number;
  channel: string;
  placementName: string;
  specifications: {
    dimensions?: string;
    fileFormats?: string[];
    maxFileSize?: string;
    colorSpace?: string;
    resolution?: string;
    additionalRequirements?: string;
  };
  deadline?: string;
  status?: 'pending' | 'submitted' | 'approved';
}

export function CreativeRequirementsChecklist({
  campaign,
  analysisResult,
  onUploadAssets,
  compact = false,
  uploadedAssets
}: CreativeRequirementsChecklistProps) {
  
  // Extract requirements from either campaign or analysis result
  const getRequirements = (): RequirementItem[] => {
    const requirements: RequirementItem[] = [];
    
    const inventory = campaign?.selectedInventory || analysisResult?.selectedInventory;
    if (!inventory?.publications) return requirements;

    inventory.publications.forEach((pub: any) => {
      pub.inventoryItems?.forEach((item: any) => {
        if (item.isExcluded) return; // Skip excluded items
        
        requirements.push({
          publicationName: pub.publicationName,
          publicationId: pub.publicationId,
          channel: item.channel || 'general',
          placementName: item.itemName || item.sourceName || 'Ad Placement',
          specifications: item.specifications || {},
          deadline: campaign?.timeline ? 
            `${Math.ceil((new Date(campaign.timeline.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days before start` 
            : '7 days before start date',
          status: 'pending' // TODO: Track actual status from creative assets
        });
      });
    });

    return requirements;
  };

  const requirements = getRequirements();
  const totalPlacements = requirements.length;
  
  // Group requirements by unique specs (one asset per spec group)
  const allInventoryItems: any[] = [];
  const inventory = campaign?.selectedInventory || analysisResult?.selectedInventory;
  if (inventory?.publications) {
    inventory.publications.forEach((pub: any) => {
      if (pub.inventoryItems) {
        pub.inventoryItems.forEach((item: any) => {
          if (!item.isExcluded) {
            allInventoryItems.push({
              ...item,
              publicationId: pub.publicationId,
              publicationName: pub.publicationName,
              channel: item.channel || 'general'
            });
          }
        });
      }
    });
  }
  
  const extractedRequirements = extractRequirementsForSelectedInventory(allInventoryItems);
  const groupedSpecs = groupRequirementsBySpec(extractedRequirements);
  
  const totalRequirements = groupedSpecs.length; // Total unique spec groups
  
  // Count placements covered by uploaded assets (not just asset groups)
  const placementsCovered = uploadedAssets 
    ? groupedSpecs
        .filter(specGroup => {
          const asset = uploadedAssets.get(specGroup.specGroupId);
          return asset && (asset.uploadStatus === 'uploaded' || asset.fileUrl || asset.file);
        })
        .reduce((sum, specGroup) => sum + specGroup.placementCount, 0)
    : 0;
  
  const completedRequirements = uploadedAssets 
    ? groupedSpecs.filter(specGroup => {
        const asset = uploadedAssets.get(specGroup.specGroupId);
        return asset && (asset.uploadStatus === 'uploaded' || asset.fileUrl || asset.file);
      }).length
    : 0;
  
  const progressPercentage = totalPlacements > 0 ? (placementsCovered / totalPlacements) * 100 : 0;

  // Group by publication for better organization
  const groupedByPublication = requirements.reduce((acc, req) => {
    if (!acc[req.publicationName]) {
      acc[req.publicationName] = [];
    }
    acc[req.publicationName].push(req);
    return acc;
  }, {} as Record<string, RequirementItem[]>);

  if (requirements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Creative Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No inventory items selected yet. Requirements will appear once you analyze the campaign.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-base">Requirements Overview</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {totalPlacements} placements across {Object.keys(groupedByPublication).length} publications
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {placementsCovered}/{totalPlacements}
              </div>
              <div className="text-xs text-gray-500">
                Placements Covered ({Math.round(progressPercentage)}%)
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {completedRequirements}/{totalRequirements} unique assets
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Creative Requirements Checklist</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Materials needed for {totalRequirements} ad placements
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {completedRequirements}/{totalRequirements}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {Object.entries(groupedByPublication).map(([publicationName, items]) => (
          <div key={publicationName} className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-base">{publicationName}</h3>
              <Badge variant="outline">
                {items.filter(i => i.status === 'approved').length}/{items.length} Complete
              </Badge>
            </div>

            <div className="space-y-3">
              {items.map((req, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex-shrink-0 mt-0.5">
                    {req.status === 'approved' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : req.status === 'submitted' ? (
                      <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{req.placementName}</h4>
                        <p className="text-xs text-muted-foreground capitalize">
                          {req.channel}
                        </p>
                      </div>
                      {req.deadline && (
                        <Badge variant="secondary" className="text-xs">
                          Due: {req.deadline}
                        </Badge>
                      )}
                    </div>

                    {/* Specifications */}
                    {Object.keys(req.specifications).length > 0 && (
                      <div className="space-y-1 text-xs">
                        {req.specifications.dimensions && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Size:</span>
                            <span className="font-medium">{req.specifications.dimensions}</span>
                          </div>
                        )}
                        {req.specifications.fileFormats && req.specifications.fileFormats.length > 0 && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Formats:</span>
                            <span className="font-medium">{req.specifications.fileFormats.join(', ')}</span>
                          </div>
                        )}
                        {req.specifications.maxFileSize && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Max Size:</span>
                            <span className="font-medium">{req.specifications.maxFileSize}</span>
                          </div>
                        )}
                        {req.specifications.colorSpace && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Color:</span>
                            <span className="font-medium">{req.specifications.colorSpace}</span>
                          </div>
                        )}
                        {req.specifications.additionalRequirements && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Notes:</span>
                            <span className="font-medium">{req.specifications.additionalRequirements}</span>
                          </div>
                        )}
                        {Object.keys(req.specifications).length === 0 && (
                          <p className="text-muted-foreground italic">
                            Specifications will be confirmed by publication
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Summary note */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          <FileText className="h-4 w-4 inline mr-2" />
          <strong>Note:</strong> Publications may update specifications after reviewing the order. 
          Ensure creative assets are prepared to accommodate potential adjustments.
        </div>
      </CardContent>
    </Card>
  );
}

