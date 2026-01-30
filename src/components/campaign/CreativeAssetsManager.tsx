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
  DialogFooter,
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
  RefreshCw,
  Download,
  Eye,
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

interface CampaignInfo {
  name?: string;
  advertiserName?: string;
  startDate?: string;
  endDate?: string;
}

interface CreativeAssetsManagerProps {
  requirements: CreativeRequirement[];
  uploadedAssets: Map<string, UploadedAssetWithSpecs>;
  onAssetsChange: (assets: Map<string, UploadedAssetWithSpecs>) => void;
  campaignId?: string;
  campaignInfo?: CampaignInfo;
  hasOrders?: boolean; // True when insertion orders exist - locks assets from removal
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
 * Get recommended specifications based on channel type
 */
function getChannelRecommendedSpecs(channel: string): {
  formats: string;
  colorSpace: string;
  resolution: string;
  maxSize: string;
  notes: string;
} {
  const channelLower = (channel || '').toLowerCase();
  
  switch (channelLower) {
    case 'website':
      return {
        formats: 'PNG, JPG, GIF, WebP',
        colorSpace: 'RGB',
        resolution: '72 DPI',
        maxSize: '150KB - 500KB',
        notes: 'PNG for graphics/transparency, JPG for photos, GIF for animation. Optimize for fast load times.'
      };
    case 'newsletter':
      return {
        formats: 'PNG, JPG, GIF',
        colorSpace: 'RGB',
        resolution: '72 DPI',
        maxSize: '100KB - 200KB',
        notes: 'Keep file sizes small for email delivery. Avoid SVG (not supported in most email clients). Use JPG for photos, PNG for graphics.'
      };
    case 'print':
      return {
        formats: 'PDF, TIFF, EPS',
        colorSpace: 'CMYK',
        resolution: '300 DPI minimum',
        maxSize: 'No limit',
        notes: 'High-resolution required. Include bleed (typically 0.125" or 0.25"). Convert all fonts to outlines.'
      };
    case 'radio':
      return {
        formats: 'MP3, WAV',
        colorSpace: 'N/A',
        resolution: 'N/A',
        maxSize: '10MB',
        notes: 'MP3: 128-320kbps. WAV: 16-bit, 44.1kHz. Include 0.5s silence at start/end.'
      };
    case 'podcast':
      return {
        formats: 'MP3, WAV',
        colorSpace: 'N/A',
        resolution: 'N/A',
        maxSize: '10MB',
        notes: 'MP3: 128-192kbps recommended. Match podcast audio quality. Host-read spots: provide script instead.'
      };
    case 'streaming':
      return {
        formats: 'MP4, MOV, PNG, JPG',
        colorSpace: 'RGB',
        resolution: '72-150 DPI',
        maxSize: '50MB for video',
        notes: 'Video: H.264 codec, 1080p preferred. Static: same as website specs.'
      };
    case 'social':
      return {
        formats: 'PNG, JPG, MP4',
        colorSpace: 'RGB',
        resolution: '72 DPI',
        maxSize: '8MB image, 512MB video',
        notes: 'Platform-specific sizes vary. Square (1:1) or vertical (4:5, 9:16) often perform best.'
      };
    case 'events':
      return {
        formats: 'PDF, PNG, JPG',
        colorSpace: 'RGB or CMYK',
        resolution: '150-300 DPI',
        maxSize: 'Varies',
        notes: 'Digital signage: RGB. Printed materials: CMYK, 300 DPI with bleed.'
      };
    default:
      return {
        formats: 'PNG, JPG, PDF',
        colorSpace: 'RGB',
        resolution: '72-300 DPI',
        maxSize: 'Varies',
        notes: 'Contact for specific requirements.'
      };
  }
}

/**
 * Group requirements by channel and dimensions for CSV export
 * Returns unique asset specs with list of publications that need each
 */
interface GroupedAssetSpec {
  channel: string;
  dimensions: string;
  fileFormats: string;
  maxFileSize: string;
  colorSpace: string;
  resolution: string;
  duration: string;
  bleed: string;
  trim: string;
  publications: string[];
  placementNames: string[];
  placementCount: number;
  additionalNotes: string[];
}

function groupRequirementsForCSV(requirements: CreativeRequirement[]): GroupedAssetSpec[] {
  const groupsMap = new Map<string, GroupedAssetSpec>();
  
  requirements.forEach(req => {
    const channel = (req.channel || 'general').toLowerCase();
    const dimensions = Array.isArray(req.dimensions) 
      ? req.dimensions.sort().join(', ') 
      : req.dimensions || 'Not specified';
    
    // Create a unique key for grouping: channel + dimensions + duration (for audio)
    const groupKey = `${channel}::${dimensions}::${req.duration || ''}`;
    
    let group = groupsMap.get(groupKey);
    
    if (!group) {
      const recommendedSpecs = getChannelRecommendedSpecs(channel);
      const fileFormats = req.fileFormats?.join(', ') || '';
      
      group = {
        channel,
        dimensions,
        fileFormats: fileFormats || recommendedSpecs.formats,
        maxFileSize: req.maxFileSize || recommendedSpecs.maxSize,
        colorSpace: req.colorSpace || recommendedSpecs.colorSpace,
        resolution: req.resolution || recommendedSpecs.resolution,
        duration: req.duration ? String(req.duration) : '',
        bleed: req.bleed || '',
        trim: req.trim || '',
        publications: [],
        placementNames: [],
        placementCount: 0,
        additionalNotes: [],
      };
      groupsMap.set(groupKey, group);
    }
    
    // Add publication if not already in list
    if (req.publicationName && !group.publications.includes(req.publicationName)) {
      group.publications.push(req.publicationName);
    }
    
    // Add placement name if not already in list
    if (req.placementName && !group.placementNames.includes(req.placementName)) {
      group.placementNames.push(req.placementName);
    }
    
    // Add additional notes if present and unique
    if (req.additionalRequirements && !group.additionalNotes.includes(req.additionalRequirements)) {
      group.additionalNotes.push(req.additionalRequirements);
    }
    
    group.placementCount++;
  });
  
  // Convert to array and sort by frequency (most placements first), then by channel
  const channelOrder = ['website', 'newsletter', 'print', 'radio', 'podcast', 'streaming', 'social', 'events'];
  
  return Array.from(groupsMap.values()).sort((a, b) => {
    // Primary sort: by placement count (descending - most frequent first)
    if (b.placementCount !== a.placementCount) {
      return b.placementCount - a.placementCount;
    }
    
    // Secondary sort: by channel order
    const aIdx = channelOrder.indexOf(a.channel);
    const bIdx = channelOrder.indexOf(b.channel);
    const aOrder = aIdx === -1 ? 999 : aIdx;
    const bOrder = bIdx === -1 ? 999 : bIdx;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Tertiary sort: by dimensions
    return a.dimensions.localeCompare(b.dimensions);
  });
}

/**
 * Generate CSV content for creative asset specifications
 * Lists each placement individually with publication name
 */
function generateSpecSheetCSV(requirements: CreativeRequirement[], campaignInfo?: CampaignInfo): string {
  const rows: string[][] = [];
  
  // Campaign Info Header Section
  rows.push(['CREATIVE ASSET SPECIFICATIONS']);
  rows.push([]);
  
  if (campaignInfo) {
    if (campaignInfo.name) {
      rows.push(['Campaign Name:', campaignInfo.name]);
    }
    if (campaignInfo.advertiserName) {
      rows.push(['Advertiser:', campaignInfo.advertiserName]);
    }
    if (campaignInfo.startDate) {
      const startDate = new Date(campaignInfo.startDate);
      rows.push(['Start Date:', startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })]);
    }
    if (campaignInfo.endDate) {
      const endDate = new Date(campaignInfo.endDate);
      rows.push(['End Date:', endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })]);
    }
  }
  
  rows.push(['Total Placements:', String(requirements.length)]);
  rows.push([]);
  rows.push(['Generated:', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })]);
  rows.push([]);
  rows.push([]);
  
  // CSV Header for asset table - one row per placement
  rows.push([
    'Publication Name',
    'Inventory Type',
    'Dimensions / Size',
    'Accepted Formats',
    'Color Space',
    'Resolution',
    'Duration (sec)'
  ]);

  // Sort requirements by publication name, then by channel
  const channelOrder = ['website', 'newsletter', 'print', 'radio', 'podcast', 'streaming', 'social', 'events'];
  const sortedRequirements = [...requirements].sort((a, b) => {
    // Primary sort: by publication name
    const pubCompare = (a.publicationName || '').localeCompare(b.publicationName || '');
    if (pubCompare !== 0) return pubCompare;
    
    // Secondary sort: by channel order
    const aChannelIdx = channelOrder.indexOf((a.channel || '').toLowerCase());
    const bChannelIdx = channelOrder.indexOf((b.channel || '').toLowerCase());
    const aOrder = aChannelIdx === -1 ? 999 : aChannelIdx;
    const bOrder = bChannelIdx === -1 ? 999 : bChannelIdx;
    return aOrder - bOrder;
  });

  // Add rows for each placement
  sortedRequirements.forEach((req) => {
    const channel = (req.channel || 'general').toLowerCase();
    const recommendedSpecs = getChannelRecommendedSpecs(channel);
    const dimensions = Array.isArray(req.dimensions) 
      ? req.dimensions.join(', ') 
      : (req.dimensions || '');
    
    rows.push([
      req.publicationName || '',
      capitalizeFirst(channel),
      dimensions,
      req.fileFormats?.join(', ') || recommendedSpecs.formats,
      req.colorSpace || recommendedSpecs.colorSpace,
      req.resolution || recommendedSpecs.resolution,
      req.duration ? String(req.duration) : ''
    ]);
  });

  // Add summary by channel
  rows.push([]);
  rows.push([]);
  rows.push(['SUMMARY BY INVENTORY TYPE']);
  rows.push([]);
  
  const channelSummary = new Map<string, number>();
  
  requirements.forEach(req => {
    const channel = (req.channel || 'general').toLowerCase();
    channelSummary.set(channel, (channelSummary.get(channel) || 0) + 1);
  });
  
  const sortedChannels = Array.from(channelSummary.keys()).sort((a, b) => {
    const aIdx = channelOrder.indexOf(a);
    const bIdx = channelOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
  
  rows.push(['Inventory Type', 'Placements']);
  sortedChannels.forEach(channel => {
    const count = channelSummary.get(channel)!;
    rows.push([capitalizeFirst(channel), String(count)]);
  });

  // Add format guidelines section at the bottom
  rows.push([]);
  rows.push([]);
  rows.push(['FORMAT GUIDELINES BY INVENTORY TYPE']);
  rows.push([]);
  
  sortedChannels.forEach(channel => {
    const specs = getChannelRecommendedSpecs(channel);
    rows.push([capitalizeFirst(channel)]);
    rows.push(['  Recommended Formats:', specs.formats]);
    rows.push(['  Color Space:', specs.colorSpace]);
    rows.push(['  Resolution:', specs.resolution]);
    rows.push(['  Max File Size:', specs.maxSize]);
    rows.push(['  Notes:', specs.notes]);
    rows.push([]);
  });

  // Convert to CSV string with proper escaping
  return rows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if cell contains comma, quote, or newline
      const escaped = String(cell).replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(',')
  ).join('\n');
}

