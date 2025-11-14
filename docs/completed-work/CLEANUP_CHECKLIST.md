# Cleanup Checklist - Database-Only Algorithm Migration

## Items to Clean Up

### 1. ✅ Remove Code-Based Algorithm Registry (Optional)

**Files that can be deleted or simplified:**

```
server/campaignAlgorithms/
├── all-inclusive/config.ts     ← Can delete (used only for seeding)
├── budget-friendly/config.ts   ← Can delete (used only for seeding)
├── little-guys/config.ts       ← Can delete (used only for seeding)
├── proportional/config.ts      ← Can delete (used only for seeding)
└── registry.ts                 ← Simplify (remove unused code)
```

**Decision**: Keep or Delete?
- **Keep if**: You want to version control algorithm defaults in code
- **Delete if**: You want database to be the ONLY place configs exist

**Recommendation**: **KEEP** the config files but mark them as "seed templates only"

---

### 2. ✅ Clean Up `registry.ts`

**Current state:**
- Still has `algorithmRegistry` object (lines 15-20)
- Still has `getAlgorithm()` function (lines 25-31) - NOT USED anymore
- Still has `listAlgorithms()` function (lines 68-80) - STILL USED

**What to do:**

#### Option A: Minimal Cleanup (Recommended)
Keep everything for seeding script compatibility:
```typescript
// Keep as-is, it's used by seed-algorithms.ts
export const algorithmRegistry = { ... };
export function getAlgorithm() { ... }; // Used by seed script
```

#### Option B: Maximum Cleanup
Remove `algorithmRegistry` and update seed script to import directly:
```typescript
// registry.ts - remove algorithmRegistry, getAlgorithm
// seed-algorithms.ts - import configs directly
```

**Recommendation**: **Option A** - Keep it simple, the code isn't hurting anything

---

### 3. ✅ Update `listAlgorithms()` to Use Database

**Current issue:**
`/api/campaigns/algorithms` endpoint (line 2568) uses code-based `listAlgorithms()`

**Location**: `server/index.ts:2568`

```typescript
// CURRENT (uses code):
app.get('/api/campaigns/algorithms', async (req, res) => {
  const { listAlgorithms } = await import('./campaignAlgorithms/registry.js');
  const algorithms = listAlgorithms();  // ← Returns code-based configs
  res.json({ algorithms });
});
```

**Should be (uses database):**
```typescript
app.get('/api/campaigns/algorithms', async (req, res) => {
  const db = getDatabase();
  const algorithms = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS)
    .find({ isActive: { $ne: false } })
    .project({ algorithmId: 1, name: 1, description: 1, icon: 1 })
    .toArray();
  res.json({ algorithms: algorithms.map(a => ({
    id: a.algorithmId,
    name: a.name,
    description: a.description,
    icon: a.icon
  })) });
});
```

**Action**: ✅ **MUST FIX** - This endpoint should load from database

---

### 4. ✅ Update `getDefaultAlgorithm()` to Use Database

**Current issue:**
Hardcoded to return `'all-inclusive'`

**Location**: `server/campaignAlgorithms/registry.ts:85`

```typescript
// CURRENT (hardcoded):
export function getDefaultAlgorithm(): AlgorithmType {
  return 'all-inclusive';
}
```

**Should be (uses database):**
```typescript
export async function getDefaultAlgorithm(): Promise<AlgorithmType> {
  const db = getDatabase();
  const defaultAlg = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS)
    .findOne({ isDefault: true });
  return (defaultAlg?.algorithmId || 'all-inclusive') as AlgorithmType;
}
```

**Action**: ✅ **SHOULD FIX** - Allow changing default via admin UI

---

### 5. ⚠️ Remove Unused Reset Endpoint

**Status**: ✅ **ALREADY DONE** - Removed in previous changes

---

### 6. 📝 Update Documentation

**Files to update:**
- `docs/PROPORTIONAL_ALGORITHM.md` - References to `listAlgorithms()`
- `PROPORTIONAL_ALGORITHM_IMPLEMENTATION.md` - References to registry
- `docs/ALGORITHM_CONFIG_FLOW.md` - Already updated ✅

**Action**: Update or mark as "legacy" documentation

---

## Summary of Required Changes

### 🔴 Critical (Breaks consistency)
1. **Fix `/api/campaigns/algorithms` endpoint** - Uses code instead of database
2. **Make `getDefaultAlgorithm()` async** - Query database for default

### 🟡 Recommended (Improves clarity)
3. **Add comments to config files** - Mark as "seed templates only"
4. **Simplify `listAlgorithms()`** - Remove from registry, not needed

### 🟢 Optional (Nice to have)
5. **Update old documentation** - Mark legacy docs as outdated
6. **Add JSDoc comments** - Clarify what's still used vs. deprecated

---

## Estimated Impact

- **Breaking Changes**: None (if fixes applied)
- **User Impact**: None visible
- **Code Clarity**: Much improved after cleanup
- **Time to Complete**: ~30 minutes

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Do Now)
```bash
# 1. Fix /api/campaigns/algorithms endpoint
# 2. Make getDefaultAlgorithm() async and query DB
# 3. Update campaignLLMService.ts to await getDefaultAlgorithm()
```

### Phase 2: Cleanup (Do Soon)
```bash
# 1. Add comments to config files marking them as seed-only
# 2. Update documentation to reflect database-only approach
# 3. Consider removing unused functions
```

### Phase 3: Optimization (Do Later)
```bash
# 1. Cache algorithm configs in memory with TTL
# 2. Add algorithm versioning
# 3. Add algorithm import/export tools
```

---

## Files That Need Attention

```
Priority 1 (Must Fix):
  server/index.ts:2568                          - Fix /api/campaigns/algorithms
  server/campaignAlgorithms/registry.ts:85      - Fix getDefaultAlgorithm()
  server/campaignLLMService.ts:889              - Update to await getDefaultAlgorithm()

Priority 2 (Should Fix):
  server/campaignAlgorithms/*/config.ts         - Add "seed only" comments
  server/campaignAlgorithms/registry.ts         - Add deprecation notices

Priority 3 (Nice to Have):
  docs/PROPORTIONAL_ALGORITHM.md                - Update references
  PROPORTIONAL_ALGORITHM_IMPLEMENTATION.md      - Mark as legacy
```

---

## Ready to Clean Up?

Run this to see what's using the old code:
```bash
# Find references to old registry
grep -r "algorithmRegistry" server/
grep -r "getAlgorithm(" server/
grep -r "listAlgorithms()" server/

# Check if seed script still works
npx tsx scripts/seed-algorithms.ts --dry-run
```

