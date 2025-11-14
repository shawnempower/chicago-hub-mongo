/**
 * Campaign Builder Page
 * 
 * Multi-step wizard for creating AI-powered campaigns
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useHubContext } from '@/contexts/HubContext';
import { useAnalyzeCampaign, useCreateCampaign } from '@/hooks/useCampaigns';
import { CampaignAnalysisRequest } from '@/integrations/mongodb/campaignSchema';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2, Eye } from 'lucide-react';

// Step components
import { CampaignBasicsStep } from '@/components/campaign/CampaignBasicsStep';
import { CampaignObjectivesStep } from '@/components/campaign/CampaignObjectivesStep';
import { CampaignTimelineStep } from '@/components/campaign/CampaignTimelineStep';
import { CampaignAnalysisStep } from '@/components/campaign/CampaignAnalysisStep';
import { CampaignReviewStep } from '@/components/campaign/CampaignReviewStep';

interface CampaignFormData {
  // Step 1: Basics
  name: string;
  description: string;
  advertiserName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactCompany: string;
  
  // Step 2: Objectives
  primaryGoal: string;
  targetAudience: string;
  geographicTarget: string[];
  budget: number;
  billingCycle: 'monthly' | 'one-time' | 'quarterly';
  channels: string[];
  includeAllOutlets: boolean;
  algorithm?: string;
  
  // Step 3: Timeline
  startDate: Date | null;
  endDate: Date | null;
}

const INITIAL_FORM_DATA: CampaignFormData = {
  name: '',
  description: '',
  advertiserName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactCompany: '',
  primaryGoal: 'brand awareness',
  targetAudience: '',
  geographicTarget: [],
  budget: 0,
  billingCycle: 'monthly',
  channels: [],
  includeAllOutlets: true,
  algorithm: 'all-inclusive',
  startDate: null,
  endDate: null,
};

const STEPS = [
  { id: 1, title: 'Campaign Basics', description: 'Name and advertiser information' },
  { id: 2, title: 'Campaign Objectives', description: 'Goals, budget, and targeting' },
  { id: 3, title: 'Timeline', description: 'Campaign dates and duration' },
  { id: 4, title: 'AI Analysis', description: 'Intelligent inventory selection' },
  { id: 5, title: 'Review & Create', description: 'Review and finalize campaign' },
];

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHubId, selectedHub } = useHubContext();
  const { analyze, analyzing, result, error: analysisError } = useAnalyzeCampaign();
  const { create, creating } = useCreateCampaign();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>(INITIAL_FORM_DATA);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [editedInventory, setEditedInventory] = useState<any>(null);
  const [inventoryEdited, setInventoryEdited] = useState(false);

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Handle inventory changes from the editor
  const handleInventoryChange = (updatedPublications: any) => {
    setEditedInventory(updatedPublications);
    setInventoryEdited(true);
    
    // Note: We'll recalculate pricing when creating the campaign
    // The inventoryPricing service will handle the calculations
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.advertiserName || !formData.contactName || !formData.contactEmail) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
          return false;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.contactEmail)) {
          toast({
            title: 'Invalid Email',
            description: 'Please enter a valid email address',
            variant: 'destructive',
          });
          return false;
        }
        return true;
        
      case 2:
        if (!formData.targetAudience || formData.budget <= 0 || formData.channels.length === 0) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in target audience, budget, and select at least one channel',
            variant: 'destructive',
          });
          return false;
        }
        return true;
        
      case 3:
        if (!formData.startDate || !formData.endDate) {
          toast({
            title: 'Missing Dates',
            description: 'Please select both start and end dates',
            variant: 'destructive',
          });
          return false;
        }
        if (formData.startDate >= formData.endDate) {
          toast({
            title: 'Invalid Dates',
            description: 'End date must be after start date',
            variant: 'destructive',
          });
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep === 3) {
      // Move to step 4 FIRST to show loading screen
      setCurrentStep(4);
      // Then trigger AI analysis
      await handleAnalyze();
      // Don't increment step again - we're already on step 4
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleAnalyze = async () => {
    if (!selectedHubId || !selectedHub) {
      toast({
        title: 'No Hub Selected',
        description: 'Please select a hub first',
        variant: 'destructive',
      });
      return;
    }

    const request: CampaignAnalysisRequest = {
      hubId: selectedHubId,
      objectives: {
        primaryGoal: formData.primaryGoal,
        targetAudience: formData.targetAudience,
        geographicTarget: formData.geographicTarget,
        budget: {
          totalBudget: formData.budget,
          currency: 'USD',
          billingCycle: formData.billingCycle,
        },
        channels: formData.channels,
      },
      timeline: {
        startDate: formData.startDate!,
        endDate: formData.endDate!,
      },
      includeAllOutlets: formData.includeAllOutlets,
      algorithm: formData.algorithm as any,
    };

    try {
      const analysisResult = await analyze(request);
      // No need to set step here - it's already set in handleNext before calling this
      
      // Auto-save campaign as draft after successful analysis
      if (analysisResult) {
        await handleAutoSave(analysisResult);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAutoSave = async (analysisResult: any) => {
    try {
      const campaignData = {
        hubId: selectedHubId!,
        hubName: selectedHub!.basicInfo.name,
        basicInfo: {
          name: formData.name,
          description: formData.description,
          advertiserName: formData.advertiserName,
          advertiserContact: {
            name: formData.contactName,
            email: formData.contactEmail,
            phone: formData.contactPhone || undefined,
            company: formData.contactCompany || undefined,
          },
        },
        objectives: {
          primaryGoal: formData.primaryGoal,
          targetAudience: formData.targetAudience,
          geographicTarget: formData.geographicTarget,
          budget: {
            totalBudget: formData.budget,
            currency: 'USD',
            billingCycle: formData.billingCycle,
          },
          channels: formData.channels,
        },
        timeline: {
          startDate: formData.startDate!,
          endDate: formData.endDate!,
        },
        selectedInventory: analysisResult.selectedInventory,
        pricing: analysisResult.pricing,
        estimatedPerformance: analysisResult.estimatedPerformance,
        algorithm: analysisResult.algorithm,
        status: 'draft' as const,
      };

      const campaign = await create(campaignData);
      setCreatedCampaignId(campaign._id?.toString() || null);
      
      toast({
        title: 'Campaign Saved',
        description: 'Your campaign has been automatically saved as a draft.',
      });
    } catch (error) {
      console.error('Auto-save error:', error);
      // Don't show error toast for auto-save failure - user can still manually save
      console.warn('Campaign auto-save failed, but analysis succeeded. User can create manually.');
    }
  };

  const handleCreate = async () => {
    if (!result || !selectedHubId || !selectedHub) {
      return;
    }

    const campaignData = {
      hubId: selectedHubId,
      hubName: selectedHub.basicInfo.name,
      basicInfo: {
        name: formData.name,
        description: formData.description,
        advertiserName: formData.advertiserName,
        advertiserContact: {
          name: formData.contactName,
          email: formData.contactEmail,
          phone: formData.contactPhone || undefined,
          company: formData.contactCompany || undefined,
        },
      },
      objectives: {
        primaryGoal: formData.primaryGoal,
        targetAudience: formData.targetAudience,
        geographicTarget: formData.geographicTarget,
        budget: {
          totalBudget: formData.budget,
          currency: 'USD',
          billingCycle: formData.billingCycle,
        },
        channels: formData.channels,
      },
      timeline: {
        startDate: formData.startDate!,
        endDate: formData.endDate!,
      },
      selectedInventory: result.selectedInventory,
      pricing: result.pricing,
      estimatedPerformance: result.estimatedPerformance,
      algorithm: result.algorithm,
      status: 'draft' as const,
    };

    try {
      const campaign = await create(campaignData);
      setCreatedCampaignId(campaign._id?.toString() || null);
      
      toast({
        title: 'Campaign Created!',
        description: 'Your campaign has been created successfully.',
      });
      
      // Move to success step
      setCurrentStep(5);
    } catch (error) {
      console.error('Create error:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header 
          onAssistantClick={() => {}}
          onSurveyClick={() => {}}
          showDashboardNav={true}
        />
        
        <main className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/hubcentral?tab=campaigns')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">Create New Campaign</h1>
            <p className="text-muted-foreground">
              AI-powered campaign builder with intelligent inventory selection
            </p>
          </div>

          {/* Progress Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Step {currentStep} of {STEPS.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {STEPS[currentStep - 1].title}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              
              {/* Step Indicators */}
              <div className="flex justify-between">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`flex-1 text-center ${
                      step.id === currentStep
                        ? 'text-primary font-semibold'
                        : step.id < currentStep
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div className="text-xs">{step.title}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && (
                <CampaignBasicsStep
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              
              {currentStep === 2 && (
                <CampaignObjectivesStep
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              
              {currentStep === 3 && (
                <CampaignTimelineStep
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              
              {currentStep === 4 && (
                <CampaignAnalysisStep
                  analyzing={analyzing}
                  result={result}
                  error={analysisError}
                  onReanalyze={handleAnalyze}
                  onInventoryChange={handleInventoryChange}
                  isSaved={!!createdCampaignId}
                  budget={formData.budget}
                  duration={
                    formData.startDate && formData.endDate
                      ? Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
                      : 1
                  }
                />
              )}
              
              {currentStep === 5 && (
                <CampaignReviewStep
                  formData={formData}
                  result={result}
                  campaignId={createdCampaignId}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || currentStep === 5}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <div className="flex gap-2">
              {currentStep < 4 && (
                <Button onClick={handleNext}>
                  {currentStep === 3 ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze with AI
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              
              {currentStep === 4 && result && createdCampaignId && (
                <Button onClick={() => navigate(`/campaigns/${createdCampaignId}`)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  View Campaign Details
                </Button>
              )}
              
              {currentStep === 5 && createdCampaignId && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/campaigns/${createdCampaignId}`)}
                  >
                    View Campaign
                  </Button>
                  <Button onClick={() => {
                    setFormData(INITIAL_FORM_DATA);
                    setCurrentStep(1);
                    setCreatedCampaignId(null);
                  }}>
                    Create Another
                  </Button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

