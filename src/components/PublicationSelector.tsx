import React, { useState, useEffect, useMemo } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { getPublicationBrandColor, prefetchBrandColors } from '@/config/publicationBrandColors';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [, forceRender] = useState(0);
  const [brandColorsFetched, setBrandColorsFetched] = useState(false);

  // Reset brand colors fetched flag when publication changes
  useEffect(() => {
    setBrandColorsFetched(false);
  }, [selectedPublication?.publicationId]);

  // Only prefetch brand colors when the dropdown is opened (true lazy loading)
  useEffect(() => {
    if (open && selectedPublication && !brandColorsFetched) {
      prefetchBrandColors([selectedPublication.publicationId]).then(() => {
        setBrandColorsFetched(true);
        forceRender(prev => prev + 1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPublication?.publicationId]);

  // Filter publications based on search
  const filteredPublications = useMemo(() => {
    if (!search) return availablePublications;
    const searchLower = search.toLowerCase();
    return availablePublications.filter((pub) => 
      pub.basicInfo.publicationName?.toLowerCase().includes(searchLower) ||
      pub.basicInfo.websiteUrl?.toLowerCase().includes(searchLower)
    );
  }, [search, availablePublications]);

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
    // Compact version for navbar
    return (
      <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
        {/* Label Section */}
        <div className="px-3 h-full flex items-center whitespace-nowrap text-xs font-medium" style={{ backgroundColor: '#EDEAE1', color: '#6C685D' }}>
          Active Publication
        </div>
        
        {/* Divider */}
        <div className="w-px h-full bg-border" />
        
        {/* Dropdown Section */}
        <Popover open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearch('');
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="w-auto min-w-[160px] h-full text-xs bg-white border-0 rounded-none shadow-none focus:ring-0 hover:bg-gray-50 justify-between"
            >
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
                <span className="truncate">{selectedPublication?.basicInfo.publicationName || 'Select'}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Search publications..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No publication found.</CommandEmpty>
                <CommandGroup>
                  {filteredPublications.map((publication) => {
                    const isSelected = selectedPublication?.publicationId === publication.publicationId;
                    const avatarColor = isSelected 
                      ? getPublicationBrandColor(publication.publicationId)
                      : '#0066cc';
                    
                    return (
                      <CommandItem
                        key={publication._id || publication.publicationId}
                        value={`${publication.basicInfo.publicationName} ${publication.basicInfo.websiteUrl || ''}`}
                        onSelect={() => {
                          setSelectedPublication(publication);
                          setSearch('');
                          setOpen(false);
                        }}
                        className="px-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {publication.basicInfo.publicationName.charAt(0)}
                          </div>
                          <span className="truncate">{publication.basicInfo.publicationName}</span>
                          {isSelected && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Regular version for dashboard
  return (
    <div className="flex items-center gap-2">
      <span className="text-[1.09375rem] font-medium text-muted-foreground whitespace-nowrap font-serif">
        Active Publication
      </span>
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearch('');
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-auto min-w-[200px] justify-between"
          >
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
              <span className="truncate">{selectedPublication?.basicInfo.publicationName || 'Select publication'}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search publications..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No publication found.</CommandEmpty>
              <CommandGroup>
                {filteredPublications.map((publication) => {
                  const isSelected = selectedPublication?.publicationId === publication.publicationId;
                  const avatarColor = isSelected 
                    ? getPublicationBrandColor(publication.publicationId)
                    : '#0066cc';
                  
                  return (
                    <CommandItem
                      key={publication._id || publication.publicationId}
                      value={`${publication.basicInfo.publicationName} ${publication.basicInfo.websiteUrl || ''}`}
                      onSelect={() => {
                        setSelectedPublication(publication);
                        setSearch('');
                        setOpen(false);
                      }}
                      className="px-2"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {publication.basicInfo.publicationName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{publication.basicInfo.publicationName}</div>
                          <div className="text-xs flex items-center gap-2 flex-wrap">
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
                        {isSelected && <Check className="ml-2 h-4 w-4 flex-shrink-0" />}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
