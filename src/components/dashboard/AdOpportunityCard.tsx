import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AdOpportunityCardProps {
  title: string;
  fields: Array<{
    label: string;
    value: string | number | undefined;
  }>;
  hubPricingCount?: number;
  className?: string;
}

export const AdOpportunityCard: React.FC<AdOpportunityCardProps> = ({
  title,
  fields,
  hubPricingCount = 0,
  className = '',
}) => {
  // Split fields into two columns
  const midpoint = Math.ceil(fields.length / 2);
  const leftColumn = fields.slice(0, midpoint);
  const rightColumn = fields.slice(midpoint);

  // Helper to render field value with custom badge if it's a Price field
  const renderFieldValue = (field: { label: string; value: string | number | undefined }, index: number) => (
    <div key={index}>
      <p className="text-xs font-medium text-gray-500 mb-1">{field.label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-900">{field.value || 'N/A'}</p>
        {field.label === 'Price' && hubPricingCount > 0 && (
          <Badge 
            variant="secondary" 
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-2 py-0.5"
          >
            +{hubPricingCount} CUSTOM
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className={`border border-gray-200 rounded-lg shadow-sm p-4 bg-white ${className}`}>
      {/* Title */}
      <div className="mb-3">
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
      </div>

      {/* Specifications Container */}
      <div className="p-3 bg-muted/50 rounded-md border">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {/* Left Column */}
          <div className="space-y-3">
            {leftColumn.map((field, index) => renderFieldValue(field, index))}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {rightColumn.map((field, index) => renderFieldValue(field, index))}
          </div>
        </div>
      </div>
    </div>
  );
};


