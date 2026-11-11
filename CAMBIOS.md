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

## 8. Clave del panel admin validada en el servidor

**Antes:** las claves `fraganza2026`, `fraganza`, `admin` y `admin2026` estaban
escritas en `src/components/AdminAuthModal.tsx`. Se compilaban dentro del
JavaScript público, así que cualquiera podía leerlas desde el navegador.

**Ahora:**

- La clave vive solo en los secrets de Supabase (`ADMIN_PASSWORD`).
- La validación la hace la Edge Function `supabase/functions/admin-auth/`.
- El navegador recibe un token firmado con HMAC válido por 1 hora.
- La comparación es en tiempo constante y hay límite de 8 intentos por minuto.
- Si Supabase no está configurado, el panel no se abre (falla cerrado).
- En `npm run dev` se puede usar `VITE_ADMIN_DEV_PASSWORD`; esa rama se elimina
  del build de producción.

Instrucciones de despliegue en `README.md` → *Panel de administrador*.

## 9. Imágenes de notas rotas

Cuatro fotos devolvían 404 en Unsplash y se reemplazaron por imágenes
verificadas (todas responden 200):

| Nota | Antes | Ahora |
|---|---|---|
| Violeta | `photo-1550953159-663c1a0ad625` | `photo-1541275055241-329bbdf9a191` |
| Melocotón | `photo-1595126730719-1d9863268846` | `photo-1629828874514-c1e5103f2150` |
| Almizcle | `photo-1579783902614-a3fb3927b675` | `photo-1582738411706-bfc8e691d1c2` |
| Frambuesa | `photo-1577069808027-142277d33b5c` | `photo-1615484476889-2830f980a5e3` |

## 10. Proyecto Supabase y escrituras seguras

- Proyecto `fraganza` creado en `sa-east-1` con el catálogo completo:
  **207 fragancias, 247 notas y 1759 relaciones** de pirámide.
- El rol anónimo solo puede **leer**: RLS bloquea `INSERT`/`UPDATE`/`DELETE`.
- Nueva Edge Function `catalog-admin`: verifica el token HMAC de `admin-auth`,
  aplica una lista blanca de columnas y guarda con la service role key.
- `updateFragranceInSupabase` ahora llama a esa función en lugar de hacer
  `PATCH` directo con la clave anónima (que no escribía nada).

## Pendientes recomendados

- **RLS de Supabase:** `supabase/schema.sql` solo define políticas de lectura. Las
  escrituras del panel pasan por la Edge Function `catalog-admin`, que usa la
  service role key. Si en el futuro se añaden más tablas editables, repetir el
  mismo patrón.
- **Peso del bundle:** el JavaScript pesa ~1.3 MB. Se puede dividir con `import()`
  para cargar `recharts` solo al abrir una ficha.
