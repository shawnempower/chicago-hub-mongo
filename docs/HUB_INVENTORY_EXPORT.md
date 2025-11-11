# Hub Inventory CSV Export Feature

## Overview

The Hub Inventory Export feature allows administrators to download a comprehensive CSV file containing all advertising inventory and pricing data for a specific hub. This export includes data from all publications associated with the hub across all distribution channels.

## Location

The export feature is available in **Hub Central** (`/hubcentral`):
- Click the **"Export CSV"** button in the top-right corner of the Hub Dashboard
- The button is located in the header banner next to the hub name and information

## What's Included in the Export

The CSV export includes comprehensive data across the following areas:

### 1. Publication Information
- Publication ID
- Publication Name
- Publication Type (daily, weekly, monthly, etc.)
- Content Type (news, lifestyle, business, etc.)
- Geographic Coverage (local, regional, state, national)
- Website URL

### 2. Inventory Details
For each advertising opportunity, the export includes:
- **Channel**: Website, Newsletter, Print, Events, Social Media, Podcast, Streaming Video, or Radio
- **Inventory ID**: Unique identifier for the ad unit
- **Inventory Name**: Descriptive name of the ad placement
- **Ad Format**: Specific format (e.g., "300x250 banner", "pre-roll", "full page")
- **Location/Position**: Where the ad appears
- **Specifications**: Technical specifications (size, format, duration, etc.)

### 3. Audience Metrics
Depending on the channel, metrics include:
- Subscribers/Circulation
- Monthly Impressions
- Monthly Visitors
- Average Views
- Attendees (for events)
- Followers (for social media)

### 4. Hub-Specific Pricing
Customized pricing for the selected hub:
- **Hub Available**: Whether this inventory is available to the hub (Yes/No)
- **Hub Pricing Model**: Hub-specific pricing structure
- **Hub Rates**: Discounted rates for the hub (Flat Rate, CPM, Per Send, Monthly)
- **Hub Discount %**: Percentage discount applied
- **Hub Minimum Commitment**: Hub-specific minimum requirements

### 5. Frequency and Timing
- **Frequency**: How often the opportunity occurs (daily, weekly, monthly, etc.)
- **Send Day**: Day of week (for newsletters)
- **Send Time**: Time of day (for newsletters)
- **Event Date**: Scheduled date (for events)

### 6. Performance Metrics
- **Open Rate %**: Email open rate (for newsletters)
- **Click Through Rate %**: Click-through rate (for newsletters)
- **Average Session Duration**: Time on site (for websites)
- **Bounce Rate %**: Bounce rate (for websites)

### 7. Status and Notes
- **Available**: Whether the inventory is currently available (Yes/No)
- **Notes**: Additional pricing information (especially for print ads with multiple tier pricing)

## Channel Coverage

The export includes inventory from all distribution channels:

### Website
- Banner ads (all sizes)
- Native ads
- Sponsored content
- Video ads
- Custom placements

### Newsletter
- Header, footer, inline, and dedicated ads
- Multiple newsletters per publication
- Send frequency and timing data

### Print
- All ad sizes (full page, half page, quarter page, etc.)
- Frequency-based pricing tiers (1x, 4x, 13x, 26x, 52x runs)
- Color and black & white options

### Events
- Sponsorship opportunities at all levels
- Booth spaces
- Speaking opportunities
- Brand placement options

### Social Media
- Posts and stories across platforms
- Sponsored content
- Influencer partnerships

### Podcasts
- Pre-roll, mid-roll, post-roll ads
- Host-read sponsorships
- Programmatic spots

### Streaming Video
- Pre-roll, mid-roll, post-roll video ads
- Overlay ads
- Sponsored content
- Live stream sponsorships

### Radio Stations
- 30-second and 60-second spots
- Live reads
- Traffic/weather sponsorships
- Drive-time and other day-part slots

## File Format

### Filename Convention
```
{hubId}-inventory-{date}.csv
```

Example: `chicago-hub-inventory-2025-11-11.csv`

### CSV Structure
- **Header Row**: Contains all column names
- **Data Rows**: One row per advertising opportunity
- **Encoding**: UTF-8
- **Delimiter**: Comma (,)
- **Text Qualifier**: Double quotes (") for fields containing commas or special characters

## Use Cases

### 1. Hub Inventory Analysis
- Review all available advertising inventory across the hub
- Identify gaps in coverage or opportunities
- Compare inventory types across publications

### 2. Pricing Strategy
- Analyze pricing consistency across the hub
- Identify opportunities for pricing adjustments
- Compare default vs. hub-specific pricing

### 3. Sales Enablement
- Provide sales teams with comprehensive inventory sheets
- Create custom packages based on available inventory
- Quick reference for client conversations

### 4. Reporting and Analytics
- Import into Excel, Google Sheets, or BI tools
- Create pivot tables and custom reports
- Track inventory changes over time

### 5. Client Proposals
- Extract specific inventory for client presentations
- Build custom media plans from available inventory
- Show pricing and audience metrics

## Technical Details

### Implementation
- **Location**: `/src/utils/hubInventoryExport.ts`
- **Component**: Button in `HubCentralDashboard.tsx`
- **Data Source**: Publications associated with the selected hub
- **Processing**: Client-side CSV generation
- **Download**: Browser-native download mechanism

### Error Handling
The export includes validation for:
- No hub selected
- No publications available
- Empty inventory data
- Missing pricing information

### Performance
- Processes all publications in memory
- Generates CSV on-demand
- No server-side processing required
- Typical export time: < 1 second for 50+ publications

## Future Enhancements

Potential improvements for future releases:

1. **Filtered Exports**
   - Export specific channels only
   - Filter by publication type or geography
   - Date range filtering for event inventory

2. **Export Formats**
   - Excel (.xlsx) format with multiple sheets
   - PDF format for sharing
   - JSON format for API integration

3. **Scheduled Exports**
   - Automatic weekly/monthly exports
   - Email delivery of exports
   - Change notifications

4. **Advanced Analytics**
   - Pre-calculated metrics in export
   - Comparison with previous exports
   - Inventory availability trends

## Support and Troubleshooting

### Common Issues

**Export button is disabled**
- Ensure a hub is selected
- Check that the hub has associated publications
- Wait for publications to finish loading

**Missing data in export**
- Some publications may have incomplete inventory data
- Hub-specific pricing only shows if configured
- Performance metrics depend on publication data completeness

**File won't open**
- Ensure you have a spreadsheet application (Excel, Google Sheets, Numbers)
- Check that the file has a `.csv` extension
- Try opening with a text editor to verify contents

### Getting Help
For technical support or feature requests, contact the development team or create an issue in the repository.

## Related Documentation
- [Hub System Overview](./HUB_SYSTEM.md)
- [Hub Implementation Summary](./HUB_IMPLEMENTATION_SUMMARY.md)
- [Production Deployment Guide](./HUB_PRODUCTION_DEPLOYMENT.md)

