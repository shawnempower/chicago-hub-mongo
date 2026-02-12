/**
 * Inventory Chat API Client
 * 
 * Frontend API wrapper for Hub Sales Assistant conversations
 */

import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

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

export interface ConversationTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  exchangeCount: number;
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
  tokenUsage?: ConversationTokenUsage;
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
  const response = await authenticatedFetch(`${API_BASE_URL}/inventory-chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  
  const response = await authenticatedFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch conversation' }));
    throw new Error(error.error || 'Failed to fetch conversation');
  }

  return response.json();
}

/**
 * Send a message and get AI response via SSE stream.
 * The server sends heartbeats to keep the connection alive,
 * status events for real-time progress updates, and a final data event with the response.
 * Uses a 5-minute timeout that resets on every received event (heartbeat or status).
 */
export async function sendMessage(
  conversationId: string,
  message: string,
  onStatus?: (status: string) => void
): Promise<SendMessageResponse> {
  const controller = new AbortController();
  let timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min initial timeout

  // Reset the timeout whenever we receive any data from the server
  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => controller.abort(), 300000);
  };

  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(error.error || 'Failed to send message');
    }

    // Read SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeoutId);
      throw new Error('Failed to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let result: SendMessageResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      resetTimeout();
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete last line in buffer

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (eventType === 'status') {
              onStatus?.(parsed.status);
            } else if (eventType === 'error') {
              throw new Error(parsed.error || 'An error occurred');
            } else {
              // Default data event — this is the final response
              result = parsed;
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              // Not valid JSON, ignore (could be partial)
            } else {
              throw e;
            }
          }
          eventType = '';
        } else if (line.startsWith(':')) {
          // SSE comment (heartbeat), just reset timeout (already done above)
        }
      }
    }

    clearTimeout(timeoutId);

    if (!result) {
      throw new Error('No response received from server');
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. The AI is taking longer than expected. Please try again.');
    }
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(`${API_BASE_URL}/inventory-chat/conversations/${conversationId}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
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

  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/attachments`,
    {
      method: 'POST',
      headers: {}, // FormData sets Content-Type with boundary
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/attachments`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/files`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/files/${fileId}/download`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/context`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/context`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
  const response = await authenticatedFetch(
    `${API_BASE_URL}/inventory-chat/conversations/${conversationId}/context`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to clear context' }));
    throw new Error(error.error || 'Failed to clear context');
  }
}

