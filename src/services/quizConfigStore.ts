import {
  QuizConfig,
  getDefaultQuizConfig,
  normalizeQuizConfig
} from '../data/quizConfig';
import {
  fetchQuizConfigFromSupabase,
  saveQuizConfigInSupabase
} from './supabase';

const CACHE_KEY = 'fraganza_quiz_config_v1';
const QUIZ_UPDATED_EVENT = 'fraganza_quiz_updated';

let memoryConfig: QuizConfig | null = null;

function persist(config: QuizConfig): void {
  memoryConfig = config;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUIZ_UPDATED_EVENT, { detail: config }));
  }
}

/** Configuración disponible al instante (caché local o valores por defecto). */
export function getCachedQuizConfig(): QuizConfig {
  if (memoryConfig) return memoryConfig;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryConfig = normalizeQuizConfig(parsed);
      return memoryConfig;
    }
  } catch {}

  memoryConfig = getDefaultQuizConfig();
  return memoryConfig;
}

/** Carga la configuración desde Supabase y actualiza la caché local. */
export async function loadQuizConfig(): Promise<QuizConfig> {
  const remote = await fetchQuizConfigFromSupabase();
  if (remote) {
    const next = normalizeQuizConfig(remote);
    persist(next);
    return next;
  }
  return getCachedQuizConfig();
}

/** Guarda la configuración en Supabase y avisa a toda la interfaz. */
export async function saveQuizConfig(config: QuizConfig): Promise<void> {
  const next = normalizeQuizConfig(config);
  const saved = await saveQuizConfigInSupabase(next);
  if (!saved) {
    throw new Error(
      'No se pudo guardar el test en Supabase. Comprueba tu sesión de administrador y la conexión.'
    );
  }
  persist(next);
}

/** Restaura las preguntas y opciones originales (también en Supabase). */
export async function resetQuizConfig(): Promise<void> {
  await saveQuizConfig(getDefaultQuizConfig());
}

/** Escucha los cambios guardados desde el panel de administrador. */
export function subscribeQuizConfig(
  listener: (config: QuizConfig) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<QuizConfig>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(QUIZ_UPDATED_EVENT, handler);
  return () => window.removeEventListener(QUIZ_UPDATED_EVENT, handler);
}
