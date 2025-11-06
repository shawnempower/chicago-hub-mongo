import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

// Debug environment variables
console.log('🔍 Environment variables loaded:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectToDatabase, setupGracefulShutdown } from '../src/integrations/mongodb/client';
import { emailService } from './emailService';
import { s3Service } from './s3Service';
import { StorefrontImageService } from './storefrontImageService';
import { subdomainService } from './subdomainService';

// Import the services and initialization function
import { 
  initializeServices,
  adPackagesService,
  leadInquiriesService,
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
import { ObjectId } from 'mongodb';
import multer from 'multer';
import { calculateRevenue } from '../src/utils/pricingCalculations';

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
      'application/json',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'image/gif',
      'image/webp',
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
      'audio/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const supportedExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'md', 'json', 'jpg', 'jpeg', 'png', 'svg', 'gif', 'webp', 'zip', 'gz', 'mp4', 'mpeg', 'mov', 'mp3', 'wav'];
      cb(new Error(`File type "${file.mimetype}" not supported. Supported formats: ${supportedExts.join(', ')}`) as any, false);
    }
  }
});

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = await authService.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  req.token = token;
  next();
};

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

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.signUp({
      email,
      password,
      firstName,
      lastName,
      companyName
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send welcome email
    if (emailService && result.user) {
      try {
        await emailService.sendWelcomeEmail({
          firstName: result.user.firstName || '',
          email: result.user.email,
          verificationToken: undefined // Add verification token if email verification is enabled
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the signup if email fails
      }
    }

    res.status(201).json({
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.signIn(email, password);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signout', authenticateToken, async (req: any, res) => {
  try {
    await authService.signOut(req.token);
    res.json({ success: true });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.generatePasswordResetToken(email);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send password reset email if user exists and token was generated
    if (emailService && result.resetToken && result.user) {
      try {
        await emailService.sendPasswordResetEmail({
          firstName: result.user.firstName || '',
          email: result.user.email,
          resetToken: result.resetToken
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't reveal if email sending failed for security
      }
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const result = await authService.resetPassword(token, newPassword);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await authService.verifyEmail(token);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Email has been verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req: any, res) => {
  try {
    const { firstName, lastName, companyName } = req.body;
    const userId = req.user.id;

    const result = await authService.updateProfile(userId, {
      firstName,
      lastName,
      companyName
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ user: result.user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ===== PUBLICATIONS API =====
app.get('/api/publications', async (req, res) => {
  try {
    const { geographicCoverage, publicationType, contentType, verificationStatus } = req.query;
    
    const filters: any = {};
    if (geographicCoverage) filters.geographicCoverage = geographicCoverage as string;
    if (publicationType) filters.publicationType = publicationType as string;
    if (contentType) filters.contentType = contentType as string;
    if (verificationStatus) filters.verificationStatus = verificationStatus as string;

    // Check if service is initialized
    if (!publicationsService) {
      console.error('PublicationsService is not initialized');
      return res.status(500).json({ error: 'Publications service not initialized' });
    }

    const publications = await publicationsService.getAll(filters);
    res.json(publications);
  } catch (error) {
    console.error('Error fetching publications:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to fetch publications',
        details: error.message 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch publications' });
    }
  }
});

app.get('/api/publications/categories', async (req, res) => {
  try {
    const categories = await publicationsService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching publication categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/publications/types', async (req, res) => {
  try {
    const types = await publicationsService.getTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching publication types:', error);
    res.status(500).json({ error: 'Failed to fetch types' });
  }
});

// Get unassigned publications (must come BEFORE /api/publications/:id)
app.get('/api/publications/unassigned', async (req, res) => {
  try {
    const publications = await HubsService.getUnassignedPublications();
    res.json({ publications });
  } catch (error) {
    console.error('Error fetching unassigned publications:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned publications' });
  }
});

app.get('/api/publications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const publication = await publicationsService.getById(id);
    
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    res.json(publication);
  } catch (error) {
    console.error('Error fetching publication:', error);
    res.status(500).json({ error: 'Failed to fetch publication' });
  }
});

app.post('/api/publications', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const publication = await publicationsService.create(req.body);
    res.status(201).json(publication);
  } catch (error) {
    console.error('Error creating publication:', error);
    res.status(500).json({ error: 'Failed to create publication' });
  }
});

app.put('/api/publications/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const publication = await publicationsService.update(id, req.body);
    
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    res.json(publication);
  } catch (error) {
    console.error('Error updating publication:', error);
    res.status(500).json({ error: 'Failed to update publication' });
  }
});

app.delete('/api/publications/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const success = await publicationsService.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting publication:', error);
    res.status(500).json({ error: 'Failed to delete publication' });
  }
});

app.post('/api/publications/import', authenticateToken, async (req: any, res) => {
  try {
    console.log('💾 Import EXECUTE endpoint called');
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publications, options } = req.body;
    if (!Array.isArray(publications)) {
      return res.status(400).json({ error: 'Publications must be an array' });
    }

    // Enhanced import logic to match UI expectations
    console.log('🚀 Using enhanced import logic for', publications.length, 'publications');
    const results: any[] = [];
    
    for (const pub of publications) {
      if (!pub.publicationId || !pub.basicInfo?.publicationName) {
        results.push({
          action: 'error',
          publication: pub,
          error: 'Invalid publication: missing publicationId or publicationName'
        });
        continue;
      }

      try {
        // Check if publication exists
        const existing = await publicationsService.getByPublicationId(pub.publicationId);
        
        if (existing) {
          if (options?.updateMode === 'skip') {
            results.push({
              action: 'skip',
              publication: pub,
              existing,
              reason: 'Publication already exists and update mode is skip'
            });
          } else {
            // Update existing publication - remove metadata to avoid conflicts
            const { metadata, ...updateData } = pub;
            
            // Update the publication data without metadata (system manages metadata)
            await publicationsService.update(existing._id!.toString(), updateData);
            
            results.push({
              action: 'update',
              publication: pub,
              existing
            });
          }
        } else {
          // Create new publication
          await publicationsService.create(pub);
          results.push({
            action: 'create',
            publication: pub
          });
        }
      } catch (error) {
        results.push({
          action: 'error',
          publication: pub,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error importing publications:', error);
    res.status(500).json({ error: 'Failed to import publications' });
  }
});

app.post('/api/publications/import-preview', authenticateToken, async (req: any, res) => {
  try {
    console.log('📋 Import PREVIEW endpoint called');
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publications, options } = req.body;
    if (!Array.isArray(publications)) {
      return res.status(400).json({ error: 'Publications must be an array' });
    }

    // Generate preview results
    const results: any[] = [];
    for (const pub of publications) {
      if (!pub.publicationId || !pub.basicInfo?.publicationName) {
        continue;
      }

      // Check if publication exists
      const existing = await publicationsService.getByPublicationId(pub.publicationId);
      
      if (existing) {
        if (options?.updateMode === 'skip') {
          results.push({
            action: 'skip',
            publication: pub,
            existing,
            reason: 'Publication already exists and update mode is skip'
          });
        } else {
          results.push({
            action: 'update',
            publication: pub,
            existing,
            changes: { /* simplified - would show actual field differences */ }
          });
        }
      } else {
        results.push({
          action: 'create',
          publication: pub
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error generating import preview:', error);
    res.status(500).json({ error: 'Failed to generate import preview' });
  }
});

// ===== PUBLICATION FILES ROUTES =====

// Get all files for a publication
app.get('/api/publications/:publicationId/files', authenticateToken, async (req: any, res) => {
  try {
    const { publicationId } = req.params;
    
    // Verify publication exists
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Use the publication's _id to find files
    const files = await publicationFilesService.getByPublicationId(publication._id!.toString());
    res.json(files);
  } catch (error) {
    console.error('Error fetching publication files:', error);
    res.status(500).json({ error: 'Failed to fetch publication files' });
  }
});

// Get a specific file
app.get('/api/publications/:publicationId/files/:fileId', authenticateToken, async (req: any, res) => {
  try {
    const { publicationId, fileId } = req.params;
    
    // Verify publication exists and get its _id
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    const file = await publicationFilesService.getById(fileId);
    if (!file || file.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('Error fetching publication file:', error);
    res.status(500).json({ error: 'Failed to fetch publication file' });
  }
});

// Upload a new file
app.post('/api/publications/:publicationId/files', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    const { publicationId } = req.params;
    const { fileType, description, tags, isPublic } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!fileType) {
      return res.status(400).json({ error: 'File type is required' });
    }

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify publication exists
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Upload file to S3
    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(500).json({ error: 'File storage service not available' });
    }

    const uploadResult = await s3ServiceInstance.uploadFile({
      userId: req.user.id,
      folder: 'uploads',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      isPublic: isPublic === 'true'
    });

    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error || 'Failed to upload file' });
    }

    // Create file record
    const fileData = {
      publicationId: publication._id!.toString(), // Use MongoDB _id
      fileName: req.file.originalname,
      originalFileName: req.file.originalname,
      fileType,
      description: description || undefined,
      s3Key: uploadResult.key!,
      s3Bucket: process.env.AWS_S3_BUCKET || '',
      fileUrl: uploadResult.url,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      tags: tags ? JSON.parse(tags) : undefined,
      isPublic: isPublic === 'true'
    };

    const createdFile = await publicationFilesService.create(fileData);
    res.status(201).json(createdFile);
  } catch (error) {
    console.error('Error uploading publication file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Update file metadata
app.put('/api/publications/:publicationId/files/:fileId', authenticateToken, async (req: any, res) => {
  try {
    const { publicationId, fileId } = req.params;
    const { fileName, description, tags, isPublic } = req.body;

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify publication exists and get its _id
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Verify file exists and belongs to publication
    const existingFile = await publicationFilesService.getById(fileId);
    if (!existingFile || existingFile.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const updates: any = {};
    if (fileName !== undefined) updates.fileName = fileName;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const updatedFile = await publicationFilesService.update(fileId, updates);
    if (!updatedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(updatedFile);
  } catch (error) {
    console.error('Error updating publication file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete a file
app.delete('/api/publications/:publicationId/files/:fileId', authenticateToken, async (req: any, res) => {
  try {
    const { publicationId, fileId } = req.params;

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify publication exists and get its _id
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Verify file exists and belongs to publication
    const existingFile = await publicationFilesService.getById(fileId);
    if (!existingFile || existingFile.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from S3
    const s3ServiceInstance = s3Service();
    if (s3ServiceInstance && existingFile.s3Key) {
      await s3ServiceInstance.deleteFile(existingFile.s3Key);
    }

    // Soft delete from database
    const deleted = await publicationFilesService.delete(fileId);
    if (!deleted) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting publication file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get download URL for a file
app.get('/api/publications/:publicationId/files/:fileId/download', authenticateToken, async (req: any, res) => {
  try {
    const { publicationId, fileId } = req.params;

    // Verify publication exists and get its _id
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    const file = await publicationFilesService.getById(fileId);
    if (!file || file.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Increment download count
    await publicationFilesService.incrementDownloadCount(fileId);

    // Generate signed URL for private files
    const s3ServiceInstance = s3Service();
    if (!file.isPublic && s3ServiceInstance) {
      const downloadUrl = await s3ServiceInstance.getSignedUrl(file.s3Key, 3600); // 1 hour
      return res.json({ downloadUrl });
    }

    // Return public URL for public files
    res.json({ downloadUrl: file.fileUrl });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// Search files across all publications (admin only)
app.get('/api/publications/files/search', authenticateToken, async (req: any, res) => {
  try {
    const { q, fileType, publicationId, tags, isPublic } = req.query;

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const filters: any = {};
    if (fileType) filters.fileType = fileType;
    if (publicationId) filters.publicationId = publicationId;
    if (tags) {
      try {
        filters.tags = JSON.parse(tags as string);
      } catch {
        filters.tags = [tags];
      }
    }
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';

    const files = await publicationFilesService.search(q as string || '', filters);
    res.json(files);
  } catch (error) {
    console.error('Error searching publication files:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// ===== STOREFRONT CONFIGURATION ROUTES =====

// Check if subdomain is available (admin only) - MUST be before :publicationId route
app.get('/api/storefront/check-subdomain', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { subdomain, publicationId } = req.query;
    
    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required' });
    }

    // Construct full URL
    const websiteUrl = `https://${subdomain}.localmedia.store`;
    
    // Check if subdomain exists
    const exists = await storefrontConfigurationsService.checkSubdomainExists(
      websiteUrl, 
      publicationId as string | undefined
    );
    
    res.json({ 
      available: !exists,
      subdomain,
      message: exists ? 'This subdomain is already taken' : 'Subdomain is available'
    });
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    res.status(500).json({ error: 'Failed to check subdomain availability' });
  }
});

// Get storefront configuration by publication ID
app.get('/api/storefront/:publicationId', async (req, res) => {
  try {
    const { publicationId } = req.params;
    const { isDraft } = req.query;
    
    // If isDraft query param is specified, use it
    // Otherwise, prefer draft for editing, fall back to live
    let config;
    if (isDraft !== undefined) {
      config = await storefrontConfigurationsService.getByPublicationId(publicationId, isDraft === 'true');
    } else {
      // Try draft first (for editing), then fall back to live
      config = await storefrontConfigurationsService.getByPublicationId(publicationId, true);
      if (!config) {
        config = await storefrontConfigurationsService.getByPublicationId(publicationId, false);
      }
    }
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching storefront configuration:', error);
    res.status(500).json({ error: 'Failed to fetch storefront configuration' });
  }
});

// Get all storefront configurations with optional filtering (admin only)
app.get('/api/storefront', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { is_draft, publisher_id, isActive } = req.query;
    const filters: any = {};
    
    if (is_draft !== undefined) filters.is_draft = is_draft === 'true';
    if (publisher_id) filters.publisher_id = publisher_id;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const configs = await storefrontConfigurationsService.getAll(filters);
    res.json(configs);
  } catch (error) {
    console.error('Error fetching storefront configurations:', error);
    res.status(500).json({ error: 'Failed to fetch storefront configurations' });
  }
});

// Create a new storefront configuration (admin only)
app.post('/api/storefront', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Create storefront configuration
    // Note: Subdomain setup is now manual-only via the /setup-subdomain endpoint
    const config = await storefrontConfigurationsService.create(req.body);
    
    // Log if websiteUrl is set (DNS should be configured manually)
    if (req.body.websiteUrl) {
      console.log(`ℹ️  Storefront created with domain: ${req.body.websiteUrl}`);
      console.log(`   Use POST /api/storefront/:publicationId/setup-subdomain to configure DNS`);
    }
    
    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating storefront configuration:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create storefront configuration' });
  }
});

// Update storefront configuration (admin only)
app.put('/api/storefront/:publicationId', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publicationId } = req.params;
    const { isDraft } = req.query;
    
    // Filter out MongoDB internal fields that shouldn't be updated
    const { _id, createdAt, updatedAt, publicationId: bodyPublicationId, ...updateData } = req.body;
    
    // Get isDraft from body if not in query
    const isDraftValue = isDraft !== undefined ? isDraft === 'true' : updateData.meta?.isDraft;
    
    // Security: Prevent subdomain changes once set
    if (updateData.websiteUrl) {
      const existingConfig = await storefrontConfigurationsService.getByPublicationId(publicationId, isDraftValue);
      if (existingConfig && existingConfig.websiteUrl && existingConfig.websiteUrl !== updateData.websiteUrl) {
        return res.status(403).json({ 
          error: 'Subdomain cannot be changed once set',
          details: 'For security reasons, the subdomain URL cannot be modified after initial configuration.'
        });
      }
    }
    
    const config = await storefrontConfigurationsService.update(publicationId, updateData, isDraftValue);
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error updating storefront configuration:', error);
    console.error('Publication ID:', req.params.publicationId);
    console.error('User ID:', req.user?.id);
    console.error('Request body keys:', Object.keys(req.body || {}));
    console.error('Full error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Failed to update storefront configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Manual subdomain setup for existing storefront (admin only)
app.post('/api/storefront/:publicationId/setup-subdomain', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const subdomainServiceInstance = subdomainService();
    if (!subdomainServiceInstance) {
      return res.status(503).json({ 
        success: false,
        error: 'Subdomain service unavailable. Check AWS credentials in server configuration.' 
      });
    }

    const { publicationId } = req.params;
    const { isDraft } = req.query;

    // Get storefront to find websiteUrl
    const storefront = await storefrontConfigurationsService.getByPublicationId(
      publicationId, 
      isDraft === 'true'
    );
    
    if (!storefront) {
      return res.status(404).json({ 
        success: false,
        error: 'Storefront not found' 
      });
    }

    const websiteUrl = storefront.websiteUrl;
    if (!websiteUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Storefront does not have a websiteUrl configured. Please set a domain first.' 
      });
    }

    // Extract subdomain
    const subdomain = websiteUrl.replace(/^https?:\/\//, '').split('.')[0];
    
    if (!subdomain || subdomain === 'localmedia') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid subdomain in websiteUrl' 
      });
    }

    console.log(`Admin ${req.user.email} requesting manual subdomain setup: ${subdomain}`);

    // Setup subdomain
    const result = await subdomainServiceInstance.setupSubdomain(subdomain);

    res.json(result);
  } catch (error: any) {
    console.error('Error setting up subdomain:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to setup subdomain' 
    });
  }
});

// Delete storefront configuration (admin only)
app.delete('/api/storefront/:publicationId', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publicationId } = req.params;
    const { isDraft } = req.query;
    
    // If isDraft is specified, delete only that version
    if (isDraft !== undefined) {
      const db = getDatabase();
      const result = await db.collection('storefront_configurations').deleteOne({
        publicationId,
        'meta.isDraft': isDraft === 'true'
      });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: `Storefront configuration (${isDraft === 'true' ? 'draft' : 'live'}) not found` });
      }
      
      return res.json({ success: true, deletedCount: result.deletedCount });
    }
    
    // Otherwise delete all versions (backward compatibility)
    const success = await storefrontConfigurationsService.delete(publicationId);
    
    if (!success) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting storefront configuration:', error);
    res.status(500).json({ error: 'Failed to delete storefront configuration' });
  }
});

// Publish storefront configuration (admin only)
// Publish draft to live (replaces live version with draft)
app.post('/api/storefront/:publicationId/publish', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publicationId } = req.params;
    const config = await storefrontConfigurationsService.publishDraft(publicationId);
    
    if (!config) {
      return res.status(404).json({ error: 'Draft configuration not found' });
    }
    
    res.json(config);
  } catch (error: any) {
    console.error('Error publishing storefront configuration:', error);
    res.status(500).json({ error: error.message || 'Failed to publish storefront configuration' });
  }
});

// Create draft from live version
app.post('/api/storefront/:publicationId/create-draft', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publicationId } = req.params;
    const config = await storefrontConfigurationsService.createDraft(publicationId);
    
    res.json(config);
  } catch (error: any) {
    console.error('Error creating draft storefront configuration:', error);
    res.status(500).json({ error: error.message || 'Failed to create draft configuration' });
  }
});

// Duplicate storefront configuration (admin only)
app.post('/api/storefront/:sourcePublicationId/duplicate', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sourcePublicationId } = req.params;
    const { targetPublicationId, targetPublisherId } = req.body;

    if (!targetPublicationId || !targetPublisherId) {
      return res.status(400).json({ error: 'Target publication ID and publisher ID are required' });
    }

    const config = await storefrontConfigurationsService.duplicate(
      sourcePublicationId, 
      targetPublicationId, 
      targetPublisherId
    );
    
    res.status(201).json(config);
  } catch (error) {
    console.error('Error duplicating storefront configuration:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to duplicate storefront configuration' });
  }
});

