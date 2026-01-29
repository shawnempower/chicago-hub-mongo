/**
 * Campaign Objectives Step - Step 2 of Campaign Builder
 * 
 * Collects campaign goals, targeting, and channel preferences
 * Budget is derived from the selected package price
 */

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Info, Sparkles, Package as PackageIcon } from 'lucide-react';
import { campaignsApi } from '@/api/campaigns';

const CAMPAIGN_GOALS = [
  { value: 'brand awareness', label: 'Brand Awareness' },
  { value: 'lead generation', label: 'Lead Generation' },
  { value: 'community engagement', label: 'Community Engagement' },
  { value: 'event promotion', label: 'Event Promotion' },
  { value: 'product launch', label: 'Product Launch' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'advocacy', label: 'Advocacy/Public Affairs' },
];

const AVAILABLE_CHANNELS = [
  { value: 'print', label: 'Print', description: 'Newspaper & magazine ads' },
  { value: 'website', label: 'Website', description: 'Digital display & native ads' },
  { value: 'newsletter', label: 'Newsletter', description: 'Email newsletter sponsorships' },
  { value: 'radio', label: 'Radio', description: 'Radio spot ads' },
  { value: 'podcast', label: 'Podcast', description: 'Podcast sponsorships' },
  { value: 'social', label: 'Social Media', description: 'Sponsored posts' },
  { value: 'events', label: 'Events', description: 'Event sponsorships' },
  { value: 'streaming', label: 'Streaming Video', description: 'Video ads' },
];

interface CampaignObjectivesStepProps {
  formData: {
    primaryGoal: string;
    targetAudience: string;
    geographicTarget: string[];
    channels: string[];
    includeAllOutlets: boolean;
    algorithm?: string;
    inventorySelectionMethod?: 'ai' | 'package';
    selectedPackageId?: string;
  };
  updateFormData: (updates: Partial<CampaignObjectivesStepProps['formData']>) => void;
}

