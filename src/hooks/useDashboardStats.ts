import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';

export interface PricingModelStats {
  avg: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

export interface PricingModelAnalytics {
  unitPrice: PricingModelStats;      // Price per 1000 audience (unit economics)
  totalPrice: PricingModelStats;     // Total monthly price (for reference)
  audienceSize: PricingModelStats;   // Audience size statistics
  sampleSize: number;
  isAlreadyNormalized?: boolean;
}

export interface ChannelPricingAnalytics {
  [pricingModel: string]: PricingModelAnalytics;
}

export interface PricingAnalytics {
  website: ChannelPricingAnalytics;
  newsletter: ChannelPricingAnalytics;
  print: ChannelPricingAnalytics;
  podcast: ChannelPricingAnalytics;
  radio: ChannelPricingAnalytics;
  streaming: ChannelPricingAnalytics;
}

export interface DashboardStats {
  leads: number;
  publications: number;
  adInventory: number;
  conversations: number;
  unreadMessages: number; // Orders with messages from publications needing attention
  packages: number;
  publicationFiles: number;
  
  // Marketplace-focused aggregates
  inventoryByType: {
    website: number;
    newsletter: number;
    print: number;
    events: number;
    social: number;
    crossChannel: number;
    podcasts: number;
    streamingVideo: number;
    radioStations: number;
  };
  
  publicationsByType: {
    daily: number;
    weekly: number;
    monthly: number;
    other: number;
  };
  
  geographicCoverage: {
    local: number;
    regional: number;
    state: number;
    national: number;
    international: number;
  };
  
  contentTypes: {
    news: number;
    lifestyle: number;
    business: number;
    entertainment: number;
    sports: number;
    alternative: number;
    mixed: number;
  };
  
  audienceMetrics: {
    totalWebsiteVisitors: number;
    totalNewsletterSubscribers: number;
    totalPrintCirculation: number;
    totalSocialFollowers: number;
    totalPodcastListeners: number;
    totalStreamingSubscribers: number;
    totalRadioListeners: number;
    averageEngagementRate: number;
  };
  
  pricingInsights: {
    averageWebsiteAdPrice: number;
    averageNewsletterAdPrice: number;
    averagePrintAdPrice: number;
    averagePodcastAdPrice: number;
    averageStreamingAdPrice: number;
    averageRadioAdPrice: number;
    totalInventoryValue: number;
    inventoryCount: number;
  };

  hubPricingInsights: Record<string, {
    averageWebsiteAdPrice: number;
    averageNewsletterAdPrice: number;
    averagePrintAdPrice: number;
    averagePodcastAdPrice: number;
    averageStreamingAdPrice: number;
    averageRadioAdPrice: number;
    totalInventoryValue: number;
    inventoryCount: number;
  }>;
  
  pricingAnalytics?: PricingAnalytics;
}

export const useDashboardStats = (hubId?: string | null) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Add hubId as query parameter if provided
      const url = hubId 
        ? `${API_BASE_URL}/admin/dashboard-stats?hubId=${hubId}`
        : `${API_BASE_URL}/admin/dashboard-stats`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubId]); // Re-fetch when hubId changes

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardStats,
  };
};
