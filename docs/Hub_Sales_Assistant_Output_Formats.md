# Hub Sales Assistant — Output Format Specifications

## Overview

This document defines the exact output formats for proposals (Markdown/PDF) and inventory packages (CSV). These formats ensure consistency and enable clean exports.

---

## Proposal Format (Markdown)

Proposals are generated as Markdown for easy editing, with structure that converts cleanly to PDF.

### Standard Proposal Structure

```markdown
# [Brand Name] Partnership Proposal
## A [Hub Name] Campaign

**Prepared for:** [Brand Name]  
**Prepared by:** [Hub Name]  
**Date:** [Month Day, Year]  
**Version:** [1.0]

---

CONFIDENTIAL — This proposal contains proprietary information intended solely for [Brand Name].

---

## Executive Summary

[2-3 sentence overview of the opportunity and strategic fit. Should capture why this partnership makes sense at a glance.]

### At a Glance

| Metric | Value |
|--------|-------|
| Network Reach | [X]M+ monthly visitors |
| Publishers | [X] trusted local voices |
| Newsletter Subscribers | [X]K+ |
| Recommended Investment | $[X]/month |
| Campaign Duration | [X] months |

---

## The Opportunity

[1-2 paragraphs on strategic context. Why now? Why this network? What problem does this solve for the brand?]

### Why [Hub Name]?

[Brief paragraph on the Hub's unique value proposition for this specific brand.]

---

## Strategic Alignment

[Intro sentence connecting brand positioning to Hub capabilities]

### [Brand Pillar 1] → [Hub Capability]

**Your positioning:** [What the brand stands for in this area]

**Our alignment:** [How the Hub's publishers deliver against this]

**Key publishers:** [2-4 publisher names]

---

### [Brand Pillar 2] → [Hub Capability]

**Your positioning:** [What the brand stands for]

**Our alignment:** [How publishers deliver]

**Key publishers:** [Publisher names]

---

### [Brand Pillar 3] → [Hub Capability]

[Same structure]

---

## Community Reach

[Intro paragraph on the community segments relevant to this brand]

### [Segment 1: e.g., African American Community]

**Reach:** [X]K+ monthly across [X] publishers

**Key Publishers:**
- **[Publisher 1]** — [Brief description, legacy if relevant]
- **[Publisher 2]** — [Brief description]
- **[Publisher 3]** — [Brief description]

**Why this matters for [Brand]:** [1-2 sentences on relevance]

---

### [Segment 2: e.g., Latino/Hispanic Community]

[Same structure]

---

### [Segment 3]

[Same structure as needed]

---

## Geographic Alignment

[Intro on how publisher coverage maps to brand locations/priorities]

### Coverage Map

| Your Locations | Our Publishers | Reach |
|----------------|----------------|-------|
| [Location/Region 1] | [Publishers] | [Reach] |
| [Location/Region 2] | [Publishers] | [Reach] |
| [Location/Region 3] | [Publishers] | [Reach] |

### Extended Reach

[Brief note on how the network reaches beyond their physical footprint]

---

## Recommended Media Plan

### Campaign Overview

| Element | Recommendation |
|---------|----------------|
| Flight Dates | [Start Date] – [End Date] |
| Duration | [X] months |
| Total Investment | $[X] |
| Channels | [Print, Digital, Newsletter, Radio] |
| Publishers | [X] publishers across [X] community segments |

### Channel Strategy

#### Print — [X]% of investment ($[X]/month)

[1-2 sentences on why print, what it delivers]

| Publisher | Placement | Frequency | Monthly Cost |
|-----------|-----------|-----------|--------------|
| [Publisher] | [Placement] | [Freq] | $[X] |
| [Publisher] | [Placement] | [Freq] | $[X] |

---

#### Digital Display — [X]% of investment ($[X]/month)

[1-2 sentences on digital strategy]

| Publisher | Placement | Impressions | Monthly Cost |
|-----------|-----------|-------------|--------------|
| [Publisher] | [Placement] | [X]K | $[X] |
| [Publisher] | [Placement] | [X]K | $[X] |

---

#### Newsletter — [X]% of investment ($[X]/month)

[1-2 sentences on newsletter value]

| Publisher | List Size | Frequency | Monthly Cost |
|-----------|-----------|-----------|--------------|
| [Publisher] | [X]K | [Freq] | $[X] |
| [Publisher] | [X]K | [Freq] | $[X] |

---

#### Radio — [X]% of investment ($[X]/month)

[1-2 sentences on radio reach]

| Station | Format | Spots/Week | Monthly Cost |
|---------|--------|------------|--------------|
| [Station] | [Format] | [X] | $[X] |

---

## Investment Summary

### Monthly Investment: $[X]

| Channel | Monthly | % of Total |
|---------|---------|------------|
| Print | $[X] | [X]% |
| Digital Display | $[X] | [X]% |
| Newsletter | $[X] | [X]% |
| Radio | $[X] | [X]% |
| **Total** | **$[X]** | **100%** |

### Campaign Total: $[X] over [X] months

### Investment Context

- **Cost per person reached:** ~$[X]
- **Estimated monthly impressions:** [X]M+
- **Share of voice in target communities:** [High/Medium]

---

## Why This Partnership Works

1. **[Reason 1 headline]** — [Brief explanation]

2. **[Reason 2 headline]** — [Brief explanation]

3. **[Reason 3 headline]** — [Brief explanation]

4. **[Reason 4 headline]** — [Brief explanation]

---

## Next Steps

1. [Immediate next step — e.g., "Schedule a call to discuss..."]
2. [Second step — e.g., "Finalize campaign objectives and timing"]
3. [Third step — e.g., "Confirm investment level and launch"]

### Ready to proceed?

Contact [Name] at [email] or [phone].

---

## Appendix: Publisher Profiles

### [Publisher 1]

**Overview:** [2-3 sentences]  
**Reach:** [Metrics]  
**Audience:** [Demographics]  
**Founded:** [Year]

---

### [Publisher 2]

[Same structure]

---

*[Hub Name] | [Date] | Confidential*
```

