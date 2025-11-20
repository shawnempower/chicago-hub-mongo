/**
 * Inventory Chat API Client
 * 
 * Frontend API wrapper for inventory chat conversations
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Conversation {
  _id?: string;
  conversationId: string;
  userId: string;
  hubId: string;
  title: string;
  messages: ConversationMessage[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    lastMessageAt?: string;
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SendMessageResponse {
  message: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(hubId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/inventory-chat/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ hubId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create conversation' }));
    throw new Error(error.error || 'Failed to create conversation');
  }

  return response.json();
}

/**
 * List conversations for the current user
 */
export async function listConversations(hubId?: string): Promise<Conversation[]> {
  const params = new URLSearchParams();
  if (hubId) {
    params.append('hubId', hubId);
  }

  const url = `${API_BASE_URL}/api/inventory-chat/conversations${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list conversations' }));
    throw new Error(error.error || 'Failed to list conversations');
  }

  const data = await response.json();
  return data.conversations || [];
}

/**
 * Get a specific conversation
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/inventory-chat/conversations/${conversationId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch conversation' }));
    throw new Error(error.error || 'Failed to fetch conversation');
  }

  return response.json();
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(conversationId: string, message: string): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/inventory-chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/inventory-chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete conversation' }));
    throw new Error(error.error || 'Failed to delete conversation');
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/inventory-chat/conversations/${conversationId}/title`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update title' }));
    throw new Error(error.error || 'Failed to update title');
  }
}

