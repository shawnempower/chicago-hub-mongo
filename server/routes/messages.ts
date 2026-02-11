/**
 * Messaging Routes
 * 
 * API endpoints for the unified messaging system.
 * Supports direct conversations, order-linked threads, and broadcasts.
 */

import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { authenticateToken } from '../middleware/authenticate';
import { messagingService } from '../services/messagingService';
import { notificationService } from '../../src/services/notificationService';
import { emailService } from '../emailService';
import { getS3Service } from '../s3Service';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';
import {
  ConversationParticipant,
  DeliveryChannel,
  SenderType,
  MessageAttachment,
} from '../../src/integrations/mongodb/messagingSchema';

// Configure multer for message attachment uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/html', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed for message attachments`));
    }
  },
});

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ===== Helper: Determine user type from permissions =====
async function getUserType(user: any): Promise<SenderType> {
  const db = getDatabase();
  const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).findOne({ userId: user.id });
  if (permissions?.role === 'admin' || permissions?.role === 'hub_user') {
    return 'hub';
  }
  return 'publication';
}

// ===== Helper: Build sender name =====
function getSenderName(user: any): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  return user.email?.split('@')[0] || 'Unknown';
}

// ===== Helper: Get publication users for a publication =====
async function getPublicationParticipants(publicationId: number): Promise<ConversationParticipant[]> {
  const db = getDatabase();
  
  // Get users with access to this publication
  const accessRecords = await db.collection(COLLECTIONS.USER_PUBLICATION_ACCESS).find({
    publicationId: String(publicationId),
  }).toArray();

  const participants: ConversationParticipant[] = [];
  
  for (const access of accessRecords) {
    const accessUserId = access.userId;
    const userQuery = ObjectId.isValid(accessUserId)
      ? { $or: [{ _id: new ObjectId(accessUserId) }, { _id: accessUserId }] }
      : { _id: accessUserId };
    const user = await db.collection(COLLECTIONS.USERS).findOne(userQuery as any);
    if (user) {
      participants.push({
        userId: String(accessUserId),
        userType: 'publication',
        publicationId,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        email: user.email,
      });
    }
  }

  // Also get the publication name
  const pub = await db.collection(COLLECTIONS.PUBLICATIONS).findOne({ publicationId });
  const pubName = pub?.basicInfo?.name || pub?.name || `Publication #${publicationId}`;
  
  participants.forEach(p => { p.publicationName = pubName; });
  
  return participants;
}

// ===== Helper: Get hub user participants for a hub =====
async function getHubParticipants(hubId: string): Promise<ConversationParticipant[]> {
  const db = getDatabase();
  
  // Find hub_user role users with explicit access to this hub
  // Admins are NOT auto-included — they join conversations only when explicitly messaged
  const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
    'hubAccess.hubId': hubId,
    role: 'hub_user',
  }).toArray();

  const participants: ConversationParticipant[] = [];
  
  for (const perm of hubPermissions) {
    // userId in permissions is stored as string; users._id may be ObjectId or string
    const userQuery = ObjectId.isValid(perm.userId)
      ? { $or: [{ _id: new ObjectId(perm.userId) }, { _id: perm.userId }] }
      : { _id: perm.userId };
    const user = await db.collection(COLLECTIONS.USERS).findOne(userQuery as any);
    if (user) {
      participants.push({
        userId: perm.userId,
        userType: 'hub',
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        email: user.email,
      });
    }
  }

  return participants;
}

