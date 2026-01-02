/**
 * PlacementTraffickingCard
 * 
 * Main component that displays placement trafficking information.
 * Delegates to channel-specific subcomponents based on the placement channel.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Eye, Users, Newspaper, Radio, Headphones, CalendarDays, 
  Copy, Check, Download, Code, ExternalLink, Calendar,
  Mail, Tv, Share2, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlacementStatusBadge } from './PlacementStatusBadge';
import type { PlacementStatus } from './PlacementStatusBadge';
import {
  PlacementTraffickingInfo,
  WebsiteTraffickingInfo,
  NewsletterTraffickingInfo,
  PrintTraffickingInfo,
  RadioTraffickingInfo,
  PodcastTraffickingInfo,
  StreamingTraffickingInfo,
  EventsTraffickingInfo,
  SocialTraffickingInfo,
  GenericTraffickingInfo,
} from './placementTrafficking.types';
import { formatCurrency, formatNumber, formatDateRange } from './placementTrafficking.utils';

interface PlacementTraffickingCardProps {
  placement: PlacementTraffickingInfo | GenericTraffickingInfo;
  onAccept?: (placementId: string) => void;
  onReject?: (placementId: string) => void;
  onCopyScript?: (text: string, id: string) => void;
  copiedScriptId?: string | null;
  showActions?: boolean;
}

export function PlacementTraffickingCard({
  placement,
  onAccept,
  onReject,
  onCopyScript,
  copiedScriptId,
  showActions = true,
}: PlacementTraffickingCardProps) {
  const isPending = placement.status === 'pending';
  const isRejected = placement.status === 'rejected';

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden bg-white",
      isRejected && "border-red-300 bg-red-50/50"
    )}>
      {/* Header with name, earnings, and status */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChannelIcon channel={placement.channel} />
            <span className="font-semibold text-gray-900">{placement.placementName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Earnings badge - prominent */}
            <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold px-3 py-1">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Earn: {formatCurrency(placement.earnings)}
            </Badge>
            <PlacementStatusBadge status={placement.status} />
          </div>
        </div>
      </div>

      {/* Channel-specific content */}
      <div className="p-4">
        {renderChannelContent(placement, onCopyScript, copiedScriptId)}
      </div>

      {/* Actions */}
      {showActions && isPending && (
        <div className="px-4 py-3 bg-gray-50 border-t flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject?.(placement.placementId)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => onAccept?.(placement.placementId)}
            className="bg-green-600 hover:bg-green-700"
          >
            Accept Placement
          </Button>
        </div>
      )}
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const iconClass = "h-5 w-5 text-gray-500";
  switch (channel) {
    case 'website': return <Eye className={iconClass} />;
    case 'newsletter': return <Mail className={iconClass} />;
    case 'print': return <Newspaper className={iconClass} />;
    case 'radio': return <Radio className={iconClass} />;
    case 'podcast': return <Headphones className={iconClass} />;
    case 'streaming': return <Tv className={iconClass} />;
    case 'events': return <CalendarDays className={iconClass} />;
    case 'social_media':
    case 'social': return <Share2 className={iconClass} />;
    default: return <Eye className={iconClass} />;
  }
}

function renderChannelContent(
  placement: PlacementTraffickingInfo | GenericTraffickingInfo,
  onCopyScript?: (text: string, id: string) => void,
  copiedScriptId?: string | null
) {
  switch (placement.channel) {
    case 'website':
      return <WebsiteContent placement={placement as WebsiteTraffickingInfo} onCopyScript={onCopyScript} copiedScriptId={copiedScriptId} />;
    case 'newsletter':
      return <NewsletterContent placement={placement as NewsletterTraffickingInfo} onCopyScript={onCopyScript} copiedScriptId={copiedScriptId} />;
    case 'print':
      return <PrintContent placement={placement as PrintTraffickingInfo} />;
    case 'radio':
      return <RadioContent placement={placement as RadioTraffickingInfo} />;
    case 'podcast':
      return <PodcastContent placement={placement as PodcastTraffickingInfo} />;
    case 'streaming':
      return <StreamingContent placement={placement as StreamingTraffickingInfo} onCopyScript={onCopyScript} copiedScriptId={copiedScriptId} />;
    case 'events':
      return <EventsContent placement={placement as EventsTraffickingInfo} />;
    case 'social_media':
    case 'social':
      return <SocialContent placement={placement as SocialTraffickingInfo} />;
    default:
      return <GenericContent placement={placement as GenericTraffickingInfo} />;
  }
}

