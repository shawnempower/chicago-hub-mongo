#!/bin/bash

# Migration script to replace console.* statements with logger
# Usage: ./scripts/migrate-to-logger.sh

set -e

echo "🔄 Starting logger migration..."
echo ""

# Counter for files modified
FILES_MODIFIED=0

# Find all TypeScript and JavaScript files (excluding node_modules, dist, build)
find src server -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" | while read -r file; do
  
  # Check if file contains console statements
  if grep -q "console\." "$file"; then
    echo "📝 Processing: $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Check if file already imports logger
    if ! grep -q "import.*logger" "$file"; then
      # Determine import path based on file location
      if [[ $file == src/* ]]; then
        # Count directory depth to determine relative path
        DEPTH=$(echo "$file" | grep -o "/" | wc -l)
        if [[ $DEPTH -eq 1 ]]; then
          IMPORT_PATH="./utils/logger"
        elif [[ $DEPTH -eq 2 ]]; then
          IMPORT_PATH="../utils/logger"
        elif [[ $DEPTH -eq 3 ]]; then
          IMPORT_PATH="../../utils/logger"
        else
          IMPORT_PATH="../../../utils/logger"
        fi
      else
        # server files
        IMPORT_PATH="../src/utils/logger"
      fi
      
      # Add import at the top (after other imports)
      sed -i '' "/^import/a\\
const logger = createLogger('$(basename "$file" .ts)');
" "$file" 2>/dev/null || sed -i "/^import/a\\
const logger = createLogger('$(basename "$file" .ts)');" "$file"
      
      # Add the import statement
      sed -i '' "1i\\
import { createLogger } from '$IMPORT_PATH';\\
" "$file" 2>/dev/null || sed -i "1i\\
import { createLogger } from '$IMPORT_PATH';" "$file"
    fi
    
    # Replace console statements
    sed -i '' \
      -e "s/console\.error('\([^']*\):', \(error\|err\|e\));/logger.error('\1', \2);/g" \
      -e "s/console\.error('\([^']*\)', \(error\|err\|e\));/logger.error('\1', \2);/g" \
      -e "s/console\.error(\([^)]*\));/logger.error(\1);/g" \
      -e "s/console\.warn('\([^']*\)');/logger.warn('\1');/g" \
      -e "s/console\.warn(\([^)]*\));/logger.warn(\1);/g" \
      -e "s/console\.log('✅\([^']*\)');/logger.success('\1');/g" \
      -e "s/console\.log('❌\([^']*\)');/logger.failure('\1');/g" \
      -e "s/console\.log('🔍\([^']*\)');/logger.debug('\1');/g" \
      -e "s/console\.log('\([^']*\)');/logger.info('\1');/g" \
      -e "s/console\.log(\([^)]*\));/logger.info(\1);/g" \
      -e "s/console\.info(\([^)]*\));/logger.info(\1);/g" \
      -e "s/console\.debug(\([^)]*\));/logger.debug(\1);/g" \
      "$file" 2>/dev/null || \
    sed -i \
      -e "s/console\.error('\([^']*\):', \(error\|err\|e\));/logger.error('\1', \2);/g" \
      -e "s/console\.error('\([^']*\)', \(error\|err\|e\));/logger.error('\1', \2);/g" \
      -e "s/console\.error(\([^)]*\));/logger.error(\1);/g" \
      -e "s/console\.warn('\([^']*\)');/logger.warn('\1');/g" \
      -e "s/console\.warn(\([^)]*\));/logger.warn(\1);/g" \
      -e "s/console\.log('✅\([^']*\)');/logger.success('\1');/g" \
      -e "s/console\.log('❌\([^']*\)');/logger.failure('\1');/g" \
      -e "s/console\.log('🔍\([^']*\)');/logger.debug('\1');/g" \
      -e "s/console\.log('\([^']*\)');/logger.info('\1');/g" \
      -e "s/console\.log(\([^)]*\));/logger.info(\1);/g" \
      -e "s/console\.info(\([^)]*\));/logger.info(\1);/g" \
      -e "s/console\.debug(\([^)]*\));/logger.debug(\1);/g" \
      "$file"
    
    FILES_MODIFIED=$((FILES_MODIFIED + 1))
    echo "   ✅ Migrated"
  fi
done

echo ""
echo "✅ Migration complete!"
echo "📊 Files modified: $FILES_MODIFIED"
echo ""
echo "Note: Backup files (.bak) have been created."
echo "Review changes and run 'npm test' before committing."
echo ""
echo "To remove backups: find . -name '*.bak' -delete"

