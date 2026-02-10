import { ObjectId } from 'mongodb';

// ===== USER AUTHENTICATION SCHEMA =====
export interface User {
  _id?: string | ObjectId;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  role?: UserRole; // Optional: 'admin', 'hub_user', 'publication_user', 'standard'
  createdAt: Date;
  updatedAt: Date;
}

// User role enumeration
export type UserRole = 'admin' | 'hub_user' | 'publication_user' | 'standard';

// Access scope types for scalability
export type AccessScope = 'all' | 'hub_level' | 'group_level' | 'individual';

// ===== AD DELIVERY SETTINGS TYPES =====
// Ad server options for web/display inventory
export type PublicationAdServer = 'gam' | 'broadstreet' | 'adbutler' | 'direct';

// Email Service Provider options for newsletter inventory
export type PublicationESP = 
  | 'mailchimp'
  | 'constant_contact'
  | 'campaign_monitor'
  | 'klaviyo'
  | 'sailthru'
  | 'active_campaign'
  | 'sendgrid'
  | 'beehiiv'
  | 'convertkit'
  | 'emma'
  | 'hubspot'
  | 'brevo'
  | 'mailer_lite'
  | 'drip'
  | 'aweber'
  | 'other';

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

// ===== USER PERMISSIONS SCHEMA =====
// Scalable permission model supporting bulk access (e.g., 200+ publications)
export interface UserPermissions {
  _id?: string | ObjectId;
  userId: string; // Reference to User._id
  role: UserRole;
  
  // Scalable access control
  accessScope: AccessScope;
  
  // Hub-level access (most scalable for 100+ publications)
  // When a user has hub access, they automatically have access to all publications in that hub
  hubAccess?: Array<{
    hubId: string;
    accessLevel: 'full' | 'limited'; // 'full' = all pubs in hub, 'limited' = specific pubs
  }>;
  
  // Group-level access (for publication networks/groups)
  publicationGroupIds?: string[]; // Groups they have access to
  
  // Individual publication access (for specific assignments)
  // Only used when not hub/group level
  individualPublicationIds?: string[];
  
  // Permissions metadata
  canInviteUsers?: boolean; // Whether they can invite others to their resources
  canManageGroups?: boolean; // Whether they can create/manage publication groups
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // Who assigned these permissions
}

// Publication groups for managing bulk access (e.g., "Tribune Network", "Block Club Network")
export interface PublicationGroup {
  _id?: string | ObjectId;
  groupId: string; // Unique identifier (e.g., "tribune-network")
  name: string; // Display name (e.g., "Chicago Tribune Network")
  description?: string;
  publicationIds: string[]; // Publications in this group
  hubId?: string; // Optional hub association
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// User-Publication access junction for performance and reporting
// This denormalized table helps with quick permission checks
export interface UserPublicationAccess {
  _id?: string | ObjectId;
  userId: string;
  publicationId: string;
  grantedVia: 'direct' | 'hub' | 'group'; // How they got access
  grantedViaId?: string; // Hub ID or Group ID
  grantedAt: Date;
  grantedBy: string;
}

// User invitations for email-based access provisioning
export interface UserInvitation {
  _id?: string | ObjectId;
  invitedEmail: string;
  invitedBy: string; // userId who sent invitation
  invitedByName: string; // Name of user who sent invitation
  invitationToken: string; // unique token for accepting
  resourceType: 'hub' | 'publication';
  resourceId: string;
  resourceName: string;
  isExistingUser: boolean; // Whether user account already exists
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: Date; // Invitations expire after 7 days
  acceptedAt?: Date;
  createdAt: Date;
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
  
  // Lead Source - tracks where the lead came from
  leadSource: 'storefront_form' | 'ai_chat' | 'manual_entry' | 'other';
  
  // Hub and Publication Association
  hubId?: string; // Optional - hub this lead belongs to (can be derived from publication if publicationId is set)
  publicationId?: string; // Optional - numeric publication ID (e.g., "1035"), NOT the MongoDB _id
  
  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  businessName: string;
  websiteUrl?: string;
  
  // Lead Details
  budgetRange?: string;
  timeline?: string;
  marketingGoals?: string[];
  interestedOutlets?: string[];
  interestedPackages?: number[];
  
  // Enhanced fields for different form types
  message?: string; // General message/notes from any form
  targetLaunchDate?: Date; // When they want to launch campaign
  campaignGoals?: string | string[]; // Can be single string or array
  
