/**
 * Performance Entry Management
 * 
 * Admin interface for viewing, entering, and managing performance entries across all orders.
 * Supports bulk import and direct entry/editing.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PerformanceEntryForm } from '@/components/dashboard/PerformanceEntryForm';
import { PerformanceEntry, METRIC_LABELS, PerformanceChannel } from '@/integrations/mongodb/performanceEntrySchema';

interface PerformanceEntryManagementProps {
  hubId?: string;
}

export function PerformanceEntryManagement({ hubId }: PerformanceEntryManagementProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<PerformanceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PerformanceEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PerformanceEntry | null>(null);
  const [bulkData, setBulkData] = useState('');
  const [importing, setImporting] = useState(false);

  // For adding new entries, we need order context
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    fetchEntries();
    fetchOrders();
  }, [hubId]);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, channelFilter, sourceFilter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({ limit: '500' });
      
      const res = await fetch(`${API_BASE_URL}/performance-entries?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/orders?status=in_production,confirmed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.publicationName.toLowerCase().includes(query) ||
        e.itemName.toLowerCase().includes(query) ||
        e.notes?.toLowerCase().includes(query)
      );
    }
    
    if (channelFilter !== 'all') {
      filtered = filtered.filter(e => e.channel === channelFilter);
    }
    
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(e => e.source === sourceFilter);
    }
    
    setFilteredEntries(filtered);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/performance-entries/${deleteConfirm._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast({ title: 'Entry deleted' });
        fetchEntries();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive',
      });
    }
    
    setDeleteConfirm(null);
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      toast({
        title: 'No data',
        description: 'Please paste CSV data to import',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    
    try {
      // Parse CSV
      const lines = bulkData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const entries: any[] = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const entry: any = {};
        
        headers.forEach((header, idx) => {
          const value = values[idx];
          
          // Map common header variations
          if (['order_id', 'orderid'].includes(header)) entry.orderId = value;
          else if (['campaign_id', 'campaignid'].includes(header)) entry.campaignId = value;
          else if (['publication_id', 'publicationid'].includes(header)) entry.publicationId = parseInt(value);
          else if (['publication_name', 'publicationname', 'publication'].includes(header)) entry.publicationName = value;
          else if (['item_path', 'itempath', 'placement_path'].includes(header)) entry.itemPath = value;
          else if (['item_name', 'itemname', 'placement'].includes(header)) entry.itemName = value;
          else if (header === 'channel') entry.channel = value.toLowerCase();
          else if (header === 'dimensions') entry.dimensions = value;
          else if (['date', 'date_start', 'datestart'].includes(header)) entry.dateStart = value;
          else if (['date_end', 'dateend'].includes(header)) entry.dateEnd = value || undefined;
          else if (header === 'impressions') entry.metrics = { ...entry.metrics, impressions: parseInt(value) || undefined };
          else if (header === 'clicks') entry.metrics = { ...entry.metrics, clicks: parseInt(value) || undefined };
          else if (header === 'reach') entry.metrics = { ...entry.metrics, reach: parseInt(value) || undefined };
          else if (header === 'insertions') entry.metrics = { ...entry.metrics, insertions: parseInt(value) || undefined };
          else if (['spots', 'spots_aired'].includes(header)) entry.metrics = { ...entry.metrics, spotsAired: parseInt(value) || undefined };
          else if (header === 'downloads') entry.metrics = { ...entry.metrics, downloads: parseInt(value) || undefined };
          else if (header === 'posts') entry.metrics = { ...entry.metrics, posts: parseInt(value) || undefined };
          else if (header === 'notes') entry.notes = value;
        });
        
        if (!entry.metrics) entry.metrics = {};
        
        entries.push(entry);
      }

      if (entries.length === 0) {
        throw new Error('No valid entries found in CSV');
      }

      // Send to API
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/performance-entries/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries }),
      });

      const result = await res.json();
      
      if (res.ok) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${result.inserted} entries`,
        });
        setBulkData('');
        setShowBulkImport(false);
        fetchEntries();
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import entries',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'order_id',
      'campaign_id',
      'publication_id',
      'publication_name',
      'item_path',
      'item_name',
      'channel',
      'dimensions',
      'date_start',
      'date_end',
      'impressions',
      'clicks',
      'reach',
      'insertions',
      'spots',
      'downloads',
      'posts',
      'notes'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      '# Example row below - remove this line\n' +
      'order123,campaign456,1234,Example Publication,distributionChannels.print[0].advertisingOpportunities[0],Full Page Ad,print,8.5x11,2024-01-15,,,,500,1,,,,Ran in January issue';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'performance_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Entry Management</h2>
          <p className="text-muted-foreground">
            View and manage performance data across all orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowAddEntry(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by publication, placement, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="print">Print</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-muted-foreground">
              {filteredEntries.length} of {entries.length} entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Entered</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    No entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry._id?.toString()}>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(entry.dateStart), 'MMM d, yyyy')}
                        {entry.dateEnd && (
                          <> - {format(new Date(entry.dateEnd), 'MMM d')}</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate font-medium" title={entry.publicationName}>
                        {entry.publicationName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={entry.itemName}>
                        {entry.itemName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {entry.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.metrics.impressions?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.metrics.clicks?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(entry.metrics.insertions || 
                        entry.metrics.spotsAired || 
                        entry.metrics.posts || 
                        entry.metrics.downloads)?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.source === 'manual' ? 'secondary' : 'outline'}>
                        {entry.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(entry.enteredAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEntry(entry)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(entry)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Performance Data</DialogTitle>
            <DialogDescription>
              Paste CSV data or upload a file to import multiple entries at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>CSV Data</Label>
              <Textarea
                placeholder="Paste CSV data here (with headers)..."
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Required columns:</p>
              <p className="text-muted-foreground">
                order_id, campaign_id, publication_id, publication_name, item_path, item_name, channel, date_start
              </p>
              <p className="font-medium mt-3 mb-2">Optional columns:</p>
              <p className="text-muted-foreground">
                dimensions, date_end, impressions, clicks, reach, insertions, spots, downloads, posts, notes
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkImport(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={importing}>
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Performance Entry</DialogTitle>
          </DialogHeader>
          
          {selectedOrder ? (
            <PerformanceEntryForm
              orderId={selectedOrder._id}
              campaignId={selectedOrder.campaignId}
              publicationId={selectedOrder.publicationId}
              publicationName={selectedOrder.publicationName}
              placements={selectedOrder.placements || []}
              onSuccess={() => {
                setShowAddEntry(false);
                setSelectedOrder(null);
                fetchEntries();
              }}
              onCancel={() => {
                setSelectedOrder(null);
              }}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select an order to add performance data:
              </p>
              
              <Select onValueChange={(value) => {
                const order = orders.find(o => o._id === value);
                setSelectedOrder(order);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order._id} value={order._id}>
                      <div className="flex items-center gap-2">
                        <span>{order.publicationName}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">{order.campaignName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Performance Entry</DialogTitle>
            </DialogHeader>
            <PerformanceEntryForm
              orderId={editingEntry.orderId}
              campaignId={editingEntry.campaignId}
              publicationId={editingEntry.publicationId}
              publicationName={editingEntry.publicationName}
              placements={[{
                itemPath: editingEntry.itemPath,
                itemName: editingEntry.itemName,
                channel: editingEntry.channel,
                dimensions: editingEntry.dimensions,
              }]}
              existingEntry={editingEntry}
              onSuccess={() => {
                setEditingEntry(null);
                fetchEntries();
              }}
              onCancel={() => setEditingEntry(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this performance entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PerformanceEntryManagement;
