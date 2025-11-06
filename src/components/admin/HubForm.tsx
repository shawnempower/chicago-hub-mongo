/**
 * HubForm Component
 * 
 * Form for creating and editing hubs
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hub, HubInsert, HubUpdate, validateHubId } from '@/integrations/mongodb/hubSchema';
import { hubsApi } from '@/api/hubs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface HubFormProps {
  hub?: Hub | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const HubForm: React.FC<HubFormProps> = ({ hub, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    hubId: '',
    name: '',
    tagline: '',
    description: '',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'archived',
    primaryColor: '#0066cc',
    secondaryColor: '',
    region: '',
    primaryCity: '',
    state: '',
  });

  useEffect(() => {
    if (hub) {
      setFormData({
        hubId: hub.hubId,
        name: hub.basicInfo.name,
        tagline: hub.basicInfo.tagline || '',
        description: hub.basicInfo.description || '',
        status: hub.status,
        primaryColor: hub.branding?.primaryColor || '#0066cc',
        secondaryColor: hub.branding?.secondaryColor || '',
        region: hub.geography?.region || '',
        primaryCity: hub.geography?.primaryCity || '',
        state: hub.geography?.state || '',
      });
    }
  }, [hub]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate hubId for new hubs
    if (!hub && !validateHubId(formData.hubId)) {
      toast.error('Hub ID must be lowercase alphanumeric with hyphens, 3-50 characters');
      return;
    }

    setLoading(true);

    try {
      const hubData: HubInsert | Partial<HubUpdate> = {
        hubId: formData.hubId,
        basicInfo: {
          name: formData.name,
          tagline: formData.tagline || undefined,
          description: formData.description || undefined,
        },
        status: formData.status,
        branding: formData.primaryColor || formData.secondaryColor ? {
          primaryColor: formData.primaryColor || undefined,
          secondaryColor: formData.secondaryColor || undefined,
        } : undefined,
        geography: formData.region || formData.primaryCity || formData.state ? {
          region: formData.region || undefined,
          primaryCity: formData.primaryCity || undefined,
          state: formData.state || undefined,
        } : undefined,
      };

      if (hub) {
        // Update existing hub
        await hubsApi.update(hub._id as string, {
          ...hubData,
          updatedAt: new Date(),
        });
        toast.success('Hub updated successfully');
      } else {
        // Create new hub
        await hubsApi.create(hubData as HubInsert);
        toast.success('Hub created successfully');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving hub:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save hub');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core hub details and identification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hubId">
                Hub ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hubId"
                value={formData.hubId}
                onChange={(e) => setFormData({ ...formData, hubId: e.target.value })}
                placeholder="chicago-hub"
                disabled={!!hub} // Can't change ID after creation
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, alphanumeric with hyphens (cannot be changed after creation)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Hub Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Chicago Hub"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="Reaching Chicago's diverse neighborhoods and communities"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="The Chicago Hub connects advertisers with trusted local media outlets..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Visual customization options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#0066cc"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor || '#666666'}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#666666"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geography</CardTitle>
          <CardDescription>Regional information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Midwest"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryCity">Primary City</Label>
              <Input
                id="primaryCity"
                value={formData.primaryCity}
                onChange={(e) => setFormData({ ...formData, primaryCity: e.target.value })}
                placeholder="Chicago"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Illinois"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hub ? 'Update Hub' : 'Create Hub'}
        </Button>
      </div>
    </form>
  );
};

