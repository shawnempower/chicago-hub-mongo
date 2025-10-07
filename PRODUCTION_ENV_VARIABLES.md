# 🔧 Production Environment Variables Guide
# Copy these variables to your ECS task definition or environment configuration

# ===== APPLICATION SETTINGS =====
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# ===== SECURITY =====
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long

# ===== MONGODB CONFIGURATION =====
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# ===== AWS S3 CONFIGURATION =====
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-production-s3-bucket-name

# ===== MAILGUN EMAIL CONFIGURATION =====
MAILGUN_DOMAIN=your-production-domain.com
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_BASE_URL=https://api.mailgun.net/v3
MAILGUN_FROM_EMAIL=noreply@your-production-domain.com
MAILGUN_FROM_NAME=Chicago Hub
ADMIN_EMAIL=admin@your-production-domain.com

# ===== OPENAI CONFIGURATION (if using AI features) =====
OPENAI_API_KEY=your-openai-api-key
OPENAI_ASSISTANT_ID=your-assistant-id
VECTOR_STORE_ID=your-vector-store-id
