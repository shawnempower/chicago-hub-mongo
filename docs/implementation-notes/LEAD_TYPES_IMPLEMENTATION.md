# Lead Types Implementation - Option 3 (Hybrid Approach)

## Overview
We've implemented a flexible lead schema that supports different form types while maintaining a unified structure.

## Schema Changes

### New Fields Added to `LeadInquiry`
```typescript
// Enhanced fields for different form types
message?: string;                    // General message/notes from any form
targetLaunchDate?: Date;            // When they want to launch campaign
campaignGoals?: string | string[];  // Can be single string or array

// Enhanced conversationContext structure
conversationContext?: {
  formType?: string;                // "storefront_basic", "ai_chat_handoff", etc.
  rawFormData?: Record<string, any>; // Original form data preserved
  [key: string]: any;               // Additional custom fields
};
```

## API Endpoint: POST `/api/storefront-lead`

### Request Format (Public - No Auth Required)
```json
{
  "name": "Shawn Chapman",
  "email": "chapmanawesome@gmail.com", 
  "company": "Company Name",
  "phone": "6153645279",
  "budgetRange": "under-5k",
  "campaignGoals": "lead-generation",
  "targetLaunchDate": "2025-11-13",
  "message": "Hello this is my message",
  "hubId": "chicago-hub",        // Optional - defaults to "chicago-hub"
  "publicationId": "pub_id_here"  // Optional - for publication-specific leads
}
```

### Field Mapping
| Form Field        | Schema Field      | Notes                              |
|-------------------|-------------------|------------------------------------|
| `name`            | `contactName`     | Required                           |
| `email`           | `contactEmail`    | Required                           |
| `company`         | `businessName`    | Required                           |
| `phone`           | `contactPhone`    | Optional                           |
| `budgetRange`     | `budgetRange`     | Optional - stored as-is            |
| `campaignGoals`   | `campaignGoals`   | Stored in new field                |
| `campaignGoals`   | `marketingGoals`  | Also converted to array format     |
| `targetLaunchDate`| `targetLaunchDate`| Stored as Date object              |
| `targetLaunchDate`| `timeline`        | Also stored as string              |
| `message`         | `message`         | New dedicated message field        |
| `hubId`           | `hubId`           | Defaults to "chicago-hub"          |
| `publicationId`   | `publicationId`   | Optional association               |

### Response Format
```json
{
  "success": true,
  "leadId": "507f1f77bcf86cd799439011",
  "message": "Thank you for your interest! We will contact you soon."
}
```

### Error Response
```json
{
  "error": "Missing required fields: name, email, and company are required"
}
```

## How It Works

### 1. Data Preservation
All original form data is preserved in `conversationContext.rawFormData`:
```typescript
conversationContext: {
  formType: 'storefront_basic',
  rawFormData: req.body,  // Complete original payload
  submittedAt: new Date().toISOString()
}
```

### 2. Field Normalization
- Form fields are mapped to standardized schema fields
- Data is transformed as needed (e.g., single string → array)
- Both original and normalized formats are kept

### 3. Lead Source Tracking
Each lead has a `leadSource` field:
- `'storefront_form'` - Public storefront submissions
- `'ai_chat'` - AI assistant handoffs
- `'manual_entry'` - Admin manual entry
- `'other'` - Other sources

## Benefits

✅ **No Data Loss** - Original form data always preserved
✅ **Flexible** - Easy to add new form types
✅ **Type-Safe** - Core fields are standardized
✅ **Searchable** - Can filter/query by standard fields
✅ **Extensible** - `conversationContext` handles unique fields

## Examples

### Example 1: Storefront Form Lead
```typescript
{
  leadSource: 'storefront_form',
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  businessName: 'Acme Corp',
  budgetRange: 'under-5k',
  campaignGoals: 'lead-generation',
  marketingGoals: ['lead-generation'],
  message: 'Looking to increase awareness',
  conversationContext: {
    formType: 'storefront_basic',
    rawFormData: { /* original payload */ }
  }
}
```

### Example 2: AI Chat Handoff
```typescript
{
  leadSource: 'ai_chat',
  contactName: 'Jane Smith',
  contactEmail: 'jane@example.com',
  businessName: 'Tech Startup',
  message: 'Interested in digital advertising',
  conversationContext: {
    formType: 'ai_chat_handoff',
    context: 'User asked about social media reach...',
    triggerKeywords: ['social media', 'reach'],
    specificNeeds: 'Want to target millennials'
  }
}
```

### Example 3: Manual Entry
```typescript
{
  leadSource: 'manual_entry',
  contactName: 'Bob Johnson',
  contactEmail: 'bob@example.com',
  businessName: 'Local Restaurant',
  message: 'Called in about print advertising',
  conversationContext: {
    formType: 'manual_phone_call',
    callDate: '2025-01-15',
    referralSource: 'existing-customer'
  }
}
```

## Testing

### Test with cURL
```bash
curl 'http://localhost:8080/api/storefront-lead' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "name":"Test User",
    "email":"test@example.com",
    "company":"Test Company",
    "phone":"5551234567",
    "budgetRange":"5k-10k",
    "campaignGoals":"brand-awareness",
    "targetLaunchDate":"2025-12-01",
    "message":"This is a test lead"
  }'
```

### Expected Result
Lead will be created with:
- ✅ All standard fields populated
- ✅ Original data in `rawFormData`
- ✅ `formType: 'storefront_basic'`
- ✅ `leadSource: 'storefront_form'`
- ✅ `status: 'new'`

## Future Enhancements

Potential additions:
- Email notifications when leads are created
- Webhook support for CRM integration
- Lead scoring based on form data
- Duplicate detection
- Auto-assignment rules
- Custom validation rules per form type


