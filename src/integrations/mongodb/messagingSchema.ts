/**
 * Messaging Schema
 * 
 * Unified messaging system for hub-publication conversations.
 * Supports direct messages, order-linked threads, and broadcasts.
 * Replaces the embedded messages on orders (migration pending).
 */

import { ObjectId } from 'mongodb';

// ===== Conversation Types =====

export type ConversationType = 'direct' | 'order' | 'broadcast';
export type ConversationStatus = 'active' | 'archived';
export type MessageType = 'message' | 'pinned_note';
export type DeliveryChannel = 'in_app' | 'email' | 'both';
export type SenderType = 'hub' | 'publication';

// ===== Message Attachment =====

export interface MessageAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

// ===== Email Delivery Status =====

export interface EmailDeliveryStatus {
  sentAt?: Date;
  recipientEmail?: string;
  error?: string;
}

// ===== Conversation Message =====

export interface ConversationMessage {
  id: string;                          // Unique message ID (ObjectId hex)
  messageType: MessageType;            // 'message' or 'pinned_note'
  content: string;                     // Message body text
  sender: SenderType;                  // Who sent it
  senderName: string;                  // Display name
  senderId: string;                    // User ID
  timestamp: Date;
  attachments?: MessageAttachment[];
  deliveryChannel: DeliveryChannel;    // How the message was delivered
  emailStatus?: EmailDeliveryStatus;   // Email delivery tracking (if applicable)
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
  pinnedBy?: string;                   // userId who pinned (for pinned_note type)
}

// ===== Conversation Participant =====

export interface ConversationParticipant {
  userId: string;
  userType: SenderType;                // 'hub' or 'publication'
  publicationId?: number;              // For publication participants
  publicationName?: string;            // Denormalized for display
  name: string;                        // Display name
  email?: string;                      // For email delivery
}

// ===== Linked Entity (for order-linked conversations) =====

export interface ConversationLinkedEntity {
  campaignId?: string;
  publicationId?: number;
  orderId?: string;                    // Optional: direct reference to order _id
}

// ===== Conversation Document =====

export interface ConversationDocument {
  _id?: string | ObjectId;
  type: ConversationType;              // 'direct', 'order', or 'broadcast'
  hubId: string;                       // Hub context
  subject?: string;                    // Optional subject line (required for broadcast)
  participants: ConversationParticipant[];
  linkedEntity?: ConversationLinkedEntity; // For order-linked conversations
  broadcastId?: string;                // Shared ID for fan-out broadcast conversations
  messages: ConversationMessage[];
  lastMessageAt: Date;                 // For sorting
  lastMessagePreview: string;          // Truncated last message content
  lastMessageSender: string;           // Name of last message sender
  readStatus: Record<string, Date>;    // userId -> lastReadAt timestamp
  status: ConversationStatus;          // 'active' or 'archived'
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;                   // userId who created the conversation
}

// ===== Insert Type (without auto-generated fields) =====

export type ConversationInsert = Omit<
  ConversationDocument, 
  '_id' | 'createdAt' | 'updatedAt' | 'messages' | 'lastMessageAt' | 'lastMessagePreview' | 'lastMessageSender' | 'readStatus'
> & {
  messages?: ConversationMessage[];
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageSender?: string;
  readStatus?: Record<string, Date>;
};

// ===== Conversation With Unread Info (for list views) =====

export interface ConversationWithUnread extends ConversationDocument {
  hasUnreadMessages: boolean;
  unreadCount?: number;
}

// ===== Query Filters =====

export interface ConversationFilters {
  userId: string;
  hubId?: string;
  type?: ConversationType | ConversationType[];
  status?: ConversationStatus;
  limit?: number;
  skip?: number;
  search?: string;                     // Search in subject / lastMessagePreview
}

// ===== Order Message Stats (for order list views) =====

export interface OrderMessageStats {
  campaignId: string;
  publicationId: number;
  messageCount: number;
  hasUnreadMessages: boolean;
}

// ===== Create Conversation Request =====

export interface CreateConversationRequest {
  type: ConversationType;
  hubId: string;
  subject?: string;
  recipientPublicationId?: number;     // For direct messages
  recipientPublicationName?: string;
  linkedEntity?: ConversationLinkedEntity;
  initialMessage?: string;
  deliveryChannel?: DeliveryChannel;
}

// ===== Create Broadcast Request =====

export interface CreateBroadcastRequest {
  hubId: string;
  subject: string;
  publicationIds: number[];            // Target publications (empty = all in hub)
  message: string;
  deliveryChannel?: DeliveryChannel;
}

// ===== Send Message Request =====

export interface SendMessageRequest {
  content: string;
  deliveryChannel?: DeliveryChannel;
  attachments?: MessageAttachment[];
}
