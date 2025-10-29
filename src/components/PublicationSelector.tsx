import React, { useState, useEffect, useMemo } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Search } from 'lucide-react';
import { getPublicationBrandColor, prefetchBrandColors } from '@/config/publicationBrandColors';

// Color system for tags with light backgrounds and darker text
const getTagColors = (value: string): { bg: string; text: string } => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    // Frequency types
    'daily': { bg: 'bg-blue-50', text: 'text-blue-700' },
    'weekly': { bg: 'bg-purple-50', text: 'text-purple-700' },
    'monthly': { bg: 'bg-pink-50', text: 'text-pink-700' },
    'other': { bg: 'bg-gray-50', text: 'text-gray-700' },
    
    // Geographic coverage
    'local': { bg: 'bg-green-50', text: 'text-green-700' },
    'regional': { bg: 'bg-orange-50', text: 'text-orange-700' },
    'national': { bg: 'bg-red-50', text: 'text-red-700' },
    'international': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  };
  
  return colorMap[value?.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-700' };
};

// Capitalize first letter of each word
const capitalizeWords = (text: string): string => {
  if (!text) return '';
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface PublicationSelectorProps {
  compact?: boolean;
}

export const PublicationSelector: React.FC<PublicationSelectorProps> = ({ compact = false }) => {
  const { selectedPublication, setSelectedPublication, availablePublications, loading, error } = usePublication();
  const [searchTerm, setSearchTerm] = useState('');
  const [, forceRender] = useState(0);

  // Handle keyboard events in search input to prevent Select from intercepting them
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent Select component from handling these keys
    e.stopPropagation();
    
    // Allow Escape to close the dropdown
    if (e.key === 'Escape') {
      setSearchTerm('');
      return;
    }
  };

  // Only prefetch brand color for the currently selected publication (lazy loading)
  // Colors for other publications will load on-demand when rendering their avatars
  useEffect(() => {
    if (selectedPublication) {
      prefetchBrandColors([selectedPublication.publicationId]).then(() => {
        forceRender(prev => prev + 1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPublication?.publicationId]);

  // Filter publications based on search term - memoized for performance
  const filteredPublications = useMemo(() => {
    if (!searchTerm) return availablePublications;
    
    const searchLower = searchTerm.toLowerCase();
    return availablePublications.filter((publication) => {
      return (
        publication.basicInfo.publicationName?.toLowerCase().includes(searchLower) ||
        publication.basicInfo.websiteUrl?.toLowerCase().includes(searchLower)
      );
    });
  }, [searchTerm, availablePublications]);


  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-muted rounded-lg animate-pulse ${compact ? 'text-xs' : ''}`}>
        <Building2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg ${compact ? 'text-xs' : ''}`}>
        <Building2 className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className={compact ? 'text-xs' : 'text-sm'}>Error: {error}</span>
      </div>
    );
  }

  if (availablePublications.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-muted rounded-lg ${compact ? 'text-xs' : ''}`}>
        <Building2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>No publications</span>
      </div>
    );
  }

  if (compact) {
    // Compact version for navbar - merged design
    return (
      <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
        {/* Label Section */}
        <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
          Active Publication
        </div>
        
        {/* Divider */}
        <div className="w-px h-full bg-border" />
        
        {/* Dropdown Section */}
        <Select 
          value={selectedPublication?._id || selectedPublication?.publicationId.toString() || ""} 
          onValueChange={(value) => {
            const publication = availablePublications.find(
              p => p._id === value || p.publicationId.toString() === value
            );
            setSelectedPublication(publication || null);
          }}
          onOpenChange={(open) => {
            if (!open) setSearchTerm('');
          }}
        >
          <SelectTrigger className="w-auto min-w-[160px] h-full text-xs bg-white border-0 rounded-none shadow-none focus:ring-0">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ 
                  backgroundColor: selectedPublication ? 
                    getPublicationBrandColor(selectedPublication.publicationId) : 
                    '#0066cc' 
                }}
              >
                {selectedPublication?.basicInfo.publicationName?.charAt(0) || '?'}
              </div>
              <SelectValue placeholder="Select">
                {selectedPublication?.basicInfo.publicationName || 'Select'}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search publications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-7 text-xs bg-white"
                  onKeyDown={handleSearchKeyDown}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>
            {filteredPublications.length > 0 ? (
              filteredPublications.map((publication) => {
                // Only use brand color for selected publication, use default for others to avoid 20+ API calls
                const isSelected = selectedPublication?.publicationId === publication.publicationId;
                const avatarColor = isSelected 
                  ? getPublicationBrandColor(publication.publicationId)
                  : '#0066cc'; // Default color for non-selected publications
                
                return (
                  <SelectItem 
                    key={publication._id || publication.publicationId} 
                    value={publication._id || publication.publicationId.toString()}
                  >
                    <div className="flex items-center gap-2 py-1">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ 
                          backgroundColor: avatarColor
                        }}
                      >
                        {publication.basicInfo.publicationName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{publication.basicInfo.publicationName}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No publications found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Regular version for dashboard
  return (
    <div className="flex items-center gap-2">
      <span className="text-[1.09375rem] font-medium text-muted-foreground whitespace-nowrap font-serif">
        Active Publication
      </span>
      <Select 
        value={selectedPublication?._id || selectedPublication?.publicationId.toString() || ""} 
        onValueChange={(value) => {
          const publication = availablePublications.find(
            p => p._id === value || p.publicationId.toString() === value
          );
          setSelectedPublication(publication || null);
        }}
        onOpenChange={(open) => {
          if (!open) setSearchTerm('');
        }}
      >
        <SelectTrigger className="w-auto min-w-[200px] bg-background border-border">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ 
                backgroundColor: selectedPublication ? 
                  getPublicationBrandColor(selectedPublication.publicationId) : 
                  '#0066cc' 
              }}
            >
              {selectedPublication?.basicInfo.publicationName?.charAt(0) || '?'}
            </div>
            <SelectValue placeholder="Select publication">
              {selectedPublication?.basicInfo.publicationName || 'Select publication'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search publications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm bg-white"
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
          {filteredPublications.length > 0 ? (
            filteredPublications.map((publication) => {
              // Only use brand color for selected publication, use default for others to avoid 20+ API calls
              const isSelected = selectedPublication?.publicationId === publication.publicationId;
              const avatarColor = isSelected 
                ? getPublicationBrandColor(publication.publicationId)
                : '#0066cc'; // Default color for non-selected publications
              
              return (
                <SelectItem 
                  key={publication._id || publication.publicationId} 
                  value={publication._id || publication.publicationId.toString()}
                >
                  <div className="flex items-center gap-3 py-1">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ 
                        backgroundColor: avatarColor
                      }}
                    >
                      {publication.basicInfo.publicationName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{publication.basicInfo.publicationName}</div>
                    <div className="text-xs flex items-center gap-2">
                      {publication.basicInfo.publicationType && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs border-0 ${getTagColors(publication.basicInfo.publicationType).bg} ${getTagColors(publication.basicInfo.publicationType).text}`}
                        >
                          {capitalizeWords(publication.basicInfo.publicationType)}
                        </Badge>
                      )}
                      {publication.basicInfo.geographicCoverage && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs border-0 ${getTagColors(publication.basicInfo.geographicCoverage).bg} ${getTagColors(publication.basicInfo.geographicCoverage).text}`}
                        >
                          {capitalizeWords(publication.basicInfo.geographicCoverage)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No publications found
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
