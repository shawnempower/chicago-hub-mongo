/**
 * Inventory Chat Routes
 * 
 * API endpoints for the Hub Sales Assistant
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/authenticate';
import { ConversationService } from '../conversationService';
import { HubSalesAssistantService } from '../hubSalesAssistantService';
import { 
  ConversationAttachment, 
  MAX_FILE_SIZE, 
  MAX_FILES_PER_CONVERSATION,
  ALL_SUPPORTED_TYPES,
  SUPPORTED_UPLOAD_TYPES
} from '../conversationSchema';
import { getS3Service } from '../s3Service';
import { extractText, isExtractableDocument, isImageType } from '../utils/textExtractor';
import { createLogger } from '../../src/utils/logger';
import { ObjectId } from 'mongodb';

const router = Router();
const logger = createLogger('InventoryChatRoutes');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    if (ALL_SUPPORTED_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * Create a new conversation
 * POST /api/inventory-chat/conversations
 */
router.post('/conversations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.body;
    
    if (!hubId) {
      return res.status(400).json({ error: 'hubId is required' });
    }
    
    const conversation = await ConversationService.createConversation(req.user.id, hubId);
    
    logger.info(`Created conversation ${conversation.conversationId} for user ${req.user.id}`);
    
    res.status(201).json(conversation);
  } catch (error: any) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * List conversations for the current user
 * GET /api/inventory-chat/conversations?hubId=xxx
 */
router.get('/conversations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.query;
    
    const conversations = await ConversationService.getConversations(
      req.user.id,
      hubId as string | undefined
    );
    
    res.json({ conversations });
  } catch (error: any) {
    logger.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

/**
 * Get a specific conversation
 * GET /api/inventory-chat/conversations/:id
 */
router.get('/conversations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const conversation = await ConversationService.getConversation(id, req.user.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error: any) {
    logger.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Delete a conversation
 * DELETE /api/inventory-chat/conversations/:id
 */
router.delete('/conversations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const deleted = await ConversationService.deleteConversation(id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    logger.info(`Deleted conversation ${id} for user ${req.user.id}`);
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * Send a message and get AI response
 * POST /api/inventory-chat/conversations/:id/messages
 */
router.post('/conversations/:id/messages', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch conversation to verify ownership and get hubId
    const conversation = await ConversationService.getConversation(id, req.user.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add user message to conversation
    await ConversationService.addMessage(id, req.user.id, 'user', message.trim());

    // Auto-generate title from first message if needed
    if (conversation.messages.length === 0 && conversation.title === 'New Conversation') {
      const title = ConversationService.generateTitle(message.trim());
      await ConversationService.updateTitle(id, req.user.id, title);
    }

    // Get recent conversation history
    const recentMessages = await ConversationService.getRecentMessages(id, req.user.id, 10);
    
    // Get attachments for context
    const attachments = conversation.attachments || [];
    
    // Call Hub Sales Assistant service
    logger.info(`Processing message for conversation ${id}, hub ${conversation.hubId}`);
    const response = await HubSalesAssistantService.chat(
      conversation.hubId,
      id,
      req.user.id,
      message.trim(),
      recentMessages.slice(0, -1), // Exclude the message we just added
      attachments
    );

    // Add assistant response to conversation
    await ConversationService.addMessage(id, req.user.id, 'assistant', response.content);

    // Persist token usage to conversation
    if (response.usage) {
      await ConversationService.addTokenUsage(
        id,
        req.user.id,
        response.usage.inputTokens,
        response.usage.outputTokens
      );
    }

    logger.info(`Generated response for conversation ${id} (${response.usage?.outputTokens} tokens)`);

    res.json({
      message: response.content,
      generatedFiles: response.generatedFiles,
      usage: response.usage,
    });
  } catch (error: any) {
    logger.error('Error processing message:', error);
    
    // Handle specific error cases
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ error: error.message });
    }
    
    if (error.message.includes('API key')) {
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    res.status(500).json({ error: error.message || 'Failed to process message' });
  }
});

/**
 * Update conversation title
 * PATCH /api/inventory-chat/conversations/:id/title
 */
