/**
 * Autenticación del panel de administrador.
 *
 * La clave NO vive en el bundle: se valida en la Edge Function `admin-auth`
 * de Supabase (supabase/functions/admin-auth/index.ts) y el navegador solo
 * recibe un token de sesión de corta duración.
 *
 * Nota: la config se lee aquí directamente (no desde `supabase.ts`) para evitar
 * una dependencia circular, porque `supabase.ts` importa `getAdminToken`.
 */

function readSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  // Acceso literal: Vite solo reemplaza `import.meta.env.VITE_*` directo.
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}

const SESSION_FLAG = 'fraganza_admin_logged';
const TOKEN_KEY = 'fraganza_admin_token';

export type AdminAuthFailure =
  | 'invalid_password'
  | 'not_configured'
  | 'rate_limited'
  | 'network'
  | 'server_error';

export interface AdminAuthResult {
  ok: boolean;
  reason?: AdminAuthFailure;
  message?: string;
}

interface StoredSession {
  token: string;
  expiresAt: number;
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    if (Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(SESSION_FLAG);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeSession(token: string, ttlMs: number): void {
  try {
    sessionStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ token, expiresAt: Date.now() + ttlMs })
    );
    sessionStorage.setItem(SESSION_FLAG, 'true');
  } catch {
    // sessionStorage puede estar bloqueado (modo privado estricto): la sesión
    // dura solo mientras la pestaña siga abierta en memoria.
  }
}

/** ¿Hay una sesión de administrador válida y no caducada? */
export function hasAdminSession(): boolean {
  const session = readSession();
  if (!session) {
    // Limpia el flag de versiones anteriores que no tenían token.
    try {
      sessionStorage.removeItem(SESSION_FLAG);
    } catch {}
    return false;
  }
  return true;
}

/** Token de la sesión actual, o null si no hay sesión válida. */
export function getAdminToken(): string | null {
  return readSession()?.token ?? null;
}

/** Cierra la sesión de administrador. */
export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_FLAG);
  } catch {}
}

/** Verifica la clave contra la Edge Function de Supabase. */
export async function verifyAdminPassword(password: string): Promise<AdminAuthResult> {
  const candidate = password.trim();

  if (!candidate) {
    return {
      ok: false,
      reason: 'invalid_password',
      message: 'Escribe la clave de administrador.'
    };
  }

  // Atajo SOLO para desarrollo local (npm run dev) y sin Supabase configurado.
  // Vite reemplaza import.meta.env.DEV por `false` en el build de producción,
  // así que esta rama y la clave desaparecen del bundle publicado.
  if (import.meta.env.DEV) {
    const devPassword = import.meta.env.VITE_ADMIN_DEV_PASSWORD;
    if (devPassword && candidate === devPassword) {
      storeSession('dev-session', 60 * 60 * 1000);
      return { ok: true };
    }
  }

  const config = readSupabaseConfig();
  if (!config.isConfigured) {
    return {
      ok: false,
      reason: 'not_configured',
      message:
        'El panel seguro necesita Supabase configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver README → Panel de administrador).'
    };
  }

  try {
    const res = await fetch(`${config.url}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`
      },
      body: JSON.stringify({ password: candidate })
    });

    if (res.status === 401) {
      return {
        ok: false,
        reason: 'invalid_password',
        message: 'Clave incorrecta. Inténtalo de nuevo.'
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'Demasiados intentos seguidos. Espera un minuto e inténtalo otra vez.'
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        reason: 'server_error',
        message:
          'El servidor no pudo verificar la clave. Comprueba que la función admin-auth esté desplegada y con sus secrets.'
      };
    }

    const data = (await res.json().catch(() => null)) as
      | { token?: string; expiresIn?: number }
      | null;

    if (!data || typeof data.token !== 'string') {
      return {
        ok: false,
        reason: 'server_error',
        message: 'Respuesta inválida del servidor de autenticación.'
      };
    }

    const ttlMs = (Number(data.expiresIn) || 3600) * 1000;
    storeSession(data.token, ttlMs);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.'
    };
  }
}
