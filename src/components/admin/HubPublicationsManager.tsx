/**
 * HubPublicationsManager Component
 * 
 * Manages which publications are assigned to a specific hub
 * Shows two panels: unassigned and assigned publications
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Hub } from '@/integrations/mongodb/hubSchema';
import { useHubPublications } from '@/hooks/useHubs';
import { usePublicationsFull } from '@/hooks/usePublications';
import { PublicationFrontend } from '@/types/publication';
import { hubsApi } from '@/api/hubs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Building2, FileText, Search, X } from 'lucide-react';

interface HubPublicationsManagerProps {
  hub: Hub;
  onUpdate?: () => void;
}

export const HubPublicationsManager: React.FC<HubPublicationsManagerProps> = ({ hub, onUpdate }) => {
  const { publications: assignedPublications, loading: assignedLoading, refetch: refetchAssigned } = useHubPublications(hub.hubId);
  const { publications: allPublications, loading: allPublicationsLoading, refetch: refetchAllPublications } = usePublicationsFull();
  
  const [selectedUnassigned, setSelectedUnassigned] = useState<string[]>([]);
  const [selectedAssigned, setSelectedAssigned] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [searchUnassigned, setSearchUnassigned] = useState('');
  const [searchAssigned, setSearchAssigned] = useState('');

  // Reset selections and search when hub changes
  useEffect(() => {
    setSelectedUnassigned([]);
    setSelectedAssigned([]);
    setSearchUnassigned('');
    setSearchAssigned('');
  }, [hub.hubId]);

  // Get publications not already in this hub
  const unassignedPublications = useMemo(() => {
    const assignedIds = new Set(assignedPublications.map(p => p._id?.toString()));
    const unassigned = allPublications.filter(pub => !assignedIds.has(pub._id?.toString()));
    
    return unassigned;
  }, [allPublications, assignedPublications, hub.hubId]);

  // Filter publications based on search
  const filteredUnassigned = useMemo(() => {
    if (!searchUnassigned.trim()) return unassignedPublications;
    
    const search = searchUnassigned.toLowerCase();
    return unassignedPublications.filter(pub => 
      pub?.basicInfo?.publicationName?.toLowerCase().includes(search) ||
      pub?.basicInfo?.geographicCoverage?.toLowerCase().includes(search) ||
      pub?.basicInfo?.publicationType?.toLowerCase().includes(search)
    );
  }, [unassignedPublications, searchUnassigned]);

  const filteredAssigned = useMemo(() => {
    if (!searchAssigned.trim()) return assignedPublications;
    
    const search = searchAssigned.toLowerCase();
    return assignedPublications.filter(pub => 
      pub?.basicInfo?.publicationName?.toLowerCase().includes(search) ||
      pub?.basicInfo?.geographicCoverage?.toLowerCase().includes(search) ||
      pub?.basicInfo?.publicationType?.toLowerCase().includes(search)
    );
  }, [assignedPublications, searchAssigned]);

  const handleAssign = async () => {
    if (selectedUnassigned.length === 0) return;
    
    setIsAssigning(true);
    try {
      await hubsApi.bulkAssignPublications(selectedUnassigned, hub.hubId);
      toast.success(`${selectedUnassigned.length} publication${selectedUnassigned.length !== 1 ? 's' : ''} assigned to ${hub.basicInfo.name}`);
      
      // Refresh both lists
      await Promise.all([refetchAssigned(), refetchAllPublications()]);
      setSelectedUnassigned([]);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error assigning publications:', error);
      toast.error(error.message || 'Failed to assign publications');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async () => {
    if (selectedAssigned.length === 0) return;
    
    setIsRemoving(true);
    try {
      // Remove publications one by one
      for (const pubId of selectedAssigned) {
        await hubsApi.removePublicationFromHub(pubId, hub.hubId);
      }
      
      toast.success(`${selectedAssigned.length} publication${selectedAssigned.length !== 1 ? 's' : ''} removed from ${hub.basicInfo.name}`);
      
      // Refresh both lists
      await Promise.all([refetchAssigned(), refetchAllPublications()]);
      setSelectedAssigned([]);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error removing publications:', error);
      toast.error(error.message || 'Failed to remove publications');
    } finally {
      setIsRemoving(false);
    }
  };

  const toggleUnassignedSelection = (pubId: string) => {
    setSelectedUnassigned(prev =>
      prev.includes(pubId) ? prev.filter(id => id !== pubId) : [...prev, pubId]
    );
  };

  const toggleAssignedSelection = (pubId: string) => {
    setSelectedAssigned(prev =>
      prev.includes(pubId) ? prev.filter(id => id !== pubId) : [...prev, pubId]
    );
  };

  const selectAllUnassigned = () => {
    setSelectedUnassigned(filteredUnassigned.map(p => p._id?.toString() || '').filter(Boolean));
  };

  const deselectAllUnassigned = () => {
    setSelectedUnassigned([]);
  };

  const selectAllAssigned = () => {
    setSelectedAssigned(filteredAssigned.map(p => p._id?.toString() || '').filter(Boolean));
  };

  const deselectAllAssigned = () => {
    setSelectedAssigned([]);
  };

  const isLoading = assignedLoading || allPublicationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Unassigned Publications Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Publications
          </CardTitle>
          <CardDescription>
            Select publications to add to this hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unassignedPublications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">All publications are already in this hub</p>
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, location, or type..."
                  value={searchUnassigned}
                  onChange={(e) => setSearchUnassigned(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchUnassigned && (
                  <button
                    onClick={() => setSearchUnassigned('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {selectedUnassigned.length} of {filteredUnassigned.length} selected
                  {searchUnassigned && ` (${unassignedPublications.length} total)`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllUnassigned}
                    disabled={selectedUnassigned.length === filteredUnassigned.length || filteredUnassigned.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllUnassigned}
                    disabled={selectedUnassigned.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {filteredUnassigned.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No publications match your search</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {filteredUnassigned.map((pub) => {
                    const pubId = pub._id?.toString() || '';
                    if (!pub?.basicInfo) return null;
                    
                    return (
                      <div
                        key={pubId}
                        className="flex items-start space-x-3 p-2 rounded hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`unassigned-${pubId}`}
                          checked={selectedUnassigned.includes(pubId)}
                          onCheckedChange={() => toggleUnassignedSelection(pubId)}
                        />
                        <Label
                          htmlFor={`unassigned-${pubId}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{pub.basicInfo.publicationName || 'Unnamed Publication'}</div>
                          {pub.basicInfo.geographicCoverage && (
                            <div className="text-xs text-muted-foreground">
                              {pub.basicInfo.geographicCoverage}
                            </div>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button
            onClick={handleAssign}
            disabled={selectedUnassigned.length === 0 || isAssigning}
          >
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selectedUnassigned.length > 0 && `(${selectedUnassigned.length})`}
          </Button>
        </CardFooter>
      </Card>

      {/* Assigned Publications Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assigned to {hub.basicInfo.name}
          </CardTitle>
          <CardDescription>
            Select publications to remove from this hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedPublications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No publications assigned yet</p>
              <p className="text-xs mt-1">Select publications from the left to get started</p>
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, location, or type..."
                  value={searchAssigned}
                  onChange={(e) => setSearchAssigned(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchAssigned && (
                  <button
                    onClick={() => setSearchAssigned('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {selectedAssigned.length} of {filteredAssigned.length} selected
                  {searchAssigned && ` (${assignedPublications.length} total)`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllAssigned}
                    disabled={selectedAssigned.length === filteredAssigned.length || filteredAssigned.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllAssigned}
                    disabled={selectedAssigned.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {filteredAssigned.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No publications match your search</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {filteredAssigned.map((pub) => {
                    const pubId = pub._id?.toString() || '';
                    if (!pub?.basicInfo) return null;
                    
                    return (
                      <div
                        key={pubId}
                        className="flex items-start space-x-3 p-2 rounded hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`assigned-${pubId}`}
                          checked={selectedAssigned.includes(pubId)}
                          onCheckedChange={() => toggleAssignedSelection(pubId)}
                        />
                        <Label
                          htmlFor={`assigned-${pubId}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{pub.basicInfo.publicationName || 'Unnamed Publication'}</div>
                          {pub.basicInfo.geographicCoverage && (
                            <div className="text-xs text-muted-foreground">
                              {pub.basicInfo.geographicCoverage}
                            </div>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={selectedAssigned.length === 0 || isRemoving}
          >
            {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove {selectedAssigned.length > 0 && `(${selectedAssigned.length})`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

