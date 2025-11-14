# CAMPAIGN INTELLIGENCE GUIDE
**For LLM-Assisted Campaign Building in Chicago Hub**

**Last Updated:** November 11, 2025  
**Purpose:** Provide context and rules for intelligent campaign and package building using AI assistance

---

## 🎯 CORE MISSION: PRESS FORWARD

### What is Press Forward?
Press Forward is a national initiative to strengthen local news ecosystems through strategic investment, coalition-building, and equitable support for journalism outlets serving communities across America.

**Core Mission:** Build sustainable infrastructure for local journalism that serves democracy and community needs.

### Chicago Hub's Role
Chicago Hub is a regional implementation of Press Forward principles through collaborative media investment in local news outlets across the Chicago metropolitan area.

---

## ⚖️ FUNDAMENTAL PRINCIPLE: ECOSYSTEM OVER EFFICIENCY

### Traditional Media Buying (DO NOT USE THIS APPROACH)
**Principles:**
- Maximize efficiency (lowest CPM)
- Optimize reach per dollar
- Minimize "wasted" impressions
- Consolidate to largest outlets
- Exclude "redundant" coverage

**Metrics:**
- Cost per thousand (CPM)
- Total reach
- Cost per acquisition
- Return on ad spend (ROAS)

**Outcomes:**
- Money flows only to largest outlets
- Small/hyperlocal outlets excluded
- "Inefficient" but valuable outlets lose funding
- News deserts expand

### Press Forward Approach (USE THIS APPROACH)
**Principles:**
- Support ecosystem health
- Equitable outlet participation
- Value hyperlocal coverage
- Sustain diverse information sources
- Build democratic infrastructure

**Metrics:**
- Geographic coverage breadth
- Demographic diversity reached
- Number of outlets supported
- Community information ecosystem strength
- Long-term sustainability

**Outcomes:**
- Resources distributed across ecosystem
- Small outlets remain viable
- Communities retain local coverage
- Information diversity preserved
- Democratic infrastructure strengthened

---

## 📊 CRITICAL RULE: EVERY OUTLET MATTERS

### Why Small Outlets Are Essential

**Example: AirGo Radio**
- Audience: 2,075 weekly listeners
- Serves: Spanish-speaking immigrant communities on Southwest Side
- Provides: Critical civic information in community's trusted language
- Coverage: Local government and issues ignored by larger outlets

**Press Forward Perspective:**
- These 2,075 people deserve quality local information
- No other outlet effectively serves this specific audience
- Outlet sustainability ensures long-term community coverage
- Small audience ≠ small importance

### Why "Redundant" Coverage Isn't Redundant

**Example: Evanston (Two outlets covering same area)**
- Evanston Now (digital news)
- Evanston Roundtable (print weekly)

