/**
 * Conversation Service
 * 
 * Manages conversation storage and retrieval for the Hub Sales Assistant
 */

import { getDatabase } from '../src/integrations/mongodb/client';
import { 
  Conversation, 
  ConversationInsert, 
  ConversationMessage, 
  ConversationAttachment,
  GeneratedFile,
  ConversationContext,
  ConversationTokenUsage,
  CONVERSATION_COLLECTION,
  MAX_FILES_PER_CONVERSATION,
} from './conversationSchema';
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

  // ============================================
  // Attachment Methods
  // ============================================

  /**
   * Add an attachment to a conversation
   */
  static async addAttachment(
    conversationId: string,
    userId: string,
    attachment: ConversationAttachment
  ): Promise<boolean> {
    const db = getDatabase();
    
    // Check attachment limit
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    const currentCount = conversation.attachments?.length || 0;
    if (currentCount >= MAX_FILES_PER_CONVERSATION) {
      throw new Error(`Maximum of ${MAX_FILES_PER_CONVERSATION} attachments allowed per conversation`);
    }

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        {
          $push: { attachments: attachment },
          $set: { 'metadata.updatedAt': new Date() }
        }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Remove an attachment from a conversation
   */
  static async removeAttachment(
    conversationId: string,
    userId: string,
    attachmentId: string
  ): Promise<ConversationAttachment | null> {
    const db = getDatabase();
    
    // Get the attachment before removing (for S3 cleanup)
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      return null;
    }
    
    const attachment = conversation.attachments?.find(a => a.id === attachmentId);
    if (!attachment) {
      return null;
    }

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        {
          $pull: { attachments: { id: attachmentId } },
          $set: { 'metadata.updatedAt': new Date() }
        }
      );

    return result.modifiedCount > 0 ? attachment : null;
  }

  /**
   * Get all attachments for a conversation
   */
  static async getAttachments(
    conversationId: string,
    userId: string
  ): Promise<ConversationAttachment[]> {
    const conversation = await this.getConversation(conversationId, userId);
    return conversation?.attachments || [];
  }

  /**
   * Get a specific attachment by ID
   */
  static async getAttachment(
    conversationId: string,
    userId: string,
    attachmentId: string
  ): Promise<ConversationAttachment | null> {
    const attachments = await this.getAttachments(conversationId, userId);
    return attachments.find(a => a.id === attachmentId) || null;
  }

  // ============================================
  // Generated File Methods
  // ============================================

  /**
   * Add a generated file to a conversation
   */
  static async addGeneratedFile(
    conversationId: string,
    userId: string,
    file: GeneratedFile
  ): Promise<boolean> {
    const db = getDatabase();

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        {
          $push: { generatedFiles: file },
          $set: { 'metadata.updatedAt': new Date() }
        }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Get all generated files for a conversation
   */
  static async getGeneratedFiles(
    conversationId: string,
    userId: string
  ): Promise<GeneratedFile[]> {
    const conversation = await this.getConversation(conversationId, userId);
    return conversation?.generatedFiles || [];
  }

  /**
   * Get a specific generated file by ID
   */
  static async getGeneratedFile(
    conversationId: string,
    userId: string,
    fileId: string
  ): Promise<GeneratedFile | null> {
    const files = await this.getGeneratedFiles(conversationId, userId);
    return files.find(f => f.id === fileId) || null;
  }

  // ============================================
  // Context Methods
  // ============================================

  /**
   * Update the conversation context (brand/campaign info)
   */
  static async updateContext(
    conversationId: string,
    userId: string,
    contextUpdate: Partial<ConversationContext>
  ): Promise<boolean> {
    const db = getDatabase();
    
    // Build the $set object for partial updates
    const setFields: Record<string, any> = {
      'metadata.updatedAt': new Date(),
    };
    
    for (const [key, value] of Object.entries(contextUpdate)) {
      if (value !== undefined) {
        setFields[`context.${key}`] = value;
      }
    }

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        { $set: setFields }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Get the conversation context
   */
  static async getContext(
    conversationId: string,
    userId: string
  ): Promise<ConversationContext | null> {
    const conversation = await this.getConversation(conversationId, userId);
    return conversation?.context || null;
  }

  /**
   * Clear the conversation context
   */
  static async clearContext(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const db = getDatabase();

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        {
          $unset: { context: '' },
          $set: { 'metadata.updatedAt': new Date() }
        }
      );

    return result.modifiedCount > 0;
  }

  // ============================================
  // Token Usage Methods
  // ============================================

  /**
   * Add token usage from a single exchange to the running total
   */
  static async addTokenUsage(
    conversationId: string,
    userId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<boolean> {
    const db = getDatabase();

    const result = await db
      .collection(CONVERSATION_COLLECTION)
      .updateOne(
        { conversationId, userId },
        {
          $inc: {
            'tokenUsage.totalInputTokens': inputTokens,
            'tokenUsage.totalOutputTokens': outputTokens,
            'tokenUsage.exchangeCount': 1,
          },
          $set: { 'metadata.updatedAt': new Date() }
        }
      );

    return result.modifiedCount > 0;
  }

  /**
   * Get token usage for a conversation
   */
  static async getTokenUsage(
    conversationId: string,
    userId: string
  ): Promise<ConversationTokenUsage> {
    const conversation = await this.getConversation(conversationId, userId);
    return conversation?.tokenUsage || { totalInputTokens: 0, totalOutputTokens: 0, exchangeCount: 0 };
  }
}

