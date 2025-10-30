import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantModal } from "@/components/AssistantModal";
import SurveyForm from "@/components/SurveyForm";

import { CTASection } from "@/components/CTASection";
import { FilterButton } from "@/components/FilterButton";
import { ActiveFilters } from "@/components/ActiveFilters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHubPackages } from "@/hooks/useHubPackages";
import { HubPackage } from "@/integrations/mongodb/hubPackageSchema";
import { audienceTypes, channelTypes, priceRanges, complexityTypes } from "@/constants/packageFilters";
import { Grid, List, Package as PackageIcon, Users, DollarSign, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedPackages } from "@/hooks/useSavedPackages";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Packages = () => {
  const [searchParams] = useSearchParams();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<HubPackage | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [highlightedPackageId, setHighlightedPackageId] = useState<string | null>(null);
  
  const { packages, loading } = useHubPackages({ active_only: true });
  const { savedPackages, toggleSavePackage, isSaved } = useSavedPackages();

  // Handle highlighting from AI recommendations
  useEffect(() => {
    const highlightParam = searchParams.get('highlight');
    if (highlightParam) {
      setHighlightedPackageId(highlightParam);
      
      // Scroll to the highlighted package after a brief delay
      setTimeout(() => {
        const element = document.getElementById(`package-${highlightParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedPackageId(null);
      }, 5000);
    }
  }, [searchParams]);
  
  // Filter states
  const [selectedBudget, setSelectedBudget] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [selectedComplexity, setSelectedComplexity] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const handleAssistantClick = () => {
    setIsAssistantOpen(true);
  };

  const handleAssistantClose = () => {
    setIsAssistantOpen(false);
  };

  const handleViewPackage = (packageId: string) => {
    setIsAssistantOpen(false);
    setHighlightedPackageId(packageId);
    
    // Scroll to the package
    setTimeout(() => {
      const element = document.getElementById(`package-${packageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedPackageId(null);
    }, 5000);
  };

  const handleSavePackage = (id: string) => {
    // Legacy save - you may want to update this
    console.log('Save package:', id);
  };

  const toggleFilter = (currentFilters: string[], value: string) => {
    return currentFilters.includes(value)
      ? currentFilters.filter(f => f !== value)
      : [...currentFilters, value];
  };

  const clearAllFilters = () => {
    setSelectedBudget([]);
    setSelectedAudience([]);
    setSelectedComplexity([]);
    setSelectedChannels([]);
  };

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      // Budget filter
      if (selectedBudget.length > 0 && !selectedBudget.includes(pkg.pricing.priceRange)) {
        return false;
      }

      // Audience filter - check targeting
      if (selectedAudience.length > 0) {
        const demographics = pkg.targeting.demographicTarget;
        const hasMatchingAudience = selectedAudience.some(audience => {
          return demographics?.interests?.includes(audience) ||
                 demographics?.ageRanges?.some(range => range.includes(audience));
        });
        if (!hasMatchingAudience) return false;
      }

      // Complexity filter - map to category
      if (selectedComplexity.length > 0) {
        const isTurnkey = pkg.basicInfo.category === 'geographic' || 
                         pkg.basicInfo.category === 'channel-focused' ||
                         pkg.basicInfo.category === 'seasonal';
        const complexity = isTurnkey ? 'turnkey' : 'custom';
        if (!selectedComplexity.includes(complexity)) return false;
      }

      // Channels filter
      if (selectedChannels.length > 0) {
        const packageChannels = new Set<string>();
        pkg.components.publications.forEach(pub => {
          pub.inventoryItems.forEach(item => {
            packageChannels.add(item.channel);
          });
        });
        const hasMatchingChannel = selectedChannels.some(channel => 
          packageChannels.has(channel as any)
        );
        if (!hasMatchingChannel) return false;
      }

      return true;
    });
  }, [packages, selectedBudget, selectedAudience, selectedComplexity, selectedChannels]);


  return (
    <div className="min-h-screen bg-background">
      <Header onAssistantClick={handleAssistantClick} onSurveyClick={() => setIsSurveyOpen(true)} />
      
      <main>
        {/* Hero Section */}
        <section className="py-16 lg:py-20 bg-gradient-to-br from-background via-brand-cream to-brand-light-gray">
          <div className="container mx-auto px-6 text-center">
            <h1 className="hero-title mb-4">
              Discover Your Perfect <span className="text-accent">Media Package</span>
            </h1>
            <p className="body-large max-w-2xl mx-auto">
              50+ strategic packages. Multiple ways to explore. One perfect solution.
            </p>
          </div>
        </section>

        {/* Active Filters Summary */}
        <ActiveFilters
          selectedBudget={selectedBudget}
          selectedAudience={selectedAudience}
          selectedComplexity={selectedComplexity}
          selectedChannels={selectedChannels}
          onBudgetChange={(budget) => setSelectedBudget(prev => toggleFilter(prev, budget))}
          onAudienceChange={(audience) => setSelectedAudience(prev => toggleFilter(prev, audience))}
          onComplexityChange={(complexity) => setSelectedComplexity(prev => toggleFilter(prev, complexity))}
          onChannelChange={(channel) => setSelectedChannels(prev => toggleFilter(prev, channel))}
        />

        {/* Results Section */}
        <section className="py-8 lg:py-12">
          <div className="container mx-auto px-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {loading ? "Loading packages..." : `Showing ${filteredPackages.length} packages`}
                </h2>
                {savedPackages.length > 0 && (
                  <Badge variant="outline" className="text-accent">
                    {savedPackages.length} saved
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <FilterButton
                  selectedBudget={selectedBudget}
                  selectedAudience={selectedAudience}
                  selectedComplexity={selectedComplexity}
                  selectedChannels={selectedChannels}
                  onBudgetChange={(budget) => setSelectedBudget(prev => toggleFilter(prev, budget))}
                  onAudienceChange={(audience) => setSelectedAudience(prev => toggleFilter(prev, audience))}
                  onComplexityChange={(complexity) => setSelectedComplexity(prev => toggleFilter(prev, complexity))}
                  onChannelChange={(channel) => setSelectedChannels(prev => toggleFilter(prev, channel))}
                  onClearAll={clearAllFilters}
                />
                
                <div className="flex items-center gap-1 border-l pl-3">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Package Grid */}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-16 bg-muted rounded"></div>
                        <div className="flex gap-2">
                          <div className="h-6 w-16 bg-muted rounded"></div>
                          <div className="h-6 w-16 bg-muted rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className={cn(
                "grid gap-6",
                viewMode === "grid" 
                  ? "md:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1 max-w-4xl mx-auto"
              )}>
                {filteredPackages.map(pkg => (
                  <Card
                    key={pkg._id?.toString()}
                    id={`package-${pkg._id?.toString()}`}
                    className={cn(
                      "transition-all duration-300 hover:shadow-lg cursor-pointer",
                      highlightedPackageId === pkg._id?.toString() && "ring-2 ring-accent shadow-xl"
                    )}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-1">{pkg.basicInfo.name}</CardTitle>
                          <CardDescription>{pkg.basicInfo.tagline}</CardDescription>
                        </div>
                        <div className="flex flex-col gap-1">
                          {pkg.availability.isFeatured && (
                            <Badge className="bg-yellow-500 text-white">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          <Badge variant="secondary" className="capitalize">
                            {pkg.basicInfo.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-primary">
                            {pkg.pricing.displayPrice.split('/')[0]}
                          </span>
                          {pkg.pricing.displayPrice.includes('/') && (
                            <span className="text-muted-foreground">
                              /{pkg.pricing.displayPrice.split('/')[1]}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {pkg.basicInfo.description}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <PackageIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Publications</p>
                              <p className="font-semibold">{pkg.components.publications.length}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Reach</p>
                              <p className="font-semibold">
                                {(pkg.performance.estimatedReach.deduplicatedReach || 
                                  pkg.performance.estimatedReach.minReach).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Savings</p>
                              <p className="font-semibold text-green-600">
                                {pkg.pricing.breakdown.packageDiscount}% off
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">CPM</p>
                              <p className="font-semibold">
                                ${pkg.performance.costPerThousand?.toFixed(2) || 'TBD'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 pt-3 border-t">
                          {pkg.marketing.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {pkg.marketing.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{pkg.marketing.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* CTA */}
                        <Button className="w-full mt-2" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPackage(pkg);
                        }}>
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && filteredPackages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No packages match your current filters.</p>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <CTASection onAssistantClick={handleAssistantClick} onSurveyClick={() => setIsSurveyOpen(true)} />

      <Footer />


      <AssistantModal 
        isOpen={isAssistantOpen}
        onClose={handleAssistantClose}
        onViewPackage={handleViewPackage}
      />

      <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />

      {/* Package Detail Modal */}
      {selectedPackage && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPackage(null)}
        >
          <Card 
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">{selectedPackage.basicInfo.name}</CardTitle>
                  <CardDescription className="text-lg">{selectedPackage.basicInfo.tagline}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedPackage(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedPackage.basicInfo.description}</p>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-semibold mb-2">Pricing</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-3xl font-bold mb-2">{selectedPackage.pricing.displayPrice}</p>
                  <p className="text-sm text-muted-foreground">
                    Save {selectedPackage.pricing.breakdown.packageDiscount}% vs buying individually
                  </p>
                  {selectedPackage.pricing.tiers && selectedPackage.pricing.tiers.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedPackage.pricing.tiers.map((tier, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{tier.tierName} ({tier.commitmentLength})</span>
                          <span className="font-semibold">${tier.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Publications Included */}
              <div>
                <h3 className="font-semibold mb-2">
                  Included Publications ({selectedPackage.components.publications.length})
                </h3>
                <div className="space-y-2">
                  {selectedPackage.components.publications.map((pub, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <p className="font-medium">{pub.publicationName}</p>
                      <p className="text-sm text-muted-foreground">
                        {pub.inventoryItems.length} ad placement{pub.inventoryItems.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div>
                <h3 className="font-semibold mb-2">Expected Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Estimated Reach</p>
                    <p className="text-xl font-bold">
                      {selectedPackage.performance.estimatedReach.reachDescription}
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Impressions</p>
                    <p className="text-xl font-bold">
                      {selectedPackage.performance.estimatedImpressions.minImpressions.toLocaleString()}-
                      {selectedPackage.performance.estimatedImpressions.maxImpressions.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ideal For */}
              {selectedPackage.useCases.idealFor.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Ideal For</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedPackage.useCases.idealFor.map((use, index) => (
                      <li key={index} className="text-muted-foreground">{use}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <Button className="w-full" size="lg">
                Request This Package
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Packages;