// ============ WEBSITE ============
function WebsiteContent({ 
  placement, 
  onCopyScript, 
  copiedScriptId 
}: { 
  placement: WebsiteTraffickingInfo;
  onCopyScript?: (text: string, id: string) => void;
  copiedScriptId?: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoItem
          label="DELIVER"
          value={`${formatNumber(placement.totalImpressions)} impressions`}
          highlight
        />
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
        />
        <InfoItem
          label="AUDIENCE"
          value={`${formatNumber(placement.audienceContext.monthlyVisitors)} visitors/mo`}
        />
      </div>

      {/* Available sizes with scripts */}
      {placement.availableSizes.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Available Sizes (distribute impressions as needed):
          </p>
          <div className="space-y-2">
            {placement.availableSizes.map((size, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{size.dimensions}</Badge>
                </div>
                {size.script && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => onCopyScript?.(size.script!.tags.fullTag, `${placement.placementId}-${idx}`)}
                  >
                    {copiedScriptId === `${placement.placementId}-${idx}` ? (
                      <><Check className="h-3 w-3 mr-1 text-green-600" /> Copied</>
                    ) : (
                      <><Code className="h-3 w-3 mr-1" /> Copy Tag</>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ NEWSLETTER ============
function NewsletterContent({ 
  placement, 
  onCopyScript, 
  copiedScriptId 
}: { 
  placement: NewsletterTraffickingInfo;
  onCopyScript?: (text: string, id: string) => void;
  copiedScriptId?: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoItem
          label="SENDS"
          value={`${placement.sends} newsletter sends`}
          highlight
        />
        {placement.newsletterName && (
          <InfoItem label="NEWSLETTER" value={placement.newsletterName} />
        )}
        {placement.position && (
          <InfoItem label="POSITION" value={placement.position} />
        )}
        {placement.dimensions && (
          <InfoItem label="SIZE" value={placement.dimensions} />
        )}
      </div>

      {/* Context info */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
          small
        />
        {placement.subscriberCount && (
          <InfoItem label="SUBSCRIBERS" value={formatNumber(placement.subscriberCount)} small />
        )}
        {placement.openRate && (
          <InfoItem label="OPEN RATE" value={`${placement.openRate}%`} small />
        )}
      </div>

      {/* Scripts */}
      {placement.scripts && placement.scripts.length > 0 && (
        <div className="mt-4">
          <Accordion type="single" collapsible>
            {placement.scripts.map((script, idx) => (
              <AccordionItem key={idx} value={`script-${idx}`} className="border rounded bg-gray-50">
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <Code className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{script.creative.name}</span>
                    </div>
                  </AccordionTrigger>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyScript?.(script.tags.fullTag, `${placement.placementId}-${idx}`);
                    }}
                  >
                    {copiedScriptId === `${placement.placementId}-${idx}` ? (
                      <><Check className="h-3 w-3 mr-1 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy HTML</>
                    )}
                  </Button>
                </div>
                <AccordionContent className="px-3 pb-3 pt-0">
                  <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                    <code>{script.tags.fullTag}</code>
                  </pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}

// ============ PRINT ============
function PrintContent({ placement }: { placement: PrintTraffickingInfo }) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoItem
          label="INSERTIONS"
          value={`${placement.insertions} issues`}
          highlight
        />
        {placement.dimensions && (
          <InfoItem label="SIZE" value={placement.dimensions} />
        )}
        {placement.editions && (
          <InfoItem label="EDITIONS" value={placement.editions} />
        )}
      </div>

      {/* Context info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
          small
        />
        {placement.circulationPerIssue && (
          <InfoItem 
            label="CIRCULATION" 
            value={`${formatNumber(placement.circulationPerIssue)} per issue`} 
            small 
          />
        )}
        {placement.totalCirculation && (
          <InfoItem 
            label="EST. REACH" 
            value={`~${formatNumber(placement.estimatedReach)} readers`} 
            small 
          />
        )}
      </div>

      {/* Download asset */}
      {placement.hasAsset && placement.assetUrl && (
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <a href={placement.assetUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download Print-Ready PDF
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

// ============ RADIO ============
function RadioContent({ placement }: { placement: RadioTraffickingInfo }) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoItem
          label="SPOTS"
          value={`${placement.spots} total airings`}
          highlight
        />
        {placement.duration && (
          <InfoItem label="DURATION" value={`${placement.duration} seconds`} />
        )}
        {placement.dayparts && placement.dayparts.length > 0 && (
          <InfoItem label="DAYPARTS" value={placement.dayparts.join(', ')} />
        )}
        {placement.showName && (
          <InfoItem label="SHOW" value={placement.showName} />
        )}
      </div>

      {/* Context info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
          small
        />
        {placement.listenersPerSpot && (
          <InfoItem 
            label="EST. LISTENERS" 
            value={`${formatNumber(placement.listenersPerSpot)} per spot`} 
            small 
          />
        )}
        {placement.totalEstimatedListeners && (
          <InfoItem 
            label="TOTAL REACH" 
            value={`~${formatNumber(placement.totalEstimatedListeners)}`} 
            small 
          />
        )}
      </div>

      {/* Download/view assets */}
      <div className="flex gap-2 mt-4">
        {placement.hasAsset && placement.assetUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={placement.assetUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download Audio Spot
            </a>
          </Button>
        )}
        {placement.scriptText && (
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Script
          </Button>
        )}
      </div>
    </div>
  );
}

// ============ PODCAST ============
function PodcastContent({ placement }: { placement: PodcastTraffickingInfo }) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoItem
          label="EPISODES"
          value={`${placement.episodes} episodes`}
          highlight
        />
        {placement.position && (
          <InfoItem label="POSITION" value={placement.position} />
        )}
        {placement.type && (
          <InfoItem label="TYPE" value={placement.type} />
        )}
        {placement.duration && (
          <InfoItem label="DURATION" value={`${placement.duration} seconds`} />
        )}
      </div>

      {/* Context info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
          small
        />
        {placement.podcastName && (
          <InfoItem label="PODCAST" value={placement.podcastName} small />
        )}
        {placement.downloadsPerEpisode && (
          <InfoItem 
            label="AVG DOWNLOADS" 
            value={`${formatNumber(placement.downloadsPerEpisode)} per episode`} 
            small 
          />
        )}
        {placement.totalEstimatedDownloads && (
          <InfoItem 
            label="EST. TOTAL" 
            value={`~${formatNumber(placement.totalEstimatedDownloads)} listens`} 
            small 
          />
        )}
      </div>

      {/* Talking points / landing URL */}
      <div className="flex gap-2 mt-4">
        {placement.talkingPoints && (
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Talking Points
          </Button>
        )}
        {placement.landingUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={placement.landingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Landing URL
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ============ STREAMING ============
function StreamingContent({ 
  placement, 
  onCopyScript, 
  copiedScriptId 
}: { 
  placement: StreamingTraffickingInfo;
  onCopyScript?: (text: string, id: string) => void;
  copiedScriptId?: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoItem
          label="DELIVER"
          value={`${formatNumber(placement.totalViews)} views`}
          highlight
        />
        {placement.position && (
          <InfoItem label="POSITION" value={placement.position} />
        )}
        {placement.duration && (
          <InfoItem label="DURATION" value={`${placement.duration} seconds`} />
        )}
        {placement.channelName && (
          <InfoItem label="CHANNEL" value={placement.channelName} />
        )}
      </div>

      {/* Context info */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t">
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
          small
        />
        {placement.subscriberCount && (
          <InfoItem label="SUBSCRIBERS" value={formatNumber(placement.subscriberCount)} small />
        )}
      </div>

      {/* Scripts */}
      {placement.scripts && placement.scripts.length > 0 && (
        <div className="mt-4 space-y-2">
          {placement.scripts.map((script, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
              <span className="text-sm">{script.creative.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => onCopyScript?.(script.tags.fullTag, `${placement.placementId}-${idx}`)}
              >
                {copiedScriptId === `${placement.placementId}-${idx}` ? (
                  <><Check className="h-3 w-3 mr-1 text-green-600" /> Copied</>
                ) : (
                  <><Code className="h-3 w-3 mr-1" /> Copy Tag</>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ EVENTS ============
function EventsContent({ placement }: { placement: EventsTraffickingInfo }) {
  return (
    <div className="space-y-4">
      {/* Primary info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {placement.eventName && (
          <InfoItem label="EVENT" value={placement.eventName} highlight />
        )}
        {placement.eventDates && placement.eventDates.length > 0 && (
          <InfoItem label="DATE" value={placement.eventDates.join(', ')} />
        )}
        {placement.expectedAttendance && (
          <InfoItem 
            label="EXPECTED ATTENDANCE" 
            value={formatNumber(placement.expectedAttendance)} 
          />
        )}
        {placement.sponsorshipLevel && (
          <InfoItem label="LEVEL" value={placement.sponsorshipLevel} />
        )}
      </div>

      {/* Deliverables checklist */}
      {placement.deliverables && placement.deliverables.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">DELIVERABLES:</p>
          <div className="space-y-2">
            {placement.deliverables.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={item.completed || false}
                  readOnly
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{item.item}</span>
                {item.description && (
                  <span className="text-xs text-gray-500">({item.description})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SOCIAL ============
function SocialContent({ placement }: { placement: SocialTraffickingInfo }) {
  return (
    <div className="space-y-4">
      {/* Primary trafficking info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoItem
          label="POSTS"
          value={`${placement.posts} posts`}
          highlight
        />
        {placement.platform && (
          <InfoItem label="PLATFORM" value={placement.platform} />
        )}
        {placement.contentType && (
          <InfoItem label="TYPE" value={placement.contentType} />
        )}
      </div>

      {/* Context info */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t">
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
          small
        />
        {placement.followers && (
          <InfoItem label="FOLLOWERS" value={formatNumber(placement.followers)} small />
        )}
        {placement.estimatedReach && (
          <InfoItem label="EST. REACH" value={`~${formatNumber(placement.estimatedReach)}`} small />
        )}
      </div>
    </div>
  );
}

// ============ GENERIC ============
function GenericContent({ placement }: { placement: GenericTraffickingInfo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoItem
          label="QUANTITY"
          value={`${placement.quantity} ${placement.unit}`}
          highlight
        />
        <InfoItem
          label="PERIOD"
          value={formatDateRange(placement.period.startDate, placement.period.endDate)}
        />
        {placement.audienceSize && (
          <InfoItem label="AUDIENCE" value={formatNumber(placement.audienceSize)} />
        )}
      </div>
      {placement.details && (
        <p className="text-sm text-gray-600">{placement.details}</p>
      )}
    </div>
  );
}

// ============ HELPER COMPONENT ============
function InfoItem({ 
  label, 
  value, 
  highlight = false,
  small = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div className={small ? "flex items-center gap-1" : ""}>
      <span className={cn(
        "text-gray-500 uppercase tracking-wide",
        small ? "text-xs" : "text-xs font-medium"
      )}>
        {label}:
      </span>
      <span className={cn(
        small ? "text-sm" : "block mt-0.5",
        highlight ? "font-semibold text-gray-900" : "text-gray-700"
      )}>
        {value}
      </span>
    </div>
  );
}

export default PlacementTraffickingCard;


