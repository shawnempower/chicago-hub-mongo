# Schema-Aware Publication Profile Editing

## Overview

This implementation provides a schema-aware editing interface for publisher profiles that:
- ✅ Maps UI template fields to existing schema paths
- 🟡 Highlights fields requiring transformation with yellow backgrounds
- 🔴 Marks unsupported fields (requiring schema updates) with red backgrounds
- 📊 Provides visual feedback about data mapping quality
- 🔍 Shows schema paths in debug mode for developers

## Architecture

### Components

#### 1. **EnhancedEditablePublicationProfile** (`src/components/dashboard/EnhancedEditablePublicationProfile.tsx`)
The main editing interface that replaces the original `EditablePublicationProfile`.

Features:
- Schema-aware form fields with visual indicators
- Repeatable sections (differentiators, future: sister publications, events)
- Real-time validation
- Debug mode to show schema paths
- Auto-save timestamp

#### 2. **SchemaField** (`src/components/dashboard/SchemaField.tsx`)
Visual wrapper component that displays field mapping status.

**Props:**
- `mappingStatus`: 'full' | 'partial' | 'none'
- `schemaPath`: Dot notation path to schema field
- `warningMessage`: Explanation of mapping issues
- `showSchemaPath`: Toggle for developer debug mode

**Visual Indicators:**
- ✅ Green border (white background): Direct schema mapping
- 🟡 Yellow border (yellow background): Requires transformation or uses alternate field
- 🔴 Red border (red background): Not in schema - data won't persist

#### 3. **SchemaSection** (`src/components/dashboard/SchemaField.tsx`)
Groups related fields with section-level status indicators.

#### 4. **SchemaFieldLegend** (`src/components/dashboard/SchemaField.tsx`)
Displays color-coding legend for users.

### Configuration

#### Field Mapping (`src/config/publicationFieldMapping.ts`)

Centralized configuration defining how each UI field maps to schema:

```typescript
{
  essentialInfo: {
    title: 'Essential Information',
    mappingStatus: 'full',
    fields: {
      publicationName: {
        label: 'Publication',
        schemaPath: 'basicInfo.publicationName',
        mappingStatus: 'full',
        required: true,
        type: 'text'
      },
      // ... more fields
    }
  }
}
```

**Transformation Functions:**
- `arrayToString`: Convert schema arrays to comma-separated strings
- `stringToArray`: Parse comma-separated strings back to arrays
- `ageGroupsToText`: Format demographic percentages as readable text
- `calculateSocialFollowing`: Sum followers across all platforms
- `formatSocialPlatforms`: Create formatted list of platforms with counts

### Utilities

#### Schema Helpers (`src/utils/schemaHelpers.ts`)

**Functions:**
- `getNestedValue(obj, path)`: Retrieve value from nested object using dot notation
- `setNestedValue(obj, path, value)`: Set nested value, creating intermediate objects
- `deepClone(obj)`: Create deep copy of object
- `isEmpty(value)`: Check if value is null/undefined/empty
- `formatPhoneNumber(phone)`: Format to (XXX) XXX-XXXX
- `isValidUrl(url)`: Validate URL format
- `isValidEmail(email)`: Validate email format

## Field Mapping Reference

### ✅ Full Mapping (Green)
Fields that map directly to schema with no transformation:

| UI Label | Schema Path |
|----------|-------------|
| Publication | `basicInfo.publicationName` |
| Type | `basicInfo.publicationType` |
| Market | `basicInfo.primaryServiceArea` |
| Founded | `basicInfo.founded` |
| Website | `basicInfo.websiteUrl` |
| Parent Company | `businessInfo.parentCompany` |
| Ownership Type | `businessInfo.ownershipType` |
| Years in Operation | `businessInfo.yearsInOperation` |
| Monthly Visitors | `distributionChannels.website.metrics.monthlyVisitors` |
| Monthly Pageviews | `distributionChannels.website.metrics.monthlyPageViews` |
| Geography | `audienceDemographics.location` |
| Notes | `internalNotes.operationalNotes` |
| What Makes You Unique | `competitiveInfo.keyDifferentiators` (array) |

### 🟡 Partial Mapping (Yellow)
Fields requiring transformation or using alternate schema fields:

| UI Label | Schema Path | Transformation |
|----------|-------------|----------------|
| Primary Contact Name | `contactInfo.salesContact.name` | Uses Sales Contact field |
| Primary Contact Email | `contactInfo.salesContact.email` | Uses Sales Contact field |
| Primary Contact Phone | `contactInfo.salesContact.phone` | Uses Sales Contact field |
| Sales Contact Name | `contactInfo.advertisingDirector.name` | Uses Advertising Director |
| Sales Contact Email | `contactInfo.advertisingDirector.email` | Uses Advertising Director |
| Sales Contact Phone | `contactInfo.advertisingDirector.phone` | Uses Advertising Director |
| Business Address | `basicInfo.headquarters` | Uses headquarters field |
| Secondary Coverage | `basicInfo.secondaryMarkets` | Array ↔ comma-separated |
| Email Subscribers | `distributionChannels.newsletters[0].subscribers` | First newsletter only |
| Combined Following | `distributionChannels.socialMedia` | Calculated sum |
| Primary Platforms | `distributionChannels.socialMedia` | Formatted string |
| Age | `audienceDemographics.ageGroups` | Percentages → text |
| Income | `audienceDemographics.householdIncome` | Percentages → text |
| Education | `audienceDemographics.education` | Percentages → text |
| Market Position | `competitiveInfo.uniqueValueProposition` | Relabeled field |

