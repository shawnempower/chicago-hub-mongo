import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { getDatabase } from './client';
import { 
  StorefrontConfiguration, 
  StorefrontConfigurationInsert, 
  StorefrontConfigurationUpdate,
  COLLECTIONS 
} from './schemas';

let db: Db | null = null;

const getStorefrontCollection = async (): Promise<Collection<StorefrontConfiguration>> => {
  if (!db) {
    db = await getDatabase();
  }
  return db.collection<StorefrontConfiguration>(COLLECTIONS.STOREFRONT_CONFIGURATIONS);
};

// Create a new storefront configuration
export const createStorefrontConfiguration = async (config: StorefrontConfigurationInsert): Promise<StorefrontConfiguration> => {
  try {
    const collection = await getStorefrontCollection();
    
    // Check if configuration already exists for this publication
    const existingConfig = await collection.findOne({ publicationId: config.publicationId });
    if (existingConfig) {
      throw new Error(`Storefront configuration already exists for publication ${config.publicationId}`);
    }

    const now = new Date();
    const configWithTimestamps: StorefrontConfiguration = {
      ...config,
      isActive: config.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(configWithTimestamps);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create storefront configuration');
    }

    const createdConfig = await collection.findOne({ _id: result.insertedId });
    if (!createdConfig) {
      throw new Error('Failed to retrieve created storefront configuration');
    }

    return createdConfig;
  } catch (error) {
    console.error('Error creating storefront configuration:', error);
    throw error;
  }
};

// Get storefront configuration by publication ID
export const getStorefrontConfigurationByPublicationId = async (publicationId: string): Promise<StorefrontConfiguration | null> => {
  try {
    const collection = await getStorefrontCollection();
    return await collection.findOne({ publicationId });
  } catch (error) {
    console.error('Error fetching storefront configuration:', error);
    throw new Error('Failed to fetch storefront configuration');
  }
};

// Get storefront configuration by ID
export const getStorefrontConfigurationById = async (id: string): Promise<StorefrontConfiguration | null> => {
  try {
    const collection = await getStorefrontCollection();
    return await collection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error('Error fetching storefront configuration by ID:', error);
    throw new Error('Failed to fetch storefront configuration');
  }
};

// Get all storefront configurations with optional filtering
export const getStorefrontConfigurations = async (filters: {
  isDraft?: boolean;
  publisherId?: string;
  isActive?: boolean;
  publicationId?: string;
} = {}): Promise<StorefrontConfiguration[]> => {
  try {
    const collection = await getStorefrontCollection();
    
    const query: any = {};
    
    if (filters.isDraft !== undefined) {
      query['meta.isDraft'] = filters.isDraft;
    }
    
    if (filters.publisherId) {
      query['meta.publisherId'] = filters.publisherId;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.publicationId) {
      query.publicationId = filters.publicationId;
    }

    return await collection
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
  } catch (error) {
    console.error('Error fetching storefront configurations:', error);
    throw new Error('Failed to fetch storefront configurations');
  }
};

