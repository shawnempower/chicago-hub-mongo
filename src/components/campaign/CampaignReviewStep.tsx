/**
 * Campaign Review Step - Step 5 of Campaign Builder
 * 
 * Final review and success confirmation
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Download, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { CampaignAnalysisResponse } from '@/integrations/mongodb/campaignSchema';

interface CampaignReviewStepProps {
  formData: {
    name: string;
    description: string;
    advertiserName: string;
    contactName: string;
    contactEmail: string;
    primaryGoal: string;
    targetAudience: string;
    budget: number;
    channels: string[];
    startDate: Date | null;
    endDate: Date | null;
  };
  result: CampaignAnalysisResponse | null;
  campaignId: string | null;
}

export function CampaignReviewStep({ formData, result, campaignId }: CampaignReviewStepProps) {
  if (!campaignId) {
    // Pre-creation review
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Ready to Create Campaign</h4>
          <p className="text-sm text-blue-800">
            Review the details below and click "Create Campaign" to finalize.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Campaign Name</p>
                <p className="font-semibold">{formData.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Advertiser</p>
                <p className="font-semibold">{formData.advertiserName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Primary Goal</p>
                <p className="font-semibold capitalize">{formData.primaryGoal}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-semibold">${formData.budget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Timeline</p>
                <p className="font-semibold">
                  {formData.startDate && formData.endDate
                    ? `${format(formData.startDate, 'MMM d, yyyy')} - ${format(formData.endDate, 'MMM d, yyyy')}`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Channels</p>
                <p className="font-semibold">{formData.channels.length} selected</p>
              </div>
            </div>

            {result && (
              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      ${result.pricing.finalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Investment</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.selectedInventory.totalInventoryItems}
                    </p>
                    <p className="text-xs text-muted-foreground">Ad Placements</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {result.estimatedPerformance.reach.min.toLocaleString()}+
                    </p>
                    <p className="text-xs text-muted-foreground">Est. Reach</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Post-creation success
  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-green-100 rounded-full p-4 mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Campaign Created Successfully!</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Your campaign "{formData.name}" has been created and saved as a draft. 
          You can now generate an insertion order and submit it for approval.
        </p>
        <Badge variant="secondary" className="mt-4">
          Campaign ID: {campaignId}
        </Badge>
      </div>

      {/* Campaign Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Summary of your newly created campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Campaign Name</p>
              <p className="font-semibold">{formData.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Advertiser</p>
              <p className="font-semibold">{formData.advertiserName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p className="font-semibold">{formData.contactName}</p>
              <p className="text-xs text-muted-foreground">{formData.contactEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge>Draft</Badge>
            </div>
          </div>

          {result && (
            <>
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Investment & Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-600">
                      ${result.pricing.finalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Investment</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-600">
                      {result.estimatedPerformance.reach.min.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Est. Reach</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-purple-600">
                      {result.selectedInventory.totalInventoryItems}
                    </p>
                    <p className="text-xs text-muted-foreground">Placements</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Selected Inventory Breakdown</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(result.selectedInventory.channelBreakdown || {}).map(([channel, count]) => (
                    <div key={channel} className="flex justify-between items-center">
                      <span className="capitalize">{channel}</span>
                      <Badge variant="outline">
                        {count} {count === 1 ? 'placement' : 'placements'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Generate Insertion Order</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Create a professional insertion order document to share with stakeholders or submit to publications.
                </p>
                <Button size="sm" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Generate IO
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Eye className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 mb-1">Review Campaign Details</h4>
                <p className="text-sm text-green-800 mb-3">
                  View the complete campaign with all selected inventory, pricing breakdowns, and performance estimates.
                </p>
                <Button size="sm" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Campaign
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">Submit for Approval</h4>
                <p className="text-sm text-amber-800">
                  When ready, submit the campaign for admin review and approval before launch.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="bg-gray-50 border rounded-lg p-4 text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Your campaign is saved as a draft. You can edit it anytime before submission. 
          All selected inventory is subject to availability at time of final booking.
        </p>
      </div>
    </div>
  );
}


