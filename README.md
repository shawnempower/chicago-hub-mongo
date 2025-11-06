# Chicago Hub - Media Partnership Platform

A comprehensive platform connecting advertisers with Chicago-area media outlets, featuring publication management, package recommendations, and streamlined partnership workflows.

## 🌟 Features

- **Publication Management**: Comprehensive database of Chicago media outlets
- **Package Recommendations**: AI-powered advertising package suggestions
- **User Dashboard**: Save publications, manage preferences, track interactions
- **Admin Interface**: Full CRUD operations for publications and packages
- **Document Management**: File upload and organization system
- **Survey Integration**: Lead capture and audience insights
- **🆕 Price Forecasting**: Standardized revenue calculations across all inventory types

## 💰 Pricing & Revenue System

The Chicago Hub includes a comprehensive pricing and revenue forecasting system with data quality monitoring.

### Quick Start
```typescript
import { calculateRevenue } from '@/utils/pricingCalculations';

const monthlyRevenue = calculateRevenue(ad, 'month', frequency);
const annualRevenue = calculateRevenue(ad, 'year', frequency);
```

### Documentation
- **Pricing Formulas**: [`public/pricing-formulas.html`](./public/pricing-formulas.html) - Interactive web guide with navigation
- **Quick Start**: [`PRICING_QUICK_START.md`](./PRICING_QUICK_START.md) - Get started in 5 minutes
- **Full Documentation**: [`PRICE_FORECASTING_INDEX.md`](./PRICE_FORECASTING_INDEX.md) - Complete documentation index
- **Developer Reference**: [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - Quick lookup guide
- **Data Quality**: [`PRICING_DATA_QUALITY_ANALYSIS.md`](./PRICING_DATA_QUALITY_ANALYSIS.md) - Data validation and issues
- **Hub Pricing Migration**: [`HUB_PRICING_MIGRATION_SUMMARY.md`](./HUB_PRICING_MIGRATION_SUMMARY.md) - Structure consolidation
- **UI Improvements**: [`HUB_PRICING_UI_IMPROVEMENTS.md`](./HUB_PRICING_UI_IMPROVEMENTS.md) - Multi-tier pricing UI

### Key Features
- ✅ **14 pricing models** supported (per_send, cpm, per_ad, etc.)
- ✅ **Multi-timeframe forecasting** (day, week, month, quarter, year, custom)
- ✅ **Frequency-aware** calculations (daily, weekly, monthly)
- ✅ **Performance metrics** integration
- ✅ **React hooks** for easy integration
- ✅ **Type-safe** with full TypeScript coverage
- ✅ **Data quality monitoring** with real-time validation
- ✅ **Multi-tier hub pricing** with consolidated structure

**Accuracy**: 300-2,900% improvement over previous methods!

### Recent Improvements (Nov 2024)
1. **Hub Pricing Structure**: Migrated 82 items from duplicate hub entries to consolidated multi-tier structure
2. **Data Quality Monitoring**: Real-time validation with severity levels (Critical, High, Medium)
3. **UI Enhancement**: New multi-tier pricing interface with expand/collapse and tier management
4. **Radio/Podcast Fix**: Corrected frequency inference to prevent inflated totals
5. **Package Pricing**: Fixed bundle calculations to use hub pricing when available

### Integration Status
✅ **5/5 major components** using standardized calculations:
- PublicationFullSummary (user dashboards)
- DashboardOverview (quick stats + data quality)
- HubPricingReport (pricing comparisons)
- PackageBuilderForm (package creation)
- Server Dashboard Stats (backend API with deduplication)

**Result**: Every pricing calculation in the platform is now standardized, accurate, and validated!

## 🚀 Live Application

- **Frontend**: https://main.dbn59dj42j2z3.amplifyapp.com
- **API**: https://hubapi.empowerlocal.co

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **React Query** for state management
- **React Hook Form** for form handling

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** authentication
- **AWS S3** for file storage
- **Mailgun** for email services

### Infrastructure
- **AWS Amplify** for frontend hosting
- **AWS ECS Fargate** for backend container orchestration
- **AWS Application Load Balancer** for API routing
- **MongoDB Atlas** for database hosting

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB connection string
- AWS credentials (for file uploads)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/chicago-hub.git
cd chicago-hub

# Install dependencies
npm install

# Set up environment variables
cp env.template .env
# Edit .env with your actual values

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Backend Setup

```bash
# Start the backend server
cd server
npm install
npm run dev
```

The API will be available at `http://localhost:3001`

## 📁 Project Structure

```
├── src/
│   ├── api/           # API service functions
│   ├── components/    # React components
│   │   ├── admin/     # Admin interface components
│   │   ├── dashboard/ # User dashboard components
│   │   └── ui/        # Reusable UI components
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom React hooks
│   ├── integrations/  # External service integrations
│   ├── pages/         # Page components
│   └── types/         # TypeScript type definitions
├── server/            # Backend API server
├── json_files/        # Data files and schemas
└── docs/             # Documentation
```

## 🔧 Configuration

### Environment Variables

See `env.template` for required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - MongoDB database name (defaults to 'chicago-hub')
- `JWT_SECRET` - JWT signing secret
- `AWS_*` - AWS credentials for S3
- `MAILGUN_*` - Email service configuration

### API Configuration

The frontend automatically detects the environment:
- **Development**: Uses `http://localhost:3001/api`
- **Production**: Uses `https://hubapi.empowerlocal.co/api`

## 📚 Documentation

### General Documentation
- [Deployment Overview](./deployment/README.md) - All deployment configuration and guides
- [Current Production Setup](./deployment/docs/CURRENT_PRODUCTION_SETUP.md)
- [Production Deployment Guide](./deployment/docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Amplify Deployment Guide](./deployment/docs/AMPLIFY_DEPLOYMENT_GUIDE.md)

### Pricing & Revenue Calculation

**🌐 [Pricing Formulas Web Page](./public/pricing-formulas.html)** - **Start here!** Single-page interactive reference with navigation

**📄 Markdown Documentation:**
- **[Pricing Documentation Index](./PRICING_DOCUMENTATION_INDEX.md)** - Complete guide to all documentation
- **[Pricing Quick Reference](./PRICING_QUICK_REFERENCE.md)** - Quick lookup card (print this!)
- **[Pricing Formulas Guide](./PRICING_FORMULAS_GUIDE.md)** - Complete technical specification
- **[Pricing Examples](./PRICING_EXAMPLES.md)** - Real-world scenarios with calculations
- **[Pricing Flowcharts](./PRICING_FLOWCHARTS.md)** - Visual decision trees

**Additional Guides:**
- [Total Price Calculation](./TOTAL_PRICE_CALCULATION.md) - UI implementation details
- [Pricing Migration Guide](./PRICING_MIGRATION_GUIDE.md) - Schema migration documentation

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

The application is configured for automatic deployment:

- **Frontend**: Deployed to AWS Amplify on push to `main` branch
- **Backend**: Deployed to AWS ECS with Docker containers

**Quick Deploy:**
```bash
# Backend deployment
./deployment/deploy-to-ecs.sh
```

See [deployment directory](./deployment/README.md) for detailed instructions and configuration.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For questions or support, please contact the development team or create an issue in the repository.
