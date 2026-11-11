# Correcciones aplicadas

## 1. Página en blanco (crítico)

**Causa:** GitHub Pages estaba publicando el `index.html` fuente de la raíz del repositorio. Ese archivo carga `/src/main.tsx`, una ruta que no existe en producción, así que React nunca se montaba y la página quedaba vacía.

**Solución en GitHub (obligatoria):**

1. Abrir el repositorio en GitHub.
2. Ir a **Settings → Pages**.
3. En **Build and deployment → Source**, seleccionar **GitHub Actions**.
4. Guardar y ejecutar el workflow **Deploy to GitHub Pages** desde la pestaña **Actions**.

Con eso GitHub publica el contenido de `dist/`, no el código fuente.

## 2. Workflow de deploy

- Se eliminó `cache: 'npm'`, que fallaba porque el repositorio no tenía `package-lock.json`.
- Se actualizó Node.js de 20 a 22.
- Se cambió `npm install` por `npm install --no-audit --no-fund`.

## 3. Rutas de imágenes

- Se reemplazaron las rutas absolutas `/assets/aistudio/...` por rutas relativas `./assets/aistudio/...`.
- Esto evita que las imágenes se rompan cuando el sitio se publica en un subdirectorio como `https://usuario.github.io/nuevo-2/`.

## 4. Tema día/noche

- El tema ya no se guarda automáticamente al iniciar.
- Solo se guarda cuando el usuario pulsa el botón Día/Noche.
- Así la app puede seguir el tema del sistema mientras el usuario no elija uno manualmente.

## 5. Sincronización con Supabase

- Se corrigieron los nombres de columnas enviados al actualizar un perfume:
  - `image` → `image_url`
  - `pyramid_top` → `top_notes`
  - `pyramid_heart` → `heart_notes`
  - `pyramid_base` → `base_notes`
- Se añadieron `description`, `intensity`, `sweetness` y `occasion` al payload.

## 6. Botón "Poner Foto" de familias

- Ahora solo aparece cuando hay una sesión de administrador activa.
- Antes cualquier visitante veía el botón de edición.

## 7. Script de sincronización `docs/`

- `scripts/copyBuildToDocs.cjs` ahora limpia `docs/` antes de copiar el build.
- Se evita que queden archivos JavaScript/CSS antiguos con hashes viejos.

## Pendientes recomendados

- **Seguridad del panel admin:** las contraseñas están escritas en el código del cliente (`AdminAuthModal.tsx`). Cualquier visitante puede verlas. Para producción se recomienda Supabase Auth o un backend.
- **RLS de Supabase:** `supabase/schema.sql` solo define políticas de lectura. Para que el panel pueda insertar o actualizar desde el navegador hacen falta políticas de `INSERT`/`UPDATE` (preferiblemente para usuarios autenticados).
- **Imágenes 404:** cuatro fotos de notas en `fragranceVisuals.ts` devuelven 404 en Unsplash (Violeta, Melocotón, Almizcle y Frambuesa).
- **Peso del bundle:** el JavaScript pesa ~1.3 MB. Se puede dividir con `import()` para cargar `recharts` solo al abrir una ficha.
