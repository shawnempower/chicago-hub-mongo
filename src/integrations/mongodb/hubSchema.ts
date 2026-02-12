/**
 * Hub Schema
 * 
 * Defines the structure for hub entities in the database.
 * Hubs are regional or market-based groupings that organize publications,
 * packages, and advertising inventory.
 */

import { ObjectId } from 'mongodb';

// Advertising Terms interface - used in Hub and for type safety
// These terms apply to publication insertion orders
export interface HubAdvertisingTerms {
  standardTerms: {
    leadTime?: string;           // e.g., "10 business days"
    materialDeadline?: string;   // e.g., "5 business days before start"
    paymentTerms?: string;       // e.g., "Net 30"
    cancellationPolicy?: string; // e.g., "10 business days notice required"
    agencyCommission?: string;   // e.g., "15% standard commission"
    modificationPolicy?: string; // e.g., "Changes require 5 business days notice"
  };
  legalDisclaimer?: string;      // Boilerplate legal text
  customTerms?: string;          // Additional custom terms (free text)
}

// Advertiser Agreement Terms interface
// These terms appear on advertiser-facing contracts/agreements (separate from publication insertion orders)
export interface AdvertiserAgreementTerms {
  paymentTerms?: {
    netDays?: number;              // e.g., 30 for "Net 30"
    lateFeePercent?: number;       // e.g., 1.5 for 1.5% per month
  };
  cancellationPolicy?: {
    noticeDays?: number;           // e.g., 10 business days
    feePercent?: number;           // e.g., 50 for 50% cancellation fee
  };
  creativeDeadlineDays?: number;   // e.g., 5 business days before start
  performanceDisclaimer?: string;  // Custom performance disclaimer text
  liabilityClause?: string;        // Custom limitation of liability text
  contentStandards?: string;       // Custom content standards text
  customTerms?: string;            // Additional free-form terms
}

// Platform Billing Configuration interface
// Defines how this hub is charged by the platform for using the system
export interface HubPlatformBilling {
  revenueSharePercent: number;     // Percentage of publisher payouts owed to platform (e.g., 15 for 15%)
  platformCpmRate: number;         // CPM rate for system-tracked digital impressions (e.g., 0.50 for $0.50 CPM)
  billingCycle: 'monthly' | 'quarterly' | 'campaign-end';  // When platform invoices the hub
  billingContact?: {
    email: string;
    name?: string;
    phone?: string;
  };
  effectiveDate?: Date;            // When these billing terms took effect
  notes?: string;                  // Internal notes about billing arrangement
}

export interface Hub {
  _id?: string | ObjectId;
  hubId: string; // Unique slug identifier (e.g., "chicago-hub")
  
  // Basic Information
  basicInfo: {
    name: string; // Display name (e.g., "Chicago Hub")
    tagline?: string; // Short marketing tagline
    description?: string; // Detailed description
  };
  
  // Branding (optional)
  branding?: {
    logo?: string; // URL to logo image
    primaryColor?: string; // Hex color code
    secondaryColor?: string; // Hex color code
    accentColor?: string; // Hex color code
  };
  
  // Contact Information (optional)
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  
  // Geographic Coverage (optional)
  geography?: {
    region?: string; // "Midwest", "Pacific Northwest", etc.
    primaryCity?: string;
    state?: string;
    dmas?: string[]; // DMA codes covered
    counties?: string[];
    zipCodes?: string[];
  };
  
  // Hub Settings
  settings?: {
    customDomain?: string; // Custom domain for this hub
    timezone?: string; // IANA timezone (e.g., "America/Chicago")
    currency?: string; // ISO currency code (e.g., "USD")
    defaultLanguage?: string; // ISO language code (e.g., "en")
  };
  
  // Advertising Terms and Conditions
  // These terms apply to all insertion orders sent to publications from this hub
  advertisingTerms?: HubAdvertisingTerms;
  
  // Advertiser Agreement Terms
  // These terms appear on advertiser-facing contracts/agreements
  advertiserAgreementTerms?: AdvertiserAgreementTerms;
  
  // Platform Billing Configuration
  // Defines how this hub is charged by the platform (revenue share + CPM on tracked impressions)
  platformBilling?: HubPlatformBilling;
  
  // AI-Generated Network Summary
  // Synthesized from all publication AI profiles and audience data
  networkSummary?: {
    /** Concise pitch: why advertise across this network */
    valueProposition: string;
    /** Key audience highlights aggregated across all publications */
    audienceHighlights: string;
    /** Geographic reach and market coverage narrative */
    marketCoverage: string;
    /** Channel mix and cross-platform strengths */
    channelStrengths: string;
    /** Source citations from Perplexity */
    citations: string[];
    /** When this summary was generated */
    generatedAt: Date;
    /** Model used */
    generatedBy: string;
    /** Number of publications included in the synthesis */
    publicationCount: number;
    /** Incremented on each refresh */
    version: number;
  };

  // Status and Metadata
  status: 'active' | 'inactive' | 'pending' | 'archived';
  
  metadata?: {
    createdBy?: string; // User ID
    lastModifiedBy?: string; // User ID
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Type for inserting a new hub (without _id and timestamps)
export type HubInsert = Omit<Hub, '_id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

// Type for updating a hub (all fields optional except timestamps)
export type HubUpdate = Partial<Omit<Hub, '_id' | 'createdAt'>> & {
  updatedAt: Date;
};

// Validation helpers
export const validateHubId = (hubId: string): boolean => {
  // Must be lowercase, alphanumeric with hyphens, 3-50 chars
  const hubIdRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  return hubIdRegex.test(hubId);
};

export const validateHubData = (hub: Partial<Hub>): string[] => {
  const errors: string[] = [];
  
  if (!hub.hubId) {
    errors.push('hubId is required');
  } else if (!validateHubId(hub.hubId)) {
    errors.push('hubId must be lowercase alphanumeric with hyphens, 3-50 characters');
  }
  
  if (!hub.basicInfo?.name) {
    errors.push('name is required');
  } else if (hub.basicInfo.name.length < 2 || hub.basicInfo.name.length > 100) {
    errors.push('name must be between 2 and 100 characters');
  }
  
  if (!hub.status) {
    errors.push('status is required');
  } else if (!['active', 'inactive', 'pending', 'archived'].includes(hub.status)) {
    errors.push('status must be active, inactive, pending, or archived');
  }
  
  // Validate colors if provided
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (hub.branding?.primaryColor && !hexColorRegex.test(hub.branding.primaryColor)) {
    errors.push('primaryColor must be a valid hex color code (e.g., #FF0000)');
  }
  if (hub.branding?.secondaryColor && !hexColorRegex.test(hub.branding.secondaryColor)) {
    errors.push('secondaryColor must be a valid hex color code');
  }
  if (hub.branding?.accentColor && !hexColorRegex.test(hub.branding.accentColor)) {
    errors.push('accentColor must be a valid hex color code');
  }
  
  return errors;
};

// Default hub template
export const createDefaultHub = (hubId: string, name: string): HubInsert => ({
  hubId,
  basicInfo: {
    name,
  },
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
});

