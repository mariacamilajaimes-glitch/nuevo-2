import { CatalogFragrance, CATALOG } from '../data/fraganzaCatalog';
import { QuizConfig, normalizeQuizConfig } from '../data/quizConfig';
import { getAdminToken } from './adminAuth';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  // Acceso literal obligatorio: Vite solo sustituye `import.meta.env.VITE_*`
  // escrito tal cual en el código. Leerlo con una variable intermedia deja los
  // valores vacíos en el build de producción.
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey)
  };
};

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- FRAGANZA - ESQUEMA DE BASE DE DATOS EN SUPABASE / POSTGRESQL
-- Diseñado y optimizado para la perfumería de lujo Fraganza
-- 
-- Incluye:
-- 1. Extensiones 'uuid-ossp' y 'pg_trgm' (búsqueda por trigramas ultrarrápida)
-- 2. ENUMs de alto rendimiento (género, intensidad, categorías, posición pirámide)
-- 3. Tabla 'notes' para el buscador inteligente (Fragrantica-style)
-- 4. Tabla 'fragrances' con atributos olfativos y arrays GIN indexados
-- 5. Tabla relacional 'fragrance_notes' (junction table N:M con posición piramidal)
-- 6. Índices B-Tree y GIN para sub-milisegundo en filtrado y autocompletado
-- 7. Vistas optimizadas y procedimiento almacenado RPC para búsqueda por inclusión/exclusión
-- 8. Políticas de seguridad RLS (Row Level Security) para acceso público de lectura
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. TIPOS ENUM PERSONALIZADOS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE public.gender_type AS ENUM ('Dama', 'Caballero', 'Unisex');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intensity_level') THEN
        CREATE TYPE public.intensity_level AS ENUM ('Suave', 'Moderada', 'Intensa', 'Envolvente');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pyramid_position') THEN
        CREATE TYPE public.pyramid_position AS ENUM ('salida', 'corazon', 'fondo');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'main_category_type') THEN
        CREATE TYPE public.main_category_type AS ENUM (
            'Floral', 
            'Dulce / Acaramelado', 
            'Cítrico / Acuático', 
            'Amaderado / Oriental'
        );
    END IF;
END $$;

