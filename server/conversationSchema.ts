/**
 * Conversation Schema
 * 
 * Defines the structure for storing AI chat conversations
 * between users and the inventory exploration agent.
 */

import { ObjectId } from 'mongodb';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  _id?: string | ObjectId;
  conversationId: string; // Unique identifier
  userId: string; // Owner of the conversation
  hubId: string; // Associated hub (for filtering)
  title: string; // Auto-generated or user-set title
  messages: ConversationMessage[]; // Chat history
  contextFiles?: {
    fileId?: string; // Anthropic uploaded file ID
    uploadedAt?: Date;
    publicationCount?: number;
  }; // References to uploaded context
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    lastMessageAt?: Date;
  };
}

export interface ConversationInsert extends Omit<Conversation, '_id'> {}

// Collection name
export const CONVERSATION_COLLECTION = 'conversations';

