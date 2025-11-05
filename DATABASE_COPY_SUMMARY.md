# Database Copy Summary

## Overview
Successfully created a complete copy of the `chicago-hub` MongoDB database to `staging-chicago-hub`.

## Copy Details

**Date:** November 5, 2025  
**Source Database:** `chicago-hub`  
**Target Database:** `staging-chicago-hub`  

## What Was Copied

### Collections (20 total)
All 20 collections were successfully copied with all documents and indexes:

| Collection | Documents | Indexes |
|------------|-----------|---------|
| user_sessions | 200 | 4 |
| analytics_events | 0 | 4 |
| saved_packages | 0 | 2 |
| lead_inquiries | 0 | 5 |
| media_entities | 35 | 0 |
| users | 10 | 4 |
| publication_files | 6 | 0 |
| user_profiles | 9 | 4 |
| hub_packages | 5 | 0 |
| publications | 31 | 7 |
| areas | 257 | 5 |
| survey_submissions | 31 | 18 |
| assistant_instructions | 2 | 3 |
| brand_documents | 1 | 3 |
| saved_outlets | 0 | 2 |
| conversation_threads | 0 | 3 |
| storefront_configurations | 23 | 6 |
| ad_packages | 24 | 4 |
| assistant_conversations | 0 | 3 |
| user_interactions | 0 | 3 |

**Total Documents Copied:** 634  
**Total Indexes Created:** 77

## How to Use the Staging Database

### Running the Copy Script Again
To refresh the staging database from production:

```bash
npm run copy:db-to-staging
```

Or manually:

```bash
npx tsx scripts/copyDatabaseToStaging.ts
```

### Connecting to Staging Database
To connect your application to the staging database, update your MongoDB connection string to use `staging-chicago-hub` as the database name:

```bash
# In your .env file, change from:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chicago-hub

# To:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/staging-chicago-hub
```

### Backup Metadata
The copy process creates a `_backup_metadata` collection in the staging database with information about:
- Source and target databases
- Timestamp of the copy
- Statistics for each collection
- Success/failure status

## Script Location
The copy script is located at: `scripts/copyDatabaseToStaging.ts`

## Features
- ✅ Copies all documents in batches for efficiency
- ✅ Preserves all indexes (unique, sparse, TTL, etc.)
- ✅ Verifies document counts after copy
- ✅ Creates backup metadata for tracking
- ✅ Detailed progress reporting
- ✅ Error handling and recovery

## Safety Notes
⚠️ **Important Considerations:**
1. The staging database is a complete copy - any changes won't affect production
2. The copy process does not delete existing data in staging (collections are overwritten)
3. User sessions and authentication tokens are copied as-is
4. Consider clearing sensitive collections after copying if needed

## Next Steps
You can now:
- Test migrations on staging before running on production
- Develop and test new features with production-like data
- Run analytics and reports without impacting production
- Train team members on real data structure

---

*For questions or issues with the copy process, see the script at `scripts/copyDatabaseToStaging.ts`*

