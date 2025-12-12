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
    <div className="space-y-6 font-sans">
      {/* Campaign Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold font-sans">Campaign Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-sans">Campaign Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            placeholder="e.g., Summer 2026 Brand Awareness"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-sans">Campaign Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of campaign goals and approach..."
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      {/* Advertiser Information */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold font-sans">Advertiser Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="advertiserName" className="text-sm font-sans">Advertiser Name <span className="text-red-500">*</span></Label>
          <Input
            id="advertiserName"
            placeholder="Company or organization name"
            value={formData.advertiserName}
            onChange={(e) => updateFormData({ advertiserName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactName" className="text-sm font-sans">Contact Name <span className="text-red-500">*</span></Label>
            <Input
              id="contactName"
              placeholder="Primary contact person"
              value={formData.contactName}
              onChange={(e) => updateFormData({ contactName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactCompany" className="text-sm font-sans">Company</Label>
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
            <Label htmlFor="contactEmail" className="text-sm font-sans">Email Address <span className="text-red-500">*</span></Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="contact@example.com"
              value={formData.contactEmail}
              onChange={(e) => updateFormData({ contactEmail: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone" className="text-sm font-sans">Phone Number</Label>
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


