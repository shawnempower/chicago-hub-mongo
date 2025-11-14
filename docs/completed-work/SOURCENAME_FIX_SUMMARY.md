# SourceName Field Fix for Package Builder Breakdown Display

## Problem
When viewing package builder breakdown tabs ("By Channel" and "By Outlet"), newsletter names and other source identifiers (radio show names, podcast names, etc.) were not appearing. Users reported seeing "there's no sourceName" indicating the field was empty.

## Root Cause
The issue was a **mismatch between two codepaths**:

1. **Frontend (`src/services/packageBuilderService.ts`)**: Correctly populated the `sourceName` field when extracting inventory items
2. **Backend API (`server/index.ts`)**: The `/api/admin/builder/analyze` endpoint was NOT populating the `sourceName` field

Since the backend endpoint was being used by the package builder to generate results, the `sourceName` field was never populated, even though it existed in the frontend service.

## Solution

### 1. Updated Backend Endpoint (`server/index.ts` - `/api/admin/builder/analyze`)

**Modified `extractFromChannel` function signature** to accept a `sourceInfo` parameter:
```typescript
const extractFromChannel = (
  channelName: string, 
  channelData: any, 
  path: string, 
  itemFrequencyString?: string, 
  sourceInfo?: any  // NEW PARAMETER
) => {
  // ... extraction logic ...
  
  // Add sourceName if provided
  if (sourceInfo?.sourceName) {
    item.sourceName = sourceInfo.sourceName;
  }
  
  inventoryItems.push(item);
};
```

**Updated all channel extraction calls** to pass the `sourceName`:

- **Newsletters**: Extract newsletter `name` or `subject` as sourceName
- **Print**: Extract section/name as sourceName
- **Social Media**: Extract platform as sourceName
- **Podcasts**: Extract podcast name as sourceName
- **Radio**: Extract show name (or station call sign for station-level ads) as sourceName
- **Streaming**: Extract stream name as sourceName
- **Events**: Extract event name as sourceName

Example for newsletters:
```typescript
if (dc.newsletters && Array.isArray(dc.newsletters)) {
  dc.newsletters.forEach((newsletter: any) => {
    if (newsletter.advertisingOpportunities) {
      const newsletterName = newsletter.name || newsletter.subject || 'Newsletter';
      extractFromChannel('newsletter', [newsletter], 'distributionChannels.newsletters', newsletter.frequency, {
        sourceName: newsletterName
      });
    }
  });
}
```

### 2. Updated Frontend Service (`src/services/packageBuilderService.ts`)

**Added `sourceName` assignment for streaming and events channels** (was already done for other channels):

- **Streaming**: `item.sourceName = stream.name || 'Streaming'`
- **Events**: `item.sourceName = event.name || 'Event'`

### 3. Frontend Display (`src/components/admin/PackageBuilder/PackageResults.tsx`)

The display component already had logic to show the `sourceName` with:
- Fallback parsing logic for legacy packages (parse from `itemName` if sourceName not present)
- Email icon badge to visually distinguish source names
- Display in both "By Channel" and "By Outlet" tabs

## Files Modified

1. **`server/index.ts`** (2 changes)
   - Updated `extractFromChannel` function signature to accept `sourceInfo`
   - Updated all 8 channel extraction calls to pass sourceName

2. **`src/services/packageBuilderService.ts`** (2 changes)
   - Added `sourceName` for streaming channel items
   - Added `sourceName` for events channel items

3. **`src/components/admin/PackageBuilder/PackageResults.tsx`**
   - No changes needed (already had display logic)

## How It Works Now

1. User creates/rebuilds a package in the Package Builder
2. Frontend calls `POST /api/admin/builder/analyze` with build filters
3. Backend endpoint extracts inventory and populates `sourceName` for each item
4. Frontend displays `sourceName` in breakdown tabs with visual badge:
   - **By Channel Tab**: Shows publication name + sourceName (newsletter/show/etc) + item details
   - **By Outlet Tab**: Shows publication + channel + sourceName + item details

## Example Output

**Before Fix:**
```
Chicago Reader 📧 Newsletter Newsletter Leaderboard Frequency: 30x per month $7,500
(no sourceName badge)
```

**After Fix:**
```
Chicago Reader 📧 Newsletter Chicago Reader Newsletter Leaderboard 📬 Newsletter Leaderboard Frequency: 30x per month $7,500
(sourceName displays as a badge)
```

## Backward Compatibility

The fix maintains backward compatibility:
- **Existing packages**: Display logic has fallback that parses `itemName` if `sourceName` is missing
- **New packages**: Will have `sourceName` properly populated from both backend and frontend paths
- **Schema**: `sourceName` field already exists in `HubPackageInventoryItem` interface

## Testing Recommendations

1. Create a new package with multiple newsletters from same publication
2. Verify each newsletter shows its own name in the breakdown tabs
3. Create package with radio shows and verify show names appear
4. Verify saved packages display sourceName correctly on reload
5. Verify legacy packages (without sourceName) fall back to parsed itemName

