/**
 * Chicago Media Network Survey Submission Types
 * 
 * This file contains TypeScript type definitions for the survey submission schema.
 * These types ensure type safety when working with survey data in the application.
 */

export interface SurveyMetadata {
  /** Unique identifier for the respondent, typically timestamp-based */
  respondentId?: string;
  /** Identifier for the form/collector version */
  collectorId?: string;
  /** When the user started filling out the survey */
  startDate?: Date;
  /** When the user completed the survey */
  endDate?: Date;
  /** IP address of the submitter */
  ipAddress?: string;
  /** Browser user agent string */
  userAgent?: string;
  /** URL that referred the user to the survey */
  referrer?: string;
  /** Source of the submission */
  source?: 'web_form';
  /** UTM source parameter for tracking */
  utmSource?: string;
  /** UTM medium parameter for tracking */
  utmMedium?: string;
  /** UTM campaign parameter for tracking */
  utmCampaign?: string;
}

export interface ContactInformation {
  /** First name of the contact person */
  firstName?: string;
  /** Last name of the contact person */
  lastName?: string;
  /** Full name (alternative to firstName/lastName) */
  fullName?: string;
  /** Job title or position */
  title?: string;
  /** Primary email address */
  email?: string;
  /** Alternative email field */
  emailAddress?: string;
  /** Company or organization name */
  companyName?: string;
  /** Names of media outlets (comma-separated if multiple) - REQUIRED */
  mediaOutletNames: string;
}

export interface WebsiteAdvertising {
  /** Monthly unique website visitors */
  monthlyUniqueVisitors?: number | string;
  /** Whether the outlet offers website advertising */
  hasWebsiteAdvertising?: boolean;
  /** Dimensions/description of largest digital ad size */
  largestDigitalAdSize?: string;
  /** Dimensions/description of second largest digital ad size */
  secondLargestDigitalAdSize?: string;
  /** Weekly rate for largest digital ad */
  largestAdWeeklyRate?: number | string;
  /** Monthly rate for largest digital ad */
  largestAdMonthlyRate?: number | string;
  /** Weekly rate for second largest digital ad */
  secondLargestAdWeeklyRate?: number | string;
  /** Monthly rate for second largest digital ad */
  secondLargestAdMonthlyRate?: number | string;
  /** Cost for website takeover advertising (null if N/A) */
  websiteTakeoverCost?: number | string | null;
  /** URL to media kit or rate card */
  mediaKitLink?: string;
}

export interface PrintAdvertising {
  /** Whether the outlet has a print publication */
  hasPrintProduct?: boolean;
  /** Name of the main print publication */
  mainPrintProductName?: string;
  /** How often the print publication is released */
  printFrequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'other';
  /** Average number of copies printed */
  averagePrintRun?: number | string;
  /** Number of distribution points/outlets */
  distributionOutlets?: number | string;
  /** Dimensions of full page advertisement */
  fullPageAdSize?: string;
  /** Dimensions of half page advertisement */
  halfPageAdSize?: string;
  /** Full page ad rate for 1 insertion */
  fullPageRate1x?: number | string;
  /** Full page ad rate for 6 insertions */
  fullPageRate6x?: number | string;
  /** Full page ad rate for 12 insertions */
  fullPageRate12x?: number | string;
  /** Half page ad rate for 1 insertion */
  halfPageRate1x?: number | string;
  /** Half page ad rate for 6 insertions */
  halfPageRate6x?: number | string;
  /** Half page ad rate for 12 insertions */
  halfPageRate12x?: number | string;
  /** Comparison of print rates with other publications */
  printRatesComparable?: string;
}

export interface NewsletterAdvertising {
  /** Whether the outlet publishes a newsletter */
  hasNewsletter?: boolean;
  /** Number of newsletter subscribers */
  newsletterSubscribers?: number | string;
  /** How often the newsletter is sent */
  newsletterFrequency?: string;
  /** Dimensions/description of largest newsletter ad */
  newsletterAdSizeLargest?: string;
  /** Dimensions/description of second newsletter ad size */
  newsletterAdSizeSecond?: string;
  /** One-time rate for largest newsletter ad */
  newsletterLargestAdRate1x?: number | string;
  /** Monthly rate for largest newsletter ad */
  newsletterLargestAdRateMonthly?: number | string;
  /** One-time rate for second newsletter ad */
  newsletterSecondAdRate1x?: number | string;
  /** Monthly rate for second newsletter ad */
  newsletterSecondAdRateMonthly?: number | string;
  /** Cost for newsletter takeover (null if N/A) */
  newsletterTakeoverCost?: number | string | null;
  /** Comparison of newsletter rates with others */
  newsletterRatesComparable?: string;
}

