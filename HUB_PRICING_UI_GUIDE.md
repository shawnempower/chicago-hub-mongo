# Hub Pricing UI Guide

## Visual Layout

### Pricing Section Structure

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [Separator Line]                                                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Price                                                                           │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ DEFAULT PRICING (Muted Background)                                         │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                            │ │
│  │  Hub            Flat Rate       CPM         Pricing Model              🔲 │ │
│  │  ┌────────┐    ┌─────────┐    ┌─────────┐  ┌──────────────┐               │ │
│  │  │Default │    │ $ 100   │    │ $ 5     │  │ /month    ▼ │               │ │
│  │  │Price ▼ │    └─────────┘    └─────────┘  └──────────────┘               │ │
│  │  └────────┘    (disabled)                                                 │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ HUB PRICING #1 (Blue Background)                                           │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                            │ │
│  │  Hub            Flat Rate       CPM         Pricing Model              🗑️ │ │
│  │  ┌────────┐    ┌─────────┐    ┌─────────┐  ┌──────────────┐               │ │
│  │  │Chicago │    │ $ 80    │    │ $ 4     │  │ /month    ▼ │               │ │
│  │  │Hub  ▼  │    └─────────┘    └─────────┘  └──────────────┘               │ │
│  │  └────────┘                                                                │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ HUB PRICING #2 (Blue Background)                                           │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                            │ │
│  │  Hub            Flat Rate       CPM         Pricing Model              🗑️ │ │
│  │  ┌────────┐    ┌─────────┐    ┌─────────┐  ┌──────────────┐               │ │
│  │  │Portland│    │ $ 90    │    │ $ 4.50  │  │ /month    ▼ │               │ │
│  │  │Hub  ▼  │    └─────────┘    └─────────┘  └──────────────┘               │ │
│  │  └────────┘                                                                │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          ➕ Add Hub Pricing                                │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Field Specifications

### Default Pricing Row
- **Background**: Muted gray (`bg-muted/30`)
- **Hub Dropdown**: 
  - Disabled state
  - Shows "Default Price"
  - Cannot be changed
- **Amount Input**:
  - `$` prefix (non-editable)
  - Number input type
  - Placeholder from pricing field config
- **Pricing Model Dropdown**:
  - Options vary by ad type
  - Examples: "/month", "/quarter", "/week", "/post", "/1000 impressions"

### Hub Pricing Rows
- **Background**: Blue tint (`bg-blue-50/50 dark:bg-blue-950/20`)
- **Border**: Blue (`border-blue-200 dark:border-blue-800`)
- **Hub Dropdown**:
  - **Active/Enabled**
  - Shows available hubs only
  - Auto-filters out already selected hubs
  - Updates other row options when changed
- **Amount Input**: Same as default
- **Pricing Model Dropdown**: Same as default
- **Delete Button**:
  - Red trash icon
  - Hover effect: `hover:bg-red-50`
  - Only on hub pricing rows (not default)

### Add Hub Pricing Button
- **Style**: Outline variant
- **Icon**: Plus icon (left side)
- **Text**: "Add Hub Pricing"
- **Width**: Full width (`w-full`)
- **Visibility**: Hidden when all hubs are used

## Pricing Models by Ad Type

### Website Ads
- `/month` - Monthly flat rate
- `/1000 impressions` - CPM pricing
- `/click` - Cost per click
- `Contact for pricing` - Custom pricing

### Newsletter Ads
- `/send` - Per newsletter send
- `/month` - Monthly package
- `Contact for pricing`

### Print Ads
- `/issue` - Per publication issue
- `/package` - Package deals (4x, 12x)
- `Contact for pricing`

### Podcast Ads
- `/episode` - Per podcast episode
- `/1000 downloads` - CPM based on downloads
- `Contact for pricing`

### Radio Ads
- `/spot` - Per radio spot
- `/week` - Weekly package
- `/month` - Monthly package
- `Contact for pricing`

### Streaming Ads
- `/1000 views` - CPM pricing
- `/video` - Per video/stream
- `Contact for pricing`

### Social Media Ads
- `/post` - Per sponsored post
- `/story` - Per story ad
- `/month` - Monthly package
- `Contact for pricing`

### Event Sponsorships
- `/event` - One-time event fee
- `/year` - Annual sponsorship
- `Contact for pricing`

## Interaction Flow

### Adding Hub Pricing

1. User clicks **"+ Add Hub Pricing"** button
2. New pricing row appears with:
   - First available hub auto-selected
   - Empty amount fields
   - Default pricing model selected
3. User can:
   - Change hub selection (shows only unused hubs)
   - Enter pricing amounts
   - Select pricing model
   - Add another hub (if available)

### Editing Hub Pricing

1. User modifies amount in any field
2. Changes are tracked in `editingItem` state
3. User changes pricing model via dropdown
4. All changes saved when modal is saved

### Deleting Hub Pricing

1. User clicks red trash icon on hub pricing row
2. Row is immediately removed
3. Hub becomes available in dropdown for other rows
4. Can add new hub pricing row with that hub again

### Changing Hub Selection

1. User opens hub dropdown on a hub pricing row
2. Only sees hubs not used in other rows
3. Selects different hub
4. Pricing amounts remain (can be adjusted)
5. Other hub pricing rows update their available options

## Flexbox Layout

The pricing editor uses a horizontal flexbox layout:
- **Hub Dropdown**: Fixed width `w-32` (128px)
- **Pricing Fields**: Flex-grow with minimum width `min-w-[120px]`, distributed evenly
- **Pricing Model**: Fixed width `w-48` (192px)
- **Delete Button**: Fixed width `w-10` (40px), centered

All pricing fields are displayed horizontally in a single row, making it easy to compare prices across hubs.

## Responsive Behavior

- On mobile/small screens, the flexbox layout adapts
- Minimum width constraints prevent fields from becoming too narrow
- Each pricing field maintains at least 120px width
- Horizontal scrolling may occur on very small screens to preserve layout integrity
- Full-width "Add Hub Pricing" button maintains visibility
- Scrollable modal ensures all content accessible

## Color Scheme

### Default Pricing
- Background: `bg-muted/30`
- Text: Standard text color
- Inputs: Standard input styling

### Hub Pricing
- Background: `bg-blue-50/50` (light mode)
- Background: `bg-blue-950/20` (dark mode)
- Border: `border-blue-200` (light mode)
- Border: `border-blue-800` (dark mode)
- Delete button text: `text-red-600`
- Delete button hover: `hover:text-red-700 hover:bg-red-50`

### Add Button
- Variant: `outline`
- Plus icon: Lucide `Plus` component
- Full width with centered content

