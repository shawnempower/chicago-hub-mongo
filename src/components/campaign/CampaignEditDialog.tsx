/**
 * Campaign Edit Dialog
 * 
 * Modal for editing campaign basic information (name, advertiser, primary goal)
 * and dates with acknowledgment rules
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useUpdateCampaign } from '@/hooks/useCampaigns';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Loader2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Campaign } from '@/integrations/mongodb/campaignSchema';

const CAMPAIGN_GOALS = [
  { value: 'brand awareness', label: 'Brand Awareness' },
  { value: 'lead generation', label: 'Lead Generation' },
  { value: 'community engagement', label: 'Community Engagement' },
  { value: 'event promotion', label: 'Event Promotion' },
  { value: 'product launch', label: 'Product Launch' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'advocacy', label: 'Advocacy/Public Affairs' },
];

interface CampaignEditDialogProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CampaignEditDialog({ campaign, isOpen, onClose, onSaved }: CampaignEditDialogProps) {
  const { toast } = useToast();
  const { update, updating } = useUpdateCampaign();
  
  // Form state for basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  
  // Date editing state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showDateConfirmation, setShowDateConfirmation] = useState(false);
  const [dateAcknowledged, setDateAcknowledged] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<{
    field: 'startDate' | 'endDate';
    newValue: Date;
    oldValue: Date;
  } | null>(null);

  // Initialize form with campaign data
  useEffect(() => {
    if (campaign && isOpen) {
      setName(campaign.basicInfo?.name || '');
      setDescription(campaign.basicInfo?.description || '');
      setAdvertiserName(campaign.basicInfo?.advertiserName || '');
      setPrimaryGoal(campaign.objectives?.primaryGoal || 'brand awareness');
      setTargetAudience(campaign.objectives?.targetAudience || '');
      setStartDate(campaign.timeline?.startDate ? new Date(campaign.timeline.startDate) : undefined);
      setEndDate(campaign.timeline?.endDate ? new Date(campaign.timeline.endDate) : undefined);
      setDateAcknowledged(false);
    }
  }, [campaign, isOpen]);

  const handleDateChangeRequest = (field: 'startDate' | 'endDate', newDate: Date | undefined) => {
    if (!newDate) return;
    
    const oldDate = field === 'startDate' 
      ? new Date(campaign.timeline?.startDate || '') 
      : new Date(campaign.timeline?.endDate || '');
    
    // Check if date actually changed
    if (format(newDate, 'yyyy-MM-dd') === format(oldDate, 'yyyy-MM-dd')) {
      return;
    }
    
    setPendingDateChange({
      field,
      newValue: newDate,
      oldValue: oldDate
    });
    setShowDateConfirmation(true);
    setDateAcknowledged(false);
  };

  const handleConfirmDateChange = () => {
    if (!pendingDateChange || !dateAcknowledged) return;
    
    if (pendingDateChange.field === 'startDate') {
      setStartDate(pendingDateChange.newValue);
    } else {
      setEndDate(pendingDateChange.newValue);
    }
    
    setShowDateConfirmation(false);
    setPendingDateChange(null);
    setDateAcknowledged(false);
  };

  const handleCancelDateChange = () => {
    setShowDateConfirmation(false);
    setPendingDateChange(null);
    setDateAcknowledged(false);
  };

  const handleSave = async () => {
    if (!campaign._id) return;

    // Validate required fields
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Campaign name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!advertiserName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Advertiser name is required',
        variant: 'destructive',
      });
      return;
    }

    if (startDate && endDate && startDate >= endDate) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Calculate duration if dates changed
      let durationMonths = campaign.timeline?.durationMonths;
      let durationWeeks = campaign.timeline?.durationWeeks;
      
      if (startDate && endDate) {
        const days = differenceInDays(endDate, startDate);
        durationWeeks = Math.ceil(days / 7);
        durationMonths = Math.ceil(days / 30);
      }

      const updates: Partial<Campaign> = {
        basicInfo: {
          ...campaign.basicInfo,
          name: name.trim(),
          description: description.trim(),
          advertiserName: advertiserName.trim(),
        },
        objectives: {
          ...campaign.objectives,
          primaryGoal,
          targetAudience: targetAudience.trim(),
        },
        timeline: {
          ...campaign.timeline,
          startDate: startDate || campaign.timeline?.startDate,
          endDate: endDate || campaign.timeline?.endDate,
          durationMonths,
          durationWeeks,
        },
      };

      await update(campaign._id.toString(), updates);
      
      toast({
        title: 'Campaign Updated',
        description: 'Campaign information has been saved successfully.',
      });
      
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const hasChanges = () => {
    const originalStartDate = campaign.timeline?.startDate ? new Date(campaign.timeline.startDate) : undefined;
    const originalEndDate = campaign.timeline?.endDate ? new Date(campaign.timeline.endDate) : undefined;
    
    return (
      name !== (campaign.basicInfo?.name || '') ||
      description !== (campaign.basicInfo?.description || '') ||
      advertiserName !== (campaign.basicInfo?.advertiserName || '') ||
      primaryGoal !== (campaign.objectives?.primaryGoal || '') ||
      targetAudience !== (campaign.objectives?.targetAudience || '') ||
      (startDate && originalStartDate && format(startDate, 'yyyy-MM-dd') !== format(originalStartDate, 'yyyy-MM-dd')) ||
      (endDate && originalEndDate && format(endDate, 'yyyy-MM-dd') !== format(originalEndDate, 'yyyy-MM-dd'))
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans">Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign details. Date changes require acknowledgment of impact rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Campaign description..."
                rows={3}
              />
            </div>

            {/* Advertiser Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-advertiser" className="text-sm font-medium">
                Advertiser <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-advertiser"
                value={advertiserName}
                onChange={(e) => setAdvertiserName(e.target.value)}
                placeholder="Advertiser or company name"
              />
            </div>

            {/* Primary Goal */}
            <div className="space-y-2">
              <Label htmlFor="edit-goal" className="text-sm font-medium">
                Primary Goal
              </Label>
              <Select value={primaryGoal} onValueChange={setPrimaryGoal}>
                <SelectTrigger id="edit-goal">
                  <SelectValue placeholder="Select primary goal" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_GOALS.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value}>
                      {goal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="edit-audience" className="text-sm font-medium">
                Target Audience
              </Label>
              <Textarea
                id="edit-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Describe target audience (demographics, interests, behaviors)..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Example: "Small business owners in Chicago, ages 30-55, interested in local commerce"
              </p>
            </div>

            {/* Campaign Dates Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Campaign Dates</h4>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-800">
                  <strong>Important:</strong> Changing campaign dates may affect publication orders and delivery schedules.
                  You will be asked to acknowledge the implications before date changes are saved.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && handleDateChangeRequest('startDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && handleDateChangeRequest('endDate', date)}
                        disabled={(date) => startDate ? date <= startDate : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Duration Display */}
              {startDate && endDate && (
                <div className="text-sm text-muted-foreground">
                  Duration: {differenceInDays(endDate, startDate)} days 
                  ({Math.ceil(differenceInDays(endDate, startDate) / 7)} weeks)
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updating || !hasChanges()}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Change Confirmation Dialog */}
      <AlertDialog open={showDateConfirmation} onOpenChange={setShowDateConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirm Date Change
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to change the campaign{' '}
                  <strong>{pendingDateChange?.field === 'startDate' ? 'start date' : 'end date'}</strong>:
                </p>
                
                {pendingDateChange && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium">{format(pendingDateChange.oldValue, 'PPP')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">New:</span>
                      <span className="font-medium text-blue-600">{format(pendingDateChange.newValue, 'PPP')}</span>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  <h4 className="font-semibold text-amber-900 text-sm mb-2">Important Rules:</h4>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Publication orders may need to be regenerated</li>
                    <li>Confirmed placements may require publication re-confirmation</li>
                    <li>Active campaigns with live placements cannot have dates shortened</li>
                    <li>Budget and pricing calculations may be affected</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="acknowledge-date-change"
                    checked={dateAcknowledged}
                    onCheckedChange={(checked) => setDateAcknowledged(checked as boolean)}
                  />
                  <Label 
                    htmlFor="acknowledge-date-change" 
                    className="text-sm cursor-pointer leading-relaxed"
                  >
                    I understand the implications of changing campaign dates and confirm this action.
                  </Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDateChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDateChange}
              disabled={!dateAcknowledged}
              className={cn(!dateAcknowledged && "opacity-50 cursor-not-allowed")}
            >
              Confirm Date Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
