# Television Inventory Analysis & Implementation Guide

**Date:** November 3, 2025  
**Status:** ✅ Schema Complete | ⚠️ No Data Yet  
**Priority:** Ready for Implementation

---

## Executive Summary

Television inventory has been **fully analyzed and documented** but currently has **zero implementations** across all 31 publications in the Chicago Hub database. This document provides a complete reference for implementing TV advertising opportunities.

### Current State
- **Publications with TV:** 0 of 31 (0%)
- **TV Stations:** 0
- **Ad Opportunities:** 0
- **Schema Status:** ✅ Fully defined and consistent
- **Documentation Status:** ✅ Complete
- **Implementation Status:** ⚠️ Ready to begin

---

## 📊 Analysis Results

### Database Query Results
```
📺 TV INVENTORY ANALYSIS
════════════════════════════════════════════════════════════════════════════════

Analyzing 31 publications for TV inventory...

📊 SUMMARY STATISTICS
────────────────────────────────────────────────────────────────────────────────
Publications with TV:        0
Total TV Stations:           0
Total Ad Opportunities:      0

📺 NETWORKS
────────────────────────────────────────────────────────────────────────────────
No networks found

📋 AD FORMATS
────────────────────────────────────────────────────────────────────────────────
No ad formats found

⏰ DAYPARTS
────────────────────────────────────────────────────────────────────────────────
No dayparts found

💰 PRICING MODELS
────────────────────────────────────────────────────────────────────────────────
No pricing models found

📰 PUBLICATIONS WITH TV INVENTORY
────────────────────────────────────────────────────────────────────────────────
No publications with TV inventory found
```

### Findings
1. **No Active TV Inventory:** Despite the schema being well-defined, no publications currently have TV advertising opportunities
2. **Schema Ready:** The TV schema structure is complete and matches other broadcast media types
3. **Documentation Complete:** Full pricing formulas, examples, and best practices are documented
4. **Consistent with Other Media:** TV follows the same patterns as Radio and Streaming Video

---

## 📺 Television Schema Structure

### Schema Location
- **File:** `json_files/schema/publication.json`
- **Path:** `distributionChannels.television`
- **Lines:** 2251-2432

### Complete Schema Definition

