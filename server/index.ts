import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
console.log('🔧 Loading environment variables...');
dotenv.config();
console.log('✅ Environment variables loaded');
console.log('📧 Mailgun env vars:', {
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? 'SET' : 'NOT SET',
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN ? 'SET' : 'NOT SET',
  MAILGUN_FROM_EMAIL: process.env.MAILGUN_FROM_EMAIL ? 'SET' : 'NOT SET',
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectToDatabase, setupGracefulShutdown } from '../src/integrations/mongodb/client';

console.log('📧 About to import emailService...');
import { emailService } from './emailService';
console.log('📧 emailService imported:', !!emailService);
import { s3Service } from './s3Service';
import { StorefrontImageService } from './storefrontImageService';
import { subdomainService } from './subdomainService';
import { fileStorage } from './storage/fileStorage';

// Import the services and initialization function
import { 
  initializeServices,
  adPackagesService,
  leadInquiriesService,
  leadNotesService,
  userProfilesService,
  conversationThreadsService,
  assistantConversationsService,
  savedOutletsService,
  savedPackagesService,
  userInteractionsService,
  brandDocumentsService,
  assistantInstructionsService,
  mediaEntitiesService,
  publicationsService,
  publicationFilesService,
  storefrontConfigurationsService,
  surveySubmissionsService,
  areasService
} from '../src/integrations/mongodb/allServices';
import { HubsService } from '../src/integrations/mongodb/hubService';
import { hubPackagesService } from '../src/integrations/mongodb/hubPackageService';
import { authService, initializeAuthService } from '../src/integrations/mongodb/authService';
import { getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import { calculateRevenue } from '../src/utils/pricingCalculations';

// Import route modules
import authRouter from './routes/auth';
import builderRouter from './routes/builder';
import campaignsRouter from './routes/campaigns';
import publicationsRouter from './routes/publications';
import storefrontRouter from './routes/storefront';
import hubPackagesRouter from './routes/hub-packages';
import hubsRouter from './routes/hubs';
import adminRouter from './routes/admin';
import permissionsRouter from './routes/permissions';
import inventoryChatRouter from './routes/inventory-chat';
import publicationOrdersRouter from './routes/publication-orders';
import adminOrdersRouter from './routes/admin/orders';
import creativeAssetsRouter from './routes/creative-assets';
import activityTrackingRouter from './routes/activity-tracking';
import performanceEntriesRouter from './routes/performance-entries';
import proofOfPerformanceRouter from './routes/proof-of-performance';
import reportingRouter from './routes/reporting';
import trackingScriptsRouter from './routes/tracking-scripts';
import { authenticateToken } from './middleware/authenticate';
import { activityTrackingMiddleware } from './middleware/activityTracking';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('Server');
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize storefront image service (will be set after S3 service is ready)
let storefrontImageService: StorefrontImageService | null = null;

// ===== STANDARDIZED REVENUE CALCULATION =====
/**
 * Calculate monthly revenue using the new standardized pricing utilities
 * This is a bridge function that wraps the new calculateRevenue utility
 * while maintaining backward compatibility with existing code
 */
function estimateMonthlyRevenueNew(ad: any, channelFrequency?: string): number {
  try {
    // Use the new standardized calculation
    return calculateRevenue(ad, 'month', channelFrequency);
  } catch (error) {
    console.error('Error in estimateMonthlyRevenueNew:', error);
    return 0;
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081', 
    'http://localhost:8082',
    'http://localhost:8083',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads (memory storage)
// Note: Adjust fileSize limit based on your needs and server memory constraints
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for videos and large documents)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'text/markdown',
      'text/x-markdown',
      'text/html',
      'application/json',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'image/gif',
      'image/webp',
      'image/tiff', // Print ads
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/gzip',
      // Video
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav', // Alternate WAV MIME type
      'audio/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const supportedExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'md', 'json', 'html', 'htm', 'jpg', 'jpeg', 'png', 'svg', 'gif', 'webp', 'tif', 'tiff', 'zip', 'gz', 'mp4', 'mpeg', 'mov', 'mp3', 'wav', 'm4a'];
      cb(new Error(`File type "${file.mimetype}" not supported. Supported formats: ${supportedExts.join(', ')}`) as any, false);
    }
  }
});

// ===== ROUTE REGISTRATION =====
// Register route modules with appropriate prefixes
app.use('/api/auth', authRouter);
app.use('/api/permissions', permissionsRouter); // User permissions and invitations

