import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

// Debug environment variables
console.log('🔍 Environment variables loaded:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
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
  surveySubmissionsService
} from '../src/integrations/mongodb/allServices';
import { authService, initializeAuthService } from '../src/integrations/mongodb/authService';
import { getDatabase } from '../src/integrations/mongodb/client';
import { ObjectId } from 'mongodb';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize storefront image service
const storefrontImageService = new StorefrontImageService(s3Service);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

    const publications = await publicationsService.getAll(filters);
    res.json(publications);
  } catch (error) {
    console.error('Error fetching publications:', error);
    res.status(500).json({ error: 'Failed to fetch publications' });
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

// Get storefront configuration by publication ID
app.get('/api/storefront/:publicationId', async (req, res) => {
  try {
    const { publicationId } = req.params;
    const config = await storefrontConfigurationsService.getByPublicationId(publicationId);
    
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

    const config = await storefrontConfigurationsService.create(req.body);
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
    
    // Filter out MongoDB internal fields that shouldn't be updated
    const { _id, createdAt, updatedAt, publicationId: bodyPublicationId, ...updateData } = req.body;
    
    const config = await storefrontConfigurationsService.update(publicationId, updateData);
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error updating storefront configuration:', error);
    console.error('Publication ID:', req.params.publicationId);
    console.error('User ID:', req.user?.id);
    console.error('Request body keys:', Object.keys(req.body || {}));
    res.status(500).json({ error: 'Failed to update storefront configuration' });
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
app.post('/api/storefront/:publicationId/publish', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publicationId } = req.params;
    const config = await storefrontConfigurationsService.publish(publicationId);
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error publishing storefront configuration:', error);
    res.status(500).json({ error: 'Failed to publish storefront configuration' });
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

    if (!imageType || !['logo', 'hero', 'channel', 'about', 'ogImage'].includes(imageType)) {
      return res.status(400).json({ error: 'Valid imageType required (logo, hero, channel, about, ogImage)' });
    }

    if (imageType === 'channel' && !channelId) {
      return res.status(400).json({ error: 'channelId required for channel images' });
    }

    // Check if file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
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

    if (!imageType || !['logo', 'hero', 'channel', 'about', 'ogImage'].includes(imageType)) {
      return res.status(400).json({ error: 'Valid imageType required (logo, hero, channel, about, ogImage)' });
    }

    if (imageType === 'channel' && !channelId) {
      return res.status(400).json({ error: 'channelId required for channel images' });
    }

    // Check if file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
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

    if (!imageType || !['logo', 'hero', 'channel', 'about', 'ogImage'].includes(imageType as string)) {
      return res.status(400).json({ error: 'Valid imageType required (logo, hero, channel, about, ogImage)' });
    }

    if (imageType === 'channel' && !channelId) {
      return res.status(400).json({ error: 'channelId required for channel images' });
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

    // Get counts from various services
    const [leads, publications, packages, publicationFiles] = await Promise.all([
      leadInquiriesService.getAll(),
      publicationsService.getAll(),
      adPackagesService.getAll(),
      publicationFilesService.search('', {}) // Get all files with empty search query
    ]);

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
      totalValue: 0
    };

    for (const pub of publications) {
      // Count and categorize inventory by type
      if (pub.distributionChannels?.website?.advertisingOpportunities) {
        const websiteAds = pub.distributionChannels.website.advertisingOpportunities.length;
        inventoryByType.website += websiteAds;
        adInventoryCount += websiteAds;
        
        // Collect website pricing data
        pub.distributionChannels.website.advertisingOpportunities.forEach(ad => {
          const price = ad.pricing?.flatRate || ad.pricing?.cpm;
          if (price) {
            pricingData.websiteAdPrices.push(price);
            pricingData.totalValue += price;
          }
        });
      }
      
      if (pub.distributionChannels?.newsletters) {
        for (const newsletter of pub.distributionChannels.newsletters) {
          if (newsletter.advertisingOpportunities) {
            const newsletterAds = newsletter.advertisingOpportunities.length;
            inventoryByType.newsletter += newsletterAds;
            adInventoryCount += newsletterAds;
            
            // Collect newsletter pricing data
            newsletter.advertisingOpportunities.forEach(ad => {
              const price = ad.pricing?.perSend || ad.pricing?.monthly;
              if (price) {
                pricingData.newsletterAdPrices.push(price);
                pricingData.totalValue += price;
              }
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
          if (printChannel?.advertisingOpportunities) {
            const printAds = printChannel.advertisingOpportunities.length;
            inventoryByType.print += printAds;
            adInventoryCount += printAds;
            
            // Collect print pricing data
            printChannel.advertisingOpportunities.forEach(ad => {
              const price = ad.pricing?.oneTime || ad.pricing?.fourTimes || ad.pricing?.twelveTimes;
              if (price) {
                pricingData.printAdPrices.push(price);
                pricingData.totalValue += price;
              }
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
            
            // Collect podcast pricing data
            podcast.advertisingOpportunities.forEach(ad => {
              const price = ad.pricing?.perEpisode || ad.pricing?.monthly || ad.pricing?.flatRate;
              if (price) {
                pricingData.podcastAdPrices.push(price);
                pricingData.totalValue += price;
              }
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
            
            // Collect streaming pricing data
            stream.advertisingOpportunities.forEach(ad => {
              const price = ad.pricing?.flatRate || ad.pricing?.cpm;
              if (price) {
                pricingData.streamingAdPrices.push(price);
                pricingData.totalValue += price;
              }
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
          if (radio.advertisingOpportunities) {
            const radioAds = radio.advertisingOpportunities.length;
            inventoryByType.radioStations += radioAds;
            adInventoryCount += radioAds;
            
            // Collect radio pricing data
            radio.advertisingOpportunities.forEach(ad => {
              const price = ad.pricing?.per30sec || ad.pricing?.per60sec || ad.pricing?.flatRate;
              if (price) {
                pricingData.radioAdPrices.push(price);
                pricingData.totalValue += price;
              }
            });
          }
          
          // Aggregate radio listeners
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
        totalSocialFollowers: audienceMetrics.totalSocialFollowers,
        totalPodcastListeners: audienceMetrics.totalPodcastListeners,
        totalStreamingSubscribers: audienceMetrics.totalStreamingSubscribers,
        totalRadioListeners: audienceMetrics.totalRadioListeners,
        averageEngagementRate: audienceMetrics.engagementRateCount > 0 
          ? Math.round((audienceMetrics.totalEngagementRates / audienceMetrics.engagementRateCount) * 100) / 100
          : 0
      },
      
      pricingInsights: {
        averageWebsiteAdPrice: calculateAverage(pricingData.websiteAdPrices),
        averageNewsletterAdPrice: calculateAverage(pricingData.newsletterAdPrices),
        averagePrintAdPrice: calculateAverage(pricingData.printAdPrices),
        averagePodcastAdPrice: calculateAverage(pricingData.podcastAdPrices),
        averageStreamingAdPrice: calculateAverage(pricingData.streamingAdPrices),
        averageRadioAdPrice: calculateAverage(pricingData.radioAdPrices),
        totalInventoryValue: Math.round(pricingData.totalValue)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
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
