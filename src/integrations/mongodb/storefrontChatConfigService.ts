import { getDatabase } from './client';
import {
  StorefrontChatConfig,
  StorefrontChatConfigInsert,
  StorefrontChatConfigUpdate,
  COLLECTIONS
} from './schemas';

/**
 * Storefront Chat Config Service
 * 
 * Manages the storefront_chat_config collection for AI chat widget configuration
 * per publication.
 */
class StorefrontChatConfigService {
  private get collection() {
    return getDatabase().collection<StorefrontChatConfig>(COLLECTIONS.STOREFRONT_CHAT_CONFIG);
  }

  /**
   * Get chat config by publicationId
   */
  async getByPublicationId(publicationId: string): Promise<StorefrontChatConfig | null> {
    try {
      return await this.collection.findOne({ publicationId });
    } catch (error) {
      console.error('Error fetching storefront chat config:', error);
      throw error;
    }
  }

  /**
   * Get all chat configs
   */
  async getAll(): Promise<StorefrontChatConfig[]> {
    try {
      return await this.collection.find({}).sort({ updatedAt: -1 }).toArray();
    } catch (error) {
      console.error('Error fetching all storefront chat configs:', error);
      throw error;
    }
  }

  /**
   * Create a new chat config
   */
  async create(configData: StorefrontChatConfigInsert): Promise<StorefrontChatConfig> {
    try {
      const now = new Date();
      
      // Check if config already exists for this publication
      const existing = await this.getByPublicationId(configData.publicationId);
      if (existing) {
        throw new Error(`Chat config already exists for publicationId: ${configData.publicationId}`);
      }

      const newConfig: StorefrontChatConfig = {
        ...configData,
        placeholders: configData.placeholders || {},
        publicationContext: configData.publicationContext || {},
        prependInstructions: configData.prependInstructions || '',
        appendInstructions: configData.appendInstructions || '',
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newConfig);
      return { ...newConfig, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating storefront chat config:', error);
      throw error;
    }
  }

  /**
   * Update an existing chat config by publicationId
   */
  async update(publicationId: string, updates: Partial<StorefrontChatConfigUpdate>): Promise<StorefrontChatConfig | null> {
    try {
      const updateData: StorefrontChatConfigUpdate = {
        ...updates,
        updatedAt: new Date()
      };

      await this.collection.updateOne(
        { publicationId },
        { $set: updateData }
      );

      return await this.getByPublicationId(publicationId);
    } catch (error) {
      console.error('Error updating storefront chat config:', error);
      throw error;
    }
  }

  /**
   * Create or update (upsert) a chat config
   */
  async upsert(publicationId: string, configData: Partial<StorefrontChatConfigInsert>): Promise<StorefrontChatConfig> {
    try {
      const existing = await this.getByPublicationId(publicationId);

      if (existing) {
        const updated = await this.update(publicationId, configData);
        if (!updated) {
          throw new Error('Failed to update chat config');
        }
        return updated;
      } else {
        return await this.create({
          publicationId,
          placeholders: configData.placeholders || {},
          publicationContext: configData.publicationContext || {},
          prependInstructions: configData.prependInstructions || '',
          appendInstructions: configData.appendInstructions || ''
        });
      }
    } catch (error) {
      console.error('Error upserting storefront chat config:', error);
      throw error;
    }
  }

  /**
   * Delete a chat config by publicationId
   */
  async delete(publicationId: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ publicationId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting storefront chat config:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const storefrontChatConfigService = new StorefrontChatConfigService();
