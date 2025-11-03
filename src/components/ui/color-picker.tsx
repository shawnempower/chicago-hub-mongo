import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [tempValue, setTempValue] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (newColor: string) => {
    setTempValue(newColor);
    onChange(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hexValue = e.target.value;
    
    // Add # if not present
    if (!hexValue.startsWith('#')) {
      hexValue = '#' + hexValue;
    }
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(hexValue) || hexValue === '#') {
      setTempValue(hexValue);
      if (hexValue.length === 7) {
        onChange(hexValue);
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex gap-2 items-center">
        <Input
          value={tempValue}
          onChange={handleHexInputChange}
          placeholder="#000000"
          className="flex-1 font-mono"
          maxLength={7}
        />
        <div className="relative">
          <button
            type="button"
            className="w-12 h-10 rounded-lg border-2 border-gray-300 shadow-sm hover:border-gray-400 transition-all cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: value }}
            onClick={() => colorInputRef.current?.click()}
            aria-label="Pick color"
          >
            <div className="absolute inset-0 hover:ring-2 hover:ring-offset-2 hover:ring-gray-400 rounded-lg transition-all" />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={value}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};


