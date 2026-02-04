import React from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdOpportunityCard } from './AdOpportunityCard';
import { calculateRevenue } from '@/utils/pricingCalculations';
import { 
  Globe, 
  Mail, 
  Newspaper,
  Users,
  Calendar,
  Mic,
  Radio,
  Video,
  Printer,
  ArrowLeft,
  DollarSign,
  MapPin,
  Phone,
  ExternalLink,
  Building2,
  Target,
  Award,
  BookOpen,
  Settings,
  TrendingUp,
  PieChart,
  Star,
  Shield,
  Clock,
  FileText,
  Package
} from 'lucide-react';

interface PublicationFullSummaryProps {
  onBack: () => void;
}

export const PublicationFullSummary: React.FC<PublicationFullSummaryProps> = ({ onBack }) => {
  const { selectedPublication } = usePublication();

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const publication = selectedPublication;

  // Ensure required properties exist with defaults
  if (!publication.distributionChannels) {
    publication.distributionChannels = {};
  }
  if (!publication.basicInfo) {
    publication.basicInfo = { publicationName: 'Unknown Publication' };
  }
  if (!publication.contactInfo) {
    publication.contactInfo = {};
  }

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num) return 'Not specified';
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header - Hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Publication Full Summary</h1>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Summary
        </Button>
      </div>

      {/* Print-friendly content */}
      <div className="space-y-6 print:space-y-4">
        
        {/* Publication Header */}
        <div className="text-center border-b pb-6 print:pb-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-3xl">
            {publication.basicInfo.publicationName}
          </h1>
          {publication.basicInfo.contentType && (
            <p className="text-xl text-gray-600 mb-4 print:text-lg capitalize">
              {publication.basicInfo.contentType} Publication
            </p>
          )}
          <p className="text-sm text-muted-foreground text-center">
            {publication.basicInfo.founded && `Est. ${publication.basicInfo.founded}`}
            {publication.basicInfo.founded && publication.basicInfo.publicationType && ' • '}
            {publication.basicInfo.publicationType && `${publication.basicInfo.publicationType.charAt(0).toUpperCase() + publication.basicInfo.publicationType.slice(1)}`}
            {publication.basicInfo.geographicCoverage && ` • ${publication.basicInfo.geographicCoverage.charAt(0).toUpperCase() + publication.basicInfo.geographicCoverage.slice(1)}`}
          </p>
        </div>

        {/* Executive Summary - Inventory & Revenue Potential */}
        <Card className="print:shadow-none print:border-gray-300 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2 print:text-lg text-2xl">
              <PieChart className="h-6 w-6 print:h-5 print:w-5 text-blue-600" />
              Revenue & Inventory Executive Summary
            </CardTitle>
            <CardDescription>Your advertising inventory at a glance</CardDescription>
          </CardHeader>
          <CardContent className="print:pt-0">
            {(() => {
              // Calculate comprehensive inventory stats
              let totalOpportunities = 0;
              let totalReach = 0;
              let estimatedMonthlyRevenuePotential = 0;
              const inventoryByChannel: Record<string, { count: number; reach: number; avgPrice: number; totalPrice: number }> = {};

              // Helper to add inventory
              const addInventory = (channel: string, count: number, reach: number, avgPrice: number) => {
                if (!inventoryByChannel[channel]) {
                  inventoryByChannel[channel] = { count: 0, reach: 0, avgPrice: 0, totalPrice: 0 };
                }
                inventoryByChannel[channel].count += count;
                inventoryByChannel[channel].reach += reach;
                inventoryByChannel[channel].totalPrice += avgPrice * count;
                inventoryByChannel[channel].avgPrice = inventoryByChannel[channel].totalPrice / inventoryByChannel[channel].count;
              };

              // Website
              if (publication.distributionChannels?.website?.advertisingOpportunities) {
                const websiteAds = publication.distributionChannels.website.advertisingOpportunities;
                const reach = publication.distributionChannels.website.metrics?.monthlyVisitors || 0;
                totalReach += reach;
                
                websiteAds.forEach(ad => {
                  totalOpportunities++;
                  // Use standardized calculation
                  const monthlyRevenue = calculateRevenue(ad, 'month');
                  addInventory('Website', 1, reach, monthlyRevenue);
                  estimatedMonthlyRevenuePotential += monthlyRevenue;
                });
              }

              // Newsletters
              publication.distributionChannels?.newsletters?.forEach(newsletter => {
                const reach = newsletter.subscribers || 0;
                totalReach += reach;
                
                if (newsletter.advertisingOpportunities) {
                  newsletter.advertisingOpportunities.forEach(ad => {
                    totalOpportunities++;
                    // Use standardized calculation with frequency
                    const monthlyRevenue = calculateRevenue(ad, 'month', newsletter.frequency);
                    addInventory('Newsletter', 1, reach, monthlyRevenue);
                    estimatedMonthlyRevenuePotential += monthlyRevenue;
                  });
                }
              });

              // Print
              if (Array.isArray(publication.distributionChannels?.print)) {
                publication.distributionChannels.print.forEach(print => {
                  const reach = print.circulation || 0;
                  totalReach += reach;
                  
                  if (print.advertisingOpportunities) {
                    print.advertisingOpportunities.forEach(ad => {
                      totalOpportunities++;
                      // Use standardized calculation with frequency
                      const monthlyRevenue = calculateRevenue(ad, 'month', print.frequency);
                      addInventory('Print', 1, reach, monthlyRevenue);
                      estimatedMonthlyRevenuePotential += monthlyRevenue;
                    });
                  }
                });
              }

              // Social Media
              publication.distributionChannels?.socialMedia?.forEach(social => {
                const reach = social.metrics?.followers || 0;
                totalReach += reach;
                
                if (social.advertisingOpportunities) {
                  social.advertisingOpportunities.forEach(ad => {
                    totalOpportunities++;
                    // Use standardized calculation
                    const monthlyRevenue = calculateRevenue(ad, 'month');
                    addInventory('Social Media', 1, reach, monthlyRevenue);
                    estimatedMonthlyRevenuePotential += monthlyRevenue;
                  });
                }
              });

              // Events
              publication.distributionChannels?.events?.forEach(event => {
                const reach = event.averageAttendance || 0;
                totalReach += reach;
                
                if (event.advertisingOpportunities) {
                  event.advertisingOpportunities.forEach(ad => {
                    totalOpportunities++;
                    // Use standardized calculation with frequency
                    const monthlyRevenue = calculateRevenue(ad, 'month', event.frequency);
                    addInventory('Events', 1, reach, monthlyRevenue);
                    estimatedMonthlyRevenuePotential += monthlyRevenue;
                  });
                }
              });

              // Podcasts
              publication.distributionChannels?.podcasts?.forEach(podcast => {
                const reach = podcast.averageListeners || 0;
                totalReach += reach;
                
                if (podcast.advertisingOpportunities) {
                  podcast.advertisingOpportunities.forEach(ad => {
                    totalOpportunities++;
                    // Use standardized calculation with frequency
                    const monthlyRevenue = calculateRevenue(ad, 'month', podcast.frequency);
                    addInventory('Podcasts', 1, reach, monthlyRevenue);
                    estimatedMonthlyRevenuePotential += monthlyRevenue;
                  });
                }
              });

              // Radio
              publication.distributionChannels?.radioStations?.forEach(radio => {
                // NEW: Handle show-based structure
                if (radio.shows && radio.shows.length > 0) {
                  radio.shows.forEach((show: any) => {
                    const reach = show.averageListeners || radio.listeners || 0;
                    totalReach += reach;
                    
                    if (show.advertisingOpportunities) {
                      show.advertisingOpportunities.forEach((ad: any) => {
                        totalOpportunities++;
                        // Use standardized calculation with show frequency
                        const monthlyRevenue = calculateRevenue(ad, 'month', show.frequency);
                        addInventory('Radio', 1, reach, monthlyRevenue);
                        estimatedMonthlyRevenuePotential += monthlyRevenue;
                      });
                    }
                  });
                } else if (radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0) {
                  // LEGACY: Handle station-level ads only if no shows exist (prevent double-counting)
                  const reach = radio.listeners || 0;
                  totalReach += reach;
                  
                  radio.advertisingOpportunities.forEach(ad => {
                    totalOpportunities++;
                    // Use standardized calculation
                    const monthlyRevenue = calculateRevenue(ad, 'month');
                    addInventory('Radio', 1, reach, monthlyRevenue);
                    estimatedMonthlyRevenuePotential += monthlyRevenue;
                  });
                }
              });

              // Streaming
              publication.distributionChannels?.streamingVideo?.forEach(streaming => {
                const reach = streaming.subscribers || 0;
                totalReach += reach;
                
                if (streaming.advertisingOpportunities) {
                  streaming.advertisingOpportunities.forEach(ad => {
                    totalOpportunities++;
                    // Use standardized calculation with frequency
                    const monthlyRevenue = calculateRevenue(ad, 'month', streaming.frequency);
                    addInventory('Streaming', 1, reach, monthlyRevenue);
                    estimatedMonthlyRevenuePotential += monthlyRevenue;
                  });
                }
              });

              // Cross-channel packages
              const packageCount = publication.crossChannelPackages?.length || 0;

              return (
                <div className="space-y-6">
                  {/* No Inventory Warning */}
                  {totalOpportunities === 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Shield className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            <strong>No advertising inventory found.</strong> Add your advertising opportunities in the Inventory tab to see revenue projections here.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2">
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-600">
                      <p className="text-xs font-medium text-gray-500 uppercase">Total Inventory</p>
                      <p className="text-3xl font-bold text-blue-600 print:text-2xl">{totalOpportunities}</p>
                      <p className="text-xs text-gray-600 mt-1">Ad Opportunities</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-600">
                      <p className="text-xs font-medium text-gray-500 uppercase">Total Reach</p>
                      <p className="text-3xl font-bold text-green-600 print:text-2xl">{formatNumber(totalReach)}</p>
                      <p className="text-xs text-gray-600 mt-1">Combined Audience</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-600">
                      <p className="text-xs font-medium text-gray-500 uppercase">Revenue Potential</p>
                      <p className="text-3xl font-bold text-purple-600 print:text-2xl">{formatCurrency(estimatedMonthlyRevenuePotential)}</p>
                      <p className="text-xs text-gray-600 mt-1">If 100% sold</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-primary">
                      <p className="text-xs font-medium text-gray-500 uppercase">Packages</p>
                      <p className="text-3xl font-bold text-primary print:text-2xl">{packageCount}</p>
                      <p className="text-xs text-gray-600 mt-1">Cross-Channel Bundles</p>
                    </div>
                  </div>

                  {/* Inventory by Channel */}
                  {Object.keys(inventoryByChannel).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Inventory Breakdown by Channel
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:gap-2">
                        {Object.entries(inventoryByChannel)
                          .sort((a, b) => b[1].count - a[1].count)
                          .map(([channel, data]) => (
                            <div key={channel} className="bg-white p-3 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900">{channel}</h5>
                                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {data.count} {data.count === 1 ? 'opportunity' : 'opportunities'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500">Reach</p>
                                  <p className="font-medium">{formatNumber(data.reach)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Avg. Price</p>
                                  <p className="font-medium">{formatCurrency(data.avgPrice)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Revenue Scenarios */}
                  {estimatedMonthlyRevenuePotential > 0 && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Monthly Potential Scenarios
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-600 uppercase">Conservative (30%)</p>
                          <p className="text-2xl font-bold text-red-600">{formatCurrency(estimatedMonthlyRevenuePotential * 0.3)}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-600 uppercase">Moderate (50%)</p>
                          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(estimatedMonthlyRevenuePotential * 0.5)}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-600 uppercase">Optimistic (75%)</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(estimatedMonthlyRevenuePotential * 0.75)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 text-center italic">
                        Based on current inventory pricing. Actual results will vary based on demand, seasonality, and market conditions.
                      </p>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2">Hub Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-600">Active Channels</p>
                        <p className="text-lg font-bold">{Object.keys(inventoryByChannel).length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Avg Price/Opportunity</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(totalOpportunities > 0 ? estimatedMonthlyRevenuePotential / totalOpportunities : 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Price Range</p>
                        <p className="text-lg font-bold">
                          {(() => {
                            const prices = Object.values(inventoryByChannel).map(d => d.avgPrice).filter(p => p > 0);
                            if (prices.length === 0) return 'N/A';
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            return `$${Math.round(min)}-$${Math.round(max)}`;
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Most Inventory</p>
                        <p className="text-lg font-bold">
                          {Object.entries(inventoryByChannel).length > 0
                            ? Object.entries(inventoryByChannel).sort((a, b) => b[1].count - a[1].count)[0][0]
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="print:shadow-none print:border-gray-300">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2 print:text-lg">
              <Phone className="h-5 w-5 print:h-4 print:w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
              <div>
                {publication.basicInfo.headquarters && (
                  <>
                    <p className="font-medium">Headquarters</p>
                    <p className="text-sm text-gray-600">{publication.basicInfo.headquarters}</p>
                  </>
                )}
                {publication.contactInfo?.businessHours && (
                  <>
                    <p className="font-medium mt-2">Business Hours</p>
                    <p className="text-sm text-gray-600">{publication.contactInfo.businessHours}</p>
                  </>
                )}
              </div>
              <div>
                <p className="font-medium">Contact</p>
                <p className="text-sm text-gray-600">
                  {publication.contactInfo?.mainPhone && (
                    <>Phone: {publication.contactInfo.mainPhone}<br /></>
                  )}
                  {publication.basicInfo.websiteUrl && (
                    <>Website: {publication.basicInfo.websiteUrl}</>
                  )}
                </p>
              </div>
            </div>

            {/* Key Contacts */}
            {(publication.contactInfo?.salesContact || publication.contactInfo?.editorialContact || publication.contactInfo?.generalManager || publication.contactInfo?.advertisingDirector) && (
              <div className="mt-4 print:mt-2">
                <p className="font-medium mb-2">Key Contacts</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 text-sm">
                  {publication.contactInfo.salesContact && (
                    <div>
                      <p className="font-medium">Sales Contact</p>
                      <p>{publication.contactInfo.salesContact.name}</p>
                      <p>{publication.contactInfo.salesContact.title}</p>
                      <p>{publication.contactInfo.salesContact.email}</p>
                      <p>{publication.contactInfo.salesContact.phone}</p>
                    </div>
                  )}
                  {publication.contactInfo.editorialContact && (
                    <div>
                      <p className="font-medium">Editorial Contact</p>
                      <p>{publication.contactInfo.editorialContact.name}</p>
                      <p>{publication.contactInfo.editorialContact.title}</p>
                      <p>{publication.contactInfo.editorialContact.email}</p>
                      <p>{publication.contactInfo.editorialContact.phone}</p>
                    </div>
                  )}
                  {publication.contactInfo.generalManager && (
                    <div>
                      <p className="font-medium">General Manager</p>
                      <p>{publication.contactInfo.generalManager.name}</p>
                      <p>{publication.contactInfo.generalManager.email}</p>
                      <p>{publication.contactInfo.generalManager.phone}</p>
                    </div>
                  )}
                  {publication.contactInfo.advertisingDirector && (
                    <div>
                      <p className="font-medium">Advertising Director</p>
                      <p>{publication.contactInfo.advertisingDirector.name}</p>
                      <p>{publication.contactInfo.advertisingDirector.email}</p>
                      <p>{publication.contactInfo.advertisingDirector.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Distribution Channels - Complete Details */}
        <Card className="print:shadow-none print:border-gray-300">
          <CardHeader className="print:pb-2">
            <CardTitle className="print:text-lg">Distribution Channels - Complete Details</CardTitle>
          </CardHeader>
          <CardContent className="print:pt-0">
            
            {/* Website Details */}
            {publication.distributionChannels?.website && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-blue-800">Website</h3>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 print:bg-gray-50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
                    <div>
                      <p className="font-medium">URL</p>
                      <p className="text-sm">{publication.distributionChannels.website.url || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="font-medium">CMS Platform</p>
                      <p className="text-sm">{publication.distributionChannels.website.cmsplatform || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Monthly Visitors</p>
                      <p className="text-sm font-semibold">{formatNumber(publication.distributionChannels.website.metrics?.monthlyVisitors)}</p>
                    </div>
                  </div>

                  {publication.distributionChannels.website.metrics && (
                    <div>
                      <p className="font-medium mb-2">Website Metrics</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>Monthly Visitors: {formatNumber(publication.distributionChannels.website.metrics.monthlyVisitors)}</div>
                        <div>Page Views: {formatNumber(publication.distributionChannels.website.metrics.monthlyPageViews)}</div>
                        <div>Session Duration: {publication.distributionChannels.website.metrics.averageSessionDuration} min</div>
                        <div>Pages/Session: {publication.distributionChannels.website.metrics.pagesPerSession}</div>
                        <div>Bounce Rate: {publication.distributionChannels.website.metrics.bounceRate}%</div>
                        <div>Mobile %: {publication.distributionChannels.website.metrics.mobilePercentage}%</div>
                      </div>
                    </div>
                  )}

                  {publication.distributionChannels.website.advertisingOpportunities && publication.distributionChannels.website.advertisingOpportunities.length > 0 && (
                    <div>
                      <p className="font-medium mb-3">Website Advertising Opportunities</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {publication.distributionChannels.website.advertisingOpportunities.map((ad: any, index: number) => {
                          // Get dimensions from format object
                          const getDimensions = () => {
                            if (ad.format?.dimensions) {
                              const dims = ad.format.dimensions;
                              return Array.isArray(dims) ? dims.join(', ') : dims;
                            }
                            return undefined;
                          };
                          
                          const dimensions = getDimensions();
                          const dimsArray = ad.format?.dimensions 
                            ? (Array.isArray(ad.format.dimensions) ? ad.format.dimensions : [ad.format.dimensions])
                            : [];
                          
                          return (
                            <AdOpportunityCard
                              key={index}
                              title={ad.name || 'Unnamed Ad'}
                              hubPricingCount={ad.hubPricing?.length || 0}
                              fields={[
                                { label: 'Format', value: ad.adFormat },
                                { label: 'Location', value: ad.location },
                                { 
                                  label: dimsArray.length > 1 ? 'Sizes' : 'Size', 
                                  value: dimensions
                                },
                                { label: 'Impressions', value: ad.monthlyImpressions ? `${formatNumber(ad.monthlyImpressions)}/mo` : undefined },
                                { label: 'Price', value: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}` : undefined },
                                { label: 'Model', value: ad.pricing?.pricingModel },
                                { label: 'Available', value: ad.available ? 'Yes' : 'No' },
                              ]}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Newsletter Details */}
            {publication.distributionChannels?.newsletters && publication.distributionChannels.newsletters.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-green-800">Newsletters</h3>
                </div>
                <div className="space-y-4">
                  {publication.distributionChannels.newsletters.map((newsletter, index) => (
                    <div key={index} className="bg-green-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{newsletter.name || `Newsletter ${index + 1}`}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Subscribers: {formatNumber(newsletter.subscribers)}</div>
                        <div>Open Rate: {newsletter.openRate}%</div>
                        <div>Click Rate: {newsletter.clickThroughRate}%</div>
                        <div>Frequency: {newsletter.frequency}</div>
                      </div>
                      
                      {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Newsletter Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {newsletter.advertisingOpportunities.map((ad: any, adIndex: number) => {
                              // Get dimensions from format object
                              const getDimensions = () => {
                                if (ad.format?.dimensions) {
                                  const dims = ad.format.dimensions;
                                  return Array.isArray(dims) ? dims.join(', ') : dims;
                                }
                                return undefined;
                              };
                              
                              return (
                                <AdOpportunityCard
                                  key={adIndex}
                                  title={ad.name || 'Unnamed Ad'}
                                  hubPricingCount={ad.hubPricing?.length || 0}
                                  fields={[
                                    { label: 'Position', value: ad.position },
                                    { label: 'Dimensions', value: getDimensions() },
                                    { label: 'Price', value: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}` : undefined },
                                    { label: 'Model', value: ad.pricing?.pricingModel },
                                  ]}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print Details */}
            {publication.distributionChannels?.print && publication.distributionChannels.print.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-orange-800">Print Publications</h3>
                </div>
                <div className="space-y-4">
                  {(Array.isArray(publication.distributionChannels.print) ? publication.distributionChannels.print : [publication.distributionChannels.print]).map((print, index) => (
                    <div key={index} className="bg-orange-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{print.name || `Print Publication ${index + 1}`}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2 text-sm mb-3">
                        <div>Circulation: {formatNumber(print.circulation)}</div>
                        <div>Frequency: {print.frequency}</div>
                        <div>Distribution Area: {print.distributionArea}</div>
                      </div>
                      
                      {print.advertisingOpportunities && print.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Print Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {print.advertisingOpportunities.map((ad: any, adIndex: number) => {
                              // Build fields array dynamically
                              const fields: Array<{ label: string; value: string | undefined }> = [
                                { label: 'Format', value: ad.adFormat },
                                { label: 'Dimensions', value: ad.format?.dimensions },
                                { label: 'Color', value: ad.color },
                                { label: 'Location', value: ad.location },
                              ];
                              
                              // Handle pricing - can be array of tiers or single object
                              if (Array.isArray(ad.pricing) && ad.pricing.length > 0) {
                                // Multiple pricing tiers - add each one
                                ad.pricing.forEach((tier: any, idx: number) => {
                                  const tierPrice = tier.pricing?.flatRate;
                                  const tierModel = tier.pricing?.pricingModel;
                                  // Get frequency from pricing.frequency or tier level, then fallback to size/name
                                  const frequency = tier.pricing?.frequency || tier.frequency;
                                  const tierLabel = frequency || tier.size || tier.name || `Tier ${idx + 1}`;
                                  
                                  if (tierPrice !== undefined && tierPrice !== null) {
                                    fields.push({
                                      label: tierLabel,
                                      value: `$${tierPrice}${tierModel ? ` (${tierModel})` : ''}`
                                    });
                                  }
                                });
                              } else if (ad.pricing && !Array.isArray(ad.pricing)) {
                                // Single pricing object
                                const price = ad.pricing.flatRate;
                                const pricingModel = ad.pricing.pricingModel;
                                if (price !== undefined && price !== null) {
                                  fields.push({
                                    label: 'Price',
                                    value: `$${price}${pricingModel ? ` (${pricingModel})` : ''}`
                                  });
                                }
                              }
                              
                              // Add file format at the end
                              if (ad.format?.fileFormats) {
                                fields.push({ label: 'File Format', value: ad.format.fileFormats.join(', ') });
                              }
                              
                              return (
                                <AdOpportunityCard
                                  key={adIndex}
                                  title={ad.name || 'Unnamed Ad'}
                                  hubPricingCount={ad.hubPricing?.length || 0}
                                  fields={fields}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Details */}
            {publication.distributionChannels?.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-purple-800">Social Media</h3>
                </div>
                <div className="space-y-4">
                  {publication.distributionChannels.socialMedia.map((social, index) => (
                    <div key={index} className="bg-purple-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{social.platform} - {social.handle}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Followers: {formatNumber(social.metrics?.followers)}</div>
                        <div>Engagement Rate: {social.metrics?.engagementRate}%</div>
                        <div>Verified: {social.verified ? 'Yes' : 'No'}</div>
                        <div>URL: {social.url}</div>
                      </div>
                      
                      {social.advertisingOpportunities && social.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Social Media Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {social.advertisingOpportunities.map((ad: any, adIndex: number) => (
                              <AdOpportunityCard
                                key={adIndex}
                                title={ad.name || 'Unnamed Ad'}
                                hubPricingCount={ad.hubPricing?.length || 0}
                                fields={[
                                  { label: 'Format', value: ad.adFormat },
                                  { label: 'Post Type', value: ad.postType },
                                  { label: 'Image Size', value: ad.specifications?.imageSize },
                                  { label: 'Video Length', value: ad.specifications?.videoLength },
                                  { label: 'Price', value: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}` : undefined },
                                  { label: 'Model', value: ad.pricing?.pricingModel },
                                  { label: 'Available', value: ad.available ? 'Yes' : 'No' },
                                ]}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Details */}
            {publication.distributionChannels?.events && publication.distributionChannels.events.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-green-800">Events</h3>
                </div>
                <div className="space-y-4">
                  {publication.distributionChannels.events.map((event, index) => (
                    <div key={index} className="bg-green-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{event.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Expected Attendance: {formatNumber(event.averageAttendance)}</div>
                        <div>Location: {event.location}</div>
                        <div>Type: {event.type}</div>
                        <div>Frequency: {event.frequency}</div>
                      </div>
                      {event.date && <div className="text-sm mb-3">Date: {new Date(event.date).toLocaleDateString()}</div>}
                      
                      {event.advertisingOpportunities && event.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Event Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {event.advertisingOpportunities.map((ad: any, adIndex: number) => {
                              const price = ad.hubPricing?.[0]?.pricing?.flatRate || ad.pricing?.flatRate || 0;
                              return (
                                <AdOpportunityCard
                                  key={adIndex}
                                  title={ad.level ? `${ad.level.charAt(0).toUpperCase() + ad.level.slice(1)} Sponsor` : 'Sponsorship'}
                                  hubPricingCount={ad.hubPricing?.length || 0}
                                  fields={[
                                    { label: 'Level', value: ad.level },
                                    { label: 'Price', value: price ? `$${price}` : undefined },
                                    { label: 'Model', value: ad.pricing?.pricingModel },
                                    { label: 'Benefits', value: ad.benefits && ad.benefits.length > 0 ? ad.benefits.slice(0, 2).join(', ') : undefined },
                                  ]}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Podcasts Details */}
            {publication.distributionChannels?.podcasts && publication.distributionChannels.podcasts.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-red-800">Podcasts</h3>
                </div>
                <div className="space-y-4">
                  {publication.distributionChannels.podcasts.map((podcast, index) => (
                    <div key={index} className="bg-red-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{podcast.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Avg Listeners: {formatNumber(podcast.averageListeners)}</div>
                        <div>Avg Downloads: {formatNumber(podcast.averageDownloads)}</div>
                        <div>Episodes: {podcast.episodeCount}</div>
                        <div>Frequency: {podcast.frequency}</div>
                      </div>
                      {podcast.genre && <div className="text-sm mb-3">Genre: {podcast.genre}</div>}
                      {podcast.platforms && <div className="text-sm mb-3">Platforms: {podcast.platforms.join(', ')}</div>}
                      
                      {podcast.advertisingOpportunities && podcast.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Podcast Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {podcast.advertisingOpportunities.map((ad: any, adIndex: number) => (
                              <AdOpportunityCard
                                key={adIndex}
                                title={ad.name || 'Unnamed Ad'}
                                hubPricingCount={ad.hubPricing?.length || 0}
                                fields={[
                                  { label: 'Format', value: ad.adFormat },
                                  { label: 'Duration', value: ad.format?.duration ? `${ad.format.duration}s` : (ad.duration ? `${ad.duration}s` : undefined) },
                                  { label: 'File Format', value: ad.format?.fileFormats?.join(', ') },
                                  { label: 'Bitrate', value: ad.format?.bitrate },
                                  { label: 'Price', value: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}` : undefined },
                                  { label: 'Model', value: ad.pricing?.pricingModel },
                                  { label: 'Available', value: ad.available ? 'Yes' : 'No' },
                                ]}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Radio Details */}
            {publication.distributionChannels?.radioStations && publication.distributionChannels.radioStations.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-yellow-800">Radio Stations</h3>
                </div>
                <div className="space-y-4">
                  {publication.distributionChannels.radioStations.map((radio, index) => (
                    <div key={index} className="bg-yellow-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{radio.callSign} - {radio.frequency}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Weekly Listeners: {formatNumber(radio.listeners)}</div>
                        <div>Format: {radio.format}</div>
                        <div>Coverage: {radio.coverageArea}</div>
                        <div>Power: {radio.power}W</div>
                      </div>
                      
                      {radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Radio Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {radio.advertisingOpportunities.map((ad: any, adIndex: number) => (
                              <AdOpportunityCard
                                key={adIndex}
                                title={ad.name || 'Unnamed Ad'}
                                hubPricingCount={ad.hubPricing?.length || 0}
                                fields={[
                                  { label: 'Format', value: ad.adFormat },
                                  { label: 'Time Slot', value: ad.timeSlot ? ad.timeSlot.replace(/_/g, ' ') : undefined },
                                  { label: 'Duration', value: ad.format?.duration ? `${ad.format.duration}s` : undefined },
                                  { label: 'File Format', value: ad.format?.fileFormats?.join(', ') },
                                  { label: 'Price', value: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}` : undefined },
                                  { label: 'Model', value: ad.pricing?.pricingModel },
                                  { label: 'Available', value: ad.available ? 'Yes' : 'No' },
                                ]}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming Video Details */}
            {publication.distributionChannels?.streamingVideo && publication.distributionChannels.streamingVideo.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-indigo-800">Streaming Video</h3>
                </div>
                <div className="space-y-4">
                  {publication.distributionChannels.streamingVideo.map((streaming, index) => (
                    <div key={index} className="bg-indigo-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{streaming.name} - {streaming.platform}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Subscribers: {formatNumber(streaming.subscribers)}</div>
                        <div>Avg Views: {formatNumber(streaming.averageViews)}</div>
                        <div>Content Type: {streaming.contentType}</div>
                        <div>Schedule: {streaming.streamSchedule}</div>
                      </div>
                      
                      {streaming.advertisingOpportunities && streaming.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-3">Streaming Advertising Opportunities</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {streaming.advertisingOpportunities.map((ad: any, adIndex: number) => (
                              <AdOpportunityCard
                                key={adIndex}
                                title={ad.name || 'Unnamed Ad'}
                                hubPricingCount={ad.hubPricing?.length || 0}
                                fields={[
                                  { label: 'Format', value: ad.adFormat },
                                  { label: 'Duration', value: ad.format?.duration ? `${ad.format.duration}s` : (ad.duration ? `${ad.duration}s` : undefined) },
                                  { label: 'File Format', value: ad.format?.fileFormats?.join(', ') },
                                  { label: 'Resolution', value: ad.format?.resolution },
                                  { label: 'Price', value: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}` : undefined },
                                  { label: 'Model', value: ad.pricing?.pricingModel },
                                  { label: 'Available', value: ad.available ? 'Yes' : 'No' },
                                ]}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audience Demographics */}
        {publication.audienceDemographics && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <Target className="h-5 w-5 print:h-4 print:w-4" />
                Audience Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                {publication.audienceDemographics.location && (
                  <div>
                    <p className="font-medium">Primary Location</p>
                    <p className="text-lg font-semibold print:text-base">
                      {publication.audienceDemographics.location}
                    </p>
                  </div>
                )}
                {publication.audienceDemographics.targetMarkets && publication.audienceDemographics.targetMarkets.length > 0 && (
                  <div>
                    <p className="font-medium">Target Markets</p>
                    <p className="text-sm text-gray-600">
                      {publication.audienceDemographics.targetMarkets.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <hr className="border-t border-gray-200 my-4 print:my-2" />

              {/* Age Groups */}
              {publication.audienceDemographics.ageGroups && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Age Distribution</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm print:text-xs">
                    {Object.entries(publication.audienceDemographics.ageGroups).map(([age, percentage]) => (
                      <div key={age} className="text-center">
                        <p className="font-medium">{age}</p>
                        <p>{percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gender */}
              {publication.audienceDemographics.gender && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Gender Distribution</p>
                  <div className="grid grid-cols-3 gap-2 text-sm print:text-xs">
                    {Object.entries(publication.audienceDemographics.gender).map(([gender, percentage]) => (
                      <div key={gender} className="text-center">
                        <p className="font-medium capitalize">{gender}</p>
                        <p>{percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Household Income */}
              {publication.audienceDemographics.householdIncome && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Household Income</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm print:text-xs">
                    {Object.entries(publication.audienceDemographics.householdIncome).map(([income, percentage]) => (
                      <div key={income} className="text-center">
                        <p className="font-medium">{income.replace('k', 'K').replace('under35k', 'Under $35K').replace('35k-50k', '$35K-$50K').replace('50k-75k', '$50K-$75K').replace('75k-100k', '$75K-$100K').replace('100k-150k', '$100K-$150K').replace('over150k', 'Over $150K')}</p>
                        <p>{percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {publication.audienceDemographics.education && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Education Level</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm print:text-xs">
                    {Object.entries(publication.audienceDemographics.education).map(([edu, percentage]) => (
                      <div key={edu} className="text-center">
                        <p className="font-medium">{edu.replace('highSchool', 'High School').replace('someCollege', 'Some College').replace('bachelors', "Bachelor's").replace('graduate', 'Graduate')}</p>
                        <p>{percentage}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {publication.audienceDemographics.interests && publication.audienceDemographics.interests.length > 0 && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Primary Interests</p>
                  <p className="text-sm text-gray-600">
                    {publication.audienceDemographics.interests.join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Editorial Information */}
        {publication.editorialInfo && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <BookOpen className="h-5 w-5 print:h-4 print:w-4" />
                Editorial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                {publication.editorialInfo.contentFocus && publication.editorialInfo.contentFocus.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Content Focus</p>
                    <p className="text-sm text-gray-600">
                      {publication.editorialInfo.contentFocus.join(', ')}
                    </p>
                  </div>
                )}
                {publication.editorialInfo.contentPillars && publication.editorialInfo.contentPillars.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Content Pillars</p>
                    <p className="text-sm text-gray-600">
                      {publication.editorialInfo.contentPillars.join(', ')}
                    </p>
                  </div>
                )}
                {publication.editorialInfo.specialSections && publication.editorialInfo.specialSections.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Special Sections</p>
                    <p className="text-sm text-gray-600">
                      {publication.editorialInfo.specialSections.join(', ')}
                    </p>
                  </div>
                )}
                {publication.editorialInfo.signatureFeatures && publication.editorialInfo.signatureFeatures.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Signature Features</p>
                    <p className="text-sm text-gray-600">
                      {publication.editorialInfo.signatureFeatures.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Editorial Team */}
              {publication.editorialInfo.editorialTeam && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Editorial Team</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 text-sm">
                    {publication.editorialInfo.editorialTeam.editorInChief && (
                      <div>
                        <p className="font-medium">Editor-in-Chief</p>
                        <p>{publication.editorialInfo.editorialTeam.editorInChief}</p>
                      </div>
                    )}
                    {publication.editorialInfo.editorialTeam.managingEditor && (
                      <div>
                        <p className="font-medium">Managing Editor</p>
                        <p>{publication.editorialInfo.editorialTeam.managingEditor}</p>
                      </div>
                    )}
                    {publication.editorialInfo.editorialTeam.keyWriters && publication.editorialInfo.editorialTeam.keyWriters.length > 0 && (
                      <div>
                        <p className="font-medium">Key Writers</p>
                        <p>{publication.editorialInfo.editorialTeam.keyWriters.join(', ')}</p>
                      </div>
                    )}
                    {publication.editorialInfo.editorialTeam.contributingWriters && publication.editorialInfo.editorialTeam.contributingWriters.length > 0 && (
                      <div>
                        <p className="font-medium">Contributing Writers</p>
                        <p>{publication.editorialInfo.editorialTeam.contributingWriters.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Competitive Information */}
        {publication.competitiveInfo && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <TrendingUp className="h-5 w-5 print:h-4 print:w-4" />
                Competitive Position
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              {publication.competitiveInfo.uniqueValueProposition && (
                <div className="mb-4 print:mb-2">
                  <p className="font-medium mb-2">Unique Value Proposition</p>
                  <p className="text-sm text-gray-600 italic">
                    "{publication.competitiveInfo.uniqueValueProposition}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                {publication.competitiveInfo.keyDifferentiators && publication.competitiveInfo.keyDifferentiators.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Key Differentiators</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {publication.competitiveInfo.keyDifferentiators.map((diff, index) => (
                        <li key={index}>{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {publication.competitiveInfo.competitiveAdvantages && publication.competitiveInfo.competitiveAdvantages.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Competitive Advantages</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {publication.competitiveInfo.competitiveAdvantages.map((adv, index) => (
                        <li key={index}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 mt-4 print:mt-2">
                {publication.competitiveInfo.marketShare && (
                  <div>
                    <p className="font-medium">Market Share</p>
                    <p className="text-xl font-bold text-purple-600 print:text-lg">
                      {publication.competitiveInfo.marketShare}%
                    </p>
                  </div>
                )}
                {publication.competitiveInfo.mainCompetitors && publication.competitiveInfo.mainCompetitors.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Main Competitors</p>
                    <p className="text-sm text-gray-600">
                      {publication.competitiveInfo.mainCompetitors.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Awards & Recognition */}
        {publication.awards && publication.awards.length > 0 && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <Award className="h-5 w-5 print:h-4 print:w-4" />
                Awards & Recognition
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                {publication.awards.map((award, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg print:bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <p className="font-medium">{award.award}</p>
                    </div>
                    <p className="text-sm text-gray-600">{award.organization}</p>
                    <p className="text-sm text-gray-600">{award.year} • {award.category}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cross-Channel Packages */}
        {publication.crossChannelPackages && publication.crossChannelPackages.length > 0 && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <FileText className="h-5 w-5 print:h-4 print:w-4" />
                Cross-Channel Packages
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="space-y-4 print:space-y-2">
                {publication.crossChannelPackages.map((pkg, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg print:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{pkg.name || pkg.packageName}</h4>
                      {pkg.savings && (
                        <span className="text-sm font-medium text-green-600">
                          {pkg.savings}% savings
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{pkg.details}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pkg.includedChannels?.map((channel, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 px-2 py-1 rounded capitalize">
                          {channel}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Duration: {pkg.duration}</span>
                      <span className="font-medium">{pkg.pricing}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Capabilities */}
        {publication.technicalCapabilities && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <Settings className="h-5 w-5 print:h-4 print:w-4" />
                Technical Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                {publication.technicalCapabilities.cmsplatform && (
                  <div>
                    <p className="font-medium">CMS Platform</p>
                    <p className="text-sm text-gray-600">{publication.technicalCapabilities.cmsplatform}</p>
                  </div>
                )}
                {publication.technicalCapabilities.emailServiceProvider && (
                  <div>
                    <p className="font-medium">Email Service Provider</p>
                    <p className="text-sm text-gray-600">{publication.technicalCapabilities.emailServiceProvider}</p>
                  </div>
                )}
                {publication.technicalCapabilities.adServer && (
                  <div>
                    <p className="font-medium">Ad Server</p>
                    <p className="text-sm text-gray-600">{publication.technicalCapabilities.adServer}</p>
                  </div>
                )}
                {publication.technicalCapabilities.crmSystem && (
                  <div>
                    <p className="font-medium">CRM System</p>
                    <p className="text-sm text-gray-600">{publication.technicalCapabilities.crmSystem}</p>
                  </div>
                )}
              </div>

              {publication.technicalCapabilities.analyticsTools && publication.technicalCapabilities.analyticsTools.length > 0 && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Analytics Tools</p>
                  <p className="text-sm text-gray-600">
                    {publication.technicalCapabilities.analyticsTools.join(', ')}
                  </p>
                </div>
              )}

              {publication.technicalCapabilities.paymentProcessing && publication.technicalCapabilities.paymentProcessing.length > 0 && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Payment Processing</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {publication.technicalCapabilities.paymentProcessing.join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Booking Policies */}
        {publication.bookingPolicies && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <Clock className="h-5 w-5 print:h-4 print:w-4" />
                Booking Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                {publication.bookingPolicies.minimumLeadTime && (
                  <div>
                    <p className="font-medium">Minimum Lead Time</p>
                    <p className="text-sm text-gray-600">{publication.bookingPolicies.minimumLeadTime}</p>
                  </div>
                )}
                {publication.bookingPolicies.cancellationPolicy && (
                  <div>
                    <p className="font-medium">Cancellation Policy</p>
                    <p className="text-sm text-gray-600">{publication.bookingPolicies.cancellationPolicy}</p>
                  </div>
                )}
                {publication.bookingPolicies.paymentTerms && (
                  <div>
                    <p className="font-medium">Payment Terms</p>
                    <p className="text-sm text-gray-600">{publication.bookingPolicies.paymentTerms}</p>
                  </div>
                )}
                {publication.bookingPolicies.discountPolicies && (
                  <div>
                    <p className="font-medium">Discount Policies</p>
                    <p className="text-sm text-gray-600">{publication.bookingPolicies.discountPolicies}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advertising Summary */}
        <Card className="print:shadow-none print:border-gray-300">
          <CardHeader className="print:pb-2">
            <CardTitle className="print:text-lg">Advertising Opportunities Summary</CardTitle>
          </CardHeader>
          <CardContent className="print:pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
              <div>
                <h4 className="font-medium mb-2">Available Ad Formats</h4>
                <div className="text-sm space-y-1">
                  {/* Count total ads across all channels */}
                  {(() => {
                    let totalAds = 0;
                    const adTypes = new Set<string>();
                    
                    // Website ads
                    if (publication.distributionChannels?.website?.advertisingOpportunities) {
                      totalAds += publication.distributionChannels.website.advertisingOpportunities.length;
                      publication.distributionChannels.website.advertisingOpportunities.forEach(ad => {
                        if (ad.adFormat) adTypes.add(`Website ${ad.adFormat}`);
                      });
                    }
                    
                    // Newsletter ads
                    publication.distributionChannels?.newsletters?.forEach(newsletter => {
                      if (newsletter.advertisingOpportunities) {
                        totalAds += newsletter.advertisingOpportunities.length;
                        newsletter.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Newsletter ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Print ads
                    if (Array.isArray(publication.distributionChannels?.print)) {
                      publication.distributionChannels.print.forEach(print => {
                        if (print.advertisingOpportunities) {
                          totalAds += print.advertisingOpportunities.length;
                          print.advertisingOpportunities.forEach(ad => {
                            if (ad.adFormat) adTypes.add(`Print ${ad.adFormat}`);
                          });
                        }
                      });
                    }
                    
                    // Social media ads
                    publication.distributionChannels?.socialMedia?.forEach(social => {
                      if (social.advertisingOpportunities) {
                        totalAds += social.advertisingOpportunities.length;
                        social.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Social ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Event ads
                    publication.distributionChannels?.events?.forEach(event => {
                      if (event.advertisingOpportunities) {
                        totalAds += event.advertisingOpportunities.length;
                        event.advertisingOpportunities.forEach(ad => {
                          if (ad.name) adTypes.add(`Event ${ad.name}`);
                        });
                      }
                    });
                    
                    // Podcast ads
                    publication.distributionChannels?.podcasts?.forEach(podcast => {
                      if (podcast.advertisingOpportunities) {
                        totalAds += podcast.advertisingOpportunities.length;
                        podcast.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Podcast ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Radio ads
                    publication.distributionChannels?.radioStations?.forEach(radio => {
                      if (radio.advertisingOpportunities) {
                        totalAds += radio.advertisingOpportunities.length;
                        radio.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Radio ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Streaming ads
                    publication.distributionChannels?.streamingVideo?.forEach(streaming => {
                      if (streaming.advertisingOpportunities) {
                        totalAds += streaming.advertisingOpportunities.length;
                        streaming.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Streaming ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    return (
                      <>
                        <p className="font-medium text-lg">Total Opportunities: {totalAds}</p>
                        <div className="mt-2">
                          {Array.from(adTypes).slice(0, 10).map(adType => (
                            <p key={adType}>• {adType}</p>
                          ))}
                          {adTypes.size > 10 && (
                            <p className="text-gray-500">+{adTypes.size - 10} more formats</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Reach Summary</h4>
                <div className="text-sm space-y-1">
                  {(() => {
                    let totalReach = 0;
                    
                    // Website visitors
                    if (publication.distributionChannels?.website?.metrics?.monthlyVisitors) {
                      totalReach += publication.distributionChannels.website.metrics.monthlyVisitors;
                    }
                    
                    // Newsletter subscribers
                    publication.distributionChannels?.newsletters?.forEach(newsletter => {
                      if (newsletter.subscribers) totalReach += newsletter.subscribers;
                    });
                    
                    // Print circulation
                    if (Array.isArray(publication.distributionChannels?.print)) {
                      publication.distributionChannels.print.forEach(print => {
                        if (print.circulation) totalReach += print.circulation;
                      });
                    }
                    
                    // Social media followers
                    publication.distributionChannels?.socialMedia?.forEach(social => {
                      if (social.metrics?.followers) totalReach += social.metrics.followers;
                    });
                    
                    // Event attendance
                    publication.distributionChannels?.events?.forEach(event => {
                      if (event.averageAttendance) totalReach += event.averageAttendance;
                    });
                    
                    // Podcast listeners
                    publication.distributionChannels?.podcasts?.forEach(podcast => {
                      if (podcast.averageListeners) totalReach += podcast.averageListeners;
                    });
                    
                    // Radio listeners
                    publication.distributionChannels?.radioStations?.forEach(radio => {
                      if (radio.listeners) totalReach += radio.listeners;
                    });
                    
                    // Streaming subscribers
                    publication.distributionChannels?.streamingVideo?.forEach(streaming => {
                      if (streaming.subscribers) totalReach += streaming.subscribers;
                    });
                    
                    return (
                      <>
                        <p className="font-medium text-lg">Total Potential Reach: {formatNumber(totalReach)}</p>
                        <div className="mt-2 space-y-1">
                          {publication.distributionChannels?.website?.metrics?.monthlyVisitors && (
                            <p>• Website: {formatNumber(publication.distributionChannels.website.metrics.monthlyVisitors)} monthly visitors</p>
                          )}
                          {publication.distributionChannels?.newsletters && publication.distributionChannels.newsletters.length > 0 && (
                            <p>• Newsletter: {formatNumber(publication.distributionChannels.newsletters.reduce((sum, n) => sum + (n.subscribers || 0), 0))} subscribers</p>
                          )}
                          {publication.distributionChannels?.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
                            <p>• Social Media: {formatNumber(publication.distributionChannels.socialMedia.reduce((sum, s) => sum + (s.metrics?.followers || 0), 0))} followers</p>
                          )}
                          {publication.distributionChannels?.podcasts && publication.distributionChannels.podcasts.length > 0 && (
                            <p>• Podcasts: {formatNumber(publication.distributionChannels.podcasts.reduce((sum, p) => sum + (p.averageListeners || 0), 0))} listeners</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t pt-4 print:pt-2">
          <p>Generated on {new Date().toLocaleDateString()} • {publication.basicInfo.publicationName} Full Summary</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:text-3xl {
            font-size: 1.875rem;
          }
          .print\\:text-lg {
            font-size: 1.125rem;
          }
          .print\\:text-xs {
            font-size: 0.75rem;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem;
          }
          .print\\:space-y-2 > * + * {
            margin-top: 0.5rem;
          }
          .print\\:gap-2 {
            gap: 0.5rem;
          }
          .print\\:pb-4 {
            padding-bottom: 1rem;
          }
          .print\\:pb-2 {
            padding-bottom: 0.5rem;
          }
          .print\\:pt-0 {
            padding-top: 0;
          }
          .print\\:mt-2 {
            margin-top: 0.5rem;
          }
          .print\\:h-4 {
            height: 1rem;
          }
          .print\\:w-4 {
            width: 1rem;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
};
