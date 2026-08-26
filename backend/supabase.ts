import { config } from './config';

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) throw new Error(body?.message || body?.error || body?.raw || `Supabase HTTP ${response.status}`);
  return body;
}

export async function verifyUser(userId: string, authorization?: string): Promise<void> {
  if (!authorization?.toLowerCase().startsWith('bearer ')) throw new Error('Authorization: Bearer <Supabase access token> is required');
  const token = authorization.slice(7).trim();
  if (!token) throw new Error('Supabase access token is required');
  const user = await request('/auth/v1/user', { headers: { Authorization: `Bearer ${token}` } });
  if (!user?.id || user.id !== userId) throw new Error('Authenticated user does not match user_id');
}

export async function grantReward(userId: string, token: Record<string, unknown>, requestId: string, amount: number): Promise<any> {
  const result = await request('/rest/v1/rpc/grant_token_donation_reward', {
    method: 'POST',
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_token: token, p_request_id: requestId }),
  });

  if (result?.notification_id) {
    const rows = await request(`/rest/v1/notifications?id=eq.${encodeURIComponent(result.notification_id)}&select=*`);
    return { ...result, notification: Array.isArray(rows) ? rows[0] : rows };
  }
  return result;
}
