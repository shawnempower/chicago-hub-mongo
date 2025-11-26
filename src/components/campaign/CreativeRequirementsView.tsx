/**
 * Creative Requirements View Component
 * 
 * Displays creative specifications extracted from selected inventory items.
 * Shows hub team what assets they need to provide for the campaign.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreativeRequirement, 
  formatDimensions, 
  formatFileSize,
  groupRequirementsByPublication,
  groupRequirementsByChannel
} from '@/utils/creativeSpecsExtractor';
import { 
  Image, 
  FileText, 
  Radio, 
  Mail, 
  Printer, 
  Share2, 
  Tv,
  Music,
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface CreativeRequirementsViewProps {
  requirements: CreativeRequirement[];
  groupBy?: 'publication' | 'channel' | 'none';
  showUploadStatus?: boolean;
  uploadedAssets?: Map<string, boolean>; // placementId -> uploaded status
  compact?: boolean;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  website: <Image className="h-4 w-4" />,
  newsletter: <Mail className="h-4 w-4" />,
  print: <Printer className="h-4 w-4" />,
  radio: <Radio className="h-4 w-4" />,
  podcast: <Music className="h-4 w-4" />,
  social: <Share2 className="h-4 w-4" />,
  streaming: <Tv className="h-4 w-4" />,
  events: <Calendar className="h-4 w-4" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  website: 'bg-blue-100 text-blue-800',
  newsletter: 'bg-purple-100 text-purple-800',
  print: 'bg-gray-100 text-gray-800',
  radio: 'bg-orange-100 text-orange-800',
  podcast: 'bg-pink-100 text-pink-800',
  social: 'bg-green-100 text-green-800',
  streaming: 'bg-red-100 text-red-800',
  events: 'bg-yellow-100 text-yellow-800',
};

export function CreativeRequirementsView({
  requirements,
  groupBy = 'publication',
  showUploadStatus = false,
  uploadedAssets,
  compact = false
}: CreativeRequirementsViewProps) {
  if (requirements.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No creative requirements found for the selected inventory items.
        </AlertDescription>
      </Alert>
    );
  }

  const renderRequirement = (req: CreativeRequirement) => {
    const isUploaded = uploadedAssets?.get(req.placementId) || false;

    return (
      <div 
        key={req.placementId}
        className={`p-4 border rounded-lg ${compact ? 'space-y-2' : 'space-y-3'} ${
          isUploaded ? 'bg-green-50 border-green-200' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{req.placementName}</h4>
              {showUploadStatus && (
                isUploaded ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )
              )}
            </div>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {req.publicationName}
              </p>
            )}
          </div>
          <Badge className={CHANNEL_COLORS[req.channel] || 'bg-gray-100'}>
            <span className="flex items-center gap-1">
              {CHANNEL_ICONS[req.channel]}
              {req.channel}
            </span>
          </Badge>
        </div>

        {/* Specifications Grid */}
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-3 text-xs`}>
          {req.dimensions && (
            <div>
              <span className="text-muted-foreground font-medium">Dimensions:</span>
              <p className="font-mono mt-0.5">{formatDimensions(req.dimensions)}</p>
            </div>
          )}

          {req.fileFormats && req.fileFormats.length > 0 && (
            <div>
              <span className="text-muted-foreground font-medium">Formats:</span>
              <p className="font-mono mt-0.5">{req.fileFormats.join(', ')}</p>
            </div>
          )}

          {req.maxFileSize && (
            <div>
              <span className="text-muted-foreground font-medium">Max Size:</span>
              <p className="font-mono mt-0.5">{formatFileSize(req.maxFileSize)}</p>
            </div>
          )}

          {req.colorSpace && (
            <div>
              <span className="text-muted-foreground font-medium">Color Space:</span>
              <p className="font-mono mt-0.5">{req.colorSpace}</p>
            </div>
          )}

          {req.resolution && (
            <div>
              <span className="text-muted-foreground font-medium">Resolution:</span>
              <p className="font-mono mt-0.5">{req.resolution}</p>
            </div>
          )}

          {req.duration && (
            <div>
              <span className="text-muted-foreground font-medium">Duration:</span>
              <p className="font-mono mt-0.5">{req.duration}s</p>
            </div>
          )}

          {req.bitrate && (
            <div>
              <span className="text-muted-foreground font-medium">Bitrate:</span>
              <p className="font-mono mt-0.5">{req.bitrate}</p>
            </div>
          )}

          {req.bleed && (
            <div>
              <span className="text-muted-foreground font-medium">Bleed:</span>
              <p className="font-mono mt-0.5">{req.bleed}</p>
            </div>
          )}
        </div>

        {/* Additional Requirements */}
        {req.additionalRequirements && !compact && (
          <div className="pt-2 border-t text-xs">
            <span className="text-muted-foreground font-medium">Additional Requirements:</span>
            <p className="mt-0.5 text-gray-700">{req.additionalRequirements}</p>
          </div>
        )}

        {/* Material Deadline */}
        {req.materialDeadline && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground font-medium">Material Deadline:</span>
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {new Date(req.materialDeadline).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Group by publication
  if (groupBy === 'publication') {
    const grouped = groupRequirementsByPublication(requirements);
    
    return (
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([publicationId, reqs]) => (
          <Card key={publicationId}>
            <CardHeader>
              <CardTitle className="text-base">
                {reqs[0].publicationName}
              </CardTitle>
              <CardDescription>
                {reqs.length} placement{reqs.length !== 1 ? 's' : ''} requiring creative assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reqs.map(renderRequirement)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Group by channel
  if (groupBy === 'channel') {
    const grouped = groupRequirementsByChannel(requirements);
    
    return (
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([channel, reqs]) => (
          <Card key={channel}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {CHANNEL_ICONS[channel]}
                <span className="capitalize">{channel}</span>
              </CardTitle>
              <CardDescription>
                {reqs.length} placement{reqs.length !== 1 ? 's' : ''} across {new Set(reqs.map(r => r.publicationId)).size} publication{new Set(reqs.map(r => r.publicationId)).size !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reqs.map(renderRequirement)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // No grouping - flat list
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Creative Requirements</CardTitle>
        <CardDescription>
          {requirements.length} placement{requirements.length !== 1 ? 's' : ''} requiring creative assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requirements.map(renderRequirement)}
      </CardContent>
    </Card>
  );
}

/**
 * Summary view showing counts and status
 */
interface RequirementsSummaryProps {
  requirements: CreativeRequirement[];
  uploadedAssets?: Map<string, boolean>;
}

export function CreativeRequirementsSummary({ 
  requirements,
  uploadedAssets
}: RequirementsSummaryProps) {
  const totalRequired = requirements.length;
  const totalUploaded = uploadedAssets 
    ? Array.from(uploadedAssets.values()).filter(Boolean).length 
    : 0;
  const percentComplete = totalRequired > 0 
    ? Math.round((totalUploaded / totalRequired) * 100) 
    : 0;

  const byChannel = groupRequirementsByChannel(requirements);
  const byPublication = groupRequirementsByPublication(requirements);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{totalRequired}</div>
          <p className="text-xs text-muted-foreground">Total Placements</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{totalUploaded}</div>
          <p className="text-xs text-muted-foreground">Assets Uploaded</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{byPublication.size}</div>
          <p className="text-xs text-muted-foreground">Publications</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{byChannel.size}</div>
          <p className="text-xs text-muted-foreground">Channels</p>
        </CardContent>
      </Card>
    </div>
  );
}

