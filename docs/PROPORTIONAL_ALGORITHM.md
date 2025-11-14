# Proportional Allocation Algorithm

## Overview

The **Proportional Algorithm** allocates campaign budget strictly proportional to publication size. Larger publications (by audience size, impressions, reach) receive proportionally more budget. This creates a fair, transparent, and measurable distribution based on potential impact and reach.

## Core Philosophy

Unlike other algorithms that balance multiple factors (community impact, diversity, cost efficiency), the Proportional Algorithm prioritizes one thing: **publication size**. The bigger the publication, the more budget it receives. This is ideal for campaigns focused on maximum reach and traditional advertising efficiency metrics.

## How It Works

### 1. Size Metrics (Priority Order)

The algorithm evaluates publication size using these metrics:

1. **Audience Size**: Total subscribers, circulation, followers, listeners
2. **Monthly Impressions**: Website pageviews, newsletter opens, podcast downloads  
3. **Reach Potential**: Combined across all channels
4. **Engagement Metrics**: When available, factored into the calculation

### 2. Allocation Formula

```
Publication_Share = (Publication_Size / Total_Size_All_Publications) × Available_Budget
Final_Allocation = max($500, Publication_Share)
```

**Example with 3 publications and $20,000 budget:**

- **Publication A**: 100,000 audience → 50% of total → receives **$10,000** (50% of budget)
- **Publication B**: 60,000 audience → 30% of total → receives **$6,000** (30% of budget)
- **Publication C**: 40,000 audience → 20% of total → receives **$4,000** (20% of budget)

### 3. Distribution Steps

1. **Gather Size Metrics**: Collect audience/reach data for all available publications
2. **Calculate Total Size**: Sum audience size across all selected publications
3. **Determine Proportions**: Each publication's size / total size
4. **Allocate Proportionally**: Apply proportion to available budget
5. **Apply Minimums**: Ensure no publication gets less than $500
6. **Apply Maximums**: Cap at 25% of total budget (adjust others proportionally)
7. **Validate Constraints**: Ensure all budget rules are met

## Scoring Weights

The Proportional Algorithm uses heavily skewed weights:

- **Reach Weight**: 70% - PRIMARY factor (audience size/impressions)
- **Diversity Weight**: 15% - Secondary (some channel variety)
- **Cost Weight**: 10% - Tertiary (cost awareness)
- **Community Weight**: 5% - Minimal (focus on size, not community impact)

Compare to All-Inclusive algorithm:
- Reach: 25%, Diversity: 35%, Cost: 15%, Community: 25%

## Constraints

### Budget Constraints
- **Minimum per publication**: $500 (baseline support)
- **Maximum per publication**: 25% of total budget or $10,000 (whichever larger)
- **Budget adherence**: Strict - no budget exceeding
- **Minimum budget**: $5,000

### Publication Constraints
- **Minimum publications**: 5 (ensure some diversity)
- **Maximum publications**: 50
- **Channel diversity**: At least 2 different channel types

### Web Inventory
- **Availability**: Only 30% of monthly web impressions available per campaign
- Example: 100,000 monthly impressions → 30,000 available for this campaign

## When to Use This Algorithm

### ✅ Best For:
- **Maximum reach campaigns**: Prioritizing total impressions/audience
- **Traditional advertising goals**: Brand awareness, visibility
- **Metrics-based allocation**: Transparent, data-driven decisions
- **Large publication focus**: Rewarding outlets with proven reach
- **Scale-based fairness**: Proportional distribution feels equitable

### ❌ Not Ideal For:
- **Community impact focus**: Use "All-Inclusive" or "Little Guys" instead
- **Supporting small outlets**: Proportional favors larger publications
- **Ecosystem diversity**: Other algorithms better balance publication sizes
- **Press Forward missions**: Less aligned with supporting underserved outlets

## Comparison to Other Algorithms

