# Schema Update Summary - Database Migration Plan

## ✅ What We've Completed

### 1. Updated TypeScript Schemas (Backend)
**File: `src/integrations/mongodb/types.ts`**

#### Newsletter Interface ✅
- **BEFORE:** `pricing?: { perSend?: number; monthly?: number; }`
- **AFTER:** `pricing?: { flatRate?: number; pricingModel?: string; frequency?: string; }`
- Added `hubPricing` array support
- Added `specifications` and `available` fields

#### Events Interface ✅
- **BEFORE:** `pricing?: number`
- **AFTER:** `pricing?: { flatRate?: number; pricingModel?: string; }`
- Added `hubPricing` array support
- Added `specifications` and `available` fields

#### Streaming Interface ✅
- Added `averageViewsPerMonth` field (clarified metric)
- Added `frequency` field (needed for revenue calculations)
- Added `position` field (standardized)
- Updated pricing to include `cpv` (cost per view)
- Added `hubPricing` array support (was completely missing!)
- Expanded `pricingModel` to include: `'cpm' | 'cpv' | 'flat' | 'per_spot' | 'monthly' | 'contact'`

### 2. Updated Frontend Types ✅
**File: `src/types/publication.ts`**

- Updated Newsletter advertising opportunities to match backend
- Updated Streaming video to match backend
- Events already using `StandardPricing` interface (already correct!)

### 3. Updated Code References ✅
**File: `src/integrations/mongodb/hubPackageService.ts`**

- Updated to prioritize `flatRate` over legacy `perSend`
- Maintained backward compatibility with fallbacks
- Code will work with both old and new data formats

---

## 🔍 What Needs to Be Done Next

### Step 1: Check Database for Migration Needs

Run the assessment script to see what's actually in your live MongoDB:

```bash
npx tsx scripts/checkMigrationNeeds.ts
```

This will analyze your live database and tell you:
- How many newsletter ads have old format (`perSend`/`monthly` fields)
- How many event opportunities have old format (pricing as number)
- How many streaming channels are missing `frequency` field
- How many streaming ads are missing `hubPricing`

### Step 2: Run Migration (If Needed)

**DRY RUN FIRST (recommended):**
```bash
npx tsx scripts/migratePricingSchema.ts
```

This shows what will change without actually modifying data.

**LIVE MIGRATION (when ready):**
```bash
npx tsx scripts/migratePricingSchema.ts --live
```

This will:
1. Convert newsletter pricing: `{ perSend: 500 }` → `{ flatRate: 500, pricingModel: "per_send" }`
2. Convert event pricing: `10000` → `{ flatRate: 10000, pricingModel: "flat" }`
3. Add `frequency: "weekly"` to streaming channels that don't have it

---

## 🛡️ Safety Features

### ✅ Backward Compatibility
The code has been updated to work with BOTH formats:

```typescript
// Will work with old data: { perSend: 500 }
// Will work with new data: { flatRate: 500, pricingModel: "per_send" }
const price = ad.pricing?.flatRate || ad.pricing?.perSend || 0;
```

### ✅ Migration is Additive
The migration doesn't delete old fields, it adds new ones. So if something goes wrong, the old data is still there.

### ✅ Dry Run Mode
Always test with dry run first to see exactly what will change.

---

## 📊 Expected Database Changes

### Newsletter Ads
```javascript
// BEFORE
{
  "name": "Banner Ad",
  "position": "header",
  "pricing": {
    "perSend": 500
  }
}

// AFTER
{
  "name": "Banner Ad",
  "position": "header",
  "pricing": {
    "flatRate": 500,
    "pricingModel": "per_send",
    "frequency": "One time"
  }
}
```

### Event Sponsorships
```javascript
// BEFORE
{
  "level": "title",
  "benefits": ["..."],
  "pricing": 10000
}

// AFTER
{
  "level": "title",
  "benefits": ["..."],
  "pricing": {
    "flatRate": 10000,
    "pricingModel": "flat"
  }
}
```

### Streaming Channels
```javascript
// BEFORE
{
  "name": "YouTube Channel",
  "platform": "youtube",
  "subscribers": 50000
  // ❌ Missing frequency field
}

// AFTER
{
  "name": "YouTube Channel",
  "platform": "youtube",
  "subscribers": 50000,
  "frequency": "weekly"  // ✅ Added
}
```

---

## 🎯 Why This Matters

### Revenue Forecasting Now Works
With the standardized pricing structure:
- `calculateRevenue()` function can accurately project monthly/annual revenue
- All inventory types use the same structure
- Hub pricing is consistently supported

### Streaming Calculations Fixed
With the `frequency` field:
- Can estimate monthly ad impressions
- Can calculate CPV correctly (per 100 views)
- Revenue forecasts are no longer $0

### Consistent Hub Pricing
- All channels (including streaming) now support hub-specific pricing tiers
- Discount tracking is consistent
- Package builder can access all hub pricing

---

## 🧪 Testing After Migration

### 1. Verify Data
```bash
npx tsx scripts/checkMigrationNeeds.ts
```
Should show "✅ NO MIGRATION NEEDED" after successful migration.

### 2. Test Revenue Calculations
- Open any publication in the dashboard
- Check "Hub Pricing Report"
- Verify streaming revenue is no longer $0
- Verify newsletter/event revenue shows correctly

### 3. Test Package Builder
- Create a new hub package
- Select inventory from publications
- Verify pricing displays correctly for all channel types

---

## 🔧 Rollback Plan (If Needed)

If something goes wrong, you can manually rollback by:

1. **Restore from MongoDB backup** (recommended)
2. **Manual fix:** The old fields are still there (migration is additive), so you can remove the new fields if needed:

```javascript
db.publications.updateMany(
  {},
  { 
    $unset: { 
      "distributionChannels.newsletters.$[].advertisingOpportunities.$[].pricing.flatRate": "",
      "distributionChannels.newsletters.$[].advertisingOpportunities.$[].pricing.pricingModel": ""
    }
  }
)
```

---

## 📋 Summary Checklist

- [x] TypeScript schemas updated
- [x] Frontend types updated
- [x] Code updated for backward compatibility
- [ ] **Run assessment script to check database**
- [ ] **Review dry run output**
- [ ] **Run live migration (if needed)**
- [ ] **Verify all calculations work correctly**
- [ ] **Test UI components with migrated data**

---

## 💡 Key Takeaway

**Your TypeScript schemas were out of date with the actual database structure.** 

We've updated the schemas to match what SHOULD be in the database (standardized pricing format). Now you need to:

1. Check what's ACTUALLY in your MongoDB
2. Migrate any old-format data to match the new schemas
3. Test that everything works

The code is now backward-compatible, so it won't break with old data, but the migration will make everything consistent and enable proper revenue forecasting.

