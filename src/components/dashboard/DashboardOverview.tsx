import { usePublication } from "@/contexts/PublicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  Building2, 
  MessageCircle, 
  FileText,
  Settings,
  DollarSign,
  Users,
  TrendingUp
} from "lucide-react";
// MongoDB services removed - using API calls instead

export function DashboardOverview() {
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();

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
        const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || 0;
        totalRevenuePotential += price;
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
            const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || 0;
            totalRevenuePotential += price;
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
            let price = 0;
            if (Array.isArray(ad.pricing) && ad.pricing.length > 0) {
              price = ad.pricing[0]?.pricing?.flatRate || 0;
            } else if (ad.pricing?.flatRate) {
              price = ad.pricing.flatRate;
            }
            if (ad.hubPricing?.[0]?.pricing?.flatRate) {
              price = ad.hubPricing[0].pricing.flatRate;
            }
            totalRevenuePotential += price;
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
            const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || ad.pricing?.perPost || 0;
            totalRevenuePotential += price;
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
            const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || (typeof ad.pricing === 'number' ? ad.pricing : 0);
            totalRevenuePotential += price;
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
            const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || 0;
            totalRevenuePotential += price;
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Radio
    if (selectedPublication.distributionChannels.radioStations?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.radioStations.forEach((radio: any) => {
        totalReach += radio.listeners || 0;
        if (radio.advertisingOpportunities) {
          totalInventory += radio.advertisingOpportunities.length;
          radio.advertisingOpportunities.forEach((ad: any) => {
            const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || ad.pricing?.perSpot || 0;
            totalRevenuePotential += price;
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
            const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || 0;
            totalRevenuePotential += price;
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inventory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{metrics.totalInventory}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {metrics.activeChannels} {metrics.activeChannels === 1 ? 'channel' : 'channels'}
            </p>
          </CardContent>
        </Card>

        {/* Revenue Potential */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
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
            <div className="text-3xl font-bold text-purple-600">
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {metrics.hubPricingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.hubPricingCount === 1 ? 'Item' : 'Items'} with hub rates
            </p>
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

    </div>
  );
}