/**
 * Campaign Creative Assets Uploader
 * 
 * Checklist + Centralized Upload Zone
 * - Left: Checklist of required specs
 * - Right: Upload area where files are assigned to specs
 */

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Upload,
  CheckCircle2,
  Circle,
  AlertCircle,
  X as CloseIcon,
  Loader2,
  Info,
  Image as ImageIcon,
  FileText,
  File,
  Plus,
  Trash2,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreativeRequirement } from '@/utils/creativeSpecsExtractor';
import {
  groupRequirementsBySpec,
  GroupedCreativeRequirement,
  getSpecDisplayName,
  formatDimensions,
  UploadedAssetWithSpecs
} from '@/utils/creativeSpecsGrouping';
import {
  detectFileSpecs,
  autoMatchFileToSpecs,
  getBestMatch,
  DetectedFileSpecs,
  FileMatchScore
} from '@/utils/fileSpecDetection';
import {
  processZipFile,
  ProcessedZipFile,
  ZipProcessingResult,
  groupByStandard,
  generateZipSummary
} from '@/utils/zipProcessor';
import {
  getWebsiteStandards,
  findStandardByDimensions,
  InventoryTypeStandard,
  validateAgainstStandard
} from '@/config/inventoryStandards';
import { API_BASE_URL } from '@/config/api';

interface CampaignCreativeAssetsUploaderProps {
  requirements: CreativeRequirement[];
  uploadedAssets: Map<string, UploadedAssetWithSpecs>;
  onAssetsChange: (assets: Map<string, UploadedAssetWithSpecs>) => void;
  campaignId?: string;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function CampaignCreativeAssetsUploader({
  requirements,
  uploadedAssets,
  onAssetsChange,
  campaignId
}: CampaignCreativeAssetsUploaderProps) {
  const { toast } = useToast();
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Map<string, { 
    file: File; 
    previewUrl?: string;
    detectedSpecs?: DetectedFileSpecs;
    suggestedStandard?: InventoryTypeStandard;
    matchConfidence?: number;
    isAnalyzing?: boolean;
    uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
    errorMessage?: string;
  }>>(new Map());
  const [processingZip, setProcessingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ percent: number; message: string } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ assetId: string; specGroupId: string; fileName: string } | null>(null);

