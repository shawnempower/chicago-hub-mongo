import { PublicationFrontend } from '../types/publication';
import { CHANNEL_COLORS } from '../constants/channelColors';

export interface ChannelMetricValue {
  label: string;
  value: string | number | null;
  special?: 'platforms' | 'events-list'; // For special rendering
  data?: any; // Raw data for special cases
}

export interface ChannelMetricsConfig {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  textColor: string;
  priority: number;
  extractMetrics: (data: any) => ChannelMetricValue[];
  hasData: (pub: PublicationFrontend) => boolean;
}

export const CHANNEL_METRICS_CONFIG: Record<string, ChannelMetricsConfig> = {
  website: {
    label: 'Digital',
    icon: CHANNEL_COLORS.website.icon,
    color: CHANNEL_COLORS.website.color,
    bgColor: CHANNEL_COLORS.website.bgColor,
    textColor: CHANNEL_COLORS.website.textColor,
    priority: 1,
    extractMetrics: (data) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (data?.metrics?.monthlyVisitors) {
        metrics.push({
          label: 'Monthly Visitors',
          value: data.metrics.monthlyVisitors
        });
      }
      
      if (data?.metrics?.monthlyPageViews) {
        metrics.push({
          label: 'Monthly Pageviews',
          value: data.metrics.monthlyPageViews
        });
      }
      
      if (data?.metrics?.averageSessionDuration) {
        metrics.push({
          label: 'Avg Session Duration',
          value: `${data.metrics.averageSessionDuration.toFixed(1)} min`
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const website = pub?.distributionChannels?.website;
      return !!(
        website?.advertisingOpportunities?.length > 0 &&
        (website?.metrics?.monthlyVisitors || website?.metrics?.monthlyPageViews)
      );
    }
  },
  
  print: {
    label: CHANNEL_COLORS.print.label,
    icon: CHANNEL_COLORS.print.icon,
    color: CHANNEL_COLORS.print.color,
    bgColor: CHANNEL_COLORS.print.bgColor,
    textColor: CHANNEL_COLORS.print.textColor,
    priority: 2,
    extractMetrics: (printArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!printArray || printArray.length === 0) return metrics;
      
      const totalCirculation = printArray.reduce((sum: number, p: any) => 
        sum + (p.circulation || 0), 0
      );
      
      if (totalCirculation > 0) {
        metrics.push({
          label: 'Total Circulation',
          value: totalCirculation
        });
      }
      
      if (printArray.length > 0) {
        const publications = printArray
          .map((p: any) => p.name)
          .filter(Boolean);
          
        if (publications.length > 0) {
          metrics.push({
            label: 'Publications',
            value: publications.join(', ')
          });
        } else if (printArray.length === 1) {
          metrics.push({
            label: 'Frequency',
            value: printArray[0].frequency || 'N/A'
          });
        }
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const print = pub?.distributionChannels?.print;
      return !!(
        print?.length > 0 &&
        print.some((p: any) => 
          p.advertisingOpportunities?.length > 0 &&
          (p.circulation || p.frequency)
        )
      );
    }
  },
  
  newsletters: {
    label: 'Email & Newsletters',
    icon: CHANNEL_COLORS.newsletter.icon,
    color: CHANNEL_COLORS.newsletter.color,
    bgColor: CHANNEL_COLORS.newsletter.bgColor,
    textColor: CHANNEL_COLORS.newsletter.textColor,
    priority: 3,
    extractMetrics: (newslettersArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!newslettersArray || newslettersArray.length === 0) return metrics;
      
      const totalSubscribers = newslettersArray.reduce((sum: number, n: any) => 
        sum + (n.subscribers || 0), 0
      );
      
      if (totalSubscribers > 0) {
        metrics.push({
          label: 'Total Subscribers',
          value: totalSubscribers
        });
      }
      
      if (newslettersArray.length > 0) {
        metrics.push({
          label: 'Newsletters',
          value: newslettersArray.length
        });
      }
      
      const avgOpenRate = newslettersArray.length > 0 
        ? newslettersArray.reduce((sum: number, n: any) => sum + (n.openRate || 0), 0) / newslettersArray.length
        : 0;
        
      if (avgOpenRate > 0) {
        metrics.push({
          label: 'Avg Open Rate',
          value: `${avgOpenRate.toFixed(1)}%`
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const newsletters = pub?.distributionChannels?.newsletters;
      return !!(
        newsletters?.length > 0 &&
        newsletters.some((n: any) => 
          n.advertisingOpportunities?.length > 0 &&
          n.subscribers > 0
        )
      );
    }
  },
  
  socialMedia: {
    label: CHANNEL_COLORS.socialMedia.label,
    icon: CHANNEL_COLORS.socialMedia.icon,
    color: CHANNEL_COLORS.socialMedia.color,
    bgColor: CHANNEL_COLORS.socialMedia.bgColor,
    textColor: CHANNEL_COLORS.socialMedia.textColor,
    priority: 4,
    extractMetrics: (socialArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!socialArray || socialArray.length === 0) return metrics;
      
      const totalFollowers = socialArray.reduce((sum: number, s: any) => 
        sum + (s.metrics?.followers || s.followers || 0), 0
      );
      
      if (totalFollowers > 0) {
        metrics.push({
          label: 'Combined Following',
          value: totalFollowers
        });
      }
      
      const platforms = socialArray
        .map((s: any) => ({
          platform: s.platform,
          followers: s.metrics?.followers || s.followers
        }))
        .filter((p: any) => p.followers > 0);
      
      if (platforms.length > 0) {
        metrics.push({
          label: 'Primary Platforms',
          value: platforms.length,
          special: 'platforms',
          data: platforms
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const social = pub?.distributionChannels?.socialMedia;
      return !!(
        social?.length > 0 &&
        social.some((s: any) => 
          s.advertisingOpportunities?.length > 0 &&
          (s.metrics?.followers || s.followers) > 0
        )
      );
    }
  },
  
  podcasts: {
    label: CHANNEL_COLORS.podcasts.label,
    icon: CHANNEL_COLORS.podcasts.icon,
    color: CHANNEL_COLORS.podcasts.color,
    bgColor: CHANNEL_COLORS.podcasts.bgColor,
    textColor: CHANNEL_COLORS.podcasts.textColor,
    priority: 5,
    extractMetrics: (podcastsArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!podcastsArray || podcastsArray.length === 0) return metrics;
      
      const totalDownloads = podcastsArray.reduce((sum: number, p: any) => 
        sum + (p.averageDownloads || 0), 0
      );
      
      if (totalDownloads > 0) {
        metrics.push({
          label: 'Avg Downloads/Episode',
          value: podcastsArray[0].averageDownloads
        });
      }
      
      const totalEpisodes = podcastsArray.reduce((sum: number, p: any) => 
        sum + (p.episodeCount || 0), 0
      );
      
      if (totalEpisodes > 0) {
        metrics.push({
          label: 'Total Episodes',
          value: totalEpisodes
        });
      }
      
      if (podcastsArray.length > 0) {
        metrics.push({
          label: 'Shows',
          value: podcastsArray.length
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const podcasts = pub?.distributionChannels?.podcasts;
      return !!(
        podcasts?.length > 0 &&
        podcasts.some((p: any) => 
          p.advertisingOpportunities?.length > 0 &&
          (p.averageDownloads || p.averageListeners)
        )
      );
    }
  },
  
  radioStations: {
    label: CHANNEL_COLORS.radioStations.label,
    icon: CHANNEL_COLORS.radioStations.icon,
    color: CHANNEL_COLORS.radioStations.color,
    bgColor: CHANNEL_COLORS.radioStations.bgColor,
    textColor: CHANNEL_COLORS.radioStations.textColor,
    priority: 6,
    extractMetrics: (radioArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!radioArray || radioArray.length === 0) return metrics;
      
      const totalListeners = radioArray.reduce((sum: number, r: any) => 
        sum + (r.listeners || 0), 0
      );
      
      if (totalListeners > 0) {
        metrics.push({
          label: 'Weekly Listeners',
          value: totalListeners
        });
      }
      
      if (radioArray.length > 0) {
        metrics.push({
          label: 'Stations',
          value: radioArray.length
        });
      }
      
      if (radioArray[0]?.coverageArea) {
        metrics.push({
          label: 'Coverage',
          value: radioArray[0].coverageArea
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const radio = pub?.distributionChannels?.radioStations;
      return !!(
        radio?.length > 0 &&
        radio.some((r: any) => 
          r.advertisingOpportunities?.length > 0 &&
          r.listeners > 0
        )
      );
    }
  },
  
  streamingVideo: {
    label: CHANNEL_COLORS.streamingVideo.label,
    icon: CHANNEL_COLORS.streamingVideo.icon,
    color: CHANNEL_COLORS.streamingVideo.color,
    bgColor: CHANNEL_COLORS.streamingVideo.bgColor,
    textColor: CHANNEL_COLORS.streamingVideo.textColor,
    priority: 7,
    extractMetrics: (streamingArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!streamingArray || streamingArray.length === 0) return metrics;
      
      const totalSubs = streamingArray.reduce((sum: number, s: any) => 
        sum + (s.subscribers || 0), 0
      );
      
      if (totalSubs > 0) {
        metrics.push({
          label: 'Total Subscribers',
          value: totalSubs
        });
      }
      
      if (streamingArray[0]?.averageViews) {
        metrics.push({
          label: 'Avg Views',
          value: streamingArray[0].averageViews
        });
      }
      
      if (streamingArray[0]?.platform) {
        metrics.push({
          label: 'Platform',
          value: streamingArray[0].platform
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const streaming = pub?.distributionChannels?.streamingVideo;
      return !!(
        streaming?.length > 0 &&
        streaming.some((s: any) => 
          s.advertisingOpportunities?.length > 0 &&
          (s.subscribers || s.averageViews)
        )
      );
    }
  },
  
  television: {
    label: CHANNEL_COLORS.television.label,
    icon: CHANNEL_COLORS.television.icon,
    color: CHANNEL_COLORS.television.color,
    bgColor: CHANNEL_COLORS.television.bgColor,
    textColor: CHANNEL_COLORS.television.textColor,
    priority: 8,
    extractMetrics: (tvArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!tvArray || tvArray.length === 0) return metrics;
      
      const totalViewers = tvArray.reduce((sum: number, t: any) => 
        sum + (t.viewers || 0), 0
      );
      
      if (totalViewers > 0) {
        metrics.push({
          label: 'Weekly Viewers',
          value: totalViewers
        });
      }
      
      if (tvArray.length > 0) {
        metrics.push({
          label: 'Stations',
          value: tvArray.length
        });
      }
      
      if (tvArray[0]?.network) {
        metrics.push({
          label: 'Network',
          value: tvArray[0].network.toUpperCase()
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const tv = pub?.distributionChannels?.television;
      return !!(
        tv?.length > 0 &&
        tv.some((t: any) => 
          t.advertisingOpportunities?.length > 0 &&
          t.viewers > 0
        )
      );
    }
  },
  
  events: {
    label: CHANNEL_COLORS.events.label,
    icon: CHANNEL_COLORS.events.icon,
    color: CHANNEL_COLORS.events.color,
    bgColor: CHANNEL_COLORS.events.bgColor,
    textColor: CHANNEL_COLORS.events.textColor,
    priority: 9,
    extractMetrics: (eventsArray) => {
      const metrics: ChannelMetricValue[] = [];
      
      if (!eventsArray || eventsArray.length === 0) return metrics;
      
      const totalAttendance = eventsArray.reduce((sum: number, e: any) => 
        sum + (e.averageAttendance || 0), 0
      );
      
      if (totalAttendance > 0) {
        metrics.push({
          label: 'Total Annual Attendance',
          value: totalAttendance
        });
      }
      
      const eventsList = eventsArray
        .filter((e: any) => e.name && e.averageAttendance)
        .map((e: any) => ({
          name: e.name,
          attendance: e.averageAttendance,
          frequency: e.frequency
        }));
      
      if (eventsList.length > 0) {
        metrics.push({
          label: 'Events',
          value: eventsList.length,
          special: 'events-list',
          data: eventsList
        });
      }
      
      return metrics;
    },
    hasData: (pub) => {
      const events = pub?.distributionChannels?.events;
      return !!(
        events?.length > 0 &&
        events.some((e: any) => 
          e.advertisingOpportunities?.length > 0 &&
          e.averageAttendance > 0
        )
      );
    }
  }
};

export interface ActiveChannel {
  key: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  textColor: string;
  priority: number;
  metrics: ChannelMetricValue[];
}

export function getActiveChannelMetrics(publication: PublicationFrontend | null): ActiveChannel[] {
  if (!publication) return [];
  
  const activeChannels: ActiveChannel[] = [];
  
  for (const [channelKey, config] of Object.entries(CHANNEL_METRICS_CONFIG)) {
    if (config.hasData(publication)) {
      const channelData = publication.distributionChannels?.[channelKey as keyof typeof publication.distributionChannels];
      const metrics = config.extractMetrics(channelData);
      
      if (metrics.length > 0) {
        activeChannels.push({
          key: channelKey,
          label: config.label,
          icon: config.icon,
          color: config.color,
          bgColor: config.bgColor,
          textColor: config.textColor,
          priority: config.priority,
          metrics
        });
      }
    }
  }
  
  // Sort by priority
  return activeChannels.sort((a, b) => a.priority - b.priority);
}

