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
import { FrequencyInput } from './FrequencyInput';

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

export interface DefaultPrice {
  pricing: {
    [key: string]: number | string;
  };
}

interface PricingField {
  key: string;
  label: string;
  placeholder: string;
}

interface ConditionalField {
  key: string;
  label: string;
  showWhen: string[]; // Array of pricing model values that trigger this field
  type: 'select' | 'text'; // Field type
  options?: { value: string; label: string }[]; // For select type
  placeholder?: string; // For text type
  pattern?: string; // Regex pattern for text validation
  patternMessage?: string; // Error message for invalid pattern
}

interface HubPricingEditorProps {
  defaultPricing: { [key: string]: number | string } | DefaultPrice[];
  hubPricing: HubPrice[];
  pricingFields: PricingField[];
  pricingModels?: { value: string; label: string }[];
  conditionalFields?: ConditionalField[];
  allowMultipleDefaultPricing?: boolean; // New prop to enable multiple default pricing rows
  onDefaultPricingChange: (pricing: { [key: string]: number | string } | DefaultPrice[]) => void;
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
  conditionalFields,
  allowMultipleDefaultPricing = false,
  onDefaultPricingChange,
  onHubPricingChange,
}) => {
  // Convert legacy single object format to array format
  const defaultPricingArray: DefaultPrice[] = Array.isArray(defaultPricing) 
    ? defaultPricing 
    : [{ pricing: defaultPricing }];

  // Ensure all hub pricing entries have a pricingModel set (fix for legacy data)
  React.useEffect(() => {
    if (!pricingModels || pricingModels.length === 0) return;
    
    const defaultModel = pricingModels[0].value;
    let needsUpdate = false;
    
    const updatedHubPricing = hubPricing.map(hubPrice => {
      if (!hubPrice.pricing.pricingModel) {
        needsUpdate = true;
        return {
          ...hubPrice,
          pricing: {
            ...hubPrice.pricing,
            pricingModel: defaultModel
          }
        };
      }
      return hubPrice;
    });
    
    if (needsUpdate) {
      onHubPricingChange(updatedHubPricing);
    }
  }, [hubPricing, pricingModels, onHubPricingChange]);

  /**
   * Calculate total price based on flatRate × frequency multiplier
   * Example: $300 × 4x = $1200
   */
  const calculateTotal = (pricing: { [key: string]: number | string }): number | null => {
    const flatRate = pricing.flatRate as number;
    const frequency = pricing.frequency as string;
    const pricingModel = pricing.pricingModel as string;

    // Don't calculate for contact pricing
    if (pricingModel === 'contact' || !flatRate) {
      return null;
    }

    // If no frequency, just return the base price
    if (!frequency) {
      return flatRate;
    }

    // Extract multiplier from frequency (e.g., "4x" -> 4, "12x" -> 12)
    const match = frequency.match(/^(\d+)x$/);
    if (match) {
      const multiplier = parseInt(match[1], 10);
      return flatRate * multiplier;
    }

    // If frequency doesn't match pattern, just return base price
    return flatRate;
  };

  const addDefaultPricing = () => {
    // Initialize with the default pricing model that will be shown in the Select dropdown
    // This ensures what's displayed is what's actually saved
    const defaultPricingModel = pricingModels?.[0]?.value;
    
    const newDefaultPrice: DefaultPrice = {
      pricing: {
        ...(defaultPricingModel && { pricingModel: defaultPricingModel }),
      },
    };
    const updated = [...defaultPricingArray, newDefaultPrice];
    // Multiple pricing tiers, return as array
    onDefaultPricingChange(updated);
  };

  const removeDefaultPricing = (index: number) => {
    if (defaultPricingArray.length <= 1) return; // Keep at least one default pricing
    const updated = [...defaultPricingArray];
    updated.splice(index, 1);
    
    // If down to one pricing tier, return as object for backward compatibility
    if (updated.length === 1) {
      onDefaultPricingChange(updated[0].pricing);
    } else {
      onDefaultPricingChange(updated);
    }
  };

  const updateDefaultPricing = (index: number, pricing: { [key: string]: number | string }) => {
    const updated = [...defaultPricingArray];
    updated[index] = { pricing };
    
    // If there's only one pricing tier, return as object for backward compatibility
    // Otherwise return as array for multiple tiers
    if (updated.length === 1) {
      onDefaultPricingChange(updated[0].pricing);
    } else {
      onDefaultPricingChange(updated);
    }
  };

  const addHubPricing = () => {
    // Default to first hub (now allows duplicates)
    const defaultHub = AVAILABLE_HUBS[0];
    
    // Initialize with the default pricing model that will be shown in the Select dropdown
    // This ensures what's displayed is what's actually saved
    const defaultPricingModel = pricingModels?.[0]?.value;

    const newHubPrice: HubPrice = {
      hubId: defaultHub.id,
      hubName: defaultHub.name,
      pricing: {
        ...(defaultPricingModel && { pricingModel: defaultPricingModel }),
      },
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

  return (
    <div className="space-y-4">
      {/* Separator */}
      <div className="border-t pt-4 mt-6" />

      <div className="space-y-4">
        <Label className="text-base font-semibold">Price</Label>

        {/* Default Pricing Rows */}
        {defaultPricingArray.map((defaultPrice, defaultIndex) => (
          <div key={`default-${defaultIndex}`} className="p-3 rounded-lg w-fit" style={{ backgroundColor: '#ECEAE4' }}>
            <div className="flex gap-3 items-end">
              {/* Hub/Context selector - inactive for default */}
              <div className="w-64 flex-shrink-0">
                <Label className="text-xs mb-1 block">Program</Label>
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
                      value={defaultPrice.pricing[field.key] || ''}
                      onChange={(e) =>
                        updateDefaultPricing(defaultIndex, {
                          ...defaultPrice.pricing,
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
                    value={defaultPrice.pricing.pricingModel as string || pricingModels[0]?.value}
                    onValueChange={(value) =>
                      updateDefaultPricing(defaultIndex, {
                        ...defaultPrice.pricing,
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

              {/* Conditional Fields - show based on pricing model */}
              {conditionalFields?.map((condField) => {
                const currentModel = defaultPrice.pricing.pricingModel as string || pricingModels?.[0]?.value;
                const shouldShow = condField.showWhen.includes(currentModel);
                
                if (!shouldShow) return null;
                
                // Use FrequencyInput for frequency fields
                if (condField.type === 'text' && condField.key === 'frequency') {
                  return (
                    <FrequencyInput
                      key={condField.key}
                      value={defaultPrice.pricing[condField.key] as string || ''}
                      onChange={(value) =>
                        updateDefaultPricing(defaultIndex, {
                          ...defaultPrice.pricing,
                          [condField.key]: value,
                        })
                      }
                      label={condField.label}
                      className="w-52 flex-shrink-0"
                      showQuickOptions={false}
                      compact={true}
                    />
                  );
                }
                
                if (condField.type === 'text') {
                  return (
                    <div key={condField.key} className="w-52 flex-shrink-0">
                      <Label className="text-xs mb-1 block">{condField.label}</Label>
                      <Input
                        type="text"
                        value={defaultPrice.pricing[condField.key] as string || ''}
                        onChange={(e) =>
                          updateDefaultPricing(defaultIndex, {
                            ...defaultPrice.pricing,
                            [condField.key]: e.target.value,
                          })
                        }
                        placeholder={condField.placeholder || ''}
                        pattern={condField.pattern}
                        title={condField.patternMessage}
                      />
                    </div>
                  );
                }
                
                return (
                  <div key={condField.key} className="w-52 flex-shrink-0">
                    <Label className="text-xs mb-1 block">{condField.label}</Label>
                    <Select
                      value={defaultPrice.pricing[condField.key] as string || condField.options?.[0]?.value}
                      onValueChange={(value) =>
                        updateDefaultPricing(defaultIndex, {
                          ...defaultPrice.pricing,
                          [condField.key]: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {condField.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              {/* Total Price Display */}
              {(() => {
                const total = calculateTotal(defaultPrice.pricing);
                if (total !== null && total > 0) {
                  return (
                    <div className="w-32 flex-shrink-0">
                      <Label className="text-xs mb-1 block">Total</Label>
                      <div className="h-10 px-3 flex items-center bg-green-50 border border-green-200 rounded-md">
                        <span className="text-sm font-semibold text-green-700">
                          ${total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Delete button - disabled for first row if multiple allowed, always disabled if only one allowed */}
              <div className="flex items-end">
                {allowMultipleDefaultPricing && defaultIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-md"
                    onClick={() => removeDefaultPricing(defaultIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
                    disabled
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Default Pricing Button - Only show if multiple default pricing is enabled */}
        {allowMultipleDefaultPricing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDefaultPricing}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Default Pricing
          </Button>
        )}

        {/* Hub-Specific Pricing Rows */}
        {hubPricing.map((hubPrice, index) => {
          return (
            <div key={index} className="space-y-2">
              <div className="p-3 bg-white rounded-lg shadow-sm w-fit">
                <div className="flex gap-3 items-end">
                  {/* Hub selector - active for hub pricing */}
                  <div className="w-64 flex-shrink-0">
                    <Label className="text-xs mb-2 block">Program</Label>
                    <Select
                      value={hubPrice.hubId}
                      onValueChange={(value) => updateHubSelection(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_HUBS.map((hub) => (
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

                  {/* Conditional Fields - show based on pricing model */}
                  {conditionalFields?.map((condField) => {
                    const currentModel = hubPrice.pricing.pricingModel as string || pricingModels?.[0]?.value;
                    const shouldShow = condField.showWhen.includes(currentModel);
                    
                    if (!shouldShow) return null;
                    
                    // Use FrequencyInput for frequency fields
                    if (condField.type === 'text' && condField.key === 'frequency') {
                      return (
                        <FrequencyInput
                          key={condField.key}
                          value={hubPrice.pricing[condField.key] as string || ''}
                          onChange={(value) =>
                            updateHubPricing(index, {
                              pricing: {
                                ...hubPrice.pricing,
                                [condField.key]: value,
                              },
                            })
                          }
                          label={condField.label}
                          className="w-52 flex-shrink-0"
                          showQuickOptions={false}
                          compact={true}
                        />
                      );
                    }
                    
                    if (condField.type === 'text') {
                      return (
                        <div key={condField.key} className="w-52 flex-shrink-0">
                          <Label className="text-xs mb-2 block">{condField.label}</Label>
                          <Input
                            type="text"
                            value={hubPrice.pricing[condField.key] as string || ''}
                            onChange={(e) =>
                              updateHubPricing(index, {
                                pricing: {
                                  ...hubPrice.pricing,
                                  [condField.key]: e.target.value,
                                },
                              })
                            }
                            placeholder={condField.placeholder || ''}
                            pattern={condField.pattern}
                            title={condField.patternMessage}
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <div key={condField.key} className="w-52 flex-shrink-0">
                        <Label className="text-xs mb-2 block">{condField.label}</Label>
                        <Select
                          value={hubPrice.pricing[condField.key] as string || condField.options?.[0]?.value}
                          onValueChange={(value) =>
                            updateHubPricing(index, {
                              pricing: {
                                ...hubPrice.pricing,
                                [condField.key]: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {condField.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                  {/* Total Price Display */}
                  {(() => {
                    const total = calculateTotal(hubPrice.pricing);
                    if (total !== null && total > 0) {
                      return (
                        <div className="w-32 flex-shrink-0">
                          <Label className="text-xs mb-2 block">Total</Label>
                          <div className="h-10 px-3 flex items-center bg-green-50 border border-green-200 rounded-md">
                            <span className="text-sm font-semibold text-green-700">
                              ${total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHubPricing}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Program Pricing
        </Button>
      </div>
    </div>
  );
};