---

### Proposal Length Guidelines

| Proposal Type | Pages | When to Use |
|---------------|-------|-------------|
| Executive Summary | 1-2 | Leave-behind, internal sharing |
| Standard Proposal | 6-10 | Most meetings |
| Comprehensive Proposal | 12-18 | Major prospects, complex campaigns |

### Formatting Notes

- **Headlines:** Sentence case (not Title Case)
- **Tables:** Use for data, keep clean and scannable
- **Emphasis:** Use bold sparingly for key points
- **Sections:** Clear hierarchy with horizontal rules between major sections
- **Brand references:** Use brand name, not "the client" or "you"
- **Hub references:** Use full Hub name on first reference, can shorten after

---

## Package Export Format (CSV)

Inventory packages export as CSV for easy import into campaign management or further processing.

### CSV Structure

```csv
publisher_name,publisher_id,placement_name,placement_id,channel,format,dimensions,unit_rate,rate_type,quantity,frequency,flight_start,flight_end,total_cost,notes
```

### Column Definitions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `publisher_name` | string | Human-readable publisher name | "Chicago Sun-Times" |
| `publisher_id` | string | System identifier | "pub_12345" |
| `placement_name` | string | Name of ad placement | "Homepage Leaderboard" |
| `placement_id` | string | System identifier | "plc_67890" |
| `channel` | string | Channel category | "digital" |
| `format` | string | Ad format type | "display" |
| `dimensions` | string | Size/spec | "728x90" |
| `unit_rate` | number | Price per unit | 15.00 |
| `rate_type` | string | Pricing model | "cpm" |
| `quantity` | number | Number of units | 50000 |
| `frequency` | string | Delivery frequency | "monthly" |
| `flight_start` | date | Campaign start | "2026-02-01" |
| `flight_end` | date | Campaign end | "2026-04-30" |
| `total_cost` | number | Line item total | 750.00 |
| `notes` | string | Special instructions | "Above the fold" |

### Channel Values

Use these standardized channel values:
- `print`
- `digital`
- `newsletter`
- `radio`
- `podcast`
- `event`
- `sponsored_content`

### Format Values

Use these standardized format values:
- `display` — Banner ads, digital display
- `native` — Native ad units
- `sponsored_content` — Branded content, advertorials
- `print_display` — Print display ads
- `print_classified` — Print classifieds
- `newsletter_sponsorship` — Newsletter sponsor placement
- `newsletter_display` — Banner in newsletter
- `radio_spot` — Radio commercial spot
- `radio_sponsorship` — Program/segment sponsorship
- `podcast_spot` — Podcast ad read
- `podcast_sponsorship` — Podcast sponsorship

### Rate Type Values

- `cpm` — Cost per thousand impressions
- `flat` — Flat fee per placement
- `per_issue` — Per print issue
- `per_spot` — Per radio/podcast spot
- `per_send` — Per newsletter send
- `monthly` — Monthly flat fee

### Example CSV

```csv
publisher_name,publisher_id,placement_name,placement_id,channel,format,dimensions,unit_rate,rate_type,quantity,frequency,flight_start,flight_end,total_cost,notes
Chicago Sun-Times,pub_001,Homepage Leaderboard,plc_001,digital,display,728x90,12.00,cpm,100000,monthly,2026-02-01,2026-04-30,1200.00,Above the fold
Chicago Sun-Times,pub_001,Daily Newsletter Sponsorship,plc_002,newsletter,newsletter_sponsorship,300x250,500.00,per_send,12,weekly,2026-02-01,2026-04-30,6000.00,Exclusive sponsor position
WVON 1690 AM,pub_015,Morning Drive :30,plc_045,radio,radio_spot,30 seconds,75.00,per_spot,60,monthly,2026-02-01,2026-04-30,4500.00,Mon-Fri 6-9am
La Raza,pub_023,Full Page 4C,plc_078,print,print_display,Full page,2500.00,per_issue,12,weekly,2026-02-01,2026-04-30,30000.00,Premium position requested
Chicago Defender,pub_008,Weekly Newsletter Banner,plc_089,newsletter,newsletter_display,600x200,350.00,per_send,12,weekly,2026-02-01,2026-04-30,4200.00,Top position
```

