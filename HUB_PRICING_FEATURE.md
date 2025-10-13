# Hub-Specific Pricing Feature

## Overview
Added comprehensive support for hub-specific pricing across all advertising inventory types. This allows publications to define different prices for the same ad slot when displayed in different marketing hub contexts.

## Changes Made

### 1. New Component: HubPricingEditor
**File:** `src/components/dashboard/HubPricingEditor.tsx`

A reusable pricing component that provides:
- **Default Pricing Row**: Non-deletable, with "Default Price" label (inactive dropdown)
- **Hub-Specific Pricing Rows**: Deletable rows with active hub selection dropdown
- **Pricing Features**:
  - Amount input with non-deletable $ prefix
  - Pricing model dropdown (e.g., /month, /quarter, /week, /post)
  - Support for multiple pricing fields per ad type
  - Visual distinction (blue background for hub-specific rows)
  - Add/remove hub pricing capability

**Available Hubs** (configurable):
- Chicago Hub
- Portland Hub
- Seattle Hub
- Austin Hub
- Denver Hub

### 2. Updated Components

#### DashboardInventoryManager
**File:** `src/components/dashboard/DashboardInventoryManager.tsx`

Updated ad slot editing for:
- ✅ **Website Ads**: Flat Rate, CPM pricing with pricing models (flat, cpm, cpc, contact)
- ✅ **Newsletter Ads**: Per Send, Monthly Rate with pricing models (per_send, monthly, contact)
- ✅ **Print Ads**: One Time, 4 Times, 12 Times, Open Rate with pricing models (one_time, package, contact)
- ✅ **Podcast Ads**: Per Episode, CPM with pricing models (flat, cpm, contact)
- ✅ **Radio Ads**: Per Spot, Weekly, Monthly with pricing models (per_spot, weekly, monthly, contact)
- ✅ **Streaming Ads**: CPM, Flat Rate with pricing models (cpm, flat, contact)
- ✅ **Social Media Ads**: Per Post, Per Story, Monthly with pricing models (per_post, per_story, monthly, contact)

#### PublicationInventoryManager (Admin)
**File:** `src/components/admin/PublicationInventoryManager.tsx`

Updated all advertising types with the same hub pricing support as Dashboard, plus:
- ✅ **Event Sponsorships**: Sponsorship Fee with pricing models (one_time, annual, contact)

### 3. UI/UX Features

#### Pricing Layout
- **Separator**: Horizontal bar before pricing section
- **Last Item**: Pricing appears as the last item in the modal
- **Horizontal Alignment**: All pricing fields displayed in a single row
- **Visual Hierarchy**: 
  - Default pricing in subtle muted background
  - Hub pricing in blue-tinted background with border

#### Default Price Row
- **Hub Dropdown**: Inactive, displays "Default Price"
- **Amount Field**: Input with $ prefix (undeletable)
- **Pricing Model**: Dropdown with context-specific options

#### Hub Pricing Rows
- **Hub Dropdown**: Active, allows selection of available hubs
- **Smart Hub Selection**: Only shows hubs not already in use
- **Amount Field**: Input with $ prefix
- **Pricing Model**: Dropdown matching default row options
- **Delete Button**: Red trash icon (only on hub pricing rows)

#### Add Hub Pricing Button
- **Location**: Below all pricing rows
- **Icon**: Plus icon with "Add Hub Pricing" label
- **Smart Display**: Only shows when there are unused hubs available
- **Auto-select**: Automatically selects first available hub when adding

### 4. Data Structure

Each advertising opportunity now supports:
```typescript
{
  // ... other ad properties
  pricing: {
    // Default pricing fields (varies by ad type)
    flatRate?: number;
    cpm?: number;
    perSend?: number;
    // ... etc
    pricingModel?: string;
  },
  hubPricing: [
    {
      hubId: string;
      hubName: string;
      pricing: {
        // Same fields as default pricing
      };
      discount?: number;
      available?: boolean;
      minimumCommitment?: string;
    }
  ]
}
```

## Schema Compatibility

The implementation fully supports the existing publication schema's `hubPricing` array structure:
- ✅ hubId & hubName for identification
- ✅ pricing object with ad-type-specific fields
- ✅ discount percentage (0-100)
- ✅ availability toggle
- ✅ minimum commitment text

## Benefits

1. **Flexible Pricing**: Publications can offer different rates to different marketing hubs
2. **Default Fallback**: Default pricing always available if hub-specific pricing not set
3. **Easy Management**: Visual, intuitive interface for managing multiple price points
4. **Scalable**: Easy to add new hubs or pricing models
5. **Consistent UX**: Same interface across all ad types and components

## Testing Recommendations

1. **Create Ad Slots**: Test adding new ad slots with default pricing only
2. **Add Hub Pricing**: Test adding hub-specific pricing for different hubs
3. **Edit Hub Pricing**: Test modifying existing hub prices
4. **Delete Hub Pricing**: Test removing hub-specific pricing rows
5. **Hub Selection**: Verify only available hubs appear in dropdowns
6. **Save & Retrieve**: Ensure hub pricing persists correctly in database
7. **Different Ad Types**: Test across all supported ad types

## Future Enhancements

Potential improvements:
- Dynamic hub list from backend API
- Bulk pricing updates across multiple hubs
- Pricing history/versioning
- Price comparison views
- Hub-specific discount rules
- Minimum commitment enforcement

