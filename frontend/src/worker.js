import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jmrfjjwgnvppzscvxxnz.supabase.co';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (url.pathname === '/api/create-sales-user' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Not authorized' }, 403);

      const token = authHeader.slice(7);
      const anonClient = createClient(SUPABASE_URL, env.SUPABASE_ANON_KEY);
      const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
      if (authErr || !user) return json({ error: 'Not authorized' }, 403);

      const serviceClient = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await serviceClient
        .from('User').select('role').eq('auth_id', user.id).single();
      if (profile?.role !== 'OWNER') return json({ error: 'Not authorized' }, 403);

      const body = await request.json();
      const { p_username, p_password, p_name, p_role, p_phone, p_area_id, p_is_active } = body;

      if (!p_username?.trim()) return json({ error: 'Username wajib diisi' }, 400);
      if (!p_password || p_password.length < 6) return json({ error: 'Password minimal 6 karakter' }, 400);
      if (!p_name?.trim()) return json({ error: 'Nama wajib diisi' }, 400);

      const email = `${p_username.trim()}@tehtarik.local`;

      const { data: dup } = await serviceClient
        .from('User').select('id').eq('username', p_username.trim()).maybeSingle();
      if (dup) return json({ error: 'Username sudah digunakan' }, 400);

      const { data: authData, error: createErr } = await serviceClient.auth.admin.createUser({
        email,
        password: p_password,
        email_confirm: true,
        user_metadata: { email_verified: true },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const { error: profileErr } = await serviceClient.from('User').insert({
        auth_id: authData.user.id,
        username: p_username.trim(),
        name: p_name.trim(),
        role: p_role || 'SALES',
        phone: p_phone || null,
        area_id: p_area_id || null,
        is_active: p_is_active !== false,
        updated_at: new Date().toISOString(),
      });

      if (profileErr) {
        await serviceClient.auth.admin.deleteUser(authData.user.id);
        return json({ error: profileErr.message }, 400);
      }

      return json({ success: true, user_id: authData.user.id });
    }

    return env.ASSETS.fetch(request);
  },
};
