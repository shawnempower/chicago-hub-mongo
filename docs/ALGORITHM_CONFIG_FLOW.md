# Algorithm Configuration Flow - From Database to LLM

## ✅ YES - The LLM Service Uses Database Configurations!

The campaign analysis system **fully integrates** database-stored algorithm configurations. Here's the complete flow:

---

## Flow Diagram

```
1. User Creates Campaign
   ↓
2. campaignLLMService.analyzeCampaign(request)
   ↓
3. getAlgorithmMerged(algorithmId) 
   ├─ Loads code defaults from registry
   ├─ Queries MongoDB: algorithm_configs.findOne({ algorithmId })
   └─ Deep merges DB overrides into code defaults
   ↓
4. Merged config used throughout analysis:
   ├─ algorithm.llmConfig → LLM model settings
   ├─ algorithm.constraints → Budget rules, pruning passes
   ├─ algorithm.scoring → Weighting factors
   └─ algorithm.promptInstructions → Custom prompt text
   ↓
5. Campaign generated with merged configuration
```

---

## Code Evidence

### 1. Import Statement (Line 22)
```typescript
import { getAlgorithmMerged, getDefaultAlgorithm } from './campaignAlgorithms/registry';
```

### 2. Loading Merged Config (Line 890)
```typescript
const algorithmId: AlgorithmType = request.algorithm || getDefaultAlgorithm();
const algorithm = await getAlgorithmMerged(algorithmId);  // ← Loads from DB!
```

### 3. How `getAlgorithmMerged` Works (registry.ts)
```typescript
export async function getAlgorithmMerged(algorithmId: AlgorithmType): Promise<AlgorithmConfig> {
  const base = getAlgorithm(algorithmId);  // Code defaults
  try {
    const db = getDatabase();
    const doc = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).findOne({ algorithmId });
    if (!doc) return base;  // No override? Use code defaults
    
    // Deep merge: DB overrides win
    const merged: AlgorithmConfig = {
      ...base,
      name: doc.name || base.name,
      description: doc.description || base.description,
      icon: doc.icon || base.icon,
      llmConfig: { ...(base.llmConfig || {}), ...(doc.llmConfig || {}) },
      constraints: { ...(base.constraints || {}), ...(doc.constraints || {}) },
      scoring: { ...(base.scoring || {}), ...(doc.scoring || {}) },
      promptInstructions: doc.promptInstructions || base.promptInstructions
    };
    return merged;
  } catch (e) {
    console.warn('⚠️  Failed to load algorithm override from DB:', (e as Error).message);
    return base;  // Fallback to code defaults on error
  }
}
```

---

## Where Merged Config is Used

### 1. **LLM Configuration** (Line 900)
```typescript
// Use algorithm-specific LLM config
llmConfig = { ...llmConfig, ...algorithm.llmConfig };
```
**What's affected:**
- `model.maxTokens` - Max tokens for LLM response
- `model.temperature` - LLM creativity/randomness
- `pressForward.allowBudgetExceeding` - Whether to allow over-budget
- `pressForward.maxBudgetExceedPercent` - Max % over budget
- `selection.maxPublications` - Max publications to select
- `output.verboseLogging` - Debug logging level

### 2. **Prompt Instructions** (Line 322)
```typescript
${algorithm.promptInstructions}
```
**What's affected:**
- Custom prompt text from database
- Falls back to code default if not overridden
- Completely replaces the algorithm's strategy instructions

### 3. **Budget Constraints in Prompt** (Lines 330-336, 445-450)
```typescript
⛔ THE ONE ABSOLUTE RULE: TOTAL ≤ $${objectives.budget.totalBudget.toLocaleString()}
   - maxBudgetExceedPercent = ${algorithm.constraints.maxBudgetExceedPercent || 0}%
   - Maximum allowed: $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}
```
**What's affected:**
- Maximum allowed budget (with tolerance)
- Used in multiple places in the prompt
- LLM sees these values and must comply

### 4. **Pruning Passes** (Line 970)
```typescript
const maxPrunePasses = Math.max(0, Math.min(4, (algorithm.constraints as any)?.pruningPassesMax ?? 3));
let pass = 0;
while (pass < maxPrunePasses && this.needsPruning(llmResponse, request, algorithm.constraints as any)) {
  pass++;
  // ... run pruning pass
}
```
**What's affected:**
- Number of pruning iterations (0-4)
- Configurable per algorithm via admin UI
- Directly impacts budget compliance

