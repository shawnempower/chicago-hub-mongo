/**
 * Creative Assets Manager
 * 
 * Redesigned creative assets interface with:
 * - Upper section: Progress indicator (left) + Upload zone (right)
 * - Lower section: Toggle between Checklist and Uploaded Assets views
 * - Expandable rows showing file details and placement information
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Upload,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trash2,
  Loader2,
  X,
  ChevronRight,
  FileImage,
  FileText,
  FolderOpen,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DetectedFileSpecs,
  autoMatchFileToSpecs,
} from '@/utils/fileSpecDetection';
import {
  getWebsiteStandards,
  findStandardByDimensions,
  InventoryTypeStandard,
} from '@/config/inventoryStandards';
import {
  processZipFile,
  ProcessedZipFile,
  ZipProcessingResult,
  generateZipSummary
} from '@/utils/zipProcessor';
import { API_BASE_URL } from '@/config/api';

interface CreativeAssetsManagerProps {
  requirements: CreativeRequirement[];
  uploadedAssets: Map<string, UploadedAssetWithSpecs>;
  onAssetsChange: (assets: Map<string, UploadedAssetWithSpecs>) => void;
  campaignId?: string;
}

interface PendingFile {
  file: File;
  previewUrl?: string;
  detectedSpecs?: DetectedFileSpecs;
  suggestedStandard?: InventoryTypeStandard;
  matchConfidence?: number;
  isAnalyzing?: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
}

interface EnrichedSpec extends GroupedCreativeRequirement {
  status: 'uploaded' | 'pending' | 'missing';
  fileName: string | null;
  assetId?: string;
}

type SortKey = 'requirement' | 'channel' | 'coverage' | 'status';
type SortDirection = 'asc' | 'desc';

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

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: 'uploaded' | 'pending' | 'missing' }) {
  const config = {
    uploaded: { 
      icon: CheckCircle2, 
      label: 'Uploaded', 
      className: 'bg-green-50 text-green-700 border-green-200' 
    },
    pending: { 
      icon: Circle, 
      label: 'Pending', 
      className: 'bg-blue-50 text-blue-700 border-blue-200' 
    },
    missing: { 
      icon: AlertCircle, 
      label: 'Missing', 
      className: 'bg-orange-50 text-orange-700 border-orange-200' 
    }
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className={`h-3 w-3 ${status === 'pending' ? 'fill-current' : ''}`} />
      {label}
    </span>
  );
}

export function CreativeAssetsManager({
  requirements,
  uploadedAssets,
  onAssetsChange,
  campaignId
}: CreativeAssetsManagerProps) {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'checklist' | 'uploaded'>('checklist');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pendingFiles, setPendingFiles] = useState<Map<string, PendingFile>>(new Map());
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ assetId: string; specGroupId: string; fileName: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [previewAsset, setPreviewAsset] = useState<{ url: string; fileName: string } | null>(null);
  const [processingZip, setProcessingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ percent: number; message: string } | null>(null);

  // Group requirements by specifications
  const groupedSpecs = useMemo(() => groupRequirementsBySpec(requirements), [requirements]);

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
            const reconstructedAsset: UploadedAssetWithSpecs = {
              specGroupId: asset.metadata.specGroupId || `library_${asset._id}`,
              fileName: asset.metadata.fileName,
              previewUrl: asset.metadata.fileUrl,
              uploadStatus: 'uploaded',
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
              appliesTo: asset.associations?.placements || [],
              assetType: asset.metadata.assetType || 'placement',
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

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRequired = groupedSpecs.length;
    const uploaded = groupedSpecs.filter(spec => {
      const asset = uploadedAssets.get(spec.specGroupId);
      return asset?.uploadStatus === 'uploaded';
    }).length;
    const pending = groupedSpecs.filter(spec => {
      const asset = uploadedAssets.get(spec.specGroupId);
      return asset && asset.uploadStatus !== 'uploaded';
    }).length;
    const missing = totalRequired - uploaded - pending;
    const placementsCovered = groupedSpecs
      .filter(spec => uploadedAssets.get(spec.specGroupId)?.uploadStatus === 'uploaded')
      .reduce((sum, spec) => sum + spec.placementCount, 0);
    const totalPlacements = groupedSpecs.reduce((sum, spec) => sum + spec.placementCount, 0);
    const uniquePublications = new Set(groupedSpecs.flatMap(spec => spec.placements.map(p => p.publicationId))).size;
    
    return {
      totalRequired,
      uploaded,
      pending,
      missing,
      placementsCovered,
      totalPlacements,
      uniquePublications,
      progressPercent: totalRequired > 0 ? Math.round((uploaded / totalRequired) * 100) : 0
    };
  }, [groupedSpecs, uploadedAssets]);

  // Enrich specs with status and apply sorting
  const enrichedSpecs = useMemo<EnrichedSpec[]>(() => {
    const specs = groupedSpecs.map(spec => {
      const asset = uploadedAssets.get(spec.specGroupId);
      return {
        ...spec,
        status: asset?.uploadStatus === 'uploaded' ? 'uploaded' as const
              : asset ? 'pending' as const
              : 'missing' as const,
        fileName: asset?.file?.name || asset?.fileName || null,
        assetId: asset?.assetId
      };
    });

    // Apply sorting
    if (sortConfig) {
      specs.sort((a, b) => {
        let comparison = 0;
        
        switch (sortConfig.key) {
          case 'requirement':
            const dimA = formatDimensions(a.dimensions);
            const dimB = formatDimensions(b.dimensions);
            comparison = dimA.localeCompare(dimB);
            break;
          case 'channel':
            comparison = a.channel.localeCompare(b.channel);
            break;
          case 'coverage':
            comparison = a.placementCount - b.placementCount;
            break;
          case 'status':
            const statusOrder = { uploaded: 0, pending: 1, missing: 2 };
            comparison = statusOrder[a.status] - statusOrder[b.status];
            break;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return specs;
  }, [groupedSpecs, uploadedAssets, sortConfig]);

  // Get uploaded assets list for table
  const uploadedAssetsList = useMemo(() => 
    Array.from(uploadedAssets.entries())
      .filter(([_, asset]) => asset.uploadStatus === 'uploaded')
      .map(([specGroupId, asset]) => {
        const spec = groupedSpecs.find(s => s.specGroupId === specGroupId);
        return { specGroupId, asset, spec };
      }),
    [uploadedAssets, groupedSpecs]
  );

  // Group placements by publication
  const groupPlacementsByPublication = (placements: GroupedCreativeRequirement['placements']) => {
    const grouped = new Map<number, { name: string; placements: string[] }>();
    placements.forEach(p => {
      if (!grouped.has(p.publicationId)) {
        grouped.set(p.publicationId, { name: p.publicationName, placements: [] });
      }
      grouped.get(p.publicationId)!.placements.push(p.placementName);
    });
    return Array.from(grouped.entries());
  };

  // Toggle row expansion
  const toggleRow = (specGroupId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(specGroupId)) {
        next.delete(specGroupId);
      } else {
        next.add(specGroupId);
      }
      return next;
    });
  };

  // Handle column sorting
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        // Toggle direction or clear
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Clear sort
        }
      }
      return { key, direction: 'asc' };
    });
  };

  // Render sort icon for column header
  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Handle ZIP file processing
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

      // Collect all assignments before updating state
      const updatedAssets = new Map(uploadedAssets);
      const newPendingFiles = new Map<string, PendingFile>();
      
      console.log(`[ZIP] Processing ${result.processedFiles.length} files from ZIP`);
      console.log(`[ZIP] Available spec groups:`, groupedSpecs.map(g => ({
        id: g.specGroupId,
        channel: g.channel,
        dimensions: g.dimensions
      })));

      // Process each extracted file
      for (const processedFile of result.processedFiles) {
        const fileId = `${processedFile.fileName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`\n[ZIP] Processing file: ${processedFile.fileName}`);
        console.log(`[ZIP] Detected specs:`, processedFile.detectedSpecs);
        
        // Use preview URL from ZIP processor, or create new one if missing
        let previewUrl = processedFile.previewUrl;
        if (!previewUrl && processedFile.file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(processedFile.file);
        }

        // Auto-match to spec groups
        const matches = autoMatchFileToSpecs(processedFile.detectedSpecs, groupedSpecs);
        const bestMatch = matches.length > 0 ? matches[0] : null;
        const matchConfidence = bestMatch ? bestMatch.matchScore : 0;

        console.log(`[ZIP] Found ${matches.length} matches for ${processedFile.fileName}`);
        if (bestMatch) {
          console.log(`[ZIP] Best match: ${bestMatch.specGroupId} with ${matchConfidence}% confidence`);
          console.log(`[ZIP] Match reasons:`, bestMatch.matchReasons);
          if (bestMatch.mismatches.length > 0) {
            console.log(`[ZIP] Mismatches:`, bestMatch.mismatches);
          }
        }

        // Auto-assign if good match (score >= 50)
        if (bestMatch && matchConfidence >= 50) {
          console.log(`✅ [ZIP] Auto-assigning ${processedFile.fileName} → ${bestMatch.specGroupId} (${matchConfidence}%)`);
          
          const matchingGroup = groupedSpecs.find(g => g.specGroupId === bestMatch.specGroupId);
          if (matchingGroup) {
            updatedAssets.set(matchingGroup.specGroupId, {
              specGroupId: matchingGroup.specGroupId,
              file: processedFile.file,
              previewUrl,
              uploadStatus: 'pending',
              detectedSpecs: processedFile.detectedSpecs,
              appliesTo: matchingGroup.placements.map(p => ({
                placementId: p.placementId,
                publicationId: p.publicationId,
                publicationName: p.publicationName
              }))
            });
            console.log(`✅ [ZIP] Successfully assigned to spec group`);
            continue; // Skip adding to pending
          } else {
            console.warn(`⚠️ [ZIP] Could not find matching group for ${bestMatch.specGroupId}`);
          }
        }

        // If not auto-assigned, add to pending files
        console.log(`⚠️ [ZIP] Low match confidence for ${processedFile.fileName} (${matchConfidence}%), adding to pending`);
        newPendingFiles.set(fileId, {
          file: processedFile.file,
          previewUrl,
          detectedSpecs: processedFile.detectedSpecs,
          suggestedStandard: processedFile.suggestedStandard,
          matchConfidence: processedFile.matchConfidence,
          isAnalyzing: false,
        });
      }

      // Update state once with all assignments
      console.log(`[ZIP] Final: ${updatedAssets.size - uploadedAssets.size} files auto-assigned, ${newPendingFiles.size} pending`);
      if (updatedAssets.size > uploadedAssets.size) {
        onAssetsChange(updatedAssets);
      }
      if (newPendingFiles.size > 0) {
        setPendingFiles(prev => {
          const next = new Map(prev);
          newPendingFiles.forEach((value, key) => next.set(key, value));
          return next;
        });
      }
    } catch (error) {
      console.error('Error processing ZIP:', error);
      toast({
        title: 'ZIP Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process ZIP file',
        variant: 'destructive',
      });
    } finally {
      setProcessingZip(false);
      setZipProgress(null);
    }
  }, [groupedSpecs, uploadedAssets, onAssetsChange, toast]);

  // Handle file selection
  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    let fileArray = Array.from(files);
    
    console.log(`[Upload] Processing ${fileArray.length} file(s)`);
    
    // Check if any ZIP files
    const zipFiles = fileArray.filter(f => 
      f.name.endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed'
    );

    if (zipFiles.length > 0) {
      console.log(`[Upload] Found ${zipFiles.length} ZIP file(s), processing...`);
      // Process ZIP files
      for (const zipFile of zipFiles) {
        await handleZipFile(zipFile);
      }

      // Remove ZIP files from the list
      fileArray = fileArray.filter(f => !zipFiles.includes(f));
    }
    
    console.log(`[Upload] Available spec groups:`, groupedSpecs.length);
    
    for (const file of fileArray) {
      const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create preview URL for images
      let previewUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }
      
      // Add to pending with analyzing state
      setPendingFiles(prev => {
        const next = new Map(prev);
        next.set(fileId, {
          file,
          previewUrl,
          isAnalyzing: true,
        });
        return next;
      });
      
      // Detect file specs
      try {
        const detectedSpecs = await detectFileSpecs(file);
        console.log(`[File Detection] Detected specs for ${file.name}:`, detectedSpecs);
        
        // Match against actual campaign requirements
        const matches = autoMatchFileToSpecs(detectedSpecs, groupedSpecs);
        console.log(`[File Matching] Found ${matches.length} potential matches for ${file.name}`);
        
        if (matches.length > 0) {
          console.log(`[File Matching] Top 3 matches:`, matches.slice(0, 3).map(m => ({
            spec: m.specGroupId,
            score: m.matchScore,
            reasons: m.matchReasons,
            mismatches: m.mismatches
          })));
        }
        
        let bestMatch = matches.length > 0 ? matches[0] : null;
        let matchConfidence = bestMatch ? bestMatch.matchScore : 0;
        
        // Auto-assign if good match (score >= 50)
        if (bestMatch && matchConfidence >= 50) {
          console.log(`✅ Auto-assigning ${file.name} → ${bestMatch.specGroupId} (${matchConfidence}%)`);
          console.log(`   Matched requirements:`, bestMatch.matchReasons);
          
          // Auto-assign to the best matching spec group
          const matchingGroup = groupedSpecs.find(g => g.specGroupId === bestMatch.specGroupId);
          if (matchingGroup) {
            console.log(`   Found matching group:`, matchingGroup.channel, matchingGroup.dimensions);
            
            // Add to uploadedAssets
            const updatedAssets = new Map(uploadedAssets);
            updatedAssets.set(matchingGroup.specGroupId, {
              specGroupId: matchingGroup.specGroupId,
              file,
              previewUrl,
              uploadStatus: 'pending',
              appliesTo: matchingGroup.placements.map(p => ({
                placementId: p.placementId,
                publicationId: p.publicationId,
                publicationName: p.publicationName
              }))
            });
            onAssetsChange(updatedAssets);
            
            // Remove from pending files since it's auto-assigned
            setPendingFiles(prev => {
              const next = new Map(prev);
              next.delete(fileId);
              return next;
            });
            
            console.log(`   ✅ Successfully auto-assigned and removed from pending!`);
            
            // Don't add to pending files
            continue;
          } else {
            console.warn(`   ⚠️ Could not find matching group for ${bestMatch.specGroupId}`);
          }
        } else if (matchConfidence > 0) {
          console.log(`⚠️ Low match confidence for ${file.name} (${matchConfidence}%), leaving in "Ready to Assign"`);
        } else {
          console.log(`❌ No match found for ${file.name}`);
        }
        
        // Add to pending files with detected specs
        setPendingFiles(prev => {
          const next = new Map(prev);
          const existing = next.get(fileId);
          if (existing) {
            next.set(fileId, {
              ...existing,
              detectedSpecs,
              matchConfidence,
              isAnalyzing: false,
            });
          }
          return next;
        });
      } catch (error) {
        console.error('Error detecting file specs:', error);
        setPendingFiles(prev => {
          const next = new Map(prev);
          const existing = next.get(fileId);
          if (existing) {
            next.set(fileId, {
              ...existing,
              isAnalyzing: false,
            });
          }
          return next;
        });
      }
    }
  }, [groupedSpecs, uploadedAssets, onAssetsChange, handleZipFile]);

  // Dropzone
  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop: (acceptedFiles) => handleFilesSelected(acceptedFiles),
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'text/plain': ['.txt'],  // For text-only/native newsletter ads
      'text/html': ['.html', '.htm'],  // For HTML newsletter content
    },
    multiple: true,
    noClick: false,
    noKeyboard: false,
  });

  // Remove pending file
  const handleRemovePending = (fileId: string) => {
    setPendingFiles(prev => {
      const next = new Map(prev);
      const file = next.get(fileId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      next.delete(fileId);
      return next;
    });
  };

  // Assign file to spec
  const handleAssignToSpec = async (fileId: string, specGroupId: string) => {
    const fileData = pendingFiles.get(fileId);
    if (!fileData) return;

    const specGroup = groupedSpecs.find(g => g.specGroupId === specGroupId);
    if (!specGroup) return;

    // Create asset entry
    const newAsset: UploadedAssetWithSpecs = {
      specGroupId,
      file: fileData.file,
      fileName: fileData.file.name,
      previewUrl: fileData.previewUrl,
      uploadStatus: 'pending',
      detectedSpecs: fileData.detectedSpecs,
      appliesTo: specGroup.placements.map(p => ({
        placementId: p.placementId,
        publicationId: p.publicationId,
        publicationName: p.publicationName,
      })),
    };

    // Update assets map
    const newAssetsMap = new Map(uploadedAssets);
    newAssetsMap.set(specGroupId, newAsset);
    onAssetsChange(newAssetsMap);

    // Remove from pending
    setPendingFiles(prev => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });

    toast({
      title: 'Asset assigned',
      description: `${fileData.file.name} assigned to ${specGroup.placementCount} placements`,
    });
  };

  // Upload pending assets to server
  const handleUploadAll = async () => {
    const pendingAssets = Array.from(uploadedAssets.entries())
      .filter(([_, asset]) => asset.uploadStatus === 'pending' && asset.file);

    if (pendingAssets.length === 0) return;

    setUploadProgress({ current: 0, total: pendingAssets.length });

    for (let i = 0; i < pendingAssets.length; i++) {
      const [specGroupId, asset] = pendingAssets[i];
      
      try {
        const formData = new FormData();
        formData.append('file', asset.file!);
        formData.append('campaignId', campaignId || '');
        formData.append('specGroupId', specGroupId);
        formData.append('metadata', JSON.stringify({
          fileName: asset.file!.name,
          detectedDimensions: asset.detectedSpecs?.dimensions?.formatted,
          detectedColorSpace: asset.detectedSpecs?.colorSpace,
          fileExtension: asset.detectedSpecs?.fileExtension,
          fileSize: asset.detectedSpecs?.fileSize,
        }));

        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/creative-assets/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();

        // Update asset status
        const updatedAsset: UploadedAssetWithSpecs = {
          ...asset,
          uploadStatus: 'uploaded',
          assetId: result.assetId,
          uploadedUrl: result.fileUrl,
          previewUrl: result.fileUrl,
        };

        const newAssetsMap = new Map(uploadedAssets);
        newAssetsMap.set(specGroupId, updatedAsset);
        onAssetsChange(newAssetsMap);

      } catch (error) {
        console.error('Upload error:', error);
        
        const updatedAsset: UploadedAssetWithSpecs = {
          ...asset,
          uploadStatus: 'error',
          errorMessage: 'Upload failed',
        };

        const newAssetsMap = new Map(uploadedAssets);
        newAssetsMap.set(specGroupId, updatedAsset);
        onAssetsChange(newAssetsMap);
      }

      setUploadProgress({ current: i + 1, total: pendingAssets.length });
    }

    setUploadProgress(null);
    toast({
      title: 'Upload complete',
      description: `${pendingAssets.length} assets uploaded successfully`,
    });
  };

  // Delete asset
  const handleDeleteAssetClick = (assetId: string, specGroupId: string, fileName: string) => {
    setAssetToDelete({ assetId, specGroupId, fileName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteAssetConfirm = async () => {
    if (!assetToDelete) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/creative-assets/${assetToDelete.assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');

      const newAssetsMap = new Map(uploadedAssets);
      newAssetsMap.delete(assetToDelete.specGroupId);
      onAssetsChange(newAssetsMap);

      toast({
        title: 'Asset deleted',
        description: `${assetToDelete.fileName} has been removed`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete asset',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };

  // Remove asset from queue (not uploaded yet)
  const handleRemoveAsset = (specGroupId: string) => {
    const newAssetsMap = new Map(uploadedAssets);
    const asset = newAssetsMap.get(specGroupId);
    if (asset?.previewUrl && asset.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(asset.previewUrl);
    }
    newAssetsMap.delete(specGroupId);
    onAssetsChange(newAssetsMap);
  };

  // Count pending uploads
  const pendingUploadCount = Array.from(uploadedAssets.values())
    .filter(a => a.uploadStatus === 'pending').length;

  return (
    <>
      <div className="space-y-6">
        {/* ==================== UPPER SECTION: 2 COLUMNS ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: Progress Indicator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium font-sans">Requirements Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingExisting ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading assets...</span>
                </div>
              ) : (
                <>
                  {/* Main progress stats */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics.uploaded}/{metrics.totalRequired}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Unique assets uploaded
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{metrics.progressPercent}%</p>
                      <p className="text-sm text-muted-foreground">Complete</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <Progress value={metrics.progressPercent} className="h-2" />

                  {/* Coverage summary */}
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Covering <span className="font-medium text-foreground">{metrics.placementsCovered}</span> of {metrics.totalPlacements} placements 
                      across <span className="font-medium text-foreground">{metrics.uniquePublications}</span> publications
                    </p>
                  </div>

                  {/* Status breakdown */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{metrics.uploaded} uploaded</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Circle className="h-4 w-4 text-blue-600 fill-blue-600" />
                      <span>{metrics.pending} pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span>{metrics.missing} missing</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Upload Zone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium font-sans flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Creative Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                data-upload-zone
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images, videos, PDFs, ZIP, text files (.txt for native ads)
                </p>
              </div>

              {/* ZIP Processing Indicator */}
              {processingZip && zipProgress && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Processing ZIP file...</span>
                  </div>
                  <Progress value={zipProgress.percent} className="h-2 mb-2" />
                  {zipProgress.message && (
                    <p className="text-xs text-blue-700 mt-2">{zipProgress.message} ({zipProgress.percent}%)</p>
                  )}
                </div>
              )}

              {/* Pending files queue */}
              {pendingFiles.size > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Ready to assign ({pendingFiles.size})
                  </p>
                  {Array.from(pendingFiles.entries()).map(([id, fileData]) => (
                    <div key={id} className="flex flex-col gap-2 p-3 bg-muted/50 rounded text-sm border border-muted">
                      {/* File name and actions row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {fileData.detectedSpecs?.isTextAsset ? (
                            <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          ) : (
                            <FileImage className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate font-medium">{fileData.file.name}</span>
                          {fileData.isAnalyzing && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemovePending(id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Detected specs row - different for text vs images */}
                      {fileData.detectedSpecs && !fileData.isAnalyzing && (
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground pl-6">
                          <div className="flex items-center gap-3">
                            {fileData.detectedSpecs.isTextAsset ? (
                              // Text file info
                              <>
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                                  📝 {fileData.detectedSpecs.fileExtension}
                                </span>
                                {fileData.detectedSpecs.wordCount && (
                                  <span>{fileData.detectedSpecs.wordCount} words</span>
                                )}
                                <span>{fileData.detectedSpecs.fileSizeFormatted}</span>
                              </>
                            ) : (
                              // Image file info
                              <>
                                {fileData.detectedSpecs.dimensions && (
                                  <span className="font-mono">
                                    📏 {fileData.detectedSpecs.dimensions.formatted}
                                  </span>
                                )}
                                <span>{fileData.detectedSpecs.fileExtension}</span>
                                <span>{fileData.detectedSpecs.fileSizeFormatted}</span>
                                {fileData.detectedSpecs.colorSpace && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                    {fileData.detectedSpecs.colorSpace}
                                  </span>
                                )}
                              </>
                            )}
                            {fileData.matchConfidence !== undefined && fileData.matchConfidence > 0 && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                {fileData.matchConfidence}% match
                              </span>
                            )}
                          </div>
                          {/* Text preview */}
                          {fileData.detectedSpecs.isTextAsset && fileData.detectedSpecs.textContent && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2 bg-white/50 p-1.5 rounded border">
                              "{fileData.detectedSpecs.textContent.substring(0, 100)}..."
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Assignment dropdown */}
                      {!fileData.isAnalyzing && (
                        <div className="pl-6">
                          <Select onValueChange={(value) => handleAssignToSpec(id, value)}>
                            <SelectTrigger className="h-8 w-full text-xs">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {(() => {
                                // Group specs by channel
                                const byChannel = groupedSpecs.reduce((acc, spec) => {
                                  const channel = spec.channel || 'other';
                                  if (!acc[channel]) acc[channel] = [];
                                  acc[channel].push(spec);
                                  return acc;
                                }, {} as Record<string, typeof groupedSpecs>);
                                
                                // Sort channels: print first, then alphabetically
                                const channelOrder = ['print', 'website', 'newsletter', 'podcast', 'radio', 'streaming', 'social', 'events'];
                                const sortedChannels = Object.keys(byChannel).sort((a, b) => {
                                  const aIdx = channelOrder.indexOf(a);
                                  const bIdx = channelOrder.indexOf(b);
                                  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                                  if (aIdx === -1) return 1;
                                  if (bIdx === -1) return -1;
                                  return aIdx - bIdx;
                                });
                                
                                return sortedChannels.map(channel => (
                                  <div key={channel}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase bg-muted/50 sticky top-0">
                                      {channel} ({byChannel[channel].length})
                                    </div>
                                    {byChannel[channel].map((spec) => (
                                      <SelectItem key={spec.specGroupId} value={spec.specGroupId}>
                                        {formatDimensions(spec.dimensions)}
                                        {spec.fileFormats && ` - ${spec.fileFormats.slice(0, 2).join('/')}`}
                                        <span className="text-muted-foreground ml-1">
                                          ({spec.placementCount} {spec.placementCount === 1 ? 'placement' : 'placements'})
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {pendingUploadCount > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={handleUploadAll}
                    className="w-full"
                    disabled={uploadProgress !== null}
                  >
                    {uploadProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading {uploadProgress.current}/{uploadProgress.total}...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Save All to Server ({pendingUploadCount})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ==================== VIEW TOGGLE + TABLE ==================== */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'checklist' | 'uploaded')}>
          <TabsList>
            <TabsTrigger value="checklist" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Uploaded Assets
              {metrics.uploaded > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {metrics.uploaded}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* CHECKLIST VIEW */}
          <TabsContent value="checklist" className="mt-0 p-0">
            <div className="w-full border-t">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[22%]">
                      <button
                        type="button"
                        onClick={() => handleSort('requirement')}
                        className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      >
                        Requirement
                        {renderSortIcon('requirement')}
                      </button>
                    </TableHead>
                    <TableHead className="w-[12%]">
                      <button
                        type="button"
                        onClick={() => handleSort('channel')}
                        className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      >
                        Channel
                        {renderSortIcon('channel')}
                      </button>
                    </TableHead>
                    <TableHead className="w-[28%]">
                      <button
                        type="button"
                        onClick={() => handleSort('coverage')}
                        className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      >
                        Coverage
                        {renderSortIcon('coverage')}
                      </button>
                    </TableHead>
                    <TableHead className="w-[20%]">File</TableHead>
                    <TableHead className="w-[13%] text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="ml-auto flex items-center justify-end text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      >
                        Status
                        {renderSortIcon('status')}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {enrichedSpecs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No requirements found
                    </TableCell>
                  </TableRow>
                ) : (
                  enrichedSpecs.map((spec) => {
                    const isExpanded = expandedRows.has(spec.specGroupId);
                    const asset = uploadedAssets.get(spec.specGroupId);
                    const placementsByPub = groupPlacementsByPublication(spec.placements);

                    return (
                      <React.Fragment key={spec.specGroupId}>
                        {/* Main Row */}
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(spec.specGroupId)}
                        >
                          <TableCell className="pr-0">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ChevronRight 
                                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                              />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {formatDimensions(spec.dimensions)}
                            </span>
                            {spec.fileFormats && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {spec.fileFormats.join(', ').toUpperCase()}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize font-normal">
                              {spec.channel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-medium">{spec.placementCount}</span>
                            <span className="text-muted-foreground"> placements across </span>
                            <span className="font-medium">{spec.publicationCount}</span>
                            <span className="text-muted-foreground"> publication{spec.publicationCount !== 1 ? 's' : ''}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {spec.fileName ? (
                              <span className="truncate block max-w-[150px]" title={spec.fileName}>
                                {spec.fileName}
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFileDialog();
                                }}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Add file
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusBadge status={spec.status} />
                          </TableCell>
                        </TableRow>

                        {/* Expanded Content Row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={6} className="p-0">
                              <div className="px-6 py-4 space-y-4">
                                {/* Two Column Layout: File Details | Placements */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  
                                  {/* LEFT: Attached File Details */}
                                  <div className="lg:col-span-1">
                                    <h4 className="text-xs font-medium font-sans text-muted-foreground uppercase tracking-wide mb-3">
                                      Attached File
                                    </h4>
                                    {asset && (asset.uploadStatus === 'uploaded' || asset.uploadStatus === 'pending') ? (
                                      <div className="flex gap-3">
                                        {/* Preview - handle both images and text files */}
                                        {asset.detectedSpecs?.isTextAsset ? (
                                          // Text file preview
                                          <div className="w-20 h-20 rounded border bg-amber-50 flex flex-col items-center justify-center p-1">
                                            <FileText className="h-6 w-6 text-amber-600 mb-1" />
                                            <span className="text-[9px] text-amber-700 font-medium">
                                              {asset.detectedSpecs.fileExtension}
                                            </span>
                                          </div>
                                        ) : asset.previewUrl ? (
                                          <img 
                                            src={asset.previewUrl} 
                                            alt={asset.fileName || 'Preview'}
                                            className="w-20 h-20 object-contain rounded border bg-white"
                                          />
                                        ) : (
                                          <div className="w-20 h-20 rounded border bg-white flex items-center justify-center">
                                            <FileImage className="h-8 w-8 text-muted-foreground" />
                                          </div>
                                        )}
                                        {/* File Info */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <p className="text-sm font-medium truncate">
                                            {asset.file?.name || asset.fileName}
                                          </p>
                                          {/* Show text file info OR image dimensions */}
                                          {asset.detectedSpecs?.isTextAsset ? (
                                            <>
                                              {asset.detectedSpecs.wordCount && (
                                                <p className="text-xs text-muted-foreground">
                                                  {asset.detectedSpecs.wordCount} words, {asset.detectedSpecs.characterCount} chars
                                                </p>
                                              )}
                                              {asset.detectedSpecs.textContent && (
                                                <p className="text-xs text-muted-foreground italic line-clamp-2">
                                                  "{asset.detectedSpecs.textContent.substring(0, 80)}..."
                                                </p>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              {asset.detectedSpecs?.dimensions && (
                                                <p className="text-xs text-muted-foreground">
                                                  {asset.detectedSpecs.dimensions.formatted}
                                                </p>
                                              )}
                                              {asset.detectedSpecs?.colorSpace && (
                                                <p className="text-xs text-muted-foreground">
                                                  {asset.detectedSpecs.colorSpace}
                                                </p>
                                              )}
                                            </>
                                          )}
                                          {asset.detectedSpecs?.fileSize && (
                                            <p className="text-xs text-muted-foreground">
                                              {formatBytes(asset.detectedSpecs.fileSize)}
                                            </p>
                                          )}
                                          {/* Actions */}
                                          <div className="pt-1">
                                            {asset.uploadStatus === 'uploaded' && asset.assetId ? (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteAssetClick(asset.assetId!, spec.specGroupId, asset.file?.name || asset.fileName || 'asset');
                                                }}
                                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                              >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Remove
                                              </Button>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveAsset(spec.specGroupId);
                                                }}
                                                className="h-7 px-2 text-xs"
                                              >
                                                <X className="h-3 w-3 mr-1" />
                                                Remove
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 p-4 border border-dashed rounded-lg">
                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                        <p className="text-sm text-muted-foreground">
                                          No file attached yet
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* RIGHT: Placements by Publication */}
                                  <div className="lg:col-span-2">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                      Placements ({spec.placementCount})
                                    </h4>
                                    <div className="space-y-3 max-h-48 overflow-y-auto">
                                      {placementsByPub.map(([pubId, pubData]) => (
                                        <div key={pubId} className="space-y-1.5">
                                          {/* Publication Header */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{pubData.name}</span>
                                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                              {pubData.placements.length}
                                            </Badge>
                                          </div>
                                          {/* Placement List */}
                                          <div className="ml-4 flex flex-wrap gap-1.5">
                                            {pubData.placements.map((placementName, idx) => (
                                              <span 
                                                key={idx}
                                                className="text-xs bg-muted px-2 py-1 rounded"
                                              >
                                                {placementName}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Specification Details */}
                                {(spec.colorSpace || spec.resolution || spec.maxFileSize || spec.additionalRequirements) && (
                                  <div className="pt-3 border-t">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                      Specifications
                                    </h4>
                                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                      {spec.colorSpace && (
                                        <span>
                                          <span className="text-muted-foreground">Color: </span>
                                          {spec.colorSpace}
                                        </span>
                                      )}
                                      {spec.resolution && (
                                        <span>
                                          <span className="text-muted-foreground">Resolution: </span>
                                          {spec.resolution}
                                        </span>
                                      )}
                                      {spec.maxFileSize && (
                                        <span>
                                          <span className="text-muted-foreground">Max Size: </span>
                                          {spec.maxFileSize}
                                        </span>
                                      )}
                                      {spec.additionalRequirements && (
                                        <span>
                                          <span className="text-muted-foreground">Notes: </span>
                                          {spec.additionalRequirements}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* UPLOADED ASSETS VIEW */}
          <TabsContent value="uploaded" className="mt-0 p-0">
            <div className="w-full border-t">
              <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Preview</TableHead>
                  <TableHead className="w-[25%]">File Name</TableHead>
                  <TableHead className="w-[15%]">Dimensions</TableHead>
                  <TableHead className="w-[30%]">Assigned To</TableHead>
                  <TableHead className="w-[15%]">Coverage</TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedAssetsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No assets uploaded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  uploadedAssetsList.map(({ specGroupId, asset, spec }) => (
                    <TableRow key={specGroupId}>
                      <TableCell>
                        {asset.detectedSpecs?.isTextAsset ? (
                          // Text file - show icon with file type
                          <div className="w-12 h-12 rounded border bg-amber-50 flex flex-col items-center justify-center">
                            <FileText className="h-5 w-5 text-amber-600" />
                            <span className="text-[8px] text-amber-700 font-medium mt-0.5">
                              {asset.detectedSpecs.fileExtension}
                            </span>
                          </div>
                        ) : asset.previewUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewAsset({ 
                              url: asset.previewUrl!, 
                              fileName: asset.file?.name || asset.fileName || 'Asset' 
                            })}
                            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                          >
                            <img 
                              src={asset.previewUrl} 
                              alt={asset.fileName || 'Asset preview'}
                              className="w-12 h-12 object-contain rounded border bg-muted"
                            />
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                            <FileImage className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm">
                          {asset.file?.name || asset.fileName}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {asset.detectedSpecs?.isTextAsset ? (
                          // Show word count for text files
                          <span className="text-amber-700">
                            {asset.detectedSpecs.wordCount || '—'} words
                          </span>
                        ) : (
                          asset.detectedSpecs?.dimensions?.formatted || '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {spec ? (
                          <span>
                            {getSpecDisplayName(spec)}
                          </span>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {spec ? (
                          <span>{spec.placementCount} placements</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteAssetClick(asset.assetId!, specGroupId, asset.file?.name || asset.fileName || 'asset')}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete asset
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{assetToDelete?.fileName}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssetConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asset Preview Modal */}
      <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative">
            {/* Header with filename */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-10">
              <p className="text-white text-sm font-medium truncate">
                {previewAsset?.fileName}
              </p>
            </div>
            {/* Image */}
            {previewAsset && (
              <img
                src={previewAsset.url}
                alt={previewAsset.fileName}
                className="w-full h-auto max-h-[85vh] object-contain bg-black"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Need to import React for Fragment
import React from 'react';

