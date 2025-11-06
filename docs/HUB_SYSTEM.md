# Hub System Documentation

## Overview

The Hub System allows the Chicago Hub platform to manage multiple regional markets (hubs) within a single application. Each hub can have its own publications, packages, and pricing.

## Architecture

### Database Schema

#### Hubs Collection (`hubs`)
- **hubId**: Unique slug identifier (e.g., "chicago-hub")
- **basicInfo**: Name, tagline, description
- **geography**: Region, city, state, DMAs, counties
- **branding**: Colors, logo
- **status**: active, inactive, pending, archived

#### Publications Association
- Publications have a `hubIds` array field
- Many-to-many relationship: publications can belong to multiple hubs
- Filtered via `hubIds: { $in: [hubId] }`

#### Packages Association
- Packages have `hubInfo` object with:
  - `hubId`: The hub identifier
  - `hubName`: Display name
  - `isHubExclusive`: Boolean flag
  - `multiHubAvailable`: Array of other hub IDs

### API Endpoints

All hub management endpoints are admin-only (`/api/hubs/*`):

- `GET /api/hubs` - List all hubs
- `GET /api/hubs/:id` - Get hub by ID
- `GET /api/hubs/slug/:slug` - Get hub by slug
- `POST /api/hubs` - Create hub (admin)
- `PUT /api/hubs/:id` - Update hub (admin)
- `DELETE /api/hubs/:id` - Archive hub (admin)
- `GET /api/hubs/:id/stats` - Get hub statistics
- `GET /api/hubs/:hubId/publications` - Get hub publications
- `GET /api/publications/unassigned` - Get unassigned publications
- `POST /api/hubs/:hubId/publications/:publicationId` - Assign publication to hub
- `DELETE /api/hubs/:hubId/publications/:publicationId` - Remove publication from hub
- `POST /api/hubs/:hubId/publications/bulk` - Bulk assign publications

### Frontend Components

#### Context & Hooks
- **HubContext** (`src/contexts/HubContext.tsx`)
  - Global state for selected hub
  - Persisted to localStorage
  - Provides: `selectedHubId`, `selectedHub`, `setSelectedHubId`, `hubs`, `loading`

- **Hooks** (`src/hooks/useHubs.ts`)
  - `useHubs()` - Fetch all hubs
  - `useHub(id)` - Fetch single hub
  - `useHubBySlug(slug)` - Fetch hub by slug
  - `useHubStats(id)` - Fetch hub statistics
  - `useHubPublications(hubId)` - Fetch hub's publications
  - `useUnassignedPublications()` - Fetch unassigned publications

#### UI Components
- **HubSelector** (`src/components/HubSelector.tsx`)
  - Dropdown in header to switch between hubs
  - Shows hub initial and name
  - Updates global context on change

- **HubManagement** (`src/components/admin/HubManagement.tsx`)
  - Admin interface for CRUD operations on hubs
  - Table view with edit, delete, and assign actions

- **HubForm** (`src/components/admin/HubForm.tsx`)
  - Form for creating/editing hubs
  - Validation with react-hook-form and zod

- **HubPublicationsManager** (`src/components/admin/HubPublicationsManager.tsx`)
  - Two-panel interface for assigning publications
  - Search and bulk operations
  - Shows available and assigned publications

### Data Filtering

The following pages/components filter by selected hub:

1. **Hub Central Dashboard** (`/hubcentral`)
   - Statistics and metrics
   - Pricing insights (default and hub-specific)
   - Publications list

2. **Hub Central Packages Tab**
   - Shows only packages for selected hub

3. **Main Packages Page** (`/packages`)
   - Filters packages by selected hub

4. **Dashboard Stats API**
   - Accepts `?hubId=xxx` query parameter
   - Filters publications and calculates stats for that hub only

## Current Hubs

| Hub ID | Name | Status | Publications |
|--------|------|--------|--------------|
| chicago-hub | Chicago Hub | Active | 31 |
| national-hub | National Hub | Active | 4 |
| portland-hub | Portland Hub | Pending | 0 |
| seattle-hub | Seattle Hub | Pending | 0 |
| austin-hub | Austin Hub | Pending | 0 |
| denver-hub | Denver Hub | Pending | 0 |

## Migration

The hub system was migrated using `scripts/migrateToHubsCollection.ts`:

- Created hub documents from hardcoded data
- Scanned publications for `hubPricing` references
- Populated `hubIds` arrays on publications
- All 31 publications assigned to appropriate hubs

Migration completed: **November 6, 2025**

## Usage Examples

### Using Hub Context in Components

```typescript
import { useHubContext } from '@/contexts/HubContext';

export const MyComponent = () => {
  const { selectedHubId, selectedHub, setSelectedHubId, hubs } = useHubContext();
  
  // Filter data by selected hub
  const { packages } = useHubPackages({ 
    active_only: true,
    hub_id: selectedHubId || undefined 
  });
  
  return (
    <div>
      <h1>{selectedHub?.basicInfo.name}</h1>
      {/* Component content */}
    </div>
  );
};
```

### Filtering API Calls by Hub

```typescript
// Frontend
const { stats } = useDashboardStats(selectedHubId);

// Backend receives
GET /api/admin/dashboard-stats?hubId=chicago-hub

// Backend filters
const publications = hubId 
  ? allPublications.filter(pub => pub.hubIds?.includes(hubId))
  : allPublications;
```

### Creating a New Hub

```typescript
const newHub = {
  hubId: 'miami-hub',
  basicInfo: {
    name: 'Miami Hub',
    tagline: 'Reaching Miami\'s vibrant communities',
    description: 'Connect with local media in Miami...'
  },
  geography: {
    region: 'Southeast',
    primaryCity: 'Miami',
    state: 'Florida',
    dmas: ['miami-ft-lauderdale-fl']
  },
  status: 'active'
};

await hubsApi.create(newHub);
```

## Best Practices

1. **Always use Hub Context** - Don't hardcode hub IDs
2. **Filter data by hub** - Use `selectedHubId` in API calls
3. **Support multiple hubs** - Publications and packages can belong to multiple hubs
4. **Validate hub data** - Use the zod schema in HubForm
5. **Check admin permissions** - Hub management is admin-only
6. **Restrict hub pricing** - Only show hubs the publication belongs to in pricing editors

### Hub Pricing Editor
When editing inventory pricing, publications can only set pricing for hubs they're assigned to:

```typescript
<HubPricingEditor
  defaultPricing={item.pricing || {}}
  hubPricing={item.hubPricing || []}
  publicationHubIds={currentPublication?.hubIds} // Only show assigned hubs
  pricingFields={[...]}
  onDefaultPricingChange={...}
  onHubPricingChange={...}
/>
```

This ensures publications can't accidentally create pricing for hubs they don't belong to.

## Future Enhancements

- Hub-specific user roles and permissions
- Hub analytics dashboard
- Hub templates for copying settings
- Automated hub recommendations for publications
- Hub-specific branding (colors, logos) in UI
- Multi-hub campaign management

