-- ==============================================================================
-- Persistencia compartida de fotos y datos de notas + fotos de familias
--
-- Hasta ahora las fotos de notas y familias solo vivían en IndexedDB/localStorage
-- del navegador del administrador. Estas columnas/tabla permiten que todos los
-- visitantes vean las mismas imágenes, sin perder lo que ya estaba configurado.
-- ==============================================================================

-- 1. Datos editables de cada nota olfativa
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS botanical_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS is_customized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Solo se leen las notas que el administrador personalizó.
CREATE INDEX IF NOT EXISTS idx_notes_customized
  ON public.notes (is_customized)
  WHERE is_customized = true;

-- 2. Fotos de las familias olfativas (Floral, Cítrico/Acuático, etc.)
CREATE TABLE IF NOT EXISTS public.family_photos (
  family_id TEXT PRIMARY KEY,
  photo_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Lectura pública (las escrituras pasan por la Edge Function catalog-admin)
ALTER TABLE public.family_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read family_photos" ON public.family_photos;
CREATE POLICY "Public read family_photos"
  ON public.family_photos
  FOR SELECT
  USING (true);
