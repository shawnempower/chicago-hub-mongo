/**
 * Campaign Timeline Step - Step 4 of Campaign Builder
 * 
 * Collects campaign start/end dates and calculates duration
 * Dates are pre-populated based on selected package duration
 */

import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, differenceInMonths, differenceInDays, differenceInWeeks, addMonths, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CampaignTimelineStepProps {
  formData: {
    startDate: Date | null;
    endDate: Date | null;
  };
  updateFormData: (updates: Partial<CampaignTimelineStepProps['formData']>) => void;
  selectedPackageData?: any;
}

export function CampaignTimelineStep({ formData, updateFormData, selectedPackageData }: CampaignTimelineStepProps) {
  // Get package duration info
  const packageDuration = selectedPackageData?.metadata?.builderInfo?.originalDuration;
  const packageDurationUnit = selectedPackageData?.metadata?.builderInfo?.originalDurationUnit || 'months';
  
  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) {
      return null;
    }
    
    const months = differenceInMonths(formData.endDate, formData.startDate);
    const weeks = differenceInWeeks(formData.endDate, formData.startDate);
    const days = differenceInDays(formData.endDate, formData.startDate);
    
    return { months, weeks, days };
  };

  const duration = calculateDuration();
  
  // Check if current dates match the package duration
  const checkDurationMatch = () => {
    if (!packageDuration || !duration) return { matches: true, message: '' };
    
    if (packageDurationUnit === 'weeks') {
      const expectedWeeks = packageDuration;
      const actualWeeks = duration.weeks;
      if (Math.abs(actualWeeks - expectedWeeks) <= 0) {
        return { matches: true, message: `${expectedWeeks} week${expectedWeeks > 1 ? 's' : ''}` };
      }
      return { 
        matches: false, 
        expected: `${expectedWeeks} week${expectedWeeks > 1 ? 's' : ''}`,
        actual: `${actualWeeks} week${actualWeeks !== 1 ? 's' : ''}`
      };
    } else {
      const expectedMonths = packageDuration;
      const actualMonths = duration.months;
      if (Math.abs(actualMonths - expectedMonths) <= 0) {
        return { matches: true, message: `${expectedMonths} month${expectedMonths > 1 ? 's' : ''}` };
      }
      return { 
        matches: false, 
        expected: `${expectedMonths} month${expectedMonths > 1 ? 's' : ''}`,
        actual: `${actualMonths} month${actualMonths !== 1 ? 's' : ''}`
      };
    }
  };
  
  const durationMatch = checkDurationMatch();

  const handleQuickSelect = (value: number, unit: 'weeks' | 'months') => {
    const start = formData.startDate || new Date();
    start.setHours(0, 0, 0, 0);
    const end = unit === 'weeks' ? addWeeks(start, value) : addMonths(start, value);
    
    updateFormData({
      startDate: start,
      endDate: end,
    });
  };

  // Format package duration for display
  const formatPackageDuration = () => {
    if (!packageDuration) return null;
    if (packageDurationUnit === 'weeks') {
      return packageDuration === 1 ? '1 week' : `${packageDuration} weeks`;
    }
    return packageDuration === 1 ? '1 month' : `${packageDuration} months`;
  };

  return (
    <div className="space-y-6">
      {/* Package Duration Info */}
      {selectedPackageData && packageDuration && (
        <Alert className={durationMatch.matches ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          {durationMatch.matches ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <AlertDescription className={durationMatch.matches ? "text-green-800" : "text-amber-800"}>
            {durationMatch.matches ? (
              <>
                <strong>Timeline matches package:</strong> Your selected package "{selectedPackageData.name}" is designed for {formatPackageDuration()}.
              </>
            ) : (
              <>
                <strong>Duration mismatch:</strong> Package "{selectedPackageData.name}" is designed for {durationMatch.expected}, 
                but current timeline is {durationMatch.actual}. 
                The package inventory and pricing may not align with this timeline.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
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
          {[
            { value: 1, unit: 'weeks' as const, label: '1 Week' },
            { value: 2, unit: 'weeks' as const, label: '2 Weeks' },
            { value: 4, unit: 'weeks' as const, label: '4 Weeks' },
            { value: 1, unit: 'months' as const, label: '1 Month' },
            { value: 3, unit: 'months' as const, label: '3 Months' },
            { value: 6, unit: 'months' as const, label: '6 Months' },
            { value: 12, unit: 'months' as const, label: '12 Months' },
          ].map((opt) => (
            <Button
              key={`${opt.value}-${opt.unit}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(opt.value, opt.unit)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}


