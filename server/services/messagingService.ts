/**
 * Messaging Service
 * 
 * Handles CRUD operations for the unified messaging system.
 * Supports direct conversations, order-linked threads, and broadcasts.
 */

import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { ObjectId, Collection } from 'mongodb';
import {
  ConversationDocument,
  ConversationInsert,
  ConversationMessage,
  ConversationParticipant,
  ConversationWithUnread,
  ConversationFilters,
  ConversationLinkedEntity,
  ConversationType,
  DeliveryChannel,
  MessageAttachment,
  OrderMessageStats,
  SenderType,
} from '../../src/integrations/mongodb/messagingSchema';

class MessagingService {
  private get collection(): Collection<ConversationDocument> {
    return getDatabase().collection<ConversationDocument>(COLLECTIONS.MESSAGING_CONVERSATIONS);
  }

  // ===== Index Setup =====

  /**
   * Ensure indexes exist for optimal query performance.
   * Call this once during server startup.
   */
  async ensureIndexes(): Promise<void> {
    try {
      await this.collection.createIndex(
        { 'participants.userId': 1, lastMessageAt: -1 },
        { name: 'idx_participant_lastMsg' }
      );
      await this.collection.createIndex(
        { hubId: 1, type: 1 },
        { name: 'idx_hub_type' }
      );
      await this.collection.createIndex(
        { 'linkedEntity.campaignId': 1, 'linkedEntity.publicationId': 1 },
        { name: 'idx_linked_order', sparse: true }
      );
      await this.collection.createIndex(
        { broadcastId: 1 },
        { name: 'idx_broadcast', sparse: true }
      );
      console.log('✅ [MESSAGING] Indexes ensured');
    } catch (error) {
      console.error('❌ [MESSAGING] Error creating indexes:', error);
    }
  }

  // ===== Create Conversation =====

