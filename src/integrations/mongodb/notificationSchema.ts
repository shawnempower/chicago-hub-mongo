/**
 * Notification Schema
 * 
 * In-app notifications for users (publications and hub admins)
 */

import { ObjectId } from 'mongodb';

export type NotificationType = 
  | 'assets_ready'       // All assets uploaded for an order
  | 'order_received'     // New order sent to publication
  | 'order_confirmed'    // Publication confirmed an order
  | 'order_rejected'     // Publication rejected placements
  | 'message_received'   // New message in order thread
  | 'asset_updated'      // Hub replaced/updated an asset
  | 'placement_accepted' // Placement accepted by publication
  | 'placement_rejected' // Placement rejected by publication
  | 'placement_delivered' // Placement marked as delivered
  | 'reminder';          // General reminder notification

export interface NotificationDocument {
  _id?: string | ObjectId;
  
  // Recipient
  userId: string;              // User ID who should see this notification
  
  // Context - at least one should be set
  hubId?: string;              // For hub-level notifications
  publicationId?: number;      // For publication-level notifications
  
  // Notification content
  type: NotificationType;
  title: string;
  message: string;
  
  // Related entities for deep linking
  campaignId?: string;
  orderId?: string;
  messageId?: string;          // If this is a message notification
  
  // Navigation
  link?: string;               // URL to navigate to when clicked
  
  // State
  read: boolean;
  readAt?: Date;
  
  // Metadata
  createdAt: Date;
  expiresAt?: Date;            // Optional: auto-delete old notifications
  
  // For grouping/deduplication
  groupKey?: string;           // e.g., "message:order:123" to group related notifications
}

// Insert type (without auto-generated fields)
export type NotificationInsert = Omit<NotificationDocument, '_id' | 'createdAt' | 'read' | 'readAt'> & {
  read?: boolean;
};

// Update type
export type NotificationUpdate = Partial<Omit<NotificationDocument, '_id' | 'userId' | 'createdAt'>>;

// Query filters
export interface NotificationFilters {
  userId: string;
  read?: boolean;
  type?: NotificationType | NotificationType[];
  hubId?: string;
  publicationId?: number;
  campaignId?: string;
  limit?: number;
  skip?: number;
}

// Unread count by type for badge grouping
export interface NotificationCounts {
  total: number;
  byType: Partial<Record<NotificationType, number>>;
}
