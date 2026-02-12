/**
 * Publication Performance Card
 * 
 * Expandable card showing comprehensive publication context alongside performance metrics.
 * Used in the CampaignPerformanceDashboard "By Publication" tab.
 * 
 * Four panels:
 * 1. About - AI profile, editorial info, competitive positioning
 * 2. Audience & Reach - demographics, channel-specific audience metrics
 * 3. Campaign Activity - placements, delivery goals, asset/proof status
 * 4. Performance - metrics contextualized against goals
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  MapPin,
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  CheckCircle,
  Clock,
  FileCheck,
  Newspaper,
  Radio,
  Mic,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicationPerformance } from './CampaignPerformanceDashboard';

interface PublicationPerformanceCardProps {
  publication: PublicationPerformance;
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  in_production: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  in_production: 'In Production',
  delivered: 'Delivered',
};

export function PublicationPerformanceCard({ publication }: PublicationPerformanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { context, activity } = publication;

  const deliveryPercent = activity?.deliverySummary?.percentComplete ?? 0;
  const deliveryColor = deliveryPercent >= 100 ? 'text-blue-600' :
    deliveryPercent >= 90 ? 'text-green-600' :
    deliveryPercent >= 70 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <Card className="overflow-hidden">
      {/* Card Header - Always Visible */}
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{publication.publicationName}</h3>
              {context?.publicationType && (
                <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                  {context.publicationType}
                </Badge>
              )}
              {context?.contentType && (
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                  {context.contentType}
                </Badge>
              )}
              {activity?.orderStatus && (
                <Badge className={cn("text-[10px] border-0 shrink-0", ORDER_STATUS_COLORS[activity.orderStatus] || 'bg-gray-100 text-gray-700')}>
                  {ORDER_STATUS_LABELS[activity.orderStatus] || activity.orderStatus}
                </Badge>
              )}
            </div>

            {/* Quick context: service area + content type */}
            {context?.primaryServiceArea && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {context.primaryServiceArea}
                {context.geographicCoverage && ` (${context.geographicCoverage})`}
              </p>
            )}

            {/* Delivery progress bar */}
            {activity?.deliverySummary && (
              <div className="mt-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className={cn("font-medium font-mono", deliveryColor)}>
                    {activity.deliverySummary.totalDelivered.toLocaleString()} / {activity.deliverySummary.totalGoalValue.toLocaleString()} ({deliveryPercent}%)
                  </span>
                </div>
                <Progress value={Math.min(deliveryPercent, 100)} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Right side: key metrics + expand button */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:grid grid-cols-3 gap-4 text-right">
              <div>
                <p className="text-[10px] text-muted-foreground">Impressions</p>
                <p className="text-sm font-bold font-mono">{publication.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Clicks</p>
                <p className="text-sm font-bold font-mono">{publication.clicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">CTR</p>
                <p className="text-sm font-bold font-mono">{publication.ctr?.toFixed(2) || '0.00'}%</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Expandable Detail Section */}
      {expanded && (
        <CardContent className="pt-0 pb-4">
          <Separator className="mb-4" />
          
          {/* Quick context bar: service area, content focus tags, website link */}
          {context && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
              {context.primaryServiceArea && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {context.primaryServiceArea}
                  {context.geographicCoverage && ` (${context.geographicCoverage})`}
                </span>
              )}
              {context.audienceDemographics?.totalAudience && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3 shrink-0" />
                  {context.audienceDemographics.totalAudience.toLocaleString()} total audience
                </span>
              )}
              {context.editorialInfo?.contentFocus && context.editorialInfo.contentFocus.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {context.editorialInfo.contentFocus.map(focus => (
                    <Badge key={focus} variant="outline" className="text-[10px]">{focus}</Badge>
                  ))}
                </div>
              )}
              {context.websiteUrl && (
                <a 
                  href={context.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {context.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              )}
            </div>
          )}

          {/* Channel audience numbers (compact) */}
          {context?.channelAudience && (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4">
              {context.channelAudience.website && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3 h-3 shrink-0" />
                  {context.channelAudience.website.monthlyVisitors?.toLocaleString()} visitors/mo
                </span>
              )}
              {context.channelAudience.newsletters?.map((nl: any, i: number) => (
                <span key={`nl-${i}`} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Newspaper className="w-3 h-3 shrink-0" />
                  {nl.subscribers?.toLocaleString()} subscribers
                  {nl.openRate && <span className="text-[10px]">({nl.openRate}% open)</span>}
                </span>
              ))}
              {context.channelAudience.print?.map((p: any, i: number) => (
                <span key={`pr-${i}`} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Newspaper className="w-3 h-3 shrink-0" />
                  {p.circulation?.toLocaleString()} circulation
                </span>
              ))}
              {context.channelAudience.radio?.map((rs: any, i: number) => (
                <span key={`ra-${i}`} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Radio className="w-3 h-3 shrink-0" />
                  {rs.listeners?.toLocaleString()} listeners
                </span>
              ))}
              {context.channelAudience.podcasts?.map((pc: any, i: number) => (
                <span key={`pc-${i}`} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mic className="w-3 h-3 shrink-0" />
                  {pc.averageDownloads?.toLocaleString()} avg downloads
                </span>
              ))}
              {context.channelAudience.social?.map((sm: any, i: number) => (
                <span key={`so-${i}`} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Share2 className="w-3 h-3 shrink-0 capitalize" />
                  {sm.followers?.toLocaleString()} {sm.platform} followers
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Panel 3: Campaign Activity */}
            {activity && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3" />
                  Campaign Activity
                </h4>

                {/* Channel mix / placements */}
                {activity.channelMix && activity.channelMix.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Active Placements</p>
                    <div className="space-y-1.5">
                      {activity.channelMix.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] capitalize">{item.channel}</Badge>
                            <span className="text-muted-foreground truncate max-w-[200px]">{item.itemName}</span>
                          </div>
                          {item.placementStatus && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {item.placementStatus.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-channel delivery */}
                {activity.deliverySummary?.byChannel && Object.keys(activity.deliverySummary.byChannel).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Delivery by Channel</p>
                    <div className="space-y-2">
                      {Object.entries(activity.deliverySummary.byChannel).map(([channel, data]: [string, any]) => (
                        <div key={channel} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="capitalize text-muted-foreground">{channel}</span>
                            <span className="font-mono">
                              {data.delivered?.toLocaleString()} / {data.goal?.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={Math.min(data.percent || 0, 100)} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asset & proof status */}
                <div className="flex gap-4 text-xs">
                  {activity.assetStatus && (
                    <div className="flex items-center gap-1.5">
                      {activity.assetStatus.allAssetsReady ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Clock className="w-3 h-3 text-yellow-600" />
                      )}
                      <span>
                        Assets: {activity.assetStatus.placementsWithAssets}/{activity.assetStatus.totalPlacements}
                        {activity.assetStatus.allAssetsReady && ' (ready)'}
                      </span>
                    </div>
                  )}
                  {activity.proofStatus && (
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="w-3 h-3 text-muted-foreground" />
                      <span>
                        Proofs: {activity.proofStatus.proofCount} submitted
                        {activity.proofStatus.complete && ' (complete)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Order total */}
                {activity.orderTotal != null && activity.orderTotal > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Cost allocation: <span className="font-medium text-foreground">${activity.orderTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Panel 4: Performance Metrics */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Performance
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider">Impressions</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{publication.impressions.toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <MousePointerClick className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider">Clicks</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{publication.clicks.toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider">CTR</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{publication.ctr?.toFixed(2) || '0.00'}%</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Users className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider">Reach</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{publication.reach.toLocaleString()}</p>
                </div>
              </div>

              {publication.entries > 0 && (
                <p className="text-xs text-muted-foreground">
                  Based on {publication.entries} performance {publication.entries === 1 ? 'entry' : 'entries'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
