/**
 * Seed Starter Hub Packages
 * 
 * This script creates the initial 3 starter packages for Chicago Hub:
 * 1. Chicago Essentials Bundle - Broad citywide coverage
 * 2. South Side Amplifier - Geographic focus
 * 3. Digital Domination - Channel-focused digital only
 * 
 * Run with: npx tsx scripts/seed-starter-packages.ts
 */

import 'dotenv/config';

import { connectToDatabase } from '../src/integrations/mongodb/client';
import { hubPackagesService } from '../src/integrations/mongodb/hubPackageService';
import { STARTER_PACKAGES } from '../src/data/starterPackages';

// STARTER_PACKAGES is now imported from '../src/data/starterPackages'
// Keeping this file for the seedStarterPackages() function

/*
const STARTER_PACKAGES_OLD: HubPackageInsert[] = [
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
        interests: ['community', 'local-news', 'civic-engagement', 'culture']
      },
      businessTarget: {
        industries: ['retail', 'restaurants', 'professional-services', 'healthcare'],
        businessStage: ['established', 'expanding'],
        businessSize: ['small', 'medium']
      }
    },
    components: {
      publications: [
        {
          publicationId: 4005,
          publicationName: 'True Star Media',
          inventoryItems: [
            {
              channel: 'website',
              itemPath: 'distributionChannels.website.advertisingOpportunities[0]',
              itemName: 'Large Display Ad - 300x600',
              quantity: 4,
              frequency: 'weekly',
              duration: '1 month',
              specifications: {
                size: '300x600',
                placement: 'sidebar',
                format: 'JPG/PNG/GIF'
              },
              itemPricing: {
                standardPrice: 375,
                hubPrice: 244,
                pricingModel: 'per_week'
              }
            }
          ],
          publicationTotal: 976,
          monthlyImpressions: 25000,
          monthlyReach: 15000
        },
        {
          publicationId: 5002,
          publicationName: 'Chicago Public Square',
          inventoryItems: [
            {
              channel: 'website',
              itemPath: 'distributionChannels.website.advertisingOpportunities[0]',
              itemName: 'Website Display Ad',
              quantity: 4,
              frequency: 'weekly',
              duration: '1 month',
              specifications: {
                size: '600px responsive',
                placement: 'integrated with content',
                format: 'responsive display'
              },
              itemPricing: {
                standardPrice: 480,
                hubPrice: 480,
                pricingModel: 'per_week'
              }
            }
          ],
          publicationTotal: 1920,
          monthlyImpressions: 100000,
          monthlyReach: 75000
        },
        {
          publicationId: 5003,
          publicationName: 'Chicago News Weekly (CNW)',
          inventoryItems: [
            {
              channel: 'website',
              itemPath: 'distributionChannels.website.advertisingOpportunities[0]',
              itemName: 'Monthly Banner Ad',
              quantity: 1,
              frequency: 'monthly',
              duration: '1 month',
              specifications: {
                size: '300x250',
                placement: 'various',
                format: 'standard web formats'
              },
              itemPricing: {
                standardPrice: 3000,
                hubPrice: 3000,
                pricingModel: 'flat'
              }
            }
          ],
          publicationTotal: 3000,
          monthlyImpressions: 85000,
          monthlyReach: 50000
        },
        {
          publicationId: 5005,
          publicationName: 'WVON 1690 AM',
          inventoryItems: [
            {
              channel: 'website',
              itemPath: 'distributionChannels.website.advertisingOpportunities[0]',
              itemName: 'Banner Ad Package 1',
              quantity: 1,
              frequency: 'monthly',
              duration: '3 weeks',
              specifications: {
                size: '300x300, 728x90',
                format: 'JPG, PNG, GIF, HTML5',
                fileSize: '150KB maximum'
              },
              itemPricing: {
                standardPrice: 2500,
                hubPrice: 1750,
                pricingModel: 'flat'
              }
            }
          ],
          publicationTotal: 1750,
          monthlyImpressions: 125000,
          monthlyReach: 80000
        }
      ]
    },
    pricing: {
      currency: 'USD',
      breakdown: {
        totalStandardPrice: 11546,
        totalHubPrice: 10346,
        packageDiscount: 20,
        finalPrice: 8277
      },
      tiers: [
        {
          tierName: '1-Month Trial',
          commitmentLength: '1 month',
          price: 8277,
          savingsPercentage: 28,
          savingsAmount: 3269
        },
        {
          tierName: '3-Month Campaign',
          commitmentLength: '3 months',
          price: 7449,
          savingsPercentage: 35,
          savingsAmount: 4097,
          bonuses: ['Free monthly performance report', 'Campaign optimization consultation']
        },
        {
          tierName: '6-Month Partnership',
          commitmentLength: '6 months',
          price: 6622,
          savingsPercentage: 43,
          savingsAmount: 4924,
          bonuses: [
            'Free creative refresh at month 3',
            'Monthly strategy calls',
            'Social media content pack'
          ]
        }
      ],
      displayPrice: 'Starting at $8,277/month',
      priceRange: '5-15k'
    },
    performance: {
      estimatedReach: {
        minReach: 220000,
        maxReach: 283000,
        reachDescription: '220,000-283,000 unique Chicagoans per month',
        deduplicatedReach: 175000
      },
      estimatedImpressions: {
        minImpressions: 418000,
        maxImpressions: 520000,
        impressionsByChannel: {
          website: 370000,
          newsletter: 40000,
          social: 8000
        }
      },
      geographicCoverage: {
        coveragePercentage: 75,
        neighborhoodsCovered: 8,
        populationReached: 2100000
      },
      demographicBreakdown: {
        ageGroups: {
          '25-34': 25,
          '35-44': 30,
          '45-54': 25,
          '55-65': 20
        },
        incomeGroups: {
          '35k-50k': 20,
          '50k-75k': 35,
          '75k-100k': 25,
          '100k+': 20
        }
      },
      expectedCTR: 0.8,
      expectedClicks: 3344,
      costPerClick: 2.47,
      costPerThousand: 19.80
    },
    features: {
      keyBenefits: [
        'Reach across 8 trusted Chicago media outlets',
        'Citywide coverage including underserved communities',
        'Mix of digital and social channels',
        '28% savings vs. buying individually',
        'Unified campaign management'
      ],
      includedServices: [
        'Package setup and coordination',
        'Basic performance tracking dashboard',
        'Monthly campaign report',
        'Email support'
      ],
      addOns: [
        {
          name: 'Premium Creative Services',
          description: 'Professional ad design and copy across all formats',
          price: 1500
        },
        {
          name: 'Enhanced Analytics',
          description: 'Weekly reporting with conversion tracking',
          price: 500
        },
        {
          name: 'Social Media Amplification',
          description: 'Add 4 additional social posts across publications',
          price: 800
        }
      ]
    },
    campaignDetails: {
      minimumCommitment: '1 month',
      maximumCommitment: '12 months',
      leadTime: '10 business days',
      materialDeadline: '7 business days before campaign start',
      cancellationPolicy: '30-day notice required for ongoing campaigns',
      modificationPolicy: 'Creative changes allowed once per month at no charge'
    },
    creativeRequirements: {
      assetsNeeded: [
        {
          assetType: 'Display Ad - Medium Rectangle',
          specifications: '300x250 or 300x300 pixels, JPG/PNG/GIF, max 150KB',
          quantity: 4,
          dueDate: '7 days before start'
        },
        {
          assetType: 'Display Ad - Leaderboard',
          specifications: '728x90 pixels, JPG/PNG/GIF, max 150KB',
          quantity: 2,
          dueDate: '7 days before start'
        },
        {
          assetType: 'Display Ad - Large Rectangle',
          specifications: '300x600 pixels, JPG/PNG/GIF, max 150KB',
          quantity: 1,
          dueDate: '7 days before start'
        },
        {
          assetType: 'Business Logo',
          specifications: 'High-res PNG with transparent background',
          quantity: 1,
          dueDate: '7 days before start'
        }
      ],
      creativeServices: {
        available: true,
        description: 'Professional design team can create all assets',
        additionalCost: 1500
      }
    },
    useCases: {
      idealFor: [
        'Small to mid-size businesses expanding in Chicago',
        'Restaurants and retail with multiple locations',
        'Professional services (healthcare, legal, financial)',
        'Community organizations and nonprofits',
        'Real estate developers and agents',
        'Event promotions'
      ],
      successStories: [
        {
          businessType: 'Family Restaurant Chain',
          challenge: 'Opening 3rd location on South Side',
          result: 'Generated 850 reservations in first month, 23% came from True Star & CNW ads',
          metrics: '850 conversions, $9.75 cost per acquisition'
        }
      ],
      notRecommendedFor: [
        'E-commerce only businesses with no Chicago presence',
        'Businesses targeting only luxury/high-income audiences',
        'Campaigns needing immediate (< 2 week) results'
      ]
    },
    availability: {
      isActive: true,
      isFeatured: true,
      inventoryStatus: 'available',
      spotsRemaining: 12
    },
    marketing: {
      tags: ['citywide', 'value', 'turnkey', 'multi-channel', 'local-business', 'best-seller'],
      displayOrder: 1,
      highlightColor: '#0066CC'
    },
    metadata: {
      createdBy: 'system',
      approvalStatus: 'approved',
      version: 1
    }
  },

  // PACKAGE 2: South Side Amplifier
  {
    packageId: 'south-side-amplifier',
    basicInfo: {
      name: 'South Side Amplifier',
      tagline: 'Dominate Chicago\'s South Side across 6 community voices',
      description: 'From Bronzeville to Hyde Park, Chatham to Englewood—reach South Side residents through their trusted neighborhood media. This package provides deep penetration in specific South Side communities with a mix of print and digital advertising for maximum local impact.',
      category: 'geographic',
      subcategory: 'south-side'
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
          'Bronzeville', 'Hyde Park', 'Chatham', 'Englewood',
          'South Shore', 'Kenwood', 'Washington Park', 'Roseland'
        ],
        coverageDescription: 'Comprehensive South Side coverage across 8 key neighborhoods'
      },
      demographicTarget: {
        ageRanges: ['25-34', '35-44', '45-54', '55-65'],
        interests: ['community', 'local-news', 'culture', 'education']
      }
    },
    components: {
      publications: [
        {
          publicationId: 4005,
          publicationName: 'True Star Media',
          inventoryItems: [
            {
              channel: 'website',
              itemPath: 'distributionChannels.website.advertisingOpportunities[0]',
              itemName: 'Large Display Ad - 300x600',
              quantity: 4,
              frequency: 'weekly',
              itemPricing: {
                standardPrice: 375,
                hubPrice: 244,
                pricingModel: 'per_week'
              }
            }
          ],
          publicationTotal: 976,
          monthlyImpressions: 25000,
          monthlyReach: 15000
        },
        {
          publicationId: 5003,
          publicationName: 'Chicago News Weekly (CNW)',
          inventoryItems: [
            {
              channel: 'website',
              itemName: 'Monthly Banner',
              quantity: 1,
              itemPricing: {
                standardPrice: 3000,
                hubPrice: 3000,
                pricingModel: 'flat'
              }
            }
          ],
          publicationTotal: 3000,
          monthlyImpressions: 85000,
          monthlyReach: 50000
        }
      ]
    },
    pricing: {
      currency: 'USD',
      breakdown: {
        totalStandardPrice: 11250,
        totalHubPrice: 9676,
        packageDiscount: 25,
        finalPrice: 7257
      },
      tiers: [
        {
          tierName: '1-Month Focus',
          commitmentLength: '1 month',
          price: 7257,
          savingsPercentage: 35
        },
        {
          tierName: '3-Month Deep Dive',
          commitmentLength: '3 months',
          price: 6531,
          savingsPercentage: 42,
          bonuses: ['Community event sponsorship opportunity']
        }
      ],
      displayPrice: 'Starting at $7,257/month',
      priceRange: '5-15k'
    },
    performance: {
      estimatedReach: {
        minReach: 85000,
        maxReach: 120000,
        reachDescription: '85,000-120,000 South Side residents',
        deduplicatedReach: 75000
      },
      estimatedImpressions: {
        minImpressions: 245000,
        maxImpressions: 310000,
        impressionsByChannel: {
          website: 175000,
          print: 50000,
          newsletter: 20000
        }
      },
      geographicCoverage: {
        coveragePercentage: 82,
        neighborhoodsCovered: 8,
        populationReached: 450000
      },
      expectedCTR: 1.2,
      expectedClicks: 2940,
      costPerClick: 2.47,
      costPerThousand: 29.58
    },
    features: {
      keyBenefits: [
        'Deep South Side penetration across 6 publications',
        'Mix of digital and print for maximum trust',
        'Includes Black-owned and Latino media',
        '82% coverage of South Side population',
        '25% bundle savings'
      ],
      includedServices: [
        'Package coordination',
        'Performance tracking',
        'Monthly report'
      ]
    },
    campaignDetails: {
      minimumCommitment: '1 month',
      leadTime: '10 business days',
      materialDeadline: '7 business days before start',
      cancellationPolicy: '30-day notice required'
    },
    creativeRequirements: {
      assetsNeeded: [
        {
          assetType: 'Display Ads',
          specifications: 'Standard web banner sizes',
          quantity: 3,
          dueDate: '7 days before start'
        }
      ],
      creativeServices: {
        available: true,
        additionalCost: 1200
      }
    },
    useCases: {
      idealFor: [
        'South Side businesses and services',
        'Healthcare clinics and community centers',
        'Real estate focusing on South Side',
        'Restaurants and retail in these neighborhoods',
        'Community events and initiatives'
      ]
    },
    availability: {
      isActive: true,
      isFeatured: true,
      inventoryStatus: 'available'
    },
    marketing: {
      tags: ['south-side', 'geographic', 'community-focused', 'local'],
      displayOrder: 2,
      highlightColor: '#DC2626'
    },
    metadata: {
      createdBy: 'system',
      approvalStatus: 'approved',
      version: 1
    }
  },

  // PACKAGE 3: Digital Domination
  {
    packageId: 'digital-domination',
    basicInfo: {
      name: 'Digital Domination',
      tagline: 'Your banner on 10 Chicago news websites for 30 days',
      description: 'Pure digital play. Same ad creative runs across 10 local news sites simultaneously. Simple, effective, affordable. Best cost-per-click and fastest setup of all our packages.',
      category: 'channel-focused',
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
        coverageDescription: 'Citywide digital coverage'
      },
      demographicTarget: {
        ageRanges: ['18-24', '25-34', '35-44', '45-54'],
        interests: ['news', 'current-events', 'local-information']
      }
    },
    components: {
      publications: []  // Will be populated with 10 publications
    },
    pricing: {
      currency: 'USD',
      breakdown: {
        totalStandardPrice: 14250,
        totalHubPrice: 12546,
        packageDiscount: 30,
        finalPrice: 8782
      },
      displayPrice: '$8,782/month',
      priceRange: '5-15k'
    },
    performance: {
      estimatedReach: {
        minReach: 425000,
        maxReach: 550000,
        reachDescription: '425,000-550,000 online Chicago residents',
        deduplicatedReach: 325000
      },
      estimatedImpressions: {
        minImpressions: 595000,
        maxImpressions: 750000
      },
      expectedCTR: 0.75,
      expectedClicks: 4463,
      costPerClick: 1.97,
      costPerThousand: 14.76
    },
    features: {
      keyBenefits: [
        'Simplest package—one ad creative, 10 websites',
        'Best cost per click ($1.97 CPC)',
        'Fastest setup (5 business days)',
        '325,000 unique reach across Chicago',
        '30% bundle savings'
      ],
      includedServices: [
        'Campaign setup',
        'Performance dashboard',
        'Monthly report'
      ]
    },
    campaignDetails: {
      minimumCommitment: '1 month',
      leadTime: '5 business days',
      materialDeadline: '5 days before start',
      cancellationPolicy: '30-day notice'
    },
    creativeRequirements: {
      assetsNeeded: [
        {
          assetType: 'Universal Display Ad',
          specifications: '300x250 pixels (will be adapted to other sizes automatically)',
          quantity: 1,
          dueDate: '5 days before start'
        }
      ],
      creativeServices: {
        available: true,
        additionalCost: 800
      }
    },
    useCases: {
      idealFor: [
        'Brand awareness campaigns',
        'Time-sensitive promotions',
        'Businesses new to Chicago media',
        'E-commerce with Chicago focus',
        'Event ticket sales'
      ]
    },
    availability: {
      isActive: true,
      isFeatured: false,
      inventoryStatus: 'available'
    },
    marketing: {
      tags: ['digital', 'efficient', 'fast-setup', 'best-cpc', 'brand-awareness'],
      displayOrder: 3,
      highlightColor: '#7C3AED'
    },
    metadata: {
      createdBy: 'system',
      approvalStatus: 'approved',
      version: 1
    }
  }
];
*/

async function seedStarterPackages() {
  console.log('🌱 Seeding starter hub packages...\n');

  try {
    await connectToDatabase();
    console.log('✅ Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;

    for (const packageData of STARTER_PACKAGES) {
      try {
        // Check if package already exists
        const existing = await hubPackagesService.getByPackageId(packageData.packageId);
        
        if (existing) {
          console.log(`⏭️  Skipping "${packageData.basicInfo.name}" - already exists`);
          skipped++;
          continue;
        }

        // Create package
        await hubPackagesService.create(packageData, 'system-seed');
        console.log(`✅ Created "${packageData.basicInfo.name}"`);
        console.log(`   Price: ${packageData.pricing.displayPrice}`);
        console.log(`   Reach: ${packageData.performance.estimatedReach.reachDescription}`);
        console.log(`   Publications: ${packageData.components.publications.length}\n`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating "${packageData.basicInfo.name}":`, error);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${STARTER_PACKAGES.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
    process.exit(1);
  }
}

export { seedStarterPackages };

// Run if called directly
seedStarterPackages();