  // Flexible storage for form-specific data
  conversationContext?: {
    formType?: string; // "storefront_basic", "storefront_detailed", "ai_chat", etc.
    rawFormData?: Record<string, any>; // Original form data preserved
    [key: string]: any; // Additional custom fields
  };
  
  // Lead Management
  status?: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';
  assignedTo?: string;
  followUpDate?: Date;
  
  // Archiving
  archivedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ===== LEAD NOTES SCHEMA =====
export interface LeadNote {
  _id?: string | ObjectId;
  leadId: string; // Reference to lead
  
  // Author Information
  authorId: string; // User ID who created the note
  authorName: string; // Display name of author
  
  // Note Content
  noteContent: string;
  noteType: 'note' | 'status_change' | 'assignment' | 'system';
  
  // Additional Context
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    previousAssignee?: string;
    newAssignee?: string;
    [key: string]: any;
  };
  
  // Timestamps
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
  
  // Activity type - expanded to cover database operations for audit trail
  interactionType: 
    // Original UI interaction types
    | 'page_view' | 'package_view' | 'outlet_view' | 'search' | 'filter' | 'download' | 'inquiry'
    // Database operation types for audit trail
    | 'campaign_create' | 'campaign_update' | 'campaign_delete'
    | 'order_create' | 'order_update' | 'order_delete'
    | 'inventory_update' | 'publication_update'
    | 'lead_create' | 'lead_update' | 'lead_delete'
    | 'package_create' | 'package_update' | 'package_delete' | 'package_refresh'
    | 'settings_update' | 'storefront_update'
    | 'user_login' | 'user_logout'
    | 'password_reset_request' | 'password_reset';
  
  // Context for filtering by publication or hub
  hubId?: string;
  publicationId?: string;
  
