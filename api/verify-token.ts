import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../backend/tokenVerifier';

function normalizeBlockchainInput(value: unknown): string {
  const clean = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (['solana', 'sol', 'mainnetbeta', 'solanamainnet', 'metadata'].includes(clean)) return 'solana';
  if (['tron', 'trx'].includes(clean)) return 'tron';
  if (['ton', 'tonnetwork'].includes(clean)) return 'ton';
  if (['xrpl', 'xrp', 'ripple'].includes(clean)) return 'xrpl';
  return String(value ?? '').trim();
}

function normalizeChainId(value: unknown, blockchain: string): string | number | undefined {
  const clean = String(value ?? '').trim().toLowerCase();
  if (blockchain === 'solana' && ['metadata', 'sol', 'solana', 'mainnet-beta', 'mainnetbeta'].includes(clean)) return 'solana';
  if (blockchain === 'tron' && ['metadata', 'trx', 'tron'].includes(clean)) return 'tron';
  if (blockchain === 'ton' && ['metadata', 'ton', 'ton-network'].includes(clean)) return 'ton';
  if (blockchain === 'xrpl' && ['metadata', 'xrp', 'xrpl', 'ripple'].includes(clean)) return 'xrpl';
  return value as string | number | undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });

  try {
    const body = req.body || {};
    const rawBlockchain = body.blockchain || body.chain;
    const blockchain = normalizeBlockchainInput(rawBlockchain);
    const chainId = normalizeChainId(body.chainId, blockchain);

    const result = await verifyToken({
      blockchain,
      chain: blockchain,
      chainId,
      contractAddress: body.contractAddress,
      name: body.name,
      symbol: body.symbol,
      decimals: body.decimals,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_EXCEPTION',
        message: error instanceof Error ? error.message : 'Unexpected verification error.',
      },
    });
  }
}