// Preview storefront configuration (public for now, could be restricted later)
app.get('/api/storefront/:publicationId/preview', async (req, res) => {
  try {
    const { publicationId } = req.params;
    const config = await storefrontConfigurationsService.getByPublicationId(publicationId);
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    // For now, just return the config as JSON
    // In a real implementation, this might generate HTML or other preview formats
    res.json({
      config,
      html: '<!-- Preview HTML would be generated here -->',
      previewUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/preview/${publicationId}`
    });
  } catch (error) {
    console.error('Error generating storefront preview:', error);
    res.status(500).json({ error: 'Failed to generate storefront preview' });
  }
});

// Validate storefront configuration
app.post('/api/storefront/validate', async (req, res) => {
  try {
    const config = req.body;
    const errors: string[] = [];
    
    // Basic validation
    if (!config.meta?.publisher_id) {
      errors.push('Publisher ID is required');
    }
    
    if (!config.theme?.colors?.lightPrimary) {
      errors.push('Primary color is required');
    }
    
    if (!config.components?.navbar?.content?.logoUrl) {
      errors.push('Navbar logo URL is required');
    }
    
    if (!config.components?.hero?.content?.title) {
      errors.push('Hero title is required');
    }
    
    res.json({
      isValid: errors.length === 0,
      errors
    });
  } catch (error) {
    console.error('Error validating storefront configuration:', error);
    res.status(500).json({ error: 'Failed to validate storefront configuration' });
  }
});

// Get storefront templates
app.get('/api/storefront/templates', async (req, res) => {
  try {
    // For now, return a basic template
    // In a real implementation, these would be stored in the database
    const templates = [
      {
        id: 'default',
        name: 'Default Template',
        description: 'A clean, professional template suitable for most publications',
        config: {
          meta: {
            configVersion: "1.0.0",
            description: "Default storefront template",
            lastUpdated: new Date().toISOString(),
            publisher_id: "template_default",
            is_draft: true
          },
          // ... rest of default config would be here
        }
      }
    ];
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching storefront templates:', error);
    res.status(500).json({ error: 'Failed to fetch storefront templates' });
  }
});

// ===== STOREFRONT IMAGE ROUTES =====

// Upload storefront image
app.post('/api/storefront/:publicationId/images', authenticateToken, upload.single('image'), async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { publicationId } = req.params;
    const { imageType, channelId } = req.body;

    if (!imageType || !['logo', 'hero', 'channel', 'about', 'ogImage', 'favicon', 'metaLogo'].includes(imageType)) {
      return res.status(400).json({ error: 'Valid imageType required (logo, hero, channel, about, ogImage, favicon, metaLogo)' });
    }

    if (imageType === 'channel' && !channelId) {
      return res.status(400).json({ error: 'channelId required for channel images' });
    }

    // Check if file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Initialize storefront image service if not already done
    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(503).json({ error: 'File storage service unavailable' });
    }
    
    if (!storefrontImageService) {
      storefrontImageService = new StorefrontImageService(s3ServiceInstance);
    }

    const result = await storefrontImageService.uploadStorefrontImage({
      userId: req.user.id,
      publicationId,
      imageType,
      channelId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to upload image' });
    }

    res.json({
      success: true,
      url: result.url,
      imageType,
      channelId
    });

  } catch (error) {
    console.error('Error uploading storefront image:', error);
    res.status(500).json({ error: 'Failed to upload storefront image' });
  }
});

// Replace storefront image
app.put('/api/storefront/:publicationId/images', authenticateToken, upload.single('image'), async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { publicationId } = req.params;
    const { imageType, channelId } = req.body;

    if (!imageType || !['logo', 'hero', 'channel', 'about', 'ogImage', 'favicon', 'metaLogo'].includes(imageType)) {
      return res.status(400).json({ error: 'Valid imageType required (logo, hero, channel, about, ogImage, favicon, metaLogo)' });
    }

    if (imageType === 'channel' && !channelId) {
      return res.status(400).json({ error: 'channelId required for channel images' });
    }

    // Check if file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Initialize storefront image service if not already done
    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(503).json({ error: 'File storage service unavailable' });
    }
    
    if (!storefrontImageService) {
      storefrontImageService = new StorefrontImageService(s3ServiceInstance);
    }

    const result = await storefrontImageService.replaceStorefrontImage({
      userId: req.user.id,
      publicationId,
      imageType,
      channelId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to replace image' });
    }

    res.json({
      success: true,
      url: result.url,
      imageType,
      channelId
    });

  } catch (error) {
    console.error('Error replacing storefront image:', error);
    res.status(500).json({ error: 'Failed to replace storefront image' });
  }
});

// Remove storefront image
app.delete('/api/storefront/:publicationId/images', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publicationId } = req.params;
    const { imageType, channelId } = req.query;

    if (!imageType || !['logo', 'hero', 'channel', 'about', 'ogImage', 'favicon', 'metaLogo'].includes(imageType as string)) {
      return res.status(400).json({ error: 'Valid imageType required (logo, hero, channel, about, ogImage, favicon, metaLogo)' });
    }

    if (imageType === 'channel' && !channelId) {
      return res.status(400).json({ error: 'channelId required for channel images' });
    }

    // Initialize storefront image service if not already done
    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(503).json({ error: 'File storage service unavailable' });
    }
    
    if (!storefrontImageService) {
      storefrontImageService = new StorefrontImageService(s3ServiceInstance);
    }

    const result = await storefrontImageService.removeStorefrontImage(
      publicationId,
      imageType as any,
      channelId as string
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to remove image' });
    }

    res.json({
      success: true,
      imageType,
      channelId
    });

  } catch (error) {
    console.error('Error removing storefront image:', error);
    res.status(500).json({ error: 'Failed to remove storefront image' });
  }
});

// ===== SURVEY SUBMISSION ROUTES =====

    // Submit a new survey (public endpoint)
    app.post('/api/survey', async (req, res) => {
      try {
        const submissionData = req.body;

        // Generate metadata from request
        const metadata = {
          respondentId: Date.now().toString(),
          collectorId: '1',
          startDate: new Date(),
          endDate: new Date(),
          source: 'web_form',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer')
        };

        // Ensure required fields exist
        if (!submissionData.contactInformation || !submissionData.contactInformation.mediaOutletNames) {
          return res.status(400).json({ error: 'Media outlet name is required' });
        }

        const submission = await surveySubmissionsService.create({
          ...submissionData,
          metadata,
          application: {
            status: 'new'
          }
        });

        res.status(201).json({
          success: true,
          submissionId: submission._id,
          message: 'Survey submitted successfully'
        });
      } catch (error) {
        console.error('Error submitting survey:', error);
        res.status(500).json({ error: 'Failed to submit survey' });
      }
    });

// Get survey submissions (admin only)
app.get('/api/admin/surveys', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await authService.getUserById(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, dateFrom, dateTo, companyName } = req.query;
    const filters: any = {};
    
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    if (companyName) filters.companyName = companyName;
    
    const submissions = await surveySubmissionsService.getAll(filters);
    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching survey submissions:', error);
    res.status(500).json({ error: 'Failed to fetch survey submissions' });
  }
});

// Get survey statistics (admin only) - MUST come before /:id route
app.get('/api/admin/surveys/stats', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await authService.getUserById(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const stats = await surveySubmissionsService.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching survey stats:', error);
    res.status(500).json({ error: 'Failed to fetch survey stats' });
  }
});

// Get single survey submission (admin only)
app.get('/api/admin/surveys/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await authService.getUserById(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const submission = await surveySubmissionsService.getById(id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Survey submission not found' });
    }
    
    res.json({ submission });
  } catch (error) {
    console.error('Error fetching survey submission:', error);
    res.status(500).json({ error: 'Failed to fetch survey submission' });
  }
});

// Update survey submission status (admin only)
app.put('/api/admin/surveys/:id/status', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await authService.getUserById(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    const submission = await surveySubmissionsService.updateStatus(
      id, 
      status, 
      reviewNotes, 
      user.email
    );
    
    if (!submission) {
      return res.status(404).json({ error: 'Survey submission not found' });
    }
    
    res.json({ submission });
  } catch (error) {
    console.error('Error updating survey status:', error);
    res.status(500).json({ error: 'Failed to update survey status' });
  }
});

// Update full survey submission (admin only)
app.put('/api/admin/surveys/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await authService.getUserById(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = req.body || {};

    // Avoid updating immutable fields
    delete updateData._id;
    delete updateData.createdAt;

    const updated = await surveySubmissionsService.update(id, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Survey submission not found' });
    }

    res.json({ submission: updated });
  } catch (error) {
    console.error('Error updating survey submission:', error);
    res.status(500).json({ error: 'Failed to update survey submission' });
  }
});

// Delete survey submission (admin only)
app.delete('/api/admin/surveys/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await authService.getUserById(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const success = await surveySubmissionsService.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Survey submission not found' });
    }
    
    res.json({ success: true, message: 'Survey submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey submission:', error);
    res.status(500).json({ error: 'Failed to delete survey submission' });
  }
});


// Ad Packages routes
app.get('/api/packages', async (req, res) => {
  try {
    const { active_only } = req.query;
    const filters = active_only !== 'false' ? { isActive: true } : {};
    
    const packages = await adPackagesService.getAll(filters);
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const package_ = await adPackagesService.getById(id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ package: package_ });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Admin-only package management routes
app.post('/api/admin/packages', authenticateToken, async (req: any, res) => {
  try {
    // TODO: Add admin check here
    const packageData = req.body;
    const package_ = await adPackagesService.create(packageData);
    res.status(201).json({ package: package_ });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.put('/api/admin/packages/:id', authenticateToken, async (req: any, res) => {
  try {
    // TODO: Add admin check here
    const { id } = req.params;
    const updateData = req.body;
    const package_ = await adPackagesService.update(id, updateData);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ package: package_ });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

app.delete('/api/admin/packages/:id', authenticateToken, async (req: any, res) => {
  try {
    // TODO: Add admin check here
    const { id } = req.params;
    const { permanent } = req.query;
    
    const success = await adPackagesService.softDelete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ===== HUB PACKAGES API (NEW SYSTEM) =====

// Get all hub packages (public)
app.get('/api/hub-packages', async (req, res) => {
  try {
    const { 
      active_only, 
      featured, 
      category, 
      hub_id 
    } = req.query;
    
    const filters: any = {};
    if (active_only !== 'false') filters.isActive = true;
    if (featured === 'true') filters.isFeatured = true;
    if (category) filters.category = category as string;
    if (hub_id) filters.hubId = hub_id as string;
    
    const packages = await hubPackagesService.getAll(filters);
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching hub packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get single hub package by ID (public)
app.get('/api/hub-packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const package_ = await hubPackagesService.getById(id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Increment view count
    await hubPackagesService.incrementViewCount(id);

    res.json({ package: package_ });
  } catch (error) {
    console.error('Error fetching hub package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Search hub packages (public)
app.get('/api/hub-packages/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const packages = await hubPackagesService.search(query);
    res.json({ packages });
  } catch (error) {
    console.error('Error searching hub packages:', error);
    res.status(500).json({ error: 'Failed to search packages' });
  }
});

// Package inquiry (tracks interest)
app.post('/api/hub-packages/:id/inquire', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    await hubPackagesService.incrementInquiryCount(id);
    
    // You can also create a lead inquiry here
    // const leadData = { ...req.body, userId: req.user.id };
    // await leadInquiriesService.create(leadData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording package inquiry:', error);
    res.status(500).json({ error: 'Failed to record inquiry' });
  }
});

// ===== ADMIN-ONLY HUB PACKAGES ROUTES =====

// Create new hub package (admin only)
app.post('/api/admin/hub-packages', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const packageData = req.body;
    const package_ = await hubPackagesService.create(packageData, req.user.id);
    res.status(201).json({ package: package_ });
  } catch (error) {
    console.error('Error creating hub package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// Update hub package (admin only)
app.put('/api/admin/hub-packages/:id', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = req.body;
    const package_ = await hubPackagesService.update(id, updateData, req.user.id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ package: package_ });
  } catch (error) {
    console.error('Error updating hub package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Delete hub package (admin only)
app.delete('/api/admin/hub-packages/:id', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { permanent } = req.query;
    
    const success = await hubPackagesService.delete(id, permanent === 'true');
    
    if (!success) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting hub package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Restore soft-deleted package (admin only)
app.post('/api/admin/hub-packages/:id/restore', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const success = await hubPackagesService.restore(id);
    
    res.json({ success });
  } catch (error) {
    console.error('Error restoring hub package:', error);
    res.status(500).json({ error: 'Failed to restore package' });
  }
});

// ===== PACKAGE DISCOVERY TOOLS (ADMIN) =====

// Analyze available inventory across publications
app.get('/api/admin/package-discovery/inventory', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { geographic_area, min_visitors } = req.query;
    
    const filters: any = {};
    if (geographic_area) filters.geographicArea = geographic_area as string;
    if (min_visitors) filters.minMonthlyVisitors = parseInt(min_visitors as string);

    const inventory = await hubPackagesService.analyzeAvailableInventory(filters);
    res.json({ inventory });
  } catch (error) {
    console.error('Error analyzing inventory:', error);
    res.status(500).json({ error: 'Failed to analyze inventory' });
  }
});

// Generate package recommendations
app.post('/api/admin/package-discovery/recommend', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const criteria = req.body;
    const recommendations = await hubPackagesService.generatePackageRecommendations(criteria);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Seed starter packages
app.post('/api/admin/hub-packages/seed-starters', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Import the starter packages data
    const { STARTER_PACKAGES } = await import('../src/data/starterPackages');
    
    const results = [];
    for (const packageData of STARTER_PACKAGES) {
      try {
        const createdPackage = await hubPackagesService.create(packageData, req.user.id);
        results.push({ success: true, package: createdPackage });
      } catch (error: any) {
        // Check if it's a duplicate key error
        if (error.message && error.message.includes('duplicate')) {
          results.push({ success: false, packageId: packageData.packageId, error: 'Package already exists' });
        } else {
          results.push({ success: false, packageId: packageData.packageId, error: error.message });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.json({ 
      message: `Seeded ${successCount}/${STARTER_PACKAGES.length} starter packages`,
      results 
    });
  } catch (error) {
    console.error('Error seeding starter packages:', error);
    res.status(500).json({ error: 'Failed to seed starter packages' });
  }
});

// File upload routes
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(503).json({ error: 'File storage service unavailable' });
    }

    const { documentName, documentType, description } = req.body;
    
    if (!documentName || !documentType) {
      return res.status(400).json({ error: 'Document name and type are required' });
    }

    // Upload to S3
    const uploadResult = await s3ServiceInstance.uploadFile({
      userId: req.user.id,
      folder: 'documents',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      isPublic: false, // Private by default
    });

    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error || 'Upload failed' });
    }

    // Save document metadata to MongoDB
    const document = await brandDocumentsService.create({
      userId: req.user.id,
      documentName,
      documentType,
      description: description || null,
      fileUrl: uploadResult.url,
      s3Key: uploadResult.key,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalFileName: req.file.originalname,
    });

    res.json({
      success: true,
      document: {
        id: document._id,
        name: document.documentName,
        type: document.documentType,
        url: document.fileUrl,
        size: document.fileSize,
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get user documents
app.get('/api/files/documents', authenticateToken, async (req: any, res: any) => {
  try {
    const documents = await brandDocumentsService.getByUserId(req.user.id);
    
    // Generate fresh signed URLs for private documents
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let url = doc.fileUrl;
        
        // If we have S3 service and an S3 key, generate a fresh signed URL
        const s3ServiceInstance = s3Service();
        if (s3ServiceInstance && doc.s3Key) {
          try {
            url = await s3ServiceInstance.getSignedUrl(doc.s3Key, 3600); // 1 hour expiry
          } catch (error) {
            console.error('Error generating signed URL:', error);
            // Keep original URL as fallback
          }
        }
        
        return {
          id: doc._id,
          name: doc.documentName,
          type: doc.documentType,
          description: doc.description,
          url,
          size: doc.fileSize,
          mimeType: doc.mimeType,
          originalFileName: doc.originalFileName,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      })
    );

    res.json({ documents: documentsWithUrls });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete document
app.delete('/api/files/documents/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get document to check ownership and get S3 key
    const document = await brandDocumentsService.getById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from S3 if we have the key
    const s3ServiceInstance = s3Service();
    if (s3ServiceInstance && document.s3Key) {
      try {
        await s3ServiceInstance.deleteFile(document.s3Key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await brandDocumentsService.delete(id, req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// User Profile routes
app.get('/api/profile', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    res.json({ profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/profile', authenticateToken, async (req: any, res) => {
  try {
    const profileData = req.body;
    const updatedProfile = await userProfilesService.update(req.user.id, profileData);
    res.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Admin management endpoints
// Check if current user is admin
app.get('/api/admin/check', authenticateToken, async (req: any, res) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    res.json({ isAdmin: profile?.isAdmin || false });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
});

// TEMPORARY: Debug and make current user admin (remove this in production)
app.post('/api/admin/make-me-admin', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Looking for user with ID:', userId, 'Type:', typeof userId);
    
    const db = getDatabase();
    
    // Try multiple ways to find the user
    let directUser = null;
    
    // Try as ObjectId
    try {
      directUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      console.log('🔍 ObjectId lookup result:', directUser ? `${directUser.email}` : 'null');
    } catch (e) {
      console.log('🔍 ObjectId lookup failed:', e.message);
    }
    
    // Try as string
    if (!directUser) {
      directUser = await db.collection('users').findOne({ _id: userId });
      console.log('🔍 String lookup result:', directUser ? `${directUser.email}` : 'null');
    }
    
    // List all users to see what's in the database
    const allUsers = await db.collection('users').find({}).limit(5).toArray();
    console.log('🔍 Sample users in DB:', allUsers.map(u => ({ id: u._id, email: u.email })));
    
    if (!directUser) {
      return res.status(404).json({ 
        error: 'User not found in database',
        debug: {
          searchedId: userId,
          searchedType: typeof userId,
          sampleUsers: allUsers.map(u => ({ id: u._id?.toString(), email: u.email }))
        }
      });
    }
    
    // Create profile directly
    const profileResult = await db.collection('user_profiles').updateOne(
      { userId: directUser._id.toString() },
      { 
        $set: { 
          isAdmin: true,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    
    console.log(`✅ Made user ${directUser.email} an admin via direct DB!`, profileResult);
    
    return res.json({ 
      success: true, 
      message: `User ${directUser.email} is now an admin`,
      method: 'direct_db',
      profileResult
    });
    
  } catch (error) {
    console.error('Error making user admin:', error);
    res.status(500).json({ error: 'Failed to make user admin', details: error.message });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Get all user profiles with basic auth info
    const users = await userProfilesService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Set/unset admin privileges (admin only)
app.put('/api/admin/users/:userId/admin', authenticateToken, async (req: any, res) => {
  try {
    // Check if current user is admin
    const currentUserProfile = await userProfilesService.getByUserId(req.user.id);
    if (!currentUserProfile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { userId } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'isAdmin must be a boolean value' });
    }

    // Update user admin status
    const updatedProfile = await userProfilesService.update(userId, { isAdmin });
    
    res.json({ 
      success: true, 
      profile: updatedProfile,
      message: `User ${isAdmin ? 'granted' : 'revoked'} admin privileges` 
    });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// Admin dashboard statistics endpoint
app.get('/api/admin/dashboard-stats', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Get optional hubId filter from query params
    const hubId = req.query.hubId as string | undefined;

    // Get counts from various services
    const [leads, allPublications, packages, publicationFiles] = await Promise.all([
      leadInquiriesService.getAll(),
      publicationsService.getAll(),
      adPackagesService.getAll(),
      publicationFilesService.search('', {}) // Get all files with empty search query
    ]);

    // Filter publications by hub if hubId is provided
    const publications = hubId 
      ? allPublications.filter(pub => pub.hubIds?.includes(hubId))
      : allPublications;

    // Calculate detailed marketplace aggregates
    let adInventoryCount = 0;
    const inventoryByType = {
      website: 0,
      newsletter: 0,
      print: 0,
      events: 0,
      social: 0,
      crossChannel: 0,
      podcasts: 0,
      streamingVideo: 0,
      radioStations: 0
    };
    
    const publicationsByType = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      other: 0
    };
    
    const geographicCoverage = {
      local: 0,
      regional: 0,
      state: 0,
      national: 0,
      international: 0
    };
    
    const contentTypes = {
      news: 0,
      lifestyle: 0,
      business: 0,
      entertainment: 0,
      sports: 0,
      alternative: 0,
      mixed: 0
    };
    
    const audienceMetrics = {
      totalWebsiteVisitors: 0,
      totalNewsletterSubscribers: 0,
      totalPrintCirculation: 0,
      totalSocialFollowers: 0,
      totalEngagementRates: 0,
      engagementRateCount: 0,
      totalPodcastListeners: 0,
      totalStreamingSubscribers: 0,
      totalRadioListeners: 0
    };
    
    const pricingData = {
      websiteAdPrices: [] as number[],
      newsletterAdPrices: [] as number[],
      printAdPrices: [] as number[],
      podcastAdPrices: [] as number[],
      streamingAdPrices: [] as number[],
      radioAdPrices: [] as number[],
      totalValue: 0,
      inventoryCount: 0
    };

    // Separate hub pricing data by hub
    const hubPricingData: Record<string, {
      websiteAdPrices: number[],
      newsletterAdPrices: number[],
      printAdPrices: number[],
      podcastAdPrices: number[],
      streamingAdPrices: number[],
      radioAdPrices: number[],
      totalValue: number,
      inventoryCount: number
    }> = {};

    // Helper function to get price from ad (prioritize hub pricing)
    const getAdPrice = (ad: any, ...priceKeys: string[]): number | null => {
      // First try to get hub pricing if available
      if (ad.hubPricing && Array.isArray(ad.hubPricing) && ad.hubPricing.length > 0) {
        for (const key of priceKeys) {
          const hubPrice = ad.hubPricing[0]?.pricing?.[key];
          if (hubPrice && hubPrice > 0) return hubPrice;
        }
      }
      
      // Fall back to default pricing
      for (const key of priceKeys) {
        const price = ad.pricing?.[key];
        if (price && price > 0) return price;
      }
      
      return null;
    };

    // Helper to convert frequency to monthly occurrences
    const getOccurrencesFromFrequency = (frequency: string): number => {
      if (!frequency) return 0;
      switch(frequency.toLowerCase()) {
        case 'daily': return 30;
        case 'weekly': return 4.33;
        case 'bi-weekly': return 2.17;
        case 'monthly': return 1;
        default: return 0;
      }
    };

    // Helper function to collect pricing for both default and hub-specific
    const collectAdPricing = (ad: any, channelType: string, frequency?: string, channelKey: 'websiteAdPrices' | 'newsletterAdPrices' | 'printAdPrices' | 'podcastAdPrices' | 'streamingAdPrices' | 'radioAdPrices') => {
      // Always calculate default pricing (without hub pricing) using standardized calculation
      const defaultPrice = calculateRevenue(ad, 'month', frequency);
      if (defaultPrice > 0) {
        pricingData[channelKey].push(defaultPrice);
        pricingData.totalValue += defaultPrice;
        pricingData.inventoryCount++;
      }

      // Collect hub-specific pricing
      // IMPORTANT: After migration, hub pricing may have multiple tiers for same hub
      // We need to process each hub only ONCE per inventory item
      if (ad.hubPricing && Array.isArray(ad.hubPricing)) {
        const processedHubs = new Set<string>();
        
        ad.hubPricing.forEach((hubPrice: any) => {
          const hubId = hubPrice.hubId || 'unknown';
          const hubName = hubPrice.hubName || hubId;
          const hubKey = hubId;
          
          // Skip if we've already processed this hub for this ad
          if (processedHubs.has(hubKey)) {
            return;
          }
          processedHubs.add(hubKey);
          
          // Initialize hub data if not exists
          if (!hubPricingData[hubId]) {
            hubPricingData[hubId] = {
              websiteAdPrices: [],
              newsletterAdPrices: [],
              printAdPrices: [],
              podcastAdPrices: [],
              streamingAdPrices: [],
              radioAdPrices: [],
              totalValue: 0,
              inventoryCount: 0
            };
          }

          // Calculate monthly price for this hub using standardized calculation
          // hubPrice.pricing can be either:
          // - Single object (one tier)
          // - Array of objects (multiple tiers)
          // The calculateRevenue function handles both via getFirstPricing()
          const tempAd = { ...ad, pricing: hubPrice.pricing, hubPricing: null };
          const hubMonthlyPrice = calculateRevenue(tempAd, 'month', frequency);
          
          if (hubMonthlyPrice > 0) {
            hubPricingData[hubId][channelKey].push(hubMonthlyPrice);
            hubPricingData[hubId].totalValue += hubMonthlyPrice;
            hubPricingData[hubId].inventoryCount++;
          }
        });
      }
    };

    // Helper function to estimate monthly revenue from an ad
    const estimateMonthlyRevenue = (ad: any, channelType: string, frequency?: string, useHubPricing: boolean = true): number => {
      // Get pricing model
      let pricingModel = ad.pricing?.pricingModel;
      if (useHubPricing && ad.hubPricing?.[0]?.pricing?.pricingModel) {
        pricingModel = ad.hubPricing[0].pricing.pricingModel;
      }

      let price = 0;

      if (channelType === 'website') {
        price = useHubPricing ? (getAdPrice(ad, 'flatRate', 'cpm') || 0) : (ad.pricing?.flatRate || ad.pricing?.cpm || 0);
        // If flat rate, it's typically monthly. If CPM, estimate based on impressions
        if (pricingModel === 'cpm' && ad.monthlyImpressions) {
          return (price * ad.monthlyImpressions) / 1000;
        }
        return price; // Flat rate is typically per month
      }

      if (channelType === 'newsletter') {
        const perSend = useHubPricing ? (getAdPrice(ad, 'perSend', 'monthly', 'flatRate') || 0) : (ad.pricing?.perSend || ad.pricing?.monthly || ad.pricing?.flatRate || 0);
        // Estimate sends per month based on frequency
        const sendsPerMonth = frequency === 'daily' ? 30 : 
                            frequency === 'weekly' ? 4 : 
                            frequency === 'bi-weekly' ? 2 : 
                            frequency === 'monthly' ? 1 : 4; // default to weekly
        
        if (pricingModel === 'per_send' || pricingModel === 'perSend') {
          return perSend * sendsPerMonth;
        }
        return perSend; // Monthly or flat rate
      }

      if (channelType === 'print') {
        // Print pricing can be either:
        // 1. Single object: { flatRate: 100, pricingModel: 'per_ad', frequency: '4x' }
        // 2. Array of tiers: [{ pricing: { flatRate: 100, ... } }, ...]
        // 3. Legacy format: { oneTime: 100, fourTimes: 400, ... }
        
        const pricing = ad.pricing || {};
        const hubPricing = useHubPricing ? (ad.hubPricing?.[0]?.pricing || {}) : {};
        
        // Helper to parse frequency string to get per-insertion rate
        const parseFrequencyRate = (flatRate: number, freqString?: string): { rate: number, count: number } => {
          if (!freqString) return { rate: flatRate, count: 1 };
          
          const freq = freqString.toLowerCase();
          if (freq.includes('52x') || freq === 'yearly') return { rate: flatRate, count: 52 };
          if (freq.includes('26x') || freq === 'bi-weekly annual') return { rate: flatRate, count: 26 };
          if (freq.includes('13x') || freq === 'quarterly') return { rate: flatRate, count: 13 };
          if (freq.includes('12x') || freq === 'monthly annual') return { rate: flatRate, count: 12 };
          if (freq.includes('6x')) return { rate: flatRate, count: 6 };
          if (freq.includes('4x')) return { rate: flatRate, count: 4 };
          if (freq.includes('one time') || freq === '1x') return { rate: flatRate, count: 1 };
          
          return { rate: flatRate, count: 1 };
        };
        
        let perInsertionCost = 0;
        
        // Check if pricing is an array of tiers (new format)
        if (Array.isArray(pricing)) {
          // Find the best rate (highest frequency tier)
          let bestRate = { rate: 0, count: 1 };
          for (const tier of pricing) {
            const tierPricing = tier.pricing || tier;
            if (tierPricing.flatRate) {
              const parsed = parseFrequencyRate(tierPricing.flatRate, tierPricing.frequency);
              if (parsed.count > bestRate.count) {
                bestRate = parsed;
              }
            }
          }
          perInsertionCost = bestRate.rate / bestRate.count;
        }
        // Check if pricing is a single object with flatRate
        else if (pricing.flatRate) {
          const parsed = parseFrequencyRate(pricing.flatRate, pricing.frequency);
          perInsertionCost = parsed.rate / parsed.count;
        }
        // Check for hub pricing
        else if (hubPricing.flatRate) {
          const parsed = parseFrequencyRate(hubPricing.flatRate, hubPricing.frequency);
          perInsertionCost = parsed.rate / parsed.count;
        }
        // Legacy format fallback
        else {
          const rates = {
            oneTime: hubPricing.oneTime || pricing.oneTime || 0,
            fourTimes: hubPricing.fourTimes || pricing.fourTimes || 0,
            sixTimes: hubPricing.sixTimes || pricing.sixTimes || 0,
            twelveTimes: hubPricing.twelveTimes || pricing.twelveTimes || 0,
            thirteenTimes: hubPricing.thirteenTimes || pricing.thirteenTimes || 0,
            twentySixTimes: hubPricing.twentySixTimes || pricing.twentySixTimes || 0,
            fiftyTwoTimes: hubPricing.fiftyTwoTimes || pricing.fiftyTwoTimes || 0,
          };
          
          perInsertionCost = rates.oneTime;
          if (rates.fiftyTwoTimes > 0) perInsertionCost = rates.fiftyTwoTimes / 52;
          else if (rates.twentySixTimes > 0) perInsertionCost = rates.twentySixTimes / 26;
          else if (rates.thirteenTimes > 0) perInsertionCost = rates.thirteenTimes / 13;
          else if (rates.twelveTimes > 0) perInsertionCost = rates.twelveTimes / 12;
          else if (rates.sixTimes > 0) perInsertionCost = rates.sixTimes / 6;
          else if (rates.fourTimes > 0) perInsertionCost = rates.fourTimes / 4;
        }
        
        // Now multiply by issues per month based on publication frequency
        const publishFrequency = frequency || 'weekly';
        let issuesPerMonth = 4.33; // Default to weekly
        
        if (publishFrequency === 'daily') issuesPerMonth = 22; // ~22 publishing days/month
        else if (publishFrequency === 'weekly') issuesPerMonth = 4.33;
        else if (publishFrequency === 'bi-weekly') issuesPerMonth = 2.17;
        else if (publishFrequency === 'monthly') issuesPerMonth = 1;
        else if (publishFrequency === 'quarterly') issuesPerMonth = 0.33;
        
        return perInsertionCost * issuesPerMonth;
      }

      if (channelType === 'podcast') {
        price = useHubPricing ? (getAdPrice(ad, 'flatRate', 'cpm') || 0) : (ad.pricing?.flatRate || ad.pricing?.cpm || 0);
        // Estimate episodes per month based on frequency
        const episodesPerMonth = frequency === 'daily' ? 30 : 
                                frequency === 'weekly' ? 4 : 
                                frequency === 'bi-weekly' ? 2 : 
                                frequency === 'monthly' ? 1 : 4;
        
        if (pricingModel === 'cpm' && ad.averageDownloads) {
          return (price * ad.averageDownloads * episodesPerMonth) / 1000;
        }
        
        // If flat rate per episode
        if (pricingModel === 'flat' || pricingModel === 'per_episode') {
          return price * episodesPerMonth;
        }
        
        return price; // Monthly rate
      }

      if (channelType === 'radio' || channelType === 'streaming') {
        price = useHubPricing ? (getAdPrice(ad, 'flatRate', 'perSpot', 'weekly', 'monthly') || 0) : (ad.pricing?.flatRate || ad.pricing?.perSpot || ad.pricing?.weekly || ad.pricing?.monthly || 0);
        
        if (pricingModel === 'per_spot' || pricingModel === 'perSpot') {
          // Estimate 4 spots per day, 22 days per month
          return price * 88;
        } else if (pricingModel === 'weekly') {
          return price * 4.33;
        }
        
        return price; // Monthly rate
      }

      // Default: return the first available price
      return useHubPricing ? (getAdPrice(ad, 'flatRate', 'perSend', 'monthly', 'cpm') || 0) : (ad.pricing?.flatRate || ad.pricing?.perSend || ad.pricing?.monthly || ad.pricing?.cpm || 0);
    };

    for (const pub of publications) {
      // Count and categorize inventory by type
      if (pub.distributionChannels?.website?.advertisingOpportunities) {
        const websiteAds = pub.distributionChannels.website.advertisingOpportunities.length;
        inventoryByType.website += websiteAds;
        adInventoryCount += websiteAds;
        
        // Collect website pricing data (separate default and hub pricing)
        pub.distributionChannels.website.advertisingOpportunities.forEach(ad => {
          collectAdPricing(ad, 'website', undefined, 'websiteAdPrices');
        });
      }
      
      if (pub.distributionChannels?.newsletters) {
        for (const newsletter of pub.distributionChannels.newsletters) {
          if (newsletter.advertisingOpportunities) {
            const newsletterAds = newsletter.advertisingOpportunities.length;
            inventoryByType.newsletter += newsletterAds;
            adInventoryCount += newsletterAds;
            
            // Collect newsletter pricing data (separate default and hub pricing)
            newsletter.advertisingOpportunities.forEach(ad => {
              collectAdPricing(ad, 'newsletter', newsletter.frequency, 'newsletterAdPrices');
            });
          }
          
          // Aggregate newsletter subscribers
          if (newsletter.subscribers) {
            audienceMetrics.totalNewsletterSubscribers += newsletter.subscribers;
          }
        }
      }
      
      // Handle print distribution channels (can be array or object)
      if (pub.distributionChannels?.print) {
        const printChannels = Array.isArray(pub.distributionChannels.print) 
          ? pub.distributionChannels.print 
          : [pub.distributionChannels.print];
          
        for (const printChannel of printChannels) {
          // Aggregate print circulation
          if (printChannel.circulation) {
            audienceMetrics.totalPrintCirculation += printChannel.circulation;
          }
          
          if (printChannel?.advertisingOpportunities) {
            const printAds = printChannel.advertisingOpportunities.length;
            inventoryByType.print += printAds;
            adInventoryCount += printAds;
            
            // Collect print pricing data (separate default and hub pricing)
            printChannel.advertisingOpportunities.forEach(ad => {
              collectAdPricing(ad, 'print', printChannel.frequency, 'printAdPrices');
            });
          }
        }
      }
      
      if (pub.distributionChannels?.events) {
        for (const event of pub.distributionChannels.events) {
          if (event.advertisingOpportunities) {
            const eventAds = event.advertisingOpportunities.length;
            inventoryByType.events += eventAds;
            adInventoryCount += eventAds;
          }
        }
      }
      
      if (pub.crossChannelPackages) {
        const packages = pub.crossChannelPackages.length;
        inventoryByType.crossChannel += packages;
        adInventoryCount += packages;
      }
      
      // Social media count
      if (pub.distributionChannels?.socialMedia) {
        inventoryByType.social += pub.distributionChannels.socialMedia.length;
        
        // Aggregate social followers and engagement
        pub.distributionChannels.socialMedia.forEach(profile => {
          if (profile.metrics?.followers) {
            audienceMetrics.totalSocialFollowers += profile.metrics.followers;
          }
          if (profile.metrics?.engagementRate) {
            audienceMetrics.totalEngagementRates += profile.metrics.engagementRate;
            audienceMetrics.engagementRateCount++;
          }
        });
      }
      
      // Aggregate website visitors
      if (pub.distributionChannels?.website?.metrics?.monthlyVisitors) {
        audienceMetrics.totalWebsiteVisitors += pub.distributionChannels.website.metrics.monthlyVisitors;
      }
      
      // Handle podcasts
      if (pub.distributionChannels?.podcasts) {
        for (const podcast of pub.distributionChannels.podcasts) {
          if (podcast.advertisingOpportunities) {
            const podcastAds = podcast.advertisingOpportunities.length;
            inventoryByType.podcasts += podcastAds;
            adInventoryCount += podcastAds;
            
            // Collect podcast pricing data (DO NOT pass episode frequency)
            // Episode frequency describes release schedule, not ad occurrences per episode
            // Podcast ads MUST have performanceMetrics.occurrencesPerMonth to be counted
            podcast.advertisingOpportunities.forEach(ad => {
              collectAdPricing(ad, 'podcast', undefined, 'podcastAdPrices');
            });
          }
          
          // Aggregate podcast listeners
          if (podcast.averageDownloads) {
            audienceMetrics.totalPodcastListeners += podcast.averageDownloads;
          }
        }
      }

      // Handle streaming video
      if (pub.distributionChannels?.streamingVideo) {
        for (const stream of pub.distributionChannels.streamingVideo) {
          if (stream.advertisingOpportunities) {
            const streamingAds = stream.advertisingOpportunities.length;
            inventoryByType.streamingVideo += streamingAds;
            adInventoryCount += streamingAds;
            
            // Collect streaming pricing data (with channel frequency for revenue calculation)
            stream.advertisingOpportunities.forEach((ad: any) => {
              // Enrich ad with channel-level metrics for CPM/CPV calculations
              const enrichedAd = {
                ...ad,
                performanceMetrics: {
                  ...ad.performanceMetrics,
                  // Calculate impressions from averageViews × frequency occurrences
                  impressionsPerMonth: stream.averageViews && stream.frequency 
                    ? stream.averageViews * getOccurrencesFromFrequency(stream.frequency)
                    : (ad.performanceMetrics?.impressionsPerMonth || 0),
                  audienceSize: stream.subscribers || stream.averageViews || 0
                }
              };
              
              // Account for multiple spots per video
              if (ad.spotsPerShow && ad.spotsPerShow > 1) {
                enrichedAd.performanceMetrics.impressionsPerMonth *= ad.spotsPerShow;
              }
              
              collectAdPricing(enrichedAd, 'streaming', stream.frequency, 'streamingAdPrices');
            });
          }
          
          // Aggregate streaming subscribers
          if (stream.subscribers) {
            audienceMetrics.totalStreamingSubscribers += stream.subscribers;
          }
        }
      }

      // Handle radio stations
      if (pub.distributionChannels?.radioStations) {
        for (const radio of pub.distributionChannels.radioStations) {
          // NEW: Handle show-based structure
          if (radio.shows && radio.shows.length > 0) {
            for (const show of radio.shows) {
              if (show.advertisingOpportunities) {
                const radioAds = show.advertisingOpportunities.length;
                inventoryByType.radioStations += radioAds;
                adInventoryCount += radioAds;
                
                // Collect radio pricing data (DO NOT pass show frequency)
                // Show frequency describes when the show airs, not ad occurrences
                // Radio ads MUST have performanceMetrics.occurrencesPerMonth to be counted
                show.advertisingOpportunities.forEach((ad: any) => {
                  collectAdPricing(ad, 'radio', undefined, 'radioAdPrices');
                });
              }
              
              // Aggregate show listeners
              if (show.averageListeners) {
                audienceMetrics.totalRadioListeners += show.averageListeners;
              }
            }
          }
          
          // LEGACY: Handle station-level ads (backward compatibility)
          // Only process legacy ads if there are NO shows (to prevent double-counting)
          if (!radio.shows || radio.shows.length === 0) {
            if (radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0) {
              const radioAds = radio.advertisingOpportunities.length;
              inventoryByType.radioStations += radioAds;
              adInventoryCount += radioAds;
              
              // Collect radio pricing data (no frequency for legacy)
              radio.advertisingOpportunities.forEach(ad => {
                collectAdPricing(ad, 'radio', undefined, 'radioAdPrices');
              });
            }
          }
          
          // Aggregate radio listeners (station-level for legacy)
          if (radio.listeners) {
            audienceMetrics.totalRadioListeners += radio.listeners;
          }
        }
      }
      
      // Categorize publications by type
      const pubType = pub.basicInfo.publicationType || 'other';
      if (pubType in publicationsByType) {
        publicationsByType[pubType as keyof typeof publicationsByType]++;
      } else {
        publicationsByType.other++;
      }
      
      // Categorize by geographic coverage
      const geoCoverage = pub.basicInfo.geographicCoverage || 'local';
      if (geoCoverage in geographicCoverage) {
        geographicCoverage[geoCoverage as keyof typeof geographicCoverage]++;
      }
      
      // Categorize by content type
      const contentType = pub.basicInfo.contentType || 'mixed';
      if (contentType in contentTypes) {
        contentTypes[contentType as keyof typeof contentTypes]++;
      } else {
        contentTypes.mixed++;
      }
    }

    // For conversations, we'll need to implement conversation tracking
    // For now, use a placeholder that indicates real data would come from conversation service
    const conversationCount = 0; // TODO: Implement conversation tracking service

    // Calculate average pricing
    const calculateAverage = (prices: number[]) => 
      prices.length > 0 ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;

    // Process hub pricing data for response
    const hubPricingInsights: Record<string, any> = {};
    Object.keys(hubPricingData).forEach(hubId => {
      const hubData = hubPricingData[hubId];
      hubPricingInsights[hubId] = {
        totalWebsiteAdValue: Math.round(hubData.websiteAdPrices.reduce((sum, price) => sum + price, 0)),
        totalNewsletterAdValue: Math.round(hubData.newsletterAdPrices.reduce((sum, price) => sum + price, 0)),
        totalPrintAdValue: Math.round(hubData.printAdPrices.reduce((sum, price) => sum + price, 0)),
        totalPodcastAdValue: Math.round(hubData.podcastAdPrices.reduce((sum, price) => sum + price, 0)),
        totalStreamingAdValue: Math.round(hubData.streamingAdPrices.reduce((sum, price) => sum + price, 0)),
        totalRadioAdValue: Math.round(hubData.radioAdPrices.reduce((sum, price) => sum + price, 0)),
        totalInventoryValue: Math.round(hubData.totalValue),
        inventoryCount: hubData.inventoryCount
      };
    });

    const stats = {
      leads: leads.length,
      publications: publications.length,
      adInventory: adInventoryCount,
      conversations: conversationCount,
      packages: packages.length,
      publicationFiles: publicationFiles.length,
      
      // Marketplace-focused aggregates
      inventoryByType,
      publicationsByType,
      geographicCoverage,
      contentTypes,
      
      audienceMetrics: {
        totalWebsiteVisitors: audienceMetrics.totalWebsiteVisitors,
        totalNewsletterSubscribers: audienceMetrics.totalNewsletterSubscribers,
        totalPrintCirculation: audienceMetrics.totalPrintCirculation,
        totalSocialFollowers: audienceMetrics.totalSocialFollowers,
        totalPodcastListeners: audienceMetrics.totalPodcastListeners,
        totalStreamingSubscribers: audienceMetrics.totalStreamingSubscribers,
        totalRadioListeners: audienceMetrics.totalRadioListeners,
        averageEngagementRate: audienceMetrics.engagementRateCount > 0 
          ? Math.round((audienceMetrics.totalEngagementRates / audienceMetrics.engagementRateCount) * 100) / 100
          : 0
      },
      
      // Default pricing (without hub-specific pricing)
      pricingInsights: {
        totalWebsiteAdValue: Math.round(pricingData.websiteAdPrices.reduce((sum, price) => sum + price, 0)),
        totalNewsletterAdValue: Math.round(pricingData.newsletterAdPrices.reduce((sum, price) => sum + price, 0)),
        totalPrintAdValue: Math.round(pricingData.printAdPrices.reduce((sum, price) => sum + price, 0)),
        totalPodcastAdValue: Math.round(pricingData.podcastAdPrices.reduce((sum, price) => sum + price, 0)),
        totalStreamingAdValue: Math.round(pricingData.streamingAdPrices.reduce((sum, price) => sum + price, 0)),
        totalRadioAdValue: Math.round(pricingData.radioAdPrices.reduce((sum, price) => sum + price, 0)),
        totalInventoryValue: Math.round(pricingData.totalValue),
        inventoryCount: pricingData.inventoryCount
      },
      
      // Hub-specific pricing
      hubPricingInsights
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// ===== HUB MANAGEMENT ENDPOINTS =====
// Get all hubs
app.get('/api/hubs', async (req, res) => {
  try {
    const { status, includeInactive } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status;
    if (includeInactive === 'true') filters.includeInactive = true;
    
    const hubs = await HubsService.getAllHubs(filters);
    res.json({ hubs });
  } catch (error) {
    console.error('Error fetching hubs:', error);
    res.status(500).json({ error: 'Failed to fetch hubs' });
  }
});

// Get hub by ID
app.get('/api/hubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hub = await HubsService.getHubById(id);
    
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ hub });
  } catch (error) {
    console.error('Error fetching hub:', error);
    res.status(500).json({ error: 'Failed to fetch hub' });
  }
});

// Get hub by slug
app.get('/api/hubs/slug/:hubId', async (req, res) => {
  try {
    const { hubId } = req.params;
    const hub = await HubsService.getHubBySlug(hubId);
    
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ hub });
  } catch (error) {
    console.error('Error fetching hub:', error);
    res.status(500).json({ error: 'Failed to fetch hub' });
  }
});

// Create hub (admin only)
app.post('/api/hubs', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const hub = await HubsService.createHub(req.body);
    res.status(201).json({ hub });
  } catch (error) {
    console.error('Error creating hub:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create hub' });
  }
});

// Update hub (admin only)
app.put('/api/hubs/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const { id } = req.params;
    const hub = await HubsService.updateHub(id, req.body);
    
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ hub });
  } catch (error) {
    console.error('Error updating hub:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update hub' });
  }
});

// Delete hub (admin only)
app.delete('/api/hubs/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const { id } = req.params;
    const success = await HubsService.deleteHub(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ success: true, message: 'Hub archived successfully' });
  } catch (error) {
    console.error('Error deleting hub:', error);
    res.status(500).json({ error: 'Failed to delete hub' });
  }
});

// Get hub statistics
app.get('/api/hubs/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await HubsService.getHubStats(id);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching hub stats:', error);
    res.status(500).json({ error: 'Failed to fetch hub statistics' });
  }
});

// Get hub publications
app.get('/api/hubs/:hubId/publications', async (req, res) => {
  try {
    const { hubId } = req.params;
    const publications = await HubsService.getHubPublications(hubId);
    res.json({ publications });
  } catch (error) {
    console.error('Error fetching hub publications:', error);
    res.status(500).json({ error: 'Failed to fetch hub publications' });
  }
});

// Assign publication to hubs (admin only)
app.post('/api/publications/:id/hubs', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const { id } = req.params;
    const { hubIds } = req.body;
    
    if (!Array.isArray(hubIds)) {
      return res.status(400).json({ error: 'hubIds must be an array' });
    }
    
    await HubsService.assignPublicationToHubs(id, hubIds);
    res.json({ success: true, message: 'Publication assigned to hubs successfully' });
  } catch (error) {
    console.error('Error assigning publication to hubs:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to assign publication' });
  }
});

// Remove publication from hub (admin only)
app.delete('/api/publications/:id/hubs/:hubId', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const { id, hubId } = req.params;
    await HubsService.removePublicationFromHub(id, hubId);
    res.json({ success: true, message: 'Publication removed from hub successfully' });
  } catch (error) {
    console.error('Error removing publication from hub:', error);
    res.status(500).json({ error: 'Failed to remove publication from hub' });
  }
});

// Bulk assign publications to hub (admin only)
app.post('/api/hubs/:hubId/publications/bulk', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    const { hubId } = req.params;
    const { publicationIds } = req.body;
    
    if (!Array.isArray(publicationIds)) {
      return res.status(400).json({ error: 'publicationIds must be an array' });
    }
    
    const modifiedCount = await HubsService.bulkAssignPublicationsToHub(publicationIds, hubId);
    res.json({ success: true, modifiedCount, message: `${modifiedCount} publications assigned to hub` });
  } catch (error) {
    console.error('Error bulk assigning publications:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to bulk assign publications' });
  }
});

// Lead Inquiry endpoints
// Get all leads (admin only)
app.get('/api/admin/leads', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const leads = await leadInquiriesService.getAll();
    res.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Update lead status (admin only)
app.put('/api/admin/leads/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const updateData = req.body;
    const lead = await leadInquiriesService.update(id, updateData);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Save external document
app.post('/api/documents/external', authenticateToken, async (req: any, res: any) => {
  try {
    const { documentName, documentType, description, externalUrl } = req.body;
    
    if (!documentName || !documentType || !externalUrl) {
      return res.status(400).json({ error: 'Document name, type, and external URL are required' });
    }

    // Save document metadata to MongoDB
    const document = await brandDocumentsService.create({
      userId: req.user.id,
      documentName,
      documentType,
      description: description || undefined,
      externalUrl,
      fileUrl: undefined,
      s3Key: undefined,
      fileSize: undefined,
      mimeType: undefined,
      originalFileName: undefined,
    });

    res.json({
      success: true,
      document: {
        id: document._id,
        name: document.documentName,
        type: document.documentType,
        url: document.externalUrl,
      }
    });
  } catch (error) {
    console.error('External document save error:', error);
    res.status(500).json({ error: 'Failed to save external document' });
  }
});

// ===== ASSISTANT INSTRUCTIONS API =====
// Get active instructions for an assistant type
app.get('/api/assistant-instructions/:assistantType', async (req, res) => {
  try {
    const { assistantType } = req.params;
    
    if (!['campaign', 'package'].includes(assistantType)) {
      return res.status(400).json({ error: 'Invalid assistant type' });
    }
    
    const instruction = await assistantInstructionsService.getActive(assistantType as 'campaign' | 'package');
    
    if (!instruction) {
      // Return default instructions if none found
      const defaultInstructions = {
        campaign: "You are Lassie, a specialized AI assistant for media strategy and brand profiling. Your primary role is to understand the user's business and campaign needs, help them discover Chicago media outlets, and recommend appropriate advertising packages.",
        package: "You are Scout, a specialized AI assistant for package building and publication network analysis. Your primary role is to help analyze publication data, identify optimal package combinations, and create packages that make sense for the publication network. You focus on inventory management, audience analysis, and strategic package development."
      };
      
      return res.json({ 
        instructions: defaultInstructions[assistantType as keyof typeof defaultInstructions] 
      });
    }
    
    res.json({ instructions: instruction.instructions });
  } catch (error) {
    console.error('Error fetching assistant instructions:', error);
    res.status(500).json({ error: 'Failed to fetch assistant instructions' });
  }
});

// Get all assistant instructions (admin only)
app.get('/api/admin/assistant-instructions', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const instructions = await assistantInstructionsService.getAll();
    res.json(instructions);
  } catch (error) {
    console.error('Error fetching all assistant instructions:', error);
    res.status(500).json({ error: 'Failed to fetch assistant instructions' });
  }
});

// Update assistant instructions (admin only)
app.post('/api/admin/assistant-instructions/:assistantType', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { assistantType } = req.params;
    const { instructions } = req.body;

    if (!['campaign', 'package'].includes(assistantType)) {
      return res.status(400).json({ error: 'Invalid assistant type' });
    }

    if (!instructions || typeof instructions !== 'string') {
      return res.status(400).json({ error: 'Instructions are required' });
    }

    const result = await assistantInstructionsService.upsert(assistantType as 'campaign' | 'package', instructions);
    res.json(result);
  } catch (error) {
    console.error('Error updating assistant instructions:', error);
    res.status(500).json({ error: 'Failed to update assistant instructions' });
  }
});

// Activate specific assistant instruction (admin only)
app.post('/api/admin/assistant-instructions/:id/activate', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await assistantInstructionsService.activate(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error activating assistant instruction:', error);
    res.status(500).json({ error: 'Failed to activate assistant instruction' });
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
