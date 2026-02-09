/**
 * Add Placement Modal
 * 
 * Modal for adding placements to campaign insertion orders.
 * Supports adding to existing publications or adding new publications with placements.
 * 
 * Uses the same LineItemEditor component as PackageBuilder for consistent UX
 * and proper pricing/frequency handling.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { campaignsApi } from '@/api/campaigns';
import { hubsApi } from '@/api/hubs';
import { getPublicationById } from '@/api/publications';
import { HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';
import { LineItemEditor } from '@/components/admin/PackageBuilder/LineItemEditor';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { packageBuilderService } from '@/services/packageBuilderService';

interface InventoryItemWithSelection extends HubPackageInventoryItem {
  selected?: boolean;
  publicationId?: number;
  publicationName?: string;
}

interface AddPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  hubId: string;
  /** Publications already in the campaign with their current placements */
  existingPublications: Array<{
    publicationId: number;
    publicationName: string;
    inventoryItems?: HubPackageInventoryItem[];
  }>;
  /** Callback when placements are successfully added */
  onPlacementsAdded: () => void;
}

export function AddPlacementModal({
  isOpen,
  onClose,
  campaignId,
  hubId,
  existingPublications,
  onPlacementsAdded,
}: AddPlacementModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // For existing publication
  const [selectedExistingPubId, setSelectedExistingPubId] = useState<string>('');
  const [existingPubInventory, setExistingPubInventory] = useState<InventoryItemWithSelection[]>([]);
  const [existingPubLoading, setExistingPubLoading] = useState(false);
  
  // For new publication
  const [hubPublications, setHubPublications] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedNewPubId, setSelectedNewPubId] = useState<string>('');
  const [newPubInventory, setNewPubInventory] = useState<InventoryItemWithSelection[]>([]);
  const [newPubLoading, setNewPubLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Track frequency changes per item (itemPath -> frequency)
  const [existingItemFrequencies, setExistingItemFrequencies] = useState<Map<string, number>>(new Map());
  const [newItemFrequencies, setNewItemFrequencies] = useState<Map<string, number>>(new Map());

  // Load hub publications on open
  useEffect(() => {
    if (isOpen && hubId) {
      loadHubPublications();
    }
  }, [isOpen, hubId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedExistingPubId('');
      setSelectedNewPubId('');
      setExistingPubInventory([]);
      setNewPubInventory([]);
      setSearchTerm('');
      setActiveTab('existing');
      setExistingItemFrequencies(new Map());
      setNewItemFrequencies(new Map());
    }
  }, [isOpen]);

  const loadHubPublications = async () => {
    try {
      setLoading(true);
      const publications = await hubsApi.getPublications(hubId);
      setHubPublications(publications.map((p: any) => ({
        id: p.id || p.publicationId,
        name: p.name || p.publicationName || p.basicInfo?.publicationName || `Publication ${p.id || p.publicationId}`,
      })));
    } catch (error) {
      console.error('Error loading hub publications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load publications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get existing placement paths for a publication
  const getExistingPlacementPaths = (publicationId: number): Set<string> => {
    const pub = (existingPublications || []).find(p => p.publicationId === publicationId);
    if (!pub?.inventoryItems) return new Set();
    return new Set(pub.inventoryItems.map(item => item.itemPath));
  };

  // Load inventory for existing publication using packageBuilderService
  const loadExistingPublicationInventory = async (pubIdStr: string) => {
    const pubId = parseInt(pubIdStr);
    if (!pubId) return;

    try {
      setExistingPubLoading(true);
      const publication = await getPublicationById(pubIdStr);
      
      if (!publication) {
        toast({
          title: 'Error',
          description: 'Publication not found',
          variant: 'destructive',
        });
        return;
      }

      // Use packageBuilderService to extract inventory with proper hub pricing
      // All channels are available for selection
      const allChannels = ['website', 'newsletter', 'print', 'radio', 'podcast', 'social', 'streaming', 'events'];
      const extractedItems = packageBuilderService.extractInventoryFromPublication(
        {
          _id: publication._id || pubIdStr,
          publicationId: pubId,
          basicInfo: { publicationName: publication.name || publication.basicInfo?.publicationName || '' },
          printFrequency: publication.printFrequency,
          distributionChannels: publication.distributionChannels,
          location: publication.location,
        },
        allChannels,
        'standard',
        hubId
      );

      // Convert to InventoryItemWithSelection and filter out items already in the order
      const existingPaths = getExistingPlacementPaths(pubId);
      const availableItems: InventoryItemWithSelection[] = extractedItems
        .filter(item => !existingPaths.has(item.itemPath))
        .map(item => ({
          ...item,
          selected: false,
        }));
      
      setExistingPubInventory(availableItems);
    } catch (error) {
      console.error('Error loading publication inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load publication inventory',
        variant: 'destructive',
      });
    } finally {
      setExistingPubLoading(false);
    }
  };

  // Load inventory for new publication using packageBuilderService
  const loadNewPublicationInventory = async (pubIdStr: string) => {
    const pubId = parseInt(pubIdStr);
    if (!pubId) return;

    try {
      setNewPubLoading(true);
      const publication = await getPublicationById(pubIdStr);
      
      if (!publication) {
        toast({
          title: 'Error',
          description: 'Publication not found',
          variant: 'destructive',
        });
        return;
      }

      // Use packageBuilderService to extract inventory with proper hub pricing
      const allChannels = ['website', 'newsletter', 'print', 'radio', 'podcast', 'social', 'streaming', 'events'];
      const extractedItems = packageBuilderService.extractInventoryFromPublication(
        {
          _id: publication._id || pubIdStr,
          publicationId: pubId,
          basicInfo: { publicationName: publication.name || publication.basicInfo?.publicationName || '' },
          printFrequency: publication.printFrequency,
          distributionChannels: publication.distributionChannels,
          location: publication.location,
        },
        allChannels,
        'standard',
        hubId
      );

      // Convert to InventoryItemWithSelection
      const items: InventoryItemWithSelection[] = extractedItems.map(item => ({
        ...item,
        selected: false,
      }));
      
      setNewPubInventory(items);
    } catch (error) {
      console.error('Error loading publication inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load publication inventory',
        variant: 'destructive',
      });
    } finally {
      setNewPubLoading(false);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemPath: string, isExisting: boolean) => {
    if (isExisting) {
      setExistingPubInventory(prev =>
        prev.map(item =>
          item.itemPath === itemPath ? { ...item, selected: !item.selected } : item
        )
      );
    } else {
      setNewPubInventory(prev =>
        prev.map(item =>
          item.itemPath === itemPath ? { ...item, selected: !item.selected } : item
        )
      );
    }
  };

  // Handle frequency change from LineItemEditor
  const handleExistingFrequencyChange = useCallback((pubId: number, itemIndex: number, newFrequency: number) => {
    const item = existingPubInventory[itemIndex];
    if (item) {
      setExistingItemFrequencies(prev => new Map(prev).set(item.itemPath, newFrequency));
      // Also update the item's currentFrequency in the inventory array
      setExistingPubInventory(prev =>
        prev.map((it, idx) =>
          idx === itemIndex ? { ...it, currentFrequency: newFrequency, quantity: newFrequency } : it
        )
      );
    }
  }, [existingPubInventory]);

  const handleNewFrequencyChange = useCallback((pubId: number, itemIndex: number, newFrequency: number) => {
    const item = newPubInventory[itemIndex];
    if (item) {
      setNewItemFrequencies(prev => new Map(prev).set(item.itemPath, newFrequency));
      // Also update the item's currentFrequency in the inventory array
      setNewPubInventory(prev =>
        prev.map((it, idx) =>
          idx === itemIndex ? { ...it, currentFrequency: newFrequency, quantity: newFrequency } : it
        )
      );
    }
  }, [newPubInventory]);

  // Get selected items
  const selectedExistingItems = useMemo(
    () => existingPubInventory.filter(item => item.selected),
    [existingPubInventory]
  );

  const selectedNewItems = useMemo(
    () => newPubInventory.filter(item => item.selected),
    [newPubInventory]
  );

  // Filter hub publications to exclude ones already in campaign
  const availableNewPublications = useMemo(() => {
    const existingIds = new Set((existingPublications || []).map(p => p.publicationId));
    return hubPublications.filter(p => !existingIds.has(p.id));
  }, [hubPublications, existingPublications]);

  // Filtered publications by search, sorted by name
  const filteredNewPublications = useMemo(() => {
    let pubs = availableNewPublications;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      pubs = pubs.filter(p => (p.name || '').toLowerCase().includes(term));
    }
    return [...pubs].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [availableNewPublications, searchTerm]);

  // Handle adding placements to existing publication
  const handleAddToExisting = async () => {
    if (!selectedExistingPubId || selectedExistingItems.length === 0) return;

    try {
      setSubmitting(true);
      const pubId = parseInt(selectedExistingPubId);

      // Add each placement one by one with their configured frequency
      for (const item of selectedExistingItems) {
        const frequency = existingItemFrequencies.get(item.itemPath) || item.currentFrequency || item.quantity || 1;
        const totalCost = calculateItemCost(item, frequency);
        await campaignsApi.addPlacementToOrder(campaignId, pubId, {
          channel: item.channel,
          itemPath: item.itemPath,
          itemName: item.itemName,
          quantity: frequency,
          currentFrequency: frequency,
          frequency: item.frequency,
          duration: item.duration,
          format: item.format,
          itemPricing: {
            ...item.itemPricing,
            totalCost, // Include calculated total cost
          },
          audienceMetrics: item.audienceMetrics,
          performanceMetrics: item.performanceMetrics,
          monthlyImpressions: (item as any).monthlyImpressions,
        });
      }

      toast({
        title: 'Placements Added',
        description: `Added ${selectedExistingItems.length} placement(s) to the order`,
      });

      onPlacementsAdded();
      onClose();
    } catch (error) {
      console.error('Error adding placements:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add placements',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle adding new publication with placements
  const handleAddNewPublication = async () => {
    if (!selectedNewPubId || selectedNewItems.length === 0) return;

    try {
      setSubmitting(true);
      const pubId = parseInt(selectedNewPubId);
      const publication = hubPublications.find(p => p.id === pubId);

      if (!publication) {
        throw new Error('Publication not found');
      }

      await campaignsApi.addPublicationToOrder(
        campaignId,
        pubId,
        publication.name,
        selectedNewItems.map(item => {
          const frequency = newItemFrequencies.get(item.itemPath) || item.currentFrequency || item.quantity || 1;
          const totalCost = calculateItemCost(item, frequency);
          return {
            channel: item.channel,
            itemPath: item.itemPath,
            itemName: item.itemName,
            quantity: frequency,
            currentFrequency: frequency,
            frequency: item.frequency,
            duration: item.duration,
            format: item.format,
            itemPricing: {
              ...item.itemPricing,
              totalCost, // Include calculated total cost
            },
            audienceMetrics: item.audienceMetrics,
            performanceMetrics: item.performanceMetrics,
            monthlyImpressions: (item as any).monthlyImpressions,
          };
        })
      );

      toast({
        title: 'Publication Added',
        description: `Added ${publication.name} with ${selectedNewItems.length} placement(s)`,
      });

      onPlacementsAdded();
      onClose();
    } catch (error) {
      console.error('Error adding publication:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add publication',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals using proper pricing logic with frequencies
  const existingTotal = useMemo(() => {
    return selectedExistingItems.reduce((sum, item) => {
      const frequency = existingItemFrequencies.get(item.itemPath) || item.currentFrequency || item.quantity || 1;
      return sum + calculateItemCost(item, frequency);
    }, 0);
  }, [selectedExistingItems, existingItemFrequencies]);

  const newTotal = useMemo(() => {
    return selectedNewItems.reduce((sum, item) => {
      const frequency = newItemFrequencies.get(item.itemPath) || item.currentFrequency || item.quantity || 1;
      return sum + calculateItemCost(item, frequency);
    }, 0);
  }, [selectedNewItems, newItemFrequencies]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Placements
          </DialogTitle>
          <DialogDescription>
            Add advertising placements to existing publications or add a new publication to this campaign.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'existing' | 'new')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Add to Existing Publication</TabsTrigger>
            <TabsTrigger value="new">Add New Publication</TabsTrigger>
          </TabsList>

          {/* Add to Existing Publication */}
          <TabsContent value="existing" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Publication selector */}
              <div className="space-y-2">
                <Label>Select Publication</Label>
                <Select
                  value={selectedExistingPubId}
                  onValueChange={(value) => {
                    setSelectedExistingPubId(value);
                    loadExistingPublicationInventory(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a publication..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPublications && existingPublications.length > 0 ? (
                      [...existingPublications]
                        .sort((a, b) => (a.publicationName || '').localeCompare(b.publicationName || ''))
                        .map((pub) => (
                          <SelectItem key={pub.publicationId} value={String(pub.publicationId)}>
                            {pub.publicationName}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No publications with orders in this campaign
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Inventory list */}
              {selectedExistingPubId && (
                <div className="flex-1 flex flex-col min-h-0">
                  <Label className="mb-2">Available Placements</Label>
                  {existingPubLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : existingPubInventory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No additional placements available for this publication.
                    </div>
                  ) : (
                    <ScrollArea className="h-[380px] border rounded-md">
                      <div className="p-2 space-y-2">
                        {existingPubInventory.map((item, index) => (
                          <div
                            key={item.itemPath}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-md border transition-colors',
                              item.selected
                                ? 'bg-primary/5 border-primary'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              checked={item.selected || false}
                              onCheckedChange={() => toggleItemSelection(item.itemPath, true)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <LineItemEditor
                                item={item}
                                publicationId={parseInt(selectedExistingPubId)}
                                itemIndex={index}
                                onFrequencyChange={handleExistingFrequencyChange}
                                compact={true}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedExistingItems.length > 0 && (
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedExistingItems.length} placement(s) selected
                  </div>
                  <div className="font-semibold">
                    Total: ${existingTotal.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Add New Publication */}
          <TabsContent value="new" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Search and selector */}
              <div className="space-y-2">
                <Label>Select Publication</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search publications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select
                  value={selectedNewPubId}
                  onValueChange={(value) => {
                    setSelectedNewPubId(value);
                    loadNewPublicationInventory(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a publication to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredNewPublications.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No publications available
                      </div>
                    ) : (
                      filteredNewPublications.map((pub) => (
                        <SelectItem key={pub.id} value={String(pub.id)}>
                          {pub.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Inventory list */}
              {selectedNewPubId && (
                <div className="flex-1 flex flex-col min-h-0">
                  <Label className="mb-2">Select Placements</Label>
                  {newPubLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : newPubInventory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No advertising placements available for this publication.
                    </div>
                  ) : (
                    <ScrollArea className="h-[340px] border rounded-md">
                      <div className="p-2 space-y-2">
                        {newPubInventory.map((item, index) => (
                          <div
                            key={item.itemPath}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-md border transition-colors',
                              item.selected
                                ? 'bg-primary/5 border-primary'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              checked={item.selected || false}
                              onCheckedChange={() => toggleItemSelection(item.itemPath, false)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <LineItemEditor
                                item={item}
                                publicationId={parseInt(selectedNewPubId)}
                                itemIndex={index}
                                onFrequencyChange={handleNewFrequencyChange}
                                compact={true}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedNewItems.length > 0 && (
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedNewItems.length} placement(s) selected
                  </div>
                  <div className="font-semibold">
                    Total: ${newTotal.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {activeTab === 'existing' ? (
            <Button
              onClick={handleAddToExisting}
              disabled={submitting || selectedExistingItems.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {selectedExistingItems.length} Placement(s)
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleAddNewPublication}
              disabled={submitting || selectedNewItems.length === 0 || !selectedNewPubId}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Publication with {selectedNewItems.length} Placement(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