  // Session and audit context
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Flexible metadata for activity-specific details
  metadata?: {
    // Original UI interaction metadata
    pageUrl?: string;
    packageId?: string;
    outletId?: string;
    searchQuery?: string;
    filterApplied?: Record<string, any>;
    downloadType?: string;
    inquiryType?: string;
    
    // Database operation metadata
    resourceId?: string;      // ID of the resource that was modified
    resourceType?: string;    // Type of resource (campaign, order, etc.)
    action?: string;          // Additional action context
    changes?: string[];       // High-level list of what changed (e.g., ['status', 'budget'])
    batchId?: string;         // For grouping bulk operations
    [key: string]: any;       // Allow additional fields
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

// ===== PERFORMANCE METRICS =====
// Standardized performance metrics for revenue forecasting across all inventory types
export interface PerformanceMetrics {
  impressionsPerMonth?: number;  // For CPM, CPV, CPD pricing models
  occurrencesPerMonth?: number;  // For per_send, per_spot, per_post, per_ad pricing models
  audienceSize?: number;         // Base audience size (subscribers, circulation, followers, listeners)
  guaranteed?: boolean;          // Whether metrics are guaranteed or estimated
}

// ===== UNIVERSAL PUBLISHER PROFILE SCHEMA =====
// Comprehensive publication/media entity schema
export interface Publication {
  _id?: string | ObjectId;
  publicationId: number; // Unique internal publication identifier
  
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
        performanceMetrics?: PerformanceMetrics;
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
        monthlyImpressions?: number; // DEPRECATED: Use performanceMetrics.impressionsPerMonth
        performanceMetrics?: PerformanceMetrics;
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
        performanceMetrics?: PerformanceMetrics;
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
        adFormat?: 'tall full page' | 'tall portrait full page' | 'upper portrait full page' | 'square full page' | 'narrow full page' | 'half v tall' | 'half v standard' | 'half v slim' | 'half v mid' | 'half v compact' | 'half h tall' | 'half h standard' | 'half h wide' | 'half h mid' | 'half h compact' | 'quarter page' | 'eighth page' | 'business card' | 'classified' | 'insert';
        color?: 'color' | 'black and white' | 'both';
        location?: string;
        pricing?: {
          oneTime?: number;
          fourTimes?: number;
          twelveTimes?: number;
          openRate?: number;
        };
        performanceMetrics?: PerformanceMetrics;
        format?: {
          dimensions?: string;
          customDimensions?: string; // Publisher-specific dimensions if different from standard
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
        performanceMetrics?: PerformanceMetrics;
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
        performanceMetrics?: PerformanceMetrics;
        specifications?: {
          format?: 'mp3' | 'wav' | 'script';
          bitrate?: string;
          fileFormats?: string[];  // e.g., ['MP3', 'WAV'] or ['TXT']
          duration?: number;
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
      shows?: Array<{
        showId?: string;
        name?: string;
        frequency?: 'daily' | 'weekdays' | 'weekly' | 'bi-weekly' | 'weekend-only' | 'saturdays' | 'sundays' | 'weekdays-plus-saturday' | 'weekdays-plus-sunday' | 'custom';
        daysPerWeek?: number;
        timeSlot?: string;
        averageListeners?: number;
        advertisingOpportunities?: Array<{
          name?: string;
          adFormat?: '30_second_spot' | '60_second_spot' | '15_second_spot' | '15_second_spot_script' | '30_second_spot_script' | '60_second_spot_script' | 'live_read' | 'sponsorship' | 'traffic_weather_sponsor';
          spotsPerShow?: number;
          pricing?: {
            perSpot?: number;
            flatRate?: number;
            pricingModel?: 'per_spot' | 'contact';
          };
          performanceMetrics?: PerformanceMetrics;
          specifications?: {
            format?: 'mp3' | 'wav' | 'live_script';
            bitrate?: string;
            duration?: number;
          };
          available?: boolean;
          hubPricing?: Array<{
            hubId?: string;
            hubName?: string;
            // pricing can be single tier (object) or multiple tiers (array)
            pricing?: {
              flatRate?: number;
              pricingModel?: string;
              frequency?: string;
            } | Array<{
              flatRate?: number;
              pricingModel?: string;
              frequency?: string;
            }>;
            discount?: number;
            available?: boolean;
            minimumCommitment?: string;
          }>;
        }>;
      }>;
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
        performanceMetrics?: PerformanceMetrics;
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
        performanceMetrics?: PerformanceMetrics;
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
  
  // Ad Delivery Settings - controls how tracking tags are formatted for this publication
  adDeliverySettings?: {
    // Web/Display Ad Server - determines macro format for click tracking and cache busting
    adServer?: PublicationAdServer;
    
    // Newsletter Email Service Provider - determines merge tag format for subscriber tracking
    esp?: PublicationESP;
    
    // Additional ESP details when 'other' is selected
    espOther?: {
      name?: string;
      emailIdMergeTag?: string;    // Custom merge tag for subscriber ID
      cacheBusterMergeTag?: string; // Custom merge tag for timestamp
    };
  };

  // Campaign settings - e.g. cancellation policy
  campaignSettings?: {
    /** Days before campaign start that cancellation is allowed (default 14 = two weeks) */
    cancellationDeadlineDays?: number;
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
  websiteUrl: string; // Required for preview and publishing (root level)
  meta: {
    configVersion: string;
    description?: string;
    lastUpdated?: string;
    publisherId: string;
    isDraft: boolean;
    faviconUrl?: string;
    logoUrl?: string;
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
  chatEnabled?: boolean; // Deprecated: use chatWidget.enabled instead
  chatWidget?: {
    enabled: boolean;
    apiEndpoint?: string;
    buttonPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    defaultOpen?: boolean;
    title?: string;
    subtitle?: string;
    initialMessage?: string;
    primaryColor?: string;
    secondaryColor?: string;
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

// ===== ALGORITHM CONFIGS SCHEMA =====
// Stores editable algorithm configurations that override code defaults
export interface AlgorithmConfig {
  _id?: string | ObjectId;
  algorithmId: string; // 'all-inclusive', 'budget-friendly', 'little-guys', 'proportional'
  name: string;
  description: string;
  icon?: string;
  
  // LLM Configuration
  llmConfig?: {
    model?: {
      maxTokens?: number;
      temperature?: number;
    };
    pressForward?: {
      enforceAllOutlets?: boolean;
      prioritizeSmallOutlets?: boolean;
      allowBudgetExceeding?: boolean;
      maxBudgetExceedPercent?: number;
    };
    selection?: {
      maxPublications?: number;
      minPublications?: number;
      diversityWeight?: number;
    };
    output?: {
      includeRationale?: boolean;
      verboseLogging?: boolean;
      includeAlternatives?: boolean;
    };
  };
  
  // Constraints
  constraints?: {
    strictBudget?: boolean;
    maxBudgetExceedPercent?: number;
    maxPublications?: number;
    minPublications?: number;
    maxPublicationPercent?: number;
    minPublicationSpend?: number;
    targetPublicationsMin?: number;
    targetPublicationsMax?: number;
    pruningPassesMax?: number;
  };
  
  // Scoring Rules
  scoring?: {
    sizeWeight?: number;
    diversityWeight?: number;
    costEfficiencyWeight?: number;
    reachWeight?: number;
    engagementWeight?: number;
  };
  
  // Prompt Instructions (optional override)
  promptInstructions?: string;
  
  // Status
  isActive?: boolean;
  isDefault?: boolean; // Whether this is the default algorithm
  
  // Audit
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlgorithmConfigInsert extends Omit<AlgorithmConfig, '_id' | 'createdAt' | 'updatedAt'> {}
export interface AlgorithmConfigUpdate extends Partial<Omit<AlgorithmConfig, '_id' | 'algorithmId' | 'createdAt'>> {
  updatedAt: Date;
}

// ===== STOREFRONT CHAT CONFIG SCHEMA =====
// Configuration for the AI chat widget on storefronts
// Note: The enable/disable toggle is in StorefrontConfiguration.chatEnabled
export interface StorefrontChatConfig {
  _id?: string | ObjectId;
  
  // Lookup key - unique index by publicationId
  publicationId: string;
  
  // Template placeholders - replace {{key}} patterns in agent.yaml instructions
  placeholders: Record<string, string>;
  
  // Publication context - free-form JSON injected into prompt as context
  publicationContext: Record<string, unknown>;
  
  // Dynamic instructions
  prependInstructions: string;  // Text added BEFORE base agent.yaml instructions
  appendInstructions: string;   // Text added AFTER base agent.yaml instructions
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface StorefrontChatConfigInsert extends Omit<StorefrontChatConfig, '_id' | 'createdAt' | 'updatedAt'> {}
export interface StorefrontChatConfigUpdate extends Partial<Omit<StorefrontChatConfig, '_id' | 'publicationId' | 'createdAt'>> {
  updatedAt: Date;
}

// ===== STOREFRONT CONVERSATIONS SCHEMA =====
// Full chat conversation history from AI chat widget on storefronts
export interface StorefrontConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface StorefrontConversation {
  _id?: string | ObjectId;
  sessionId: string; // Links to lead's conversationContext.sessionId
  publicationId: string; // Numeric publication ID
  messages: StorefrontConversationMessage[];
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    leadGenerated?: boolean;
    leadId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ===== PUBLICATION EARNINGS SCHEMA =====
// Tracks what each publication earns from campaigns based on actual delivery

export interface PublicationEarningsItem {
  itemPath: string;                // Path to inventory item (e.g., "distributionChannels.website.advertisingOpportunities[0]")
  itemName: string;                // Display name (e.g., "728x90 Leaderboard")
  channel: string;                 // website, newsletter, print, radio, podcast, social, events, streaming
  plannedDelivery: number;         // Expected impressions, frequency, or occurrences
  deliveryType: 'impressions' | 'occurrences';  // How delivery is measured
  pricingModel: string;            // cpm, flat, per_send, per_spot, per_episode, etc.
  rate: number;                    // Hub price rate used for calculation
  estimatedEarnings: number;       // Planned earnings based on expected delivery
  actualDelivery?: number;         // Actual delivered amount
  actualEarnings?: number;         // Actual earnings based on delivery
  lastUpdated?: Date;              // When actual was last recalculated
}

export interface PublicationEarningsPayment {
  amount: number;
  date: Date;
  reference?: string;              // Check number, wire reference, etc.
  method?: 'check' | 'ach' | 'wire' | 'other';
  notes?: string;
  recordedBy?: string;             // User ID who recorded the payment
  recordedAt: Date;
}

export interface PublicationEarnings {
  _id?: string | ObjectId;
  orderId: string;                 // FK to publication_insertion_orders
  campaignId: string;
  campaignName?: string;           // Denormalized for display
  publicationId: number;
  publicationName: string;
  hubId: string;
  
  // Estimated earnings (calculated at campaign confirmation)
  estimated: {
    total: number;
    byChannel: Record<string, number>;
    byItem: PublicationEarningsItem[];
  };
  
  // Actual earnings (updated as performance comes in)
  actual: {
    total: number;
    byChannel: Record<string, number>;
    byItem: Array<{
      itemPath: string;
      actualDelivery: number;
      actualEarnings: number;
      lastUpdated: Date;
    }>;
  };
  
  // Digital impressions tracked by the system (for platform CPM calculation)
  trackedDigitalImpressions: {
    estimated: number;             // Planned digital impressions
    actual: number;                // Actual tracked impressions
  };
  
  // Comparison metrics
  variance: {
    amount: number;                // actual.total - estimated.total
    percentage: number;            // ((actual.total / estimated.total) - 1) * 100
  };
  
  // Payment tracking
  paymentStatus: 'pending' | 'partially_paid' | 'paid';
  amountPaid: number;              // Total amount paid so far
  amountOwed: number;              // actual.total - amountPaid
  paymentHistory: PublicationEarningsPayment[];
  
  // Timestamps and status
  createdAt: Date;
  updatedAt: Date;
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  finalized: boolean;              // True after campaign ends and final reconciliation
  finalizedAt?: Date;
}

// ===== HUB BILLING SCHEMA =====
// Tracks platform fees owed by hubs (revenue share + CPM on tracked impressions)

export interface HubBillingPayment {
  amount: number;
  date: Date;
  reference?: string;
  method?: 'ach' | 'wire' | 'check' | 'credit_card' | 'other';
  invoiceNumber?: string;
  notes?: string;
  recordedAt: Date;
}

export interface HubBilling {
  _id?: string | ObjectId;
  hubId: string;
  hubName?: string;                // Denormalized for display
  campaignId: string;
  campaignName?: string;           // Denormalized for display
  
  // Publisher payout summary (for revenue share calculation)
  publisherPayouts: {
    estimated: number;             // Sum of all publisher estimated earnings
    actual: number;                // Sum of all publisher actual earnings
    publicationCount: number;      // Number of publications in this campaign
  };
  
  // Revenue share fee (% of publisher payouts)
  revenueShareFee: {
    rate: number;                  // The % rate used (from hub config)
    estimated: number;             // publisherPayouts.estimated * (rate / 100)
    actual: number;                // publisherPayouts.actual * (rate / 100)
  };
  
  // Platform CPM fee (digital impressions only, system-tracked)
  platformCpmFee: {
    rate: number;                  // CPM rate used (from hub config)
    trackedImpressions: {
      estimated: number;           // Planned digital impressions
      actual: number;              // Actual tracked impressions
    };
    estimated: number;             // (estimated impressions / 1000) * rate
    actual: number;                // (actual impressions / 1000) * rate
  };
  
  // Totals
  totalFees: {
    estimated: number;             // revenueShareFee.estimated + platformCpmFee.estimated
    actual: number;                // revenueShareFee.actual + platformCpmFee.actual
  };
  
  // Payment tracking
  paymentStatus: 'pending' | 'invoiced' | 'partially_paid' | 'paid';
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  amountPaid: number;
  amountOwed: number;              // totalFees.actual - amountPaid
  paymentHistory: HubBillingPayment[];
  
  // Timestamps and status
  createdAt: Date;
  updatedAt: Date;
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  finalized: boolean;              // True after campaign ends and final reconciliation
  finalizedAt?: Date;
}

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  USER_SESSIONS: 'user_sessions',
  USER_PERMISSIONS: 'user_permissions', // Role-based access control
  PUBLICATION_GROUPS: 'publication_groups', // Publication groupings for bulk access
  USER_PUBLICATION_ACCESS: 'user_publication_access', // Junction table for access tracking
  USER_INVITATIONS: 'user_invitations', // Email-based user invitations
  PUBLICATIONS: 'publications',
  PUBLICATION_FILES: 'publication_files',
  STOREFRONT_CONFIGURATIONS: 'storefront_configurations',
  SURVEY_SUBMISSIONS: 'survey_submissions',
  AD_PACKAGES: 'ad_packages',
  HUB_PACKAGES: 'hub_packages', // New comprehensive hub-level package system
  HUBS: 'hubs', // Hub/market definitions
  CAMPAIGNS: 'campaigns', // AI-powered campaign builder
  PUBLICATION_INSERTION_ORDERS: 'publication_insertion_orders', // Per-publication insertion orders
  CREATIVE_ASSETS: 'creative_assets', // Creative assets for campaigns and insertion orders
  ADVERTISING_INVENTORY: 'advertising_inventory',
  LEAD_INQUIRIES: 'lead_inquiries',
  LEAD_NOTES: 'lead_notes', // Lead notes and activity history
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
  ALGORITHM_CONFIGS: 'algorithm_configs', // Editable algorithm configs (overrides)
  PRUNING_AUDITS: 'pruning_audits', // Stores pre/post pruning snapshots for campaign generation
  PERFORMANCE_ENTRIES: 'performance_entries', // Manual and automated performance data
  PROOF_OF_PERFORMANCE: 'proof_of_performance', // Proof files (tearsheets, affidavits, etc.)
  TRACKING_SCRIPTS: 'tracking_scripts', // Generated tracking tags for digital channels
  DAILY_AGGREGATES: 'daily_aggregates', // Pre-computed daily rollups for reporting
  ESP_REFERENCE: 'esp_reference', // Email service provider compatibility data
  NOTIFICATIONS: 'notifications', // In-app notifications for users
  STOREFRONT_CHAT_CONFIG: 'storefront_chat_config', // AI chat widget configuration per storefront
  STOREFRONT_CONVERSATIONS: 'storefront_conversations', // Full chat conversation history from storefronts
  PUBLICATION_EARNINGS: 'publication_earnings', // Publication earnings per campaign/order
  HUB_BILLING: 'hub_billing', // Platform fees owed by hubs
} as const;

// MongoDB Indexes Configuration
export const INDEXES = {
  users: [
    { email: 1 }, // unique
    { emailVerificationToken: 1 },
    { passwordResetToken: 1 },
    { role: 1 },
    { createdAt: -1 }
  ],
  user_sessions: [
    { userId: 1 },
    { token: 1 }, // unique
    { expiresAt: 1 },
    { createdAt: -1 }
  ],
  user_permissions: [
    { userId: 1 }, // unique
    { role: 1 },
    { accessScope: 1 },
    { 'hubAccess.hubId': 1 },
    { publicationGroupIds: 1 },
    { individualPublicationIds: 1 }
  ],
  publication_groups: [
    { groupId: 1 }, // unique
    { hubId: 1 },
    { createdBy: 1 },
    { createdAt: -1 }
  ],
  user_publication_access: [
    { userId: 1, publicationId: 1 }, // compound index for quick lookups
    { userId: 1 },
    { publicationId: 1 },
    { grantedVia: 1 },
    { grantedAt: -1 }
  ],
  user_invitations: [
    { invitationToken: 1 }, // unique
    { invitedEmail: 1 },
    { invitedBy: 1 },
    { status: 1 },
    { resourceType: 1, resourceId: 1 },
    { expiresAt: 1 },
    { createdAt: -1 }
  ],
  publications: [
    { publicationId: 1 }, // unique
    { hubIds: 1 }, // hub membership
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
  hub_packages: [
    { packageId: 1 }, // unique
    { 'hubInfo.hubId': 1 },
    { 'basicInfo.category': 1 },
    { 'availability.isActive': 1 },
    { 'availability.isFeatured': 1 },
    { 'metadata.approvalStatus': 1 },
    { 'marketing.displayOrder': 1 },
    { 'marketing.tags': 1 },
    { deletedAt: 1 },
    { 'metadata.createdAt': -1 }
  ],
  hubs: [
    { hubId: 1 }, // unique
    { 'basicInfo.name': 1 },
    { status: 1, createdAt: -1 },
    { 'geography.primaryCity': 1 },
    { 'geography.state': 1 }
  ],
  campaigns: [
    { campaignId: 1 }, // unique
    { hubId: 1 }, // Filter by hub
    { status: 1 }, // Filter by status
    { 'metadata.createdBy': 1 }, // Filter by creator
    { 'basicInfo.advertiserName': 1 }, // Search by advertiser
    { 'timeline.startDate': 1 }, // Sort/filter by date
    { 'timeline.endDate': 1 },
    { 'metadata.createdAt': -1 }, // Recently created
    { deletedAt: 1 } // Soft delete filter
  ],
  publication_insertion_orders: [
    { campaignId: 1 },                      // Find all orders for a campaign
    { publicationId: 1 },                   // Find all orders for a publication
    { hubId: 1, status: 1 },                // Admin filtering by hub and status
    { status: 1, generatedAt: -1 },         // Status filtering with time sort
    { campaignId: 1, publicationId: 1 },    // Compound for unique order lookup
    { generatedAt: -1 },                    // Sort by date
    { deletedAt: 1 }                        // Soft delete filter
  ],
  lead_inquiries: [
    { userId: 1 },
    { hubId: 1 }, // Filter by hub
    { publicationId: 1 }, // Filter by publication
    { leadSource: 1 }, // Filter by source
    { status: 1 },
    { createdAt: -1 },
    { assignedTo: 1 },
    { followUpDate: 1 },
    { archivedAt: 1 } // Filter archived leads
  ],
  lead_notes: [
    { leadId: 1, createdAt: -1 }, // Get notes for a lead, chronologically
    { authorId: 1 },
    { noteType: 1 },
    { createdAt: -1 }
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
    { createdAt: -1 },
    { hubId: 1, createdAt: -1 }, // Filter by hub with time ordering
    { publicationId: 1, createdAt: -1 }, // Filter by publication with time ordering
    { sessionId: 1 } // Group activities by session
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
  ],
  pruning_audits: [
    { createdAt: -1 },
    { 'request.hubId': 1 },
    { algorithmId: 1 }
  ],
  algorithm_configs: [
    { algorithmId: 1 }, // unique
    { updatedAt: -1 }
  ],
  performance_entries: [
    { orderId: 1, itemPath: 1 },           // Get entries for specific placement
    { campaignId: 1, dateStart: -1 },      // Campaign reporting
    { publicationId: 1, dateStart: -1 },   // Publication reporting
    { channel: 1, dateStart: -1 },         // Channel-specific queries
    { enteredBy: 1, enteredAt: -1 },       // User's entries
    { source: 1, enteredAt: -1 }           // Filter by entry source
  ],
  proof_of_performance: [
    { orderId: 1 },                        // Get proofs for order
    { campaignId: 1 },                     // Campaign-level proof lookup
    { publicationId: 1, uploadedAt: -1 },  // Publication's proofs
    { verificationStatus: 1, uploadedAt: -1 }  // Verification queue
  ],
  tracking_scripts: [
    { campaignId: 1 },
    { publicationId: 1 },
    { creativeId: 1 },
    { campaignId: 1, publicationId: 1, creativeId: 1 }  // Compound unique index - prevents duplicate scripts
  ],
  daily_aggregates: [
    { date: 1, campaignId: 1, publicationId: 1, channel: 1 },  // Compound unique key
    { campaignId: 1, date: -1 },           // Campaign date range queries
    { publicationId: 1, date: -1 }         // Publication date range queries
  ],
  esp_reference: [
    { slug: 1 },                           // Unique lookup
    { htmlSupport: 1 },                    // Filter by support level
    { isActive: 1 }
  ],
  notifications: [
    { userId: 1, read: 1, createdAt: -1 }, // User's unread notifications
    { userId: 1, createdAt: -1 },          // User's all notifications (timeline)
    { userId: 1, type: 1, createdAt: -1 }, // Filter by type
    { groupKey: 1 },                       // For deduplication/grouping
    { expiresAt: 1 },                      // For cleanup job
    { campaignId: 1 },                     // Notifications for a campaign
    { orderId: 1 }                         // Notifications for an order
  ],
  storefront_chat_config: [
    { publicationId: 1 },                  // Unique lookup by publicationId
    { updatedAt: -1 }                      // Sort by last update
  ],
  publication_earnings: [
    { orderId: 1 },                        // Unique - one earnings record per order
    { campaignId: 1 },                     // Get all earnings for a campaign
    { publicationId: 1, createdAt: -1 },   // Publication's earnings history
    { hubId: 1, createdAt: -1 },           // Hub's publisher earnings
    { paymentStatus: 1, finalized: 1 },    // Filter by payment/finalization status
    { 'actual.total': -1 },                // Sort by earnings amount
    { finalized: 1, finalizedAt: -1 }      // Recently finalized
  ],
  hub_billing: [
    { hubId: 1, campaignId: 1 },           // Compound - unique billing per hub/campaign
    { hubId: 1, createdAt: -1 },           // Hub's billing history
    { campaignId: 1 },                     // Get billing for a campaign
    { paymentStatus: 1, finalized: 1 },    // Filter by payment/finalization status
    { invoiceNumber: 1 },                  // Invoice lookup
    { dueDate: 1, paymentStatus: 1 },      // Overdue billing
    { finalized: 1, finalizedAt: -1 }      // Recently finalized
  ]
};
