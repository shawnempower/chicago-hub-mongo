# System Architecture

This document provides a comprehensive overview of the Chicago Hub platform architecture, covering the frontend, backend, database, external integrations, and key design decisions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Architecture](#database-architecture)
6. [External Services](#external-services)
7. [Authentication & Authorization](#authentication--authorization)
8. [Key Data Flows](#key-data-flows)
9. [API Design](#api-design)
10. [Configuration Management](#configuration-management)
11. [Deployment Architecture](#deployment-architecture)

---

## System Overview

Chicago Hub is a full-stack advertising marketplace platform that connects **Hub administrators** (market managers) with **Publications** (media outlets) to facilitate multi-publication advertising campaigns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   Publication   │  │   Hub Central   │  │     Admin       │          │
│  │   Dashboard     │  │   Dashboard     │  │    Dashboard    │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
│           │                    │                    │                    │
│           └────────────────────┼────────────────────┘                    │
│                                │                                         │
│                    React SPA (Vite + TanStack Query)                    │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │ HTTPS
                    ┌────────────┴────────────┐
                    │     API Gateway         │
                    │  (Vite Dev Proxy /      │
                    │   Production Reverse    │
                    │       Proxy)            │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────┐
│                         Server Layer                                     │
│                    ┌───────────┴───────────┐                             │
│                    │    Express.js API     │                             │
│                    │     (Node.js)         │                             │
│                    └───────────┬───────────┘                             │
│                                │                                         │
│  ┌─────────────────────────────┼─────────────────────────────────────┐   │
│  │                     Route Handlers                                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│   │
│  │  │   Auth   │ │Campaigns │ │  Orders  │ │  Hubs    │ │Storefront││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                │                                         │
│  ┌─────────────────────────────┼─────────────────────────────────────┐   │
│  │                     Service Layer                                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│   │
│  │  │  Email   │ │   S3     │ │   LLM    │ │ DynamoDB │ │Insertion ││   │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │Order Gen ││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│   │
│  └───────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────┐
│                         Data Layer                                       │
│        ┌───────────────────────┴───────────────────────┐                 │
│        │            MongoDB Atlas                      │                 │
│        │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │                 │
│        │  │ Users  │ │Pubs    │ │Campaign│ │ Orders │ │                 │
│        │  └────────┘ └────────┘ └────────┘ └────────┘ │                 │
│        └───────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────┐
│                    External Services                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  AWS S3  │  │ Mailgun  │  │Anthropic │  │ AWS      │                 │
│  │  Storage │  │  Email   │  │   AI     │  │ DynamoDB │                 │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**: Clear boundaries between frontend, API, services, and data layers
2. **Role-Based Access Control**: Granular permissions for admin, hub, and publication users
3. **Multi-Tenancy**: Single codebase supports multiple hubs and publications
4. **AI-Powered Intelligence**: LLM integration for campaign optimization
5. **Real-Time Communication**: Messaging and notifications for order workflows

---

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI library | 18.x |
| **TypeScript** | Type safety | 5.x |
| **Vite** | Build tool & dev server | 5.x |
| **TanStack Query** | Server state management | 5.x |
| **React Router** | Client-side routing | 6.x |
| **Tailwind CSS** | Utility-first styling | 3.x |
| **shadcn/ui** | Component library | Latest |
| **Lucide React** | Icon library | Latest |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | 18.x+ |
| **Express.js** | Web framework | 4.x |
| **TypeScript** | Type safety | 5.x |
| **MongoDB Driver** | Database client | 6.x |
| **JWT** | Authentication tokens | - |
| **Multer** | File uploads | 1.x |
| **Helmet** | Security headers | 7.x |
| **Morgan** | HTTP logging | 1.x |

### Database

| Technology | Purpose |
|------------|---------|
| **MongoDB Atlas** | Primary database (document store) |
| **AWS DynamoDB** | Ad click/impression tracking (high-throughput) |

### External Services

| Service | Purpose |
|---------|---------|
| **AWS S3** | File storage (creative assets, documents) |
| **CloudFront** | CDN for static assets (optional) |
| **Mailgun** | Transactional email |
| **Anthropic Claude** | AI/LLM for campaign intelligence |

---

## Frontend Architecture

### Application Structure

```
src/
├── api/                    # API client functions
│   ├── auth.ts            # Authentication API
│   ├── campaigns.ts       # Campaign operations
│   ├── publications.ts    # Publication operations
│   └── ...
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── admin/             # Admin-specific components
│   ├── dashboard/         # Publication dashboard components
│   ├── campaign/          # Campaign builder components
│   ├── orders/            # Order management components
│   └── permissions/       # User/team management
├── contexts/              # React contexts
│   ├── CustomAuthContext.tsx    # Authentication state
│   ├── HubContext.tsx           # Selected hub state
│   └── PublicationContext.tsx   # Selected publication state
├── hooks/                 # Custom React hooks
│   ├── useCampaigns.ts
│   ├── usePublications.ts
│   └── ...
├── integrations/
│   └── mongodb/           # Schema types & service interfaces
├── pages/                 # Route pages
│   ├── Dashboard.tsx      # Publication user dashboard
│   ├── HubCentral.tsx     # Hub user dashboard
│   ├── Admin.tsx          # Admin dashboard
│   ├── CampaignBuilder.tsx
│   └── ...
├── services/              # Frontend business logic
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── App.tsx               # Root component with routing
```

### State Management

The application uses a layered state management approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    Global State                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             React Context Providers                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │   Auth   │  │   Hub    │  │Publication│          │    │
│  │  │ Context  │  │ Context  │  │ Context  │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────┐
│                    Server State                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            TanStack Query (React Query)              │    │
│  │  • Caching         • Background refetching          │    │
│  │  • Optimistic updates   • Pagination                │    │
│  │  • Error handling   • Request deduplication         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────┐
│                    Local State                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Component-level useState/useReducer          │    │
│  │  • Form state       • UI toggles                    │    │
│  │  • Modal state      • Temporary selections          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Context Providers:**

1. **AuthContext** (`CustomAuthContext.tsx`)
   - Manages user authentication state
   - Provides `signIn`, `signOut`, `signUp` methods
   - Stores JWT token in localStorage
   - Auto-refreshes user data on mount

2. **HubContext** (`HubContext.tsx`)
   - Tracks currently selected hub for hub users
   - Persists selection in localStorage
   - Provides hub data to child components

3. **PublicationContext** (`PublicationContext.tsx`)
   - Tracks currently selected publication for publication users
   - Persists selection in localStorage
   - Provides publication data to child components

### Routing Architecture

```tsx
<BrowserRouter>
  <Routes>
    {/* Public Routes */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    
    {/* Protected Routes - Publication Users */}
    <Route path="/dashboard" element={<Dashboard />} />
    
    {/* Protected Routes - Hub Users */}
    <Route path="/hubcentral" element={<HubCentral />} />
    <Route path="/campaigns" element={<CampaignList />} />
    <Route path="/campaigns/new" element={<CampaignBuilder />} />
    <Route path="/campaigns/:id" element={<CampaignDetail />} />
    
    {/* Protected Routes - Admin */}
    <Route path="/admin" element={<Admin />} />
    
    {/* User Profile */}
    <Route path="/profile" element={<UserProfile />} />
    
    {/* Root Redirect */}
    <Route path="/" element={<RootRedirect />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

**Route Protection:**
- `ProtectedRoute` component checks authentication
- `AdminRoute` component checks admin role
- `HubRoute` component checks hub access
- Redirects to `/auth` if not authenticated

### API Client Pattern

```typescript
// Example: src/api/campaigns.ts
import { API_BASE_URL } from '@/config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const campaignsApi = {
  list: async (hubId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/campaigns?hubId=${hubId}`,
      { headers: getAuthHeaders() }
    );
    return response.json();
  },
  
  create: async (data: CreateCampaignRequest) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },
  // ... more methods
};
```

---

## Backend Architecture

### Server Structure

```
server/
├── index.ts                    # Express app setup & route registration
├── config.ts                   # Environment configuration
├── middleware/
│   ├── authenticate.ts         # JWT authentication & authorization
│   └── activityTracking.ts     # Activity logging middleware
├── routes/
│   ├── auth.ts                 # Authentication endpoints
│   ├── campaigns.ts            # Campaign CRUD & AI analysis
│   ├── publications.ts         # Publication management
│   ├── publication-orders.ts   # Per-publication order operations
│   ├── hubs.ts                 # Hub management
│   ├── hub-packages.ts         # Package management
│   ├── permissions.ts          # User permissions & invitations
│   ├── storefront.ts           # Public storefront API
│   ├── creative-assets.ts      # File upload/download
│   ├── tracking-scripts.ts     # Ad tracking tag generation
│   ├── performance-entries.ts  # Performance reporting
│   ├── proof-of-performance.ts # Proof document uploads
│   ├── reporting.ts            # Analytics & reporting
│   ├── notifications.ts        # In-app notifications
│   └── admin/
│       └── orders.ts           # Admin order operations
├── campaignAlgorithms/         # AI selection algorithms
│   ├── registry.ts             # Algorithm registry
│   ├── types.ts                # Algorithm interfaces
│   ├── all-inclusive/
│   ├── budget-friendly/
│   ├── little-guys/
│   └── proportional/
├── campaignLLMService.ts       # Anthropic Claude integration
├── campaignLLMConfig.ts        # LLM configuration
├── emailService.ts             # Mailgun email service
├── s3Service.ts                # AWS S3 file storage
├── dynamodbService.ts          # Click/impression tracking
├── insertionOrderGenerator.ts  # Order document generation
├── conversationService.ts      # AI chat conversations
└── storage/
    └── fileStorage.ts          # Local file storage fallback
```

### Middleware Stack

```typescript
// server/index.ts
app.use(helmet());              // Security headers
app.use(cors({                  // CORS configuration
  origin: ['http://localhost:8080', process.env.FRONTEND_URL],
  credentials: true
}));
app.use(morgan('combined'));    // HTTP request logging
app.use(express.json({ limit: '10mb' }));  // JSON body parsing
app.use(express.urlencoded({ extended: true }));
```

### Authentication Middleware

```typescript
// server/middleware/authenticate.ts

// Primary authentication - verifies JWT, attaches user to request
export const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  const decoded = authService.verifyToken(token);
  const user = await authService.getUserById(decoded.userId);
  req.user = user;
  next();
};

// Admin-only routes
export const requireAdmin = async (req, res, next) => {
  if (!permissionsService.isAdmin(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Hub access check (parameterized)
export const requireHubAccess = (paramName = 'hubId') => {
  return async (req, res, next) => {
    const hubId = req.params[paramName] || req.query[paramName];
    if (!await permissionsService.canAccessHub(req.user.id, hubId)) {
      return res.status(403).json({ error: 'Hub access required' });
    }
    next();
  };
};

// Publication access check (parameterized)
export const requirePublicationAccess = (paramName = 'publicationId') => {
  return async (req, res, next) => {
    const pubId = req.params[paramName] || req.query[paramName];
    if (!await permissionsService.canAccessPublication(req.user.id, pubId)) {
      return res.status(403).json({ error: 'Publication access required' });
    }
    next();
  };
};
```

### Route Organization

Routes are organized by domain and follow RESTful conventions:

```typescript
// server/index.ts - Route registration
app.use('/api/auth', authRouter);
app.use('/api/builder', authenticateToken, builderRouter);
app.use('/api/campaigns', authenticateToken, campaignsRouter);
app.use('/api/publications', publicationsRouter);  // Mixed public/protected
app.use('/api/storefront', storefrontRouter);      // Public
app.use('/api/hub-packages', authenticateToken, hubPackagesRouter);
app.use('/api/hubs', authenticateToken, hubsRouter);
app.use('/api/admin', authenticateToken, requireAdmin, adminRouter);
app.use('/api/permissions', authenticateToken, permissionsRouter);
app.use('/api/publication-orders', authenticateToken, publicationOrdersRouter);
app.use('/api/creative-assets', authenticateToken, creativeAssetsRouter);
app.use('/api/tracking-scripts', authenticateToken, trackingScriptsRouter);
app.use('/api/performance-entries', authenticateToken, performanceEntriesRouter);
app.use('/api/proof-of-performance', authenticateToken, proofOfPerformanceRouter);
app.use('/api/reporting', authenticateToken, reportingRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);
```

### Service Layer

Services encapsulate business logic and external integrations:

**Email Service (`emailService.ts`):**
```typescript
export const emailService = {
  sendWelcomeEmail(data: WelcomeEmailData): Promise<void>,
  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void>,
  sendInvitationEmail(data: InvitationEmailData): Promise<void>,
  sendOrderSentEmail(data: OrderSentEmailData): Promise<void>,
  sendOrderConfirmedEmail(data: OrderConfirmedEmailData): Promise<void>,
  sendNewMessageEmail(data: NewMessageEmailData): Promise<void>,
  sendPlacementStatusEmail(data: PlacementStatusEmailData): Promise<void>,
  // ... more email types
};
```

**S3 Service (`s3Service.ts`):**
```typescript
export class S3Service {
  uploadFile(options: FileUploadOptions): Promise<UploadResult>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
```

**Campaign LLM Service (`campaignLLMService.ts`):**
```typescript
export class CampaignLLMService {
  analyzeCampaign(request: CampaignAnalysisRequest): Promise<CampaignAnalysisResponse>;
  reloadConfig(presetName?: string): CampaignLLMConfig;
  getConfig(): CampaignLLMConfig;
}
```

---

## Database Architecture

### MongoDB Collections

The application uses MongoDB Atlas as the primary database with the following collections:

```
chicago_hub_db/
├── users                      # User accounts
├── user_permissions           # RBAC permissions
├── user_invitations           # Pending invitations
├── user_profiles              # Extended profile data
├── publications               # Publication profiles & inventory
├── publication_files          # Uploaded files metadata
├── hubs                       # Hub configurations
├── hub_packages               # Pre-built advertising packages
├── campaigns                  # Campaign records
├── publication_insertion_orders    # Per-publication orders
├── creative_assets            # Creative file metadata
├── tracking_scripts           # Generated tracking tags
├── performance_entries        # Reported performance metrics
├── proof_of_performance       # Proof documents
├── daily_aggregates           # Aggregated performance data
├── lead_inquiries             # Lead/prospect records
├── lead_notes                 # Notes on leads
├── storefront_configurations  # Publication storefront settings
├── storefront_conversations   # AI chat conversations
├── notifications              # In-app notifications
├── algorithm_configs          # AI algorithm configurations
├── activity_logs              # Audit trail
└── areas                      # Geographic data
```

### Key Schema Definitions

**User Schema:**
```typescript
interface User {
  _id: ObjectId;
  email: string;                    // Unique, lowercase
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  isEmailVerified: boolean;
  isAdmin?: boolean;                // Legacy flag
  role?: 'admin' | 'hub_user' | 'publication_user' | 'standard';
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**UserPermissions Schema:**
```typescript
interface UserPermissions {
  _id: ObjectId;
  userId: string;
  role: 'admin' | 'hub_user' | 'publication_user' | 'standard';
  accessScope: 'all' | 'hub_level' | 'group_level' | 'individual';
  hubAccess?: Array<{
    hubId: string;
    accessLevel: 'full' | 'limited';
    assignedAt: Date;
    assignedBy: string;
  }>;
  groupIds?: string[];
  individualPublicationIds?: string[];
  canInviteUsers?: boolean;
  canManageGroups?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Publication Schema (simplified):**
```typescript
interface Publication {
  _id: ObjectId;
  publicationId: number;            // Unique numeric ID
  hubIds: string[];                 // Hub memberships
  basicInfo: {
    publicationName: string;
    websiteUrl?: string;
    publicationType: 'daily' | 'weekly' | 'monthly' | ...;
    contentType: 'news' | 'lifestyle' | 'business' | ...;
    geographicCoverage: 'local' | 'regional' | 'state' | 'national';
  };
  contactInfo: { primary, sales, editorial };
  distributionChannels: {
    website?: WebsiteChannel;
    newsletters?: NewsletterChannel[];
    print?: PrintChannel;
    socialMedia?: SocialMediaChannel[];
    events?: EventChannel[];
    podcasts?: PodcastChannel[];
    radio?: RadioChannel;
    streaming?: StreamingChannel;
  };
  audienceDemographics?: { ageGroups, gender, income, education };
  bookingPolicies?: { leadTime, cancellation, paymentTerms };
  adDeliverySettings?: { adServer, espType, customMergeTags };
  createdAt: Date;
  updatedAt: Date;
}
```

**Campaign Schema:**
```typescript
interface Campaign {
  _id: ObjectId;
  campaignId: string;               // UUID
  hubId: string;
  hubName: string;
  basicInfo: {
    name: string;
    description?: string;
    advertiserName: string;
    advertiserWebsite?: string;
    contactInfo: { name, email, phone, company };
  };
  objectives: {
    primaryGoal: 'brand awareness' | 'consideration' | 'conversion';
    targetAudience: string;
    geographicTarget?: string[];
    budget: number;
    billingCycle: 'monthly' | 'one-time' | 'quarterly';
    channels: string[];
  };
  timeline: {
    startDate: Date;
    endDate: Date;
    duration: { value: number; unit: 'days' | 'weeks' | 'months' };
  };
  selectedInventory: {
    publications: Array<{
      publicationId: number;
      publicationName: string;
      inventoryItems: InventoryItem[];
      subtotal: number;
    }>;
  };
  aiAnalysis?: {
    algorithm: string;
    reasoning: string;
    confidence: number;
    analyzedAt: Date;
  };
  pricing: { subtotal, discounts, total };
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**PublicationInsertionOrder Schema:**
```typescript
interface PublicationInsertionOrder {
  _id: ObjectId;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  hubId: string;
  status: 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';
  placementStatuses: Record<string, PlacementStatus>;
  campaignData: Campaign;           // Snapshot at order creation
  messages: Message[];
  notes: Note[];
  viewedAt?: Date;
  confirmedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Connection Management

```typescript
// src/integrations/mongodb/client.ts

// Singleton pattern with connection pooling
let client: MongoClient | null = null;

const getClient = () => {
  if (client) return client;
  
  client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1 },
    maxPoolSize: 10,           // Max connections in pool
    minPoolSize: 2,            // Min connections maintained
    maxIdleTimeMS: 30000,      // Close idle connections after 30s
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
  });
  
  return client;
};

export const connectToDatabase = async () => {
  const client = getClient();
  await client.connect();
  return client.db(process.env.MONGODB_DB_NAME);
};

export const getDatabase = () => {
  return getClient().db(process.env.MONGODB_DB_NAME);
};
```

### Indexing Strategy

Key indexes for performance:

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });

// Publications
db.publications.createIndex({ publicationId: 1 }, { unique: true });
db.publications.createIndex({ hubIds: 1 });
db.publications.createIndex({ "basicInfo.publicationName": "text" });

// Campaigns
db.campaigns.createIndex({ campaignId: 1 }, { unique: true });
db.campaigns.createIndex({ hubId: 1, status: 1 });
db.campaigns.createIndex({ createdAt: -1 });

// Orders
db.publication_insertion_orders.createIndex({ campaignId: 1, publicationId: 1 });
db.publication_insertion_orders.createIndex({ publicationId: 1, status: 1 });

// Permissions
db.user_permissions.createIndex({ userId: 1 }, { unique: true });
db.user_permissions.createIndex({ "hubAccess.hubId": 1 });
```

---

## External Services

### AWS S3 - File Storage

**Purpose:** Store creative assets, documents, images, proof of performance files

**Configuration:**
```typescript
const s3Service = new S3Service({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET,
  cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,  // Optional CDN
});
```

**Folder Structure:**
```
s3-bucket/
├── users/{userId}/
│   ├── documents/           # User-uploaded documents
│   ├── avatars/             # Profile pictures
│   └── uploads/             # General uploads
├── publications/{pubId}/
│   ├── files/               # Media kits, rate cards
│   ├── storefront/          # Storefront images
│   └── logos/
├── campaigns/{campaignId}/
│   └── assets/              # Creative assets
└── orders/{orderId}/
    └── proofs/              # Proof of performance
```

### Mailgun - Email Service

**Purpose:** Transactional emails for notifications, invitations, password resets

**Email Types:**
- Welcome emails
- Email verification
- Password reset
- User invitations
- Order notifications (sent, confirmed, rejected)
- New message alerts
- Placement status updates
- Creative assets ready
- Access granted/revoked

### Anthropic Claude - AI/LLM

**Purpose:** Intelligent campaign inventory selection

**Integration:**
```typescript
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Used in campaignLLMService.ts
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  temperature: 0.3,
  system: systemPrompt,
  messages: [{ role: 'user', content: prompt }]
});
```

**Algorithms:**
| Algorithm | Description |
|-----------|-------------|
| `all-inclusive` | Maximum reach across all publications |
| `budget-friendly` | Optimize for lowest cost per impression |
| `little-guys` | Prioritize smaller publications |
| `proportional` | Allocate proportionally by publication size |

### AWS DynamoDB - Click Tracking

**Purpose:** High-throughput storage for ad clicks and impressions

**Table Structure:**
```
ClickTracking
├── PK: campaignId
├── SK: timestamp#clickId
├── publicationId
├── placementId
├── userAgent
├── ipAddress
├── referrer
├── destinationUrl
└── createdAt
```

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │     │  Database   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  POST /api/auth/login                 │
       │  { email, password }                  │
       │──────────────────►│                   │
       │                   │                   │
       │                   │  Find user by email
       │                   │──────────────────►│
       │                   │◄──────────────────│
       │                   │                   │
       │                   │  Verify password hash
       │                   │  (bcrypt.compare)
       │                   │                   │
       │                   │  Generate JWT token
       │                   │  (userId, email, exp)
       │                   │                   │
       │  { token, user }  │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │  Store token in   │                   │
       │  localStorage     │                   │
       │                   │                   │
```

### JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  iat: number;      // Issued at
  exp: number;      // Expiration (24 hours)
}
```

### Authorization Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Permission Check Flow                         │
└─────────────────────────────────────────────────────────────────────┘

Request → authenticateToken → Check Role → Check Resource Access → Allow/Deny

                                │
                                ▼
                    ┌───────────────────────┐
                    │    Is user admin?     │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                   Yes                      No
                    │                       │
                    ▼                       ▼
              ┌─────────┐    ┌─────────────────────────────┐
              │ ALLOW   │    │  Check specific permissions  │
              └─────────┘    └─────────────┬───────────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                        ▼                  ▼                  ▼
               ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
               │ Hub Access?    │ │Publication     │ │ Individual     │
               │ (hub_level)    │ │ via Hub?       │ │ Assignment?    │
               └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
                       │                  │                  │
                       ▼                  ▼                  ▼
               Check hubAccess    Check pub.hubIds    Check individual
               array for hubId    contains user's     PublicationIds
                                  assigned hubId      array
```

---

## Key Data Flows

### Campaign Creation Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Campaign Creation Flow                             │
└──────────────────────────────────────────────────────────────────────────┘

1. User enters campaign basics (name, advertiser, contact)
                    │
                    ▼
2. User sets objectives (goals, audience, budget, channels)
                    │
                    ▼
3. Select inventory method: AI Analysis OR Package Selection
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
   AI Analysis           Package Selection
          │                   │
          ▼                   │
   Send to Claude API         │
   - Hub inventory data       │
   - Campaign requirements    │
   - Algorithm selection      │
          │                   │
          ▼                   ▼
   Receive selections    Use package inventory
          │                   │
          └─────────┬─────────┘
                    │
                    ▼
4. User reviews/adjusts inventory selections
                    │
                    ▼
5. User sets timeline (start/end dates)
                    │
                    ▼
6. User reviews and creates campaign (status: draft)
                    │
                    ▼
7. User clicks "Generate Orders"
                    │
                    ▼
8. System creates PublicationInsertionOrder for each publication
                    │
                    ▼
9. System sends email notifications to publications
                    │
                    ▼
10. Campaign status changes to "active"
```

### Order Fulfillment Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Order Fulfillment Flow                             │
└──────────────────────────────────────────────────────────────────────────┘

     Hub User                              Publication User
         │                                        │
         │  Generates insertion orders            │
         │───────────────────────────────────────►│
         │                                        │
         │                           Receives email notification
         │                                        │
         │                           Views order in dashboard
         │                                        │
         │                           Reviews placements
         │                                        │
         │                           ┌────────────┴────────────┐
         │                           │                         │
         │                      Accept                     Reject
         │                           │                         │
         │◄──────────────────────────┤                         │
         │   Status: confirmed       │                         │
         │                           │                         │
         │  Uploads creative assets  │                         │
         │───────────────────────────┤                         │
         │                           │                         │
         │                     Downloads assets                │
         │                           │                         │
         │                     Implements ads                  │
         │                           │                         │
         │                     Marks "in_production"           │
         │◄──────────────────────────┤                         │
         │                           │                         │
         │                     Campaign runs                   │
         │                           │                         │
         │                     Marks "delivered"               │
         │◄──────────────────────────┤                         │
         │                           │                         │
         │                     Reports performance             │
         │◄──────────────────────────┤                         │
         │                           │                         │
         │                     Uploads proof                   │
         │◄──────────────────────────┤                         │
         │                           │                         │
    Views performance                │                         │
    dashboard                        │                         │
```

---

## API Design

### RESTful Conventions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| POST | `/api/campaigns/:id/analyze` | AI analysis |
| POST | `/api/campaigns/:id/insertion-order` | Generate orders |

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Pagination

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

## Configuration Management

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development|production
FRONTEND_URL=http://localhost:8080

# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=chicago_hub_db

# Authentication
JWT_SECRET=your-secret-key

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
AWS_CLOUDFRONT_DOMAIN=...  # Optional

# Email
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM_EMAIL=noreply@yourdomain.com

# AI
ANTHROPIC_API_KEY=...

# DynamoDB
AWS_DYNAMODB_TABLE=ad-click-tracking
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: "localhost",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Setup                         │
│                                                             │
│  ┌─────────────────┐           ┌─────────────────┐         │
│  │  Vite Dev       │  proxy    │  Express Dev    │         │
│  │  Server         │  /api ──► │  Server         │         │
│  │  :8080          │           │  :3001          │         │
│  └─────────────────┘           └─────────────────┘         │
│           │                            │                    │
│           └────────────────┬───────────┘                    │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │  MongoDB Atlas  │                       │
│                   │  (cloud)        │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Production Architecture                             │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐  │
│  │   Users     │    │ CloudFlare  │    │        AWS / Cloud          │  │
│  │             │───►│ CDN / DNS   │───►│                             │  │
│  └─────────────┘    └─────────────┘    │  ┌─────────────────────┐    │  │
│                                        │  │   Load Balancer     │    │  │
│                                        │  └──────────┬──────────┘    │  │
│                                        │             │               │  │
│                                        │  ┌──────────┼──────────┐    │  │
│                                        │  │          │          │    │  │
│                                        │  ▼          ▼          ▼    │  │
│                                        │  ┌───┐    ┌───┐    ┌───┐   │  │
│                                        │  │App│    │App│    │App│   │  │
│                                        │  │ 1 │    │ 2 │    │ N │   │  │
│                                        │  └─┬─┘    └─┬─┘    └─┬─┘   │  │
│                                        │    │        │        │     │  │
│                                        │    └────────┼────────┘     │  │
│                                        │             │              │  │
│                                        │  ┌──────────┴──────────┐   │  │
│                                        │  │   MongoDB Atlas     │   │  │
│                                        │  │   (Replica Set)     │   │  │
│                                        │  └─────────────────────┘   │  │
│                                        │                            │  │
│                                        │  ┌──────────────────────┐  │  │
│                                        │  │   AWS Services       │  │  │
│                                        │  │  • S3 (storage)      │  │  │
│                                        │  │  • CloudFront (CDN)  │  │  │
│                                        │  │  • DynamoDB          │  │  │
│                                        │  └──────────────────────┘  │  │
│                                        └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Build Process

```bash
# Frontend build
npm run build          # Vite builds to dist/

# Server build
npm run build:server   # TypeScript compiles to dist/server/

# Production start
npm run start:prod     # Runs compiled server serving static files
```

---

## Security Considerations

### Implemented Security Measures

1. **Authentication**
   - JWT tokens with expiration
   - Password hashing with bcrypt
   - Token stored in localStorage (consider httpOnly cookies for production)

2. **Authorization**
   - Role-based access control
   - Resource-level permissions
   - Middleware guards on all protected routes

3. **Input Validation**
   - Request body validation
   - Parameterized MongoDB queries
   - File upload type/size restrictions

4. **HTTP Security**
   - Helmet.js security headers
   - CORS configuration
   - HTTPS in production

5. **Data Protection**
   - Signed URLs for S3 private files
   - No sensitive data in JWT payload
   - Environment variables for secrets

### Recommendations for Enhancement

- Implement rate limiting
- Add CSRF protection
- Use httpOnly cookies for tokens
- Implement request signing for API calls
- Add audit logging for sensitive operations
- Implement IP allowlisting for admin routes

---

---

## Related Documentation

- [User Stories](./USER_STORIES.md) - Comprehensive user stories for Publication and Hub users
- [Product Roadmap](./ROADMAP.md) - High-level roadmap organized by strategic phases

---

*Document generated from codebase analysis. Last updated: January 2026*
