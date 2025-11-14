# Campaign Builder Guide
**AI-Powered Campaign Creation for Chicago Hub**

**Last Updated:** November 11, 2025  
**Status:** Active

---

## 🎯 Overview

The Campaign Builder is an intelligent system that uses AI to automatically select optimal publication inventory based on your campaign requirements. It follows Press Forward principles to support the entire local news ecosystem.

### Key Features

- **AI-Powered Selection**: OpenAI analyzes your requirements and selects the best inventory mix
- **Press Forward Compliant**: Includes all publications when requested (ecosystem support)
- **Multi-Channel Coverage**: Automatically balances print, digital, newsletter, radio, podcast, and more
- **Automated Pricing**: Calculates total costs with hub discounts and frequency tiers
- **Insertion Orders**: Generates professional HTML/Markdown insertion orders
- **Performance Estimates**: Provides reach and impression projections

---

## 🏗️ System Architecture

### Backend Components

1. **Campaign Schema** (`src/integrations/mongodb/campaignSchema.ts`)
   - Database structure for campaigns
   - TypeScript interfaces for type safety

2. **Campaign Service** (`src/integrations/mongodb/campaignService.ts`)
   - CRUD operations for campaigns
   - Database queries and updates

3. **LLM Service** (`server/campaignLLMService.ts`)
   - OpenAI integration for intelligent inventory selection
   - Queries publications and builds context
   - Parses AI responses into structured data

4. **Insertion Order Generator** (`server/insertionOrderGenerator.ts`)
   - Generates HTML and Markdown insertion orders
   - Professional formatting with campaign details

5. **API Endpoints** (`server/index.ts`)
   - `/api/campaigns/analyze` - AI analysis
   - `/api/campaigns` - CRUD operations
   - `/api/campaigns/:id/insertion-order` - Generate IOs

### Frontend Components

1. **API Client** (`src/api/campaigns.ts`)
   - HTTP client for campaign endpoints
   - Type-safe API calls

2. **React Hooks** (`src/hooks/useCampaigns.ts`)
   - `useCampaigns()` - Fetch campaigns list
   - `useCampaign(id)` - Fetch single campaign
   - `useAnalyzeCampaign()` - AI analysis
   - `useCreateCampaign()` - Create campaigns
   - `useGenerateInsertionOrder()` - Generate IOs

3. **UI Components** (To be implemented)
   - Campaign Builder wizard
   - Campaign list view
   - Insertion order viewer

---

## 🚀 How It Works

### Step 1: User Input

User provides campaign requirements:
```javascript
{
  hubId: "chicago-hub",
  objectives: {
    primaryGoal: "brand awareness",
    targetAudience: "Chicago residents 25-54",
    budget: {
      totalBudget: 50000,
      currency: "USD",
      billingCycle: "monthly"
    },
    channels: ["print", "website", "newsletter", "radio", "podcast"]
  },
  timeline: {
    startDate: "2026-01-01",
    endDate: "2026-06-30"
  },
  includeAllOutlets: true // Press Forward: include all publications
}
```

### Step 2: AI Analysis

**LLM Service Process:**

1. **Query Publications**
   ```javascript
   const publications = await db.publications.find({
     hubIds: "chicago-hub",
     // Filter by requested channels
   })
   ```

2. **Extract Hub Inventory**
   - Iterate through each publication's `distributionChannels`
   - Find items with `hubPricing` array containing `chicago-hub`
   - Check `available: true`
   - Extract pricing, specifications, audience metrics

3. **Build AI Prompt**
   - Include CAMPAIGN_INTELLIGENCE_GUIDE.md as system context
   - Provide campaign requirements
   - List all available inventory with pricing
   - Emphasize Press Forward principles if `includeAllOutlets: true`

4. **Call OpenAI API**
   ```javascript
   const completion = await openai.chat.completions.create({
     model: 'gpt-4-turbo-preview',
     messages: [
       { role: 'system', content: intelligenceGuide },
       { role: 'user', content: prompt }
     ],
     response_format: { type: "json_object" }
   })
   ```

5. **Parse Response**
   - Extract selected publications and inventory
   - Calculate totals and estimates
   - Return structured `CampaignAnalysisResponse`

### Step 3: Review & Create

User reviews AI-selected inventory:
- List of publications included
- Inventory items per publication
- Total cost breakdown
- Performance estimates

User confirms and creates campaign:
```javascript
const { campaign } = await campaignsApi.create({
  ...basicInfo,
  selectedInventory: analysisResponse.selectedInventory,
  pricing: analysisResponse.pricing,
  estimatedPerformance: analysisResponse.estimatedPerformance,
  status: 'draft'
})
```

### Step 4: Generate Insertion Order

Once campaign is created:
```javascript
const { insertionOrder } = await campaignsApi.generateInsertionOrder(
  campaign._id,
  'html' // or 'markdown'
)
```

Insertion order includes:
- Campaign header and details
- Advertiser information
- Selected publications and inventory
- Pricing breakdown
- Performance estimates
- Terms and conditions
- Contact information

