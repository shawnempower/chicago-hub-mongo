/**
 * Inventory Channel Configuration
 * 
 * Default settings, instructions, and metadata for each inventory channel type.
 * Used throughout the app for consistent display and guidance.
 */

/**
 * Detailed metric definition for self-reporting guidance
 */
export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  example: string;
  required: boolean;
  unit?: string;
  helpText?: string;
}

/**
 * Proof requirement configuration
 */
export interface ProofRequirement {
  required: boolean;
  options: Array<{
    type: 'file_upload' | 'attestation' | 'link';
    label: string;
    description: string;
    fileTypes?: string[];
  }>;
  attestationFields?: string[];
}

/**
 * Completion criteria for automatic placement completion
 */
export interface CompletionCriteria {
  type: 'impressions_or_end_date' | 'proof_count';
  usesFrequency?: boolean;  // If true, expected count comes from item.currentFrequency
  description: string;
}

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
  // Metrics typically tracked for this channel (simple list for backward compat)
  metrics: string[];
  // Detailed metric definitions with guidance for self-reporting
  metricDefinitions?: MetricDefinition[];
  // Proof of performance requirements
  proofRequirement?: ProofRequirement;
  // Automatic completion criteria (how placements are auto-completed)
  completionCriteria?: CompletionCriteria;
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
    completionCriteria: {
      type: 'impressions_or_end_date',
      description: 'Auto-completes when impressions goal met or campaign ends',
    },
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
    completionCriteria: {
      type: 'impressions_or_end_date',
      description: 'Auto-completes when impressions goal met or campaign ends',
    },
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
    completionCriteria: {
      type: 'impressions_or_end_date',
      description: 'Auto-completes when impressions goal met or campaign ends',
    },
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
      proofTypes: ['tearsheet', 'attestation'],
    },
    metrics: ['insertions', 'circulation', 'reach'],
    metricDefinitions: [
      {
        key: 'insertions',
        label: 'Issues Published',
        description: 'Number of print issues containing this ad',
        example: 'If ad ran in 4 weekly issues, enter 4',
        required: true,
        unit: 'issues',
        helpText: 'Count each issue/edition where the ad appeared as one insertion',
      },
      {
        key: 'circulation',
        label: 'Total Circulation',
        description: 'Combined print copies distributed across all issues',
        example: '4 issues × 25,000 copies = 100,000',
        required: true,
        unit: 'copies',
        helpText: 'Multiply your circulation per issue by the number of insertions',
      },
      {
        key: 'reach',
        label: 'Estimated Readers',
        description: 'Estimated unique readers (typically 2-3x circulation due to pass-along)',
        example: '100,000 copies × 2.5 pass-along rate = 250,000 readers',
        required: false,
        unit: 'readers',
        helpText: 'Industry standard is 2-3 readers per printed copy. Use your known pass-along rate if available.',
      },
    ],
    proofRequirement: {
      required: true,
      options: [
        {
          type: 'file_upload',
          label: 'Upload Tearsheet',
          description: 'Scan or photo of the printed ad in the publication',
          fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        },
        {
          type: 'attestation',
          label: 'Fill Out Attestation',
          description: 'No scan available? Provide placement details instead',
        },
      ],
      attestationFields: ['publicationDate', 'pageNumber', 'section', 'adSize'],
    },
    completionCriteria: {
      type: 'proof_count',
      usesFrequency: true,
      description: 'Auto-completes when all tear sheets uploaded',
    },
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
      proofTypes: ['affidavit', 'attestation', 'audio_log'],
    },
    metrics: ['spotsAired', 'reach', 'frequency'],
    metricDefinitions: [
      {
        key: 'spotsAired',
        label: 'Total Spots Aired',
        description: 'Number of times the ad spot played on air',
        example: 'If you aired 6 spots per day for 5 days, enter 30',
        required: true,
        unit: 'spots',
        helpText: 'Count each time the spot played as one airing',
      },
      {
        key: 'reach',
        label: 'Estimated Reach',
        description: 'Estimated unique listeners who heard the spot',
        example: 'Morning drive reaches ~50,000 listeners per spot',
        required: false,
        unit: 'listeners',
        helpText: 'Use your station\'s Average Quarter Hour (AQH) ratings if available',
      },
      {
        key: 'frequency',
        label: 'Average Frequency',
        description: 'Average number of times each listener heard the spot',
        example: 'If reach is 50,000 and you aired 30 spots, frequency might be 2-3',
        required: false,
        unit: 'times',
        helpText: 'Calculated as total impressions divided by reach',
      },
    ],
    proofRequirement: {
      required: true,
      options: [
        {
          type: 'file_upload',
          label: 'Upload Affidavit',
          description: 'Station affidavit confirming spots aired',
          fileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        {
          type: 'attestation',
          label: 'Fill Out Attestation',
          description: 'No affidavit? Provide airing details with dayparts',
        },
      ],
      attestationFields: ['dateRange', 'spotsAired', 'dayparts', 'estimatedReach'],
    },
    completionCriteria: {
      type: 'proof_count',
      usesFrequency: true,
      description: 'Auto-completes when all affidavits uploaded',
    },
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
      proofTypes: ['analytics_screenshot', 'episode_link', 'attestation'],
    },
    metrics: ['downloads', 'listens', 'completionRate'],
    metricDefinitions: [
      {
        key: 'downloads',
        label: 'Episode Downloads',
        description: 'Total downloads for episodes containing the ad',
        example: 'Episode 45 had 8,500 downloads in the first 30 days',
        required: true,
        unit: 'downloads',
        helpText: 'Use your podcast hosting platform\'s analytics (Apple Podcasts Connect, Spotify for Podcasters, etc.)',
      },
      {
        key: 'listens',
        label: 'Unique Listeners',
        description: 'Unique listeners who played the episode',
        example: 'If downloads are 8,500, unique listeners might be ~6,000',
        required: false,
        unit: 'listeners',
        helpText: 'Some hosting platforms distinguish between downloads and unique listeners',
      },
      {
        key: 'completionRate',
        label: 'Completion Rate',
        description: 'Percentage of listeners who heard the full episode (and likely the ad)',
        example: 'If 70% of listeners completed the episode, enter 70',
        required: false,
        unit: '%',
        helpText: 'Available in some podcast analytics platforms',
      },
    ],
    proofRequirement: {
      required: false, // Encouraged, not required
      options: [
        {
          type: 'file_upload',
          label: 'Upload Analytics Screenshot',
          description: 'Screenshot from your podcast hosting platform showing downloads',
          fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        },
        {
          type: 'link',
          label: 'Provide Episode Link',
          description: 'Direct link to the episode (verifiable proof)',
        },
        {
          type: 'attestation',
          label: 'Attestation Only',
          description: 'Provide episode details without upload',
        },
      ],
      attestationFields: ['episodeDate', 'episodeName', 'downloads', 'adPosition'],
    },
    completionCriteria: {
      type: 'proof_count',
      usesFrequency: true,
      description: 'Auto-completes when all episode proofs uploaded',
    },
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
    completionCriteria: {
      type: 'proof_count',
      usesFrequency: true,
      description: 'Auto-completes when all post proofs uploaded',
    },
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
    completionCriteria: {
      type: 'proof_count',
      usesFrequency: false,  // Events typically have single report
      description: 'Auto-completes when event report uploaded',
    },
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
    completionCriteria: {
      type: 'proof_count',
      usesFrequency: false,
      description: 'Auto-completes when proof uploaded',
    },
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

