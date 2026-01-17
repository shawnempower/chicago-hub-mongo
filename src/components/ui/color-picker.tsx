import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const DEFAULT_COLOR = '#000000';

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  // Ensure we always have a valid color value (handle undefined/null/empty)
  const safeValue = value || DEFAULT_COLOR;
  const [tempValue, setTempValue] = useState(safeValue);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync tempValue when the value prop changes (e.g., data loads from server)
  useEffect(() => {
    setTempValue(value || DEFAULT_COLOR);
  }, [value]);

  const handleColorChange = (newColor: string) => {
    setTempValue(newColor);
    onChange(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hexValue = e.target.value;
    
    // Allow empty input during typing
    if (hexValue === '' || hexValue === '#') {
      setTempValue(hexValue || '#');
      return;
    }
    
    // Add # if not present
    if (!hexValue.startsWith('#')) {
      hexValue = '#' + hexValue;
    }
    
    // Allow partial hex values during typing, but only call onChange for complete valid hex
    setTempValue(hexValue);
    if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
      onChange(hexValue);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex gap-2 items-center">
        <Input
          value={tempValue || ''}
          onChange={handleHexInputChange}
          placeholder="#000000"
          className="flex-1 font-mono"
          maxLength={7}
        />
        <div className="relative">
          <button
            type="button"
            className="w-12 h-10 rounded-lg border-2 border-gray-300 shadow-sm hover:border-gray-400 transition-all cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: safeValue }}
            onClick={() => colorInputRef.current?.click()}
            aria-label="Pick color"
          >
            <div className="absolute inset-0 hover:ring-2 hover:ring-offset-2 hover:ring-gray-400 rounded-lg transition-all" />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={safeValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};