---

## 📋 API Reference

### POST /api/campaigns/analyze

**Request:**
```json
{
  "hubId": "chicago-hub",
  "objectives": {
    "primaryGoal": "brand awareness",
    "targetAudience": "string",
    "budget": {
      "totalBudget": 50000,
      "currency": "USD",
      "billingCycle": "monthly"
    },
    "channels": ["print", "website"]
  },
  "timeline": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-06-30T00:00:00Z"
  },
  "includeAllOutlets": true,
  "excludeChannels": ["events", "social"]
}
```

**Response:**
```json
{
  "selectedInventory": {
    "publications": [...],
    "totalPublications": 25,
    "totalInventoryItems": 150,
    "selectionReasoning": "AI explanation",
    "confidence": 0.85
  },
  "pricing": {
    "subtotal": 50000,
    "total": 50000,
    "monthlyTotal": 8333,
    "currency": "USD"
  },
  "estimatedPerformance": {
    "reach": { "min": 500000, "max": 750000 },
    "impressions": { "min": 2000000, "max": 3000000 },
    "cpm": 16.67
  },
  "warnings": [],
  "suggestions": []
}
```

### POST /api/campaigns

Create a campaign with analyzed inventory.

### GET /api/campaigns

List campaigns with filters:
- `?hubId=chicago-hub`
- `?status=active`
- `?summaryOnly=true`

### GET /api/campaigns/:id

Get specific campaign details.

### PUT /api/campaigns/:id

Update campaign.

### PATCH /api/campaigns/:id/status

Update campaign status (`draft`, `pending_approval`, `approved`, `active`, `completed`).

### POST /api/campaigns/:id/insertion-order

Generate insertion order in HTML or Markdown format.

### DELETE /api/campaigns/:id

Soft delete a campaign.

---

## 🎨 Frontend Usage Examples

### Analyzing a Campaign

```typescript
import { useAnalyzeCampaign } from '@/hooks/useCampaigns';

function CampaignBuilder() {
  const { analyze, analyzing, result, error } = useAnalyzeCampaign();

  const handleAnalyze = async () => {
    const request = {
      hubId: 'chicago-hub',
      objectives: {
        primaryGoal: 'brand awareness',
        targetAudience: 'Chicago residents',
        budget: {
          totalBudget: 50000,
          currency: 'USD',
          billingCycle: 'monthly'
        }
      },
      timeline: {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30')
      },
      includeAllOutlets: true
    };

    await analyze(request);
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={analyzing}>
        {analyzing ? 'Analyzing...' : 'Analyze Campaign'}
      </button>
      
      {result && (
        <div>
          <h3>Selected: {result.selectedInventory.totalPublications} publications</h3>
          <p>Total: ${result.pricing.total.toLocaleString()}</p>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Creating a Campaign

```typescript
import { useCreateCampaign } from '@/hooks/useCampaigns';

function CreateCampaignButton({ analysisResult }) {
  const { create, creating, error } = useCreateCampaign();

  const handleCreate = async () => {
    const campaignData = {
      hubId: 'chicago-hub',
      hubName: 'Chicago Hub',
      basicInfo: {
        name: 'Summer Campaign 2026',
        description: 'Brand awareness campaign',
        advertiserName: 'Acme Corp',
        advertiserContact: {
          name: 'John Doe',
          email: 'john@acme.com'
        }
      },
      objectives: { /* from form */ },
      timeline: { /* from form */ },
      selectedInventory: analysisResult.selectedInventory,
      pricing: analysisResult.pricing,
      estimatedPerformance: analysisResult.estimatedPerformance,
      status: 'draft'
    };

    const campaign = await create(campaignData);
    // Navigate to campaign detail page
  };

  return (
    <button onClick={handleCreate} disabled={creating}>
      {creating ? 'Creating...' : 'Create Campaign'}
    </button>
  );
}
```

### Generating Insertion Order

```typescript
import { useGenerateInsertionOrder } from '@/hooks/useCampaigns';

