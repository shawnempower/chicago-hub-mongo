# Files to Remove - Cleanup List

## 🗑️ Scripts (Diagnostic - Can Remove)

These were created for debugging today and are no longer needed:

### **1. scripts/checkCampaignAssets.ts**
**Purpose**: Diagnostic script to inspect campaign assets and inventory structure  
**Used For**: Debugging the "0 assets" issue today  
**Keep?**: ❌ **NO** - One-time diagnostic use  
**Action**: Delete

### **2. scripts/checkCampaignIds.ts**
**Purpose**: Diagnostic script to check campaign ID mismatch between ObjectId and string  
**Used For**: Finding why assets weren't loading (ID format mismatch)  
**Keep?**: ❌ **NO** - One-time diagnostic use  
**Action**: Delete

### **3. scripts/inspectInventoryDetails.ts**
**Purpose**: Diagnostic script to inspect inventory item fields in detail  
**Used For**: Understanding inventory schema and available fields  
**Keep?**: ❌ **NO** - One-time diagnostic use  
**Action**: Delete

---

## ✅ Scripts (Utilities - Keep)

These are useful ongoing maintenance tools:

### **1. scripts/deleteDraftOrders.ts**
**Purpose**: Delete draft orders to allow regeneration  
**Used For**: Resetting orders when testing or fixing issues  
**Keep?**: ✅ **YES** - Useful utility  
**Why**: Needed for order regeneration workflow

### **2. scripts/cleanupDuplicateAssets.ts**
**Purpose**: Clean up duplicate and unassigned creative assets  
**Used For**: Removing excess test uploads, maintaining database hygiene  
**Keep?**: ✅ **YES** - Useful utility  
**Why**: Ongoing maintenance tool for asset cleanup

---

## 📄 Documentation (All Keep)

All documentation files created today are valuable:

### **Keep All:**
1. ✅ `docs/DYNAMIC_ASSET_LOADING.md` - How dynamic loading works
2. ✅ `docs/ASSETS_INLINE_WITH_PLACEMENTS.md` - UI changes documentation
3. ✅ `docs/PHASE4_ASSETS_TO_ORDERS.md` - Phase 4 implementation
4. ✅ `docs/ASSET_WORKFLOW_COMPLETE.md` - Complete workflow overview
5. ✅ `docs/CODE_REVIEW_2025-11-25.md` - Technical review
6. ✅ `docs/CLEANUP_RECOMMENDATIONS.md` - Best practices & action items

**Why Keep**: These document important architectural decisions and implementation details that will be valuable for:
- New team members onboarding
- Future debugging
- Understanding why decisions were made
- Reference for similar features

---

## 🧹 Recommended Cleanup Action

### **Quick Command:**
```bash
# Remove diagnostic scripts (safe to delete)
rm scripts/checkCampaignAssets.ts
rm scripts/checkCampaignIds.ts
rm scripts/inspectInventoryDetails.ts
```

### **What to Keep:**
```bash
# These are useful utilities - KEEP
scripts/deleteDraftOrders.ts
scripts/cleanupDuplicateAssets.ts

# All documentation - KEEP
docs/*.md
```

---

## 📊 File Summary

| Type | Total | Keep | Remove |
|------|-------|------|--------|
| **Diagnostic Scripts** | 3 | 0 | 3 ⚠️ |
| **Utility Scripts** | 2 | 2 | 0 |
| **Documentation** | 6 | 6 | 0 |
| **TOTAL** | 11 | 8 | **3 to remove** |

---

## 🔍 Other Cleanup Opportunities

While reviewing the full scripts folder, I noticed many test/migration scripts. Consider reviewing these for cleanup in a separate session:

### **Potentially Old Scripts:**
- `testCampaignAnalysis.ts`
- `testCampaignAnalyze.ts`
- `testCampaignCreate.ts`
- `testCampaignLLMService.ts`
- `testEmail.ts`
- `testInviteEmail.ts`
- `testMailgunRegions.ts`

**Recommendation**: Review these with the team to determine if they're still needed or should be converted to proper unit tests.

---

## ✅ Action Plan

1. **Now**: Delete 3 diagnostic scripts (safe, no risk)
2. **Keep**: 2 utility scripts (deleteDraftOrders, cleanupDuplicateAssets)
3. **Keep**: All documentation
4. **Later**: Review other test scripts with team

**Safe to proceed with removal!**

