/**
 * Backend Entry Point
 * Exports all router, handler, configuration, and store modules.
 */

export * from './config';
export * from './tokenStore';
export * from './tokenHandler';
export * from './router';

// Legacy helper compatibility if imported elsewhere
export async function uploadToken(tokenData: any, _authHeader?: string) {
  const { handleTokenRequest } = await import('./tokenHandler');
  return handleTokenRequest({
    action: 'saveToken',
    tokens: [tokenData],
  });
}
