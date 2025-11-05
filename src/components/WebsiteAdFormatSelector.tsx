import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type WebsiteAdCategory = 
  | "iab-standard"      // Web display standards (300x250, 728x90, etc.)
  | "custom-display"    // Non-standard pixel sizes
  | "native"            // Content-integrated ads
  | "responsive";       // Dynamic sizing

export interface WebsiteAdFormat {
  dimensions: string | string[];  // Single or multiple accepted dimensions
}

interface WebsiteAdFormatSelectorProps {
  value: WebsiteAdFormat | null;
  onChange: (format: WebsiteAdFormat | null) => void;
  className?: string;
  allowMultiple?: boolean;
  legacyDimensions?: string;
}

// Standard dimension options for websites
const WEBSITE_DIMENSION_OPTIONS = [
  {
    label: 'IAB Standard Sizes',
    options: [
      { value: '300x250', label: 'Medium Rectangle (300x250)' },
      { value: '728x90', label: 'Leaderboard (728x90)' },
      { value: '300x600', label: 'Half Page (300x600)' },
      { value: '160x600', label: 'Wide Skyscraper (160x600)' },
      { value: '320x50', label: 'Mobile Banner (320x50)' },
      { value: '970x250', label: 'Billboard (970x250)' },
      { value: '336x280', label: 'Large Rectangle (336x280)' },
      { value: '120x600', label: 'Skyscraper (120x600)' },
      { value: '970x90', label: 'Super Leaderboard (970x90)' },
      { value: '250x250', label: 'Square (250x250)' },
      { value: '200x200', label: 'Small Square (200x200)' },
      { value: '468x60', label: 'Full Banner (468x60)' },
      { value: '234x60', label: 'Half Banner (234x60)' },
    ]
  },
  {
    label: 'Native & Responsive',
    options: [
      { value: 'text-only', label: 'Text Only' },
      { value: 'sponsored-content', label: 'Sponsored Content' },
      { value: 'logo-text', label: 'Logo + Text' },
      { value: 'content-integration', label: 'Content Integration' },
      { value: 'responsive', label: 'Responsive (Flexible Size)' },
    ]
  },
  {
    label: 'Custom',
    options: [
      { value: 'custom', label: 'Custom dimensions...' }
    ]
  }
];

function getWebsiteAdCategory(dimensions: string | string[]): WebsiteAdCategory {
  const dim = Array.isArray(dimensions) ? dimensions[0] : dimensions;
  
  const iabStandard = ['300x250', '728x90', '300x600', '160x600', '320x50', '970x250', 
                       '336x280', '120x600', '970x90', '250x250', '200x200', '468x60', '234x60'];
  const native = ['text-only', 'sponsored-content', 'logo-text', 'content-integration'];
  
  if (iabStandard.includes(dim)) return 'iab-standard';
  if (native.includes(dim)) return 'native';
  if (dim === 'responsive' || dim.includes(',')) return 'responsive';
  
  return 'custom-display';
}

function getCategoryLabel(category: WebsiteAdCategory): string {
  const labels: Record<WebsiteAdCategory, string> = {
    "iab-standard": "IAB Standard",
    "custom-display": "Custom Display",
    "native": "Native Ad",
    "responsive": "Responsive"
  };
  return labels[category];
}

function getDimensionLabel(dimensions: string): string {
  const option = WEBSITE_DIMENSION_OPTIONS
    .flatMap(group => group.options)
    .find(opt => opt.value === dimensions);
  return option?.label || dimensions;
}

function getAllDimensions(dimensions: string | string[]): string[] {
  return Array.isArray(dimensions) ? dimensions : [dimensions];
}

function getPrimaryDimension(dimensions: string | string[]): string {
  return Array.isArray(dimensions) ? dimensions[0] : dimensions;
}

