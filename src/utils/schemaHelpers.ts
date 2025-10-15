/**
 * Helper utilities for working with nested schema paths
 */

/**
 * Get a value from a nested object using dot notation path
 * @param obj - The object to get the value from
 * @param path - The dot notation path (e.g., 'basicInfo.publicationName')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Set a value in a nested object using dot notation path
 * Creates intermediate objects as needed
 * @param obj - The object to modify
 * @param path - The dot notation path
 * @param value - The value to set
 * @returns The modified object
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  if (!path) return obj;
  
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  if (!lastKey) return obj;
  
  let current = obj;
  
  // Create intermediate objects as needed
  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  // Set the final value
  current[lastKey] = value;
  
  return obj;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Format phone number to (XXX) XXX-XXXX format
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Calculate years in operation from founded year
 */
export function calculateYearsInOperation(foundedYear: number | string | null | undefined): number | null {
  if (!foundedYear) return null;
  
  const year = typeof foundedYear === 'string' ? parseInt(foundedYear, 10) : foundedYear;
  if (isNaN(year)) return null;
  
  const currentYear = new Date().getFullYear();
  return currentYear - year;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

