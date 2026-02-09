/**
 * Activities API Client
 * 
 * Frontend client for querying user activity logs and audit trails
 */

import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

export interface UserInteraction {
  _id?: string;
  userId: string;
  interactionType: string;
  hubId?: string;
  publicationId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    resourceId?: string;
    resourceType?: string;
    action?: string;
    changes?: string[];
    batchId?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

export interface ActivityQueryOptions {
  limit?: number;
  offset?: number;
  activityType?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface ActivityResponse {
  activities: UserInteraction[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total?: number;
  };
}

export interface ActivitySummary {
  totalActivities: number;
  byType: Record<string, number>;
}

/**
 * Get current user's activity history
 */
export async function getMyActivities(options: ActivityQueryOptions = {}): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.activityType) params.append('activityType', options.activityType);
  
  const response = await authenticatedFetch(`${API_BASE_URL}/activities/me?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }
  
  return response.json();
}

/**
 * Get activities for a specific publication
 */
export async function getPublicationActivities(
  publicationId: string,
  options: ActivityQueryOptions = {}
): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.activityType) params.append('activityType', options.activityType);
  if (options.startDate) {
    const date = options.startDate instanceof Date ? options.startDate.toISOString() : options.startDate;
    params.append('startDate', date);
  }
  if (options.endDate) {
    const date = options.endDate instanceof Date ? options.endDate.toISOString() : options.endDate;
    params.append('endDate', date);
  }
  
  const response = await authenticatedFetch(`${API_BASE_URL}/activities/publication/${publicationId}?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch publication activities');
  }
  
  return response.json();
}

/**
 * Get activities for a specific hub (admin only)
 */
export async function getHubActivities(
  hubId: string,
  options: ActivityQueryOptions = {}
): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.activityType) params.append('activityType', options.activityType);
  if (options.startDate) {
    const date = options.startDate instanceof Date ? options.startDate.toISOString() : options.startDate;
    params.append('startDate', date);
  }
  if (options.endDate) {
    const date = options.endDate instanceof Date ? options.endDate.toISOString() : options.endDate;
    params.append('endDate', date);
  }
  
  const response = await authenticatedFetch(`${API_BASE_URL}/activities/hub/${hubId}?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch hub activities');
  }
  
  return response.json();
}

/**
 * Get activities for a specific user (admin only)
 */
export async function getUserActivities(
  userId: string,
  options: ActivityQueryOptions = {}
): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.activityType) params.append('activityType', options.activityType);
  if (options.startDate) {
    const date = options.startDate instanceof Date ? options.startDate.toISOString() : options.startDate;
    params.append('startDate', date);
  }
  if (options.endDate) {
    const date = options.endDate instanceof Date ? options.endDate.toISOString() : options.endDate;
    params.append('endDate', date);
  }
  
  const response = await authenticatedFetch(`${API_BASE_URL}/activities/user/${userId}?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user activities');
  }
  
  return response.json();
}

/**
 * Track a manual activity (optional - for UI-specific events)
 */
export async function trackActivity(data: {
  interactionType: string;
  hubId?: string;
  publicationId?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; message: string }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/activities/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to track activity');
  }
  
  return response.json();
}

/**
 * Get activity summary/statistics (admin only)
 */
export async function getActivitySummary(options: {
  hubId?: string;
  publicationId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
} = {}): Promise<ActivitySummary> {
  const params = new URLSearchParams();
  if (options.hubId) params.append('hubId', options.hubId);
  if (options.publicationId) params.append('publicationId', options.publicationId);
  if (options.startDate) {
    const date = options.startDate instanceof Date ? options.startDate.toISOString() : options.startDate;
    params.append('startDate', date);
  }
  if (options.endDate) {
    const date = options.endDate instanceof Date ? options.endDate.toISOString() : options.endDate;
    params.append('endDate', date);
  }
  
  const response = await authenticatedFetch(`${API_BASE_URL}/activities/summary?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch activity summary');
  }
  
  return response.json();
}

