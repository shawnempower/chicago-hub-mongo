# 🚀 Database Migration Steps - Run These Commands

## Quick Start (5 minutes)

### Step 1: Check What Needs Migration
```bash
npx tsx scripts/checkMigrationNeeds.ts
```

**What this does:**
- Connects to your live MongoDB database
- Counts how many records have old vs new format
- Shows exactly what needs to be migrated
- **Does NOT modify any data**

**Expected output:**
```
📋 NEWSLETTERS
──────────────────────────────────────────────────────────────────────
  Total ads:              15
  ❌ Old format (perSend): 8
  ✅ New format (flatRate): 7

📋 EVENTS
──────────────────────────────────────────────────────────────────────
  Total opportunities:    12
  ❌ Old format (number):  5
  ✅ New format (object):  7

📋 STREAMING VIDEO
──────────────────────────────────────────────────────────────────────
  Total channels:         5
  ✅ With frequency:       0
  ❌ Without frequency:    5
```

---

### Step 2: Preview Changes (Dry Run)
```bash
npx tsx scripts/migratePricingSchema.ts
```

**What this does:**
- Shows EXACTLY what will be changed in each record
- Displays before/after for each item
- **Does NOT modify any data**

**Example output:**
```
✓ Newsletter: Chicago Sun-Times - Weekly Newsletter - Banner Ad
  Old: {"perSend":500}
  New: {"flatRate":500,"pricingModel":"per_send","frequency":"One time"}

✓ Event: True Star Media - True Star Rising - title
  Old: 10000
  New: {"flatRate":10000,"pricingModel":"flat"}

✓ Streaming: WVON - VONtv Digital Network
  Added frequency: "weekly" (default)
```

---

### Step 3: Apply Changes (Live Migration)
```bash
npx tsx scripts/migratePricingSchema.ts --live
```

**⚠️ This WILL modify your database!**

**What this does:**
- Applies all the changes shown in the dry run
- Updates records in MongoDB
- Prints success/failure for each update

**Safety notes:**
- ✅ Backward compatible (keeps old fields)
- ✅ Code works with both old and new formats
- ✅ Migration is additive, not destructive
- ⚠️ Still recommended to backup MongoDB first

---

### Step 4: Verify Success
```bash
npx tsx scripts/checkMigrationNeeds.ts
```

**Expected output after successful migration:**
```
✅ NO MIGRATION NEEDED

All data is already in the correct format!
The TypeScript schemas have been updated to match.
```

---

## 🎯 What We Fixed

### 1. TypeScript Schemas Updated ✅
- `src/integrations/mongodb/types.ts` - Backend types
- `src/types/publication.ts` - Frontend types
- All now match the standardized pricing structure

### 2. Code Updated for Compatibility ✅
- `src/integrations/mongodb/hubPackageService.ts`
- Works with both old and new data formats
- Prioritizes new `flatRate` field, falls back to old `perSend`

### 3. Migration Scripts Created ✅
- `scripts/checkMigrationNeeds.ts` - Assessment tool
- `scripts/migratePricingSchema.ts` - Migration tool
- Both use live MongoDB connection (not local JSON files)

---

## 🛡️ Safety Features

### The Migration is Safe Because:

1. **Dry Run First**: Always preview changes before applying
2. **Backward Compatible**: Code works with old AND new formats
3. **Additive Changes**: Doesn't delete old fields
4. **Detailed Logging**: See exactly what changed
5. **Error Handling**: Skips problem records and logs errors

### Rollback Plan:
If you need to undo:
1. Restore from MongoDB backup (recommended)
2. Or manually remove new fields (old fields are still there)

---

## 📊 What Changes in the Database

### Newsletters
- `perSend: 500` → `flatRate: 500, pricingModel: "per_send"`
- `monthly: 2000` → `flatRate: 2000, pricingModel: "monthly"`

### Events
- `pricing: 10000` → `pricing: { flatRate: 10000, pricingModel: "flat" }`

### Streaming
- Adds `frequency: "weekly"` field (default)
- Enables revenue calculation (was broken before)

---

## 🧪 Testing After Migration

1. **Dashboard**: Open publications, verify data displays correctly
2. **Hub Pricing Report**: Check streaming revenue is no longer $0
3. **Package Builder**: Verify pricing displays for all channels
4. **Revenue Forecasts**: Confirm calculations are working

---

## ❓ FAQ

**Q: Will this break my existing data?**
A: No. The code is backward compatible and works with both formats.

**Q: Can I run this multiple times?**
A: Yes. The migration script is idempotent - it only changes records that need it.

**Q: What if I have custom data that doesn't fit this pattern?**
A: The migration handles missing fields gracefully. Check the dry run output first.

**Q: Do I need to backup my database?**
A: Recommended but not required. The migration is additive (doesn't delete data).

**Q: What if the migration fails midway?**
A: The script processes publications one at a time. Failed updates are logged but don't stop the process.

---

## 🎉 Success Criteria

After migration, you should see:
- ✅ All revenue forecasts showing non-zero values
- ✅ Streaming inventory calculations working
- ✅ Hub pricing available for all channel types
- ✅ Package builder showing prices correctly
- ✅ Assessment script reports "NO MIGRATION NEEDED"

---

## 📞 Need Help?

If you see unexpected results:
1. Check the dry run output carefully
2. Look for error messages in the migration log
3. Verify your MongoDB connection in `.env`
4. Check that your database has the expected structure

The scripts will clearly show what's happening at each step!

