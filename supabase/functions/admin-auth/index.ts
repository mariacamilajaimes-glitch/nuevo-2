// ==============================================================================
// Supabase Edge Function: admin-auth
//
// Valida la clave del panel de administrador en el SERVIDOR.
// La clave nunca se incluye en el bundle del navegador.
//
// Secrets necesarios:
//   supabase secrets set ADMIN_PASSWORD="tu-clave-larga"
//   supabase secrets set ADMIN_TOKEN_SECRET="cadena-aleatoria-larga"
//
// Despliegue:
//   supabase functions deploy admin-auth --no-verify-jwt
//
// `--no-verify-jwt` es intencional: la función es pública pero se protege a sí
// misma con ADMIN_PASSWORD y un límite de intentos por IP.
// ==============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hora
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 60_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/** Comparación en tiempo constante: no filtra la clave por diferencias de tiempo. */
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

async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

// Límite de intentos por IP, en memoria de la instancia (best effort).
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return json({ error: 'rate_limited' }, 429);
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (!password) {
    return json({ error: 'missing_password' }, 400);
  }

  const expected = Deno.env.get('ADMIN_PASSWORD') ?? '';
  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET') ?? '';

  if (!expected || !tokenSecret) {
    return json({ error: 'server_not_configured' }, 500);
  }

  if (!safeEqual(password.trim(), expected)) {
    // Retardo para encarecer la fuerza bruta.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return json({ error: 'invalid_password' }, 401);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(
    { sub: 'admin', role: 'admin', exp: expiresAt },
    tokenSecret
  );

  return json({ ok: true, token, expiresIn: TOKEN_TTL_SECONDS });
});
