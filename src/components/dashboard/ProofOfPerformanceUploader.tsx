/**
 * Proof of Performance Uploader
 * 
 * Compact drag-and-drop file upload for proof of performance documentation.
 * Auto-detects file type and pre-fills placement info.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  Upload, 
  X, 
  FileText, 
  Image, 
  Music, 
  Video, 
  File,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  ProofFileType,
  PROOF_FILE_TYPE_LABELS,
  getRecommendedFileTypes,
  formatFileSize,
  MAX_FILE_SIZE,
} from '@/integrations/mongodb/proofOfPerformanceSchema';

interface Placement {
  itemPath: string;
  itemName: string;
  channel: string;
  dimensions?: string;
}

interface ProofOfPerformanceUploaderProps {
  orderId: string;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  placements?: Placement[];
  channel?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProofOfPerformanceUploader({
  orderId,
  campaignId,
  publicationId,
  publicationName,
  placements = [],
  channel,
  onSuccess,
  onCancel,
}: ProofOfPerformanceUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<ProofFileType>('tearsheet');
  const [description, setDescription] = useState('');
  const [runDate, setRunDate] = useState<Date | undefined>(new Date());
  const [runDateEnd, setRunDateEnd] = useState<Date | undefined>();
  const [selectedPlacement, setSelectedPlacement] = useState<string>(
    placements.length === 1 ? placements[0].itemPath : ''
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const recommendedTypes = getRecommendedFileTypes(channel);

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-purple-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6 text-red-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-6 h-6 text-orange-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  // Auto-detect file type based on MIME
  const detectFileType = (file: File): ProofFileType => {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) return 'screenshot';
    if (mime.startsWith('audio/')) return 'audio_log';
    if (mime.startsWith('video/')) return 'video_clip';
    if (mime.includes('pdf') && channel === 'print') return 'tearsheet';
    if (mime.includes('pdf')) return 'report';
    return 'other';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setFileType(detectFileType(file));
    }
  }, [channel]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setFileType(detectFileType(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      const token = localStorage.getItem('auth_token');

      // Step 1: Get presigned URL
      const presignResponse = await fetch(`${API_BASE_URL}/proof-of-performance/presigned-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
          orderId,
          campaignId,
        }),
      });

      if (!presignResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileUrl, s3Key } = await presignResponse.json();

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Create proof record
      const placement = placements.find(p => p.itemPath === selectedPlacement);
      const actualPlacement = selectedPlacement === '__order_level__' ? undefined : selectedPlacement;
      
      const proofResponse = await fetch(`${API_BASE_URL}/proof-of-performance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          campaignId,
          publicationId,
          publicationName,
          itemPath: actualPlacement,
          itemName: placement?.itemName,
          channel: placement?.channel || channel,
          dimensions: placement?.dimensions,
          fileType,
          fileName: selectedFile.name,
          fileUrl,
          s3Key,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          description: description || undefined,
          runDate: runDate?.toISOString(),
          runDateEnd: runDateEnd?.toISOString(),
        }),
      });

      if (!proofResponse.ok) {
        const error = await proofResponse.json();
        throw new Error(error.error || 'Failed to save proof');
      }

      toast({
        title: 'Success',
        description: 'Proof uploaded successfully',
      });

      // Reset form
      setSelectedFile(null);
      setDescription('');
      setRunDate(new Date());
      setRunDateEnd(undefined);

      onSuccess?.();
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload proof',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
      {/* Drop Zone - Compact */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          selectedFile ? "bg-muted/30" : "hover:border-primary/50"
        )}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile.type)}
              <div className="text-left">
                <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop file here or{' '}
              <label className="text-primary cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-muted-foreground">
              Max {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </div>
        )}
      </div>

      {/* Quick Settings Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* File Type */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select value={fileType} onValueChange={(v) => setFileType(v as ProofFileType)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROOF_FILE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <span>{label}</span>
                    {recommendedTypes.includes(value as ProofFileType) && (
                      <Badge variant="secondary" className="text-[10px] px-1">✓</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Run Date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Run Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 justify-start text-left font-normal",
                  !runDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {runDate ? format(runDate, "MMM d, yyyy") : "Select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={runDate}
                onSelect={setRunDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Optional Settings - Collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          More options
        </button>
        
        {showOptions && (
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-muted">
            {/* Placement Selection */}
            {placements.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Link to Placement</Label>
                <Select 
                  value={selectedPlacement || '__order_level__'} 
                  onValueChange={(v) => setSelectedPlacement(v === '__order_level__' ? '' : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Order-level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__order_level__">Order-level (all placements)</SelectItem>
                    {placements.map((placement) => (
                      <SelectItem key={placement.itemPath} value={placement.itemPath || `placement-${placement.itemName}`}>
                        {placement.itemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Date (if range)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal",
                      !runDateEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {runDateEnd ? format(runDateEnd, "MMM d, yyyy") : "Not set"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={runDateEnd}
                    onSelect={setRunDateEnd}
                    disabled={(date) => runDate ? date < runDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Optional notes about this proof..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleUpload} 
          size="sm"
          disabled={!selectedFile || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ProofOfPerformanceUploader;
