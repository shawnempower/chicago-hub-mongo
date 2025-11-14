import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Plus, Trash2, Radio, Clock, Users, Edit } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HubPricingEditor, HubPrice } from '@/components/dashboard/HubPricingEditor';

interface RadioAd {
  name: string;
  adFormat: string;
  spotsPerShow: number;
  pricing?: {
    flatRate?: number;
    pricingModel?: string;
    frequency?: string;
  } | Array<{
    pricing: {
      flatRate?: number;
      pricingModel?: string;
      frequency?: string;
    };
  }>;
  specifications?: {
    duration?: number;
    format?: string;
  };
  available: boolean;
  hubPricing?: HubPrice[];
  performanceMetrics?: {
    occurrencesPerMonth?: number;
    impressionsPerMonth?: number;
    audienceSize?: number;
    guaranteed?: boolean;
  };
}

interface RadioShow {
  showId: string;
  name: string;
  frequency: string;
  daysPerWeek?: number;
  timeSlot: string;
  averageListeners?: number;
  advertisingOpportunities: RadioAd[];
}

interface RadioStation {
  stationId?: string;
  callSign: string;
  frequency?: string;
  format?: string;
  listeners?: number;
  shows?: RadioShow[];
}

interface RadioShowEditorProps {
  station: RadioStation;
  onChange: (station: RadioStation) => void;
  initialShowIndex?: number; // Auto-open this show for editing
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily (7 days/week)', days: 7 },
  { value: 'weekdays', label: 'Weekdays (M-F)', days: 5 },
  { value: 'weekdays-plus-saturday', label: 'M-Sat', days: 6 },
  { value: 'weekdays-plus-sunday', label: 'M-F + Sun', days: 6 },
  { value: 'weekend-only', label: 'Weekends (Sat-Sun)', days: 2 },
  { value: 'saturdays', label: 'Saturdays only', days: 1 },
  { value: 'sundays', label: 'Sundays only', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 1 },
  { value: 'bi-weekly', label: 'Bi-weekly', days: 0.5 },
  { value: 'custom', label: 'Custom schedule', days: 0 },
];

const AD_FORMAT_OPTIONS = [
  { value: '15_second_spot', label: '15-second spot' },
  { value: '30_second_spot', label: '30-second spot' },
  { value: '60_second_spot', label: '60-second spot' },
  { value: 'live_read', label: 'Live read' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'traffic_weather_sponsor', label: 'Traffic/Weather sponsor' },
];

// Helper function to infer ad format from duration
const inferAdFormat = (ad: RadioAd): string => {
  if (ad.adFormat) return ad.adFormat;
  
  // Try to infer from duration
  const duration = ad.specifications?.duration;
  if (duration === 15) return '15_second_spot';
  if (duration === 30) return '30_second_spot';
  if (duration === 60) return '60_second_spot';
  
  // Default
  return '30_second_spot';
};

