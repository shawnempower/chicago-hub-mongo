# Campaign Builder LLM Configuration Guide

Quick reference for tweaking the AI behavior without restarting the server.

## 📝 Configuration File

Edit: **`server/campaignLLMConfig.ts`**

This file controls all LLM behavior including:
- Model selection (GPT-4, GPT-3.5, etc.)
- Temperature (creativity)
- Token limits
- Press Forward enforcement
- System prompts
- Output preferences

## 🚀 Quick Start

### Method 1: Edit Config File (Permanent)

Open `server/campaignLLMConfig.ts` and modify `defaultLLMConfig`:

```typescript
export const defaultLLMConfig: CampaignLLMConfig = {
  model: {
    name: 'gpt-4', // Change model here
    temperature: 0.5, // Adjust creativity (0-1)
    maxTokens: 3000,
  },
  
  pressForward: {
    enforceAllOutlets: false, // Toggle strict Press Forward
    allowBudgetExceeding: true,
  },
  
  // ... more settings
};
```

**Then reload without restarting:**
```bash
curl -X POST http://localhost:3001/api/campaigns/llm-config/reload \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Method 2: Use Presets (Quick Testing)

Set environment variable before starting server:

```bash
# Fast preset (GPT-3.5, quicker responses)
LLM_PRESET=fast npm run server:dev

# Flexible preset (less strict, more creative)
LLM_PRESET=flexible npm run server:dev

# Detailed preset (maximum reasoning)
LLM_PRESET=detailed npm run server:dev

# Conservative preset (strict Press Forward)
LLM_PRESET=conservative npm run server:dev
```

Or reload a preset at runtime:
```bash
curl -X POST http://localhost:3001/api/campaigns/llm-config/reload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preset": "fast"}'
```

### Method 3: Environment Variables (Override Specific Values)

Add to `.env` file:

```bash
# Model settings
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.8
LLM_MAX_TOKENS=5000

# Behavior
LLM_ENFORCE_ALL_OUTLETS=false
LLM_PRESET=flexible
```

Restart server to apply.

### Method 4: Runtime Updates via API (Quick Tweaks)

Update specific config values without editing files:

```bash
curl -X PATCH http://localhost:3001/api/campaigns/llm-config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": {
      "temperature": 0.9
    },
    "pressForward": {
      "enforceAllOutlets": false
    }
  }'
```

## 📊 View Current Config

```bash
curl http://localhost:3001/api/campaigns/llm-config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or from browser console:
```javascript
fetch('http://localhost:3001/api/campaigns/llm-config', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
})
.then(r => r.json())
.then(data => console.log(data.config));
```

## ⚙️ Key Configuration Options

### Model Settings

```typescript
model: {
  name: 'gpt-4-turbo-preview', // or 'gpt-4', 'gpt-3.5-turbo'
  temperature: 0.7,              // 0.0 = consistent, 1.0 = creative
  maxTokens: 4000,              // Response length limit
}
```

**Recommendations:**
- **Testing**: Use `gpt-3.5-turbo` + `temperature: 0.5` for fast iteration
- **Production**: Use `gpt-4-turbo-preview` + `temperature: 0.7` for quality
- **Consistency**: Lower temperature (0.3-0.5) for repeatable results
- **Creativity**: Higher temperature (0.7-0.9) for diverse selections

### Press Forward Behavior

```typescript
pressForward: {
  enforceAllOutlets: true,      // Strict "include all" when requested
  prioritizeSmallOutlets: true, // Give weight to smaller publications
  allowBudgetExceeding: true,   // Suggest packages above budget
  maxBudgetExceedPercent: 25,   // Maximum % over budget (25 = 25%)
}
```

**Use Cases:**
- `enforceAllOutlets: true` → Strict Press Forward compliance
- `allowBudgetExceeding: true` → Show comprehensive packages, suggest adjustments
- `prioritizeSmallOutlets: false` → Focus on reach efficiency

### Selection Constraints

```typescript
selection: {
  minPublications: 5,           // Minimum publications to include
  maxPublications: 50,          // Maximum publications to include
  minChannelDiversity: 2,       // Minimum different channel types
  preferredFrequencyTier: 'auto' // or '1x', '6x', '12x'
}
```

### Output Preferences

```typescript
output: {
  includeReasoning: true,       // Include AI's decision reasoning
  minReasoningLength: 200,      // Min characters in reasoning
  includeConfidenceScore: true, // Include confidence score (0-1)
  verboseLogging: true          // Detailed console logs
}
```

## 🎯 Common Tweaks

