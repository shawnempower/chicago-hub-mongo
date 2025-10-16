import { ObjectId } from 'mongodb';

// Enums based on the schema
export type PublicationType = "daily" | "weekly" | "monthly" | "bi-weekly" | "quarterly" | "other";
export type ContentType = "news" | "lifestyle" | "business" | "entertainment" | "sports" | "alternative" | "mixed";
export type GeographicCoverage = "local" | "regional" | "state" | "national" | "international";
export type PreferredContact = "email" | "phone" | "text" | "linkedin";
export type SocialPlatform = "facebook" | "instagram" | "twitter" | "linkedin" | "youtube" | "tiktok" | "pinterest" | "snapchat" | "threads" | "other";
export type AdFormat = "300x250 banner" | "728x90 banner" | "320x50 banner" | "300x600 banner" | "970x250 banner" | "takeover ad" | "native" | "video" | "sponsored content" | "custom";
export type PricingModel = "cpm" | "flat" | "cpc" | "cpa" | "contact";
export type NewsletterFrequency = "daily" | "weekly" | "bi-weekly" | "monthly" | "irregular";
export type NewsletterPosition = "header" | "footer" | "inline" | "dedicated";
export type PrintFrequency = "daily" | "weekly" | "bi-weekly" | "monthly" | "quarterly";
export type PrintAdFormat = "full page" | "half page" | "quarter page" | "eighth page" | "business card" | "classified" | "insert";
export type ColorOption = "color" | "black and white" | "both";
export type SponsorshipLevel = "title" | "presenting" | "supporting" | "vendor" | "booth";
export type OwnershipType = "independent" | "chain" | "nonprofit" | "public" | "private" | "family-owned";
export type PaymentMethod = "credit cards" | "ach" | "check" | "paypal" | "stripe" | "square";
export type DataSource = "website" | "web_search" | "manual_entry" | "api" | "media_kit" | "sales_contact";
export type VerificationStatus = "verified" | "needs_verification" | "outdated" | "incomplete";

// Contact Information Interface
export interface ContactPerson {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  preferredContact?: PreferredContact;
}

export interface ContactInfo {
  mainPhone?: string;
  businessHours?: string;
  primaryContact?: ContactPerson;
  salesContact?: ContactPerson;
  editorialContact?: ContactPerson;
  generalManager?: ContactPerson;
  advertisingDirector?: ContactPerson;
}

// Social Media Interface
export interface SocialMediaProfile {
  platform: SocialPlatform;
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
}

