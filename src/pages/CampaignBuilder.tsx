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
import { useAnalyzeCampaign, useCreateCampaign, useGenerateInsertionOrder } from '@/hooks/useCampaigns';
import { CampaignAnalysisRequest } from '@/integrations/mongodb/campaignSchema';
import { ArrowRight, Sparkles, CheckCircle2, Eye, Package, Megaphone, LayoutDashboard, Users, UserPlus, DollarSign, Bot, FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

// Step components
import { CampaignBasicsStep } from '@/components/campaign/CampaignBasicsStep';
import { CampaignObjectivesStep } from '@/components/campaign/CampaignObjectivesStep';
import { CampaignTimelineStep } from '@/components/campaign/CampaignTimelineStep';
import { CampaignAnalysisStep } from '@/components/campaign/CampaignAnalysisStep';
import { CampaignPackageSelectionStep } from '@/components/campaign/CampaignPackageSelectionStep';
import { CampaignCreativeAssetsUploader } from '@/components/campaign/CampaignCreativeAssetsUploader';
import { CampaignReviewStep } from '@/components/campaign/CampaignReviewStep';
import { extractRequirementsForSelectedInventory, CreativeRequirement } from '@/utils/creativeSpecsExtractor';

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
  inventorySelectionMethod?: 'ai' | 'package';
  selectedPackageId?: string;
  
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
  inventorySelectionMethod: 'package',
  selectedPackageId: undefined,
  startDate: null,
  endDate: null,
};

