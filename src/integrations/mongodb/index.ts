// MongoDB Integration
export * from './client';
export * from './types';
export * from './services';
export * from './schemas';
export * from './allServices';
export * from './initDatabase';
export * from './authService';

// Main exports for easy importing
export { 
  mongoClient, 
  connectToDatabase, 
  getDatabase, 
  getPublicationsCollection,
  closeConnection,
  setupGracefulShutdown
} from './client';

export {
  publicationsService,
  legacyMediaOutletService,
  userDataService,
  PublicationsService,
  LegacyMediaOutletService,
  UserDataService
} from './services';

export {
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
  AdPackagesService,
  LeadInquiriesService,
  UserProfilesService,
  ConversationThreadsService,
  AssistantConversationsService,
  SavedOutletsService,
  SavedPackagesService,
  UserInteractionsService,
  BrandDocumentsService,
  AssistantInstructionsService
} from './allServices';

export {
  initializeDatabase,
  getCollectionStats,
  seedInitialData,
  checkDatabaseHealth
} from './initDatabase';

export {
  authService,
  AuthService
} from './authService';

export type {
  Publication,
  PublicationInsert,
  PublicationUpdate,
  BasicInfo,
  ContactInfo,
  SocialMediaProfile,
  DistributionChannels,
  AudienceDemographics,
  EditorialInfo,
  BusinessInfo,
  LegacyMediaOutlet,
  AdPackage,
  LeadInquiry,
  UserProfile,
  ConversationThread,
  AssistantConversation,
  BrandDocument,
  SavedOutlet,
  SavedPackage,
  UserInteraction,
  AssistantInstruction,
  User,
  UserSession
} from './types';

export type {
  AuthUser,
  LoginResult,
  SignUpData
} from './authService';

export { COLLECTIONS } from './schemas';
