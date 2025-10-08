import React from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronDown } from 'lucide-react';

export const PublicationSelector: React.FC = () => {
  const { selectedPublication, setSelectedPublication, availablePublications, loading, error } = usePublication();


  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg animate-pulse">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading publications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Error: {error}</span>
      </div>
    );
  }

  if (availablePublications.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No publications available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
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
      >
        <SelectTrigger className="w-auto min-w-[200px] bg-background border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
              {selectedPublication?.basicInfo.publicationName?.charAt(0) || '?'}
            </div>
            <SelectValue placeholder="Select publication">
              {selectedPublication?.basicInfo.publicationName || 'Select publication'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {availablePublications.map((publication) => (
            <SelectItem 
              key={publication._id || publication.publicationId} 
              value={publication._id || publication.publicationId.toString()}
            >
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {publication.basicInfo.publicationName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{publication.basicInfo.publicationName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {publication.basicInfo.publicationType && (
                      <Badge variant="outline" className="text-xs">
                        {publication.basicInfo.publicationType}
                      </Badge>
                    )}
                    {publication.basicInfo.geographicCoverage && (
                      <span>{publication.basicInfo.geographicCoverage}</span>
                    )}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
