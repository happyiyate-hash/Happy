/**
 * Express Router for Token Backend
 * Mounts the token handler and the lightweight mixed-asset price handler.
 */

import { Router, Request, Response } from 'express';
import { handleTokenRequest } from './tokenHandler';
import { handlePriceRequest } from './priceHandler';

export const tokenBackendRouter = Router();

// GET /api/token or GET /api/token/health -> Simple Health / Info check
tokenBackendRouter.get(['/', '/health'], async (_req: Request, res: Response) => {
  const response = await handleTokenRequest({ action: 'health' });
  return res.status(200).json(response);
});

// POST /api/token or POST /api/token/ -> Main Token Action Gateway
tokenBackendRouter.post(['/', '/token'], async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const action = String(body.action || body.key || '').trim();
    const response = action === 'price'
      ? await handlePriceRequest(body)
      : await handleTokenRequest(body);
    const resAny = response as any;
    const statusCode = response.success === false && resAny.error && !resAny.saved ? 400 : 200;
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

// POST /submit or /api/token/submit -> Dedicated Single Token Save Endpoint
tokenBackendRouter.post(['/submit', '/token/submit'], async (req: Request, res: Response) => {
  try {
    const payload = {
      action: 'submit',
      ...(req.body || {}),
    };
    const response = await handleTokenRequest(payload);
    const statusCode = response.success === false ? 400 : 200;
    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('[Token Backend Submit] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error?.message || 'Failed to submit token.',
    });
  }
});

// POST /verifyTokensBatch -> Dedicated Verify Batch Endpoint
tokenBackendRouter.post('/verifyTokensBatch', async (req: Request, res: Response) => {
  try {
    const payload = {
      action: 'verifyTokensBatch',
      ...(req.body || {}),
    };
    const response = await handleTokenRequest(payload);
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Token Backend Verify] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error?.message || 'Failed to verify tokens batch.',
    });
  }
});

// POST /batchSaveTokens -> Dedicated Batch Save Endpoint
tokenBackendRouter.post('/batchSaveTokens', async (req: Request, res: Response) => {
  try {
    const payload = {
      action: 'batchSaveTokens',
      ...(req.body || {}),
    };
    const response = await handleTokenRequest(payload);
    const statusCode = response.success === false ? 400 : 200;
    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('[Token Backend BatchSave] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error?.message || 'Failed to batch save tokens.',
    });
  }
});