router.patch('/conversations/:id/title', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const updated = await ConversationService.updateTitle(id, req.user.id, title.trim());
    
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// ============================================
// Attachment Routes
// ============================================

/**
 * Upload attachment(s) to a conversation
 * POST /api/inventory-chat/conversations/:id/attachments
 */
router.post(
  '/conversations/:id/attachments',
  authenticateToken,
  upload.array('files', 5),
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      // Verify conversation exists and user owns it
      const conversation = await ConversationService.getConversation(id, req.user.id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Check attachment limit
      const currentCount = conversation.attachments?.length || 0;
      if (currentCount + files.length > MAX_FILES_PER_CONVERSATION) {
        return res.status(400).json({ 
          error: `Maximum ${MAX_FILES_PER_CONVERSATION} attachments allowed per conversation` 
        });
      }

      const s3Service = getS3Service();
      if (!s3Service) {
        return res.status(500).json({ error: 'File storage is not configured' });
      }

      const uploadedAttachments: ConversationAttachment[] = [];

      for (const file of files) {
        const attachmentId = new ObjectId().toHexString();
        const s3Key = `conversations/${id}/attachments/${attachmentId}_${file.originalname}`;
        
        // Upload to S3
        const uploadResult = await s3Service.uploadFileWithCustomKey(
          s3Key,
          file.buffer,
          file.mimetype,
          {
            conversationId: id,
            userId: req.user.id,
            originalName: file.originalname
          },
          false // private
        );

        if (!uploadResult.success) {
          logger.error(`Failed to upload ${file.originalname}:`, uploadResult.error);
          continue;
        }

        // Extract text for documents or flag as image
        let extractedText: string | undefined;
        let isImage = false;

        if (isExtractableDocument(file.mimetype)) {
          try {
            extractedText = await extractText(file.buffer, file.mimetype, file.originalname);
            // Truncate if too long (keep under ~50k chars)
            if (extractedText.length > 50000) {
              extractedText = extractedText.substring(0, 50000) + '\n\n[Content truncated...]';
            }
          } catch (e: any) {
            logger.warn(`Failed to extract text from ${file.originalname}:`, e.message);
          }
        } else if (isImageType(file.mimetype)) {
          isImage = true;
        }

        const attachment: ConversationAttachment = {
          id: attachmentId,
          filename: file.originalname,
          mimeType: file.mimetype,
          s3Key,
          size: file.size,
          uploadedAt: new Date(),
          extractedText,
          isImage
        };

        // Save to conversation
        await ConversationService.addAttachment(id, req.user.id, attachment);
        uploadedAttachments.push(attachment);
        
        logger.info(`Uploaded attachment ${file.originalname} to conversation ${id}`);
      }

      res.status(201).json({
        success: true,
        attachments: uploadedAttachments.map(a => ({
          id: a.id,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
          isImage: a.isImage,
          hasExtractedText: !!a.extractedText
        }))
      });
    } catch (error: any) {
      logger.error('Error uploading attachments:', error);
      res.status(500).json({ error: error.message || 'Failed to upload attachments' });
    }
  }
);

/**
 * List attachments for a conversation
 * GET /api/inventory-chat/conversations/:id/attachments
 */
router.get('/conversations/:id/attachments', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const attachments = await ConversationService.getAttachments(id, req.user.id);
    
    res.json({
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        uploadedAt: a.uploadedAt,
        isImage: a.isImage,
        hasExtractedText: !!a.extractedText
      }))
    });
  } catch (error: any) {
    logger.error('Error listing attachments:', error);
    res.status(500).json({ error: 'Failed to list attachments' });
  }
});

/**
 * Delete an attachment
 * DELETE /api/inventory-chat/conversations/:id/attachments/:attachmentId
 */
router.delete(
  '/conversations/:id/attachments/:attachmentId',
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { id, attachmentId } = req.params;

      const attachment = await ConversationService.removeAttachment(id, req.user.id, attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found' });
      }

      // Delete from S3
      const s3Service = getS3Service();
      if (s3Service) {
        await s3Service.deleteFile(attachment.s3Key);
      }

      logger.info(`Deleted attachment ${attachmentId} from conversation ${id}`);
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error deleting attachment:', error);
      res.status(500).json({ error: 'Failed to delete attachment' });
    }
  }
);

// ============================================
// Generated File Routes
// ============================================

/**
 * List generated files for a conversation
 * GET /api/inventory-chat/conversations/:id/files
 */
router.get('/conversations/:id/files', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const files = await ConversationService.getGeneratedFiles(id, req.user.id);
    
    res.json({
      files: files.map(f => ({
        id: f.id,
        filename: f.filename,
        fileType: f.fileType,
        createdAt: f.createdAt
      }))
    });
  } catch (error: any) {
    logger.error('Error listing generated files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * Download a generated file
 * GET /api/inventory-chat/conversations/:id/files/:fileId/download
 */
router.get(
  '/conversations/:id/files/:fileId/download',
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { id, fileId } = req.params;

      const file = await ConversationService.getGeneratedFile(id, req.user.id, fileId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const s3Service = getS3Service();
      if (!s3Service) {
        return res.status(500).json({ error: 'File storage is not configured' });
      }

      // Generate signed download URL
      const downloadUrl = await s3Service.getSignedDownloadUrl(file.s3Key, file.filename, 3600);
      
      res.json({ downloadUrl });
    } catch (error: any) {
      logger.error('Error getting download URL:', error);
      res.status(500).json({ error: 'Failed to get download URL' });
    }
  }
);

// ============================================
// Context Routes
// ============================================

/**
 * Get conversation context
 * GET /api/inventory-chat/conversations/:id/context
 */
router.get('/conversations/:id/context', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const context = await ConversationService.getContext(id, req.user.id);
    
    res.json({ context: context || {} });
  } catch (error: any) {
    logger.error('Error getting context:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
});

/**
 * Update conversation context
 * PATCH /api/inventory-chat/conversations/:id/context
 */
router.patch('/conversations/:id/context', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const contextUpdate = req.body;

    // Validate conversation exists
    const conversation = await ConversationService.getConversation(id, req.user.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await ConversationService.updateContext(id, req.user.id, contextUpdate);
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating context:', error);
    res.status(500).json({ error: 'Failed to update context' });
  }
});

/**
 * Clear conversation context
 * DELETE /api/inventory-chat/conversations/:id/context
 */
router.delete('/conversations/:id/context', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await ConversationService.clearContext(id, req.user.id);
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error clearing context:', error);
    res.status(500).json({ error: 'Failed to clear context' });
  }
});

export default router;

