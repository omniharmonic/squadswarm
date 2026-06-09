/**
 * Minimal structured logger.
 *
 * `debug` is suppressed in production so verbose development tracing doesn't end
 * up in production logs. `warn`/`error` always emit. Swap the sink for Sentry/
 * pino here without touching call sites. Never log secrets or bearer tokens.
 */
const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProd) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (!isProd) console.info(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
