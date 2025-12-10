/**
 * Creative Assets Schema
 * 
 * Manages creative assets (images, videos, PDFs) for campaigns and insertion orders
 */

import { ObjectId } from 'mongodb';

export interface CreativeAssetMetadata {
  // File information
  fileName: string;
  originalFileName: string;
  fileSize: number; // in bytes
  fileType: string; // MIME type: 'image/jpeg', 'image/png', 'application/pdf', 'video/mp4', etc.
  fileExtension: string; // 'jpg', 'png', 'pdf', 'mp4', etc.
  
  // Storage information
  fileUrl: string; // Full URL or path to access file
  storagePath: string; // Path in storage system
  storageProvider: 'local' | 's3' | 'cloudinary'; // Where file is stored
  
  // Image-specific metadata
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnailUrl?: string; // For images and videos
  
  // Video-specific metadata
  duration?: number; // in seconds
  codec?: string;
  
  // Content categorization
  assetType: 'logo' | 'banner' | 'display_ad' | 'video' | 'pdf' | 'social_media' | 'print_ad' | 'other';
  tags?: string[];
  description?: string;
}

export interface CreativeAsset {
  _id?: string | ObjectId;
  assetId: string; // Unique identifier (generated)
  
  // Metadata
  metadata: CreativeAssetMetadata;
  
  // Association - link to campaigns, packages, or insertion orders
  associations: {
    campaignId?: string; // If associated with a campaign
    packageId?: string; // If associated with a package
    insertionOrderId?: string; // If associated with a specific insertion order
    publicationId?: number; // If for a specific publication
    placementId?: string; // Specific placement/inventory item
  };
  
  // Specifications from publication's inventory requirements
  specifications?: {
    placementName?: string;
    publicationName?: string;
    channel?: string;
    dimensions?: string | string[];
    fileFormats?: string[];
    maxFileSize?: string;
    colorSpace?: string;
    resolution?: string;
    additionalRequirements?: string;
  };
  
  // Usage tracking
  usage?: {
    placements?: Array<{
      publicationId: number;
      publicationName: string;
      channel: string;
      placementName: string;
      usedAt?: Date;
    }>;
    downloadCount: number;
    lastDownloadedAt?: Date;
  };
  
  // Upload information
  uploadInfo: {
    uploadedAt: Date;
    uploadedBy: string; // User ID
    uploaderName?: string; // For display
    uploadSource: 'web' | 'api' | 'email'; // How it was uploaded
  };
  
  // Status and approval
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  approvalInfo?: {
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
  };
  
  // Versioning (for when assets are updated)
  version: number;
  previousVersions?: Array<{
    assetId: string;
    fileUrl: string;
    uploadedAt: Date;
  }>;
  
  // Notes and comments
  notes?: string;
  comments?: Array<{
    userId: string;
    userName: string;
    comment: string;
    commentedAt: Date;
  }>;
  
  // Digital Ad Properties (for website, newsletter, streaming placements)
  digitalAdProperties?: {
    clickUrl?: string;         // Landing page URL for click-through
    altText?: string;          // Alt text for accessibility
    // For newsletter text ads
    headline?: string;
    body?: string;
    ctaText?: string;          // Call-to-action button text (e.g., "Learn More")
  };
  
  // Soft delete
  deletedAt?: Date;
  deletedBy?: string;
}

// Type for creating new assets
export type CreativeAssetInsert = Omit<CreativeAsset, '_id' | 'assetId' | 'version' | 'usage'>

/**
 * ZIP file upload support
 * When a ZIP is uploaded, it can contain multiple assets for different placements
 */
export interface ZipUploadRequest {
  campaignId: string;
  zipFile: Buffer;
  fileName: string;
  placementMapping?: Record<string, string>; // filename -> placementId mapping
} & {
  usage?: Partial<CreativeAsset['usage']>;
};

// Type for updating assets
export type CreativeAssetUpdate = Partial<Omit<CreativeAsset, '_id' | 'assetId' | 'uploadInfo'>>;

// API Request/Response types

export interface CreativeAssetUploadRequest {
  // File will be in form data
  campaignId?: string;
  packageId?: string;
  insertionOrderId?: string;
  publicationId?: number;
  assetType: CreativeAssetMetadata['assetType'];
  description?: string;
  tags?: string[];
  // Digital ad properties
  clickUrl?: string;
  altText?: string;
  headline?: string;
  body?: string;
  ctaText?: string;
}

/**
 * Check if a channel type requires digital ad properties (click URL, etc.)
 */
export function isDigitalChannel(channel: string): boolean {
  const digitalChannels = ['website', 'newsletter', 'streaming'];
  return digitalChannels.includes(channel?.toLowerCase());
}

/**
 * Channels that support tracking scripts
 */
export const TRACKABLE_CHANNELS = ['website', 'newsletter', 'streaming'] as const;
export type TrackableChannel = typeof TRACKABLE_CHANNELS[number];

export interface CreativeAssetUploadResponse {
  success: boolean;
  asset?: CreativeAsset;
  error?: string;
}

export interface CreativeAssetListFilters {
  campaignId?: string;
  packageId?: string;
  insertionOrderId?: string;
  publicationId?: number;
  assetType?: CreativeAssetMetadata['assetType'];
  status?: CreativeAsset['status'];
  uploadedBy?: string;
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  searchTerm?: string; // Search in fileName, description, tags
}

export interface CreativeAssetSummary {
  _id: string;
  assetId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  assetType: string;
  status: CreativeAsset['status'];
  uploadedAt: Date;
  uploadedBy: string;
  associations: CreativeAsset['associations'];
}

