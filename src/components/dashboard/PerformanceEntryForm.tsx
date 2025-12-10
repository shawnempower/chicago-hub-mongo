/**
 * Performance Entry Form
 * 
 * Compact, channel-specific form for publications to manually enter performance data.
 * Auto-fills known information from the order and placement context.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  PerformanceChannel,
  PerformanceMetrics,
  getChannelMetricFields,
  METRIC_LABELS,
} from '@/integrations/mongodb/performanceEntrySchema';

interface Placement {
  itemPath: string;
  itemName: string;
  channel: PerformanceChannel;
  dimensions?: string;
}

interface PerformanceEntryFormProps {
  orderId: string;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  placements: Placement[];
  onSuccess?: () => void;
  onCancel?: () => void;
  existingEntry?: any; // For editing
}

export function PerformanceEntryForm({
  orderId,
  campaignId,
  publicationId,
  publicationName,
  placements,
  onSuccess,
  onCancel,
  existingEntry,
}: PerformanceEntryFormProps) {
  const [saving, setSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(!!existingEntry?.notes);
  
  // Auto-select first placement if only one exists
  const defaultPlacement = existingEntry 
    ? placements.find(p => p.itemPath === existingEntry.itemPath) || placements[0]
    : placements.length === 1 ? placements[0] : null;
    
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(defaultPlacement);
  const [dateStart, setDateStart] = useState<Date | undefined>(
    existingEntry?.dateStart ? new Date(existingEntry.dateStart) : new Date()
  );
  const [dateEnd, setDateEnd] = useState<Date | undefined>(
    existingEntry?.dateEnd ? new Date(existingEntry.dateEnd) : undefined
  );
  const [metrics, setMetrics] = useState<PerformanceMetrics>(existingEntry?.metrics || {});
  const [notes, setNotes] = useState(existingEntry?.notes || '');

  // Get relevant metric fields based on selected channel
  const relevantFields = selectedPlacement 
    ? getChannelMetricFields(selectedPlacement.channel)
    : [];

  const handleMetricChange = (field: keyof PerformanceMetrics, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setMetrics(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlacement || !dateStart) {
      toast({
        title: 'Missing Information',
        description: 'Please select a placement and date',
        variant: 'destructive',
      });
      return;
    }

    // Check that at least one metric is provided
    const hasMetrics = Object.values(metrics).some(v => v !== undefined && v !== null);
    if (!hasMetrics) {
      toast({
        title: 'Missing Metrics',
        description: 'Please enter at least one metric value',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      const url = existingEntry 
        ? `${API_BASE_URL}/performance-entries/${existingEntry._id}`
        : `${API_BASE_URL}/performance-entries`;
      
      const method = existingEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          campaignId,
          publicationId,
          publicationName,
          itemPath: selectedPlacement.itemPath,
          itemName: selectedPlacement.itemName,
          channel: selectedPlacement.channel,
          dimensions: selectedPlacement.dimensions,
          dateStart: dateStart.toISOString(),
          dateEnd: dateEnd?.toISOString(),
          metrics,
          notes: notes || undefined,
          source: 'manual',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save entry');
      }

      toast({
        title: 'Success',
        description: existingEntry ? 'Performance entry updated' : 'Performance entry saved',
      });

      onSuccess?.();
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

  // Channel-specific help text
  const getChannelHint = (channel: string) => {
    switch (channel) {
      case 'print': return 'Enter insertions (issues) and total circulation';
      case 'radio': return 'Enter spots aired and estimated reach';
      case 'newsletter': return 'Clicks are more reliable than opens due to privacy features';
      case 'podcast': return 'Enter downloads and listen-through data';
      case 'social_media': return 'Enter impressions, engagements, and shares';
      case 'events': return 'Enter attendance and any leads generated';
      default: return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-4">
        {/* Placement - show as badge if only one, otherwise dropdown */}
        {placements.length === 1 ? (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Badge variant="secondary" className="capitalize">{placements[0].channel}</Badge>
            <span className="font-medium">{placements[0].itemName}</span>
            {placements[0].dimensions && (
              <span className="text-muted-foreground text-sm">({placements[0].dimensions})</span>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Placement</Label>
            <Select
              value={selectedPlacement?.itemPath || ''}
              onValueChange={(value) => {
                const placement = placements.find(p => p.itemPath === value || p.itemPath === value.split('-').slice(2).join('-'));
                setSelectedPlacement(placement || null);
                setMetrics({}); // Reset metrics when placement changes
              }}
              disabled={!!existingEntry}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                {placements.map((placement, idx) => (
                  <SelectItem 
                    key={placement.itemPath || `placement-${idx}`} 
                    value={placement.itemPath || `placement-${idx}-${placement.itemName}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded capitalize">
                        {placement.channel}
                      </span>
                      <span>{placement.itemName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Row - Compact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">End Date (optional)</Label>
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
                  {dateEnd ? format(dateEnd, "MMM d, yyyy") : "—"}
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
        </div>

        {/* Channel-Specific Metrics */}
        {selectedPlacement && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Enter Metrics</Label>
              {getChannelHint(selectedPlacement.channel) && (
                <span className="text-xs text-muted-foreground">
                  {getChannelHint(selectedPlacement.channel)}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {relevantFields.map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={field} className="text-xs text-muted-foreground">
                    {METRIC_LABELS[field]}
                  </Label>
                  <Input
                    id={field}
                    type="number"
                    min="0"
                    step={field === 'ctr' || field === 'completionRate' || field === 'viewability' ? '0.01' : '1'}
                    placeholder="0"
                    className="h-9"
                    value={metrics[field] ?? ''}
                    onChange={(e) => handleMetricChange(field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes - Collapsible */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showNotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Add notes (optional)
          </button>
          {showNotes && (
            <Textarea
              placeholder="e.g., Ran in Sunday edition, premium placement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-2 text-sm"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={saving || !selectedPlacement || !dateStart}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {existingEntry ? 'Update' : 'Save Entry'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default PerformanceEntryForm;
