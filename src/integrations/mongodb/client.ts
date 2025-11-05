import { MongoClient, ServerApiVersion } from 'mongodb';

// Get MongoDB URI - evaluate at runtime to ensure env vars are loaded
const getMongoDB_URI = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required but not set');
  }
  console.log('🔍 getMongoDB_URI called, MONGODB_URI env var: SET');
  console.log('🔍 Using URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  return uri;
};

// Singleton MongoDB client with proper connection pooling
let client: MongoClient | null = null;
let isConnecting = false;
let cachedURI: string | null = null;

const getClient = () => {
  const currentURI = getMongoDB_URI();
  
  // Reset client if URI has changed (e.g., after env vars are loaded)
  if (client && cachedURI && cachedURI !== currentURI) {
    console.log('🔄 MongoDB URI changed, resetting client...');
    client = null;
    cachedURI = null;
  }
  
  // Return existing client if available
  if (client) {
    return client;
  }

  // Create client only once with proper pooling configuration
  console.log('🔧 Creating new MongoDB client with URI:', currentURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  cachedURI = currentURI;
  client = new MongoClient(currentURI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Connection timeout settings
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    
    // Connection pool settings for optimal performance
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2,  // Minimum number of connections to maintain
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    maxConnecting: 2, // Maximum number of connections being established at once
    
    // Additional reliability settings
    heartbeatFrequencyMS: 10000, // Ping server every 10 seconds
    retryWrites: true,
    retryReads: true,
  });
  
  return client;
};

// Database and collection names
export const DATABASE_NAME = process.env.MONGODB_DB_NAME;
export const PUBLICATIONS_COLLECTION = 'publications';

// MongoDB client instance
export const mongoClient = () => getClient();

// Database connection helper with connection state management
export const connectToDatabase = async () => {
  try {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      console.log('Connection already in progress, waiting...');
      // Wait for existing connection attempt
      while (isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return getClient().db(DATABASE_NAME);
    }

    const client = getClient();
    
    // Check if already connected
    try {
      await client.db(DATABASE_NAME).admin().ping();
      console.log('Already connected to MongoDB!');
      return client.db(DATABASE_NAME);
    } catch {
      // Not connected, proceed with connection
    }

    console.log('Connecting to MongoDB with URI:', getMongoDB_URI().replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    isConnecting = true;
    
    await client.connect();
    console.log('✅ Connected to MongoDB with connection pooling enabled!');
    console.log('📊 Pool settings: maxPoolSize=10, minPoolSize=2, maxIdleTime=30s');
    
    isConnecting = false;
    return client.db(DATABASE_NAME);
  } catch (error) {
    isConnecting = false;
    console.error('❌ Error connecting to MongoDB:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = () => {
  return getClient().db(DATABASE_NAME);
};

// Get publications collection
export const getPublicationsCollection = () => {
  return getDatabase().collection(PUBLICATIONS_COLLECTION);
};

// Close connection helper with proper cleanup
export const closeConnection = async () => {
  try {
    if (!client) {
      console.log('No MongoDB client to close');
      return;
    }

    console.log('Closing MongoDB connection and connection pool...');
    await client.close();
    client = null; // Reset client reference
    cachedURI = null; // Reset cached URI
    isConnecting = false; // Reset connection state
    console.log('✅ MongoDB connection and pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    // Reset state even if close fails
    client = null;
    cachedURI = null;
    isConnecting = false;
  }
};

// Graceful shutdown handler - call this on process termination
export const setupGracefulShutdown = () => {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, closing MongoDB connections...`);
    await closeConnection();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
};
