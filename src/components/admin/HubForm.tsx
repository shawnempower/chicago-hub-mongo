/**
 * HubForm Component
 * 
 * Form for creating and editing hubs with tabbed interface
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hub, HubInsert, HubUpdate, HubAdvertisingTerms, AdvertiserAgreementTerms, HubPlatformBilling, validateHubId } from '@/integrations/mongodb/hubSchema';
import { hubsApi } from '@/api/hubs';
import { toast } from 'sonner';
import { Loader2, FileText, Handshake, Building2, Palette, MapPin, DollarSign } from 'lucide-react';

interface HubFormProps {
  hub?: Hub | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const HubForm: React.FC<HubFormProps> = ({ hub, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    hubId: '',
    name: '',
    tagline: '',
    description: '',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'archived',
    primaryColor: '#0066cc',
    secondaryColor: '',
    region: '',
    primaryCity: '',
    state: '',
    // Advertising Terms (for publication insertion orders)
    leadTime: '',
    materialDeadline: '',
    paymentTerms: '',
    cancellationPolicy: '',
    agencyCommission: '',
    modificationPolicy: '',
    legalDisclaimer: '',
    customTerms: '',
    // Advertiser Agreement Terms (for advertiser contracts)
    agreementPaymentNetDays: '',
    agreementLateFeePercent: '',
    agreementCancellationNoticeDays: '',
    agreementCancellationFeePercent: '',
    agreementCreativeDeadlineDays: '',
    agreementPerformanceDisclaimer: '',
    agreementLiabilityClause: '',
    agreementContentStandards: '',
    agreementCustomTerms: '',
    // Platform Billing (hub fees owed to platform)
    billingRevenueSharePercent: '',
    billingPlatformCpmRate: '',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'campaign-end',
    billingContactEmail: '',
    billingContactName: '',
    billingContactPhone: '',
    billingEffectiveDate: '',
    billingNotes: '',
  });

  useEffect(() => {
    if (hub) {
      setFormData({
        hubId: hub.hubId,
        name: hub.basicInfo.name,
        tagline: hub.basicInfo.tagline || '',
        description: hub.basicInfo.description || '',
        status: hub.status,
        primaryColor: hub.branding?.primaryColor || '#0066cc',
        secondaryColor: hub.branding?.secondaryColor || '',
        region: hub.geography?.region || '',
        primaryCity: hub.geography?.primaryCity || '',
        state: hub.geography?.state || '',
        // Advertising Terms (for publication insertion orders)
        leadTime: hub.advertisingTerms?.standardTerms?.leadTime || '',
        materialDeadline: hub.advertisingTerms?.standardTerms?.materialDeadline || '',
        paymentTerms: hub.advertisingTerms?.standardTerms?.paymentTerms || '',
        cancellationPolicy: hub.advertisingTerms?.standardTerms?.cancellationPolicy || '',
        agencyCommission: hub.advertisingTerms?.standardTerms?.agencyCommission || '',
        modificationPolicy: hub.advertisingTerms?.standardTerms?.modificationPolicy || '',
        legalDisclaimer: hub.advertisingTerms?.legalDisclaimer || '',
        customTerms: hub.advertisingTerms?.customTerms || '',
        // Advertiser Agreement Terms (for advertiser contracts)
        agreementPaymentNetDays: hub.advertiserAgreementTerms?.paymentTerms?.netDays?.toString() || '',
        agreementLateFeePercent: hub.advertiserAgreementTerms?.paymentTerms?.lateFeePercent?.toString() || '',
        agreementCancellationNoticeDays: hub.advertiserAgreementTerms?.cancellationPolicy?.noticeDays?.toString() || '',
        agreementCancellationFeePercent: hub.advertiserAgreementTerms?.cancellationPolicy?.feePercent?.toString() || '',
        agreementCreativeDeadlineDays: hub.advertiserAgreementTerms?.creativeDeadlineDays?.toString() || '',
        agreementPerformanceDisclaimer: hub.advertiserAgreementTerms?.performanceDisclaimer || '',
        agreementLiabilityClause: hub.advertiserAgreementTerms?.liabilityClause || '',
        agreementContentStandards: hub.advertiserAgreementTerms?.contentStandards || '',
        agreementCustomTerms: hub.advertiserAgreementTerms?.customTerms || '',
        // Platform Billing (hub fees owed to platform)
        billingRevenueSharePercent: hub.platformBilling?.revenueSharePercent?.toString() || '',
        billingPlatformCpmRate: hub.platformBilling?.platformCpmRate?.toString() || '',
        billingCycle: hub.platformBilling?.billingCycle || 'monthly',
        billingContactEmail: hub.platformBilling?.billingContact?.email || '',
        billingContactName: hub.platformBilling?.billingContact?.name || '',
        billingContactPhone: hub.platformBilling?.billingContact?.phone || '',
        billingEffectiveDate: hub.platformBilling?.effectiveDate ? new Date(hub.platformBilling.effectiveDate).toISOString().split('T')[0] : '',
        billingNotes: hub.platformBilling?.notes || '',
      });
    }
  }, [hub]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate hubId for new hubs
    if (!hub && !validateHubId(formData.hubId)) {
      toast.error('Hub ID must be lowercase alphanumeric with hyphens, 3-50 characters');
      return;
    }

    setLoading(true);

    try {
      // Build advertising terms object only if any terms are set
      const hasAdvertisingTerms = formData.leadTime || formData.materialDeadline || 
        formData.paymentTerms || formData.cancellationPolicy || formData.agencyCommission || 
        formData.modificationPolicy || formData.legalDisclaimer || formData.customTerms;
      
      const advertisingTerms: HubAdvertisingTerms | undefined = hasAdvertisingTerms ? {
        standardTerms: {
          leadTime: formData.leadTime || undefined,
          materialDeadline: formData.materialDeadline || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          cancellationPolicy: formData.cancellationPolicy || undefined,
          agencyCommission: formData.agencyCommission || undefined,
          modificationPolicy: formData.modificationPolicy || undefined,
        },
        legalDisclaimer: formData.legalDisclaimer || undefined,
        customTerms: formData.customTerms || undefined,
      } : undefined;

      // Build advertiser agreement terms object only if any terms are set
      const hasAgreementTerms = formData.agreementPaymentNetDays || formData.agreementLateFeePercent ||
        formData.agreementCancellationNoticeDays || formData.agreementCancellationFeePercent ||
        formData.agreementCreativeDeadlineDays || formData.agreementPerformanceDisclaimer ||
        formData.agreementLiabilityClause || formData.agreementContentStandards || formData.agreementCustomTerms;

      const advertiserAgreementTerms: AdvertiserAgreementTerms | undefined = hasAgreementTerms ? {
        paymentTerms: (formData.agreementPaymentNetDays || formData.agreementLateFeePercent) ? {
          netDays: formData.agreementPaymentNetDays ? parseInt(formData.agreementPaymentNetDays) : undefined,
          lateFeePercent: formData.agreementLateFeePercent ? parseFloat(formData.agreementLateFeePercent) : undefined,
        } : undefined,
        cancellationPolicy: (formData.agreementCancellationNoticeDays || formData.agreementCancellationFeePercent) ? {
          noticeDays: formData.agreementCancellationNoticeDays ? parseInt(formData.agreementCancellationNoticeDays) : undefined,
          feePercent: formData.agreementCancellationFeePercent ? parseFloat(formData.agreementCancellationFeePercent) : undefined,
        } : undefined,
        creativeDeadlineDays: formData.agreementCreativeDeadlineDays ? parseInt(formData.agreementCreativeDeadlineDays) : undefined,
        performanceDisclaimer: formData.agreementPerformanceDisclaimer || undefined,
        liabilityClause: formData.agreementLiabilityClause || undefined,
        contentStandards: formData.agreementContentStandards || undefined,
        customTerms: formData.agreementCustomTerms || undefined,
      } : undefined;

      // Build platform billing object only if any billing fields are set
      const hasPlatformBilling = formData.billingRevenueSharePercent || formData.billingPlatformCpmRate ||
        formData.billingContactEmail || formData.billingContactName || formData.billingContactPhone ||
        formData.billingEffectiveDate || formData.billingNotes;

      const platformBilling: HubPlatformBilling | undefined = hasPlatformBilling ? {
        revenueSharePercent: formData.billingRevenueSharePercent ? parseFloat(formData.billingRevenueSharePercent) : 0,
        platformCpmRate: formData.billingPlatformCpmRate ? parseFloat(formData.billingPlatformCpmRate) : 0,
        billingCycle: formData.billingCycle,
        billingContact: (formData.billingContactEmail || formData.billingContactName || formData.billingContactPhone) ? {
          email: formData.billingContactEmail || '',
          name: formData.billingContactName || undefined,
          phone: formData.billingContactPhone || undefined,
        } : undefined,
        effectiveDate: formData.billingEffectiveDate ? new Date(formData.billingEffectiveDate) : undefined,
        notes: formData.billingNotes || undefined,
      } : undefined;

      const hubData: HubInsert | Partial<HubUpdate> = {
        hubId: formData.hubId,
        basicInfo: {
          name: formData.name,
          tagline: formData.tagline || undefined,
          description: formData.description || undefined,
        },
        status: formData.status,
        branding: formData.primaryColor || formData.secondaryColor ? {
          primaryColor: formData.primaryColor || undefined,
          secondaryColor: formData.secondaryColor || undefined,
        } : undefined,
        geography: formData.region || formData.primaryCity || formData.state ? {
          region: formData.region || undefined,
          primaryCity: formData.primaryCity || undefined,
          state: formData.state || undefined,
        } : undefined,
        advertisingTerms,
        advertiserAgreementTerms,
        platformBilling,
      };

      if (hub) {
        // Update existing hub
        await hubsApi.update(hub._id as string, {
          ...hubData,
          updatedAt: new Date(),
        });
        toast.success('Hub updated successfully');
      } else {
        // Create new hub
        await hubsApi.create(hubData as HubInsert);
        toast.success('Hub created successfully');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving hub:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save hub');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="publication-terms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Pub Terms</span>
          </TabsTrigger>
          <TabsTrigger value="advertiser-terms" className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">Agreement</span>
          </TabsTrigger>
          <TabsTrigger value="platform-billing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Basic Information</h3>
              <p className="text-sm text-muted-foreground">Core hub details and identification</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hubId">
                  Hub ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hubId"
                  value={formData.hubId}
                  onChange={(e) => setFormData({ ...formData, hubId: e.target.value })}
                  placeholder="chicago-hub"
                  disabled={!!hub}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, alphanumeric with hyphens (cannot be changed after creation)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Hub Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Chicago Hub"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Reaching Chicago's diverse neighborhoods and communities"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="The Chicago Hub connects advertisers with trusted local media outlets..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">Geography</h3>
                <p className="text-sm text-muted-foreground">Regional information</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="Midwest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryCity">Primary City</Label>
                <Input
                  id="primaryCity"
                  value={formData.primaryCity}
                  onChange={(e) => setFormData({ ...formData, primaryCity: e.target.value })}
                  placeholder="Chicago"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Illinois"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-medium">Brand Colors</h3>
            <p className="text-sm text-muted-foreground">Visual customization options for this hub</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#0066cc"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main brand color for buttons, links, and accents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor || '#666666'}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#666666"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Secondary brand color for supporting elements
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-6">
            <h4 className="text-sm font-medium mb-2">Color Preview</h4>
            <div className="flex gap-4 items-center">
              <div 
                className="w-16 h-16 rounded-lg shadow-sm border" 
                style={{ backgroundColor: formData.primaryColor }}
              />
              <div 
                className="w-16 h-16 rounded-lg shadow-sm border" 
                style={{ backgroundColor: formData.secondaryColor || '#666666' }}
              />
              <div className="text-sm text-muted-foreground">
                These colors will be used throughout the hub interface
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Publication Terms Tab */}
        <TabsContent value="publication-terms" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-medium">Publication Insertion Order Terms</h3>
            <p className="text-sm text-muted-foreground">
              Standard terms that apply to all insertion orders sent to publications from this hub
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadTime">Lead Time</Label>
              <Input
                id="leadTime"
                value={formData.leadTime}
                onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                placeholder="e.g., 10 business days"
              />
              <p className="text-xs text-muted-foreground">
                Time required before campaign start
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialDeadline">Material Deadline</Label>
              <Input
                id="materialDeadline"
                value={formData.materialDeadline}
                onChange={(e) => setFormData({ ...formData, materialDeadline: e.target.value })}
                placeholder="e.g., 5 business days before start"
              />
              <p className="text-xs text-muted-foreground">
                When creative assets must be submitted
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="e.g., Net 30"
              />
              <p className="text-xs text-muted-foreground">
                Invoice payment timeline
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
              <Input
                id="cancellationPolicy"
                value={formData.cancellationPolicy}
                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                placeholder="e.g., 10 business days notice required"
              />
              <p className="text-xs text-muted-foreground">
                Notice required for cancellations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencyCommission">Agency Commission</Label>
              <Input
                id="agencyCommission"
                value={formData.agencyCommission}
                onChange={(e) => setFormData({ ...formData, agencyCommission: e.target.value })}
                placeholder="e.g., 15% standard commission"
              />
              <p className="text-xs text-muted-foreground">
                Commission for agency bookings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modificationPolicy">Modification Policy</Label>
              <Input
                id="modificationPolicy"
                value={formData.modificationPolicy}
                onChange={(e) => setFormData({ ...formData, modificationPolicy: e.target.value })}
                placeholder="e.g., Changes require 5 business days notice"
              />
              <p className="text-xs text-muted-foreground">
                Rules for campaign changes
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalDisclaimer">Legal Disclaimer</Label>
            <Textarea
              id="legalDisclaimer"
              value={formData.legalDisclaimer}
              onChange={(e) => setFormData({ ...formData, legalDisclaimer: e.target.value })}
              placeholder="Boilerplate legal text that appears on all insertion orders..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Standard legal language included on all orders
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customTerms">Additional Custom Terms</Label>
            <Textarea
              id="customTerms"
              value={formData.customTerms}
              onChange={(e) => setFormData({ ...formData, customTerms: e.target.value })}
              placeholder="Any additional terms specific to this hub..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Any other terms or conditions for publications
            </p>
          </div>
        </TabsContent>

        {/* Advertiser Agreement Terms Tab */}
        <TabsContent value="advertiser-terms" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-medium">Advertiser Agreement Terms</h3>
            <p className="text-sm text-muted-foreground">
              Terms that appear on advertiser-facing contracts and agreements. Leave blank to use defaults.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agreementPaymentNetDays">Payment Net Days</Label>
              <Input
                id="agreementPaymentNetDays"
                type="number"
                min="0"
                value={formData.agreementPaymentNetDays}
                onChange={(e) => setFormData({ ...formData, agreementPaymentNetDays: e.target.value })}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Days until payment is due (default: 30)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementLateFeePercent">Late Fee Percent</Label>
              <Input
                id="agreementLateFeePercent"
                type="number"
                min="0"
                step="0.1"
                value={formData.agreementLateFeePercent}
                onChange={(e) => setFormData({ ...formData, agreementLateFeePercent: e.target.value })}
                placeholder="1.5"
              />
              <p className="text-xs text-muted-foreground">
                Monthly late fee percentage (default: 1.5%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementCancellationNoticeDays">Cancellation Notice Days</Label>
              <Input
                id="agreementCancellationNoticeDays"
                type="number"
                min="0"
                value={formData.agreementCancellationNoticeDays}
                onChange={(e) => setFormData({ ...formData, agreementCancellationNoticeDays: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Business days notice required for cancellation (default: 10)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementCancellationFeePercent">Cancellation Fee Percent</Label>
              <Input
                id="agreementCancellationFeePercent"
                type="number"
                min="0"
                max="100"
                value={formData.agreementCancellationFeePercent}
                onChange={(e) => setFormData({ ...formData, agreementCancellationFeePercent: e.target.value })}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Fee for late cancellations as % of total (default: 50%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementCreativeDeadlineDays">Creative Deadline Days</Label>
              <Input
                id="agreementCreativeDeadlineDays"
                type="number"
                min="0"
                value={formData.agreementCreativeDeadlineDays}
                onChange={(e) => setFormData({ ...formData, agreementCreativeDeadlineDays: e.target.value })}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Days before start that creative is due (default: 5)
              </p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-medium">Legal Clauses</h4>
            
            <div className="space-y-2">
              <Label htmlFor="agreementPerformanceDisclaimer">Performance Disclaimer</Label>
              <Textarea
                id="agreementPerformanceDisclaimer"
                value={formData.agreementPerformanceDisclaimer}
                onChange={(e) => setFormData({ ...formData, agreementPerformanceDisclaimer: e.target.value })}
                placeholder="Custom performance disclaimer text... (leave blank for default)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Disclaimer about performance estimates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementLiabilityClause">Limitation of Liability</Label>
              <Textarea
                id="agreementLiabilityClause"
                value={formData.agreementLiabilityClause}
                onChange={(e) => setFormData({ ...formData, agreementLiabilityClause: e.target.value })}
                placeholder="Custom liability limitation text... (leave blank for default)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Liability limitation clause
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementContentStandards">Content Standards</Label>
              <Textarea
                id="agreementContentStandards"
                value={formData.agreementContentStandards}
                onChange={(e) => setFormData({ ...formData, agreementContentStandards: e.target.value })}
                placeholder="Custom content standards text... (leave blank for default)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Content and editorial standards
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreementCustomTerms">Additional Agreement Terms</Label>
              <Textarea
                id="agreementCustomTerms"
                value={formData.agreementCustomTerms}
                onChange={(e) => setFormData({ ...formData, agreementCustomTerms: e.target.value })}
                placeholder="Any additional terms to include in advertiser agreements..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Custom terms appended to the agreement
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Platform Billing Tab */}
        <TabsContent value="platform-billing" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-medium">Platform Billing Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure how this hub is charged by the platform. These fees apply to publisher payouts and tracked digital impressions.
            </p>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Platform Fee Structure:</strong> Hubs pay the platform based on (1) a percentage of all publisher payouts, plus (2) a CPM rate on system-tracked digital impressions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingRevenueSharePercent">
                Revenue Share Percentage <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="billingRevenueSharePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.billingRevenueSharePercent}
                  onChange={(e) => setFormData({ ...formData, billingRevenueSharePercent: e.target.value })}
                  placeholder="15"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage of publisher payouts owed to the platform (e.g., 15 for 15%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingPlatformCpmRate">
                Platform CPM Rate <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="billingPlatformCpmRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.billingPlatformCpmRate}
                  onChange={(e) => setFormData({ ...formData, billingPlatformCpmRate: e.target.value })}
                  placeholder="0.50"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                CPM rate for system-tracked digital impressions (e.g., $0.50 per 1,000 impressions)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select 
                value={formData.billingCycle} 
                onValueChange={(value: 'monthly' | 'quarterly' | 'campaign-end') => setFormData({ ...formData, billingCycle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="campaign-end">Campaign End</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When platform invoices are generated for this hub
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingEffectiveDate">Effective Date</Label>
              <Input
                id="billingEffectiveDate"
                type="date"
                value={formData.billingEffectiveDate}
                onChange={(e) => setFormData({ ...formData, billingEffectiveDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                When these billing terms took effect
              </p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-medium">Billing Contact</h4>
            <p className="text-sm text-muted-foreground">
              Contact information for platform billing inquiries and invoices
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingContactEmail">Email</Label>
                <Input
                  id="billingContactEmail"
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                  placeholder="billing@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingContactName">Contact Name</Label>
                <Input
                  id="billingContactName"
                  value={formData.billingContactName}
                  onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingContactPhone">Phone</Label>
                <Input
                  id="billingContactPhone"
                  type="tel"
                  value={formData.billingContactPhone}
                  onChange={(e) => setFormData({ ...formData, billingContactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingNotes">Internal Notes</Label>
            <Textarea
              id="billingNotes"
              value={formData.billingNotes}
              onChange={(e) => setFormData({ ...formData, billingNotes: e.target.value })}
              placeholder="Internal notes about billing arrangement, special terms, etc."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Private notes visible only to platform admins
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Fee Calculation Preview</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Revenue Share:</strong> {formData.billingRevenueSharePercent || '0'}% of all publisher payouts
              </p>
              <p>
                <strong>Platform CPM:</strong> ${formData.billingPlatformCpmRate || '0.00'} per 1,000 tracked digital impressions
              </p>
              <p className="text-xs mt-2 italic">
                Example: If publishers earn $10,000 and 500,000 impressions are tracked, platform fees would be:
                ${((parseFloat(formData.billingRevenueSharePercent) || 0) / 100 * 10000).toFixed(2)} (revenue share) + 
                ${((parseFloat(formData.billingPlatformCpmRate) || 0) * 500).toFixed(2)} (CPM) = 
                ${(((parseFloat(formData.billingRevenueSharePercent) || 0) / 100 * 10000) + ((parseFloat(formData.billingPlatformCpmRate) || 0) * 500)).toFixed(2)} total
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hub ? 'Update Hub' : 'Create Hub'}
        </Button>
      </div>
    </form>
  );
};

