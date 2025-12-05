import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { 
  NewsletterAdFormat,
  DIMENSION_OPTIONS,
  getCategory,
  getCategoryLabel,
  getDimensionLabel,
  getPrimaryDimension,
  getAllDimensions
} from '../types/newsletterAdFormat';

interface AdFormatSelectorProps {
  value: NewsletterAdFormat | null;
  onChange: (format: NewsletterAdFormat | null) => void;
  className?: string;
  allowMultiple?: boolean;  // Allow selecting multiple dimensions
}

export function AdFormatSelector({ value, onChange, className = '', allowMultiple = true }: AdFormatSelectorProps) {
  const allDims = value?.dimensions ? getAllDimensions(value.dimensions) : [];
  
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(allDims);
  const [customDimensions, setCustomDimensions] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCustomWarning, setShowCustomWarning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value?.dimensions) {
      const all = getAllDimensions(value.dimensions);
      const primary = getPrimaryDimension(value.dimensions);
      
      // Check if it's a custom value not in our predefined options
      const isCustom = !DIMENSION_OPTIONS.some(group =>
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
    ? getCategory(selectedDimensions[0])
    : showCustomInput && customDimensions 
      ? getCategory(customDimensions)
      : undefined;

  // Get all available dimensions from options
  const allAvailableDimensions = DIMENSION_OPTIONS.flatMap(group => group.options);

  return (
    <div className={`space-y-4 ${className}`}>
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
              {DIMENSION_OPTIONS.map((group) => (
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

