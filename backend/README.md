# TokenCare token-save backend

This backend is the single server-side boundary for donating/saving one token.
It is intentionally kept in `backend/` so it can be edited and redeployed without using a Supabase Edge Function.

## Flow

1. Receive `{ user_id, ...tokenJson }` or `{ user_id, token: {...} }`.
2. Require a Supabase access token and verify it belongs to `user_id`.
3. Check the user's Cloudflare token cache.
4. Check the global Cloudflare token directory.
5. If either contains the token, return HTTP 409 `Token already exists` and perform no writes/reward.
6. Save the exact token JSON to the user Cloudflare worker under `user_id`.
7. Save the clean token JSON to the global Cloudflare worker.
8. Credit exactly **5 TC** to `profiles.total_reward_balance` and `profiles.unclaimed_reward_balance`.
9. Insert the reward ledger record and notification through the `grant_token_donation_reward` database function.
10. Return the same notification details to the app.

## Vercel endpoint

`POST /api/save-token`

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose it to the app)
- `USER_TOKEN_WORKER_URL` (defaults to the existing user worker)
- `GLOBAL_TOKEN_WORKER_URL` (defaults to the existing global worker)
- `TOKEN_BACKEND_TIMEOUT_MS` (optional)

No DELETE endpoint is implemented.
