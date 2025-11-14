#!/bin/bash
# Seed algorithms using curl (requires server running)

echo "🌱 Seeding algorithms via API..."
echo ""
echo "Prerequisites:"
echo "1. Server must be running (npm run dev)"
echo "2. You must be logged in as admin"
echo ""
read -p "Enter your auth token (from localStorage.getItem('auth_token')): " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ No token provided"
  exit 1
fi

API="http://localhost:5001/api/admin/algorithms"

# Algorithm 1: All-Inclusive
echo ""
echo "📝 Seeding All-Inclusive..."
curl -X PUT "$API/all-inclusive" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithmId": "all-inclusive",
    "name": "All-Inclusive Strategy",
    "description": "Maximizes reach by including as many publications as possible within budget",
    "icon": "🌍",
    "isActive": true,
    "isDefault": true,
    "llmConfig": {
      "model": { "maxTokens": 16000, "temperature": 0.7 },
      "pressForward": { "enforceAllOutlets": true, "prioritizeSmallOutlets": false, "allowBudgetExceeding": false, "maxBudgetExceedPercent": 0 },
      "selection": { "maxPublications": 50, "diversityWeight": 0.3 }
    },
    "constraints": {
      "strictBudget": false,
      "maxBudgetExceedPercent": 5,
      "maxPublications": 50,
      "maxPublicationPercent": 0.25,
      "minPublicationSpend": 500,
      "pruningPassesMax": 3
    }
  }'

# Algorithm 2: Budget-Friendly
echo ""
echo "📝 Seeding Budget-Friendly..."
curl -X PUT "$API/budget-friendly" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithmId": "budget-friendly",
    "name": "Budget-Friendly Strategy",
    "description": "Maximizes value by focusing on cost-effective publications and channels",
    "icon": "💰",
    "isActive": true,
    "isDefault": false,
    "llmConfig": {
      "model": { "maxTokens": 16000, "temperature": 0.7 },
      "pressForward": { "enforceAllOutlets": false, "prioritizeSmallOutlets": false, "allowBudgetExceeding": false, "maxBudgetExceedPercent": 0 },
      "selection": { "maxPublications": 30, "diversityWeight": 0.2 }
    },
    "constraints": {
      "strictBudget": true,
      "maxBudgetExceedPercent": 0,
      "maxPublications": 30,
      "maxPublicationPercent": 0.25,
      "minPublicationSpend": 500,
      "pruningPassesMax": 3
    },
    "scoring": { "costEfficiencyWeight": 0.4, "reachWeight": 0.3, "diversityWeight": 0.3 }
  }'

# Algorithm 3: Little Guys
echo ""
echo "📝 Seeding Little Guys..."
curl -X PUT "$API/little-guys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithmId": "little-guys",
    "name": "Little Guys First",
    "description": "Prioritizes smaller, community-focused publications and alternative media",
    "icon": "🏘️",
    "isActive": true,
    "isDefault": false,
    "llmConfig": {
      "model": { "maxTokens": 16000, "temperature": 0.7 },
      "pressForward": { "enforceAllOutlets": true, "prioritizeSmallOutlets": true, "allowBudgetExceeding": false, "maxBudgetExceedPercent": 0 },
      "selection": { "maxPublications": 40, "minPublications": 10, "diversityWeight": 0.4 }
    },
    "constraints": {
      "strictBudget": false,
      "maxBudgetExceedPercent": 5,
      "maxPublications": 40,
      "minPublications": 10,
      "maxPublicationPercent": 0.20,
      "minPublicationSpend": 300,
      "pruningPassesMax": 3
    }
  }'

# Algorithm 4: Proportional
echo ""
echo "📝 Seeding Proportional..."
curl -X PUT "$API/proportional" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithmId": "proportional",
    "name": "Size-Weighted Distribution",
    "description": "Allocates budget proportionally based on publication size and reach",
    "icon": "📊",
    "isActive": true,
    "isDefault": false,
    "llmConfig": {
      "model": { "maxTokens": 16000, "temperature": 0.7 },
      "pressForward": { "enforceAllOutlets": false, "prioritizeSmallOutlets": false, "allowBudgetExceeding": false, "maxBudgetExceedPercent": 0 },
      "selection": { "maxPublications": 20, "diversityWeight": 0.2 }
    },
    "constraints": {
      "strictBudget": true,
      "maxBudgetExceedPercent": 0,
      "maxPublications": 20,
      "maxPublicationPercent": 0.25,
      "minPublicationSpend": 500,
      "pruningPassesMax": 3
    },
    "scoring": { "sizeWeight": 0.5, "reachWeight": 0.3, "diversityWeight": 0.2 }
  }'

echo ""
echo ""
echo "✨ Done! Check /admin → Algorithms to verify all 4 are there."