### Make AI More Aggressive (Include More Outlets)

```typescript
pressForward: {
  enforceAllOutlets: true,
  allowBudgetExceeding: true,
  maxBudgetExceedPercent: 50
},
selection: {
  minPublications: 10,
  maxPublications: 100
}
```

### Make AI More Conservative (Budget-Focused)

```typescript
pressForward: {
  enforceAllOutlets: false,
  allowBudgetExceeding: false,
  maxBudgetExceedPercent: 0
},
selection: {
  minPublications: 3,
  maxPublications: 20
}
```

### Speed Up Testing (Cheaper, Faster Model)

```typescript
model: {
  name: 'gpt-3.5-turbo',
  temperature: 0.5,
  maxTokens: 2000
}
```

### Get More Detailed Explanations

```typescript
model: {
  maxTokens: 6000
},
output: {
  includeReasoning: true,
  minReasoningLength: 500,
  verboseLogging: true
}
```

## 📝 Custom Prompts

Edit the system prompt in `campaignLLMConfig.ts`:

```typescript
systemPrompt: {
  roleDescription: 'Your custom role description here...',
  additionalInstructions: `
    YOUR CUSTOM INSTRUCTIONS:
    - Always prioritize X
    - Never do Y
    - Consider Z when selecting inventory
  `
}
```

## 🔄 Workflow for Quick Iteration

1. **Edit** `server/campaignLLMConfig.ts`
2. **Save** the file
3. **Reload** via API:
   ```bash
   curl -X POST http://localhost:3001/api/campaigns/llm-config/reload \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
4. **Test** in Campaign Builder
5. **Repeat** without restarting server!

## 🧪 Test Different Configs

```bash
# Terminal 1 - Start server
npm run server:dev

# Terminal 2 - Test preset 1
curl -X POST .../llm-config/reload -d '{"preset":"fast"}'
# Use Campaign Builder, observe results

# Terminal 2 - Test preset 2
curl -X POST .../llm-config/reload -d '{"preset":"detailed"}'
# Use Campaign Builder, compare results
```

## 🐛 Debugging

### View Config in Console
```javascript
// In browser console
fetch('http://localhost:3001/api/campaigns/llm-config', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
}).then(r => r.json()).then(console.log);
```

### Check Server Logs
When `verboseLogging: true`, you'll see:
```
🤖 Calling OpenAI API...
📊 Publications to analyze: 25
⚙️  Model: gpt-4-turbo-preview
🌡️  Temperature: 0.7
🎯 Preset: default
```

### Test Config Changes
```bash
# 1. Update temperature
curl -X PATCH http://localhost:3001/api/campaigns/llm-config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": {"temperature": 0.9}}'

# 2. Run a test campaign
# 3. Check if AI behavior changed
# 4. Revert if needed
curl -X POST http://localhost:3001/api/campaigns/llm-config/reload \
  -H "Authorization: Bearer $TOKEN"
```

## 📚 Available Presets

| Preset | Model | Temp | Use Case |
|--------|-------|------|----------|
| `default` | GPT-4 Turbo | 0.7 | Balanced, production-ready |
| `conservative` | GPT-4 Turbo | 0.3 | Strict Press Forward, consistent |
| `flexible` | GPT-4 Turbo | 0.9 | Creative, allows more AI freedom |
| `fast` | GPT-3.5 Turbo | 0.7 | Quick testing, lower cost |
| `detailed` | GPT-4 Turbo | 0.7 | Maximum explanation & reasoning |

## 💡 Pro Tips

1. **A/B Testing**: Use different presets for same request, compare results
2. **Cost Saving**: Use `fast` preset during development, `default` in production
3. **Fine-tuning**: Start with a preset, then tweak specific values
4. **Version Control**: Document which config produces best results
5. **Hot Reload**: Change config, reload, test - all without restarting!

## 🆘 Troubleshooting

**Config changes not taking effect?**
- Run reload endpoint: `POST /api/campaigns/llm-config/reload`
- Check server logs for "🔄 LLM Config reloaded"

**Getting inconsistent results?**
- Lower temperature (0.3-0.5)
- Use `conservative` preset

**AI not including all outlets?**
- Set `enforceAllOutlets: true`
- Check `includeAllOutlets` is true in request

**Responses too short/long?**
- Adjust `maxTokens` (2000-6000)
- Modify `minReasoningLength`

**OpenAI rate limits?**
- Use `fast` preset (GPT-3.5)
- Reduce `maxTokens`
- Add delays between tests

---

**Happy tweaking! 🎛️**