// ==========================================================
// POST /upload
// Upload a file attachment for a message (returns S3 URL)
// ==========================================================
router.post('/upload', upload.single('file'), async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const s3 = getS3Service();
    if (!s3) {
      return res.status(503).json({ error: 'File storage service is not available' });
    }

    const userId = req.user.id;
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const key = `users/${userId}/message-attachments/${timestamp}_${randomStr}_${baseName}${ext}`;

    const result = await s3.uploadFileWithCustomKey(
      key,
      file.buffer,
      file.mimetype,
      {
        originalName: file.originalname,
        userId,
        folder: 'message-attachments',
        uploadedAt: new Date().toISOString(),
      },
      true, // public
    );

    if (!result.success || !result.url) {
      return res.status(500).json({ error: result.error || 'Upload failed' });
    }

    const attachment: MessageAttachment = {
      fileName: file.originalname,
      fileUrl: result.url,
      fileType: file.mimetype,
      fileSize: file.size,
    };

    res.json(attachment);
  } catch (error: any) {
    console.error('Error uploading message attachment:', error);
    if (error.message?.includes('not allowed')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ==========================================================
// GET /conversations
// List conversations for current user (paginated)
// ==========================================================
router.get('/conversations', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { type, hubId, limit = '20', skip = '0', search, status } = req.query;

    const conversations = await messagingService.getConversationsForUser({
      userId,
      type: type as any,
      hubId: hubId as string,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
      search: search as string,
      status: (status as any) || 'active',
    });

    // Resolve hub names for conversations that don't have one
    const db = getDatabase();
    const hubIds = [...new Set(conversations.map(c => c.hubId).filter(Boolean))];
    const hubs = hubIds.length > 0
      ? await db.collection(COLLECTIONS.HUBS).find(
          { hubId: { $in: hubIds } },
          { projection: { hubId: 1, name: 1, hubName: 1, 'basicInfo.name': 1 } }
        ).toArray()
      : [];
    const hubNameMap = new Map<string, string>();
    hubs.forEach((h: any) => hubNameMap.set(h.hubId, h.basicInfo?.name || h.name || h.hubName || h.hubId));

    // Strip full messages array from list view for performance
    const list = conversations.map(conv => ({
      ...conv,
      messages: undefined,
      messageCount: conv.messages?.length || 0,
      hubName: (conv as any).hubName || hubNameMap.get(conv.hubId) || undefined,
    }));

    res.json({ conversations: list });
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// ==========================================================
// GET /admin-users
// List admin users (for hub users to message admins)
// ==========================================================
router.get('/admin-users', async (req: any, res: Response) => {
  try {
    const db = getDatabase();

    // Find users with admin role
    const adminPerms = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
      role: 'admin',
    }).toArray();

    const adminUsers: { id: string; name: string; email: string }[] = [];
    for (const perm of adminPerms) {
      const uid = perm.userId;
      const userQuery = ObjectId.isValid(uid)
        ? { $or: [{ _id: new ObjectId(uid) }, { _id: uid }] }
        : { _id: uid };
      const user = await db.collection(COLLECTIONS.USERS).findOne(userQuery as any);
      if (user) {
        adminUsers.push({
          id: uid,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
          email: user.email,
        });
      }
    }

    res.json({ users: adminUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// ==========================================================
// POST /conversations
// Create a new direct conversation
// ==========================================================
router.post('/conversations', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const userType = await getUserType(req.user);
    const senderName = getSenderName(req.user);
    const {
      hubId,
      subject,
      recipientPublicationId,
      recipientUserId,           // Direct message to a specific user (e.g. admin)
      initialMessage,
      deliveryChannel = 'in_app',
      attachments,               // Attachments for the initial message
    } = req.body;

    if (!hubId) {
      return res.status(400).json({ error: 'hubId is required' });
    }

    // Build participants
    const participants: ConversationParticipant[] = [];

    // Add sender
    participants.push({
      userId,
      userType,
      name: senderName,
      email: req.user.email,
    });

    if (recipientUserId) {
      // Direct message to a specific user (hub user messaging an admin, etc.)
      const db = getDatabase();
      const recipientQuery = ObjectId.isValid(recipientUserId)
        ? { $or: [{ _id: new ObjectId(recipientUserId) }, { _id: recipientUserId }] }
        : { _id: recipientUserId };
      const recipientUser = await db.collection(COLLECTIONS.USERS).findOne(recipientQuery as any);
      if (recipientUser) {
        const recipientPerms = await db.collection(COLLECTIONS.USER_PERMISSIONS).findOne({ userId: recipientUserId });
        const recipientType: SenderType = (recipientPerms?.role === 'admin' || recipientPerms?.role === 'hub_user') ? 'hub' : 'publication';
        participants.push({
          userId: recipientUserId,
          userType: recipientType,
          name: recipientUser.firstName ? `${recipientUser.firstName} ${recipientUser.lastName || ''}`.trim() : recipientUser.email,
          email: recipientUser.email,
        });
      }
    } else if (userType === 'hub' && recipientPublicationId) {
      // Hub sending to a publication
      const pubParticipants = await getPublicationParticipants(recipientPublicationId);
      if (pubParticipants.length === 0) {
        return res.status(400).json({ error: 'No users are registered for this publication yet. A publication user must be added before you can message them.' });
      }
      participants.push(...pubParticipants);
    } else if (userType === 'publication') {
      // Publication sending to the hub — enrich sender with publication info
      const db = getDatabase();
      const pubAccess = await db.collection(COLLECTIONS.USER_PUBLICATION_ACCESS).findOne({ userId });
      const pubId = pubAccess?.publicationId
        ? parseInt(String(pubAccess.publicationId))
        : undefined;

      if (pubId) {
        const pub = await db.collection(COLLECTIONS.PUBLICATIONS).findOne({ publicationId: pubId });
        // Update the sender participant with publication info
        participants[0].publicationId = pubId;
        participants[0].publicationName = pub?.basicInfo?.publicationName || pub?.basicInfo?.name || pub?.name || `Publication #${pubId}`;
      }

      const hubParticipants = await getHubParticipants(hubId);
      participants.push(...hubParticipants);
    }

    if (participants.length < 2) {
      return res.status(400).json({ error: 'Could not find recipient(s) for this conversation' });
    }

    const conversation = await messagingService.createConversation(
      {
        type: 'direct',
        hubId,
        subject,
        participants,
        status: 'active',
        createdBy: userId,
      },
      initialMessage ? {
        content: initialMessage,
        sender: userType,
        senderName,
        senderId: userId,
        deliveryChannel: deliveryChannel as DeliveryChannel,
        attachments: attachments as MessageAttachment[] | undefined,
      } : undefined
    );

    // Send email if requested and message provided
    if (initialMessage && (deliveryChannel === 'email' || deliveryChannel === 'both')) {
      await sendEmailForMessage(conversation, initialMessage, senderName, hubId, String(conversation._id));
    }

    // Create in-app notifications for recipients
    if (initialMessage) {
      await notifyRecipients(conversation, userId, senderName, initialMessage);
    }

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// ==========================================================
// POST /conversations/broadcast
// Create a broadcast to multiple publications (hub only)
// ==========================================================
router.post('/conversations/broadcast', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const userType = await getUserType(req.user);
    const senderName = getSenderName(req.user);

    if (userType !== 'hub') {
      return res.status(403).json({ error: 'Only hub users can create broadcasts' });
    }

    const { hubId, subject, publicationIds, message, deliveryChannel = 'in_app' } = req.body;

    if (!hubId || !subject || !message) {
      return res.status(400).json({ error: 'hubId, subject, and message are required' });
    }

    let targetPubIds: number[] = publicationIds || [];

    // If no specific publications, get all publications in the hub
    if (targetPubIds.length === 0) {
      const db = getDatabase();
      const pubs = await db.collection(COLLECTIONS.PUBLICATIONS).find(
        { hubIds: hubId },
        { projection: { publicationId: 1 } }
      ).toArray();
      targetPubIds = pubs.map((p: any) => p.publicationId).filter(Boolean);
    }

    if (targetPubIds.length === 0) {
      return res.status(400).json({ error: 'No publications found for this hub' });
    }

    // Build publication participants for each target
    const pubParticipantsByPub: Map<number, ConversationParticipant[]> = new Map();
    for (const pubId of targetPubIds) {
      const participants = await getPublicationParticipants(pubId);
      if (participants.length > 0) {
        pubParticipantsByPub.set(pubId, participants);
      }
    }

    // Build sender participant
    const senderParticipant: ConversationParticipant = {
      userId,
      userType: 'hub',
      name: senderName,
      email: req.user.email,
    };

    // Fan out: one conversation per publication
    const allPubParticipants = Array.from(pubParticipantsByPub.values()).map(participants => participants[0]);
    
    const conversations = await messagingService.createBroadcast(
      hubId,
      subject,
      senderParticipant,
      allPubParticipants,
      {
        content: message,
        sender: 'hub',
        senderName,
        senderId: userId,
        deliveryChannel: deliveryChannel as DeliveryChannel,
      }
    );

    // Send emails if requested
    if (deliveryChannel === 'email' || deliveryChannel === 'both') {
      for (const conv of conversations) {
        await sendEmailForMessage(conv, message, senderName, hubId, String(conv._id));
      }
    }

    // Create in-app notifications
    for (const conv of conversations) {
      await notifyRecipients(conv, userId, senderName, message);
    }

    res.status(201).json({
      broadcastId: conversations[0]?.broadcastId,
      conversationCount: conversations.length,
      conversations: conversations.map(c => ({
        _id: c._id,
        publicationName: c.participants.find(p => p.userType === 'publication')?.publicationName,
      })),
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
});

// ==========================================================
// GET /conversations/by-order/:campaignId/:publicationId
// Get or create conversation for an order
// ==========================================================
router.get('/conversations/by-order/:campaignId/:publicationId', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const pubId = parseInt(publicationId);

    // Look up order to get hubId
    const db = getDatabase();
    const order = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS).findOne({
      campaignId,
      publicationId: pubId,
    });

    const hubId = order?.hubId || req.query.hubId;
    if (!hubId) {
      return res.status(400).json({ error: 'Could not determine hubId for this order' });
    }

    const userType = await getUserType(req.user);
    const senderName = getSenderName(req.user);

    // Build participants for auto-create
    const hubParticipants = await getHubParticipants(hubId);
    const pubParticipants = await getPublicationParticipants(pubId);
    const allParticipants = [...hubParticipants, ...pubParticipants];

    const conversation = await messagingService.getConversationForOrder(
      campaignId,
      pubId,
      {
        hubId,
        participants: allParticipants,
        createdBy: userId,
      }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Could not find or create conversation for this order' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error getting order conversation:', error);
    res.status(500).json({ error: 'Failed to get order conversation' });
  }
});

// ==========================================================
// GET /conversations/:id
// Get a single conversation with all messages
// ==========================================================
router.get('/conversations/:id', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Verify user is a participant
    const isParticipant = await messagingService.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const conversation = await messagingService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Auto-mark as read when viewing
    await messagingService.markAsRead(conversationId, userId);

    res.json({ conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// ==========================================================
// POST /conversations/:id/messages
// Send a message in a conversation
// ==========================================================
router.post('/conversations/:id/messages', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const userType = await getUserType(req.user);
    const senderName = getSenderName(req.user);

    // Verify participation
    const isParticipant = await messagingService.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const { content, deliveryChannel = 'in_app', attachments } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Only hub users can send email
    const effectiveChannel: DeliveryChannel = userType === 'hub' ? deliveryChannel : 'in_app';

    const result = await messagingService.addMessage(conversationId, {
      content: content.trim(),
      sender: userType,
      senderName,
      senderId: userId,
      deliveryChannel: effectiveChannel,
      attachments,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Send email if requested
    if (effectiveChannel === 'email' || effectiveChannel === 'both') {
      const conversation = await messagingService.getConversation(conversationId);
      if (conversation) {
        await sendEmailForMessage(conversation, content.trim(), senderName, conversation.hubId, conversationId);
        // Update email status
        if (result.message) {
          await messagingService.updateEmailStatus(conversationId, result.message.id, {
            sentAt: new Date(),
          });
        }
      }
    }

    // Create in-app notifications
    const conversation = await messagingService.getConversation(conversationId);
    if (conversation) {
      await notifyRecipients(conversation, userId, senderName, content.trim());
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ==========================================================
// POST /conversations/:id/notes
// Add a pinned note to a conversation
// ==========================================================
router.post('/conversations/:id/notes', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const userType = await getUserType(req.user);
    const senderName = getSenderName(req.user);

    const isParticipant = await messagingService.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const result = await messagingService.addPinnedNote(
      conversationId,
      content.trim(),
      userType,
      senderName,
      userId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error adding pinned note:', error);
    res.status(500).json({ error: 'Failed to add pinned note' });
  }
});

// ==========================================================
// PUT /conversations/:id/read
// Mark conversation as read
// ==========================================================
router.put('/conversations/:id/read', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    await messagingService.markAsRead(conversationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ==========================================================
// GET /unread-count
// Get total unread conversation count
// ==========================================================
router.get('/unread-count', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const hubId = req.query.hubId as string;

    const count = await messagingService.getUnreadCount(userId, hubId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ==========================================================
// GET /order-message-stats
// Batch message stats for order list views
// ==========================================================
router.get('/order-message-stats', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const orderKeysParam = req.query.orderKeys as string;

    if (!orderKeysParam) {
      return res.json({ stats: [] });
    }

    // Parse orderKeys: "campaignId:publicationId,campaignId:publicationId,..."
    const orderKeys = orderKeysParam.split(',').map((key: string) => {
      const [campaignId, publicationId] = key.split(':');
      return { campaignId, publicationId: parseInt(publicationId) };
    }).filter(k => k.campaignId && !isNaN(k.publicationId));

    const stats = await messagingService.getMessageStatsForOrders(orderKeys, userId);
    res.json({ stats });
  } catch (error) {
    console.error('Error getting order message stats:', error);
    res.status(500).json({ error: 'Failed to get order message stats' });
  }
});

// ==========================================================
// PUT /conversations/:id/archive
// Archive a conversation
// ==========================================================
router.put('/conversations/:id/archive', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const isParticipant = await messagingService.isParticipant(conversationId, userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    await messagingService.archiveConversation(conversationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

// ===== Email Delivery Helper =====
async function sendEmailForMessage(
  conversation: any,
  messageContent: string,
  senderName: string,
  hubId: string,
  conversationId: string
): Promise<void> {
  if (!emailService) return;

  try {
    const db = getDatabase();
    const hub = await db.collection(COLLECTIONS.HUBS).findOne({ hubId });
    const hubName = hub?.basicInfo?.name;

    // Find recipients (participants who are NOT the sender)
    const recipients = conversation.participants.filter(
      (p: ConversationParticipant) => p.email && p.userId !== conversation.createdBy
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const conversationType = conversation.type;

    for (const recipient of recipients) {
      const conversationUrl = recipient.userType === 'hub'
        ? `${baseUrl}/hubcentral?tab=messages&conversationId=${conversationId}`
        : `${baseUrl}/dashboard?tab=messages&conversationId=${conversationId}`;

      if (conversationType === 'broadcast') {
        await emailService.sendBroadcastEmail?.({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          senderName,
          broadcastSubject: conversation.subject || 'Broadcast Message',
          messageContent,
          conversationUrl,
          hubName,
        });
      } else {
        await emailService.sendConversationEmail?.({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          senderName,
          subject: conversation.subject || 'New Message',
          messageContent,
          conversationUrl,
          hubName,
        });
      }
    }
  } catch (error) {
    console.error('Error sending email for message:', error);
  }
}

// ===== In-App Notification Helper =====
async function notifyRecipients(
  conversation: any,
  senderUserId: string,
  senderName: string,
  messageContent: string
): Promise<void> {
  try {
    const recipients = conversation.participants.filter(
      (p: ConversationParticipant) => p.userId !== senderUserId
    );

    const convId = String(conversation._id);
    const notificationType = conversation.type === 'broadcast' ? 'broadcast_message' : 'direct_message';

    for (const recipient of recipients) {
      // Dedup: check if a similar notification was sent recently
      const groupKey = `${notificationType}:${convId}`;
      const exists = await notificationService.existsRecent(recipient.userId, groupKey, 2);
      if (exists) continue;

      const link = recipient.userType === 'hub'
        ? `/hubcentral?tab=messages&conversationId=${convId}`
        : `/dashboard?tab=messages&conversationId=${convId}`;

      await notificationService.create({
        userId: recipient.userId,
        hubId: conversation.hubId,
        publicationId: recipient.publicationId,
        type: notificationType as any,
        title: conversation.type === 'broadcast'
          ? `Broadcast: ${conversation.subject || 'New broadcast'}`
          : `Message from ${senderName}`,
        message: messageContent.slice(0, 150),
        conversationId: convId,
        link,
        groupKey,
      });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

export default router;
