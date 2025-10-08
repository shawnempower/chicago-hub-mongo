import { getDatabase } from './client';
import { ObjectId, Filter, UpdateFilter } from 'mongodb';
import {
  AdPackage,
  AdvertisingInventory,
  LeadInquiry,
  UserProfile,
  ConversationThread,
  AssistantConversation,
  BrandDocument,
  SavedOutlet,
  SavedPackage,
  UserInteraction,
  AssistantInstruction,
  AnalyticsEvent,
  MediaEntity,
  MediaEntityInsert,
  MediaEntityUpdate,
  Publication,
  PublicationInsert,
  PublicationUpdate,
  PublicationFile,
  PublicationFileInsert,
  PublicationFileUpdate,
  StorefrontConfiguration,
  StorefrontConfigurationInsert,
  StorefrontConfigurationUpdate,
  SurveySubmission,
  SurveySubmissionInsert,
  SurveySubmissionUpdate,
  COLLECTIONS
} from './schemas';

// ===== AD PACKAGES SERVICE =====
export class AdPackagesService {
  private collection = getDatabase().collection<AdPackage>(COLLECTIONS.AD_PACKAGES);

  async getAll(filters?: { isActive?: boolean; mediaOutletId?: string }): Promise<AdPackage[]> {
    try {
      const query: Filter<AdPackage> = {};
      if (filters?.isActive !== undefined) query.isActive = filters.isActive;
      if (filters?.mediaOutletId) query.mediaOutletId = filters.mediaOutletId;
      
      return await this.collection.find(query).sort({ legacyId: 1 }).toArray();
    } catch (error) {
      console.error('Error fetching ad packages:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<AdPackage | null> {
    try {
      return await this.collection.findOne({ 
        $or: [
          { _id: new ObjectId(id) },
          { legacyId: parseInt(id) }
        ]
      });
    } catch (error) {
      console.error('Error fetching ad package by ID:', error);
      throw error;
    }
  }

  async create(packageData: Omit<AdPackage, '_id' | 'createdAt' | 'updatedAt'>): Promise<AdPackage> {
    try {
      const now = new Date();
      const newPackage: AdPackage = {
        ...packageData,
        createdAt: now,
        updatedAt: now,
        isActive: packageData.isActive ?? true
      };

      const result = await this.collection.insertOne(newPackage);
      return { ...newPackage, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating ad package:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<AdPackage>): Promise<AdPackage | null> {
    try {
      const updateData = { ...updates, updatedAt: new Date() };
      await this.collection.updateOne(
        { 
          $or: [
            { _id: new ObjectId(id) },
            { legacyId: parseInt(id) }
          ]
        },
        { $set: updateData }
      );
      return await this.getById(id);
    } catch (error) {
      console.error('Error updating ad package:', error);
      throw error;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { 
          $or: [
            { _id: new ObjectId(id) },
            { legacyId: parseInt(id) }
          ]
        },
        { 
          $set: { 
            deletedAt: new Date(),
            isActive: false,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error soft deleting ad package:', error);
      throw error;
    }
  }
}

// ===== LEAD INQUIRIES SERVICE =====
export class LeadInquiriesService {
  private collection = getDatabase().collection<LeadInquiry>(COLLECTIONS.LEAD_INQUIRIES);

  async getAll(filters?: { status?: string; assignedTo?: string }): Promise<LeadInquiry[]> {
    try {
      const query: Filter<LeadInquiry> = {};
      if (filters?.status) query.status = filters.status as any;
      if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
      
      return await this.collection.find(query).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error fetching lead inquiries:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<LeadInquiry | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('Error fetching lead inquiry by ID:', error);
      throw error;
    }
  }

  async create(leadData: Omit<LeadInquiry, '_id' | 'createdAt' | 'updatedAt'>): Promise<LeadInquiry> {
    try {
      const now = new Date();
      const newLead: LeadInquiry = {
        ...leadData,
        status: leadData.status || 'new',
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newLead);
      return { ...newLead, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating lead inquiry:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<LeadInquiry>): Promise<LeadInquiry | null> {
    try {
      const updateData = { ...updates, updatedAt: new Date() };
      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      return await this.getById(id);
    } catch (error) {
      console.error('Error updating lead inquiry:', error);
      throw error;
    }
  }

  async getByUserId(userId: string): Promise<LeadInquiry[]> {
    try {
      return await this.collection.find({ userId }).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error fetching leads by user ID:', error);
      throw error;
    }
  }
}

// ===== USER PROFILES SERVICE =====
export class UserProfilesService {
  private collection = getDatabase().collection<UserProfile>(COLLECTIONS.USER_PROFILES);

  async getByUserId(userId: string): Promise<UserProfile | null> {
    try {
      return await this.collection.findOne({ userId });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async create(profileData: Omit<UserProfile, '_id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    try {
      const now = new Date();
      const newProfile: UserProfile = {
        ...profileData,
        profileCompletionScore: this.calculateCompletionScore(profileData),
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newProfile);
      return { ...newProfile, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async update(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const updateData = { 
        ...updates, 
        updatedAt: new Date(),
        profileCompletionScore: this.calculateCompletionScore(updates)
      };
      
      await this.collection.updateOne(
        { userId },
        { $set: updateData },
        { upsert: true }
      );
      return await this.getByUserId(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getAllAdmins(): Promise<UserProfile[]> {
    try {
      return await this.collection.find({ isAdmin: true }).toArray();
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const db = getDatabase();
      const usersCollection = db.collection(COLLECTIONS.USERS);
      
      // Get all registered users from the users collection
      const allUsers = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
      
      // Get all profiles
      const allProfiles = await this.collection.find({}).toArray();
      const profilesMap = new Map(allProfiles.map(profile => [profile.userId, profile]));
      
      // Merge user data with profile data, creating virtual profiles for users without profiles
      const mergedUsers: UserProfile[] = allUsers.map(user => {
        const existingProfile = profilesMap.get(user._id?.toString());
        
        if (existingProfile) {
          // Return existing profile with updated user info
          return {
            ...existingProfile,
            // Ensure we have the latest user info from auth
            email: user.email, // Always include email from auth
            firstName: existingProfile.firstName || user.firstName,
            lastName: existingProfile.lastName || user.lastName,
            companyName: existingProfile.companyName || user.companyName,
          };
        } else {
          // Create a virtual profile for users without a profile
          return {
            userId: user._id?.toString() || '',
            email: user.email, // Include email for identification
            firstName: user.firstName,
            lastName: user.lastName,
            companyName: user.companyName,
            isAdmin: false, // Default to false, can be changed by admin
            profileCompletionScore: 0,
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || user.createdAt || new Date(),
          };
        }
      });
      
      return mergedUsers;
    } catch (error) {
      console.error('Error fetching all users with profiles:', error);
      throw error;
    }
  }

  private calculateCompletionScore(profile: Partial<UserProfile>): number {
    const fields = [
      'firstName', 'lastName', 'phone', 'companyName', 'companyWebsite',
      'companySizes', 'industry', 'role', 'targetAudience', 'marketingGoals', 'brandVoice'
    ];
    
    const completedFields = fields.filter(field => profile[field as keyof UserProfile]);
    return Math.round((completedFields.length / fields.length) * 100);
  }
}

// ===== CONVERSATION THREADS SERVICE =====
export class ConversationThreadsService {
  private collection = getDatabase().collection<ConversationThread>(COLLECTIONS.CONVERSATION_THREADS);

  async getByUserId(userId: string, includeArchived = false): Promise<ConversationThread[]> {
    try {
      const query: Filter<ConversationThread> = { userId };
      if (!includeArchived) query.isArchived = { $ne: true };
      
      return await this.collection.find(query).sort({ updatedAt: -1 }).toArray();
    } catch (error) {
      console.error('Error fetching conversation threads:', error);
      throw error;
    }
  }

  async create(threadData: Omit<ConversationThread, '_id' | 'createdAt' | 'updatedAt'>): Promise<ConversationThread> {
    try {
      const now = new Date();
      const newThread: ConversationThread = {
        ...threadData,
        messageCount: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newThread);
      return { ...newThread, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating conversation thread:', error);
      throw error;
    }
  }

  async incrementMessageCount(threadId: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(threadId) },
        { 
          $inc: { messageCount: 1 },
          $set: { updatedAt: new Date() }
        }
      );
    } catch (error) {
      console.error('Error incrementing message count:', error);
      throw error;
    }
  }
}

// ===== ASSISTANT CONVERSATIONS SERVICE =====
export class AssistantConversationsService {
  private collection = getDatabase().collection<AssistantConversation>(COLLECTIONS.ASSISTANT_CONVERSATIONS);
  private threadsService = new ConversationThreadsService();

  async getByThreadId(threadId: string): Promise<AssistantConversation[]> {
    try {
      return await this.collection
        .find({ conversationThreadId: threadId })
        .sort({ createdAt: 1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  }

  async create(messageData: Omit<AssistantConversation, '_id' | 'createdAt' | 'updatedAt'>): Promise<AssistantConversation> {
    try {
      const now = new Date();
      const newMessage: AssistantConversation = {
        ...messageData,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newMessage);
      
      // Increment message count in thread
      if (messageData.conversationThreadId) {
        await this.threadsService.incrementMessageCount(messageData.conversationThreadId);
      }

      return { ...newMessage, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating conversation message:', error);
      throw error;
    }
  }

  async getByUserId(userId: string, limit = 50): Promise<AssistantConversation[]> {
    try {
      return await this.collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
  }
}

// ===== SAVED OUTLETS SERVICE =====
export class SavedOutletsService {
  private collection = getDatabase().collection<SavedOutlet>(COLLECTIONS.SAVED_OUTLETS);

  async getByUserId(userId: string): Promise<string[]> {
    try {
      const saved = await this.collection.find({ userId }).toArray();
      return saved.map(item => item.outletId);
    } catch (error) {
      console.error('Error fetching saved outlets:', error);
      throw error;
    }
  }

  async save(userId: string, outletId: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { userId, outletId },
        { 
          $set: { 
            userId, 
            outletId, 
            savedAt: new Date() 
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error saving outlet:', error);
      throw error;
    }
  }

  async unsave(userId: string, outletId: string): Promise<void> {
    try {
      await this.collection.deleteOne({ userId, outletId });
    } catch (error) {
      console.error('Error unsaving outlet:', error);
      throw error;
    }
  }

  async isSaved(userId: string, outletId: string): Promise<boolean> {
    try {
      const saved = await this.collection.findOne({ userId, outletId });
      return !!saved;
    } catch (error) {
      console.error('Error checking if outlet is saved:', error);
      throw error;
    }
  }
}

// ===== SAVED PACKAGES SERVICE =====
export class SavedPackagesService {
  private collection = getDatabase().collection<SavedPackage>(COLLECTIONS.SAVED_PACKAGES);

  async getByUserId(userId: string): Promise<number[]> {
    try {
      const saved = await this.collection.find({ userId }).toArray();
      return saved.map(item => item.packageId);
    } catch (error) {
      console.error('Error fetching saved packages:', error);
      throw error;
    }
  }

  async save(userId: string, packageId: number): Promise<void> {
    try {
      await this.collection.updateOne(
        { userId, packageId },
        { 
          $set: { 
            userId, 
            packageId, 
            savedAt: new Date() 
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error saving package:', error);
      throw error;
    }
  }

  async unsave(userId: string, packageId: number): Promise<void> {
    try {
      await this.collection.deleteOne({ userId, packageId });
    } catch (error) {
      console.error('Error unsaving package:', error);
      throw error;
    }
  }
}

// ===== USER INTERACTIONS SERVICE =====
export class UserInteractionsService {
  private collection = getDatabase().collection<UserInteraction>(COLLECTIONS.USER_INTERACTIONS);

  async track(interactionData: Omit<UserInteraction, '_id' | 'createdAt'>): Promise<void> {
    try {
      const interaction: UserInteraction = {
        ...interactionData,
        createdAt: new Date()
      };
      
      await this.collection.insertOne(interaction);
    } catch (error) {
      console.error('Error tracking user interaction:', error);
      // Don't throw error for analytics tracking
    }
  }

  async getByUserId(userId: string, limit = 100): Promise<UserInteraction[]> {
    try {
      return await this.collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      throw error;
    }
  }
}

// ===== BRAND DOCUMENTS SERVICE =====
export class BrandDocumentsService {
  private collection = getDatabase().collection<BrandDocument>(COLLECTIONS.BRAND_DOCUMENTS);

  async getByUserId(userId: string): Promise<BrandDocument[]> {
    try {
      return await this.collection.find({ userId }).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error fetching brand documents:', error);
      throw error;
    }
  }

  async create(documentData: Omit<BrandDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<BrandDocument> {
    try {
      const now = new Date();
      const newDocument: BrandDocument = {
        ...documentData,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newDocument);
      return { ...newDocument, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating brand document:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<BrandDocument | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('Error fetching brand document by ID:', error);
      throw error;
    }
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const query: any = { _id: new ObjectId(id) };
      if (userId) {
        query.userId = userId;
      }
      
      const result = await this.collection.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting brand document:', error);
      throw error;
    }
  }
}

// ===== ASSISTANT INSTRUCTIONS SERVICE =====
export class AssistantInstructionsService {
  private collection = getDatabase().collection<AssistantInstruction>(COLLECTIONS.ASSISTANT_INSTRUCTIONS);

  async getActive(): Promise<AssistantInstruction | null> {
    try {
      return await this.collection.findOne({ isActive: true });
    } catch (error) {
      console.error('Error fetching active assistant instructions:', error);
      throw error;
    }
  }

  async create(instructionData: Omit<AssistantInstruction, '_id' | 'createdAt' | 'updatedAt'>): Promise<AssistantInstruction> {
    try {
      const now = new Date();
      
      // Deactivate existing active instructions
      await this.collection.updateMany(
        { isActive: true },
        { $set: { isActive: false, updatedAt: now } }
      );

      const newInstruction: AssistantInstruction = {
        ...instructionData,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newInstruction);
      return { ...newInstruction, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating assistant instruction:', error);
      throw error;
    }
  }
}

// ===== MEDIA PARTNERS SERVICE =====
// ===== UNIFIED MEDIA ENTITIES SERVICE =====
export class MediaEntitiesService {
  private get collection() {
    return getDatabase().collection<MediaEntity>(COLLECTIONS.MEDIA_ENTITIES);
  }

  async getAll(activeOnly: boolean = true, filters?: { category?: string; type?: string }): Promise<MediaEntity[]> {
    try {
      const query: any = {};
      
      if (activeOnly) {
        query.isActive = true;
        query.deletedAt = { $exists: false };
      }
      
      if (filters?.category) {
        // Convert URL-friendly category back to display format
        // e.g., "african-american-media" -> "African American Media"
        // Handle special characters like + and /
        const categoryName = filters.category
          .replace(/\+/g, '+') // Handle URL-encoded + signs
          .replace(/%2F/g, '/') // Handle URL-encoded forward slashes
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Try both categoryTag and category fields to handle different formats
        query.$or = [
          { categoryTag: filters.category },
          { category: categoryName },
          // Also try case-insensitive regex match
          { category: { $regex: new RegExp(`^${categoryName.replace(/[+]/g, '\\+')}$`, 'i') } }
        ];
      }
      
      if (filters?.type) {
        query.type = filters.type;
      }

      return await this.collection
        .find(query)
        .sort({ sortOrder: 1, name: 1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching media entities:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<MediaEntity | null> {
    try {
      return await this.collection.findOne({ 
        _id: new ObjectId(id),
        deletedAt: { $exists: false }
      });
    } catch (error) {
      console.error('Error fetching media entity by ID:', error);
      throw error;
    }
  }

  async getByCategory(category: string, activeOnly: boolean = true): Promise<MediaEntity[]> {
    try {
      const query: any = { categoryTag: category };
      
      if (activeOnly) {
        query.isActive = true;
        query.deletedAt = { $exists: false };
      }

      return await this.collection
        .find(query)
        .sort({ sortOrder: 1, name: 1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching media entities by category:', error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const result = await this.collection.distinct('category', { 
        isActive: true,
        deletedAt: { $exists: false }
      });
      return result;
    } catch (error) {
      console.error('Error fetching media entity categories:', error);
      throw error;
    }
  }

  async getTypes(): Promise<string[]> {
    try {
      return await this.collection.distinct('type', { 
        isActive: true,
        deletedAt: { $exists: false }
      });
    } catch (error) {
      console.error('Error fetching media entity types:', error);
      throw error;
    }
  }

  async create(entityData: MediaEntityInsert): Promise<MediaEntity> {
    try {
      const now = new Date();
      const entity: MediaEntity = {
        ...entityData,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(entity as any);
      const created = await this.collection.findOne({ _id: result.insertedId });
      
      if (!created) {
        throw new Error('Failed to retrieve created media entity');
      }

      return created;
    } catch (error) {
      console.error('Error creating media entity:', error);
      throw error;
    }
  }

  async update(id: string, updateData: MediaEntityUpdate): Promise<MediaEntity | null> {
    try {
      const update: MediaEntityUpdate = {
        ...updateData,
        updatedAt: new Date()
      };

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating media entity:', error);
      throw error;
    }
  }

  async delete(id: string, softDelete: boolean = true): Promise<boolean> {
    try {
      if (softDelete) {
        await this.collection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              deletedAt: new Date(),
              isActive: false,
              updatedAt: new Date()
            }
          }
        );
      } else {
        await this.collection.deleteOne({ _id: new ObjectId(id) });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting media entity:', error);
      throw error;
    }
  }

  // Conversion methods for backward compatibility
  toMediaPartner(entity: MediaEntity): any {
    return {
      _id: entity._id,
      legacyId: entity.legacyId,
      name: entity.name,
      category: entity.category,
      categoryTag: entity.categoryTag,
      logo: entity.logo,
      logoColor: entity.logoColor,
      brief: entity.brief,
      description: entity.description,
      reach: entity.reach,
      audience: entity.audience,
      strengths: entity.strengths,
      advertising: entity.advertising,
      website: entity.website,
      isActive: entity.isActive,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }

  fromMediaPartner(partner: any, additionalData?: Partial<MediaEntity>): MediaEntityInsert {
    return {
      legacyId: partner.legacyId,
      name: partner.name,
      type: additionalData?.type || 'Unknown',
      tagline: additionalData?.tagline,
      description: partner.description,
      website: partner.website,
      category: partner.category,
      categoryTag: partner.categoryTag,
      logo: partner.logo,
      logoColor: partner.logoColor,
      brief: partner.brief,
      reach: partner.reach,
      audience: partner.audience,
      strengths: partner.strengths,
      advertising: partner.advertising,
      isActive: partner.isActive,
      sortOrder: partner.sortOrder,
      ...additionalData,
    };
  }

}

// ===== PUBLICATIONS SERVICE =====
export class PublicationsService {
  private get collection() {
    return getDatabase().collection<Publication>(COLLECTIONS.PUBLICATIONS);
  }

  async getAll(filters?: { 
    geographicCoverage?: string; 
    publicationType?: string; 
    contentType?: string;
    verificationStatus?: string;
  }): Promise<Publication[]> {
    try {
      const query: Filter<Publication> = {};
      
      if (filters?.geographicCoverage) {
        query['basicInfo.geographicCoverage'] = filters.geographicCoverage;
      }
      
      if (filters?.publicationType) {
        query['basicInfo.publicationType'] = filters.publicationType;
      }
      
      if (filters?.contentType) {
        query['basicInfo.contentType'] = filters.contentType;
      }
      
      if (filters?.verificationStatus) {
        query['metadata.verificationStatus'] = filters.verificationStatus;
      }

      return await this.collection
        .find(query)
        .sort({ 'basicInfo.publicationName': 1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching publications:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Publication | null> {
    try {
      const query: any = { $or: [] };
      
      // Try to match as string _id (for custom IDs like "ww_2025_001")
      query.$or.push({ _id: id });
      
      // Try to match as ObjectId (for MongoDB-generated IDs)
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
      
      // Try to match as numeric publicationId
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        query.$or.push({ publicationId: numericId });
      }
      
      return await this.collection.findOne(query);
    } catch (error) {
      console.error('Error fetching publication by ID:', error);
      throw error;
    }
  }

  async getByPublicationId(publicationId: number): Promise<Publication | null> {
    try {
      return await this.collection.findOne({ publicationId });
    } catch (error) {
      console.error('Error fetching publication by publication ID:', error);
      throw error;
    }
  }

  async create(publicationData: PublicationInsert): Promise<Publication> {
    try {
      const now = new Date();
      const newPublication: Publication = {
        ...publicationData,
        metadata: {
          ...publicationData.metadata,
          createdAt: now,
          lastUpdated: now,
          verificationStatus: publicationData.metadata?.verificationStatus || 'needs_verification'
        }
      };

      const result = await this.collection.insertOne(newPublication);
      return { ...newPublication, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating publication:', error);
      throw error;
    }
  }

  async update(id: string, updates: PublicationUpdate): Promise<Publication | null> {
    try {
      const updateData = {
        ...updates,
        'metadata.lastUpdated': new Date()
      };
      
      const query: any = { $or: [] };
      
      // Try to match as string _id (for custom IDs like "ww_2025_001")
      query.$or.push({ _id: id });
      
      // Try to match as ObjectId (for MongoDB-generated IDs)
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
      
      // Try to match as numeric publicationId
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        query.$or.push({ publicationId: numericId });
      }
      
      await this.collection.updateOne(query, { $set: updateData });
      
      return await this.getById(id);
    } catch (error) {
      console.error('Error updating publication:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query: any = { $or: [] };
      
      // Try to match as string _id (for custom IDs like "ww_2025_001")
      query.$or.push({ _id: id });
      
      // Try to match as ObjectId (for MongoDB-generated IDs)
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
      
      // Try to match as numeric publicationId
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        query.$or.push({ publicationId: numericId });
      }
      
      const result = await this.collection.deleteOne(query);
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting publication:', error);
      throw error;
    }
  }

  async importMany(publications: PublicationInsert[]): Promise<{ inserted: number; errors: any[] }> {
    try {
      const now = new Date();
      const errors: any[] = [];
      let inserted = 0;

      for (const pub of publications) {
        try {
          // Check if publication already exists
          const existing = await this.getByPublicationId(pub.publicationId);
          
          if (existing) {
            // Update existing - remove metadata to avoid conflicts
            const { metadata, ...updateData } = pub;
            await this.update(existing._id!.toString(), updateData);
          } else {
            // Create new
            const newPub: Publication = {
              ...pub,
              metadata: {
                ...pub.metadata,
                createdAt: now,
                lastUpdated: now,
                verificationStatus: pub.metadata?.verificationStatus || 'needs_verification',
                extractedFrom: pub.metadata?.extractedFrom || ['api']
              }
            };
            
            await this.collection.insertOne(newPub);
            inserted++;
          }
        } catch (error) {
          errors.push({
            publicationId: pub.publicationId,
            publicationName: pub.basicInfo?.publicationName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { inserted, errors };
    } catch (error) {
      console.error('Error importing publications:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$basicInfo.contentType',
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const results = await this.collection.aggregate(pipeline).toArray();
      
      return results.map(result => ({
        id: result._id,
        name: result._id.charAt(0).toUpperCase() + result._id.slice(1),
        count: result.count
      }));
    } catch (error) {
      console.error('Error fetching publication categories:', error);
      throw error;
    }
  }

  async getTypes(): Promise<Array<{ id: string; name: string; count: number }>> {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$basicInfo.publicationType',
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const results = await this.collection.aggregate(pipeline).toArray();
      
      return results.map(result => ({
        id: result._id,
        name: result._id.charAt(0).toUpperCase() + result._id.slice(1),
        count: result.count
      }));
    } catch (error) {
      console.error('Error fetching publication types:', error);
      throw error;
    }
  }

  // Convert Publication to legacy MediaEntity format for backward compatibility
  toMediaEntity(publication: Publication): MediaEntity {
    return {
      _id: publication._id,
      legacyId: publication.publicationId,
      name: publication.basicInfo.publicationName,
      type: publication.basicInfo.publicationType || 'publication',
      tagline: publication.basicInfo.publicationType,
      description: publication.editorialInfo?.contentFocus?.join(', ') || '',
      website: publication.basicInfo.websiteUrl,
      category: publication.basicInfo.contentType || 'mixed',
      categoryTag: publication.basicInfo.contentType?.toLowerCase().replace(/\s+/g, '-') || 'mixed',
      logo: publication.basicInfo.publicationName.substring(0, 3).toUpperCase(),
      logoColor: '#1E40AF',
      brief: `${publication.basicInfo.geographicCoverage || 'Local'} ${publication.basicInfo.contentType || 'publication'}`,
      reach: publication.audienceDemographics?.totalAudience?.toString() || 'Unknown',
      audience: publication.audienceDemographics?.targetMarkets?.join(', ') || 'General audience',
      strengths: publication.competitiveInfo?.keyDifferentiators || [],
      advertising: publication.crossChannelPackages?.map(pkg => pkg.name || pkg.packageName || 'Package') || [],
      contactInfo: {
        email: publication.contactInfo?.salesContact?.email,
        phone: publication.contactInfo?.mainPhone,
        salesContact: publication.contactInfo?.salesContact ? {
          name: publication.contactInfo.salesContact.name,
          email: publication.contactInfo.salesContact.email,
          phone: publication.contactInfo.salesContact.phone
        } : undefined
      },
      businessInfo: {
        foundingYear: typeof publication.basicInfo.founded === 'number' ? publication.basicInfo.founded : undefined,
        staffCount: publication.businessInfo?.numberOfEmployees,
        ownershipType: publication.businessInfo?.ownershipType,
        businessModel: publication.businessInfo?.parentCompany,
        competitiveAdvantages: publication.competitiveInfo?.uniqueValueProposition,
        primaryMarket: publication.basicInfo.primaryServiceArea,
        coverageArea: publication.basicInfo.geographicCoverage,
        publicationFrequency: publication.basicInfo.publicationType
      },
      audienceMetrics: {
        monthlyVisitors: publication.distributionChannels?.website?.metrics?.monthlyVisitors,
        emailSubscribers: publication.distributionChannels?.newsletters?.[0]?.subscribers,
        openRate: publication.distributionChannels?.newsletters?.[0]?.openRate,
        audienceSize: publication.audienceDemographics?.totalAudience?.toString(),
        demographics: {
          gender: publication.audienceDemographics?.gender ? {
            male: publication.audienceDemographics.gender.male,
            female: publication.audienceDemographics.gender.female
          } : undefined,
          income: publication.audienceDemographics?.householdIncome ? {
            highIncome: (publication.audienceDemographics.householdIncome['100k-150k'] || 0) + 
                       (publication.audienceDemographics.householdIncome.over150k || 0)
          } : undefined,
          education: publication.audienceDemographics?.education ? {
            graduateDegree: publication.audienceDemographics.education.graduate
          } : undefined,
          device: {
            mobile: publication.distributionChannels?.website?.metrics?.mobilePercentage
          }
        }
      },
      socialMedia: publication.socialMediaProfiles?.[0] ? {
        facebook: publication.socialMediaProfiles.find(p => p.platform === 'facebook')?.url,
        twitter: publication.socialMediaProfiles.find(p => p.platform === 'twitter')?.url,
        instagram: publication.socialMediaProfiles.find(p => p.platform === 'instagram')?.url,
        linkedin: publication.socialMediaProfiles.find(p => p.platform === 'linkedin')?.url,
        totalFollowers: publication.socialMediaProfiles.reduce((total, p) => total + (p.metrics?.followers || 0), 0)
      } : undefined,
      editorialInfo: {
        editorialFocus: publication.editorialInfo?.contentFocus,
        awards: publication.awards,
        keyPersonnel: publication.editorialInfo?.editorialTeam ? [
          publication.editorialInfo.editorialTeam.editorInChief,
          publication.editorialInfo.editorialTeam.managingEditor,
          ...(publication.editorialInfo.editorialTeam.keyWriters || [])
        ].filter(Boolean) : []
      },
      technicalSpecs: {
        adSpecs: publication.distributionChannels?.website?.advertisingOpportunities,
        fileRequirements: publication.distributionChannels?.print?.advertisingOpportunities?.[0]?.specifications,
        technicalRequirements: publication.technicalCapabilities
      },
      isActive: publication.metadata?.verificationStatus !== 'outdated',
      sortOrder: 0,
      createdAt: publication.metadata?.createdAt || new Date(),
      updatedAt: publication.metadata?.lastUpdated || new Date()
    };
  }
}

// ===== PUBLICATION FILES SERVICE =====
export class PublicationFilesService {
  private get collection() {
    return getDatabase().collection<PublicationFile>(COLLECTIONS.PUBLICATION_FILES);
  }

  async getByPublicationId(publicationId: string): Promise<PublicationFile[]> {
    try {
      return await this.collection
        .find({ publicationId })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching publication files:', error);
      throw error;
    }
  }

  async getById(fileId: string): Promise<PublicationFile | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(fileId) });
    } catch (error) {
      console.error('Error fetching publication file by ID:', error);
      throw error;
    }
  }

  async create(fileData: PublicationFileInsert): Promise<PublicationFile> {
    try {
      const now = new Date();
      const newFile: PublicationFile = {
        ...fileData,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newFile);
      return { ...newFile, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating publication file:', error);
      throw error;
    }
  }

  async update(fileId: string, updates: Partial<PublicationFileUpdate>): Promise<PublicationFile | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.collection.updateOne(
        { _id: new ObjectId(fileId) },
        { $set: updateData }
      );

      return await this.getById(fileId);
    } catch (error) {
      console.error('Error updating publication file:', error);
      throw error;
    }
  }

  async delete(fileId: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(fileId) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting publication file:', error);
      throw error;
    }
  }

  async incrementDownloadCount(fileId: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(fileId) },
        { 
          $inc: { downloadCount: 1 },
          $set: { lastAccessedAt: new Date(), updatedAt: new Date() }
        }
      );
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw error;
    }
  }

  async search(query: string, filters?: {
    fileType?: string;
    publicationId?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<PublicationFile[]> {
    try {
      const searchQuery: any = {};

      // Text search
      if (query) {
        searchQuery.$or = [
          { fileName: { $regex: query, $options: 'i' } },
          { originalFileName: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ];
      }

      // Apply filters
      if (filters?.fileType) {
        searchQuery.fileType = filters.fileType;
      }
      if (filters?.publicationId) {
        searchQuery.publicationId = filters.publicationId;
      }
      if (filters?.tags && filters.tags.length > 0) {
        searchQuery.tags = { $in: filters.tags };
      }
      if (filters?.isPublic !== undefined) {
        searchQuery.isPublic = filters.isPublic;
      }

      return await this.collection
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Error searching publication files:', error);
      throw error;
    }
  }
}

// ===== SURVEY SUBMISSIONS SERVICE =====
export class SurveySubmissionsService {
  private get collection() {
    return getDatabase().collection<SurveySubmission>(COLLECTIONS.SURVEY_SUBMISSIONS);
  }

  async getAll(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    companyName?: string;
  }): Promise<SurveySubmission[]> {
    try {
      const query: any = {};
      
      if (filters?.status) {
        query['application.status'] = filters.status;
      }
      
      if (filters?.dateFrom || filters?.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
        if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
      }
      
      if (filters?.companyName) {
        query['contactInformation.companyName'] = { $regex: filters.companyName, $options: 'i' };
      }

      return await this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching survey submissions:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<SurveySubmission | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('Error fetching survey submission by ID:', error);
      throw error;
    }
  }

  async create(submissionData: SurveySubmissionInsert): Promise<SurveySubmission> {
    try {
      const now = new Date();
      const newSubmission: SurveySubmission = {
        ...submissionData,
        application: {
          ...submissionData.application,
          status: submissionData.application?.status || 'new'
        },
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.insertOne(newSubmission);
      return { ...newSubmission, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating survey submission:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<SurveySubmissionUpdate>): Promise<SurveySubmission | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating survey submission:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<SurveySubmission | null> {
    try {
      const updateData: any = {
        'application.status': status,
        'application.reviewedAt': new Date(),
        updatedAt: new Date()
      };

      if (reviewNotes) updateData['application.reviewNotes'] = reviewNotes;
      if (reviewedBy) updateData['application.reviewedBy'] = reviewedBy;

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating survey submission status:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    recentCount: number;
  }> {
    try {
      const total = await this.collection.countDocuments();
      
      const statusPipeline = [
        {
          $group: {
            _id: '$application.status',
            count: { $sum: 1 }
          }
        }
      ];
      
      const statusResults = await this.collection.aggregate(statusPipeline).toArray();
      const byStatus = statusResults.reduce((acc, item) => {
        acc[item._id || 'new'] = item.count;
        return acc;
      }, {} as Record<string, number>);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentCount = await this.collection.countDocuments({
        createdAt: { $gte: sevenDaysAgo }
      });

      return { total, byStatus, recentCount };
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting survey submission:', error);
      throw error;
    }
  }
}


// ===== STOREFRONT CONFIGURATIONS SERVICE =====
export class StorefrontConfigurationsService {
  private get collection() {
    return getDatabase().collection<StorefrontConfiguration>(COLLECTIONS.STOREFRONT_CONFIGURATIONS);
  }

  async getAll(filters?: {
    is_draft?: boolean;
    publisher_id?: string;
    isActive?: boolean;
    publicationId?: string;
  }): Promise<StorefrontConfiguration[]> {
    try {
      const query: any = {};
      
      if (filters?.is_draft !== undefined) {
        query['meta.is_draft'] = filters.is_draft;
      }
      
      if (filters?.publisher_id) {
        query['meta.publisher_id'] = filters.publisher_id;
      }
      
      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      if (filters?.publicationId) {
        query.publicationId = filters.publicationId;
      }

      return await this.collection
        .find(query)
        .sort({ updatedAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching storefront configurations:', error);
      throw error;
    }
  }

  async getByPublicationId(publicationId: string): Promise<StorefrontConfiguration | null> {
    try {
      return await this.collection.findOne({ publicationId });
    } catch (error) {
      console.error('Error fetching storefront configuration:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<StorefrontConfiguration | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('Error fetching storefront configuration by ID:', error);
      throw error;
    }
  }

  async create(configData: StorefrontConfigurationInsert): Promise<StorefrontConfiguration> {
    try {
      // Check if configuration already exists for this publication
      const existingConfig = await this.collection.findOne({ publicationId: configData.publicationId });
      if (existingConfig) {
        throw new Error(`Storefront configuration already exists for publication ${configData.publicationId}`);
      }

      const now = new Date();
      const configWithTimestamps: StorefrontConfiguration = {
        ...configData,
        isActive: configData.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.collection.insertOne(configWithTimestamps);
      
      if (!result.acknowledged) {
        throw new Error('Failed to create storefront configuration');
      }

      const createdConfig = await this.collection.findOne({ _id: result.insertedId });
      if (!createdConfig) {
        throw new Error('Failed to retrieve created storefront configuration');
      }

      return createdConfig;
    } catch (error) {
      console.error('Error creating storefront configuration:', error);
      throw error;
    }
  }

  async update(publicationId: string, updates: Partial<StorefrontConfigurationInsert>): Promise<StorefrontConfiguration | null> {
    try {
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

      const result = await this.collection.findOneAndUpdate(
        { publicationId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      return result.value;
    } catch (error) {
      console.error('Error updating storefront configuration:', error);
      throw error;
    }
  }

  async delete(publicationId: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ publicationId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting storefront configuration:', error);
      throw error;
    }
  }

  async publish(publicationId: string): Promise<StorefrontConfiguration | null> {
    try {
      const result = await this.collection.findOneAndUpdate(
        { publicationId },
        { 
          $set: { 
            'meta.is_draft': false,
            'meta.lastUpdated': new Date().toISOString(),
            updatedAt: new Date()
          } 
        },
        { returnDocument: 'after' }
      );

      return result.value;
    } catch (error) {
      console.error('Error publishing storefront configuration:', error);
      throw error;
    }
  }

  async duplicate(sourcePublicationId: string, targetPublicationId: string, targetPublisherId: string): Promise<StorefrontConfiguration> {
    try {
      // Get the source configuration
      const sourceConfig = await this.collection.findOne({ publicationId: sourcePublicationId });
      if (!sourceConfig) {
        throw new Error(`Source storefront configuration not found for publication ${sourcePublicationId}`);
      }

      // Check if target already has a configuration
      const existingTarget = await this.collection.findOne({ publicationId: targetPublicationId });
      if (existingTarget) {
        throw new Error(`Storefront configuration already exists for target publication ${targetPublicationId}`);
      }

      // Create the duplicate configuration
      const duplicateConfig: StorefrontConfigurationInsert = {
        ...sourceConfig,
        publicationId: targetPublicationId,
        meta: {
          ...sourceConfig.meta,
          publisher_id: targetPublisherId,
          description: `Duplicated from ${sourceConfig.meta.publisher_id} - ${sourceConfig.meta.description}`,
          lastUpdated: new Date().toISOString(),
          is_draft: true, // Always create duplicates as drafts
        }
      };

      // Remove MongoDB-specific fields
      delete (duplicateConfig as any)._id;
      delete (duplicateConfig as any).createdAt;
      delete (duplicateConfig as any).updatedAt;

      return await this.create(duplicateConfig);
    } catch (error) {
      console.error('Error duplicating storefront configuration:', error);
      throw error;
    }
  }
}

// Export service instances
export const adPackagesService = new AdPackagesService();
export const leadInquiriesService = new LeadInquiriesService();
export const userProfilesService = new UserProfilesService();
export const conversationThreadsService = new ConversationThreadsService();
export const assistantConversationsService = new AssistantConversationsService();
export const savedOutletsService = new SavedOutletsService();
export const savedPackagesService = new SavedPackagesService();
export const userInteractionsService = new UserInteractionsService();
export const brandDocumentsService = new BrandDocumentsService();
export const assistantInstructionsService = new AssistantInstructionsService();
export const mediaEntitiesService = new MediaEntitiesService();
export const publicationsService = new PublicationsService();
export const publicationFilesService = new PublicationFilesService();
export const storefrontConfigurationsService = new StorefrontConfigurationsService();
export const surveySubmissionsService = new SurveySubmissionsService();
