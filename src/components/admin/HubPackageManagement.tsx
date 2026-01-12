import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, 
  Edit,
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package,
  Search,
  Copy,
  Download,
  ChevronLeft,
  FileText,
  FileSpreadsheet,
  Activity,
  RefreshCw,
  CheckCircle,
  Clock,
  FileCheck,
  Archive,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useHubContext } from '@/contexts/HubContext';
import { HealthBadge } from '@/components/ui/health-badge';
import { PackageHealthModal } from './PackageHealthModal';
import { API_BASE_URL } from '@/config/api';
import { PackageBuilder } from './PackageBuilder/PackageBuilder';
import { PackageResults } from './PackageBuilder/PackageResults';
import { ErrorBoundary } from './PackageBuilder/ErrorBoundary';
import { BuilderFilters, BuilderResult, packageBuilderService } from '@/services/packageBuilderService';
import { downloadPackageCSV, downloadPackageInsertionOrder } from '@/utils/packageExport';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { packagesApi } from '@/api/packages';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

type ViewState = 'list' | 'builder' | 'results';

export const HubPackageManagement = () => {
  const navigate = useNavigate();
  const { selectedHubId: contextHubId } = useHubContext();
  const [packages, setPackages] = useState<HubPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [generatingIO, setGeneratingIO] = useState<string | null>(null);
  const { toast } = useToast();

  // Builder state
  const [viewState, setViewState] = useState<ViewState>('list');
  const [builderResult, setBuilderResult] = useState<BuilderResult | null>(null);
  const [builderFilters, setBuilderFilters] = useState<BuilderFilters | null>(null);
  const [editingPackage, setEditingPackage] = useState<HubPackage | null>(null);
  
  // Health modal state
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [selectedPackageForHealth, setSelectedPackageForHealth] = useState<HubPackage | null>(null);
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Store hubId locally to preserve it across component states and context changes
  const [localHubId, setLocalHubId] = useState<string | null>(null);
  
  // Use local hub ID if available, otherwise fall back to context
  const selectedHubId = localHubId || contextHubId;
  
  // Sync local hub ID with context when context changes
  useEffect(() => {
    if (contextHubId) {
      setLocalHubId(contextHubId);
    }
  }, [contextHubId]);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus === 'active') params.append('isActive', 'true');
      if (filterStatus === 'draft') params.append('approvalStatus', 'draft');
      if (filterStatus === 'archived') params.append('approvalStatus', 'archived');
      if (selectedHubId) params.append('hubId', selectedHubId);

      const response = await fetch(`${API_BASE_URL}/hub-packages?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch packages');

      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch packages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, selectedHubId, toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Open delete confirmation dialog
  const confirmDelete = (id: string, packageName: string) => {
    setPackageToDelete({ id, name: packageName });
    setDeleteDialogOpen(true);
  };

  // Actually perform the deletion
  const handleDelete = async () => {
    if (!packageToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/hub-packages/${packageToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete package');

      toast({
        title: 'Package Deleted',
        description: `"${packageToDelete.name}" has been deleted successfully`
      });
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete package',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    }
  };

  const handleViewHealth = (pkg: HubPackage) => {
    setSelectedPackageForHealth(pkg);
    setHealthModalOpen(true);
  };

  const handleGenerateInsertionOrder = async (pkg: HubPackage, format: 'html' | 'markdown' = 'html') => {
    const packageId = pkg._id?.toString();
    
    if (!packageId) {
      toast({
        title: 'Error',
        description: 'Package ID not found',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingIO(packageId);
    
    try {
      const result = await packagesApi.generateInsertionOrder(packageId, format);
      
      // Download the generated insertion order
      downloadPackageInsertionOrder(
        result.insertionOrder.content,
        format,
        pkg.basicInfo.name
      );

      toast({
        title: 'Success',
        description: `Insertion order generated and downloaded in ${format.toUpperCase()} format`,
      });
    } catch (error) {
      console.error('Error generating insertion order:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate insertion order',
        variant: 'destructive'
      });
    } finally {
      setGeneratingIO(null);
    }
  };

  // Builder handlers
  const handleAnalyze = async (filters: BuilderFilters) => {
    if (!selectedHubId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/builder/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...filters,
          hubId: selectedHubId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze inventory');
      }

      const result: BuilderResult = await response.json();
      setBuilderResult(result);
      setBuilderFilters(filters);
      setViewState('results');
    } catch (error) {
      console.error('Error analyzing inventory:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to analyze inventory',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (packageName: string, approvalStatus: 'draft' | 'pending_review' | 'approved' | 'archived' = 'draft') => {
    if (!builderResult || !builderFilters || !selectedHubId) {
      console.error('Missing required data:', { builderResult: !!builderResult, builderFilters: !!builderFilters, selectedHubId });
      toast({
        title: 'Error',
        description: 'Missing required data to save package',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Saving package:', { packageName, approvalStatus, isEditing: !!(editingPackage && editingPackage._id) });
      
      // If editing, update existing package
      if (editingPackage && editingPackage._id) {
        console.log('Updating existing package:', editingPackage._id);
        
        // Build update data with proper nesting to preserve all fields
        const updateData = {
          basicInfo: {
            ...editingPackage.basicInfo,
            name: packageName
          },
          components: {
            publications: builderResult.publications
          },
          pricing: {
            ...editingPackage.pricing,
            breakdown: {
              totalStandardPrice: builderResult.summary.monthlyCost,
              totalHubPrice: builderResult.summary.monthlyCost,
              packageDiscount: 0,
              finalPrice: builderResult.summary.monthlyCost
            },
            displayPrice: `$${builderResult.summary.monthlyCost.toLocaleString()}/month`
          },
          metadata: {
            ...editingPackage.metadata,
            approvalStatus,
            builderInfo: {
              ...editingPackage.metadata?.builderInfo,
              lastBuilderEdit: new Date().toISOString()
            }
          }
        };

        console.log('Updating package:', editingPackage._id);

        const response = await fetch(`${API_BASE_URL}/admin/hub-packages/${editingPackage._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('Update failed with status:', response.status, 'Error:', errorData);
          throw new Error(errorData.error || errorData.message || 'Failed to update package');
        }

        const result = await response.json();
        console.log('Update successful:', { packageId: result.package?._id });

        toast({
          title: 'Success!',
          description: 'Package updated successfully'
        });

        // Return to list and refresh
        setViewState('list');
        setBuilderResult(null);
        setBuilderFilters(null);
        setEditingPackage(null);
        fetchPackages();
        return;
      }

      // Build package data structure for new package
      const packageData = {
        packageId: `package-${Date.now()}`,
        basicInfo: {
          name: packageName,
          tagline: `Custom ${builderFilters.mode} package`,
          description: `Created via Package Builder with ${builderResult.summary.totalOutlets} outlets`,
          category: 'custom' as const
        },
        hubInfo: {
          hubId: selectedHubId,
          hubName: 'Chicago Hub',
          isHubExclusive: true
        },
        targeting: {
          geographicTarget: {
            dmas: ['chicago-il'],
            neighborhoods: builderFilters.geography || []
          }
        },
        components: {
          publications: builderResult.publications
        },
        pricing: {
          currency: 'USD',
          breakdown: {
            totalStandardPrice: builderResult.summary.monthlyCost,
            totalHubPrice: builderResult.summary.monthlyCost,
            packageDiscount: 0,
            finalPrice: builderResult.summary.monthlyCost
          },
          displayPrice: `$${builderResult.summary.monthlyCost.toLocaleString()}/month`,
          priceRange: builderResult.summary.monthlyCost < 5000 ? 'under-5k' :
                      builderResult.summary.monthlyCost < 15000 ? '5-15k' :
                      builderResult.summary.monthlyCost < 50000 ? '15-50k' : '50k-plus' as const
        },
        performance: {
          estimatedReach: {
            minReach: builderResult.summary.estimatedUniqueReach || 0,
            maxReach: builderResult.summary.estimatedUniqueReach || 0,
            reachDescription: `${(builderResult.summary.estimatedUniqueReach || 0).toLocaleString()}+ estimated unique reach`,
            deduplicatedReach: builderResult.summary.estimatedUniqueReach
          },
          estimatedImpressions: {
            minImpressions: builderResult.summary.totalMonthlyImpressions || 0,
            maxImpressions: builderResult.summary.totalMonthlyImpressions || 0,
            impressionsByChannel: builderResult.summary.channelAudiences
          },
          costPerThousand: builderResult.summary.totalMonthlyImpressions > 0
            ? (builderResult.summary.monthlyCost / (builderResult.summary.totalMonthlyImpressions / 1000))
            : 0
        },
        features: {
          keyBenefits: [],
          includedServices: []
        },
        campaignDetails: {
          leadTime: '10 business days',
          materialDeadline: '5 business days before start',
          cancellationPolicy: 'Standard cancellation policy applies'
        },
        creativeRequirements: {
          assetsNeeded: []
        },
        useCases: {
          idealFor: []
        },
        availability: {
          isActive: true,
          isFeatured: false,
          inventoryStatus: 'available' as const
        },
        marketing: {
          tags: builderFilters.channels || [],
          displayOrder: 0
        },
        analytics: {
          viewCount: 0,
          inquiryCount: 0,
          purchaseCount: 0,
          lastModified: new Date()
        },
        metadata: {
          createdBy: 'current-user',
          approvalStatus: approvalStatus,
          version: 1,
          builderInfo: {
            creationMethod: 'builder' as const,
            buildMode: builderFilters.mode,
            originalBudget: builderFilters.budget,
            originalDuration: builderFilters.duration,
            filtersUsed: {
              geography: builderFilters.geography,
              channels: builderFilters.channels,
              publications: builderFilters.publications
            },
            frequencyStrategy: builderFilters.frequencyStrategy
          }
        }
      };

      console.log('Creating new package with data:', { 
        name: packageData.basicInfo.name, 
        publicationsCount: packageData.components.publications.length 
      });
      
      const response = await fetch(`${API_BASE_URL}/admin/builder/save-package`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(packageData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Create failed:', errorData);
        throw new Error(errorData.message || 'Failed to save package');
      }

      toast({
        title: 'Success!',
        description: 'Package saved successfully'
      });

      // Return to list and refresh
      setViewState('list');
      setBuilderResult(null);
      setBuilderFilters(null);
      setEditingPackage(null);
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save package';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!builderResult) return;

    try {
      // Prepare CSV data with all package details
      const rows: string[][] = [];
      
      // Header row
      rows.push([
        'Package Name',
        'Publication',
        'Publication ID',
        'Channel',
        'Source Name',
        'Item Name',
        'Item Path',
        'Pricing Model',
        'Unit Price',
        'Frequency',
        'Monthly Cost',
        'Specifications',
        'Duration (months)',
        'Total Cost'
      ]);

      const packageName = editingPackage?.basicInfo?.name || 'New Package';
      const duration = builderResult.summary?.duration || 1;

      // Add data rows for each inventory item
      builderResult.publications.forEach(pub => {
        if (!pub.inventoryItems) return;

        pub.inventoryItems.forEach(item => {
          // Skip excluded items
          if (item.isExcluded) return;
          
          const frequency = item.currentFrequency || item.quantity || 1;
          const monthlyCost = calculateItemCost(item, frequency);
          const totalCost = monthlyCost * duration;
          
          // Format specifications
          const specs = item.format 
            ? Object.entries(item.format)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ')
            : '';

          rows.push([
            packageName,
            pub.publicationName || '',
            pub.publicationId?.toString() || '',
            item.channel || '',
            (item as any).sourceName || '',
            item.itemName || '',
            item.itemPath || '',
            item.itemPricing?.pricingModel || '',
            item.itemPricing?.hubPrice?.toString() || '0',
            frequency.toString(),
            monthlyCost.toFixed(2),
            specs,
            duration.toString(),
            totalCost.toFixed(2)
          ]);
        });
      });

      // Convert to CSV string
      const csvContent = rows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escaped = cell.replace(/"/g, '""');
          return /[",\n]/.test(cell) ? `"${escaped}"` : escaped;
        }).join(',')
      ).join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${packageName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Package exported with ${rows.length - 1} items`
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the package',
        variant: 'destructive'
      });
    }
  };

  const handleExportAllInventory = async () => {
    if (!selectedHubId) {
      toast({
        title: 'No Hub Selected',
        description: 'Please select a hub to export inventory',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      toast({
        title: 'Exporting...',
        description: 'Fetching all publications and inventory data'
      });

      // Fetch all publications for the hub - use all channels
      const allChannels = ['newsletter', 'print', 'website', 'social', 'podcast', 'radio', 'streaming', 'events'];
      const publications = await packageBuilderService.fetchPublicationsForBuilder(
        selectedHubId,
        allChannels
      );

      // Extract all inventory from all publications
      const allInventory: any[] = [];
      for (const pub of publications) {
        const items = packageBuilderService.extractInventoryFromPublication(pub, allChannels, 'standard');
        items.forEach(item => {
          allInventory.push({
            publicationName: pub.basicInfo.publicationName,
            publicationId: pub.publicationId,
            ...item
          });
        });
      }

      // Prepare CSV data
      const rows: string[][] = [];
      
      // Header row - similar to package export format
      rows.push([
        'Publication',
        'Publication ID',
        'Channel',
        'Source Name',
        'Item Name',
        'Item Path',
        'Pricing Model',
        'Unit Price',
        'Standard Frequency',
        'Monthly Cost (Standard)',
        'Max Frequency',
        'Audience Metric',
        'Audience Value',
        'Estimated Monthly Impressions',
        'Specifications'
      ]);

      // Add data rows for each inventory item
      allInventory.forEach(item => {
        const frequency = item.currentFrequency || item.quantity || 1;
        const unitPrice = item.itemPricing?.hubPrice || 0;
        const monthlyCost = unitPrice * frequency;
        
        // Format specifications
        const specs = item.format 
          ? Object.entries(item.format)
              .filter(([_, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join('; ')
          : '';

        // Extract audience metrics based on channel
        let audienceMetric = '';
        let audienceValue = '';
        let estimatedImpressions = '';
        
        if (item.audienceMetrics) {
          const metrics = item.audienceMetrics;
          const channel = item.channel?.toLowerCase() || '';
          
          // Determine primary metric and value based on channel
          if (channel === 'website') {
            if (metrics.monthlyVisitors) {
              audienceMetric = 'Monthly Visitors';
              audienceValue = metrics.monthlyVisitors.toLocaleString();
              estimatedImpressions = metrics.monthlyImpressions?.toLocaleString() || metrics.monthlyVisitors.toLocaleString();
            } else if (metrics.monthlyImpressions) {
              audienceMetric = 'Monthly Impressions';
              audienceValue = metrics.monthlyImpressions.toLocaleString();
              estimatedImpressions = metrics.monthlyImpressions.toLocaleString();
            }
          } else if (channel === 'newsletter') {
            if (metrics.subscribers) {
              audienceMetric = 'Subscribers';
              audienceValue = metrics.subscribers.toLocaleString();
              // Estimate impressions as subscribers * frequency * open rate (assume 25%)
              estimatedImpressions = Math.round(metrics.subscribers * frequency * 0.25).toLocaleString();
            }
          } else if (channel === 'print') {
            if (metrics.circulation) {
              audienceMetric = 'Circulation';
              audienceValue = metrics.circulation.toLocaleString();
              estimatedImpressions = (metrics.circulation * frequency).toLocaleString();
            }
          } else if (channel === 'social') {
            if (metrics.followers) {
              audienceMetric = 'Followers';
              audienceValue = metrics.followers.toLocaleString();
              // Estimate impressions as followers * frequency * 10% reach
              estimatedImpressions = Math.round(metrics.followers * frequency * 0.1).toLocaleString();
            }
          } else if (channel === 'podcast') {
            if (metrics.averageListeners) {
              audienceMetric = 'Avg Listeners';
              audienceValue = metrics.averageListeners.toLocaleString();
              estimatedImpressions = (metrics.averageListeners * frequency).toLocaleString();
            } else if (metrics.subscribers) {
              audienceMetric = 'Subscribers';
              audienceValue = metrics.subscribers.toLocaleString();
              estimatedImpressions = (metrics.subscribers * frequency).toLocaleString();
            }
          } else if (channel === 'radio') {
            if (metrics.listeners || metrics.averageListeners) {
              audienceMetric = 'Listeners';
              const listenerCount = metrics.listeners || metrics.averageListeners;
              audienceValue = listenerCount.toLocaleString();
              estimatedImpressions = (listenerCount * frequency).toLocaleString();
            }
          } else if (channel === 'streaming') {
            if (metrics.averageViews) {
              audienceMetric = 'Avg Views';
              audienceValue = metrics.averageViews.toLocaleString();
              estimatedImpressions = (metrics.averageViews * frequency).toLocaleString();
            } else if (metrics.subscribers) {
              audienceMetric = 'Subscribers';
              audienceValue = metrics.subscribers.toLocaleString();
              estimatedImpressions = (metrics.subscribers * frequency).toLocaleString();
            }
          } else if (channel === 'events') {
            if (metrics.averageAttendance) {
              audienceMetric = 'Avg Attendance';
              audienceValue = metrics.averageAttendance.toLocaleString();
              estimatedImpressions = (metrics.averageAttendance * frequency).toLocaleString();
            } else if (metrics.expectedAttendees) {
              audienceMetric = 'Expected Attendees';
              audienceValue = metrics.expectedAttendees.toLocaleString();
              estimatedImpressions = (metrics.expectedAttendees * frequency).toLocaleString();
            }
          }
        }

        rows.push([
          item.publicationName || '',
          item.publicationId?.toString() || '',
          item.channel || '',
          item.sourceName || '',
          item.itemName || '',
          item.itemPath || '',
          item.itemPricing?.pricingModel || '',
          unitPrice.toFixed(2),
          frequency.toString(),
          monthlyCost.toFixed(2),
          item.maxFrequency?.toString() || '',
          audienceMetric,
          audienceValue,
          estimatedImpressions,
          specs
        ]);
      });

      // Convert to CSV string
      const csvContent = rows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escaped = cell.replace(/"/g, '""');
          return /[",\n]/.test(cell) ? `"${escaped}"` : escaped;
        }).join(',')
      ).join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `full_inventory_export_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${allInventory.length} items from ${publications.length} publications`
      });
    } catch (error) {
      console.error('Error exporting full inventory:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the full inventory',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (pkg: HubPackage) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/builder/packages/${pkg._id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to duplicate package');

      toast({
        title: 'Success',
        description: 'Package duplicated successfully'
      });
      fetchPackages();
    } catch (error) {
      console.error('Error duplicating package:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate package',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle quick approval status change from package card
  const handleApprovalStatusChange = async (pkg: HubPackage, newStatus: 'draft' | 'pending_review' | 'approved' | 'archived') => {
    if (!pkg._id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/hub-packages/${pkg._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          metadata: {
            ...pkg.metadata,
            approvalStatus: newStatus
          }
        })
      });

      if (!response.ok) throw new Error('Failed to update approval status');

      toast({
        title: 'Status Updated',
        description: `Package status changed to ${newStatus.replace('_', ' ')}`
      });
      fetchPackages();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update approval status',
        variant: 'destructive'
      });
    }
  };

  // Get approval status display info
  const getApprovalStatusInfo = (status?: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' };
      case 'pending_review':
        return { label: 'Pending', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' };
      case 'draft':
        return { label: 'Draft', icon: FileCheck, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' };
      case 'archived':
        return { label: 'Archived', icon: Archive, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' };
      default:
        return { label: 'No Status', icon: FileCheck, color: 'text-gray-400', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  const handleEdit = (pkg: HubPackage) => {
    try {
      // Ensure publications data exists
      if (!pkg.components?.publications || pkg.components.publications.length === 0) {
        toast({
          title: 'Error',
          description: 'This package has no publications to edit.',
          variant: 'destructive'
        });
        return;
      }

      // Check if inventory items are missing sourceName - if so, we need to rebuild
      // This handles packages saved before the sourceName feature was added
      // Only check channels where sourceName is expected (newsletter, radio, podcast, etc.)
      const channelsThatNeedSourceName = ['newsletter', 'radio', 'podcast', 'streaming'];
      const needsRebuild = pkg.components.publications.some(pub => 
        pub.inventoryItems?.some(item => 
          channelsThatNeedSourceName.includes(item.channel) && !item.sourceName
        )
      );

      const filters: BuilderFilters = {
        mode: pkg.metadata?.builderInfo?.buildMode || 'specification-first',
        budget: pkg.metadata?.builderInfo?.originalBudget,
        duration: pkg.metadata?.builderInfo?.originalDuration || 6,
        geography: pkg.metadata?.builderInfo?.filtersUsed?.geography,
        channels: pkg.metadata?.builderInfo?.filtersUsed?.channels || ['website', 'newsletter', 'print'],
        publications: pkg.metadata?.builderInfo?.filtersUsed?.publications,
        frequencyStrategy: pkg.metadata?.builderInfo?.frequencyStrategy || 'standard'
      };

      // If sourceName is missing, rebuild the package to populate it
      if (needsRebuild) {
        setEditingPackage(pkg);
        setBuilderFilters(filters);
        // Trigger rebuild by calling handleAnalyze with the same filters
        setLoading(true);
        handleAnalyze(filters);
        return;
      }

      // Otherwise, use the existing package data
      const result: BuilderResult = {
        publications: pkg.components.publications,
        summary: {
          totalOutlets: pkg.components.publications.length,
          totalChannels: new Set(
            pkg.components.publications.flatMap(p => 
              p.inventoryItems?.filter(i => !i.isExcluded).map(i => i.channel) || []
            )
          ).size,
          totalUnits: pkg.components.publications.reduce(
            (sum, p) => sum + (p.inventoryItems?.filter(i => !i.isExcluded).reduce((s, i) => s + (i.currentFrequency || i.quantity || 1), 0) || 0),
            0
          ),
          monthlyCost: pkg.pricing?.breakdown?.finalPrice || 0,
          totalCost: (pkg.pricing?.breakdown?.finalPrice || 0) * (pkg.metadata?.builderInfo?.originalDuration || 6)
        }
      };

      setEditingPackage(pkg);
      setBuilderResult(result);
      setBuilderFilters(filters);
      setViewState('results');
    } catch (error) {
      console.error('Error editing package:', error);
      toast({
        title: 'Error',
        description: 'Failed to load package for editing. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const filteredPackages = packages.filter(pkg => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pkg.basicInfo.name.toLowerCase().includes(query) ||
      pkg.basicInfo.tagline.toLowerCase().includes(query) ||
      pkg.marketing.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Calculate stats (recalculate prices to account for excluded items)
  const stats = {
    total: packages.length,
    active: packages.filter(p => p.availability.isActive).length,
    featured: packages.filter(p => p.availability.isFeatured).length,
    totalViews: packages.reduce((sum, p) => sum + p.analytics.viewCount, 0),
    totalInquiries: packages.reduce((sum, p) => sum + p.analytics.inquiryCount, 0),
    avgPrice: packages.length > 0 
      ? Math.round(packages.reduce((sum, p) => {
          // Recalculate each package's price excluding excluded items
          const actualPrice = p.components.publications.reduce((pubSum, pub) => {
            if (!pub.inventoryItems) return pubSum;
            return pubSum + pub.inventoryItems
              .filter(item => !item.isExcluded)
              .reduce((itemSum, item) => 
                itemSum + calculateItemCost(item, item.currentFrequency || item.quantity || 1), 0
              );
          }, 0);
          return sum + actualPrice;
        }, 0) / packages.length)
      : 0
  };

  // Render based on view state
  if (viewState === 'builder') {
    return (
      <ErrorBoundary>
        <PackageBuilder onAnalyze={handleAnalyze} loading={loading} onBack={() => setViewState('list')} />
      </ErrorBoundary>
    );
  }

  if (viewState === 'results' && builderResult && builderFilters) {
    return (
      <PackageResults
        result={builderResult}
        budget={builderFilters.budget}
        duration={builderFilters.duration}
        initialPackageName={editingPackage?.basicInfo.name}
        initialApprovalStatus={editingPackage?.metadata?.approvalStatus || 'draft'}
        isEditingExistingPackage={!!editingPackage?._id}
        onDelete={editingPackage?._id ? async () => {
          const response = await fetch(`${API_BASE_URL}/admin/hub-packages/${editingPackage._id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete package');
          // Return to list and refresh
          setViewState('list');
          setBuilderResult(null);
          setBuilderFilters(null);
          setEditingPackage(null);
          fetchPackages();
        } : undefined}
        onBack={() => {
          if (editingPackage) {
            // If editing, go back to list
            setViewState('list');
            setEditingPackage(null);
            setBuilderResult(null);
            setBuilderFilters(null);
          } else {
            // If creating new, go back to builder
            setViewState('builder');
          }
        }}
        onSave={handleSave}
        onExportCSV={handleExportCSV}
        onRefresh={async () => {
          // Smart refresh: preserve customizations, update data, and auto-save
          setLoading(true);
          try {
            // Use current package publications if editing, otherwise use builder result
            const publicationsToRefresh = editingPackage?.components?.publications || builderResult.publications;
            
            const response = await fetch(`${API_BASE_URL}/admin/builder/refresh`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                hubId: selectedHubId,
                currentPublications: publicationsToRefresh,
                filters: builderFilters
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to refresh package');
            }

            const result: BuilderResult = await response.json();
            setBuilderResult(result);
            
            // Auto-save the refreshed package if editing
            console.log('🔄 Auto-save check:', { 
              hasEditingPackage: !!editingPackage, 
              hasId: !!editingPackage?._id,
              id: editingPackage?._id 
            });
            if (editingPackage && editingPackage._id) {
              const updateData = {
                components: {
                  publications: result.publications
                },
                pricing: {
                  ...editingPackage.pricing,
                  breakdown: {
                    totalStandardPrice: result.summary.monthlyCost,
                    totalHubPrice: result.summary.monthlyCost,
                    packageDiscount: 0,
                    finalPrice: result.summary.monthlyCost
                  },
                  displayPrice: `$${result.summary.monthlyCost.toLocaleString()}/month`
                },
                metadata: {
                  ...editingPackage.metadata,
                  builderInfo: {
                    ...editingPackage.metadata?.builderInfo,
                    lastRefreshed: new Date().toISOString()
                  }
                }
              };

              const updateResponse = await fetch(`${API_BASE_URL}/admin/hub-packages/${editingPackage._id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData)
              });

              if (!updateResponse.ok) {
                const errorData = await updateResponse.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.error || errorData.message || 'Failed to save refreshed package');
              }

              toast({
                title: 'Success!',
                description: 'Package refreshed and saved successfully'
              });
            } else {
              toast({
                title: 'Success!',
                description: 'Package refreshed (remember to save when ready)'
              });
            }
          } catch (error) {
            console.error('Error refreshing package:', error);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to refresh package',
              variant: 'destructive'
            });
            throw error; // Re-throw so PackageResults can handle it
          } finally {
            setLoading(false);
          }
        }}
        onFindNewPublications={async (currentPublicationIds) => {
          // Find new publications in the hub that aren't in the current package
          // currentPublicationIds is passed from PackageResults with the CURRENT state
          
          const response = await fetch(`${API_BASE_URL}/admin/builder/new-publications`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              hubId: selectedHubId,
              currentPublicationIds,
              filters: builderFilters
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to find new publications');
          }

          return await response.json();
        }}
        onUpdatePublications={(publications) => {
          // Recalculate all summary stats
          const monthlyCost = publications.reduce((sum, pub) => sum + (pub.publicationTotal || 0), 0);
          const totalCost = monthlyCost * (builderResult.summary?.duration || 1);
          
          // Count unique channels
          const uniqueChannels = new Set<string>();
          let totalUnits = 0;
          
          publications.forEach(pub => {
            pub.inventoryItems?.forEach(item => {
              uniqueChannels.add(item.channel);
              totalUnits += item.currentFrequency || item.quantity || 1;
            });
          });
          
          const newResult = {
            ...builderResult,
            publications,
            summary: {
              ...builderResult.summary,
              totalOutlets: publications.length,
              totalChannels: uniqueChannels.size,
              totalUnits,
              monthlyCost,
              totalCost
            }
          };
          
          setBuilderResult(newResult);
        }}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold font-sans">
          Packages
        </h1>
        <div className="flex gap-2">
          <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
          <Button 
            variant="outline" 
            onClick={handleExportAllInventory}
            disabled={loading || !selectedHubId}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export All Inventory
          </Button>
          <Button onClick={() => setViewState('builder')}>
            <Plus className="mr-2 h-4 w-4" />
            New Package
          </Button>
        </div>
      </div>

      {/* Stats Cards - Only show if there are packages */}
      {packages.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Saved Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Avg Monthly Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.avgPrice.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />
        </>
      )}

      {/* Filters and Search */}
      <div className="flex justify-between items-center">
        {/* Search - Left aligned */}
        <div className={`relative transition-all duration-300 ${isSearchFocused ? 'w-96' : 'w-10 h-10'}`}>
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
          />
          <Input
            placeholder={isSearchFocused ? "Search packages..." : ""}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={`bg-white transition-all duration-300 ${
              isSearchFocused ? 'pl-10 pr-4 h-10 py-2' : 'p-0 cursor-pointer w-10 h-10'
            }`}
          />
        </div>
        
        {/* Filters - Right aligned */}
        <div className="flex gap-2">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'all' 
                ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                : 'border border-transparent'
            }`}
            style={filterStatus !== 'all' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'active' 
                ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                : 'border border-transparent'
            }`}
            style={filterStatus !== 'active' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'draft' 
                ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                : 'border border-transparent'
            }`}
            style={filterStatus !== 'draft' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
            onClick={() => setFilterStatus('draft')}
          >
            Drafts
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'archived' 
                ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                : 'border border-transparent'
            }`}
            style={filterStatus !== 'archived' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
            onClick={() => setFilterStatus('archived')}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Packages List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No packages found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Create your first package to get started'}
            </p>
            <Button onClick={() => setViewState('builder')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => {
            // Recalculate actual monthly cost from items (excluding excluded items)
            const actualMonthlyCost = pkg.components.publications.reduce((sum, pub) => {
              if (!pub.inventoryItems) return sum;
              return sum + pub.inventoryItems
                .filter(item => !item.isExcluded) // Exclude items marked as excluded
                .reduce((pubSum, item) => {
                  return pubSum + calculateItemCost(item, item.currentFrequency || item.quantity || 1);
                }, 0);
            }, 0);
            
            return (
            <Card 
              key={pkg._id?.toString()} 
              className="group hover:shadow-lg transition-all cursor-pointer relative"
              onClick={() => handleEdit(pkg)}
            >
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{pkg.basicInfo.name}</CardTitle>
                        {pkg.healthCheck?.overallHealth && (
                          <div className="flex items-center gap-2">
                            <HealthBadge status={pkg.healthCheck.overallHealth} size="sm" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewHealth(pkg);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(pkg);
                        }}
                        title="Edit package"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(pkg);
                        }}
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(pkg._id?.toString() || '', pkg.basicInfo.name);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{pkg.basicInfo.tagline}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Package Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly Cost</p>
                      <p className="font-semibold">${Math.round(actualMonthlyCost).toLocaleString()}/month</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outlets</p>
                      <p className="font-semibold">{pkg.components.publications.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-semibold">
                        {pkg.metadata?.builderInfo?.originalDuration || 6} months
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Items</p>
                      <p className="font-semibold">
                        {pkg.components.publications.reduce((sum, p) => 
                          sum + p.inventoryItems.filter(item => !item.isExcluded).length, 0
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status Badges - Bottom */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      {/* Active/Inactive Badge */}
                      {pkg.availability.isActive ? (
                        <Badge className="text-xs bg-green-50 text-green-600 border border-green-300">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                      
                      {/* Approval Status with Dropdown */}
                      {(() => {
                        const statusInfo = getApprovalStatusInfo(pkg.metadata?.approvalStatus);
                        const StatusIcon = statusInfo.icon;
                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Badge 
                                className={`text-xs cursor-pointer hover:opacity-80 ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem 
                                onClick={() => handleApprovalStatusChange(pkg, 'draft')}
                                className={pkg.metadata?.approvalStatus === 'draft' ? 'bg-blue-50' : ''}
                              >
                                <FileCheck className="h-4 w-4 mr-2 text-blue-600" />
                                Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleApprovalStatusChange(pkg, 'pending_review')}
                                className={pkg.metadata?.approvalStatus === 'pending_review' ? 'bg-amber-50' : ''}
                              >
                                <Clock className="h-4 w-4 mr-2 text-amber-600" />
                                Pending Review
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleApprovalStatusChange(pkg, 'approved')}
                                className={pkg.metadata?.approvalStatus === 'approved' ? 'bg-green-50' : ''}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Approved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleApprovalStatusChange(pkg, 'archived')}
                                className={pkg.metadata?.approvalStatus === 'archived' ? 'bg-gray-50' : ''}
                              >
                                <Archive className="h-4 w-4 mr-2 text-gray-500" />
                                Archived
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewHealth(pkg);
                      }}
                    >
                      <Activity className="mr-1 h-3 w-3" />
                      View Health
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Package Health Modal */}
      {selectedPackageForHealth && (
        <PackageHealthModal
          package={selectedPackageForHealth}
          open={healthModalOpen}
          onOpenChange={setHealthModalOpen}
          onPackageUpdated={fetchPackages}
        />
      )}

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        sectionName="Packages"
        activityTypes={['package_create', 'package_update', 'package_delete', 'package_refresh']}
        hubId={selectedHubId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Package?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{packageToDelete?.name}"</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. The package and all its 
                  configuration will be permanently removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Package
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

