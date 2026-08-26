import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseClient;
}

function send(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

function getApiKey(req: VercelRequest) {
  const key = req.headers['x-api-key'];
  if (typeof key === 'string' && key.trim()) return key.trim();
  const auth = req.headers.authorization;
  return auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}

function getBody(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body as Record<string, unknown>;
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  return {};
}

function getRequestKey(body: Record<string, unknown>) {
  return typeof body.key === 'string' && body.key.trim() ? body.key.trim() : 'unknown';
}

function getCreditCost(response: Response, body: unknown): number | null {
  const header = response.headers.get('x-tokencare-credit-cost') || response.headers.get('x-credit-cost');
  if (header && /^\d+$/.test(header.trim())) {
    const value = Number(header.trim());
    if (Number.isSafeInteger(value) && value > 0) return value;
  }
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const value = (body as Record<string, unknown>).credit_cost;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  }
  return null;
}

async function updateDailyUsage(p: {
  projectId: string;
  statusCode: number;
  errorCode?: string | null;
}) {
  const supabase = getSupabase();
  if (!supabase) return;
  const usageDate = new Date().toISOString().slice(0, 10);
  const isBlocked =
    p.statusCode === 429 ||
    p.errorCode === 'INSUFFICIENT_CREDITS' ||
    p.errorCode === 'PROJECT_PAUSED' ||
    p.errorCode === 'BLOCKED' ||
    p.errorCode === 'QUOTA_EXHAUSTED';
  const isSuccess = p.statusCode >= 200 && p.statusCode < 400 && !isBlocked;

  try {
    const { data: existing, error: selErr } = await supabase
      .from('developer_daily_usage')
      .select('id, calls, successful_calls, blocked_calls')
      .eq('project_id', p.projectId)
      .eq('usage_date', usageDate)
      .maybeSingle();

    if (!selErr && existing) {
      await supabase
        .from('developer_daily_usage')
        .update({
          calls: Number(existing.calls || 0) + 1,
          successful_calls: Number(existing.successful_calls || 0) + (isSuccess ? 1 : 0),
          blocked_calls: Number(existing.blocked_calls || 0) + (isBlocked ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('developer_daily_usage')
        .insert({
          project_id: p.projectId,
          usage_date: usageDate,
          calls: 1,
          successful_calls: isSuccess ? 1 : 0,
          blocked_calls: isBlocked ? 1 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }
  } catch (e) {
    console.warn('Daily usage update failed:', e);
  }
}

async function writeLog(p: {
  projectId: string; requestId: string; requestKey: string; method: string;
  statusCode: number; startedAt: number; errorCode?: string | null;
  message: string; creditsCharged: number;
}) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('developer_request_logs').insert({
    project_id: p.projectId,
    endpoint: p.requestKey,
    request_key: p.requestKey,
    method: p.method,
    status_code: p.statusCode,
    requested_at: new Date(p.startedAt).toISOString(),
    latency_ms: Math.max(0, Date.now() - p.startedAt),
    error_code: p.errorCode ?? null,
    request_id: p.requestId,
    completed_at: new Date().toISOString(),
    quota_consumed: p.creditsCharged > 0,
    message: p.message,
  });
  if (error) console.error('Request log write failed:', error);

  updateDailyUsage(p).catch(() => {});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-api-key, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const method = req.method || 'POST';
  const body = getBody(req);
  const requestKey = getRequestKey(body);
  const apiKey = getApiKey(req);

  const supabase = getSupabase();
  const upstreamUrl = process.env.DEVELOPER_UPSTREAM_URL;

  if (method !== 'POST') return send(res, 405, { success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
  if (!apiKey) return send(res, 401, { success: false, code: 'API_KEY_REQUIRED', message: 'API key required.', request_id: requestId });
  if (!supabase) return send(res, 500, { success: false, code: 'SUPABASE_NOT_CONFIGURED', message: 'Database connection is not configured.', request_id: requestId });
  if (!upstreamUrl) return send(res, 500, { success: false, code: 'UPSTREAM_NOT_CONFIGURED', message: 'Developer upstream is not configured.', request_id: requestId });
  if (requestKey === 'unknown') return send(res, 400, { success: false, code: 'REQUEST_KEY_REQUIRED', message: 'The JSON body must contain a string `key`.', request_id: requestId });

  let projectId: string | null = null;

  try {
    const { data: project, error: projectError } = await supabase
      .from('developer_projects')
      .select('id, is_active')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (projectError) {
      console.error('Project lookup failed:', projectError);
      return send(res, 500, { success: false, code: 'PROJECT_LOOKUP_FAILED', message: 'Unable to verify API key.', request_id: requestId });
    }
    if (!project || !project.is_active) {
      return send(res, 401, { success: false, code: 'INVALID_API_KEY', message: 'Project does not exist for this API key or is inactive.', request_id: requestId });
    }
    projectId = project.id;

    // The TokenCare backend/engine decides the operation cost. This gateway
    // deliberately does NOT contain a token/operation -> credit price table.
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-TokenCare-Project-Id': project.id,
        'X-TokenCare-Request-Id': requestId,
      },
      body: JSON.stringify(body),
    });

    const text = await upstreamResponse.text();
    let upstreamBody: unknown;
    try { upstreamBody = JSON.parse(text); } catch { upstreamBody = text; }

    if (!upstreamResponse.ok) {
      await writeLog({ projectId, requestId, requestKey, method, statusCode: upstreamResponse.status, startedAt, errorCode: `UPSTREAM_${upstreamResponse.status}`, message: 'Upstream request failed.', creditsCharged: 0 });
      res.status(upstreamResponse.status);
      res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
      return res.send(typeof upstreamBody === 'string' ? upstreamBody : JSON.stringify(upstreamBody));
    }

    const creditCost = getCreditCost(upstreamResponse, upstreamBody);
    if (creditCost === null) {
      await writeLog({ projectId, requestId, requestKey, method, statusCode: 502, startedAt, errorCode: 'CREDIT_COST_MISSING', message: 'Upstream did not provide the credit cost for this operation.', creditsCharged: 0 });
      return send(res, 502, { success: false, code: 'CREDIT_COST_MISSING', message: 'The TokenCare backend did not provide a valid credit cost for this operation.', request_id: requestId });
    }

    // Charge only the cost supplied by the backend. Supabase only stores the
    // project wallet and transaction ledger; it does not know operation prices.
    const { data: chargeData, error: chargeError } = await supabase.rpc('reserve_developer_credits', {
      p_project_id: project.id,
      p_credits: creditCost,
      p_endpoint: requestKey,
      p_action_key: requestKey,
      p_request_id: requestId,
    });

    if (chargeError) {
      console.error('Credit charge failed:', chargeError);
      return send(res, 500, { success: false, code: 'CREDIT_CHARGE_FAILED', message: 'Unable to charge project credits.', request_id: requestId });
    }

    const charge = Array.isArray(chargeData) ? chargeData[0] : chargeData;
    if (!charge?.allowed) {
      // The upstream has already performed the operation. Refund is intentionally
      // not attempted here because no credit was deducted. The caller must retry
      // after purchasing credits. Backend implementations should use a preflight
      // reservation if an operation is expensive or irreversible.
      await writeLog({ projectId, requestId, requestKey, method, statusCode: 402, startedAt, errorCode: 'INSUFFICIENT_CREDITS', message: 'Insufficient project credits.', creditsCharged: 0 });
      return send(res, 402, { success: false, code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits for this operation.', required_credits: creditCost, balance: charge?.balance ?? 0, request_id: requestId });
    }

    await writeLog({ projectId, requestId, requestKey, method, statusCode: upstreamResponse.status, startedAt, errorCode: null, message: 'Request succeeded.', creditsCharged: creditCost });

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
    res.setHeader('X-TokenCare-Credits-Charged', String(creditCost));
    res.setHeader('X-TokenCare-Credits-Remaining', String(charge.balance ?? 0));
    return res.send(typeof upstreamBody === 'string' ? upstreamBody : JSON.stringify(upstreamBody));
  } catch (error) {
    console.error('Developer API error:', error);
    if (projectId) await writeLog({ projectId, requestId, requestKey, method, statusCode: 500, startedAt, errorCode: 'INTERNAL_ERROR', message: 'Internal server error.', creditsCharged: 0 });
    return send(res, 500, { success: false, key: requestKey, code: 'INTERNAL_ERROR', message: 'Internal server error.', request_id: requestId });
  }
}