// Apply activity tracking middleware to routes that modify data (after authentication)
app.use('/api/admin', activityTrackingMiddleware, adminRouter);
app.use('/api/admin/builder', activityTrackingMiddleware, builderRouter); // Admin-only package builder routes
app.use('/api/admin/orders', activityTrackingMiddleware, adminOrdersRouter); // Admin order management
app.use('/api/publications', activityTrackingMiddleware, publicationsRouter);
app.use('/api/publication-orders', activityTrackingMiddleware, publicationOrdersRouter); // Publication insertion orders
app.use('/api/storefront', activityTrackingMiddleware, storefrontRouter);
app.use('/api/hub-packages', activityTrackingMiddleware, hubPackagesRouter);
app.use('/api/hubs', activityTrackingMiddleware, hubsRouter);
app.use('/api/campaigns', activityTrackingMiddleware, campaignsRouter);
app.use('/api/creative-assets', activityTrackingMiddleware, creativeAssetsRouter); // Creative assets management
app.use('/api/inventory-chat', inventoryChatRouter);
app.use('/api/activities', authenticateToken, activityTrackingRouter); // Activity tracking and audit logs
app.use('/api/performance-entries', activityTrackingMiddleware, performanceEntriesRouter); // Performance data entry
app.use('/api/proof-of-performance', activityTrackingMiddleware, proofOfPerformanceRouter); // Proof uploads and verification
app.use('/api/reporting', reportingRouter); // Campaign and order performance reporting
app.use('/api/tracking-scripts', activityTrackingMiddleware, trackingScriptsRouter); // Ad tracking script generation

// ===== STANDALONE ROUTES =====
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Health check for load balancer path-based routing
app.get('/chicago-hub/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'chicago-hub' });
});

// Test route to verify API is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API routes are working!' });
});

// Areas search route (for geographic market selector)
app.get('/api/areas/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    // Search by DMA, County, or Zip Code
    const results: any[] = [];

    // Search by DMA name
    const dmaResults = await areasService.autocompleteDMA(query, 5);
    dmaResults.forEach(dma => {
      results.push({
        type: 'dma',
        displayName: `${dma.name} - Entire DMA`,
        normalizedName: dma.normalized,
        dmaNameOnly: dma.name, // Keep original name for storage
        contextText: 'Full market coverage'
      });
    });

    // Search by County
    const countyResults = await areasService.findDMAsByCounty(query);
    countyResults.forEach(result => {
      if (result.matchedCounty && result.counties && result.counties.length > 0) {
        const county = result.counties[0];
        results.push({
          type: 'county',
          displayName: `${result.matchedCounty} County - ${result.dma.name}`,
          normalizedName: county.normalized,
          countyNameOnly: result.matchedCounty, // Keep clean county name
          parentDmaName: result.dma.name,
          parentDmaNormalized: result.dma.normalized,
          contextText: 'Partial coverage (county only)'
        });
      }
    });

    // Search by Zip Code (if it looks like a zip)
    if (/^\d{1,5}$/.test(query)) {
      const zipCode = query.padStart(5, '0');
      const zipResult = await areasService.findDMAByZipCode(zipCode);
      if (zipResult) {
        results.push({
          type: 'zipcode',
          displayName: `${zipCode} - ${zipResult.dma.name}`,
          normalizedName: zipCode,
          parentDmaName: zipResult.dma.name,
          parentDmaNormalized: zipResult.dma.normalized,
          contextText: 'Partial coverage (zip code only)'
        });
      }
    }

    res.json(results.slice(0, 10)); // Limit to 10 results
  } catch (error) {
    console.error('Error searching areas:', error);
    res.status(500).json({ error: 'Failed to search areas' });
  }
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  
  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large',
        message: 'File size exceeds the maximum limit of 50MB',
        maxSize: '50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files',
        message: 'Maximum number of files exceeded'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Unexpected field',
        message: 'An unexpected file field was provided'
      });
    }
    return res.status(400).json({ 
      error: 'File upload error',
      message: error.message 
    });
  }
  
  // Handle other errors
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  try {
    // Setup graceful shutdown handlers for MongoDB
    setupGracefulShutdown();
    console.log('✅ Graceful shutdown handlers configured');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    // Initialize all MongoDB services
    console.log('Initializing MongoDB services...');
    initializeAuthService();
    initializeServices();
    console.log('✅ MongoDB services initialized successfully!');


    // API routes are defined at module load time (no function call needed)
    console.log('📋 API routes loaded');

    // Check S3 service status
    console.log('🔍 Checking S3 service...');
    const s3ServiceInstance = s3Service();
    console.log('S3 Service status:', s3ServiceInstance ? 'AVAILABLE' : 'NOT AVAILABLE');
    if (s3ServiceInstance) {
      console.log('✅ S3 service initialized successfully');
      
      // Initialize file storage with S3
      fileStorage.setS3Service(s3ServiceInstance);
      await fileStorage.initialize();
      console.log('✅ File storage initialized with S3');
    } else {
      console.warn('⚠️  S3 service is not available - file uploads will fail');
    }

    // Start server
    console.log('🚀 Starting HTTP server...');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Authentication server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
      console.log(`📊 Publications API: http://localhost:${PORT}/api/publications`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

// Start the server
startServer();
