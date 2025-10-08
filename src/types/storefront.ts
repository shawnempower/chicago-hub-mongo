// TypeScript interfaces for Storefront Configuration Schema

export interface StorefrontMeta {
  configVersion: string;
  description: string;
  lastUpdated: string;
  publisher_id: string;
  is_draft: boolean;
}

export interface StorefrontColors {
  lightPrimary: string;
  darkPrimary: string;
  gradStart: string;
  gradEnd: string;
  angle: number;
  mode: 'light' | 'dark';
  ctaTextColor: string;
}

export interface StorefrontTypography {
  primaryFont: string;
  fontWeights: string;
}

export interface StorefrontLayout {
  radius: number;
  iconWeight: 'light' | 'regular' | 'bold';
}

export interface SectionSettings {
  mode: 'light' | 'dark';
  accentOverride: string | null;
}

export interface StorefrontTheme {
  colors: StorefrontColors;
  typography: StorefrontTypography;
  layout: StorefrontLayout;
  sectionSettings: {
    navbar: SectionSettings;
    hero: SectionSettings;
    audience: SectionSettings;
    testimonials: SectionSettings;
    inventory: SectionSettings;
    campaign: SectionSettings;
    contactfaq: SectionSettings;
    aboutus: SectionSettings;
    footer: SectionSettings;
  };
}

// Component Content Interfaces
export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface NavbarContent {
  logoUrl: string;
  navItems: NavItem[];
  ctaText: string;
  ctaHref: string;
}

export interface HeroStat {
  key: string;
  value: string;
}

export interface HeroContent {
  tag: string;
  title: string;
  description: string;
  ctaText: string;
  imageUrl: string;
  stats: HeroStat[];
}

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
  ageDemographics: AgeDemographic[];
  statHighlights: StatHighlight[];
}

export interface Testimonial {
  id: string;
  name: string;
  company: string;
  quote: string;
  imageUrl?: string;
}

export interface TestimonialsContent {
  title: string;
  subtitle: string;
  testimonials: Testimonial[];
}

export interface ChannelStat {
  key: string;
  value: string;
}

export interface InventoryChannel {
  id: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
  stats: ChannelStat[];
}

export interface InventoryContent {
  title: string;
  subtitle: string;
  channels: InventoryChannel[];
}

export interface CampaignFeature {
  title: string;
  description: string;
  icon: string;
}

export interface PlanningCard {
  title: string;
  features: string[];
  ctaText: string;
}

