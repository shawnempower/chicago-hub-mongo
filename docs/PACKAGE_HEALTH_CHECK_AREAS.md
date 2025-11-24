# Package Health Check: Areas Requiring Updates

## Overview
Once we implement Package Health Check functionality (showing stored vs. calculated values), these areas of the application will need updates to display the new data.

---

## 1. Package Browsing & Selection

### 📍 `src/pages/Packages.tsx` (Lines 258-369)
**Current:** Shows only stored reach/pricing
**Needs:**
- Health indicator badge (✅ Current / ⚠️ Needs Review / 🔴 Critical)
- Price drift indicator: "Was $5,000 → Now $5,500"
- Reach drift indicator: "Reach improved 15%" or "Reach declined 10%"
- "Last verified" timestamp
- Visual highlight for packages with significant changes

```typescript
// Example Enhancement:
<Badge className={getHealthBadgeStyle(pkg.health.status)}>
  {pkg.health.status === 'current' ? '✅ Current' : '⚠️ Needs Review'}
</Badge>

{pkg.health?.checks?.pricing?.deltaPercent > 5 && (
  <div className="text-xs text-amber-600">
    Price changed: ${pkg.health.checks.pricing.storedPrice} → ${pkg.health.checks.pricing.currentPrice}
    ({pkg.health.checks.pricing.deltaPercent}% {pkg.health.checks.pricing.deltaPercent > 0 ? 'increase' : 'decrease'})
  </div>
)}
```

---

### 📍 `src/components/campaign/CampaignPackageSelectionStep.tsx` (Lines 201-314)
**Current:** Shows package cards for campaign selection
**Needs:**
- Real-time recalculation warning before campaign creation
- "⚠️ This package has outdated pricing - recalculate?" prompt
- Show both stored and current values side-by-side
- Prevent selection of critically outdated packages

```typescript
// Example Enhancement:
{pkg.health?.overallHealth === 'critical' && (
  <Alert variant="destructive" className="mt-3">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Package Unavailable</AlertTitle>
    <AlertDescription>
      {pkg.health.checks.availability.unavailableItems.length} inventory items no longer available.
      Please contact admin to update this package.
    </AlertDescription>
  </Alert>
)}
```

---

## 2. Campaign Creation Flow

### 📍 `src/components/campaign/CampaignReviewStep.tsx` (Lines 37-296)
**Current:** Shows campaign summary with package pricing/reach
**Needs:**
- **Critical:** Show "calculated at creation time" values, not stored package values
- Warning if package was created >30 days ago
- Button to "Recalculate with current pricing" before finalizing
- Comparison view: Package's stored value vs. current calculation

```typescript
// Example Enhancement:
{isPackageBased && packageAge > 30 && (
  <Alert className="mt-4">
    <Info className="h-4 w-4" />
    <AlertDescription>
      This package was created {packageAge} days ago. 
      <Button variant="link" onClick={handleRecalculate}>
        Recalculate with current inventory data
      </Button>
    </AlertDescription>
  </Alert>
)}

// Show both values:
<div className="grid grid-cols-2 gap-4">
  <div>
    <p className="text-xs text-muted-foreground">Package Estimate (Created {packageCreatedDate})</p>
    <p className="text-2xl font-bold">{packagePrice.toLocaleString()}</p>
  </div>
  <div>
    <p className="text-xs text-muted-foreground">Current Price ✨</p>
    <p className={`text-2xl font-bold ${priceDelta > 0 ? 'text-amber-600' : 'text-green-600'}`}>
      {currentPrice.toLocaleString()}
    </p>
  </div>
</div>
```

---

## 3. Package Management (Admin)

### 📍 `src/components/admin/HubPackageManagement.tsx` (Lines 45-1246)
**Current:** Package list and builder results
**Needs:**
- **New Tab:** "Package Health" dashboard
- Bulk health check for all packages
- "Review Needed" filter/sort
- Quick actions: "Recalculate & Save" / "Archive Outdated"
- Health score column in package table