### CSV Summary Section

At the end of the CSV, include summary rows (prefixed to distinguish from line items):

```csv
SUMMARY,,,,,,,,,,,,,
Total Publishers,5,,,,,,,,,,,,
Total Line Items,12,,,,,,,,,,,,
Total Investment,45900.00,,,,,,,,,,,,
Flight Dates,2026-02-01 to 2026-04-30,,,,,,,,,,,,
Generated,2026-01-21,,,,,,,,,,,,
Hub,Chicago Media Collective,,,,,,,,,,,,
Brand,Mariano's,,,,,,,,,,,,
```

---

## Research Brief Format (Markdown)

When outputting research (before a proposal), use this structure:

```markdown
# Advertiser Research Brief
## [Brand Name]

**Research Date:** [Date]  
**Prepared for:** [Hub Name]  
**Status:** Research Complete — Ready for Planning

---

## Company Overview

**Name:** [Full company name]  
**Industry:** [Industry/category]  
**Website:** [URL]  
**Headquarters:** [Location]

[2-3 sentence overview of the company]

---

## Brand Positioning

**Tagline:** [Primary tagline if known]

**Brand Pillars:**
1. [Pillar 1]
2. [Pillar 2]
3. [Pillar 3]

**Brand Voice:** [Description of how they communicate]

**Key Differentiators:** [How they stand out from competitors]

---

## Products/Services to Spotlight

| Product/Service | Target Audience | Key Message |
|-----------------|-----------------|-------------|
| [Product 1] | [Audience] | [Message] |
| [Product 2] | [Audience] | [Message] |

---

## Chicago Presence

**Locations:** [Number] locations in Chicago area

**Geographic Footprint:**
- [Region 1]: [Details]
- [Region 2]: [Details]

**Market Position:** [Local market context]

---

## Target Customers

**Primary Audience:** [Description]

**Demographics:**
- Age: [Range]
- Income: [Range]
- Other: [Relevant characteristics]

**Psychographics:** [Values, interests, lifestyle]

---

## Community Commitments

**Partnerships:** [Nonprofit/community partnerships]

**Sponsorships:** [Sports, events, cultural]

**Programs:** [Community programs they run]

---

## Strategic Alignment with [Hub Name]

### Recommended Community Segments

| Segment | Fit | Rationale |
|---------|-----|-----------|
| [Segment 1] | High | [Why] |
| [Segment 2] | Medium | [Why] |

### Recommended Publishers

| Publisher | Alignment | Notes |
|-----------|-----------|-------|
| [Publisher 1] | [Brand pillar/segment] | [Context] |
| [Publisher 2] | [Brand pillar/segment] | [Context] |

### Geographic Alignment

[How their locations map to publisher coverage]

---

## Competitive Landscape

**Main Competitors:**
1. [Competitor 1]
2. [Competitor 2]

**Competitive Positioning:** [How they differentiate]

---

## Calendar Opportunities

| Period | Opportunity | Relevance |
|--------|-------------|-----------|
| Q1 | [Opportunity] | [Why relevant] |
| Q2 | [Opportunity] | [Why relevant] |

**Cultural Moments:** [Heritage months, events relevant to their audience]

---

## Discovery Questions

For the first meeting, consider exploring:

1. [Question about marketing priorities]
2. [Question about target audience]
3. [Question about geographic focus]
4. [Question about past media experience]
5. [Question about success metrics]

---

## Research Sources

| Source | URL | Accessed |
|--------|-----|----------|
| Company website | [URL] | [Date] |
| [Other source] | [URL] | [Date] |

---

## Next Steps

1. Review research and add context from any prior conversations
2. Schedule discovery meeting
3. After meeting, refine strategy and move to campaign planning

---

*Research conducted by [Hub Name] Sales Assistant*
```

---

## Export Filename Conventions

### Proposals
```
Proposal_[BrandName]_[HubSlug]_v[Version]_[YYYY-MM-DD].md
Proposal_Marianos_CMC_v1_2026-01-21.md
```

### Packages
```
Package_[BrandName]_[HubSlug]_[YYYY-MM-DD].csv
Package_Marianos_CMC_2026-01-21.csv
```

### Research Briefs
```
Research_[BrandName]_[YYYY-MM-DD].md
Research_Marianos_2026-01-21.md
```

---

## PDF Conversion Notes

When converting Markdown proposals to PDF:

- Use a clean, professional font (Inter, Helvetica, or similar)
- Maintain table formatting
- Add page numbers in footer
- Include "Confidential" in footer
- Consider adding Hub logo to header (when available)
- Ensure adequate margins (1 inch minimum)

Recommended tools:
- Pandoc with custom template
- Markdown-to-PDF converters with CSS styling
- Or manual conversion via Google Docs/Word

---

*Document maintained by Steven Buhrman. For questions, contact steven@empowerlocal.co*
