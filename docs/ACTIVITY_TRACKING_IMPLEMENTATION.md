# Activity Tracking System Implementation

**Implementation Date:** December 2025  
**Status:** ✅ Complete

## Overview

Implemented a comprehensive activity tracking system to provide an audit trail for database modifications across the application. The system automatically tracks when users make changes to data, capturing context about the hub, publication, and user involved.

## What Was Implemented

### 1. Schema Updates
**File:** `src/integrations/mongodb/schemas.ts`

- **Expanded `UserInteraction` interface** with:
  - `hubId` and `publicationId` for filtering by context
  - `sessionId`, `ipAddress`, `userAgent` for audit details
  - Extended `interactionType` enum to include:
    - Campaign operations: `campaign_create`, `campaign_update`, `campaign_delete`
    - Order operations: `order_create`, `order_update`, `order_delete`
    - Package operations: `package_create`, `package_update`, `package_delete`
    - Lead operations: `lead_create`, `lead_update`, `lead_delete`
    - Other operations: `publication_update`, `inventory_update`, `storefront_update`, `settings_update`
  - Enhanced `metadata` object for flexible activity-specific data

- **Updated MongoDB indexes** for efficient queries:
  - `{ hubId: 1, createdAt: -1 }` - Hub-level queries with time ordering
  - `{ publicationId: 1, createdAt: -1 }` - Publication-level queries
  - `{ sessionId: 1 }` - Session-based activity grouping

### 2. Service Layer Enhancements
**File:** `src/integrations/mongodb/allServices.ts`

Added comprehensive query methods to `UserInteractionsService`:
- `getByPublication(publicationId, options)` - Filter activities by publication
- `getByHub(hubId, options)` - Filter activities by hub
- `getByDateRange(userId, startDate, endDate)` - Time-based queries
- `getByActivityType(type, options)` - Filter by activity type
- `getSessionActivities(sessionId)` - Session-grouped activities
- `countByPublication(publicationId, filters)` - Count publication activities
- `countByHub(hubId, filters)` - Count hub activities

All methods include pagination support and flexible filtering options.

### 3. Activity Tracking Middleware
**File:** `server/middleware/activityTracking.ts`

Created middleware that automatically tracks API operations:

**Features:**
- Tracks POST, PUT, PATCH, DELETE requests (database modifications)
- Automatically extracts context (userId, hubId, publicationId) from requests
- Maps routes to activity types (e.g., `PUT /api/campaigns/:id` → `campaign_update`)
- Filters sensitive fields (passwords, tokens, API keys) from logged metadata
- Executes asynchronously (non-blocking) to avoid slowing responses
- Fails silently - tracking errors don't affect main operations

**Route Mappings:**
- `/api/campaigns/*` → campaign operations
- `/api/hub-packages/*` → package operations
- `/api/publication-orders/*` → order operations
- `/api/builder/leads/*` → lead operations
- `/api/publications/*` → publication operations
- `/api/storefront/*` → storefront operations
- `/api/builder/inventory` → inventory updates
- `/api/builder/settings` → settings updates

### 4. Middleware Integration
**File:** `server/index.ts`

Applied tracking middleware to protected routes:
- All admin routes
- Publication management routes
- Campaign routes
- Order management routes
- Hub packages routes
- Storefront configuration routes
- Creative assets routes

### 5. Activity Query API
**File:** `server/routes/activity-tracking.ts`

Created RESTful API endpoints for querying activities:

**Endpoints:**
- `GET /api/activities/me` - Current user's activity history
- `GET /api/activities/publication/:id` - Activities for a publication (requires access)
- `GET /api/activities/hub/:id` - Activities for a hub (admin only)
- `GET /api/activities/user/:id` - Activities for a specific user (admin only)
- `POST /api/activities/track` - Manual activity tracking (optional)
- `GET /api/activities/summary` - Activity statistics (admin only)

**Query Parameters:**
- `limit` - Number of results (max 500)
- `offset` - Pagination offset
- `activityType` - Filter by specific activity type
- `startDate` - Filter by start date
- `endDate` - Filter by end date

**Authorization:**
- User activities: Requires authentication, users can view their own
- Publication activities: Requires publication access or admin role
- Hub activities: Admin only
- User-specific activities: Admin only (or own data)

### 6. Frontend API Client
**File:** `src/api/activities.ts`

TypeScript client for frontend applications:

