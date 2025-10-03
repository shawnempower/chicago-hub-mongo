import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface MediaOutlet {
  id: string;
  name: string;
  type: string;
  tagline?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  coverage_area?: string;
  audience_size?: string;
  is_active: boolean;
}

export const MediaOutletManagement = () => {
  const [outlets, setOutlets] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOutlet, setEditingOutlet] = useState<MediaOutlet | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    tagline: '',
    description: '',
    website_url: '',
    contact_email: '',
    contact_phone: '',
    coverage_area: '',
    audience_size: '',
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .order('name');

      if (error) throw error;
      setOutlets(data || []);
    } catch (error) {
      console.error('Error fetching outlets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch media outlets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingOutlet) {
        const { error } = await supabase
          .from('media_outlets')
          .update(formData)
          .eq('id', editingOutlet.id);

        if (error) throw error;
        toast({ title: "Success", description: "Media outlet updated successfully" });
      } else {
        const { error } = await supabase
          .from('media_outlets')
          .insert(formData);

        if (error) throw error;
        toast({ title: "Success", description: "Media outlet created successfully" });
      }

      resetForm();
      fetchOutlets();
    } catch (error) {
      console.error('Error saving outlet:', error);
      toast({
        title: "Error",
        description: "Failed to save media outlet",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (outlet: MediaOutlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      type: outlet.type,
      tagline: outlet.tagline || '',
      description: outlet.description || '',
      website_url: outlet.website_url || '',
      contact_email: outlet.contact_email || '',
      contact_phone: outlet.contact_phone || '',
      coverage_area: outlet.coverage_area || '',
      audience_size: outlet.audience_size || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (outletId: string) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return;

    try {
      const { error } = await supabase
        .from('media_outlets')
        .delete()
        .eq('id', outletId);

      if (error) throw error;
      
      toast({ title: "Success", description: "Media outlet deleted successfully" });
      fetchOutlets();
    } catch (error) {
      console.error('Error deleting outlet:', error);
      toast({
        title: "Error",
        description: "Failed to delete media outlet",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      tagline: '',
      description: '',
      website_url: '',
      contact_email: '',
      contact_phone: '',
      coverage_area: '',
      audience_size: '',
    });
    setEditingOutlet(null);
    setShowForm(false);
  };

  if (loading) {
    return <div>Loading outlets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Outlets</h2>
          <p className="text-muted-foreground">Manage your media outlet network</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Outlet
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingOutlet ? 'Edit' : 'Add'} Media Outlet</CardTitle>
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
                  <label className="text-sm font-medium">Type *</label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="radio">Radio</SelectItem>
                      <SelectItem value="newspaper">Newspaper</SelectItem>
                      <SelectItem value="magazine">Magazine</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="television">Television</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tagline</label>
                  <Input
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Website URL</label>
                  <Input
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Email</label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Phone</label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Coverage Area</label>
                  <Input
                    value={formData.coverage_area}
                    onChange={(e) => setFormData({ ...formData, coverage_area: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Audience Size</label>
                  <Input
                    value={formData.audience_size}
                    onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })}
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
              <div className="flex gap-2">
                <Button type="submit">
                  {editingOutlet ? 'Update' : 'Create'} Outlet
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
        {outlets.map((outlet) => (
          <Card key={outlet.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{outlet.name}</CardTitle>
                  <CardDescription>{outlet.type} • {outlet.tagline}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(outlet)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(outlet.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {outlet.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{outlet.description}</p>
                {outlet.website_url && (
                  <p className="text-sm mt-2">
                    <a href={outlet.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Visit Website
                    </a>
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};