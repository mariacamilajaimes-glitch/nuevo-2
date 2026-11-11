# Fraganza - Recomendación de Colonias y Perfumes

Aplicación web en React + Vite + TypeScript para recomendar perfumes, explorar notas olfativas y administrar el catálogo.

## Requisitos

- Node.js 20 o superior (recomendado 22)
- npm

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Build de producción

```bash
npm run build
```

El build se genera en `dist/`. El script también copia el resultado a `docs/` para quien prefiera publicar desde esa carpeta.

## Publicar en GitHub Pages

El repositorio incluye `.github/workflows/deploy.yml`, que construye y publica `dist/` con GitHub Actions.

Pasos obligatorios en GitHub:

1. Ir a **Settings → Pages**.
2. En **Build and deployment → Source**, elegir **GitHub Actions** (no "Deploy from a branch").
3. Hacer push a `main` o ejecutar el workflow manualmente desde **Actions**.

> Si Pages queda configurado como "Deploy from a branch" apuntando a la raíz, GitHub publica el `index.html` fuente. Ese archivo carga `/src/main.tsx`, que no existe en producción, y la página se ve en blanco.

### Alternativa: publicar desde `/docs`

Si se prefiere no usar Actions:

1. Ejecutar `npm run build` y confirmar que `docs/index.html` y `docs/assets/` estén actualizados.
2. En **Settings → Pages**, elegir **Deploy from a branch**, rama `main` y carpeta `/docs`.

## Supabase (opcional)

Crear un archivo `.env` a partir de `.env.example`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase. Si no hay variables configuradas, la app funciona con el catálogo local de 207 perfumes.

Para que el panel de administración pueda escribir en Supabase, la tabla necesita políticas RLS de `INSERT`/`UPDATE` para el rol que uses. Las políticas incluidas en el esquema son solo de lectura pública.

## Estructura

- `src/components/`: vistas y modales de la aplicación.
- `src/data/`: catálogo, notas, imágenes y utilidades de similitud.
- `src/services/`: persistencia local (IndexedDB/localStorage) y sincronización con Supabase.
- `supabase/`: esquema y datos iniciales.
- `scripts/`: utilidades de build y generación de datos.
