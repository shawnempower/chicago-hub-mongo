import React, { useState, useEffect } from 'react';
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
  legacyDimensions?: string;  // Show legacy dimensions field (read-only)
}

export function AdFormatSelector({ value, onChange, className = '', allowMultiple = true, legacyDimensions }: AdFormatSelectorProps) {
  const primaryDim = value?.dimensions ? getPrimaryDimension(value.dimensions) : '';
  const allDims = value?.dimensions ? getAllDimensions(value.dimensions) : [];
  
  const [selectedDimension, setSelectedDimension] = useState<string>(primaryDim);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(allDims);
  const [customDimensions, setCustomDimensions] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (value?.dimensions) {
      const primary = getPrimaryDimension(value.dimensions);
      const all = getAllDimensions(value.dimensions);
      setSelectedDimension(primary);
      setSelectedDimensions(all);
      
      // Check if it's a custom value not in our predefined options
      const isCustom = !DIMENSION_OPTIONS.some(group =>
        group.options.some(opt => opt.value === primary)
      );
      setShowCustomInput(isCustom);
      if (isCustom) {
        setCustomDimensions(all.join(', '));
      }
    }
  }, [value]);

  const handleDimensionChange = (dimension: string) => {
    if (dimension === 'custom') {
      setShowCustomInput(true);
      setSelectedDimension('custom');
      setCustomDimensions('');
      setSelectedDimensions([]);
      onChange(null);
    } else if (dimension === '') {
      setShowCustomInput(false);
      setSelectedDimension('');
      setSelectedDimensions([]);
      setCustomDimensions('');
      onChange(null);
    } else {
      setShowCustomInput(false);
      setSelectedDimension(dimension);
      setSelectedDimensions([dimension]);
      onChange({ dimensions: dimension });
    }
  };

  const toggleAdditionalDimension = (dimension: string) => {
    if (!allowMultiple) return;
    
    const newDims = selectedDimensions.includes(dimension)
      ? selectedDimensions.filter(d => d !== dimension)
      : [...selectedDimensions, dimension];
    
    setSelectedDimensions(newDims);
    onChange({ dimensions: newDims.length === 1 ? newDims[0] : newDims });
  };

  const handleCustomDimensionsChange = (custom: string) => {
    setCustomDimensions(custom);
    if (custom.trim()) {
      // Parse comma-separated values for multiple dimensions
      const dims = custom.split(',').map(d => d.trim()).filter(d => d);
      onChange({ dimensions: dims.length === 1 ? dims[0] : dims });
    }
  };

  const currentCategory = selectedDimension && selectedDimension !== 'custom' 
    ? getCategory(selectedDimension)
    : showCustomInput && customDimensions 
      ? getCategory(customDimensions)
      : undefined;

  // Get all available additional dimensions (not restricted by category)
  const availableAdditionalDimensions = selectedDimension && !showCustomInput
    ? DIMENSION_OPTIONS.flatMap(group => group.options).filter(opt => 
        opt.value !== selectedDimension && opt.value !== 'custom'
      )
    : [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Legacy Dimensions (Read-Only) */}
      {legacyDimensions && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-2">
            <div className="text-amber-600 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-800">Legacy Dimensions</div>
              <div className="text-sm text-amber-700 mt-1">
                Original value: <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{legacyDimensions}</span>
              </div>
              <div className="text-xs text-amber-600 mt-1">
                This will be replaced when you save the new format below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Dimension Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ad Format / Dimensions <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedDimension}
          onChange={(e) => handleDimensionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select format...</option>
          {DIMENSION_OPTIONS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Additional Dimensions (Optional) */}
      {allowMultiple && availableAdditionalDimensions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Also Accept (Optional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            {availableAdditionalDimensions.map((option) => (
              <label key={option.value} className="flex items-center hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedDimensions.includes(option.value)}
                  onChange={() => toggleAdditionalDimension(option.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Select any additional dimension options this ad placement accepts. Mix and match from any category.
          </p>
        </div>
      )}

      {/* Custom Dimensions Input */}
      {showCustomInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Dimensions
          </label>
          <input
            type="text"
            value={customDimensions}
            onChange={(e) => handleCustomDimensionsChange(e.target.value)}
            placeholder="e.g., 1200x675 or 1200x675, 1000x500"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter pixel dimensions. Use commas for multiple sizes (e.g., "1200x675, 1000x500")
          </p>
        </div>
      )}

      {/* Preview / Category Display */}
      {currentCategory && (
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Format Category
              </div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {getCategoryLabel(currentCategory)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Accepted Dimensions
              </div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {showCustomInput 
                  ? customDimensions 
                  : selectedDimensions.length > 1
                    ? `${selectedDimensions.length} sizes`
                    : getDimensionLabel(selectedDimension)
                }
              </div>
            </div>
          </div>
          {selectedDimensions.length > 1 && !showCustomInput && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Accepts: {selectedDimensions.map(d => getDimensionLabel(d)).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

