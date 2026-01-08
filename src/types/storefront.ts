// TypeScript interfaces for Storefront Configuration Schema

export interface StorefrontMeta {
  configVersion: string;
  description?: string;
  lastUpdated?: string;
  publisherId: string;
  isDraft: boolean;
  faviconUrl?: string;
  logoUrl?: string;
}

export interface StorefrontColors {
  lightPrimary: string;
  darkPrimary: string;
  gradStart?: string;
  gradEnd?: string;
  angle?: number;
  mode: 'light' | 'dark' | 'auto';
  ctaTextColor?: string;
}

export interface StorefrontTypography {
  primaryFont: string;
  fontWeights: string;
}

export interface StorefrontLayout {
  radius?: number;
  iconWeight?: 'light' | 'regular' | 'bold' | 'fill';
}

export interface SectionSettings {
  mode?: 'light' | 'dark' | 'auto';
  accentOverride?: string | null;
}

export interface StorefrontTheme {
  colors: StorefrontColors;
  typography: StorefrontTypography;
  layout?: StorefrontLayout;
  sectionSettings?: Record<string, SectionSettings>;
}

// Navigation interfaces
export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface NavbarContent {
  logoUrl?: string;
  navItems: NavItem[];
  ctaText?: string;
  ctaHref?: string;
}

export interface NavbarComponent {
  enabled: boolean;
  order: number;
  content: NavbarContent;
}

// Hero interfaces
export interface HeroStat {
  key: string;
  value: string;
}

export interface HeroContent {
  tag?: string;
  title: string;
  description: string;
  ctaText?: string;
  imageUrl?: string;
  stats?: HeroStat[];
}

export interface HeroComponent {
  enabled: boolean;
  order: number;
  content: HeroContent;
}

// Audience interfaces
export interface AgeDemographic {
  label: string;
  percentage: number;
}

export interface StatHighlight {
  key: string;
  value: string;
}

export interface AudienceContent {
  title: string;
  description: string;
  ageDemographics?: AgeDemographic[];
  statHighlights?: StatHighlight[];
}

export interface AudienceComponent {
  enabled: boolean;
  order: number;
  content: AudienceContent;
}

// Testimonials interfaces
export interface Testimonial {
  quote: string;
  attribution: string;
}

export interface TestimonialsContent {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
}

export interface TestimonialsComponent {
  enabled: boolean;
  order: number;
  content: TestimonialsContent;
}

// Inventory interfaces
export interface ChannelStat {
  key: string;
  value: string;
}

export interface Channel {
  id: string;
  label: string;
  title: string;
  description: string;
  imageUrl?: string;
  stats?: ChannelStat[];
}

export interface InventoryContent {
  title: string;
  subtitle?: string;
  channels: Channel[];
}

export interface InventoryComponent {
  enabled: boolean;
  order: number;
  content: InventoryContent;
}

// Inventory Pricing interfaces
export interface PricingColumn {
  id: string;
  label: string;
}

export interface PricingRow {
  adFormat: string;
  specs?: string;
  prices: Record<string, string>;
}

export interface PricingTab {
  id: string;
  label: string;
  icon?: 'globe' | 'envelope' | 'mail' | 'calendar' | 'users';
  columns: PricingColumn[];
  rows: PricingRow[];
}

export interface InventoryPricingContent {
  title: string;
  subtitle?: string;
  tabs: PricingTab[];
  footnotes?: string[];
}

export interface InventoryPricingComponent {
  enabled: boolean;
  order: number;
  content: InventoryPricingContent;
}

// Campaign interfaces
export interface PlanningCard {
  title?: string;
  features?: string[];
  ctaText?: string;
}

export interface CampaignFeature {
  title: string;
  description: string;
  icon: string;
}

export interface CampaignContent {
  title: string;
  description: string;
  planningCard?: PlanningCard;
  features?: CampaignFeature[];
}

export interface CampaignComponent {
  enabled: boolean;
  order: number;
  content: CampaignContent;
}

