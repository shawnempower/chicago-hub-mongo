/**
 * Survey Validation Utility
 * 
 * This utility provides validation functions for survey submissions using the JSON schema.
 * It can be used both on the frontend and backend to ensure data integrity.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { SurveySubmission } from './survey-types.js';

// Import the JSON schema (in a real implementation, you'd import this properly)
const surveySchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Chicago Media Network Survey Submission",
  "description": "Schema for advertising inventory survey submissions from Chicago-area media outlets",
  "type": "object",
  "required": ["metadata", "contactInformation", "createdAt", "updatedAt"],
  // ... (the full schema would be imported here)
};

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile the schema
const validateSurvey = ajv.compile(surveySchema);

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a survey submission against the JSON schema
 */
export function validateSurveySubmission(data: any): ValidationResult {
  const isValid = validateSurvey(data);
  
  if (isValid) {
    return { isValid: true, errors: [] };
  }

  const errors: ValidationError[] = (validateSurvey.errors || []).map(error => ({
    field: error.instancePath || error.schemaPath,
    message: error.message || 'Validation error',
    value: error.data
  }));

  return { isValid: false, errors };
}

/**
 * Validates required fields for survey submission
 */
export function validateRequiredFields(data: Partial<SurveySubmission>): ValidationResult {
  const errors: ValidationError[] = [];

  // Check contact information
  if (!data.contactInformation) {
    errors.push({ field: 'contactInformation', message: 'Contact information is required' });
  } else {
    if (!data.contactInformation.mediaOutletNames) {
      errors.push({ field: 'contactInformation.mediaOutletNames', message: 'Media outlet name(s) are required' });
    }

    const hasEmail = data.contactInformation.email || data.contactInformation.emailAddress;
    if (!hasEmail) {
      errors.push({ field: 'contactInformation.email', message: 'Email address is required' });
    }

    // Validate email format if provided
    if (data.contactInformation.email && !isValidEmail(data.contactInformation.email)) {
      errors.push({ field: 'contactInformation.email', message: 'Invalid email format' });
    }
    if (data.contactInformation.emailAddress && !isValidEmail(data.contactInformation.emailAddress)) {
      errors.push({ field: 'contactInformation.emailAddress', message: 'Invalid email format' });
    }
  }

  // Check metadata
  if (!data.metadata) {
    errors.push({ field: 'metadata', message: 'Metadata is required' });
  } else if (!data.metadata.source) {
    errors.push({ field: 'metadata.source', message: 'Source is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates business logic rules for survey data
 */
export function validateBusinessRules(data: SurveySubmission): ValidationResult {
  const errors: ValidationError[] = [];

  // Website advertising validation
  if (data.websiteAdvertising?.hasWebsiteAdvertising === true) {
    if (!data.websiteAdvertising.largestDigitalAdSize && !data.websiteAdvertising.largestAdMonthlyRate) {
      errors.push({
        field: 'websiteAdvertising',
        message: 'If website advertising is offered, at least ad size or rate should be provided'
      });
    }
  }

  // Print advertising validation
  if (data.printAdvertising?.hasPrintProduct === true) {
    if (!data.printAdvertising.mainPrintProductName) {
      errors.push({
        field: 'printAdvertising.mainPrintProductName',
        message: 'Print product name is required when print advertising is offered'
      });
    }
    if (!data.printAdvertising.printFrequency) {
      errors.push({
        field: 'printAdvertising.printFrequency',
        message: 'Print frequency is required when print advertising is offered'
      });
    }
  }

  // Newsletter validation
  if (data.newsletterAdvertising?.hasNewsletter === true) {
    if (!data.newsletterAdvertising.newsletterSubscribers) {
      errors.push({
        field: 'newsletterAdvertising.newsletterSubscribers',
        message: 'Subscriber count is recommended when newsletter advertising is offered'
      });
    }
  }

  // Event marketing validation
  if (data.eventMarketing?.hostsEvents === true) {
    if (!data.eventMarketing.annualEventCount) {
      errors.push({
        field: 'eventMarketing.annualEventCount',
        message: 'Annual event count is recommended when events are hosted'
      });
    }
  }

  // Branded content validation
  if (data.brandedContent?.offersBrandedContent === true) {
    const hasAnyRate = data.brandedContent.printBrandedContentCost || 
                      data.brandedContent.websiteBrandedContentCost3Month || 
                      data.brandedContent.shortFormContentCost;
    if (!hasAnyRate) {
      errors.push({
        field: 'brandedContent',
        message: 'At least one branded content rate should be provided when branded content is offered'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes survey data by removing empty strings and normalizing values
 */
export function sanitizeSurveyData(data: any): any {
  const sanitized = JSON.parse(JSON.stringify(data));

  function cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return obj.trim() === '' ? undefined : obj.trim();
    }
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = cleanObject(value);
        if (cleanedValue !== undefined && cleanedValue !== '') {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    
    if (Array.isArray(obj)) {
      const cleaned = obj.map(cleanObject).filter(item => item !== undefined);
      return cleaned.length > 0 ? cleaned : undefined;
    }
    
    return obj;
  }

  return cleanObject(sanitized);
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a numeric value is positive
 */
export function isPositiveNumber(value: number | string): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
}

/**
 * Comprehensive validation function that runs all validations
 */
export function validateSurveyComplete(data: any): ValidationResult {
  // First sanitize the data
  const sanitizedData = sanitizeSurveyData(data);
  
  // Run all validations
  const schemaResult = validateSurveySubmission(sanitizedData);
  const requiredResult = validateRequiredFields(sanitizedData);
  const businessResult = validateBusinessRules(sanitizedData);
  
  // Combine all errors
  const allErrors = [
    ...schemaResult.errors,
    ...requiredResult.errors,
    ...businessResult.errors
  ];
  
  // Remove duplicate errors
  const uniqueErrors = allErrors.filter((error, index, self) => 
    index === self.findIndex(e => e.field === error.field && e.message === error.message)
  );
  
  return {
    isValid: uniqueErrors.length === 0,
    errors: uniqueErrors
  };
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  return errors.map(error => `${error.field}: ${error.message}`).join('\n');
}

// Export the schema for external use
export { surveySchema };