```json
{
  "television": {
    "type": "array",
    "description": "TV stations and cable channels",
    "items": {
      "type": "object",
      "properties": {
        "stationId": {
          "type": "string",
          "description": "Unique identifier for the station"
        },
        "callSign": {
          "type": "string",
          "description": "Station call sign (e.g., WBBM-TV)"
        },
        "channel": {
          "type": "string",
          "description": "Channel number or network name"
        },
        "network": {
          "type": "string",
          "enum": ["abc", "nbc", "cbs", "fox", "pbs", "cw", "independent", "cable", "other"],
          "description": "Network affiliation"
        },
        "coverageArea": {
          "type": "string",
          "description": "Geographic coverage area"
        },
        "viewers": {
          "type": "integer",
          "description": "Average weekly viewers"
        },
        "advertisingOpportunities": {
          "type": "array",
          "description": "Available TV advertising products",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Ad product name"
              },
              "adFormat": {
                "type": "string",
                "enum": [
                  "30_second_spot",
                  "60_second_spot",
                  "15_second_spot",
                  "sponsored_segment",
                  "product_placement",
                  "billboard"
                ],
                "description": "Type of TV advertisement"
              },
              "daypart": {
                "type": "string",
                "enum": [
                  "prime_time",
                  "daytime",
                  "early_morning",
                  "late_night",
                  "weekend",
                  "sports"
                ],
                "description": "Time slot category"
              },
              "pricing": {
                "type": "object",
                "properties": {
                  "flatRate": {
                    "type": "number",
                    "description": "Price amount (meaning depends on pricingModel)"
                  },
                  "pricingModel": {
                    "type": "string",
                    "enum": ["per_spot", "weekly", "monthly", "contact"],
                    "description": "How the price is applied"
                  }
                }
              },
              "specifications": {
                "type": "object",
                "properties": {
                  "format": {
                    "type": "string",
                    "enum": ["mpeg2", "h264", "prores", "live_script"],
                    "description": "Video format required"
                  },
                  "resolution": {
                    "type": "string",
                    "enum": ["1080p", "720p", "4k"],
                    "description": "Video resolution"
                  },
                  "duration": {
                    "type": "integer",
                    "description": "Ad duration in seconds"
                  }
                }
              },
              "available": {
                "type": "boolean",
                "default": true
              },
              "performanceMetrics": {
                "type": "object",
                "description": "Performance metrics for revenue forecasting",
                "properties": {
                  "impressionsPerMonth": {
                    "type": "integer",
                    "description": "Average monthly impressions"
                  },
                  "occurrencesPerMonth": {
                    "type": "number",
                    "description": "How many times this inventory runs per month"
                  },
                  "audienceSize": {
                    "type": "integer",
                    "description": "Base audience size (viewers)"
                  },
                  "guaranteed": {
                    "type": "boolean",
                    "default": false
                  }
                }
              },
              "hubPricing": {
                "type": "array",
                "description": "Pricing variations for different marketing hubs",
                "items": {
                  "type": "object",
                  "properties": {
                    "hubId": {
                      "type": "string"
                    },
                    "hubName": {
                      "type": "string"
                    },
                    "pricing": {
                      "type": "object",
                      "properties": {
                        "flatRate": {
                          "type": "number"
                        },
                        "pricingModel": {
                          "type": "string",
                          "enum": ["per_spot", "weekly", "monthly", "contact"]
                        }
                      }
                    },
                    "discount": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 100
                    },
                    "available": {
                      "type": "boolean",
                      "default": true
                    },
                    "minimumCommitment": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "generalTerms": {
          "type": "object",
          "description": "General terms and conditions that apply to all television advertising products",
          "properties": {
            "bookingDeadline": {
              "type": "string",
              "description": "Deadline for booking television spots"
            },
            "materialDeadline": {
              "type": "string",
              "description": "Deadline for submitting video materials"
            },
            "paymentTerms": {
              "type": "string",
              "description": "Payment terms (e.g., Net 30, Net 15)"
            },
            "cancellationPolicy": {
              "type": "string",
              "description": "Cancellation policy and notice requirements"
            },
            "productionServices": {
              "type": "string",
              "description": "Available production services and costs"
            },
            "makeGoodPolicy": {
              "type": "string",
              "description": "Make-good policy for missed or preempted spots"
            },
            "additionalTerms": {
              "type": "string",
              "description": "Any additional terms specific to television advertising"
            }
          }
        }
      }
    }
  }
}
```

---

## ✅ Schema Consistency Verification

### Comparison with Other Broadcast Media

| Feature | Television | Radio | Streaming Video | Status |
|---------|-----------|-------|-----------------|---------|
| **Pricing Structure** | ✅ `flatRate` + `pricingModel` | ✅ `flatRate` + `pricingModel` | ✅ `flatRate` + `pricingModel` | 🟢 **Consistent** |
| **Pricing Models** | `per_spot`, `weekly`, `monthly`, `contact` | `per_spot`, `contact` | `cpv`, `per_video`, `cpm`, `flat`, `contact` | 🟢 **Consistent** |
| **Hub Pricing** | ✅ Array with hub-specific rates | ✅ Array with hub-specific rates | ✅ Array with hub-specific rates | 🟢 **Consistent** |
| **Performance Metrics** | ✅ Standard metrics object | ✅ Standard metrics object | ✅ Standard metrics object | 🟢 **Consistent** |
| **Specifications** | ✅ Format, resolution, duration | ✅ Format, bitrate, duration | ✅ Format, resolution, aspectRatio | 🟢 **Consistent** |
| **General Terms** | ✅ Booking, material, payment, cancellation | ✅ Booking, material, payment, cancellation | ✅ Booking, material, payment, cancellation | 🟢 **Consistent** |
| **Time Segmentation** | ✅ Dayparts (prime_time, daytime, etc.) | ✅ Shows array | ✅ Streaming schedule | 🟢 **Consistent** |

