# Newsletter Names Display Fix

## Problem
Newsletter/source names weren't showing up in the package builder breakdown tabs (By Channel, By Outlet).

## Root Cause
The `sourceName` field was being set when extracting new inventory, but wasn't appearing in saved packages because:
1. Existing packages in the database don't have the `sourceName` field (it's optional)
2. The display code was only looking for the `sourceName` field, not the fallback format

## Solution
Implemented a **two-tier fallback** system:

### 1. **Primary: Direct sourceName field**
For newly created packages, uses the `sourceName` field directly:
```typescript
const sourceName = (item as any).sourceName;
```

### 2. **Fallback: Parse from itemName**
For existing/legacy packages, parses the source name from `itemName` which has the format `"Source Name - Item Type"`:
```typescript
if (!sourceName && item.itemName && item.itemName.includes(' - ')) {
  const parts = item.itemName.split(' - ');
  sourceName = parts[0]; // e.g., "The Stay Ready Playbook"
}
```

## Examples

### Newsletter
- **itemName**: "The Stay Ready Playbook - Email Ad"
- **Parsed sourceName**: "The Stay Ready Playbook" ✅

### Radio Show
- **itemName**: "WVON - Morning Drive - 30-second spot"
- **Parsed sourceName**: "WVON" ✅

### Podcast
- **itemName**: "Tech Talk Daily - Host-read ad"
- **Parsed sourceName**: "Tech Talk Daily" ✅

## Display Result

### By Channel Tab
```
📧 Newsletter | Chicago Hub | The Stay Ready Playbook
Email Ad Spot
Frequency: 4x per month
```

### By Outlet Tab  
```
[Publication: Chicago Hub]
Newsletter | The Stay Ready Playbook
Email Ad Spot
```

## Affected Tabs
- ✅ By Channel breakdown
- ✅ By Outlet breakdown
- ✅ Line Items tab (uses same logic)

## Backward Compatibility
✅ Works with existing packages  
✅ Works with new packages  
✅ No database migrations required  
✅ Handles both legacy and new formats

## Files Modified
- `src/components/admin/PackageBuilder/PackageResults.tsx` - Added fallback parsing logic

## Testing
1. Create a new package - should show sourceName directly
2. Edit an existing package - should parse sourceName from itemName
3. Both tabs should display newsletter/source names clearly