### 5. **Pruning Constraints** (Line 972-974)
```typescript
while (pass < maxPrunePasses && this.needsPruning(llmResponse, request, algorithm.constraints as any)) {
  // ...
  const prunePrompt = this.buildPruningPrompt(llmResponse, request, algorithm.constraints as any);
}
```
**What's affected:**
- `constraints.maxPublicationPercent` - Max % per pub
- `constraints.minPublicationSpend` - Min $ per pub
- `constraints.strictBudget` - Enforce strict limits
- Used to check if pruning is needed
- Used to build pruning instructions

### 6. **Web Inventory Availability** (Lines 381-386)
```typescript
**WEB IMPRESSIONS AVAILABILITY: ${(algorithm.constraints.webInventoryAvailability || 0.30) * 100}%**
- Only ${(algorithm.constraints.webInventoryAvailability || 0.30) * 100}% of monthly web impressions are available for ANY SINGLE campaign
```
**What's affected:**
- Limits web inventory allocation
- Prevents over-allocation
- Used in prompt to guide LLM

---

## What You Can Configure

### Via Admin UI → Database → LLM

| Admin UI Field | Database Field | LLM Impact |
|----------------|----------------|------------|
| **Name** | `name` | Display name in UI |
| **Description** | `description` | Display text in UI |
| **Max Publications** | `constraints.maxPublications` | Selection limit |
| **Min Publications** | `constraints.minPublications` | Selection target |
| **Strict Budget** | `constraints.strictBudget` | Budget enforcement |
| **Max Budget Exceed %** | `constraints.maxBudgetExceedPercent` | Budget tolerance |
| **Max Publication %** | `constraints.maxPublicationPercent` | Per-pub cap (25%) |
| **Min Publication Spend** | `constraints.minPublicationSpend` | Per-pub minimum ($500) |
| **Pruning Passes Max** | `constraints.pruningPassesMax` | Pruning iterations (0-4) |
| **Temperature** | `llmConfig.model.temperature` | LLM creativity |
| **Max Tokens** | `llmConfig.model.maxTokens` | Response length |
| **Allow Budget Exceeding** | `llmConfig.pressForward.allowBudgetExceeding` | Over-budget permission |
| **Prompt Instructions** | `promptInstructions` | Complete prompt override |

---

## Testing the Integration

### 1. Modify an Algorithm via Admin UI
```
1. Go to /admin → Algorithms tab
2. Edit "Proportional" algorithm
3. Change "Pruning Passes Max" from 3 to 1
4. Save
```

### 2. Check Database
```javascript
db.algorithm_configs.findOne({ algorithmId: "proportional" })
// Should show: { ..., constraints: { pruningPassesMax: 1 }, ... }
```

### 3. Create a Campaign
```
1. Create new campaign using "Proportional" algorithm
2. Check server logs - should show:
   "✂️  Running pruning pass 1/1..." (NOT 1/3)
```

### 4. Verify It Worked
The campaign should:
- Use the new pruning pass count
- Apply all other DB overrides
- Show in server logs which config was used

---

## Fallback Behavior

If database is unavailable or no override exists:
1. ✅ System continues to work
2. ✅ Uses code defaults from `server/campaignAlgorithms/*/config.ts`
3. ⚠️  Logs warning: `"⚠️  Failed to load algorithm override from DB"`
4. ✅ No crash or error to user

This ensures **production resilience** - database issues don't break campaigns.

---

## Summary

### ✅ What IS Using Database Configs:
1. **Campaign LLM Service** - Main campaign analysis
2. **Prompt Generation** - Budget limits, constraints
3. **Pruning System** - Iteration count, thresholds
4. **LLM Model Settings** - Temperature, tokens
5. **Admin Endpoints** - List/edit/save algorithms

### ❌ What is NOT Using Database Configs:
1. ~~Algorithm dropdown in UI~~ - Uses code defaults for display (intentional)
2. ~~Historical campaigns~~ - Already saved with their config snapshot

### 🎯 End Result:
**Database configs fully control campaign generation behavior in real-time!**

Change a setting in admin UI → Save → Next campaign uses new settings. No code deploy needed! 🚀

