/**
 * Token verification entrypoint.
 *
 * The previous implementation contained simulated provider responses and
 * fabricated fallback market/security values. Those values could make an
 * unverified or worthless token appear approved. Keep this compatibility
 * entrypoint so existing imports continue to work, but route verification to
 * the strict live-provider implementation instead.
 */
export { verifyToken } from './strictVerificationEngine';
export type { VerificationReport } from './strictVerificationEngine';
