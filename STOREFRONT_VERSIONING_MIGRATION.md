# Storefront Versioning Migration Guide

## Overview
The storefront configuration system now supports versioning with separate draft and live versions per publication.

## Changes Made

### 1. **Database Schema Updates**
- **Old**: One storefront config document per publication (unique on `publicationId`)
- **New**: Two possible config documents per publication (one draft, one live)
  - Unique compound index on `{ publicationId: 1, 'meta.isDraft': 1 }`
  - Allows one draft + one live version per publication

### 2. **Service Layer Changes**
- `getByPublicationId()` now accepts optional `isDraft` parameter
- New methods:
  - `createDraft(publicationId)` - Creates draft copy from live version
  - `publishDraft(publicationId)` - Publishes draft to live (replaces live)

### 3. **API Endpoints Added**
- `POST /api/storefront/:publicationId/create-draft` - Create draft from live
- `POST /api/storefront/:publicationId/publish` - Updated to use `publishDraft()` method

### 4. **UI Changes**
- Added "Publish Draft to Live" button (when viewing draft)
- Added "Create Draft from Live" button (when viewing live)
- Version status badge shows "Draft" or "Live"
- Confirmation dialogs for publish/create-draft actions

## Migration Steps

### For Existing Installations:

#### 1. **Update MongoDB Indexes** (Run in MongoDB shell or Compass)

```javascript
// Connect to your database
use chicago_hub; // or your database name

// Drop the old unique index on publicationId
db.storefront_configurations.dropIndex({ publicationId: 1 });

// Create new compound unique index on publicationId + isDraft
db.storefront_configurations.createIndex(
  { publicationId: 1, 'meta.isDraft': 1 },
  { unique: true, name: 'unique_publication_draft' }
);

// Verify indexes
db.storefront_configurations.getIndexes();
```

#### 2. **Update Existing Configurations**

All existing configurations are treated as "live" versions by default. If any configurations don't have the `isDraft` field, update them:

```javascript
// Set isDraft: false for any configs missing this field
db.storefront_configurations.updateMany(
  { 'meta.isDraft': { $exists: false } },
  { $set: { 'meta.isDraft': false } }
);
```

#### 3. **Restart the Server**

After updating the indexes, restart your Node.js server to ensure all changes take effect.

## Workflow

### Creating and Publishing a Draft:

1. **Start with Live Version**
   - View your published storefront config
   - Click "Create Draft from Live"
   - A copy is created with `isDraft: true`

2. **Edit Draft**
   - Make changes to the draft version
   - Save changes (updates draft only, live remains unchanged)
   - Test draft preview

3. **Publish Draft**
   - When ready, click "Publish Draft to Live"
   - System creates new live version from draft
   - Old live version is replaced
   - Draft is deleted after successful publish

### Version Isolation:

- **Draft Version** (`isDraft: true`)
  - Work in progress
  - Not visible to public
  - Can be edited freely
  - Saved changes don't affect live

- **Live Version** (`isDraft: false`)
  - Currently published
  - Visible to public
  - Read-only unless you create a draft
  - Can be previewed

## Database Queries

### Get Live Version:
```javascript
db.storefront_configurations.findOne({
  publicationId: "YOUR_PUBLICATION_ID",
  'meta.isDraft': false
});
```

### Get Draft Version:
```javascript
db.storefront_configurations.findOne({
  publicationId: "YOUR_PUBLICATION_ID",
  'meta.isDraft': true
});
```

### Count Versions per Publication:
```javascript
db.storefront_configurations.aggregate([
  {
    $group: {
      _id: "$publicationId",
      total: { $sum: 1 },
      drafts: {
        $sum: { $cond: [{ $eq: ["$meta.isDraft", true] }, 1, 0] }
      },
      live: {
        $sum: { $cond: [{ $eq: ["$meta.isDraft", false] }, 1, 0] }
      }
    }
  }
]);
```

## Rollback Instructions

If you need to rollback to the single-config-per-publication model:

```javascript
// 1. Keep only live versions (delete drafts)
db.storefront_configurations.deleteMany({ 'meta.isDraft': true });

// 2. Drop the compound index
db.storefront_configurations.dropIndex('unique_publication_draft');

// 3. Recreate the single-field unique index
db.storefront_configurations.createIndex(
  { publicationId: 1 },
  { unique: true }
);
```

## Testing Checklist

- [ ] Can view live storefront configuration
- [ ] Can create draft from live version
- [ ] Can edit draft without affecting live
- [ ] Can save changes to draft
- [ ] Can publish draft to live
- [ ] Live version is replaced after publish
- [ ] Draft is deleted after successful publish
- [ ] Cannot create multiple drafts for same publication
- [ ] Cannot create multiple live versions for same publication

## Notes

- The system prevents duplicate drafts or duplicate live versions per publication
- When publishing a draft, the old live version is completely replaced
- Images uploaded to drafts remain in S3 even if the draft is deleted (soft-delete)
- The `meta.lastUpdated` timestamp is updated on every save
- Admin permissions are required for create-draft and publish operations

## Support

If you encounter issues:
1. Check MongoDB indexes are correctly set
2. Verify `meta.isDraft` field exists on all configs
3. Check server logs for detailed error messages
4. Ensure user has admin permissions

