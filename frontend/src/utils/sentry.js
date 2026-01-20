/**
 * Sentry Error Tracking Configuration
 * 
 * To enable Sentry:
 * 1. Install @sentry/react: npm install @sentry/react
 * 2. Set SENTRY_DSN in your .env file
 * 3. Replace this file with the actual Sentry implementation
 */

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    console.log('[Sentry] SENTRY_DSN configured but @sentry/react not installed');
    console.log('[Sentry] Run: npm install @sentry/react');
  }
};

export const captureException = (error, context = {}) => {
  console.error('[Error]', error, context);
};

export const captureMessage = (message, level = 'info', context = {}) => {
  console.log(`[${level.toUpperCase()}]`, message, context);
};