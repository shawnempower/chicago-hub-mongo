/**
 * Campaign Timeline Step - Step 4 of Campaign Builder
 * 
 * Collects campaign start date - end date is automatically calculated from package duration
 */

import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, CheckCircle2, Clock } from 'lucide-react';
import { format, differenceInDays, addMonths, addWeeks } from 'date-fns';
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
  const packageDuration = selectedPackageData?.metadata?.builderInfo?.originalDuration || 1;
  const packageDurationUnit = selectedPackageData?.metadata?.builderInfo?.originalDurationUnit || 'months';
  
  // Calculate end date from start date and package duration
  const calculateEndDate = (startDate: Date): Date => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    if (packageDurationUnit === 'weeks') {
      return addWeeks(start, packageDuration);
    }
    return addMonths(start, packageDuration);
  };

  // Handle start date selection - automatically sets end date
  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) {
      updateFormData({ startDate: null, endDate: null });
      return;
    }
    
    const normalizedStart = new Date(date);
    normalizedStart.setHours(0, 0, 0, 0);
    const calculatedEnd = calculateEndDate(normalizedStart);
    
    updateFormData({
      startDate: normalizedStart,
      endDate: calculatedEnd,
    });
  };

  // Format package duration for display
  const formatPackageDuration = () => {
    if (packageDurationUnit === 'weeks') {
      return packageDuration === 1 ? '1 week' : `${packageDuration} weeks`;
    }
    return packageDuration === 1 ? '1 month' : `${packageDuration} months`;
  };

  // Calculate days in campaign
  const getCampaignDays = () => {
    if (!formData.startDate || !formData.endDate) return null;
    return differenceInDays(formData.endDate, formData.startDate);
  };

  const campaignDays = getCampaignDays();

  return (
    <div className="space-y-6">
      {/* Package Duration Info */}
      {selectedPackageData && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Package Duration:</strong> Your selected package "{selectedPackageData.name}" runs for {formatPackageDuration()}.
            Select a start date and the end date will be automatically calculated.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Date Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date - User selects this */}
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
                {formData.startDate ? format(formData.startDate, "PPP") : "Pick a start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startDate || undefined}
                onSelect={handleStartDateSelect}
                initialFocus
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date - Auto-calculated, read-only display */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            End Date 
            <span className="text-xs text-muted-foreground font-normal">(auto-calculated)</span>
          </Label>
          <div
            className={cn(
              "flex items-center w-full h-10 px-3 py-2 rounded-md border bg-muted/50",
              !formData.endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {formData.endDate ? format(formData.endDate, "PPP") : "Select start date first"}
          </div>
        </div>
      </div>

      {/* Campaign Duration Summary */}
      {formData.startDate && formData.endDate && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Campaign Timeline:</strong> {format(formData.startDate, "MMM d, yyyy")} to {format(formData.endDate, "MMM d, yyyy")} 
            ({campaignDays} days / {formatPackageDuration()})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}


