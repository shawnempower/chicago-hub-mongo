# Algorithm Configuration Admin System

## Overview

This document describes the implementation of the Algorithm Configuration Admin System, which allows administrators to manage and edit campaign generation algorithms through a web interface. All configuration changes are stored in MongoDB and override code defaults, making the system deployment-ready without requiring code changes.

## Architecture

### 1. Database Layer (`algorithm_configs` collection)

**Schema**: `src/integrations/mongodb/schemas.ts`
- Stores editable algorithm configurations
- Supports complete override of algorithm settings
- Audit trail with `createdBy`, `updatedBy`, timestamps

**Key Fields**:
- `algorithmId`: Unique identifier (e.g., 'proportional', 'all-inclusive')
- `name`, `description`, `icon`: Display information
- `llmConfig`: LLM model settings, press forward behavior, selection rules
- `constraints`: Budget rules, publication limits, pruning passes
- `scoring`: Weighting for different factors
- `promptInstructions`: Custom prompt text (optional)
- `isActive`: Enable/disable algorithm
- `isDefault`: Mark as default algorithm

### 2. Algorithm Registry (`server/campaignAlgorithms/registry.ts`)

**Enhanced with DB Support**:
- `getAlgorithm(algorithmId)`: Returns code defaults (synchronous)
- `getAlgorithmMerged(algorithmId)`: Returns code defaults merged with DB overrides (async)
- Deep merge strategy: DB settings override code defaults while preserving unmodified fields

**Usage Pattern**:
```typescript
// In services that need runtime config (async)
const algorithm = await getAlgorithmMerged('proportional');

// In simple lookups (sync)
const algorithm = getAlgorithm('proportional');
```

### 3. Backend API (`server/index.ts`)

**Endpoints** (All require admin authentication):

1. **GET /api/admin/algorithms**
   - Lists all algorithms with merged configs
   - Shows which have DB overrides
   - Returns current values and metadata

2. **GET /api/admin/algorithms/:algorithmId**
   - Gets single algorithm details
   - Includes both merged config and code defaults
   - Used for editing interface

3. **PUT /api/admin/algorithms/:algorithmId**
   - Updates/creates algorithm configuration
   - Validates algorithm exists in code
   - Upserts to DB with audit trail

4. **POST /api/admin/algorithms/:algorithmId/reset**
   - Removes DB override
   - Restores algorithm to code defaults
   - Provides "undo" mechanism for customizations

### 4. Frontend Admin UI (`src/components/admin/AlgorithmManagement.tsx`)

**Features**:
- Card-based list view with status indicators
- Full-featured edit dialog with collapsible sections
- Real-time validation and form management
- Visual indicators for modified algorithms
- Reset to defaults functionality
- Error handling with toast notifications

**Sections**:
1. **Basic Information**: Name, description, active status
2. **Constraints**: Budget rules, publication limits, pruning passes
3. **LLM Configuration**: Model settings, press forward behavior
4. **Prompt Instructions**: Custom prompt text editor

### 5. Admin Dashboard Integration (`src/components/admin/AdminDashboard.tsx`)

- Added "Algorithms" tab alongside Users, Hubs, Surveys, etc.
- Updated grid layout from 5 to 6 columns
- Wrapped in ErrorBoundary for fault tolerance

## Configuration Fields

### LLM Config
- **Model Settings**: `maxTokens`, `temperature`
- **Press Forward**: `enforceAllOutlets`, `prioritizeSmallOutlets`, `allowBudgetExceeding`, `maxBudgetExceedPercent`
- **Selection**: `maxPublications`, `minPublications`, `diversityWeight`
- **Output**: `includeRationale`, `verboseLogging`, `includeAlternatives`

### Constraints
- `strictBudget`: Whether to enforce strict budget limits
- `maxBudgetExceedPercent`: Maximum allowed budget overrun (0-100)
- `maxPublications`: Maximum number of publications to select
- `minPublications`: Minimum number of publications to select
- `maxPublicationPercent`: Maximum % of budget per publication (0-1)
- `minPublicationSpend`: Minimum spend per publication ($)
- `targetPublicationsMin`: Target minimum publication count
- `targetPublicationsMax`: Target maximum publication count
- `pruningPassesMax`: Maximum pruning iterations (0-4)

