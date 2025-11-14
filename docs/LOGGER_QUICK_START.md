# Logger - Quick Start

## 🚀 Use in New Code

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyModule');

logger.debug('Detailed debug info');     // Dev only
logger.info('General information');      // Dev only  
logger.warn('Warning message');          // Always
logger.error('Error occurred', error);   // Always
logger.success('✅ Operation succeeded'); // Dev only
logger.failure('❌ Operation failed', error); // Always
```

## 🔄 Migrate Existing Code

### Auto-migrate all files:
```bash
./scripts/migrate-to-logger.sh
```

### Manual migration:
```typescript
// Before
console.log('User logged in');
console.error('Failed:', error);

// After
import { createLogger } from '@/utils/logger';
const logger = createLogger('AuthService');

logger.info('User logged in');
logger.error('Failed', error);
```

## ⚙️ Configuration

```bash
# Development (default)
NODE_ENV=development  # Shows: DEBUG, INFO, WARN, ERROR

# Production (default)
NODE_ENV=production   # Shows: WARN, ERROR only

# Custom level (overrides NODE_ENV)
LOG_LEVEL=DEBUG       # Show everything
LOG_LEVEL=INFO        # INFO, WARN, ERROR
LOG_LEVEL=WARN        # WARN, ERROR only
LOG_LEVEL=ERROR       # ERROR only
LOG_LEVEL=NONE        # Disable all logs
```

## 📊 Current Status

- ✅ Logger utility created
- ✅ Migration script ready
- ✅ Documentation complete
- ✅ Example migrations done (50 statements)
- ⏳ Remaining to migrate: 1,077 statements

## 📖 Full Documentation

- **Complete Guide**: `docs/LOGGER.md`
- **Migration Summary**: `docs/LOGGER_MIGRATION_SUMMARY.md`
- **Source Code**: `src/utils/logger.ts`