  // Load existing assets from campaign on mount
  useEffect(() => {
    async function loadExistingAssets() {
      if (!campaignId) return;
      
      setLoadingExisting(true);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/creative-assets/campaign/${campaignId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const newAssetsMap = new Map<string, UploadedAssetWithSpecs>();
          data.assets.forEach((asset: any) => {
            // Reconstruct the asset object to match UploadedAssetWithSpecs
            const reconstructedAsset: UploadedAssetWithSpecs = {
              specGroupId: asset.metadata.specGroupId || `library_${asset._id}`, // Use specGroupId if assigned, else a library ID
              fileName: asset.metadata.fileName, // Store file name instead of File object
              previewUrl: asset.metadata.fileUrl,
              uploadStatus: 'uploaded', // Already uploaded
              assetId: asset._id,
              standardId: asset.metadata.suggestedStandardId,
              uploadedUrl: asset.metadata.fileUrl,
              detectedSpecs: {
                dimensions: asset.metadata.detectedDimensions ? {
                  width: parseInt(asset.metadata.detectedDimensions.split('x')[0]),
                  height: parseInt(asset.metadata.detectedDimensions.split('x')[1]),
                  formatted: asset.metadata.detectedDimensions
                } : undefined,
                colorSpace: asset.metadata.detectedColorSpace,
                estimatedDPI: asset.metadata.detectedDPI,
                fileExtension: asset.metadata.fileExtension,
                fileSize: asset.metadata.fileSize,
                formatted: asset.metadata.detectedDimensions,
              },
              appliesTo: asset.associations?.placements || [], // Store placements if assigned
              assetType: asset.metadata.assetType || 'placement', // 'placement' or 'unassigned'
            };
            newAssetsMap.set(reconstructedAsset.specGroupId, reconstructedAsset);
          });
          onAssetsChange(newAssetsMap);
        }
      } catch (error) {
        console.error('Error loading existing assets:', error);
      } finally {
        setLoadingExisting(false);
      }
    }
    
    loadExistingAssets();
  }, [campaignId]);

  // Group requirements by specifications
  const groupedSpecs = groupRequirementsBySpec(requirements);

  // Setup dropzone (must be called before any early returns)
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const fileList = Object.assign(acceptedFiles, { length: acceptedFiles.length }) as unknown as FileList;
      handleFilesSelected(fileList);
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'application/illustrator': ['.ai'],
      'application/postscript': ['.eps'],
      'application/vnd.adobe.photoshop': ['.psd'],
      'application/x-indesign': ['.indd']
    },
    multiple: true
  });

  // Calculate progress
  const totalSpecGroups = groupedSpecs.length;
  
  // Count spec groups that have at least one uploaded asset (not total assets)
  const specGroupsWithUploads = groupedSpecs.filter(specGroup => {
    const asset = uploadedAssets.get(specGroup.specGroupId);
    return asset && asset.uploadStatus === 'uploaded';
  }).length;
  
  const uploadedCount = specGroupsWithUploads; // For display
  const totalAssetsUploaded = Array.from(uploadedAssets.values()).filter(
    a => a.uploadStatus === 'uploaded'
  ).length; // Total files, for info
  
  const assignedCount = Array.from(uploadedAssets.values()).filter(
    a => a.uploadStatus === 'pending' || a.uploadStatus === 'uploaded'
  ).length;
  const pendingUploadCount = Array.from(uploadedAssets.values()).filter(
    a => a.uploadStatus === 'pending'
  ).length;
  const progressPercent = totalSpecGroups > 0 
    ? Math.round((specGroupsWithUploads / totalSpecGroups) * 100) 
    : 0;
  
  // Show coverage report if files are uploaded OR pending assignment
  const hasAnyFiles = pendingFiles.size > 0 || assignedCount > 0;

  // Define handleAssignToSpec first since other handlers depend on it
  const handleAssignToSpec = useCallback((fileId: string, standardId: string) => {
    const pending = pendingFiles.get(fileId);
    if (!pending) return;

    // Find which spec groups match this standard
    const standard = getWebsiteStandards().find(s => s.id === standardId);
    
    const matchingGroups = groupedSpecs.filter(group => {
      if (!standard) return false;
      
      const standardDims = typeof standard.defaultSpecs.dimensions === 'string'
        ? standard.defaultSpecs.dimensions
        : standard.defaultSpecs.dimensions?.[0];
      
      const groupDims = typeof group.dimensions === 'string'
        ? group.dimensions
        : group.dimensions?.[0];
      
      return standardDims === groupDims;
    });

    if (matchingGroups.length === 0) {
      toast({
        title: 'No Matching Requirements',
        description: `This ${standard?.name || 'standard'} does not match any campaign requirements`,
        variant: 'destructive'
      });
      return;
    }

    // Apply to all matching spec groups
    const newAssets = new Map(uploadedAssets);
    matchingGroups.forEach(specGroup => {
      newAssets.set(specGroup.specGroupId, {
        specGroupId: specGroup.specGroupId,
        file: pending.file,
        previewUrl: pending.previewUrl,
        uploadStatus: 'pending',
        standardId: standardId,
        uploadedUrl: (pending as any).uploadedUrl,
        appliesTo: specGroup.placements.map(p => ({
          placementId: p.placementId,
          publicationId: p.publicationId,
          publicationName: p.publicationName
        }))
      });
    });
    
    onAssetsChange(newAssets);

    // Remove from pending
    const newPending = new Map(pendingFiles);
    newPending.delete(fileId);
    setPendingFiles(newPending);

    const totalPlacements = matchingGroups.reduce((sum, g) => sum + g.placements.length, 0);
    toast({
      title: 'Asset Assigned',
      description: `${pending.file.name} assigned to ${totalPlacements} placement(s) across ${matchingGroups.length} specification group(s)`,
    });
  }, [pendingFiles, groupedSpecs, uploadedAssets, onAssetsChange, toast]);

  const handleFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    console.log(`📥 handleFilesSelected called with ${files.length} files:`, Array.from(files).map(f => f.name));

    // Check if any ZIP files
    const zipFiles = Array.from(files).filter(f => 
      f.name.endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed'
    );
    
    if (zipFiles.length > 0) {
      // Process ZIP files
      for (const zipFile of zipFiles) {
        await handleZipFile(zipFile);
      }
      
      // Remove ZIP files from the list
      files = Object.assign(
        Array.from(files).filter(f => !zipFiles.includes(f)),
        { length: files.length - zipFiles.length }
      ) as unknown as FileList;
      
      if (files.length === 0) return;
    }

    const newPending = new Map(pendingFiles);
    
    console.log(`📂 Adding ${files.length} files to pending...`);
    
    // Process each file
    for (const file of Array.from(files)) {
      const fileId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create fallback blob URL for immediate preview
      let fallbackPreviewUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        fallbackPreviewUrl = URL.createObjectURL(file);
      }
      
      // Add to pending (initially analyzing and uploading)
      newPending.set(fileId, { 
        file, 
        previewUrl: fallbackPreviewUrl, // Use blob URL initially
        isAnalyzing: true 
      });
      
      console.log(`  ➕ Added ${file.name} (isAnalyzing: true)`);
      
      // Upload to S3 to get permanent preview URL
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        uploadFileForPreview(file, fileId, newPending);
      }
    }
    
    setPendingFiles(new Map(newPending));
    console.log(`✅ Added ${newPending.size} files total to pending`);
    
    // Detect specs and auto-match in background
    const newAssets = new Map(uploadedAssets); // Accumulate ALL assignments here
    
    for (const [fileId, fileData] of Array.from(newPending.entries())) {
      if (!fileData.isAnalyzing) {
        continue;
      }
      
      try {
        // Detect file specifications
        const detectedSpecs = await detectFileSpecs(fileData.file);
        
        // Match to inventory standards (not spec groups)
        let suggestedStandard: InventoryTypeStandard | null = null;
        let matchConfidence = 0;
        
        if (detectedSpecs.dimensions) {
          suggestedStandard = findStandardByDimensions(detectedSpecs.dimensions.formatted);
          
          if (suggestedStandard) {
            // Validate against standard
            const validation = validateAgainstStandard({
              dimensions: detectedSpecs.dimensions.formatted,
              fileFormat: detectedSpecs.fileExtension,
              fileSize: detectedSpecs.fileSize,
              colorSpace: detectedSpecs.colorSpace
            }, suggestedStandard);
            
            if (validation.valid) {
              matchConfidence = 100;
            } else if (validation.errors.length === 0 && validation.warnings.length === 0) {
              matchConfidence = 95;
            } else if (validation.errors.length === 0) {
              matchConfidence = 85;
            } else if (validation.errors.length <= 1) {
              matchConfidence = 70;
            } else {
              matchConfidence = 60;
            }
          }
        }
        
        // Update with detected specs
        newPending.set(fileId, {
          ...fileData,
          detectedSpecs,
          suggestedStandard: suggestedStandard || undefined,
          matchConfidence,
          isAnalyzing: false
        });
        
        // Auto-assign if good match (accumulate in newAssets map)
        if (suggestedStandard && matchConfidence >= 50) {
          console.log(`✅ Auto-assigning ${fileData.file.name} → ${suggestedStandard.name} (${matchConfidence}%)`);
          
          // Find matching spec groups
          const standardDims = typeof suggestedStandard.defaultSpecs.dimensions === 'string'
            ? suggestedStandard.defaultSpecs.dimensions
            : suggestedStandard.defaultSpecs.dimensions?.[0];
          
          const matchingGroups = groupedSpecs.filter(group => {
            const groupDims = typeof group.dimensions === 'string'
              ? group.dimensions
              : group.dimensions?.[0];
            return standardDims === groupDims;
          });
          
          if (matchingGroups.length > 0) {
            // Add assignments to the accumulated map
            matchingGroups.forEach(specGroup => {
              newAssets.set(specGroup.specGroupId, {
                specGroupId: specGroup.specGroupId,
                file: fileData.file,
                previewUrl: newPending.get(fileId)?.previewUrl,
                uploadStatus: 'pending',
                standardId: suggestedStandard.id,
                uploadedUrl: (newPending.get(fileId) as any)?.uploadedUrl,
                appliesTo: specGroup.placements.map(p => ({
                  placementId: p.placementId,
                  publicationId: p.publicationId,
                  publicationName: p.publicationName
                }))
              });
            });
            
            // Remove from pending since it's now assigned
            newPending.delete(fileId);
          }
        }
      } catch (error) {
        console.error('Error detecting file specs:', error);
        newPending.set(fileId, {
          ...fileData,
          isAnalyzing: false
        });
      }
    }
    
    // Call onAssetsChange ONCE with all accumulated assignments
    if (newAssets.size > uploadedAssets.size) {
      onAssetsChange(newAssets);
    }
    
    setPendingFiles(new Map(newPending));
    
    toast({
      title: 'Files Added',
      description: `${files.length} file(s) being analyzed...`,
    });
  }, [pendingFiles, uploadedAssets, groupedSpecs, onAssetsChange, toast]);

  const handleZipFile = useCallback(async (zipFile: File) => {
    setProcessingZip(true);
    setZipProgress({ percent: 0, message: 'Processing ZIP file...' });
    
    try {
      const result = await processZipFile(zipFile, (percent, message) => {
        setZipProgress({ percent, message });
      });
      
      toast({
        title: 'ZIP Processed',
        description: generateZipSummary(result),
      });
      
      // Add all extracted files to pending
      const newPending = new Map(pendingFiles);
      const newAssets = new Map(uploadedAssets); // Accumulate ALL assignments here
      
      for (const processedFile of result.processedFiles) {
        const fileId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Use preview URL from ZIP processor, or create new one if missing
        let previewUrl = processedFile.previewUrl;
        if (!previewUrl && processedFile.file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(processedFile.file);
        }
        
        newPending.set(fileId, {
          file: processedFile.file,
          previewUrl: previewUrl, // Use existing or newly created blob URL
          detectedSpecs: processedFile.detectedSpecs,
          suggestedStandard: processedFile.suggestedStandard || undefined,
          matchConfidence: processedFile.matchConfidence,
          isAnalyzing: false
        });
        
        // Upload to S3 for permanent preview
        if (processedFile.file.type.startsWith('image/') || processedFile.file.type === 'application/pdf') {
          uploadFileForPreview(processedFile.file, fileId, newPending);
        }
        
        // Auto-assign if good match (accumulate in newAssets map)
        if (processedFile.suggestedStandard && processedFile.matchConfidence >= 50) {
          // Find matching spec groups
          const standardDims = typeof processedFile.suggestedStandard.defaultSpecs.dimensions === 'string'
            ? processedFile.suggestedStandard.defaultSpecs.dimensions
            : processedFile.suggestedStandard.defaultSpecs.dimensions?.[0];
          
          const matchingGroups = groupedSpecs.filter(group => {
            const groupDims = typeof group.dimensions === 'string'
              ? group.dimensions
              : group.dimensions?.[0];
            return standardDims === groupDims;
          });
          
          if (matchingGroups.length > 0) {
            // Add assignments to the accumulated map
            matchingGroups.forEach(specGroup => {
              newAssets.set(specGroup.specGroupId, {
                specGroupId: specGroup.specGroupId,
                file: processedFile.file,
                previewUrl: previewUrl,
                uploadStatus: 'pending',
                standardId: processedFile.suggestedStandard!.id,
                appliesTo: specGroup.placements.map(p => ({
                  placementId: p.placementId,
                  publicationId: p.publicationId,
                  publicationName: p.publicationName
                }))
              });
            });
            
            // Remove from pending since it's now assigned
            newPending.delete(fileId);
          }
        }
      }
      
      // Call onAssetsChange ONCE with all accumulated assignments
      if (newAssets.size > uploadedAssets.size) {
        onAssetsChange(newAssets);
      }
      
      setPendingFiles(newPending);
      
    } catch (error) {
      console.error('Error processing ZIP:', error);
      toast({
        title: 'ZIP Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process ZIP file',
        variant: 'destructive'
      });
    } finally {
      setProcessingZip(false);
      setZipProgress(null);
    }
  }, [pendingFiles, uploadedAssets, groupedSpecs, onAssetsChange, toast]);

  const uploadFileForPreview = useCallback(async (file: File, fileId: string, pendingMap: Map<string, any>) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'creative-assets');
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${apiUrl}/api/creative-assets/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        const s3Url = result.url || result.fileUrl || result.asset?.metadata?.fileUrl || result.asset?.fileUrl;
        
        if (s3Url) {
          const current = pendingMap.get(fileId);
          if (current) {
            const updated = {
              ...current,
              previewUrl: s3Url,
              uploadedUrl: s3Url
            };
            pendingMap.set(fileId, updated);
            setPendingFiles(new Map(pendingMap));
          }
        }
      }
    } catch (error) {
      console.error('Preview upload error:', error);
    }
  }, [campaignId]);

  const handleRemovePending = useCallback((fileId: string) => {
    const newPending = new Map(pendingFiles);
    newPending.delete(fileId);
    setPendingFiles(newPending);
    // Note: We keep the file in S3 for now, can clean up later
  }, [pendingFiles]);

  const handleUseAllSuggested = useCallback(() => {
    const filesWithSuggestions = Array.from(pendingFiles.entries())
      .filter(([_, data]) => data.suggestedStandard);
    
    filesWithSuggestions.forEach(([fileId, data]) => {
      if (data.suggestedStandard) {
        handleAssignToSpec(fileId, data.suggestedStandard.id);
      }
    });
    
    toast({
      title: 'All Suggestions Applied',
      description: `${filesWithSuggestions.length} file(s) assigned to their suggested standards`,
    });
  }, [pendingFiles, handleAssignToSpec, toast]);

  const handleRemoveAsset = useCallback((specGroupId: string) => {
    const asset = uploadedAssets.get(specGroupId);
    if (asset?.previewUrl) {
      URL.revokeObjectURL(asset.previewUrl);
    }
    const newAssets = new Map(uploadedAssets);
    newAssets.delete(specGroupId);
    onAssetsChange(newAssets);
  }, [uploadedAssets, onAssetsChange]);

  // Delete asset from server
  const handleDeleteAssetClick = useCallback((assetId: string, specGroupId: string, fileName: string) => {
    setAssetToDelete({ assetId, specGroupId, fileName });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteAssetConfirm = async () => {
    if (!assetToDelete) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/creative-assets/${assetToDelete.assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      // Remove from local state
      const newAssets = new Map(uploadedAssets);
      newAssets.delete(assetToDelete.specGroupId);
      onAssetsChange(newAssets);

      toast({
        title: 'Asset Deleted',
        description: `${assetToDelete.fileName} has been removed.`,
      });

      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete asset. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUploadToServer = async (specGroupId: string) => {
    const asset = uploadedAssets.get(specGroupId);
    const specGroup = groupedSpecs.find(g => g.specGroupId === specGroupId);
    
    if (!asset || !specGroup) return;

    setUploadingAssetId(specGroupId);

    try {
      // Detect specs if not already done
      let detectedSpecs = (asset as any).detectedSpecs;
      if (!detectedSpecs && asset.file) {
        detectedSpecs = await detectFileSpecs(asset.file);
      }

      let fileUrl = (asset as any).uploadedUrl; // Check if already uploaded
      
      // Only upload if not already on S3
      if (!fileUrl && asset.file) {
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
      
      // Attach detected specs
      if (detectedSpecs) {
        formData.append('detectedSpecs', JSON.stringify({
          dimensions: detectedSpecs.dimensions?.formatted,
          colorSpace: detectedSpecs.colorSpace,
          estimatedDPI: detectedSpecs.estimatedDPI
        }));
      }

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
        fileUrl = data.asset.metadata?.fileUrl;

        // Update asset with server response (use callback to get latest state)
        onAssetsChange((prevAssets) => {
          const newAssets = new Map(prevAssets);
          const currentAsset = newAssets.get(specGroupId) || asset;
          newAssets.set(specGroupId, {
            ...currentAsset,
            uploadStatus: 'uploaded',
            assetId: data.asset.assetId,
            fileUrl: fileUrl
          });
        return newAssets;
      });
      } else {
        // File already uploaded, just mark as complete (use callback to get latest state)
        onAssetsChange((prevAssets) => {
          const newAssets = new Map(prevAssets);
          const currentAsset = newAssets.get(specGroupId) || asset;
          newAssets.set(specGroupId, {
            ...currentAsset,
            uploadStatus: 'uploaded',
            fileUrl: fileUrl
          });
          return newAssets;
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Use callback to get latest state
      onAssetsChange((prevAssets) => {
        const newAssets = new Map(prevAssets);
        const currentAsset = newAssets.get(specGroupId) || asset;
        newAssets.set(specGroupId, {
          ...currentAsset,
          uploadStatus: 'error',
          errorMessage: 'Failed to upload asset'
        });
        return newAssets;
      });
    } finally {
      setUploadingAssetId(null);
    }
  };

  const handleUploadAll = async () => {
    if (!campaignId) {
      toast({
        title: 'Error',
        description: 'No campaign ID provided',
        variant: 'destructive'
      });
      return;
    }

    const assignedPendingUploads = Array.from(uploadedAssets.entries())
      .filter(([_, asset]) => asset.uploadStatus === 'pending')
      .map(([specGroupId, _]) => specGroupId);

    const unassignedFiles = Array.from(pendingFiles.values());
    const totalUploads = assignedPendingUploads.length + unassignedFiles.length;
    
    let completed = 0;
    setUploadProgress({ current: 0, total: totalUploads });

    try {
      // Upload assigned assets (in parallel batches of 3)
      for (let i = 0; i < assignedPendingUploads.length; i += 3) {
        const batch = assignedPendingUploads.slice(i, i + 3);
        
        await Promise.all(
          batch.map(async (specGroupId) => {
            try {
              await handleUploadToServer(specGroupId);
              completed++;
              setUploadProgress({ current: completed, total: totalUploads });
            } catch (err) {
              console.error(`Failed to upload ${specGroupId}:`, err);
              completed++;
              setUploadProgress({ current: completed, total: totalUploads });
            }
          })
        );
      }

      // Upload unassigned files (library assets)
      for (const fileData of unassignedFiles) {
        try {
          const formData = new FormData();
          formData.append('file', fileData.file);
          formData.append('campaignId', campaignId);
          formData.append('assetType', 'unassigned');
          
          if (fileData.detectedSpecs) {
            formData.append('detectedSpecs', JSON.stringify({
              dimensions: fileData.detectedSpecs.dimensions?.formatted,
              colorSpace: fileData.detectedSpecs.colorSpace,
              estimatedDPI: fileData.detectedSpecs.estimatedDPI
            }));
          }
          
          if (fileData.suggestedStandard) {
            formData.append('suggestedStandardId', fileData.suggestedStandard.id);
          }

          const token = localStorage.getItem('auth_token');
          const response = await fetch(`${API_BASE_URL}/creative-assets/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            completed++;
            setUploadProgress({ current: completed, total: totalUploads });
          }
        } catch (err) {
          console.error(`Failed to upload ${fileData.file.name}:`, err);
          completed++;
          setUploadProgress({ current: completed, total: totalUploads });
        }
      }
      
      // Clear pending files after successful upload
      setPendingFiles(new Map());
      setUploadProgress(null);

      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${completed} of ${totalUploads} assets`,
      });
    } catch (error) {
      console.error('Error uploading assets:', error);
      setUploadProgress(null);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload assets',
        variant: 'destructive'
      });
    }
  };

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
          </p>
        </CardContent>
      </Card>
    );
  }

  // Create dimension breakdown for easy viewing
  const dimensionBreakdown = groupedSpecs.reduce((acc, specGroup) => {
    const channel = specGroup.channel || 'unknown';
    const dimension = formatDimensions(specGroup.dimensions);
    const key = `${channel}::${dimension}`;
    
    if (!acc[key]) {
      acc[key] = {
        channel,
        dimension,
        placementCount: 0,
        publicationCount: new Set<number>(),
        isUploaded: false,
        specGroups: []
      };
    }
    
    acc[key].placementCount += specGroup.placementCount;
    specGroup.placements.forEach(p => acc[key].publicationCount.add(p.publicationId));
    acc[key].specGroups.push(specGroup);
    
    // Check if any spec group for this dimension has an uploaded asset
    const hasUpload = acc[key].specGroups.some(sg => {
      const asset = uploadedAssets.get(sg.specGroupId);
      return asset && (asset.uploadStatus === 'uploaded' || asset.uploadStatus === 'pending');
    });
    acc[key].isUploaded = hasUpload;
    
    return acc;
  }, {} as Record<string, { 
    channel: string; 
    dimension: string; 
    placementCount: number; 
    publicationCount: Set<number>; 
    isUploaded: boolean;
    specGroups: typeof groupedSpecs;
  }>);

  const dimensionSummary = Object.values(dimensionBreakdown).map(item => ({
    ...item,
    publicationCount: item.publicationCount.size
  }));

  // Separate assigned and library assets
  const assignedAssets = Array.from(uploadedAssets.entries()).filter(([id, asset]) => 
    groupedSpecs.some(spec => spec.specGroupId === id)
  );
  const libraryAssets = Array.from(pendingFiles.values());

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Creative Assets</h3>
        <p className="text-sm text-gray-600">
          Manage uploaded assets and upload new files for your campaign.
        </p>
      </div>

      {/* Saved Assets Library */}
      {(assignedAssets.length > 0 || libraryAssets.length > 0 || loadingExisting) && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="bg-green-100">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Saved Assets Library
            </CardTitle>
            <CardDescription>
              {totalAssetsUploaded} total assets saved ({totalSpecGroups} specifications needed)
              {totalAssetsUploaded > totalSpecGroups && (
                <span className="text-orange-700 font-medium ml-2">
                  • {totalAssetsUploaded - totalSpecGroups} duplicate{totalAssetsUploaded - totalSpecGroups > 1 ? 's' : ''}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingExisting ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-600 mr-2" />
                <span className="text-sm text-gray-600">Loading saved assets...</span>
              </div>
            ) : (
              <>
                {totalAssetsUploaded > totalSpecGroups && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900 mb-1">
                          ⚠️ Duplicate Uploads Detected
                        </p>
                        <p className="text-xs text-orange-800">
                          You have {totalAssetsUploaded - totalSpecGroups} extra asset{totalAssetsUploaded - totalSpecGroups > 1 ? 's' : ''}. 
                          Only {totalSpecGroups} unique specifications are needed for this campaign.
                          Use the trash icon to delete unwanted files.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              <div className="space-y-4">
                {/* Assigned Assets */}
                {assignedAssets.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-green-800 mb-3">Assigned to Placements</h4>
                    <div className="space-y-2">
                      {assignedAssets.map(([specGroupId, asset]) => {
                        const specGroup = groupedSpecs.find(g => g.specGroupId === specGroupId);
                        return (
                          <div key={specGroupId} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                            {asset.previewUrl && (
                              <img 
                                src={asset.previewUrl} 
                                alt={asset.file?.name || asset.fileName}
                                className="w-16 h-16 object-contain rounded border"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {asset.file?.name || asset.fileName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {specGroup?.placementCount || 0} placements • {specGroup?.publicationCount || 0} publications
                              </p>
                              <p className="text-xs text-gray-500">
                                {getSpecDisplayName(specGroup || { channel: 'unknown', dimensions: 'unknown' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={asset.uploadStatus === 'uploaded' ? 'default' : 'secondary'}>
                                {asset.uploadStatus === 'uploaded' ? 'Uploaded' : 'Pending'}
                              </Badge>
                              {asset.uploadStatus === 'uploaded' && asset.assetId ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteAssetClick(asset.assetId!, specGroupId, asset.file?.name || asset.fileName || 'asset')}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete asset"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveAsset(specGroupId)}
                                  className="h-8 w-8 p-0"
                                  title="Remove from queue"
                                >
                                  <CloseIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Library Assets (Unassigned) */}
                {libraryAssets.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3">
                      Library Assets (Not Assigned)
                    </h4>
                    <div className="space-y-2">
                      {Array.from(pendingFiles.entries()).map(([fileId, fileData]) => (
                        <div key={fileId} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          {fileData.previewUrl && (
                            <img 
                              src={fileData.previewUrl} 
                              alt={fileData.file.name}
                              className="w-16 h-16 object-contain rounded border"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{fileData.file.name}</p>
                            {fileData.detectedSpecs?.dimensions && (
                              <p className="text-xs text-gray-600">
                                {fileData.detectedSpecs.dimensions.formatted}
                              </p>
                            )}
                            {fileData.suggestedStandard && (
                              <p className="text-xs text-blue-600">
                                Suggested: {fileData.suggestedStandard.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Library</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemovePending(fileId)}
                              className="h-8 w-8 p-0"
                            >
                              <CloseIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN (3/5 width) - Progress, Sizes, Checklist */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Progress Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Upload Progress</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {uploadedCount} of {totalSpecGroups} specifications completed
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{progressPercent}%</div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Report - Show Matched vs Missing */}
          {hasAnyFiles && (
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Coverage Report
                </CardTitle>
                <CardDescription>
                  Assets uploaded vs. inventory requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {/* Uploaded/Pending Assets & Their Coverage */}
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      📤 Files Uploaded ({pendingFiles.size + assignedCount})
                    </h4>
                    <div className="space-y-2 ml-6">
                      {/* Show assigned assets with coverage */}
                      {dimensionSummary.filter(item => item.isUploaded).map((item, idx) => {
                        const matchedSpecGroups = item.specGroups;
                        const uploadedAssetNames = matchedSpecGroups
                          .map(sg => uploadedAssets.get(sg.specGroupId))
                          .filter(a => a && (a.uploadStatus === 'uploaded' || a.uploadStatus === 'pending'))
                          .map(a => a!.file?.name || a!.fileName);
                        
                        return (
                          <div key={idx} className="text-sm">
                            <div className="flex items-start gap-2">
                              <Badge variant="default" className="bg-green-600 text-xs mt-0.5">
                                ✓ Assigned
                              </Badge>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {item.channel} • {item.dimension}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  📦 Covers: <span className="font-semibold">{item.placementCount} placements</span> across <span className="font-semibold">{item.publicationCount} publications</span>
                                </div>
                                {uploadedAssetNames.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    File: {uploadedAssetNames.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show pending files not yet assigned */}
                      {Array.from(pendingFiles.entries()).map(([fileId, fileData]) => {
                        const dims = fileData.detectedSpecs?.dimensions?.formatted || 'Unknown size';
                        const standardName = fileData.suggestedStandard?.name || dims;
                        
                        return (
                          <div key={fileId} className="text-sm">
                            <div className="flex items-start gap-2">
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                ⏳ Pending
                              </Badge>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {standardName}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  ⚠️ Not yet assigned to placements
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  File: {fileData.file.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Missing Assets - but check if pending files could cover them */}
                  {dimensionSummary.filter(item => !item.isUploaded).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-orange-700 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        📭 Still Needed ({dimensionSummary.filter(item => !item.isUploaded).length})
                      </h4>
                      <div className="space-y-2 ml-6">
                        {dimensionSummary.filter(item => !item.isUploaded).map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-start gap-2">
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                {item.channel}
                              </Badge>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {item.dimension === 'Any size' ? (
                                    <span className="text-orange-600">
                                      {item.dimension} <span className="text-xs font-normal">(size not specified by publications)</span>
                                    </span>
                                  ) : (
                                    item.dimension
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  📭 Missing for: <span className="font-semibold">{item.placementCount} placements</span> across <span className="font-semibold">{item.publicationCount} publications</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Info about "Any size" placements */}
                      {dimensionSummary.some(item => !item.isUploaded && item.dimension === 'Any size') && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-orange-900">
                              <p className="font-medium">About "Any size" placements:</p>
                              <p className="mt-1">Publications haven't specified exact dimensions for these placements. You may need to:</p>
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                <li>Contact publications for specifications</li>
                                <li>Use flexible/responsive assets</li>
                                <li>Upload custom sizes for each publication</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Requirements Checklist</CardTitle>
              <CardDescription>
                {uploadedCount} of {totalSpecGroups} assets uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {groupedSpecs.map((specGroup) => {
                  const asset = uploadedAssets.get(specGroup.specGroupId);
                  const isComplete = asset?.uploadStatus === 'uploaded';
                  const isPending = asset?.uploadStatus === 'pending';

                  return (
                    <div
                      key={specGroup.specGroupId}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        isComplete
                          ? 'border-green-500 bg-green-50'
                          : isPending
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : isPending ? (
                            <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">
                            {getSpecDisplayName(specGroup)}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {specGroup.placementCount} placements • {specGroup.publicationCount} publications
                          </p>
                          {/* Specifications */}
                          <div className="mt-2 text-xs space-y-1">
                            {specGroup.dimensions && (
                              <div className="text-gray-600">
                                Size: <span className="font-mono">{formatDimensions(specGroup.dimensions)}</span>
                              </div>
                            )}
                            {specGroup.fileFormats && (
                              <div className="text-gray-600">
                                Format: <span className="font-mono">{specGroup.fileFormats.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          {/* Show assigned file */}
                          {asset && (
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant={isComplete ? 'default' : 'secondary'} className="text-xs">
                                {asset.file?.name || asset.fileName}
                              </Badge>
                              {!isComplete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleRemoveAsset(specGroup.specGroupId)}
                                >
                                  <CloseIcon className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upload All Button */}
          {pendingUploadCount > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={handleUploadAll}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                disabled={uploadProgress !== null}
              >
                {uploadProgress ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Uploading {uploadProgress.current}/{uploadProgress.total}...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Save All to Server ({pendingUploadCount})
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (2/5 width) - Upload Zone (Sticky) */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-blue-300 bg-blue-50 lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Creative Assets
          </CardTitle>
          <CardDescription>Drag and drop your creative files here, or click to select.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-400 rounded-lg cursor-pointer hover:border-blue-600 hover:bg-blue-100 transition-colors min-h-[180px] bg-white"
          >
            <input {...getInputProps()} />
            {processingZip ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <span className="text-sm font-medium text-gray-700">Processing ZIP file...</span>
                <span className="text-xs text-gray-500 mt-1">This may take a moment.</span>
                {zipProgress && (
                  <span className="text-xs text-gray-500 mt-2">{zipProgress.message} ({zipProgress.percent}%)</span>
                )}
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-blue-500 mb-3" />
                <span className="text-base font-medium text-gray-900 mb-1">
                  Drag & drop files here or click to upload
                </span>
                <span className="text-sm text-gray-500">
                  Supports images, videos, PDFs, design files (AI, PSD, INDD, EPS), and ZIP archives.
                </span>
              </>
            )}
          </div>

          {/* Pending Files - Show right below upload zone */}
          {pendingFiles.size > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Files Ready to Assign</h4>
              {Array.from(pendingFiles.entries()).map(([fileId, { file, previewUrl, detectedSpecs, suggestedStandard, matchConfidence, isAnalyzing, uploadStatus, errorMessage }]) => (
                <Card key={fileId} className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex gap-4">
                      {/* Preview */}
                      {previewUrl && (
                        <div className="relative w-32 h-24 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                          <img 
                            src={previewUrl} 
                            alt={`Preview of ${file.name}`}
                            className="max-w-full max-h-full object-contain"
                            onLoad={() => console.log(`[Render] ✅ Image loaded successfully for ${file.name}`)}
                            onError={(e) => {
                              console.error(`[Render] ❌ Image failed to load for ${file.name}, URL:`, previewUrl);
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12">No Preview</text></svg>';
                            }}
                          />
                        </div>
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{file.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm font-semibold text-gray-900">{formatBytes(file.size)}</span>
                              <span className="text-sm text-gray-500">📄 {file.type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePending(fileId)}
                            className="flex-shrink-0"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Detected Specs */}
                        {detectedSpecs && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {detectedSpecs.dimensions && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                📐 {detectedSpecs.dimensions.formatted}
                              </Badge>
                            )}
                            {detectedSpecs.colorSpace && (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                🎨 {detectedSpecs.colorSpace}
                              </Badge>
                            )}
                            {detectedSpecs.resolution && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                ✨ {detectedSpecs.resolution}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Assignment Dropdown - Always Show */}
                        {isAnalyzing ? (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing file...
                          </div>
                        ) : (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Assign to specification:
                              {suggestedStandard && matchConfidence && (
                                <span className="ml-2 text-blue-600 font-normal">
                                  (✨ Suggested: {suggestedStandard.name} - {matchConfidence}% match)
                                </span>
                              )}
                            </label>
                            <Select 
                              onValueChange={(value) => handleAssignToSpec(fileId, value)}
                              defaultValue={suggestedStandard?.id}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={suggestedStandard?.name || "Select specification..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {getWebsiteStandards().map((standard) => (
                                  <SelectItem key={standard.id} value={standard.id}>
                                    {standard.name}
                                    {standard.id === suggestedStandard?.id && " ✨"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Upload Status */}
                        {uploadStatus === 'uploading' && (
                          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading to S3...
                          </div>
                        )}
                        {uploadStatus === 'error' && errorMessage && (
                          <div className="mt-2 text-xs text-red-600">
                            ❌ {errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{assetToDelete?.fileName}</strong>?
            <br /><br />
            This action cannot be undone. The file will be permanently removed from the server.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAssetConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
