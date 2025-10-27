import React from 'react';
import { AdFormatCategory, getCategoryLabel } from '../types/newsletterAdFormat';

interface AdFormatFilterProps {
  selectedCategories: AdFormatCategory[];
  onChange: (categories: AdFormatCategory[]) => void;
  className?: string;
}

export function AdFormatFilter({ selectedCategories, onChange, className = '' }: AdFormatFilterProps) {
  const categories: AdFormatCategory[] = [
    "email-standard",
    "iab-standard",
    "native",
    "takeover",
    "responsive",
    "custom-display"
  ];

  const toggleCategory = (category: AdFormatCategory) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectAll = () => {
    onChange([...categories]);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Filter by Format Category
        </label>
        <div className="flex gap-2">
          {selectedCategories.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Clear
            </button>
          )}
          {selectedCategories.length < categories.length && (
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Select All
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          const colorClass = isSelected ? getCategoryColorClass(category) : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
          
          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${colorClass}`}
            >
              {getCategoryLabel(category)}
              {isSelected && (
                <span className="ml-1.5 inline-flex items-center">✓</span>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedCategories.length > 0 && (
        <p className="text-xs text-gray-600">
          Showing {selectedCategories.length} of {categories.length} categories
        </p>
      )}
    </div>
  );
}

function getCategoryColorClass(category: AdFormatCategory): string {
  const colors: Record<AdFormatCategory, string> = {
    "iab-standard": "bg-blue-100 text-blue-800 hover:bg-blue-200",
    "email-standard": "bg-green-100 text-green-800 hover:bg-green-200",
    "custom-display": "bg-purple-100 text-purple-800 hover:bg-purple-200",
    "native": "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    "responsive": "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
    "takeover": "bg-red-100 text-red-800 hover:bg-red-200"
  };
  return colors[category];
}

// Compact version for dropdowns
export function AdFormatFilterDropdown({ selectedCategories, onChange }: AdFormatFilterProps) {
  const categories: AdFormatCategory[] = [
    "email-standard",
    "iab-standard",
    "native",
    "takeover",
    "responsive",
    "custom-display"
  ];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Format Category
      </label>
      <select
        multiple
        value={selectedCategories}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions, option => option.value as AdFormatCategory);
          onChange(selected);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        size={6}
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {getCategoryLabel(category)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        Hold Ctrl/Cmd to select multiple
      </p>
    </div>
  );
}

