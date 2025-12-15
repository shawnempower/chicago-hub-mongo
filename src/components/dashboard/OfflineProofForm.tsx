/**
 * OfflineProofForm Component
 * 
 * Unified proof of performance form for offline channels (print, radio, podcast).
 * Supports file upload OR attestation form submission.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, 
  Upload, 
  FileText, 
  X, 
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  ProofFileType,
  AttestationData,
  formatFileSize,
  MAX_FILE_SIZE,
} from '@/integrations/mongodb/proofOfPerformanceSchema';
import {
  RADIO_DAYPARTS,
  PODCAST_AD_POSITIONS,
  PRINT_SECTIONS,
  getProofRequirement,
} from '@/config/inventoryChannels';

type ProofMode = 'upload' | 'attestation' | 'link';

interface OfflineProofFormProps {
  orderId: string;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  channel: 'print' | 'radio' | 'podcast';
  itemPath?: string;
  itemName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OfflineProofForm({
  orderId,
  campaignId,
  publicationId,
  publicationName,
  channel,
  itemPath,
  itemName,
  onSuccess,
  onCancel,
}: OfflineProofFormProps) {
  const proofRequirement = getProofRequirement(channel);
  const isRequired = proofRequirement?.required ?? false;

  // Form state
  const [mode, setMode] = useState<ProofMode>('upload');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Print attestation fields
  const [publicationDate, setPublicationDate] = useState<Date | undefined>(new Date());
  const [pageNumber, setPageNumber] = useState('');
  const [section, setSection] = useState('');
  const [adSize, setAdSize] = useState('');

  // Radio attestation fields
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(new Date());
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>();
  const [spotsAired, setSpotsAired] = useState('');
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>([]);
  const [estimatedReach, setEstimatedReach] = useState('');

  // Podcast attestation fields
  const [episodeDate, setEpisodeDate] = useState<Date | undefined>(new Date());
  const [episodeName, setEpisodeName] = useState('');
  const [episodeUrl, setEpisodeUrl] = useState('');
  const [downloads, setDownloads] = useState('');
  const [adPosition, setAdPosition] = useState<string>('');

  // File handling
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
    }
  }, []);

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
    }
  };

  const toggleDaypart = (daypartId: string) => {
    setSelectedDayparts(prev => 
      prev.includes(daypartId)
        ? prev.filter(d => d !== daypartId)
        : [...prev, daypartId]
    );
  };

  // Validation
  const isValidPrintAttestation = () => {
    return publicationDate && pageNumber && section && adSize && confirmed;
  };

  const isValidRadioAttestation = () => {
    return dateRangeStart && spotsAired && selectedDayparts.length > 0 && confirmed;
  };

  const isValidPodcastAttestation = () => {
    return episodeDate && episodeName && downloads && adPosition && confirmed;
  };

  const isValidEpisodeLink = () => {
    return episodeUrl && episodeDate && downloads;
  };

  const canSubmit = () => {
    if (mode === 'upload') {
      return selectedFile !== null;
    }
    if (mode === 'link' && channel === 'podcast') {
      return isValidEpisodeLink();
    }
    // Attestation mode
    switch (channel) {
      case 'print': return isValidPrintAttestation();
      case 'radio': return isValidRadioAttestation();
      case 'podcast': return isValidPodcastAttestation();
      default: return false;
    }
  };

  // Build attestation data based on channel
  const buildAttestationData = (): AttestationData => {
    const base = {
      channel,
      confirmedAt: new Date(),
      confirmedBy: '', // Will be filled by server from auth
    };

    switch (channel) {
      case 'print':
        return {
          ...base,
          publicationDate: publicationDate?.toISOString(),
          pageNumber,
          section,
          adSize,
        };
      case 'radio':
        return {
          ...base,
          dateRange: {
            start: dateRangeStart?.toISOString() || '',
            end: dateRangeEnd?.toISOString() || dateRangeStart?.toISOString() || '',
          },
          spotsAired: parseInt(spotsAired) || 0,
          dayparts: selectedDayparts,
          estimatedReach: estimatedReach ? parseInt(estimatedReach) : undefined,
        };
      case 'podcast':
        return {
          ...base,
          episodeDate: episodeDate?.toISOString(),
          episodeName,
          episodeUrl: episodeUrl || undefined,
          downloads: parseInt(downloads) || 0,
          adPosition: adPosition as 'pre-roll' | 'mid-roll' | 'post-roll',
        };
      default:
        return base;
    }
  };

  const getFileType = (): ProofFileType => {
    if (mode === 'attestation') return 'attestation';
    if (mode === 'link') return 'episode_link';
    // Upload mode - determine by channel
    switch (channel) {
      case 'print': return 'tearsheet';
      case 'radio': return 'affidavit';
      case 'podcast': return 'screenshot';
      default: return 'other';
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setUploading(true);

    try {
      const token = localStorage.getItem('auth_token');
      let fileUrl = '';
      let s3Key = '';
      let fileName = '';
      let fileSize = 0;
      let mimeType = '';

      // Handle file upload if in upload mode
      if (mode === 'upload' && selectedFile) {
        // Upload file through server (avoids CORS issues)
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('orderId', orderId);
        formData.append('campaignId', campaignId);
        
        const uploadResponse = await fetch(`${API_BASE_URL}/proof-of-performance/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for FormData
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        const uploadData = await uploadResponse.json();
        fileUrl = uploadData.fileUrl;
        s3Key = uploadData.s3Key;
        fileName = selectedFile.name;
        fileSize = uploadData.fileSize || selectedFile.size;
        mimeType = uploadData.mimeType || selectedFile.type;
      }

      // Build proof data
      const proofData: any = {
        orderId,
        campaignId,
        publicationId,
        publicationName,
        itemPath,
        itemName,
        channel,
        fileType: getFileType(),
        runDate: channel === 'print' ? publicationDate?.toISOString() : 
                 channel === 'radio' ? dateRangeStart?.toISOString() :
                 episodeDate?.toISOString(),
        runDateEnd: channel === 'radio' ? dateRangeEnd?.toISOString() : undefined,
      };

      // Add file data if uploaded
      if (mode === 'upload') {
        proofData.fileName = fileName;
        proofData.fileUrl = fileUrl;
        proofData.s3Key = s3Key;
        proofData.fileSize = fileSize;
        proofData.mimeType = mimeType;

        // Still include basic attestation data for tearsheet uploads
        if (channel === 'print') {
          proofData.attestationData = {
            channel: 'print',
            publicationDate: publicationDate?.toISOString(),
            pageNumber,
            confirmedAt: new Date(),
            confirmedBy: '',
          };
        }
      } else {
        // Attestation or link mode
        proofData.attestationData = buildAttestationData();
        
        // For attestation, use placeholder values for required file fields
        proofData.fileName = `${channel}_attestation_${Date.now()}`;
        proofData.fileUrl = 'attestation://no-file';
        proofData.s3Key = 'attestation://no-file';
        proofData.fileSize = 0;
        proofData.mimeType = 'application/json';
      }

      // Create proof record
      const proofResponse = await fetch(`${API_BASE_URL}/proof-of-performance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proofData),
      });

      if (!proofResponse.ok) {
        const error = await proofResponse.json();
        throw new Error(error.error || 'Failed to save proof');
      }

      toast({
        title: 'Proof Submitted',
        description: mode === 'upload' 
          ? 'File uploaded successfully' 
          : 'Attestation submitted successfully',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit proof',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Channel-specific titles
  const getTitle = () => {
    switch (channel) {
      case 'print': return 'Print Proof of Performance';
      case 'radio': return 'Radio Proof of Performance';
      case 'podcast': return 'Podcast Proof of Performance';
      default: return 'Proof of Performance';
    }
  };

  const getUploadLabel = () => {
    switch (channel) {
      case 'print': return 'Upload Tearsheet';
      case 'radio': return 'Upload Affidavit';
      case 'podcast': return 'Upload Screenshot';
      default: return 'Upload File';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{getTitle()}</h3>
          {!isRequired && (
            <p className="text-xs text-muted-foreground">Proof is encouraged but optional</p>
          )}
        </div>
        {isRequired && (
          <Badge variant="destructive" className="text-xs">Required</Badge>
        )}
      </div>

      {/* Mode Selection */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as ProofMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {getUploadLabel()}
          </TabsTrigger>
          <TabsTrigger value="attestation" className="text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Attestation Form
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4 mt-4">
          {/* Drop Zone */}
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
                  <FileText className="w-6 h-6 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFile(null)}>
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
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </p>
              </div>
            )}
          </div>

          {/* Basic fields for upload mode */}
          {channel === 'print' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Publication Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {publicationDate ? format(publicationDate, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={publicationDate} onSelect={setPublicationDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Page Number</Label>
                <Input
                  placeholder="e.g., 12"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Attestation Tab */}
        <TabsContent value="attestation" className="space-y-4 mt-4">
          {/* Print Attestation */}
          {channel === 'print' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Publication Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {publicationDate ? format(publicationDate, "MMM d, yyyy") : "Select"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={publicationDate} onSelect={setPublicationDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Page Number <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., 12"
                    value={pageNumber}
                    onChange={(e) => setPageNumber(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Section <span className="text-red-500">*</span></Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINT_SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ad Size <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., Full Page, Half Page"
                    value={adSize}
                    onChange={(e) => setAdSize(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Radio Attestation */}
          {channel === 'radio' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dateRangeStart ? format(dateRangeStart, "MMM d, yyyy") : "Select"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateRangeStart} onSelect={setDateRangeStart} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dateRangeEnd ? format(dateRangeEnd, "MMM d, yyyy") : "Same as start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={dateRangeEnd} 
                        onSelect={setDateRangeEnd}
                        disabled={(date) => dateRangeStart ? date < dateRangeStart : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Spots Aired <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 24"
                    value={spotsAired}
                    onChange={(e) => setSpotsAired(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimated Reach</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 50000"
                    value={estimatedReach}
                    onChange={(e) => setEstimatedReach(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dayparts <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {RADIO_DAYPARTS.map((daypart) => (
                    <label
                      key={daypart.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors",
                        selectedDayparts.includes(daypart.id)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedDayparts.includes(daypart.id)}
                        onCheckedChange={() => toggleDaypart(daypart.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{daypart.label}</p>
                        <p className="text-[10px] text-muted-foreground">{daypart.timeRange}</p>
                      </div>
                      {daypart.isPremium && (
                        <Badge variant="secondary" className="text-[9px]">Premium</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Podcast Attestation */}
          {channel === 'podcast' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Episode Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {episodeDate ? format(episodeDate, "MMM d, yyyy") : "Select"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={episodeDate} onSelect={setEpisodeDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Downloads <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 8500"
                    value={downloads}
                    onChange={(e) => setDownloads(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Episode Name/Number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g., Episode 45: Interview with..."
                  value={episodeName}
                  onChange={(e) => setEpisodeName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ad Position <span className="text-red-500">*</span></Label>
                  <Select value={adPosition} onValueChange={setAdPosition}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {PODCAST_AD_POSITIONS.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          <div>
                            <span>{pos.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">({pos.description})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Episode URL (optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={episodeUrl}
                    onChange={(e) => setEpisodeUrl(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30 cursor-pointer">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              className="mt-0.5"
            />
            <div className="text-xs">
              <p className="font-medium">I confirm this ad ran as specified</p>
              <p className="text-muted-foreground">
                {channel === 'print' && 'The ad appeared in the publication on the specified date and page.'}
                {channel === 'radio' && 'The spots aired during the specified dates and dayparts.'}
                {channel === 'podcast' && 'The ad was included in the specified episode.'}
              </p>
            </div>
          </label>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          size="sm" 
          onClick={handleSubmit}
          disabled={!canSubmit() || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Proof
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default OfflineProofForm;
