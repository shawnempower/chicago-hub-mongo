import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface AdPackage {
  id: string;
  name: string;
  description?: string;
  price_range?: string;
  duration?: string;
  reach_estimate?: string;
  format?: string;
  features: any; // Can be string[] or JSON
  media_outlet_id?: string;
  media_outlets?: {
    name: string;
  };
}

interface MediaOutlet {
  id: string;
  name: string;
}

export const PackageManagement = () => {
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [outlets, setOutlets] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<AdPackage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_range: '',
    duration: '',
    reach_estimate: '',
    format: '',
    features: '',
    media_outlet_id: '',
  });

  useEffect(() => {
    fetchPackages();
    fetchOutlets();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_packages')
        .select(`
          *,
          media_outlets (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      
      // Ensure features is always an array
      const processedPackages = (data || []).map(pkg => ({
        ...pkg,
        features: Array.isArray(pkg.features) ? pkg.features : []
      }));
      
      setPackages(processedPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ad packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOutlets(data || []);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const packageData = {
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
        media_outlet_id: formData.media_outlet_id || null,
      };

      if (editingPackage) {
        const { error } = await supabase
          .from('ad_packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) throw error;
        toast({ title: "Success", description: "Package updated successfully" });
      } else {
        const { error } = await supabase
          .from('ad_packages')
          .insert(packageData);

        if (error) throw error;
        toast({ title: "Success", description: "Package created successfully" });
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

  const handleEdit = (pkg: AdPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price_range: pkg.price_range || '',
      duration: pkg.duration || '',
      reach_estimate: pkg.reach_estimate || '',
      format: pkg.format || '',
      features: pkg.features.join(', '),
      media_outlet_id: pkg.media_outlet_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const { error } = await supabase
        .from('ad_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      
      toast({ title: "Success", description: "Package deleted successfully" });
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_range: '',
      duration: '',
      reach_estimate: '',
      format: '',
      features: '',
      media_outlet_id: '',
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
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPackage ? 'Edit' : 'Add'} Ad Package</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Media Outlet</label>
                  <Select value={formData.media_outlet_id} onValueChange={(value) => setFormData({ ...formData, media_outlet_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outlet (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific outlet</SelectItem>
                      {outlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Price Range</label>
                  <Input
                    value={formData.price_range}
                    onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                    placeholder="e.g. $500-$1,000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g. 30 days"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reach Estimate</label>
                  <Input
                    value={formData.reach_estimate}
                    onChange={(e) => setFormData({ ...formData, reach_estimate: e.target.value })}
                    placeholder="e.g. 10,000+ listeners"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <Input
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    placeholder="e.g. Radio ad, Display ad"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Features (comma-separated)</label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Prime time slots, Professional production, Analytics reporting"
                />
              </div>
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

      <div className="grid gap-4">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>
                    {pkg.media_outlets?.name && `${pkg.media_outlets.name} • `}
                    {pkg.price_range} • {pkg.duration}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(pkg)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {(pkg.description || pkg.features.length > 0) && (
              <CardContent>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                )}
                {pkg.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pkg.features.map((feature, index) => (
                      <span key={index} className="text-xs bg-secondary px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};