// Advertising Opportunities
export interface AdvertisingOpportunity {
  name?: string;
  adFormat?: AdFormat;
  location?: string;
  pricing?: {
    cpm?: number;
    flatRate?: number;
    pricingModel?: PricingModel;
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
}

// Website Distribution Channel
export interface WebsiteChannel {
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
  advertisingOpportunities?: AdvertisingOpportunity[];
}

// Newsletter Interface
export interface Newsletter {
  name?: string;
  subject?: string;
  frequency?: NewsletterFrequency;
  sendDay?: string;
  sendTime?: string;
  subscribers?: number;
  openRate?: number;
  clickThroughRate?: number;
  listGrowthRate?: number;
  advertisingOpportunities?: {
    name?: string;
    position?: NewsletterPosition;
    dimensions?: string;
    pricing?: {
      perSend?: number;
      monthly?: number;
    };
  }[];
}

// Print Distribution Channel
export interface PrintChannel {
  name?: string;
  frequency?: PrintFrequency;
  circulation?: number;
  paidCirculation?: number;
  freeCirculation?: number;
  distributionArea?: string;
  distributionPoints?: string[];
  printSchedule?: string;
  advertisingOpportunities?: {
    name?: string;
    adFormat?: PrintAdFormat;
    dimensions?: string;
    color?: ColorOption;
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
  }[];
}

// Events Interface
export interface Event {
  name?: string;
  type?: string;
  frequency?: string;
  averageAttendance?: number;
  targetAudience?: string;
  location?: string;
  advertisingOpportunities?: {
    level?: SponsorshipLevel;
    benefits?: string[];
    pricing?: number;
  }[];
}

// Podcast Interface
export interface Podcast {
  podcastId?: string;
  name?: string;
  description?: string;
  frequency?: "daily" | "weekly" | "bi-weekly" | "monthly" | "irregular";
  averageDownloads?: number;
  averageListeners?: number;
  episodeCount?: number;
  platforms?: ("apple_podcasts" | "spotify" | "google_podcasts" | "amazon_music" | "stitcher" | "overcast" | "castbox" | "other")[];
  advertisingOpportunities?: {
    name?: string;
    adFormat?: "pre-roll" | "mid-roll" | "post-roll" | "host-read" | "programmatic" | "sponsored_content";
    duration?: number; // seconds
    pricing?: {
      cpm?: number;
      flatRate?: number;
      pricingModel?: "cpm" | "flat" | "contact";
    };
    specifications?: {
      format?: "mp3" | "wav" | "script";
      bitrate?: string;
    };
    available?: boolean;
  }[];
}

// Radio Station Interface
export interface RadioStation {
  stationId?: string;
  callSign?: string;
  frequency?: string;
  format?: "news_talk" | "classic_rock" | "country" | "pop" | "hip_hop" | "jazz" | "classical" | "alternative" | "sports" | "other";
  coverageArea?: string;
  listeners?: number; // average weekly listeners
  advertisingOpportunities?: {
    name?: string;
    adFormat?: "30_second_spot" | "60_second_spot" | "live_read" | "sponsorship" | "traffic_weather_sponsor";
    timeSlot?: "drive_time_morning" | "drive_time_evening" | "midday" | "weekend" | "overnight";
    pricing?: {
      perSpot?: number;
      weekly?: number;
      monthly?: number;
      pricingModel?: "per_spot" | "weekly" | "monthly" | "contact";
    };
    specifications?: {
      format?: "mp3" | "wav" | "live_script";
      bitrate?: string;
      duration?: number; // seconds
    };
    available?: boolean;
  }[];
}

// Streaming Video Interface
export interface StreamingVideo {
  channelId?: string;
  name?: string;
  platform?: "youtube" | "twitch" | "facebook_live" | "instagram_live" | "linkedin_live" | "custom_streaming" | "other";
  subscribers?: number;
  averageViews?: number;
  contentType?: "live_news" | "recorded_shows" | "interviews" | "events" | "mixed";
  streamingSchedule?: string;
  advertisingOpportunities?: {
    name?: string;
    adFormat?: "pre-roll" | "mid-roll" | "post-roll" | "overlay" | "sponsored_content" | "product_placement" | "live_mention";
    duration?: number; // seconds
    pricing?: {
      cpm?: number;
      flatRate?: number;
      pricingModel?: "cpm" | "flat" | "contact";
    };
    specifications?: {
      format?: "mp4" | "mov" | "avi" | "script" | "image_overlay";
      resolution?: "1080p" | "720p" | "480p" | "4k";
      aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
    };
    available?: boolean;
  }[];
}

// Distribution Channels
export interface DistributionChannels {
  website?: WebsiteChannel;
  socialMedia?: SocialMediaProfile[];
  newsletters?: Newsletter[];
  print?: PrintChannel[];
  events?: Event[];
  podcasts?: Podcast[];
  radioStations?: RadioStation[];
  streamingVideo?: StreamingVideo[];
}

// Demographics Interface
export interface AudienceDemographics {
  totalAudience?: number;
  ageGroups?: {
    "18-24"?: number;
    "25-34"?: number;
    "35-44"?: number;
    "45-54"?: number;
    "55-64"?: number;
    "65+"?: number;
  };
  gender?: {
    male?: number;
    female?: number;
    other?: number;
  };
  householdIncome?: {
    under35k?: number;
    "35k-50k"?: number;
    "50k-75k"?: number;
    "75k-100k"?: number;
    "100k-150k"?: number;
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
}

// Editorial Information
export interface EditorialInfo {
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
}

// Business Information
export interface BusinessInfo {
  legalEntity?: string;
  taxId?: string;
  ownershipType?: OwnershipType;
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
}

// Cross-Channel Packages
export interface CrossChannelPackage {
  name?: string;
  packageName?: string;
  includedChannels?: ("website" | "print" | "newsletter" | "social" | "events" | "email" | "podcasts" | "radio" | "streaming")[];
  pricing?: string;
  details?: string;
  duration?: string;
  savings?: number;
}

// Technical Capabilities
export interface TechnicalCapabilities {
  cmsplatform?: string;
  emailServiceProvider?: string;
  adServer?: string;
  analyticsTools?: string[];
  crmSystem?: string;
  paymentProcessing?: PaymentMethod[];
}

// Competitive Information
export interface CompetitiveInfo {
  uniqueValueProposition?: string;
  keyDifferentiators?: string[];
  competitiveAdvantages?: string[];
  marketShare?: number;
  mainCompetitors?: string[];
}

// Awards Interface
export interface Award {
  award?: string;
  organization?: string;
  year?: number;
  category?: string;
}

// Booking Policies
export interface BookingPolicies {
  minimumLeadTime?: string;
  cancellationPolicy?: string;
  materialDeadline?: string;
  paymentTerms?: string;
  agencyDiscount?: number;
  creditCardsAccepted?: boolean;
}

// Metadata Interface
export interface Metadata {
  extractedFrom?: DataSource[];
  confidence?: number;
  lastAnalyzed?: Date;
  lastUpdated?: Date;
  createdAt?: Date;
  mediaKitDate?: string;
  nextReviewDate?: string;
  dataCompleteness?: number;
  verificationStatus?: VerificationStatus;
}

// Internal Notes
export interface InternalNotes {
  operationalNotes?: string;
  salesApproach?: string;
  knownChallenges?: string[];
  growthOpportunities?: string[];
  preferredContactTime?: string;
  responseTime?: string;
  decisionMakers?: string[];
}

// Basic Information Interface
export interface BasicInfo {
  publicationName?: string;
  websiteUrl?: string;
  founded?: string | number;
  publicationType?: PublicationType;
  contentType?: ContentType;
  headquarters?: string;
  geographicCoverage?: GeographicCoverage;
  primaryServiceArea?: string;
  secondaryMarkets?: string[];
  numberOfPublications?: number;
}

// Main Publication Interface
export interface Publication {
  _id?: string | ObjectId;
  publicationId: number;
  basicInfo: BasicInfo;
  contactInfo?: ContactInfo;
  distributionChannels?: DistributionChannels;
  audienceDemographics?: AudienceDemographics;
  editorialInfo?: EditorialInfo;
  businessInfo?: BusinessInfo;
  crossChannelPackages?: CrossChannelPackage[];
  technicalCapabilities?: TechnicalCapabilities;
  competitiveInfo?: CompetitiveInfo;
  awards?: Award[];
  bookingPolicies?: BookingPolicies;
  metadata?: Metadata;
  internalNotes?: InternalNotes;
}

// For database operations
export interface PublicationInsert extends Omit<Publication, '_id'> {}
export interface PublicationUpdate extends Partial<PublicationInsert> {}

// Legacy compatibility - mapping old Supabase types to new MongoDB structure
export interface LegacyMediaOutlet {
  id: string;
  name: string;
  type: string;
  website_url?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  audience_size?: string;
  coverage_area?: string;
  founding_year?: number;
  monthly_visitors?: number;
  email_subscribers?: number;
  open_rate?: number;
  tagline?: string;
  primary_market?: string;
  publication_frequency?: string;
  staff_count?: number;
  ownership_type?: string;
  business_model?: string;
  competitive_advantages?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  demographics?: any;
  editorial_focus?: any;
  key_personnel?: any;
  secondary_markets?: any;
  social_media?: any;
  technical_specs?: any;
  awards?: any;
}

// Helper function to convert legacy media outlet to new publication format
export const convertLegacyToPublication = (legacy: LegacyMediaOutlet): PublicationInsert => {
  return {
    publicationId: parseInt(legacy.id) || 0,
    basicInfo: {
      publicationName: legacy.name,
      websiteUrl: legacy.website_url,
      founded: legacy.founding_year,
      publicationType: legacy.publication_frequency as PublicationType,
      contentType: "mixed", // Default value
      headquarters: legacy.primary_market,
      geographicCoverage: legacy.coverage_area as GeographicCoverage,
      primaryServiceArea: legacy.primary_market,
      secondaryMarkets: legacy.secondary_markets || [],
      numberOfPublications: 1,
    },
    contactInfo: {
      mainPhone: legacy.contact_phone,
      salesContact: {
        email: legacy.contact_email,
      },
    },
    distributionChannels: {
      website: {
        url: legacy.website_url,
        metrics: {
          monthlyVisitors: legacy.monthly_visitors,
        },
      },
      newsletters: legacy.email_subscribers ? [{
        subscribers: legacy.email_subscribers,
        openRate: legacy.open_rate,
      }] : undefined,
    },
    businessInfo: {
      ownershipType: legacy.ownership_type as OwnershipType,
      numberOfEmployees: legacy.staff_count,
    },
    competitiveInfo: {
      competitiveAdvantages: legacy.competitive_advantages ? [legacy.competitive_advantages] : [],
    },
    metadata: {
      lastUpdated: new Date(legacy.updated_at),
      createdAt: new Date(legacy.created_at),
      verificationStatus: legacy.is_active ? "verified" : "needs_verification",
    },
  };
};
