import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Mail, Phone, Globe, Target, Palette, TrendingUp } from "lucide-react";
import { DocumentManager } from "./DocumentManager";
import { calculateDocumentCompletionScore } from "@/utils/documentUtils";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  role: string | null;
  phone: string | null;
  company_website: string | null;
  industry: string | null;
  company_size: string | null;
  marketing_goals: string[] | null;
  target_audience: string | null;
  brand_voice: string | null;
  profile_completion_score: number | null;
}

const INDUSTRY_OPTIONS = [
  "Technology", "Healthcare", "Finance", "Education", "Retail", "Manufacturing",
  "Real Estate", "Food & Beverage", "Fashion", "Automotive", "Entertainment",
  "Non-profit", "Professional Services", "Other"
];

const COMPANY_SIZE_OPTIONS = [
  "1-10 employees", "11-50 employees", "51-200 employees", 
  "201-500 employees", "501-1000 employees", "1000+ employees"
];

const MARKETING_GOALS_OPTIONS = [
  "Brand Awareness", "Lead Generation", "Customer Acquisition", "Customer Retention",
  "Product Launch", "Event Promotion", "Thought Leadership", "Crisis Management"
];

export function ProfileManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfile(data || {
        id: '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        company_name: user.user_metadata?.company_name || '',
        role: null,
        phone: null,
        company_website: null,
        industry: null,
        company_size: null,
        marketing_goals: null,
        target_audience: null,
        brand_voice: null,
        profile_completion_score: 0
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionScore = async (profile: Profile): Promise<number> => {
    const fields = [
      profile.first_name, profile.last_name, profile.company_name, 
      profile.role, profile.phone, profile.company_website, 
      profile.industry, profile.company_size, profile.target_audience, 
      profile.brand_voice
    ];
    const marketingGoalsScore = profile.marketing_goals && profile.marketing_goals.length > 0 ? 1 : 0;
    const filledFields = fields.filter(field => field && field.trim() !== '').length + marketingGoalsScore;
    const profileScore = Math.round((filledFields / (fields.length + 1)) * 80); // Profile contributes 80%
    
    const documentScore = await calculateDocumentCompletionScore(user?.id || ""); // Documents contribute 20%
    
    return Math.min(100, profileScore + documentScore);
  };

  const refreshCompletionScore = async () => {
    if (!profile || !user?.id) return;
    
    const newScore = await calculateCompletionScore(profile);
    setProfile(prev => prev ? { ...prev, profile_completion_score: newScore } : null);
  };

  const saveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const completionScore = await calculateCompletionScore(profile);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          company_name: profile.company_name,
          role: profile.role,
          phone: profile.phone,
          company_website: profile.company_website,
          industry: profile.industry,
          company_size: profile.company_size,
          marketing_goals: profile.marketing_goals,
          target_audience: profile.target_audience,
          brand_voice: profile.brand_voice,
          profile_completion_score: completionScore
        });

      if (error) throw error;

      setProfile({ ...profile, profile_completion_score: completionScore });

      // Trigger website analysis if company_website is provided
      if (profile.company_website) {
        triggerWebsiteAnalysis(profile.company_website);
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully."
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerWebsiteAnalysis = async (websiteUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('website-extractor', {
        body: { 
          websiteUrl: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
          userId: user?.id 
        },
      });

      if (error) {
        console.error('Website analysis error:', error);
        return;
      }

      if (data?.success) {
        toast({
          title: "Website analyzed",
          description: "Your brand context has been enhanced with website insights.",
        });
        // Reload profile to show updated website analysis
        loadProfile();
      }
    } catch (error) {
      console.error('Error analyzing website:', error);
    }
  };

  const updateProfile = (field: keyof Profile, value: string | string[] | null) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const toggleMarketingGoal = (goal: string) => {
    if (!profile) return;
    const currentGoals = profile.marketing_goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    updateProfile('marketing_goals', newGoals);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completionScore = profile?.profile_completion_score || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-2">Brand Profile Management</h2>
        <p className="body-large">Complete your brand profile to help our AI create better campaigns for you.</p>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{completionScore}%</span>
          </div>
          <Progress value={completionScore} className="h-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile?.first_name || ''}
                  onChange={(e) => updateProfile('first_name', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile?.last_name || ''}
                  onChange={(e) => updateProfile('last_name', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile?.phone || ''}
                onChange={(e) => updateProfile('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed from the dashboard
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={profile?.company_name || ''}
                onChange={(e) => updateProfile('company_name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div>
              <Label htmlFor="role">Job Title/Role</Label>
              <Input
                id="role"
                value={profile?.role || ''}
                onChange={(e) => updateProfile('role', e.target.value)}
                placeholder="e.g., Marketing Manager, Media Buyer"
              />
            </div>

            <div>
              <Label htmlFor="companyWebsite">Company Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyWebsite"
                  value={profile?.company_website || ''}
                  onChange={(e) => updateProfile('company_website', e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select 
                  value={profile?.industry || ''} 
                  onValueChange={(value) => updateProfile('industry', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="companySize">Company Size</Label>
                <Select 
                  value={profile?.company_size || ''} 
                  onValueChange={(value) => updateProfile('company_size', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing Goals */}
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Marketing Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Primary Marketing Objectives</Label>
              <p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
              <div className="grid grid-cols-2 gap-2">
                {MARKETING_GOALS_OPTIONS.map((goal) => (
                  <Button
                    key={goal}
                    variant={profile?.marketing_goals?.includes(goal) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMarketingGoal(goal)}
                    className="justify-start text-left h-auto p-3"
                  >
                    <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-xs">{goal}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Profile */}
        <Card className="outlet-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-accent" />
              Brand Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Textarea
                id="targetAudience"
                value={profile?.target_audience || ''}
                onChange={(e) => updateProfile('target_audience', e.target.value)}
                placeholder="Describe your ideal customers, demographics, interests..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="brandVoice">Brand Voice & Personality</Label>
              <Textarea
                id="brandVoice"
                value={profile?.brand_voice || ''}
                onChange={(e) => updateProfile('brand_voice', e.target.value)}
                placeholder="Describe your brand's tone, personality, values, and communication style..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Management */}
        <DocumentManager onDocumentChange={refreshCompletionScore} />
      </div>

      <div className="flex justify-center pt-4">
        <Button 
          onClick={saveProfile} 
          disabled={saving}
          size="lg"
          className="px-8"
        >
          {saving ? 'Saving Profile...' : 'Save Brand Profile'}
        </Button>
      </div>
    </div>
  );
}