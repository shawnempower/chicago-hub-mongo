# Logger Utility Documentation

## Overview

The logger utility provides environment-aware logging with multiple log levels, replacing inconsistent `console.*` statements throughout the codebase.

## Features

- **Environment-aware**: Debug logs only show in development
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Contextual logging**: Each module can have its own logger with context
- **Colorized output**: Color-coded log levels in terminal (development only)
- **Timestamps**: Automatic timestamp prefixing
- **Type-safe**: Full TypeScript support

## Quick Start

### Basic Usage

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyComponent');

logger.debug('Debugging information'); // Only in development
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred', error);
```

### With Success/Failure Helpers

```typescript
// Success (green checkmark)
logger.success('User created successfully');

// Failure (red X)
logger.failure('Failed to create user', error);
```

## Log Levels

| Level | When to Use | Production | Development |
|-------|-------------|------------|-------------|
| `DEBUG` | Detailed debugging info | Hidden | Visible |
| `INFO` | General information | Hidden | Visible |
| `WARN` | Warning messages | Visible | Visible |
| `ERROR` | Error messages | Visible | Visible |

## Configuration

### Environment Variables

```bash
# Set log level (overrides defaults)
LOG_LEVEL=DEBUG  # Show all logs
LOG_LEVEL=INFO   # Show info, warn, error
LOG_LEVEL=WARN   # Show only warn and error
LOG_LEVEL=ERROR  # Show only errors
LOG_LEVEL=NONE   # Disable all logs
```

### Programmatic Configuration

```typescript
import logger from '@/utils/logger';

logger.configure({
  level: LogLevel.DEBUG,
  includeTimestamp: true,
  includeContext: true,
  colorize: false
});
```

## Migration from console.*

### Automatic Migration

Run the migration script to automatically replace all `console.*` statements:

```bash
./scripts/migrate-to-logger.sh
```

This will:
1. Find all TypeScript/JavaScript files
2. Add logger imports where needed
3. Replace console statements with logger equivalents
4. Create backup files (.bak)

### Manual Migration

**Before:**
```typescript
console.log('User logged in');
console.error('Failed to save', error);
console.warn('Deprecated API');
```

**After:**
```typescript
import { createLogger } from '@/utils/logger';
const logger = createLogger('AuthService');

logger.info('User logged in');
logger.error('Failed to save', error);
logger.warn('Deprecated API');
```

## Best Practices

### 1. Don't Log What You Return

```typescript
// ❌ Bad: Redundant - error is already in the response
try {
  const user = await db.users.findById(id);
  res.json({ user });
} catch (error) {
  logger.error('Failed to fetch user', error); // Redundant!
  res.status(500).json({ error: 'Failed to fetch user' });
}

// ✅ Good: Response is enough
try {
  const user = await db.users.findById(id);
  res.json({ user });
} catch (error) {
  res.status(500).json({ error: 'Failed to fetch user' });
}
```

### 2. Log Only What Matters

```typescript
// ✅ Good: Important state changes
logger.info('User promoted to admin', userId);
logger.warn('Payment retry attempt 3 of 3', orderId);
logger.debug('Auth attempt for', email); // Helpful for debugging

// ❌ Bad: Obvious or redundant
logger.info('Function called'); // No value
logger.error('Error occurred', error); // Already handling it
```

### 3. Create Context-Specific Loggers

```typescript
// ✅ Good: Specific context
const logger = createLogger('UserService');
const logger = createLogger('PaymentProcessor');

// ❌ Bad: Generic context
const logger = createLogger('App');
```

### 4. Use Appropriate Log Levels

```typescript
// ✅ Good: Appropriate levels
logger.debug('Cache hit for user:', userId);
logger.info('Background job completed:', jobId);
logger.warn('Rate limit approaching:', remaining);

// ❌ Bad: Wrong levels
logger.error('User clicked button'); // Not an error!
logger.debug('Payment failed'); // Should be error!
```

## Examples

### Service Class

```typescript
import { createLogger } from '@/utils/logger';

export class UserService {
  private logger = createLogger('UserService');

  async createUser(data: CreateUserData) {
    this.logger.debug('Creating user with data:', data);
    
    try {
      const user = await this.db.users.create(data);
      this.logger.success('User created:', user.id);
      return user;
    } catch (error) {
      this.logger.failure('Failed to create user', error);
      throw error;
    }
  }
}
```

### API Route

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserRoutes');

router.post('/users', async (req, res) => {
  logger.debug('Received user creation request');
  
  try {
    const user = await userService.create(req.body);
    logger.info('User created successfully:', user.id);
    res.json({ user });
  } catch (error) {
    logger.error('User creation failed', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});
```

### React Component

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserDashboard');

export function UserDashboard() {
  useEffect(() => {
    logger.debug('UserDashboard mounted');
    
    return () => {
      logger.debug('UserDashboard unmounted');
    };
  }, []);

  const handleSubmit = async (data: FormData) => {
    logger.info('Form submitted');
    
    try {
      await api.submitForm(data);
      logger.success('Form submitted successfully');
    } catch (error) {
      logger.failure('Form submission failed', error);
    }
  };

  return <div>...</div>;
}
```

## Output Examples

### Development

```
[2025-11-14T20:00:00.000Z] [DEBUG] [UserService] Creating user with data: {...}
[2025-11-14T20:00:00.123Z] [INFO] [UserService] ✅ User created: 123
[2025-11-14T20:00:01.000Z] [WARN] [RateLimit] Rate limit approaching: 10 requests remaining
[2025-11-14T20:00:02.000Z] [ERROR] [Database] Connection failed: ECONNREFUSED
```

### Production

```
[2025-11-14T20:00:01.000Z] [WARN] [RateLimit] Rate limit approaching: 10 requests remaining
[2025-11-14T20:00:02.000Z] [ERROR] [Database] Connection failed: ECONNREFUSED
```

## Troubleshooting

### Logs not appearing

Check your log level:
```typescript
import logger from '@/utils/logger';
console.log('Current log level:', logger.getConfig().level);
```

### Too many logs in production

Set `LOG_LEVEL=ERROR` in production:
```bash
export LOG_LEVEL=ERROR
```

### Want to see debug logs in production

Temporarily enable:
```bash
export LOG_LEVEL=DEBUG
```

## Migration Status

- ✅ `src/integrations/mongodb/authService.ts` (21 statements)
- ✅ `server/routes/admin.ts` (29 statements)
- ⏳ Remaining files: ~883 statements

Run `./scripts/migrate-to-logger.sh` to migrate all remaining files.

## Performance

The logger is designed to be lightweight:
- Minimal overhead in production (only warnings and errors)
- No file I/O by default
- Efficient string concatenation
- Lazy evaluation of log arguments

## Future Enhancements

Potential improvements:
- File logging support
- Log rotation
- Remote logging (e.g., Sentry, CloudWatch)
- Structured logging (JSON format)
- Request ID tracking
- Performance metrics

