/**
 * Normalización de texto para búsquedas.
 *
 * Convierte a minúsculas y elimina los acentos/diacríticos, de modo que
 * "ambar" encuentre "Ámbar", "limon" encuentre "Limón" y "jazmin" encuentre
 * "Jazmín".
 */
export function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** ¿El texto contiene la búsqueda, ignorando mayúsculas y acentos? */
export function includesNormalized(haystack: string, needle: string): boolean {
  const n = normalizeText(needle);
  if (!n) return true;
  return normalizeText(haystack).includes(n);
}

/** ¿Alguno de los textos contiene la búsqueda? */
export function someIncludesNormalized(values: string[], needle: string): boolean {
  return values.some((value) => includesNormalized(value, needle));
}
