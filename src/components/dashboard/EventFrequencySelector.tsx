import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EVENT_FREQUENCY_OPTIONS, EventFrequency } from '@/types/publication';
import { Calendar, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EventFrequencySelectorProps {
  value?: EventFrequency;
  onChange: (value: EventFrequency) => void;
  disabled?: boolean;
  required?: boolean;
  showTooltip?: boolean;
}

export const EventFrequencySelector: React.FC<EventFrequencySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  showTooltip = true
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Event Frequency
          {required && <span className="text-red-500">*</span>}
        </label>
        {showTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  How often this event occurs. This is used for accurate revenue
                  forecasting and pricing calculations.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select event frequency" />
        </SelectTrigger>
        <SelectContent>
          {EVENT_FREQUENCY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col py-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.monthlyOccurrences.toFixed(2)}x/month
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="font-medium">
            {EVENT_FREQUENCY_OPTIONS.find(o => o.value === value)?.label}:
          </span>
          <span>
            {(EVENT_FREQUENCY_OPTIONS.find(o => o.value === value)?.monthlyOccurrences || 0).toFixed(3)} occurrences/month
          </span>
          {value === 'annual' && (
            <span className="text-xs">
              (most common for events)
            </span>
          )}
        </p>
      )}
    </div>
  );
};

// Export a simplified version without tooltips for inline use
export const EventFrequencySelectorInline: React.FC<EventFrequencySelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select frequency" />
      </SelectTrigger>
      <SelectContent>
        {EVENT_FREQUENCY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

