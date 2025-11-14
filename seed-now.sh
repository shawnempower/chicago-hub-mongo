#!/bin/bash
# Quick seed script - seeds all 4 algorithms via API

API="http://localhost:5001/api/admin/algorithms"

# Get token from user
if [ -z "$1" ]; then
  echo "Usage: ./seed-now.sh YOUR_AUTH_TOKEN"
  echo ""
  echo "To get your token:"
  echo "1. Open browser console (F12)"
  echo "2. Run: localStorage.getItem('auth_token')"
  echo "3. Copy the token"
  echo "4. Run: ./seed-now.sh 'your-token-here'"
  exit 1
fi

TOKEN="$1"

echo "🌱 Seeding algorithms via API..."
echo "📡 Server: http://localhost:5001"
echo ""

# Algorithm 1: All-Inclusive
echo "1/4 Seeding All-Inclusive Strategy..."
curl -s -X PUT "$API/all-inclusive" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"algorithmId":"all-inclusive","name":"All-Inclusive Strategy","description":"Maximizes reach by including as many publications as possible within budget","icon":"🌍","isActive":true,"isDefault":true,"llmConfig":{"model":{"maxTokens":16000,"temperature":0.7},"pressForward":{"enforceAllOutlets":true,"prioritizeSmallOutlets":false,"allowBudgetExceeding":false,"maxBudgetExceedPercent":0},"selection":{"maxPublications":50,"diversityWeight":0.3}},"constraints":{"strictBudget":false,"maxBudgetExceedPercent":5,"maxPublications":50,"maxPublicationPercent":0.25,"minPublicationSpend":500,"pruningPassesMax":3}}' \
  | grep -q success && echo "   ✅ Success" || echo "   ⚠️  Check if already exists"

# Algorithm 2: Budget-Friendly
echo "2/4 Seeding Budget-Friendly Strategy..."
curl -s -X PUT "$API/budget-friendly" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"algorithmId":"budget-friendly","name":"Budget-Friendly Strategy","description":"Maximizes value by focusing on cost-effective publications and channels","icon":"💰","isActive":true,"isDefault":false,"llmConfig":{"model":{"maxTokens":16000,"temperature":0.7},"pressForward":{"enforceAllOutlets":false,"prioritizeSmallOutlets":false,"allowBudgetExceeding":false,"maxBudgetExceedPercent":0},"selection":{"maxPublications":30,"diversityWeight":0.2}},"constraints":{"strictBudget":true,"maxBudgetExceedPercent":0,"maxPublications":30,"maxPublicationPercent":0.25,"minPublicationSpend":500,"pruningPassesMax":3},"scoring":{"costEfficiencyWeight":0.4,"reachWeight":0.3,"diversityWeight":0.3}}' \
  | grep -q success && echo "   ✅ Success" || echo "   ⚠️  Check if already exists"

# Algorithm 3: Little Guys
echo "3/4 Seeding Little Guys First..."
curl -s -X PUT "$API/little-guys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"algorithmId":"little-guys","name":"Little Guys First","description":"Prioritizes smaller, community-focused publications and alternative media","icon":"🏘️","isActive":true,"isDefault":false,"llmConfig":{"model":{"maxTokens":16000,"temperature":0.7},"pressForward":{"enforceAllOutlets":true,"prioritizeSmallOutlets":true,"allowBudgetExceeding":false,"maxBudgetExceedPercent":0},"selection":{"maxPublications":40,"minPublications":10,"diversityWeight":0.4}},"constraints":{"strictBudget":false,"maxBudgetExceedPercent":5,"maxPublications":40,"minPublications":10,"maxPublicationPercent":0.20,"minPublicationSpend":300,"pruningPassesMax":3}}' \
  | grep -q success && echo "   ✅ Success" || echo "   ⚠️  Check if already exists"

# Algorithm 4: Proportional
echo "4/4 Seeding Size-Weighted Distribution..."
curl -s -X PUT "$API/proportional" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"algorithmId":"proportional","name":"Size-Weighted Distribution","description":"Allocates budget proportionally based on publication size and reach","icon":"📊","isActive":true,"isDefault":false,"llmConfig":{"model":{"maxTokens":16000,"temperature":0.7},"pressForward":{"enforceAllOutlets":false,"prioritizeSmallOutlets":false,"allowBudgetExceeding":false,"maxBudgetExceedPercent":0},"selection":{"maxPublications":20,"diversityWeight":0.2}},"constraints":{"strictBudget":true,"maxBudgetExceedPercent":0,"maxPublications":20,"maxPublicationPercent":0.25,"minPublicationSpend":500,"pruningPassesMax":3},"scoring":{"sizeWeight":0.5,"reachWeight":0.3,"diversityWeight":0.2}}' \
  | grep -q success && echo "   ✅ Success" || echo "   ⚠️  Check if already exists"

echo ""
echo "✨ Seeding complete!"
echo ""
echo "📋 Verify:"
echo "   1. Go to /admin → Algorithms tab"
echo "   2. Should see 4 algorithms listed"
echo ""

