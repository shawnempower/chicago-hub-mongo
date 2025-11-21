/**
 * Campaign Package Selection Step - Step 4 Alternative
 * 
 * Allows users to select from pre-built hub packages
 */

import { useEffect, useState } from 'react';
import { useHubContext } from '@/contexts/HubContext';
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, CheckCircle2, Users, MapPin, DollarSign, Calendar } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Currency formatting helper
const formatCurrency = (amount: number) => 
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CampaignPackageSelectionStepProps {
  selectedPackageId?: string;
  onPackageSelect: (packageId: string, packageData: HubPackage) => void;
  budget: number;
}

export function CampaignPackageSelectionStep({ 
  selectedPackageId, 
  onPackageSelect,
  budget 
}: CampaignPackageSelectionStepProps) {
  const { selectedHubId } = useHubContext();
  const [packages, setPackages] = useState<HubPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<HubPackage | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!selectedHubId) {
        setError('No hub selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch all packages for the hub via API
        const response = await fetch(`/api/hub-packages?hubId=${selectedHubId}&isActive=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch packages');
        }
        
        const data = await response.json();
        const allPackages = data.packages || [];
        
        console.log('Fetched packages:', allPackages.length);
        console.log('Package details:', allPackages.map((p: HubPackage) => ({
          name: p.basicInfo?.name,
          isActive: p.availability?.isActive,
          approvalStatus: p.metadata?.approvalStatus
        })));
        
        // Filter to only show active and approved packages
        const activePackages = allPackages.filter((pkg: HubPackage) => 
          pkg.availability?.isActive && 
          (pkg.metadata?.approvalStatus === 'approved' || pkg.metadata?.approvalStatus === 'draft')
        );
        
        console.log('Filtered active packages:', activePackages.length);
        
        setPackages(activePackages);
        
        // If a package is already selected, find it
        if (selectedPackageId) {
          const pkg = activePackages.find((p: HubPackage) => p._id?.toString() === selectedPackageId);
          if (pkg) setSelectedPackage(pkg);
        }
      } catch (err: any) {
        console.error('Failed to fetch packages:', err);
        setError(err.message || 'Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [selectedHubId, selectedPackageId]);

  const handlePackageSelect = (pkg: HubPackage) => {
    setSelectedPackage(pkg);
    if (pkg._id) {
      onPackageSelect(pkg._id.toString(), pkg);
    }
  };

  const getTotalReach = (pkg: HubPackage): number => {
    if (!pkg.components?.publications) return 0;
    return pkg.components.publications.reduce((sum, pub) => sum + (pub.monthlyReach || 0), 0);
  };

  const getPublicationCount = (pkg: HubPackage): number => {
    // Only count publications that have non-excluded items
    return pkg.components?.publications?.filter(pub => 
      pub.inventoryItems?.some(item => !item.isExcluded)
    ).length || 0;
  };

  const getChannels = (pkg: HubPackage): string[] => {
    if (!pkg.components?.publications) return [];
    const channels = new Set<string>();
    pkg.components.publications.forEach(pub => {
      pub.inventoryItems?.forEach(item => {
        // Only include channels from non-excluded items
        if (item.channel && !item.isExcluded) {
          channels.add(item.channel);
        }
      });
    });
    return Array.from(channels);
  };
  
  const getTotalInventoryItems = (pkg: HubPackage): number => {
    if (!pkg.components?.publications) return 0;
    return pkg.components.publications.reduce((sum, pub) => {
      const activeItems = pub.inventoryItems?.filter(item => !item.isExcluded) || [];
      return sum + activeItems.length;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading available packages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Packages Available</h3>
        <p className="text-muted-foreground mb-6">
          There are no active packages available for this hub yet.
        </p>
        <Button onClick={() => window.location.href = '/hubcentral?tab=packages'}>
          Create a Package First
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900 mb-1">Select a Pre-Built Package</p>
          <p className="text-sm text-blue-800">
            Choose from curated packages with proven publication combinations. Each package includes 
            pre-selected inventory, pricing, and reach estimates.
          </p>
        </div>
      </div>

      {/* Budget Comparison */}
      {budget > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            <strong>Your Budget:</strong> {formatCurrency(budget)} 
            <span className="text-amber-700 ml-2">
              (Packages within or close to your budget are highlighted)
            </span>
          </p>
        </div>
      )}

      {/* Package Selection */}
      <RadioGroup 
        value={selectedPackage?._id?.toString()} 
        onValueChange={(value) => {
          const pkg = packages.find(p => p._id?.toString() === value);
          if (pkg) handlePackageSelect(pkg);
        }}
        className="space-y-4"
      >
        {packages.map((pkg) => {
          const totalReach = getTotalReach(pkg);
          const pubCount = getPublicationCount(pkg);
          const channels = getChannels(pkg);
          const isSelected = selectedPackage?._id?.toString() === pkg._id?.toString();
          const packagePrice = pkg.pricing?.breakdown?.finalPrice || 0;
          const isWithinBudget = budget > 0 && packagePrice <= budget * 1.1; // Within 10% of budget
          const packageId = pkg._id?.toString() || '';

          return (
            <div
              key={packageId}
              className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : isWithinBudget
                  ? 'border-blue-300 bg-blue-50/50 hover:border-green-400'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30'
              }`}
              onClick={() => handlePackageSelect(pkg)}
            >
              <div className="flex items-start gap-4">
                <RadioGroupItem value={packageId} id={packageId} className="mt-1" />
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={packageId} className="cursor-pointer text-lg font-bold">
                          {pkg.basicInfo.name}
                        </Label>
                        {isSelected && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                        {isWithinBudget && !isSelected && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700">
                            Within Budget
                          </Badge>
                        )}
                      </div>
                      {pkg.basicInfo.description && (
                        <p className="text-sm text-muted-foreground">{pkg.basicInfo.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(packagePrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.pricing?.displayPrice || ''}
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Publications</p>
                        <p className="text-sm font-semibold">{pubCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Reach</p>
                        <p className="text-sm font-semibold">{totalReach.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Commitment</p>
                        <p className="text-sm font-semibold">{pkg.campaignDetails?.minimumCommitment || 'Flexible'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {channels.map(channel => (
                      <Badge key={channel} variant="secondary" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>

                  {/* Publications Preview */}
                  <details className="mt-3">
                    <summary className="text-sm font-medium text-primary cursor-pointer hover:underline">
                      View Publications ({pubCount})
                    </summary>
                    <div className="mt-2 pl-4 space-y-1">
                      {pkg.components?.publications
                        ?.filter((pub) => pub.inventoryItems?.some((item) => !item.isExcluded))
                        .map((pub) => {
                          const activeItems = pub.inventoryItems?.filter(item => !item.isExcluded) || [];
                          return (
                            <div key={pub.publicationId} className="text-sm text-muted-foreground">
                              • {pub.publicationName} ({activeItems.length} placements)
                            </div>
                          );
                        })}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          );
        })}
      </RadioGroup>

      {/* Selection Confirmation */}
      {selectedPackage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900 mb-1">
                Package Selected: {selectedPackage.basicInfo.name}
              </p>
              <p className="text-sm text-green-800">
                Click "Next" to review your campaign with this package configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

