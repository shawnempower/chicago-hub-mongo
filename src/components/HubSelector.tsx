import React from 'react';
import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHubContext } from '@/contexts/HubContext';

/**
 * HubSelector - Database-driven hub selector
 * Shows active hubs from the database
 * If only one hub, displays it statically
 * If multiple hubs, allows selection
 */
export const HubSelector: React.FC = () => {
  const { hubs, loading, selectedHubId, setSelectedHubId } = useHubContext();

  if (loading) {
    return (
      <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
        <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
          Active Hub
        </div>
        <div className="w-px h-full bg-border" />
        <div className="px-3 h-full flex items-center gap-1.5 bg-white min-w-[160px]">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
        <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
          Active Hub
        </div>
        <div className="w-px h-full bg-border" />
        <div className="px-3 h-full flex items-center gap-1.5 bg-white min-w-[160px]">
          <span className="text-xs text-muted-foreground">No hubs available</span>
        </div>
      </div>
    );
  }

  const currentHub = hubs.find(h => h.hubId === selectedHubId) || hubs[0];
  const hubInitial = currentHub.basicInfo.name.charAt(0).toUpperCase();
  const hubColor = currentHub.branding?.primaryColor || '#0066cc';

  // If only one hub, show static display
  if (hubs.length === 1) {
    return (
      <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
        <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
          Active Hub
        </div>
        <div className="w-px h-full bg-border" />
        <div className="px-3 h-full flex items-center gap-1.5 bg-white min-w-[160px]">
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
            style={{ backgroundColor: hubColor }}
          >
            {hubInitial}
          </div>
          <span className="text-xs truncate">{currentHub.basicInfo.name}</span>
        </div>
      </div>
    );
  }

  // Multiple hubs - show selector
  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
      <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
        Active Hub
      </div>
        <div className="w-px h-full bg-border" />
        <Select value={selectedHubId || undefined} onValueChange={setSelectedHubId}>
          <SelectTrigger className="h-9 border-0 bg-white shadow-none focus:ring-0 min-w-[160px]">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
              style={{ backgroundColor: hubColor }}
            >
              {hubInitial}
            </div>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {hubs.map((hub) => (
            <SelectItem key={hub.hubId} value={hub.hubId}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-semibold"
                  style={{ backgroundColor: hub.branding?.primaryColor || '#0066cc' }}
                >
                  {hub.basicInfo.name.charAt(0).toUpperCase()}
                </div>
                {hub.basicInfo.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

