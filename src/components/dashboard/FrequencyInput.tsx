import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrequencyInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showQuickOptions?: boolean;
  disabled?: boolean;
  compact?: boolean; // New prop for horizontal layout in pricing rows
}

/**
 * FrequencyInput Component
 * 
 * Provides an improved UX for entering frequency values in numberx format (1x, 2x, 3x, etc.)
 * 
 * Features:
 * - Real-time validation with visual feedback
 * - Auto-formatting (converts "12" to "12x")
 * - Quick-select buttons for common values
 * - Clear error messages
 * - Validates on blur to prevent premature errors
 */
export const FrequencyInput: React.FC<FrequencyInputProps> = ({
  value,
  onChange,
  label = 'Buy Frequency',
  placeholder = 'e.g., 1x, 2x, 3x',
  className = '',
  showQuickOptions = true,
  disabled = false,
  compact = false,
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Pattern for validation
  const FREQUENCY_PATTERN = /^\d+x$/;

  // Quick select options - keeping it simple with most common values
  const quickOptions = ['1x', '4x', '12x'];

  // Sync internal value with prop value
  useEffect(() => {
    setInternalValue(value || '');
    if (value) {
      validateValue(value);
    }
  }, [value]);

  /**
   * Validate a frequency value
   */
  const validateValue = (val: string): boolean => {
    if (!val || val.trim() === '') {
      setIsValid(null);
      setErrorMessage('');
      return true; // Empty is okay (optional field)
    }

    const trimmed = val.trim();
    const valid = FREQUENCY_PATTERN.test(trimmed);

    setIsValid(valid);
    
    if (!valid) {
      // Provide helpful error messages
      if (/^\d+$/.test(trimmed)) {
        setErrorMessage('Add "x" after the number (e.g., "12x")');
      } else if (/^x$/i.test(trimmed)) {
        setErrorMessage('Add a number before "x" (e.g., "1x")');
      } else if (/^\d+[xX]{2,}$/.test(trimmed)) {
        setErrorMessage('Use only one "x" (e.g., "12x")');
      } else if (/^[a-zA-Z]+$/.test(trimmed)) {
        setErrorMessage('Use numbers only (e.g., "1x", "12x")');
      } else {
        setErrorMessage('Format must be a number followed by "x" (e.g., "1x", "12x")');
      }
    } else {
      setErrorMessage('');
    }

    return valid;
  };

  /**
   * Handle input change with auto-formatting
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.toLowerCase();

    // Auto-formatting logic
    // If user types just numbers, don't auto-add 'x' yet (let them finish typing)
    // But do allow them to type 'x'
    
    // Remove any characters that aren't digits or 'x'
    newValue = newValue.replace(/[^0-9x]/g, '');
    
    // Prevent multiple 'x' characters
    const xCount = (newValue.match(/x/g) || []).length;
    if (xCount > 1) {
      // Keep only the first 'x' and everything before it
      const firstXIndex = newValue.indexOf('x');
      newValue = newValue.substring(0, firstXIndex + 1);
    }

    // Ensure 'x' is only at the end
    if (newValue.includes('x')) {
      const parts = newValue.split('x');
      newValue = parts[0] + 'x';
    }

    setInternalValue(newValue);
    
    // Only validate if field has been touched (to avoid showing errors too early)
    if (touched) {
      validateValue(newValue);
    }
  };

  /**
   * Handle blur - auto-format if user entered just a number
   */
  const handleBlur = () => {
    setTouched(true);
    let finalValue = internalValue.trim();

    // Auto-add 'x' if user only typed a number
    if (/^\d+$/.test(finalValue)) {
      finalValue = finalValue + 'x';
      setInternalValue(finalValue);
    }

    // Validate and update parent
    const valid = validateValue(finalValue);
    if (valid || finalValue === '') {
      onChange(finalValue);
    }
  };

  /**
   * Handle quick option selection
   */
  const handleQuickSelect = (option: string) => {
    setInternalValue(option);
    setTouched(true);
    validateValue(option);
    onChange(option);
  };

  /**
   * Get border color based on validation state
   */
  const getBorderClass = () => {
    if (!touched || isValid === null) return '';
    return isValid 
      ? 'focus-visible:border-green-500 focus-visible:ring-green-500' 
      : 'focus-visible:border-red-500 focus-visible:ring-red-500';
  };

  // Compact mode: simplified layout for inline use in pricing rows (no label, matches pricing tier style)
  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <Input
          type="text"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'border-0 bg-transparent shadow-none hover:bg-gray-100 focus:border focus:bg-background focus:shadow-sm transition-colors',
            getBorderClass()
          )}
          aria-invalid={touched && !isValid}
          aria-describedby={errorMessage ? 'frequency-error' : undefined}
          title={errorMessage || (isValid ? 'Valid frequency format' : '')}
        />
        
        {/* Validation icon inside input */}
        {touched && isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <X className="w-4 h-4 text-red-600" />
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode: complete layout with messages and quick-select
  return (
    <div className={cn('space-y-2', className)}>
      {/* Label with validation indicator */}
      <div className="flex items-center gap-2">
        <Label className="text-xs block">{label}</Label>
        {touched && isValid !== null && (
          <div className="flex items-center">
            {isValid ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <X className="w-3.5 h-3.5 text-red-600" />
            )}
          </div>
        )}
      </div>

      {/* Input field */}
      <div className="relative">
        <Input
          type="text"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'transition-colors',
            getBorderClass()
          )}
          aria-invalid={touched && !isValid}
          aria-describedby={errorMessage ? 'frequency-error' : undefined}
        />
        
        {/* Validation icon inside input */}
        {touched && isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid ? (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                <Check className="w-3 h-3 text-green-600" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                <X className="w-3 h-3 text-red-600" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {touched && errorMessage && (
        <p id="frequency-error" className="text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" />
          {errorMessage}
        </p>
      )}

      {/* Success message */}
      {touched && isValid && internalValue && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="w-3 h-3" />
          Valid frequency format
        </p>
      )}

      {/* Quick select options */}
      {showQuickOptions && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Quick select:</span>
          {quickOptions.map((option) => (
            <Badge
              key={option}
              variant={internalValue === option ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs px-2 py-0.5"
              onClick={() => handleQuickSelect(option)}
            >
              {option}
            </Badge>
          ))}
        </div>
      )}

      {/* Helper text */}
      {!touched && !internalValue && (
        <p className="text-xs text-muted-foreground">
          Enter a number followed by "x" (e.g., 1x for one-time, 12x for 12 insertions)
        </p>
      )}
    </div>
  );
};