### Scoring Weights
- `sizeWeight`: Weight for publication size/reach
- `diversityWeight`: Weight for channel/geographic diversity
- `costEfficiencyWeight`: Weight for cost per impression
- `reachWeight`: Weight for total reach potential
- `engagementWeight`: Weight for engagement metrics

## Usage Example

### Editing an Algorithm via Admin UI

1. Navigate to `/admin` and click "Algorithms" tab
2. Click "Edit" on any algorithm card
3. Expand sections and modify values
4. Click "Save Changes" to persist to DB
5. Algorithm immediately takes effect for new campaigns

### Resetting to Code Defaults

1. Open algorithm editor
2. Click "Reset to Defaults" (only visible if DB override exists)
3. Confirm reset action
4. DB override is removed, code defaults restored

## Database Storage

### Example Document
```javascript
{
  _id: ObjectId("..."),
  algorithmId: "proportional",
  name: "Size-Weighted Proportional",
  description: "Allocates budget proportionally to publication size",
  isActive: true,
  constraints: {
    strictBudget: true,
    maxBudgetExceedPercent: 0,
    maxPublications: 20,
    maxPublicationPercent: 0.25,
    minPublicationSpend: 500,
    pruningPassesMax: 3
  },
  llmConfig: {
    model: {
      temperature: 0.7,
      maxTokens: 16000
    },
    pressForward: {
      allowBudgetExceeding: false
    }
  },
  createdAt: ISODate("2025-01-01T00:00:00Z"),
  updatedAt: ISODate("2025-01-15T10:30:00Z"),
  updatedBy: "admin@example.com"
}
```

## Integration with Campaign Analysis

The `campaignLLMService.analyzeCampaign()` method now:
1. Loads algorithm using `getAlgorithmMerged()` to get DB overrides
2. Applies algorithm-specific settings to LLM config
3. Uses custom prompt instructions if defined in DB
4. Enforces constraints from merged configuration
5. Runs pruning passes based on `pruningPassesMax` setting

## Deployment Considerations

### Production Deployment
- All algorithms can be tuned via admin UI without code deploys
- Changes are immediate and versioned in DB
- Supports A/B testing by creating DB overrides
- Easy rollback via "Reset to Defaults"

### Backup & Migration
- Export: Query `algorithm_configs` collection
- Import: Restore collection to new environment
- Code defaults always available as fallback

### Monitoring
- Track algorithm performance via `pruning_audits` collection
- Compare pre/post pruning results
- Monitor budget compliance per algorithm

## Security

- All endpoints require authentication via `authenticateToken`
- Admin-only access enforced via `isAdmin` profile check
- Audit trail tracks who made changes and when
- Input validation prevents invalid configurations

## Future Enhancements

Potential improvements:
1. **Version History**: Track configuration changes over time
2. **A/B Testing**: Compare algorithm variants side-by-side
3. **Performance Metrics**: Auto-tune based on campaign outcomes
4. **Import/Export**: Bulk configuration management
5. **Templates**: Save and apply configuration presets
6. **Approval Workflow**: Require review before changes go live

## Files Modified

### Backend
- `server/campaignAlgorithms/registry.ts` - Added `getAlgorithmMerged()`
- `server/campaignLLMService.ts` - Uses merged configs
- `server/index.ts` - Added admin API endpoints
- `server/campaignAlgorithms/types.ts` - Added constraint fields

### Frontend
- `src/components/admin/AlgorithmManagement.tsx` - New component
- `src/components/admin/AdminDashboard.tsx` - Added Algorithms tab
- `src/integrations/mongodb/schemas.ts` - Added `AlgorithmConfig` schema
- `src/integrations/mongodb/campaignSchema.ts` - Updated algorithm types

### Documentation
- `docs/ALGORITHM_ADMIN_IMPLEMENTATION.md` - This file

## Testing

To test the system:
1. Start the dev server
2. Log in as admin user
3. Navigate to `/admin` → Algorithms tab
4. Edit an algorithm (e.g., change `pruningPassesMax` to 1)
5. Create a test campaign using that algorithm
6. Verify the pruning behavior matches the new setting
7. Reset algorithm and verify it returns to code defaults

---

**Implementation Date**: November 2025  
**Status**: Complete and production-ready