export function CampaignObjectivesStep({ formData, updateFormData }: CampaignObjectivesStepProps) {
  const [algorithms, setAlgorithms] = useState<Array<{ id: string; name: string; description: string; icon: string }>>([]);
  const [loadingAlgorithms, setLoadingAlgorithms] = useState(true);
  
  // Feature flag for AI selection - set to false to disable
  const AI_SELECTION_ENABLED = false;

  useEffect(() => {
    const fetchAlgorithms = async () => {
      try {
        const result = await campaignsApi.getAlgorithms();
        setAlgorithms(result.algorithms);
        
        // Set default algorithm if not set
        if (!formData.algorithm && result.algorithms.length > 0) {
          updateFormData({ algorithm: result.algorithms[0].id });
        }
      } catch (error) {
        console.error('Failed to fetch algorithms:', error);
      } finally {
        setLoadingAlgorithms(false);
      }
    };
    
    fetchAlgorithms();
  }, []);

  const handleChannelToggle = (channelValue: string, checked: boolean) => {
    if (checked) {
      updateFormData({ channels: [...formData.channels, channelValue] });
    } else {
      updateFormData({ channels: formData.channels.filter(c => c !== channelValue) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Inventory Selection Method - FIRST */}
      <div className="space-y-4 pb-6 border-b-2">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-base font-semibold font-sans">How would you like to select inventory?</h3>
          <span className="text-red-500">*</span>
        </div>
        
        <RadioGroup
          value={formData.inventorySelectionMethod || 'package'}
          onValueChange={(value: 'ai' | 'package') => {
            if (!AI_SELECTION_ENABLED && value === 'ai') return;
            updateFormData({ inventorySelectionMethod: value });
          }}
          className="space-y-3"
        >
          {/* AI Selection Option */}
          <div
            className={`p-4 rounded-lg border-2 transition-all ${
              AI_SELECTION_ENABLED
                ? (formData.inventorySelectionMethod || 'package') === 'ai'
                  ? 'border-purple-500 bg-purple-50 cursor-pointer'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer'
                : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
            onClick={() => {
              if (AI_SELECTION_ENABLED) {
                updateFormData({ inventorySelectionMethod: 'ai', selectedPackageId: undefined });
              }
            }}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem 
                value="ai" 
                id="method-ai" 
                className="mt-1" 
                disabled={!AI_SELECTION_ENABLED}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className={`h-5 w-5 ${AI_SELECTION_ENABLED ? 'text-purple-600' : 'text-gray-400'}`} />
                  <Label 
                    htmlFor="method-ai" 
                    className={`font-semibold text-sm ${AI_SELECTION_ENABLED ? 'cursor-pointer' : 'cursor-not-allowed text-gray-500'}`}
                  >
                    AI-Powered Selection
                  </Label>
                  {!AI_SELECTION_ENABLED && (
                    <span className="text-xs text-gray-500 font-normal">(Coming Soon)</span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${AI_SELECTION_ENABLED ? 'text-gray-600' : 'text-gray-400'}`}>
                  Let AI intelligently select publications and inventory based on your channels, budget, and goals.
                </p>
              </div>
            </div>
          </div>

          {/* Package Selection Option */}
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.inventorySelectionMethod === 'package'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
            }`}
            onClick={() => updateFormData({ inventorySelectionMethod: 'package' })}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="package" id="method-package" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <PackageIcon className="h-5 w-5 text-green-600" />
                  <Label htmlFor="method-package" className="cursor-pointer font-semibold text-sm">
                    Use Pre-Built Package
                  </Label>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Select from pre-configured packages with proven publication combinations and pricing.
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Campaign Goal */}
      <div className="space-y-2">
        <Label htmlFor="primaryGoal">Primary Campaign Goal <span className="text-red-500">*</span></Label>
        <Select
          value={formData.primaryGoal}
          onValueChange={(value) => updateFormData({ primaryGoal: value })}
        >
          <SelectTrigger id="primaryGoal">
            <SelectValue placeholder="Select primary goal" />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_GOALS.map(goal => (
              <SelectItem key={goal.value} value={goal.value}>
                {goal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience">Target Audience <span className="text-red-500">*</span></Label>
        <Textarea
          id="targetAudience"
          placeholder="Describe your target audience (demographics, interests, behaviors)..."
          value={formData.targetAudience}
          onChange={(e) => updateFormData({ targetAudience: e.target.value })}
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          Example: "Small business owners in Chicago, ages 30-55, interested in local commerce"
        </p>
      </div>

      {/* Channels - Only show for AI selection */}
      {(formData.inventorySelectionMethod || 'package') === 'ai' && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Channels <span className="text-red-500">*</span></h3>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => {
                const allChannels = AVAILABLE_CHANNELS.map(c => c.value);
                updateFormData({ channels: formData.channels.length === allChannels.length ? [] : allChannels });
              }}
            >
              {formData.channels.length === AVAILABLE_CHANNELS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE_CHANNELS.map(channel => (
              <div
                key={channel.value}
                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={channel.value}
                  checked={formData.channels.includes(channel.value)}
                  onCheckedChange={(checked) => handleChannelToggle(channel.value, checked as boolean)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={channel.value}
                    className="cursor-pointer font-medium"
                  >
                    {channel.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {channel.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Algorithm Selection - Only show for AI selection */}
      {(formData.inventorySelectionMethod || 'package') === 'ai' && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-semibold font-sans">AI Campaign Strategy</h3>
          </div>
          
          {loadingAlgorithms ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Loading algorithms...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {algorithms.map((algo) => {
                const isSelected = formData.algorithm === algo.id;
                const selectedAlgo = algorithms.find(a => a.id === formData.algorithm);
                
                return (
                  <div
                    key={algo.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                    onClick={() => updateFormData({ algorithm: algo.id })}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-0.5">{algo.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-gray-900 font-sans">{algo.name}</h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 font-sans">{algo.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Press Forward Option - Only show for AI selection */}
      {(formData.inventorySelectionMethod || 'package') === 'ai' && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm text-blue-900 font-sans">Include All Outlets (Press Forward)</h3>
                <Info className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs text-blue-800 font-sans">
                Support the entire local news ecosystem by including all available outlets with hub inventory. 
                This approach prioritizes comprehensive community coverage over traditional efficiency metrics.
              </p>
            </div>
            <Switch
              checked={formData.includeAllOutlets}
              onCheckedChange={(checked) => updateFormData({ includeAllOutlets: checked })}
            />
          </div>
          
          {!formData.includeAllOutlets && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 font-sans">
                <strong>Note:</strong> When this is disabled, the AI will optimize for efficiency and may exclude 
                smaller outlets. This goes against Press Forward principles but may fit tighter budget constraints.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Package Info - Show when package method is selected */}
      {formData.inventorySelectionMethod === 'package' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-900 font-medium mb-1">
                Using Pre-Built Package
              </p>
              <p className="text-sm text-green-800">
                You'll select from existing hub packages in the next step. The package's publications, 
                channels, and inventory are already configured, so you don't need to select channels or algorithms here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