/**
 * Helper function for CSV generation
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sanitize string for use in filename (remove special characters)
 */
function sanitizeForFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .toLowerCase()
    .substring(0, 50); // Limit length
}

/**
 * Download the spec sheet as a CSV file
 */
function downloadSpecSheet(requirements: CreativeRequirement[], campaignId?: string, campaignInfo?: CampaignInfo): void {
  const csv = generateSpecSheetCSV(requirements, campaignInfo);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Generate filename with campaign info
  const date = new Date().toISOString().split('T')[0];
  const parts: string[] = ['creative-specs'];
  
  if (campaignInfo?.name) {
    parts.push(sanitizeForFilename(campaignInfo.name));
  }
  if (campaignInfo?.advertiserName) {
    parts.push(sanitizeForFilename(campaignInfo.advertiserName));
  }
  
  parts.push(date);
  const filename = parts.join('-') + '.csv';
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  campaignId,
  campaignInfo,
  hasOrders = false
}: CreativeAssetsManagerProps) {
  const { toast } = useToast();
  const [activeChannel, setActiveChannel] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pendingFiles, setPendingFiles] = useState<Map<string, PendingFile>>(new Map());
  const [batchClickUrl, setBatchClickUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ assetId: string; specGroupId: string; fileName: string } | null>(null);
  const [replacingSpecGroupId, setReplacingSpecGroupId] = useState<string | null>(null);
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
  
  // Split asset assignment dialog - shows after file selection for split specs
  const [splitAssetDialogOpen, setSplitAssetDialogOpen] = useState(false);
  const [splitAssetData, setSplitAssetData] = useState<{
    file: File;
    previewUrl?: string;
    specGroupId: string;
    specGroup: GroupedCreativeRequirement;
    clickUrl: string;
  } | null>(null);

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
            // Extract digital ad properties (clickUrl, altText, etc.)
            // Note: digitalAdProperties is stored at root level, not in metadata
            const digitalAdProps = asset.digitalAdProperties || {};
            
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
              // Restore digital ad properties
              clickUrl: digitalAdProps.clickUrl,
              altText: digitalAdProps.altText,
              headline: digitalAdProps.headline,
              body: digitalAdProps.body,
              ctaText: digitalAdProps.ctaText,
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

    // Apply sorting - publication-specific items always come first
    specs.sort((a, b) => {
      // Publication-specific (duplicated/excluded) items always sort to top
      if (a.isPublicationSpecific && !b.isPublicationSpecific) return -1;
      if (!a.isPublicationSpecific && b.isPublicationSpecific) return 1;
      
      // Then apply user-selected sort if configured
      if (sortConfig) {
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
      }
      
      return 0;
    });

    return specs;
  }, [currentChannelSpecs, uploadedAssets, sortConfig]);
  
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
      
      // Track duplicates from ZIP (warn but allow)
      const duplicateFiles: string[] = [];

      // Process each extracted file
      for (const processedFile of result.processedFiles) {
        // Check for duplicate content - warn but allow upload
        const fingerprint = await getFileFingerprint(processedFile.file);
        const existingLocation = existingFingerprints.get(fingerprint);
        if (existingLocation) {
          console.log(`[ZIP] Duplicate detected: ${processedFile.fileName} (same content in ${existingLocation}) - allowing upload`);
          duplicateFiles.push(processedFile.fileName);
          // Continue processing instead of skipping
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
      
      // Show toast warning for duplicate files from ZIP (but they were allowed)
      if (duplicateFiles.length > 0) {
        toast({
          title: 'Duplicate files detected',
          description: duplicateFiles.length === 1 
            ? `"${duplicateFiles[0]}" may already be uploaded`
            : `${duplicateFiles.length} files may already be uploaded: ${duplicateFiles.slice(0, 3).join(', ')}${duplicateFiles.length > 3 ? '...' : ''}`,
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
    
    // Handle replacement mode - replace an existing asset with a new one
    if (replacingSpecGroupId && fileArray.length > 0) {
      const file = fileArray[0]; // Only use first file for replacement
      const existingAsset = uploadedAssets.get(replacingSpecGroupId);
      
      console.log(`[Replace] Replacing asset for spec group: ${replacingSpecGroupId}`);
      
      // First, delete the old asset if it exists on the server
      if (existingAsset?.assetId) {
        try {
          const token = localStorage.getItem('auth_token');
          await fetch(`${API_BASE_URL}/creative-assets/${existingAsset.assetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log(`[Replace] Deleted old asset: ${existingAsset.assetId}`);
        } catch (error) {
          console.error('[Replace] Error deleting old asset:', error);
        }
      }
      
      // Create a preview URL for the new file
      const previewUrl = URL.createObjectURL(file);
      
      // Detect specs for the new file
      let detectedSpecs;
      if (file.type.startsWith('image/')) {
        try {
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = previewUrl;
          });
          detectedSpecs = {
            dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
            width: img.naturalWidth,
            height: img.naturalHeight
          };
        } catch (e) {
          console.warn('[Replace] Could not detect image dimensions');
        }
      }
      
      // Find the spec group to get placement info for appliesTo
      const specGroup = groupedSpecs.find(s => s.specGroupId === replacingSpecGroupId) 
        || customSpecGroups.get(replacingSpecGroupId);
      
      // Build appliesTo from the spec's placements
      const appliesTo = specGroup?.placements?.map(p => ({
        placementId: p.placementId,
        publicationId: p.publicationId,
        publicationName: p.publicationName
      })) || [];
      
      // Set the new file as pending for this spec group
      const newAssetsMap = new Map(uploadedAssets);
      newAssetsMap.set(replacingSpecGroupId, {
        specGroupId: replacingSpecGroupId,
        file,
        previewUrl,
        uploadStatus: 'pending',
        detectedSpecs,
        appliesTo
      });
      
      // Clear replacement mode
      setReplacingSpecGroupId(null);
      
      toast({
        title: 'File Attached',
        description: `"${file.name}" is ready to upload. Click "Save All to Server" to save.`
      });
      
      // Update the assets via callback
      onAssetsChange(newAssetsMap);
      
      return; // Exit early - don't process as regular upload
    }
    
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
    
    // Track duplicates to show warning toast (but allow upload)
    const duplicateFiles: string[] = [];
    
    for (const file of fileArray) {
      // Generate fingerprint for this file
      const fingerprint = await getFileFingerprint(file);
      
      // Check for duplicate content - warn but allow upload
      const existingLocation = existingFingerprints.get(fingerprint);
      if (existingLocation) {
        console.log(`[Upload] Duplicate detected: ${file.name} (same content already in ${existingLocation}) - allowing upload`);
        duplicateFiles.push(file.name);
        // Continue processing instead of skipping
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
        
        // Check if we have a recently split spec - show dialog to confirm assignment with URL
        // But only if it matches the current channel filter
        if (recentlySplitSpecId) {
          // Look in both groupedSpecs AND customSpecGroups (in case React hasn't re-rendered yet)
          let splitSpec = groupedSpecs.find(g => g.specGroupId === recentlySplitSpecId);
          if (!splitSpec) {
            splitSpec = customSpecGroups.get(recentlySplitSpecId);
          }
          
          // Only handle if on "all" tab OR the split spec's channel matches the active channel
          if (splitSpec && (activeChannel === 'all' || splitSpec.channel === activeChannel)) {
            console.log(`📋 Opening assignment dialog for split spec → ${recentlySplitSpecId}`);
            
            // Show the split asset assignment dialog instead of auto-assigning
            setSplitAssetData({
              file,
              previewUrl,
              specGroupId: splitSpec.specGroupId,
              specGroup: splitSpec,
              clickUrl: ''
            });
            setSplitAssetDialogOpen(true);
            
            // Clear the recently split spec ID (dialog will handle the rest)
            setRecentlySplitSpecId(null);
            
            // Don't add to pending files - dialog will handle assignment
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
    
    // Show toast warning for duplicate files (but they were allowed)
    if (duplicateFiles.length > 0) {
      toast({
        title: 'Duplicate file detected',
        description: duplicateFiles.length === 1 
          ? `"${duplicateFiles[0]}" may already be uploaded`
          : `${duplicateFiles.length} files may already be uploaded: ${duplicateFiles.slice(0, 3).join(', ')}${duplicateFiles.length > 3 ? '...' : ''}`,
        variant: 'default',
      });
    }
  }, [groupedSpecs, currentChannelSpecs, activeChannel, uploadedAssets, onAssetsChange, handleZipFile, recentlySplitSpecId, customSpecGroups, pendingFiles, toast, replacingSpecGroupId]);

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
    
    // Validate that digital assets have click URLs
    const digitalAssetsWithoutClickUrl = pendingAssets.filter(([specGroupId, asset]) => {
      const spec = groupedSpecs.find(s => s.specGroupId === specGroupId);
      const isDigitalChannel = spec && ['website', 'newsletter', 'streaming'].includes(spec.channel || '');
      return isDigitalChannel && !asset.clickUrl?.trim();
    });
    
    if (digitalAssetsWithoutClickUrl.length > 0) {
      toast({
        title: 'Click-Through URL Required',
        description: `Please add a click-through URL for ${digitalAssetsWithoutClickUrl.length} digital asset${digitalAssetsWithoutClickUrl.length !== 1 ? 's' : ''} before uploading.`,
        variant: 'destructive',
      });
      return;
    }

    setUploadProgress({ current: 0, total: pendingAssets.length });

    // Create a working copy of the assets map to accumulate all changes
    const workingAssetsMap = new Map(uploadedAssets);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingAssets.length; i++) {
      const [specGroupId, asset] = pendingAssets[i];
      
      // Get the spec group to retrieve full placement details including channel
      const specGroup = groupedSpecs.find(g => g.specGroupId === specGroupId);
      
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
        
        // Send direct placement links for publication order lookup
        // This enables simple lookup instead of fuzzy specGroupId matching
        if (specGroup?.placements && specGroup.placements.length > 0) {
          const placements = specGroup.placements.map(p => ({
            publicationId: p.publicationId,
            placementId: p.placementId,
            placementName: p.placementName,
            channel: specGroup.channel
          }));
          formData.append('placements', JSON.stringify(placements));
        }
        
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

  // Upload a single pending asset to server
  const handleUploadSingle = async (specGroupId: string) => {
    const asset = uploadedAssets.get(specGroupId);
    if (!asset || asset.uploadStatus !== 'pending' || !asset.file) return;
    
    // Get the spec group
    const specGroup = groupedSpecs.find(g => g.specGroupId === specGroupId) 
      || customSpecGroups.get(specGroupId);
    
    // Validate click URL for digital assets
    const isDigitalChannel = specGroup && ['website', 'newsletter', 'streaming'].includes(specGroup.channel || '');
    if (isDigitalChannel && !asset.clickUrl?.trim()) {
      toast({
        title: 'Click-Through URL Required',
        description: 'Please add a click-through URL for this digital asset before saving.',
        variant: 'destructive',
      });
      return;
    }
    
    // Mark as uploading
    const updatingMap = new Map(uploadedAssets);
    updatingMap.set(specGroupId, { ...asset, uploadStatus: 'uploading' });
    onAssetsChange(updatingMap);
    
    try {
      const formData = new FormData();
      formData.append('file', asset.file);
      formData.append('campaignId', campaignId || '');
      formData.append('specGroupId', specGroupId);
      formData.append('metadata', JSON.stringify({
        fileName: asset.file.name,
        detectedDimensions: asset.detectedSpecs?.dimensions?.formatted,
        detectedColorSpace: asset.detectedSpecs?.colorSpace,
        fileExtension: asset.detectedSpecs?.fileExtension,
        fileSize: asset.detectedSpecs?.fileSize,
      }));
      
      // Send placement links
      if (specGroup?.placements && specGroup.placements.length > 0) {
        const placements = specGroup.placements.map(p => ({
          publicationId: p.publicationId,
          placementId: p.placementId,
          placementName: p.placementName,
          channel: specGroup.channel
        }));
        formData.append('placements', JSON.stringify(placements));
      }
      
      // Include digital ad properties
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

      // Update asset status
      const finalMap = new Map(uploadedAssets);
      finalMap.set(specGroupId, {
        ...asset,
        uploadStatus: 'uploaded',
        assetId: result.assetId,
        uploadedUrl: result.fileUrl,
        previewUrl: result.fileUrl,
      });
      onAssetsChange(finalMap);
      
      toast({
        title: 'Asset Saved',
        description: `"${asset.file.name}" uploaded successfully.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Mark as error
      const errorMap = new Map(uploadedAssets);
      errorMap.set(specGroupId, {
        ...asset,
        uploadStatus: 'error',
        errorMessage: 'Upload failed',
      });
      onAssetsChange(errorMap);
      
      toast({
        title: 'Upload Failed',
        description: 'Failed to save asset. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Delete asset
  const handleDeleteAssetClick = (assetId: string, specGroupId: string, fileName: string) => {
    setAssetToDelete({ assetId, specGroupId, fileName });
    setDeleteDialogOpen(true);
  };
  
  // Replace asset - deletes old and opens file picker for new
  const handleReplaceAssetClick = (specGroupId: string) => {
    setReplacingSpecGroupId(specGroupId);
    // Open file dialog - the handleFilesSelected will check for replacement mode
    openFileDialog();
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
  
  // Count pending digital assets missing click URLs
  const pendingDigitalAssetsMissingClickUrl = Array.from(uploadedAssets.entries())
    .filter(([specGroupId, asset]) => {
      if (asset.uploadStatus !== 'pending') return false;
      // Check if this is a digital channel (website, newsletter, streaming)
      const spec = groupedSpecs.find(s => s.specGroupId === specGroupId);
      const isDigitalChannel = spec && ['website', 'newsletter', 'streaming'].includes(spec.channel || '');
      return isDigitalChannel && !asset.clickUrl?.trim();
    });
  
  const hasPendingDigitalAssetsWithoutClickUrl = pendingDigitalAssetsMissingClickUrl.length > 0;
  
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
  
  // Handle confirming split asset assignment (from the dialog) - uploads immediately
  const [splitAssetUploading, setSplitAssetUploading] = useState(false);
  
  const handleConfirmSplitAsset = async () => {
    if (!splitAssetData) return;
    
    const { file, previewUrl, specGroupId, specGroup, clickUrl } = splitAssetData;
    
    setSplitAssetUploading(true);
    
    try {
      // Build form data for upload
      const formData = new FormData();
      formData.append('file', file);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      formData.append('assetType', 'placement');
      formData.append('specGroupId', specGroupId);
      
      // Include specifications
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
        placements: specGroup.placements,
        isPublicationSpecific: true, // Mark as publication-specific
      };
      formData.append('specifications', JSON.stringify(specifications));
      
      // Include placement links for publication order lookup
      const placements = specGroup.placements.map(p => ({
        publicationId: p.publicationId,
        placementId: p.placementId,
        placementName: p.placementName,
        channel: specGroup.channel
      }));
      formData.append('placements', JSON.stringify(placements));
      
      // Include digital ad properties if available
      if (clickUrl) {
        formData.append('digitalAdProperties', JSON.stringify({
          clickUrl: clickUrl,
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
      
      // Update uploadedAssets with the uploaded asset
      const updatedAssets = new Map(uploadedAssets);
      updatedAssets.set(specGroupId, {
        specGroupId,
        file,
        previewUrl: result.fileUrl || previewUrl,
        uploadStatus: 'uploaded',
        assetId: result.assetId,
        uploadedUrl: result.fileUrl,
        clickUrl: clickUrl || undefined,
        appliesTo: specGroup.placements.map(p => ({
          placementId: p.placementId,
          publicationId: p.publicationId,
          publicationName: p.publicationName
        }))
      });
      onAssetsChange(updatedAssets);
      
      // Close dialog and clear state
      setSplitAssetDialogOpen(false);
      setSplitAssetData(null);
      
      toast({
        title: 'Asset Uploaded',
        description: `"${file.name}" uploaded and assigned to ${specGroup.placements[0]?.publicationName || 'publication'}.`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload asset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSplitAssetUploading(false);
    }
  };
  
  // Handle canceling split asset assignment
  const handleCancelSplitAsset = () => {
    // Revoke preview URL if exists
    if (splitAssetData?.previewUrl) {
      URL.revokeObjectURL(splitAssetData.previewUrl);
    }
    setSplitAssetDialogOpen(false);
    setSplitAssetData(null);
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
        <div className="flex items-center justify-between gap-4">
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
          
          {/* Download Spec Sheet Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadSpecSheet(requirements, campaignId, campaignInfo);
              toast({
                title: 'Spec Sheet Downloaded',
                description: `Downloaded CSV with ${requirements.length} asset specifications for ${campaignInfo?.name || 'campaign'}`,
              });
            }}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Spec Sheet
          </Button>
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
                                
                                return sortedChannels.map(channel => {
                                  // Sort specs within each channel
                                  // Publication-specific items first, then by dimensions/placement count
                                  const sortedSpecs = [...byChannel[channel]].sort((a, b) => {
                                    // Publication-specific (duplicated/excluded) items always sort to top
                                    if (a.isPublicationSpecific && !b.isPublicationSpecific) return -1;
                                    if (!a.isPublicationSpecific && b.isPublicationSpecific) return 1;
                                    
                                    if (channel === 'print') {
                                      // Extract numbers from dimension strings for print
                                      const extractNums = (dims: string | string[] | undefined): { w: number; h: number } => {
                                        const dimStr = Array.isArray(dims) ? dims[0] : dims;
                                        if (!dimStr) return { w: 999, h: 999 };
                                        const nums = dimStr.match(/\d+\.?\d*/g);
                                        if (nums && nums.length >= 2) {
                                          return { w: parseFloat(nums[0]), h: parseFloat(nums[1]) };
                                        }
                                        return { w: 999, h: 999 };
                                      };
                                      const aD = extractNums(a.dimensions);
                                      const bD = extractNums(b.dimensions);
                                      // Sort by width, then height
                                      if (aD.w !== bD.w) return aD.w - bD.w;
                                      if (aD.h !== bD.h) return aD.h - bD.h;
                                    }
                                    // Default: sort by placement count (most placements first)
                                    return b.placementCount - a.placementCount;
                                  });
                                  
                                  return (
                                  <div key={channel}>
                                    {/* Only show channel header when viewing all channels */}
                                    {activeChannel === 'all' && (
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase bg-muted/50 sticky top-0">
                                        {channel} ({byChannel[channel].length})
                                      </div>
                                    )}
                                    {sortedSpecs.map((spec) => (
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
                                )});
                              })()}
                            </SelectContent>
                          </Select>
                          
                          {/* Click URL input for digital channels (also show when viewing 'all' channels) */}
                          {(activeChannel === 'all' || ['website', 'newsletter', 'streaming'].includes(activeChannel)) && (
                            <div className="flex items-center gap-2">
                              {fileData.clickUrl ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                              ) : (
                                <Link className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <Input
                                type="url"
                                placeholder="Click-through URL (required for digital)"
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

              {/* Batch Click URL for assigned pending digital assets */}
              {hasPendingDigitalAssetsWithoutClickUrl && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">Click-Through URL Required</span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3">
                    {pendingDigitalAssetsMissingClickUrl.length} website/newsletter asset{pendingDigitalAssetsMissingClickUrl.length !== 1 ? 's need' : ' needs'} a click-through URL before saving.
                  </p>
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
                        // Apply to all pending digital assets missing click URL
                        const newAssetsMap = new Map(uploadedAssets);
                        pendingDigitalAssetsMissingClickUrl.forEach(([specGroupId, asset]) => {
                          newAssetsMap.set(specGroupId, { ...asset, clickUrl: batchClickUrl.trim() });
                        });
                        onAssetsChange(newAssetsMap);
                        setBatchClickUrl('');
                        toast({
                          title: 'Click URL Applied',
                          description: `Applied to ${pendingDigitalAssetsMissingClickUrl.length} pending asset${pendingDigitalAssetsMissingClickUrl.length !== 1 ? 's' : ''}`,
                        });
                      }}
                    >
                      Apply to All ({pendingDigitalAssetsMissingClickUrl.length})
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload button - always visible for clarity */}
              <div className="mt-4">
                <Button
                  onClick={handleUploadAll}
                  className="w-full"
                  disabled={uploadProgress !== null || pendingUploadCount === 0 || hasPendingDigitalAssetsWithoutClickUrl}
                  variant={pendingUploadCount > 0 && !hasPendingDigitalAssetsWithoutClickUrl ? "default" : "outline"}
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
                {pendingUploadCount > 0 && !hasPendingDigitalAssetsWithoutClickUrl && (
                  <p className="text-xs text-center text-amber-600 mt-2">
                    {pendingUploadCount} asset{pendingUploadCount !== 1 ? 's' : ''} ready to save
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==================== CHECKLIST TABLE ==================== */}
        <div>
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
                              {/* File attachment indicator */}
                              {asset && (asset.uploadStatus === 'uploaded' || asset.uploadStatus === 'pending') && (
                                <div className="flex-shrink-0">
                                  {(() => {
                                    // Determine file type for appropriate icon
                                    const fileType = asset.file?.type || '';
                                    const fileName = asset.file?.name || asset.fileName || '';
                                    const fileExt = fileName.toLowerCase().split('.').pop() || '';
                                    
                                    // Text files
                                    if (asset.detectedSpecs?.isTextAsset || fileType.startsWith('text/')) {
                                      return (
                                        <div className="w-6 h-6 rounded border bg-amber-50 flex items-center justify-center">
                                          <FileText className="h-3 w-3 text-amber-600" />
                                        </div>
                                      );
                                    }
                                    
                                    // Audio files
                                    if (asset.detectedSpecs?.isAudioAsset || fileType.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(fileExt)) {
                                      return (
                                        <div className="w-6 h-6 rounded border bg-purple-50 flex items-center justify-center">
                                          <FileText className="h-3 w-3 text-purple-600" />
                                        </div>
                                      );
                                    }
                                    
                                    // Video files
                                    if (asset.detectedSpecs?.isVideoAsset || fileType.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm'].includes(fileExt)) {
                                      return (
                                        <div className="w-6 h-6 rounded border bg-blue-50 flex items-center justify-center">
                                          <FileText className="h-3 w-3 text-blue-600" />
                                        </div>
                                      );
                                    }
                                    
                                    // PDF files - always show icon, never try to load as image
                                    if (fileType === 'application/pdf' || fileExt === 'pdf') {
                                      return (
                                        <div className="w-6 h-6 rounded border bg-red-50 flex items-center justify-center">
                                          <FileText className="h-3 w-3 text-red-600" />
                                        </div>
                                      );
                                    }
                                    
                                    // Images - show actual thumbnail
                                    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
                                      if (asset.previewUrl) {
                                        return (
                                          <img 
                                            src={asset.previewUrl} 
                                            alt="Preview"
                                            className="w-6 h-6 object-cover rounded border"
                                            onError={(e) => {
                                              // If image fails, show generic icon
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                parent.innerHTML = '<div class="w-6 h-6 rounded border bg-muted flex items-center justify-center"><svg class="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                              }
                                            }}
                                          />
                                        );
                                      }
                                    }
                                    
                                    // Default - show generic file icon
                                    return (
                                      <div className="w-6 h-6 rounded border bg-green-50 flex items-center justify-center">
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
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
                            <div className="flex items-center justify-end gap-2">
                              {/* Quick action buttons for uploaded assets */}
                              {asset && (asset.uploadStatus === 'uploaded' || asset.uploadStatus === 'pending') && (asset.uploadedUrl || asset.previewUrl) && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  {/* Preview button */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = asset.uploadedUrl || asset.previewUrl;
                                      if (url) {
                                        window.open(url, '_blank');
                                      }
                                    }}
                                    title="Preview file"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {/* Download button */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = asset.uploadedUrl || asset.previewUrl;
                                      const fileName = asset.file?.name || asset.fileName || 'download';
                                      if (url) {
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = fileName;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }
                                    }}
                                    title="Download file"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              <StatusBadge status={spec.status} />
                            </div>
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
                                        {/* Preview - handle different file types with appropriate icons */}
                                        {(() => {
                                          const fileType = asset.file?.type || '';
                                          const fileName = asset.file?.name || asset.fileName || '';
                                          const fileExt = fileName.toLowerCase().split('.').pop() || '';
                                          
                                          // Text files
                                          if (asset.detectedSpecs?.isTextAsset || fileType.startsWith('text/')) {
                                            return (
                                              <div className="w-20 h-20 rounded border bg-amber-50 flex flex-col items-center justify-center p-1">
                                                <FileText className="h-6 w-6 text-amber-600 mb-1" />
                                                <span className="text-[9px] text-amber-700 font-medium">
                                                  {asset.detectedSpecs?.fileExtension || fileExt.toUpperCase()}
                                                </span>
                                              </div>
                                            );
                                          }
                                          
                                          // Audio files
                                          if (asset.detectedSpecs?.isAudioAsset || fileType.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(fileExt)) {
                                            return (
                                              <div className="w-20 h-20 rounded border bg-purple-50 flex flex-col items-center justify-center p-1">
                                                <FileText className="h-6 w-6 text-purple-600 mb-1" />
                                                <span className="text-[9px] text-purple-700 font-medium">
                                                  {asset.detectedSpecs?.audioFormat || fileExt.toUpperCase()}
                                                </span>
                                              </div>
                                            );
                                          }
                                          
                                          // Video files
                                          if (asset.detectedSpecs?.isVideoAsset || fileType.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm'].includes(fileExt)) {
                                            return (
                                              <div className="w-20 h-20 rounded border bg-blue-50 flex flex-col items-center justify-center p-1">
                                                <FileText className="h-6 w-6 text-blue-600 mb-1" />
                                                <span className="text-[9px] text-blue-700 font-medium">
                                                  {asset.detectedSpecs?.videoFormat || fileExt.toUpperCase()}
                                                </span>
                                              </div>
                                            );
                                          }
                                          
                                          // PDF files - ALWAYS show icon, never try to display as image
                                          if (fileType === 'application/pdf' || fileExt === 'pdf') {
                                            return (
                                              <div className="w-20 h-20 rounded border bg-red-50 flex flex-col items-center justify-center p-1">
                                                <FileText className="h-6 w-6 text-red-600 mb-1" />
                                                <span className="text-[9px] text-red-700 font-medium">
                                                  PDF
                                                </span>
                                              </div>
                                            );
                                          }
                                          
                                          // Images - show actual preview
                                          if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
                                            if (asset.previewUrl) {
                                              return (
                                                <img 
                                                  src={asset.previewUrl} 
                                                  alt={asset.fileName || 'Preview'}
                                                  className="w-20 h-20 object-contain rounded border bg-white"
                                                  onError={(e) => {
                                                    // If image fails to load, replace with icon
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const parent = target.parentElement;
                                                    if (parent) {
                                                      parent.innerHTML = '<div class="w-20 h-20 rounded border bg-white flex items-center justify-center"><svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                                    }
                                                  }}
                                                />
                                              );
                                            }
                                          }
                                          
                                          // Default fallback
                                          return (
                                            <div className="w-20 h-20 rounded border bg-white flex items-center justify-center">
                                              <FileImage className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                          );
                                        })()}
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
                                              {/* Editable for pending assets, read-only for uploaded */}
                                              {asset.uploadStatus === 'pending' ? (
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
                                                </div>
                                              ) : asset.clickUrl ? (
                                                <div className="flex items-center gap-1">
                                                  <span 
                                                    className="text-xs text-foreground truncate flex-1 py-1" 
                                                    title={asset.clickUrl}
                                                  >
                                                    {asset.clickUrl}
                                                  </span>
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
                                                </div>
                                              ) : (
                                                <p className="text-xs text-amber-600">
                                                  ⚠️ No URL set - required for tracking
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Actions */}
                                          <div className="pt-1 flex flex-wrap gap-1">
                                            {/* Save Button - for pending assets (or uploading) */}
                                            {(asset.uploadStatus === 'pending' || (asset.uploadStatus as string) === 'uploading') && (
                                              <Button
                                                size="sm"
                                                variant="default"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUploadSingle(spec.specGroupId);
                                                }}
                                                className="h-7 px-3 text-xs"
                                                disabled={
                                                  (asset.uploadStatus as string) === 'uploading' ||
                                                  (['website', 'newsletter', 'streaming'].includes(spec.channel || '') && 
                                                  !asset.clickUrl?.trim())
                                                }
                                              >
                                                {(asset.uploadStatus as string) === 'uploading' ? (
                                                  <>
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    Saving...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Upload className="h-3 w-3 mr-1" />
                                                    Save
                                                  </>
                                                )}
                                              </Button>
                                            )}
                                            
                                            {/* Preview Button - works for images, PDFs, and opens in new tab for all types */}
                                            {(asset.previewUrl || asset.uploadedUrl) && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const url = asset.uploadedUrl || asset.previewUrl;
                                                  if (url) {
                                                    window.open(url, '_blank');
                                                  }
                                                }}
                                                className="h-7 px-2 text-xs"
                                                title="Preview file in new tab"
                                              >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Preview
                                              </Button>
                                            )}
                                            
                                            {/* Download Button - always available if file URL exists */}
                                            {(asset.uploadedUrl || asset.previewUrl) && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const url = asset.uploadedUrl || asset.previewUrl;
                                                  const fileName = asset.file?.name || asset.fileName || 'download';
                                                  if (url) {
                                                    // Create a temporary link to trigger download
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = fileName;
                                                    link.target = '_blank';
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                  }
                                                }}
                                                className="h-7 px-2 text-xs"
                                                title="Download file"
                                              >
                                                <Download className="h-3 w-3 mr-1" />
                                                Download
                                              </Button>
                                            )}
                                            
                                            {/* Remove Button - hidden when insertion orders exist */}
                                            {!hasOrders && (
                                              asset.uploadStatus === 'uploaded' && asset.assetId ? (
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
                                              )
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
                                            // Set replacement mode so the file gets assigned to this specific spec group
                                            setReplacingSpecGroupId(spec.specGroupId);
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
        </div>
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

      {/* Split Asset Assignment Dialog - shows after file selection for split specs */}
      <Dialog open={splitAssetDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancelSplitAsset();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Asset to Publication</DialogTitle>
            <DialogDescription>
              {splitAssetData && (
                <>
                  Assign this asset to <strong>{splitAssetData.specGroup.placements[0]?.publicationName}</strong>'s 
                  {' '}{formatDimensions(splitAssetData.specGroup.dimensions, splitAssetData.specGroup.channel, splitAssetData.specGroup.fileFormats)} requirement.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {splitAssetData && (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                {splitAssetData.previewUrl ? (
                  <img 
                    src={splitAssetData.previewUrl} 
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{splitAssetData.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(splitAssetData.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              {/* Click-Through URL - show for digital channels */}
              {['website', 'newsletter', 'streaming'].includes(splitAssetData.specGroup.channel || '') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Click-Through URL
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="url"
                    placeholder="https://advertiser.com/landing-page"
                    value={splitAssetData.clickUrl}
                    onChange={(e) => setSplitAssetData(prev => prev ? { ...prev, clickUrl: e.target.value } : null)}
                    className={splitAssetData.clickUrl ? 'border-green-300' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for tracking scripts to work properly.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSplitAsset} disabled={splitAssetUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSplitAsset}
              disabled={
                splitAssetUploading ||
                (splitAssetData && 
                ['website', 'newsletter', 'streaming'].includes(splitAssetData.specGroup.channel || '') && 
                !splitAssetData.clickUrl?.trim())
              }
            >
              {splitAssetUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Save & Assign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

