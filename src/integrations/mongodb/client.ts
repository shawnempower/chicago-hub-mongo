import { MongoClient, ServerApiVersion } from 'mongodb';

const MONGODB_URI = "mongodb+srv://shawn:ig8kVxMOy6e98YmP@cluster0.1shq5cl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database and collection names
export const DATABASE_NAME = 'chicago-hub';
export const PUBLICATIONS_COLLECTION = 'publications';

// MongoDB client instance
export { client as mongoClient };

// Database connection helper
export const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    return client.db(DATABASE_NAME);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = () => {
  return client.db(DATABASE_NAME);
};

// Get publications collection
export const getPublicationsCollection = () => {
  return getDatabase().collection(PUBLICATIONS_COLLECTION);
};

// Close connection helper
export const closeConnection = async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};
