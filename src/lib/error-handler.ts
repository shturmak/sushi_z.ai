// ============================================================
// Centralized Error Handler
// Wraps API route handlers with structured error logging
// Optional Telegram alert & Sentry integration
// ============================================================

import { logger, type LogContext } from '@/lib/logger';

function isFatalError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('database') ||
      msg.includes('out of memory') ||
      msg.includes('too many') ||
      msg.includes('permission denied')
    );
  }
  return false;
}

/**
 * Fire-and-forget: send alert to Telegram if env vars are configured.
 */
async function sendTelegramAlert(message: string, context?: LogContext, error?: unknown): Promise<void> {
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  const botToken = process.env.TELEGRAM_ALERT_BOT_TOKEN;
  if (!chatId || !botToken) return;

  try {
    let text = `🚨 <b>SushiChain Error Alert</b>\n\n`;
    text += `<code>${escapeHtml(message)}</code>\n`;

    if (context) {
      const ctxParts = Object.entries(context)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join('\n');
      if (ctxParts) text += `\n<b>Context:</b>\n${ctxParts}\n`;
    }

    if (error instanceof Error) {
      text += `\n<b>Error:</b> ${escapeHtml(error.message)}`;
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(0, 5).join('\n');
        text += `\n\n<code>${escapeHtml(stackLines)}</code>`;
      }
    } else if (error !== undefined && error !== null) {
      text += `\n<b>Error:</b> ${escapeHtml(String(error))}`;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (sendErr) {
    // Never let alerting failures bubble up — just log locally
    logger.error('Failed to send Telegram alert', undefined, sendErr);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Log and optionally send alert for critical errors.
 * Fire-and-forget — does not block the caller.
 */
export function reportError(error: unknown, context?: LogContext): void {
  const fatal = isFatalError(error);
  const level = fatal ? 'fatal' : 'error';
  const message = error instanceof Error ? error.message : String(error);

  if (fatal) {
    logger.fatal(message, context, error);
  } else {
    logger.error(message, context, error);
  }

  // Sentry integration — just log if DSN is configured (no actual Sentry import)
  if (process.env.SENTRY_DSN) {
    logger.info('Would send to Sentry (SENTRY_DSN is configured)', {
      ...context,
      sentryErrorName: error instanceof Error ? error.name : undefined,
      sentryErrorMessage: message,
    });
  }

  // Telegram alert (fire-and-forget)
  void sendTelegramAlert(message, context, error);
}

/**
 * Wrap an API route handler with structured error logging.
 * Re-throws so the caller can still return an error response.
 */
export async function withErrorLogging<T>(
  handler: () => Promise<T>,
  context?: LogContext,
): Promise<T> {
  try {
    return await handler();
  } catch (error: unknown) {
    reportError(error, context);
    throw error;
  }
}