```typescript
// New Health Dashboard Tab:
<TabsContent value="health">
  <PackageHealthDashboard
    packages={packages}
    onBulkRecalculate={handleBulkRecalculate}
    onArchiveOutdated={handleArchiveOutdated}
  />
</TabsContent>

// Package table enhancement:
columns: [
  { header: 'Package Name', accessor: 'basicInfo.name' },
  { header: 'Price', accessor: (pkg) => renderPriceWithDrift(pkg) },
  { header: 'Reach', accessor: (pkg) => renderReachWithDrift(pkg) },
  { 
    header: 'Health', 
    accessor: (pkg) => <HealthBadge status={pkg.health?.overallHealth} /> 
  },
  { header: 'Last Verified', accessor: (pkg) => formatRelativeTime(pkg.health?.lastChecked) },
  { header: 'Actions', accessor: (pkg) => <HealthActions package={pkg} /> }
]
```

---

## 4. Hub Central Dashboard

### 📍 `src/components/admin/HubCentralDashboard.tsx` (Lines 129-876)
**Current:** Overview stats for publications, inventory, pricing
**Needs:**
- **New Widget:** "Package Health Summary"
  - X packages need review
  - Y packages have pricing changes
  - Z packages have availability issues
- Quick link to "Review All Packages"

```typescript
// New Widget:
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <PackageIcon className="h-5 w-5" />
      Package Health
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm">Healthy</span>
        <Badge variant="success">{healthyCount} packages</Badge>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm">Needs Attention</span>
        <Badge variant="warning">{needsAttentionCount} packages</Badge>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm">Critical</span>
        <Badge variant="destructive">{criticalCount} packages</Badge>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-2">
        Review All Packages →
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 5. Package Detail View

### 📍 `src/pages/Packages.tsx` (Lines 367-504) - Detail Modal
**Current:** Shows package details in modal
**Needs:**
- **New Section:** "Package Health Check"
- Side-by-side comparison: Stored vs. Current
- Per-item availability status
- "Recalculate Now" button
- History: Show previous health checks

```typescript
// Health Check Section:
<Card>
  <CardHeader>
    <CardTitle>Package Health Check</CardTitle>
    <CardDescription>
      Last checked: {formatRelativeTime(pkg.health?.lastChecked)} • 
      <Button variant="link" size="sm" onClick={handleRunHealthCheck}>
        Run Check Now
      </Button>
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-6">
      {/* Pricing Comparison */}
      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Stored Price</p>
          <p className="text-2xl font-bold">${pkg.health.checks.pricing.storedPrice}</p>
          <p className="text-xs text-muted-foreground">Set {formatDate(pkg.lastModified)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-2xl font-bold text-blue-600">${pkg.health.checks.pricing.currentPrice}</p>
          <p className={`text-sm font-medium ${getPriceDeltaColor(pkg.health.checks.pricing.deltaPercent)}`}>
            {pkg.health.checks.pricing.deltaPercent > 0 ? '↑' : '↓'} 
            {Math.abs(pkg.health.checks.pricing.deltaPercent)}% change
          </p>
        </div>
      </div>

      {/* Reach Comparison */}
      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Stored Reach</p>
          <p className="text-2xl font-bold">{pkg.health.checks.reach.storedReach.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Reach</p>
          <p className="text-2xl font-bold text-blue-600">
            {pkg.health.checks.reach.currentReach.toLocaleString()}
          </p>
          <p className={`text-sm font-medium ${getReachDeltaColor(pkg.health.checks.reach.deltaPercent)}`}>
            {pkg.health.checks.reach.status === 'improved' ? '↑ Improved' : '↓ Declined'} 
            {Math.abs(pkg.health.checks.reach.deltaPercent)}%
          </p>
        </div>
      </div>

      {/* Availability Issues */}
      {pkg.health.checks.availability.status !== 'available' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Inventory Availability Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {pkg.health.checks.availability.unavailableItems.map(item => (
                <li key={item}>{item} is no longer available</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {pkg.health.recommendedAction !== 'none' && (
          <Button onClick={handleUpdatePackage}>
            Update Package with Current Values
          </Button>
        )}
        {pkg.health.overallHealth === 'critical' && (
          <Button variant="destructive" onClick={handleArchivePackage}>
            Archive Package
          </Button>
        )}
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 6. Package Builder Results

### 📍 `src/components/admin/PackageBuilder/PackageResults.tsx` (Lines 47-1078)
**Current:** Shows builder results before saving
**Needs:**
- **Already has live calculation** via `calculatePackageReach()` (line 113)
- Add "This will be saved as baseline" message
- Show "Future health checks will compare against these values"

```typescript
// Enhancement:
<Alert className="mb-4">
  <Info className="h-4 w-4" />
  <AlertDescription>
    These calculations will be saved as the package baseline. 
    Future health checks will compare against these values to detect pricing or reach changes.
  </AlertDescription>
</Alert>
```

---

## 7. Campaign Detail Page

### 📍 `src/pages/CampaignDetail.tsx` (Lines 53-1177)
**Current:** Shows campaign details, inventory, pricing
**Needs:**
- **Show locked values:** "Campaign created with reach of X" (don't recalculate)
- Comparison: "Package had reach of Y when created, now has Z"
- Historical accuracy section

```typescript
// Historical Accuracy Section:
<Card>
  <CardHeader>
    <CardTitle>Campaign Baseline</CardTitle>
    <CardDescription>Values at campaign creation time</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Reach (promised)</span>
        <span className="font-semibold">{campaign.estimatedPerformance.reach.min.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Price (contracted)</span>
        <span className="font-semibold">${campaign.pricing.breakdown.finalPrice.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Calculated on</span>
        <span className="font-semibold">{formatDate(campaign.estimatedPerformance.reach.calculatedAt)}</span>
      </div>
    </div>
    
    {packageCurrentValues && (
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-2">Current Package Values (for reference)</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Package reach now</span>
            <span className={`font-semibold ${getComparisonColor(packageCurrentValues.reach, campaign.estimatedPerformance.reach.min)}`}>
              {packageCurrentValues.reach.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Package price now</span>
            <span className={`font-semibold ${getComparisonColor(packageCurrentValues.price, campaign.pricing.breakdown.finalPrice)}`}>
              ${packageCurrentValues.price.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

---

## 8. Reporting & Analytics

### 📍 `src/components/admin/HubPricingAnalytics.tsx` (Lines 122-1282)
**Current:** Pricing analytics by channel
**Needs:**
- **New Section:** "Package Pricing Trends"
- Chart showing package price drift over time
- Alert for packages that have drifted >15%

```typescript
// New Pricing Trends Chart:
<Card>
  <CardHeader>
    <CardTitle>Package Pricing Trends</CardTitle>
    <CardDescription>
      Tracking price changes across all packages
    </CardDescription>
  </CardHeader>
  <CardContent>
    <LineChart data={packagePricingHistory} />
    
    {/* Packages with significant drift */}
    {packagesWithDrift.length > 0 && (
      <div className="mt-4">
        <p className="text-sm font-semibold mb-2">Packages Needing Price Updates:</p>
        <ul className="space-y-1">
          {packagesWithDrift.map(pkg => (
            <li key={pkg.id} className="text-sm">
              • {pkg.name}: {pkg.drift}% price increase
            </li>
          ))}
        </ul>
      </div>
    )}
  </CardContent>
</Card>
```

---

## 9. New Components to Create

### `src/components/admin/PackageHealthDashboard.tsx` (NEW)
Comprehensive package health monitoring dashboard

**Features:**
- Health status overview (pie chart)
- Sortable table with all packages and health scores
- Filters: Health status, last check date, price drift %, reach drift %
- Bulk actions: Recalculate, Update, Archive
- Export health report as CSV

---

### `src/components/admin/PackageHealthCheck.tsx` (NEW)
Individual package health check component (reusable)

**Features:**
- Run health check on-demand
- Display results in structured format
- Recommend actions based on findings
- Historical health check log

---

### `src/components/ui/HealthBadge.tsx` (NEW)
Visual health status indicator

```typescript
type HealthStatus = 'healthy' | 'needs-attention' | 'critical';

<HealthBadge status="healthy" /> // ✅ Healthy
<HealthBadge status="needs-attention" /> // ⚠️ Needs Attention
<HealthBadge status="critical" /> // 🔴 Critical
```

---

## 10. Backend API Endpoints to Create

### `GET /api/hub-packages/:id/health-check`
Run health check for a single package

**Response:**
```typescript
{
  packageId: string;
  packageName: string;
  lastModified: Date;
  checks: {
    pricing: { status, storedPrice, currentPrice, deltaPercent };
    reach: { status, storedReach, currentReach, deltaPercent };
    availability: { status, unavailableItems };
    inventory: { status, inventoryAge, publicationsNeedingUpdate };
  };
  recommendedAction: 'none' | 'review' | 'update-required' | 'archive';
  overallHealth: 'healthy' | 'needs-attention' | 'critical';
}
```

---

### `POST /api/hub-packages/:id/recalculate`
Recalculate and update package with current values

**Request:**
```typescript
{
  updatePricing: boolean;
  updateReach: boolean;
  updateInventory: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  oldValues: { pricing, reach };
  newValues: { pricing, reach };
  changes: string[]; // List of what changed
}
```

---

### `POST /api/hub-packages/bulk-health-check`
Run health checks for multiple packages

**Request:**
```typescript
{
  packageIds: string[];
  hubId?: string; // Check all packages in hub
}
```

---

### `GET /api/hub-packages/health-summary`
Get overall health statistics for dashboard widget

**Response:**
```typescript
{
  total: number;
  healthy: number;
  needsAttention: number;
  critical: number;
  lastChecked: Date;
  packagesNeedingReview: PackageHealthCheck[];
}
```

---

## 11. Database Schema Updates

### Add to `HubPackage` schema:

```typescript
healthCheck?: {
  lastChecked: Date;
  checks: {
    pricing: {
      status: 'current' | 'outdated' | 'significant-change';
      storedPrice: number;
      currentPrice: number;
      deltaPercent: number;
    };
    reach: {
      status: 'current' | 'improved' | 'declined';
      storedReach: number;
      currentReach: number;
      deltaPercent: number;
    };
    availability: {
      status: 'available' | 'partially-available' | 'unavailable';
      unavailableItems: string[];
    };
    inventory: {
      status: 'current' | 'stale';
      inventoryAge: number;
      publicationsNeedingUpdate: string[];
    };
  };
  recommendedAction: 'none' | 'review' | 'update-required' | 'archive';
  overallHealth: 'healthy' | 'needs-attention' | 'critical';
  history?: Array<{
    checkedAt: Date;
    overallHealth: string;
    changes: string[];
  }>;
};
```

---

## 12. Scheduled Jobs

### Nightly Package Health Check
- Run health checks on all active packages
- Flag packages needing attention
- Send admin email digest of issues
- Update package health status in database

---

## Implementation Priority

### Phase 1 (Core Functionality)
1. Backend health check API endpoints
2. Database schema updates
3. PackageHealthCheck component
4. Update HubPackageManagement to show health status

### Phase 2 (User-Facing)
5. Update Packages.tsx browsing page with health indicators
6. Update CampaignPackageSelectionStep with warnings
7. Update CampaignReviewStep with recalculation option

### Phase 3 (Admin Tools)
8. PackageHealthDashboard component
9. Hub Central dashboard widget
10. Bulk actions and reporting

### Phase 4 (Automation)
11. Scheduled nightly health checks
12. Email notifications for critical issues
13. Historical trending and analytics

---

## Success Metrics

- ✅ Users can see package health at a glance
- ✅ Admins are alerted when packages need updating
- ✅ Campaigns use accurate, current pricing and reach
- ✅ No "stale" packages go unnoticed
- ✅ Reduced customer complaints about pricing discrepancies
- ✅ Improved trust in package recommendations

---

**Next Step:** Should I implement Phase 1 (Core Functionality) first?

