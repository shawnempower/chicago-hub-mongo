// Frontend-only type definitions for Publications
// These are separated from MongoDB schemas to avoid browser imports

// ===== EVENT FREQUENCY TYPES =====
export type EventFrequency = 
  | 'annual' 
  | 'bi-annually'
  | 'quarterly'
  | 'monthly'
  | 'weekly';

export interface EventFrequencyOption {
  value: EventFrequency;
  label: string;
  description: string;
  monthlyOccurrences: number;
}

export const EVENT_FREQUENCY_OPTIONS: EventFrequencyOption[] = [
  { 
    value: 'annual', 
    label: 'Annual', 
    description: 'Once per year (most common for events)',
    monthlyOccurrences: 0.083
  },
  { 
    value: 'bi-annually', 
    label: 'Bi-Annually', 
    description: 'Twice per year',
    monthlyOccurrences: 0.167
  },
  { 
    value: 'quarterly', 
    label: 'Quarterly', 
    description: '4 times per year',
    monthlyOccurrences: 0.333
  },
  { 
    value: 'monthly', 
    label: 'Monthly', 
    description: '12 times per year',
    monthlyOccurrences: 1.0
  },
  { 
    value: 'weekly', 
    label: 'Weekly', 
    description: '52 times per year (rare for events)',
    monthlyOccurrences: 4.33
  }
];

export const EVENT_FREQUENCY_TO_MONTHLY: Record<EventFrequency, number> = {
  'annual': 0.083,
  'bi-annually': 0.167,
  'quarterly': 0.333,
  'monthly': 1.0,
  'weekly': 4.33
};

// ===== SERVICE AREA TYPES =====
export interface ServiceArea {
  dmaName: string;
  dmaNormalized: string;
  isPrimary?: boolean;
  counties?: Array<{
    name: string;
    normalized: string;
  }>;
  zipCodes?: string[];
  coveragePercentage?: number;
  notes?: string;
}

export interface PublicationFrontend {
  _id?: string;
  publicationId: number;
  
  // Hub membership - tracks which hubs this publication belongs to
  hubIds?: string[];
  
  basicInfo: {
    publicationName: string;
    websiteUrl?: string;
    founded?: string | number;
    publicationType?: 'daily' | 'weekly' | 'monthly' | 'bi-weekly' | 'quarterly' | 'other';
    contentType?: 'news' | 'lifestyle' | 'business' | 'entertainment' | 'sports' | 'alternative' | 'mixed';
    headquarters?: string;
    geographicCoverage?: 'local' | 'regional' | 'state' | 'national' | 'international';
    primaryServiceArea?: string;
    secondaryMarkets?: string[];
    serviceAreas?: ServiceArea[];
    numberOfPublications?: number;
  };
  
