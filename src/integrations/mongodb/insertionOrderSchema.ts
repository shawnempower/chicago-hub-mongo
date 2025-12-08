/**
 * Insertion Order Schema
 * 
 * Standalone schema for publication insertion orders stored in their own collection.
 * This replaces the embedded publicationInsertionOrders array in campaigns.
 */

import { ObjectId } from 'mongodb';

export type InsertionOrderStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';
export type PlacementStatus = 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered';

/**
 * Asset reference stored on the order - just the IDs needed to look up current asset
 * Assets are loaded dynamically when viewing the order, so updates are reflected automatically
 */
export interface OrderAssetReference {
  specGroupId: string;           // Links to creative asset by spec group
  placementId: string;           // The placement this asset is for
  placementName: string;
  channel: string;
  dimensions?: string;           // For display (e.g., "300x250")
}

export interface OrderAdSpecification {
  placementId: string;
  placementName: string;
  channel: string;
  format: {
    dimensions?: string;
    fileFormats?: string[];
    maxFileSize?: string;
    colorSpace?: string;
    resolution?: string;
    duration?: number;
    bitrate?: string;
    additionalRequirements?: string;
  };
  deadline?: Date;
  providedAt?: Date;
  providedBy?: string;
  lastUpdated?: Date;
}

export interface OrderStatusHistoryEntry {
  status: InsertionOrderStatus;
  timestamp: Date;
  changedBy: string;
  notes?: string;
}

export interface PlacementStatusHistoryEntry {
  placementId: string;
  status: PlacementStatus;
  timestamp: Date;
  changedBy: string;
  notes?: string;
}

export interface ProofOfPerformance {
  uploadedAt?: Date;
  uploadedBy?: string;
  files?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
  }>;
  notes?: string;
}

/**
 * Message in the order conversation thread
 * Supports bi-directional communication between hub and publication
 */
export interface OrderMessage {
  id: string;                     // Unique ID for the message
  content: string;                // Message text
  sender: 'hub' | 'publication';  // Who sent it
  senderName: string;             // Display name of sender
  senderId: string;               // User ID of sender
  timestamp: Date;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }>;
  // Optional: mark as read
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
}

/**
 * PublicationInsertionOrderDocument
 * 
 * The main document stored in the publication_insertion_orders collection.
 * Contains campaign reference fields for querying and all order data.
 */
export interface PublicationInsertionOrderDocument {
  _id?: string | ObjectId;
  
  // Campaign reference fields (required for querying)
  campaignId: string;           // Reference to campaign._id or campaignId string
  campaignObjectId?: string;    // The MongoDB ObjectId as string (for lookup)
  campaignName: string;         // Denormalized for display
  hubId: string;                // For hub-level queries
  
  // Publication info
  publicationId: number;
  publicationName: string;
  
  // Order generation
  generatedAt: Date;
  // NOTE: HTML content is generated on-demand via /print endpoint, not stored
  
  // Delivery tracking
  sentTo?: string[];
  sentAt?: Date;
  status: InsertionOrderStatus;
  confirmationDate?: Date;
  
  // Notes (pinned summary notes)
  publicationNotes?: string;    // Pinned note from publication
  hubNotes?: string;            // Pinned note from hub
  
  // Message thread - conversation between hub and publication
  messages?: OrderMessage[];
  
  // Asset references - used to dynamically load current assets
  // Each placement needs an asset; this tracks which specGroupId maps to which placement
  assetReferences?: OrderAssetReference[];
  
  // Asset status summary (updated when assets change)
  assetStatus?: {
    totalPlacements: number;
    placementsWithAssets: number;
    allAssetsReady: boolean;
    lastChecked?: Date;
  };
  
  // Ad specifications
  adSpecifications?: OrderAdSpecification[];
  adSpecificationsProvided?: boolean;
  
  // Status tracking
  statusHistory?: OrderStatusHistoryEntry[];
  
  // Placement-level tracking
  placementStatuses?: Record<string, PlacementStatus>;
  placementStatusHistory?: PlacementStatusHistoryEntry[];
  
  // Post-campaign
  proofOfPerformance?: ProofOfPerformance;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Type for creating new orders
export type PublicationInsertionOrderInsert = Omit<PublicationInsertionOrderDocument, '_id' | 'createdAt' | 'updatedAt'>;

// Type for updating orders
export type PublicationInsertionOrderUpdate = Partial<Omit<PublicationInsertionOrderDocument, '_id' | 'campaignId' | 'campaignObjectId' | 'createdAt'>>;

// Response type with additional campaign data
export interface PublicationInsertionOrderWithCampaign extends PublicationInsertionOrderDocument {
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  uploadedAssetCount?: number;
  placementCount?: number;
  messageCount?: number;
  hasUnreadMessages?: boolean;
}

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<InsertionOrderStatus, InsertionOrderStatus[]> = {
  draft: ['sent'],
  sent: ['confirmed', 'rejected'],
  confirmed: ['in_production', 'rejected'],
  rejected: ['draft'],
  in_production: ['delivered'],
  delivered: []
};

/**
 * Validate if a status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: InsertionOrderStatus,
  newStatus: InsertionOrderStatus
): boolean {
  if (currentStatus === newStatus) return false;
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

