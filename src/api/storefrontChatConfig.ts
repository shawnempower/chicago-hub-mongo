import { API_BASE_URL } from '@/config/api';
import { StorefrontChatConfig, StorefrontChatConfigInsert } from '@/integrations/mongodb/schemas';
import { authenticatedFetch } from '@/api/client';

/**
 * Get chat config by publicationId
 */
export const getStorefrontChatConfig = async (publicationId: string): Promise<StorefrontChatConfig | null> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/storefront-chat-config/${publicationId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch chat config');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error fetching chat config:', error);
      return null;
    }
    throw error;
  }
};

/**
 * Create or update (upsert) chat config
 */
export const saveStorefrontChatConfig = async (
  publicationId: string, 
  configData: Partial<StorefrontChatConfigInsert>
): Promise<StorefrontChatConfig> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/storefront-chat-config/${publicationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save chat config');
  }

  return await response.json();
};

/**
 * Delete chat config
 */
export const deleteStorefrontChatConfig = async (publicationId: string): Promise<void> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/storefront-chat-config/${publicationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete chat config');
  }
};

/**
 * Chat message type for test chat
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Test chat response (for non-streaming)
 */
export interface TestChatResponse {
  message?: string;
  content?: string;
  error?: string;
}

/**
 * Test chat with the AI service
 * 
 * @param publicationId - The publication ID
 * @param messages - Array of chat messages
 * @param configOverride - Optional config to use instead of saved config (for testing unsaved changes)
 * @param onChunk - Callback for streaming chunks (if streaming is supported)
 * @returns The assistant's response
 */
export const testStorefrontChat = async (
  publicationId: string,
  messages: ChatMessage[],
  configOverride?: Partial<StorefrontChatConfigInsert>,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/storefront-chat-config/${publicationId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, configOverride }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to test chat');
  }

  const contentType = response.headers.get('content-type') || '';
  
  // Handle Server-Sent Events (streaming)
  if (contentType.includes('text/event-stream')) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to read stream');
    }
    
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE format: data: {...}\n\n
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || 
                             parsed.choices?.[0]?.message?.content ||
                             parsed.content || 
                             parsed.message || 
                             '';
              if (content) {
                fullResponse += content;
                onChunk?.(content);
              }
            } catch {
              // Not JSON, might be raw text
              fullResponse += data;
              onChunk?.(data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return fullResponse;
  }
  
  // Handle regular JSON response
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 
         data.message || 
         data.content || 
         '';
};