function InsertionOrderButton({ campaignId }) {
  const { generate, generating } = useGenerateInsertionOrder();

  const handleGenerate = async (format: 'html' | 'markdown') => {
    const { insertionOrder } = await generate(campaignId, format);
    
    // Download or display
    const blob = new Blob([insertionOrder.content], {
      type: format === 'html' ? 'text/html' : 'text/markdown'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insertion-order-${campaignId}.${format}`;
    a.click();
  };

  return (
    <div>
      <button onClick={() => handleGenerate('html')} disabled={generating}>
        Download HTML
      </button>
      <button onClick={() => handleGenerate('markdown')} disabled={generating}>
        Download Markdown
      </button>
    </div>
  );
}
```

---

## ⚙️ Configuration

### Environment Variables

Required in `.env`:

```bash
# OpenAI API Key (required for LLM service)
OPENAI_API_KEY=sk-...

# MongoDB Connection
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=chicago-hub

# Frontend API URL
VITE_API_URL=http://localhost:3001/api
```

### OpenAI Model

Current configuration uses `gpt-4-turbo-preview` for optimal results. Can be changed in `server/campaignLLMService.ts`:

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview', // or 'gpt-4', 'gpt-3.5-turbo'
  ...
})
```

---

## 🧪 Testing the System

### Test Campaign Analysis

```bash
# Start server
npm run dev

# In another terminal, test the analyze endpoint
curl -X POST http://localhost:3001/api/campaigns/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "hubId": "chicago-hub",
    "objectives": {
      "primaryGoal": "brand awareness",
      "targetAudience": "Chicago residents",
      "budget": {
        "totalBudget": 50000,
        "currency": "USD",
        "billingCycle": "monthly"
      }
    },
    "timeline": {
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": "2026-06-30T00:00:00Z"
    },
    "includeAllOutlets": true
  }'
```

### Test with Sample Request

Example from user's request:
- All available media outlets
- Channels: print, website, newsletter, radio, podcast
- Budget: $50,000/month
- Duration: 6 months (Jan 1 - Jun 30, 2026)

This will query all publications, select inventory from specified channels, apply Press Forward principles to include all outlets, and return a comprehensive campaign plan.

---

## 📊 Database Collections

### campaigns

```javascript
{
  _id: ObjectId,
  campaignId: "campaign-abc123",
  hubId: "chicago-hub",
  hubName: "Chicago Hub",
  basicInfo: { name, description, advertiser info },
  objectives: { goals, audience, budget },
  timeline: { dates, duration },
  selectedInventory: { publications[], reasoning },
  pricing: { total, breakdown },
  estimatedPerformance: { reach, impressions, cpm },
  insertionOrder: { content, format, version },
  status: "draft|pending_approval|approved|active|completed",
  metadata: { createdBy, createdAt, version },
  deletedAt: null
}
```

### Indexes

- `campaignId` (unique)
- `hubId` (filter by hub)
- `status` (filter by status)
- `metadata.createdBy` (filter by user)
- `timeline.startDate` (sort by date)

---

## 🔒 Security & Access Control

- All endpoints require authentication (`authenticateToken` middleware)
- Users can only see their own campaigns (unless admin)
- Only admins can approve campaigns
- Creators can update their own campaigns
- Soft delete preserves data (deletedAt field)

---

## 🚧 Remaining Implementation

### Frontend Components Needed

1. **Campaign Builder Page** (`src/pages/CampaignBuilder.tsx`)
   - Multi-step wizard
   - Form inputs for campaign details
   - AI analysis trigger
   - Results display and review
   - Create campaign action

2. **Campaign List** (`src/components/campaign/CampaignList.tsx`)
   - Table/grid of campaigns
   - Filtering and search
   - Status badges
   - Quick actions

3. **Insertion Order Viewer** (`src/components/campaign/InsertionOrderViewer.tsx`)
   - HTML preview
   - Download options
   - Print functionality

4. **Routes** (`src/App.tsx`)
   - `/campaign-builder` - New campaign wizard
   - `/campaigns` - List view
   - `/campaigns/:id` - Detail view

5. **Navigation**
   - Add "Campaign Builder" to main navigation
   - Add to dashboard for quick access

---

## 💡 Best Practices

### For All-Inclusive Campaigns

Always set `includeAllOutlets: true` when user wants comprehensive coverage:

```javascript
{
  includeAllOutlets: true, // Press Forward: include ALL publications
  excludeChannels: ["events", "social"] // But exclude specific channels if needed
}
```

### Budget Management

If AI selects inventory exceeding budget, it will include warnings:

```javascript
{
  warnings: ["Total cost ($55,000) exceeds monthly budget ($50,000)"],
  suggestions: [
    "Consider extending campaign duration for better frequency rates",
    "Reduce channels to stay within budget"
  ]
}
```

### Channel Selection

Be specific about channels to get targeted results:

```javascript
objectives: {
  channels: ["print", "website", "newsletter"] // Only these channels
}

// vs

objectives: {
  // All channels available
}
```

---

## 📞 Support

For questions or issues:
- Check `CAMPAIGN_INTELLIGENCE_GUIDE.md` for AI context
- Review API responses for warnings/suggestions
- Check server logs for LLM prompts and responses
- Test with smaller budgets first

---

## 🎉 Success Story Example

**Campaign:** Summer Brand Awareness  
**Budget:** $50,000/month × 6 months = $300,000  
**Channels:** Print, Website, Newsletter, Radio, Podcast  
**Approach:** All-inclusive (Press Forward)

**Results:**
- 25 publications selected
- 150 ad placements across 5 channels
- Estimated reach: 500,000-750,000 people
- Estimated impressions: 2-3 million
- CPM: $16.67
- Confidence: 85%

**Insertion Order:** Professional HTML document generated automatically with all details, ready to send to client for approval.

---

**Remember:** The Campaign Builder isn't just creating ad campaigns — it's investing in democratic infrastructure for Chicago's communities. 🏙️📰


