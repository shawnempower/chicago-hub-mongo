/**
 * Field Validation Utilities
 * Provides validation functions for form inputs with error messages
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: true }; // Empty is valid (optional fields)
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }
  
  return { isValid: true };
};

/**
 * Format phone number as user types (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Format based on length
  if (phoneNumber.length < 4) {
    return phoneNumber;
  } else if (phoneNumber.length < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else if (phoneNumber.length <= 10) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  } else {
    // Handle 11 digits (with country code)
    return `+${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`;
  }
};

/**
 * Phone number validation (flexible format)
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Empty is valid (optional fields)
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Must have 10 or 11 digits (with or without country code)
  if (digitsOnly.length < 10 || digitsOnly.length > 11) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number (e.g., (555) 555-5555)'
    };
  }
  
  return { isValid: true };
};

/**
 * URL validation
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url || url.trim() === '') {
    return { isValid: true }; // Empty is valid (optional fields)
  }
  
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      return {
        isValid: false,
        error: 'URL must start with http:// or https://'
      };
    }
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid URL (e.g., https://example.com)'
    };
  }
};

/**
 * Tax ID/EIN validation (XX-XXXXXXX format)
 */
export const validateTaxId = (taxId: string): ValidationResult => {
  if (!taxId || taxId.trim() === '') {
    return { isValid: true }; // Empty is valid (optional)
  }
  
  const taxIdRegex = /^\d{2}-\d{7}$/;
  if (!taxIdRegex.test(taxId)) {
    return {
      isValid: false,
      error: 'Format must be XX-XXXXXXX (e.g., 12-3456789)'
    };
  }
  
  return { isValid: true };
};

/**
 * Year validation (YYYY format)
 */
export const validateYear = (year: string | number): ValidationResult => {
  if (!year || year === '') {
    return { isValid: true }; // Empty is valid (optional)
  }
  
  const yearNum = typeof year === 'string' ? parseInt(year) : year;
  
  if (isNaN(yearNum)) {
    return {
      isValid: false,
      error: 'Please enter a valid year'
    };
  }
  
  if (yearNum < 1700 || yearNum > 2100) {
    return {
      isValid: false,
      error: 'Year must be between 1700 and 2100'
    };
  }
  
  return { isValid: true };
};

/**
 * Positive integer validation
 */
export const validatePositiveInteger = (value: string | number, fieldName?: string): ValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true }; // Empty is valid (optional)
  }
  
  const num = typeof value === 'string' ? parseInt(value) : value;
  
  if (isNaN(num)) {
    return {
      isValid: false,
      error: `Please enter a valid number${fieldName ? ` for ${fieldName}` : ''}`
    };
  }
  
  if (num < 0) {
    return {
      isValid: false,
      error: 'Value must be a positive number'
    };
  }
  
  if (!Number.isInteger(num)) {
    return {
      isValid: false,
      error: 'Value must be a whole number'
    };
  }
  
  return { isValid: true };
};

/**
 * Positive number validation (allows decimals)
 */
export const validatePositiveNumber = (value: string | number, fieldName?: string): ValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true }; // Empty is valid (optional)
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return {
      isValid: false,
      error: `Please enter a valid number${fieldName ? ` for ${fieldName}` : ''}`
    };
  }
  
  if (num < 0) {
    return {
      isValid: false,
      error: 'Value must be a positive number'
    };
  }
  
  return { isValid: true };
};

/**
 * Percentage validation (0-100)
 */
export const validatePercentage = (value: string | number, fieldName?: string): ValidationResult => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true }; // Empty is valid (optional)
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return {
      isValid: false,
      error: `Please enter a valid percentage${fieldName ? ` for ${fieldName}` : ''}`
    };
  }
  
  if (num < 0 || num > 100) {
    return {
      isValid: false,
      error: 'Percentage must be between 0 and 100'
    };
  }
  
  return { isValid: true };
};

/**
 * Validate percentage group sums to 100
 */
export const validatePercentageGroup = (values: Record<string, number>, groupName: string): ValidationResult => {
  const sum = Object.values(values).reduce((acc, val) => acc + (val || 0), 0);
  
  // Allow some tolerance for rounding errors
  if (Math.abs(sum - 100) > 0.1 && sum > 0) {
    return {
      isValid: false,
      error: `${groupName} should total 100% (currently ${sum.toFixed(1)}%)`
    };
  }
  
  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (value === null || value === undefined || value === '' || 
      (typeof value === 'string' && value.trim() === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`
    };
  }
  
  return { isValid: true };
};

/**
 * Format error message for display
 */
export const formatErrorMessage = (error?: string): string => {
  return error || '';
};

/**
 * Get validation error class
 */
export const getValidationClass = (hasError: boolean): string => {
  return hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
};