### ✅ All Critical Fields Present

- ✅ Station identification (stationId, callSign, channel, network)
- ✅ Coverage and audience (coverageArea, viewers)
- ✅ Ad format specification (30_second_spot, 60_second_spot, etc.)
- ✅ Daypart segmentation (prime_time, daytime, late_night, etc.)
- ✅ Standard pricing structure (flatRate + pricingModel)
- ✅ Hub pricing support with discounts
- ✅ Performance metrics for forecasting
- ✅ Technical specifications (format, resolution, duration)
- ✅ General terms and conditions

---

## 💰 Supported Pricing Models

### 1. Per-Spot Pricing (`per_spot`)
**Use Case:** Individual TV spot purchases  
**Example:** $2,500 per 30-second prime time spot

**Revenue Calculation:**
```
Daily Rate = flatRate × (occurrencesPerMonth ÷ 30)
Monthly Revenue = Daily Rate × 30
Annual Revenue = Daily Rate × 365
```

**Example:**
- Price: $2,500/spot
- Frequency: 60 spots/month
- Daily: $2,500 × (60 ÷ 30) = $5,000/day
- Monthly: $5,000 × 30 = $150,000
- Annual: $5,000 × 365 = $1,825,000

### 2. Weekly Pricing (`weekly`)
**Use Case:** Weekly sponsorships or rotations  
**Example:** $1,500 per week

**Revenue Calculation:**
```
Daily Rate = (weeklyRate × 52) ÷ 365
Monthly Revenue = Daily Rate × 30
Annual Revenue = Daily Rate × 365
```

**Example:**
- Price: $1,500/week
- Daily: ($1,500 × 52) ÷ 365 = $213.70/day
- Monthly: $213.70 × 30 = $6,411
- Annual: $213.70 × 365 = $78,000

### 3. Monthly Pricing (`monthly`)
**Use Case:** Monthly sponsorships or packages  
**Example:** $7,500 per month

**Revenue Calculation:**
```
Daily Rate = monthlyRate ÷ 30
Monthly Revenue = monthlyRate
Annual Revenue = monthlyRate × 12
```

**Example:**
- Price: $7,500/month
- Daily: $7,500 ÷ 30 = $250/day
- Monthly: $7,500
- Annual: $7,500 × 12 = $90,000

### 4. Contact Pricing (`contact`)
**Use Case:** Custom packages, special events, premium placements  
**Example:** "Contact for pricing"

**Behavior:**
- No automatic calculations
- Requires custom quoting
- Total and revenue fields hidden in UI

---

## 🎯 TV Ad Formats (adFormat enum)

| Format | Description | Typical Duration | Best Use Case |
|--------|-------------|------------------|---------------|
| `30_second_spot` | Standard commercial | 30 seconds | General advertising, brand awareness |
| `60_second_spot` | Extended commercial | 60 seconds | Complex products, storytelling |
| `15_second_spot` | Quick hit commercial | 15 seconds | Reminders, promotions, teaser campaigns |
| `sponsored_segment` | Integrated content | 2-5 minutes | Thought leadership, education |
| `product_placement` | In-show integration | Variable | Subtle brand exposure |
| `billboard` | Sponsor mention | 5-10 seconds | "Brought to you by" acknowledgments |

---

## ⏰ Dayparts (daypart enum)

| Daypart | Time Period | Audience | Typical Rate |
|---------|------------|----------|--------------|
| `prime_time` | 8pm-11pm weekdays | Highest viewership | 2.5x - 4x base rate |
| `daytime` | 9am-4pm weekdays | Moderate viewership | 1x base rate |
| `early_morning` | 6am-9am | Moderate-high viewership | 1.5x - 2x base rate |
| `late_night` | 11pm-2am | Lower viewership | 0.5x - 0.8x base rate |
| `weekend` | All day Sat-Sun | Variable viewership | 1.2x - 2x base rate |
| `sports` | Live sports events | Very high viewership | 3x - 10x base rate |

