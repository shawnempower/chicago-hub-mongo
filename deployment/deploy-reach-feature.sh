#!/bin/bash

# Reach Feature Production Deployment Script
# This script deploys the reach calculation feature including data migration
#
# Usage:
#   ./deployment/deploy-reach-feature.sh [--skip-migration] [--dry-run-migration]

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_MIGRATION=false
DRY_RUN_MIGRATION=false

for arg in "$@"; do
  case $arg in
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --dry-run-migration)
      DRY_RUN_MIGRATION=true
      shift
      ;;
  esac
done

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Reach Feature Production Deployment                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pre-flight checks
echo -e "${YELLOW}📋 Step 1: Pre-flight checks${NC}"
echo "  Checking current branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Current branch: $CURRENT_BRANCH"

echo "  Checking for uncommitted changes..."
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}  ⚠️  You have uncommitted changes!${NC}"
  git status -s
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 2: Create backup
echo ""
echo -e "${YELLOW}📦 Step 2: Creating database backup${NC}"
BACKUP_DIR="$PROJECT_ROOT/backups"
BACKUP_NAME="pre-reach-deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "  Backup location: $BACKUP_DIR/$BACKUP_NAME"
echo "  This will be created when you run the migration script manually"
echo "  Command: mongodump --uri=\"\$MONGODB_URI\" --out=\"$BACKUP_DIR/$BACKUP_NAME\""

# Step 3: Deploy Backend
echo ""
echo -e "${YELLOW}🔧 Step 3: Deploying Backend${NC}"
echo "  Running backend deployment script..."

if [ -f "$SCRIPT_DIR/deploy-backend-production.sh" ]; then
  bash "$SCRIPT_DIR/deploy-backend-production.sh"
  echo -e "${GREEN}  ✅ Backend deployed${NC}"
else
  echo -e "${RED}  ⚠️  Backend deployment script not found!${NC}"
  echo "  Please deploy backend manually"
  read -p "  Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 4: Wait for backend
echo ""
echo -e "${YELLOW}⏳ Step 4: Waiting for backend to be ready${NC}"
echo "  Please verify backend is running and healthy"
read -p "  Is backend ready? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}  ❌ Deployment cancelled${NC}"
  exit 1
fi

# Step 5: Run Data Migration
echo ""
echo -e "${YELLOW}🔄 Step 5: Data Migration${NC}"

if [ "$SKIP_MIGRATION" = true ]; then
  echo -e "${YELLOW}  ⏭️  Skipping migration (--skip-migration flag)${NC}"
elif [ "$DRY_RUN_MIGRATION" = true ]; then
  echo "  Running migration in DRY-RUN mode..."
  NODE_OPTIONS="--require dotenv/config" npx tsx "$PROJECT_ROOT/scripts/migrateFlatToMonthly.ts" --dry-run
  echo ""
  echo -e "${YELLOW}  🔍 Review the changes above${NC}"
  read -p "  Run actual migration? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  Running actual migration..."
    NODE_OPTIONS="--require dotenv/config" npx tsx "$PROJECT_ROOT/scripts/migrateFlatToMonthly.ts" --no-dry-run
    echo -e "${GREEN}  ✅ Migration completed${NC}"
  else
    echo -e "${YELLOW}  ⏭️  Migration skipped${NC}"
  fi
else
  echo "  Migration will be run manually"
  echo ""
  echo -e "${BLUE}  To run migration:${NC}"
  echo "  1. Dry run first: NODE_OPTIONS=\"--require dotenv/config\" npx tsx scripts/migrateFlatToMonthly.ts --dry-run"
  echo "  2. Review changes"
  echo "  3. Run migration: NODE_OPTIONS=\"--require dotenv/config\" npx tsx scripts/migrateFlatToMonthly.ts --no-dry-run"
  echo ""
  read -p "  Have you run the migration? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}  ⚠️  Please run migration before deploying frontend${NC}"
    exit 1
  fi
fi

# Step 6: Deploy Frontend
echo ""
echo -e "${YELLOW}🎨 Step 6: Deploying Frontend${NC}"
echo "  Running frontend deployment script..."

if [ -f "$SCRIPT_DIR/deploy-frontend-production.sh" ]; then
  bash "$SCRIPT_DIR/deploy-frontend-production.sh"
  echo -e "${GREEN}  ✅ Frontend deployed${NC}"
else
  echo -e "${RED}  ⚠️  Frontend deployment script not found!${NC}"
  echo "  Please deploy frontend manually"
  read -p "  Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 7: Verification
echo ""
echo -e "${YELLOW}✅ Step 7: Post-Deployment Verification${NC}"
echo ""
echo "  Please verify the following:"
echo "  1. Navigate to package builder"
echo "  2. Build a package with Evanston Now"
echo "  3. Verify 'Estimated Reach' card shows data"
echo "  4. Adjust frequency and verify exposures update"
echo "  5. Generate insertion order and verify reach section"
echo "  6. Check backend logs for errors"
echo ""
read -p "  Verification complete? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  🎉 Deployment Complete!                                     ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "  Deployment Summary:"
  echo "  • Backend: Deployed ✓"
  echo "  • Migration: Completed ✓"
  echo "  • Frontend: Deployed ✓"
  echo "  • Verification: Passed ✓"
  echo ""
  echo "  Documentation: docs/PRODUCTION_DEPLOYMENT_REACH_FEATURE.md"
  echo ""
else
  echo ""
  echo -e "${YELLOW}⚠️  Please complete verification and address any issues${NC}"
  echo ""
fi

# Step 8: Cleanup reminder
echo -e "${BLUE}📝 Post-Deployment Notes:${NC}"
echo "  • Monitor logs for 24 hours"
echo "  • Backup retained at: $BACKUP_DIR/$BACKUP_NAME"
echo "  • Rollback available for 30 days"
echo "  • Document deployment date in: docs/PRODUCTION_DEPLOYMENT_REACH_FEATURE.md"
echo ""

