// Frontend-safe common types
// These are separated from MongoDB schemas to avoid browser imports

// Frontend-safe UserProfile type
export interface UserProfile {
  _id?: string;
  userId: string;
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

// ⚠️ DEPRECATED: MediaEntity type for legacy compatibility only
// Use PublicationFrontend from @/types/publication instead for new code
export interface MediaEntity {
  _id?: string;
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

export type MediaEntityInsert = Omit<MediaEntity, '_id' | 'createdAt' | 'updatedAt'>;
export type MediaEntityUpdate = Partial<MediaEntityInsert> & {
  updatedAt: Date;
};

// Frontend-safe AdPackage type
export interface AdPackage {
  _id?: string;
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
