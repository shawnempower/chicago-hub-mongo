/**
 * useWebAnalytics Hook
 * 
 * React hooks for fetching real-time web analytics data from DynamoDB
 */

import { useState, useEffect, useCallback } from 'react';
import { webAnalyticsApi, WebAnalyticsData } from '@/api/webAnalytics';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to fetch web analytics for a website URL
 */
export const useWebAnalytics = (websiteUrl: string | null | undefined) => {
  const [analytics, setAnalytics] = useState<WebAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    if (!websiteUrl) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await webAnalyticsApi.getAnalytics(websiteUrl);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      console.error('Error fetching web analytics:', err);
      // Don't show toast for analytics errors - they're informational
    } finally {
      setLoading(false);
    }
  }, [websiteUrl]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /**
   * Copy tracking script to clipboard
   */
  const copyTrackingScript = useCallback(async () => {
    if (!analytics?.trackingScript) {
      toast({
        title: 'No Script Available',
        description: 'Tracking script is not available.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await navigator.clipboard.writeText(analytics.trackingScript);
      toast({
        title: 'Copied!',
        description: 'Tracking script copied to clipboard.',
      });
      return true;
    } catch (err) {
      console.error('Failed to copy tracking script:', err);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy tracking script. Please try selecting and copying manually.',
        variant: 'destructive',
      });
      return false;
    }
  }, [analytics?.trackingScript, toast]);

  /**
   * Format a number with commas and optional decimal places
   */
  const formatNumber = useCallback((num: number | undefined, decimals: number = 0): string => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, []);

  /**
   * Get formatted date range string
   */
  const getDateRangeString = useCallback((): string => {
    if (!analytics?.dateRange) return 'Last 30 days';
    const { start, end } = analytics.dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  }, [analytics?.dateRange]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
    copyTrackingScript,
    formatNumber,
    getDateRangeString,
    
    // Convenience getters
    hasData: analytics?.dataAvailable ?? false,
    visitors: analytics?.visitors,
    pageViews: analytics?.pageViews,
    mobilePercentage: analytics?.mobilePercentage,
    desktopPercentage: analytics?.desktopPercentage,
    trackingScript: analytics?.trackingScript,
    publicationKey: analytics?.publicationKey,
    daysWithData: analytics?.daysWithData,
  };
};

/**
 * Hook to just get tracking script without fetching analytics
 */
export const useTrackingScript = (websiteUrl: string | null | undefined) => {
  const [trackingScript, setTrackingScript] = useState<string | null>(null);
  const [publicationKey, setPublicationKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!websiteUrl) {
      setTrackingScript(null);
      setPublicationKey(null);
      setLoading(false);
      return;
    }

    const fetchScript = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await webAnalyticsApi.getTrackingScript(websiteUrl);
        setTrackingScript(data.trackingScript);
        setPublicationKey(data.publicationKey);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get tracking script';
        setError(errorMessage);
        console.error('Error getting tracking script:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [websiteUrl]);

  const copyToClipboard = useCallback(async () => {
    if (!trackingScript) {
      toast({
        title: 'No Script Available',
        description: 'Tracking script is not available.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await navigator.clipboard.writeText(trackingScript);
      toast({
        title: 'Copied!',
        description: 'Tracking script copied to clipboard.',
      });
      return true;
    } catch (err) {
      console.error('Failed to copy tracking script:', err);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy tracking script. Please try selecting and copying manually.',
        variant: 'destructive',
      });
      return false;
    }
  }, [trackingScript, toast]);

  return {
    trackingScript,
    publicationKey,
    loading,
    error,
    copyToClipboard,
  };
};