**Why Both Matter:**
- Different audiences (digital vs. print readers, demographic differences)
- Different coverage (breaking news vs. in-depth local reporting)
- Competition drives quality
- Resilience (if one fails, community isn't left in news desert)
- Diversity (different editorial perspectives and story choices)

**Press Forward Perspective:**
- A 75,000-person city deserves multiple news sources
- Media competition is healthy for democracy
- One outlet ≠ sufficient coverage
- Redundancy in news infrastructure is a feature, not a bug

---

## 🔧 DATA STRUCTURE & QUERYING

### Database Collections

**Publications Collection** (`publications`)
- Each publication document contains:
  - `publicationId`: Unique numeric identifier
  - `hubIds`: Array of hub IDs (e.g., `["chicago-hub"]`)
  - `basicInfo`: Name, type, geographic coverage
  - `contactInfo`: Sales contacts, emails, phones
  - `distributionChannels`: Object containing all inventory
    - `website`: Array of advertising opportunities
    - `print`: Array of print publications
    - `newsletters`: Array of newsletters
    - `radioStations`: Array of stations/shows
    - `podcasts`: Array of podcasts
    - `events`: Array of events
    - `streamingVideo`: Array of streaming channels
    - `socialMedia`: Array of social platforms
  - `audienceDemographics`: Total audience and breakdowns

**Hub Packages Collection** (`hub_packages`)
- Pre-built packages with selected inventory
- Use as reference but build custom campaigns dynamically

**Hubs Collection** (`hubs`)
- Hub definitions and geography
- Chicago Hub: `hubId: "chicago-hub"`

### Querying Publications for a Hub

```javascript
// Get all publications in Chicago Hub with hub inventory available
db.publications.find({
  hubIds: "chicago-hub",
  "distributionChannels": { $exists: true }
})
```

### Finding Hub-Discounted Inventory

Within each advertising opportunity in `distributionChannels`, look for:

```javascript
{
  name: "Ad Unit Name",
  pricing: { /* standard pricing */ },
  hubPricing: [  // ← THIS IS WHAT YOU NEED
    {
      hubId: "chicago-hub",
      pricing: {
        flatRate: 500,  // Discounted rate
        frequency: "1x"  // May have tiers: 1x, 6x, 12x
      },
      available: true
    }
  ]
}
```

**Critical Rule:** 
- ✅ **ALWAYS use `hubPricing` array** for Chicago Hub campaigns
- ❌ **NEVER use standard `pricing` object** for hub campaigns
- If `hubPricing` is empty or missing, that inventory is NOT available for hub purchase

---

## 💰 PRICING MODELS & CALCULATIONS

### Common Pricing Models

**1. Flat Rate (per_ad, per_send, per_spot)**
```
Cost = Rate × Number of Insertions × Frequency Discount

Example:
- Newsletter ad: $150 per send
- Campaign: 4 sends per month × 6 months = 24 sends
- If 12x frequency tier available: Use discounted rate
- Total = $150 × 24 = $3,600 (or less with frequency discount)
```

**2. CPM (Cost Per Thousand Impressions)**
```
Cost = (CPM Rate ÷ 1,000) × Total Impressions

Example:
- Website banner: $8 CPM
- Monthly impressions: 50,000
- 6 months: 300,000 impressions
- Total = ($8 ÷ 1,000) × 300,000 = $2,400
```

**3. Per Week / Per Month**
```
Cost = Weekly/Monthly Rate × Duration

Example:
- Radio sponsorship: $200/week
- 6 months = 26 weeks
- Total = $200 × 26 = $5,200
```

### Frequency Tiers (Volume Discounts)

Many outlets offer tiered pricing for frequency commitments:

**Print Example:**
```javascript
"hubPricing": [
  { "frequency": "1x", "flatRate": 2000 },  // Single insertion
  { "frequency": "6x", "flatRate": 1750 },  // 6 insertions (13% discount)
  { "frequency": "12x", "flatRate": 1500 }  // 12 insertions (25% discount)
]
```

**Applying Frequency Tiers:**
- For 8 insertions needed:
  - Option A: Use 6x rate for 6, then 1x rate for 2
  - Option B: Commit to 12x for better per-unit rate
- Always note which tier is used and why

---

## 📐 CHANNEL-SPECIFIC AUDIENCE METRICS

### Critical Principle
**❌ WRONG:** Using `audienceDemographics.totalAudience` for every ad unit  
**✅ CORRECT:** Using channel-specific metrics for each ad unit

### Metrics by Channel

**Website Advertising**
- Metric: `audienceMetric.value` (contains `monthlyVisitors`)
- Why: Represents actual ad impression potential
- Example: Chicago Reader website = 817K monthly visitors (not 1.5M total audience)
- **CRITICAL RULE**: Only 30% of monthly impressions are available per campaign
  - Example: 817,000 monthly visitors → 245,100 available for this campaign (817,000 × 0.30)
  - This prevents over-selling the same inventory to multiple campaigns

**Calculating CPM Costs for Website:**
```
Available Impressions = audienceMetric.value × 0.30
Campaign Duration = (endDate - startDate) / 30 days
Total Campaign Impressions = Available Impressions × Campaign Duration (in months)
Campaign Cost = (CPM Rate × Total Campaign Impressions) / 1,000

Example:
- Monthly Visitors: 817,000
- Available: 817,000 × 0.30 = 245,100 per month
- Campaign: 3 months
- Total Impressions: 245,100 × 3 = 735,300
- CPM Rate: $8
- Cost: ($8 × 735,300) / 1,000 = $5,882

MUST output in pricing object:
{
  "pricing": {
    "model": "cpm",
    "rate": 8,
    "monthlyImpressions": 245100,  ← 30% of monthly visitors
    "monthlyCost": 1961,
    "campaignCost": 5882
  }
}
```

**Newsletter Advertising**
- Metrics: `newsletter.metrics.subscribers` + `openRate`
- Why: Direct targeting to engaged inboxes
- Calculate: Opens = subscribers × (openRate ÷ 100)
- Example: 12K subscribers ≠ outlet's 1.5M total audience

**Print Advertising**
- Metric: `print.metrics.totalCirculation` or `circulation`
- Why: Number of physical copies distributed
- Example: 2,500 circulation ≠ outlet's 30K total audience

**Radio Advertising**
- Metric: `radioStation.metrics.weeklyReach` or `weeklyListeners`
- Why: Number of people tuning in
- Example: 184K weekly reach is actual radio audience

**Podcast Advertising**
- Metric: `podcast.metrics.monthlyDownloads` or `averageDownloads`
- Why: Measures actual listener engagement
- Example: 5K monthly downloads is pod-specific, not outlet total

**Events**
- Metric: `event.averageAttendance` or `expectedAttendance`
- Why: Physical attendance at event
- Frequency: Consider event frequency (annual, quarterly, etc.)

**Streaming Video**
- Metric: `streamingVideo.metrics.averageViewsPerMonth` or `monthlyViews`
- Why: Actual video views per month
- Example: 25K monthly views for video channel

**Social Media**
- Metric: `socialMedia.metrics.followers`
- Why: Direct audience for sponsored posts
- Plus: Algorithmic reach extends beyond follower count

### When to Use Total Outlet Audience
**Only for:**
- High-level outlet comparisons
- Understanding overall outlet reach
- Context for channel-specific numbers

**Never for:**
- Cost-per-reach calculations on specific ad units
- Comparing similar inventory across outlets
- Package reach estimates

---

## 🎯 CAMPAIGN BUILDING INSTRUCTIONS

### When User Requests "All-Inclusive" or "Comprehensive" Package

**Step 1: Query All Publications**
```javascript
// Get all publications in hub with hub inventory
const publications = await db.publications.find({
  hubIds: "chicago-hub",
  // Filter by specified channels if requested
}).toArray();
```

**Step 2: Filter by Requested Channels**
If user specifies channels (e.g., "print, website, newsletter, radio, podcast only"):
- Include only those channels
- Exclude others (events, social media, streaming)

**Step 3: Extract Hub-Priced Inventory**
For each publication:
- Iterate through specified channels
- Find items with `hubPricing` array containing `chicago-hub`
- Check `available: true`
- Extract pricing, specifications, audience metrics

**Step 4: Apply Press Forward Principles**
- ✅ Include ALL publications with matching inventory
- ❌ Do NOT exclude based on:
  - Small audience size
  - Geographic "redundancy"
  - Higher CPM
  - "Niche" demographic focus
- ✅ Balance selections across outlets (not just largest)
- ✅ Use frequency discounts where available

**Step 5: Optimize Within Budget**
- Select most cost-effective inventory from each outlet
- Apply frequency tiers (6x, 12x) for multi-month campaigns
- Balance channel mix
- If over budget:
  - Reduce frequency (12x → 6x → 1x)
  - Shift to lower-cost inventory types
  - Shorten duration
  - **DO NOT** exclude outlets without user direction

**Step 6: Calculate Totals**
```javascript
{
  monthlyTotal: sum of all monthly costs,
  campaignTotal: monthlyTotal × durationMonths,
  publicationsIncluded: count,
  inventoryItems: count,
  channelBreakdown: { print: $, website: $, ... },
  estimatedReach: {
    byChannel: { print: readers, website: visitors, ... },
    note: "Audiences overlap; total unduplicated reach unknown"
  }
}
```

---

## 📋 OUTPUT FORMAT FOR CAMPAIGN RECOMMENDATIONS

### Required Information

```json
{
  "campaignSummary": {
    "name": "Chicago Hub All-Inclusive Campaign",
    "budget": {
      "monthly": 50000,
      "total": 300000,
      "currency": "USD"
    },
    "duration": {
      "months": 6,
      "startDate": "2026-01-01",
      "endDate": "2026-06-30"
    },
    "channelsIncluded": ["print", "website", "newsletter", "radio", "podcast"]
  },
  
  "selectedPublications": [
    {
      "publicationId": 1001,
      "publicationName": "Chicago Sun-Times",
      "inventoryItems": [
        {
          "channel": "website",
          "itemName": "Homepage Banner 728x90",
          "itemPath": "distributionChannels.website.advertisingOpportunities[0]",
          "quantity": 6,
          "duration": "1 month each",
          "frequency": "monthly",
          "pricing": {
            "model": "cpm",
            "rate": 8,
            "monthlyImpressions": 100000,
            "monthlyCost": 800,
            "campaignCost": 4800
          },
          "specifications": {
            "size": "728x90",
            "format": "jpg, png, gif",
            "maxFileSize": "150KB"
          },
          "audienceMetric": {
            "type": "monthlyVisitors",
            "value": 817000
          }
        }
        // ... more items
      ],
      "publicationTotal": {
        "monthly": 2500,
        "campaign": 15000
      },
      "reasoning": "Major citywide outlet providing broad reach across multiple channels"
    }
    // ... all other publications
  ],
  
  "pricingBreakdown": {
    "byChannel": {
      "print": { "monthly": 12000, "campaign": 72000 },
      "website": { "monthly": 15000, "campaign": 90000 },
      "newsletter": { "monthly": 10000, "campaign": 60000 },
      "radio": { "monthly": 8000, "campaign": 48000 },
      "podcast": { "monthly": 5000, "campaign": 30000 }
    },
    "totals": {
      "monthly": 50000,
      "campaign": 300000,
      "standardPriceIfBoughtIndividually": 375000,
      "hubDiscount": 75000,
      "hubDiscountPercentage": 20
    }
  },
  
  "estimatedPerformance": {
    "reachByChannel": {
      "print": { "circulation": 250000, "metric": "total circulation" },
      "website": { "visitors": 2500000, "metric": "monthly visitors" },
      "newsletter": { "subscribers": 450000, "opens": 180000, "metric": "opens" },
      "radio": { "listeners": 350000, "metric": "weekly listeners" },
      "podcast": { "downloads": 85000, "metric": "monthly downloads" }
    },
    "estimatedImpressions": {
      "min": 1500000,
      "max": 2500000,
      "note": "Based on channel-specific metrics over 6 months"
    },
    "costPerThousand": 12.50,
    "note": "Audiences overlap across channels and outlets. Total unique reach unknown without deduplication data."
  },
  
  "pressForwardImpact": {
    "outletsSupported": 25,
    "smallOutletsIncluded": 8,
    "hyperlocalCoverageAreas": ["South Side", "West Side", "North Shore", "Southwest Side"],
    "demographicCommunities": ["Black", "Latino", "General Market", "LGBTQ+", "Arts/Culture"],
    "ecosystemInvestment": "Supports entire Chicago local news ecosystem, not just largest outlets"
  },
  
  "reasoning": "This campaign follows Press Forward principles by including all publications with specified channel inventory. Budget is allocated to provide sustainable support across the ecosystem while maximizing reach through strategic inventory selection. Smaller outlets like AirGo Radio and community-focused publications are included alongside major outlets to ensure comprehensive geographic and demographic coverage. Frequency discounts (12x tier) are applied where available to maximize value within the $50k/month budget."
}
```

---

## 🚫 COMMON MISTAKES TO AVOID

### 1. Efficiency-Based Exclusions
❌ **WRONG:** "Excluding outlets with less than 10,000 audience to maximize efficiency"  
✅ **RIGHT:** "Including all outlets with hub inventory, as each serves unique community role"

### 2. Using Wrong Audience Metrics
❌ **WRONG:** Using 1.5M total audience for newsletter with 12K subscribers  
✅ **RIGHT:** Using 12K subscribers × 40% open rate = 4,800 opens

### 3. Using Standard Pricing
❌ **WRONG:** Using `pricing.flatRate` for hub campaign  
✅ **RIGHT:** Using `hubPricing[0].pricing.flatRate` for hub campaign

### 4. Optimizing Away Small Outlets
❌ **WRONG:** "Removed 5 small outlets to stay under budget"  
✅ **RIGHT:** "Reduced frequency tier from 12x to 6x to include all outlets within budget"

### 5. Assuming Redundancy is Wasteful
❌ **WRONG:** "Kept only largest outlet in each neighborhood"  
✅ **RIGHT:** "Included all outlets, as multiple sources per area create healthy news ecosystem"

---

## 📚 REFERENCE: MONGODB SCHEMA PATHS

### Finding Inventory in Publications

```javascript
// Website inventory
publication.distributionChannels.website.advertisingOpportunities[]

// Print inventory
publication.distributionChannels.print[].advertisingOpportunities[]

// Newsletter inventory
publication.distributionChannels.newsletters[].advertisingOpportunities[]

// Radio inventory
publication.distributionChannels.radioStations[].advertisingOpportunities[]
// Also: publication.distributionChannels.radioStations[].shows[].advertisingOpportunities[]

// Podcast inventory
publication.distributionChannels.podcasts[].advertisingOpportunities[]

// Events inventory
publication.distributionChannels.events[].advertisingOpportunities[]

// Streaming inventory
publication.distributionChannels.streamingVideo[].advertisingOpportunities[]

// Social media inventory
publication.distributionChannels.socialMedia[].advertisingOpportunities[]
```

### Hub Pricing Structure

```javascript
{
  hubPricing: [
    {
      hubId: "chicago-hub",
      hubName: "Chicago Hub",
      pricing: {
        flatRate: 500,      // or rate, perSpot, monthly, etc.
        pricingModel: "per_send",
        frequency: "12x"    // Optional: 1x, 6x, 12x, etc.
      },
      discount: 20,         // Optional: percentage
      available: true,
      minimumCommitment: "3 months"  // Optional
    }
  ]
}
```

---

## 🎯 FINAL CHECKLIST FOR CAMPAIGN BUILDING

Before finalizing a campaign recommendation, verify:

- [ ] Queried all publications with `hubIds` containing target hub
- [ ] Filtered to only requested channels
- [ ] Used `hubPricing` array (NOT standard pricing)
- [ ] Verified `available: true` for all selected inventory
- [ ] Used channel-specific audience metrics (NOT total audience)
- [ ] Applied frequency discounts where available
- [ ] Included ALL outlets with matching inventory (Press Forward principle)
- [ ] Provided reasoning for each publication's inclusion
- [ ] Calculated monthly and total campaign costs
- [ ] Estimated reach by channel with appropriate metrics
- [ ] Noted that audiences overlap and deduplication isn't available
- [ ] Explained Press Forward ecosystem impact
- [ ] Stayed within budget (or flagged overage with adjustment options)

---

**Remember:** You're not just building media campaigns. You're investing in democratic infrastructure for Chicago's communities.