  contactInfo?: {
    mainPhone?: string;
    businessHours?: string;
    primaryContact?: {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
      preferredContact?: 'email' | 'phone' | 'text' | 'linkedin';
    };
    salesContact?: {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
      preferredContact?: 'email' | 'phone' | 'text' | 'linkedin';
    };
    editorialContact?: {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
    };
    generalManager?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    advertisingDirector?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  
  distributionChannels?: {
    socialMedia?: Array<{
      platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'pinterest' | 'snapchat' | 'threads' | 'other';
      handle: string;
      url?: string;
      verified?: boolean;
      specifications?: string;
      metrics?: {
        followers?: number;
        following?: number;
        posts?: number;
        engagementRate?: number;
        averageReach?: number;
        averageImpressions?: number;
      };
      lastUpdated?: string;
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: 'sponsored_post' | 'story_ad' | 'video_ad' | 'carousel_ad' | 'boosted_post' | 'influencer_partnership' | 'takeover' | 'custom';
        postType?: 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'live';
        pricing?: {
          perPost?: number;
          perStory?: number;
          monthly?: number;
          pricingModel?: 'per_post' | 'per_story' | 'monthly' | 'cpm' | 'contact';
        };
        specifications?: {
          imageSize?: string;
          videoLength?: string;
          format?: string;
          aspectRatio?: string;
        };
        available?: boolean;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    website?: {
      url?: string;
      cmsplatform?: string;
      metrics?: {
        monthlyVisitors?: number;
        monthlyPageViews?: number;
        averageSessionDuration?: number;
        pagesPerSession?: number;
        bounceRate?: number;
        mobilePercentage?: number;
      };
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: '300x250 banner' | '728x90 banner' | '320x50 banner' | '300x600 banner' | '970x250 banner' | 'takeover ad' | 'native' | 'video' | 'sponsored content' | 'custom';
        location?: string;
        pricing?: {
          cpm?: number;
          flatRate?: number;
          pricingModel?: 'cpm' | 'flat' | 'cpc' | 'cpa' | 'contact';
          minimumCommitment?: string;
        };
        specifications?: {
          size?: string;
          format?: string;
          fileSize?: string;
          resolution?: string;
          animationAllowed?: boolean;
          thirdPartyTags?: boolean;
        };
        monthlyImpressions?: number;
        available?: boolean;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    };
    
    newsletters?: Array<{
      name?: string;
      subject?: string;
      frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'seasonally' | 'irregular';
      sendDay?: string;
      sendTime?: string;
      subscribers?: number;
      openRate?: number;
      clickThroughRate?: number;
      listGrowthRate?: number;
      advertisingOpportunities?: Array<{
        name?: string;
        position?: 'header' | 'footer' | 'inline' | 'dedicated';
        dimensions?: string;
        pricing?: {
          flatRate?: number;
          pricingModel?: 'per_send' | 'monthly' | 'flat' | 'contact';
          frequency?: string;
        };
        specifications?: {
          format?: string;
          dimensions?: string;
        };
        available?: boolean;
        hubPricing?: Array<{
          hubId: string;
          hubName: string;
          pricing: {
            flatRate?: number;
            pricingModel?: string;
            frequency?: string;
          };
          discount?: number;
          available?: boolean;
          minimumCommitment?: string;
        }>;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    
    print?: Array<{
      name?: string;
      frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
      circulation?: number;
      paidCirculation?: number;
      freeCirculation?: number;
      distributionArea?: string;
      distributionPoints?: string[];
      printSchedule?: string;
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: 'tall full page' | 'tall portrait full page' | 'upper portrait full page' | 'square full page' | 'narrow full page' | 'half v tall' | 'half v standard' | 'half v slim' | 'half v mid' | 'half v compact' | 'half h tall' | 'half h standard' | 'half h wide' | 'half h mid' | 'half h compact' | 'quarter page' | 'eighth page' | 'business card' | 'classified' | 'insert';
        color?: 'color' | 'black and white' | 'both';
        location?: string;
        pricing?: {
          oneTime?: number;
          fourTimes?: number;
          sixTimes?: number;
          twelveTimes?: number;
          thirteenTimes?: number;
          twentySixTimes?: number;
          fiftyTwoTimes?: number;
          openRate?: number;
        };
        format?: {
          dimensions?: string;
          customDimensions?: string;
          fileFormats?: string[];
          resolution?: string;
          colorSpace?: string;
        };
        specifications?: {
          format?: string;
          resolution?: string;
          bleed?: boolean;
        };
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    
    events?: Array<{
      name?: string;
      type?: string;
      frequency?: EventFrequency;
      averageAttendance?: number;
      targetAudience?: string;
      location?: string;
      date?: string;
      advertisingOpportunities?: Array<{
        name?: string;
        level?: 'title' | 'presenting' | 'supporting' | 'vendor' | 'booth';
        benefits?: string[];
        pricing?: StandardPricing | StandardPricing[];
        performanceMetrics?: PerformanceMetrics;
        hubPricing?: HubPricing[];
        specifications?: {
          logoPlacement?: string[];
          speakingOpportunity?: boolean;
          tableSeating?: number;
          vipAccess?: boolean;
          socialMediaMentions?: number;
          pressRelease?: boolean;
          mediaKit?: boolean;
          booths?: number;
          [key: string]: any;
        };
        available?: boolean;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    
    podcasts?: Array<{
      podcastId?: string;
      name?: string;
      description?: string;
      frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular';
      averageDownloads?: number;
      averageListeners?: number;
      episodeCount?: number;
      platforms?: Array<'apple_podcasts' | 'spotify' | 'google_podcasts' | 'amazon_music' | 'stitcher' | 'overcast' | 'castbox' | 'other'>;
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: 'pre-roll' | 'mid-roll' | 'post-roll' | 'host-read' | 'programmatic' | 'sponsored_content';
        duration?: number;
        pricing?: {
          cpm?: number;
          flatRate?: number;
          pricingModel?: 'cpm' | 'flat' | 'contact';
        };
        specifications?: {
          format?: 'mp3' | 'wav' | 'script';
          bitrate?: string;
          fileFormats?: string[];  // e.g., ['MP3', 'WAV'] or ['TXT']
          duration?: number;
        };
        available?: boolean;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    
    radioStations?: Array<{
      stationId?: string;
      callSign?: string;
      frequency?: string;
      format?: 'news_talk' | 'classic_rock' | 'country' | 'pop' | 'hip_hop' | 'jazz' | 'classical' | 'alternative' | 'sports' | 'other';
      coverageArea?: string;
      listeners?: number;
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: '30_second_spot' | '60_second_spot' | '15_second_spot' | '15_second_spot_script' | '30_second_spot_script' | '60_second_spot_script' | 'live_read' | 'sponsorship' | 'traffic_weather_sponsor';
        timeSlot?: 'drive_time_morning' | 'drive_time_evening' | 'midday' | 'weekend' | 'overnight';
        pricing?: {
          perSpot?: number;
          weekly?: number;
          monthly?: number;
          pricingModel?: 'per_spot' | 'weekly' | 'monthly' | 'contact';
        };
        specifications?: {
          format?: 'mp3' | 'wav' | 'live_script';
          bitrate?: string;
          duration?: number;
        };
        available?: boolean;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    
    streamingVideo?: Array<{
      channelId?: string;
      name?: string;
      platform?: ('youtube' | 'twitch' | 'facebook_live' | 'instagram_live' | 'linkedin_live' | 'custom_streaming' | 'other')[]; // Array for multi-platform streaming
      subscribers?: number;
      averageViews?: number;
      averageViewsPerMonth?: number; // Clarified metric for monthly views
      contentType?: 'live_news' | 'recorded_shows' | 'interviews' | 'events' | 'mixed';
      frequency?: string; // How often content is published (for revenue calculations)
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: 'pre-roll' | 'mid-roll' | 'post-roll' | 'overlay' | 'sponsored_content' | 'product_placement' | 'live_mention';
        duration?: number;
        position?: 'pre-roll' | 'mid-roll' | 'post-roll'; // Standardized position field
        spotsPerShow?: number; // Number of times this ad runs per video/stream
        pricing?: {
          flatRate?: number; // The rate - meaning depends on pricingModel (e.g., $32 CPM = $32 per 1000 views)
          pricingModel?: 'cpm' | 'cpv' | 'flat' | 'per_spot' | 'monthly' | 'contact';
          frequency?: string;
        };
        specifications?: {
          format?: 'mp4' | 'mov' | 'avi' | 'script' | 'image_overlay';
          resolution?: '1080p' | '720p' | '480p' | '4k';
          aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
        };
        available?: boolean;
        hubPricing?: Array<{
          hubId: string;
          hubName: string;
          pricing: {
            flatRate?: number;
            pricingModel?: string;
            frequency?: string;
          };
          discount?: number;
          available?: boolean;
          minimumCommitment?: string;
        }>;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
    
    television?: Array<{
      stationId?: string;
      callSign?: string;
      channel?: string;
      network?: 'abc' | 'nbc' | 'cbs' | 'fox' | 'pbs' | 'cw' | 'independent' | 'cable' | 'other';
      coverageArea?: string;
      viewers?: number;
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: '30_second_spot' | '60_second_spot' | '15_second_spot' | 'sponsored_segment' | 'product_placement' | 'billboard';
        daypart?: 'prime_time' | 'daytime' | 'early_morning' | 'late_night' | 'weekend' | 'sports';
        pricing?: {
          perSpot?: number;
          weekly?: number;
          monthly?: number;
          pricingModel?: 'per_spot' | 'weekly' | 'monthly' | 'contact';
        };
        specifications?: {
          format?: 'mpeg2' | 'h264' | 'prores' | 'live_script';
          resolution?: '1080p' | '720p' | '4k';
          duration?: number;
        };
        available?: boolean;
      }>;
      generalTerms?: {
        leadTime?: string;
        materialDeadline?: string;
        paymentTerms?: string;
        cancellationPolicy?: string;
        agencyCommission?: string;
        specifications?: string;
        additionalTerms?: string;
      };
    }>;
  };
  
  audienceDemographics?: {
    totalAudience?: number;
    ageGroups?: {
      '18-24'?: number;
      '25-34'?: number;
      '35-44'?: number;
      '45-54'?: number;
      '55-64'?: number;
      '65+'?: number;
    };
    gender?: {
      male?: number;
      female?: number;
      other?: number;
    };
    householdIncome?: {
      under35k?: number;
      '35k-50k'?: number;
      '50k-75k'?: number;
      '75k-100k'?: number;
      '100k-150k'?: number;
      over150k?: number;
    };
    education?: {
      highSchool?: number;
      someCollege?: number;
      bachelors?: number;
      graduate?: number;
    };
    location?: string;
    interests?: string[];
    targetMarkets?: string[];
  };
  
  editorialInfo?: {
    contentFocus?: string[];
    contentPillars?: string[];
    specialSections?: string[];
    signatureFeatures?: string[];
    editorialTeam?: {
      editorInChief?: string;
      managingEditor?: string;
      keyWriters?: string[];
      contributingWriters?: string[];
    };
  };
  
  businessInfo?: {
    legalEntity?: string;
    taxId?: string;
    ownershipType?: 'independent' | 'chain' | 'nonprofit' | 'public' | 'private' | 'family-owned';
    parentCompany?: string;
    yearsInOperation?: number;
    numberOfEmployees?: number;
    averageMonthlyRevenue?: number;
    revenueBreakdown?: {
      digital?: number;
      print?: number;
      events?: number;
      podcasts?: number;
      radio?: number;
      streaming?: number;
      social?: number;
      other?: number;
    };
    topAdvertiserCategories?: string[];
    clientRetentionRate?: number;
  };
  
  crossChannelPackages?: Array<{
    name?: string;
    packageName?: string;
    includedChannels?: Array<'website' | 'print' | 'newsletter' | 'social' | 'events' | 'email' | 'podcasts' | 'radio' | 'streaming'>;
    pricing?: string;
    details?: string;
    duration?: string;
    savings?: number;
  }>;
  
  technicalCapabilities?: {
    cmsplatform?: string;
    emailServiceProvider?: string;
    adServer?: string;
    analyticsTools?: string[];
    crmSystem?: string;
    paymentProcessing?: Array<'credit cards' | 'ach' | 'check' | 'paypal' | 'stripe' | 'square'>;
  };
  
  competitiveInfo?: {
    uniqueValueProposition?: string;
    keyDifferentiators?: string[];
    competitiveAdvantages?: string[];
    marketShare?: number;
    mainCompetitors?: string[];
  };
  
  awards?: Array<{
    award?: string;
    organization?: string;
    year?: number;
    category?: string;
  }>;
  
  bookingPolicies?: {
    minimumLeadTime?: string;
    cancellationPolicy?: string;
    materialDeadline?: string;
    paymentTerms?: string;
    agencyDiscount?: number;
    creditCardsAccepted?: boolean;
  };
  
  metadata?: {
    extractedFrom?: Array<'website' | 'web_search' | 'manual_entry' | 'api' | 'media_kit' | 'sales_contact'>;
    confidence?: number;
    lastAnalyzed?: Date;
    lastUpdated?: Date;
    createdAt?: Date;
    mediaKitDate?: Date;
    nextReviewDate?: Date;
    dataCompleteness?: number;
    verificationStatus?: 'verified' | 'needs_verification' | 'outdated' | 'incomplete';
  };
  
  internalNotes?: {
    operationalNotes?: string;
    salesApproach?: string;
    knownChallenges?: string[];
    growthOpportunities?: string[];
    preferredContactTime?: string;
    responseTime?: string;
    decisionMakers?: string[];
  };

  adDeliverySettings?: {
    adServer?: string;
    esp?: string;
    espOther?: {
      name?: string;
      emailIdMergeTag?: string;
      cacheBusterMergeTag?: string;
    };
  };

  campaignSettings?: {
    /** Days before campaign start that cancellation is allowed (default 14 = two weeks) */
    cancellationDeadlineDays?: number;
  };

  /** AI-generated publication profile from Perplexity web search */
  aiProfile?: {
    /** 2-3 sentence overview suitable for client-facing display */
    summary: string;
    /** Longer narrative about community role, editorial voice, audience character */
    fullProfile: string;
    /** Description of who reads/listens/watches and why they're valuable to advertisers */
    audienceInsight: string;
    /** The publication's role and significance in the local community */
    communityRole: string;
    /** Perplexity source URLs used to generate the profile */
    citations: string[];
    /** When this profile was generated */
    generatedAt: Date;
    /** Model used to generate the profile */
    generatedBy: 'perplexity-sonar-pro';
    /** Incremented on each refresh */
    version: number;
  };
}

export type PublicationInsertFrontend = Omit<PublicationFrontend, '_id'>;
export type PublicationUpdateFrontend = Partial<PublicationInsertFrontend>;

export interface PublicationCategory {
  id: string;
  name: string;
  count: number;
}

export interface PublicationType {
  id: string;
  name: string;
  count: number;
}

// Hub Pricing interface for consistent use across inventory
export interface HubPricing {
  hubId: string;
  hubName: string;
  pricing: any; // Flexible pricing object since it varies by type
  discount?: number;
  available?: boolean;
  minimumCommitment?: string;
}
