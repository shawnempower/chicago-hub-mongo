/**
 * Inventory Chat API Client
 * 
 * Frontend API wrapper for Hub Sales Assistant conversations
 */

import { API_BASE_URL } from '@/config/api';

// Helper to get auth headers
function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============================================
// Types
// ============================================

export interface ConversationAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  isImage?: boolean;
  hasExtractedText?: boolean;
}

export interface GeneratedFile {
  id: string;
  filename: string;
  fileType: 'proposal_md' | 'package_csv';
  createdAt: string;
}

export interface ConversationContext {
  brandName?: string;
  brandUrl?: string;
  budgetMonthly?: number;
  budgetTotal?: number;
  campaignDuration?: string;
  targetAudience?: string;
  geographicFocus?: string;
  objectives?: string[];
  notes?: string;
}

export interface Conversation {
  _id?: string;
  conversationId: string;
  userId: string;
  hubId: string;
  title: string;
  messages: ConversationMessage[];
  attachments?: ConversationAttachment[];
  generatedFiles?: GeneratedFile[];
  context?: ConversationContext;
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
  generatedFiles?: GeneratedFile[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(hubId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/inventory-chat/conversations`, {
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

  const url = `${API_BASE_URL}/inventory-chat/conversations${params.toString() ? '?' + params.toString() : ''}`;
  
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
  const response = await fetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}`, {
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
  const response = await fetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}/messages`, {
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
  const response = await fetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}`, {
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
  const response = await fetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}/title`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update title' }));
    throw new Error(error.error || 'Failed to update title');
  }
}

// ============================================
// Attachment Functions
// ============================================

/**
 * Upload file attachments to a conversation
 */
export async function uploadAttachments(
  conversationId: string,
  files: File[]
): Promise<ConversationAttachment[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/attachments`,
    {
      method: 'POST',
      headers: getAuthHeaders(false), // Don't include Content-Type for FormData
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to upload files' }));
    throw new Error(error.error || 'Failed to upload files');
  }

  const data = await response.json();
  return data.attachments || [];
}

/**
 * List attachments for a conversation
 */
export async function listAttachments(conversationId: string): Promise<ConversationAttachment[]> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/attachments`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list attachments' }));
    throw new Error(error.error || 'Failed to list attachments');
  }

  const data = await response.json();
  return data.attachments || [];
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(conversationId: string, attachmentId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete attachment' }));
    throw new Error(error.error || 'Failed to delete attachment');
  }
}

// ============================================
// Generated File Functions
// ============================================

/**
 * List generated files for a conversation
 */
export async function listGeneratedFiles(conversationId: string): Promise<GeneratedFile[]> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/files`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list files' }));
    throw new Error(error.error || 'Failed to list files');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Get download URL for a generated file
 */
export async function getFileDownloadUrl(conversationId: string, fileId: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/files/${fileId}/download`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get download URL' }));
    throw new Error(error.error || 'Failed to get download URL');
  }

  const data = await response.json();
  return data.downloadUrl;
}

/**
 * Download a generated file (opens in new tab or triggers download)
 */
export async function downloadGeneratedFile(conversationId: string, fileId: string): Promise<void> {
  const downloadUrl = await getFileDownloadUrl(conversationId, fileId);
  window.open(downloadUrl, '_blank');
}

// ============================================
// Context Functions
// ============================================

/**
 * Get conversation context
 */
export async function getConversationContext(conversationId: string): Promise<ConversationContext> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/context`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get context' }));
    throw new Error(error.error || 'Failed to get context');
  }

  const data = await response.json();
  return data.context || {};
}

/**
 * Update conversation context
 */
export async function updateConversationContext(
  conversationId: string,
  context: Partial<ConversationContext>
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/context`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(context),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update context' }));
    throw new Error(error.error || 'Failed to update context');
  }
}

/**
 * Clear conversation context
 */
export async function clearConversationContext(conversationId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/context`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to clear context' }));
    throw new Error(error.error || 'Failed to clear context');
  }
}