---

## 📐 Technical Specifications

### Video Formats (specifications.format)
- **`mpeg2`:** Broadcast standard for over-the-air TV
- **`h264`:** Digital/streaming-friendly format
- **`prores`:** High-quality production format
- **`live_script`:** Host reads advertiser-provided copy

### Resolution Standards (specifications.resolution)
- **`1080p`:** Full HD (1920×1080) - Industry standard
- **`720p`:** HD (1280×720) - Acceptable for most stations
- **`4k`:** Ultra HD (3840×2160) - Premium stations/productions

### Standard Durations (specifications.duration)
- **15 seconds:** Quick messages, reminders
- **30 seconds:** Industry standard
- **60 seconds:** Detailed storytelling
- **Custom:** For sponsored segments

---

## 🏛️ Network Affiliations (network enum)

Supported network types:
- `abc` - ABC Network
- `nbc` - NBC Network
- `cbs` - CBS Network
- `fox` - Fox Network
- `pbs` - PBS (Public Broadcasting)
- `cw` - The CW Network
- `independent` - Independent station
- `cable` - Cable channel
- `other` - Other network type

---

## ⚠️ Data Quality Requirements

### Critical Fields (Must Have)
- ✅ `stationId` - Unique identifier
- ✅ `callSign` - FCC call sign (e.g., "WLS-TV")
- ✅ `channel` - Channel number
- ✅ `network` - Network affiliation from enum
- ✅ `coverageArea` - Geographic market
- ✅ `name` - Ad opportunity name
- ✅ `adFormat` - From enum (30_second_spot, etc.)
- ✅ `daypart` - From enum (prime_time, etc.)
- ✅ `pricing.flatRate` - Price (unless pricingModel is "contact")
- ✅ `pricing.pricingModel` - From enum (per_spot, weekly, monthly, contact)

### Recommended Fields (For Revenue Forecasting)
- 📊 `performanceMetrics.occurrencesPerMonth` - Required for per_spot pricing
- 📊 `performanceMetrics.impressionsPerMonth` - For CPM calculations
- 📊 `performanceMetrics.audienceSize` - Total viewer count
- 📊 `specifications` - Technical requirements
- 📊 `hubPricing` - Hub-specific pricing and discounts
- 📊 `viewers` - Station-level audience size

### Optional But Valuable
- 💡 `generalTerms` - Booking and material deadlines
- 💡 `available` - Inventory availability flag
- 💡 `performanceMetrics.guaranteed` - Whether metrics are guaranteed

---

## 📋 Implementation Checklist

When adding TV inventory to a publication:

### Station Setup
- [ ] Assign unique `stationId`
- [ ] Enter FCC `callSign` (e.g., "WBBM-TV")
- [ ] Set `channel` number
- [ ] Select `network` affiliation from enum
- [ ] Define `coverageArea` (e.g., "Chicago DMA")
- [ ] Enter `viewers` count (weekly average)

### For Each Advertising Opportunity
- [ ] Create descriptive `name` (e.g., "Prime Time 30-Second Spot")
- [ ] Select `adFormat` from enum
- [ ] Select `daypart` from enum
- [ ] Set `pricing.flatRate` (or use "contact")
- [ ] Set `pricing.pricingModel` from enum
- [ ] Define `specifications` (format, resolution, duration)
- [ ] Add `performanceMetrics.occurrencesPerMonth` for per_spot pricing
- [ ] Optionally add `hubPricing` array for hub-specific rates
- [ ] Set `available` to true

### General Terms
- [ ] Define `bookingDeadline` (e.g., "7 days prior")
- [ ] Define `materialDeadline` (e.g., "3 days prior")
- [ ] Set `paymentTerms` (e.g., "Net 15")
- [ ] Document `cancellationPolicy`
- [ ] List `productionServices` availability
- [ ] Define `makeGoodPolicy` for preempted spots

