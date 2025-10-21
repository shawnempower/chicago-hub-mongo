# Pricing Schema Migration Guide

## Overview

This guide explains how to migrate existing publication pricing data from the old schema (with multiple price fields) to the new clean schema (single `flatRate` field + `pricingModel` field).

## What Changed?

### Old Schema (Legacy)
Different inventory types had different price field names:
```json
{
  "pricing": {
    "perPost": 100,
    "perStory": 75,
    "monthly": 500
  }
}
```

### New Schema (Clean)
All inventory types now use the same structure:
```json
{
  "pricing": {
    "flatRate": 100,
    "pricingModel": "per_post"
  }
}
```

## Pricing Model Values

- **Website**: `flat_rate`, `flat`, `per_week`, `per_day`, `cpm`, `cpc`, `contact`
- **Newsletter**: `per_send`, `contact`
- **Print**: `per_ad`, `contact`
- **Podcast/Radio**: `per_spot`, `cpm`, `per_ad`, `contact`
- **Social Media**: `per_post`, `per_story`, `monthly`, `cpm`, `contact`
- **Streaming**: `cpm`, `flat`, `contact`
- **Television**: `per_spot`, `weekly`, `monthly`, `contact`

## Migration Process

### Step 1: Review Current Data (Dry Run)

First, run the migration script in **dry run mode** to see what changes will be made without actually modifying the database:

```bash
npm run migrate:pricing
```

This will:
- ✅ Connect to MongoDB
- ✅ Fetch all publications
- ✅ Show which publications will be migrated
- ✅ Display a summary of changes
- ❌ **NOT** save any changes to the database

### Step 2: Review the Output

The script will display:
- Publications that need migration
- Publications already using the clean schema (skipped)
- Any errors encountered
- A summary with counts

Example output:
```
🚀 Starting pricing schema migration...
Mode: DRY RUN (no changes will be saved)

📡 Connecting to MongoDB...
✓ Connected

📥 Fetching all publications...
✓ Found 5 publications

Processing: Chicago Public Square
  ✓ Pricing data migrated

Processing: WRLL Radio
  ⊘ No changes needed (already using clean schema)

═══════════════════════════════════════
📊 Migration Summary
═══════════════════════════════════════
Total publications:     5
Migrated:              3
Skipped (no changes):  2
Errors:                0

⚠️  DRY RUN MODE - No changes were saved
Run with --live flag to apply changes:
  npm run migrate:pricing:live
```

### Step 3: Apply the Migration (Live)

Once you've reviewed the dry run output and are ready to apply the changes:

```bash
npm run migrate:pricing:live
```

This will:
- ✅ Create a backup of all publications before migration
- ✅ Migrate all pricing data to the new schema
- ✅ Save changes to the database
- ✅ Display a summary of completed migrations

### Step 4: Verify the Migration

After running the live migration:

1. **Check the backup**:
   - A backup file is created in `backups/pricing-migration-backup-[timestamp].json`
   - Keep this file in case you need to restore

2. **Test the application**:
   - Log in to the dashboard
   - Check inventory cards display pricing correctly
   - Open edit modals and verify pricing fields are populated
   - Test creating new inventory items

3. **Review specific publications**:
   ```bash
   # View a publication's data
   cat json_files/publications/[publication-name].json | jq '.distributionChannels'
   ```

## Migration Logic

The script performs the following transformations:

### 1. Single Pricing Object
```javascript
// Before
{ perPost: 100 }

// After
{ flatRate: 100, pricingModel: "per_post" }
```

### 2. Multiple Legacy Fields (takes first non-zero value)
```javascript
// Before
{ perSend: 2500, monthly: 0, flatRate: 2500 }

// After
{ flatRate: 2500, pricingModel: "per_send" }
```

### 3. Already Clean (no change)
```javascript
// Before and After (unchanged)
{ flatRate: 100, pricingModel: "per_post" }
```

### 4. Tiered Pricing (arrays)
```javascript
// Before
[
  { pricing: { perSend: 200 } },
  { pricing: { perSend: 150 } }
]

// After
[
  { pricing: { flatRate: 200, pricingModel: "per_send" } },
  { pricing: { flatRate: 150, pricingModel: "per_send" } }
]
```

### 5. Print-Specific Pricing (oneTime, fourTimes, twelveTimes)
```javascript
// Before
{
  oneTime: 3000,
  fourTimes: 2700,
  twelveTimes: 2400,
  openRate: 5000
}

// After (converted to array with frequency field)
[
  { pricing: { flatRate: 3000, pricingModel: "per_ad", frequency: "One time" } },
  { pricing: { flatRate: 2700, pricingModel: "per_ad", frequency: "4x" } },
  { pricing: { flatRate: 2400, pricingModel: "per_ad", frequency: "12x" } }
]
```

### 6. Hub Pricing
Hub-specific pricing is also migrated with the same logic, including print-specific fields.

## What Gets Preserved

The migration preserves all other pricing-related fields:
- ✅ `frequency` (e.g., "Weekly", "Monthly")
- ✅ `minimumCommitment`
- ✅ `hubPricing` (migrated separately)
- ✅ All other inventory specifications

## Rollback Instructions

If you need to rollback the migration:

1. **Locate the backup file**:
   ```bash
   ls -lt backups/pricing-migration-backup-*.json | head -1
   ```

2. **Restore from backup**:
   You can use a MongoDB restore script or manually restore specific publications.

3. **Or restore the entire database** (if you have a full backup):
   ```bash
   mongorestore --uri="your-mongodb-uri" --drop
   ```

## Troubleshooting

### Error: "VITE_MONGODB_URI environment variable not set"
- Make sure your `.env` file exists and contains `VITE_MONGODB_URI`
- Check that the `.env` file is in the project root

### Error: "Cannot connect to MongoDB"
- Verify your MongoDB connection string is correct
- Ensure MongoDB is running and accessible
- Check network connectivity

### Some publications show N/A for pricing
- This might be legacy data that wasn't migrated
- Check the migration output logs for that specific publication
- Manually edit the publication to set proper pricing

### Migration shows 0 changes needed
- Your data might already be using the clean schema
- The UI backward compatibility should handle both old and new schemas
- No action needed!

## Support

If you encounter any issues during migration:

1. **Don't panic** - Your data is backed up before live migration
2. **Review the logs** - Look for specific error messages
3. **Check the backup** - Verify the backup file was created
4. **Test in stages** - Try migrating one publication at a time if needed

## Post-Migration Checklist

- [ ] Dry run completed and reviewed
- [ ] Live migration executed successfully
- [ ] Backup file created and verified
- [ ] All publications display pricing correctly in dashboard
- [ ] Edit modals load pricing data correctly
- [ ] New inventory items can be created with pricing
- [ ] Old backup files archived or deleted after confirmation

---

**Last Updated**: October 2025
**Schema Version**: v2.0 (Clean Schema)

