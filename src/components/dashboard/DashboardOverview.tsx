import { usePublication } from "@/contexts/PublicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  Building2, 
  MessageCircle, 
  FileText,
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  HelpCircle,
  CheckCircle2
} from "lucide-react";
import { calculateRevenue } from '@/utils/pricingCalculations';
import { PublicationDataQuality, calculateDataQuality } from '@/components/admin/PublicationDataQuality';
import { useMemo, useRef } from "react";
// MongoDB services removed - using API calls instead

export function DashboardOverview() {
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();
  const inventoryQualityRef = useRef<HTMLDivElement>(null);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const recentActivity = [
    { type: "booking", message: "New ad booking for Newsletter Header", time: "2 hours ago" },
    { type: "inquiry", message: "Inquiry for Website Banner placement", time: "5 hours ago" },
    { type: "file", message: "Media kit updated", time: "1 day ago" },
    { type: "payment", message: "Payment received for Print Ad", time: "2 days ago" }
  ];

  const quickActions = [
    { 
      title: "Manage Inventory", 
      description: "Update advertising slots and pricing",
      icon: Package,
      tab: "inventory"
    },
    { 
      title: "Upload Files", 
      description: "Add media kits and resources",
      icon: FileText,
      tab: "knowledgebase"
    },
    { 
      title: "Edit Profile", 
      description: "Update publication information",
      icon: Building2,
      tab: "profile"
    },
    { 
      title: "Settings", 
      description: "Configure publication settings",
      icon: Settings,
      tab: "settings"
    }
  ];

  const handleQuickAction = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  const scrollToInventoryQuality = () => {
    inventoryQualityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Use the same calculation logic as the detailed PublicationDataQuality component
  const inventoryQuality = useMemo(() => calculateDataQuality(selectedPublication), [selectedPublication]);

  // Calculate key metrics
  const calculateMetrics = () => {
    let totalInventory = 0;
    let totalRevenuePotential = 0;
    let totalReach = 0;
    let activeChannels = 0;
    let hubPricingCount = 0;

    // Website
    if (selectedPublication.distributionChannels.website?.advertisingOpportunities) {
      const websiteAds = selectedPublication.distributionChannels.website.advertisingOpportunities;
      totalInventory += websiteAds.length;
      activeChannels++;
      totalReach += selectedPublication.distributionChannels.website.metrics?.monthlyVisitors || 0;
      
      websiteAds.forEach((ad: any) => {
        totalRevenuePotential += calculateRevenue(ad, 'month');
        if (ad.hubPricing?.length > 0) hubPricingCount++;
      });
    }

    // Newsletters
    if (selectedPublication.distributionChannels.newsletters?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.newsletters.forEach((newsletter: any) => {
        totalReach += newsletter.subscribers || 0;
        if (newsletter.advertisingOpportunities) {
          totalInventory += newsletter.advertisingOpportunities.length;
          newsletter.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', newsletter.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Print
    if (Array.isArray(selectedPublication.distributionChannels.print) && selectedPublication.distributionChannels.print.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.print.forEach((print: any) => {
        totalReach += print.circulation || 0;
        if (print.advertisingOpportunities) {
          totalInventory += print.advertisingOpportunities.length;
          print.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', print.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Social Media
    if (selectedPublication.distributionChannels.socialMedia?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.socialMedia.forEach((social: any) => {
        totalReach += social.metrics?.followers || 0;
        if (social.advertisingOpportunities) {
          totalInventory += social.advertisingOpportunities.length;
          social.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month');
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Events
    if (selectedPublication.distributionChannels.events?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.events.forEach((event: any) => {
        totalReach += event.averageAttendance || 0;
        if (event.advertisingOpportunities) {
          totalInventory += event.advertisingOpportunities.length;
          event.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', event.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Podcasts
    if (selectedPublication.distributionChannels.podcasts?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.podcasts.forEach((podcast: any) => {
        totalReach += podcast.averageListeners || 0;
        if (podcast.advertisingOpportunities) {
          totalInventory += podcast.advertisingOpportunities.length;
          podcast.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', podcast.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Radio
    if (selectedPublication.distributionChannels.radioStations?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.radioStations.forEach((radio: any) => {
        // NEW: Handle show-based structure
        if (radio.shows && radio.shows.length > 0) {
          radio.shows.forEach((show: any) => {
            totalReach += show.averageListeners || radio.listeners || 0;
            if (show.advertisingOpportunities) {
              totalInventory += show.advertisingOpportunities.length;
              show.advertisingOpportunities.forEach((ad: any) => {
                totalRevenuePotential += calculateRevenue(ad, 'month', show.frequency);
                if (ad.hubPricing?.length > 0) hubPricingCount++;
              });
            }
          });
        } else if (radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0) {
          // LEGACY: Handle station-level ads only if no shows exist (prevent double-counting)
          totalReach += radio.listeners || 0;
          totalInventory += radio.advertisingOpportunities.length;
          radio.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month');
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Streaming
    if (selectedPublication.distributionChannels.streamingVideo?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.streamingVideo.forEach((streaming: any) => {
        totalReach += streaming.subscribers || 0;
        if (streaming.advertisingOpportunities) {
          totalInventory += streaming.advertisingOpportunities.length;
          streaming.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', streaming.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Television
    if (selectedPublication.distributionChannels.television?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.television.forEach((station: any) => {
        totalReach += station.viewers || 0;
        if (station.advertisingOpportunities) {
          totalInventory += station.advertisingOpportunities.length;
          station.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', station.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    return {
      totalInventory,
      totalRevenuePotential,
      totalReach,
      activeChannels,
      hubPricingCount
    };
  };

  const metrics = calculateMetrics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Potential */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(metrics.totalRevenuePotential)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              If 100% sold monthly
            </p>
          </CardContent>
        </Card>

        {/* Total Reach */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics.totalReach)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined audience
            </p>
          </CardContent>
        </Card>

        {/* Hub Pricing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hub Pricing
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center">
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3" sideOffset={8}>
                    <p className="text-xs mb-2">Number of inventory items with special hub pricing rates</p>
                    <a 
                      href="/pricing-formulas.html#hub-pricing" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 underline inline-block font-medium"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      View pricing formulas →
                    </a>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.hubPricingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.hubPricingCount === 1 ? 'Item' : 'Items'} with hub rates
            </p>
          </CardContent>
        </Card>

        {/* Inventory Quality */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={scrollToInventoryQuality}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Inventory Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className={`text-3xl font-bold ${getQualityScoreColor(inventoryQuality.score)}`}>
                {inventoryQuality.score}%
              </div>
              <p className="text-xs text-muted-foreground">
                {inventoryQuality.completeItems} of {inventoryQuality.totalItems} items complete
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Package className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button 
                key={action.title} 
                variant="outline" 
                className="w-full justify-start h-auto p-4"
                onClick={() => handleQuickAction(action.tab)}
              >
                <action.icon className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <MessageCircle className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Quality - Full Width at Bottom */}
      <div ref={inventoryQualityRef}>
        <PublicationDataQuality 
          publication={selectedPublication}
          onViewDetails={() => handleQuickAction('inventory')}
          preCalculatedQuality={inventoryQuality}
        />
      </div>

    </div>
  );
}