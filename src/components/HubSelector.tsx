import React from 'react';
import { Building2 } from 'lucide-react';

/**
 * HubSelector - Static display for the active hub (Chicago Hub)
 * This is a non-interactive component that shows the current hub
 */
export const HubSelector: React.FC = () => {
  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
      {/* Label Section */}
      <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
        Active Hub
      </div>
      
      {/* Divider */}
      <div className="w-px h-full bg-border" />
      
      {/* Static Hub Display */}
      <div className="px-3 h-full flex items-center gap-1.5 bg-white min-w-[160px]">
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
          style={{ backgroundColor: '#0066cc' }}
        >
          C
        </div>
        <span className="text-xs truncate">Chicago Hub</span>
      </div>
    </div>
  );
};

