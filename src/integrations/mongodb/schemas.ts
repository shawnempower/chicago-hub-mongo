import { ObjectId } from 'mongodb';

// ===== USER AUTHENTICATION SCHEMA =====
export interface User {
  _id?: string | ObjectId;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  _id?: string | ObjectId;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

// ===== AD PACKAGES SCHEMA =====
export interface AdPackage {
  _id?: string | ObjectId;
  legacyId?: number;
  name: string;
  tagline?: string;
  description?: string;
  price?: string;
  priceRange?: string;
  audience?: string[];
  channels?: string[];
  complexity?: string;
  outlets?: string[];
  features?: Record<string, any>;
  format?: string;
  duration?: string;
  reachEstimate?: string;
  mediaOutletId?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ===== ADVERTISING INVENTORY SCHEMA =====
export interface AdvertisingInventory {
  _id?: string | ObjectId;
  mediaOutletId: string;
  packageName: string;
  packageType: string;
  description?: string;
  pricingTiers?: {
    tier: string;
    price: number;
    impressions?: number;
    duration?: string;
  }[];
  placementOptions?: {
    location: string;
    size: string;
    format: string;
  }[];
  performanceMetrics?: {
    averageCTR?: number;
    averageImpressions?: number;
    averageReach?: number;
  };
  technicalRequirements?: {
    fileFormats: string[];
    maxFileSize: string;
    dimensions: string[];
  };
  fileRequirements?: Record<string, any>;
  leadTime?: string;
  minCommitment?: string;
  maxCommitment?: string;
  availabilitySchedule?: string;
  cancellationPolicy?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== LEAD INQUIRIES SCHEMA =====
export interface LeadInquiry {
  _id?: string | ObjectId;
  userId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  businessName: string;
  websiteUrl?: string;
  budgetRange?: string;
  timeline?: string;
  marketingGoals?: string[];
  interestedOutlets?: string[];
  interestedPackages?: number[];
  conversationContext?: Record<string, any>;
  status?: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';
  assignedTo?: string;
  followUpDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== USER PROFILES SCHEMA =====
export interface UserProfile {
  _id?: string | ObjectId;
  userId: string; // Auth user ID
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  companyWebsite?: string;
  companySizes?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  role?: string;
  targetAudience?: string;
  marketingGoals?: string[];
  brandVoice?: string;
  isAdmin?: boolean;
  profileCompletionScore?: number;
  websiteAnalysisDate?: Date;
  websiteContentSummary?: string;
  websiteKeyServices?: string[];
  websiteBrandThemes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ===== CONVERSATION THREADS SCHEMA =====
export interface ConversationThread {
  _id?: string | ObjectId;
  userId: string;
  title: string;
  description?: string;
  category?: 'general' | 'media_planning' | 'package_inquiry' | 'support';
  messageCount?: number;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== ASSISTANT CONVERSATIONS SCHEMA =====
export interface AssistantConversation {
  _id?: string | ObjectId;
  userId: string;
  conversationThreadId?: string;
  messageType: 'user' | 'assistant' | 'system';
  messageContent: string;
  metadata?: {
    packageRecommendations?: string[];
    outletSuggestions?: string[];
    searchQuery?: string;
    userIntent?: string;
    confidence?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ===== BRAND DOCUMENTS SCHEMA =====
export interface BrandDocument {
  _id?: string | ObjectId;
  userId: string;
  documentName: string;
  documentType: 'logo' | 'brand_guide' | 'media_kit' | 'presentation' | 'other';
  description?: string;
  fileUrl?: string;
  externalUrl?: string;
  s3Key?: string;
  mimeType?: string;
  fileSize?: number;
  originalFileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== SAVED OUTLETS SCHEMA =====
export interface SavedOutlet {
  _id?: string | ObjectId;
  userId: string;
  outletId: string; // Reference to publication
  savedAt: Date;
}

// ===== SAVED PACKAGES SCHEMA =====
export interface SavedPackage {
  _id?: string | ObjectId;
  userId: string;
  packageId: number;
  savedAt: Date;
}

// ===== USER INTERACTIONS SCHEMA =====
export interface UserInteraction {
  _id?: string | ObjectId;
  userId: string;
  interactionType: 'page_view' | 'package_view' | 'outlet_view' | 'search' | 'filter' | 'download' | 'inquiry';
  metadata?: {
    pageUrl?: string;
    packageId?: string;
    outletId?: string;
    searchQuery?: string;
    filterApplied?: Record<string, any>;
    downloadType?: string;
    inquiryType?: string;
  };
  createdAt: Date;
}

// ===== ASSISTANT INSTRUCTIONS SCHEMA =====
export interface AssistantInstruction {
  _id?: string | ObjectId;
  version: string;
  instructions: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== ANALYTICS SCHEMA =====
export interface AnalyticsEvent {
  _id?: string | ObjectId;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

// ===== UNIVERSAL PUBLISHER PROFILE SCHEMA =====
// Comprehensive publication/media entity schema
export interface Publication {
  _id?: string | ObjectId;
  publicationId: number; // Unique internal publication identifier
  
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
}

export interface PublicationInsert extends Omit<Publication, '_id'> {}
export interface PublicationUpdate extends Partial<PublicationInsert> {
  'metadata.lastUpdated': Date;
}

// Legacy MediaEntity interface for backward compatibility
export interface MediaEntity {
  _id?: string | ObjectId;
  legacyId?: number;
  name: string;
  type: string;
  tagline?: string;
  description: string;
  website?: string;
  category: string;
  categoryTag: string;
  logo: string;
  logoColor: string;
  brief: string;
  reach: string;
  audience: string;
  strengths: string[];
  advertising: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    salesContact?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  businessInfo?: {
    foundingYear?: number;
    staffCount?: number;
    ownershipType?: string;
    businessModel?: string;
    competitiveAdvantages?: string;
    primaryMarket?: string;
    coverageArea?: string;
    publicationFrequency?: string;
  };
  audienceMetrics?: {
    monthlyVisitors?: number;
    emailSubscribers?: number;
    openRate?: number;
    audienceSize?: string;
    demographics?: {
      gender?: { male?: number; female?: number };
      income?: { highIncome?: number };
      education?: { graduateDegree?: number };
      device?: { mobile?: number };
    };
  };
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    totalFollowers?: number;
  };
  editorialInfo?: {
    editorialFocus?: string[];
    awards?: any[];
    keyPersonnel?: any[];
  };
  technicalSpecs?: {
    adSpecs?: any;
    fileRequirements?: any;
    technicalRequirements?: any;
  };
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface MediaEntityInsert extends Omit<MediaEntity, '_id' | 'createdAt' | 'updatedAt'> {}
export interface MediaEntityUpdate extends Partial<MediaEntityInsert> {
  updatedAt: Date;
}

// ===== PUBLICATION FILES SCHEMA =====
export interface PublicationFile {
  _id?: string | ObjectId;
  publicationId: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  description?: string;
  s3Key: string;
  s3Bucket: string;
  fileUrl?: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
  tags?: string[];
  isPublic?: boolean;
  downloadCount?: number;
  lastAccessedAt?: Date;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pageCount?: number;
    extractedText?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicationFileInsert extends Omit<PublicationFile, '_id' | 'createdAt' | 'updatedAt'> {}

export interface PublicationFileUpdate extends Partial<Omit<PublicationFile, '_id' | 'publicationId' | 's3Key' | 's3Bucket' | 'createdAt'>> {
  updatedAt: Date;
}

// ===== STOREFRONT CONFIGURATIONS SCHEMA =====
export interface StorefrontConfiguration {
  _id?: string | ObjectId;
  publicationId: string; // Reference to publication
  meta: {
    configVersion: string;
    description?: string;
    lastUpdated?: string;
    publisherId: string;
    websiteUrl?: string;
    isDraft: boolean;
  };
  theme: {
    colors: {
      lightPrimary: string;
      darkPrimary: string;
      gradStart?: string;
      gradEnd?: string;
      angle?: number;
      mode: 'light' | 'dark' | 'auto';
      ctaTextColor?: string;
    };
    typography: {
      primaryFont: string;
      fontWeights?: string;
    };
    layout?: {
      radius?: number;
      iconWeight?: 'light' | 'regular' | 'bold' | 'fill';
    };
    sectionSettings?: {
      [key: string]: {
        mode?: 'light' | 'dark' | 'auto';
        accentOverride?: string | null;
      };
    };
  };
  components: Record<string, {
    enabled: boolean;
    order: number;
    content: Record<string, any>;
  }>;
  seoMetadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  };
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorefrontConfigurationInsert extends Omit<StorefrontConfiguration, '_id' | 'createdAt' | 'updatedAt'> {}
export interface StorefrontConfigurationUpdate extends Partial<StorefrontConfigurationInsert> {
  updatedAt: Date;
}

// ===== SURVEY SUBMISSIONS SCHEMA =====
export interface SurveySubmission {
  _id?: string | ObjectId;
  metadata: {
    respondentId?: string;
    collectorId?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  contactInformation: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    title?: string;
    email?: string;
    emailAddress?: string;
    companyName?: string;
    mediaOutletNames: string;
  };
  websiteAdvertising?: {
    monthlyUniqueVisitors?: number | string;
    hasWebsiteAdvertising?: boolean;
    largestDigitalAdSize?: string;
    secondLargestDigitalAdSize?: string;
    largestAdWeeklyRate?: number | string;
    largestAdMonthlyRate?: number | string;
    secondLargestAdWeeklyRate?: number | string;
    secondLargestAdMonthlyRate?: number | string;
    websiteTakeoverCost?: number | string | null;
    mediaKitLink?: string;
  };
  printAdvertising?: {
    hasPrintProduct?: boolean;
    mainPrintProductName?: string;
    printFrequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'other';
    averagePrintRun?: number | string;
    distributionOutlets?: number | string;
    fullPageAdSize?: string;
    halfPageAdSize?: string;
    fullPageRate1x?: number | string;
    fullPageRate6x?: number | string;
    fullPageRate12x?: number | string;
    halfPageRate1x?: number | string;
    halfPageRate6x?: number | string;
    halfPageRate12x?: number | string;
    printRatesComparable?: string;
  };
  newsletterAdvertising?: {
    hasNewsletter?: boolean;
    newsletterSubscribers?: number | string;
    newsletterFrequency?: string;
    newsletterAdSizeLargest?: string;
    newsletterAdSizeSecond?: string;
    newsletterLargestAdRate1x?: number | string;
    newsletterLargestAdRateMonthly?: number | string;
    newsletterSecondAdRate1x?: number | string;
    newsletterSecondAdRateMonthly?: number | string;
    newsletterTakeoverCost?: number | string | null;
    newsletterRatesComparable?: string;
  };
  radioPodcastAdvertising?: {
    hasRadioStation?: boolean;
    hasPodcast?: boolean;
    radio30SecondAdsCost10x?: number | string;
    radio60SecondAdsCost10x?: number | string;
    podcast30SecondAdsCost10x?: number | string;
    podcastListenersPerShow?: number | string;
    podcastSpecialTakeoversCost?: number | string;
    video30SecondAdCost?: number | string;
    video60SecondAdCost?: number | string;
    videoAverageViews?: number | string;
  };
  socialMedia?: {
    facebookFollowers?: number | string;
    instagramFollowers?: number | string;
    twitterFollowers?: number | string;
    tiktokFollowers?: number | string;
    linkedinFollowers?: number | string;
    otherSocialFollowers?: string;
    socialMediaAdvertisingOptions?: string;
  };
  eventMarketing?: {
    hostsEvents?: boolean;
    annualEventCount?: number | string;
    eventAttendanceRange?: string;
    largestSponsorshipLevel?: number | string;
    smallestSponsorshipLevel?: number | string;
    eventSponsorshipDetails?: string;
  };
  brandedContent?: {
    offersBrandedContent?: boolean;
    printBrandedContentCost?: number | string | null;
    websiteBrandedContentCost3Month?: number | string;
    shortFormContentCost?: number | string;
    brandedContentAdditionalInfo?: string;
  };
  additionalServices?: {
    offersOttMarketing?: boolean;
    offersVirtualWebinars?: boolean;
    producesOtherVideos?: boolean;
    videoProductionDetails?: string;
    customData?: string;
  };
  surveyResponses?: {
    responseIndicators?: {
      response1?: boolean | string;
      response2?: boolean | string;
      response3?: boolean | string;
      response4?: boolean | string;
      response5?: boolean | string;
      response6?: boolean | string;
      response7?: boolean | string;
      response10?: boolean | string;
      response13?: boolean | string;
    };
    openEndedResponses?: {
      openEndedResponse1?: string;
      openEndedResponse2?: string;
      generalResponse?: string;
    };
    conditionalResponses?: {
      ifYes1Explanation?: string;
      ifYes2Explanation?: string;
    };
    parsedExtra?: string;
  };
  // Admin fields
  application?: {
    status?: 'new' | 'reviewing' | 'approved' | 'rejected' | 'follow_up_needed';
    reviewNotes?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveySubmissionInsert extends Omit<SurveySubmission, '_id' | 'createdAt' | 'updatedAt'> {}

export interface SurveySubmissionUpdate extends Partial<Omit<SurveySubmission, '_id' | 'createdAt'>> {
  updatedAt: Date;
}

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  USER_SESSIONS: 'user_sessions',
  PUBLICATIONS: 'publications',
  PUBLICATION_FILES: 'publication_files',
  STOREFRONT_CONFIGURATIONS: 'storefront_configurations',
  SURVEY_SUBMISSIONS: 'survey_submissions',
  AD_PACKAGES: 'ad_packages',
  ADVERTISING_INVENTORY: 'advertising_inventory',
  LEAD_INQUIRIES: 'lead_inquiries',
  USER_PROFILES: 'user_profiles',
  CONVERSATION_THREADS: 'conversation_threads',
  ASSISTANT_CONVERSATIONS: 'assistant_conversations',
  BRAND_DOCUMENTS: 'brand_documents',
  SAVED_OUTLETS: 'saved_outlets',
  SAVED_PACKAGES: 'saved_packages',
  USER_INTERACTIONS: 'user_interactions',
  ASSISTANT_INSTRUCTIONS: 'assistant_instructions',
  ANALYTICS_EVENTS: 'analytics_events',
  MEDIA_ENTITIES: 'media_entities', // Unified media collection
} as const;

// MongoDB Indexes Configuration
export const INDEXES = {
  users: [
    { email: 1 }, // unique
    { emailVerificationToken: 1 },
    { passwordResetToken: 1 },
    { createdAt: -1 }
  ],
  user_sessions: [
    { userId: 1 },
    { token: 1 }, // unique
    { expiresAt: 1 },
    { createdAt: -1 }
  ],
  publications: [
    { publicationId: 1 }, // unique
    { 'basicInfo.geographicCoverage': 1, 'basicInfo.primaryServiceArea': 1 },
    { 'basicInfo.publicationType': 1, 'basicInfo.contentType': 1 },
    { 'distributionChannels.website.metrics.monthlyVisitors': -1 },
    { 'distributionChannels.print.circulation': -1 },
    { 'metadata.lastUpdated': -1 },
    { 'metadata.verificationStatus': 1 }
  ],
  storefront_configurations: [
    { publicationId: 1 }, // unique per publication
    { 'meta.publisherId': 1 },
    { 'meta.isDraft': 1 },
    { isActive: 1 },
    { updatedAt: -1 },
    { createdAt: -1 }
  ],
  ad_packages: [
    { legacyId: 1 },
    { mediaOutletId: 1 },
    { isActive: 1 },
    { createdAt: -1 }
  ],
  lead_inquiries: [
    { userId: 1 },
    { status: 1 },
    { createdAt: -1 },
    { assignedTo: 1 },
    { followUpDate: 1 }
  ],
  user_profiles: [
    { userId: 1 }, // unique
    { companyName: 1 },
    { industry: 1 },
    { isAdmin: 1 }
  ],
  conversation_threads: [
    { userId: 1 },
    { createdAt: -1 },
    { isArchived: 1 }
  ],
  assistant_conversations: [
    { userId: 1 },
    { conversationThreadId: 1 },
    { createdAt: -1 }
  ],
  brand_documents: [
    { userId: 1 },
    { documentType: 1 },
    { createdAt: -1 }
  ],
  saved_outlets: [
    { userId: 1, outletId: 1 }, // compound unique
    { savedAt: -1 }
  ],
  saved_packages: [
    { userId: 1, packageId: 1 }, // compound unique
    { savedAt: -1 }
  ],
  user_interactions: [
    { userId: 1 },
    { interactionType: 1 },
    { createdAt: -1 }
  ],
  assistant_instructions: [
    { version: 1 },
    { isActive: 1 },
    { createdAt: -1 }
  ],
  analytics_events: [
    { userId: 1 },
    { sessionId: 1 },
    { eventType: 1 },
    { timestamp: -1 }
  ],
  media_entities: [
    { legacyId: 1 },
    { categoryTag: 1 },
    { type: 1 },
    { category: 1 },
    { isActive: 1 },
    { sortOrder: 1 },
    { name: 1 },
    { 'businessInfo.primaryMarket': 1 },
    { 'audienceMetrics.monthlyVisitors': -1 },
    { createdAt: -1 }
  ],
  media_partners: [
    { legacyId: 1 },
    { categoryTag: 1 },
    { isActive: 1 },
    { sortOrder: 1 },
    { name: 1 },
    { createdAt: -1 }
  ]
};