export interface RadioPodcastAdvertising {
  /** Whether the outlet operates a radio station */
  hasRadioStation?: boolean;
  /** Whether the outlet produces podcasts */
  hasPodcast?: boolean;
  /** Cost for 10x 30-second radio advertisements */
  radio30SecondAdsCost10x?: number | string;
  /** Cost for 10x 60-second radio advertisements */
  radio60SecondAdsCost10x?: number | string;
  /** Cost for 10x 30-second podcast advertisements */
  podcast30SecondAdsCost10x?: number | string;
  /** Average number of listeners per podcast episode */
  podcastListenersPerShow?: number | string;
  /** Cost for special podcast takeovers */
  podcastSpecialTakeoversCost?: number | string;
  /** Cost for 30-second video advertisement */
  video30SecondAdCost?: number | string;
  /** Cost for 60-second video advertisement */
  video60SecondAdCost?: number | string;
  /** Average views per video */
  videoAverageViews?: number | string;
}

export interface SocialMedia {
  /** Number of Facebook followers */
  facebookFollowers?: number | string;
  /** Number of Instagram followers */
  instagramFollowers?: number | string;
  /** Number of Twitter/X followers */
  twitterFollowers?: number | string;
  /** Number of TikTok followers */
  tiktokFollowers?: number | string;
  /** Number of LinkedIn followers */
  linkedinFollowers?: number | string;
  /** Other social media platforms and follower counts */
  otherSocialFollowers?: string;
  /** Description of social media advertising services offered */
  socialMediaAdvertisingOptions?: string;
}

export interface EventMarketing {
  /** Whether the outlet hosts events */
  hostsEvents?: boolean;
  /** Number of events hosted per year */
  annualEventCount?: number | string;
  /** Typical range of event attendance */
  eventAttendanceRange?: string;
  /** Cost of highest sponsorship tier */
  largestSponsorshipLevel?: number | string;
  /** Cost of lowest sponsorship tier */
  smallestSponsorshipLevel?: number | string;
  /** Details about event sponsorship opportunities */
  eventSponsorshipDetails?: string;
}

export interface BrandedContent {
  /** Whether the outlet offers branded content services */
  offersBrandedContent?: boolean;
  /** Cost for print branded content (null if N/A) */
  printBrandedContentCost?: number | string | null;
  /** Cost for 3-month website branded content campaign */
  websiteBrandedContentCost3Month?: number | string;
  /** Cost for short-form content or interviews */
  shortFormContentCost?: number | string;
  /** Additional information about branded content services */
  brandedContentAdditionalInfo?: string;
}

export interface AdditionalServices {
  /** Whether the outlet offers OTT (Over-the-Top) marketing */
  offersOttMarketing?: boolean;
  /** Whether the outlet offers virtual webinar services */
  offersVirtualWebinars?: boolean;
  /** Whether the outlet produces other types of videos */
  producesOtherVideos?: boolean;
  /** Details about video production capabilities */
  videoProductionDetails?: string;
  /** Any additional services or information */
  customData?: string;
}

export interface SurveyResponses {
  /** Boolean and string response indicators from legacy systems */
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
  /** Open-ended text responses */
  openEndedResponses?: {
    openEndedResponse1?: string;
    openEndedResponse2?: string;
    generalResponse?: string;
  };
  /** Conditional follow-up responses */
  conditionalResponses?: {
    ifYes1Explanation?: string;
    ifYes2Explanation?: string;
  };
  /** Additional parsed data or context */
  parsedExtra?: string;
}

export type ApplicationStatus = 'new' | 'reviewing' | 'approved' | 'rejected' | 'follow_up_needed';

