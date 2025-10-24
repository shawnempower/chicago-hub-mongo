/**
 * Demographic Sliders Component
 * Provides intuitive slider-based UI for demographic percentage distributions
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderGroup {
  key: string;
  label: string;
  value: number;
}

interface DemographicSlidersProps {
  groups: SliderGroup[];
  onChange: (key: string, value: number) => void;
  title: string;
}

/**
 * Custom styled slider with navy blue filled state
 */
const StyledSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
      <SliderPrimitive.Range className="absolute h-full bg-[#1e3a8a]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border border-gray-300 bg-white shadow-md hover:shadow-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
StyledSlider.displayName = "StyledSlider";

/**
 * Multi-slider component that auto-adjusts values to ensure they sum to 100%
 */
export const DemographicSliders: React.FC<DemographicSlidersProps> = ({
  groups,
  onChange,
  title
}) => {
  const handleSliderChange = (key: string, newValue: number, fromIndex: number) => {
    // Create a working copy of all current values
    const workingValues = new Map(groups.map(g => [g.key, g.value]));
    const oldValue = workingValues.get(key) || 0;
    const difference = newValue - oldValue;
    
    // Update the target value
    workingValues.set(key, newValue);
    
    // Calculate total
    let currentTotal = Array.from(workingValues.values()).reduce((sum, v) => sum + v, 0);
    
    // If increasing and would exceed 100%, take from adjacent sliders
    if (difference > 0 && currentTotal > 100) {
      const excess = currentTotal - 100;
      
      // Try to take from the slider below first, then above
      const belowIndex = fromIndex + 1;
      const aboveIndex = fromIndex - 1;
      
      let remaining = excess;
      
      // Try to take from below
      if (belowIndex < groups.length && remaining > 0) {
        const belowKey = groups[belowIndex].key;
        const belowValue = workingValues.get(belowKey) || 0;
        const canTake = Math.min(belowValue, remaining);
        workingValues.set(belowKey, belowValue - canTake);
        remaining -= canTake;
      }
      
      // If still need more, take from above
      if (aboveIndex >= 0 && remaining > 0) {
        const aboveKey = groups[aboveIndex].key;
        const aboveValue = workingValues.get(aboveKey) || 0;
        const canTake = Math.min(aboveValue, remaining);
        workingValues.set(aboveKey, aboveValue - canTake);
        remaining -= canTake;
      }
      
      // If still exceeds after trying adjacent, distribute across all others
      if (remaining > 0) {
        const others = groups.filter(g => g.key !== key);
        const totalOthers = others.reduce((sum, g) => sum + (workingValues.get(g.key) || 0), 0);
        
        if (totalOthers > 0) {
          others.forEach(group => {
            const currentValue = workingValues.get(group.key) || 0;
            const proportion = currentValue / totalOthers;
            const reduction = remaining * proportion;
            workingValues.set(group.key, Math.max(0, currentValue - reduction));
          });
        }
      }
      
      // Apply all changes - React will batch these with functional setState
      workingValues.forEach((value, k) => {
        const originalValue = groups.find(g => g.key === k)?.value || 0;
        if (Math.abs(value - originalValue) > 0.01) {
          onChange(k, value);
        }
      });
    } 
    // If decreasing and would go below 100%, distribute to adjacent sliders
    else if (difference < 0 && currentTotal < 100) {
      const deficit = 100 - currentTotal;
      
      // Try to give to the slider below first, then above
      const belowIndex = fromIndex + 1;
      const aboveIndex = fromIndex - 1;
      
      let remaining = deficit;
      
      // Try to give to below
      if (belowIndex < groups.length && remaining > 0) {
        const belowKey = groups[belowIndex].key;
        const belowValue = workingValues.get(belowKey) || 0;
        workingValues.set(belowKey, belowValue + remaining);
        remaining = 0;
      }
      
      // If still have deficit, give to above
      if (aboveIndex >= 0 && remaining > 0) {
        const aboveKey = groups[aboveIndex].key;
        const aboveValue = workingValues.get(aboveKey) || 0;
        workingValues.set(aboveKey, aboveValue + remaining);
        remaining = 0;
      }
      
      // Apply all changes
      workingValues.forEach((value, k) => {
        const originalValue = groups.find(g => g.key === k)?.value || 0;
        if (Math.abs(value - originalValue) > 0.01) {
          onChange(k, value);
        }
      });
    } else {
      // Just update the value if we're at exactly 100%
      onChange(key, newValue);
    }
  };

  const handleInputChange = (key: string, inputValue: string, fromIndex: number) => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      onChange(key, 0);
      return;
    }
    if (numValue > 100) {
      onChange(key, 100);
      return;
    }
    handleSliderChange(key, numValue, fromIndex);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-gray-700">{title}</h3>
      
      <div className="space-y-3">
        {groups.map((group, index) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium text-gray-600 flex-1">{group.label}</Label>
              <div className="relative w-24">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={group.value.toFixed(1)}
                  onChange={(e) => handleInputChange(group.key, e.target.value, index)}
                  className="h-8 text-sm text-right pr-7 border-gray-300 shadow-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  %
                </span>
              </div>
            </div>
            <StyledSlider
              value={[group.value]}
              onValueChange={(values) => handleSliderChange(group.key, values[0], index)}
              max={100}
              step={0.5}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface GenderSliderProps {
  malePercentage: number;
  femalePercentage: number;
  otherPercentage: number;
  onChange: (male: number, female: number, other: number) => void;
}

/**
 * Single slider for gender distribution (Female <-> Male)
 * Other percentage is automatically calculated to reach 100%
 */
export const GenderSlider: React.FC<GenderSliderProps> = ({
  malePercentage,
  femalePercentage,
  otherPercentage,
  onChange
}) => {
  const handleMainSliderChange = (value: number) => {
    // Value represents male percentage (0-100)
    // Female is the remainder after accounting for "other"
    const maxForMaleFemale = 100 - otherPercentage;
    const male = Math.min(value, maxForMaleFemale);
    const female = maxForMaleFemale - male;
    onChange(male, female, otherPercentage);
  };

  const handleOtherChange = (value: number) => {
    // When other changes, we need to proportionally adjust male and female
    const other = Math.min(value, 100);
    const remainingForMaleFemale = 100 - other;
    
    // Maintain the ratio between male and female
    const currentMaleFemale = malePercentage + femalePercentage;
    if (currentMaleFemale > 0) {
      const maleRatio = malePercentage / currentMaleFemale;
      const male = remainingForMaleFemale * maleRatio;
      const female = remainingForMaleFemale * (1 - maleRatio);
      onChange(male, female, other);
    } else {
      // If both are 0, split evenly
      onChange(remainingForMaleFemale / 2, remainingForMaleFemale / 2, other);
    }
  };

  const handleInputChange = (field: 'male' | 'female' | 'other', inputValue: string) => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }
    
    if (field === 'male') {
      const male = Math.min(numValue, 100 - otherPercentage);
      const female = 100 - otherPercentage - male;
      onChange(male, Math.max(0, female), otherPercentage);
    } else if (field === 'female') {
      const female = Math.min(numValue, 100 - otherPercentage);
      const male = 100 - otherPercentage - female;
      onChange(Math.max(0, male), female, otherPercentage);
    } else {
      handleOtherChange(numValue);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-gray-700">Gender Distribution</h3>

      {/* Male/Female Distribution */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-medium text-gray-600 flex-1">Male</Label>
          <div className="relative w-24">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={malePercentage.toFixed(1)}
              onChange={(e) => handleInputChange('male', e.target.value)}
              className="h-8 text-sm text-right pr-7 border-gray-300 shadow-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
              %
            </span>
          </div>
        </div>
        <StyledSlider
          value={[malePercentage]}
          onValueChange={(values) => handleMainSliderChange(values[0])}
          max={100 - otherPercentage}
          step={0.5}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-medium text-gray-600 flex-1">Female</Label>
          <div className="relative w-24">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={femalePercentage.toFixed(1)}
              onChange={(e) => handleInputChange('female', e.target.value)}
              className="h-8 text-sm text-right pr-7 border-gray-300 shadow-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
              %
            </span>
          </div>
        </div>
        <StyledSlider
          value={[femalePercentage]}
          onValueChange={(values) => {
            const female = Math.min(values[0], 100 - otherPercentage);
            const male = 100 - otherPercentage - female;
            onChange(Math.max(0, male), female, otherPercentage);
          }}
          max={100 - otherPercentage}
          step={0.5}
        />
      </div>

      {/* Other/Non-binary Slider */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-medium text-gray-600 flex-1">Other/Non-binary</Label>
          <div className="relative w-24">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={otherPercentage.toFixed(1)}
              onChange={(e) => handleInputChange('other', e.target.value)}
              className="h-8 text-sm text-right pr-7 border-gray-300 shadow-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
              %
            </span>
          </div>
        </div>
        <StyledSlider
          value={[otherPercentage]}
          onValueChange={(values) => handleOtherChange(values[0])}
          max={100}
          step={0.5}
        />
      </div>
    </div>
  );
};

/**
 * Read-only demographic display for view mode
 */
export const DemographicSlidersReadOnly: React.FC<{
  groups: SliderGroup[];
  title: string;
}> = ({ groups, title }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-gray-700">{title}</h3>
      
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">{group.label}</span>
              <span className="text-sm font-semibold text-gray-900">
                {group.value.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-[#1e3a8a] transition-all"
                style={{ width: `${group.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Read-only gender display for view mode
 */
export const GenderSliderReadOnly: React.FC<{
  malePercentage: number;
  femalePercentage: number;
  otherPercentage: number;
}> = ({ malePercentage, femalePercentage, otherPercentage }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-gray-700">Gender Distribution</h3>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-600">Male</span>
            <span className="text-sm font-semibold text-gray-900">
              {malePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-[#1e3a8a] transition-all"
              style={{ width: `${malePercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-600">Female</span>
            <span className="text-sm font-semibold text-gray-900">
              {femalePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-[#1e3a8a] transition-all"
              style={{ width: `${femalePercentage}%` }}
            />
          </div>
        </div>

        {otherPercentage > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Other/Non-binary</span>
              <span className="text-sm font-semibold text-gray-900">
                {otherPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-[#1e3a8a] transition-all"
                style={{ width: `${otherPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
