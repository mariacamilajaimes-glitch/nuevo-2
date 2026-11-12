// ==============================================================================
// Supabase Edge Function: catalog-admin
//
// Escrituras del panel de administrador. RLS bloquea al rol anónimo, así que
// esta función:
//   1. Verifica el token HMAC emitido por `admin-auth`.
//   2. Escribe con la service role key (omite RLS).
//
// Secrets necesarios (ADMIN_TOKEN_SECRET ya lo usa admin-auth):
//   supabase secrets set ADMIN_TOKEN_SECRET="cadena-aleatoria-larga"
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
//
// Despliegue:
//   supabase functions deploy catalog-admin --no-verify-jwt --use-api
//
// `--no-verify-jwt` es intencional: la autorización real es el token HMAC.
// ==============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convierte un nombre de nota en un slug estable (sin acentos). */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'nota';
}

/** Verifica la firma HMAC del token y su caducidad. */
async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [body, signature] = parts;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  let expected: Uint8Array;
  try {
    const binary = fromBase64Url(signature);
    expected = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  } catch {
    return false;
  }

  const valid = await crypto.subtle.verify('HMAC', key, expected, encoder.encode(body));
  if (!valid) return false;

  try {
    const payload = JSON.parse(fromBase64Url(body)) as { role?: string; exp?: number };
    if (payload.role !== 'admin') return false;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

// Columnas que el panel puede modificar. Lista blanca: evita que se escriba
// cualquier campo arbitrario desde el navegador.
const ALLOWED_FIELDS = new Set([
  'name',
  'code',
  'brand',
  'gender',
  'family',
  'subfamily',
  'main_category',
  'image_url',
  'top_notes',
  'heart_notes',
  'base_notes',
  'all_notes',
  'description',
  'intensity',
  'sweetness',
  'occasion',
  'personality',
  'age_range',
  'skin_compat',
  'sensation',
  'environment',
  'main_accords',
  'is_customized'
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!tokenSecret || !supabaseUrl || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  // El token viaja en el header Authorization: Bearer <token>.
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token || !(await verifyToken(token, tokenSecret))) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: {
    action?: string;
    code?: string;
    updates?: Record<string, unknown>;
    noteName?: string;
    newCategory?: string;
    toNote?: string;
    description?: string;
    notes?: Array<{ name?: string; category?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const action = typeof body?.action === 'string' ? body.action : 'update';

  // ---------------------------------------------------------------------------
  // Acciones sobre la tabla `notes` (categorías, notas nuevas, borrar/merge).
  // ---------------------------------------------------------------------------
  if (action.startsWith('note_') || action === 'notes_ensure') {
    const noteName = typeof body?.noteName === 'string' ? body.noteName.trim() : '';
    if (!noteName && action !== 'notes_ensure') return json({ error: 'missing_note_name' }, 400);

    const notesUrl = `${supabaseUrl}/rest/v1/notes`;
    const authHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    };

    const findNote = async (name: string) => {
      const res = await fetch(
        `${notesUrl}?name=eq.${encodeURIComponent(name)}&select=id,name,slug,category`,
        { headers: authHeaders }
      );
      if (!res.ok) return null;
      const rows = await res.json().catch(() => []);
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    };

    if (action === 'note_category' || action === 'note_upsert') {
      const category = typeof body?.newCategory === 'string' && body.newCategory.trim()
        ? body.newCategory.trim()
        : 'Aromática';
      const description = typeof body?.description === 'string' ? body.description : undefined;

      const existing = await findNote(noteName);
      if (existing) {
        const patch: Record<string, unknown> = { category };
        if (description !== undefined) patch.description = description;
        const res = await fetch(`${notesUrl}?id=eq.${existing.id}`, {
          method: 'PATCH',
          headers: { ...authHeaders, Prefer: 'return=representation' },
          body: JSON.stringify(patch)
        });
        if (!res.ok) {
          return json({ error: 'database_error', detail: (await res.text()).slice(0, 400) }, 502);
        }
        return json({ ok: true, action, noteName, updated: true });
      }

      const res = await fetch(notesUrl, {
        method: 'POST',
        headers: { ...authHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          name: noteName,
          slug: slugify(noteName),
          category,
          description: description ?? `Nota olfativa: ${noteName}`
        })
      });
      if (!res.ok) {
        return json({ error: 'database_error', detail: (await res.text()).slice(0, 400) }, 502);
      }
      return json({ ok: true, action, noteName, created: true });
    }

    if (action === 'note_delete') {
      const res = await fetch(`${notesUrl}?name=eq.${encodeURIComponent(noteName)}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        return json({ error: 'database_error', detail: (await res.text()).slice(0, 400) }, 502);
      }
      return json({ ok: true, action, noteName });
    }

    if (action === 'note_merge') {
      const target = typeof body?.toNote === 'string' ? body.toNote.trim() : '';
      if (!target) return json({ error: 'missing_target_note' }, 400);

      const sourceRow = await findNote(noteName);
      const targetRow = await findNote(target);

      if (!sourceRow) {
        // La nota de origen no existía: solo aseguramos la nota destino.
        if (!targetRow) {
          await fetch(notesUrl, {
            method: 'POST',
            headers: { ...authHeaders, Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({
              name: target,
              slug: slugify(target),
              category: 'Aromática',
              description: `Nota olfativa: ${target}`
            })
          });
        }
        return json({ ok: true, action, noteName, toNote: target, merged: false });
      }

      if (targetRow) {
        // Ambas existen: se elimina la duplicada.
        await fetch(`${notesUrl}?id=eq.${sourceRow.id}`, { method: 'DELETE', headers: authHeaders });
      } else {
        // Solo existe el origen: se renombra al destino canónico.
        await fetch(`${notesUrl}?id=eq.${sourceRow.id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ name: target, slug: slugify(target) })
        });
      }
      return json({ ok: true, action, noteName, toNote: target, merged: true });
    }

    if (action === 'notes_ensure') {
      const incoming = Array.isArray(body?.notes) ? body.notes : [];
      const normalized = incoming
        .filter((item) => item && typeof item.name === 'string' && item.name.trim())
        .map((item) => {
          const name = item.name!.trim();
          const category =
            typeof item.category === 'string' && item.category.trim()
              ? item.category.trim()
              : 'Aromática';
          return {
            name,
            slug: slugify(name),
            category,
            description: `Nota olfativa: ${name}`
          };
        });

      if (normalized.length === 0) return json({ ok: true, action, inserted: 0 });

      // Solo se insertan las que aún no existen: nunca se sobrescribe una
      // categoría o descripción ya curada por el administrador.
      const existingRes = await fetch(`${notesUrl}?select=name`, { headers: authHeaders });
      const existingRows = existingRes.ok ? await existingRes.json().catch(() => []) : [];
      const existing = new Set(
        (Array.isArray(existingRows) ? existingRows : []).map((row: { name?: string }) =>
          (row.name || '').toLowerCase().trim()
        )
      );

      const missing = normalized.filter((item) => !existing.has(item.name.toLowerCase()));
      if (missing.length === 0) return json({ ok: true, action, inserted: 0 });

      const res = await fetch(notesUrl, {
        method: 'POST',
        headers: { ...authHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(missing)
      });
      if (!res.ok) {
        return json({ error: 'database_error', detail: (await res.text()).slice(0, 400) }, 502);
      }
      return json({ ok: true, action, inserted: missing.length });
    }

    return json({ error: 'unknown_note_action', action }, 400);
  }

  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  const updates = body?.updates;

  if (!code) return json({ error: 'missing_code' }, 400);

  // Restablecer: deja de aplicar la fila como override compartido. Los valores
  // originales siguen viviendo en el catálogo local del navegador.
  if (action === 'reset') {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/fragrances?code=eq.${encodeURIComponent(code)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ is_customized: false, updated_at: new Date().toISOString() })
      }
    );
    const text = await res.text();
    if (!res.ok) {
      return json({ error: 'database_error', status: res.status, detail: text.slice(0, 400) }, 502);
    }
    return json({ ok: true, action: 'reset', code });
  }

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return json({ error: 'missing_updates' }, 400);
  }

  const payload: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(updates)) {
    if (!ALLOWED_FIELDS.has(field)) continue;
    payload[field] = value;
  }

  if (Object.keys(payload).length === 0) {
    return json({ error: 'no_allowed_fields' }, 400);
  }

  // Cualquier fila tocada por el panel queda marcada como personalizada.
  // Así el catálogo público sabe que debe leerla como override remoto.
  payload.is_customized = true;

  if (action === 'insert') {
    for (const required of ['name', 'brand', 'gender', 'family', 'main_category', 'intensity']) {
      if (!payload[required]) return json({ error: 'missing_field', field: required }, 400);
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/fragrances`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) {
      return json({ error: 'database_error', status: res.status, detail: text.slice(0, 400) }, 502);
    }

    return json({ ok: true, action, code, fields: Object.keys(payload) });
  }

  payload.updated_at = new Date().toISOString();

  const res = await fetch(
    `${supabaseUrl}/rest/v1/fragrances?code=eq.${encodeURIComponent(code)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    }
  );

  const text = await res.text();
  if (!res.ok) {
    return json({ error: 'database_error', status: res.status, detail: text.slice(0, 400) }, 502);
  }

  let rows: unknown[] = [];
  try {
    rows = JSON.parse(text);
  } catch {
    rows = [];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: 'not_found', code }, 404);
  }

  return json({ ok: true, code, fields: Object.keys(payload) });
});
