/**
 * Field Error Component
 * Displays validation error messages below form fields
 */

import React from 'react';

interface FieldErrorProps {
  error?: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;
  
  return (
    <p className={`text-xs text-red-600 mt-1 ${className}`}>
      {error}
    </p>
  );
};

