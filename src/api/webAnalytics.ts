/**
 * Web Analytics API Client
 * 
 * Frontend API for fetching real-time web analytics from DynamoDB
 */

import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

export interface WebAnalyticsData {
  dataAvailable: boolean;
  visitors?: number;
  pageViews?: number;
  mobilePercentage?: number;
  desktopPercentage?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  daysWithData?: number;
  trackingScript?: string;
  publicationKey?: string;
}

export interface TrackingScriptData {
  publicationKey: string;
  trackingScript: string;
  instructions: string;
}

class WebAnalyticsAPI {
  private baseUrl = `${API_BASE_URL}/web-analytics`;

  /**
   * Get aggregated web analytics for a domain (last 30 days)
   */
  async getAnalytics(domain: string): Promise<WebAnalyticsData> {
    const params = new URLSearchParams({ domain });
    const url = `${this.baseUrl}?${params}`;
    
    const response = await authenticatedFetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch web analytics');
    }

    return response.json();
  }

  /**
   * Get tracking script for a domain
   */
  async getTrackingScript(domain: string): Promise<TrackingScriptData> {
    const params = new URLSearchParams({ domain });
    const url = `${this.baseUrl}/tracking-script?${params}`;
    
    const response = await authenticatedFetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get tracking script');
    }

    return response.json();
  }

  /**
   * Check if analytics data exists for a domain
   */
  async checkAnalyticsExists(domain: string): Promise<boolean> {
    const params = new URLSearchParams({ domain });
    const url = `${this.baseUrl}/check?${params}`;
    
    const response = await authenticatedFetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.hasData === true;
  }
}

export const webAnalyticsApi = new WebAnalyticsAPI();


