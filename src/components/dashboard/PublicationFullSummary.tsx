import React from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileText
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
          <p className="text-xl text-gray-600 mb-4 print:text-lg">
            {publication.basicInfo.tagline}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 print:text-xs">
            <span>Est. {publication.basicInfo.yearEstablished}</span>
            <span>•</span>
            <span>{publication.basicInfo.publicationType}</span>
            <span>•</span>
            <span>{publication.basicInfo.language}</span>
          </div>
        </div>

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
                <p className="font-medium">Address</p>
                <p className="text-sm text-gray-600">
                  {publication.contactInfo.address?.street}<br />
                  {publication.contactInfo.address?.city}, {publication.contactInfo.address?.state} {publication.contactInfo.address?.zipCode}
                </p>
                {publication.contactInfo.businessHours && (
                  <>
                    <p className="font-medium mt-2">Business Hours</p>
                    <p className="text-sm text-gray-600">{publication.contactInfo.businessHours}</p>
                  </>
                )}
              </div>
              <div>
                <p className="font-medium">Contact</p>
                <p className="text-sm text-gray-600">
                  {publication.contactInfo.mainPhone && (
                    <>Phone: {publication.contactInfo.mainPhone}<br /></>
                  )}
                  {publication.contactInfo.phone && (
                    <>Phone: {publication.contactInfo.phone}<br /></>
                  )}
                  {publication.contactInfo.email && (
                    <>Email: {publication.contactInfo.email}<br /></>
                  )}
                  {publication.contactInfo.website && (
                    <>Website: {publication.contactInfo.website}</>
                  )}
                </p>
              </div>
            </div>

            {/* Key Contacts */}
            {(publication.contactInfo.salesContact || publication.contactInfo.editorialContact || publication.contactInfo.generalManager || publication.contactInfo.advertisingDirector) && (
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

        {/* Business Information */}
        <Card className="print:shadow-none print:border-gray-300">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2 print:text-lg">
              <DollarSign className="h-5 w-5 print:h-4 print:w-4" />
              Business Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
              <div>
                <p className="font-medium">Annual Revenue</p>
                <p className="text-2xl font-bold text-green-600 print:text-lg">
                  {formatCurrency(publication.businessInfo.annualRevenue)}
                </p>
              </div>
              <div>
                <p className="font-medium">Employees</p>
                <p className="text-2xl font-bold print:text-lg">
                  {publication.businessInfo.numberOfEmployees || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="font-medium">Founded</p>
                <p className="text-2xl font-bold print:text-lg">
                  {publication.basicInfo.yearEstablished}
                </p>
              </div>
            </div>
            
            {publication.businessInfo.revenueBreakdown && (
              <div className="mt-4 print:mt-2">
                <p className="font-medium mb-2">Revenue Breakdown</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm print:text-xs">
                  {publication.businessInfo.revenueBreakdown.revenueDigital && (
                    <div>Digital: {formatCurrency(publication.businessInfo.revenueBreakdown.revenueDigital)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenuePrint && (
                    <div>Print: {formatCurrency(publication.businessInfo.revenueBreakdown.revenuePrint)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenueEvents && (
                    <div>Events: {formatCurrency(publication.businessInfo.revenueBreakdown.revenueEvents)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenuePodcasts && (
                    <div>Podcasts: {formatCurrency(publication.businessInfo.revenueBreakdown.revenuePodcasts)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenueRadio && (
                    <div>Radio: {formatCurrency(publication.businessInfo.revenueBreakdown.revenueRadio)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenueStreaming && (
                    <div>Streaming: {formatCurrency(publication.businessInfo.revenueBreakdown.revenueStreaming)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenueSocial && (
                    <div>Social: {formatCurrency(publication.businessInfo.revenueBreakdown.revenueSocial)}</div>
                  )}
                  {publication.businessInfo.revenueBreakdown.revenueOther && (
                    <div>Other: {formatCurrency(publication.businessInfo.revenueBreakdown.revenueOther)}</div>
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
            {publication.distributionChannels.website && (
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
                      <p className="text-sm font-semibold">{formatNumber(publication.distributionChannels.website.monthlyUniqueVisitors)}</p>
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
                      <p className="font-medium mb-2">Website Advertising Opportunities</p>
                      <div className="space-y-3">
                        {publication.distributionChannels.website.advertisingOpportunities.map((ad, index) => (
                          <div key={index} className="bg-white p-3 rounded border print:border-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="font-medium">{ad.name}</p>
                                <p>Format: {ad.adFormat}</p>
                                <p>Location: {ad.location}</p>
                              </div>
                              <div>
                                <p className="font-medium">Pricing</p>
                                {ad.pricing?.cpm && <p>CPM: ${ad.pricing.cpm}</p>}
                                {ad.pricing?.flatRate && <p>Flat Rate: ${ad.pricing.flatRate}</p>}
                                <p>Model: {ad.pricing?.pricingModel}</p>
                              </div>
                              <div>
                                <p className="font-medium">Specifications</p>
                                {ad.specifications?.size && <p>Size: {ad.specifications.size}</p>}
                                {ad.specifications?.format && <p>Format: {ad.specifications.format}</p>}
                                {ad.specifications?.fileSize && <p>File Size: {ad.specifications.fileSize}</p>}
                              </div>
                              <div>
                                <p className="font-medium">Performance</p>
                                {ad.monthlyImpressions && <p>Monthly Impressions: {formatNumber(ad.monthlyImpressions)}</p>}
                                <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                {ad.pricing?.minimumCommitment && <p>Min Commitment: {ad.pricing.minimumCommitment}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Newsletter Details */}
            {publication.distributionChannels.newsletters && publication.distributionChannels.newsletters.length > 0 && (
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
                        <div>Subscribers: {formatNumber(newsletter.subscriberCount)}</div>
                        <div>Open Rate: {newsletter.openRate}%</div>
                        <div>Click Rate: {newsletter.clickThroughRate}%</div>
                        <div>Frequency: {newsletter.frequency}</div>
                      </div>
                      
                      {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Newsletter Advertising Opportunities</p>
                          <div className="space-y-2">
                            {newsletter.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Format: {ad.adFormat}</p>
                                    <p>Position: {ad.position}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.flatRate && <p>Flat Rate: ${ad.pricing.flatRate}</p>}
                                    {ad.pricing?.cpm && <p>CPM: ${ad.pricing.cpm}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Details</p>
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print Details */}
            {publication.distributionChannels.print && publication.distributionChannels.print.length > 0 && (
              <div className="mb-6 print:mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-orange-800">Print Publications</h3>
                </div>
                <div className="space-y-4">
                  {(Array.isArray(publication.distributionChannels.print) ? publication.distributionChannels.print : [publication.distributionChannels.print]).map((print, index) => (
                    <div key={index} className="bg-orange-50 rounded-lg p-4 print:bg-gray-50">
                      <h4 className="font-semibold mb-3">{print.name || `Print Publication ${index + 1}`}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2 text-sm mb-3">
                        <div>Circulation: {formatNumber(print.circulation)}</div>
                        <div>Frequency: {print.frequency}</div>
                        <div>Distribution Area: {print.distributionArea}</div>
                        <div>Format: {print.format}</div>
                      </div>
                      
                      {print.advertisingOpportunities && print.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Print Advertising Opportunities</p>
                          <div className="space-y-2">
                            {print.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Size: {ad.size}</p>
                                    <p>Color: {ad.color}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.oneTime && <p>One Time: ${ad.pricing.oneTime}</p>}
                                    {ad.pricing?.threeTimes && <p>3x Rate: ${ad.pricing.threeTimes}</p>}
                                    {ad.pricing?.sixTimes && <p>6x Rate: ${ad.pricing.sixTimes}</p>}
                                    {ad.pricing?.twelveTimes && <p>12x Rate: ${ad.pricing.twelveTimes}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Specifications</p>
                                    {ad.specifications?.format && <p>Format: {ad.specifications.format}</p>}
                                    {ad.specifications?.resolution && <p>Resolution: {ad.specifications.resolution}</p>}
                                    <p>Bleed: {ad.specifications?.bleed ? 'Required' : 'Not required'}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Details</p>
                                    <p>Page: {ad.preferredPage}</p>
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Details */}
            {publication.distributionChannels.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
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
                        <div>Followers: {formatNumber(social.followers)}</div>
                        <div>Engagement Rate: {social.engagementRate}%</div>
                        <div>Verified: {social.verified ? 'Yes' : 'No'}</div>
                        <div>URL: {social.profileUrl}</div>
                      </div>
                      
                      {social.advertisingOpportunities && social.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Social Media Advertising Opportunities</p>
                          <div className="space-y-2">
                            {social.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Format: {ad.adFormat}</p>
                                    <p>Type: {ad.contentType}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.perPost && <p>Per Post: ${ad.pricing.perPost}</p>}
                                    {ad.pricing?.perStory && <p>Per Story: ${ad.pricing.perStory}</p>}
                                    {ad.pricing?.perVideo && <p>Per Video: ${ad.pricing.perVideo}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Specifications</p>
                                    {ad.specifications?.imageSize && <p>Image Size: {ad.specifications.imageSize}</p>}
                                    {ad.specifications?.videoLength && <p>Video Length: {ad.specifications.videoLength}s</p>}
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
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
            {publication.distributionChannels.events && publication.distributionChannels.events.length > 0 && (
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
                        <div>Expected Attendance: {formatNumber(event.expectedAttendance)}</div>
                        <div>Location: {event.location}</div>
                        <div>Type: {event.eventType}</div>
                        <div>Frequency: {event.frequency}</div>
                      </div>
                      {event.date && <div className="text-sm mb-3">Date: {new Date(event.date).toLocaleDateString()}</div>}
                      
                      {event.advertisingOpportunities && event.advertisingOpportunities.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Event Advertising Opportunities</p>
                          <div className="space-y-2">
                            {event.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Type: {ad.sponsorshipType}</p>
                                    <p>Location: {ad.location}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.flatRate && <p>Flat Rate: ${ad.pricing.flatRate}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Details</p>
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Podcasts Details */}
            {publication.distributionChannels.podcasts && publication.distributionChannels.podcasts.length > 0 && (
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
                          <p className="font-medium mb-2">Podcast Advertising Opportunities</p>
                          <div className="space-y-2">
                            {podcast.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Format: {ad.adFormat}</p>
                                    <p>Duration: {ad.duration}s</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.perSpot && <p>Per Spot: ${ad.pricing.perSpot}</p>}
                                    {ad.pricing?.cpm && <p>CPM: ${ad.pricing.cpm}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Specifications</p>
                                    {ad.specifications?.audioFormat && <p>Format: {ad.specifications.audioFormat}</p>}
                                    {ad.specifications?.bitRate && <p>Bit Rate: {ad.specifications.bitRate}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Details</p>
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
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
            {publication.distributionChannels.radioStations && publication.distributionChannels.radioStations.length > 0 && (
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
                          <p className="font-medium mb-2">Radio Advertising Opportunities</p>
                          <div className="space-y-2">
                            {radio.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Format: {ad.adFormat}</p>
                                    <p>Time Slot: {ad.timeSlot}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.perSpot && <p>Per Spot: ${ad.pricing.perSpot}</p>}
                                    {ad.pricing?.perWeek && <p>Per Week: ${ad.pricing.perWeek}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Specifications</p>
                                    {ad.specifications?.audioFormat && <p>Format: {ad.specifications.audioFormat}</p>}
                                    {ad.specifications?.maxLength && <p>Max Length: {ad.specifications.maxLength}s</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Details</p>
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
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
            {publication.distributionChannels.streamingVideo && publication.distributionChannels.streamingVideo.length > 0 && (
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
                          <p className="font-medium mb-2">Streaming Advertising Opportunities</p>
                          <div className="space-y-2">
                            {streaming.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="bg-white p-3 rounded border print:border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="font-medium">{ad.name}</p>
                                    <p>Format: {ad.adFormat}</p>
                                    <p>Duration: {ad.duration}s</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Pricing</p>
                                    {ad.pricing?.perVideo && <p>Per Video: ${ad.pricing.perVideo}</p>}
                                    {ad.pricing?.cpm && <p>CPM: ${ad.pricing.cpm}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Specifications</p>
                                    {ad.specifications?.videoFormat && <p>Format: {ad.specifications.videoFormat}</p>}
                                    {ad.specifications?.resolution && <p>Resolution: {ad.specifications.resolution}</p>}
                                  </div>
                                  <div>
                                    <p className="font-medium">Details</p>
                                    <p>Available: {ad.available ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
                {publication.audienceDemographics.totalAudience && (
                  <div>
                    <p className="font-medium">Total Audience</p>
                    <p className="text-2xl font-bold text-blue-600 print:text-lg">
                      {formatNumber(publication.audienceDemographics.totalAudience)}
                    </p>
                  </div>
                )}
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

        {/* Business Details */}
        {publication.businessInfo && (
          <Card className="print:shadow-none print:border-gray-300">
            <CardHeader className="print:pb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg">
                <Building2 className="h-5 w-5 print:h-4 print:w-4" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
                {publication.businessInfo.ownershipType && (
                  <div>
                    <p className="font-medium">Ownership Type</p>
                    <p className="text-lg font-semibold print:text-base capitalize">
                      {publication.businessInfo.ownershipType.replace('-', ' ')}
                    </p>
                  </div>
                )}
                {publication.businessInfo.parentCompany && (
                  <div>
                    <p className="font-medium">Parent Company</p>
                    <p className="text-lg font-semibold print:text-base">
                      {publication.businessInfo.parentCompany}
                    </p>
                  </div>
                )}
                {publication.businessInfo.yearsInOperation && (
                  <div>
                    <p className="font-medium">Years in Operation</p>
                    <p className="text-2xl font-bold text-green-600 print:text-lg">
                      {publication.businessInfo.yearsInOperation}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 mt-4 print:mt-2">
                {publication.businessInfo.averageMonthlyRevenue && (
                  <div>
                    <p className="font-medium">Average Monthly Revenue</p>
                    <p className="text-xl font-bold text-green-600 print:text-lg">
                      {formatCurrency(publication.businessInfo.averageMonthlyRevenue)}
                    </p>
                  </div>
                )}
                {publication.businessInfo.clientRetentionRate && (
                  <div>
                    <p className="font-medium">Client Retention Rate</p>
                    <p className="text-xl font-bold text-blue-600 print:text-lg">
                      {publication.businessInfo.clientRetentionRate}%
                    </p>
                  </div>
                )}
              </div>

              {publication.businessInfo.topAdvertiserCategories && publication.businessInfo.topAdvertiserCategories.length > 0 && (
                <div className="mt-4 print:mt-2">
                  <p className="font-medium mb-2">Top Advertiser Categories</p>
                  <p className="text-sm text-gray-600">
                    {publication.businessInfo.topAdvertiserCategories.join(', ')}
                  </p>
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
                    if (publication.distributionChannels.website?.advertisingOpportunities) {
                      totalAds += publication.distributionChannels.website.advertisingOpportunities.length;
                      publication.distributionChannels.website.advertisingOpportunities.forEach(ad => {
                        if (ad.adFormat) adTypes.add(`Website ${ad.adFormat}`);
                      });
                    }
                    
                    // Newsletter ads
                    publication.distributionChannels.newsletters?.forEach(newsletter => {
                      if (newsletter.advertisingOpportunities) {
                        totalAds += newsletter.advertisingOpportunities.length;
                        newsletter.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Newsletter ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Print ads
                    if (Array.isArray(publication.distributionChannels.print)) {
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
                    publication.distributionChannels.socialMedia?.forEach(social => {
                      if (social.advertisingOpportunities) {
                        totalAds += social.advertisingOpportunities.length;
                        social.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Social ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Event ads
                    publication.distributionChannels.events?.forEach(event => {
                      if (event.advertisingOpportunities) {
                        totalAds += event.advertisingOpportunities.length;
                        event.advertisingOpportunities.forEach(ad => {
                          if (ad.name) adTypes.add(`Event ${ad.name}`);
                        });
                      }
                    });
                    
                    // Podcast ads
                    publication.distributionChannels.podcasts?.forEach(podcast => {
                      if (podcast.advertisingOpportunities) {
                        totalAds += podcast.advertisingOpportunities.length;
                        podcast.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Podcast ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Radio ads
                    publication.distributionChannels.radioStations?.forEach(radio => {
                      if (radio.advertisingOpportunities) {
                        totalAds += radio.advertisingOpportunities.length;
                        radio.advertisingOpportunities.forEach(ad => {
                          if (ad.adFormat) adTypes.add(`Radio ${ad.adFormat}`);
                        });
                      }
                    });
                    
                    // Streaming ads
                    publication.distributionChannels.streamingVideo?.forEach(streaming => {
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
                    if (publication.distributionChannels.website?.monthlyUniqueVisitors) {
                      totalReach += publication.distributionChannels.website.monthlyUniqueVisitors;
                    }
                    
                    // Newsletter subscribers
                    publication.distributionChannels.newsletters?.forEach(newsletter => {
                      if (newsletter.subscriberCount) totalReach += newsletter.subscriberCount;
                    });
                    
                    // Print circulation
                    if (Array.isArray(publication.distributionChannels.print)) {
                      publication.distributionChannels.print.forEach(print => {
                        if (print.circulation) totalReach += print.circulation;
                      });
                    }
                    
                    // Social media followers
                    publication.distributionChannels.socialMedia?.forEach(social => {
                      if (social.followers) totalReach += social.followers;
                    });
                    
                    // Event attendance
                    publication.distributionChannels.events?.forEach(event => {
                      if (event.expectedAttendance) totalReach += event.expectedAttendance;
                    });
                    
                    // Podcast listeners
                    publication.distributionChannels.podcasts?.forEach(podcast => {
                      if (podcast.averageListeners) totalReach += podcast.averageListeners;
                    });
                    
                    // Radio listeners
                    publication.distributionChannels.radioStations?.forEach(radio => {
                      if (radio.listeners) totalReach += radio.listeners;
                    });
                    
                    // Streaming subscribers
                    publication.distributionChannels.streamingVideo?.forEach(streaming => {
                      if (streaming.subscribers) totalReach += streaming.subscribers;
                    });
                    
                    return (
                      <>
                        <p className="font-medium text-lg">Total Potential Reach: {formatNumber(totalReach)}</p>
                        <div className="mt-2 space-y-1">
                          {publication.distributionChannels.website?.monthlyUniqueVisitors && (
                            <p>• Website: {formatNumber(publication.distributionChannels.website.monthlyUniqueVisitors)} monthly visitors</p>
                          )}
                          {publication.distributionChannels.newsletters && publication.distributionChannels.newsletters.length > 0 && (
                            <p>• Newsletter: {formatNumber(publication.distributionChannels.newsletters.reduce((sum, n) => sum + (n.subscriberCount || 0), 0))} subscribers</p>
                          )}
                          {publication.distributionChannels.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
                            <p>• Social Media: {formatNumber(publication.distributionChannels.socialMedia.reduce((sum, s) => sum + (s.followers || 0), 0))} followers</p>
                          )}
                          {publication.distributionChannels.podcasts && publication.distributionChannels.podcasts.length > 0 && (
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
      <style jsx>{`
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
