import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantModal } from "@/components/AssistantModal";
import SurveyForm from "@/components/SurveyForm";

import { CTASection } from "@/components/CTASection";
import { PackageCard } from "@/components/PackageCard";
import { FilterButton } from "@/components/FilterButton";
import { ActiveFilters } from "@/components/ActiveFilters";
import { PackageModal } from "@/components/PackageModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, convertDatabasePackage } from "@/types/package";
import { usePackages } from "@/hooks/usePackages";
import { audienceTypes, channelTypes, priceRanges, complexityTypes } from "@/constants/packageFilters";
import { Grid, List, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedPackages } from "@/hooks/useSavedPackages";

const Packages = () => {
  const [searchParams] = useSearchParams();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [highlightedPackageId, setHighlightedPackageId] = useState<number | null>(null);
  
  const { packages: dbPackages, loading } = usePackages();
  const packages = dbPackages.map(convertDatabasePackage);
  const { savedPackages, toggleSavePackage, isSaved } = useSavedPackages();

  // Handle highlighting from AI recommendations
  useEffect(() => {
    const highlightParam = searchParams.get('highlight');
    if (highlightParam) {
      const packageId = parseInt(highlightParam);
      setHighlightedPackageId(packageId);
      
      // Scroll to the highlighted package after a brief delay
      setTimeout(() => {
        const element = document.getElementById(`package-${packageId}`);
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

  const handleViewPackage = (packageId: number) => {
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

  const handleSavePackage = (id: number) => {
    toggleSavePackage(id);
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
      if (selectedBudget.length > 0 && !selectedBudget.includes(pkg.priceRange)) {
        return false;
      }

      // Audience filter (OR logic within category)
      if (selectedAudience.length > 0) {
        const hasMatchingAudience = selectedAudience.some(audience => 
          pkg.audience.includes(audience) || pkg.audience.includes("all")
        );
        if (!hasMatchingAudience) return false;
      }

      // Complexity filter
      if (selectedComplexity.length > 0 && !selectedComplexity.includes(pkg.complexity)) {
        return false;
      }

      // Channels filter (OR logic within category)
      if (selectedChannels.length > 0) {
        const hasMatchingChannel = selectedChannels.some(channel => 
          pkg.channels.includes(channel) || pkg.channels.includes("all") || pkg.channels.includes("flexible")
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
                  <div key={i} className="outlet-card animate-pulse">
                    <div className="p-6">
                      <div className="h-6 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded mb-4"></div>
                      <div className="h-16 bg-muted rounded mb-4"></div>
                      <div className="flex gap-2 mb-4">
                        <div className="h-6 w-16 bg-muted rounded"></div>
                        <div className="h-6 w-16 bg-muted rounded"></div>
                      </div>
                    </div>
                  </div>
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
                  <div
                    key={pkg.id}
                    id={`package-${pkg.id}`}
                    className={cn(
                      "transition-all duration-300",
                      highlightedPackageId === pkg.id && "ring-2 ring-accent shadow-lg"
                    )}
                  >
                    <PackageCard
                      packageData={pkg}
                      onSave={handleSavePackage}
                      isSaved={isSaved(pkg.id)}
                      onDetails={setSelectedPackage}
                    />
                  </div>
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

      <PackageModal
        packageData={selectedPackage}
        isOpen={!!selectedPackage}
        onClose={() => setSelectedPackage(null)}
        onSave={handleSavePackage}
        isSaved={selectedPackage ? isSaved(selectedPackage.id) : false}
      />
    </div>
  );
};

export default Packages;