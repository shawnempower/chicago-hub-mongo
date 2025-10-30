# Scripts Directory

This directory contains utility scripts for maintaining and managing the Chicago Hub database and content.

## Available Scripts

### Find Missing Hub Pricing Models

**Script:** `findMissingHubPricingModels.ts`

**Purpose:** Scans all publications in the database to identify inventory items that have missing or incomplete pricing models in their hub pricing configurations.

### Fix Missing Hub Pricing Models

**Script:** `fixMissingHubPricingModels.ts`

**Purpose:** Automatically fixes inventory items with missing pricing models by copying the default pricing model to hub pricing configurations.

**What it checks:**
- Missing pricing objects in hub pricing
- Missing `pricingModel` fields
- Empty `pricingModel` fields
- Missing `flatRate` values

**How to run:**
```bash
npm run check:missing-pricing
```

**Output:**
The script generates:
1. Console output with a summary of issues
2. A detailed JSON report in `reports/missing-hub-pricing-models-[timestamp].json`
3. A CSV report in `reports/missing-hub-pricing-models-[timestamp].csv`

**Report Structure:**

The JSON report includes:
- **Summary**: Total counts of publications, items scanned, and issues found
- **Issues by Type**: Breakdown of issue types (missing pricing object, missing model, etc.)
- **Issues by Channel**: Count of issues per distribution channel (website, print, newsletter, etc.)
- **Issues by Publication**: Detailed issues grouped by publication
- **Detailed Issues**: Complete list of all issues with full context

**Example Issue:**
```json
{
  "publicationId": 4005,
  "publicationName": "True Star Media",
  "channel": "website",
  "itemName": "Large Display Ad",
  "itemIndex": 0,
  "hubId": "chicago-hub",
  "hubName": "Chicago Hub",
  "issue": "Missing pricingModel field",
  "hasDefaultPricing": true,
  "defaultPricingModel": "per_week"
}
```

**Checked Channels:**
- Website
- Print
- Newsletter
- Podcast
- Radio
- Streaming
- Events
- Social Media

**Prerequisites:**
- MongoDB connection configured in `.env`
- Required environment variables:
  - `MONGODB_URI` or `MONGODB_ATLAS_URI`
  - `MONGODB_DB_NAME`

**Use Cases:**
1. **Data Quality Audit**: Identify incomplete pricing data before it causes issues
2. **Migration Validation**: Verify pricing data after migrations
3. **Reporting**: Generate reports for data cleanup initiatives
4. **Troubleshooting**: Find specific inventory items with pricing issues

**How it fixes:**
- Copies `pricingModel` from default pricing to hub pricing when missing
- For items without default pricing, sets `pricingModel` to 'contact'
- Copies `flatRate` from default pricing when missing (for non-contact pricing models)

**How to run:**
```bash
# Dry run (preview changes without saving)
npm run fix:missing-pricing

# Live run (apply changes to database)
npm run fix:missing-pricing:live
```

**Output:**
The script generates:
1. Console output showing what will be/was fixed
2. A detailed JSON report in `reports/fix-hub-pricing-models-[dry-run-][timestamp].json`

**Safety:**
- Runs in dry-run mode by default (no changes made)
- Must explicitly use `--live` flag to apply changes
- Creates detailed reports of all changes made
- Non-destructive: only adds missing fields, never removes data

**Example Fix:**
```json
{
  "publicationId": 1035,
  "publicationName": "Chicago Sun-Times",
  "channel": "events",
  "itemName": "Community Events - title",
  "action": "Copied pricingModel from default pricing",
  "oldValue": "undefined",
  "newValue": "flat"
}
```

---

## Other Scripts

### Pricing Migration Scripts
- `migrate-pricing.cjs` - Migrates pricing structures (dry run by default)
- Use `npm run migrate:pricing` for dry run
- Use `npm run migrate:pricing:live` for live migration

### Website Sizes Migration
- `migrate-website-sizes.cjs` - Migrates website size configurations
- Use `npm run migrate:sizes` for dry run
- Use `npm run migrate:sizes:live` for live migration

### Publication Management
- Use `npm run list-publications` to list all publications
- Use `npm run export:publications` to export publications to ZIP

### User Management
- Use `npm run make-admin` to make a user an admin

### Connection Cleanup
- Use `npm run cleanup:connections` to clean up stale database connections

---

## Adding New Scripts

When adding new scripts:

1. **Create the script file** in this directory or in `src/scripts/`
2. **Add TypeScript type safety** using existing types from `src/integrations/mongodb/`
3. **Add error handling** with try/catch blocks
4. **Add logging** using console.log with emojis for clarity
5. **Add to package.json** with a descriptive npm script name
6. **Document it here** in this README with usage instructions
7. **Test it** with a dry run option when applicable

## Best Practices

- Always use `dotenv/config` at the top of scripts
- Always close database connections with `closeConnection()`
- Use descriptive console output with status emojis (✅, ❌, 🔍, etc.)
- Generate reports with timestamps in filenames
- Provide both JSON and CSV output formats when applicable
- Include summary statistics in console output
- Use the existing database client from `src/integrations/mongodb/client.ts`

