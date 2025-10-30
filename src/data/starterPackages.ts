/**
 * Starter Package Data
 * 
 * This file contains the 3 starter packages for Chicago Hub.
 * Separated from the seed script so it can be easily imported by the server.
 */

import { HubPackageInsert } from '../integrations/mongodb/hubPackageSchema';

export const STARTER_PACKAGES: HubPackageInsert[] = [
  // PACKAGE 1: Chicago Essentials Bundle
  {
    packageId: 'chicago-essentials-bundle',
    basicInfo: {
      name: 'Chicago Essentials Bundle',
      tagline: 'Reach 200,000+ Chicagoans across 8 trusted local media outlets',
      description: 'Perfect for local businesses wanting broad exposure without breaking the bank. Your message appears on websites, newsletters, and social media across Chicago\'s most trusted independent publications. This package delivers maximum reach at an affordable price point, combining digital, print, and social channels for comprehensive coverage.',
      category: 'geographic',
      subcategory: 'citywide'
    },
    hubInfo: {
      hubId: 'chicago-hub',
      hubName: 'Chicago Hub',
      isHubExclusive: true
    },
    targeting: {
      geographicTarget: {
        dmas: ['chicago-il'],
        neighborhoods: [
          'South Side', 'North Side', 'Loop', 'Near North',
          'West Side', 'Hyde Park', 'Bronzeville', 'Pilsen'
        ],
        coverageDescription: 'Citywide coverage across all major Chicago neighborhoods'
      },
      demographicTarget: {
        ageRanges: ['25-34', '35-44', '45-54', '55-65'],
        incomeRanges: ['$35,000-$50,000', '$50,000-$75,000', '$75,000-$100,000', '$100,000+'],
        interests: ['local-news', 'community-events', 'dining', 'culture', 'politics']
      },
      businessTarget: {
        industries: ['retail', 'food-beverage', 'professional-services', 'healthcare', 'education'],
        businessSizes: ['small', 'medium', 'large'],
        objectives: ['brand-awareness', 'lead-generation', 'community-engagement']
      }
    },
    components: {
      publications: [
        {
          publicationId: 'south-side-weekly',
          publicationName: 'South Side Weekly',
          inventoryItems: [
            { inventoryId: 'ssw-website-banner', channel: 'website', itemType: 'banner-ad', placement: 'Homepage Banner' },
            { inventoryId: 'ssw-newsletter-header', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Header' }
          ]
        },
        {
          publicationId: 'chicago-reader',
          publicationName: 'Chicago Reader',
          inventoryItems: [
            { inventoryId: 'cr-website-leaderboard', channel: 'website', itemType: 'leaderboard', placement: 'Site-wide Leaderboard' },
            { inventoryId: 'cr-newsletter-mid', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Mid-section' }
          ]
        },
        {
          publicationId: 'block-club-chicago',
          publicationName: 'Block Club Chicago',
          inventoryItems: [
            { inventoryId: 'bcc-website-sidebar', channel: 'website', itemType: 'sidebar-ad', placement: 'Homepage Sidebar' },
            { inventoryId: 'bcc-newsletter-sponsored', channel: 'newsletter', itemType: 'sponsored-content', placement: 'Sponsored Section' }
          ]
        },
        {
          publicationId: 'wbez',
          publicationName: 'WBEZ',
          inventoryItems: [
            { inventoryId: 'wbez-website-mrec', channel: 'website', itemType: 'medium-rectangle', placement: 'Article MREC' },
            { inventoryId: 'wbez-newsletter-footer', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Footer' }
          ]
        },
        {
          publicationId: 'wcpt-820',
          publicationName: 'WCPT 820',
          inventoryItems: [
            { inventoryId: 'wcpt-website-banner', channel: 'website', itemType: 'banner-ad', placement: 'Homepage Banner' },
            { inventoryId: 'wcpt-newsletter-header', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Header' }
          ]
        },
        {
          publicationId: 'chicago-defender',
          publicationName: 'Chicago Defender',
          inventoryItems: [
            { inventoryId: 'cd-website-leaderboard', channel: 'website', itemType: 'leaderboard', placement: 'Site-wide Leaderboard' },
            { inventoryId: 'cd-newsletter-mid', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Mid-section' }
          ]
        },
        {
          publicationId: 'austin-weekly',
          publicationName: 'Austin Weekly',
          inventoryItems: [
            { inventoryId: 'aw-website-sidebar', channel: 'website', itemType: 'sidebar-ad', placement: 'Homepage Sidebar' },
            { inventoryId: 'aw-newsletter-header', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Header' }
          ]
        },
        {
          publicationId: 'lawndale-news',
          publicationName: 'Lawndale News',
          inventoryItems: [
            { inventoryId: 'ln-website-banner', channel: 'website', itemType: 'banner-ad', placement: 'Homepage Banner' },
            { inventoryId: 'ln-newsletter-footer', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Footer' }
          ]
        }
      ],
      totalPublications: 8,
      channels: ['website', 'newsletter'],
      inventorySummary: '16 premium placements across 8 publications'
    },
    pricing: {
      breakdown: {
        basePrice: 11500,
        hubDiscount: 3223,
        finalPrice: 8277,
        discountPercentage: 28,
        currency: 'USD',
        billingCycle: 'monthly'
      },
      tiers: [
        { duration: '1 month', pricePerMonth: 8277, totalPrice: 8277, savings: 0 },
        { duration: '3 months', pricePerMonth: 7865, totalPrice: 23595, savings: 1236 },
        { duration: '6 months', pricePerMonth: 7449, totalPrice: 44694, savings: 4968 }
      ],
      paymentOptions: ['credit-card', 'invoice', 'ach']
    },
    performance: {
      estimatedReach: 175000,
      estimatedImpressions: 525000,
      estimatedCTR: 2.1,
      estimatedCPC: 1.58,
      estimatedCPM: 19.8
    },
    features: {
      highlights: [
        'Maximum citywide reach',
        'Multi-channel exposure (web + email)',
        'Premium placements across all outlets',
        'Dedicated account manager',
        '28% hub discount'
      ],
      includes: [
        'Professional ad design assistance',
        'Monthly performance reports',
        'A/B testing support',
        'Audience analytics',
        'Campaign optimization'
      ]
    },
    campaignDetails: {
      duration: { minimum: 1, recommended: 3, unit: 'months' },
      timeline: { setupTime: '3-5 business days', launchDate: 'flexible', bookingDeadline: '5 business days before launch' }
    },
    creativeRequirements: {
      formats: ['jpg', 'png', 'gif'],
      specs: [
        { name: 'Leaderboard', dimensions: '728x90', fileSize: '150KB' },
        { name: 'Medium Rectangle', dimensions: '300x250', fileSize: '150KB' },
        { name: 'Banner', dimensions: '320x50', fileSize: '100KB' },
        { name: 'Newsletter Header', dimensions: '600x200', fileSize: '200KB' }
      ],
      designSupport: 'Full design services included for first campaign'
    },
    useCases: {
      idealFor: [
        'Local businesses launching new products/services',
        'Community organizations seeking citywide awareness',
        'Restaurants and retailers expanding to multiple neighborhoods',
        'Service providers wanting comprehensive market penetration'
      ],
      examples: [
        'Restaurant chain announcing new location openings',
        'Community health initiative promoting vaccination',
        'Local bank advertising new checking account offers',
        'Arts festival seeking citywide attendance'
      ]
    },
    availability: {
      isActive: true,
      isFeatured: true,
      availableSlots: 3,
      nextAvailableDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    marketing: {
      displayOrder: 1,
      badge: 'Most Popular',
      testimonial: {
        quote: 'We saw a 340% increase in foot traffic after running this package. The reach across Chicago was incredible.',
        author: 'Maria Rodriguez',
        company: 'Rodriguez Family Bakery',
        role: 'Owner'
      },
      tags: ['citywide', 'value', 'turnkey', 'most-popular']
    }
  },

  // PACKAGE 2: South Side Amplifier
  {
    packageId: 'south-side-amplifier',
    basicInfo: {
      name: 'South Side Amplifier',
      tagline: 'Laser-focused reach to 75,000+ South Side residents',
      description: 'Hyper-targeted package for businesses and organizations focused on Chicago\'s South Side communities. Combines the most trusted South Side publications for authentic community engagement. Perfect for businesses with South Side locations or causes deeply connected to these neighborhoods.',
      category: 'geographic',
      subcategory: 'regional'
    },
    hubInfo: {
      hubId: 'chicago-hub',
      hubName: 'Chicago Hub',
      isHubExclusive: true
    },
    targeting: {
      geographicTarget: {
        dmas: ['chicago-il'],
        neighborhoods: [
          'Bronzeville', 'Hyde Park', 'South Shore', 'Englewood',
          'Chatham', 'Woodlawn', 'Greater Grand Crossing', 'Washington Park'
        ],
        coverageDescription: 'Comprehensive South Side coverage'
      },
      demographicTarget: {
        ageRanges: ['25-34', '35-44', '45-54', '55-65'],
        incomeRanges: ['$25,000-$50,000', '$50,000-$75,000', '$75,000+'],
        interests: ['community-news', 'local-business', 'culture', 'education', 'social-justice']
      },
      businessTarget: {
        industries: ['retail', 'food-beverage', 'healthcare', 'education', 'community-services'],
        businessSizes: ['small', 'medium'],
        objectives: ['community-engagement', 'local-awareness', 'foot-traffic']
      }
    },
    components: {
      publications: [
        {
          publicationId: 'south-side-weekly',
          publicationName: 'South Side Weekly',
          inventoryItems: [
            { inventoryId: 'ssw-website-banner', channel: 'website', itemType: 'banner-ad', placement: 'Homepage Banner' },
            { inventoryId: 'ssw-newsletter-header', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Header' },
            { inventoryId: 'ssw-website-sponsored', channel: 'website', itemType: 'sponsored-content', placement: 'Featured Article' }
          ]
        },
        {
          publicationId: 'chicago-defender',
          publicationName: 'Chicago Defender',
          inventoryItems: [
            { inventoryId: 'cd-website-leaderboard', channel: 'website', itemType: 'leaderboard', placement: 'Site-wide Leaderboard' },
            { inventoryId: 'cd-newsletter-mid', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Mid-section' }
          ]
        },
        {
          publicationId: 'austin-weekly',
          publicationName: 'Austin Weekly',
          inventoryItems: [
            { inventoryId: 'aw-website-sidebar', channel: 'website', itemType: 'sidebar-ad', placement: 'Homepage Sidebar' },
            { inventoryId: 'aw-newsletter-header', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Header' }
          ]
        },
        {
          publicationId: 'lawndale-news',
          publicationName: 'Lawndale News',
          inventoryItems: [
            { inventoryId: 'ln-website-banner', channel: 'website', itemType: 'banner-ad', placement: 'Homepage Banner' },
            { inventoryId: 'ln-newsletter-footer', channel: 'newsletter', itemType: 'email-ad', placement: 'Newsletter Footer' }
          ]
        }
      ],
      totalPublications: 4,
      channels: ['website', 'newsletter'],
      inventorySummary: '9 premium placements across 4 South Side publications'
    },
    pricing: {
      breakdown: {
        basePrice: 5500,
        hubDiscount: 1675,
        finalPrice: 3825,
        discountPercentage: 30,
        currency: 'USD',
        billingCycle: 'monthly'
      },
      tiers: [
        { duration: '1 month', pricePerMonth: 3825, totalPrice: 3825, savings: 0 },
        { duration: '3 months', pricePerMonth: 3634, totalPrice: 10902, savings: 573 },
        { duration: '6 months', pricePerMonth: 3442, totalPrice: 20652, savings: 2298 }
      ],
      paymentOptions: ['credit-card', 'invoice', 'ach']
    },
    performance: {
      estimatedReach: 75000,
      estimatedImpressions: 225000,
      estimatedCTR: 2.5,
      estimatedCPC: 1.42,
      estimatedCPM: 17.0
    },
    features: {
      highlights: [
        'Hyper-local South Side focus',
        'Authentic community voices',
        'Premium placements in trusted publications',
        '30% hub discount',
        'Community-oriented reporting'
      ],
      includes: [
        'Dedicated South Side account manager',
        'Community event promotion',
        'Monthly performance reports',
        'Creative design assistance',
        'Flexible scheduling'
      ]
    },
    campaignDetails: {
      duration: { minimum: 1, recommended: 3, unit: 'months' },
      timeline: { setupTime: '3-5 business days', launchDate: 'flexible', bookingDeadline: '5 business days before launch' }
    },
    creativeRequirements: {
      formats: ['jpg', 'png', 'gif'],
      specs: [
        { name: 'Leaderboard', dimensions: '728x90', fileSize: '150KB' },
        { name: 'Banner', dimensions: '320x50', fileSize: '100KB' },
        { name: 'Newsletter Header', dimensions: '600x200', fileSize: '200KB' }
      ],
      designSupport: 'Full design services with cultural sensitivity consulting'
    },
    useCases: {
      idealFor: [
        'South Side businesses and restaurants',
        'Community health organizations',
        'Local service providers',
        'Cultural events and festivals',
        'Education initiatives'
      ],
      examples: [
        'Hyde Park restaurant promoting new menu',
        'Bronzeville health clinic advertising services',
        'Community center announcing programs',
        'South Shore cultural festival seeking attendance'
      ]
    },
    availability: {
      isActive: true,
      isFeatured: false,
      availableSlots: 5,
      nextAvailableDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    marketing: {
      displayOrder: 2,
      badge: 'Community Focused',
      testimonial: {
        quote: 'This package helped us connect authentically with our community. We saw amazing results.',
        author: 'James Washington',
        company: 'Washington Healthcare',
        role: 'Marketing Director'
      },
      tags: ['south-side', 'community', 'local', 'authentic']
    }
  },

  // PACKAGE 3: Digital Domination
  {
    packageId: 'digital-domination',
    basicInfo: {
      name: 'Digital Domination',
      tagline: 'Premium digital-only reach across Chicago\'s top 5 online news outlets',
      description: 'For brands that live online. This digital-first package focuses exclusively on premium website placements across Chicago\'s most-visited news sites. Perfect for tech companies, online services, and brands targeting digitally-native audiences. No print, no radio—just powerful digital reach where your audience spends their time.',
      category: 'channel',
      subcategory: 'digital-only'
    },
    hubInfo: {
      hubId: 'chicago-hub',
      hubName: 'Chicago Hub',
      isHubExclusive: true
    },
    targeting: {
      geographicTarget: {
        dmas: ['chicago-il'],
        neighborhoods: ['Citywide digital audience'],
        coverageDescription: 'Chicago digital news consumers across all neighborhoods'
      },
      demographicTarget: {
        ageRanges: ['25-34', '35-44', '45-54'],
        incomeRanges: ['$50,000-$75,000', '$75,000-$100,000', '$100,000+'],
        interests: ['news', 'technology', 'culture', 'business', 'politics']
      },
      businessTarget: {
        industries: ['technology', 'saas', 'e-commerce', 'digital-services', 'fintech'],
        businessSizes: ['small', 'medium', 'large'],
        objectives: ['brand-awareness', 'lead-generation', 'website-traffic']
      }
    },
    components: {
      publications: [
        {
          publicationId: 'block-club-chicago',
          publicationName: 'Block Club Chicago',
          inventoryItems: [
            { inventoryId: 'bcc-website-leaderboard-premium', channel: 'website', itemType: 'leaderboard', placement: 'Premium Site-wide Leaderboard' },
            { inventoryId: 'bcc-website-sidebar-premium', channel: 'website', itemType: 'sidebar-ad', placement: 'Premium Sidebar' }
          ]
        },
        {
          publicationId: 'wbez',
          publicationName: 'WBEZ',
          inventoryItems: [
            { inventoryId: 'wbez-website-homepage-takeover', channel: 'website', itemType: 'homepage-takeover', placement: 'Homepage Takeover' },
            { inventoryId: 'wbez-website-mrec-premium', channel: 'website', itemType: 'medium-rectangle', placement: 'Premium Article MREC' }
          ]
        },
        {
          publicationId: 'chicago-reader',
          publicationName: 'Chicago Reader',
          inventoryItems: [
            { inventoryId: 'cr-website-leaderboard-premium', channel: 'website', itemType: 'leaderboard', placement: 'Premium Leaderboard' },
            { inventoryId: 'cr-website-interstitial', channel: 'website', itemType: 'interstitial', placement: 'Mobile Interstitial' }
          ]
        },
        {
          publicationId: 'south-side-weekly',
          publicationName: 'South Side Weekly',
          inventoryItems: [
            { inventoryId: 'ssw-website-sponsored-premium', channel: 'website', itemType: 'sponsored-content', placement: 'Premium Sponsored Article' },
            { inventoryId: 'ssw-website-native', channel: 'website', itemType: 'native-ad', placement: 'Native Content Feed' }
          ]
        },
        {
          publicationId: 'chicago-defender',
          publicationName: 'Chicago Defender',
          inventoryItems: [
            { inventoryId: 'cd-website-leaderboard-premium', channel: 'website', itemType: 'leaderboard', placement: 'Premium Leaderboard' },
            { inventoryId: 'cd-website-video-pre-roll', channel: 'website', itemType: 'video-ad', placement: 'Video Pre-roll' }
          ]
        }
      ],
      totalPublications: 5,
      channels: ['website'],
      inventorySummary: '10 premium digital placements across 5 top publications'
    },
    pricing: {
      breakdown: {
        basePrice: 8500,
        hubDiscount: 2550,
        finalPrice: 5950,
        discountPercentage: 30,
        currency: 'USD',
        billingCycle: 'monthly'
      },
      tiers: [
        { duration: '1 month', pricePerMonth: 5950, totalPrice: 5950, savings: 0 },
        { duration: '3 months', pricePerMonth: 5653, totalPrice: 16959, savings: 891 },
        { duration: '6 months', pricePerMonth: 5355, totalPrice: 32130, savings: 3570 }
      ],
      paymentOptions: ['credit-card', 'invoice']
    },
    performance: {
      estimatedReach: 150000,
      estimatedImpressions: 600000,
      estimatedCTR: 2.8,
      estimatedCPC: 0.99,
      estimatedCPM: 9.92
    },
    features: {
      highlights: [
        'Digital-only premium placements',
        'High-visibility formats (takeovers, interstitials)',
        'Native and sponsored content',
        'Video pre-roll opportunities',
        '30% hub discount'
      ],
      includes: [
        'Advanced audience targeting',
        'Real-time campaign dashboard',
        'Conversion tracking',
        'A/B creative testing',
        'Retargeting pixels',
        'Monthly optimization calls'
      ]
    },
    campaignDetails: {
      duration: { minimum: 1, recommended: 3, unit: 'months' },
      timeline: { setupTime: '5-7 business days', launchDate: 'flexible', bookingDeadline: '7 business days before launch' }
    },
    creativeRequirements: {
      formats: ['jpg', 'png', 'gif', 'mp4', 'html5'],
      specs: [
        { name: 'Leaderboard', dimensions: '728x90', fileSize: '150KB' },
        { name: 'Medium Rectangle', dimensions: '300x250', fileSize: '150KB' },
        { name: 'Homepage Takeover', dimensions: '1920x1080', fileSize: '300KB' },
        { name: 'Mobile Interstitial', dimensions: '320x480', fileSize: '200KB' },
        { name: 'Video Pre-roll', dimensions: '1920x1080', fileSize: '50MB', duration: '15-30 seconds' }
      ],
      designSupport: 'HTML5 animation and video production available'
    },
    useCases: {
      idealFor: [
        'SaaS and tech companies',
        'E-commerce brands',
        'Digital services and apps',
        'Online education platforms',
        'Fintech and financial services'
      ],
      examples: [
        'Tech startup launching new app',
        'E-commerce site promoting seasonal sale',
        'Online education platform recruiting students',
        'Digital bank advertising no-fee checking'
      ]
    },
    availability: {
      isActive: true,
      isFeatured: false,
      availableSlots: 4,
      nextAvailableDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    marketing: {
      displayOrder: 3,
      badge: 'Digital First',
      testimonial: {
        quote: 'Perfect for our digital-first brand. We saw a 215% ROI in the first month.',
        author: 'Sarah Chen',
        company: 'ChicagoTech Solutions',
        role: 'CMO'
      },
      tags: ['digital', 'premium', 'high-impact', 'tech-focused']
    }
  }
];

