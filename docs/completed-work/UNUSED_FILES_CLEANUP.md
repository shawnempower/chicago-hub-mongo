# Unused Files - Campaign System Cleanup

## Files That Can Be Deleted

### 🗑️ Test Scripts (Root Directory)

These are temporary test files created during development:

```bash
# Root directory test files
test-algorithms.ts                    ← Delete (superseded by test-all-algorithms.ts)
test-all-algorithms.ts                ← Keep or delete (one-time test)
test-all-inclusive-fixed.ts           ← Delete (old test)
test-analysis-with-save.ts            ← Delete (old test)
test-campaign-with-auth.ts            ← Delete (duplicate of scripts version)
test-proportional-algorithm.ts        ← Delete (old test)
```

**Recommendation**: Delete all root-level `test-*.ts` files
**Reason**: Proper tests should be in `/scripts/` or `/tests/` directory

---

### 🗑️ Test Output Files (Root Directory)

```bash
# JSON test output files
campaign-analysis-new-algorithm.json  ← Delete (test output)
test-campaign-result.json             ← Delete (test output)
test-campaign-result copy.json        ← Delete (test output)
test-campaign-saved.json              ← Delete (test output)
test-output.txt                       ← Delete (test output)
```

**Recommendation**: Delete all test output files
**Reason**: These are temporary test results, not needed in repo

---

### 🗑️ Log Files (Root Directory)

```bash
# Log files (should be in .gitignore)
proportional-test-fixed.log           ← Delete
proportional-test-fixed-v2.log        ← Delete
dev-server.log                        ← Delete (should be gitignored)
server-restart.log                    ← Delete (should be gitignored)
server.pid                            ← Delete (runtime file)
```

**Recommendation**: Delete all `.log` and `.pid` files
**Action**: Add to `.gitignore`:
```
*.log
*.pid
test-*.json
test-*.ts  # (in root only)
```

---

### 📁 Duplicate Test Scripts

These test scripts in `/scripts/` might be duplicates:

```bash
scripts/testCampaignAnalysis.ts       ← Check if used
scripts/testCampaignAnalyze.ts        ← Check if used (similar name)
scripts/testCampaignCreate.ts         ← Check if used
scripts/testCampaignLLMService.ts     ← Check if used
```

**Recommendation**: 
- Keep ONE comprehensive test script
- Delete the rest or consolidate into a single test suite

---

### 📄 Legacy Documentation

These docs might be outdated after recent changes:

```bash
CAMPAIGN_ALGORITHM_IMPLEMENTATION_SUMMARY.md      ← Outdated (pre-database)
PROPORTIONAL_ALGORITHM_IMPLEMENTATION.md          ← Outdated (pre-database)
BUDGET_ALGORITHM_TEST_RESULTS.md                  ← Old test results

docs/CAMPAIGN_BUDGET_ALLOCATION_ALGORITHM.md      ← May be outdated
docs/CAMPAIGN_BUILDER_IMPLEMENTATION_STATUS.md    ← May be outdated
docs/CAMPAIGN_API_TEST.md                         ← May be outdated
```

**Recommendation**: 
- Review and update relevant docs
- Delete or move to `/docs/archive/` if no longer accurate
- Keep only current documentation

---

### 🔍 Files to Review

These files need manual review to determine if still needed:

```bash
FIXES_SUMMARY.md                      ← Review: Is this still relevant?
PACKAGES_UX_SUMMARY_WITH_WIREFRAMES.md ← Review: Is this still current?
LEAD_TYPES_IMPLEMENTATION.md          ← Review: Related to campaigns?
PACKAGE_BUILDER_IMPLEMENTATION.md     ← Review: Still accurate?
```

---

## Cleanup Commands

### Safe Deletion (Definitely Unused)

```bash
cd /Users/shawnchapman/Documents/sites/empowerlocal-all/chicago-hub

# Delete test files
rm -f test-algorithms.ts
rm -f test-all-algorithms.ts
rm -f test-all-inclusive-fixed.ts
rm -f test-analysis-with-save.ts
rm -f test-campaign-with-auth.ts
rm -f test-proportional-algorithm.ts

# Delete test output
rm -f campaign-analysis-new-algorithm.json
rm -f test-campaign-result.json
rm -f "test-campaign-result copy.json"
rm -f test-campaign-saved.json
rm -f test-output.txt

# Delete log files
rm -f proportional-test-fixed.log
rm -f proportional-test-fixed-v2.log
rm -f dev-server.log
rm -f server-restart.log
rm -f server.pid
```

