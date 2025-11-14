\# CHICAGO HUB \- PROJECT INSTRUCTIONS

\*\*Last Updated:\*\* October 30, 2025    
\*\*Status:\*\* Active

\---

\#\# OVERVIEW

This document provides comprehensive instructions for working with the Chicago Hub media outlet data to build advertising packages, estimate costs, and generate insertion orders.

Chicago Hub operates within the Press Forward initiative, supporting the entire local news ecosystem through equitable outlet participation and strategic media investment.

\---

\#\# TABLE OF CONTENTS

1\. \[Data Structure\](\#data-structure)  
2\. \[Press Forward Context\](\#press-forward-context)  
3\. \[Hub Pricing vs. Standard Pricing\](\#hub-pricing-vs-standard-pricing)  
4\. \[Understanding Frequency Tiers\](\#understanding-frequency-tiers)  
5\. \[Channel-Specific Audience Metrics\](\#channel-specific-audience-metrics)  
6\. \[Cost Calculation Methods\](\#cost-calculation-methods)  
7\. \[Package Building Workflows\](\#package-building-workflows)  
8\. \[Insertion Order Generation\](\#insertion-order-generation)  
9\. \[Best Practices\](\#best-practices)

\---

\#\# DATA STRUCTURE

\#\#\# Source Database  
\- \*\*Location:\*\* MongoDB \`publications\` collection  
\- \*\*Format:\*\* Publication documents with nested inventory structure  
\- \*\*Status:\*\* Dynamic, query-able database

\#\#\# Key Data Fields

\`\`\`json  
{  
  "publicationId": "Unique outlet identifier",  
  "basicInfo": {  
    "publicationName": "Outlet name",  
    "publicationType": "weekly/daily/biweekly",  
    "contentType": "news/arts/alternative"  
  },  
  "contactInfo": {  
    "salesContact": {  
      "name": "Contact name",  
      "email": "Sales email",  
      "phone": "Phone number"  
    }  
  },  
  "audienceDemographics": {  
    "totalAudience": "Overall outlet reach",  
    "ageGroups": {...},  
    "gender": {...},  
    "householdIncome": {...}  
  },  
  "distributionChannels": {  
    "website": {  
      "metrics": {  
        "monthlyVisitors": "Channel-specific audience",  
        "monthlyPageViews": "Additional metric"  
      },  
      "advertisingOpportunities": \[  
        {  
          "name": "Ad unit name",  
          "adFormat": "banner/native/etc",  
          "sizes": \["300x250", "728x90"\],  
          "pricing": {  
            "flatRate": "Standard rack rate",  
            "pricingModel": "cpm/flat/etc"  
          },  
          "hubPricing": \[  
            {  
              "hubId": "chicago-hub",  
              "pricing": {  
                "flatRate": "Hub discounted rate",  
                "pricingModel": "May be missing \- infer intelligently",  
                "frequency": "1x/6x/12x for volume discounts"  
              },  
              "available": true  
            }  
          \]  
        }  
      \]  
    },  
    "newsletters": \[...\],  
    "print": \[...\],  
    "podcasts": \[...\],  
    "radioStations": \[...\],  
    "socialMedia": \[...\]  
  }  
}  
\`\`\`

\---

\#\# PRESS FORWARD CONTEXT

\#\#\# Mission Alignment

Chicago Hub supports the \*\*Press Forward initiative\*\*: a national effort to strengthen local news ecosystems through strategic investment and equitable partnerships.

\#\#\# Core Principles for Package Building

\*\*ALL-INCLUSIVE CAMPAIGNS:\*\*  
When building comprehensive or "all-inclusive" packages:  
\- Include \*\*ALL outlets with Hub inventory available in the system\*\* \- no exceptions  
\- No exclusions based on outlet size, audience efficiency, or perceived "redundancy"  
\- Present full costs transparently  
\- Flag any budget constraints, then offer adjustment options  
\- \*\*The user makes final decisions\*\* about trade-offs

\*\*ROLE CLARITY:\*\*  
\- \*\*Claude's role:\*\* Present complete options â†’ Calculate accurate costs â†’ Flag constraints â†’ Offer alternatives  
\- \*\*NOT Claude's role:\*\* Make optimization decisions â†’ Exclude outlets preemptively â†’ Apply efficiency metrics over equity

\*\*WHY THIS MATTERS:\*\*  
\- Every outlet serves a unique role in Chicago's information ecosystem  
\- Small outlets (e.g., AirGo Radio with 2,075 listeners) provide critical hyperlocal coverage  
\- Geographic "redundancy" (e.g., two Evanston outlets) actually represents valuable local news competition  
\- Supporting the full ecosystem creates sustainable local journalism infrastructure

\#\#\# Traditional Media Buying vs. Press Forward

\*\*Traditional approach:\*\* Maximize efficiency, CPM optimization, minimize "waste"    
\*\*Press Forward approach:\*\* Support ecosystem health, equitable participation, democratic infrastructure

When these approaches conflict, \*\*Press Forward principles take priority\*\* in Chicago Hub campaigns.

\*\*See PRESS\_FORWARD\_GUIDE.md for complete context.\*\*

\---

\#\# HUB PRICING VS. STANDARD PRICING

\#\#\# Critical Distinction

\*\*Standard Pricing (\`pricing\` object):\*\*  
\- Direct-sale rack rates  
\- What anyone would pay buying directly from outlet  
\- \*\*DO NOT USE for Chicago Hub packages\*\*

\*\*Hub Pricing (\`hubPricing\[\]\` array):\*\*  
\- Special negotiated rates for Chicago Hub group sales  
\- Typically 15-30% discounted from rack rates  
\- \*\*ALWAYS USE for Hub packages\*\*

\#\#\# Identifying Hub Inventory

\`\`\`  
âœ… Has Hub inventory:  
"hubPricing": \[  
  {  
    "hubId": "chicago-hub",  
    "pricing": {...},  
    "available": true  
  }  
\]

âŒ No Hub inventory:  
"hubPricing": \[\]  
\`\`\`

\#\#\# When hubPricing is Empty  
\- Exclude from Hub packages entirely  
\- Note as "available only at standard rates"  
\- Consider for future Hub negotiations

\---

\#\# UNDERSTANDING FREQUENCY TIERS

\#\#\# What Are Frequency Tiers?

Multiple pricing entries for the same ad unit offering \*\*volume discounts\*\* for frequency commitments.

\#\#\# Example Structure

\`\`\`json  
"Full Page Print Ad": {  
  "hubPricing": \[  
    {  
      "pricing": {"flatRate": 2000, "frequency": "1x"}  
    },  
    {  
      "pricing": {"flatRate": 1750, "frequency": "6x"}  
    },  
    {  
      "pricing": {"flatRate": 1500, "frequency": "12x"}  
    }  
  \]  
}  
\`\`\`

\*\*This is ONE ad unit with three pricing tiers\*\*, not three separate products.

\#\#\# Common Frequency Patterns

\*\*Print Advertising:\*\*  
\- 1x (single insertion)  
\- 4x (monthly for one quarter)  
\- 6x (bi-weekly for three months)  
\- 12x (monthly for one year)  
\- 26x (bi-weekly for six months)  
\- 52x (weekly for one year)

\*\*Newsletter Advertising:\*\*  
\- 1x (single send)  
\- 4x (weekly for one month)  
\- 12x (monthly for one year)

\*\*Radio Advertising:\*\*  
\- 1x (single spot)  
\- 12x (dozen spots)  
\- 26x (half-year commitment)  
\- 52x (year-long campaign)

\#\#\# How to Apply Frequency Pricing

\*\*Scenario:\*\* 8-week campaign, weekly print ads

\*\*Step 1:\*\* Determine total insertions needed \= 8

\*\*Step 2:\*\* Find closest frequency tier:  
\- 1x rate: $2,000/ad Ã— 8 \= $16,000  
\- 6x rate: $1,750/ad Ã— 8 \= $14,000 (but only covers 6\)  
\- 12x rate: $1,500/ad Ã— 8 \= $12,000 (best value, but commits to 12\)

\*\*Step 3:\*\* Choose strategy:  
\- Use 1x rate if flexibility needed  
\- Use 6x rate \+ 2 at 1x rate if budget constrained  
\- Use 12x rate if can commit to full year

\---

\#\# CHANNEL-SPECIFIC AUDIENCE METRICS

\#\#\# Critical Principle

\*\*âŒ WRONG:\*\* Using \`audienceDemographics.totalAudience\` for every ad unit    
\*\*âœ… CORRECT:\*\* Using channel-specific metrics for each ad unit

\#\#\# Metrics by Channel

\#\#\#\# Website Advertising  
\*\*Metric:\*\* \`website.metrics.monthlyVisitors\` or \`monthlyPageViews\`    
\*\*Why:\*\* Represents actual ad impression potential    
\*\*Example:\*\* Chicago Reader website has 817K monthly visitors (not 1.5M total audience)

\#\#\#\# Newsletter Advertising  
\*\*Metrics:\*\* \`newsletter.metrics.subscribers\` \+ \`openRate\`    
\*\*Why:\*\* Direct targeting to engaged inboxes    
\*\*Example:\*\* Newsletter with 12K subscribers â‰  outlet's 1.5M total audience    
\*\*Calculate:\*\* Opens \= subscribers Ã— (openRate Ã· 100\)

\#\#\#\# Print Advertising  
\*\*Metric:\*\* \`print.metrics.totalCirculation\`    
\*\*Why:\*\* Number of physical copies distributed    
\*\*Example:\*\* 2,500 circulation â‰  outlet's 30K total audience

\#\#\#\# Radio Advertising  
\*\*Metric:\*\* \`radioStation.metrics.weeklyReach\` or \`weeklyListeners\`    
\*\*Why:\*\* Number of people tuning in    
\*\*Example:\*\* 184K weekly reach is actual radio audience

\#\#\#\# Podcast Advertising  
\*\*Metric:\*\* \`podcast.metrics.monthlyDownloads\`    
\*\*Why:\*\* Measures actual listener engagement    
\*\*Example:\*\* 5K monthly downloads is pod-specific, not outlet total

\#\#\#\# Social Media Advertising  
\*\*Metric:\*\* \`socialMedia.metrics.followers\`    
\*\*Why:\*\* Direct audience for sponsored posts    
\*\*Plus:\*\* Algorithmic reach extends beyond follower count

\#\#\# When to Use Total Outlet Audience

\*\*Only for:\*\*  
\- High-level outlet comparisons  
\- Understanding overall outlet reach  
\- Context for channel-specific numbers

\*\*Never for:\*\*  
\- Cost-per-reach calculations on specific ad units  
\- Comparing similar inventory across outlets  
\- Package reach estimates

\---

\#\# COST CALCULATION METHODS

\#\#\# Pricing Model Inference

When \`pricingModel\` field is missing, infer based on:

1\. \*\*Channel type \+ frequency\*\* â†’ Print with frequency \= \`per\_ad\`  
2\. \*\*Channel type alone\*\* â†’ Newsletter \= \`per\_send\`, Social \= \`per\_post\`  
3\. \*\*Rate field used\*\* â†’ \`rate\` (not \`flatRate\`) \= \`cpm\`  
4\. \*\*Explicit "contact"\*\* â†’ \`pricingModel: "contact"\` \= need to contact outlet

\#\#\# Calculation Formulas

\#\#\#\# CPM (Cost Per Thousand Impressions)  
\`\`\`  
Cost \= (CPM Rate Ã· 1,000) Ã— Total Impressions

Example:  
$8 CPM Ã— 25,000 impressions \= $8 Ã— 25 \= $200  
\`\`\`

\*\*For campaigns:\*\*  
\`\`\`  
Weekly impressions Ã— Weeks \= Total impressions  
10,000/week Ã— 4 weeks \= 40,000 impressions  
$8 CPM Ã— 40 \= $320 total  
\`\`\`

\#\#\#\# Per Ad / Per Send  
\`\`\`  
Cost \= Rate Ã— Number of Insertions

Apply frequency discount if applicable:  
\- 1-3 insertions â†’ Use 1x rate  
\- 4-5 insertions â†’ Use 4x rate (if available)  
\- 6-11 insertions â†’ Use 6x rate (if available)  
\- 12+ insertions â†’ Use 12x rate (if available)  
\`\`\`

\*\*Example:\*\*  
\`\`\`  
8 weekly print ads in outlet with pricing:  
\- 1x: $500  
\- 6x: $450  
\- 12x: $400

Best approach: Use 6x rate for 6 ads \+ 1x rate for 2 ads  
6 Ã— $450 \= $2,700  
2 Ã— $500 \= $1,000  
Total \= $3,700

OR commit to 12x for better rate:  
12 Ã— $400 \= $4,800 (but requires 12 insertions)  
\`\`\`

\#\#\#\# Flat Rate  
\`\`\`  
Cost \= Flat Rate (regardless of duration)

Example: Homepage takeover \= $500 flat for 1 week  
\`\`\`

\#\#\#\# Per Week / Per Month  
\`\`\`  
Cost \= Weekly/Monthly Rate Ã— Number of Weeks/Months

Example:  
$200/week Ã— 4 weeks \= $800  
$750/month Ã— 2 months \= $1,500  
\`\`\`

\#\#\#\# Per Spot (Radio/Podcast)  
\`\`\`  
Cost \= Spot Rate Ã— Number of Spots

Apply frequency discounts:  
\- Check 12x, 26x, 52x rates for volume campaigns  
\`\`\`

\#\#\#\# Per Post (Social Media)  
\`\`\`  
Cost \= Post Rate Ã— Number of Posts

Example:  
$450/post Ã— 4 posts \= $1,800  
\`\`\`

\---

\#\# PACKAGE BUILDING WORKFLOWS

\#\#\# Workflow 1: Budget-Based Package

\*\*Input:\*\* Budget, target audience, duration

\*\*Process:\*\*  
1\. \*\*Identify target outlets\*\*  
   \- Search project knowledge for demographic match  
   \- Filter by geographic coverage if needed  
   \- Prioritize by reach and relevance

2\. \*\*Select inventory mix\*\*  
   \- Balance multiple channels (digital, newsletter, print, etc.)  
   \- Consider frequency (weekly, monthly)  
   \- Maximize reach within budget

3\. \*\*Calculate costs\*\*  
   \- Use channel-specific pricing  
   \- Apply frequency discounts  
   \- Ensure total â‰¤ budget

4\. \*\*Optimize\*\*  
   \- Adjust quantities  
   \- Swap inventory types  
   \- Iterate until budget optimized

5\. \*\*Present package\*\*  
   \- List all components  
   \- Show costs per outlet  
   \- Estimate total reach  
   \- Calculate estimated impressions/engagements

\*\*Example:\*\*  
\`\`\`  
Budget: $5,000  
Target: Black millennials  
Duration: 4 weeks

Package Components:  
1\. TRiiBE \- Digital display (4 weeks) \= $400  
2\. TRiiBE \- Newsletter (4 sends) \= $600  
3\. Chicago News Weekly \- Digital display (4 weeks) \= $480  
4\. N'DIGO \- Print half page (4 insertions) \= $2,000  
5\. N'DIGO \- Instagram posts (4 posts) \= $480  
6\. South Side Weekly \- Newsletter (4 sends) \= $800

Total: $4,760  
Estimated Reach: 250K-350K  
\`\`\`

\#\#\# Workflow 2: All-Inclusive Package

\*\*Input:\*\* Budget, duration, "include all outlets" requirement

\*\*Process:\*\*  
1\. \*\*Start with ALL outlets with Hub inventory in the system\*\*  
   \- Do not pre-filter by size, efficiency, or geography  
   \- Include every outlet regardless of audience size

2\. \*\*Select strategic inventory from each outlet\*\*  
   \- Choose most cost-effective ad unit per outlet  
   \- Balance channel mix across package  
   \- Apply frequency discounts where available

3\. \*\*Calculate total cost\*\*  
   \- Sum all outlet costs  
   \- Note any units requiring pricing confirmation

4\. \*\*Present package with options:\*\*  
   \- \*\*Option A:\*\* Full package with total cost (may exceed budget)  
   \- \*\*Option B:\*\* If over budget, offer adjustment approaches:  
     \- Reduce frequency across all outlets proportionally  
     \- Shift to lower-cost inventory types  
     \- Shorten campaign duration  
   \- \*\*User decides\*\* which trade-offs to make

\*\*CRITICAL:\*\* Never exclude outlets to fit budget without user direction.

\#\#\# Workflow 3: Category-Based Package

\*\*Input:\*\* Category, budget or reach goal

\*\*Process:\*\*  
1\. \*\*Query database by category\*\*  
   \- Query publications with specified channel inventory  
   \- List all units in specified category

2\. \*\*Filter by criteria\*\*  
   \- Budget constraints  
   \- Audience targeting  
   \- Geographic coverage

3\. \*\*Select inventory\*\*  
   \- Mix of outlet sizes (premium \+ targeted)  
   \- Balance cost and reach

4\. \*\*Calculate and present\*\*

\*\*Example:\*\*  
\`\`\`  
Category: Newsletter advertising  
Budget: $3,000  
Duration: 4 weeks (4 sends each)

Package:  
1\. Chicago Reader \- Inline ad (4Ã—) \= $600  
2\. TRiiBE \- Banner ad (4Ã—) \= $600  
3\. South Side Weekly \- Sponsorship (4Ã—) \= $800  
4\. Evanston Now \- Newsletter ad (4Ã—) \= $400

Total: $2,400  
Combined Subscribers: 85K+  
\`\`\`

\#\#\# Workflow 4: Geographic Package

\*\*Input:\*\* Geographic area, budget

\*\*Process:\*\*  
1\. \*\*Identify outlets by coverage\*\*  
   \- South Side: TRiiBE, SSW, Hyde Park Herald, etc.  
   \- North Shore: Evanston outlets, Record North Shore  
   \- Citywide: Sun-Times, Reader, WBEZ

2\. \*\*Include all outlets in target geography\*\*  
   \- Don't exclude based on "redundancy"  
   \- Multiple outlets in same area \= healthy news competition

3\. \*\*Select inventory and calculate\*\*

\---

\#\# INSERTION ORDER GENERATION

\#\#\# Required Information

\*\*Campaign Overview:\*\*  
\- Campaign name  
\- Client/advertiser info  
\- Campaign dates  
\- Total budget  
\- Campaign objectives

\*\*Per Outlet Details:\*\*  
\- Outlet name and contact  
\- Specific ad units  
\- Placement dates/frequency  
\- Ad specifications (sizes, formats, durations)  
\- Material deadlines  
\- Pricing and costs

\*\*Terms & Conditions:\*\*  
\- Payment terms  
\- Cancellation policy  
\- Material submission requirements

\#\#\# IO Template Structure

\`\`\`  
1\. Header Section  
   \- IO number, date, campaign name

2\. Client Information  
   \- Name, contact, billing address

3\. Campaign Overview  
   \- Objectives, dates, budget, key messages

4\. Per-Outlet Breakdown  
   For each outlet:  
   \- Contact information  
   \- Ad placement details  
   \- Specifications  
   \- Schedule  
   \- Pricing  
   \- Material deadlines  
   \- Terms specific to outlet

5\. Investment Summary  
   \- Per-outlet costs  
   \- Grand total

6\. Terms & Conditions  
   \- Payment terms  
   \- Cancellation policies  
   \- General terms  
\`\`\`

\#\#\# Template Generation  
Insertion orders are generated dynamically based on campaign data using the Campaign Builder system

\---

\#\# BEST PRACTICES

\#\#\# Data Quality

âœ… \*\*DO:\*\*  
\- Always check \`hubPricing\[\]\` first  
\- Use channel-specific audience metrics  
\- Apply frequency discounts when applicable  
\- Verify data completeness in metadata  
\- Note any "contact for pricing" items

âŒ \*\*DON'T:\*\*  
\- Use standard \`pricing\` for Hub packages  
\- Use total outlet audience for specific ad units  
\- Count frequency tiers as separate items  
\- Assume data completeness without checking

\#\#\# Cost Estimation

âœ… \*\*DO:\*\*  
\- Show multiple pricing tier options  
\- Explain frequency discount benefits  
\- Include channel-specific reach estimates  
\- Note any minimum commitments  
\- Account for lead times

âŒ \*\*DON'T:\*\*  
\- Mix standard and Hub pricing  
\- Ignore volume discount opportunities  
\- Overstate reach using total outlet audience  
\- Forget material deadlines

\#\#\# Package Building

âœ… \*\*DO:\*\*  
\- Mix channels for comprehensive reach  
\- Balance premium and targeted outlets  
\- Consider frequency and timing  
\- Stay within budget constraints (or flag when exceeded)  
\- Provide reach estimates  
\- Include all outlets when "all-inclusive" is specified

âŒ \*\*DON'T:\*\*  
\- Exclude outlets from all-inclusive packages without user direction  
\- Apply traditional efficiency metrics over Press Forward principles  
\- Ignore demographic targeting  
\- Exceed budget without offering adjustment options  
\- Overlook geographic coverage gaps

\#\#\# Client Communication

âœ… \*\*DO:\*\*  
\- Reference Chicago Hub negotiated rates  
\- Explain volume discount savings  
\- Provide clear specifications  
\- Include all contact information  
\- Set realistic expectations  
\- Explain Press Forward mission when relevant

âŒ \*\*DON'T:\*\*  
\- Quote standard rack rates for Hub inventory  
\- Overpromise on reach  
\- Omit material requirements  
\- Assume client understands media buying  
\- Make optimization decisions without client input

\---

\#\# TROUBLESHOOTING

\#\#\# Issue: "No Hub Pricing Found"  
\*\*Solution:\*\* Verify \`hubPricing\[\]\` array exists and is not empty

\#\#\# Issue: "Pricing Shows as 'Contact'"  
\*\*Check:\*\* Is \`pricingModel: "contact"\` explicitly set?    
\*\*If yes:\*\* Contact outlet for rate    
\*\*If no:\*\* Rate may exist but model field missing \- check for \`flatRate\` or \`rate\`

\#\#\# Issue: "Audience Number Seems Wrong"  
\*\*Check:\*\* Are you using channel-specific metric or total outlet audience?    
\*\*Solution:\*\* Use metrics from specific channel (e.g., newsletter subscribers, not total audience)

\#\#\# Issue: "Cost Calculation Doesn't Match"  
\*\*Check:\*\*   
\- Correct pricing model?  
\- Frequency discount applied?  
\- Correct number of insertions/impressions?  
\*\*Solution:\*\* Verify calculation formula for that pricing model

\#\#\# Issue: "Package Excludes Small Outlets"  
\*\*Check:\*\* Was this an "all-inclusive" request?    
\*\*Solution:\*\* Include ALL 29 outlets with Hub inventory \- let user decide on adjustments

\---

\#\# APPENDIX: DATA SOURCES

\#\#\# Querying Outlet Status

To get current outlet and inventory status:

\`\`\`javascript
// Get outlets with hub inventory
db.publications.find({ 
  hubIds: "chicago-hub",
  "distributionChannels": { $exists: true }
})

// Get outlets without hub inventory
db.publications.find({
  hubIds: "chicago-hub",
  $or: [
    { "distributionChannels": { $exists: false } },
    // Check if no hubPricing arrays exist in any channel
  ]
})

// Find items needing pricing confirmation
// (items with pricingModel: "contact" or missing hubPricing)
\`\`\`

Data is dynamic and should be queried from the database rather than relying on static counts

\---

\#\# RELATED DOCUMENTS

\- \*\*PRESS FORWARD GUIDE \- UNDERSTANDING CONTEXT FOR PLANNING & CALCULATIONS.md\*\* \- Mission and approach context  
\- \*\*CAMPAIGN\_INTELLIGENCE\_GUIDE.md\*\* \- Comprehensive guide for LLM-assisted campaign building  
\- \*\*README.md\*\* \- Project overview and setup  
\- \*\*HUB\_SYSTEM.md\*\* \- Hub architecture and implementation

\---

\*\*Questions? Reference the documentation in the docs/ folder or consult the Campaign Intelligence Guide.\*\*