// Contact/FAQ interfaces
export interface FormLabels {
  name?: string;
  email?: string;
  company?: string;
  interest?: string;
  message?: string;
  submit?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface ContactInfo {
  phone?: string | null;
  email?: string;
}

export interface ContactFAQContent {
  title: string;
  description: string;
  faqTitle?: string;
  formLabels: FormLabels;
  faqItems: FAQItem[];
  contactInfo?: ContactInfo;
}

export interface ContactFAQComponent {
  enabled: boolean;
  order: number;
  content: ContactFAQContent;
}

// About Us interfaces
export interface AboutUsContent {
  title: string;
  paragraphs: string[];
  imageUrl?: string;
}

export interface AboutUsComponent {
  enabled: boolean;
  order: number;
  content: AboutUsContent;
}

// Footer interfaces
export interface FooterContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface SocialLinks {
  linkedin?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  instagram?: string | null;
}

export interface FooterContent {
  companyName: string;
  description?: string;
  contactInfo?: FooterContactInfo;
  socialLinks?: SocialLinks;
  navItems?: NavItem[];
}

export interface FooterComponent {
  enabled: boolean;
  order: number;
  content: FooterContent;
}

// Component type union
export type ComponentType = 'navbar' | 'hero' | 'audience' | 'testimonials' | 'inventory' | 'inventorypricing' | 'campaign' | 'contactfaq' | 'aboutus' | 'footer';

// Components collection
export interface StorefrontComponents {
  navbar?: NavbarComponent;
  hero?: HeroComponent;
  audience?: AudienceComponent;
  testimonials?: TestimonialsComponent;
  inventory?: InventoryComponent;
  inventorypricing?: InventoryPricingComponent;
  campaign?: CampaignComponent;
  contactfaq?: ContactFAQComponent;
  aboutus?: AboutUsComponent;
  footer?: FooterComponent;
}

// SEO and Analytics
export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export interface Analytics {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

// Chat Widget Configuration
export interface ChatWidget {
  enabled: boolean;
  apiEndpoint?: string;
  buttonPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultOpen?: boolean;
  title?: string;
  subtitle?: string;
  initialMessage?: string;
}

// Main configuration interface
export interface StorefrontConfiguration {
  _id?: string;
  publicationId?: string;
  websiteUrl?: string; // Root level website URL (required for preview/publishing)
  meta: StorefrontMeta;
  theme: StorefrontTheme;
  components: StorefrontComponents;
  seoMetadata?: SEOMetadata;
  analytics?: Analytics;
  chatWidget?: ChatWidget; // Chat widget configuration for the storefront
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type StorefrontConfigurationInsert = Omit<StorefrontConfiguration, '_id' | 'createdAt' | 'updatedAt'>;

// Enhanced validation function
export const validateStorefrontConfig = (config: unknown): string[] => {
  const errors: string[] = [];
  
  // Check if config is an object
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be a valid object');
    return errors;
  }

  // Type assertion after basic checks
  const configObj = config as Record<string, unknown>;
  
  // Validate required top-level fields
  if (!configObj.meta) {
    errors.push('Meta configuration is required');
  } else {
    const meta = configObj.meta as Record<string, unknown>;
    if (!meta.configVersion) errors.push('meta.configVersion is required');
    if (!meta.publisherId) errors.push('meta.publisherId is required');
    if (typeof meta.isDraft !== 'boolean') errors.push('meta.isDraft must be a boolean');
    
    // Validate optional fields if present
    if (meta.configVersion && typeof meta.configVersion === 'string' && !/^\d+\.\d+\.\d+$/.test(meta.configVersion)) {
      errors.push('meta.configVersion must follow semantic versioning (e.g., "1.0.0")');
    }
  }
  
  // Validate websiteUrl at root level
  if (configObj.websiteUrl && typeof configObj.websiteUrl !== 'string') {
    errors.push('websiteUrl must be a string');
  }
  
  if (!configObj.theme) {
    errors.push('Theme configuration is required');
  } else {
    const theme = configObj.theme as Record<string, unknown>;
    if (!theme.colors) {
      errors.push('theme.colors is required');
    } else {
      const colors = theme.colors as Record<string, unknown>;
      if (!colors.lightPrimary) errors.push('theme.colors.lightPrimary is required');
      if (!colors.darkPrimary) errors.push('theme.colors.darkPrimary is required');
      if (!colors.mode) errors.push('theme.colors.mode is required');
      
      // Validate color format
      const colorPattern = /^#[0-9a-fA-F]{6}$/;
      if (colors.lightPrimary && typeof colors.lightPrimary === 'string' && !colorPattern.test(colors.lightPrimary)) {
        errors.push('theme.colors.lightPrimary must be a valid hex color (e.g., #0077b6)');
      }
      if (colors.darkPrimary && typeof colors.darkPrimary === 'string' && !colorPattern.test(colors.darkPrimary)) {
        errors.push('theme.colors.darkPrimary must be a valid hex color (e.g., #003d5c)');
      }
      
      // Validate mode
      if (colors.mode && typeof colors.mode === 'string' && !['light', 'dark', 'auto'].includes(colors.mode)) {
        errors.push('theme.colors.mode must be "light", "dark", or "auto"');
      }
    }
    
    if (!theme.typography) {
      errors.push('theme.typography is required');
    } else {
      const typography = theme.typography as Record<string, unknown>;
      if (!typography.primaryFont) errors.push('theme.typography.primaryFont is required');
    }
  }
  
  if (!configObj.components) {
    errors.push('Components configuration is required (can be empty object)');
  } else if (typeof configObj.components !== 'object') {
    errors.push('Components must be an object');
  } else {
    // Validate component structure if components exist
    const components = configObj.components as Record<string, unknown>;
    const validComponents = ['navbar', 'hero', 'audience', 'testimonials', 'inventory', 'inventorypricing', 'campaign', 'contactfaq', 'aboutus', 'footer'];
    Object.keys(components).forEach(componentKey => {
      if (!validComponents.includes(componentKey)) {
        errors.push(`Unknown component: ${componentKey}`);
      } else {
        const component = components[componentKey];
        if (typeof component !== 'object' || component === null) {
          errors.push(`Component ${componentKey} must be an object`);
        } else {
          const comp = component as Record<string, unknown>;
          if (typeof comp.enabled !== 'boolean') {
            errors.push(`Component ${componentKey}.enabled must be a boolean`);
          }
          if (typeof comp.order !== 'number' || comp.order < 1) {
            errors.push(`Component ${componentKey}.order must be a positive number`);
          }
          if (!comp.content || typeof comp.content !== 'object') {
            errors.push(`Component ${componentKey}.content is required and must be an object`);
          }
        }
      }
    });
  }
  
  return errors;
};

// Minimal default configuration creator (no hardcoded content)
export const createDefaultStorefrontConfig = (publisherId: string): StorefrontConfigurationInsert => ({
  meta: {
    configVersion: "1.0.0",
    description: `Storefront configuration for ${publisherId}`,
    lastUpdated: new Date().toISOString(),
    publisherId: publisherId,
    isDraft: true
  },
  theme: {
    colors: {
      lightPrimary: "#0077b6",
      darkPrimary: "#003d5c",
      mode: "light" as const
    },
    typography: {
      primaryFont: "Inter"
    }
  },
  components: {}
});