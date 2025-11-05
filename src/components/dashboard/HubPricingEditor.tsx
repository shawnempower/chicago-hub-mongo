import React, { useState } from 'react';
import { Plus, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FrequencyInput } from './FrequencyInput';

// Updated structure: pricing can be a single tier (object) or multiple tiers (array)
export interface HubPrice {
  hubId: string;
  hubName: string;
  pricing: {
    [key: string]: number | string;
  } | Array<{
    [key: string]: number | string;
  }>;
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
  allowMultipleDefaultPricing?: boolean;
  onDefaultPricingChange: (pricing: { [key: string]: number | string } | DefaultPrice[]) => void;
  onHubPricingChange: (hubPricing: HubPrice[]) => void;
}

// Available hubs
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
  const [expandedHubIndexes, setExpandedHubIndexes] = useState<Set<number>>(new Set());
  
  const defaultPricingArray: DefaultPrice[] = Array.isArray(defaultPricing) 
    ? defaultPricing 
    : [{ pricing: defaultPricing }];

  const normalizePricingToArray = (pricing: HubPrice['pricing']): Array<{ [key: string]: number | string }> => {
    return Array.isArray(pricing) ? pricing : [pricing];
  };

  const isMultiTier = (pricing: HubPrice['pricing']): boolean => {
    return Array.isArray(pricing) && pricing.length > 1;
  };

  const toggleHubExpanded = (index: number) => {
    const newExpanded = new Set(expandedHubIndexes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHubIndexes(newExpanded);
  };

  const calculateTotal = (pricing: { [key: string]: number | string }): number | null => {
    const flatRate = pricing.flatRate as number;
    const frequency = pricing.frequency as string;
    const pricingModel = pricing.pricingModel as string;

    if (pricingModel === 'contact' || !flatRate) {
      return null;
    }

    if (!frequency) {
      return flatRate;
    }

    const match = frequency.match(/^(\d+)x$/);
    if (match) {
      const multiplier = parseInt(match[1], 10);
      return flatRate * multiplier;
    }

    return flatRate;
  };

  const addDefaultPricing = () => {
    const defaultPricingModel = pricingModels?.[0]?.value;
    const newDefaultPrice: DefaultPrice = {
      pricing: {
        ...(defaultPricingModel && { pricingModel: defaultPricingModel }),
      },
    };
    const updated = [...defaultPricingArray, newDefaultPrice];
    onDefaultPricingChange(updated);
  };

  const removeDefaultPricing = (index: number) => {
    if (defaultPricingArray.length <= 1) return;
    const updated = [...defaultPricingArray];
    updated.splice(index, 1);
    
    if (updated.length === 1) {
      onDefaultPricingChange(updated[0].pricing);
    } else {
      onDefaultPricingChange(updated);
    }
  };

  const updateDefaultPricing = (index: number, pricing: { [key: string]: number | string }) => {
    const updated = [...defaultPricingArray];
    updated[index] = { pricing };
    
    if (updated.length === 1) {
      onDefaultPricingChange(updated[0].pricing);
    } else {
      onDefaultPricingChange(updated);
    }
  };

  const addHubPricing = () => {
    const defaultHub = AVAILABLE_HUBS[0];
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
    // Auto-expand new hub
    const newExpanded = new Set(expandedHubIndexes);
    newExpanded.add(hubPricing.length);
    setExpandedHubIndexes(newExpanded);
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

  const addTierToHub = (hubIndex: number) => {
    const hubPrice = hubPricing[hubIndex];
    const pricingArray = normalizePricingToArray(hubPrice.pricing);
    const defaultPricingModel = pricingModels?.[0]?.value;
    
    const newTier = {
      ...(defaultPricingModel && { pricingModel: defaultPricingModel }),
    };
    
    const updatedPricing = [...pricingArray, newTier];
    updateHubPricing(hubIndex, { pricing: updatedPricing });
    
    const newExpanded = new Set(expandedHubIndexes);
    newExpanded.add(hubIndex);
    setExpandedHubIndexes(newExpanded);
  };

  const removeTierFromHub = (hubIndex: number, tierIndex: number) => {
    const hubPrice = hubPricing[hubIndex];
    const pricingArray = normalizePricingToArray(hubPrice.pricing);
    
    if (pricingArray.length <= 1) return;
    
    const updatedPricing = pricingArray.filter((_, idx) => idx !== tierIndex);
    updateHubPricing(hubIndex, { 
      pricing: updatedPricing.length === 1 ? updatedPricing[0] : updatedPricing 
    });
  };

  const updateHubTier = (hubIndex: number, tierIndex: number, tierUpdates: { [key: string]: number | string }) => {
    const hubPrice = hubPricing[hubIndex];
    const pricingArray = normalizePricingToArray(hubPrice.pricing);
    
    const updatedPricing = pricingArray.map((tier, idx) => 
      idx === tierIndex ? { ...tier, ...tierUpdates } : tier
    );
    
    updateHubPricing(hubIndex, { 
      pricing: updatedPricing.length === 1 ? updatedPricing[0] : updatedPricing 
    });
  };

  return (
    <div className="space-y-4">
      {/* Separator */}
      <div className="border-t pt-4 mt-6" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Price</Label>
          <button
            type="button"
            onClick={addHubPricing}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Program
          </button>
        </div>

        {/* Standard Pricing Table */}
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#FAFAFA' }}>
                <th className="text-left px-4 py-2 text-[12px] font-normal text-gray-700">
                  Standard Pricing Tiers
                </th>
                <th className="text-left px-4 py-2 text-[12px] font-normal text-gray-700">
                  Pricing Model
                </th>
                {conditionalFields && conditionalFields.length > 0 && (
                  <th className="text-left px-4 py-2 text-[12px] font-normal text-gray-700">
                    {conditionalFields[0].label}
                  </th>
                )}
                <th className="text-left px-4 py-2 text-[12px] font-normal text-gray-700">
                  Total
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {defaultPricingArray.map((defaultPrice, defaultIndex) => {
                const currentModel = defaultPrice.pricing.pricingModel as string || pricingModels?.[0]?.value;
                const shouldShowConditional = conditionalFields?.some(f => f.showWhen.includes(currentModel));
                const total = calculateTotal(defaultPrice.pricing);

                return (
                  <tr key={`default-${defaultIndex}`} className="border-t">
                    <td className="px-4 py-2">
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-7 border-0 bg-transparent shadow-none hover:bg-gray-100 focus:border focus:bg-background focus:shadow-sm"
                          value={defaultPrice.pricing.flatRate || ''}
                          onChange={(e) =>
                            updateDefaultPricing(defaultIndex, {
                              ...defaultPrice.pricing,
                              flatRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {pricingModels && (
                        <Select
                          value={defaultPrice.pricing.pricingModel as string || pricingModels[0]?.value}
                          onValueChange={(value) =>
                            updateDefaultPricing(defaultIndex, {
                              ...defaultPrice.pricing,
                              pricingModel: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-48 border-0 bg-transparent shadow-none hover:bg-gray-100 data-[state=open]:border data-[state=open]:bg-background data-[state=open]:shadow-sm">
                            <SelectValue className="flex-1" />
                          </SelectTrigger>
                          <SelectContent>
                            {pricingModels.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    {conditionalFields && conditionalFields.length > 0 && (
                      <td className="px-4 py-2">
                        {shouldShowConditional && conditionalFields[0].key === 'frequency' ? (
                          <FrequencyInput
                            value={defaultPrice.pricing.frequency as string || ''}
                            onChange={(value) =>
                              updateDefaultPricing(defaultIndex, {
                                ...defaultPrice.pricing,
                                frequency: value,
                              })
                            }
                            className="w-32"
                            showQuickOptions={false}
                            compact={true}
                          />
                        ) : (
                          <div className="w-32"></div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      {total !== null && total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                            <span className="text-sm font-semibold text-gray-400">
                              ${total.toLocaleString()}
                            </span>
                          </div>
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex items-center">
                                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs p-3" sideOffset={8}>
                                <p className="text-xs mb-2">Total (Base Price × Frequency)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      {allowMultipleDefaultPricing && defaultPricingArray.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeDefaultPricing(defaultIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {allowMultipleDefaultPricing && (
              <tfoot className="bg-white">
                <tr className="border-t">
                  <td colSpan={5} className="px-4 py-2">
                    <button
                      type="button"
                      onClick={addDefaultPricing}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Price
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Hub Pricing Tables */}
        {hubPricing.map((hubPrice, hubIndex) => {
          const pricingTiers = normalizePricingToArray(hubPrice.pricing);
          const isExpanded = expandedHubIndexes.has(hubIndex);
          const columnCount = conditionalFields && conditionalFields.length > 0 ? 5 : 4;
          
          return (
            <div key={hubIndex} className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  {/* Top Header with Hub Selector and Controls */}
                  <tr style={{ backgroundColor: '#FAFAFA' }} className="border-b">
                    <td colSpan={columnCount} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <Select
                          value={hubPrice.hubId}
                          onValueChange={(value) => updateHubSelection(hubIndex, value)}
                        >
                          <SelectTrigger className="w-64 border-0 bg-transparent shadow-none hover:bg-gray-100 data-[state=open]:border data-[state=open]:bg-background data-[state=open]:shadow-sm">
                            <SelectValue className="flex-1" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_HUBS.map((hub) => (
                              <SelectItem key={hub.id} value={hub.id}>
                                {hub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeHubPricing(hubIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleHubExpanded(hubIndex)}
                            className="h-8 px-2 hover:bg-gray-200 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {pricingTiers.map((tier, tierIndex) => {
                    if (!isExpanded) return null;
                    
                    const currentModel = tier.pricingModel as string || pricingModels?.[0]?.value;
                    const shouldShowConditional = conditionalFields?.some(f => f.showWhen.includes(currentModel));
                    const total = calculateTotal(tier);

                    return (
                      <tr key={tierIndex} className="border-t">
                        <td className="px-4 py-2">
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                              $
                            </span>
                            <Input
                              type="number"
                              className="pl-7 border-0 bg-transparent shadow-none hover:bg-gray-100 focus:border focus:bg-background focus:shadow-sm"
                              value={tier.flatRate || ''}
                              onChange={(e) =>
                                updateHubTier(hubIndex, tierIndex, {
                                  ...tier,
                                  flatRate: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {pricingModels && (
                            <Select
                              value={tier.pricingModel as string || pricingModels[0]?.value}
                              onValueChange={(value) =>
                                updateHubTier(hubIndex, tierIndex, {
                                  ...tier,
                                  pricingModel: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-48 border-0 bg-transparent shadow-none hover:bg-gray-100 data-[state=open]:border data-[state=open]:bg-background data-[state=open]:shadow-sm">
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
                          )}
                        </td>
                          {conditionalFields && conditionalFields.length > 0 && (
                          <td className="px-4 py-2">
                            {shouldShowConditional && conditionalFields[0].key === 'frequency' ? (
                              <FrequencyInput
                                value={tier.frequency as string || ''}
                                onChange={(value) =>
                                  updateHubTier(hubIndex, tierIndex, {
                                    ...tier,
                                    frequency: value,
                                  })
                                }
                                className="w-32"
                                showQuickOptions={false}
                                compact={true}
                              />
                            ) : (
                              <div className="w-32"></div>
                            )}
                          </td>
                          )}
                        <td className="px-4 py-2">
                          {total !== null && total > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                                <span className="text-sm font-semibold text-gray-700">
                                  ${total.toLocaleString()}
                                </span>
                              </div>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex items-center">
                                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs p-3" sideOffset={8}>
                                    <p className="text-xs mb-2">Total (Base Price × Frequency)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (pricingTiers.length === 1) {
                                removeHubPricing(hubIndex);
                              } else {
                                removeTierFromHub(hubIndex, tierIndex);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {isExpanded && (
                  <tfoot className="bg-white">
                    <tr className="border-t">
                      <td colSpan={columnCount} className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => addTierToHub(hubIndex)}
                          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Price
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};