### 🔴 No Mapping (Red)
Fields requiring schema updates before they can be saved:

| UI Label | Missing Schema Field | Required Action |
|----------|---------------------|-----------------|
| Legal Entity | `businessInfo.legalEntity` | Add to schema |
| Tax ID/EIN | `businessInfo.taxId` | Add to schema |
| Sister Publications | `businessInfo.sisterPublications[]` | Add array to schema |
| Accounting Contact Name | `contactInfo.accountingContact.name` | Add contact type |
| Accounting Contact Email | `contactInfo.accountingContact.email` | Add contact type |
| Accounting Contact Phone | `contactInfo.accountingContact.phone` | Add contact type |
| Full Description (Geographic) | `basicInfo.geographicDescription` | Add to schema |
| Best For | `competitiveInfo.bestFor` | Add to schema |
| **Program Enrollment** (entire section) | `programEnrollment[]` | Add to schema |

## Usage

### For Publishers (End Users)

1. **Navigate to Dashboard** → Select your publication → Click "Edit Profile"

2. **Understand the Color Coding:**
   - Normal white fields: Your data saves as-is
   - Yellow fields: Data is transformed/mapped differently
   - Red fields: Cannot save yet (schema update needed)

3. **Repeatable Sections:**
   - Click "+ Add Differentiator" to add unique selling points
   - Click trash icon to remove items

4. **Debug Mode** (Developers only):
   - Click "Show Schema Paths" to see technical field mappings

### For Developers

#### Adding New Fields

1. **Add to mapping configuration:**
```typescript
// src/config/publicationFieldMapping.ts
{
  newField: {
    label: 'Your Field Label',
    schemaPath: 'path.to.schema.field',
    mappingStatus: 'full' | 'partial' | 'none',
    warningMessage: 'Optional warning',
    type: 'text' | 'number' | 'email' | 'textarea' | 'select',
    required: true,
    placeholder: 'Placeholder text'
  }
}
```

2. **Render in component:**
```typescript
{renderField('newField', publicationFieldMapping.section.fields.newField)}
```

#### Adding Transformations

```typescript
// src/config/publicationFieldMapping.ts
export const transformers = {
  yourTransform: (value: any) => {
    // Transform for display
    return transformedValue;
  }
};

// Use in field config:
{
  transformToDisplay: transformers.yourTransform,
  transformToSchema: (value) => reverseTransform(value)
}
```

#### Adding Repeatable Sections

```typescript
// 1. Add state
const [items, setItems] = useState<string[]>([]);

// 2. Initialize from data
useEffect(() => {
  const data = getNestedValue(selectedPublication, 'path.to.array') || [];
  setItems(data);
}, [selectedPublication]);

// 3. Update before save
const handleSave = async () => {
  const finalData = deepClone(formData);
  setNestedValue(finalData, 'path.to.array', items);
  // ... save
};

// 4. Render UI
<Button onClick={() => setItems([...items, ''])}>Add</Button>
{items.map((item, i) => (
  <Input 
    value={item}
    onChange={(e) => {
      const updated = [...items];
      updated[i] = e.target.value;
      setItems(updated);
    }}
  />
))}
```

## Future Enhancements

### Priority 1: Schema Updates Needed
- [ ] Add `programEnrollment` array with `{ programName, status, notes }`
- [ ] Add `businessInfo.legalEntity` (string)
- [ ] Add `businessInfo.taxId` (string)
- [ ] Add `businessInfo.sisterPublications[]` array
- [ ] Add `contactInfo.accountingContact` object
- [ ] Add `competitiveInfo.bestFor` (string)
- [ ] Add `basicInfo.geographicDescription` (string)

### Priority 2: Additional Repeatable Sections
- [ ] Sister Publications with add/remove
- [ ] Events in Key Metrics section
- [ ] Custom tags/categories

### Priority 3: Enhanced Features
- [ ] Auto-save with debouncing
- [ ] Validation before save
- [ ] Field-level change tracking
- [ ] Undo/redo functionality
- [ ] Export mapping report (what % of fields map)

## Testing

### Manual Testing Checklist

- [ ] Load publisher profile in edit mode
- [ ] Verify color coding displays correctly
- [ ] Edit green (full mapping) fields and save
- [ ] Edit yellow (partial mapping) fields and save
- [ ] Verify red (no mapping) fields are disabled
- [ ] Test "What Makes You Unique" add/remove
- [ ] Toggle "Show Schema Paths" debug mode
- [ ] Check Legend displays correctly
- [ ] Test cancel button (no save)
- [ ] Verify data persists after save
- [ ] Check auto-save timestamp updates

### Integration Testing

```bash
# Start development server
npm run dev

# Navigate to Dashboard > Select Publication > Edit Profile
# Test all sections
```

## Troubleshooting

### Fields not saving
- Check console for API errors
- Verify schema path in debug mode
- Ensure transformation functions are correct

### Red fields showing incorrectly
- Review `mappingStatus` in field config
- Check if schema actually has the field
- Update mapping configuration if needed

### Transformations not working
- Verify `transformToDisplay` and `transformToSchema` are both defined
- Check transformation function in `transformers` object
- Test transformation with console.log

## Migration from Old Component

The old `EditablePublicationProfile` remains available for backward compatibility.

To switch back if needed:
```typescript
// src/components/dashboard/PublicationProfile.tsx
import { EditablePublicationProfile } from './EditablePublicationProfile';
// Change component usage back
```

## Support

For questions or issues:
1. Check this guide
2. Enable debug mode to see schema paths
3. Review mapping configuration
4. Contact development team for schema updates