// Update storefront configuration
export const updateStorefrontConfiguration = async (
  publicationId: string, 
  updates: Partial<StorefrontConfigurationInsert>
): Promise<StorefrontConfiguration | null> => {
  try {
    const collection = await getStorefrontCollection();
    
    const updateData: StorefrontConfigurationUpdate = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update meta.lastUpdated if meta is being updated
    if (updates.meta) {
      updateData.meta = {
        ...updates.meta,
        lastUpdated: new Date().toISOString(),
      };
    }

    const result = await collection.findOneAndUpdate(
      { publicationId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('Error updating storefront configuration:', error);
    throw new Error('Failed to update storefront configuration');
  }
};

// Update storefront configuration by ID
export const updateStorefrontConfigurationById = async (
  id: string, 
  updates: Partial<StorefrontConfigurationInsert>
): Promise<StorefrontConfiguration | null> => {
  try {
    const collection = await getStorefrontCollection();
    
    const updateData: StorefrontConfigurationUpdate = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update meta.lastUpdated if meta is being updated
    if (updates.meta) {
      updateData.meta = {
        ...updates.meta,
        lastUpdated: new Date().toISOString(),
      };
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('Error updating storefront configuration by ID:', error);
    throw new Error('Failed to update storefront configuration');
  }
};

// Delete storefront configuration
export const deleteStorefrontConfiguration = async (publicationId: string): Promise<boolean> => {
  try {
    const collection = await getStorefrontCollection();
    
    const result = await collection.deleteOne({ publicationId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting storefront configuration:', error);
    throw new Error('Failed to delete storefront configuration');
  }
};

// Publish storefront configuration (set isDraft to false)
export const publishStorefrontConfiguration = async (publicationId: string): Promise<StorefrontConfiguration | null> => {
  try {
    const collection = await getStorefrontCollection();
    
    const result = await collection.findOneAndUpdate(
      { publicationId },
      { 
        $set: { 
          'meta.isDraft': false,
          'meta.lastUpdated': new Date().toISOString(),
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('Error publishing storefront configuration:', error);
    throw new Error('Failed to publish storefront configuration');
  }
};

// Duplicate storefront configuration for another publication
export const duplicateStorefrontConfiguration = async (
  sourcePublicationId: string, 
  targetPublicationId: string,
  targetPublisherId: string
): Promise<StorefrontConfiguration> => {
  try {
    const collection = await getStorefrontCollection();
    
    // Get the source configuration
    const sourceConfig = await collection.findOne({ publicationId: sourcePublicationId });
    if (!sourceConfig) {
      throw new Error(`Source storefront configuration not found for publication ${sourcePublicationId}`);
    }

    // Check if target already has a configuration
    const existingTarget = await collection.findOne({ publicationId: targetPublicationId });
    if (existingTarget) {
      throw new Error(`Storefront configuration already exists for target publication ${targetPublicationId}`);
    }

    // Create the duplicate configuration
    const duplicateConfig: StorefrontConfigurationInsert = {
      ...sourceConfig,
      publicationId: targetPublicationId,
      meta: {
        ...sourceConfig.meta,
        publisherId: targetPublisherId,
        description: `Duplicated from ${sourceConfig.meta.publisherId} - ${sourceConfig.meta.description}`,
        lastUpdated: new Date().toISOString(),
        isDraft: true, // Always create duplicates as drafts
      }
    };

    // Remove MongoDB-specific fields
    delete (duplicateConfig as any)._id;
    delete (duplicateConfig as any).createdAt;
    delete (duplicateConfig as any).updatedAt;

    return await createStorefrontConfiguration(duplicateConfig);
  } catch (error) {
    console.error('Error duplicating storefront configuration:', error);
    throw error;
  }
};

// Get storefront configurations by publisher ID
export const getStorefrontConfigurationsByPublisherId = async (publisherId: string): Promise<StorefrontConfiguration[]> => {
  try {
    const collection = await getStorefrontCollection();
    
    return await collection
      .find({ 'meta.publisherId': publisherId })
      .sort({ updatedAt: -1 })
      .toArray();
  } catch (error) {
    console.error('Error fetching storefront configurations by publisher ID:', error);
    throw new Error('Failed to fetch storefront configurations');
  }
};

// Bulk create storefront configurations
export const bulkCreateStorefrontConfigurations = async (configs: StorefrontConfigurationInsert[]): Promise<{
  inserted: StorefrontConfiguration[];
  errors: Array<{ config: StorefrontConfigurationInsert; error: string }>;
}> => {
  const results: StorefrontConfiguration[] = [];
  const errors: Array<{ config: StorefrontConfigurationInsert; error: string }> = [];

  for (const config of configs) {
    try {
      const created = await createStorefrontConfiguration(config);
      results.push(created);
    } catch (error) {
      errors.push({
        config,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    inserted: results,
    errors
  };
};

// Search storefront configurations
export const searchStorefrontConfigurations = async (searchTerm: string): Promise<StorefrontConfiguration[]> => {
  try {
    const collection = await getStorefrontCollection();
    
    const searchRegex = new RegExp(searchTerm, 'i');
    
    return await collection
      .find({
        $or: [
          { 'meta.publisherId': searchRegex },
          { 'meta.description': searchRegex },
          { 'components.hero.content.title': searchRegex },
          { 'components.hero.content.description': searchRegex },
          { 'seoMetadata.title': searchRegex },
          { 'seoMetadata.description': searchRegex }
        ]
      })
      .sort({ updatedAt: -1 })
      .toArray();
  } catch (error) {
    console.error('Error searching storefront configurations:', error);
    throw new Error('Failed to search storefront configurations');
  }
};

// Get active storefront configurations count
export const getActiveStorefrontConfigurationsCount = async (): Promise<number> => {
  try {
    const collection = await getStorefrontCollection();
    return await collection.countDocuments({ isActive: true });
  } catch (error) {
    console.error('Error counting active storefront configurations:', error);
    throw new Error('Failed to count storefront configurations');
  }
};

// Get draft storefront configurations count
export const getDraftStorefrontConfigurationsCount = async (): Promise<number> => {
  try {
    const collection = await getStorefrontCollection();
    return await collection.countDocuments({ 'meta.isDraft': true });
  } catch (error) {
    console.error('Error counting draft storefront configurations:', error);
    throw new Error('Failed to count draft storefront configurations');
  }
};
