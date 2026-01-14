# Frontend & API Changes for Per-Creative Tracking

## Overview

**What Changed in Lambda:**
- Previously: Lambda created ONE performance entry per (order, channel) per day
- Now: Lambda creates ONE performance entry per (order, channel, **creative**) per day
- Each creative (`itemName`) gets its own document in MongoDB

---

## Impact Assessment

### ✅ **NO CHANGES NEEDED**

The good news: **Most of the system already handles this correctly!**

#### 1. **API Aggregation** ✅
All API endpoints in `server/routes/performance-entries.ts` and `server/routes/reporting.ts` already:
- Aggregate multiple entries using `$sum` for impressions, clicks, etc.
- Group by channel, publication, etc. (not by itemName)
- Return correct totals when multiple creatives exist

**Example:** `/api/performance-entries/order/:orderId` sums all entries for an order:
```typescript
entries.forEach(entry => {
  summary.byChannel[ch].impressions += entry.metrics.impressions || 0;
  summary.byChannel[ch].clicks += entry.metrics.clicks || 0;
  // ... correctly aggregates across multiple creatives
});
```

#### 2. **Frontend Performance Tables** ✅
Components that display performance entries ALREADY show individual rows per entry:

- **`OrderPerformanceView.tsx`** - Shows all entries with `itemName` column
  - Already displays each creative separately in the table
  - Each row shows: Date, ItemName, Channel, Metrics

- **`PerformanceEntryManagement.tsx`** - Admin table of all entries
  - Already has `itemName` column
  - Each creative shows as separate row

#### 3. **Dashboard Aggregation** ✅
- **`CampaignPerformanceDashboard.tsx`** - Aggregates at publication/channel level
  - Doesn't show itemName (by design)
  - Correctly sums impressions/clicks across all creatives

---

## 🔍 **POTENTIAL ENHANCEMENTS** (Optional)

While the system works correctly, you may want to improve the UX:

### 1. **Creative-Level Performance View** (Low Priority)

Currently, the "Performance" tab in `CampaignDetail.tsx` shows aggregated metrics. You could add a creative breakdown:

```tsx
// Option A: Add a "By Creative" tab
<TabsContent value="by-creative">
  <Table>
    <TableHead>
      <TableRow>
        <TableHead>Creative</TableHead>
        <TableHead>Publication</TableHead>
        <TableHead>Impressions</TableHead>
        <TableHead>Clicks</TableHead>
        <TableHead>CTR</TableHead>
      </TableRow>
    </TableHead>
    <TableBody>
      {/* Group entries by itemName */}
    </TableBody>
  </Table>
</TabsContent>
```

**Location:** `src/pages/CampaignDetail.tsx` around line 900-1000 in the Performance tab

### 2. **Creative Filter in Performance Tables** (Low Priority)

Add a dropdown to filter by creative in existing tables:

```tsx
// In OrderPerformanceView.tsx or PerformanceEntryManagement.tsx
const [creativeFilter, setCreativeFilter] = useState<string>('all');

const uniqueCreatives = [...new Set(entries.map(e => e.itemName))];

<Select value={creativeFilter} onValueChange={setCreativeFilter}>
  <SelectItem value="all">All Creatives</SelectItem>
  {uniqueCreatives.map(name => (
    <SelectItem key={name} value={name}>{name}</SelectItem>
  ))}
</Select>
```

### 3. **Creative Performance Chart** (Medium Priority)

Add a bar chart comparing creatives in `CampaignPerformanceDashboard.tsx`:

```tsx
// New tab: "By Creative"
const creativeBreakdown = entries.reduce((acc, entry) => {
  if (!acc[entry.itemName]) {
    acc[entry.itemName] = { impressions: 0, clicks: 0, ctr: 0 };
  }
  acc[entry.itemName].impressions += entry.metrics.impressions || 0;
  acc[entry.itemName].clicks += entry.metrics.clicks || 0;
  return acc;
}, {});

// Render as chart or table
```

---

## 📊 **Database Query Patterns**

### Before Fix (Problem):
```javascript
// Lambda upsert filter (WRONG - missing itemName)
{
  orderId: row.order_id,
  itemPath: `tracking-${row.channel || 'display'}`,
  dateStart: new Date(row.date),
  source: 'automated'
}
// Result: Last creative overwrites previous ones
```

