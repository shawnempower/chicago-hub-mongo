import React, { useState } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { EditablePublicationProfile } from './EditablePublicationProfile';
import { PublicationFrontend } from '@/types/publication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Calendar,
  ExternalLink,
  Edit3,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  TrendingUp,
  Newspaper,
  Mic,
  Radio,
  Video
} from 'lucide-react';

export const PublicationProfile: React.FC = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const [isEditing, setIsEditing] = useState(false);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = (updatedPublication: PublicationFrontend) => {
    setSelectedPublication(updatedPublication);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <EditablePublicationProfile 
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  const publication = selectedPublication;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{publication.basicInfo.publicationName}</h2>
          <p className="text-muted-foreground">Publication Profile & Information</p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Publication Type</label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {publication.basicInfo.publicationType || 'Not specified'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {publication.basicInfo.contentType || 'Not specified'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Geographic Coverage</label>
                <div className="mt-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{publication.basicInfo.geographicCoverage || 'Not specified'}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Founded</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{publication.basicInfo.founded || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {publication.basicInfo.primaryServiceArea && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Service Area</label>
                <p className="mt-1">{publication.basicInfo.primaryServiceArea}</p>
              </div>
            )}

            {publication.basicInfo.websiteUrl && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Website</label>
                <div className="mt-1">
                  <a 
                    href={publication.basicInfo.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {publication.basicInfo.websiteUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {publication.contactInfo?.mainPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{publication.contactInfo.mainPhone}</span>
              </div>
            )}

            {publication.contactInfo?.salesContact && (
              <div>
                <h4 className="font-medium text-sm">Sales Contact</h4>
                <div className="mt-2 space-y-1 text-sm">
                  {publication.contactInfo.salesContact.name && (
                    <p>{publication.contactInfo.salesContact.name}</p>
                  )}
                  {publication.contactInfo.salesContact.title && (
                    <p className="text-muted-foreground">{publication.contactInfo.salesContact.title}</p>
                  )}
                  {publication.contactInfo.salesContact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a href={`mailto:${publication.contactInfo.salesContact.email}`} className="text-primary hover:underline">
                        {publication.contactInfo.salesContact.email}
                      </a>
                    </div>
                  )}
                  {publication.contactInfo.salesContact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{publication.contactInfo.salesContact.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {publication.contactInfo?.businessHours && (
              <div>
                <h4 className="font-medium text-sm">Business Hours</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {publication.contactInfo.businessHours}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Media */}
        {publication.socialMediaProfiles && publication.socialMediaProfiles.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social Media Presence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {publication.socialMediaProfiles.map((profile, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {profile.platform === 'facebook' && <Facebook className="h-5 w-5 text-blue-600" />}
                      {profile.platform === 'twitter' && <Twitter className="h-5 w-5 text-blue-400" />}
                      {profile.platform === 'instagram' && <Instagram className="h-5 w-5 text-pink-600" />}
                      {profile.platform === 'linkedin' && <Linkedin className="h-5 w-5 text-blue-700" />}
                      <div>
                        <p className="font-medium capitalize">{profile.platform}</p>
                        <p className="text-sm text-muted-foreground">@{profile.handle}</p>
                        {profile.metrics?.followers && (
                          <p className="text-xs text-muted-foreground">
                            {profile.metrics.followers.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                    </div>
                    {profile.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={profile.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audience Demographics */}
        {publication.audienceDemographics && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Audience Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Audience */}
                {publication.audienceDemographics.totalAudience && (
                  <div className="text-center">
                    <h4 className="font-medium mb-2">Total Audience</h4>
                    <p className="text-2xl font-bold text-primary">
                      {publication.audienceDemographics.totalAudience.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Age Groups */}
                {publication.audienceDemographics.ageGroups && (
                  <div>
                    <h4 className="font-medium mb-3">Age Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(publication.audienceDemographics.ageGroups).map(([age, percentage]) => (
                        <div key={age} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{age}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gender Distribution */}
                {publication.audienceDemographics.gender && (
                  <div>
                    <h4 className="font-medium mb-3">Gender Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(publication.audienceDemographics.gender).map(([gender, percentage]) => (
                        <div key={gender} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground capitalize">{gender}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-accent h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Income Distribution */}
                {publication.audienceDemographics.householdIncome && (
                  <div>
                    <h4 className="font-medium mb-3">Household Income</h4>
                    <div className="space-y-2">
                      {Object.entries(publication.audienceDemographics.householdIncome).map(([income, percentage]) => (
                        <div key={income} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {income === 'under35k' ? '<$35K' :
                             income === '35k-50k' ? '$35-50K' :
                             income === '50k-75k' ? '$50-75K' :
                             income === '75k-100k' ? '$75-100K' :
                             income === '100k-150k' ? '$100-150K' :
                             income === 'over150k' ? '>$150K' : income}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-success h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Audience Info */}
              {(publication.audienceDemographics.interests || publication.audienceDemographics.targetMarkets) && (
                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {publication.audienceDemographics.interests && publication.audienceDemographics.interests.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Audience Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {publication.audienceDemographics.interests.map((interest, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {publication.audienceDemographics.targetMarkets && publication.audienceDemographics.targetMarkets.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Target Markets</h4>
                        <div className="flex flex-wrap gap-2">
                          {publication.audienceDemographics.targetMarkets.map((market, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {market}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Distribution & Reach */}
        {publication.distributionChannels && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Distribution & Reach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="website" className="w-full">
                <TabsList className="grid w-full grid-cols-8 gap-1">
                  {publication.distributionChannels.website && (
                    <TabsTrigger value="website" className="flex items-center gap-1 text-xs">
                      <Globe className="h-3 w-3" />
                      Website
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.newsletters && publication.distributionChannels.newsletters.length > 0 && (
                    <TabsTrigger value="newsletters" className="flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3" />
                      Newsletter
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.print && (
                    <TabsTrigger value="print" className="flex items-center gap-1 text-xs">
                      <Newspaper className="h-3 w-3" />
                      Print
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
                    <TabsTrigger value="social" className="flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3" />
                      Social
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.events && publication.distributionChannels.events.length > 0 && (
                    <TabsTrigger value="events" className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      Events
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.podcasts && publication.distributionChannels.podcasts.length > 0 && (
                    <TabsTrigger value="podcasts" className="flex items-center gap-1 text-xs">
                      <Mic className="h-3 w-3" />
                      Podcasts
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.radioStations && publication.distributionChannels.radioStations.length > 0 && (
                    <TabsTrigger value="radio" className="flex items-center gap-1 text-xs">
                      <Radio className="h-3 w-3" />
                      Radio
                    </TabsTrigger>
                  )}
                  {publication.distributionChannels.streamingVideo && publication.distributionChannels.streamingVideo.length > 0 && (
                    <TabsTrigger value="streaming" className="flex items-center gap-1 text-xs">
                      <Video className="h-3 w-3" />
                      Streaming
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Website Tab */}
                {publication.distributionChannels.website && (
                  <TabsContent value="website" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold">Website Distribution</h4>
                      {publication.distributionChannels.website.url && (
                        <a 
                          href={publication.distributionChannels.website.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {publication.distributionChannels.website.metrics?.monthlyVisitors && publication.distributionChannels.website.metrics.monthlyVisitors > 0 && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {publication.distributionChannels.website.metrics.monthlyVisitors.toLocaleString()}
                          </p>
                          <p className="text-sm text-blue-800">Monthly Visitors</p>
                        </div>
                      )}
                      {publication.distributionChannels.website.metrics?.monthlyPageViews && publication.distributionChannels.website.metrics.monthlyPageViews > 0 && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {publication.distributionChannels.website.metrics.monthlyPageViews.toLocaleString()}
                          </p>
                          <p className="text-sm text-blue-800">Page Views</p>
                        </div>
                      )}
                      {publication.distributionChannels.website.metrics?.averageSessionDuration && publication.distributionChannels.website.metrics.averageSessionDuration > 0 && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {Math.round(publication.distributionChannels.website.metrics.averageSessionDuration)}s
                          </p>
                          <p className="text-sm text-blue-800">Avg. Session</p>
                        </div>
                      )}
                      {publication.distributionChannels.website.metrics?.bounceRate && publication.distributionChannels.website.metrics.bounceRate > 0 && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {publication.distributionChannels.website.metrics.bounceRate}%
                          </p>
                          <p className="text-sm text-blue-800">Bounce Rate</p>
                        </div>
                      )}
                    </div>

                    {publication.distributionChannels.website.advertisingOpportunities && 
                     publication.distributionChannels.website.advertisingOpportunities.length > 0 && (
                      <div className="mt-6">
                        <h5 className="text-lg font-medium mb-3">Advertising Opportunities</h5>
                        <div className="flex flex-wrap gap-2">
                          {publication.distributionChannels.website.advertisingOpportunities.map((ad, index) => (
                            <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                              {ad.name || ad.adFormat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Newsletters Tab */}
                {publication.distributionChannels.newsletters && publication.distributionChannels.newsletters.length > 0 && (
                  <TabsContent value="newsletters" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold">Newsletter Distribution</h4>
                    </div>
                    
                    <div className="space-y-6">
                      {publication.distributionChannels.newsletters.map((newsletter, index) => (
                        <div key={index} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-lg font-medium text-green-800">{newsletter.name || `Newsletter ${index + 1}`}</h5>
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              {newsletter.frequency || 'Regular'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {newsletter.subscribers && newsletter.subscribers > 0 && (
                              <div className="text-center p-3 bg-white rounded">
                                <p className="text-xl font-bold text-green-600">
                                  {newsletter.subscribers.toLocaleString()}
                                </p>
                                <p className="text-sm text-green-700">Subscribers</p>
                              </div>
                            )}
                            {newsletter.openRate && newsletter.openRate > 0 && (
                              <div className="text-center p-3 bg-white rounded">
                                <p className="text-xl font-bold text-green-600">{newsletter.openRate}%</p>
                                <p className="text-sm text-green-700">Open Rate</p>
                              </div>
                            )}
                            {newsletter.clickThroughRate && newsletter.clickThroughRate > 0 && (
                              <div className="text-center p-3 bg-white rounded">
                                <p className="text-xl font-bold text-green-600">{newsletter.clickThroughRate}%</p>
                                <p className="text-sm text-green-700">Click Rate</p>
                              </div>
                            )}
                            {newsletter.listGrowthRate && newsletter.listGrowthRate > 0 && (
                              <div className="text-center p-3 bg-white rounded">
                                <p className="text-xl font-bold text-green-600">{newsletter.listGrowthRate}%</p>
                                <p className="text-sm text-green-700">Growth Rate</p>
                              </div>
                            )}
                          </div>

                          {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 && (
                            <div>
                              <h6 className="font-medium mb-2 text-green-800">Ad Positions</h6>
                              <div className="flex flex-wrap gap-2">
                                {newsletter.advertisingOpportunities.map((ad, adIndex) => (
                                  <Badge key={adIndex} variant="secondary" className="text-sm">
                                    {ad.position || ad.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* Print Tab */}
                {publication.distributionChannels.print && (
                  <TabsContent value="print" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Newspaper className="h-5 w-5 text-purple-500" />
                      <h4 className="font-semibold">Print Distribution</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {publication.distributionChannels.print.circulation && publication.distributionChannels.print.circulation > 0 && (
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">
                            {publication.distributionChannels.print.circulation.toLocaleString()}
                          </p>
                          <p className="text-sm text-purple-800">Total Circulation</p>
                        </div>
                      )}
                      {publication.distributionChannels.print.paidCirculation && publication.distributionChannels.print.paidCirculation > 0 && (
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">
                            {publication.distributionChannels.print.paidCirculation.toLocaleString()}
                          </p>
                          <p className="text-sm text-purple-800">Paid Circulation</p>
                        </div>
                      )}
                      {publication.distributionChannels.print.freeCirculation && publication.distributionChannels.print.freeCirculation > 0 && (
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">
                            {publication.distributionChannels.print.freeCirculation.toLocaleString()}
                          </p>
                          <p className="text-sm text-purple-800">Free Circulation</p>
                        </div>
                      )}
                      {publication.distributionChannels.print.frequency && (
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600 capitalize">
                            {publication.distributionChannels.print.frequency}
                          </p>
                          <p className="text-sm text-purple-800">Frequency</p>
                        </div>
                      )}
                    </div>

                    {publication.distributionChannels.print.distributionArea && (
                      <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                        <h5 className="font-medium mb-2 text-purple-800">Distribution Area</h5>
                        <p className="text-purple-700">{publication.distributionChannels.print.distributionArea}</p>
                      </div>
                    )}

                    {publication.distributionChannels.print.distributionPoints && 
                     publication.distributionChannels.print.distributionPoints.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-lg font-medium mb-3">Distribution Points</h5>
                        <div className="flex flex-wrap gap-2">
                          {publication.distributionChannels.print.distributionPoints.map((point, index) => (
                            <Badge key={index} variant="outline" className="text-sm py-1 px-3 border-purple-300 text-purple-700">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {publication.distributionChannels.print.advertisingOpportunities && 
                     publication.distributionChannels.print.advertisingOpportunities.length > 0 && (
                      <div>
                        <h5 className="text-lg font-medium mb-3">Ad Formats Available</h5>
                        <div className="flex flex-wrap gap-2">
                          {publication.distributionChannels.print.advertisingOpportunities.map((ad, index) => (
                            <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                              {ad.adFormat || ad.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Events Tab */}
                {publication.distributionChannels.events && publication.distributionChannels.events.length > 0 && (
                  <TabsContent value="events" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      <h4 className="font-semibold">Events Distribution</h4>
                    </div>
                    
                    <div className="space-y-4">
                      {publication.distributionChannels.events.map((event, index) => (
                        <div key={index} className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-lg font-medium text-orange-800">{event.name || `Event ${index + 1}`}</h5>
                            {event.type && (
                              <Badge variant="outline" className="text-orange-700 border-orange-300">{event.type}</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            {event.frequency && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-orange-600 font-medium">Frequency:</span>
                                <p className="font-semibold text-orange-800">{event.frequency}</p>
                              </div>
                            )}
                            {event.averageAttendance && event.averageAttendance > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-orange-600 font-medium">Attendance:</span>
                                <p className="font-semibold text-orange-800">{event.averageAttendance.toLocaleString()}</p>
                              </div>
                            )}
                            {event.location && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-orange-600 font-medium">Location:</span>
                                <p className="font-semibold text-orange-800">{event.location}</p>
                              </div>
                            )}
                          </div>

                          {event.targetAudience && (
                            <div className="p-3 bg-white rounded">
                              <span className="text-sm text-orange-600 font-medium">Target Audience:</span>
                              <p className="text-orange-800">{event.targetAudience}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* Social Media Tab */}
                {publication.distributionChannels.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
                  <TabsContent value="social" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-purple-500" />
                      <h4 className="font-semibold">Social Media</h4>
                    </div>
                    
                    <div className="space-y-4">
                      {publication.distributionChannels.socialMedia.map((profile, index) => (
                        <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <h5 className="font-medium mb-3 text-purple-800">{profile.platform} - {profile.handle}</h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {profile.followers && profile.followers > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-purple-600 font-medium">Followers:</span>
                                <p className="font-semibold text-purple-800">{profile.followers.toLocaleString()}</p>
                              </div>
                            )}
                            {profile.engagementRate && profile.engagementRate > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-purple-600 font-medium">Engagement:</span>
                                <p className="font-semibold text-purple-800">{profile.engagementRate}%</p>
                              </div>
                            )}
                            {profile.verified && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-purple-600 font-medium">Status:</span>
                                <p className="font-semibold text-purple-800">Verified</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* Podcasts Tab */}
                {publication.distributionChannels.podcasts && publication.distributionChannels.podcasts.length > 0 && (
                  <TabsContent value="podcasts" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Mic className="h-5 w-5 text-red-500" />
                      <h4 className="font-semibold">Podcasts</h4>
                    </div>
                    
                    <div className="space-y-4">
                      {publication.distributionChannels.podcasts.map((podcast, index) => (
                        <div key={index} className="p-4 bg-red-50 rounded-lg border border-red-100">
                          <h5 className="font-medium mb-3 text-red-800">{podcast.name}</h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {podcast.averageListeners && podcast.averageListeners > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-red-600 font-medium">Avg Listeners:</span>
                                <p className="font-semibold text-red-800">{podcast.averageListeners.toLocaleString()}</p>
                              </div>
                            )}
                            {podcast.averageDownloads && podcast.averageDownloads > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-red-600 font-medium">Avg Downloads:</span>
                                <p className="font-semibold text-red-800">{podcast.averageDownloads.toLocaleString()}</p>
                              </div>
                            )}
                            {podcast.episodeCount && podcast.episodeCount > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-red-600 font-medium">Episodes:</span>
                                <p className="font-semibold text-red-800">{podcast.episodeCount}</p>
                              </div>
                            )}
                            {podcast.frequency && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-red-600 font-medium">Frequency:</span>
                                <p className="font-semibold text-red-800">{podcast.frequency}</p>
                              </div>
                            )}
                          </div>

                          {podcast.platforms && podcast.platforms.length > 0 && (
                            <div className="mt-3 p-3 bg-white rounded">
                              <span className="text-sm text-red-600 font-medium">Platforms:</span>
                              <p className="text-red-800">{podcast.platforms.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* Radio Tab */}
                {publication.distributionChannels.radioStations && publication.distributionChannels.radioStations.length > 0 && (
                  <TabsContent value="radio" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Radio className="h-5 w-5 text-yellow-500" />
                      <h4 className="font-semibold">Radio Stations</h4>
                    </div>
                    
                    <div className="space-y-4">
                      {publication.distributionChannels.radioStations.map((radio, index) => (
                        <div key={index} className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                          <h5 className="font-medium mb-3 text-yellow-800">{radio.callSign} - {radio.frequency}</h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {radio.listeners && radio.listeners > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-yellow-600 font-medium">Weekly Listeners:</span>
                                <p className="font-semibold text-yellow-800">{radio.listeners.toLocaleString()}</p>
                              </div>
                            )}
                            {radio.format && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-yellow-600 font-medium">Format:</span>
                                <p className="font-semibold text-yellow-800">{radio.format}</p>
                              </div>
                            )}
                            {radio.coverageArea && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-yellow-600 font-medium">Coverage:</span>
                                <p className="font-semibold text-yellow-800">{radio.coverageArea}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* Streaming Tab */}
                {publication.distributionChannels.streamingVideo && publication.distributionChannels.streamingVideo.length > 0 && (
                  <TabsContent value="streaming" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Video className="h-5 w-5 text-indigo-500" />
                      <h4 className="font-semibold">Streaming Video</h4>
                    </div>
                    
                    <div className="space-y-4">
                      {publication.distributionChannels.streamingVideo.map((streaming, index) => (
                        <div key={index} className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                          <h5 className="font-medium mb-3 text-indigo-800">{streaming.name} - {streaming.platform}</h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {streaming.subscribers && streaming.subscribers > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-indigo-600 font-medium">Subscribers:</span>
                                <p className="font-semibold text-indigo-800">{streaming.subscribers.toLocaleString()}</p>
                              </div>
                            )}
                            {streaming.averageViews && streaming.averageViews > 0 && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-indigo-600 font-medium">Avg Views:</span>
                                <p className="font-semibold text-indigo-800">{streaming.averageViews.toLocaleString()}</p>
                              </div>
                            )}
                            {streaming.contentType && (
                              <div className="p-3 bg-white rounded">
                                <span className="text-sm text-indigo-600 font-medium">Content Type:</span>
                                <p className="font-semibold text-indigo-800">{streaming.contentType}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