export interface CampaignContent {
  title: string;
  description: string;
  planningCard: PlanningCard;
  features: CampaignFeature[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FormLabels {
  name: string;
  email: string;
  company: string;
  interest: string;
  message: string;
  submit: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address?: string;
}

export interface ContactFaqContent {
  title: string;
  description: string;
  faqTitle: string;
  formLabels: FormLabels;
  faqItems: FaqItem[];
  contactInfo: ContactInfo;
}

export interface AboutUsContent {
  title: string;
  paragraphs: string[];
  imageUrl: string;
}

export interface SocialLinks {
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
}

export interface FooterContent {
  companyName: string;
  description: string;
  contactInfo: ContactInfo;
  socialLinks: SocialLinks;
  navItems: NavItem[];
}

// Component Interfaces
export interface StorefrontComponent<T = any> {
  enabled: boolean;
  order: number;
  content: T;
}

export interface StorefrontComponents {
  navbar: StorefrontComponent<NavbarContent>;
  hero: StorefrontComponent<HeroContent>;
  audience: StorefrontComponent<AudienceContent>;
  testimonials: StorefrontComponent<TestimonialsContent>;
  inventory: StorefrontComponent<InventoryContent>;
  campaign: StorefrontComponent<CampaignContent>;
  contactfaq: StorefrontComponent<ContactFaqContent>;
  aboutus: StorefrontComponent<AboutUsContent>;
  footer: StorefrontComponent<FooterContent>;
}

// SEO and Analytics
export interface StorefrontSeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
}

export interface StorefrontAnalytics {
  googleAnalyticsId: string;
  facebookPixelId: string;
}

// Main Storefront Configuration Interface
export interface StorefrontConfiguration {
  _id?: string;
  meta: StorefrontMeta;
  theme: StorefrontTheme;
  components: StorefrontComponents;
  seoMetadata: StorefrontSeoMetadata;
  analytics: StorefrontAnalytics;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StorefrontConfigurationInsert extends Omit<StorefrontConfiguration, '_id' | 'createdAt' | 'updatedAt'> {}
export interface StorefrontConfigurationUpdate extends Partial<StorefrontConfigurationInsert> {
  updatedAt: Date;
}

// Helper types for component editing
export type ComponentType = keyof StorefrontComponents;

export interface ComponentEditProps<T = any> {
  component: StorefrontComponent<T>;
  onChange: (component: StorefrontComponent<T>) => void;
  theme: StorefrontTheme;
}

// Validation helpers
export const validateStorefrontConfig = (config: StorefrontConfiguration): string[] => {
  const errors: string[] = [];
  
  if (!config.meta.publisher_id) {
    errors.push('Publisher ID is required');
  }
  
  if (!config.theme.colors.lightPrimary) {
    errors.push('Primary color is required');
  }
  
  if (!config.components.navbar.content.logoUrl) {
    errors.push('Navbar logo URL is required');
  }
  
  if (!config.components.hero.content.title) {
    errors.push('Hero title is required');
  }
  
  return errors;
};

// Default storefront configuration template
export const createDefaultStorefrontConfig = (publisherId: string): StorefrontConfigurationInsert => ({
  meta: {
    configVersion: "1.0.0",
    description: `Complete website configuration for ${publisherId} Storefront Components`,
    lastUpdated: new Date().toISOString(),
    publisher_id: publisherId,
    is_draft: true
  },
  theme: {
    colors: {
      lightPrimary: "#0077b6",
      darkPrimary: "#003d5c",
      gradStart: "#0077b6",
      gradEnd: "#003d5c",
      angle: 135,
      mode: "light",
      ctaTextColor: "white"
    },
    typography: {
      primaryFont: "Inter",
      fontWeights: "400;500;600;700"
    },
    layout: {
      radius: 8,
      iconWeight: "bold"
    },
    sectionSettings: {
      navbar: { mode: "light", accentOverride: null },
      hero: { mode: "light", accentOverride: null },
      audience: { mode: "light", accentOverride: null },
      testimonials: { mode: "dark", accentOverride: null },
      inventory: { mode: "light", accentOverride: null },
      campaign: { mode: "dark", accentOverride: null },
      contactfaq: { mode: "light", accentOverride: null },
      aboutus: { mode: "dark", accentOverride: null },
      footer: { mode: "dark", accentOverride: null }
    }
  },
  components: {
    navbar: {
      enabled: true,
      order: 1,
      content: {
        logoUrl: "/assets/logo.png",
        navItems: [
          { id: "home", label: "Home", href: "#hero" },
          { id: "advertising", label: "Advertising Solutions", href: "#inventory" },
          { id: "audience", label: "Audience", href: "#audience" },
          { id: "contact", label: "Contact", href: "#contactfaq" }
        ],
        ctaText: "Get Started",
        ctaHref: "#contactfaq"
      }
    },
    hero: {
      enabled: true,
      order: 2,
      content: {
        tag: "TRUSTED LOCAL MEDIA",
        title: "Reach Your Target Audience",
        description: "Connect with engaged consumers through trusted local media channels.",
        ctaText: "Explore Solutions",
        imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop",
        stats: [
          { key: "10,000+", value: "Monthly Readers" },
          { key: "5 Years", value: "Trusted Voice" },
          { key: "Local", value: "Community Focus" }
        ]
      }
    },
    audience: {
      enabled: true,
      order: 3,
      content: {
        title: "Your Next Customers",
        description: "Reach engaged local consumers who trust our content and recommendations.",
        ageDemographics: [
          { label: "Age 18-24", percentage: 15 },
          { label: "Age 25-34", percentage: 25 },
          { label: "Age 35-44", percentage: 25 },
          { label: "Age 45-54", percentage: 20 },
          { label: "Age 55+", percentage: 15 }
        ],
        statHighlights: [
          { key: "42 Years", value: "Median Age" },
          { key: "Local", value: "Community Focus" },
          { key: "Engaged", value: "Audience" }
        ]
      }
    },
    testimonials: {
      enabled: false,
      order: 4,
      content: {
        title: "What Our Advertisers Say",
        subtitle: "Success stories from local businesses",
        testimonials: []
      }
    },
    inventory: {
      enabled: true,
      order: 5,
      content: {
        title: "Multi-Channel Solutions",
        subtitle: "Connect with your audience across multiple touchpoints",
        channels: [
          {
            id: "digital",
            label: "Digital",
            title: "Digital Advertising",
            description: "Reach your audience online with targeted display advertising and sponsored content.",
            imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "10K+", value: "Monthly visitors" },
              { key: "Targeted", value: "Display ads" },
              { key: "Native", value: "Content integration" }
            ]
          },
          {
            id: "print",
            label: "Print",
            title: "Print Advertising",
            description: "Traditional print advertising in our trusted publication.",
            imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "5,000", value: "Print circulation" },
              { key: "Direct", value: "Distribution" },
              { key: "Trusted", value: "Brand placement" }
            ]
          }
        ]
      }
    },
    campaign: {
      enabled: true,
      order: 6,
      content: {
        title: "Three Steps to Success",
        description: "Most campaigns launch within 3 business days • Dedicated support • Flexible packages",
        planningCard: {
          title: "Get Your Custom Proposal",
          features: [
            "CONNECT - Share your goals and target audience",
            "CUSTOMIZE - We'll create a media plan tailored to your budget", 
            "CONVERT - Launch your campaign and track results"
          ],
          ctaText: "Get Your Custom Proposal"
        },
        features: [
          {
            title: "Trusted Voice",
            description: "Local community's go-to source",
            icon: "award"
          },
          {
            title: "Engaged Audience",
            description: "Direct access to local consumers",
            icon: "users"
          },
          {
            title: "Multi-Channel Reach",
            description: "Digital, print, and social",
            icon: "broadcast"
          },
          {
            title: "Local Expertise",
            description: "Deep community understanding",
            icon: "heart"
          }
        ]
      }
    },
    contactfaq: {
      enabled: true,
      order: 7,
      content: {
        title: "Ready to Get Started?",
        description: "Let's discuss how we can help you reach your target audience. We'll respond within 24 hours.",
        faqTitle: "Frequently Asked Questions",
        formLabels: {
          name: "Full Name",
          email: "Email Address",
          company: "Company Name",
          interest: "Budget Range",
          message: "Campaign Goals & Timeline",
          submit: "Send My Information"
        },
        faqItems: [
          {
            id: "1",
            question: "What types of businesses do you work with?",
            answer: "We work with all types of local businesses looking to reach engaged community members."
          },
          {
            id: "2",
            question: "How quickly can my campaign launch?",
            answer: "Most campaigns can launch within 3-5 business days after approval."
          }
        ],
        contactInfo: {
          phone: "(555) 123-4567",
          email: "advertising@example.com"
        }
      }
    },
    aboutus: {
      enabled: true,
      order: 8,
      content: {
        title: "Why Local Businesses Choose Us",
        paragraphs: [
          "For years, we've been the trusted voice of our local community, providing reliable news and information that residents depend on.",
          "Our deep community connections and understanding of local market dynamics make us the ideal partner for businesses looking to reach engaged local consumers.",
          "We offer authentic, proven access to your target market through embedded community journalism and local expertise that larger media companies simply cannot match."
        ],
        imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2000&auto=format&fit=crop"
      }
    },
    footer: {
      enabled: true,
      order: 9,
      content: {
        companyName: "Local Media",
        description: "Your trusted local media partner, connecting businesses with engaged community members through authentic, local content.",
        contactInfo: {
          phone: "(555) 123-4567",
          email: "advertising@example.com",
          address: "123 Main St, City, State"
        },
        socialLinks: {
          linkedin: null,
          twitter: null,
          facebook: null,
          instagram: null
        },
        navItems: [
          { id: "home", label: "Home", href: "#hero" },
          { id: "about", label: "About Us", href: "#aboutus" },
          { id: "audience", label: "Audience", href: "#audience" },
          { id: "advertising", label: "Advertising Solutions", href: "#inventory" },
          { id: "contact", label: "Contact", href: "#contactfaq" }
        ]
      }
    }
  },
  seoMetadata: {
    title: "Local Advertising Solutions | Trusted Community Media",
    description: "Reach engaged local consumers through trusted community media. Digital, print, and social advertising solutions.",
    keywords: [
      "local advertising",
      "community media",
      "local marketing",
      "advertising solutions"
    ],
    ogImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1200&auto=format&fit=crop",
    ogTitle: "Advertise with Your Trusted Local Media Partner",
    ogDescription: "Connect with engaged local consumers through authentic community media."
  },
  analytics: {
    googleAnalyticsId: "GA_MEASUREMENT_ID",
    facebookPixelId: "FB_PIXEL_ID"
  }
});
