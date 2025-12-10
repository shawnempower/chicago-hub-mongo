/**
 * Inventory Channel Configuration
 * 
 * Default settings, instructions, and metadata for each inventory channel type.
 * Used throughout the app for consistent display and guidance.
 */

export interface ChannelConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  isDigital: boolean;
  // Implementation instructions for publications
  instructions: {
    howTo: string;
    tips: string[];
    proofTypes: string[];
  };
  // Metrics typically tracked for this channel
  metrics: string[];
  // Display order (lower = first)
  order: number;
}

export const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  website: {
    id: 'website',
    label: 'Website',
    icon: '🌐',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    isDigital: true,
    instructions: {
      howTo: 'Copy the tracking script and paste it into your ad server or directly into your website HTML where you want the ad to appear.',
      tips: [
        'Test the ad loads correctly before campaign start',
        'Ensure click tracking is working',
        'Check ad displays on mobile devices',
      ],
      proofTypes: ['screenshot', 'analytics_report'],
    },
    metrics: ['impressions', 'clicks', 'ctr', 'viewability'],
    order: 1,
  },

  newsletter: {
    id: 'newsletter',
    label: 'Newsletter',
    icon: '📧',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    isDigital: true,
    instructions: {
      howTo: 'Copy the HTML code and paste it into your newsletter template. For ESPs with limited HTML support, use the simplified version.',
      tips: [
        'Test in multiple email clients (Gmail, Outlook, Apple Mail)',
        'Check image blocking fallbacks',
        'Verify click URLs are correct',
        'Send a test email before campaign launch',
      ],
      proofTypes: ['screenshot', 'esp_report'],
    },
    metrics: ['impressions', 'clicks', 'ctr', 'sends', 'opens'],
    order: 2,
  },

  streaming: {
    id: 'streaming',
    label: 'Streaming',
    icon: '📺',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    isDigital: true,
    instructions: {
      howTo: 'Upload the video creative to your streaming platform and configure the tracking pixel to fire on play/complete events.',
      tips: [
        'Test video plays correctly on all devices',
        'Verify completion tracking fires',
        'Check audio levels are appropriate',
        'Ensure proper aspect ratio',
      ],
      proofTypes: ['screenshot', 'video_clip', 'analytics_report'],
    },
    metrics: ['impressions', 'videoViews', 'completionRate', 'clicks'],
    order: 3,
  },

  print: {
    id: 'print',
    label: 'Print',
    icon: '📰',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    isDigital: false,
    instructions: {
      howTo: 'Download the print-ready creative and place it in your publication layout according to the specified dimensions and position.',
      tips: [
        'Verify CMYK color mode for accurate printing',
        'Check bleed and safe areas',
        'Save a tearsheet or scan of the printed ad',
        'Note the issue date and page number',
      ],
      proofTypes: ['tearsheet', 'screenshot'],
    },
    metrics: ['insertions', 'circulation', 'reach'],
    order: 4,
  },

  radio: {
    id: 'radio',
    label: 'Radio',
    icon: '📻',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    isDigital: false,
    instructions: {
      howTo: 'Schedule the audio spot in your broadcast rotation for the specified time slots and frequency throughout the campaign period.',
      tips: [
        'Confirm audio quality meets broadcast standards',
        'Log exact air times for each spot',
        'Record affidavit of performance',
        'Note any make-goods if spots are missed',
      ],
      proofTypes: ['audio_log', 'affidavit', 'report'],
    },
    metrics: ['spotsAired', 'reach', 'frequency'],
    order: 5,
  },

  podcast: {
    id: 'podcast',
    label: 'Podcast',
    icon: '🎙️',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    isDigital: false,
    instructions: {
      howTo: 'Include the ad read or pre-recorded spot in your podcast episodes as specified. Track download numbers for each episode containing the ad.',
      tips: [
        'Note episode numbers where ad appears',
        'Track download counts per episode',
        'Save episode links as proof',
        'Record timestamp of ad placement in episode',
      ],
      proofTypes: ['audio_log', 'analytics_report'],
    },
    metrics: ['downloads', 'listens', 'completionRate'],
    order: 6,
  },

  social_media: {
    id: 'social_media',
    label: 'Social Media',
    icon: '📱',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50 border-pink-200',
    isDigital: false, // Often manual reporting
    instructions: {
      howTo: 'Post the creative content according to the agreed schedule. Use platform analytics to track engagement and reach.',
      tips: [
        'Schedule posts in advance when possible',
        'Track engagement metrics (likes, shares, comments)',
        'Save screenshots of posts as proof',
        'Note post URLs for verification',
      ],
      proofTypes: ['screenshot', 'analytics_report'],
    },
    metrics: ['impressions', 'reach', 'engagements', 'shares', 'clicks'],
    order: 7,
  },

  events: {
    id: 'events',
    label: 'Events',
    icon: '🎪',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
    isDigital: false,
    instructions: {
      howTo: 'Display sponsor materials prominently at the event. Collect attendance data and any leads generated from the sponsorship.',
      tips: [
        'Set up signage/banners in high-visibility areas',
        'Track event attendance',
        'Collect photos of sponsor placement',
        'Record any leads or sign-ups generated',
      ],
      proofTypes: ['screenshot', 'report', 'other'],
    },
    metrics: ['attendance', 'impressions', 'leads'],
    order: 8,
  },

  other: {
    id: 'other',
    label: 'Other',
    icon: '📋',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
    isDigital: false,
    instructions: {
      howTo: 'Follow the specific placement instructions provided for this inventory type.',
      tips: [
        'Track delivery metrics as specified',
        'Save proof of performance documentation',
        'Report any issues to the hub team',
      ],
      proofTypes: ['screenshot', 'report', 'other'],
    },
    metrics: ['impressions', 'reach'],
    order: 99,
  },
};

/**
 * Get channel config by ID, with fallback to 'other'
 */
export function getChannelConfig(channelId: string): ChannelConfig {
  const normalized = channelId?.toLowerCase().replace(/\s+/g, '_') || 'other';
  return CHANNEL_CONFIG[normalized] || CHANNEL_CONFIG.other;
}

/**
 * Get all channels sorted by display order
 */
export function getSortedChannels(): ChannelConfig[] {
  return Object.values(CHANNEL_CONFIG).sort((a, b) => a.order - b.order);
}

/**
 * Check if a channel is digital (uses tracking scripts)
 */
export function isDigitalChannel(channelId: string): boolean {
  return getChannelConfig(channelId).isDigital;
}

/**
 * Get channels grouped by digital vs non-digital
 */
export function getChannelsByType(): { digital: ChannelConfig[]; offline: ChannelConfig[] } {
  const sorted = getSortedChannels();
  return {
    digital: sorted.filter(c => c.isDigital),
    offline: sorted.filter(c => !c.isDigital),
  };
}
