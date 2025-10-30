import { ObjectId } from 'mongodb';

// ===== HUB PACKAGE SCHEMA =====
// Comprehensive package schema for bundling inventory across multiple publications

// Package Categories
export type PackageCategory = 'geographic' | 'demographic' | 'channel' | 'industry' | 'size' | 'custom';

export const PACKAGE_CATEGORIES: Array<{ id: PackageCategory; label: string; description: string }> = [
  { id: 'geographic', label: 'Geographic', description: 'Packages focused on specific areas or neighborhoods' },
  { id: 'demographic', label: 'Demographic', description: 'Packages targeting specific audience demographics' },
  { id: 'channel', label: 'Channel-Focused', description: 'Packages focused on specific media channels' },
  { id: 'industry', label: 'Industry-Specific', description: 'Packages tailored for specific industries' },
  { id: 'size', label: 'Business Size', description: 'Packages designed for business size (small, medium, large)' },
  { id: 'custom', label: 'Custom', description: 'Custom-built packages' }
];

export interface HubPackageInventoryItem {
  channel: 'website' | 'print' | 'newsletter' | 'social' | 'podcast' | 'radio' | 'streaming' | 'events';
  itemPath: string; // Path to find item in publication object (e.g., "distributionChannels.website.advertisingOpportunities[0]")
  itemName: string; // Display name
  quantity: number; // How many units/runs
  duration?: string; // "4 weeks", "1 month"
  frequency?: string; // "weekly", "one-time", "monthly"
  specifications?: {
    size?: string;
    format?: string;
    placement?: string;
    adFormat?: string;
    [key: string]: any;
  };
  // Individual item pricing (for transparency)
  itemPricing?: {
    standardPrice: number;
    hubPrice: number; // Discounted
    pricingModel: string; // "per_week", "cpm", "per_post", "flat"
  };
}

export interface HubPackagePublication {
  publicationId: number; // Links to publications collection
  publicationName: string; // For display
  inventoryItems: HubPackageInventoryItem[];
  publicationTotal: number; // Total cost from this publication
  monthlyImpressions?: number;
  monthlyReach?: number;
}

export interface HubPackagePricingTier {
  tierName: string; // "Bronze", "Silver", "Gold", "1-Month", "3-Month"
  commitmentLength: string; // "1 month", "3 months", "6 months", "12 months"
  frequency?: string; // "one-time", "monthly", "quarterly"
  price: number;
  savingsPercentage: number;
  savingsAmount?: number;
  minimumSpend?: number;
  bonuses?: string[]; // "Free social media graphics", "Bonus newsletter mention"
}

export interface HubPackageAddOn {
  name: string;
  description: string;
  price: number;
  isPopular?: boolean;
}

export interface HubPackageSuccessStory {
  businessType: string;
  challenge: string;
  result: string;
  metrics?: string;
}

export interface HubPackageAssetRequirement {
  assetType: string; // "Logo", "Display Ad", "Social Post"
  specifications: string; // "300x250 PNG, max 150KB"
  quantity: number;
  dueDate: string; // Relative to start date
  examples?: string[]; // URLs to example assets
}

export interface HubPackage {
  _id?: string | ObjectId;
  packageId: string; // Unique identifier (e.g., "chicago-south-side-combo")
  
  // Basic Information
  basicInfo: {
    name: string; // "South Side Saturation"
    tagline: string; // "Reach every corner of Chicago's South Side"
    description: string; // Full marketing description
    category: PackageCategory;
    subcategory?: string; // "neighborhood", "business-launch", "holiday", etc.
  };

  // Hub Association
  hubInfo: {
    hubId: string; // "chicago-hub"
    hubName: string; // "Chicago Hub"
    isHubExclusive: boolean; // Only available through this hub
    multiHubAvailable?: string[]; // If available in multiple hubs
  };

  // Target Market
  targeting: {
    geographicTarget: {
      dmas: string[]; // ["chicago-il"]
      counties?: string[]; // ["cook", "lake", "dupage"]
      neighborhoods?: string[]; // ["bronzeville", "pilsen", "logan-square"]
      zipCodes?: string[]; // Specific zips
      coverageDescription?: string;
    };
    demographicTarget?: {
      ageRanges?: string[]; // ["25-34", "35-44"]
      incomeRanges?: string[]; // ["50k-75k", "75k-100k"]
      interests?: string[]; // ["arts", "food", "politics"]
      languages?: string[]; // ["english", "spanish", "polish"]
    };
    businessTarget?: {
      industries?: string[]; // ["retail", "restaurants", "healthcare"]
      businessStage?: string[]; // ["startup", "established", "expanding"]
      businessSize?: string[]; // ["solo", "small", "medium"]
    };
  };

  // Package Components - The inventory included
  components: {
    publications: HubPackagePublication[];
  };

  // Pricing Structure
  pricing: {
    currency: string; // "USD"
    
    // Individual pricing breakdown
    breakdown: {
      totalStandardPrice: number; // If bought individually
      totalHubPrice: number; // With hub discount
      packageDiscount: number; // Additional bundle discount %
      finalPrice: number; // After all discounts
    };

    // Pricing tiers (for different commitment levels)
    tiers?: HubPackagePricingTier[];

    // Payment options
    paymentOptions?: {
      upfrontDiscount?: number; // % discount for paying upfront
      installmentPlan?: {
        available: boolean;
        numberOfPayments: number;
        paymentSchedule: string; // "monthly", "quarterly"
      };
      depositRequired?: number;
    };

    // Price display
    displayPrice: string; // "$2,499/month" or "Starting at $9,999"
    priceRange: 'under-5k' | '5-15k' | '15-50k' | '50k-plus';
  };