/**
 * Get metric definitions for a channel
 * Returns detailed guidance for each metric the channel tracks
 */
export function getMetricDefinitions(channelId: string): MetricDefinition[] {
  const config = getChannelConfig(channelId);
  return config.metricDefinitions || [];
}

/**
 * Get proof requirement for a channel
 */
export function getProofRequirement(channelId: string): ProofRequirement | undefined {
  return getChannelConfig(channelId).proofRequirement;
}

/**
 * Check if a channel requires proof of performance
 */
export function requiresProof(channelId: string): boolean {
  const req = getProofRequirement(channelId);
  return req?.required ?? false;
}

/**
 * Radio daypart options
 * Used for radio attestation forms
 */
export const RADIO_DAYPARTS = [
  { id: 'morning_drive', label: 'Morning Drive', timeRange: '6am-10am', isPremium: true },
  { id: 'midday', label: 'Midday', timeRange: '10am-3pm', isPremium: false },
  { id: 'afternoon_drive', label: 'Afternoon Drive', timeRange: '3pm-7pm', isPremium: true },
  { id: 'evening', label: 'Evening', timeRange: '7pm-12am', isPremium: false },
  { id: 'overnight', label: 'Overnight', timeRange: '12am-6am', isPremium: false },
  { id: 'ros', label: 'Run of Schedule (ROS)', timeRange: 'Various', isPremium: false },
] as const;

export type RadioDaypart = typeof RADIO_DAYPARTS[number]['id'];

/**
 * Podcast ad position options
 */
export const PODCAST_AD_POSITIONS = [
  { id: 'pre-roll', label: 'Pre-roll', description: 'Beginning of episode, before content' },
  { id: 'mid-roll', label: 'Mid-roll', description: 'Middle of episode, during content break' },
  { id: 'post-roll', label: 'Post-roll', description: 'End of episode, after content' },
] as const;

export type PodcastAdPosition = typeof PODCAST_AD_POSITIONS[number]['id'];

/**
 * Print section options (common newspaper/magazine sections)
 */
export const PRINT_SECTIONS = [
  'Front Section',
  'News',
  'Sports',
  'Business',
  'Entertainment',
  'Lifestyle',
  'Opinion/Editorial',
  'Classifieds',
  'Insert/Circular',
  'Special Section',
  'Other',
] as const;
