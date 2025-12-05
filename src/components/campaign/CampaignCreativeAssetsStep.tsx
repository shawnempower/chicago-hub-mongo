/**
 * Campaign Creative Assets Step Component
 * 
 * Allows hub team to upload creative assets for each selected placement.
 * Shows requirements and validates uploads against specifications.
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  CreativeRequirement,
  validateFileAgainstRequirements,
  formatDimensions,
  formatFileSize
} from '@/utils/creativeSpecsExtractor';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  File, 
  Image as ImageIcon,
  FileText,
  Info
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

interface UploadedAsset {
  placementId: string;
  file: File;
  previewUrl?: string;
  assetId?: string; // After upload to server
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadProgress?: number;
  errorMessage?: string;
}

interface CampaignCreativeAssetsStepProps {
  requirements: CreativeRequirement[];
  uploadedAssets: Map<string, UploadedAsset>;
  onAssetsChange: (assets: Map<string, UploadedAsset>) => void;
  campaignId?: string; // If editing existing campaign
}

export function CampaignCreativeAssetsStep({
  requirements,
  uploadedAssets,
  onAssetsChange,
  campaignId
}: CampaignCreativeAssetsStepProps) {
  const { toast } = useToast();
  const [uploadingPlacementId, setUploadingPlacementId] = useState<string | null>(null);

  const handleFileSelect = useCallback((requirement: CreativeRequirement, file: File) => {
    // Validate file against requirements
    const validation = validateFileAgainstRequirements(file, requirement);
    
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.errors.join('. '),
        variant: 'destructive'
      });
      return;
    }

    // Create preview URL for images
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    // Add to uploaded assets
    const newAssets = new Map(uploadedAssets);
    newAssets.set(requirement.placementId, {
      placementId: requirement.placementId,
      file,
      previewUrl,
      uploadStatus: 'pending'
    });
    
    onAssetsChange(newAssets);
  }, [uploadedAssets, onAssetsChange, toast]);

  const handleRemoveAsset = useCallback((placementId: string) => {
    const asset = uploadedAssets.get(placementId);
    if (asset?.previewUrl) {
      URL.revokeObjectURL(asset.previewUrl);
    }

    const newAssets = new Map(uploadedAssets);
    newAssets.delete(placementId);
    onAssetsChange(newAssets);
  }, [uploadedAssets, onAssetsChange]);

  const handleUploadToServer = async (placementId: string) => {
    const asset = uploadedAssets.get(placementId);
    const requirement = requirements.find(r => r.placementId === placementId);
    if (!asset || !requirement) return;

    setUploadingPlacementId(placementId);

    try {
      const formData = new FormData();
      formData.append('file', asset.file);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      formData.append('assetType', 'placement');
      formData.append('placementId', placementId);
      
      // Attach specifications to the asset metadata
      const specifications = {
        placementName: requirement.placementName,
        publicationId: requirement.publicationId,
        publicationName: requirement.publicationName,
        channel: requirement.channel,
        dimensions: requirement.dimensions,
        fileFormats: requirement.fileFormats,
        maxFileSize: requirement.maxFileSize,
        colorSpace: requirement.colorSpace,
        resolution: requirement.resolution,
        additionalRequirements: requirement.additionalRequirements
      };
      formData.append('specifications', JSON.stringify(specifications));

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/creative-assets/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Update asset with server response
      const newAssets = new Map(uploadedAssets);
      newAssets.set(placementId, {
        ...asset,
        uploadStatus: 'uploaded',
        assetId: data.asset.assetId,
        fileUrl: data.asset.metadata?.fileUrl
      });
      onAssetsChange(newAssets);

      toast({
        title: 'Success',
        description: 'Asset uploaded successfully to S3'
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      const newAssets = new Map(uploadedAssets);
      newAssets.set(placementId, {
        ...asset,
        uploadStatus: 'error',
        errorMessage: 'Failed to upload asset'
      });
      onAssetsChange(newAssets);

      toast({
        title: 'Upload Failed',
        description: 'Failed to upload asset. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingPlacementId(null);
    }
  };

  const totalPlacements = requirements.length;
  const uploadedCount = Array.from(uploadedAssets.values()).filter(
    a => a.uploadStatus === 'uploaded'
  ).length;
  const progressPercent = totalPlacements > 0 
    ? Math.round((uploadedCount / totalPlacements) * 100) 
    : 0;

  // If no requirements, show helpful message
  if (requirements.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            No Creative Requirements Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-amber-900">
              This campaign doesn't have any inventory items with creative specifications yet.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-amber-900">Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>No inventory items have been selected for this campaign</li>
                <li>The selected inventory items are missing channel or specification data</li>
                <li>All inventory items have been excluded</li>
              </ul>
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-amber-200">
              <p className="font-medium text-amber-900 mb-2">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-800">
                <li>Go back to the campaign builder</li>
                <li>Select inventory items with proper specifications</li>
                <li>Return here to upload creative assets</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPlacementCard = (requirement: CreativeRequirement) => {
    const asset = uploadedAssets.get(requirement.placementId);
    const hasAsset = !!asset;
    const isUploaded = asset?.uploadStatus === 'uploaded';
    const isUploading = uploadingPlacementId === requirement.placementId;

    return (
      <Card key={requirement.placementId} className={isUploaded ? 'border-green-500' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">
                {requirement.placementName}
              </CardTitle>
              <CardDescription className="text-xs">
                {requirement.publicationName} • {requirement.channel}
              </CardDescription>
            </div>
            {isUploaded && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Requirements */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span className="font-medium">Requirements</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {requirement.dimensions && (
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <span className="ml-1 font-mono">{formatDimensions(requirement.dimensions)}</span>
                </div>
              )}
              {requirement.fileFormats && (
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <span className="ml-1 font-mono">{requirement.fileFormats.join(', ')}</span>
                </div>
              )}
              {requirement.maxFileSize && (
                <div>
                  <span className="text-muted-foreground">Max Size:</span>
                  <span className="ml-1 font-mono">{formatFileSize(requirement.maxFileSize)}</span>
                </div>
              )}
              {requirement.colorSpace && (
                <div>
                  <span className="text-muted-foreground">Color:</span>
                  <span className="ml-1 font-mono">{requirement.colorSpace}</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Area */}
          {!hasAsset ? (
            <div className="space-y-2">
              <input
                type="file"
                id={`file-${requirement.placementId}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(requirement, file);
                  }
                }}
                accept={requirement.fileFormats?.map(f => `.${f.toLowerCase()}`).join(',') || 'image/*,.pdf,.zip,.mp3,.wav,.m4a,.txt,.html'}
              />
              <label
                htmlFor={`file-${requirement.placementId}`}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  Click to upload
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {requirement.fileFormats?.join(', ') || 'All formats'} • Max {requirement.maxFileSize || '10MB'}
                </span>
              </label>
              <Button
                onClick={() => document.getElementById(`file-${requirement.placementId}`)?.click()}
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Preview */}
              {asset.previewUrl && (
                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={asset.previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* File Info */}
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {asset.file.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  ) : asset.file.type === 'application/pdf' ? (
                    <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <File className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(asset.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAsset(requirement.placementId)}
                  disabled={isUploading}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Status */}
              {asset.uploadStatus === 'pending' && (
                <Button
                  onClick={() => handleUploadToServer(requirement.placementId)}
                  disabled={isUploading}
                  className="w-full"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to Server
                </Button>
              )}

              {asset.uploadStatus === 'uploaded' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Asset uploaded successfully
                  </AlertDescription>
                </Alert>
              )}

              {asset.uploadStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {asset.errorMessage || 'Upload failed'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Creative Assets Upload Progress</CardTitle>
          <CardDescription>
            Upload creative assets for each placement. All assets must be uploaded before generating orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadedCount} of {totalPlacements} assets uploaded
            </span>
            <Badge variant={uploadedCount === totalPlacements ? 'default' : 'secondary'}>
              {progressPercent}%
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Each placement has specific requirements. Make sure your assets match the dimensions, 
          file format, and size requirements listed below. Invalid files will be rejected.
        </AlertDescription>
      </Alert>

      {/* Placement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requirements.map(renderPlacementCard)}
      </div>

      {/* Summary */}
      {uploadedCount > 0 && uploadedCount < totalPlacements && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {totalPlacements - uploadedCount} placement{totalPlacements - uploadedCount !== 1 ? 's' : ''} 
            {' '}without assets. All placements must have assets before you can generate insertion orders.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

