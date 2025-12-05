/**
 * Campaign Creative Assets Step (Grouped by Specs)
 * 
 * Upload creative assets grouped by unique specifications.
 * One asset per spec group applies to all matching placements.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  X as CloseIcon,
  Loader2,
  Info,
  Image as ImageIcon,
  FileText,
  File
} from 'lucide-react';
import { CreativeRequirement, validateFileAgainstRequirements } from '@/utils/creativeSpecsExtractor';
import {
  groupRequirementsBySpec,
  GroupedCreativeRequirement,
  getSpecDisplayName,
  getPublicationsSummary,
  formatDimensions,
  UploadedAssetWithSpecs
} from '@/utils/creativeSpecsGrouping';
import { API_BASE_URL } from '@/config/api';

interface CampaignCreativeAssetsStepGroupedProps {
  requirements: CreativeRequirement[];
  uploadedAssets: Map<string, UploadedAssetWithSpecs>;
  onAssetsChange: (assets: Map<string, UploadedAssetWithSpecs>) => void;
  campaignId?: string;
}

export function CampaignCreativeAssetsStepGrouped({
  requirements,
  uploadedAssets,
  onAssetsChange,
  campaignId
}: CampaignCreativeAssetsStepGroupedProps) {
  const { toast } = useToast();
  const [uploadingSpecId, setUploadingSpecId] = useState<string | null>(null);

  // Group requirements by specifications
  const groupedSpecs = groupRequirementsBySpec(requirements);

  const handleFileSelect = useCallback((specGroup: GroupedCreativeRequirement, file: File) => {
    // Use first placement for validation (all have same specs)
    const firstRequirement = requirements.find(
      r => r.placementId === specGroup.placements[0].placementId
    );
    
    if (!firstRequirement) return;

    // Validate file
    const validation = validateFileAgainstRequirements(file, firstRequirement);
    
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

    // Create asset entry that applies to all placements in this spec group
    const newAssets = new Map(uploadedAssets);
    newAssets.set(specGroup.specGroupId, {
      specGroupId: specGroup.specGroupId,
      file,
      previewUrl,
      uploadStatus: 'pending',
      appliesTo: specGroup.placements.map(p => ({
        placementId: p.placementId,
        publicationId: p.publicationId,
        publicationName: p.publicationName
      }))
    });
    onAssetsChange(newAssets);

    toast({
      title: 'File Selected',
      description: `${file.name} will be used for ${specGroup.placementCount} placements across ${specGroup.publicationCount} publications`,
    });
  }, [requirements, uploadedAssets, onAssetsChange, toast]);

  const handleRemoveAsset = useCallback((specGroupId: string) => {
    const newAssets = new Map(uploadedAssets);
    const asset = newAssets.get(specGroupId);
    
    // Revoke preview URL
    if (asset?.previewUrl) {
      URL.revokeObjectURL(asset.previewUrl);
    }
    
    newAssets.delete(specGroupId);
    onAssetsChange(newAssets);
  }, [uploadedAssets, onAssetsChange]);

  const handleUploadToServer = async (specGroup: GroupedCreativeRequirement) => {
    const asset = uploadedAssets.get(specGroup.specGroupId);
    if (!asset) return;

    setUploadingSpecId(specGroup.specGroupId);

    try {
      const formData = new FormData();
      formData.append('file', asset.file);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      formData.append('assetType', 'placement');
      
      // Attach specifications
      const specifications = {
        channel: specGroup.channel,
        dimensions: specGroup.dimensions,
        fileFormats: specGroup.fileFormats,
        maxFileSize: specGroup.maxFileSize,
        colorSpace: specGroup.colorSpace,
        resolution: specGroup.resolution,
        additionalRequirements: specGroup.additionalRequirements,
        placementCount: specGroup.placementCount,
        publicationCount: specGroup.publicationCount,
        publications: specGroup.placements.map(p => p.publicationName).filter((v, i, a) => a.indexOf(v) === i),
        placements: specGroup.placements
      };
      formData.append('specifications', JSON.stringify(specifications));
      formData.append('specGroupId', specGroup.specGroupId);

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
      newAssets.set(specGroup.specGroupId, {
        ...asset,
        uploadStatus: 'uploaded',
        assetId: data.asset.assetId,
        fileUrl: data.asset.metadata?.fileUrl
      });
      onAssetsChange(newAssets);

      toast({
        title: 'Success',
        description: `Asset uploaded and will be used for ${specGroup.placementCount} placements`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      const newAssets = new Map(uploadedAssets);
      newAssets.set(specGroup.specGroupId, {
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
      setUploadingSpecId(null);
    }
  };

  // Calculate progress
  const totalSpecGroups = groupedSpecs.length;
  const uploadedCount = Array.from(uploadedAssets.values()).filter(
    a => a.uploadStatus === 'uploaded'
  ).length;
  const progressPercent = totalSpecGroups > 0 
    ? Math.round((uploadedCount / totalSpecGroups) * 100) 
    : 0;

  // Calculate total placements covered
  const totalPlacementsCovered = Array.from(uploadedAssets.values())
    .filter(a => a.uploadStatus === 'uploaded' || a.uploadStatus === 'pending')
    .reduce((sum, asset) => sum + asset.appliesTo.length, 0);

  if (groupedSpecs.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            No Creative Requirements Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-900">
            This campaign doesn't have any inventory items with creative specifications yet.
            Please go back to the campaign builder and select inventory.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Upload Creative Assets</h3>
        <p className="text-sm text-gray-600">
          Upload one asset per specification. Each asset will automatically be used for all matching placements.
        </p>
      </div>

      {/* Upload Progress Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Asset Upload Progress</h4>
                <p className="text-sm text-gray-600">
                  {uploadedCount} of {totalSpecGroups} unique assets uploaded
                </p>
                <p className="text-xs text-gray-500">
                  Covering {totalPlacementsCovered} of {requirements.length} total placements
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {progressPercent}%
                </div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                <strong>Smart Uploads:</strong> Instead of uploading the same asset multiple times, 
                upload once per specification and it will automatically be used by all publications that need it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Asset Upload Cards */}
      <div className="space-y-4">
        {groupedSpecs.map((specGroup) => {
          const asset = uploadedAssets.get(specGroup.specGroupId);
          const hasAsset = !!asset;
          const isUploaded = asset?.uploadStatus === 'uploaded';
          const isUploading = uploadingSpecId === specGroup.specGroupId;

          return (
            <Card key={specGroup.specGroupId} className={isUploaded ? 'border-green-500 bg-green-50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold">
                      {getSpecDisplayName(specGroup)}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Used by <strong>{specGroup.placementCount} placements</strong> across{' '}
                      <strong>{specGroup.publicationCount} publications</strong>
                    </CardDescription>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {specGroup.placements.slice(0, 3).map(p => (
                        <Badge key={p.placementId} variant="secondary" className="text-xs">
                          {p.publicationName}
                        </Badge>
                      ))}
                      {specGroup.placementCount > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{specGroup.placementCount - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isUploaded && (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Requirements */}
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span className="font-medium">Specifications</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {specGroup.dimensions && (
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <span className="ml-1 font-mono">{formatDimensions(specGroup.dimensions)}</span>
                      </div>
                    )}
                    {specGroup.fileFormats && (
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <span className="ml-1 font-mono">{specGroup.fileFormats.join(', ')}</span>
                      </div>
                    )}
                    {specGroup.maxFileSize && (
                      <div>
                        <span className="text-muted-foreground">Max Size:</span>
                        <span className="ml-1 font-mono">{specGroup.maxFileSize}</span>
                      </div>
                    )}
                    {specGroup.colorSpace && (
                      <div>
                        <span className="text-muted-foreground">Color:</span>
                        <span className="ml-1 font-mono">{specGroup.colorSpace}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Area or Asset Display */}
                {!hasAsset ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      id={`file-${specGroup.specGroupId}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelect(specGroup, file);
                        }
                      }}
                      accept={specGroup.fileFormats?.map(f => `.${f.toLowerCase()}`).join(',') || 'image/*,.pdf,.zip,.mp3,.wav,.m4a,.txt,.html'}
                    />
                    <label
                      htmlFor={`file-${specGroup.specGroupId}`}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">
                        Click to upload
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {specGroup.fileFormats?.join(', ') || 'All formats'} • Max {specGroup.maxFileSize || '10MB'}
                      </span>
                    </label>
                    <Button
                      onClick={() => document.getElementById(`file-${specGroup.specGroupId}`)?.click()}
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
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      {asset.previewUrl ? (
                        <img
                          src={asset.previewUrl}
                          alt="Preview"
                          className="h-16 w-16 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                          {asset.file.type.startsWith('image/') ? (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          ) : asset.file.type === 'application/pdf' ? (
                            <FileText className="h-8 w-8 text-gray-400" />
                          ) : (
                            <File className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{asset.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(asset.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {isUploaded && (
                          <Badge variant="outline" className="text-xs mt-1">
                            ✓ Uploaded
                          </Badge>
                        )}
                      </div>
                      {!isUploaded && !isUploading && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveAsset(specGroup.specGroupId)}
                        >
                          <CloseIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Upload Button */}
                    {!isUploaded && (
                      <Button
                        onClick={() => handleUploadToServer(specGroup)}
                        disabled={isUploading}
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload to Server
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

