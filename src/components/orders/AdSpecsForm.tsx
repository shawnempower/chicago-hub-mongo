import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface AdSpecification {
  placementId: string;
  placementName: string;
  channel: string;
  specifications: {
    dimensions?: string;
    fileFormats?: string[];
    maxFileSize?: string;
    colorSpace?: string;
    resolution?: string;
    additionalRequirements?: string;
  };
  deadline?: Date;
  providedAt?: Date;
}

interface AdSpecsFormProps {
  placementId: string;
  placementName: string;
  channel: string;
  existingSpecs?: AdSpecification;
  onSave: (specs: AdSpecification) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function AdSpecsForm({
  placementId,
  placementName,
  channel,
  existingSpecs,
  onSave,
  onCancel,
  readOnly = false
}: AdSpecsFormProps) {
  const [specs, setSpecs] = useState<AdSpecification['specifications']>(
    existingSpecs?.specifications || {
      dimensions: '',
      fileFormats: [],
      maxFileSize: '',
      colorSpace: '',
      resolution: '',
      additionalRequirements: ''
    }
  );

  const [fileFormatsInput, setFileFormatsInput] = useState(
    existingSpecs?.specifications.fileFormats?.join(', ') || ''
  );

  const [deadlineDate, setDeadlineDate] = useState(
    existingSpecs?.deadline ? new Date(existingSpecs.deadline).toISOString().split('T')[0] : ''
  );

  const handleSave = () => {
    const adSpec: AdSpecification = {
      placementId,
      placementName,
      channel,
      specifications: {
        ...specs,
        fileFormats: fileFormatsInput
          .split(',')
          .map(f => f.trim())
          .filter(f => f.length > 0)
      },
      deadline: deadlineDate ? new Date(deadlineDate) : undefined,
      providedAt: new Date()
    };

    onSave(adSpec);
  };

  const isProvided = !!existingSpecs?.providedAt;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Ad Specifications for {placementName}
          </CardTitle>
          {isProvided && (
            <Badge variant="default" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Provided
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500">Channel: {channel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dimensions">Dimensions / Size</Label>
          <Input
            id="dimensions"
            placeholder="e.g., 300x250, Full Page, 728x90"
            value={specs.dimensions || ''}
            onChange={(e) => setSpecs({ ...specs, dimensions: e.target.value })}
            disabled={readOnly}
          />
          <p className="text-xs text-gray-500">
            Specify pixel dimensions or physical size
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fileFormats">Accepted File Formats</Label>
          <Input
            id="fileFormats"
            placeholder="e.g., JPG, PNG, PDF"
            value={fileFormatsInput}
            onChange={(e) => setFileFormatsInput(e.target.value)}
            disabled={readOnly}
          />
          <p className="text-xs text-gray-500">
            Comma-separated list of accepted formats
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Maximum File Size</Label>
            <Input
              id="maxFileSize"
              placeholder="e.g., 10MB, 5GB"
              value={specs.maxFileSize || ''}
              onChange={(e) => setSpecs({ ...specs, maxFileSize: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Input
              id="resolution"
              placeholder="e.g., 300dpi, 72ppi"
              value={specs.resolution || ''}
              onChange={(e) => setSpecs({ ...specs, resolution: e.target.value })}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="colorSpace">Color Space</Label>
          <Input
            id="colorSpace"
            placeholder="e.g., CMYK, RGB, sRGB"
            value={specs.colorSpace || ''}
            onChange={(e) => setSpecs({ ...specs, colorSpace: e.target.value })}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Material Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            disabled={readOnly}
          />
          <p className="text-xs text-gray-500">
            When creative materials must be received
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalRequirements">Additional Requirements</Label>
          <Textarea
            id="additionalRequirements"
            placeholder="Any other specifications or requirements..."
            value={specs.additionalRequirements || ''}
            onChange={(e) => setSpecs({ ...specs, additionalRequirements: e.target.value })}
            rows={4}
            disabled={readOnly}
          />
        </div>

        {!readOnly && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} className="flex-1">
              Save Specifications
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}

        {readOnly && existingSpecs?.providedAt && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Provided on {new Date(existingSpecs.providedAt).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

