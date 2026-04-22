// ============================================================
//  SiKelas - Supabase Client (REST API langsung, tanpa npm package)
// ============================================================

export const SUPABASE_URL  = 'https://llisqmfgaozpjuoathxj.supabase.co';
export const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsaXNxbWZnYW96cGp1b2F0aHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDg2NjYsImV4cCI6MjA5MjAyNDY2Nn0.LaEbZAS-UZqafkil6c8SzhziV--WS4gMnQx7ga76RTg';

function headers(extra: Record<string, string> = {}) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
    ...extra,
  };
}

// ── Cek apakah tabel sudah ada (tidak throw, return boolean) ──
export async function tableExists(table: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
      headers: headers(),
    });
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    const body = await res.json().catch(() => ({}));
    // PGRST106 = table/view not found, PGRST205 = schema not found
    if (body?.code === 'PGRST106' || body?.code === 'PGRST205') return false;
    return res.ok;
  } catch {
    return false;
  }
}

export async function sbSelect<T>(table: string, query = ''): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const res  = await fetch(url, { headers: headers() });
  if (!res.ok) { console.error('sbSelect', table, await res.text()); return []; }
  return res.json();
}

export async function sbSelectOne<T>(table: string, query = ''): Promise<T | null> {
  const rows = await sbSelect<T>(table, (query ? query + '&' : '') + 'limit=1');
  return rows[0] ?? null;
}

export async function sbInsert<T>(table: string, data: any): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) { console.error('sbInsert', table, await res.text()); return null; }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function sbUpdate<T>(table: string, match: string, data: any): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) { console.error('sbUpdate', table, await res.text()); return null; }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function sbDelete(table: string, match: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }),
  });
  return res.ok;
}

export async function sbUpsert<T>(table: string, data: any, onConflict: string): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation,resolution=merge-duplicates' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) { console.error('sbUpsert', table, await res.text()); return null; }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function sbRpc<T>(fn: string, params: any = {}): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(params),
  });
  if (!res.ok) { console.error('sbRpc', fn, await res.text()); return null; }
  return res.json();
}
