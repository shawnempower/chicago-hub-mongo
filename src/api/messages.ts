/**
 * Messages API Client
 * 
 * Frontend API client for the unified messaging system.
 */

import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';
import type {
  ConversationDocument,
  ConversationWithUnread,
  ConversationType,
  DeliveryChannel,
  MessageAttachment,
  ConversationMessage,
  OrderMessageStats,
} from '@/integrations/mongodb/messagingSchema';

// ===== Types for API responses =====

export interface ConversationListItem extends Omit<ConversationWithUnread, 'messages'> {
  messageCount: number;
  hubName?: string;
}

export interface ConversationListResponse {
  conversations: ConversationListItem[];
}

export interface ConversationDetailResponse {
  conversation: ConversationDocument;
}

export interface SendMessageResponse {
  success: boolean;
  message?: ConversationMessage;
}

export interface UnreadCountResponse {
  count: number;
}

export interface OrderMessageStatsResponse {
  stats: OrderMessageStats[];
}

export interface BroadcastResponse {
  broadcastId: string;
  conversationCount: number;
  conversations: Array<{ _id: string; publicationName?: string }>;
}

// ===== API Methods =====

export const messagesApi = {
  /**
   * List conversations for the current user
   */
  async listConversations(params?: {
    type?: ConversationType;
    hubId?: string;
    limit?: number;
    skip?: number;
    search?: string;
    status?: 'active' | 'archived';
  }): Promise<ConversationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.hubId) searchParams.set('hubId', params.hubId);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const url = `${API_BASE_URL}/messages/conversations?${searchParams.toString()}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list conversations');
    }

    return response.json();
  },

  /**
   * Create a new direct conversation
   */
  async createConversation(data: {
    hubId: string;
    subject?: string;
    recipientPublicationId?: number;
    recipientUserId?: string;          // Direct message to a specific user (e.g. admin)
    initialMessage?: string;
    deliveryChannel?: DeliveryChannel;
  }): Promise<ConversationDetailResponse> {
    const response = await authenticatedFetch(`${API_BASE_URL}/messages/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create conversation');
    }

    return response.json();
  },

  /**
   * Create a broadcast to multiple publications
   */
  async createBroadcast(data: {
    hubId: string;
    subject: string;
    publicationIds: number[];
    message: string;
    deliveryChannel?: DeliveryChannel;
  }): Promise<BroadcastResponse> {
    const response = await authenticatedFetch(`${API_BASE_URL}/messages/conversations/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create broadcast');
    }

    return response.json();
  },

  /**
   * Get a single conversation with all messages
   */
  async getConversation(conversationId: string): Promise<ConversationDetailResponse> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get conversation');
    }

    return response.json();
  },

  /**
   * Get or create conversation for an order
   */
  async getOrderConversation(
    campaignId: string,
    publicationId: number
  ): Promise<ConversationDetailResponse> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/conversations/by-order/${campaignId}/${publicationId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get order conversation');
    }

    return response.json();
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    data: {
      content: string;
      deliveryChannel?: DeliveryChannel;
      attachments?: MessageAttachment[];
    }
  ): Promise<SendMessageResponse> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  },

  /**
   * Add a pinned note to a conversation
   */
  async addNote(conversationId: string, content: string): Promise<SendMessageResponse> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add note');
    }

    return response.json();
  },

  /**
   * Mark a conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}/read`,
      { method: 'PUT' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark as read');
    }
  },

  /**
   * Get total unread conversation count
   */
  async getUnreadCount(hubId?: string): Promise<number> {
    const params = hubId ? `?hubId=${hubId}` : '';
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/unread-count${params}`
    );

    if (!response.ok) return 0;

    const data: UnreadCountResponse = await response.json();
    return data.count;
  },

  /**
   * Get message stats for multiple orders (batch)
   */
  async getOrderMessageStats(
    orderKeys: Array<{ campaignId: string; publicationId: number }>
  ): Promise<OrderMessageStats[]> {
    if (orderKeys.length === 0) return [];

    const keysParam = orderKeys.map(k => `${k.campaignId}:${k.publicationId}`).join(',');
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/order-message-stats?orderKeys=${encodeURIComponent(keysParam)}`
    );

    if (!response.ok) return [];

    const data: OrderMessageStatsResponse = await response.json();
    return data.stats;
  },

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}/archive`,
      { method: 'PUT' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to archive conversation');
    }
  },
};
