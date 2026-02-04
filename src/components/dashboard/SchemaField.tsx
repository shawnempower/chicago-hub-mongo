/**
 * SchemaField - Visual wrapper for form fields showing schema mapping status
 * Provides color-coded indicators for field mapping quality
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { MappingStatus } from '@/config/publicationFieldMapping';

interface SchemaFieldProps {
  mappingStatus: MappingStatus;
  schemaPath?: string;
  warningMessage?: string;
  children: React.ReactNode;
  showSchemaPath?: boolean;
  className?: string;
}

export const SchemaField: React.FC<SchemaFieldProps> = ({
  mappingStatus,
  schemaPath,
  warningMessage,
  children,
  showSchemaPath = false,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (mappingStatus) {
      case 'full':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          badgeVariant: 'outline' as const,
          badgeClass: 'bg-green-100 text-green-800 border-green-300',
          showBadge: false
        };
      case 'partial':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          badgeVariant: 'outline' as const,
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-400',
          showBadge: true
        };
      case 'none':
        return {
          icon: <AlertTriangle className="w-3 h-3" />,
          badgeVariant: 'destructive' as const,
          badgeClass: 'bg-red-100 text-red-800 border-red-400',
          showBadge: true
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {config.showBadge && warningMessage && (
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={config.badgeVariant} className={config.badgeClass}>
            <span className="flex items-center gap-1">
              {config.icon}
              <span className="text-xs">
                {mappingStatus === 'partial' ? 'Partial Mapping: ' : '⚠️ Not in Schema: '}
                {warningMessage}
              </span>
            </span>
          </Badge>
        </div>
      )}
      
      {showSchemaPath && schemaPath && (
        <div className="text-xs text-gray-500 mt-1 font-mono">
          Schema: {schemaPath}
        </div>
      )}
    </div>
  );
};

interface SchemaSectionProps {
  title: string;
  mappingStatus: MappingStatus;
  warningMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export const SchemaSection: React.FC<SchemaSectionProps> = ({
  title,
  mappingStatus,
  warningMessage,
  children,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (mappingStatus) {
      case 'full':
        return {
          headerBg: 'bg-white',
          icon: null,
          badge: null
        };
      case 'partial':
        return {
          headerBg: 'bg-yellow-50',
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          badge: (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400">
              Partial Mapping
            </Badge>
          )
        };
      case 'none':
        return {
          headerBg: 'bg-red-50',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          badge: (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-400">
              Schema Update Required
            </Badge>
          )
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className={`flex items-center justify-between p-4 rounded-t-lg ${config.headerBg} border-b-2`}>
        <div className="flex items-center gap-2">
          {config.icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {config.badge}
      </div>
      
      {warningMessage && mappingStatus === 'none' && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> {warningMessage}
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

/**
 * Legend component to explain color coding
 */
export const SchemaFieldLegend: React.FC = () => {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4">
      <h4 className="font-semibold text-sm mb-3">Field Mapping Legend</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-yellow-300 bg-yellow-50 rounded"></div>
          <span className="text-gray-700">
            <strong>Yellow background:</strong> Field requires transformation or uses alternate schema field
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-red-300 bg-red-50 rounded"></div>
          <span className="text-gray-700">
            <strong>Red background:</strong> Field not in schema - data will not persist until schema is updated
          </span>
        </div>
      </div>
    </div>
  );
};

