import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { useAuth } from '@/contexts/CustomAuthContext';

interface LeadCaptureFormProps {
  onSuccess?: () => void;
  conversationContext?: any;
  suggestedPackages?: number[];
  suggestedOutlets?: string[];
}

export const LeadCaptureForm = ({ 
  onSuccess, 
  conversationContext,
  suggestedPackages = [],
  suggestedOutlets = []
}: LeadCaptureFormProps) => {
  const { user } = useAuth();
  const { submitLead, loading } = useLeadCapture();
  
  const [formData, setFormData] = useState({
    businessName: '',
    websiteUrl: '',
    contactName: user?.firstName || '',
    contactEmail: user?.email || '',
    contactPhone: '',
    marketingGoals: [] as string[],
    budgetRange: '',
    timeline: '',
  });

  const marketingGoalOptions = [
    'Increase brand awareness',
    'Drive sales and revenue',
    'Generate leads',
    'Launch new product/service',
    'Target local audience',
    'Build community presence',
    'Promote events',
    'Other'
  ];

  const handleMarketingGoalChange = (goal: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      marketingGoals: checked 
        ? [...prev.marketingGoals, goal]
        : prev.marketingGoals.filter(g => g !== goal)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const leadData = {
      ...formData,
      interestedPackages: suggestedPackages,
      interestedOutlets: suggestedOutlets,
      conversationContext
    };

    const result = await submitLead(leadData);
    if (result && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Let's Connect</CardTitle>
        <CardDescription>
          Share your details so we can create a customized advertising strategy for your business.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Business Name *</label>
              <Input
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                required
                placeholder="Your business name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Website URL</label>
              <Input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://yourbusiness.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Your Name *</label>
              <Input
                value={formData.contactName}
                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                required
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Address *</label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                required
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Budget Range</label>
              <Select value={formData.budgetRange} onValueChange={(value) => setFormData(prev => ({ ...prev, budgetRange: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-1000">Under $1,000</SelectItem>
                  <SelectItem value="1000-2500">$1,000 - $2,500</SelectItem>
                  <SelectItem value="2500-5000">$2,500 - $5,000</SelectItem>
                  <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                  <SelectItem value="over-10000">Over $10,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Timeline</label>
            <Select value={formData.timeline} onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="When would you like to start?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediately</SelectItem>
                <SelectItem value="within-month">Within 30 days</SelectItem>
                <SelectItem value="within-quarter">Within 90 days</SelectItem>
                <SelectItem value="planning">Just planning/researching</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Marketing Goals (select all that apply)</label>
            <div className="grid gap-3 md:grid-cols-2">
              {marketingGoalOptions.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={formData.marketingGoals.includes(goal)}
                    onCheckedChange={(checked) => handleMarketingGoalChange(goal, checked as boolean)}
                  />
                  <label htmlFor={goal} className="text-sm">{goal}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit Information'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              We'll review your information and contact you within 1 business day with a customized proposal.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};