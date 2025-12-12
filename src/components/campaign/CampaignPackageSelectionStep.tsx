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
import { API_BASE_URL } from '@/config/api';

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
        const response = await fetch(`${API_BASE_URL}/hub-packages?hubId=${selectedHubId}&isActive=true`);
        
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
      <div className="space-y-2">
        <h3 className="text-base font-semibold font-sans">Select a Pre-Built Package</h3>
        <p className="text-sm text-gray-600 font-sans">
          Choose from curated packages with proven publication combinations. Each package includes 
          pre-selected inventory, pricing, and reach estimates.
        </p>
      </div>

      {/* Budget Comparison */}
      {budget > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-900 font-sans">
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
              className={`p-5 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-gray-300 bg-gray-50'
                  : isWithinBudget
                  ? 'border-blue-300 bg-blue-50/30 hover:border-gray-400'
                  : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
              }`}
              onClick={() => handlePackageSelect(pkg)}
            >
              <div className="flex items-start gap-4">
                <RadioGroupItem value={packageId} id={packageId} className="mt-1" />
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Label htmlFor={packageId} className="cursor-pointer text-base font-semibold font-sans">
                        {pkg.basicInfo.name}
                      </Label>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary font-sans">
                        {formatCurrency(packagePrice)}
                      </p>
                      <p className="text-xs text-muted-foreground font-sans">
                        {pkg.pricing?.displayPrice || ''}
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics - Containerized */}
                  <div className="p-3 bg-white border border-gray-200 rounded-lg mb-3 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-sans">Publications</p>
                        </div>
                        <p className="text-sm font-semibold font-sans">{pubCount}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-sans">Total Reach</p>
                        </div>
                        <p className="text-sm font-semibold font-sans">{totalReach.toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-sans">Commitment</p>
                        </div>
                        <p className="text-sm font-semibold font-sans">{pkg.campaignDetails?.minimumCommitment || 'Flexible'}</p>
                      </div>
                    </div>
                    
                    {/* Channels */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                      {channels.map(channel => (
                        <span 
                          key={channel} 
                          className="px-2.5 py-1 text-xs font-sans bg-gray-100 border border-gray-300 rounded-full capitalize"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Publications Preview - Containerized */}
                  <details className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <summary className="text-xs font-medium text-primary cursor-pointer hover:underline font-sans">
                      View Publications ({pubCount})
                    </summary>
                    <div className="mt-2 pl-4 space-y-1">
                      {pkg.components?.publications
                        ?.filter((pub) => pub.inventoryItems?.some((item) => !item.isExcluded))
                        .map((pub) => {
                          const activeItems = pub.inventoryItems?.filter(item => !item.isExcluded) || [];
                          return (
                            <div key={pub.publicationId} className="text-xs text-muted-foreground font-sans">
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

    </div>
  );
}

