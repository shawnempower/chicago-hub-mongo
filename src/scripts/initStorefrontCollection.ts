import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS, INDEXES } from '../integrations/mongodb/schemas';
import { StorefrontConfigurationInsert } from '../types/storefront';

// La Raza Chicago storefront configuration
const laRazaStorefrontConfig: StorefrontConfigurationInsert = {
  publicationId: "la_raza_chicago_001", // This should match an existing publication
  meta: {
    configVersion: "1.0.0",
    description: "Complete website configuration for La Raza Chicago Storefront Components",
    lastUpdated: "2025-01-01T00:00:00Z",
    publisher_id: "la_raza_chicago",
    is_draft: false
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
      primaryFont: "Roboto",
      fontWeights: "400;500;700;900"
    },
    layout: {
      radius: 8,
      iconWeight: "bold"
    },
    sectionSettings: {
      navbar: {
        mode: "light",
        accentOverride: null
      },
      hero: {
        mode: "light",
        accentOverride: null
      },
      audience: {
        mode: "light",
        accentOverride: null
      },
      testimonials: {
        mode: "dark",
        accentOverride: null
      },
      inventory: {
        mode: "light",
        accentOverride: null
      },
      campaign: {
        mode: "dark",
        accentOverride: null
      },
      contactfaq: {
        mode: "light",
        accentOverride: null
      },
      aboutus: {
        mode: "dark",
        accentOverride: null
      },
      footer: {
        mode: "dark",
        accentOverride: null
      }
    }
  },
  components: {
    navbar: {
      enabled: true,
      order: 1,
      content: {
        logoUrl: "/assets/laraza-logo.png",
        navItems: [
          { id: "home", label: "Home", href: "#hero" },
          { id: "advertising", label: "Advertising Solutions", href: "#inventory" },
          { id: "audience", label: "Audience", href: "#audience" },
          { id: "faq", label: "FAQ", href: "#contactfaq" },
          { id: "contact", label: "Contact", href: "#contactfaq" }
        ],
        ctaText: "Get Your Media Kit",
        ctaHref: "#contactfaq"
      }
    },
    hero: {
      enabled: true,
      order: 2,
      content: {
        tag: "SERVING CHICAGO HISPANICS SINCE 1970",
        title: "Reach 186,000 Engaged Hispanic Consumers Every Week",
        description: "Connect with Chicago's fastest-growing market through the city's most trusted Spanish-language media institution — where 802,000 Hispanic residents turn for news, culture, and community connection.",
        ctaText: "Explore Advertising Solutions",
        imageUrl: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?q=80&w=2000&auto=format&fit=crop",
        stats: [
          { key: "186,000", value: "Weekly Readers" },
          { key: "54 Years", value: "Trusted Community Voice" },
          { key: "29.6%", value: "Chicago's Hispanic Population" },
          { key: "$100B+", value: "Latino GDP in Illinois" }
        ]
      }
    },
    audience: {
      enabled: true,
      order: 3,
      content: {
        title: "Your Next Customers: Chicago's Hispanic Market",
        description: "Tap into the economic power of Chicago's Hispanic community — young, growing, and representing over $100 billion in Latino GDP across Illinois. Hispanic consumers are brand loyal, family-focused, and prefer culturally authentic messaging.",
        ageDemographics: [
          { label: "Age 18-24", percentage: 18 },
          { label: "Age 25-34", percentage: 25 },
          { label: "Age 35-44", percentage: 22 },
          { label: "Age 45-54", percentage: 20 },
          { label: "Age 55+", percentage: 15 }
        ],
        statHighlights: [
          { key: "32.4 Years", value: "Median Age" },
          { key: "75%+", value: "Spanish Speakers" },
          { key: "$1.9T", value: "National Buying Power" },
          { key: "Fastest", value: "Growing Market Segment" },
          { key: "802,000", value: "Chicago Hispanic Residents" },
          { key: "Brand Loyal", value: "Consumer Behavior" }
        ]
      }
    },
    testimonials: {
      enabled: false,
      order: 4,
      content: {
        title: "What Our Advertisers Say",
        subtitle: "Success stories from businesses reaching Chicago's Hispanic market",
        testimonials: []
      }
    },
    inventory: {
      enabled: true,
      order: 5,
      content: {
        title: "Multi-Channel Solutions for Maximum Impact",
        subtitle: "Connect with Chicago's Hispanic community across our trusted media channels, each offering unique ways to engage 186,000 weekly readers.",
        channels: [
          {
            id: "print",
            label: "Print",
            title: "Print Advertising",
            description: "Direct home delivery ensures your message reaches Hispanic households through our 153,620 weekly circulation across Chicago's Hispanic neighborhoods.",
            imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "153,620", value: "Weekly circulation" },
              { key: "186,000", value: "Weekly readership" },
              { key: "Direct", value: "Home delivery" }
            ]
          },
          {
            id: "digital",
            label: "LaRaza.com",
            title: "Digital Advertising",
            description: "Engage readers on LaRaza.com with targeted display and native content as part of the ImpreMedia network reaching 35 million monthly users.",
            imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "35M", value: "Monthly ImpreMedia reach" },
              { key: "Targeted", value: "Display advertising" },
              { key: "Native", value: "Content integration" }
            ]
          },
          {
            id: "newsletter",
            label: "Email",
            title: "Email Newsletter",
            description: "Land directly in engaged subscribers' inboxes with premium placement and 19-point increase in open rates for Hispanic-focused content.",
            imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "+19 Points", value: "Open rate increase" },
              { key: "Premium", value: "Inbox placement" },
              { key: "Engaged", value: "Subscriber base" }
            ]
          },
          {
            id: "social",
            label: "Social Media",
            title: "Social Media Campaigns",
            description: "Join authentic conversations where community recommendations happen across active Hispanic social media communities on all major platforms.",
            imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "Active", value: "Communities" },
              { key: "All Platforms", value: "Social presence" },
              { key: "Authentic", value: "Community conversations" }
            ]
          },
          {
            id: "events",
            label: "Events",
            title: "Event Sponsorships",
            description: "Create memorable face-to-face connections with your ideal customers through virtual and in-person community events throughout Chicago.",
            imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop",
            stats: [
              { key: "Year-Round", value: "Event calendar" },
              { key: "Virtual + In-Person", value: "Event formats" },
              { key: "Community", value: "Focused events" }
            ]
          }
        ]
      }
    },
    campaign: {
      enabled: true,
      order: 6,
      content: {
        title: "Three Steps to Chicago Hispanic Market Success",
        description: "Most campaigns launch within 5 business days • Dedicated Spanish-language support • Flexible packages for every budget",
        planningCard: {
          title: "Get Your Custom Proposal",
          features: [
            "CONNECT - Share your goals and target Hispanic segments",
            "CUSTOMIZE - We'll create a Spanish-language media plan tailored to your budget",
            "CONVERT - Launch your campaign and track engagement with Chicago's Hispanic community"
          ],
          ctaText: "Get Your Custom Proposal"
        },
        features: [
          {
            title: "54 Years of Trust",
            description: "Chicago's #1 Spanish-language publication",
            icon: "award"
          },
          {
            title: "186,000 Weekly Readers",
            description: "Direct access to engaged Hispanic consumers",
            icon: "users"
          },
          {
            title: "Multi-Channel Reach",
            description: "Print, digital, social, and events",
            icon: "broadcast"
          },
          {
            title: "Cultural Authenticity",
            description: "Deep understanding of Hispanic market",
            icon: "heart"
          }
        ]
      }
    },
    contactfaq: {
      enabled: true,
      order: 7,
      content: {
        title: "Ready to Reach Chicago's Hispanic Market?",
        description: "Let's discuss how La Raza can connect you with 186,000 engaged consumers. We'll respond within 24 business hours.",
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
            question: "What types of businesses advertise with La Raza?",
            answer: "We work with diverse advertisers including retail, restaurants, healthcare, financial services, automotive, and government agencies — anyone seeking to connect authentically with Chicago's Hispanic community."
          },
          {
            id: "2",
            question: "Do you offer Spanish translation services?",
            answer: "Yes, our team can translate your advertising content and ensure cultural relevance for maximum impact with Hispanic consumers."
          },
          {
            id: "3",
            question: "How quickly can my campaign launch?",
            answer: "Digital campaigns can launch within 3 business days. Print advertising requires 5 business days. Rush options are available."
          },
          {
            id: "4",
            question: "Can I advertise in specific Chicago neighborhoods?",
            answer: "Absolutely. We can target distribution to specific areas like Little Village, Brighton Park, Belmont Cragin, and other Hispanic neighborhoods."
          },
          {
            id: "5",
            question: "What makes La Raza different from other advertising options?",
            answer: "As Chicago's #1 Spanish-language publication for 54 years, we offer unmatched community trust, direct home distribution, and deep cultural understanding that general market media can't match."
          }
        ],
        contactInfo: {
          phone: "(773) 273-2900",
          email: "advertising@laraza.com"
        }
      }
    },
    aboutus: {
      enabled: true,
      order: 8,
      content: {
        title: "Why Chicago Businesses Choose La Raza",
        paragraphs: [
          "For 54 years, La Raza has been Chicago's most trusted Spanish-language publication, serving as the authentic voice of the Hispanic community. We've earned recognition as the award-winning journalism leader (NAHP Best Spanish Weekly) while maintaining deep roots in neighborhoods like Little Village, Brighton Park, and Belmont Cragin.",
          "As part of the ImpreMedia network reaching 35 million monthly users, La Raza combines local community trust with national media capabilities. Our direct home distribution ensures your message reaches Hispanic households where other media cannot.",
          "While Hispanic consumers represent nearly 30% of Chicago and 20% of the U.S. population, they receive only 6% of advertising investment. La Raza offers authentic, proven access to this high-value, underserved market through embedded community journalism and cultural understanding that general market media simply cannot match."
        ],
        imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2000&auto=format&fit=crop"
      }
    },
    footer: {
      enabled: true,
      order: 9,
      content: {
        companyName: "La Raza Chicago",
        description: "Chicago's #1 Spanish-language publication for 54 years. Connecting businesses with 186,000 engaged Hispanic consumers through trusted, authentic media channels.",
        contactInfo: {
          phone: "(773) 273-2900",
          email: "advertising@laraza.com",
          address: "6001 N Clark St, Chicago, IL"
        },
        socialLinks: {
          linkedin: "https://linkedin.com/company/laraza-chicago",
          twitter: null,
          facebook: "https://facebook.com/larazachicago",
          instagram: "https://instagram.com/larazachicago"
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
    title: "Chicago Hispanic Advertising | La Raza Spanish Marketing Solutions",
    description: "Reach 186,000 Hispanic consumers in Chicago with La Raza's trusted Spanish-language advertising. Print, digital, and social solutions. 54 years serving Chicago.",
    keywords: [
      "Chicago Hispanic advertising",
      "Spanish language marketing Chicago",
      "Latino advertising Chicago",
      "Chicago Spanish newspaper advertising",
      "Hispanic marketing Illinois",
      "Little Village advertising",
      "Brighton Park marketing",
      "Chicago Latino consumers",
      "Spanish media Chicago",
      "Hispanic newspaper Chicago"
    ],
    ogImage: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?q=80&w=1200&auto=format&fit=crop",
    ogTitle: "Advertise with Chicago's Most Trusted Hispanic Media - La Raza",
    ogDescription: "Connect with 186,000 engaged Hispanic consumers through Chicago's #1 Spanish-language publication for 54 years."
  },
  analytics: {
    googleAnalyticsId: "GA_MEASUREMENT_ID",
    facebookPixelId: "FB_PIXEL_ID"
  }
};

async function initStorefrontCollection() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    // Create the storefront_configurations collection if it doesn't exist
    const collectionName = COLLECTIONS.STOREFRONT_CONFIGURATIONS;
    console.log(`🔄 Initializing ${collectionName} collection...`);

    const collection = db.collection(collectionName);

    // Create indexes for storefront_configurations
    const indexes = INDEXES.storefront_configurations;
    console.log(`🔄 Creating indexes for ${collectionName}...`);
    
    for (const indexSpec of indexes) {
      try {
        // Check if publicationId should be unique
        const isUnique = 'publicationId' in indexSpec;
        const options = isUnique ? { unique: true } : {};
        
        await collection.createIndex(indexSpec, options);
        console.log(`✅ Created index for ${collectionName}:`, indexSpec);
      } catch (error: any) {
        // Ignore error if index already exists
        if (error.code !== 85) {
          console.warn(`⚠️  Warning creating index for ${collectionName}:`, error.message);
        } else {
          console.log(`✅ Index already exists for ${collectionName}:`, indexSpec);
        }
      }
    }

    // Check if La Raza config already exists
    const existingConfig = await collection.findOne({ publicationId: laRazaStorefrontConfig.publicationId });
    
    if (existingConfig) {
      console.log('⚠️  La Raza storefront configuration already exists. Updating...');
      
      const result = await collection.replaceOne(
        { publicationId: laRazaStorefrontConfig.publicationId },
        {
          ...laRazaStorefrontConfig,
          createdAt: existingConfig.createdAt || new Date(),
          updatedAt: new Date()
        }
      );
      
      console.log('✅ Updated existing La Raza storefront configuration');
      console.log(`   - Modified count: ${result.modifiedCount}`);
    } else {
      // Insert the La Raza configuration
      console.log('🔄 Adding La Raza Chicago storefront configuration...');
      
      const configWithTimestamps = {
        ...laRazaStorefrontConfig,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(configWithTimestamps);
      
      console.log('✅ Successfully added La Raza Chicago storefront configuration:');
      console.log(`   - ID: ${result.insertedId}`);
      console.log(`   - Publisher ID: ${laRazaStorefrontConfig.meta.publisher_id}`);
      console.log(`   - Publication ID: ${laRazaStorefrontConfig.publicationId}`);
    }

    // Get collection stats
    const count = await collection.countDocuments();
    console.log(`📊 ${collectionName} collection now has ${count} documents`);

    // List all storefront configurations
    const configs = await collection.find({}, { projection: { 'meta.publisher_id': 1, publicationId: 1, 'meta.is_draft': 1 } }).toArray();
    console.log('📋 Current storefront configurations:');
    configs.forEach(config => {
      console.log(`   - ${config.meta.publisher_id} (${config.publicationId}) - ${config.meta.is_draft ? 'DRAFT' : 'PUBLISHED'}`);
    });

    return {
      success: true,
      collectionName,
      documentCount: count,
      configurations: configs
    };
    
  } catch (error) {
    console.error('❌ Error initializing storefront collection:', error);
    throw error;
  }
}

// Run the script
initStorefrontCollection()
  .then((result) => {
    console.log('🎉 Storefront collection initialization completed successfully!');
    console.log('📊 Results:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

export { initStorefrontCollection, laRazaStorefrontConfig };
