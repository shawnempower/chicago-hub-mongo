import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface HubPrice {
  hubId: string;
  hubName: string;
  pricing: {
    [key: string]: number | string;
  };
  discount?: number;
  available?: boolean;
  minimumCommitment?: string;
}

interface PricingField {
  key: string;
  label: string;
  placeholder: string;
}

interface HubPricingEditorProps {
  defaultPricing: { [key: string]: number | string };
  hubPricing: HubPrice[];
  pricingFields: PricingField[];
  pricingModels?: { value: string; label: string }[];
  onDefaultPricingChange: (pricing: { [key: string]: number | string }) => void;
  onHubPricingChange: (hubPricing: HubPrice[]) => void;
}

// Available hubs - you can make this dynamic by fetching from your backend
const AVAILABLE_HUBS = [
  { id: 'chicago-hub', name: 'Chicago Hub' },
  { id: 'portland-hub', name: 'Portland Hub' },
  { id: 'seattle-hub', name: 'Seattle Hub' },
  { id: 'austin-hub', name: 'Austin Hub' },
  { id: 'denver-hub', name: 'Denver Hub' },
];

export const HubPricingEditor: React.FC<HubPricingEditorProps> = ({
  defaultPricing,
  hubPricing,
  pricingFields,
  pricingModels,
  onDefaultPricingChange,
  onHubPricingChange,
}) => {
  const addHubPricing = () => {
    // Find first available hub that's not already used
    const usedHubIds = hubPricing.map(hp => hp.hubId);
    const availableHub = AVAILABLE_HUBS.find(hub => !usedHubIds.includes(hub.id));
    
    if (!availableHub) return; // All hubs already added

    const newHubPrice: HubPrice = {
      hubId: availableHub.id,
      hubName: availableHub.name,
      pricing: {},
      available: true,
    };

    onHubPricingChange([...hubPricing, newHubPrice]);
  };

  const removeHubPricing = (index: number) => {
    const updated = [...hubPricing];
    updated.splice(index, 1);
    onHubPricingChange(updated);
  };

  const updateHubPricing = (index: number, updates: Partial<HubPrice>) => {
    const updated = [...hubPricing];
    updated[index] = { ...updated[index], ...updates };
    onHubPricingChange(updated);
  };

  const updateHubSelection = (index: number, hubId: string) => {
    const selectedHub = AVAILABLE_HUBS.find(h => h.id === hubId);
    if (!selectedHub) return;

    updateHubPricing(index, {
      hubId: selectedHub.id,
      hubName: selectedHub.name,
    });
  };

  const getAvailableHubsForRow = (currentIndex: number) => {
    const usedHubIds = hubPricing
      .map((hp, idx) => idx !== currentIndex ? hp.hubId : null)
      .filter(Boolean);
    
    return AVAILABLE_HUBS.filter(hub => !usedHubIds.includes(hub.id));
  };

  return (
    <div className="space-y-4">
      {/* Separator */}
      <div className="border-t pt-4 mt-6" />

      <div className="space-y-4">
        <Label className="text-base font-semibold">Price</Label>

        {/* Default Pricing Row */}
        <div className="p-3 rounded-lg w-fit" style={{ backgroundColor: '#ECEAE4' }}>
          <div className="flex gap-3 items-end">
            {/* Hub/Context selector - inactive for default */}
            <div className="w-64 flex-shrink-0">
              <Label className="text-xs mb-1 block">Hub</Label>
              <Select value="default" disabled>
                <SelectTrigger className="bg-muted">
                  <SelectValue>Default Price</SelectValue>
                </SelectTrigger>
              </Select>
            </div>

            {/* All pricing fields horizontally */}
            {pricingFields.map((field, index) => (
              <div 
                key={field.key} 
                className={
                  field.key === 'flatRate' ? 'w-36 flex-shrink-0' : 
                  field.key === 'cpm' ? 'w-24 flex-shrink-0' : 
                  'w-32 flex-shrink-0'
                }
              >
                <Label className="text-xs mb-1 block">{field.label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-7"
                    value={defaultPricing[field.key] || ''}
                    onChange={(e) =>
                      onDefaultPricingChange({
                        ...defaultPricing,
                        [field.key]: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder={field.placeholder || '0'}
                  />
                </div>
              </div>
            ))}

            {/* Pricing Model */}
            {pricingModels && (
              <div className="w-52 flex-shrink-0">
                <Label className="text-xs mb-1 block">Pricing Model</Label>
                <Select
                  value={defaultPricing.pricingModel as string || pricingModels[0]?.value}
                  onValueChange={(value) =>
                    onDefaultPricingChange({
                      ...defaultPricing,
                      pricingModel: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Disabled delete button for alignment */}
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
                disabled
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Hub-Specific Pricing Rows */}
        {hubPricing.map((hubPrice, index) => {
          const availableHubs = getAvailableHubsForRow(index);
          
          return (
            <div key={index} className="space-y-2">
              <div className="p-3 bg-white rounded-lg shadow-sm w-fit">
                <div className="flex gap-3 items-end">
                  {/* Hub selector - active for hub pricing */}
                  <div className="w-64 flex-shrink-0">
                    <Label className="text-xs mb-2 block">Hub</Label>
                    <Select
                      value={hubPrice.hubId}
                      onValueChange={(value) => updateHubSelection(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHubs.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id}>
                            {hub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* All pricing fields horizontally */}
                  {pricingFields.map((field) => (
                    <div 
                      key={field.key} 
                      className={
                        field.key === 'flatRate' ? 'w-36 flex-shrink-0' : 
                        field.key === 'cpm' ? 'w-24 flex-shrink-0' : 
                        'w-32 flex-shrink-0'
                      }
                    >
                      <Label className="text-xs mb-2 block">{field.label}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-7"
                          value={hubPrice.pricing[field.key] || ''}
                          onChange={(e) =>
                            updateHubPricing(index, {
                              pricing: {
                                ...hubPrice.pricing,
                                [field.key]: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          placeholder={field.placeholder || '0'}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Pricing Model */}
                  {pricingModels && (
                    <div className="w-52 flex-shrink-0">
                      <Label className="text-xs mb-2 block">Pricing Model</Label>
                      <Select
                        value={hubPrice.pricing.pricingModel as string || pricingModels[0]?.value}
                        onValueChange={(value) =>
                          updateHubPricing(index, {
                            pricing: {
                              ...hubPrice.pricing,
                              pricingModel: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Delete button - icon only with light red background */}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-md"
                      onClick={() => removeHubPricing(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Hub Pricing Button */}
        {hubPricing.length < AVAILABLE_HUBS.length && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addHubPricing}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hub Pricing
          </Button>
        )}
      </div>
    </div>
  );
};

