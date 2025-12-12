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
      {/* Date Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
      </div>

      {/* Quick Select */}
      <div className="space-y-2 pt-4 border-t">
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
      </div>
    </div>
  );
}


