# Quick Start: Hub Inventory Export 📊

## How to Export Hub Inventory Data

### Step 1: Navigate to Hub Central
Go to `/hubcentral` in your application.

### Step 2: Select Your Hub
- The hub selector is typically in the top navigation
- Choose the hub you want to export data for (e.g., "Chicago Hub")

### Step 3: Export
- Click the **"Export CSV"** button in the top-right corner of the dashboard header
- The button has a download icon 📥
- Your CSV file will download immediately

### Step 4: Open the File
- Open the downloaded CSV in Excel, Google Sheets, or any spreadsheet application
- File will be named: `{hubId}-inventory-{date}.csv`
- Example: `chicago-hub-inventory-2025-11-11.csv`

## What's in the Export? 🎯

The CSV includes everything you need to analyze and sell your hub's inventory:

### Publication Data
- Publication names and IDs
- Content types and coverage areas
- Website URLs

### Complete Inventory
- **All Channels**: Website, Newsletter, Print, Events, Social Media, Podcasts, Streaming Video, Radio
- Ad formats and specifications
- Placement locations
- Availability status

### Pricing Information
- **Hub-Specific Pricing**: Special rates and discounts for your hub
- Multiple pricing models (CPM, flat rate, per-send, per-spot, etc.)
- Minimum commitments

### Audience Metrics
- Subscribers/circulation numbers
- Monthly impressions and visitors
- Average views
- Attendance numbers (for events)
- Follower counts (for social)

### Performance Data
- Open rates (newsletters)
- Click-through rates
- Session duration (websites)
- Bounce rates

## Common Use Cases 💼

### 1. **Sales Presentations**
Extract specific inventory for client proposals

### 2. **Inventory Analysis**
Review all available ad placements across your hub

### 3. **Pricing Strategy**
Compare default vs. hub pricing, identify opportunities

### 4. **Media Planning**
Build comprehensive media plans from available inventory

### 5. **Reporting**
Import into analytics tools, create pivot tables and charts

## Pro Tips 💡

### Excel/Google Sheets Tips
1. **Use Filters**: Turn on auto-filter to quickly find specific channels or publications
2. **Pivot Tables**: Create summaries by channel, publication type, or price range
3. **Sort by Channel**: Group all website ads, newsletter ads, etc. together
4. **Calculate Totals**: Sum up total inventory value, reach, or impressions

### Finding Specific Inventory
- Filter **Channel** column for specific ad types (e.g., "Newsletter")
- Filter **Hub Available** column to see only available inventory
- Sort by **Hub Discount %** to find best deals
- Search **Publication Name** to find specific outlets

### Understanding Pricing
- **Hub Pricing**: Special rate negotiated for your hub
- **Hub Discount %**: Shows how much you're saving vs. standard rates
- **Est. Monthly Revenue (Hub)**: Calculated monthly revenue at your rates

## Column Reference 📋

### Most Important Columns
1. **Publication Name** - Which outlet
2. **Channel** - Type of advertising
3. **Inventory Name** - Specific ad placement
4. **Est. Monthly Reach** - How many people this reaches
5. **Hub Flat Rate** - Your price
6. **Est. Monthly Revenue (Hub)** - Monthly revenue forecast
7. **Hub Discount %** - Your savings

### Pricing Columns
- **Hub Pricing Model** - How hub pricing works  
- **Hub Flat Rate/CPM/Per Send** - Your rates
- **Hub Discount %** - Percentage off
- **Est. Monthly Revenue (Hub)** - Calculated monthly revenue

### Audience Columns
- **Subscribers/Circulation** - Total audience
- **Monthly Impressions** - Ad views per month
- **Monthly Visitors** - Website traffic
- **Open Rate %** - Email performance
- **Click Through Rate %** - Engagement rate

## Troubleshooting 🔧

### Button is Disabled
- Make sure a hub is selected
- Wait for publications to load (spinner will disappear)
- Refresh the page if needed

### No Data in Export
- Check that your hub has publications assigned
- Verify publications have inventory configured
- Contact admin if data is missing

### File Won't Open
- Make sure file has `.csv` extension
- Try opening with different app (Excel, Google Sheets, Numbers)
- Open with text editor to verify contents

## Need More Info? 📚

- **Full Documentation**: See `/docs/HUB_INVENTORY_EXPORT.md`
- **Implementation Details**: See `/docs/INVENTORY_EXPORT_SUMMARY.md`
- **Hub System Overview**: See `/docs/HUB_SYSTEM.md`

## Example Workflow 🎬

### Creating a Client Proposal

1. **Export the inventory** for your hub
2. **Open in Excel/Sheets**
3. **Filter** for the channels your client is interested in
4. **Sort** by price or audience size
5. **Highlight** recommended options
6. **Calculate** total package cost
7. **Copy/paste** into your proposal template
8. **Share** with client

### Analyzing Your Hub

1. **Export the inventory**
2. **Create a pivot table**
   - Rows: Channel
   - Values: Count of Inventory, Sum of Hub Flat Rate
3. **Analyze**:
   - Which channels have most inventory?
   - What's the total value of all inventory?
   - Where are the gaps?
4. **Take Action**:
   - Recruit publications in underrepresented channels
   - Negotiate pricing for high-value opportunities
   - Create packages around popular inventory

---

**Ready to try it?** Head to `/hubcentral` and click Export CSV! 🚀

