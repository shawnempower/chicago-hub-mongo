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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ArrowUpDown,
  Merge,
  Link,
  ExternalLink,
  GitBranch,
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
  UploadedAssetWithSpecs,
  dimensionsMatch,
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
import { cn } from '@/lib/utils';

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
  // Digital ad properties (for website, newsletter, streaming)
  clickUrl?: string;
  altText?: string;
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
 * Format audio/podcast spec for display
 * - Radio: "30 second spot"
 * - Podcast: "Pre-roll (60s)" or "Host-read" or "Mid-roll"
 */
function formatAudioSpec(spec: { 
  channel: string; 
  dimensions?: string | string[]; 
  duration?: number;
  placements?: Array<{ placementName: string }>;
}): string {
  const dims = Array.isArray(spec.dimensions) ? spec.dimensions[0] : spec.dimensions;
  const dimsLower = (dims || '').toLowerCase().trim();
  
  // Check if dimensions contains a podcast position
  const podcastPositions = ['pre-roll', 'mid-roll', 'post-roll', 'host-read', 'live-read'];
  const isPosition = podcastPositions.some(pos => dimsLower.includes(pos.replace('-', '')));
  
  if (spec.channel === 'podcast') {
    // Format podcast position nicely
    if (isPosition || dimsLower.includes('pre') || dimsLower.includes('mid') || dimsLower.includes('post') || dimsLower.includes('host')) {
      let position = '';
      if (dimsLower.includes('pre')) position = 'Pre-roll';
      else if (dimsLower.includes('mid')) position = 'Mid-roll';
      else if (dimsLower.includes('post')) position = 'Post-roll';
      else if (dimsLower.includes('host')) position = 'Host-read';
      else if (dimsLower.includes('live')) position = 'Live-read';
      else position = dims || '';
      
      // Append duration if available
      if (spec.duration && !dimsLower.includes('host') && !dimsLower.includes('live')) {
        return `${position} (${spec.duration}s)`;
      }
      return position;
    }
    
    // Try to infer from placement name
    const placementName = spec.placements?.[0]?.placementName?.toLowerCase() || '';
    if (placementName.includes('pre-roll') || placementName.includes('preroll')) {
      return spec.duration ? `Pre-roll (${spec.duration}s)` : 'Pre-roll';
    }
    if (placementName.includes('mid-roll') || placementName.includes('midroll')) {
      return spec.duration ? `Mid-roll (${spec.duration}s)` : 'Mid-roll';
    }
    if (placementName.includes('post-roll') || placementName.includes('postroll')) {
      return spec.duration ? `Post-roll (${spec.duration}s)` : 'Post-roll';
    }
    if (placementName.includes('host') || placementName.includes('live read')) {
      return 'Host-read';
    }
    
    // Fallback to duration if available
    if (spec.duration) {
      return `${spec.duration} second spot`;
    }
    
    return 'Podcast ad';
  }
  
  // Radio: show duration
  if (spec.channel === 'radio') {
    if (spec.duration) {
      return `${spec.duration} second spot`;
    }
    return 'Radio spot';
  }
  
  return dims || 'Audio ad';
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
  const [activeChannel, setActiveChannel] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pendingFiles, setPendingFiles] = useState<Map<string, PendingFile>>(new Map());
  const [batchClickUrl, setBatchClickUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ assetId: string; specGroupId: string; fileName: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [previewAsset, setPreviewAsset] = useState<{ url: string; fileName: string } | null>(null);
  const [processingZip, setProcessingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ percent: number; message: string } | null>(null);
  
  // Split/Duplicate & Exclude state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<{
    specGroupId: string;
    publicationId: number;
    publicationName: string;
  } | null>(null);
  
  // Merge state
  const [mergeSelectionOpen, setMergeSelectionOpen] = useState(false);
  const [mergeAssetSelectionOpen, setMergeAssetSelectionOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [selectedAssetToKeep, setSelectedAssetToKeep] = useState<'source' | 'target' | null>(null);
  
  // Store split/custom spec groups separately
  const [customSpecGroups, setCustomSpecGroups] = useState<Map<string, GroupedCreativeRequirement>>(new Map());
  
  // Track the most recently split spec for auto-assignment
  const [recentlySplitSpecId, setRecentlySplitSpecId] = useState<string | null>(null);

  // Channel configuration with icons and accepted file types
  const channelConfig: Record<string, { 
    label: string; 
    icon: string; 
    color: string;
    acceptedTypes: string;
    description: string;
  }> = {
    website: { 
      label: 'Website', 
      icon: '🌐', 
      color: 'bg-blue-500',
      acceptedTypes: 'PNG, JPG, GIF, WebP',
      description: 'Display ads and banners'
    },
    newsletter: { 
      label: 'Newsletter', 
      icon: '📧', 
      color: 'bg-purple-500',
      acceptedTypes: 'PNG, JPG, GIF, HTML, TXT',
      description: 'Email newsletter ads'
    },
    print: { 
      label: 'Print', 
      icon: '📰', 
      color: 'bg-gray-500',
      acceptedTypes: 'PDF, TIFF, EPS (CMYK)',
      description: 'Print-ready advertisements'
    },
    radio: { 
      label: 'Radio', 
      icon: '📻', 
      color: 'bg-orange-500',
      acceptedTypes: 'WAV, MP3 (15s, 30s, 60s)',
      description: 'Audio spots and commercials'
    },
    podcast: { 
      label: 'Podcast', 
      icon: '🎙️', 
      color: 'bg-green-500',
      acceptedTypes: 'WAV, MP3',
      description: 'Podcast ad reads'
    },
    streaming: { 
      label: 'Streaming', 
      icon: '📺', 
      color: 'bg-red-500',
      acceptedTypes: 'MP4, MOV',
      description: 'Video ads'
    },
    social: { 
      label: 'Social', 
      icon: '📱', 
      color: 'bg-pink-500',
      acceptedTypes: 'PNG, JPG, MP4',
      description: 'Social media ads'
    },
    events: { 
      label: 'Events', 
      icon: '🎪', 
      color: 'bg-yellow-500',
      acceptedTypes: 'PDF, PNG, JPG',
      description: 'Event sponsorship materials'
    },
  };

  // Channel display order
  const channelOrder = ['website', 'newsletter', 'print', 'radio', 'podcast', 'streaming', 'social', 'events'];

  // Group requirements by specifications
  const groupedSpecs = useMemo(() => {
    const baseGroups = groupRequirementsBySpec(requirements);
    
    // Merge in custom spec groups (splits)
    const allGroups = [...baseGroups];
    
    // Add custom groups and update parent groups
    customSpecGroups.forEach((customGroup) => {
      // Add the custom group
      allGroups.push(customGroup);
      
      // If it's a split, update the parent group to exclude its placements
      if (customGroup.isPublicationSpecific && customGroup.originalGroupId) {
        const parentIndex = allGroups.findIndex(g => g.specGroupId === customGroup.originalGroupId);
        if (parentIndex !== -1) {
          const parent = allGroups[parentIndex];
          const updatedPlacements = parent.placements.filter(
            p => !customGroup.placements.some(cp => cp.placementId === p.placementId)
          );
          
          allGroups[parentIndex] = {
            ...parent,
            placements: updatedPlacements,
            placementCount: updatedPlacements.length,
            publicationCount: new Set(updatedPlacements.map(p => p.publicationId)).size,
          };
        }
      }
    });
    
    // Filter out any groups with 0 placements
    return allGroups.filter(g => g.placementCount > 0);
  }, [requirements, customSpecGroups]);

  // Group specs by channel
  const specsByChannel = useMemo(() => {
    const byChannel = new Map<string, GroupedCreativeRequirement[]>();
    groupedSpecs.forEach(spec => {
      const channel = spec.channel || 'other';
      if (!byChannel.has(channel)) {
        byChannel.set(channel, []);
      }
      byChannel.get(channel)!.push(spec);
    });
    return byChannel;
  }, [groupedSpecs]);

  // Get channels that have requirements (in order)
  const availableChannels = useMemo(() => {
    return channelOrder.filter(channel => {
      const specs = specsByChannel.get(channel);
      return specs && specs.length > 0;
    });
  }, [specsByChannel]);

  // Set initial active channel to first available
  useEffect(() => {
    if (activeChannel === 'all' && availableChannels.length > 0) {
      // Keep 'all' as default, user can switch
    }
  }, [availableChannels]);

  // Per-channel metrics
  const channelMetrics = useMemo(() => {
    const metrics = new Map<string, { 
      total: number; 
      uploaded: number; 
      pending: number; 
      placementCount: number;
      progressPercent: number;
    }>();
    
    specsByChannel.forEach((specs, channel) => {
      const total = specs.length;
      const uploaded = specs.filter(s => uploadedAssets.get(s.specGroupId)?.uploadStatus === 'uploaded').length;
      const pending = specs.filter(s => {
        const asset = uploadedAssets.get(s.specGroupId);
        return asset && asset.uploadStatus !== 'uploaded';
      }).length;
      const placementCount = specs.reduce((sum, s) => sum + s.placementCount, 0);
      const progressPercent = total > 0 ? Math.round((uploaded / total) * 100) : 0;
      
      metrics.set(channel, { total, uploaded, pending, placementCount, progressPercent });
    });
    
    return metrics;
  }, [specsByChannel, uploadedAssets]);

  // Get specs for current channel (or all)
  const currentChannelSpecs = useMemo(() => {
    if (activeChannel === 'all') {
      return groupedSpecs;
    }
    return specsByChannel.get(activeChannel) || [];
  }, [activeChannel, groupedSpecs, specsByChannel]);

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

  // Enrich specs with status and apply sorting (filtered by current channel)
  const enrichedSpecs = useMemo<EnrichedSpec[]>(() => {
    const specs = currentChannelSpecs.map(spec => {
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
  }, [currentChannelSpecs, uploadedAssets, sortConfig]);

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
  
  // Find merge candidates for publication-specific specs
  const mergeCandidates = useMemo(() => {
    const candidates = new Map<string, GroupedCreativeRequirement[]>();
    
    groupedSpecs.forEach(spec => {
      if (spec.isPublicationSpecific) {
        // Find compatible specs to merge with
        const compatible = groupedSpecs.filter(otherSpec => {
          if (otherSpec.specGroupId === spec.specGroupId) return false;
          if (otherSpec.channel !== spec.channel) return false;
          
          // Check if dimensions match
          return dimensionsMatch(spec.originalDimensions || spec.dimensions, otherSpec.dimensions);
        });
        
        if (compatible.length > 0) {
          candidates.set(spec.specGroupId, compatible);
        }
      }
    });
    
    return candidates;
  }, [groupedSpecs]);

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

      // Generate content-based fingerprint for duplicate detection
      const getFileFingerprint = async (file: File): Promise<string> => {
        try {
          const chunkSize = 65536; // 64KB
          const chunk = file.slice(0, Math.min(chunkSize, file.size));
          const buffer = await chunk.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
          return `${file.size}-${hashHex}`;
        } catch (error) {
          return `${file.size}-${file.name}`;
        }
      };

      // Build set of existing fingerprints
      const existingFingerprints = new Map<string, string>();
      
      // Add fingerprints from pending files
      for (const [_, pending] of pendingFiles) {
        try {
          const fp = await getFileFingerprint(pending.file);
          existingFingerprints.set(fp, 'pending queue');
        } catch (e) { /* skip */ }
      }
      
      // Add fingerprints from matched/uploaded assets
      for (const [_, asset] of uploadedAssets) {
        if (asset.file) {
          try {
            const fp = await getFileFingerprint(asset.file);
            existingFingerprints.set(fp, asset.uploadStatus === 'uploaded' ? 'saved assets' : 'matched assets');
          } catch (e) { /* skip */ }
        }
      }
      
      // Track duplicates from ZIP
      const duplicateFiles: string[] = [];

      // Process each extracted file
      for (const processedFile of result.processedFiles) {
        // Check for duplicate content
        const fingerprint = await getFileFingerprint(processedFile.file);
        const existingLocation = existingFingerprints.get(fingerprint);
        if (existingLocation) {
          console.log(`[ZIP] Skipping duplicate: ${processedFile.fileName} (same content in ${existingLocation})`);
          duplicateFiles.push(processedFile.fileName);
          continue;
        }
        // Add to fingerprints to catch duplicates within the ZIP
        existingFingerprints.set(fingerprint, 'this ZIP');
        
        const fileId = `${processedFile.fileName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`\n[ZIP] Processing file: ${processedFile.fileName}`);
        console.log(`[ZIP] Detected specs:`, processedFile.detectedSpecs);
        
        // Use preview URL from ZIP processor, or create new one if missing
        let previewUrl = processedFile.previewUrl;
        if (!previewUrl && processedFile.file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(processedFile.file);
        }

        // Auto-match to spec groups (channel-aware when a specific channel is selected)
        const specsToMatch = activeChannel === 'all' ? groupedSpecs : currentChannelSpecs;
        const matches = autoMatchFileToSpecs(processedFile.detectedSpecs, specsToMatch);
        const bestMatch = matches.length > 0 ? matches[0] : null;
        const matchConfidence = bestMatch ? bestMatch.matchScore : 0;

        console.log(`[ZIP] Found ${matches.length} matches for ${processedFile.fileName} in ${activeChannel === 'all' ? 'all channels' : activeChannel}`);
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
      console.log(`[ZIP] Final: ${updatedAssets.size - uploadedAssets.size} files auto-assigned, ${newPendingFiles.size} pending, ${duplicateFiles.length} duplicates skipped`);
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
      
      // Show toast for skipped duplicates from ZIP
      if (duplicateFiles.length > 0) {
        toast({
          title: 'Duplicates skipped from ZIP',
          description: duplicateFiles.length === 1 
            ? `"${duplicateFiles[0]}" is already uploaded`
            : `${duplicateFiles.length} files already uploaded: ${duplicateFiles.slice(0, 3).join(', ')}${duplicateFiles.length > 3 ? '...' : ''}`,
          variant: 'default',
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
  }, [groupedSpecs, currentChannelSpecs, activeChannel, uploadedAssets, onAssetsChange, toast, pendingFiles]);

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
    
    // Generate content-based fingerprint for duplicate detection
    // Uses first 64KB of file + file size for fast, accurate detection
    const getFileFingerprint = async (file: File): Promise<string> => {
      try {
        const chunkSize = 65536; // 64KB - enough for accurate fingerprinting
        const chunk = file.slice(0, Math.min(chunkSize, file.size));
        const buffer = await chunk.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        // Use first 16 bytes of hash + file size for compact but unique fingerprint
        const hashHex = hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${file.size}-${hashHex}`;
      } catch (error) {
        // Fallback to name + size if crypto fails
        console.warn('[Fingerprint] Crypto API failed, falling back to name+size:', error);
        return `${file.size}-${file.name}`;
      }
    };
    
    // Build set of existing fingerprints from pending files and uploaded assets
    const existingFingerprints = new Map<string, string>(); // fingerprint -> location
    
    // Add fingerprints from pending files
    for (const [_, pending] of pendingFiles) {
      try {
        const fp = await getFileFingerprint(pending.file);
        existingFingerprints.set(fp, 'pending queue');
      } catch (e) {
        // Skip if we can't fingerprint
      }
    }
    
    // Add fingerprints from matched/uploaded assets (that still have file objects)
    for (const [_, asset] of uploadedAssets) {
      if (asset.file) {
        try {
          const fp = await getFileFingerprint(asset.file);
          existingFingerprints.set(fp, asset.uploadStatus === 'uploaded' ? 'saved assets' : 'matched assets');
        } catch (e) {
          // Skip if we can't fingerprint
        }
      }
    }
    
    console.log(`[Upload] Built fingerprint cache with ${existingFingerprints.size} existing files`);
    
    // Track duplicates to show single toast
    const duplicateFiles: string[] = [];
    
    for (const file of fileArray) {
      // Generate fingerprint for this file
      const fingerprint = await getFileFingerprint(file);
      
      // Check for duplicate content
      const existingLocation = existingFingerprints.get(fingerprint);
      if (existingLocation) {
        console.log(`[Upload] Skipping duplicate file: ${file.name} (same content already in ${existingLocation})`);
        duplicateFiles.push(file.name);
        continue;
      }
      
      // Add this file's fingerprint to prevent duplicates within same batch
      existingFingerprints.set(fingerprint, 'current batch');
      
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
        
        // Match against channel-specific requirements when a channel is selected
        const specsToMatch = activeChannel === 'all' ? groupedSpecs : currentChannelSpecs;
        const matches = autoMatchFileToSpecs(detectedSpecs, specsToMatch);
        console.log(`[File Matching] Found ${matches.length} potential matches for ${file.name} in ${activeChannel === 'all' ? 'all channels' : activeChannel}`);
        
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
        
        // Check if we have a recently split spec - prioritize auto-assigning to it
        // But only if it matches the current channel filter
        if (recentlySplitSpecId) {
          const splitSpec = groupedSpecs.find(g => g.specGroupId === recentlySplitSpecId);
          // Only auto-assign if on "all" tab OR the split spec's channel matches the active channel
          if (splitSpec && (activeChannel === 'all' || splitSpec.channel === activeChannel)) {
            console.log(`✅ Auto-assigning ${file.name} to recently split spec → ${recentlySplitSpecId}`);
            
            // Add to uploadedAssets
            const updatedAssets = new Map(uploadedAssets);
            updatedAssets.set(splitSpec.specGroupId, {
              specGroupId: splitSpec.specGroupId,
              file,
              previewUrl,
              uploadStatus: 'pending',
              appliesTo: splitSpec.placements.map(p => ({
                placementId: p.placementId,
                publicationId: p.publicationId,
                publicationName: p.publicationName
              }))
            });
            onAssetsChange(updatedAssets);
            
            // Clear the recently split spec ID
            setRecentlySplitSpecId(null);
            
            // Remove from pending files since it's auto-assigned
            setPendingFiles(prev => {
              const next = new Map(prev);
              next.delete(fileId);
              return next;
            });
            
            console.log(`   ✅ Successfully auto-assigned to split requirement!`);
            
            // Don't add to pending files
            continue;
          }
        }
        
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
    
    // Show toast for skipped duplicate files
    if (duplicateFiles.length > 0) {
      toast({
        title: 'Duplicate files skipped',
        description: duplicateFiles.length === 1 
          ? `"${duplicateFiles[0]}" is already uploaded`
          : `${duplicateFiles.length} files already uploaded: ${duplicateFiles.slice(0, 3).join(', ')}${duplicateFiles.length > 3 ? '...' : ''}`,
        variant: 'default',
      });
    }
  }, [groupedSpecs, currentChannelSpecs, activeChannel, uploadedAssets, onAssetsChange, handleZipFile, recentlySplitSpecId, pendingFiles, toast]);

  // Dropzone
  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop: (acceptedFiles) => handleFilesSelected(acceptedFiles),
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.tif', '.tiff'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.m4a'],  // For radio/podcast ads
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

    // Check if this is a digital channel that needs a click URL
    const isDigitalChannel = ['website', 'newsletter', 'streaming'].includes(specGroup.channel || '');
    
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
      // Include digital ad properties if available
      clickUrl: fileData.clickUrl,
      altText: fileData.altText,
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

    // Show toast with click URL reminder for digital channels
    if (isDigitalChannel && !fileData.clickUrl) {
      toast({
        title: 'Asset assigned',
        description: `${fileData.file.name} assigned to ${specGroup.placementCount} placements. Remember to add a click-through URL before uploading.`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Asset assigned',
        description: `${fileData.file.name} assigned to ${specGroup.placementCount} placements`,
      });
    }
  };

  // Upload pending assets to server
  const handleUploadAll = async () => {
    const pendingAssets = Array.from(uploadedAssets.entries())
      .filter(([_, asset]) => asset.uploadStatus === 'pending' && asset.file);

    if (pendingAssets.length === 0) return;

    setUploadProgress({ current: 0, total: pendingAssets.length });

    // Create a working copy of the assets map to accumulate all changes
    const workingAssetsMap = new Map(uploadedAssets);
    let successCount = 0;
    let errorCount = 0;

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
        
        // Include digital ad properties if available
        if (asset.clickUrl || asset.altText || asset.headline || asset.body || asset.ctaText) {
          formData.append('digitalAdProperties', JSON.stringify({
            clickUrl: asset.clickUrl,
            altText: asset.altText,
            headline: asset.headline,
            body: asset.body,
            ctaText: asset.ctaText,
          }));
        }

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

        // Update asset status in working map
        const updatedAsset: UploadedAssetWithSpecs = {
          ...asset,
          uploadStatus: 'uploaded',
          assetId: result.assetId,
          uploadedUrl: result.fileUrl,
          previewUrl: result.fileUrl,
        };

        workingAssetsMap.set(specGroupId, updatedAsset);
        successCount++;

      } catch (error) {
        console.error('Upload error:', error);
        
        const updatedAsset: UploadedAssetWithSpecs = {
          ...asset,
          uploadStatus: 'error',
          errorMessage: 'Upload failed',
        };

        workingAssetsMap.set(specGroupId, updatedAsset);
        errorCount++;
      }

      setUploadProgress({ current: i + 1, total: pendingAssets.length });
    }

    // Update state once with all changes
    onAssetsChange(workingAssetsMap);

    setUploadProgress(null);
    
    if (errorCount > 0) {
      toast({
        title: 'Upload complete with errors',
        description: `${successCount} uploaded successfully, ${errorCount} failed`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Upload complete',
        description: `${successCount} assets uploaded successfully`,
      });
    }
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
  
  // Handle split click
  const handleSplitClick = (specGroupId: string, publicationId: number, publicationName: string) => {
    setSplitTarget({ specGroupId, publicationId, publicationName });
    setSplitDialogOpen(true);
  };
  
  // Handle split publication
  const handleSplitPublication = () => {
    if (!splitTarget) return;
    
    const { specGroupId, publicationId, publicationName } = splitTarget;
    
    // Find the spec group
    const specGroup = groupedSpecs.find(g => g.specGroupId === specGroupId);
    if (!specGroup) {
      toast({
        title: 'Error',
        description: 'Could not find requirement to split',
        variant: 'destructive',
      });
      return;
    }
    
    // Filter placements for this publication
    const publicationPlacements = specGroup.placements.filter(
      p => p.publicationId === publicationId
    );
    
    if (publicationPlacements.length === 0) {
      toast({
        title: 'Error',
        description: 'No placements found for this publication',
        variant: 'destructive',
      });
      return;
    }
    
    // Create new publication-specific spec group ID
    const newSpecGroupId = `${specGroupId}::pub:${publicationId}`;
    
    // Create new grouped requirement for this publication only
    const newSpecGroup: GroupedCreativeRequirement = {
      ...specGroup,
      specGroupId: newSpecGroupId,
      placements: publicationPlacements,
      placementCount: publicationPlacements.length,
      publicationCount: 1,
      isPublicationSpecific: true,
      originalGroupId: specGroupId,
      originalDimensions: specGroup.dimensions,
    };
    
    // Update the original group to remove this publication's placements
    const updatedOriginalGroup: GroupedCreativeRequirement = {
      ...specGroup,
      placements: specGroup.placements.filter(p => p.publicationId !== publicationId),
      placementCount: specGroup.placementCount - publicationPlacements.length,
      publicationCount: specGroup.publicationCount - 1,
    };
    
    // Add the new spec to custom groups
    setCustomSpecGroups(prev => {
      const next = new Map(prev);
      next.set(newSpecGroupId, newSpecGroup);
      return next;
    });
    
    // Store the newly split spec ID for auto-assignment
    setRecentlySplitSpecId(newSpecGroupId);
    
    setSplitDialogOpen(false);
    setSplitTarget(null);
    
    toast({
      title: 'Requirement Split',
      description: `Created separate requirement for ${publicationName}. You can now upload a different creative.`,
    });
    
    // Open file dialog after a short delay
    setTimeout(() => {
      openFileDialog();
    }, 500);
  };
  
  // Handle merge request
  const handleMergeClick = (sourceSpecId: string) => {
    setMergeSource(sourceSpecId);
    setMergeSelectionOpen(true);
  };
  
  // Handle merge target selection
  const handleMergeTargetSelected = (targetSpecId: string) => {
    setMergeTarget(targetSpecId);
    setMergeSelectionOpen(false);
    
    // Check if both have assets
    const sourceAsset = uploadedAssets.get(mergeSource!);
    const targetAsset = uploadedAssets.get(targetSpecId);
    
    if (sourceAsset?.uploadStatus === 'uploaded' && targetAsset?.uploadStatus === 'uploaded') {
      // Both have assets, need to choose which to keep
      setMergeAssetSelectionOpen(true);
    } else {
      // One or both don't have assets, just merge
      handleMergeRequirements(mergeSource!, targetSpecId, sourceAsset ? 'source' : 'target');
    }
  };
  
  // Handle merge requirements
  const handleMergeRequirements = async (sourceSpecId: string, targetSpecId: string, keepAssetFrom: 'source' | 'target') => {
    const sourceSpec = groupedSpecs.find(g => g.specGroupId === sourceSpecId);
    const targetSpec = groupedSpecs.find(g => g.specGroupId === targetSpecId);
    
    if (!sourceSpec || !targetSpec) {
      toast({
        title: 'Error',
        description: 'Could not find requirements to merge',
        variant: 'destructive',
      });
      return;
    }
    
    // Combine placements
    const combinedPlacements = [...targetSpec.placements, ...sourceSpec.placements];
    const uniquePublications = new Set(combinedPlacements.map(p => p.publicationId));
    
    // Handle assets
    const sourceAsset = uploadedAssets.get(sourceSpecId);
    const targetAsset = uploadedAssets.get(targetSpecId);
    
    // Delete the asset we're not keeping (if uploaded to server)
    if (keepAssetFrom === 'source' && targetAsset?.assetId) {
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`${API_BASE_URL}/creative-assets/${targetAsset.assetId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Error deleting target asset:', error);
      }
    } else if (keepAssetFrom === 'target' && sourceAsset?.assetId) {
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`${API_BASE_URL}/creative-assets/${sourceAsset.assetId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Error deleting source asset:', error);
      }
    }
    
    // Update assets map
    const newAssetsMap = new Map(uploadedAssets);
    
    if (keepAssetFrom === 'source' && sourceAsset) {
      // Move source asset to target spec ID
      newAssetsMap.set(targetSpecId, {
        ...sourceAsset,
        specGroupId: targetSpecId,
        appliesTo: combinedPlacements.map(p => ({
          placementId: p.placementId,
          publicationId: p.publicationId,
          publicationName: p.publicationName,
        })),
      });
      newAssetsMap.delete(sourceSpecId);
    } else if (keepAssetFrom === 'target' && targetAsset) {
      // Update target asset with combined placements
      newAssetsMap.set(targetSpecId, {
        ...targetAsset,
        appliesTo: combinedPlacements.map(p => ({
          placementId: p.placementId,
          publicationId: p.publicationId,
          publicationName: p.publicationName,
        })),
      });
      if (sourceAsset) {
        newAssetsMap.delete(sourceSpecId);
      }
    }
    
    onAssetsChange(newAssetsMap);
    
    // Remove source from custom groups if it was a split
    if (sourceSpec.isPublicationSpecific) {
      setCustomSpecGroups(prev => {
        const next = new Map(prev);
        next.delete(sourceSpecId);
        return next;
      });
    }
    
    // Close dialogs and reset state
    setMergeAssetSelectionOpen(false);
    setMergeSource(null);
    setMergeTarget(null);
    setSelectedAssetToKeep(null);
    
    toast({
      title: 'Requirements Merged',
      description: `Successfully merged ${sourceSpec.placementCount} placements into main requirement`,
    });
  };

  // Get current channel config for upload zone messaging
  const currentChannelConfig = activeChannel !== 'all' ? channelConfig[activeChannel] : null;

  return (
    <>
      <div className="space-y-6">
        {/* ==================== CHANNEL TABS (PILL STYLE) ==================== */}
        <div className="flex gap-2">
          {/* All Channels Tab */}
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeChannel === 'all' 
                ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                : 'border border-transparent'
            }`}
            style={activeChannel !== 'all' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
            onClick={() => setActiveChannel('all')}
          >
            All ({metrics.uploaded}/{metrics.totalRequired})
          </button>
          
          {/* Per-Channel Tabs */}
          {availableChannels.map(channel => {
            const config = channelConfig[channel];
            const channelMet = channelMetrics.get(channel);
            
            return (
              <button 
                key={channel}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeChannel === channel 
                    ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                    : 'border border-transparent'
                }`}
                style={activeChannel !== channel ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
                onClick={() => setActiveChannel(channel)}
              >
                {config?.label || channel} ({channelMet?.uploaded || 0}/{channelMet?.total || 0})
              </button>
            );
          })}
        </div>

        {/* ==================== UPPER SECTION: 2 COLUMNS ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: Progress Indicator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium font-sans flex items-center gap-2">
                {currentChannelConfig && <span>{currentChannelConfig.icon}</span>}
                {activeChannel === 'all' ? 'Overall Progress' : `${currentChannelConfig?.label || activeChannel} Progress`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingExisting ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading assets...</span>
                </div>
              ) : (
                <>
                  {/* Main progress stats - show channel-specific or overall */}
                  {activeChannel === 'all' ? (
                    <>
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
                      <Progress value={metrics.progressPercent} className="h-2" />
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          Covering <span className="font-medium text-foreground">{metrics.placementsCovered}</span> of {metrics.totalPlacements} placements 
                          across <span className="font-medium text-foreground">{metrics.uniquePublications}</span> publications
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const channelMet = channelMetrics.get(activeChannel);
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-2xl font-bold">
                                  {channelMet?.uploaded || 0}/{channelMet?.total || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {currentChannelConfig?.label} assets uploaded
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{channelMet?.progressPercent || 0}%</p>
                                <p className="text-sm text-muted-foreground">Complete</p>
                              </div>
                            </div>
                            <Progress value={channelMet?.progressPercent || 0} className="h-2" />
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground">
                                Covering <span className="font-medium text-foreground">{channelMet?.placementCount || 0}</span> placements
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}

                  {/* Status breakdown */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{activeChannel === 'all' ? metrics.uploaded : channelMetrics.get(activeChannel)?.uploaded || 0} uploaded</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Circle className="h-4 w-4 text-blue-600 fill-blue-600" />
                      <span>{activeChannel === 'all' ? metrics.pending : channelMetrics.get(activeChannel)?.pending || 0} pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span>{activeChannel === 'all' ? metrics.missing : ((channelMetrics.get(activeChannel)?.total || 0) - (channelMetrics.get(activeChannel)?.uploaded || 0) - (channelMetrics.get(activeChannel)?.pending || 0))} missing</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Upload Zone - Channel-aware */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium font-sans flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {activeChannel === 'all' ? 'Upload Creative Assets' : `Upload ${currentChannelConfig?.label} Assets`}
              </CardTitle>
              {currentChannelConfig && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentChannelConfig.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                data-upload-zone
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors bg-white ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-white'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {isDragActive 
                    ? `Drop ${activeChannel === 'all' ? 'files' : currentChannelConfig?.label.toLowerCase() + ' assets'} here`
                    : 'Drag & drop files or click to browse'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeChannel === 'all' 
                    ? 'Images, videos, PDFs, ZIP, audio (MP3, WAV), text files'
                    : `Accepts: ${currentChannelConfig?.acceptedTypes || 'All file types'}`
                  }
                </p>
                {activeChannel !== 'all' && (
                  <p className="text-xs text-primary mt-2">
                    Files will be matched to {currentChannelConfig?.label.toLowerCase()} requirements
                  </p>
                )}
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

              {/* Batch Click URL for digital channels */}
              {['website', 'newsletter', 'streaming'].includes(activeChannel) && pendingFiles.size > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Click-Through URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      placeholder="https://advertiser.com/landing-page"
                      className="h-8 text-sm flex-1"
                      value={batchClickUrl}
                      onChange={(e) => setBatchClickUrl(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!batchClickUrl.trim()}
                      onClick={() => {
                        if (!batchClickUrl.trim()) return;
                        setPendingFiles(prev => {
                          const next = new Map(prev);
                          next.forEach((fileData, id) => {
                            next.set(id, { ...fileData, clickUrl: batchClickUrl.trim() });
                          });
                          return next;
                        });
                        toast({
                          title: 'Click URL Applied',
                          description: `Applied to ${pendingFiles.size} pending file${pendingFiles.size !== 1 ? 's' : ''}`,
                        });
                      }}
                    >
                      Apply to All ({pendingFiles.size})
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Enter a URL and click "Apply to All" to set the same click-through URL for all pending files. You can edit individual URLs below.
                  </p>
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
                      
                      {/* Assignment dropdown - filtered by active channel tab */}
                      {!fileData.isAnalyzing && (
                        <div className="pl-6 space-y-2">
                          <Select onValueChange={(value) => handleAssignToSpec(id, value)}>
                            <SelectTrigger className="h-8 w-full text-xs">
                              <SelectValue placeholder={activeChannel === 'all' ? "Assign to..." : `Assign to ${channelConfig[activeChannel]?.label || activeChannel}...`} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {(() => {
                                // Use channel-filtered specs when a specific channel is selected
                                const specsToShow = activeChannel === 'all' ? groupedSpecs : currentChannelSpecs;
                                
                                // Group specs by channel
                                const byChannel = specsToShow.reduce((acc, spec) => {
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
                                
                                if (sortedChannels.length === 0) {
                                  return (
                                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                      No {activeChannel !== 'all' ? channelConfig[activeChannel]?.label.toLowerCase() : ''} requirements available
                                    </div>
                                  );
                                }
                                
                                return sortedChannels.map(channel => (
                                  <div key={channel}>
                                    {/* Only show channel header when viewing all channels */}
                                    {activeChannel === 'all' && (
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase bg-muted/50 sticky top-0">
                                        {channel} ({byChannel[channel].length})
                                      </div>
                                    )}
                                    {byChannel[channel].map((spec) => (
                                      <SelectItem key={spec.specGroupId} value={spec.specGroupId}>
                                        {/* Show audio-specific format for radio/podcast */}
                                        {(spec.channel === 'radio' || spec.channel === 'podcast')
                                          ? formatAudioSpec(spec)
                                          : formatDimensions(spec.dimensions, spec.channel, spec.fileFormats)
                                        }
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
                          
                          {/* Click URL input for digital channels */}
                          {['website', 'newsletter', 'streaming'].includes(activeChannel) && (
                            <div className="flex items-center gap-2">
                              {fileData.clickUrl ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                              ) : (
                                <Link className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <Input
                                type="url"
                                placeholder="Click-through URL (required)"
                                className={`h-7 text-xs ${fileData.clickUrl ? 'border-green-300 bg-green-50/50' : ''}`}
                                value={fileData.clickUrl || ''}
                                onChange={(e) => {
                                  setPendingFiles(prev => {
                                    const next = new Map(prev);
                                    const existing = next.get(id);
                                    if (existing) {
                                      next.set(id, { ...existing, clickUrl: e.target.value });
                                    }
                                    return next;
                                  });
                                }}
                              />
                              {fileData.clickUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => window.open(fileData.clickUrl, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button - always visible for clarity */}
              <div className="mt-4">
                <Button
                  onClick={handleUploadAll}
                  className="w-full"
                  disabled={uploadProgress !== null || pendingUploadCount === 0}
                  variant={pendingUploadCount > 0 ? "default" : "outline"}
                >
                  {uploadProgress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading {uploadProgress.current}/{uploadProgress.total}...
                    </>
                  ) : pendingUploadCount > 0 ? (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Save All to Server ({pendingUploadCount})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      All Assets Saved
                    </>
                  )}
                </Button>
                {pendingUploadCount > 0 && (
                  <p className="text-xs text-center text-amber-600 mt-2">
                    {pendingUploadCount} asset{pendingUploadCount !== 1 ? 's' : ''} ready to save
                  </p>
                )}
              </div>
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
                    <TableHead className={activeChannel === 'all' ? "w-[30%]" : "w-[40%]"}>
                      <button
                        type="button"
                        onClick={() => handleSort('requirement')}
                        className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      >
                        Requirement
                        {renderSortIcon('requirement')}
                      </button>
                    </TableHead>
                    {activeChannel === 'all' && (
                      <TableHead className="w-[15%]">
                        <button
                          type="button"
                          onClick={() => handleSort('channel')}
                          className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                        >
                          Channel
                          {renderSortIcon('channel')}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className={activeChannel === 'all' ? "w-[40%]" : "w-[45%]"}>
                      <button
                        type="button"
                        onClick={() => handleSort('coverage')}
                        className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                      >
                        Coverage
                        {renderSortIcon('coverage')}
                      </button>
                    </TableHead>
                    <TableHead className="w-[15%] text-right">
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
                    <TableCell colSpan={activeChannel === 'all' ? 5 : 4} className="text-center py-8 text-muted-foreground">
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
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {/* Show audio-specific format for radio/podcast, dimensions for others */}
                                {(spec.channel === 'radio' || spec.channel === 'podcast')
                                  ? formatAudioSpec(spec)
                                  : formatDimensions(spec.dimensions, spec.channel, spec.fileFormats)
                                }
                              </span>
                              {spec.isPublicationSpecific && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="h-5 px-1.5 bg-gray-50 text-gray-600 border-gray-300">
                                        <GitBranch className="h-3 w-3" />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Separate creative for {spec.placements[0]?.publicationName}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            {spec.fileFormats && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {spec.fileFormats.join(', ').toUpperCase()}
                              </p>
                            )}
                          </TableCell>
                          {activeChannel === 'all' && (
                            <TableCell>
                              <Badge variant="outline" className="capitalize font-normal">
                                {spec.channel}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-sm">
                            <span className="font-medium">{spec.placementCount}</span>
                            <span className="text-muted-foreground"> placements across </span>
                            <span className="font-medium">{spec.publicationCount}</span>
                            <span className="text-muted-foreground"> publication{spec.publicationCount !== 1 ? 's' : ''}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusBadge status={spec.status} />
                          </TableCell>
                        </TableRow>

                        {/* Expanded Content Row */}
                        {isExpanded && (
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableCell colSpan={activeChannel === 'all' ? 5 : 4} className="p-0">
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
                                          
                                          {/* Click URL for digital placements */}
                                          {['website', 'newsletter', 'streaming'].includes(spec.channel || '') && (
                                            <div className="pt-2 space-y-1">
                                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Link className="h-3 w-3" />
                                                Click-Through URL
                                              </Label>
                                              <div className="flex items-center gap-1">
                                                <Input
                                                  type="url"
                                                  placeholder="https://advertiser.com/landing"
                                                  className="h-7 text-xs flex-1"
                                                  value={asset.clickUrl || ''}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) => {
                                                    const newAssetsMap = new Map(uploadedAssets);
                                                    const existingAsset = newAssetsMap.get(spec.specGroupId);
                                                    if (existingAsset) {
                                                      newAssetsMap.set(spec.specGroupId, {
                                                        ...existingAsset,
                                                        clickUrl: e.target.value
                                                      });
                                                      onAssetsChange(newAssetsMap);
                                                    }
                                                  }}
                                                />
                                                {asset.clickUrl && (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.open(asset.clickUrl, '_blank');
                                                    }}
                                                  >
                                                    <ExternalLink className="h-3 w-3" />
                                                  </Button>
                                                )}
                                              </div>
                                              {!asset.clickUrl && (
                                                <p className="text-xs text-amber-600">
                                                  ⚠️ Required for tracking scripts
                                                </p>
                                              )}
                                            </div>
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
                                      <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100">
                                          <Upload className="h-6 w-6 text-orange-600" />
                                        </div>
                                        <div className="text-center">
                                          <p className="text-sm font-medium mb-1">No file attached</p>
                                          <p className="text-xs text-muted-foreground">Upload a creative asset for this requirement</p>
                                        </div>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openFileDialog();
                                          }}
                                          className="mt-2"
                                        >
                                          <Upload className="h-4 w-4 mr-2" />
                                          Attach File
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* RIGHT: Placements by Publication */}
                                  <div className="lg:col-span-2">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-xs font-medium font-sans text-muted-foreground uppercase tracking-wide">
                                        Placements ({spec.placementCount})
                                      </h4>
                                      {spec.isPublicationSpecific && mergeCandidates.has(spec.specGroupId) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs hover:bg-transparent"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMergeClick(spec.specGroupId);
                                          }}
                                        >
                                          <Merge className="h-3 w-3 mr-1.5" />
                                          Re-merge Requirement
                                        </Button>
                                      )}
                                    </div>
                                    <div className="border rounded-lg overflow-hidden bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/50">
                                            <TableHead className="w-[35%]">Publication</TableHead>
                                            <TableHead className="w-[50%]">Placements</TableHead>
                                            <TableHead className="w-[15%] text-right">Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {placementsByPub.map(([pubId, pubData]) => (
                                            <TableRow key={pubId} className="group hover:bg-muted/30">
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium">{pubData.name}</span>
                                                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                                    {pubData.placements.length}
                                                  </Badge>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {pubData.placements.map((placementName, idx) => (
                                                    <span 
                                                      key={idx}
                                                      className="text-xs bg-muted px-2 py-1 rounded"
                                                    >
                                                      {placementName}
                                                    </span>
                                                  ))}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {spec.publicationCount > 1 && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleSplitClick(spec.specGroupId, pubId, pubData.name);
                                                    }}
                                                  >
                                                    Duplicate & Exclude
                                                  </Button>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
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

      {/* Split Confirmation Modal */}
      <AlertDialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Publication-Specific Requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              {splitTarget && (
                <>
                  <p className="mb-2">
                    This will create a separate requirement for <strong>{splitTarget.publicationName}</strong> with the same specifications.
                  </p>
                  <p className="mb-2">
                    You'll be able to upload a different creative (e.g., Spanish version) specifically for this publication, 
                    while other publications continue to use the main creative.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can re-merge these requirements later if needed.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSplitPublication}>
              Create Separate Requirement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Selection Modal */}
      <Dialog open={mergeSelectionOpen} onOpenChange={setMergeSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Requirement to Merge With</DialogTitle>
            <DialogDescription>
              Choose which requirement to merge this publication-specific creative back into.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {mergeSource && mergeCandidates.get(mergeSource)?.map((candidate) => {
              const asset = uploadedAssets.get(candidate.specGroupId);
              return (
                <button
                  key={candidate.specGroupId}
                  onClick={() => handleMergeTargetSelected(candidate.specGroupId)}
                  className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {formatDimensions(candidate.dimensions, candidate.channel, candidate.fileFormats)}
                        </span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {candidate.channel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {candidate.placementCount} placements across {candidate.publicationCount} publications
                      </p>
                      {asset && (
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">Has uploaded asset: {asset.file?.name || asset.fileName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Asset Selection Modal */}
      <AlertDialog open={mergeAssetSelectionOpen} onOpenChange={setMergeAssetSelectionOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Choose Which Asset to Keep</AlertDialogTitle>
            <AlertDialogDescription>
              Both requirements have uploaded assets. Select which creative to keep after merging.
              The other asset will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {mergeSource && mergeTarget && (
            <RadioGroup value={selectedAssetToKeep || ''} onValueChange={(val) => setSelectedAssetToKeep(val as 'source' | 'target')}>
              <div className="grid grid-cols-2 gap-4">
                {/* Source Asset */}
                <div className={`relative border-2 rounded-lg p-4 ${selectedAssetToKeep === 'source' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <RadioGroupItem value="source" id="source-asset" />
                    <Label htmlFor="source-asset" className="text-sm font-medium cursor-pointer">
                      Publication-Specific Creative
                    </Label>
                  </div>
                  {(() => {
                    const asset = uploadedAssets.get(mergeSource);
                    const spec = groupedSpecs.find(s => s.specGroupId === mergeSource);
                    return asset && spec ? (
                      <div className="ml-6">
                        {asset.previewUrl && !asset.detectedSpecs?.isTextAsset ? (
                          <img 
                            src={asset.previewUrl} 
                            alt="Source asset"
                            className="w-full h-32 object-contain rounded border bg-muted mb-2"
                          />
                        ) : asset.detectedSpecs?.isTextAsset ? (
                          <div className="w-full h-32 rounded border bg-amber-50 flex items-center justify-center mb-2">
                            <FileText className="h-12 w-12 text-amber-600" />
                          </div>
                        ) : null}
                        <p className="text-sm font-medium truncate">{asset.file?.name || asset.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          For {spec.placements[0]?.publicationName} only
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Target Asset */}
                <div className={`relative border-2 rounded-lg p-4 ${selectedAssetToKeep === 'target' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <RadioGroupItem value="target" id="target-asset" />
                    <Label htmlFor="target-asset" className="text-sm font-medium cursor-pointer">
                      Main Creative
                    </Label>
                  </div>
                  {(() => {
                    const asset = uploadedAssets.get(mergeTarget);
                    const spec = groupedSpecs.find(s => s.specGroupId === mergeTarget);
                    return asset && spec ? (
                      <div className="ml-6">
                        {asset.previewUrl && !asset.detectedSpecs?.isTextAsset ? (
                          <img 
                            src={asset.previewUrl} 
                            alt="Target asset"
                            className="w-full h-32 object-contain rounded border bg-muted mb-2"
                          />
                        ) : asset.detectedSpecs?.isTextAsset ? (
                          <div className="w-full h-32 rounded border bg-amber-50 flex items-center justify-center mb-2">
                            <FileText className="h-12 w-12 text-amber-600" />
                          </div>
                        ) : null}
                        <p className="text-sm font-medium truncate">{asset.file?.name || asset.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          For {spec.publicationCount} publications
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </RadioGroup>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedAssetToKeep(null);
              setMergeSource(null);
              setMergeTarget(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedAssetToKeep}
              onClick={() => {
                if (mergeSource && mergeTarget && selectedAssetToKeep) {
                  handleMergeRequirements(mergeSource, mergeTarget, selectedAssetToKeep);
                }
              }}
            >
              Merge and Keep Selected
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