-- 3. TABLA: NOTES (Catálogo canónico de notas olfativas para el buscador)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    category VARCHAR(60) NOT NULL DEFAULT 'Aromática',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_name_trgm ON public.notes USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notes_category ON public.notes (category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_name_lower ON public.notes (LOWER(name));

-- 4. TABLA: FRAGRANCES (Catálogo principal de fragancias)
CREATE TABLE IF NOT EXISTS public.fragrances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,                       -- Ej: 'D-023', 'C-001', 'U-015'
    name VARCHAR(150) NOT NULL,                              -- Ej: 'La Vie Est Belle'
    brand VARCHAR(120) NOT NULL,                             -- Ej: 'Lancôme'
    gender public.gender_type NOT NULL,                      -- 'Dama', 'Caballero', 'Unisex'
    family VARCHAR(100) NOT NULL,                            -- Ej: 'Floral Frutal', 'Oriental Amaderado'
    subfamily VARCHAR(100),                                  -- Sub-familia olfativa
    main_category public.main_category_type NOT NULL,        -- Familia principal del test
    intensity public.intensity_level NOT NULL,               -- 'Suave', 'Moderada', 'Intensa', 'Envolvente'
    sweetness VARCHAR(50) DEFAULT 'Moderado',                -- Ej: 'Muy dulce', 'Sutil', 'Seco'
    skin_compat VARCHAR(80) DEFAULT 'Versátil',              -- Recomendación según tipo de piel
    "skinCompat" VARCHAR(80) GENERATED ALWAYS AS (skin_compat) STORED, -- Compatibilidad directa camelCase
    age_range VARCHAR(50) DEFAULT '20-45 años',              -- Rango de edad recomendado
    occasion VARCHAR(150),                                   -- Ocasión ideal de uso
    personality VARCHAR(150),                                -- Rasgo distintivo de personalidad
    description TEXT,                                        -- Descripción corta y elegante
    image_url TEXT,                                          -- URL o ruta de la fotografía del frasco
    
    -- Arrays desnormalizados indexados con GIN para búsquedas combinadas instantáneas
    top_notes TEXT[] DEFAULT '{}'::text[] NOT NULL,          -- Notas de salida (primeros 15 min)
    heart_notes TEXT[] DEFAULT '{}'::text[] NOT NULL,        -- Notas de corazón (el alma)
    base_notes TEXT[] DEFAULT '{}'::text[] NOT NULL,         -- Notas de fondo (la huella final)
    all_notes TEXT[] DEFAULT '{}'::text[] NOT NULL,          -- Todas las notas unificadas
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices B-Tree optimizados para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_fragrances_code ON public.fragrances (code);
CREATE INDEX IF NOT EXISTS idx_fragrances_gender ON public.fragrances (gender);
CREATE INDEX IF NOT EXISTS idx_fragrances_intensity ON public.fragrances (intensity);
CREATE INDEX IF NOT EXISTS idx_fragrances_main_category ON public.fragrances (main_category);

-- Índices GIN de trigramas para autocompletado en tiempo real (al teclear nombre o marca)
CREATE INDEX IF NOT EXISTS idx_fragrances_name_trgm ON public.fragrances USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fragrances_brand_trgm ON public.fragrances USING gin (brand gin_trgm_ops);

-- Índices GIN de arrays para operadores de contención (@> y &&) en microsegundos
CREATE INDEX IF NOT EXISTS idx_fragrances_top_notes_gin ON public.fragrances USING gin (top_notes);
CREATE INDEX IF NOT EXISTS idx_fragrances_heart_notes_gin ON public.fragrances USING gin (heart_notes);
CREATE INDEX IF NOT EXISTS idx_fragrances_base_notes_gin ON public.fragrances USING gin (base_notes);
CREATE INDEX IF NOT EXISTS idx_fragrances_all_notes_gin ON public.fragrances USING gin (all_notes);

-- 5. TABLA RELACIONAL: FRAGRANCE_NOTES (Junction Table N:M)
CREATE TABLE IF NOT EXISTS public.fragrance_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fragrance_id UUID NOT NULL REFERENCES public.fragrances(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    position public.pyramid_position NOT NULL,               -- 'salida', 'corazon', 'fondo'
    prominence SMALLINT DEFAULT 1 CHECK (prominence BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_fragrance_note_position UNIQUE (fragrance_id, note_id, position)
);

CREATE INDEX IF NOT EXISTS idx_fn_search ON public.fragrance_notes (note_id, position, fragrance_id);
CREATE INDEX IF NOT EXISTS idx_fn_fragrance ON public.fragrance_notes (fragrance_id, position);

-- 6. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fragrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fragrance_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Public read fragrances" ON public.fragrances FOR SELECT USING (true);
CREATE POLICY "Public read fragrance_notes" ON public.fragrance_notes FOR SELECT USING (true);
`;

// Helper to fetch or fallback
export async function fetchCatalogFromSupabase(): Promise<CatalogFragrance[]> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return CATALOG;
  }

  try {
    // Try querying the normalized fragrances table first
    let res = await fetch(`${config.url}/rest/v1/fragrances?select=*`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((row: any, idx: number) => ({
          id: row.id,
          idNum: idx + 1,
          code: row.code,
          name: row.name,
          brand: row.brand,
          gender: row.gender,
          family: row.family,
          subfamily: row.subfamily || row.family,
          mainCategory: row.main_category,
          popularity: 'Alta',
          aromasClave: row.top_notes?.slice(0, 3) || [],
          pyramid: {
            top: row.top_notes || [],
            heart: row.heart_notes || [],
            base: row.base_notes || []
          },
          allNotes: row.all_notes || [...(row.top_notes || []), ...(row.heart_notes || []), ...(row.base_notes || [])],
          sweetness: row.sweetness || 'Moderado',
          sensation: '',
          intensity: row.intensity || 'Moderada',
          skinCompat: row.skin_compat || 'Versátil',
          ageRange: row.age_range || '20-45 años',
          personality: row.personality || '',
          environment: 'Indistinto',
          occasion: row.occasion || '',
          tags: [row.family, row.gender, row.intensity],
          description: row.description || '',
          image: row.image_url || ''
        }));
      }
    }

    // Secondary fallback: fraganza_catalog legacy table
    res = await fetch(`${config.url}/rest/v1/fraganza_catalog?select=*`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          idNum: row.id_num,
          code: row.code,
          name: row.name,
          brand: row.brand,
          gender: row.gender,
          family: row.family,
          subfamily: row.subfamily || row.family,
          mainCategory: row.main_category,
          popularity: row.popularity || 'Alta',
          aromasClave: row.aromas_clave || [],
          pyramid: {
            top: row.pyramid_top || [],
            heart: row.pyramid_heart || [],
            base: row.pyramid_base || []
          },
          allNotes: row.all_notes || [],
          sweetness: row.sweetness || 'Moderado',
          sensation: row.sensation || '',
          intensity: row.intensity || 'Moderada',
          skinCompat: row.skin_compat || 'Versátil',
          ageRange: row.age_range || '20-45 años',
          personality: row.personality || '',
          environment: row.environment || 'Indistinto',
          occasion: row.occasion || '',
          tags: row.tags || [],
          description: row.description || '',
          image: row.image || ''
        }));
      }
    }

    return CATALOG;
  } catch (err) {
    console.warn('Error connecting to Supabase, returning local catalog:', err);
    return CATALOG;
  }
}

async function callCatalogAdmin(body: Record<string, unknown>): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return false;

  // RLS bloquea las escrituras anónimas: se envían a la Edge Function
  // `catalog-admin`, que valida el token de administrador y escribe con la
  // service role key.
  const token = getAdminToken();
  if (!token) return false;

  try {
    const res = await fetch(`${config.url}/functions/v1/catalog-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.warn('Supabase rejected the change:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Could not reach catalog-admin:', err);
    return false;
  }
}

