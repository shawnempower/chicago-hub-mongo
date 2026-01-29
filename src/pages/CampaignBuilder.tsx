/**
 * Campaign Builder Page
 * 
 * Multi-step wizard for creating AI-powered campaigns
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addWeeks, addMonths } from 'date-fns';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useHubContext } from '@/contexts/HubContext';
import { useAnalyzeCampaign, useCreateCampaign, useGenerateInsertionOrder } from '@/hooks/useCampaigns';
import { CampaignAnalysisRequest } from '@/integrations/mongodb/campaignSchema';
import { ArrowRight, ArrowLeft, Sparkles, CheckCircle2, Eye, Package, Megaphone, LayoutDashboard, Users, UserPlus, DollarSign, Bot, FileText, Check } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

// Step components
import { CampaignBasicsStep } from '@/components/campaign/CampaignBasicsStep';
import { CampaignObjectivesStep } from '@/components/campaign/CampaignObjectivesStep';
import { CampaignTimelineStep } from '@/components/campaign/CampaignTimelineStep';
import { CampaignAnalysisStep } from '@/components/campaign/CampaignAnalysisStep';
import { CampaignPackageSelectionStep } from '@/components/campaign/CampaignPackageSelectionStep';
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
  { 
    id: 3, 
    title: inventoryMethod === 'ai' ? 'AI Analysis' : 'Package Selection', 
    description: inventoryMethod === 'ai' ? 'Intelligent inventory selection' : 'Choose pre-built package' 
  },
  { id: 4, title: 'Timeline', description: 'Campaign dates and duration' },
  { id: 5, title: 'Review & Create', description: 'Review and finalize campaign' },
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
    
    // Auto-populate timeline based on package duration
    const packageDuration = packageData.metadata?.builderInfo?.originalDuration;
    const packageDurationUnit = packageData.metadata?.builderInfo?.originalDurationUnit || 'months';
    
    if (packageDuration) {
      // Use existing start date or default to today
      const startDate = formData.startDate || new Date();
      
      let calculatedEndDate: Date;
      if (packageDurationUnit === 'weeks') {
        calculatedEndDate = addWeeks(startDate, packageDuration);
      } else {
        calculatedEndDate = addMonths(startDate, packageDuration);
      }
      
      // Update both dates
      updateFormData({ 
        startDate: startDate,
        endDate: calculatedEndDate 
      });
      
      const durationLabel = packageDuration === 1 
        ? `1 ${packageDurationUnit.slice(0, -1)}` 
        : `${packageDuration} ${packageDurationUnit}`;
      
      toast({
        title: 'Timeline Set',
        description: `Campaign dates set to ${durationLabel} based on package`,
      });
    }
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
        if (!formData.targetAudience) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in target audience',
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
        // Package selection validation (only for package method)
        if (formData.inventorySelectionMethod === 'package') {
          if (!formData.selectedPackageId || !selectedPackageData) {
            toast({
              title: 'No Package Selected',
              description: 'Please select a package to continue',
              variant: 'destructive',
            });
            return false;
          }
        }
        return true;
        
      case 4:
        // Timeline validation
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

    if (currentStep === 2) {
      // After objectives, if AI method, move to step 3 and trigger analysis
      if (formData.inventorySelectionMethod === 'ai') {
        setCurrentStep(3);
        await handleAnalyze();
        return;
      }
      // Package method: just move to package selection step
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      // After package/AI selection, move to timeline
      if (formData.inventorySelectionMethod === 'ai' && !result) {
        toast({
          title: 'Analysis Required',
          description: 'Please complete the AI analysis before proceeding',
          variant: 'destructive',
        });
        return;
      }
      setCurrentStep(4);
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
          // For AI mode, budget would need to be set elsewhere (AI mode is currently disabled)
          totalBudget: 50000, // Default budget for AI analysis
          currency: 'USD',
          billingCycle: 'monthly',
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
            // Use pricing from analysis result
            totalBudget: analysisResult.pricing?.finalPrice || 50000,
            currency: 'USD',
            billingCycle: 'monthly',
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
            
            // Debug: Check if format has dimensions
            if (item.channel === 'print') {
              console.log('[Campaign Creation] Print item from package:', {
                itemName: item.itemName,
                hasDimensions: !!item.format?.dimensions,
                dimensions: item.format?.dimensions,
                fullFormat: item.format
              });
            }
            
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
          // Use package price as budget for package-based campaigns
          totalBudget: pricing?.finalPrice || 0,
          currency: 'USD',
          billingCycle: 'monthly',
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
      creativeAssetsByPlacement: [],
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

  const handleGenerateContract = async () => {
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
      
      // Add print-friendly styles and open in new window for PDF printing
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Advertising Agreement - ${formData.name}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; }
            .print-actions { 
              position: fixed; 
              top: 10px; 
              right: 10px; 
              background: #2563eb; 
              color: white; 
              padding: 10px 20px; 
              border-radius: 6px; 
              cursor: pointer;
              font-weight: 500;
              z-index: 1000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .print-actions:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <button class="print-actions no-print" onclick="window.print()">
            Save as PDF / Print
          </button>
          ${content}
        </body>
        </html>
      `;
      
      // Open in new window for print/PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
      } else {
        // Fallback: download if popup blocked
        const blob = new Blob([printContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agreement-${formData.name.replace(/\s+/g, '-').toLowerCase()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Agreement Generated',
        description: 'Use your browser\'s Print function to save as PDF',
      });
    } catch (error) {
      console.error('Generate contract error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate agreement. Please try again.',
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
              <Card className="mb-6 bg-white">
            <CardContent className="pt-6 pb-6">
              {/* Horizontal Stepper */}
              <div className="flex items-center justify-between px-4">
                {STEPS.map((step, index) => {
                  const isCompleted = step.id < currentStep;
                  const isCurrent = step.id === currentStep;
                  const isUpcoming = step.id > currentStep;
                  
                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      {/* Step Circle and Label */}
                      <div className="flex flex-col items-center flex-1">
                        {/* Circle */}
                        <div className="relative flex items-center justify-center">
                          {/* Left Connector */}
                          {index > 0 && (
                            <div 
                              className={`absolute right-full w-[60px] h-[2px] ${
                                isCompleted || isCurrent
                                  ? 'bg-green-600'
                                  : 'bg-gray-300'
                              }`}
                              style={{ marginRight: '12px' }}
                            />
                          )}
                          
                          {/* Circle Node */}
                          <button
                            onClick={() => setCurrentStep(step.id)}
                            className={`
                              w-6 h-6 rounded-full flex items-center justify-center cursor-pointer
                              transition-all hover:scale-110
                              ${isCompleted
                                ? 'bg-green-600 hover:bg-green-700'
                                : isCurrent
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-white border border-gray-300 hover:border-gray-400'
                              }
                            `}
                          >
                            {isCompleted ? (
                              <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                            ) : (
                              <span
                                className={`text-xs font-medium ${
                                  isCurrent ? 'text-white' : 'text-gray-400'
                                }`}
                              >
                                {step.id}
                              </span>
                            )}
                          </button>
                          
                          {/* Right Connector */}
                          {index < STEPS.length - 1 && (
                            <div 
                              className={`absolute left-full w-[60px] h-[2px] ${
                                isCompleted
                                  ? 'bg-green-600'
                                  : 'bg-gray-300'
                              }`}
                              style={{ marginLeft: '12px' }}
                            />
                          )}
                        </div>
                        
                        {/* Label */}
                        <button
                          onClick={() => setCurrentStep(step.id)}
                          className={`mt-2 text-xs text-center cursor-pointer hover:opacity-80 transition-opacity ${
                            isCurrent
                              ? 'font-semibold text-gray-900'
                              : isCompleted
                              ? 'font-normal text-gray-900'
                              : 'font-normal text-gray-400'
                          }`}
                        >
                          {step.title}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

              {/* Step Content */}
              <Card>
            <CardContent className="pt-6">
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
              
              {currentStep === 3 && formData.inventorySelectionMethod === 'ai' && (
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
              
              {currentStep === 3 && formData.inventorySelectionMethod === 'package' && (
                <CampaignPackageSelectionStep
                  selectedPackageId={formData.selectedPackageId}
                  onPackageSelect={handlePackageSelect}
                  budget={formData.budget}
                />
              )}
              
              {currentStep === 4 && (
                <CampaignTimelineStep
                  formData={formData}
                  updateFormData={updateFormData}
                  selectedPackageData={selectedPackageData}
                />
              )}
              
              {currentStep === 5 && (
                <CampaignReviewStep
                  formData={formData}
                  result={result}
                  campaignId={createdCampaignId}
                  selectedPackageData={selectedPackageData}
                  onGenerateContract={handleGenerateContract}
                  onViewCampaign={handleViewCampaign}
                  onNavigateToStep={setCurrentStep}
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
                  {currentStep === 2 ? (
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
                  ) : currentStep === 3 ? (
                    <>
                      Set Timeline
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              
              {currentStep === 4 && (
                <Button onClick={handleNext}>
                  Review Campaign
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              
              {currentStep === 4 && result && createdCampaignId && (
                <Button onClick={handleNext}>
                  Review Campaign
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              
              {currentStep === 5 && !createdCampaignId && (
                <Button onClick={handleCreate} disabled={creating}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {creating ? 'Creating Campaign...' : 'Create Campaign'}
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
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

