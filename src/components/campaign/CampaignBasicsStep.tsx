/**
 * Campaign Basics Step - Step 1 of Campaign Builder
 * 
 * Collects basic campaign information and advertiser details
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CampaignBasicsStepProps {
  formData: {
    name: string;
    description: string;
    advertiserName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactCompany: string;
  };
  updateFormData: (updates: Partial<CampaignBasicsStepProps['formData']>) => void;
}

export function CampaignBasicsStep({ formData, updateFormData }: CampaignBasicsStepProps) {
  return (
    <div className="space-y-6">
      {/* Campaign Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Campaign Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            placeholder="e.g., Summer 2026 Brand Awareness"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            A descriptive name for this campaign
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Campaign Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of campaign goals and approach..."
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Optional: Add details about the campaign strategy
          </p>
        </div>
      </div>

      {/* Advertiser Information */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Advertiser Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="advertiserName">Advertiser Name <span className="text-red-500">*</span></Label>
          <Input
            id="advertiserName"
            placeholder="Company or organization name"
            value={formData.advertiserName}
            onChange={(e) => updateFormData({ advertiserName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name <span className="text-red-500">*</span></Label>
            <Input
              id="contactName"
              placeholder="Primary contact person"
              value={formData.contactName}
              onChange={(e) => updateFormData({ contactName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactCompany">Company</Label>
            <Input
              id="contactCompany"
              placeholder="Organization (if different)"
              value={formData.contactCompany}
              onChange={(e) => updateFormData({ contactCompany: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email Address <span className="text-red-500">*</span></Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="contact@example.com"
              value={formData.contactEmail}
              onChange={(e) => updateFormData({ contactEmail: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone Number</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.contactPhone}
              onChange={(e) => updateFormData({ contactPhone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This information will be used in the insertion order and for campaign communications.
        </p>
      </div>
    </div>
  );
}


