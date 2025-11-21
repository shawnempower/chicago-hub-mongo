import React from 'react';
import { Download, Eye, Trash2, FileText, Image, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/utils/fileUpload';

interface CreativeAsset {
  assetId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  thumbnailUrl?: string;
  assetType: string;
  uploadedAt: Date;
  uploadedBy?: string;
  uploaderName?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'archived';
}

interface CreativeAssetCardProps {
  asset: CreativeAsset;
  onDownload?: (asset: CreativeAsset) => void;
  onPreview?: (asset: CreativeAsset) => void;
  onDelete?: (asset: CreativeAsset) => void;
  showActions?: boolean;
  className?: string;
}

export function CreativeAssetCard({
  asset,
  onDownload,
  onPreview,
  onDelete,
  showActions = true,
  className = ''
}: CreativeAssetCardProps) {
  const getFileIcon = () => {
    if (asset.fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (asset.fileType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    if (asset.fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isImage = asset.fileType.startsWith('image/');

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail/Icon */}
          <div className="flex-shrink-0">
            {isImage && asset.thumbnailUrl ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.fileName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                {getFileIcon()}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {asset.fileName}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatFileSize(asset.fileSize)} • {asset.fileType}
                </p>
              </div>
              
              {asset.status && (
                <Badge
                  variant={
                    asset.status === 'approved' ? 'default' :
                    asset.status === 'rejected' ? 'destructive' :
                    'outline'
                  }
                  className="flex-shrink-0"
                >
                  {asset.status}
                </Badge>
              )}
            </div>

            {/* Metadata */}
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Type:</span>{' '}
                <span className="capitalize">{asset.assetType.replace(/_/g, ' ')}</span>
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-medium">Uploaded:</span>{' '}
                {formatDate(asset.uploadedAt)}
                {asset.uploaderName && ` by ${asset.uploaderName}`}
              </p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 mt-3">
                {onPreview && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPreview(asset)}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                )}
                {onDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(asset)}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(asset)}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

