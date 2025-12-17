/**
 * QuickPerformanceEntry Component
 * 
 * Streamlined entry forms for each channel type.
 * Combines metrics entry with proof submission in a single flow.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle2,
  Plus,
  FileText,
  Newspaper,
  Radio,
  Mic,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { PerformanceMetrics } from '@/integrations/mongodb/performanceEntrySchema';
import { 
  getMetricDefinitions, 
  requiresProof,
  getChannelConfig,
} from '@/config/inventoryChannels';
import { MetricExplainer, QuickReferenceCard } from './MetricExplainer';
import { OfflineProofForm } from './OfflineProofForm';

interface Placement {
  itemPath: string;
  itemName: string;
  channel: string;
  dimensions?: string;
}

interface QuickPerformanceEntryProps {
  orderId: string;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  placement: Placement;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Show proof form inline (default) or as a separate step */
  proofMode?: 'inline' | 'separate';
}

export function QuickPerformanceEntry({
  orderId,
  campaignId,
  publicationId,
  publicationName,
  placement,
  onSuccess,
  onCancel,
  proofMode = 'inline',
}: QuickPerformanceEntryProps) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'metrics' | 'proof'>('metrics');
  const [showProofForm, setShowProofForm] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  // Metrics state
  const [dateStart, setDateStart] = useState<Date | undefined>(new Date());
  const [dateEnd, setDateEnd] = useState<Date | undefined>();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  
  const channel = placement.channel;
  const channelConfig = getChannelConfig(channel);
  const metricDefinitions = getMetricDefinitions(channel);
  const needsProof = requiresProof(channel);
  const isOfflineChannel = ['print', 'radio', 'podcast'].includes(channel);

  const handleMetricChange = (field: keyof PerformanceMetrics, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setMetrics(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const hasRequiredMetrics = () => {
    const required = metricDefinitions.filter(d => d.required);
    return required.every(d => metrics[d.key as keyof PerformanceMetrics] !== undefined);
  };

  const canSubmitMetrics = () => {
    // Must have at least one metric
    const hasAnyMetric = Object.values(metrics).some(v => v !== undefined && v !== null);
    if (!hasAnyMetric) return false;
    
    // For offline channels, should have required metrics
    if (isOfflineChannel) {
      return hasRequiredMetrics();
    }
    
    return true;
  };

  const handleSubmitMetrics = async () => {
    if (!canSubmitMetrics()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the required metrics',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/performance-entries`, {
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
          dateStart: dateStart?.toISOString(),
          dateEnd: dateEnd?.toISOString(),
          metrics,
          source: 'manual',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save entry');
      }

      toast({
        title: 'Performance Saved',
        description: 'Your performance data has been recorded',
      });

      // If proof is required and mode is separate, go to proof step
      if (needsProof && proofMode === 'separate' && !proofSubmitted) {
        setStep('proof');
      } else {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error saving performance entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save entry',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProofSuccess = () => {
    setProofSubmitted(true);
    setShowProofForm(false);
    
    if (step === 'proof') {
      // We were in separate proof step, now complete
      onSuccess?.();
    }
  };

  const getChannelIcon = () => {
    switch (channel) {
      case 'print': return <Newspaper className="w-5 h-5" />;
      case 'radio': return <Radio className="w-5 h-5" />;
      case 'podcast': return <Mic className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // Separate proof step view
  if (step === 'proof' && proofMode === 'separate') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Submit Proof of Performance
          </CardTitle>
          <CardDescription>
            Performance data saved. Now submit proof that the ad ran.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OfflineProofForm
            orderId={orderId}
            campaignId={campaignId}
            publicationId={publicationId}
            publicationName={publicationName}
            channel={channel as 'print' | 'radio' | 'podcast'}
            itemPath={placement.itemPath}
            itemName={placement.itemName}
            onSuccess={handleProofSuccess}
            onCancel={() => {
              // Allow skipping proof for non-required
              if (!needsProof) {
                onSuccess?.();
              }
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className={cn("p-2 rounded", channelConfig.bgColor)}>
          {getChannelIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{placement.itemName}</p>
          <p className="text-xs text-muted-foreground capitalize">{channelConfig.label}</p>
        </div>
        {placement.dimensions && (
          <Badge variant="outline" className="text-xs">{placement.dimensions}</Badge>
        )}
      </div>

      {/* Quick Reference */}
      {isOfflineChannel && (
        <QuickReferenceCard channel={channel} />
      )}

      {/* Date Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {channel === 'print' ? 'Issue Date' : 
             channel === 'radio' ? 'Start Date' :
             channel === 'podcast' ? 'Episode Date' : 'Date'}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 justify-start text-left font-normal",
                  !dateStart && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {dateStart ? format(dateStart, "MMM d, yyyy") : "Select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateStart}
                onSelect={setDateStart}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {channel === 'radio' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-left font-normal",
                    !dateEnd && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateEnd ? format(dateEnd, "MMM d, yyyy") : "Same as start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateEnd}
                  onSelect={setDateEnd}
                  disabled={(date) => dateStart ? date < dateStart : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <Label className="font-medium">Performance Metrics</Label>
        <div className="grid grid-cols-2 gap-3">
          {metricDefinitions.map((metricDef) => (
            <div key={metricDef.key} className="space-y-1">
              <div className="flex items-center gap-1">
                <Label htmlFor={metricDef.key} className="text-xs text-muted-foreground">
                  {metricDef.label}
                  {metricDef.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                <MetricExplainer 
                  metricKey={metricDef.key} 
                  channel={channel} 
                  variant="tooltip"
                />
              </div>
              <Input
                id={metricDef.key}
                type="number"
                min="0"
                step={metricDef.unit === '%' ? '0.01' : '1'}
                placeholder={metricDef.unit ? `0 ${metricDef.unit}` : '0'}
                className="h-9"
                value={metrics[metricDef.key as keyof PerformanceMetrics] ?? ''}
                onChange={(e) => handleMetricChange(metricDef.key as keyof PerformanceMetrics, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Inline Proof Section */}
      {isOfflineChannel && proofMode === 'inline' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Proof of Performance</Label>
                {needsProof ? (
                  <Badge variant="destructive" className="ml-2 text-[10px]">Required</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2 text-[10px]">Encouraged</Badge>
                )}
              </div>
              {proofSubmitted && (
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
              )}
            </div>

            {!proofSubmitted && !showProofForm && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowProofForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Proof
              </Button>
            )}

            {showProofForm && (
              <Card>
                <CardContent className="pt-4">
                  <OfflineProofForm
                    orderId={orderId}
                    campaignId={campaignId}
                    publicationId={publicationId}
                    publicationName={publicationName}
                    channel={channel as 'print' | 'radio' | 'podcast'}
                    itemPath={placement.itemPath}
                    itemName={placement.itemName}
                    onSuccess={handleProofSuccess}
                    onCancel={() => setShowProofForm(false)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          size="sm" 
          onClick={handleSubmitMetrics}
          disabled={!canSubmitMetrics() || saving || (needsProof && !proofSubmitted && proofMode === 'inline')}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {proofMode === 'separate' && needsProof ? 'Save & Continue' : 'Save Entry'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default QuickPerformanceEntry;