| Feature | Proportional | All-Inclusive | Little Guys | Budget-Friendly |
|---------|-------------|---------------|-------------|-----------------|
| **Primary Goal** | Maximum reach | Ecosystem support | Support small outlets | Stay in budget |
| **Size Preference** | Larger = more $ | Balanced mix | Smaller = priority | Cost-efficient mix |
| **Budget Flex** | Strict | Up to 15% over | Strict | Strictly under |
| **Reach Weight** | 70% | 25% | 15% | 30% |
| **Community Weight** | 5% | 25% | 30% | 10% |
| **Typical Pub Count** | 5-20 | 15-50 | 8-25 | 8-20 |

## Example Scenarios

### Scenario 1: $50,000 Campaign with Major + Mid-Size Outlets

**Selected Publications:**
1. Chicago Sun-Times: 500,000 reach → 45% → **$22,500**
2. Block Club Chicago: 300,000 reach → 27% → **$13,500**  
3. South Side Weekly: 200,000 reach → 18% → **$9,000**
4. Austin Weekly: 100,000 reach → 9% → **$4,500**
5. Woodlawn Observer: 11,111 reach → 1% → **$500** (minimum applied)

**Total**: $50,000 across 5 publications

### Scenario 2: $25,000 Campaign with Even Mix

**Selected Publications:**
1. Tribune Local: 150,000 reach → 30% → **$7,500**
2. Evanston RoundTable: 125,000 reach → 25% → **$6,250**
3. Hyde Park Herald: 100,000 reach → 20% → **$5,000**
4. Beverly Review: 75,000 reach → 15% → **$3,750**
5. Garfield Ridge News: 50,000 reach → 10% → **$2,500**

**Total**: $25,000 across 5 publications (perfect proportional distribution)

## Technical Implementation

### Files
- **Config**: `server/campaignAlgorithms/proportional/config.ts`
- **Type Definition**: `server/campaignAlgorithms/types.ts`
- **Registry**: `server/campaignAlgorithms/registry.ts`

### Algorithm ID
- **ID**: `'proportional'`
- **Icon**: 📊
- **Name**: "Proportional by Size"

### LLM Instructions
The algorithm provides detailed instructions to the Claude AI including:
- Size metric priorities and calculation methods
- Step-by-step allocation formula
- Clear examples with real numbers
- Channel-specific size calculations (website, newsletter, print, etc.)
- Mandatory validation rules
- Expected output format with justifications

## User Interface

The Proportional Algorithm appears in the Campaign Builder's **AI Campaign Strategy** section (Step 2: Objectives):

```
📊 Proportional by Size

Allocate budget proportionally based on publication size and reach. 
Larger publications receive proportionally more budget, ensuring 
fair distribution based on audience size, impressions, and potential 
impact. Ideal for reach-focused campaigns.
```

Users can select it alongside:
- 🌍 All-Inclusive (Press Forward)
- 💰 Budget-Friendly
- 🏘️ The Little Guys

## API Integration

The algorithm is automatically discovered and served by:

1. **Backend Registry**: `listAlgorithms()` function returns all registered algorithms
2. **API Endpoint**: `GET /api/campaigns/algorithms` 
3. **Frontend Component**: `CampaignObjectivesStep.tsx` displays available algorithms

No additional configuration needed - just adding to the registry makes it available.

## Future Enhancements

Potential improvements to the Proportional Algorithm:

1. **Quality-Adjusted Size**: Factor in engagement rates, not just raw size
2. **Tiered Proportions**: Progressive scaling (e.g., first 50K = 100%, next 50K = 75%)
3. **Floor/Ceiling Options**: User-configurable min/max percentages
4. **Size Metric Selection**: Let users choose which metric to prioritize
5. **Hybrid Mode**: Blend proportional with other factors (e.g., 80% size, 20% community)

---

## Quick Start

To use the Proportional Algorithm:

1. Navigate to **Campaign Builder**
2. Complete **Step 1: Basics**
3. In **Step 2: Objectives**, scroll to **AI Campaign Strategy**
4. Select **📊 Proportional by Size**
5. Complete remaining steps and generate campaign

The AI will allocate your budget proportionally based on publication size metrics.

