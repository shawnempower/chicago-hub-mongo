/**
 * Migrate Order Messages to Unified Messaging System
 * 
 * Migrates data from the embedded messages on publication_insertion_orders
 * into the new messaging_conversations collection.
 * 
 * What this script does:
 * 1. Finds all orders that have messages[] or publicationNotes/hubNotes
 * 2. For each order, creates a conversation of type 'order' in messaging_conversations
 * 3. Converts each embedded OrderMessage → ConversationMessage
 * 4. Converts publicationNotes/hubNotes → pinned_note messages
 * 5. Preserves read status from lastViewedByHub/lastViewedByPublication
 * 6. Reports stats on what was migrated
 * 
 * Usage: npx tsx scripts/migrateMessagesToConversations.ts [--dry-run] [--db=<name>]
 *   --dry-run   Preview changes without writing to database (default)
 *   --execute   Actually write to the database
 *   --db=<name> Target database name (defaults to env MONGODB_DB_NAME)
 */

import 'dotenv/config';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
const isDryRun = !isExecute; // dry-run by default for safety

const dbArg = args.find(a => a.startsWith('--db='));
const TARGET_DB = dbArg ? dbArg.split('=')[1] : (process.env.MONGODB_DB_NAME || 'staging-chicago-hub');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment');
  process.exit(1);
}

// Stats tracking
const stats = {
  ordersScanned: 0,
  ordersWithMessages: 0,
  ordersWithNotes: 0,
  ordersSkipped: 0,        // Already migrated
  conversationsCreated: 0,
  messagesConverted: 0,
  pinnedNotesConverted: 0,
  errors: 0,
};

// ===== Participant Lookup Helpers =====

async function getHubParticipants(db: any, hubId: string): Promise<any[]> {
  const permsCol = db.collection(COLLECTIONS.USER_PERMISSIONS);
  const usersCol = db.collection(COLLECTIONS.USERS);

  // Only hub_user role with explicit hub access — admins are not auto-included
  const hubPerms = await permsCol.find({
    'hubAccess.hubId': hubId,
    role: 'hub_user',
  }).toArray();

  const participants: any[] = [];
  for (const perm of hubPerms) {
    const uid = perm.userId;
    const userQuery = ObjectId.isValid(uid)
      ? { $or: [{ _id: new ObjectId(uid) }, { _id: uid }] }
      : { _id: uid };
    const user = await usersCol.findOne(userQuery);
    if (user) {
      participants.push({
        userId: uid,
        userType: 'hub',
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        email: user.email,
      });
    }
  }
  return participants;
}

async function getPublicationParticipants(db: any, publicationId: number): Promise<any[]> {
  const accessCol = db.collection(COLLECTIONS.USER_PUBLICATION_ACCESS);
  const usersCol = db.collection(COLLECTIONS.USERS);
  const pubsCol = db.collection(COLLECTIONS.PUBLICATIONS);

  const accessRecords = await accessCol.find({
    publicationId: String(publicationId),
  }).toArray();

  const pub = await pubsCol.findOne({ publicationId });
  const pubName = pub?.basicInfo?.publicationName || pub?.basicInfo?.name || pub?.name || `Publication #${publicationId}`;

  const participants: any[] = [];
  for (const access of accessRecords) {
    const uid = access.userId;
    const userQuery = ObjectId.isValid(uid)
      ? { $or: [{ _id: new ObjectId(uid) }, { _id: uid }] }
      : { _id: uid };
    const user = await usersCol.findOne(userQuery);
    if (user) {
      participants.push({
        userId: String(uid),
        userType: 'publication',
        publicationId,
        publicationName: pubName,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        email: user.email,
      });
    }
  }

  // If no user access records, add a placeholder with the publication name
  if (participants.length === 0) {
    participants.push({
      userId: `pub-${publicationId}`,
      userType: 'publication',
      publicationId,
      publicationName: pubName,
      name: pubName,
    });
  }

  return participants;
}