---

## 📊 Example TV Inventory Implementation

### Complete Example: Local News Station

```json
{
  "television": [
    {
      "stationId": "wls-abc7-chicago",
      "callSign": "WLS-TV",
      "channel": "7",
      "network": "abc",
      "coverageArea": "Chicago DMA (9-county area)",
      "viewers": 2500000,
      "advertisingOpportunities": [
        {
          "name": "Prime Time 30-Second Spot",
          "adFormat": "30_second_spot",
          "daypart": "prime_time",
          "pricing": {
            "flatRate": 2500,
            "pricingModel": "per_spot"
          },
          "specifications": {
            "format": "h264",
            "resolution": "1080p",
            "duration": 30
          },
          "performanceMetrics": {
            "impressionsPerMonth": 7500000,
            "occurrencesPerMonth": 120,
            "audienceSize": 2500000,
            "guaranteed": false
          },
          "hubPricing": [
            {
              "hubId": "chicago-hub",
              "hubName": "Chicago Hub",
              "pricing": {
                "flatRate": 2000,
                "pricingModel": "per_spot"
              },
              "discount": 20,
              "available": true,
              "minimumCommitment": "4-week minimum (16 spots)"
            }
          ],
          "available": true
        },
        {
          "name": "Daytime 30-Second Spot",
          "adFormat": "30_second_spot",
          "daypart": "daytime",
          "pricing": {
            "flatRate": 800,
            "pricingModel": "per_spot"
          },
          "specifications": {
            "format": "h264",
            "resolution": "1080p",
            "duration": 30
          },
          "performanceMetrics": {
            "impressionsPerMonth": 2000000,
            "occurrencesPerMonth": 120,
            "audienceSize": 750000,
            "guaranteed": false
          },
          "hubPricing": [
            {
              "hubId": "chicago-hub",
              "hubName": "Chicago Hub",
              "pricing": {
                "flatRate": 650,
                "pricingModel": "per_spot"
              },
              "discount": 18.75,
              "available": true
            }
          ],
          "available": true
        },
        {
          "name": "Weekend Morning Sponsorship",
          "adFormat": "billboard",
          "daypart": "weekend",
          "pricing": {
            "flatRate": 1200,
            "pricingModel": "weekly"
          },
          "specifications": {
            "format": "h264",
            "resolution": "1080p",
            "duration": 10
          },
          "performanceMetrics": {
            "impressionsPerMonth": 1500000,
            "audienceSize": 500000,
            "guaranteed": false
          },
          "available": true
        }
      ],
      "generalTerms": {
        "bookingDeadline": "7 days prior to air date",
        "materialDeadline": "3 days prior to air date (noon CST)",
        "paymentTerms": "Net 15 from invoice date",
        "cancellationPolicy": "72 hours notice required for cancellation. Cancellations within 72 hours forfeit 50% of spot cost.",
        "productionServices": "In-house production available: $500 for 30-sec spot, $750 for 60-sec spot. Includes scripting, shooting, and editing.",
        "makeGoodPolicy": "Make-goods provided for technical issues or preemptions. Equivalent or better daypart guaranteed within 2 weeks.",
        "additionalTerms": "Rates subject to availability and may increase during high-demand periods (elections, holidays, major events). Volume discounts available for campaigns of 50+ spots."
      }
    }
  ]
}
```

---

## 🎬 Best Practices

### Pricing Strategy
1. **Daypart Differentiation:** Set clear rate differences between dayparts
2. **Volume Discounts:** Offer package deals for multi-spot campaigns
3. **Hub Pricing:** Provide 15-25% discounts for hub partners
4. **Seasonal Adjustments:** Increase rates during high-demand periods
5. **Package Minimums:** Set minimum commitments (e.g., 4-week minimum)

### Performance Tracking
1. **Actual vs. Projected:** Track delivered impressions vs. estimates
2. **Make-Goods:** Monitor preemptions and ensure timely make-goods
3. **Daypart Performance:** Analyze which dayparts perform best
4. **Campaign Reach:** Report on unique reach and frequency

