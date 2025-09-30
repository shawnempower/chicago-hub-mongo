import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authService } from '../src/integrations/mongodb/authService';
import { connectToDatabase } from '../src/integrations/mongodb/client';
import { emailService } from './emailService';
import { s3Service } from './s3Service';
import { brandDocumentsService, adPackagesService, userProfilesService, leadInquiriesService, publicationsService } from '../src/integrations/mongodb/allServices';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3001;

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
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain' // Allow .txt files for testing
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
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
    const results = [];
    
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
    const results = [];
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
    
    let success;
    if (permanent === 'true') {
      success = await adPackagesService.hardDelete(id);
    } else {
      success = await adPackagesService.softDelete(id);
    }
    
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
      description: description || null,
      externalUrl,
      fileUrl: null,
      s3Key: null,
      fileSize: null,
      mimeType: null,
      originalFileName: null,
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
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    console.log('Connected to MongoDB successfully!');

    // Check S3 service status
    const s3ServiceInstance = s3Service();
    console.log('S3 Service status:', s3ServiceInstance ? 'AVAILABLE' : 'NOT AVAILABLE');
    if (s3ServiceInstance) {
      console.log('S3 service initialized successfully');
    } else {
      console.warn('S3 service is not available - file uploads will fail');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Authentication server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
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
