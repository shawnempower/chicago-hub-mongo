# Storefront Lazy Loading Fix

## Problem

The application was loading storefront data (`/api/storefront/{publicationId}`) too early - immediately when the dashboard loaded, even though storefront data should only be needed when users navigate to the Storefront section or when explicitly viewing storefront-related features.

### Root Causes

1. **`PublicationSelector` Component**: Was prefetching brand colors immediately when a publication was selected (via `useEffect` watching `selectedPublication`)
2. **`FloatingAssistant` Component**: Was calling `getPublicationBrandColor()` on every render
3. **`getPublicationBrandColor()` Function**: Automatically triggered background API fetches to storefront whenever called with an uncached publication ID

Since both `PublicationSelector` (in the Header) and `FloatingAssistant` (globally in App.tsx) render on every page, storefront data was being fetched immediately on dashboard load.

## Solution

Implemented true lazy loading for storefront data by making brand color fetching explicitly opt-in rather than automatic:

### 1. Modified `publicationBrandColors.ts`

**Before**: `getPublicationBrandColor()` automatically started background fetches for uncached colors
**After**: `getPublicationBrandColor()` is now synchronous and only returns cached colors or defaults

```typescript
// Now only returns cached colors, no automatic fetching
export const getPublicationBrandColor = (publicationId: string | number): string => {
  const pubIdString = String(publicationId);
  return colorCache.get(pubIdString) || '#0066cc';
};
```

To fetch colors, components must now explicitly call `prefetchBrandColors()`.

### 2. Modified `PublicationSelector.tsx`

**Before**: Prefetched colors immediately when publication changed
**After**: Only prefetches colors when the dropdown is opened

```typescript
// Only fetch when dropdown opens
useEffect(() => {
  if (open && selectedPublication && !brandColorsFetched) {
    prefetchBrandColors([selectedPublication.publicationId]).then(() => {
      setBrandColorsFetched(true);
      forceRender(prev => prev + 1);
    });
  }
}, [open, selectedPublication?.publicationId]);
```

### 3. Modified `PublicationProfile.tsx`

Added explicit brand color prefetching when the Profile tab is viewed (since this component uses brand colors for display):

```typescript
useEffect(() => {
  if (selectedPublication) {
    prefetchBrandColors([selectedPublication.publicationId]);
  }
}, [selectedPublication?.publicationId]);
```

### 4. `FloatingAssistant.tsx`

No changes needed. It continues to call `getPublicationBrandColor()`, but now this returns cached colors or defaults without triggering API calls. Colors will be cached if/when the user opens the publication selector or views the Profile/Storefront tabs.

## Benefits

1. **Reduced Initial Load**: Storefront API calls no longer happen on every dashboard page load
2. **Better Performance**: Only fetches storefront data when actually needed
3. **Progressive Enhancement**: Components show default colors initially, then update to brand colors when cached
4. **Maintains Caching**: Colors are still cached once fetched, avoiding duplicate requests

## Testing

To verify the fix:

1. Open the dashboard - should NOT see `/api/storefront/{id}` calls
2. Click on the publication selector dropdown - SHOULD trigger the API call (first time)
3. Navigate to Profile tab - SHOULD use cached color or trigger fetch if not cached
4. Navigate to Storefront tab - SHOULD fetch full storefront config (as expected)
5. Subsequent dropdown opens - should NOT trigger new API calls (uses cache)

## Files Modified

- `src/config/publicationBrandColors.ts` - Made `getPublicationBrandColor()` synchronous
- `src/components/PublicationSelector.tsx` - Added deferred fetching when dropdown opens
- `src/components/dashboard/PublicationProfile.tsx` - Added explicit prefetching on mount

## Related

- Dashboard component already had conditional rendering to prevent tabs from loading until active
- The FloatingAssistant uses a sensible default color until brand colors are cached

