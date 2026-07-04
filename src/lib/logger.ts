// ============================================================
// Structured Logging System
// JSON in production, pretty-printed with ANSI colors in dev
// No external dependencies
// ============================================================

export interface LogContext {
  brandId?: string;
  userId?: string;
  orderId?: string;
  branchId?: string;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const MIN_LEVEL: LogLevel = (() => {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVEL_PRIORITY) return env as LogLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
})();

// ANSI color codes
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

const isDev = process.env.NODE_ENV !== 'production';

function isErrorLike(value: unknown): value is Error {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    ('message' in value || 'stack' in value)
  );
}

function serializeError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isDev ? error.stack : undefined,
    };
  }
  if (isErrorLike(error)) {
    const obj = error as Record<string, unknown>;
    return {
      name: (obj.name as string) ?? 'Error',
      message: String(obj.message ?? 'Unknown error'),
      stack: isDev ? (obj.stack as string) ?? undefined : undefined,
    };
  }
  return {
    name: 'UnknownError',
    message: String(error),
  };
}

function formatPretty(entry: LogEntry): string {
  const color = COLORS[entry.level];
  const levelPad = entry.level.toUpperCase().padEnd(5);
  const ts = entry.timestamp.replace('T', ' ').replace('Z', '');
  const parts = [
    `${DIM}${ts}${RESET}`,
    `${color}${BOLD}${levelPad}${RESET}`,
    entry.message,
  ];

  if (entry.duration !== undefined) {
    parts.push(`${DIM}${entry.duration}ms${RESET}`);
  }

  if (entry.context && Object.keys(entry.context).length > 0) {
    const ctx = Object.entries(entry.context)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
    parts.push(`${DIM}[${ctx}]${RESET}`);
  }

  if (entry.error) {
    parts.push(`\n  ${COLORS.error}${entry.error.name ?? 'Error'}: ${entry.error.message}${RESET}`);
    if (entry.error.stack) {
      const stackLines = entry.error.stack.split('\n').slice(1, 4);
      for (const line of stackLines) {
        parts.push(`\n  ${DIM}${line.trim()}${RESET}`);
      }
    }
  }

  return parts.join(' ');
}

function emit(entry: LogEntry): void {
  if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[MIN_LEVEL]) return;

  const output = isDev ? formatPretty(entry) : JSON.stringify(entry);

  switch (entry.level) {
    case 'debug':
    case 'info':
      process.stdout.write(output + '\n');
      break;
    case 'warn':
      process.stderr.write(output + '\n');
      break;
    case 'error':
    case 'fatal':
      process.stderr.write(output + '\n');
      break;
  }
}

function buildEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
  duration?: number,
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }
  if (error !== undefined && error !== null) {
    entry.error = serializeError(error);
  }
  if (duration !== undefined) {
    entry.duration = duration;
  }
  return entry;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, error?: unknown): void;
  fatal(message: string, context?: LogContext, error?: unknown): void;
  time(label: string): () => number;
  child(context: LogContext): Logger;
}

function createLogger(boundContext?: LogContext): Logger {
  const mergedContext = boundContext && Object.keys(boundContext).length > 0
    ? { ...boundContext }
    : undefined;

  return {
    debug(message: string, context?: LogContext): void {
      emit(buildEntry('debug', message, mergeContexts(mergedContext, context)));
    },
    info(message: string, context?: LogContext): void {
      emit(buildEntry('info', message, mergeContexts(mergedContext, context)));
    },
    warn(message: string, context?: LogContext): void {
      emit(buildEntry('warn', message, mergeContexts(mergedContext, context)));
    },
    error(message: string, context?: LogContext, error?: unknown): void {
      emit(buildEntry('error', message, mergeContexts(mergedContext, context), error));
    },
    fatal(message: string, context?: LogContext, error?: unknown): void {
      emit(buildEntry('fatal', message, mergeContexts(mergedContext, context), error));
    },
    time(label: string): () => number {
      const start = performance.now();
      return () => {
        const duration = Math.round((performance.now() - start) * 100) / 100;
        emit(buildEntry('info', `${label}`, mergeContexts(mergedContext), undefined, duration));
        return duration;
      };
    },
    child(context: LogContext): Logger {
      return createLogger(mergeContexts(mergedContext, context));
    },
  };
}

function mergeContexts(a?: LogContext, b?: LogContext): LogContext | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

export const logger: Logger = createLogger();

// ─── Global error handlers ────────────────────────────────────

if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err: Error) => {
    logger.fatal('Uncaught exception', undefined, err);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal('Unhandled rejection', undefined, reason);
  });
}