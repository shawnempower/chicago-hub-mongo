/**
 * Notification Service
 * 
 * Handles creating, reading, and managing in-app notifications
 */

import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';
import {
  NotificationDocument,
  NotificationInsert,
  NotificationUpdate,
  NotificationFilters,
  NotificationCounts,
  NotificationType
} from '../integrations/mongodb/notificationSchema';

class NotificationService {
  private get collection() {
    return getDatabase().collection<NotificationDocument>(COLLECTIONS.NOTIFICATIONS);
  }

  /**
   * Create a new notification
   */
  async create(notification: NotificationInsert): Promise<NotificationDocument> {
    const doc: NotificationDocument = {
      ...notification,
      read: notification.read ?? false,
      createdAt: new Date()
    };

    const result = await this.collection.insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  /**
   * Create multiple notifications (e.g., for all users with hub access)
   */
  async createMany(notifications: NotificationInsert[]): Promise<number> {
    if (notifications.length === 0) return 0;

    const docs = notifications.map(n => ({
      ...n,
      read: n.read ?? false,
      createdAt: new Date()
    }));

    const result = await this.collection.insertMany(docs as any[]);
    return result.insertedCount;
  }

  /**
   * Get notifications for a user
   */
  async list(filters: NotificationFilters): Promise<NotificationDocument[]> {
    const query: any = { userId: filters.userId };

    if (filters.read !== undefined) {
      query.read = filters.read;
    }
    if (filters.type) {
      query.type = Array.isArray(filters.type) ? { $in: filters.type } : filters.type;
    }
    if (filters.hubId) {
      query.hubId = filters.hubId;
    }
    if (filters.publicationId) {
      query.publicationId = filters.publicationId;
    }
    if (filters.campaignId) {
      query.campaignId = filters.campaignId;
    }

    const cursor = this.collection
      .find(query)
      .sort({ createdAt: -1 });

    if (filters.skip) cursor.skip(filters.skip);
    if (filters.limit) cursor.limit(filters.limit);

    return await cursor.toArray();
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.collection.countDocuments({
      userId,
      read: false
    });
  }

  /**
   * Get unread counts grouped by type
   */
  async getUnreadCounts(userId: string): Promise<NotificationCounts> {
    const pipeline = [
      { $match: { userId, read: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    
    const byType: Partial<Record<NotificationType, number>> = {};
    let total = 0;

    results.forEach((r: any) => {
      byType[r._id as NotificationType] = r.count;
      total += r.count;
    });

    return { total, byType };
  }

  /**
   * Mark a notification as read
   */
  async markRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { 
        _id: new ObjectId(notificationId),
        userId 
      },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllRead(userId: string, filters?: { type?: NotificationType; campaignId?: string }): Promise<number> {
    const query: any = { userId, read: false };
    
    if (filters?.type) query.type = filters.type;
    if (filters?.campaignId) query.campaignId = filters.campaignId;

    const result = await this.collection.updateMany(
      query,
      { 
        $set: { 
          read: true,
          readAt: new Date()
        } 
      }
    );
    return result.modifiedCount;
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: new ObjectId(notificationId),
      userId
    });
    return result.deletedCount > 0;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<number> {
    const result = await this.collection.deleteMany({ userId });
    return result.deletedCount;
  }

  /**
   * Delete expired notifications (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.collection.deleteMany({
      expiresAt: { $lte: new Date() }
    });
    return result.deletedCount;
  }

  /**
   * Check if a similar notification exists recently (to prevent duplicates)
   */
  async existsRecent(
    userId: string, 
    groupKey: string, 
    withinMinutes: number = 5
  ): Promise<boolean> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    
    const count = await this.collection.countDocuments({
      userId,
      groupKey,
      createdAt: { $gte: cutoff }
    });

    return count > 0;
  }

  /**
   * Get notification by ID
   */
  async getById(notificationId: string): Promise<NotificationDocument | null> {
    return await this.collection.findOne({
      _id: new ObjectId(notificationId)
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export helper functions for creating specific notification types
export async function notifyOrderReceived(params: {
  userId: string;
  publicationId: number;
  publicationName: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    publicationId: params.publicationId,
    type: 'order_received',
    title: 'New Order Received',
    message: `You have a new insertion order for "${params.campaignName}"`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/dashboard?tab=order-detail&campaignId=${params.campaignId}&publicationId=${params.publicationId}`,
    groupKey: `order_received:${params.orderId}`
  });
}

export async function notifyAssetsReady(params: {
  userId: string;
  publicationId: number;
  campaignId: string;
  campaignName: string;
  orderId: string;
  assetCount: number;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    publicationId: params.publicationId,
    type: 'assets_ready',
    title: 'Creative Assets Ready',
    message: `${params.assetCount} creative asset${params.assetCount !== 1 ? 's' : ''} are ready for "${params.campaignName}"`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/dashboard?tab=order-detail&campaignId=${params.campaignId}&publicationId=${params.publicationId}`,
    groupKey: `assets_ready:${params.orderId}`
  });
}

export async function notifyMessageReceived(params: {
  userId: string;
  senderName: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
  publicationId?: number;
  hubId?: string;
  messagePreview?: string;
}): Promise<void> {
  // Check for recent duplicate to avoid spam
  const groupKey = `message:${params.orderId}:${params.userId}`;
  const exists = await notificationService.existsRecent(params.userId, groupKey, 2);
  if (exists) return;

  await notificationService.create({
    userId: params.userId,
    publicationId: params.publicationId,
    hubId: params.hubId,
    type: 'message_received',
    title: 'New Message',
    message: `${params.senderName} sent a message on "${params.campaignName}"${params.messagePreview ? `: "${params.messagePreview.slice(0, 50)}${params.messagePreview.length > 50 ? '...' : ''}"` : ''}`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: params.publicationId 
      ? `/dashboard?tab=order-detail&campaignId=${params.campaignId}&publicationId=${params.publicationId}`
      : `/hubcentral?tab=orders&orderId=${params.orderId}`,
    groupKey
  });
}

export async function notifyOrderConfirmed(params: {
  userId: string;
  hubId: string;
  publicationName: string;
  publicationId: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    hubId: params.hubId,
    type: 'order_confirmed',
    title: 'Order Confirmed',
    message: `${params.publicationName} confirmed their order for "${params.campaignName}"`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/campaigns/${params.campaignId}?tab=orders&publication=${params.publicationId}`,
    groupKey: `order_confirmed:${params.orderId}`
  });
}

export async function notifyPlacementRejected(params: {
  userId: string;
  hubId: string;
  publicationName: string;
  publicationId: string;
  placementName: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
  reason?: string;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    hubId: params.hubId,
    type: 'placement_rejected',
    title: 'Placement Rejected',
    message: `${params.publicationName} rejected "${params.placementName}" for "${params.campaignName}"${params.reason ? `: ${params.reason}` : ''}`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/campaigns/${params.campaignId}?tab=orders&publication=${params.publicationId}`,
    groupKey: `placement_rejected:${params.orderId}:${params.placementName}`
  });
}

export async function notifyAssetUpdated(params: {
  userId: string;
  publicationId: number;
  campaignId: string;
  campaignName: string;
  orderId: string;
  assetName: string;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    publicationId: params.publicationId,
    type: 'asset_updated',
    title: 'Asset Updated',
    message: `The "${params.assetName}" asset was updated for "${params.campaignName}"`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/dashboard?tab=order-detail&campaignId=${params.campaignId}&publicationId=${params.publicationId}`,
    groupKey: `asset_updated:${params.orderId}:${params.assetName}`
  });
}

export async function notifyPlacementAccepted(params: {
  userId: string;
  hubId: string;
  publicationName: string;
  publicationId: string;
  placementName: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    hubId: params.hubId,
    type: 'placement_accepted',
    title: 'Placement Accepted',
    message: `${params.publicationName} accepted "${params.placementName}" for "${params.campaignName}"`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/campaigns/${params.campaignId}?tab=orders&publication=${params.publicationId}`,
    groupKey: `placement_accepted:${params.orderId}:${params.placementName}`
  });
}

export async function notifyPlacementDelivered(params: {
  userId: string;
  hubId: string;
  publicationName: string;
  publicationId: string;
  placementName: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
}): Promise<void> {
  await notificationService.create({
    userId: params.userId,
    hubId: params.hubId,
    type: 'placement_delivered',
    title: 'Placement Delivered',
    message: `${params.publicationName} marked "${params.placementName}" as delivered for "${params.campaignName}"`,
    campaignId: params.campaignId,
    orderId: params.orderId,
    link: `/campaigns/${params.campaignId}?tab=orders&publication=${params.publicationId}`,
    groupKey: `placement_delivered:${params.orderId}:${params.placementName}`
  });
}
