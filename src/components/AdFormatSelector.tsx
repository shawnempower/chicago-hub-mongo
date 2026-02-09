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
import { parsePixelDimensions, isValidPixelDimension } from '@/utils/dimensionValidation';

const NEWSLETTER_STANDARD_VALUES = new Set(
  DIMENSION_OPTIONS.flatMap((g) => g.options)
    .filter((o) => o.value !== 'custom')
    .map((o) => o.value)
);

function mergeAndEmitNewsletter(
  selectedDims: string[],
  customRaw: string,
  onChange: (format: NewsletterAdFormat | null) => void
) {
  const customParsed = parsePixelDimensions(customRaw);
  const combined = [...selectedDims];
  customParsed.forEach((d) => {
    if (!combined.includes(d)) combined.push(d);
  });
  if (combined.length === 0) {
    onChange(null);
    return;
  }
  onChange({
    dimensions: combined.length === 1 ? combined[0] : combined
  });
}

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value?.dimensions) {
      const all = getAllDimensions(value.dimensions);
      const standardDims = all.filter((d) => NEWSLETTER_STANDARD_VALUES.has(d));
      const customDims = all.filter((d) => !NEWSLETTER_STANDARD_VALUES.has(d));
      setSelectedDimensions(standardDims);
      const customStr = customDims.join(', ');
      const partialInvalid = customDimensions.trim() !== '' && parsePixelDimensions(customDimensions).length === 0;
      const ourCustomParsed = parsePixelDimensions(customDimensions);
      const ourCombined = [...standardDims, ...ourCustomParsed].sort();
      const valueCombined = [...all].sort();
      const valueMatchesOurs = ourCombined.length === valueCombined.length && ourCombined.every((d, i) => d === valueCombined[i]);
      const preserveCustomInput = customDimensions.includes(',') && valueMatchesOurs;
      if (!partialInvalid && !preserveCustomInput) {
        setCustomDimensions(customStr);
        setShowCustomInput(customDims.length > 0);
      }
    } else {
      const partialInvalid = customDimensions.trim() !== '' && parsePixelDimensions(customDimensions).length === 0;
      if (!partialInvalid) {
        setSelectedDimensions([]);
        setCustomDimensions('');
        setShowCustomInput(false);
      }
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
      setShowCustomInput(true);
      setDropdownOpen(false);
      return;
    }
    const newDims = selectedDimensions.includes(dimension)
      ? selectedDimensions.filter((d) => d !== dimension)
      : [...selectedDimensions, dimension];
    setSelectedDimensions(newDims);
    mergeAndEmitNewsletter(newDims, customDimensions, onChange);
  };

  const removeChip = (dimension: string) => {
    const newDims = selectedDimensions.filter((d) => d !== dimension);
    setSelectedDimensions(newDims);
    mergeAndEmitNewsletter(newDims, customDimensions, onChange);
  };

  const removeCustomChip = () => {
    setShowCustomInput(false);
    setCustomDimensions('');
    if (selectedDimensions.length === 0) {
      onChange(null);
    } else {
      mergeAndEmitNewsletter(selectedDimensions, '', onChange);
    }
  };

  const handleCustomDimensionsChange = (custom: string) => {
    setCustomDimensions(custom);
    const parsed = parsePixelDimensions(custom);
    if (custom.trim() === '' || parsed.length > 0) {
      mergeAndEmitNewsletter(selectedDimensions, custom, onChange);
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
            
            {/* Custom chip (editable) - glow so it's obvious where to type */}
            {showCustomInput && (
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-2 ring-offset-1 shadow-md transition-all ${
                    customDimensions.trim() && customDimensions.split(',').map((d) => d.trim()).filter(Boolean).some((t) => !isValidPixelDimension(t))
                      ? 'bg-amber-50 text-amber-900 ring-amber-400 shadow-amber-200/60'
                      : 'bg-purple-100 text-purple-800 ring-purple-400 shadow-purple-200/60'
                  }`}
                >
                  <span className="text-sm font-medium">Custom:</span>
                  <input
                    type="text"
                    value={customDimensions}
                    onChange={(e) => handleCustomDimensionsChange(e.target.value)}
                    placeholder="300x250, 1200x675, …"
                    className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium placeholder-purple-400 w-48 min-w-[10rem]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCustomDimensionsChange(customDimensions ? `${customDimensions.trim()}, ` : '')}
                    className="shrink-0 rounded-full p-1 text-purple-600 hover:bg-purple-200/50 transition-colors text-xs font-medium"
                    title="Add another size (inserts comma)"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={removeCustomChip}
                    className="hover:bg-purple-200/50 rounded-full p-0.5 transition-colors"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation message - visible directly under chips when custom has invalid format */}
        {showCustomInput && customDimensions.trim() && customDimensions.split(',').map((d) => d.trim()).filter(Boolean).some((t) => !isValidPixelDimension(t)) && (
          <div className="mt-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium">
            Use number×number only (e.g. 300x250, 1200x675). Other text is ignored.
          </div>
        )}

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full px-3 py-2 border rounded-md shadow-sm text-left flex items-center justify-between bg-white border-gray-300 hover:border-gray-400 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <span className="text-gray-700">
              {(() => {
                const customCount = showCustomInput && customDimensions ? parsePixelDimensions(customDimensions).length : 0;
                const total = selectedDimensions.length + customCount;
                return total > 0 ? `${total} format${total !== 1 ? 's' : ''} selected` : 'Select formats...';
              })()}
            </span>
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {dropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {DIMENSION_OPTIONS.map((group) => (
                <div key={group.label}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-muted/50 sticky top-0">
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
          Type width×height in the purple pill (e.g. 300x250). Use <strong>+ Add</strong> or type a comma to add more sizes.
        </p>
      )}
    </div>
  );
}

