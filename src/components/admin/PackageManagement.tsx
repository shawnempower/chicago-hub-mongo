import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Archive, RotateCcw } from 'lucide-react';
import { DatabasePackage } from '@/hooks/usePackages';
import { SafeDeleteDialog } from './SafeDeleteDialog';

// Interface for the form data
interface PackageFormData {
  id?: string;
  legacy_id?: number;
  name: string;
  tagline: string;
  description: string;
  price: string;
  price_range: string;
  audience: string[];
  channels: string[];
  complexity: string;
  outlets: string[];
  features: string[];
}

const PackageManagement = () => {
  const [packages, setPackages] = useState<DatabasePackage[]>([]);
  const [deletedPackages, setDeletedPackages] = useState<DatabasePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingPackage, setEditingPackage] = useState<DatabasePackage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<DatabasePackage | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    tagline: '',
    description: '',
    price: '',
    price_range: 'mid-range',
    audience: [],
    channels: [],
    complexity: 'turnkey',
    outlets: [],
    features: [],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      
      // Fetch active packages
      const { data: activeData, error: activeError } = await supabase
        .from('ad_packages')
        .select('*')
        .is('deleted_at', null)
        .order('legacy_id');
      
      if (activeError) throw activeError;
      setPackages(activeData || []);

      // Fetch deleted packages
      const { data: deletedData, error: deletedError } = await supabase
        .from('ad_packages')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (deletedError) throw deletedError;
      setDeletedPackages(deletedData || []);
      
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const packageData = {
        name: formData.name,
        tagline: formData.tagline,
        description: formData.description,
        price: formData.price,
        price_range: formData.price_range,
        audience: formData.audience,
        channels: formData.channels,
        complexity: formData.complexity,
        outlets: formData.outlets,
        features: formData.features,
        is_active: true
      };

      if (editingPackage) {
        // Update existing package
        const { error } = await supabase
          .from('ad_packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Package updated successfully",
        });
      } else {
        // Create new package
        const { error } = await supabase
          .from('ad_packages')
          .insert([packageData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Package created successfully",
        });
      }

      resetForm();
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      toast({
        title: "Error",
        description: "Failed to save package",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (pkg: DatabasePackage) => {
    setEditingPackage(pkg);
    setFormData({
      id: pkg.id,
      legacy_id: pkg.legacy_id || undefined,
      name: pkg.name,
      tagline: pkg.tagline || '',
      description: pkg.description || '',
      price: pkg.price || '',
      price_range: pkg.price_range || 'mid-range',
      audience: pkg.audience || [],
      channels: pkg.channels || [],
      complexity: pkg.complexity || 'turnkey',
      outlets: pkg.outlets || [],
      features: Array.isArray(pkg.features) ? pkg.features : []
    });
    setShowForm(true);
  };

  const handleDeleteClick = (pkg: DatabasePackage) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      const { data, error } = await supabase
        .rpc('restore_package', { package_uuid: id });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Package Restored",
          description: `"${name}" has been restored successfully.`,
        });
        fetchPackages();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error restoring package:', error);
      toast({
        title: "Error",
        description: "Failed to restore package. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tagline: '',
      description: '',
      price: '',
      price_range: 'mid-range',
      audience: [],
      channels: [],
      complexity: 'turnkey',
      outlets: [],
      features: [],
    });
    setEditingPackage(null);
    setShowForm(false);
  };

  if (loading) {
    return <div>Loading packages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Packages</h2>
          <p className="text-muted-foreground">Manage advertising packages and offerings</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showDeleted ? "default" : "outline"}
            onClick={() => setShowDeleted(!showDeleted)}
          >
            <Archive className="w-4 h-4 mr-2" />
            {showDeleted ? "Show Active" : "Show Archived"} ({showDeleted ? packages.length : deletedPackages.length})
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPackage ? 'Edit' : 'Add'} Package</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Package name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              placeholder="Tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            />
            
            <Textarea
              placeholder="Package description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />

            <Input
              placeholder="Price (e.g., $2,500)"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />

            <select
              className="w-full p-2 border rounded"
              value={formData.price_range}
              onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
            >
              <option value="budget">Budget</option>
              <option value="mid-range">Mid-range</option>
              <option value="premium">Premium</option>
            </select>

            <select
              className="w-full p-2 border rounded"
              value={formData.complexity}
              onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
            >
              <option value="turnkey">Turnkey</option>
              <option value="custom">Custom</option>
            </select>

            <Input
              placeholder="Audience (comma-separated)"
              value={formData.audience.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                audience: e.target.value.split(',').map(f => f.trim()).filter(f => f)
              })}
            />

            <Input
              placeholder="Channels (comma-separated)"
              value={formData.channels.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                channels: e.target.value.split(',').map(f => f.trim()).filter(f => f)
              })}
            />

            <Input
              placeholder="Outlets (comma-separated)"
              value={formData.outlets.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                outlets: e.target.value.split(',').map(f => f.trim()).filter(f => f)
              })}
            />

            <Input
              placeholder="Features (comma-separated)"
              value={formData.features.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                features: e.target.value.split(',').map(f => f.trim()).filter(f => f)
              })}
            />

              <div className="flex gap-2">
                <Button type="submit">
                  {editingPackage ? 'Update' : 'Create'} Package
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(showDeleted ? deletedPackages : packages).map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{pkg.name}</span>
                <div className="space-x-2">
                  {showDeleted ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRestore(pkg.id, pkg.name)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(pkg)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pkg.tagline && (
                <p className="text-sm text-muted-foreground mb-2">{pkg.tagline}</p>
              )}
              <p className="text-gray-600 mb-2">{pkg.description}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {pkg.price && (
                  <Badge variant="secondary">
                    Price: {pkg.price}
                  </Badge>
                )}
                <Badge variant="secondary">
                  Range: {pkg.price_range}
                </Badge>
                <Badge variant="secondary">
                  Complexity: {pkg.complexity}
                </Badge>
              </div>
              
              {pkg.audience && pkg.audience.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Audience:</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.audience.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {pkg.channels && pkg.channels.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Channels:</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.channels.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {pkg.outlets && pkg.outlets.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Outlets:</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.outlets.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <SafeDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPackageToDelete(null);
        }}
        onSuccess={fetchPackages}
        packageId={packageToDelete?.id || ''}
        packageName={packageToDelete?.name || ''}
      />
    </div>
  );
};

export { PackageManagement };