/**
 * Performance Metrics Sync Utility
 * 
 * Automatically recalculates performanceMetrics on ad opportunities
 * when channel-level metrics change (circulation, subscribers, listeners, etc.)
 * 
 * This ensures impressionsPerMonth and audienceSize stay in sync with
 * their source values across all inventory types.
 */

import { PerformanceMetrics } from '@/integrations/mongodb/schemas';

// ===== FREQUENCY MAPPING =====
// Maps publication frequency strings to occurrences per month
const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  'daily': 30,
  'daily-business': 22,
  'weekdays': 22,
  'weekly': 4.33,
  'bi-weekly': 2.17,
  'monthly': 1,
  'quarterly': 0.33,
  'annual': 0.083,
  'bi-annually': 0.167,
  'irregular': 2, // Conservative estimate
  // Radio-specific frequencies
  'weekdays-plus-saturday': 26 / 4.33, // ~6 days/week
  'weekdays-plus-sunday': 26 / 4.33,
  'weekend-only': 8 / 4.33, // ~2 days/week
  'saturdays': 4 / 4.33,
  'sundays': 4 / 4.33,
};

/**
 * Get occurrences per month from a frequency string
 */
function getOccurrencesPerMonth(frequency?: string): number {
  if (!frequency) return 1;
  return FREQUENCY_TO_MONTHLY[frequency.toLowerCase()] || 1;
}

/**
 * Calculate performance metrics from source values
 */
function calculatePerformanceMetrics(
  audienceSize: number,
  occurrencesPerMonth: number,
  existingMetrics?: PerformanceMetrics
): PerformanceMetrics {
  return {
    audienceSize,
    occurrencesPerMonth,
    impressionsPerMonth: audienceSize * occurrencesPerMonth,
    guaranteed: existingMetrics?.guaranteed ?? true
  };
}

/**
 * Sync performance metrics for print channel ad opportunities
 */
function syncPrintMetrics(printChannels: any[]): any[] {
  if (!Array.isArray(printChannels)) return printChannels;
  
  return printChannels.map(print => {
    if (!print.advertisingOpportunities) return print;
    
    const audienceSize = print.circulation || 0;
    const occurrencesPerMonth = getOccurrencesPerMonth(print.frequency);
    
    return {
      ...print,
      advertisingOpportunities: print.advertisingOpportunities.map((ad: any) => ({
        ...ad,
        performanceMetrics: calculatePerformanceMetrics(
          audienceSize,
          occurrencesPerMonth,
          ad.performanceMetrics
        )
      }))
    };
  });
}

/**
 * Sync performance metrics for newsletter channel ad opportunities
 */
function syncNewsletterMetrics(newsletters: any[]): any[] {
  if (!Array.isArray(newsletters)) return newsletters;
  
  return newsletters.map(newsletter => {
    if (!newsletter.advertisingOpportunities) return newsletter;
    
    const audienceSize = newsletter.subscribers || 0;
    const occurrencesPerMonth = getOccurrencesPerMonth(newsletter.frequency);
    
    return {
      ...newsletter,
      advertisingOpportunities: newsletter.advertisingOpportunities.map((ad: any) => ({
        ...ad,
        performanceMetrics: calculatePerformanceMetrics(
          audienceSize,
          occurrencesPerMonth,
          ad.performanceMetrics
        )
      }))
    };
  });
}

/**
 * Sync performance metrics for podcast channel ad opportunities
 */
function syncPodcastMetrics(podcasts: any[]): any[] {
  if (!Array.isArray(podcasts)) return podcasts;
  
  return podcasts.map(podcast => {
    if (!podcast.advertisingOpportunities) return podcast;
    
    const audienceSize = podcast.averageListeners || podcast.averageDownloads || 0;
    const occurrencesPerMonth = getOccurrencesPerMonth(podcast.frequency);
    
    return {
      ...podcast,
      advertisingOpportunities: podcast.advertisingOpportunities.map((ad: any) => ({
        ...ad,
        performanceMetrics: calculatePerformanceMetrics(
          audienceSize,
          occurrencesPerMonth,
          ad.performanceMetrics
        )
      }))
    };
  });
}

/**
 * Sync performance metrics for radio station ad opportunities
 * Radio is more complex: stations have shows, each show has its own listener count
 */
function syncRadioMetrics(radioStations: any[]): any[] {
  if (!Array.isArray(radioStations)) return radioStations;
  
  return radioStations.map(station => {
    const stationListeners = station.listeners || 0;
    
    // Sync station-level ad opportunities
    let stationAds = station.advertisingOpportunities;
    if (Array.isArray(stationAds)) {
      stationAds = stationAds.map((ad: any) => ({
        ...ad,
        performanceMetrics: calculatePerformanceMetrics(
          stationListeners,
          getOccurrencesPerMonth('daily'), // Station-level defaults to daily
          ad.performanceMetrics
        )
      }));
    }
    
    // Sync show-level ad opportunities
    let shows = station.shows;
    if (Array.isArray(shows)) {
      shows = shows.map((show: any) => {
        if (!show.advertisingOpportunities) return show;
        
        const showListeners = show.averageListeners || stationListeners;
        const occurrencesPerMonth = show.daysPerWeek 
          ? (show.daysPerWeek * 4.33) 
          : getOccurrencesPerMonth(show.frequency);
        
        return {
          ...show,
          advertisingOpportunities: show.advertisingOpportunities.map((ad: any) => {
            // For spots, multiply by spotsPerShow if available
            const spotsPerShow = ad.spotsPerShow || 1;
            const effectiveOccurrences = occurrencesPerMonth * spotsPerShow;
            
            return {
              ...ad,
              performanceMetrics: calculatePerformanceMetrics(
                showListeners,
                effectiveOccurrences,
                ad.performanceMetrics
              )
            };
          })
        };
      });
    }
    
    return {
      ...station,
      advertisingOpportunities: stationAds,
      shows
    };
  });
}

