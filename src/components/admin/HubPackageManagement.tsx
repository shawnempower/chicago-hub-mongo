import { useState, useEffect } from 'react';
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
  Eye, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package,
  Search,
  Filter,
  BarChart3,
  Sparkles,
  Zap
} from 'lucide-react';
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { PackageBuilderForm } from './PackageBuilderForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const HubPackageManagement = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<HubPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<HubPackage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
  }, [filterStatus]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus === 'active') params.append('active_only', 'true');
      if (filterStatus === 'draft') params.append('approval_status', 'draft');
      if (filterStatus === 'archived') params.append('approval_status', 'archived');

      const response = await fetch(`${API_BASE_URL}/api/hub-packages?${params}`, {
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
  };

  const handleDelete = async (id: string, packageName: string) => {
    if (!confirm(`Are you sure you want to delete "${packageName}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/hub-packages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete package');

      toast({
        title: 'Success',
        description: 'Package deleted successfully'
      });
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete package',
        variant: 'destructive'
      });
    }
  };

  const handleSeedStarters = async () => {
    if (!confirm('Seed the 3 starter packages? (Chicago Essentials Bundle, South Side Amplifier, Digital Domination)')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/hub-packages/seed-starters`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to seed packages');

      const data = await response.json();
      toast({
        title: 'Success',
        description: data.message || 'Starter packages seeded successfully'
      });
      fetchPackages();
    } catch (error) {
      console.error('Error seeding packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to seed starter packages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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

  // Calculate stats
  const stats = {
    total: packages.length,
    active: packages.filter(p => p.availability.isActive).length,
    featured: packages.filter(p => p.availability.isFeatured).length,
    totalViews: packages.reduce((sum, p) => sum + p.analytics.viewCount, 0),
    totalInquiries: packages.reduce((sum, p) => sum + p.analytics.inquiryCount, 0),
    avgPrice: packages.length > 0 
      ? Math.round(packages.reduce((sum, p) => sum + p.pricing.breakdown.finalPrice, 0) / packages.length)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hub Package Management</h1>
          <p className="text-muted-foreground">Manage and monitor your hub-level advertising packages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedStarters} disabled={loading}>
            <Zap className="mr-2 h-4 w-4" />
            Seed Starters
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              toast({
                title: 'Coming Soon',
                description: 'Package Discovery tool is being developed. For now, use the seed starters to get example packages.',
              });
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Package Discovery
          </Button>
          <Button onClick={() => setIsBuilderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Package
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active, {stats.featured} featured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all packages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInquiries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalViews > 0 
                ? `${((stats.totalInquiries / stats.totalViews) * 100).toFixed(1)}% conversion`
                : 'No views yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Package Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgPrice.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Per month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button 
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
          >
            Active
          </Button>
          <Button 
            variant={filterStatus === 'draft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('draft')}
          >
            Drafts
          </Button>
          <Button 
            variant={filterStatus === 'archived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('archived')}
          >
            Archived
          </Button>
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
            <Button onClick={() => setIsBuilderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <Card key={pkg._id?.toString()} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{pkg.basicInfo.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{pkg.basicInfo.tagline}</p>
                  </div>
                  <div className="flex gap-1">
                    {pkg.availability.isFeatured && (
                      <Badge variant="secondary" className="text-xs">Featured</Badge>
                    )}
                    {pkg.availability.isActive ? (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Package Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-semibold">{pkg.pricing.displayPrice}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Publications</p>
                      <p className="font-semibold">{pkg.components.publications.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reach</p>
                      <p className="font-semibold">
                        {typeof pkg.performance.estimatedReach === 'number' 
                          ? pkg.performance.estimatedReach.toLocaleString()
                          : (pkg.performance.estimatedReach?.minReach || 0).toLocaleString()
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-semibold capitalize">{pkg.basicInfo.category}</p>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex gap-4 text-sm border-t pt-3">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{pkg.analytics.viewCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{pkg.analytics.inquiryCount}</span>
                    </div>
                    {pkg.analytics.conversionRate && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{(pkg.analytics.conversionRate * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t pt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(`/packages?highlight=${pkg._id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsBuilderOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(pkg._id?.toString() || '', pkg.basicInfo.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Package Builder Modal */}
      <Dialog open={isBuilderOpen} onOpenChange={(open) => {
        setIsBuilderOpen(open);
        if (!open) {
          setEditingPackage(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </DialogTitle>
          </DialogHeader>
          <PackageBuilderForm
            existingPackage={editingPackage}
            onSuccess={(packageId) => {
              setIsBuilderOpen(false);
              setEditingPackage(null);
              fetchPackages();
              toast({
                title: 'Success!',
                description: editingPackage ? 'Package updated successfully' : 'Package created successfully'
              });
            }}
            onCancel={() => {
              setIsBuilderOpen(false);
              setEditingPackage(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

