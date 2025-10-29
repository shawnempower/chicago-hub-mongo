/**
 * Service Area Selector - SIMPLE VERSION
 * No API calls, no database - just works
 */

import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, X, Search, Star } from 'lucide-react';
import { ServiceArea } from '@/types/publication';

interface ServiceAreaSelectorSimpleProps {
  serviceAreas?: ServiceArea[];
  onChange?: (areas: ServiceArea[]) => void;
}

// Simple mock data - no database needed
const MOCK_DATA = {
  dmas: [
    'Chicago, IL',
    'New York, NY',
    'Los Angeles, CA',
    'Milwaukee, WI',
    'Philadelphia, PA',
    'Dallas-Ft. Worth, TX',
    'San Francisco, CA',
    'Boston, MA',
    'Atlanta, GA',
    'Phoenix, AZ'
  ],
  counties: {
    'Chicago, IL': ['Cook', 'Lake', 'DuPage', 'Will', 'Kane'],
    'Los Angeles, CA': ['Los Angeles', 'Orange', 'Ventura', 'San Bernardino'],
    'New York, NY': ['New York', 'Kings', 'Queens', 'Bronx', 'Richmond']
  }
};

export const ServiceAreaSelectorSimple: React.FC<ServiceAreaSelectorSimpleProps> = ({
  serviceAreas = [],
  onChange
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simple search - just filter DMAs
  const getFilteredDMAs = () => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return MOCK_DATA.dmas.filter(dma => dma.toLowerCase().includes(query));
  };

  const getFilteredCounties = () => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    const results: Array<{ county: string; dma: string }> = [];
    
    Object.entries(MOCK_DATA.counties).forEach(([dma, counties]) => {
      counties.forEach(county => {
        if (county.toLowerCase().includes(query)) {
          results.push({ county, dma });
        }
      });
    });
    
    return results;
  };

  const handleAddFullDMA = (dmaName: string) => {
    // Check if already exists
    const exists = serviceAreas.some(a => a.dmaName === dmaName && !a.counties && !a.zipCodes);
    if (exists) return;

    const newArea: ServiceArea = {
      dmaName: dmaName,
      dmaNormalized: dmaName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      isPrimary: serviceAreas.filter(a => !a.counties && !a.zipCodes).length === 0
    };

    onChange?.([...serviceAreas, newArea]);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleAddCounty = (countyName: string, dmaName: string) => {
    const dmaNormalized = dmaName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Find existing partial area for this DMA
    const existingIndex = serviceAreas.findIndex(
      a => a.dmaNormalized === dmaNormalized && a.counties
    );

    if (existingIndex >= 0) {
      // Add to existing
      const updated = [...serviceAreas];
      const area = { ...updated[existingIndex] };
      const countyNormalized = countyName.toLowerCase();
      
      if (!area.counties?.some(c => c.normalized === countyNormalized)) {
        area.counties = [
          ...(area.counties || []),
          { name: countyName, normalized: countyNormalized }
        ];
        updated[existingIndex] = area;
        onChange?.(updated);
      }
    } else {
      // Create new partial area
      const newArea: ServiceArea = {
        dmaName: dmaName,
        dmaNormalized: dmaNormalized,
        counties: [{ name: countyName, normalized: countyName.toLowerCase() }]
      };
      onChange?.([...serviceAreas, newArea]);
    }

    setShowSearch(false);
    setSearchQuery('');
  };

  const handleRemoveArea = (index: number) => {
    const updated = serviceAreas.filter((_, i) => i !== index);
    // Reassign primary if needed
    if (serviceAreas[index].isPrimary && updated.length > 0) {
      const nextFullDmaIndex = updated.findIndex(a => !a.counties && !a.zipCodes);
      if (nextFullDmaIndex >= 0) {
        updated[nextFullDmaIndex] = { ...updated[nextFullDmaIndex], isPrimary: true };
      }
    }
    onChange?.(updated);
  };

  const handleRemoveCounty = (areaIndex: number, countyNormalized: string) => {
    const updated = [...serviceAreas];
    const area = { ...updated[areaIndex] };
    area.counties = area.counties?.filter(c => c.normalized !== countyNormalized);
    
    // Remove entire area if no counties left
    if (!area.counties || area.counties.length === 0) {
      updated.splice(areaIndex, 1);
    } else {
      updated[areaIndex] = area;
    }
    
    onChange?.(updated);
  };

  // Separate full DMAs from partial coverage
  const fullDMAs = serviceAreas.filter(a => !a.counties && !a.zipCodes);
  const partialAreas = serviceAreas.filter(a => a.counties || a.zipCodes);

  const filteredDMAs = getFilteredDMAs();
  const filteredCounties = getFilteredCounties();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Service Areas</Label>
        {serviceAreas.length > 0 && (
          <span className="text-xs text-gray-500">({serviceAreas.length} area{serviceAreas.length !== 1 ? 's' : ''})</span>
        )}
      </div>

      {/* Display existing areas */}
      {fullDMAs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Full DMA Coverage</Label>
          <div className="flex flex-wrap gap-2">
            {fullDMAs.map((area, idx) => {
              const areaIndex = serviceAreas.indexOf(area);
              return (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="gap-1 pr-1 bg-blue-100 text-blue-800 border-blue-200"
                >
                  <span>{area.dmaName}</span>
                  {area.isPrimary && <Star className="h-3 w-3 fill-yellow-500 text-yellow-600" />}
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(areaIndex)}
                    className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {partialAreas.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Partial Coverage</Label>
          {partialAreas.map((area, idx) => {
            const areaIndex = serviceAreas.indexOf(area);
            return (
              <div key={idx} className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="text-xs font-medium">{area.dmaName}</p>
                {area.counties && area.counties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {area.counties.map((county, cIdx) => (
                      <Badge
                        key={cIdx}
                        variant="secondary"
                        className="gap-1 pr-1 bg-green-100 text-green-800 border-green-200 text-xs"
                      >
                        <span>{county.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCounty(areaIndex, county.normalized)}
                          className="ml-1 hover:bg-green-300 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add button & search */}
      <div className="relative" ref={searchRef}>
        {!showSearch ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="h-8"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Service Area
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search DMA or County..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="h-9"
              >
                Cancel
              </Button>
            </div>

            {(filteredDMAs.length > 0 || filteredCounties.length > 0) && (
              <div className="border rounded-md bg-white shadow-sm max-h-64 overflow-y-auto">
                {/* Show DMAs */}
                {filteredDMAs.map((dma, idx) => (
                  <button
                    key={`dma-${idx}`}
                    type="button"
                    onClick={() => handleAddFullDMA(dma)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b transition-colors"
                  >
                    <div className="text-sm font-medium">{dma}</div>
                    <div className="text-xs text-gray-500">Full DMA coverage</div>
                  </button>
                ))}

                {/* Show Counties */}
                {filteredCounties.map((result, idx) => (
                  <button
                    key={`county-${idx}`}
                    type="button"
                    onClick={() => handleAddCounty(result.county, result.dma)}
                    className="w-full text-left px-3 py-2 hover:bg-green-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="text-sm font-medium">{result.county} County</div>
                    <div className="text-xs text-gray-500">in {result.dma} (partial coverage)</div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && filteredDMAs.length === 0 && filteredCounties.length === 0 && (
              <div className="text-sm text-gray-500 italic">No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Display-only version
interface ServiceAreaDisplaySimpleProps {
  serviceAreas?: ServiceArea[];
}

export const ServiceAreaDisplaySimple: React.FC<ServiceAreaDisplaySimpleProps> = ({
  serviceAreas = []
}) => {
  if (serviceAreas.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Service Areas</p>
        <p className="mt-1 text-gray-400 italic">Not specified</p>
      </div>
    );
  }

  const fullDMAs = serviceAreas.filter(a => !a.counties && !a.zipCodes);
  const partialAreas = serviceAreas.filter(a => a.counties || a.zipCodes);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">Service Areas</p>
      
      {fullDMAs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Full DMA Coverage</p>
          <div className="flex flex-wrap gap-1">
            {fullDMAs.map((area, idx) => (
              <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                {area.dmaName}
                {area.isPrimary && <Star className="h-3 w-3 ml-1 fill-yellow-500 text-yellow-600" />}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {partialAreas.map((area, idx) => (
        <div key={idx} className="pl-3 border-l-2 border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-1">{area.dmaName} (Partial)</p>
          {area.counties && area.counties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {area.counties.map((county, cIdx) => (
                <Badge key={cIdx} variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                  {county.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