/**
 * Sync performance metrics for streaming video ad opportunities
 */
function syncStreamingMetrics(streamingChannels: any[]): any[] {
  if (!Array.isArray(streamingChannels)) return streamingChannels;
  
  return streamingChannels.map(channel => {
    if (!channel.advertisingOpportunities) return channel;
    
    // Use subscribers or averageViews as audience
    const audienceSize = channel.subscribers || channel.averageViews || 0;
    const occurrencesPerMonth = getOccurrencesPerMonth(channel.frequency || 'weekly');
    
    return {
      ...channel,
      advertisingOpportunities: channel.advertisingOpportunities.map((ad: any) => {
        const spotsPerShow = ad.spotsPerShow || 1;
        const effectiveOccurrences = occurrencesPerMonth * spotsPerShow;
        
        return {
          ...ad,
          performanceMetrics: calculatePerformanceMetrics(
            audienceSize,
            effectiveOccurrences,
            ad.performanceMetrics
          )
        };
      })
    };
  });
}

/**
 * Sync performance metrics for social media ad opportunities
 */
function syncSocialMetrics(socialMedia: any[]): any[] {
  if (!Array.isArray(socialMedia)) return socialMedia;
  
  return socialMedia.map(social => {
    if (!social.advertisingOpportunities) return social;
    
    const audienceSize = social.metrics?.followers || social.followers || 0;
    // Social posts are typically estimated at ~4 per week = ~17 per month
    const occurrencesPerMonth = 17;
    
    return {
      ...social,
      advertisingOpportunities: social.advertisingOpportunities.map((ad: any) => ({
        ...ad,
        performanceMetrics: calculatePerformanceMetrics(
          audienceSize,
          occurrencesPerMonth,
          ad.performanceMetrics
        )
      }))
    };
  });
}

/**
 * Sync performance metrics for website ad opportunities
 * Website uses monthlyVisitors as audience (not impressions-based recalculation
 * since websites often have their own CPM impression tracking)
 */
function syncWebsiteMetrics(website: any): any {
  if (!website || !website.advertisingOpportunities) return website;
  
  const audienceSize = website.metrics?.monthlyVisitors || 0;
  // Websites are "always on" - treat as daily presence
  const occurrencesPerMonth = 30;
  
  return {
    ...website,
    advertisingOpportunities: website.advertisingOpportunities.map((ad: any) => ({
      ...ad,
      performanceMetrics: calculatePerformanceMetrics(
        audienceSize,
        occurrencesPerMonth,
        ad.performanceMetrics
      )
    }))
  };
}

/**
 * Sync performance metrics for events ad opportunities
 */
function syncEventsMetrics(events: any[]): any[] {
  if (!Array.isArray(events)) return events;
  
  return events.map(event => {
    if (!event.advertisingOpportunities) return event;
    
    const audienceSize = event.averageAttendance || event.expectedAttendees || 0;
    const occurrencesPerMonth = getOccurrencesPerMonth(event.frequency || 'annual');
    
    return {
      ...event,
      advertisingOpportunities: event.advertisingOpportunities.map((ad: any) => ({
        ...ad,
        performanceMetrics: calculatePerformanceMetrics(
          audienceSize,
          occurrencesPerMonth,
          ad.performanceMetrics
        )
      }))
    };
  });
}

/**
 * Main sync function - processes all distribution channels and updates performanceMetrics
 * 
 * Call this before saving distributionChannels to ensure all metrics are in sync
 * with their source values (circulation, subscribers, listeners, etc.)
 */
export function syncAllPerformanceMetrics(distributionChannels: any): any {
  if (!distributionChannels) return distributionChannels;
  
  const synced = { ...distributionChannels };
  
  // Sync each channel type
  if (synced.print) {
    synced.print = syncPrintMetrics(
      Array.isArray(synced.print) ? synced.print : [synced.print]
    );
  }
  
  if (synced.newsletters) {
    synced.newsletters = syncNewsletterMetrics(synced.newsletters);
  }
  
  if (synced.podcasts) {
    synced.podcasts = syncPodcastMetrics(synced.podcasts);
  }
  
  if (synced.radioStations) {
    synced.radioStations = syncRadioMetrics(synced.radioStations);
  }
  
  if (synced.streamingVideo) {
    synced.streamingVideo = syncStreamingMetrics(synced.streamingVideo);
  }
  
  if (synced.socialMedia) {
    synced.socialMedia = syncSocialMetrics(synced.socialMedia);
  }
  
  if (synced.website) {
    synced.website = syncWebsiteMetrics(synced.website);
  }
  
  if (synced.events) {
    synced.events = syncEventsMetrics(synced.events);
  }
  
  return synced;
}

// Export individual sync functions for testing or selective use
export {
  syncPrintMetrics,
  syncNewsletterMetrics,
  syncPodcastMetrics,
  syncRadioMetrics,
  syncStreamingMetrics,
  syncSocialMetrics,
  syncWebsiteMetrics,
  syncEventsMetrics,
  getOccurrencesPerMonth,
  calculatePerformanceMetrics,
  FREQUENCY_TO_MONTHLY
};