export async function updateFragranceInSupabase(code: string, updates: Record<string, any>): Promise<boolean> {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.code !== undefined) payload.code = updates.code;
  if (updates.brand !== undefined) payload.brand = updates.brand;
  if (updates.family !== undefined) payload.family = updates.family;
  if (updates.subfamily !== undefined) payload.subfamily = updates.subfamily;
  if (updates.mainCategory !== undefined) payload.main_category = updates.mainCategory;
  // The Supabase schema uses image_url / top_notes / heart_notes / base_notes.
  if (updates.image !== undefined) payload.image_url = updates.image;
  if (updates.pyramid?.top !== undefined) payload.top_notes = updates.pyramid.top;
  if (updates.pyramid?.heart !== undefined) payload.heart_notes = updates.pyramid.heart;
  if (updates.pyramid?.base !== undefined) payload.base_notes = updates.pyramid.base;
  if (updates.allNotes !== undefined) payload.all_notes = updates.allNotes;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.intensity !== undefined) payload.intensity = updates.intensity;
  if (updates.sweetness !== undefined) payload.sweetness = updates.sweetness;
  if (updates.occasion !== undefined) payload.occasion = updates.occasion;
  if (updates.sensation !== undefined) payload.sensation = updates.sensation;
  if (updates.environment !== undefined) payload.environment = updates.environment;
  if (updates.mainAccords !== undefined) payload.main_accords = updates.mainAccords;
  // Marca la fila como personalizada para que el catálogo público la lea.
  payload.is_customized = true;

  if (Object.keys(payload).length === 0) return false;

  return callCatalogAdmin({ action: 'update', code, updates: payload });
}

export async function insertFragranceInSupabase(updates: Record<string, any>): Promise<boolean> {
  const code = typeof updates.code === 'string' ? updates.code.trim() : '';
  if (!code) return false;

  const payload: Record<string, any> = {};
  for (const field of [
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
  ]) {
    if (updates[field] !== undefined && updates[field] !== '') payload[field] = updates[field];
  }

  payload.is_customized = true;

  return callCatalogAdmin({ action: 'insert', code, updates: payload });
}