export const RadioShowEditor = forwardRef<{ openShowDialog: (show: RadioShow) => void }, RadioShowEditorProps>(
  ({ station, onChange, initialShowIndex }, ref) => {
  const [editingShow, setEditingShow] = useState<RadioShow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openShowDialog = (show: RadioShow) => {
    setEditingShow(JSON.parse(JSON.stringify(show))); // Deep clone
    setIsDialogOpen(true);
  };

  // Expose openShowDialog method to parent
  useImperativeHandle(ref, () => ({
    openShowDialog
  }));

  // Auto-open the specified show if initialShowIndex is provided
  useEffect(() => {
    if (initialShowIndex !== undefined && station.shows && station.shows[initialShowIndex]) {
      openShowDialog(station.shows[initialShowIndex]);
    }
  }, [initialShowIndex]); // Only run when initialShowIndex changes

  const closeShowDialog = () => {
    setIsDialogOpen(false);
    setEditingShow(null);
  };

  const saveShowChanges = () => {
    if (!editingShow) return;
    
    const updatedShows = (station.shows || []).map(show =>
      show.showId === editingShow.showId ? editingShow : show
    );
    
    onChange({ ...station, shows: updatedShows });
    closeShowDialog();
  };

  const addShow = () => {
    const newShow: RadioShow = {
      showId: `show-${Date.now()}`,
      name: 'New Show',
      frequency: 'weekdays',
      daysPerWeek: 5,
      timeSlot: 'M-F 6AM-9AM',
      averageListeners: station.listeners || 0,
      advertisingOpportunities: [],
    };

    const updatedStation = {
      ...station,
      shows: [...(station.shows || []), newShow],
    };
    onChange(updatedStation);
    
    // Open dialog for the new show
    openShowDialog(newShow);
  };

  const updateShowField = (field: keyof RadioShow, value: any) => {
    if (!editingShow) return;
    setEditingShow({ ...editingShow, [field]: value });
  };

  const deleteShow = (showId: string) => {
    const updatedShows = (station.shows || []).filter(show => show.showId !== showId);
    onChange({ ...station, shows: updatedShows });
    closeShowDialog();
  };

  const addAdToShow = () => {
    if (!editingShow) return;
    
    const newAd: RadioAd = {
      name: 'New Ad Opportunity',
      adFormat: '30_second_spot',
      spotsPerShow: 1,
      pricing: {
        flatRate: 0,
        pricingModel: 'per_spot',
      },
      specifications: {
        duration: 30,
      },
      available: true,
    };

    setEditingShow({
      ...editingShow,
      advertisingOpportunities: [...editingShow.advertisingOpportunities, newAd],
    });
  };

  const updateAd = (adIndex: number, updates: Partial<RadioAd>) => {
    if (!editingShow) return;
    
    const updatedAds = [...editingShow.advertisingOpportunities];
    updatedAds[adIndex] = { ...updatedAds[adIndex], ...updates };
    
    // Sync format with duration for backward compatibility
    if (updates.adFormat && !updates.specifications) {
      const duration = updates.adFormat === '15_second_spot' ? 15 :
                      updates.adFormat === '30_second_spot' ? 30 :
                      updates.adFormat === '60_second_spot' ? 60 : undefined;
      if (duration) {
        updatedAds[adIndex].specifications = {
          ...updatedAds[adIndex].specifications,
          duration
        };
      }
    }
    
    setEditingShow({ ...editingShow, advertisingOpportunities: updatedAds });
  };

  const deleteAd = (adIndex: number) => {
    if (!editingShow) return;
    
    const updatedAds = editingShow.advertisingOpportunities.filter((_, idx) => idx !== adIndex);
    setEditingShow({ ...editingShow, advertisingOpportunities: updatedAds });
  };

  const calculateMonthlyRevenue = (show: RadioShow, ad: RadioAd): number => {
    const daysPerWeek = show.daysPerWeek || 5;
    const weeksPerMonth = 4.33;
    const showsPerMonth = daysPerWeek * weeksPerMonth;
    const occurrencesPerMonth = showsPerMonth * (ad.spotsPerShow || 1);
    const pricePerSpot = ad.pricing?.flatRate || 0;
    
    return Math.round(occurrencesPerMonth * pricePerSpot);
  };

  const shows = station.shows || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Radio Shows for {station.callSign}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Organize ads by show schedule for accurate revenue forecasting
          </p>
        </div>
        <Button onClick={addShow} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Show
        </Button>
      </div>

      {shows.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <Radio className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">No shows yet</p>
          <p className="text-sm mb-4">Add shows to organize your radio advertising inventory</p>
          <Button onClick={addShow} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Show
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {shows.map((show) => {
            const totalAds = show.advertisingOpportunities.length;
            const totalRevenue = show.advertisingOpportunities.reduce(
              (sum, ad) => sum + calculateMonthlyRevenue(show, ad),
              0
            );

            return (
              <Card key={show.showId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{show.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {show.timeSlot}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {(show.averageListeners || 0).toLocaleString()} listeners
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {totalAds} ad{totalAds !== 1 ? 's' : ''}
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        ${totalRevenue.toLocaleString()}/mo
                      </div>
                    </div>
                    <Button
                      onClick={() => openShowDialog(show)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Show Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Radio Show</DialogTitle>
            <DialogDescription>
              Manage show details and advertising opportunities
            </DialogDescription>
          </DialogHeader>

          {editingShow && (
                  <div className="space-y-4">
                    {/* Show Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Show Name</Label>
                        <Input
                          value={editingShow.name}
                          onChange={(e) => updateShowField('name', e.target.value)}
                          placeholder="e.g., Morning Drive with Perri Small"
                        />
                      </div>

                      <div>
                        <Label>Time Slot</Label>
                        <Input
                          value={editingShow.timeSlot}
                          onChange={(e) => updateShowField('timeSlot', e.target.value)}
                          placeholder="e.g., M-F 6AM-9AM"
                        />
                      </div>

                      <div>
                        <Label>Average Listeners</Label>
                        <Input
                          type="number"
                          value={editingShow.averageListeners || 0}
                          onChange={(e) =>
                            updateShowField('averageListeners', parseInt(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div>
                        <Label>Show Frequency</Label>
                        <Select
                          value={editingShow.frequency}
                          onValueChange={(value) => {
                            const option = FREQUENCY_OPTIONS.find(opt => opt.value === value);
                            setEditingShow({
                              ...editingShow,
                              frequency: value,
                              daysPerWeek: option?.days || 5,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Days per Week</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="7"
                          value={editingShow.daysPerWeek || 5}
                          onChange={(e) =>
                            updateShowField('daysPerWeek', parseFloat(e.target.value) || 5)
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Shows/month: {((editingShow.daysPerWeek || 5) * 4.33).toFixed(1)}
                        </p>
                      </div>
                    </div>

                    {/* Advertising Opportunities */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base">Advertising Opportunities</Label>
                        <Button onClick={addAdToShow} size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Ad
                        </Button>
                      </div>

                      {editingShow.advertisingOpportunities.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                          <p className="text-sm">No ads yet. Click "Add Ad" to create one.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editingShow.advertisingOpportunities.map((ad, adIndex) => {
                            const monthlyRevenue = calculateMonthlyRevenue(editingShow, ad);
                            const occurrencesPerMonth =
                              (editingShow.daysPerWeek || 5) * 4.33 * (ad.spotsPerShow || 1);

                            return (
                              <Card key={adIndex} className="p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                  <div className="md:col-span-2">
                                    <Label className="text-xs">Ad Name</Label>
                                    <Input
                                      value={ad.name}
                                      onChange={(e) =>
                                        updateAd(adIndex, { name: e.target.value })
                                      }
                                      placeholder="e.g., 30-Second Morning Spot"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Format</Label>
                                    <Select
                                      value={inferAdFormat(ad)}
                                      onValueChange={(value) =>
                                        updateAd(adIndex, { adFormat: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select format..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AD_FORMAT_OPTIONS.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Spots per Show</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={ad.spotsPerShow}
                                      onChange={(e) =>
                                        updateAd(adIndex, {
                                          spotsPerShow: parseInt(e.target.value) || 1,
                                        })
                                      }
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      {occurrencesPerMonth.toFixed(1)}/mo
                                    </p>
                                  </div>

                                  <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-green-600">
                                        Monthly Potential: ${monthlyRevenue.toLocaleString()}
                                      </p>
                                    </div>
                                    <Button
                                      onClick={() => deleteAd(adIndex)}
                                      variant="destructive"
                                      size="sm"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Hub Pricing Section */}
                                <div className="mt-3 pt-3 border-t">
                                  <HubPricingEditor
                                    defaultPricing={ad.pricing || {}}
                                    hubPricing={ad.hubPricing || []}
                                    pricingFields={[
                                      { key: 'flatRate', label: 'Price per Spot', placeholder: '150' }
                                    ]}
                                    pricingModels={[
                                      { value: 'per_spot', label: '/spot' },
                                      { value: 'contact', label: 'Contact for pricing' }
                                    ]}
                                    conditionalFields={[
                                      {
                                        key: 'frequency',
                                        label: 'Frequency',
                                        type: 'text',
                                        showWhen: ['per_spot'],
                                        placeholder: 'e.g., 1x, 4x, 12x',
                                        pattern: '^\\d+x$',
                                        patternMessage: 'Enter a frequency like "1x", "4x", "12x", etc.'
                                      }
                                    ]}
                                    allowMultipleDefaultPricing={true}
                                    onDefaultPricingChange={(pricing) => {
                                      updateAd(adIndex, { pricing });
                                    }}
                                    onHubPricingChange={(hubPricing) => {
                                      updateAd(adIndex, { hubPricing });
                                    }}
                                  />
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Dialog Actions */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        onClick={() => deleteShow(editingShow.showId)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Show
                      </Button>
                      <div className="flex gap-2">
                        <Button onClick={closeShowDialog} variant="outline">
                          Cancel
                        </Button>
                        <Button onClick={saveShowChanges}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

