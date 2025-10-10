import React, { useState } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { EditablePublicationProfile } from './EditablePublicationProfile';
import { PublicationFrontend } from '@/types/publication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
                Distribution & Reach Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Website */}
                {publication.distributionChannels.website?.metrics?.monthlyVisitors && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Globe className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {publication.distributionChannels.website.metrics.monthlyVisitors.toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-800">Website Visitors</p>
                  </div>
                )}

                {/* Newsletter Total */}
                {publication.distributionChannels.newsletters && publication.distributionChannels.newsletters.length > 0 && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Mail className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {publication.distributionChannels.newsletters
                        .reduce((total, newsletter) => total + (newsletter.subscribers || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-green-800">Newsletter Subscribers</p>
                  </div>
                )}

                {/* Print Total */}
                {publication.distributionChannels.print && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Newspaper className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {(() => {
                        if (Array.isArray(publication.distributionChannels.print)) {
                          return publication.distributionChannels.print
                            .reduce((total, printPub) => total + (printPub.circulation || 0), 0)
                            .toLocaleString();
                        }
                        return (publication.distributionChannels.print.circulation || 0).toLocaleString();
                      })()}
                    </p>
                    <p className="text-sm text-purple-800">Print Circulation</p>
                  </div>
                )}

                {/* Social Media Total */}
                {publication.distributionChannels.socialMedia && publication.distributionChannels.socialMedia.length > 0 && (
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <Users className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-pink-600">
                      {publication.distributionChannels.socialMedia
                        .reduce((total, social) => total + (social.metrics?.followers || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-pink-800">Social Followers</p>
                  </div>
                )}

                {/* Podcast Total */}
                {publication.distributionChannels.podcasts && publication.distributionChannels.podcasts.length > 0 && (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Mic className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      {publication.distributionChannels.podcasts
                        .reduce((total, podcast) => total + (podcast.averageListeners || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-red-800">Podcast Listeners</p>
                  </div>
                )}

                {/* Radio Total */}
                {publication.distributionChannels.radioStations && publication.distributionChannels.radioStations.length > 0 && (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Radio className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">
                      {publication.distributionChannels.radioStations
                        .reduce((total, radio) => total + (radio.listeners || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-yellow-800">Radio Listeners</p>
                  </div>
                )}

                {/* Streaming Total */}
                {publication.distributionChannels.streamingVideo && publication.distributionChannels.streamingVideo.length > 0 && (
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <Video className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-indigo-600">
                      {publication.distributionChannels.streamingVideo
                        .reduce((total, streaming) => total + (streaming.subscribers || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-indigo-800">Streaming Subscribers</p>
                  </div>
                )}

                {/* Events Total */}
                {publication.distributionChannels.events && publication.distributionChannels.events.length > 0 && (
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-600">
                      {publication.distributionChannels.events
                        .reduce((total, event) => total + (event.expectedAttendance || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-orange-800">Event Attendance</p>
                  </div>
                )}
              </div>

              {/* Total Reach Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total Combined Reach</p>
                  <p className="text-3xl font-bold text-primary">
                    {(() => {
                      let totalReach = 0;
                      
                      // Website visitors
                      if (publication.distributionChannels.website?.metrics?.monthlyVisitors) {
                        totalReach += publication.distributionChannels.website.metrics.monthlyVisitors;
                      }
                      
                      // Newsletter subscribers
                      if (publication.distributionChannels.newsletters) {
                        totalReach += publication.distributionChannels.newsletters
                          .reduce((total, newsletter) => total + (newsletter.subscribers || 0), 0);
                      }
                      
                      // Print circulation
                      if (publication.distributionChannels.print) {
                        if (Array.isArray(publication.distributionChannels.print)) {
                          totalReach += publication.distributionChannels.print
                            .reduce((total, printPub) => total + (printPub.circulation || 0), 0);
                        } else {
                          totalReach += publication.distributionChannels.print.circulation || 0;
                        }
                      }
                      
                      // Social media followers
                      if (publication.distributionChannels.socialMedia) {
                        totalReach += publication.distributionChannels.socialMedia
                          .reduce((total, social) => total + (social.metrics?.followers || 0), 0);
                      }
                      
                      // Podcast listeners
                      if (publication.distributionChannels.podcasts) {
                        totalReach += publication.distributionChannels.podcasts
                          .reduce((total, podcast) => total + (podcast.averageListeners || 0), 0);
                      }
                      
                      // Radio listeners
                      if (publication.distributionChannels.radioStations) {
                        totalReach += publication.distributionChannels.radioStations
                          .reduce((total, radio) => total + (radio.listeners || 0), 0);
                      }
                      
                      // Streaming subscribers
                      if (publication.distributionChannels.streamingVideo) {
                        totalReach += publication.distributionChannels.streamingVideo
                          .reduce((total, streaming) => total + (streaming.subscribers || 0), 0);
                      }
                      
                      // Event attendance
                      if (publication.distributionChannels.events) {
                        totalReach += publication.distributionChannels.events
                          .reduce((total, event) => total + (event.expectedAttendance || 0), 0);
                      }
                      
                      return totalReach.toLocaleString();
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