### Technical Requirements
1. **Format Standards:** Clearly specify acceptable formats
2. **Resolution Requirements:** Set minimum resolution standards
3. **Delivery Methods:** Define how materials should be submitted
4. **Deadlines:** Set and enforce material deadlines
5. **Quality Control:** Review all spots before air

---

## 📈 Revenue Forecasting Examples

### Example 1: Per-Spot Prime Time Campaign
```
Station: WLS-TV (ABC 7 Chicago)
Product: Prime Time 30-Second Spot
Rate: $2,500/spot
Frequency: 4 spots/week = ~17 spots/month

Monthly Revenue:
  Daily Rate = $2,500 × (17 ÷ 30) = $1,416.67/day
  Monthly = $1,416.67 × 30 = $42,500

Annual Revenue:
  Annual = $1,416.67 × 365 = $517,084
```

### Example 2: Weekly Sponsorship
```
Station: WTTW (PBS Chicago)
Product: Weekend Morning Sponsorship
Rate: $1,200/week
Frequency: 52 weeks/year

Monthly Revenue:
  Daily Rate = ($1,200 × 52) ÷ 365 = $170.96/day
  Monthly = $170.96 × 30 = $5,129

Annual Revenue:
  Annual = $170.96 × 365 = $62,400
```

### Example 3: Multi-Daypart Package
```
Station: WGN-TV
Package: Mixed Daypart Campaign
- Prime Time: 8 spots/month @ $2,000/spot
- Daytime: 20 spots/month @ $600/spot
- Weekend: 8 spots/month @ $800/spot

Monthly Revenue:
  Prime: 8 × $2,000 = $16,000
  Daytime: 20 × $600 = $12,000
  Weekend: 8 × $800 = $6,400
  Total Monthly = $34,400

Annual Revenue: $34,400 × 12 = $412,800
```

---

## 🔗 Related Documentation

- **Schema File:** `json_files/schema/publication.json` (lines 2251-2432)
- **Pricing Formulas:** `pricing-formulas.html` (section #television)
- **Analysis Script:** `scripts/analyzeTVFromBackup.ts`
- **Analysis Report:** `reports/tv-inventory-analysis.json`

---

## ✅ Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Schema Definition | ✅ Complete | Lines 2251-2432 in publication.json |
| Pricing Models | ✅ Documented | per_spot, weekly, monthly, contact |
| Ad Formats | ✅ Defined | 6 formats enumerated |
| Dayparts | ✅ Defined | 6 dayparts enumerated |
| Technical Specs | ✅ Defined | Format, resolution, duration |
| Hub Pricing Support | ✅ Complete | Consistent with other media |
| Performance Metrics | ✅ Complete | Standard metrics object |
| General Terms | ✅ Complete | Booking, material, payment, etc. |
| Revenue Calculations | ✅ Documented | All formulas defined |
| HTML Documentation | ✅ Complete | Full section in pricing-formulas.html |
| Data Quality Checklist | ✅ Complete | Required and recommended fields listed |
| Example Implementation | ✅ Complete | Full example provided |
| Consistency Check | ✅ Verified | Matches Radio and Streaming patterns |
| **Current Implementations** | ⚠️ **0 of 31** | **Ready to begin adding TV inventory** |

---

## 🚀 Next Steps

1. **Identify TV Stations:** Review publications to identify those with TV capabilities
2. **Gather Data:** Collect pricing, viewership, and technical specs for each station
3. **Implement Inventory:** Add TV advertising opportunities following the schema
4. **Set Hub Pricing:** Configure Chicago Hub discounts (typically 15-25%)
5. **Test Calculations:** Verify revenue forecasting works correctly
6. **Document Terms:** Complete general terms for each station
7. **Monitor Performance:** Track actual vs. projected metrics

---

**Last Updated:** November 3, 2025  
**Maintained By:** Chicago Hub Development Team

