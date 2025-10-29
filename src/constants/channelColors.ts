import { Globe, Mail, Printer, Users, Calendar, Mic, Radio, Video, Tv, Package } from 'lucide-react';

/**
 * Centralized color configuration for advertising channels
 * Used consistently across Hub Central, Publisher Dashboards, and all visualizations
 */

export interface ChannelColorConfig {
  id: string;
  label: string;
  icon: any;
  color: string; // Base color name
  iconColor: string; // For small icons (text-{color}-500)
  bgColor: string; // For badges/backgrounds (solid)
  textColor: string; // For text elements
  chartColor: string; // For large text/numbers in charts
  badgeColor: string; // For badge variants (lighter bg + darker text)
}

export const CHANNEL_COLORS: Record<string, ChannelColorConfig> = {
  website: {
    id: 'website',
    label: 'Website',
    icon: Globe,
    color: 'blue',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    chartColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  
  newsletter: {
    id: 'newsletter',
    label: 'Newsletter',
    icon: Mail,
    color: 'indigo',
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    chartColor: 'text-indigo-600',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
  
  print: {
    id: 'print',
    label: 'Print',
    icon: Printer,
    color: 'slate',
    iconColor: 'text-slate-500',
    bgColor: 'bg-slate-600',
    textColor: 'text-slate-700',
    chartColor: 'text-slate-700',
    badgeColor: 'bg-slate-100 text-slate-800',
  },
  
  socialMedia: {
    id: 'socialMedia',
    label: 'Social Media',
    icon: Users,
    color: 'purple',
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    chartColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  
  podcasts: {
    id: 'podcasts',
    label: 'Podcasts',
    icon: Mic,
    color: 'rose',
    iconColor: 'text-rose-500',
    bgColor: 'bg-rose-500',
    textColor: 'text-rose-600',
    chartColor: 'text-rose-600',
    badgeColor: 'bg-rose-100 text-rose-800',
  },
  
  radioStations: {
    id: 'radioStations',
    label: 'Radio',
    icon: Radio,
    color: 'amber',
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    chartColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  
  streamingVideo: {
    id: 'streamingVideo',
    label: 'Streaming',
    icon: Video,
    color: 'red',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    chartColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-800',
  },
  
  television: {
    id: 'television',
    label: 'Television',
    icon: Tv,
    color: 'cyan',
    iconColor: 'text-cyan-500',
    bgColor: 'bg-cyan-500',
    textColor: 'text-cyan-600',
    chartColor: 'text-cyan-600',
    badgeColor: 'bg-cyan-100 text-cyan-800',
  },
  
  events: {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    color: 'green',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    chartColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800',
  },
  
  crossChannel: {
    id: 'crossChannel',
    label: 'Cross-Channel',
    icon: Package,
    color: 'orange',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    chartColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
};

/**
 * Get color configuration for a channel by key
 */
export function getChannelColor(channelKey: string): ChannelColorConfig {
  return CHANNEL_COLORS[channelKey] || CHANNEL_COLORS.website;
}

/**
 * Get icon color class for a channel
 */
export function getChannelIconColor(channelKey: string): string {
  return getChannelColor(channelKey).iconColor;
}

/**
 * Get chart text color class for a channel
 */
export function getChannelChartColor(channelKey: string): string {
  return getChannelColor(channelKey).chartColor;
}

/**
 * Get badge color class for a channel (for use in package filters, etc.)
 */
export function getChannelBadgeColor(channelKey: string): string {
  return getChannelColor(channelKey).badgeColor;
}

/**
 * Map common channel name variants to standardized keys
 * Useful for package filters that use "digital", "radio", etc.
 */
export const CHANNEL_KEY_MAPPING: Record<string, string> = {
  'digital': 'website',
  'website': 'website',
  'newsletter': 'newsletter',
  'newsletters': 'newsletter',
  'print': 'print',
  'social': 'socialMedia',
  'socialMedia': 'socialMedia',
  'podcast': 'podcasts',
  'podcasts': 'podcasts',
  'radio': 'radioStations',
  'radioStations': 'radioStations',
  'streaming': 'streamingVideo',
  'streamingVideo': 'streamingVideo',
  'tv': 'television',
  'television': 'television',
  'events': 'events',
  'crossChannel': 'crossChannel',
  'mixed': 'crossChannel',
};

