/**
 * Campaign Schema
 * 
 * Defines the structure for campaigns in the database.
 * Campaigns represent advertising campaigns built using AI-selected inventory
 * from publications within a hub.
 */

import { ObjectId } from 'mongodb';
import { HubPackagePublication } from './hubPackageSchema';

export interface CampaignContact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface CampaignObjectives {
  primaryGoal: string; // "brand awareness", "lead generation", "event promotion", "product launch", etc.
  secondaryGoals?: string[];
  targetAudience: string;
  geographicTarget?: string[]; // Neighborhoods, areas, etc.
  demographicTarget?: {
    ageRanges?: string[];
    incomeRanges?: string[];
    interests?: string[];
    languages?: string[];
  };
  channels?: string[]; // Specific channels requested (print, website, newsletter, etc.)
  budget: {
    totalBudget: number;
    monthlyBudget?: number;
    currency: string;
    billingCycle: 'one-time' | 'monthly' | 'quarterly';
  };
}

export interface CampaignTimeline {
  startDate: Date;
  endDate: Date;
  durationWeeks: number;
  durationMonths: number;
}

export interface CampaignSelectedInventory {
  publications: HubPackagePublication[]; // Reuse existing type from hub packages
  totalPublications: number;
  totalInventoryItems: number;
  channelBreakdown?: Record<string, number>; // e.g., { print: 5, website: 8, newsletter: 6 }
  selectionReasoning: string; // Overall reasoning for selections
  llmPrompt?: string; // The prompt sent to LLM (for debugging/reference)
  llmResponse?: string; // Raw LLM response (for debugging/reference)
  confidence: number; // 0-1 confidence score from LLM
  selectionDate: Date;
}

export interface CampaignPricing {
  subtotal: number; // Total before discounts
  hubDiscount: number; // Discount percentage
  discountAmount: number; // Dollar amount of discount
  total: number; // Final total
  monthlyTotal?: number; // Monthly cost if applicable
  currency: string;
  breakdown?: {
    byChannel?: Record<string, number>; // Cost by channel
    byPublication?: Record<string, number>; // Cost by publication
  };
}

export interface CampaignPerformanceEstimates {
  reach: {
    min: number;
    max: number;
    description?: string;
  };
  impressions: {
    min: number;
    max: number;
    byChannel?: Record<string, number>;
  };
  cpm: number; // Cost per thousand impressions
  estimatedEngagement?: {
    clicks?: number;
    ctr?: number; // Click-through rate percentage
  };
}

export interface InsertionOrder {
  generatedAt: Date;
  format: 'html' | 'markdown' | 'pdf';
  content: string; // The actual HTML/Markdown/PDF content (master IO with all publications)
  downloadUrl?: string; // S3 URL if stored
  version: number; // Version number for regenerations
}

export interface CreativeAsset {
  assetId: string;
  fileName: string;
  fileUrl: string;
  fileType: string; // 'image/jpeg', 'image/png', 'application/pdf', 'video/mp4', etc.
  fileSize: number; // in bytes
  uploadedAt: Date;
  uploadedBy: string; // User ID
  thumbnailUrl?: string; // For images/videos
  description?: string;
}

export interface AdSpecification {
  placementId: string; // Reference to inventory item
  placementName: string;
  channel: string;
  specifications: {
    dimensions?: string; // e.g., "300x250" or "Full page"
    fileFormats?: string[]; // e.g., ["JPG", "PNG", "PDF"]
    maxFileSize?: string; // e.g., "10MB"
    colorSpace?: string; // e.g., "CMYK", "RGB"
    resolution?: string; // e.g., "300dpi"
    additionalRequirements?: string;
  };
  deadline?: Date;
  providedAt?: Date;
  providedBy?: string; // User ID
}

export interface StatusHistoryEntry {
  status: 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';
  timestamp: Date;
  changedBy: string; // User ID
  notes?: string;
}

export interface PublicationInsertionOrder {
  _id?: string | ObjectId; // MongoDB ID for the order itself
  publicationId: number;
  publicationName: string;
  generatedAt: Date;
  format: 'html' | 'markdown' | 'pdf';
  content: string; // Publication-specific IO with only their placements
  downloadUrl?: string; // S3 URL if stored
  sentTo?: string[]; // Email addresses where this IO was sent
  sentAt?: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';
  confirmationDate?: Date;
  notes?: string; // Publication-specific notes or requirements (deprecated, use publicationNotes)
  
  // Enhanced tracking fields
  creativeAssets?: CreativeAsset[]; // Creative assets for this order
  adSpecifications?: AdSpecification[]; // Ad specs provided by publication
  adSpecificationsProvided?: boolean; // Flag for quick checking
  statusHistory?: StatusHistoryEntry[]; // Track all status changes
  publicationNotes?: string; // Notes from publication side
  hubNotes?: string; // Internal notes from hub team
  
