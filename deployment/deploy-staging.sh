#!/bin/bash

# Legacy script - maintained for backward compatibility
# This script now calls the new deploy-backend-staging.sh

echo "⚠️  Note: deploy-staging.sh is deprecated"
echo "   Use: ./deployment/deploy-backend-staging.sh instead"
echo ""
echo "   Redirecting to new script..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/deploy-backend-staging.sh" "$@"