  // Performance Estimates
  performance: {
    estimatedReach: {
      minReach: number;
      maxReach: number;
      reachDescription: string; // "50,000-75,000 South Side residents"
      deduplicatedReach?: number; // Accounting for overlap
    };
    estimatedImpressions: {
      minImpressions: number;
      maxImpressions: number;
      impressionsByChannel?: Record<string, number>;
    };
    demographicBreakdown?: {
      ageGroups?: Record<string, number>; // % by age
      incomeGroups?: Record<string, number>; // % by income
    };
    geographicCoverage?: {
      coveragePercentage: number; // % of target area covered
      neighborhoodsCovered?: string[] | number;
      populationReached?: number;
    };
    expectedCTR?: number; // Expected click-through rate
    expectedClicks?: number;
    costPerClick?: number;
    costPerThousand?: number; // CPM
  };

  // Package Features & Benefits
  features: {
    keyBenefits: string[]; // ["Multi-channel presence", "Trusted local voices"]
    includedServices: string[]; // ["Creative consultation", "Performance reporting"]
    addOns?: HubPackageAddOn[];
  };

  // Campaign Management
  campaignDetails: {
    minimumCommitment?: string; // "4 weeks"
    maximumCommitment?: string; // "52 weeks"
    leadTime: string; // "10 business days"
    materialDeadline: string; // "5 business days before start"
    cancellationPolicy: string;
    modificationPolicy?: string;
  };

  // Creative Requirements
  creativeRequirements: {
    assetsNeeded: HubPackageAssetRequirement[];
    creativeServices?: {
      available: boolean;
      description?: string;
      additionalCost?: number;
    };
  };

  // Use Cases & Examples
  useCases: {
    idealFor: string[]; // ["Restaurant openings", "Community events", "Local retail"]
    successStories?: HubPackageSuccessStory[];
    notRecommendedFor?: string[]; // Set expectations
  };

  // Availability & Status
  availability: {
    isActive: boolean;
    isFeatured: boolean; // Featured on homepage
    isPilot?: boolean; // Test package
    seasonalAvailability?: {
      availableMonths?: number[]; // [11, 12, 1] for holiday season
      unavailableMonths?: number[];
      seasonalNotes?: string;
    };
    inventoryStatus: 'available' | 'limited' | 'waitlist' | 'sold-out';
    spotsRemaining?: number; // For limited packages
  };

  // Marketing & Display
  marketing: {
    thumbnailImage?: string; // URL to package image
    heroImage?: string;
    videoUrl?: string; // Explainer video
    brochureUrl?: string; // PDF download
    tags: string[]; // ["south-side", "affordable", "multi-channel"]
    displayOrder: number; // For sorting
    highlightColor?: string; // Brand color for UI
  };

  // Package Relationships
  relationships?: {
    relatedPackages?: string[]; // Other package IDs
    upgradeFrom?: string[]; // Packages this upgrades
    downgradeTo?: string[]; // Downgrade options
    competitorTo?: string[]; // Alternative packages
  };

  // Analytics & Optimization
  analytics: {
    viewCount: number;
    inquiryCount: number;
    purchaseCount: number;
    conversionRate?: number;
    averageRating?: number;
    lastModified: Date;
    performanceNotes?: string;
  };

  // Administrative
  metadata: {
    createdBy: string; // User ID
    createdAt: Date;
    updatedBy?: string;
    updatedAt: Date;
    approvalStatus: 'draft' | 'pending_review' | 'approved' | 'archived';
    approvedBy?: string;
    approvedAt?: Date;
    version: number; // For versioning
    internalNotes?: string;
  };

  // Legacy compatibility
  legacyId?: number; // For migration from old ad_packages
  deletedAt?: Date; // Soft delete
}

// Type for creating new packages
export type HubPackageInsert = Omit<HubPackage, '_id' | 'metadata'> & {
  metadata: Omit<HubPackage['metadata'], 'createdAt' | 'updatedAt'>;
};

// Type for updating packages
export type HubPackageUpdate = Partial<Omit<HubPackage, '_id' | 'metadata'>> & {
  metadata?: Partial<HubPackage['metadata']>;
};

// ===== PACKAGE DISCOVERY TYPES =====
// Types for the package discovery/recommendation tool

export interface InventoryAnalysis {
  publicationId: number;
  publicationName: string;
  availableInventory: {
    channel: string;
    items: {
      name: string;
      path: string;
      pricing: {
        standard: number;
        hub: number;
        model: string;
      };
      impressions?: number;
      specifications?: any;
    }[];
  }[];
  totalMonthlyReach?: number;
  totalMonthlyImpressions?: number;
  geographicCoverage?: string[];
  demographics?: any;
}

export interface PackageRecommendation {
  recommendationId: string;
  name: string;
  description: string;
  suggestedPublications: number[]; // Publication IDs
  estimatedPrice: {
    min: number;
    max: number;
  };
  estimatedReach: {
    min: number;
    max: number;
  };
  confidence: number; // 0-1 confidence score
  reasoning: string; // Why this package is recommended
  targetAudience: string;
}

export interface PackageBuilderState {
  step: 'select-publications' | 'select-inventory' | 'configure-pricing' | 'review' | 'publish';
  selectedPublications: number[];
  selectedInventory: {
    publicationId: number;
    items: HubPackageInventoryItem[];
  }[];
  pricing: HubPackage['pricing'];
  targeting: HubPackage['targeting'];
  packageInfo: {
    name: string;
    tagline: string;
    description: string;
    category: HubPackage['basicInfo']['category'];
  };
}