  // Individual placement lifecycle tracking
  placementStatuses?: Record<string, 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered'>;
  placementStatusHistory?: Array<{
    placementId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered';
    timestamp: Date;
    changedBy: string;
    notes?: string;
  }>;
  
  // Proof of performance (post-campaign)
  proofOfPerformance?: {
    uploadedAt?: Date;
    uploadedBy?: string;
    files?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
    }>;
    notes?: string;
  };
}

export interface Campaign {
  _id?: string | ObjectId;
  campaignId: string; // Unique identifier (e.g., "campaign-abc123")
  
  // Hub association
  hubId: string;
  hubName: string;
  
  // Basic campaign information
  basicInfo: {
    name: string;
    description: string;
    advertiserName: string;
    advertiserContact: CampaignContact;
    internalNotes?: string; // Private notes for campaign management
  };
  
  // Campaign objectives and requirements
  objectives: CampaignObjectives;
  
  // Campaign timeline
  timeline: CampaignTimeline;
  
  // AI-selected inventory
  selectedInventory: CampaignSelectedInventory;
  
  // Pricing breakdown
  pricing: CampaignPricing;
  
  // Performance estimates
  estimatedPerformance: CampaignPerformanceEstimates;
  
  // Master insertion order (all publications)
  insertionOrder?: InsertionOrder;
  
  // Per-publication insertion orders
  publicationInsertionOrders?: PublicationInsertionOrder[];
  
  // Algorithm used to generate this campaign
  algorithm?: {
    id: 'all-inclusive' | 'budget-friendly';
    name: string;
    version: string;
    executedAt: Date;
  };
  
  // Campaign status
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'completed' | 'cancelled';
  
  // Creative assets tracking
  creativeAssets?: {
    required: string[]; // List of required assets
    submitted: Array<{
      assetType: string;
      fileName: string;
      fileUrl: string;
      uploadedAt: Date;
    }>;
    approved: boolean;
  };
  
  // Campaign execution tracking
  execution?: {
    launchDate?: Date;
    completionDate?: Date;
    actualPerformance?: {
      impressions?: number;
      clicks?: number;
      reach?: number;
      ctr?: number;
    };
  };
  
  // Approval workflow
  approval?: {
    requestedAt?: Date;
    requestedBy?: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
  };
  
  // Metadata
  metadata: {
    createdBy: string; // User ID
    createdAt: Date;
    updatedBy?: string;
    updatedAt: Date;
    version: number; // For tracking changes
    tags?: string[]; // For categorization and search
  };
  
  // Soft delete
  deletedAt?: Date;
  deletedBy?: string;
}

// Type for creating new campaigns
export type CampaignInsert = Omit<Campaign, '_id' | 'metadata'> & {
  metadata: {
    createdBy: string;
    version: number;
    tags?: string[];
  };
};

// Type for updating campaigns
export type CampaignUpdate = Partial<Omit<Campaign, '_id' | 'metadata'>> & {
  metadata?: {
    updatedBy?: string;
    updatedAt?: Date;
    version?: number;
    tags?: string[];
  };
};

// Request/Response types for API

export interface CampaignAnalysisRequest {
  hubId: string;
  objectives: CampaignObjectives;
  timeline: Omit<CampaignTimeline, 'durationWeeks' | 'durationMonths'>; // Client sends just dates
  includeAllOutlets?: boolean; // Press Forward flag (deprecated, use algorithm: 'all-inclusive')
  excludeChannels?: string[]; // Channels to exclude
  algorithm?: 'all-inclusive' | 'budget-friendly' | 'little-guys' | 'proportional'; // Algorithm to use (defaults to 'all-inclusive')
}

export interface CampaignAnalysisResponse {
  selectedInventory: CampaignSelectedInventory;
  pricing: CampaignPricing;
  estimatedPerformance: CampaignPerformanceEstimates;
  warnings?: string[]; // e.g., "Budget exceeded", "Limited inventory available"
  suggestions?: string[]; // e.g., "Consider extending duration for better rates"
  algorithm?: {
    id: 'all-inclusive' | 'budget-friendly' | 'little-guys' | 'proportional';
    name: string;
    version: string;
    executedAt: Date;
  };
}

export interface CampaignCreateRequest extends Omit<CampaignInsert, 'campaignId' | 'selectedInventory' | 'pricing' | 'estimatedPerformance'> {
  // campaignId will be auto-generated
  // selectedInventory, pricing, estimatedPerformance come from analysis
  analysisResult: CampaignAnalysisResponse;
}

export interface CampaignListFilters {
  hubId?: string;
  status?: Campaign['status'] | Campaign['status'][];
  createdBy?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  searchTerm?: string; // Search in name, advertiser, description
}

export interface CampaignSummary {
  _id: string;
  campaignId: string;
  name: string;
  advertiserName: string;
  status: Campaign['status'];
  totalBudget: number;
  startDate: Date;
  endDate: Date;
  publications: number; // Count
  createdAt: Date;
}