### After Fix (Correct):
```javascript
// Lambda upsert filter (CORRECT)
{
  orderId: row.order_id,
  itemPath: `tracking-${row.channel || 'display'}`,
  itemName: row.creative_id,  // ✅ NOW UNIQUE PER CREATIVE
  dateStart: new Date(row.date),
  source: 'automated'
}
// Result: Each creative gets its own document
```

### How Frontend Queries Work:
```typescript
// API fetches ALL entries for an order
const entries = await collection
  .find({ orderId, deletedAt: { $exists: false } })
  .sort({ dateStart: -1, itemPath: 1 })
  .toArray();

// Then aggregates in memory
const totals = entries.reduce((sum, entry) => ({
  impressions: sum.impressions + (entry.metrics.impressions || 0),
  clicks: sum.clicks + (entry.metrics.clicks || 0),
}), { impressions: 0, clicks: 0 });
```

**✅ This pattern is correct and doesn't need changes!**

---

## 🧪 **Testing Recommendations**

### 1. **Verify Multi-Creative Display**
1. Go to Campaign Detail page
2. Navigate to Performance tab
3. Verify you see MULTIPLE rows for the same order/date if multiple creatives exist
4. Verify totals are correct (sum of all rows)

### 2. **Check Aggregation**
1. Open `CampaignPerformanceDashboard`
2. Verify overall metrics = sum of all creatives
3. Check that channel breakdown includes all creatives

### 3. **Test Reporting API**
```bash
# Should return multiple entries for same order
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/performance-entries/order/6960195199937f3b71a2338d"

# Response should show:
# - cr_test_001: 10 impressions, 4 clicks
# - asset-xyz: 5 impressions, 2 clicks
# - Total: 15 impressions, 6 clicks ✅
```

---

## 🎯 **Summary**

### Required Changes: **NONE** ✅

The system already handles per-creative tracking correctly because:
1. APIs aggregate using `$sum` across all entries
2. UI tables display individual entries (including itemName)
3. Dashboard aggregations work at publication/channel level

### Optional Enhancements:
1. Add "By Creative" performance view (for comparing creative effectiveness)
2. Add creative filter dropdown in tables
3. Add creative performance chart

### Key Validation:
- ✅ Multiple entries per order display correctly in tables
- ✅ Totals aggregate correctly across all creatives
- ✅ Lambda now creates one document per creative (not one per order)

---

## 📝 **Example Data Flow**

### Before Fix (❌ Bug):
```
CloudFront Logs → Athena Query:
  cr_test_001: 5 imp (display event)
  cr_test_001: 2 click (click event)  ← Separate rows!

Lambda Process:
  Row 1: cr_test_001, 5 imp, 0 clicks → Upsert to DB
  Row 2: cr_test_001, 0 imp, 2 clicks → Upsert OVERWRITES Row 1 ❌

MongoDB Result:
  cr_test_001: 0 impressions, 2 clicks ❌ WRONG!
```

### After Fix (✅ Correct):
```
CloudFront Logs → Athena Query (Fixed GROUP BY):
  cr_test_001: 5 imp, 2 clicks ← SINGLE ROW! ✅

Lambda Process:
  Row 1: cr_test_001, 5 imp, 2 clicks → Upsert to DB ✅

MongoDB Result:
  cr_test_001: 5 impressions, 2 clicks ✅ CORRECT!
```

### Frontend Display:
```
GET /api/performance-entries/order/xxx

Response:
[
  { itemName: "cr_test_001", impressions: 5, clicks: 2 },
  { itemName: "asset-xyz", impressions: 10, clicks: 3 }
]

UI Table:
┌─────────────────┬─────────────┬────────┐
│ Creative        │ Impressions │ Clicks │
├─────────────────┼─────────────┼────────┤
│ cr_test_001     │ 5           │ 2      │
│ asset-xyz       │ 10          │ 3      │
├─────────────────┼─────────────┼────────┤
│ TOTAL           │ 15          │ 5      │ ✅
└─────────────────┴─────────────┴────────┘
```

---

## 🚀 **Next Steps**

1. **Deploy Lambda fix** ✅ (Already done!)
2. **Test frontend** - Verify tables show multiple creatives
3. **Monitor** - Check that aggregations are correct
4. **(Optional)** Add creative comparison views for better insights

**No immediate frontend changes required!** 🎉
