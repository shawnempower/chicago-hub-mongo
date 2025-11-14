/**
 * Centralized Logger Utility
 * 
 * Provides environment-aware logging with multiple log levels.
 * In production, only logs warnings and errors by default.
 * In development, logs everything.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  level: LogLevel;
  includeTimestamp: boolean;
  includeContext: boolean;
  colorize: boolean;
}

class Logger {
  private config: LoggerConfig;
  private context: string = 'App';

  constructor() {
    // Default configuration based on environment
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    this.config = {
      level: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
      includeTimestamp: true,
      includeContext: true,
      colorize: isDevelopment && typeof window === 'undefined' // Only in Node.js dev
    };

    // Allow override via environment variable
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.config.level = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  /**
   * Create a logger instance with a specific context
   */
  public createLogger(context: string): ContextLogger {
    return new ContextLogger(context, this.config);
  }

  /**
   * Update global logger configuration
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Global logging methods
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, this.context, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, this.context, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, this.context, message, ...args);
  }

  public error(message: string, error?: any, ...args: any[]): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, this.context, message, error.message, error.stack, ...args);
    } else {
      this.log(LogLevel.ERROR, this.context, message, error, ...args);
    }
  }

  private log(level: LogLevel, context: string, message: string, ...args: any[]): void {
    if (level < this.config.level) {
      return; // Skip logs below configured level
    }

    const parts: string[] = [];

    // Timestamp
    if (this.config.includeTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    // Log level
    const levelName = LogLevel[level];
    if (this.config.colorize && typeof window === 'undefined') {
      parts.push(this.colorize(levelName, level));
    } else {
      parts.push(`[${levelName}]`);
    }

    // Context
    if (this.config.includeContext && context) {
      parts.push(`[${context}]`);
    }

    // Message
    parts.push(message);

    // Combine all parts
    const logMessage = parts.join(' ');

    // Choose appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(logMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, ...args);
        break;
    }
  }

  private colorize(text: string, level: LogLevel): string {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = colors[level] || reset;
    return `${color}[${text}]${reset}`;
  }
}

/**
 * Context-specific logger instance
 */
export class ContextLogger {
  constructor(
    private context: string,
    private config: LoggerConfig
  ) {}

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message: string, error?: any, ...args: any[]): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, error.message, error.stack, ...args);
    } else {
      this.log(LogLevel.ERROR, message, error, ...args);
    }
  }

  /**
   * Log with emoji prefix for important messages
   */
  public success(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, `✅ ${message}`, ...args);
  }

  public failure(message: string, error?: any, ...args: any[]): void {
    this.error(`❌ ${message}`, error, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.config.level) {
      return;
    }

    const parts: string[] = [];

    // Timestamp
    if (this.config.includeTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    // Log level
    const levelName = LogLevel[level];
    if (this.config.colorize && typeof window === 'undefined') {
      parts.push(this.colorize(levelName, level));
    } else {
      parts.push(`[${levelName}]`);
    }

    // Context
    if (this.config.includeContext && this.context) {
      parts.push(`[${this.context}]`);
    }

    // Message
    parts.push(message);

    const logMessage = parts.join(' ');

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(logMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, ...args);
        break;
    }
  }

  private colorize(text: string, level: LogLevel): string {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m',
      [LogLevel.INFO]: '\x1b[32m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.ERROR]: '\x1b[31m',
    };
    const reset = '\x1b[0m';
    const color = colors[level] || reset;
    return `${color}[${text}]${reset}`;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience method for creating context loggers
export const createLogger = (context: string): ContextLogger => {
  return logger.createLogger(context);
};

// Default export
export default logger;

