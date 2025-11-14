/**
 * Campaign Timeline Step - Step 3 of Campaign Builder
 * 
 * Collects campaign start/end dates and calculates duration
 */

import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
import { format, differenceInMonths, differenceInDays, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface CampaignTimelineStepProps {
  formData: {
    startDate: Date | null;
    endDate: Date | null;
  };
  updateFormData: (updates: Partial<CampaignTimelineStepProps['formData']>) => void;
}

export function CampaignTimelineStep({ formData, updateFormData }: CampaignTimelineStepProps) {
  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) {
      return null;
    }
    
    const months = differenceInMonths(formData.endDate, formData.startDate);
    const days = differenceInDays(formData.endDate, formData.startDate);
    
    return { months, days };
  };

  const duration = calculateDuration();

  const handleQuickSelect = (months: number) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addMonths(start, months);
    
    updateFormData({
      startDate: start,
      endDate: end,
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Select */}
      <div className="space-y-2">
        <Label>Quick Select Duration</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 6, 12].map(months => (
            <Button
              key={months}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(months)}
            >
              {months} {months === 1 ? 'Month' : 'Months'}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Start today and run for a preset duration
        </p>
      </div>

      {/* Date Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
        {/* Start Date */}
        <div className="space-y-2">
          <Label>Start Date <span className="text-red-500">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startDate || undefined}
                onSelect={(date) => updateFormData({ startDate: date || null })}
                initialFocus
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground">
            When the campaign begins
          </p>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label>End Date <span className="text-red-500">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.endDate || undefined}
                onSelect={(date) => updateFormData({ endDate: date || null })}
                initialFocus
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return true;
                  if (formData.startDate && date <= formData.startDate) return true;
                  return false;
                }}
              />
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground">
            When the campaign ends
          </p>
        </div>
      </div>

      {/* Duration Summary */}
      {duration && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Campaign Duration</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  <strong>{duration.months}</strong> {duration.months === 1 ? 'month' : 'months'} 
                  {' '}({duration.days} days)
                </p>
                <p>
                  From <strong>{format(formData.startDate!, 'MMM d, yyyy')}</strong> to{' '}
                  <strong>{format(formData.endDate!, 'MMM d, yyyy')}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Time Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">📅 Lead Time Requirements</h4>
        <p className="text-sm text-amber-800 mb-2">
          Most publications require <strong>5-10 business days lead time</strong> for campaign setup:
        </p>
        <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
          <li><strong>Creative materials:</strong> Ads, graphics, copy must be submitted early</li>
          <li><strong>Print publications:</strong> Often need 2-3 weeks for production schedules</li>
          <li><strong>Radio/Podcast:</strong> Recording and approval time needed</li>
          <li><strong>Website/Digital:</strong> Usually faster, but still need setup time</li>
        </ul>
        <p className="text-sm text-amber-800 mt-2">
          Plan accordingly to ensure smooth campaign launch!
        </p>
      </div>

      {/* Recommendations */}
      {duration && duration.months > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">💡 Campaign Recommendations</h4>
          <ul className="text-sm text-green-800 space-y-1 ml-4 list-disc">
            {duration.months >= 6 && (
              <li>Long campaign - consider quarterly reviews and optimization opportunities</li>
            )}
            {duration.months >= 3 && duration.months < 6 && (
              <li>Good duration for seasonal campaigns and sustained brand awareness</li>
            )}
            {duration.months < 3 && (
              <li>Short campaign - focus on high-impact placements and clear messaging</li>
            )}
            <li>Volume discounts (12x frequency tiers) available for longer commitments</li>
            <li>Consider budget pacing: front-load or distribute evenly?</li>
          </ul>
        </div>
      )}
    </div>
  );
}