**Functions:**
- `getMyActivities(options)` - Get current user's activities
- `getPublicationActivities(publicationId, options)` - Get publication activities
- `getHubActivities(hubId, options)` - Get hub activities (admin)
- `getUserActivities(userId, options)` - Get user activities (admin)
- `trackActivity(data)` - Manual tracking for UI events
- `getActivitySummary(options)` - Get activity statistics (admin)

### 7. Activity Log Viewer Component
**File:** `src/components/admin/ActivityLog.tsx`

React component for viewing and filtering activities:

**Features:**
- Filterable activity table
- Filter by activity type, date range
- Pagination (load more)
- Color-coded activity badges
- Displays user, hub, publication context
- Shows timestamps with relative time
- Refresh functionality
- Configurable for hub, publication, or user filtering

**Usage:**
```tsx
// View activities for a specific hub
<ActivityLog hubId="chicago" />

// View activities for a publication
<ActivityLog publicationId="pub123" />

// View activities for a user
<ActivityLog userId="user456" />
```

## Key Design Decisions

1. **Automatic Tracking via Middleware**: Ensures all database modifications are tracked without requiring manual calls in every route handler.

2. **Minimal Metadata**: Logs only essential information (resource ID, action type) without full data diffs to keep storage manageable.

3. **Sensitive Data Filtering**: Automatically excludes passwords, tokens, and API keys from logged metadata.

4. **Non-Blocking**: Tracking happens asynchronously and fails silently to never impact main operations.

5. **Let Data Grow**: No automatic cleanup/retention policies initially - monitor and add later if needed.

6. **Successful Operations Only**: Only tracks successful responses (2xx status codes), not failed or unauthorized attempts.

7. **Publication & Hub Context**: Every activity can be filtered by publication or hub for targeted audit trails.

## Usage Examples

### Backend: Manual Tracking (if needed)
```typescript
import { userInteractionsService } from '@/integrations/mongodb/allServices';

await userInteractionsService.track({
  userId: req.user.id,
  interactionType: 'custom_action',
  hubId: 'chicago',
  publicationId: 'pub123',
  metadata: {
    resourceId: 'res456',
    action: 'custom_operation'
  }
});
```

### Frontend: Query Activities
```typescript
import { getPublicationActivities } from '@/api/activities';

const { activities, pagination } = await getPublicationActivities('pub123', {
  limit: 50,
  offset: 0,
  activityType: 'campaign_create',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});
```

### Frontend: Display Activity Log
```tsx
import { ActivityLog } from '@/components/admin/ActivityLog';

// In your admin dashboard
<ActivityLog hubId="chicago" showFilters={true} />
```

## Next Steps (Future Enhancements)

1. **Data Retention Policies**: Implement automatic archiving/cleanup after X months
2. **Failed Attempts Tracking**: Optionally track unauthorized access attempts for security
3. **Activity Dashboards**: Build analytics visualizations (charts, trends)
4. **Export Functionality**: Allow exporting activity logs to CSV/JSON
5. **Real-time Monitoring**: WebSocket-based live activity feed
6. **Advanced Filtering**: Full-text search, complex query builder
7. **User Notifications**: Alert admins of suspicious activities

## Testing

To test the implementation:

1. **Start the server** and ensure no errors on startup
2. **Make changes** via the UI (create campaign, update order, etc.)
3. **Query activities**:
   - Visit `/api/activities/me` to see your activities
   - Use the ActivityLog component in admin interface
4. **Check MongoDB** collection `user_interactions` for tracked events

## Monitoring

Monitor the `user_interactions` collection size:
```javascript
// MongoDB shell
db.user_interactions.stats()
db.user_interactions.count()
```

Consider adding indexes or implementing retention policies if collection grows very large (millions of records).

## Files Modified/Created

### Modified
- `src/integrations/mongodb/schemas.ts` - Schema and indexes
- `src/integrations/mongodb/allServices.ts` - Service methods
- `server/index.ts` - Middleware integration

### Created
- `server/middleware/activityTracking.ts` - Tracking middleware
- `server/routes/activity-tracking.ts` - API routes
- `src/api/activities.ts` - Frontend client
- `src/components/admin/ActivityLog.tsx` - Viewer component
- `docs/ACTIVITY_TRACKING_IMPLEMENTATION.md` - This document

## Conclusion

The activity tracking system is now fully operational and will automatically capture audit trails for all database modifications. The system is designed to be reliable, non-intrusive, and scalable, providing valuable insights into user activities across publications and hubs.