/** Deja de aplicar una fragancia como override compartido en Supabase. */
export async function resetFragranceInSupabase(code: string): Promise<boolean> {
  return callCatalogAdmin({ action: 'reset', code });
}

// ---------------------------------------------------------------------------
// Escrituras de notas olfativas (tabla `notes`)
// ---------------------------------------------------------------------------

/** Actualiza la categoría de una nota (la crea si no existía). */
export async function updateNoteCategoryInSupabase(
  noteName: string,
  newCategory: string
): Promise<boolean> {
  return callCatalogAdmin({ action: 'note_category', noteName, newCategory });
}

/** Crea o actualiza una nota en el catálogo canónico. */
export async function upsertNoteInSupabase(note: {
  name: string;
  category: string;
  description?: string;
}): Promise<boolean> {
  return callCatalogAdmin({
    action: 'note_upsert',
    noteName: note.name,
    newCategory: note.category,
    description: note.description
  });
}

/** Elimina una nota del catálogo canónico. */
export async function deleteNoteInSupabase(noteName: string): Promise<boolean> {
  return callCatalogAdmin({ action: 'note_delete', noteName });
}

/** Fusiona una nota duplicada/mal escrita con la canónica. */
export async function mergeNoteInSupabase(fromNote: string, toNote: string): Promise<boolean> {
  return callCatalogAdmin({ action: 'note_merge', noteName: fromNote, toNote });
}

/** Garantiza que una lista de notas exista en el catálogo canónico. */
export async function ensureNotesInSupabase(
  notes: Array<{ name: string; category?: string }>
): Promise<boolean> {
  if (notes.length === 0) return true;
  return callCatalogAdmin({ action: 'notes_ensure', notes });
}

// ---------------------------------------------------------------------------
// Configuración del Test Inteligente (tabla `quiz_config`)
// ---------------------------------------------------------------------------

/** Lee la configuración pública del test. Devuelve null si no hay fila. */
export async function fetchQuizConfigFromSupabase(): Promise<QuizConfig | null> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    const res = await fetch(
      `${config.url}/rest/v1/quiz_config?id=eq.default&select=config`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`
        }
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const raw = Array.isArray(rows) ? rows[0]?.config : null;
    if (!raw || typeof raw !== 'object') return null;
    return normalizeQuizConfig(raw);
  } catch (err) {
    console.warn('Could not load quiz config from Supabase:', err);
    return null;
  }
}

/** Guarda la configuración del test (solo administrador autenticado). */
export async function saveQuizConfigInSupabase(config: QuizConfig): Promise<boolean> {
  return callCatalogAdmin({ action: 'quiz_config_save', config });
}

// ---------------------------------------------------------------------------
// Lectura de las filas personalizadas desde el panel de administrador.
// El catálogo local (JSON) sigue siendo la base; estas filas se aplican como
// overrides para que las ediciones se vean en todos los dispositivos.
// ---------------------------------------------------------------------------
export interface RemoteCustomizedRow {
  code: string;
  name?: string;
  brand?: string;
  family?: string;
  subfamily?: string;
  main_category?: string;
  image_url?: string;
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
  all_notes?: string[];
  description?: string;
  sensation?: string;
  intensity?: string;
  sweetness?: string;
  occasion?: string;
  environment?: string;
  main_accords?: unknown;
}

export async function fetchCustomizedFragranceRows(): Promise<RemoteCustomizedRow[]> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return [];

  try {
    const fields = [
      'code',
      'name',
      'brand',
      'family',
      'subfamily',
      'main_category',
      'image_url',
      'top_notes',
      'heart_notes',
      'base_notes',
      'all_notes',
      'description',
      'sensation',
      'intensity',
      'sweetness',
      'occasion',
      'environment',
      'main_accords'
    ].join(',');

    const res = await fetch(
      `${config.url}/rest/v1/fragrances?is_customized=eq.true&select=${fields}`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`
        }
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Could not load customized rows from Supabase:', err);
    return [];
  }
}