export function WebsiteAdFormatSelector({ 
  value, 
  onChange, 
  className = '', 
  allowMultiple = true, 
  legacyDimensions 
}: WebsiteAdFormatSelectorProps) {
  const allDims = value?.dimensions ? getAllDimensions(value.dimensions) : [];
  
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(allDims);
  const [customDimensions, setCustomDimensions] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCustomWarning, setShowCustomWarning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [legacyExpanded, setLegacyExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value?.dimensions) {
      const all = getAllDimensions(value.dimensions);
      const primary = getPrimaryDimension(value.dimensions);
      
      // Check if it's a custom value not in our predefined options
      const isCustom = !WEBSITE_DIMENSION_OPTIONS.some(group =>
        group.options.some(opt => opt.value === primary)
      );
      
      setShowCustomInput(isCustom);
      if (isCustom) {
        setCustomDimensions(all.join(', '));
        setSelectedDimensions([]);
      } else {
        setSelectedDimensions(all);
        setCustomDimensions('');
      }
    } else {
      setSelectedDimensions([]);
      setCustomDimensions('');
      setShowCustomInput(false);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDimensionToggle = (dimension: string) => {
    if (dimension === 'custom') {
      // Check if we need to show warning
      if (selectedDimensions.length > 0) {
        setShowCustomWarning(true);
      } else {
        activateCustomMode();
      }
    } else {
      const newDims = selectedDimensions.includes(dimension)
        ? selectedDimensions.filter(d => d !== dimension)
        : [...selectedDimensions, dimension];
      
      setSelectedDimensions(newDims);
      if (newDims.length === 0) {
        onChange(null);
      } else {
        onChange({ dimensions: newDims.length === 1 ? newDims[0] : newDims });
      }
    }
  };

  const activateCustomMode = () => {
    setShowCustomInput(true);
    setCustomDimensions('');
    setSelectedDimensions([]);
    setShowCustomWarning(false);
    setDropdownOpen(false);
    onChange(null);
  };

  const removeChip = (dimension: string) => {
    const newDims = selectedDimensions.filter(d => d !== dimension);
    setSelectedDimensions(newDims);
    if (newDims.length === 0) {
      onChange(null);
    } else {
      onChange({ dimensions: newDims.length === 1 ? newDims[0] : newDims });
    }
  };

  const removeCustomChip = () => {
    setShowCustomInput(false);
    setCustomDimensions('');
    onChange(null);
  };

  const handleCustomDimensionsChange = (custom: string) => {
    setCustomDimensions(custom);
    if (custom.trim()) {
      // Parse comma-separated values for multiple dimensions
      const dims = custom.split(',').map(d => d.trim()).filter(d => d);
      onChange({ dimensions: dims.length === 1 ? dims[0] : dims });
    } else {
      onChange(null);
    }
  };

  const currentCategory = selectedDimensions.length > 0 && selectedDimensions[0]
    ? getWebsiteAdCategory(selectedDimensions[0])
    : showCustomInput && customDimensions 
      ? getWebsiteAdCategory(customDimensions)
      : undefined;

  // Get all available dimensions from options
  const allAvailableDimensions = WEBSITE_DIMENSION_OPTIONS.flatMap(group => group.options);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Legacy Dimensions (Accordion) */}
      {legacyDimensions && (
        <div className="bg-amber-50 border border-amber-200 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setLegacyExpanded(!legacyExpanded)}
            className="w-full p-2 flex items-center gap-2 hover:bg-amber-100 transition-colors"
          >
            <div className="text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="text-[11px] font-medium text-amber-800">Legacy Dimensions</div>
            </div>
            {legacyExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
            )}
          </button>
          {legacyExpanded && (
            <div className="px-2 pb-2 pt-1 border-t border-amber-200">
              <div className="text-[11px] text-amber-700">
                Original value: <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{legacyDimensions}</span>
              </div>
              <div className="text-[10px] text-amber-600 mt-1">
                This will be replaced when you save the new format below.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Warning Dialog */}
      {showCustomWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear Existing Formats?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Adding a custom ad format will clear all other selected formats. Do you want to continue?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowCustomWarning(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={activateCustomMode}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiselect Dropdown */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-2">
          Ad Format / Dimensions <span className="text-red-500">*</span>
        </label>

        {/* Selected Chips */}
        {(selectedDimensions.length > 0 || showCustomInput) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Standard chips */}
            {selectedDimensions.map((dim) => (
              <div
                key={dim}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                <span>{getDimensionLabel(dim)}</span>
                <button
                  type="button"
                  onClick={() => removeChip(dim)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            {/* Custom chip (editable) */}
            {showCustomInput && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full">
                <span className="text-sm font-medium">Custom:</span>
                <input
                  type="text"
                  value={customDimensions}
                  onChange={(e) => handleCustomDimensionsChange(e.target.value)}
                  placeholder="e.g., 1200x675"
                  className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium placeholder-purple-400 w-32"
                />
                <button
                  type="button"
                  onClick={removeCustomChip}
                  className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => !showCustomInput && setDropdownOpen(!dropdownOpen)}
            disabled={showCustomInput}
            className={`w-full px-3 py-2 border rounded-md shadow-sm text-left flex items-center justify-between ${
              showCustomInput 
                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-white border-gray-300 hover:border-gray-400 focus:ring-blue-500 focus:border-blue-500 cursor-pointer'
            }`}
          >
            <span className="text-gray-700">
              {showCustomInput 
                ? 'Custom format active' 
                : selectedDimensions.length > 0 
                  ? `${selectedDimensions.length} format${selectedDimensions.length > 1 ? 's' : ''} selected`
                  : 'Select formats...'}
            </span>
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {dropdownOpen && !showCustomInput && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {WEBSITE_DIMENSION_OPTIONS.map((group) => (
                <div key={group.label}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                    {group.label}
                  </div>
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleDimensionToggle(option.value)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-blue-700">
                        {option.label}
                      </span>
                      {selectedDimensions.includes(option.value) && (
                        <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCustomInput && (
        <p className="text-sm text-gray-500">
          Enter pixel dimensions. Use commas for multiple sizes (e.g., "1200x675, 1000x500")
        </p>
      )}
    </div>
  );
}

