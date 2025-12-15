/**
 * Proof of Performance Schema
 * 
 * Stores documentation files (tearsheets, affidavits, screenshots, audio logs)
 * that verify ad delivery for offline and digital channels.
 * 
 * Key design decisions:
 * - Can be linked to specific placements or be order-level
 * - Includes verification workflow (pending → verified/rejected)
 * - Denormalizes key data for stability when inventory changes
 */

import { ObjectId } from 'mongodb';

// Types of proof of performance files
export type ProofFileType = 
  | 'tearsheet'      // Print ad scans/photos
  | 'affidavit'      // Sworn statements (radio/TV)
  | 'attestation'    // Publisher's attestation form (no file)
  | 'screenshot'     // Digital/social proof
  | 'audio_log'      // Radio/podcast recordings
  | 'video_clip'     // TV/streaming proof
  | 'report'         // Analytics reports
  | 'episode_link'   // Podcast episode link
  | 'invoice'        // Billing documentation
  | 'other';

/**
 * Attestation data for proofs submitted via form (no file upload)
 * Used when publication doesn't have a tearsheet/affidavit to upload
 */
export interface AttestationData {
  channel: 'print' | 'radio' | 'podcast';
  
  // Print-specific fields
  publicationDate?: string;
  pageNumber?: string;
  section?: string;
  adSize?: string;
  
  // Radio-specific fields
  dateRange?: { start: string; end: string };
  spotsAired?: number;
  dayparts?: string[];
  estimatedReach?: number;
  
  // Podcast-specific fields
  episodeDate?: string;
  episodeName?: string;
  episodeUrl?: string;
  downloads?: number;
  adPosition?: 'pre-roll' | 'mid-roll' | 'post-roll';
  
  // Common fields
  confirmedAt: Date;
  confirmedBy: string;
}

// Verification status
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

/**
 * Proof of Performance Document
 * 
 * Represents a single proof file uploaded to verify ad delivery.
 * Can be associated with the entire order or a specific placement.
 */
export interface ProofOfPerformance {
  _id?: string | ObjectId;
  
  // References to parent entities
  orderId: string;           // FK to publication_insertion_orders._id
  campaignId: string;        // For direct campaign queries
  publicationId: number;
  publicationName: string;   // Denormalized for display
  
  // Placement identification (denormalized, optional - can be order-level)
  itemPath?: string;         // Original path if specific to placement
  itemName?: string;         // Human-readable name
  channel?: string;          // Which channel this proof is for
  dimensions?: string;       // Size/format if applicable
  
  // File information
  fileType: ProofFileType;
  fileName: string;          // Original file name
  fileUrl: string;           // S3/CDN URL for viewing/downloading
  s3Key: string;             // S3 key for deletion
  fileSize: number;          // Size in bytes
  mimeType: string;          // MIME type (e.g., "image/jpeg", "application/pdf")
  
  // Context
  description?: string;      // User-provided description
  runDate?: Date;            // When the ad ran (single date)
  runDateEnd?: Date;         // End date for date ranges
  
  // Attestation data (for 'attestation' fileType - no file upload)
  attestationData?: AttestationData;
  
  // Upload metadata
  uploadedBy: string;        // User ID who uploaded
  uploadedAt: Date;
  
  // Verification workflow
  verificationStatus: VerificationStatus;
  verifiedBy?: string;       // User ID who verified/rejected
  verifiedAt?: Date;
  verificationNotes?: string; // Notes from verification (especially for rejections)
  
  // Soft delete
  deletedAt?: Date;
}

// Type for creating new proofs
export type ProofOfPerformanceInsert = Omit<ProofOfPerformance, '_id'>;

// Type for updating proofs
export type ProofOfPerformanceUpdate = Partial<Omit<ProofOfPerformance, '_id' | 'orderId' | 'campaignId' | 'publicationId' | 'uploadedBy' | 'uploadedAt' | 's3Key'>>;

/**
 * File type labels for display
 */
export const PROOF_FILE_TYPE_LABELS: Record<ProofFileType, string> = {
  tearsheet: 'Tearsheet',
  affidavit: 'Affidavit',
  attestation: 'Attestation',
  screenshot: 'Screenshot',
  audio_log: 'Audio Log',
  video_clip: 'Video Clip',
  report: 'Report',
  episode_link: 'Episode Link',
  invoice: 'Invoice',
  other: 'Other',
};

/**
 * File type descriptions
 */