  /**
   * Create a new conversation (direct or order-linked)
   */
  async createConversation(
    data: ConversationInsert,
    initialMessage?: {
      content: string;
      sender: SenderType;
      senderName: string;
      senderId: string;
      deliveryChannel?: DeliveryChannel;
      attachments?: MessageAttachment[];
    }
  ): Promise<ConversationDocument> {
    const now = new Date();

    const messages: ConversationMessage[] = [];
    if (initialMessage) {
      messages.push({
        id: new ObjectId().toHexString(),
        messageType: 'message',
        content: initialMessage.content,
        sender: initialMessage.sender,
        senderName: initialMessage.senderName,
        senderId: initialMessage.senderId,
        timestamp: now,
        deliveryChannel: initialMessage.deliveryChannel || 'in_app',
        attachments: initialMessage.attachments,
      });
    }

    const doc: ConversationDocument = {
      type: data.type,
      hubId: data.hubId,
      subject: data.subject,
      participants: data.participants,
      linkedEntity: data.linkedEntity,
      broadcastId: data.broadcastId,
      messages,
      lastMessageAt: now,
      lastMessagePreview: initialMessage?.content?.slice(0, 100) || '',
      lastMessageSender: initialMessage?.senderName || '',
      readStatus: {},
      status: data.status || 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
    };

    // Mark the creator as having read up to now
    if (data.createdBy) {
      doc.readStatus[data.createdBy] = now;
    }

    const result = await this.collection.insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  // ===== Create Broadcast =====

  /**
   * Create a broadcast: one conversation per target publication, sharing a broadcastId.
   * Returns the array of created conversations.
   */
  async createBroadcast(
    hubId: string,
    subject: string,
    senderParticipant: ConversationParticipant,
    publicationParticipants: ConversationParticipant[],
    initialMessage: {
      content: string;
      sender: SenderType;
      senderName: string;
      senderId: string;
      deliveryChannel?: DeliveryChannel;
    }
  ): Promise<ConversationDocument[]> {
    const broadcastId = new ObjectId().toHexString();
    const conversations: ConversationDocument[] = [];

    for (const pubParticipant of publicationParticipants) {
      const conv = await this.createConversation(
        {
          type: 'broadcast',
          hubId,
          subject,
          participants: [senderParticipant, pubParticipant],
          broadcastId,
          status: 'active',
          createdBy: senderParticipant.userId,
        },
        initialMessage
      );
      conversations.push(conv);
    }

    return conversations;
  }

  // ===== Add Message =====

  /**
   * Add a message to an existing conversation.
   * Updates lastMessageAt, lastMessagePreview, lastMessageSender, and updatedAt.
   * Returns the new message object.
   */
  async addMessage(
    conversationId: string,
    message: {
      content: string;
      sender: SenderType;
      senderName: string;
      senderId: string;
      deliveryChannel?: DeliveryChannel;
      attachments?: MessageAttachment[];
    }
  ): Promise<{ success: boolean; message?: ConversationMessage; error?: string }> {
    try {
      const now = new Date();
      const newMessage: ConversationMessage = {
        id: new ObjectId().toHexString(),
        messageType: 'message',
        content: message.content,
        sender: message.sender,
        senderName: message.senderName,
        senderId: message.senderId,
        timestamp: now,
        deliveryChannel: message.deliveryChannel || 'in_app',
        attachments: message.attachments,
      };

      const result = await this.collection.updateOne(
        { _id: new ObjectId(conversationId) },
        {
          $push: { messages: newMessage as any },
          $set: {
            lastMessageAt: now,
            lastMessagePreview: message.content.slice(0, 100),
            lastMessageSender: message.senderName,
            updatedAt: now,
            // Mark sender as having read
            [`readStatus.${message.senderId}`]: now,
          },
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Conversation not found' };
      }

      return { success: true, message: newMessage };
    } catch (error) {
      console.error('Error adding message:', error);
      return { success: false, error: 'Failed to add message' };
    }
  }

  // ===== Add Pinned Note =====

  /**
   * Add a pinned note to a conversation.
   */
  async addPinnedNote(
    conversationId: string,
    content: string,
    sender: SenderType,
    senderName: string,
    senderId: string
  ): Promise<{ success: boolean; message?: ConversationMessage; error?: string }> {
    try {
      const now = new Date();
      const note: ConversationMessage = {
        id: new ObjectId().toHexString(),
        messageType: 'pinned_note',
        content,
        sender,
        senderName,
        senderId,
        timestamp: now,
        deliveryChannel: 'in_app',
        pinnedBy: senderId,
      };

      const result = await this.collection.updateOne(
        { _id: new ObjectId(conversationId) },
        {
          $push: { messages: note as any },
          $set: { updatedAt: now },
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Conversation not found' };
      }

      return { success: true, message: note };
    } catch (error) {
      console.error('Error adding pinned note:', error);
      return { success: false, error: 'Failed to add pinned note' };
    }
  }

  // ===== Update Email Status =====

  /**
   * Update the email delivery status for a specific message.
   */
  async updateEmailStatus(
    conversationId: string,
    messageId: string,
    emailStatus: { sentAt?: Date; recipientEmail?: string; error?: string }
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      {
        _id: new ObjectId(conversationId),
        'messages.id': messageId,
      },
      {
        $set: { 'messages.$.emailStatus': emailStatus },
      }
    );
    return result.modifiedCount > 0;
  }

  // ===== Get Conversations for User =====

  /**
   * Get paginated list of conversations for a user, with unread flags.
   */
  async getConversationsForUser(
    filters: ConversationFilters
  ): Promise<ConversationWithUnread[]> {
    const query: any = {
      'participants.userId': filters.userId,
      status: filters.status || 'active',
    };

    if (filters.hubId) {
      query.hubId = filters.hubId;
    }

    if (filters.type) {
      query.type = Array.isArray(filters.type) ? { $in: filters.type } : filters.type;
    }

    if (filters.search) {
      query.$or = [
        { subject: { $regex: filters.search, $options: 'i' } },
        { lastMessagePreview: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const conversations = await this.collection
      .find(query)
      .sort({ lastMessageAt: -1 })
      .skip(filters.skip || 0)
      .limit(filters.limit || 20)
      .toArray();

    // Compute unread flags
    return conversations.map(conv => {
      const lastReadAt = conv.readStatus?.[filters.userId];
      const hasUnread = !lastReadAt || 
        (conv.lastMessageAt && new Date(conv.lastMessageAt) > new Date(lastReadAt));
      
      // Count unread messages
      let unreadCount = 0;
      if (hasUnread && conv.messages) {
        unreadCount = conv.messages.filter(m => {
          if (m.senderId === filters.userId) return false; // Own messages don't count
          if (m.messageType === 'pinned_note') return false; // Notes don't count
          if (!lastReadAt) return true;
          return new Date(m.timestamp) > new Date(lastReadAt);
        }).length;
      }

      return {
        ...conv,
        hasUnreadMessages: hasUnread && unreadCount > 0,
        unreadCount,
      } as ConversationWithUnread;
    });
  }

  // ===== Get Single Conversation =====

  /**
   * Get a conversation by ID with all messages.
   */
  async getConversation(conversationId: string): Promise<ConversationDocument | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(conversationId) });
    } catch {
      return null;
    }
  }

  // ===== Get Conversation for Order =====

  /**
   * Find or auto-create a conversation linked to a specific order.
   * This is the bridge between the order detail view and the messaging system.
   */
  async getConversationForOrder(
    campaignId: string,
    publicationId: number,
    autoCreateData?: {
      hubId: string;
      participants: ConversationParticipant[];
      createdBy: string;
    }
  ): Promise<ConversationDocument | null> {
    // Try to find existing
    const existing = await this.collection.findOne({
      type: 'order',
      'linkedEntity.campaignId': campaignId,
      'linkedEntity.publicationId': publicationId,
    });

    if (existing) return existing;

    // Auto-create if data provided
    if (autoCreateData) {
      return this.createConversation({
        type: 'order',
        hubId: autoCreateData.hubId,
        participants: autoCreateData.participants,
        linkedEntity: { campaignId, publicationId },
        status: 'active',
        createdBy: autoCreateData.createdBy,
      });
    }

    return null;
  }

  // ===== Mark as Read =====

  /**
   * Mark a conversation as read by a user.
   */
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          [`readStatus.${userId}`]: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // ===== Get Unread Count =====

  /**
   * Get total unread conversation count for a user.
   */
  async getUnreadCount(userId: string, hubId?: string): Promise<number> {
    const pipeline: any[] = [
      {
        $match: {
          'participants.userId': userId,
          status: 'active',
          ...(hubId ? { hubId } : {}),
        },
      },
      {
        $addFields: {
          userLastRead: {
            $ifNull: [`$readStatus.${userId}`, new Date(0)],
          },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ['$lastMessageAt', '$userLastRead'] },
              // Exclude conversations where the last message is from this user
              { $ne: ['$lastMessageSender', ''] },
            ],
          },
        },
      },
      // Also check that there's at least one message NOT from this user after lastRead
      {
        $addFields: {
          hasUnreadFromOthers: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$messages',
                    as: 'msg',
                    cond: {
                      $and: [
                        { $ne: ['$$msg.senderId', userId] },
                        { $ne: ['$$msg.messageType', 'pinned_note'] },
                        { $gt: ['$$msg.timestamp', `$readStatus.${userId}`] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      { $match: { hasUnreadFromOthers: true } },
      { $count: 'total' },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }

  // ===== Get Unread Count for Orders =====

  /**
   * Count order-linked conversations with unread messages for hub dashboard stats.
   */
  async getUnreadCountForOrders(hubId: string, userId: string): Promise<number> {
    const pipeline: any[] = [
      {
        $match: {
          hubId,
          type: 'order',
          status: 'active',
          'participants.userId': userId,
        },
      },
      {
        $addFields: {
          userLastRead: {
            $ifNull: [`$readStatus.${userId}`, new Date(0)],
          },
        },
      },
      {
        $match: {
          $expr: { $gt: ['$lastMessageAt', '$userLastRead'] },
        },
      },
      { $count: 'total' },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0]?.total || 0;
  }

  // ===== Get Message Stats for Orders =====

  /**
   * Batch query to get message count and unread status for multiple orders.
   * Used by HubOrdersManagement to display message indicators per order row.
   */
  async getMessageStatsForOrders(
    orderKeys: Array<{ campaignId: string; publicationId: number }>,
    userId: string
  ): Promise<OrderMessageStats[]> {
    if (orderKeys.length === 0) return [];

    const orConditions = orderKeys.map(k => ({
      'linkedEntity.campaignId': k.campaignId,
      'linkedEntity.publicationId': k.publicationId,
    }));

    const conversations = await this.collection
      .find({
        type: 'order',
        $or: orConditions,
      })
      .project({
        'linkedEntity.campaignId': 1,
        'linkedEntity.publicationId': 1,
        'messages': 1,
        'readStatus': 1,
        'lastMessageAt': 1,
      })
      .toArray();

    return conversations.map((conv: any) => {
      const messages = (conv.messages || []).filter((m: any) => m.messageType === 'message');
      const lastReadAt = conv.readStatus?.[userId] ? new Date(conv.readStatus[userId]) : new Date(0);
      const hasUnread = messages.some(
        (m: any) => m.senderId !== userId && new Date(m.timestamp) > lastReadAt
      );

      return {
        campaignId: conv.linkedEntity?.campaignId || '',
        publicationId: conv.linkedEntity?.publicationId || 0,
        messageCount: messages.length,
        hasUnreadMessages: hasUnread,
      };
    });
  }

  // ===== Get Recent Conversations =====

  /**
   * Get recent conversations with unread info for MessageBell dropdown.
   */
  async getRecentConversations(
    userId: string,
    limit: number = 20,
    hubId?: string
  ): Promise<ConversationWithUnread[]> {
    return this.getConversationsForUser({
      userId,
      hubId,
      limit,
      status: 'active',
    });
  }

  // ===== Archive Conversation =====

  /**
   * Archive a conversation (soft delete).
   */
  async archiveConversation(conversationId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // ===== Get Conversation Participant Info =====

  /**
   * Check if a user is a participant in a conversation.
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      _id: new ObjectId(conversationId),
      'participants.userId': userId,
    });
    return count > 0;
  }

  // ===== Get Broadcast Conversations =====

  /**
   * Get all conversations in a broadcast group.
   */
  async getBroadcastConversations(broadcastId: string): Promise<ConversationDocument[]> {
    return this.collection
      .find({ broadcastId })
      .sort({ 'participants.publicationName': 1 })
      .toArray();
  }
}

// Export singleton instance
export const messagingService = new MessagingService();
