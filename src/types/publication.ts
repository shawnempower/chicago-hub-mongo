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
  
  socialMediaProfiles?: Array<{
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
  }>;
  
  distributionChannels?: {
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
    
    print?: {
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
    };
    
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
      other?: number;
    };
    topAdvertiserCategories?: string[];
    clientRetentionRate?: number;
  };
  
  crossChannelPackages?: Array<{
    name?: string;
    packageName?: string;
    includedChannels?: Array<'website' | 'print' | 'newsletter' | 'social' | 'events' | 'email'>;
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
