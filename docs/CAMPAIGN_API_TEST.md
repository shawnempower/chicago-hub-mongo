# Campaign Builder API Test

## Test Campaign Analysis Endpoint

### Request Payload Structure

```json
{
  "hubId": "chicago-hub",
  "objectives": {
    "primaryGoal": "brand awareness",
    "targetAudience": "Small business owners in Chicago, ages 30-55, interested in local commerce",
    "geographicTarget": ["Chicago", "South Side"],
    "budget": {
      "totalBudget": 50000,
      "currency": "USD",
      "billingCycle": "monthly"
    },
    "channels": ["print", "website", "newsletter"]
  },
  "timeline": {
    "startDate": "2026-01-01T06:00:00.000Z",
    "endDate": "2026-06-30T06:00:00.000Z"
  },
  "includeAllOutlets": true
}
```

### Test Command

**Note:** Replace `YOUR_AUTH_TOKEN` with your actual JWT token from localStorage.

```bash
curl -X POST 'http://localhost:3001/api/campaigns/analyze' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "hubId": "chicago-hub",
    "objectives": {
      "primaryGoal": "brand awareness",
      "targetAudience": "Small business owners in Chicago, ages 30-55, interested in local commerce",
      "geographicTarget": ["Chicago", "South Side"],
      "budget": {
        "totalBudget": 50000,
        "currency": "USD",
        "billingCycle": "monthly"
      },
      "channels": ["print", "website", "newsletter"]
    },
    "timeline": {
      "startDate": "2026-01-01T06:00:00.000Z",
      "endDate": "2026-06-30T06:00:00.000Z"
    },
    "includeAllOutlets": true
  }'
```

### Expected Response Structure

```json
{
  "selectedInventory": {
    "publications": [
      {
        "publicationId": 123,
        "publicationName": "Chicago Sun-Times",
        "inventoryItems": [
          {
            "channel": "print",
            "itemPath": "distributionChannels.print[0].advertisingOpportunities[0]",
            "itemName": "Full Page Ad",
            "quantity": 1,
            "duration": "6 months",
            "frequency": "monthly",
            "specifications": {
              "size": "10x13",
              "format": "print"
            },
            "itemPricing": {
              "standardPrice": 5000,
              "hubPrice": 4000,
              "pricingModel": "per_ad"
            }
          }
        ],
        "publicationTotal": 24000
      }
    ],
    "totalPublications": 25,
    "totalInventoryItems": 150,
    "channelBreakdown": {
      "print": 50,
      "website": 60,
      "newsletter": 40
    },
    "selectionReasoning": "This package includes all available Chicago Hub publications...",
    "confidence": 0.9,
    "selectionDate": "2026-01-01T00:00:00.000Z"
  },
  "pricing": {
    "subtotal": 48500,
    "hubDiscount": 0,
    "discountAmount": 0,
    "total": 48500,
    "monthlyTotal": 48500,
    "currency": "USD",
    "breakdown": {
      "byChannel": {
        "print": 20000,
        "website": 18000,
        "newsletter": 10500
      }
    }
  },
  "estimatedPerformance": {
    "reach": {
      "min": 500000,
      "max": 750000,
      "description": "500,000 - 750,000 people"
    },
    "impressions": {
      "min": 2000000,
      "max": 3000000
    },
    "cpm": 16.17
  }
}
```

### Server Logs to Check

When the request is made, you should see:

```bash
📊 Starting campaign analysis for hub: chicago-hub
Found 25 publications with hub inventory
🤖 Calling OpenAI API...
📊 Publications to analyze: 25
🔑 API Key present: true
🔑 API Key first chars: sk-proj-AB...
✅ Received response from OpenAI
Campaign analysis complete {
  publications: 25,
  items: 150,
  total: 48500
}
```

### Common Errors

#### 1. Missing Auth Token
**Error:**
```json
{
  "error": "No token provided"
}
```
**Fix:** Add Authorization header with Bearer token

#### 2. OpenAI API Key Not Set
**Error:**
```json
{
  "error": "OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file."
}
```
**Fix:** Add `OPENAI_API_KEY=sk-proj-...` to `.env` and restart server

#### 3. Invalid OpenAI API Key
**Error:**
```json
{
  "error": "Campaign analysis failed: Incorrect API key provided..."
}
```
**Fix:** Check your OpenAI API key is valid and has credits

#### 4. No Publications Found
**Error:**
```json
{
  "error": "No publications found with hub inventory for this hub"
}
```
**Fix:** Ensure publications in MongoDB have `hubIds: ["chicago-hub"]` and hub pricing

### Quick Test from Browser Console

```javascript
// Get your auth token
const token = localStorage.getItem('auth_token');

// Make the request
fetch('http://localhost:3001/api/campaigns/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    hubId: "chicago-hub",
    objectives: {
      primaryGoal: "brand awareness",
      targetAudience: "Small business owners in Chicago",
      geographicTarget: ["Chicago"],
      budget: {
        totalBudget: 50000,
        currency: "USD",
        billingCycle: "monthly"
      },
      channels: ["print", "website", "newsletter"]
    },
    timeline: {
      startDate: new Date('2026-01-01').toISOString(),
      endDate: new Date('2026-06-30').toISOString()
    },
    includeAllOutlets: true
  })
})
.then(r => r.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

### Testing Checklist

- [ ] Server is running (`npm run server:dev`)
- [ ] `.env` has `OPENAI_API_KEY` set
- [ ] Server logs show `OPENAI_API_KEY: SET (sk-proj-...)`
- [ ] User is authenticated (token in localStorage)
- [ ] Chicago Hub exists in database with publications
- [ ] Publications have hub pricing with `hubId: "chicago-hub"`
- [ ] OpenAI API key has available credits

### Minimal Test Payload

For quick testing:

```json
{
  "hubId": "chicago-hub",
  "objectives": {
    "primaryGoal": "brand awareness",
    "targetAudience": "Chicago residents",
    "budget": {
      "totalBudget": 10000,
      "currency": "USD",
      "billingCycle": "monthly"
    },
    "channels": ["print"]
  },
  "timeline": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-03-31T23:59:59.999Z"
  },
  "includeAllOutlets": false
}
```


