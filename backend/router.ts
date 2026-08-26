/**
 * Express Router for Token Backend
 * Mounts the tokenHandler to /api/token, /api/save-token, and /api routes.
 */

import { Router, Request, Response } from 'express';
import { handleTokenRequest } from './tokenHandler';

export const tokenBackendRouter = Router();

// GET /api/token or GET /api/token/health -> Simple Health / Info check
tokenBackendRouter.get(['/', '/health'], async (_req: Request, res: Response) => {
  const response = await handleTokenRequest({ action: 'health' });
  return res.status(200).json(response);
});

// POST /api/token or POST /api/token/ -> Main Token Action Gateway
tokenBackendRouter.post(['/', '/token'], async (req: Request, res: Response) => {
  try {
    const response = await handleTokenRequest(req.body || {});
    const statusCode = response.success === false && response.error && !response.saved ? 400 : 200;
    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('[Token Backend Router] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error?.message || 'An unexpected error occurred in token backend.',
    });
  }
});

// POST /api/save-token -> Dedicated Save Token Endpoint
tokenBackendRouter.post('/save-token', async (req: Request, res: Response) => {
  try {
    const payload = {
      action: 'saveToken',
      ...(req.body || {}),
    };
    const response = await handleTokenRequest(payload);
    const statusCode = response.success === false ? 400 : 200;
    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('[Token Backend Save] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error?.message || 'Failed to process save-token request.',
    });
  }
});
