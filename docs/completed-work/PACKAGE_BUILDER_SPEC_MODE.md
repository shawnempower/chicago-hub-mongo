# Package Builder - Specification-First Mode

## Overview

The Package Builder has been enhanced to support specification-first package building, allowing users to select specific publications and view all available inventory with detailed pricing calculations.

## Features

### 1. Publication Selection
- **Select All Checkbox**: Quickly select or deselect all publications
- **Individual Selection**: Check/uncheck individual publications
- **Real-time Filtering**: Publications filter based on selected channels and geography
- **Visual Feedback**: Selected publications are highlighted with primary border

### 2. Inventory Display
- **Expandable Cards**: Each publication can be expanded to view detailed inventory
- **Channel Grouping**: Inventory items are organized by channel type (newsletter, website, print, etc.)
- **Item Details**: Each inventory item shows:
  - Item name
  - Channel type
  - Specifications (dimensions, format, etc.)
  - Frequency (insertions per month)
  - Hub pricing
  - Monthly cost calculation (price × frequency)

### 3. Price Calculations
- **Per-Item Pricing**: Shows unit price and frequency multiplier
- **Publication Totals**: Monthly cost per publication
- **Package Summary**: Real-time totals including:
  - Number of publications selected
  - Total inventory items
  - Monthly cost
  - Total campaign cost (monthly × duration)

### 4. Filters
- **Campaign Duration**: 1, 3, 6, or 12 months
- **Geography**: Optional filtering by Chicago neighborhoods (South Side, North Side, etc.)
- **Channels**: Multi-select for channel types (newsletter, website, print, radio, podcast, social, streaming, events)

## User Workflow

1. **Select Hub**: Choose a hub from the hub selector
2. **Configure Filters**: 
   - Set campaign duration
   - Optionally select target geography
   - Choose channels to include
3. **View Publications**: Publications automatically load with their inventory
4. **Select Publications**: 
   - Use "Select All" or individually select publications
   - Expand publications to view detailed inventory
5. **Review Summary**: See total costs and inventory counts
6. **Build Package**: Click "Build Package" to proceed

## Key Components

### PackageBuilder Component
- Main component managing state and UI
- Handles publication loading and filtering
- Calculates real-time pricing

### Inventory Display
- Shows all inventory items for selected channels
- Groups items by channel type
- Displays specifications and frequency
- Calculates monthly costs

### Package Summary Card
- Displays key metrics
- Shows monthly and total campaign costs
- Provides "Build Package" action button

## Technical Details

### Data Flow
1. Publications fetched from `packageBuilderService.fetchPublicationsForBuilder()`
2. Inventory extracted via `packageBuilderService.extractInventoryFromPublication()`
3. Pricing calculated using `formatPrice()` utility
4. Results passed to parent via `onAnalyze()` callback

### Pricing Calculations
- Uses hub-specific pricing
- Applies standard frequency strategy
- Monthly cost = unit price × frequency
- Total cost = monthly cost × duration

### State Management
- Publications loaded on hub/channel change
- Selected publications tracked in state
- Expandable state per publication
- Real-time summary calculations

## Future Enhancements

Potential future additions (currently ignored as requested):
- Budget constraints
- Custom frequency strategies
- Frequency adjustments per item
- Advanced filtering options
- Comparison mode

## Notes

- Budget-first mode has been simplified to focus on specification-first
- Frequency strategies are set to "standard" (can be exposed later)
- Geography filters are optional and non-restrictive
- All calculations use hub-specific pricing