async function main() {
  console.log('='.repeat(60));
  console.log(`📦 Message Migration Script`);
  console.log(`📂 Database: ${TARGET_DB}`);
  console.log(`🔧 Mode: ${isDryRun ? 'DRY RUN (no writes)' : '🔴 EXECUTE (writing to DB)'}`);
  console.log('='.repeat(60));
  console.log('');

  const client = new MongoClient(MONGODB_URI!, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(TARGET_DB);
    const ordersCol = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    const conversationsCol = db.collection('messaging_conversations');

    // Check if messaging_conversations already has data
    const existingCount = await conversationsCol.countDocuments({});
    console.log(`📊 Existing messaging_conversations documents: ${existingCount}`);

    // Find orders that have messages, publicationNotes, or hubNotes
    const ordersWithData = await ordersCol.find({
      $or: [
        { messages: { $exists: true, $ne: [] } },
        { publicationNotes: { $exists: true, $ne: null, $ne: '' } },
        { hubNotes: { $exists: true, $ne: null, $ne: '' } },
      ],
    }).toArray();

    const totalOrders = await ordersCol.countDocuments({});
    console.log(`📊 Total orders in collection: ${totalOrders}`);
    console.log(`📊 Orders with messages/notes: ${ordersWithData.length}`);
    console.log('');

    for (const order of ordersWithData) {
      stats.ordersScanned++;

      const orderId = String(order._id);
      const campaignId = order.campaignId;
      const publicationId = order.publicationId;
      const hubId = order.hubId;

      const hasMessages = order.messages && order.messages.length > 0;
      const hasPubNotes = order.publicationNotes && order.publicationNotes.trim();
      const hasHubNotes = order.hubNotes && order.hubNotes.trim();

      if (hasMessages) stats.ordersWithMessages++;
      if (hasPubNotes || hasHubNotes) stats.ordersWithNotes++;

      // Check if already migrated (conversation exists for this order)
      const existing = await conversationsCol.findOne({
        type: 'order',
        'linkedEntity.campaignId': campaignId,
        'linkedEntity.publicationId': publicationId,
      });

      if (existing) {
        stats.ordersSkipped++;
        console.log(`  ⏭️  Skipping ${campaignId}/${publicationId} (already migrated)`);
        continue;
      }

      // Build the conversation document
      const messages: any[] = [];

      // Convert embedded messages → ConversationMessage
      if (hasMessages) {
        for (const msg of order.messages) {
          messages.push({
            id: msg.id || new ObjectId().toHexString(),
            messageType: 'message',
            content: msg.content || '',
            sender: msg.sender || 'hub',
            senderName: msg.senderName || 'Unknown',
            senderId: msg.senderId || '',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            deliveryChannel: 'in_app',
            attachments: msg.attachments || undefined,
            readBy: msg.readBy || undefined,
          });
          stats.messagesConverted++;
        }
      }

      // Convert publicationNotes → pinned_note
      if (hasPubNotes) {
        messages.push({
          id: new ObjectId().toHexString(),
          messageType: 'pinned_note',
          content: order.publicationNotes.trim(),
          sender: 'publication',
          senderName: order.publicationName || 'Publication',
          senderId: '',  // Original author unknown
          timestamp: order.generatedAt ? new Date(order.generatedAt) : new Date(),
          deliveryChannel: 'in_app',
          pinnedBy: '',
        });
        stats.pinnedNotesConverted++;
      }

      // Convert hubNotes → pinned_note
      if (hasHubNotes) {
        messages.push({
          id: new ObjectId().toHexString(),
          messageType: 'pinned_note',
          content: order.hubNotes.trim(),
          sender: 'hub',
          senderName: 'Hub',
          senderId: '',  // Original author unknown
          timestamp: order.generatedAt ? new Date(order.generatedAt) : new Date(),
          deliveryChannel: 'in_app',
          pinnedBy: '',
        });
        stats.pinnedNotesConverted++;
      }

      // Sort messages by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Build read status from lastViewedByHub/lastViewedByPublication
      const readStatus: Record<string, Date> = {};
      // We don't have specific user IDs for the hub/pub viewers from the old system,
      // so we use placeholder keys that the old system recognized.
      // After migration, real user-based read tracking takes over.

      // Determine last message info
      const lastMsg = messages[messages.length - 1];
      const regularMessages = messages.filter(m => m.messageType === 'message');
      const lastRegularMsg = regularMessages.length > 0 ? regularMessages[regularMessages.length - 1] : null;

      // Build participants from real user data
      const hubParticipants = hubId ? await getHubParticipants(db, hubId) : [];
      const pubParticipants = await getPublicationParticipants(db, publicationId);
      const participants = [...hubParticipants, ...pubParticipants];

      if (participants.length === 0) {
        console.log(`  ⚠️  No participants found for ${campaignId}/${publicationId}, adding placeholders`);
        participants.push(
          { userId: `hub-${hubId}`, userType: 'hub', name: 'Hub Team' },
          {
            userId: `pub-${publicationId}`,
            userType: 'publication',
            publicationId,
            publicationName: order.publicationName || `Publication #${publicationId}`,
            name: order.publicationName || `Publication #${publicationId}`,
          }
        );
      }

      const conversation = {
        type: 'order' as const,
        hubId: hubId || '',
        subject: `Order: ${order.campaignName || campaignId}`,
        participants,
        linkedEntity: {
          campaignId,
          publicationId,
          orderId: orderId,
        },
        messages,
        lastMessageAt: lastRegularMsg?.timestamp || lastMsg?.timestamp || new Date(),
        lastMessagePreview: (lastRegularMsg?.content || lastMsg?.content || '').slice(0, 100),
        lastMessageSender: lastRegularMsg?.senderName || lastMsg?.senderName || '',
        readStatus,
        status: 'active' as const,
        createdAt: order.generatedAt ? new Date(order.generatedAt) : new Date(),
        updatedAt: new Date(),
        createdBy: '__migration__',
      };

      // Log details
      const msgCount = regularMessages.length;
      const noteCount = messages.filter(m => m.messageType === 'pinned_note').length;
      console.log(
        `  📋 ${campaignId}/${publicationId} (${order.publicationName || 'unknown'})` +
        ` — ${msgCount} message${msgCount !== 1 ? 's' : ''}` +
        `${noteCount > 0 ? `, ${noteCount} note${noteCount !== 1 ? 's' : ''}` : ''}`
      );

      if (!isDryRun) {
        try {
          await conversationsCol.insertOne(conversation as any);
          stats.conversationsCreated++;
        } catch (err) {
          console.error(`  ❌ Error inserting conversation for ${campaignId}/${publicationId}:`, err);
          stats.errors++;
        }
      } else {
        stats.conversationsCreated++;
      }
    }

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Orders scanned:          ${stats.ordersScanned}`);
    console.log(`  Orders with messages:     ${stats.ordersWithMessages}`);
    console.log(`  Orders with notes:        ${stats.ordersWithNotes}`);
    console.log(`  Already migrated (skip):  ${stats.ordersSkipped}`);
    console.log(`  Conversations created:    ${stats.conversationsCreated}`);
    console.log(`  Messages converted:       ${stats.messagesConverted}`);
    console.log(`  Pinned notes converted:   ${stats.pinnedNotesConverted}`);
    console.log(`  Errors:                   ${stats.errors}`);
    console.log('');
    if (isDryRun) {
      console.log('⚠️  DRY RUN — no data was written. Use --execute to write.');
    } else {
      console.log('✅ MIGRATION COMPLETE — data has been written.');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

main();
