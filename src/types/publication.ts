// Frontend-only type definitions for Publications
// These are separated from MongoDB schemas to avoid browser imports

export interface PublicationFrontend {
  _id?: string;
  publicationId: number;
  
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
    numberOfPublications?: number;
  };
  
  contactInfo?: {
    mainPhone?: string;
    businessHours?: string;
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
    };
    
    newsletters?: Array<{
      name?: string;
      subject?: string;
      frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular';
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
          perSend?: number;
          monthly?: number;
        };
      }>;
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
        adFormat?: 'full page' | 'half page' | 'quarter page' | 'eighth page' | 'business card' | 'classified' | 'insert';
        dimensions?: string;
        color?: 'color' | 'black and white' | 'both';
        location?: string;
        pricing?: {
          oneTime?: number;
          fourTimes?: number;
          twelveTimes?: number;
          openRate?: number;
        };
        specifications?: {
          format?: string;
          resolution?: string;
          bleed?: boolean;
        };
      }>;
    }>;
    
    events?: Array<{
      name?: string;
      type?: string;
      frequency?: string;
      averageAttendance?: number;
      targetAudience?: string;
      location?: string;
      advertisingOpportunities?: Array<{
        level?: 'title' | 'presenting' | 'supporting' | 'vendor' | 'booth';
        benefits?: string[];
        pricing?: number;
      }>;
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
        };
        available?: boolean;
      }>;
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
        adFormat?: '30_second_spot' | '60_second_spot' | 'live_read' | 'sponsorship' | 'traffic_weather_sponsor';
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
    }>;
    
    streamingVideo?: Array<{
      channelId?: string;
      name?: string;
      platform?: 'youtube' | 'twitch' | 'facebook_live' | 'instagram_live' | 'linkedin_live' | 'custom_streaming' | 'other';
      subscribers?: number;
      averageViews?: number;
      contentType?: 'live_news' | 'recorded_shows' | 'interviews' | 'events' | 'mixed';
      streamingSchedule?: string;
      advertisingOpportunities?: Array<{
        name?: string;
        adFormat?: 'pre-roll' | 'mid-roll' | 'post-roll' | 'overlay' | 'sponsored_content' | 'product_placement' | 'live_mention';
        duration?: number;
        pricing?: {
          cpm?: number;
          flatRate?: number;
          pricingModel?: 'cpm' | 'flat' | 'contact';
        };
        specifications?: {
          format?: 'mp4' | 'mov' | 'avi' | 'script' | 'image_overlay';
          resolution?: '1080p' | '720p' | '480p' | '4k';
          aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
        };
        available?: boolean;
      }>;
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
