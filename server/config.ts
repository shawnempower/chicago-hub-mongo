// Server configuration
export const config = {
  port: process.env.PORT || 3001,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random',
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://shawn:ig8kVxMOy6e98YmP@cluster0.1shq5cl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  
  // Email configuration for future use
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};