export const PROOF_FILE_TYPE_DESCRIPTIONS: Record<ProofFileType, string> = {
  tearsheet: 'Scan or photo of printed advertisement',
  affidavit: 'Sworn statement confirming ad aired (radio/TV)',
  attestation: 'Publisher attestation confirming ad ran (form submission)',
  screenshot: 'Screenshot of digital or social media placement',
  audio_log: 'Audio recording of radio or podcast ad',
  video_clip: 'Video clip of TV or streaming ad',
  report: 'Analytics or performance report',
  episode_link: 'Direct link to podcast episode',
  invoice: 'Billing documentation',
  other: 'Other documentation',
};

/**
 * Recommended file types by channel
 */
export function getRecommendedFileTypes(channel?: string): ProofFileType[] {
  switch (channel) {
    case 'print':
      return ['tearsheet', 'attestation', 'report'];
    case 'radio':
      return ['affidavit', 'attestation', 'audio_log'];
    case 'podcast':
      return ['screenshot', 'episode_link', 'attestation', 'report'];
    case 'events':
      return ['screenshot', 'report', 'invoice'];
    case 'social':
      return ['screenshot', 'report'];
    case 'website':
    case 'newsletter':
      return ['screenshot', 'report'];
    case 'streaming':
      return ['video_clip', 'screenshot', 'report'];
    default:
      return ['tearsheet', 'affidavit', 'attestation', 'screenshot', 'audio_log', 'video_clip', 'report', 'episode_link', 'invoice', 'other'];
  }
}

/**
 * Allowed MIME types for proof uploads
 */
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  // PDFs
  'application/pdf',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Max file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate a proof of performance before saving
 */
export function validateProofOfPerformance(proof: Partial<ProofOfPerformance>): string[] {
  const errors: string[] = [];
  
  if (!proof.orderId) errors.push('orderId is required');
  if (!proof.campaignId) errors.push('campaignId is required');
  if (!proof.publicationId) errors.push('publicationId is required');
  if (!proof.publicationName) errors.push('publicationName is required');
  if (!proof.fileType) errors.push('fileType is required');
  if (!proof.uploadedBy) errors.push('uploadedBy is required');
  
  // Attestation proofs don't require file-related fields
  const isAttestation = proof.fileType === 'attestation';
  const isEpisodeLink = proof.fileType === 'episode_link';
  
  if (!isAttestation && !isEpisodeLink) {
    // File upload proofs require these fields
    if (!proof.fileName) errors.push('fileName is required');
    if (!proof.fileUrl) errors.push('fileUrl is required');
    if (!proof.s3Key) errors.push('s3Key is required');
    if (!proof.fileSize) errors.push('fileSize is required');
    if (!proof.mimeType) errors.push('mimeType is required');
    
    // Validate file size
    if (proof.fileSize && proof.fileSize > MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }
    
    // Validate MIME type
    if (proof.mimeType && !ALLOWED_MIME_TYPES.includes(proof.mimeType)) {
      errors.push(`File type ${proof.mimeType} is not allowed`);
    }
  }
  
  // Attestation proofs require attestation data
  if (isAttestation && !proof.attestationData) {
    errors.push('attestationData is required for attestation proofs');
  }
  
  // Episode link proofs require a URL in description or attestation data
  if (isEpisodeLink && !proof.attestationData?.episodeUrl && !proof.description) {
    errors.push('episodeUrl is required for episode link proofs');
  }
  
  // Validate date range
  if (proof.runDate && proof.runDateEnd && proof.runDateEnd < proof.runDate) {
    errors.push('runDateEnd must be after runDate');
  }
  
  return errors;
}

/**
 * Check if a verification status transition is valid
 */
export function isValidVerificationTransition(
  currentStatus: VerificationStatus,
  newStatus: VerificationStatus
): boolean {
  // Can only transition from pending
  if (currentStatus !== 'pending') {
    return false;
  }
  // Can transition to verified or rejected
  return newStatus === 'verified' || newStatus === 'rejected';
}

/**
 * Summary of proofs for an order
 */
export interface OrderProofSummary {
  orderId: string;
  totalProofs: number;
  byStatus: Record<VerificationStatus, number>;
  byFileType: Record<ProofFileType, number>;
  byChannel: Record<string, number>;
  allVerified: boolean;
  hasPending: boolean;
  hasRejected: boolean;
  lastUploadedAt?: Date;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
