/**
 * Report Results Form
 * 
 * Unified, user-friendly form for publications to report their results.
 * Combines metrics + proof in one natural flow with plain language.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  Upload, 
  FileText, 
  X, 
  Loader2,
  CheckCircle2,
  HelpCircle,
  Newspaper,
  Radio,
  Mic,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  RADIO_DAYPARTS,
  PODCAST_AD_POSITIONS,
  PRINT_SECTIONS,
  getChannelConfig,
  getMetricDefinitions,
  requiresProof,
} from '@/config/inventoryChannels';
import { formatFileSize, MAX_FILE_SIZE } from '@/integrations/mongodb/proofOfPerformanceSchema';

type Channel = 'print' | 'radio' | 'podcast';

interface ReportResultsFormProps {
  orderId: string;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  placement: {
    itemPath: string;
    itemName: string;
    channel: string;
    dimensions?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReportResultsForm({
  orderId,
  campaignId,
  publicationId,
  publicationName,
  placement,
  onSuccess,
  onCancel,
}: ReportResultsFormProps) {
  const channel = placement.channel as Channel;
  const channelConfig = getChannelConfig(channel);
  const proofRequired = requiresProof(channel);
  
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = proofRequired ? 3 : 2; // Date, Metrics, Proof (if required)

  // Common fields
  const [runDate, setRunDate] = useState<Date | undefined>(new Date());
  const [runDateEnd, setRunDateEnd] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  // Print fields
  const [circulation, setCirculation] = useState('');
  const [estimatedReaders, setEstimatedReaders] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [section, setSection] = useState('');

  // Radio fields
  const [spotsAired, setSpotsAired] = useState('');
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>([]);
  const [estimatedReach, setEstimatedReach] = useState('');

  // Podcast fields
  const [episodeName, setEpisodeName] = useState('');
  const [downloads, setDownloads] = useState('');
  const [adPosition, setAdPosition] = useState('');
  const [episodeUrl, setEpisodeUrl] = useState('');

  // Proof fields
  const [proofMethod, setProofMethod] = useState<'upload' | 'attestation'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const getChannelIcon = () => {
    switch (channel) {
      case 'print': return <Newspaper className="w-5 h-5" />;
      case 'radio': return <Radio className="w-5 h-5" />;
      case 'podcast': return <Mic className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

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

  const canProceed = () => {
    if (step === 1) {
      return !!runDate;
    }
    if (step === 2) {
      switch (channel) {
        case 'print': return !!circulation;
        case 'radio': return !!spotsAired && selectedDayparts.length > 0;
        case 'podcast': return !!downloads && !!episodeName;
        default: return true;
      }
    }
    if (step === 3) {
      if (proofMethod === 'upload') {
        return !!selectedFile;
      }
      // Attestation mode
      switch (channel) {
        case 'print': return !!pageNumber && !!section && confirmed;
        case 'radio': return confirmed;
        case 'podcast': return !!adPosition && confirmed;
        default: return confirmed;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      // Build metrics based on channel
      const metrics: Record<string, number> = {};
      switch (channel) {
        case 'print':
          if (circulation) metrics.circulation = parseInt(circulation);
          if (estimatedReaders) metrics.reach = parseInt(estimatedReaders);
          metrics.insertions = 1; // Single issue
          break;
        case 'radio':
          if (spotsAired) metrics.spotsAired = parseInt(spotsAired);
          if (estimatedReach) metrics.reach = parseInt(estimatedReach);
          break;
        case 'podcast':
          if (downloads) metrics.downloads = parseInt(downloads);
          break;
      }
      
      // 1. Create performance entry
      const entryRes = await fetch(`${API_BASE_URL}/performance-entries`, {
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
          itemPath: placement.itemPath,
          itemName: placement.itemName,
          channel: placement.channel,
          dimensions: placement.dimensions,
          dateStart: runDate?.toISOString(),
          dateEnd: runDateEnd?.toISOString(),
          metrics,
          notes: notes || undefined,
          source: 'manual',
        }),
      });

      if (!entryRes.ok) {
        const error = await entryRes.json();
        throw new Error(error.error || 'Failed to save results');
      }

      // 2. Handle proof submission
      if (proofRequired || selectedFile) {
        let fileUrl = '';
        let s3Key = '';
        
        if (proofMethod === 'upload' && selectedFile) {
          // Upload file through server (avoids CORS issues)
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('orderId', orderId);
          formData.append('campaignId', campaignId);
          
          const uploadRes = await fetch(`${API_BASE_URL}/proof-of-performance/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              // Don't set Content-Type - browser will set it with boundary for FormData
            },
            body: formData,
          });

          if (!uploadRes.ok) throw new Error('Failed to upload file');
          
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.fileUrl;
          s3Key = uploadData.s3Key;
        }

        // Build attestation data
        const attestationData: any = {
          channel,
          confirmedAt: new Date(),
          confirmedBy: '',
        };
        
        switch (channel) {
          case 'print':
            attestationData.publicationDate = runDate?.toISOString();
            attestationData.pageNumber = pageNumber;
            attestationData.section = section;
            break;
          case 'radio':
            attestationData.dateRange = {
              start: runDate?.toISOString(),
              end: runDateEnd?.toISOString() || runDate?.toISOString(),
            };
            attestationData.spotsAired = parseInt(spotsAired) || 0;
            attestationData.dayparts = selectedDayparts;
            if (estimatedReach) attestationData.estimatedReach = parseInt(estimatedReach);
            break;
          case 'podcast':
            attestationData.episodeDate = runDate?.toISOString();
            attestationData.episodeName = episodeName;
            attestationData.downloads = parseInt(downloads) || 0;
            attestationData.adPosition = adPosition;
            if (episodeUrl) attestationData.episodeUrl = episodeUrl;
            break;
        }

        // Create proof record
        const proofData: any = {
          orderId,
          campaignId,
          publicationId,
          publicationName,
          itemPath: placement.itemPath,
          itemName: placement.itemName,
          channel: placement.channel,
          fileType: proofMethod === 'upload' 
            ? (channel === 'print' ? 'tearsheet' : channel === 'radio' ? 'affidavit' : 'screenshot')
            : 'attestation',
          runDate: runDate?.toISOString(),
          runDateEnd: runDateEnd?.toISOString(),
          attestationData,
        };

        if (proofMethod === 'upload' && selectedFile) {
          proofData.fileName = selectedFile.name;
          proofData.fileUrl = fileUrl;
          proofData.s3Key = s3Key;
          proofData.fileSize = selectedFile.size;
          proofData.mimeType = selectedFile.type;
        } else {
          // Attestation - use placeholder values
          proofData.fileName = `${channel}_attestation_${Date.now()}`;
          proofData.fileUrl = 'attestation://no-file';
          proofData.s3Key = 'attestation://no-file';
          proofData.fileSize = 0;
          proofData.mimeType = 'application/json';
        }

        const proofRes = await fetch(`${API_BASE_URL}/proof-of-performance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(proofData),
        });

        if (!proofRes.ok) {
          console.warn('Failed to save proof, but results were saved');
        }
      }

      toast({
        title: 'Results Submitted!',
        description: 'Your results have been recorded successfully',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting results:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit results',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <div className={cn("p-2.5 rounded-lg", channelConfig.bgColor)}>
          {getChannelIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{placement.itemName}</p>
          <p className="text-sm text-muted-foreground capitalize">{channelConfig.label}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Step {step} of {totalSteps}</span>
          <span className="font-medium">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step 1: When did it run? */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">📅 When did it run?</h3>
            <p className="text-sm text-muted-foreground">
              {channel === 'print' && 'Select the publication date of the issue containing your ad'}
              {channel === 'radio' && 'Select the dates when your spots aired'}
              {channel === 'podcast' && 'Select the date the episode was published'}
            </p>
          </div>

          <div className={channel === 'radio' ? 'grid grid-cols-2 gap-4' : ''}>
            <div className="space-y-2">
              <Label>
                {channel === 'print' && 'Issue Date'}
                {channel === 'radio' && 'Start Date'}
                {channel === 'podcast' && 'Episode Date'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {runDate ? format(runDate, "MMMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={runDate} onSelect={setRunDate} />
                </PopoverContent>
              </Popover>
            </div>

            {channel === 'radio' && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {runDateEnd ? format(runDateEnd, "MMMM d, yyyy") : "Same as start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={runDateEnd} 
                      onSelect={setRunDateEnd}
                      disabled={(date) => runDate ? date < runDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Performance Numbers */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">📊 Performance Numbers</h3>
            <p className="text-sm text-muted-foreground">
              {channel === 'print' && 'How many copies were distributed?'}
              {channel === 'radio' && 'How many spots aired and when?'}
              {channel === 'podcast' && 'Tell us about the episode'}
            </p>
          </div>

          {/* Print Metrics */}
          {channel === 'print' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Circulation <span className="text-red-500">*</span>
                  <span className="text-xs text-muted-foreground font-normal">(total copies distributed)</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 25000"
                  value={circulation}
                  onChange={(e) => setCirculation(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Enter the total number of copies printed and distributed
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Estimated Readers
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 62500"
                  value={estimatedReaders}
                  onChange={(e) => setEstimatedReaders(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Typically 2-3x circulation due to pass-along readership
                </p>
              </div>
            </div>
          )}

          {/* Radio Metrics */}
          {channel === 'radio' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Total Spots Aired <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 24"
                  value={spotsAired}
                  onChange={(e) => setSpotsAired(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Dayparts <span className="text-red-500">*</span>
                  <span className="text-xs text-muted-foreground font-normal">(when did spots air?)</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {RADIO_DAYPARTS.map((daypart) => (
                    <label
                      key={daypart.id}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedDayparts.includes(daypart.id)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedDayparts.includes(daypart.id)}
                        onCheckedChange={() => toggleDaypart(daypart.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{daypart.label}</p>
                        <p className="text-xs text-muted-foreground">{daypart.timeRange}</p>
                      </div>
                      {daypart.isPremium && (
                        <Badge variant="secondary" className="text-[10px]">Premium</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Reach <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 50000"
                  value={estimatedReach}
                  onChange={(e) => setEstimatedReach(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Podcast Metrics */}
          {channel === 'podcast' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Episode Name/Number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g., Episode 45: Interview with..."
                  value={episodeName}
                  onChange={(e) => setEpisodeName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Downloads <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 8500"
                  value={downloads}
                  onChange={(e) => setDownloads(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Check your podcast hosting platform for download stats
                </p>
              </div>

              <div className="space-y-2">
                <Label>Episode URL <span className="text-xs text-muted-foreground font-normal">(optional but helpful)</span></Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={episodeUrl}
                  onChange={(e) => setEpisodeUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2 pt-2">
            <Label>Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Any additional context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Step 3: Proof (if required) */}
      {step === 3 && proofRequired && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              📄 Proof of Performance
              {proofRequired && <Badge variant="destructive" className="ml-2 text-[10px]">Required</Badge>}
            </h3>
            <p className="text-sm text-muted-foreground">
              {channel === 'print' && 'Upload a tearsheet (scan/photo) or confirm the placement details'}
              {channel === 'radio' && 'Upload an affidavit or confirm the airing details'}
              {channel === 'podcast' && 'Upload analytics screenshot or confirm the episode details'}
            </p>
          </div>

          {/* Proof Method Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProofMethod('upload')}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                proofMethod === 'upload' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-primary/50"
              )}
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">
                {channel === 'print' && 'Upload Tearsheet'}
                {channel === 'radio' && 'Upload Affidavit'}
                {channel === 'podcast' && 'Upload Screenshot'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setProofMethod('attestation')}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                proofMethod === 'attestation' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-primary/50"
              )}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm font-medium">I Confirm It Ran</span>
            </button>
          </div>

          {/* Upload Mode */}
          {proofMethod === 'upload' && (
            <div className="space-y-3">
              {selectedFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                  <span className="text-xs text-muted-foreground">Max {formatFileSize(MAX_FILE_SIZE)}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Attestation Mode */}
          {proofMethod === 'attestation' && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              {channel === 'print' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Page Number <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g., 12"
                      value={pageNumber}
                      onChange={(e) => setPageNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section <span className="text-red-500">*</span></Label>
                    <Select value={section} onValueChange={setSection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINT_SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {channel === 'podcast' && (
                <div className="space-y-2">
                  <Label>Ad Position <span className="text-red-500">*</span></Label>
                  <Select value={adPosition} onValueChange={setAdPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where in the episode?" />
                    </SelectTrigger>
                    <SelectContent>
                      {PODCAST_AD_POSITIONS.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.label} - {pos.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-lg border bg-background cursor-pointer">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-medium">I confirm this ad ran as specified</p>
                  <p className="text-muted-foreground">
                    {channel === 'print' && `The ad appeared on page ${pageNumber || '___'} in the ${section || '___'} section on ${runDate ? format(runDate, 'MMM d, yyyy') : '___'}.`}
                    {channel === 'radio' && `${spotsAired || '___'} spots aired between ${runDate ? format(runDate, 'MMM d') : '___'} - ${runDateEnd ? format(runDateEnd, 'MMM d') : runDate ? format(runDate, 'MMM d') : '___'}.`}
                    {channel === 'podcast' && `The ad appeared in "${episodeName || '___'}" as a ${adPosition || '___'} spot.`}
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === 1) {
              onCancel?.();
            } else {
              setStep(step - 1);
            }
          }}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        {step < totalSteps ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Results
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ReportResultsForm;