### Update .gitignore

Add these patterns to prevent future commits:

```bash
# Add to .gitignore
cat >> .gitignore << 'EOF'

# Test files and output (root directory only)
/test-*.ts
/test-*.json
/*.log
/*.pid

# Campaign test output
campaign-analysis-*.json
EOF
```

### Archive Old Documentation

```bash
# Create archive directory
mkdir -p docs/archive

# Move old implementation docs
mv CAMPAIGN_ALGORITHM_IMPLEMENTATION_SUMMARY.md docs/archive/
mv PROPORTIONAL_ALGORITHM_IMPLEMENTATION.md docs/archive/
mv BUDGET_ALGORITHM_TEST_RESULTS.md docs/archive/
```

---

## Files to Keep

### ✅ Active Test Scripts (in /scripts/)
```bash
scripts/seed-algorithms.ts            ← KEEP (essential for setup)
scripts/seed-starter-packages.ts      ← KEEP (if still used)
scripts/seedLeads.ts                  ← KEEP (if still used)
scripts/verifyProductionReadiness.ts  ← KEEP (useful for deployment)
```

### ✅ Current Documentation
```bash
docs/ALGORITHM_ADMIN_IMPLEMENTATION.md      ← KEEP (current)
docs/ALGORITHM_CONFIG_FLOW.md               ← KEEP (current)
docs/DATABASE_ONLY_ALGORITHMS.md            ← KEEP (current)
docs/CAMPAIGN_BUILDER_GUIDE.md              ← KEEP (if still accurate)
docs/CAMPAIGN_INTELLIGENCE_GUIDE.md         ← KEEP (if still accurate)
CLEANUP_CHECKLIST.md                        ← KEEP (current)
TROUBLESHOOTING_ALGORITHMS.md               ← KEEP (current)
```

### ✅ Active Source Code
```bash
server/campaignLLMService.ts                ← KEEP (active)
server/campaignLLMConfig.ts                 ← KEEP (active)
server/campaignAlgorithms/**/*.ts           ← KEEP (seed templates)
src/components/campaign/**/*.tsx            ← KEEP (active UI)
src/pages/Campaign*.tsx                     ← KEEP (active pages)
src/integrations/mongodb/campaignSchema.ts  ← KEEP (active schema)
src/integrations/mongodb/campaignService.ts ← KEEP (active service)
src/api/campaigns.ts                        ← KEEP (active API)
```

---

## Summary

### Can Delete Immediately (29 files)
- 6 test scripts (root directory)
- 5 test output JSON files
- 5 log files
- 1 PID file
- 4 duplicate test scripts (maybe)
- 3 outdated documentation files (after review)

### Should Review (5 files)
- Implementation summary docs
- UX wireframes doc
- Fixes summary

### Should Keep (30+ files)
- All active source code
- Current documentation
- Essential scripts in `/scripts/`

### Space Saved
Approximately **5-10 MB** (mostly log files and JSON outputs)

---

## Execution Plan

1. **Backup First** (just in case):
   ```bash
   tar -czf campaign-files-backup-$(date +%Y%m%d).tar.gz \
     test-*.ts test-*.json *.log *.pid \
     CAMPAIGN_ALGORITHM_IMPLEMENTATION_SUMMARY.md \
     PROPORTIONAL_ALGORITHM_IMPLEMENTATION.md \
     BUDGET_ALGORITHM_TEST_RESULTS.md
   ```

2. **Delete unused files**:
   ```bash
   # Run the deletion commands above
   ```

3. **Update .gitignore**:
   ```bash
   # Add the patterns above
   ```

4. **Archive old docs**:
   ```bash
   # Move to docs/archive/
   ```

5. **Commit cleanup**:
   ```bash
   git add .
   git commit -m "chore: cleanup unused campaign test files and logs"
   ```

---

## Impact Assessment

**Risk**: Low
- Only deleting test files, logs, and outdated docs
- No impact on production code
- No impact on database
- Reversible (files backed up)

**Benefits**:
- Cleaner repository
- Less confusion about what's current
- Better .gitignore coverage
- Easier navigation

**Time Required**: 10-15 minutes