export interface ApplicationInfo {
  /** Current status of the application */
  status?: ApplicationStatus;
  /** Admin notes about the review */
  reviewNotes?: string;
  /** Email of the admin who reviewed the submission */
  reviewedBy?: string;
  /** Timestamp when the review was completed */
  reviewedAt?: Date;
}

export interface SurveySubmission {
  /** MongoDB ObjectId as string */
  _id?: string;
  /** Automatically generated metadata about the survey submission */
  metadata: SurveyMetadata;
  /** Contact details for the media outlet representative */
  contactInformation: ContactInformation;
  /** Website and digital advertising information */
  websiteAdvertising?: WebsiteAdvertising;
  /** Print publication advertising information */
  printAdvertising?: PrintAdvertising;
  /** Newsletter advertising information */
  newsletterAdvertising?: NewsletterAdvertising;
  /** Radio, podcast, and video advertising information */
  radioPodcastAdvertising?: RadioPodcastAdvertising;
  /** Social media presence and advertising options */
  socialMedia?: SocialMedia;
  /** Event hosting and marketing information */
  eventMarketing?: EventMarketing;
  /** Branded content and sponsored content services */
  brandedContent?: BrandedContent;
  /** Additional marketing and production services */
  additionalServices?: AdditionalServices;
  /** Legacy survey response data for migration purposes */
  surveyResponses?: SurveyResponses;
  /** Admin application status and review information */
  application?: ApplicationInfo;
  /** Timestamp when the survey was submitted */
  createdAt: Date;
  /** Timestamp when the survey was last updated */
  updatedAt: Date;
}

/**
 * Survey submission data for insertion (without auto-generated fields)
 */
export interface SurveySubmissionInsert extends Omit<SurveySubmission, '_id' | 'createdAt' | 'updatedAt'> {}

/**
 * Survey submission data for updates (all fields optional except ID)
 */
export interface SurveySubmissionUpdate extends Partial<Omit<SurveySubmission, '_id'>> {
  updatedAt: Date;
}

/**
 * Survey statistics returned by the stats API
 */
export interface SurveyStats {
  /** Total number of survey submissions */
  total: number;
  /** Count of submissions by status */
  byStatus: Record<ApplicationStatus, number>;
  /** Number of submissions in the last 7 days */
  recentCount: number;
}

/**
 * Type guard to check if a submission has website advertising
 */
export function hasWebsiteAdvertising(submission: SurveySubmission): boolean {
  return submission.websiteAdvertising?.hasWebsiteAdvertising === true;
}

/**
 * Type guard to check if a submission has print advertising
 */
export function hasPrintAdvertising(submission: SurveySubmission): boolean {
  return submission.printAdvertising?.hasPrintProduct === true;
}

/**
 * Type guard to check if a submission has newsletter advertising
 */
export function hasNewsletterAdvertising(submission: SurveySubmission): boolean {
  return submission.newsletterAdvertising?.hasNewsletter === true;
}

/**
 * Type guard to check if a submission has radio or podcast advertising
 */
export function hasAudioAdvertising(submission: SurveySubmission): boolean {
  return submission.radioPodcastAdvertising?.hasRadioStation === true || 
         submission.radioPodcastAdvertising?.hasPodcast === true;
}

/**
 * Type guard to check if a submission has event marketing
 */
export function hasEventMarketing(submission: SurveySubmission): boolean {
  return submission.eventMarketing?.hostsEvents === true;
}

/**
 * Type guard to check if a submission has branded content services
 */
export function hasBrandedContent(submission: SurveySubmission): boolean {
  return submission.brandedContent?.offersBrandedContent === true;
}

/**
 * Helper function to get the primary contact name
 */
export function getContactName(contact: ContactInformation): string {
  if (contact.fullName) return contact.fullName;
  if (contact.firstName && contact.lastName) return `${contact.firstName} ${contact.lastName}`;
  if (contact.firstName) return contact.firstName;
  if (contact.lastName) return contact.lastName;
  return 'Unknown';
}

/**
 * Helper function to get the primary contact email
 */
export function getContactEmail(contact: ContactInformation): string {
  return contact.email || contact.emailAddress || 'No email provided';
}

/**
 * Helper function to format currency values
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return value.toString();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}

/**
 * Helper function to format numbers with commas
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return value.toString();
  return new Intl.NumberFormat('en-US').format(numValue);
}

