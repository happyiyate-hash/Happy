/**
 * Backend Configuration
 * Reads environment variables for Vercel, Cloudflare, and Supabase endpoints with resilient fallbacks.
 */

export const config = {
  // Remote Vercel Token API URL (e.g., https://token-save-backend.vercel.app/api)
  vercelBackendUrl:
    process.env.VERCEL_TOKEN_BACKEND_URL ||
    process.env.VERCEL_TOKEN_GATEWAY_URL ||
    'https://token-save-backend.vercel.app/api',

  // Remote Cloudflare Worker URL
  cloudflareWorkerUrl:
    process.env.CLOUDFLARE_WORKER_URL ||
    process.env.GLOBAL_TOKEN_WORKER_URL ||
    'https://rough-meadow-6435.happyiyate.workers.dev/',

  globalWorkerUrl:
    process.env.GLOBAL_TOKEN_WORKER_URL ||
    process.env.CLOUDFLARE_WORKER_URL ||
    'https://rough-meadow-6435.happyiyate.workers.dev/',

  userWorkerUrl:
    process.env.USER_TOKEN_WORKER_URL ||
    'https://tokencare-tokens-service.happyiyate.workers.dev',

  supabaseUrl:
    process.env.SUPABASE_URL ||
    'https://pqqomaveycjeorgurpev.supabase.co',

  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Toggle whether to proxy to remote Vercel/Cloudflare or respond locally
  forwardToRemote: process.env.FORWARD_TO_REMOTE === 'true',

  // Request timeout in milliseconds
  requestTimeoutMs: Number(process.env.BACKEND_REQUEST_TIMEOUT_MS || process.env.TOKEN_BACKEND_TIMEOUT_MS || 8000),
};

export const BACKEND_CONFIG = config;

