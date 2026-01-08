/**
 * Edit Performance Entry Form
 * 
 * Simple form for editing an existing performance entry.
 * Allows updating dates, metrics, and notes.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  Loader2,
  CheckCircle2,
  Newspaper,
  Radio,
  Mic,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { PerformanceEntry, PerformanceMetrics, METRIC_LABELS, getChannelMetricFields } from '@/integrations/mongodb/performanceEntrySchema';
import { getChannelConfig } from '@/config/inventoryChannels';

interface EditPerformanceEntryFormProps {
  entry: PerformanceEntry;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditPerformanceEntryForm({
  entry,
  onSuccess,
  onCancel,
}: EditPerformanceEntryFormProps) {
  const channelConfig = getChannelConfig(entry.channel);
  
  const [saving, setSaving] = useState(false);
  
  // Date fields
  const [dateStart, setDateStart] = useState<Date | undefined>(
    entry.dateStart ? new Date(entry.dateStart) : undefined
  );
  const [dateEnd, setDateEnd] = useState<Date | undefined>(
    entry.dateEnd ? new Date(entry.dateEnd) : undefined
  );
  
  // Notes
  const [notes, setNotes] = useState(entry.notes || '');
  
  // Metrics - initialize from entry
  const [metrics, setMetrics] = useState<PerformanceMetrics>({ ...entry.metrics });

  const getChannelIcon = () => {
    switch (entry.channel) {
      case 'print': return <Newspaper className="w-4 h-4" />;
      case 'radio': return <Radio className="w-4 h-4" />;
      case 'podcast': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get relevant metrics for this channel
  const relevantMetrics = getChannelMetricFields(entry.channel);
  
  // Filter to only show metrics that have values or are commonly used
  const displayMetrics = relevantMetrics.filter(key => 
    metrics[key] !== undefined || 
    ['impressions', 'clicks', 'circulation', 'spotsAired', 'downloads', 'insertions', 'reach'].includes(key)
  );

  const handleMetricChange = (key: keyof PerformanceMetrics, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value);
    setMetrics(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const handleSubmit = async () => {
    if (!dateStart) {
      toast({
        title: 'Missing Date',
        description: 'Please select a start date',
        variant: 'destructive',
      });
      return;
    }
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      // Clean up metrics - remove undefined values
      const cleanMetrics: Record<string, number> = {};
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== undefined && value !== null && !isNaN(value)) {
          cleanMetrics[key] = value;
        }
      });
      
      const res = await fetch(`${API_BASE_URL}/performance-entries/${entry._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateStart: dateStart.toISOString(),
          dateEnd: dateEnd?.toISOString(),
          metrics: cleanMetrics,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update entry');
      }

      toast({
        title: 'Entry Updated',
        description: 'Performance entry has been updated successfully',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update entry',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Entry Info Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className={cn("p-2 rounded-lg", channelConfig.bgColor)}>
          {getChannelIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entry.itemName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="capitalize text-xs">
              {entry.channel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {entry.publicationName}
            </span>
          </div>
        </div>
      </div>

      {/* Date Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateStart ? format(dateStart, "MMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateStart} onSelect={setDateStart} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateEnd ? format(dateEnd, "MMM d, yyyy") : "Same as start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={dateEnd} 
                  onSelect={setDateEnd}
                  disabled={(date) => dateStart ? date < dateStart : false}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Separator />

      {/* Metrics */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Metrics</Label>
        <div className="grid grid-cols-2 gap-4">
          {displayMetrics.map((metricKey) => (
            <div key={metricKey} className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">
                {METRIC_LABELS[metricKey] || metricKey}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={metrics[metricKey] ?? ''}
                onChange={(e) => handleMetricChange(metricKey, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
        <Textarea
          placeholder="Any additional context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default EditPerformanceEntryForm;



