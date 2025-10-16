import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit, Save, X, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface GeneralTerms {
  leadTime?: string;
  materialDeadline?: string;
  paymentTerms?: string;
  cancellationPolicy?: string;
  agencyCommission?: string;
  specifications?: string;
  additionalTerms?: string;
}

interface GeneralTermsEditorProps {
  terms?: GeneralTerms;
  onSave: (terms: GeneralTerms) => void;
  channelName: string;
}

export const GeneralTermsEditor: React.FC<GeneralTermsEditorProps> = ({
  terms = {},
  onSave,
  channelName
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTerms, setEditedTerms] = React.useState<GeneralTerms>(terms);

  const handleSave = () => {
    onSave(editedTerms);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTerms(terms);
    setIsEditing(false);
  };

  const hasAnyTerms = terms && (
    terms.leadTime || 
    terms.materialDeadline || 
    terms.paymentTerms || 
    terms.cancellationPolicy || 
    terms.agencyCommission || 
    terms.additionalTerms
  );

  if (!isEditing && !hasAnyTerms) {
    return (
      <div className="mt-6">
        <Separator className="mb-6" />
        <Card className="p-6 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">General Terms</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Add standard terms and conditions for {channelName} advertising
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Add Terms
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Separator className="mb-6" />
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">General Terms</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Standard terms and conditions for {channelName} advertising
              </p>
            </div>
          </div>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leadTime">Lead Time</Label>
                <Input
                  id="leadTime"
                  placeholder="e.g., 5 business days"
                  value={editedTerms.leadTime || ''}
                  onChange={(e) => setEditedTerms({ ...editedTerms, leadTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="materialDeadline">Material Deadline</Label>
                <Input
                  id="materialDeadline"
                  placeholder="e.g., 3 days before publication"
                  value={editedTerms.materialDeadline || ''}
                  onChange={(e) => setEditedTerms({ ...editedTerms, materialDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="e.g., Net 30"
                  value={editedTerms.paymentTerms || ''}
                  onChange={(e) => setEditedTerms({ ...editedTerms, paymentTerms: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                <Input
                  id="cancellationPolicy"
                  placeholder="e.g., 7 days notice required"
                  value={editedTerms.cancellationPolicy || ''}
                  onChange={(e) => setEditedTerms({ ...editedTerms, cancellationPolicy: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="agencyCommission">Agency Commission</Label>
                <Input
                  id="agencyCommission"
                  placeholder="e.g., 15% standard commission"
                  value={editedTerms.agencyCommission || ''}
                  onChange={(e) => setEditedTerms({ ...editedTerms, agencyCommission: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="specifications">Specifications</Label>
                <Input
                  id="specifications"
                  placeholder="e.g., Image, Carousel, or Video, 1080x1080 (1:1 ratio), JPG, PNG, MP4"
                  value={editedTerms.specifications || ''}
                  onChange={(e) => setEditedTerms({ ...editedTerms, specifications: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="additionalTerms">Additional Terms</Label>
              <Textarea
                id="additionalTerms"
                placeholder="Any additional terms, conditions, or notes..."
                rows={4}
                value={editedTerms.additionalTerms || ''}
                onChange={(e) => setEditedTerms({ ...editedTerms, additionalTerms: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Terms
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {terms.leadTime && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Lead Time:</span>
                <p className="text-sm mt-1">{terms.leadTime}</p>
              </div>
            )}
            {terms.materialDeadline && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Material Deadline:</span>
                <p className="text-sm mt-1">{terms.materialDeadline}</p>
              </div>
            )}
            {terms.paymentTerms && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Payment Terms:</span>
                <p className="text-sm mt-1">{terms.paymentTerms}</p>
              </div>
            )}
            {terms.cancellationPolicy && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Cancellation Policy:</span>
                <p className="text-sm mt-1">{terms.cancellationPolicy}</p>
              </div>
            )}
            {terms.agencyCommission && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Agency Commission:</span>
                <p className="text-sm mt-1">{terms.agencyCommission}</p>
              </div>
            )}
            {terms.specifications && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Specifications:</span>
                <p className="text-sm mt-1">{terms.specifications}</p>
              </div>
            )}
            {terms.additionalTerms && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Additional Terms:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{terms.additionalTerms}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