// Dynamic steps based on inventory selection method
const getSteps = (inventoryMethod: 'ai' | 'package') => [
  { id: 1, title: 'Campaign Basics', description: 'Name and advertiser information' },
  { id: 2, title: 'Campaign Objectives', description: 'Goals, budget, and targeting' },
  { id: 3, title: 'Timeline', description: 'Campaign dates and duration' },
  { 
    id: 4, 
    title: inventoryMethod === 'ai' ? 'AI Analysis' : 'Package Selection', 
    description: inventoryMethod === 'ai' ? 'Intelligent inventory selection' : 'Choose pre-built package' 
  },
  { id: 5, title: 'Creative Assets', description: 'Upload creative assets for each placement' },
  { id: 6, title: 'Review & Create', description: 'Review and finalize campaign' },
];

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHubId, selectedHub } = useHubContext();
  const { analyze, analyzing, result, error: analysisError } = useAnalyzeCampaign();
  const { create, creating } = useCreateCampaign();
  const { generate, generating } = useGenerateInsertionOrder();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>(INITIAL_FORM_DATA);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [editedInventory, setEditedInventory] = useState<any>(null);
  const [inventoryEdited, setInventoryEdited] = useState(false);
  const [selectedPackageData, setSelectedPackageData] = useState<any>(null);
  const [creativeRequirements, setCreativeRequirements] = useState<CreativeRequirement[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<Map<string, any>>(new Map());

  // Get dynamic steps based on selection method
  const STEPS = getSteps(formData.inventorySelectionMethod || 'package');

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

  // Handle package selection
  const handlePackageSelect = (packageId: string, packageData: any) => {
    updateFormData({ selectedPackageId: packageId });
    setSelectedPackageData(packageData);
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
        // Validation depends on inventory selection method
        if (!formData.targetAudience || formData.budget <= 0) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in target audience and budget',
            variant: 'destructive',
          });
          return false;
        }
        // Only require channels if using AI selection
        if (formData.inventorySelectionMethod === 'ai' && formData.channels.length === 0) {
          toast({
            title: 'Missing Information',
            description: 'Please select at least one channel for AI analysis',
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
      // Different behavior based on inventory selection method
      if (formData.inventorySelectionMethod === 'ai') {
        // Move to step 4 FIRST to show loading screen
        setCurrentStep(4);
        // Then trigger AI analysis
        await handleAnalyze();
        // Don't increment step again - we're already on step 4
        return;
      } else {
        // Package method: just move to package selection step
        setCurrentStep(4);
        return;
      }
    }

    if (currentStep === 4 && formData.inventorySelectionMethod === 'package') {
      // Validate package selection before moving to creative assets
      if (!formData.selectedPackageId || !selectedPackageData) {
        toast({
          title: 'No Package Selected',
          description: 'Please select a package to continue',
          variant: 'destructive',
        });
        return;
      }
      
      // Extract creative requirements from package
      const packageInventory = selectedPackageData.components?.publications || [];
      const allInventoryItems: any[] = [];
      packageInventory.forEach((pub: any) => {
        (pub.inventoryItems || []).forEach((item: any) => {
          allInventoryItems.push({
            ...item,
            publicationId: pub.publicationId,
            publicationName: pub.publicationName
          });
        });
      });
      
      const requirements = extractRequirementsForSelectedInventory(allInventoryItems);
      setCreativeRequirements(requirements);
    }

    if (currentStep === 4 && formData.inventorySelectionMethod === 'ai' && result) {
      // Extract creative requirements from AI analysis result
      const aiInventory = result.selectedInventory?.publications || [];
      const allInventoryItems: any[] = [];
      aiInventory.forEach((pub: any) => {
        (pub.inventoryItems || []).forEach((item: any) => {
          allInventoryItems.push({
            ...item,
            publicationId: pub.publicationId,
            publicationName: pub.publicationName
          });
        });
      });
      
      const requirements = extractRequirementsForSelectedInventory(allInventoryItems);
      setCreativeRequirements(requirements);
    }

    if (currentStep === 5) {
      // Validate all creative assets are uploaded before moving to review
      const allUploaded = Array.from(uploadedAssets.values()).every(
        asset => asset.uploadStatus === 'uploaded'
      );
      
      if (creativeRequirements.length > 0 && !allUploaded) {
        toast({
          title: 'Creative Assets Required',
          description: 'Please upload all creative assets before proceeding to review.',
          variant: 'destructive',
        });
        return;
      }
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
    if (!selectedHubId || !selectedHub) {
      return;
    }

    // Check if we have required data based on method
    if (formData.inventorySelectionMethod === 'ai' && !result) {
      toast({
        title: 'No Analysis Result',
        description: 'Please complete AI analysis first',
        variant: 'destructive',
      });
      return;
    }

    if (formData.inventorySelectionMethod === 'package' && !selectedPackageData) {
      toast({
        title: 'No Package Selected',
        description: 'Please select a package first',
        variant: 'destructive',
      });
      return;
    }

    // Build campaign data based on selection method
    let selectedInventory, pricing, estimatedPerformance, algorithm;
    
    if (formData.inventorySelectionMethod === 'ai' && result) {
      selectedInventory = result.selectedInventory;
      pricing = result.pricing;
      estimatedPerformance = result.estimatedPerformance;
      algorithm = result.algorithm;
    } else if (selectedPackageData) {
      // Convert package data to campaign format
      const packagePublications = selectedPackageData.components?.publications || [];
      
      // Import calculation utility
      const { calculateItemCost } = await import('@/utils/inventoryPricing');
      
      // Filter out excluded items from each publication and calculate costs
      const filteredPublications = packagePublications.map((pub: any) => {
        // Filter and calculate cost for each item
        const items = (pub.inventoryItems || [])
          .filter((item: any) => !item.isExcluded)
          .map((item: any) => {
            // Calculate the item cost using shared utility
            const frequency = item.currentFrequency || item.quantity || 1;
            
            // Debug: Check if item has proper pricing structure
            if (!item.itemPricing || !item.itemPricing.hubPrice) {
              console.warn('Item missing pricing structure during campaign creation:', {
                itemName: item.itemName,
                hasItemPricing: !!item.itemPricing,
                itemPricing: item.itemPricing
              });
            }
            
            const itemCost = calculateItemCost(item, frequency);
            
            console.log(`Calculated cost for ${item.itemName}:`, {
              frequency,
              itemCost,
              hasItemPricing: !!item.itemPricing,
              hubPrice: item.itemPricing?.hubPrice,
              pricingModel: item.itemPricing?.pricingModel
            });
            
            return {
              ...item,
              // Ensure itemPricing exists with totalCost
              itemPricing: {
                ...item.itemPricing,
                totalCost: itemCost
              },
              // Also store as campaignCost for backwards compatibility
              campaignCost: itemCost
            };
          });
        
        // Calculate publication total from items if not provided
        const pubTotal = pub.publicationTotal || items.reduce((sum: number, item: any) => sum + (item.campaignCost || 0), 0);
        
        return {
          publicationId: pub.publicationId,
          publicationName: pub.publicationName,
          publicationTotal: pubTotal,
          inventoryItems: items,
          // Include other fields needed for reach calculation
          monthlyReach: pub.monthlyReach,
          monthlyImpressions: pub.monthlyImpressions
        };
      }).filter((pub: any) => pub.inventoryItems.length > 0); // Remove publications with no active items
      
      selectedInventory = {
        publications: filteredPublications,
        totalInventoryItems: filteredPublications.reduce((sum: number, pub: any) => 
          sum + pub.inventoryItems.length, 0
        ),
        totalPublications: filteredPublications.length
      };
      
      // Calculate total price from publication totals (more accurate than package stored price)
      const calculatedTotal = filteredPublications.reduce((sum: number, pub: any) => 
        sum + (pub.publicationTotal || 0), 0
      );
      
      pricing = {
        finalPrice: calculatedTotal || selectedPackageData.pricing?.breakdown?.finalPrice || 0,
        breakdown: {
          ...selectedPackageData.pricing?.breakdown,
          finalPrice: calculatedTotal || selectedPackageData.pricing?.breakdown?.finalPrice || 0,
          totalHubPrice: calculatedTotal || selectedPackageData.pricing?.breakdown?.totalHubPrice || 0
        },
        billingCycle: 'monthly'
      };
      
      // Calculate reach from inventory if package doesn't have reach data
      const packageHasReach = selectedPackageData.performance?.estimatedReach?.minReach > 0;
      
      if (!packageHasReach && filteredPublications.length > 0) {
        // Package has no reach data (old package), calculate from inventory
        console.log('Package has no reach data, calculating from inventory...');
        const { calculatePackageReach } = await import('@/utils/reachCalculations');
        const reachSummary = calculatePackageReach(filteredPublications);
        
        estimatedPerformance = {
          reach: {
            min: reachSummary.estimatedUniqueReach || 0,
            max: reachSummary.estimatedUniqueReach || 0,
            description: `${(reachSummary.estimatedUniqueReach || 0).toLocaleString()}+ estimated unique reach`
          },
          impressions: {
            min: reachSummary.totalMonthlyImpressions || 0,
            max: reachSummary.totalMonthlyImpressions || 0,
            byChannel: reachSummary.channelAudiences
          },
          cpm: reachSummary.totalMonthlyImpressions > 0
            ? (pricing.finalPrice / (reachSummary.totalMonthlyImpressions / 1000))
            : 0
        };
      } else {
        // Use package's stored reach data
        estimatedPerformance = {
          reach: {
            min: selectedPackageData.performance?.estimatedReach?.minReach || 0,
            max: selectedPackageData.performance?.estimatedReach?.maxReach || 0,
            description: selectedPackageData.performance?.estimatedReach?.reachDescription || ''
          },
          impressions: {
            min: selectedPackageData.performance?.estimatedImpressions?.minImpressions || 0,
            max: selectedPackageData.performance?.estimatedImpressions?.maxImpressions || 0
          }
        };
      }
      
      algorithm = {
        id: 'package-based',
        name: 'Pre-Built Package',
        version: '1.0',
        executedAt: new Date(),
        description: `Campaign created from package: ${selectedPackageData.basicInfo?.name || 'Hub Package'}`
      };
    }

    // Prepare creative assets mapping for campaign
    const creativeAssetsByPlacement = new Map();
    uploadedAssets.forEach((asset, placementId) => {
      if (asset.uploadStatus === 'uploaded' && asset.assetId) {
        creativeAssetsByPlacement.set(placementId, {
          assetId: asset.assetId,
          fileName: asset.file.name,
          fileUrl: '', // Will be populated from server response
          fileType: asset.file.type,
          fileSize: asset.file.size,
          uploadedAt: new Date(),
          uploadedBy: '', // Will be populated from auth
        });
      }
    });

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
        channels: formData.inventorySelectionMethod === 'ai' ? formData.channels : [],
      },
      timeline: {
        startDate: formData.startDate!,
        endDate: formData.endDate!,
      },
      selectedInventory,
      pricing,
      estimatedPerformance,
      algorithm,
      packageId: formData.selectedPackageId, // Link to package if used
      creativeAssetsByPlacement: Array.from(creativeAssetsByPlacement.entries()).map(([placementId, asset]) => ({
        placementId,
        ...asset
      })),
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

  const handleGenerateIO = async () => {
    if (!createdCampaignId) {
      toast({
        title: 'No Campaign',
        description: 'Campaign ID not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await generate(createdCampaignId, 'html');
      
      // Extract content from the insertion order
      const content = result.insertionOrder?.content || '';
      
      if (!content) {
        throw new Error('No content generated');
      }
      
      // Create a downloadable link
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insertion-order-${formData.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Insertion order generated and downloaded',
      });
    } catch (error) {
      console.error('Generate IO error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate insertion order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewCampaign = () => {
    if (createdCampaignId) {
      navigate(`/campaigns/${createdCampaignId}`);
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
        
        <main className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Vertical Left Navigation */}
            <aside className="w-24 flex-shrink-0">
              <nav className="p-2 sticky top-6">
                <div className="space-y-1">
                  {[
                    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, href: '/hubcentral?tab=overview' },
                    { id: 'leads', label: 'Leads', icon: Users, href: '/hubcentral?tab=leads' },
                    { id: 'packages', label: 'Packages', icon: Package, href: '/hubcentral?tab=packages' },
                    { id: 'campaigns', label: 'Campaigns', icon: Megaphone, href: '/campaigns', isActive: true },
                    { id: 'orders', label: 'Orders', icon: FileText, href: '/hubcentral?tab=orders' },
                    { id: 'pricing', label: 'Pricing', icon: DollarSign, href: '/hubcentral?tab=pricing' },
                    { id: 'inventory-chat', label: 'AI Chat', icon: Bot, href: '/hubcentral?tab=inventory-chat' },
                    { id: 'team', label: 'Team', icon: UserPlus, href: '/hubcentral?tab=team' },
                  ].map((item) => {
                    const Icon = item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.href)}
                        className={cn(
                          "w-full flex flex-col items-center gap-1 px-2 py-3 rounded-md transition-colors",
                          item.isActive
                            ? "bg-[#EDEAE1] font-bold"
                            : "hover:bg-[#E2E0D8] font-bold"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 max-w-4xl">
              {/* Breadcrumbs */}
              <div className="mb-6">
                <Breadcrumb
                  rootLabel="Campaigns"
                  rootIcon={Megaphone}
                  currentLabel="Create New Campaign"
                  onBackClick={() => navigate('/campaigns')}
                />
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
              
              {currentStep === 4 && formData.inventorySelectionMethod === 'ai' && (
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
              
              {currentStep === 4 && formData.inventorySelectionMethod === 'package' && (
                <CampaignPackageSelectionStep
                  selectedPackageId={formData.selectedPackageId}
                  onPackageSelect={handlePackageSelect}
                  budget={formData.budget}
                />
              )}
              
              {currentStep === 5 && (
                <CampaignCreativeAssetsStep
                  requirements={creativeRequirements}
                  uploadedAssets={uploadedAssets}
                  onAssetsChange={setUploadedAssets}
                  campaignId={createdCampaignId || undefined}
                />
              )}

              {currentStep === 6 && (
                <CampaignReviewStep
                  formData={formData}
                  result={result}
                  campaignId={createdCampaignId}
                  selectedPackageData={selectedPackageData}
                  onGenerateIO={handleGenerateIO}
                  onViewCampaign={handleViewCampaign}
                />
              )}
            </CardContent>
          </Card>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || currentStep === 6}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <div className="flex gap-2">
              {currentStep < 4 && (
                <Button onClick={handleNext}>
                  {currentStep === 3 ? (
                    formData.inventorySelectionMethod === 'ai' ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze with AI
                      </>
                    ) : (
                      <>
                        <Package className="mr-2 h-4 w-4" />
                        Select Package
                      </>
                    )
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              
              {currentStep === 4 && formData.inventorySelectionMethod === 'package' && formData.selectedPackageId && (
                <Button onClick={handleNext}>
                  Review Campaign
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              
              {currentStep === 4 && result && createdCampaignId && (
                <Button onClick={handleNext}>
                  Upload Creative Assets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {currentStep === 5 && (
                <Button onClick={handleNext}>
                  Review Campaign
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              
              {currentStep === 6 && !createdCampaignId && (
                <Button onClick={handleCreate} disabled={creating}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {creating ? 'Creating Campaign...' : 'Create Campaign'}
                </Button>
              )}
              
              {currentStep === 6 && createdCampaignId && (
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
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

