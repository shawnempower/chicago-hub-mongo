/**
 * Conversation Service
 * 
 * Manages conversation storage and retrieval for the inventory chat agent
 */

import { getDatabase } from '../src/integrations/mongodb/client';
import { Conversation, ConversationInsert, ConversationMessage, CONVERSATION_COLLECTION } from './conversationSchema';
import { ObjectId } from 'mongodb';

export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(userId: string, hubId: string): Promise<Conversation> {
    const db = getDatabase();
    
    const conversation: ConversationInsert = {
      conversationId: new ObjectId().toHexString(),
      userId,
      hubId,
      title: 'New Conversation',
      messages: [],
      contextFiles: undefined,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      },
    };

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .insertOne(conversation);

    return {
      ...conversation,
      _id: result.insertedId,
    };
  }

  /**
   * Get all conversations for a user and hub
   */
  static async getConversations(userId: string, hubId?: string): Promise<Conversation[]> {
    const db = getDatabase();
    
    const query: any = { userId };
    if (hubId) {
      query.hubId = hubId;
    }

    const conversations = await db
      .collection(CONVERSATION_COLLECTION)
      .find(query)
      .sort({ 'metadata.updatedAt': -1 })
      .toArray();

    return conversations as Conversation[];
  }

  /**
   * Get a single conversation by ID
   * Includes authorization check
   */
  static async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const db = getDatabase();
    
    const conversation = await db
      .collection(CONVERSATION_COLLECTION)
      .findOne({ conversationId, userId });

    return conversation as Conversation | null;
  }

  /**
   * Add a message to a conversation
   */
  static async addMessage(
    conversationId: string, 
    userId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<boolean> {
    const db = getDatabase();
    
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        { 
          $push: { messages: message },
          $set: { 
            'metadata.updatedAt': new Date(),
            'metadata.lastMessageAt': new Date(),
          },
          $inc: { 'metadata.messageCount': 1 }
        }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Update conversation title
   */
  static async updateTitle(conversationId: string, userId: string, title: string): Promise<boolean> {
    const db = getDatabase();
    
    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        { 
          $set: { 
            title,
            'metadata.updatedAt': new Date(),
          }
        }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Update context file reference
   */
  static async updateContextFile(
    conversationId: string, 
    userId: string, 
    fileId: string,
    publicationCount: number
  ): Promise<boolean> {
    const db = getDatabase();
    
    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        { 
          $set: { 
            contextFiles: {
              fileId,
              uploadedAt: new Date(),
              publicationCount,
            },
            'metadata.updatedAt': new Date(),
          }
        }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    
    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .deleteOne({ conversationId, userId });

    return result.deletedCount > 0;
  }

  /**
   * Auto-generate a title based on the first user message
   */
  static generateTitle(firstMessage: string): string {
    const maxLength = 50;
    const cleaned = firstMessage.trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get recent messages for context (last N messages)
   */
  static async getRecentMessages(
    conversationId: string, 
    userId: string, 
    limit: number = 20
  ): Promise<ConversationMessage[]> {
    const conversation = await this.getConversation(conversationId, userId);
    
    if (!conversation || !conversation.messages) {
      return [];
    }

    // Return last N messages
    return conversation.messages.slice(-limit);
  }
}

