# Newsletter & Source Names in Package Builder

## Overview
Enhanced the package builder to properly display specific source names for nested items like newsletters, radio shows, podcasts, and print sections.

## Changes Made

### 1. **Schema Update** (`hubPackageSchema.ts`)
Added new optional field to `HubPackageInventoryItem`:
```typescript
sourceName?: string; // e.g., "The Stay Ready Playbook" for a newsletter, "Morning Drive" for a radio show
```

### 2. **Service Updates** (`packageBuilderService.ts`)
Updated `extractInventoryFromPublication()` to populate `sourceName` for all channels:

- **Newsletters**: `sourceName = newsletter.name` (e.g., "The Stay Ready Playbook", "Chicago Daily Brief")
- **Radio**: `sourceName = show.name` (e.g., "Morning Drive", "Evening Lineup") or `radio.callSign` for station-level ads
- **Podcasts**: `sourceName = podcast.name` (e.g., "Tech Talk", "Business Insights")
- **Social Media**: `sourceName = social.platform` (e.g., "Instagram", "Twitter", "LinkedIn")
- **Print**: `sourceName = printPub.section || printPub.name` (e.g., "Business", "Classified", "Sports")
- **Streaming**: `sourceName` stored (e.g., "Hulu", "YouTube")
- **Events**: `sourceName` stored (e.g., specific event name)

### 3. **Display Updates** (`PackageResults.tsx`)
Updated both breakdown tabs to use `sourceName`:

**Before:**
```
📧 Newsletter | Chicago Hub
Full Page
...
```

**After:**
```
📧 Newsletter | Chicago Hub | **The Stay Ready Playbook**
Full Page Ad
...
```

Benefits:
- ✅ No more guessing which newsletter the ad is in
- ✅ Clear distinction between different shows on the same radio station
- ✅ Podcasts properly identified
- ✅ Social media platforms clearly visible
- ✅ Applies to both "By Channel" and "By Outlet" tabs

## Example Display

### For Newsletters
```
📧 Newsletter | Chicago Hub | The Stay Ready Playbook
Email Ad Spot
...
```

### For Radio
```
📻 Radio | WVON | Morning Drive
30-second spot
...
```

### For Podcasts
```
🎙️ Podcast | Chicago Public Media | Tech Talk Daily
Host-read ad
...
```

### For Print
```
📰 Newspaper | Chicago Sun-Times | Business Section
Full Page Color
...
```

## Benefits
- Eliminates confusion about which specific newsletter/show/platform an ad belongs to
- Provides complete transparency in package breakdowns
- Makes it easy to verify what you're actually buying
- Improves package builder UX significantly

## Backward Compatibility
- `sourceName` is optional, so existing packages continue to work
- Display logic gracefully handles missing `sourceName`
- No breaking changes to the API

