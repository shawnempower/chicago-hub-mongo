# Publications Schema Migration Guide

## Overview

The Chicago Hub project has been successfully migrated from the legacy MediaEntity system to a comprehensive **Universal Publisher Profile** schema. This new schema provides detailed publication data management with extensive advertising opportunities, audience demographics, and business intelligence.

## New Schema Features

### Universal Publisher Profile Schema

The new `Publication` schema includes:

#### Core Information
- **Basic Info**: Publication name, website, type, content focus, geographic coverage
- **Contact Information**: Sales contacts, editorial contacts, management team
- **Social Media Profiles**: Multi-platform social presence with metrics
- **Distribution Channels**: Website, newsletters, print, events with detailed metrics

#### Advanced Features
- **Audience Demographics**: Detailed age, gender, income, education breakdowns
- **Editorial Information**: Content focus, editorial team, signature features
- **Business Intelligence**: Ownership, revenue breakdown, advertiser categories
- **Cross-Channel Packages**: Integrated advertising opportunities
- **Technical Capabilities**: CMS, analytics, payment processing
- **Competitive Analysis**: Value propositions, differentiators, market share
- **Booking Policies**: Lead times, payment terms, agency discounts
- **Metadata**: Data sources, confidence scores, verification status

## Database Changes

### New Collection: `publications`

The new schema uses the `publications` collection in MongoDB with the following indexes:

```javascript
{
  "publicationId": 1,          // Unique identifier
  "basicInfo.geographicCoverage": 1,
  "basicInfo.publicationType": 1,
  "basicInfo.contentType": 1,
  "distributionChannels.website.metrics.monthlyVisitors": -1,
  "distributionChannels.print.circulation": -1,
  "metadata.lastUpdated": -1,
  "metadata.verificationStatus": 1
}
```

### Legacy Compatibility

The legacy `media_entities` collection is maintained for backward compatibility. The system automatically converts between formats when needed.

## API Changes

### New Endpoints

- `GET /api/publications` - List publications with filtering
- `GET /api/publications/:id` - Get single publication
- `POST /api/publications` - Create publication
- `PUT /api/publications/:id` - Update publication
- `DELETE /api/publications/:id` - Delete publication
- `POST /api/publications/import` - Bulk import publications

### Legacy Endpoints

Legacy media entity endpoints continue to work and will automatically use the publications service as a fallback.

## Frontend Changes

### New Components

1. **PublicationManagement** - Comprehensive admin interface
   - Create, edit, delete publications
   - Advanced filtering and search
   - Bulk import/export functionality
   - Detailed publication views

2. **usePublications Hook** - React hook for publication management
   - CRUD operations
   - Filtering and categorization
   - Legacy compatibility mode

### Updated Components

- **AdminDashboard** - Added Publications tab
- **useMediaEntities** - Enhanced with publications fallback
- Backward compatibility maintained for existing components

## Migration Process

### 1. Data Import

Use the import script to migrate existing data:

```bash
# Import sample data
npx tsx src/scripts/importPublications.ts

# Import from JSON file
npx tsx src/scripts/importPublications.ts path/to/data.json
```

### 2. Admin Interface

Access the new Publications management interface:

1. Go to Admin Dashboard
2. Click the "Publications" tab
3. Use the interface to:
   - View existing publications
   - Create new publications
   - Import bulk data
   - Export data for backup

### 3. API Integration

For external systems, use the new API endpoints:

```javascript
// Get all publications
const publications = await fetch('/api/publications').then(r => r.json());

// Create new publication
const newPub = await fetch('/api/publications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(publicationData)
});

// Bulk import
const importResult = await fetch('/api/publications/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(publicationsArray)
});
```

## Schema Example

```json
{
  "publicationId": 1,
  "basicInfo": {
    "publicationName": "Chicago Sun-Times",
    "websiteUrl": "https://chicago.suntimes.com",
    "founded": 1844,
    "publicationType": "daily",
    "contentType": "news",
    "geographicCoverage": "local",
    "primaryServiceArea": "Chicago Metropolitan Area"
  },
  "contactInfo": {
    "mainPhone": "(312) 321-3000",
    "salesContact": {
      "name": "Sales Team",
      "email": "advertising@suntimes.com",
      "phone": "(312) 321-3200",
      "preferredContact": "email"
    }
  },
  "distributionChannels": {
    "website": {
      "metrics": {
        "monthlyVisitors": 955000,
        "monthlyPageViews": 2500000,
        "bounceRate": 45,
        "mobilePercentage": 68
      },
      "advertisingOpportunities": [
        {
          "name": "Homepage Banner",
          "adFormat": "728x90 banner",
          "pricing": {
            "cpm": 12.50,
            "pricingModel": "cpm"
          },
          "monthlyImpressions": 500000
        }
      ]
    },
    "print": {
      "frequency": "daily",
      "circulation": 200000,
      "advertisingOpportunities": [
        {
          "name": "Full Page Ad",
          "adFormat": "full page",
          "pricing": {
            "oneTime": 2500,
            "fourTimes": 9000
          }
        }
      ]
    }
  },
  "audienceDemographics": {
    "totalAudience": 955000,
    "ageGroups": {
      "25-34": 22,
      "35-44": 25,
      "45-54": 28
    },
    "householdIncome": {
      "75k-100k": 30,
      "100k-150k": 25,
      "over150k": 20
    }
  },
  "metadata": {
    "verificationStatus": "verified",
    "lastUpdated": "2025-09-30T12:00:00Z",
    "dataCompleteness": 85,
    "extractedFrom": ["manual_entry", "media_kit"]
  }
}
```

## Benefits

### For Administrators
- **Comprehensive Data Management**: Single interface for all publication data
- **Advanced Filtering**: Filter by type, coverage, verification status
- **Bulk Operations**: Import/export large datasets
- **Data Quality**: Built-in verification and completeness tracking

### For Sales Teams
- **Detailed Audience Data**: Demographics, interests, target markets
- **Advertising Opportunities**: Comprehensive inventory across all channels
- **Contact Management**: Multiple contact types with preferences
- **Pricing Information**: Detailed pricing models and packages

### For Developers
- **Flexible Schema**: Extensible structure for future enhancements
- **Strong Typing**: Full TypeScript support
- **Backward Compatibility**: Legacy systems continue to work
- **API-First**: RESTful API for easy integration

## Future Enhancements

The new schema is designed to support future features:

1. **AI-Powered Data Extraction**: Automatic population from websites and media kits
2. **Real-Time Metrics**: Integration with analytics platforms
3. **Competitive Intelligence**: Automated competitor tracking
4. **Campaign Management**: Direct integration with advertising campaigns
5. **Performance Analytics**: ROI tracking and optimization

## Support

For questions or issues with the new schema:

1. Check the admin interface for data validation errors
2. Review the import script logs for detailed error messages
3. Use the legacy compatibility mode if needed
4. Contact the development team for schema extensions

---

*Last updated: September 30, 2025*
