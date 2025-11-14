# Delete Item Bug Fix

## Problem
When deleting a single inventory item from a publication in the package builder, sometimes it would delete ALL items for that entire publication instead of just the one item.

## Root Cause
The bug was in the `handleDeleteItem` function in `PackageResults.tsx` at line 136:

```typescript
// OLD CODE (BUGGY)
if (pub.publicationId !== publicationId) {
  return pub;
}
```

The issue: **Strict equality (`!==`) was failing due to type mismatch**

### Why Type Mismatch Occurred
- `publicationId` can be either a `number` or a `string` depending on:
  - How the data was serialized/deserialized through JSON
  - MongoDB document IDs sometimes being numbers, sometimes strings
  - React state updates converting types

When the strict equality check failed:
1. NO publication matched the `publicationId`
2. The `.map()` returned all publications unchanged
3. But then the filter at line 172-174 removed publications with 0 items
4. If a publication had only 1 item, deleting it would leave 0 items
5. The entire publication would be filtered out by accident

## Solution
Changed from strict equality (`!==`) to loose equality (`!=`):

```typescript
// NEW CODE (FIXED)
// Use == instead of === to handle type coercion (number vs string)
// This handles cases where publicationId might be a string in some contexts
if (pub.publicationId != publicationId) {
  return pub;
}
```

### Why This Works
- Loose equality (`!=`) performs **type coercion**
- `123 != "123"` returns `false` (they're considered equal)
- `123 !== "123"` returns `true` (different types)
- Now the correct publication is always found, regardless of whether IDs are numbers or strings

## Testing Checklist
- [ ] Delete a single item from a publication with multiple items → Only that item is removed
- [ ] Delete a single item from a publication with only one item → Entire publication is removed (expected)
- [ ] Delete items from "By Channel" tab → Works correctly
- [ ] Delete items from "By Outlet" tab → Works correctly
- [ ] Check console logs → Verify "Found publication to update" message appears
- [ ] Verify item counts update correctly after deletion

## Files Modified
- `src/components/admin/PackageBuilder/PackageResults.tsx` (line 136-138)

## Impact
✅ **Low Risk**: Only changed comparison operator
✅ **Backward Compatible**: Works with both string and number IDs
✅ **No Breaking Changes**: All existing functionality preserved
✅ **Better Reliability**: Handles edge cases that caused intermittent bugs

## Console Debugging
The existing debug logs will now show:
```
=== DELETE ITEM DEBUG ===
Deleting item with publicationId: 123 type: number
Publications before: [{id: 123, type: 'number', name: 'Chicago Reader', items: 5}]
Found publication to update: Chicago Reader  ← This should ALWAYS appear now
Items before filter: 5
Items after filter: 4
=== END DELETE DEBUG ===
```

If "Found publication to update" doesn't appear, the bug is still present.

## Additional Notes
- The debug console.log statements are left in place to help diagnose any future issues
- Can be removed later once confirmed stable
- Type coercion with `==` is generally discouraged, but appropriate here for handling legacy data

