import { MainCategory } from './fraganzaCatalog';
import { EXPANDED_SUBFAMILIES_FOR_QUIZ } from './fragranticaNotesDictionary';

/**
 * Configuración editable del Test Inteligente.
 *
 * Las preguntas y opciones que ve el visitante salen de aquí. El panel de
 * administrador puede cambiar los textos y guardarlos en Supabase; el
 * algoritmo usa los `id` internos (que no cambian) para que las ediciones
 * nunca rompan la recomendación.
 */

export interface QuizOption {
  /** Valor interno que usa el algoritmo. No se edita desde el panel. */
  id: string;
  label: string;
  description: string;
  icon?: string;
  codeRef?: string;
}

export interface QuizQuestion {
  id: number;
  title: string;
  titleForOther?: string;
  subtitle?: string;
  subtitleForOther?: string;
  options: QuizOption[];
}

export interface QuizSubfamily {
  /** Valor interno que usa el algoritmo. No se edita desde el panel. */
  id: string;
  label: string;
  icon: string;
  subgroup: string;
  notesSample: string[];
  desc: string;
}

export interface QuizConfig {
  version: number;
  questions: QuizQuestion[];
  subfamilies: Record<MainCategory, QuizSubfamily[]>;
}

export const QUIZ_CONFIG_VERSION = 1;

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 0,
    title: '¿A quién va dirigida la fragancia?',
    subtitle:
      'Permite al algoritmo calibrar sugerencias para uso personal o para obsequiar a alguien especial.',
    options: [
      {
        id: 'me',
        label: 'Para mí',
        description: 'Desea encontrar su nueva firma olfativa predilecta'
      },
      {
        id: 'other',
        label: 'Para otra persona',
        description: 'Busca sorprender a alguien especial con una fragancia inolvidable'
      }
    ]
  },
  {
    id: 1,
    title: '¿Qué perfil o género de fragancia buscas para ti?',
    titleForOther: '¿Qué perfil o género de fragancia busca la persona?',
    subtitle: 'Filtraremos de inmediato nuestro catálogo según tu preferencia.',
    subtitleForOther:
      'Filtraremos de inmediato nuestro catálogo según el perfil seleccionado.',
    options: [
      {
        id: 'Dama',
        label: 'Dama',
        codeRef: 'D-',
        description:
          'Elegancia femenina, florales radiantes, dulces y frutales chic'
      },
      {
        id: 'Caballero',
        label: 'Caballero',
        codeRef: 'C-',
        description:
          'Varonil, maderas nobles, especias cálidas y acordes fougère'
      },
      {
        id: 'Unisex',
        label: 'Unisex / Sin preferencia',
        codeRef: 'U-',
        description:
          'Composiciones modernas y versátiles sin distinción de género'
      }
    ]
  },
  {
    id: 2,
    title: '¿En qué rango de edad te encuentras?',
    titleForOther: '¿En qué rango de edad se encuentra la persona?',
    subtitle:
      'Nos permite calibrar entre propuestas juveniles dinámicas o creaciones maduras y señoriales para ti.',
    subtitleForOther:
      'Ayuda a calibrar entre propuestas juveniles dinámicas o creaciones maduras y señoriales.',
    options: [
      {
        id: '15-20',
        label: '15–20 años',
        description: 'Chispeante, fresco y juvenil'
      },
      {
        id: '21-30',
        label: '21–30 años',
        description: 'Moderno, seductor y fiestero'
      },
      {
        id: '31-45',
        label: '31–45 años',
        description: 'Sofisticado, ejecutivo y seguro'
      },
      {
        id: '46+',
        label: '46 años o más',
        description: 'Distinguido, aristocrático y clásico'
      }
    ]
  },
  {
    id: 3,
    title: '¿Qué tipo de piel tienes?',
    titleForOther: '¿Qué tipo de piel posee la persona?',
    subtitle:
      'Tu química dérmica y nivel de hidratación influyen directamente en la fijación y duración de tu perfume.',
    subtitleForOther:
      'La química dérmica y el nivel de hidratación influyen directamente en la fijación y duración del perfume.',
    options: [
      {
        id: 'Piel Seca',
        label: 'Piel Seca',
        icon: '🏜️',
        description:
          'Absorbe el perfume rápido; recomendamos fórmulas con mayor fijación o acordes densos como ámbar, maderas nobles y vainilla.'
      },
      {
        id: 'Piel Mixta',
        label: 'Piel Mixta',
        icon: '⚖️',
        description:
          'Zona T con mayor oleosidad; equilibrio óptimo para proyectar acordes aromáticos, especiados y notas intermedias.'
      },
      {
        id: 'Normal',
        label: 'Piel Normal',
        icon: '🌸',
        description:
          'Equilibrio perfecto de pH e hidratación; proyecta fielmente cualquier composición olfativa de salida a fondo.'
      },
      {
        id: 'Piel Grasa',
        label: 'Piel Grasa',
        icon: '✨',
        description:
          'Mayor oleosidad natural; intensifica y proyecta mucho más el perfume; las fragancias frescas y acuáticas duran horas prolongadas.'
      }
    ]
  },
  {
    id: 4,
    title: '¿Qué nivel de intensidad o proyección prefieres?',
    titleForOther: '¿Qué nivel de intensidad o proyección prefiere la persona?',
    subtitle:
      'Define el radio de proyección y la huella sensorial que deseas dejar en tu entorno.',
    subtitleForOther:
      'Define el radio de proyección y la huella sensorial que dejará en el ambiente.',
    options: [
      {
        id: 'Suave / Fresca',
        label: 'Suave / Fresca',
        icon: '🌿',
        description:
          'Discreta, ligera, ideal para el día a día y cercanía sin saturar el espacio'
      },
      {
        id: 'Equilibrada',
        label: 'Equilibrada',
        icon: '✨',
        description:
          'Ni demasiado tenue ni abrumadora, altamente versátil y elegante en cualquier momento'
      },
      {
        id: 'Intensa',
        label: 'Intensa',
        icon: '🔥',
        description:
          'Proyección fuerte, gran estela duradera que deja huella inolvidable a su paso'
      }
    ]
  },
  {
    id: 5,
    title: '¿Qué familia olfativa despierta mayor afinidad en ti?',
    titleForOther:
      '¿Qué familia olfativa despierta mayor afinidad en la persona?',
    subtitle:
      'Representa el pilar y carácter aromático predominante que más disfrutas.',
    subtitleForOther:
      'Representa el pilar y carácter aromático predominante de la fragancia.',
    options: [
      {
        id: 'Floral',
        label: 'Floral',
        icon: '🌸',
        description:
          'Rosas románticas, jazmín noble, peonía fresca y lavanda'
      },
      {
        id: 'Dulce / Acaramelado',
        label: 'Dulce / Acaramelado',
        icon: '🍯',
        description:
          'Vainilla cremosa, caramelo, haba tonka y pralinés adictivos'
      },
      {
        id: 'Cítrico / Acuático',
        label: 'Cítrico / Acuático',
        icon: '🍋',
        description:
          'Bergamota viva, limón siciliano, brisa marina y frescor revitalizante'
      },
      {
        id: 'Amaderado / Oriental',
        label: 'Amaderado / Oriental',
        icon: '🌲',
        description:
          'Sándalo cremoso, oud árabe, ámbar gris, especias cálidas y cuero'
      }
    ]
  },
  {
    id: 6,
    title: '¿Cuáles de estos acordes aromáticos prefieres o disfrutas más?',
    titleForOther:
      '¿Cuáles de estos acordes aromáticos prefiere o disfruta más la persona?',
    subtitle: 'Aromas catalogados según la familia',
    options: []
  },
  {
    id: 7,
    title: '¿Qué buscas en un perfume?',
    titleForOther: '¿Qué busca esa persona en un perfume?',
    subtitle:
      'Elige el propósito, estilo y sensación que deseas proyectar para filtrar las opciones ideales de Fraganza.',
    subtitleForOther:
      'Define el estilo o la sensación que mejor encaja con sus momentos y personalidad.',
    options: [
      {
        id: 'Inolvidable',
        label: 'Que sea Inolvidable',
        icon: '✨',
        description:
          'Estela magnética y memorable que despierte elogios y deje una huella única a donde vayas.'
      },
      {
        id: 'Agradable',
        label: 'Que sea Agradable',
        icon: '😊',
        description:
          'Equilibrado, acogedor y fácil de gustar a todos, ideal para causar una impresión positiva sin abrumar.'
      },
      {
        id: 'Versatil',
        label: 'Que sea Versátil',
        icon: '🎯',
        description:
          'Todo terreno infalible que combine armónicamente con cualquier atuendo, día, noche u ocasión casual.'
      },
      {
        id: 'Fresco y comodo',
        label: 'Que sea Fresco y Cómodo',
        icon: '🍃',
        description:
          'Sensación revitalizante, limpia y ligera como una brisa marina o cítrica, muy placentera de portar.'
      },
      {
        id: 'Fuerte',
        label: 'Que sea Fuerte',
        icon: '🔥',
        description:
          'Potente proyección, presencia marcada y duración descomunal que se haga notar con gran autoridad.'
      },
      {
        id: 'Suave',
        label: 'Que sea Suave',
        icon: '🕊️',
        description:
          'Aura íntima, sutil y discreta pegada a la piel, refinada y con elegancia sobria sin estridencias.'
      }
    ]
  },
  {
    id: 8,
    title: '¿Existe alguna faceta o aroma que prefieras evitar?',
    titleForOther:
      '¿Existe alguna faceta o nota que esa persona prefiera evitar?',
    subtitle:
      'Filtro para descartar acordes o intensidades que no sean de tu agrado.',
    subtitleForOther:
      'Filtro de exclusión negativa para descartar acordes o intensidades que le resulten incómodas.',
    options: [
      {
        id: 'sweet',
        label: 'Muy dulce o empalagoso',
        description: 'Descartar caramelo excesivo o praliné pesado'
      },
      {
        id: 'strong',
        label: 'Muy fuerte o abrumador',
        description: 'Descartar estelas envolventes o intrusivas'
      },
      {
        id: 'floral',
        label: 'Muy floral',
        description: 'Descartar buqués florales dominantes'
      },
      {
        id: 'citrus',
        label: 'Muy cítrico',
        description: 'Descartar cítricos punzantes o ácidos'
      },
      {
        id: 'woody',
        label: 'Muy amaderado u oscuro',
        description: 'Descartar maderas densas, cuero u oud'
      },
      {
        id: 'open',
        label: 'Estoy abierto/a a todo',
        description: 'No excluir ninguna nota, evaluar todo el catálogo'
      }
    ]
  },
  {
    id: 9,
    title: '¿En qué ocasión o escenario usarás principalmente tu fragancia?',
    titleForOther:
      '¿En qué ocasión o escenario usará principalmente la fragancia esa persona?',
    subtitle:
      'Determinará el escenario de uso idóneo y el consejo personalizado del perfumista para ti.',
    subtitleForOther:
      'Determinará el escenario de uso idóneo y el consejo personalizado del perfumista.',
    options: [
      {
        id: 'daily',
        label: 'Todo uso / Diario',
        icon: '🌅',
        description:
          'Para llevar siempre, cómoda y fresca en cualquier momento'
      },
      {
        id: 'office',
        label: 'Oficina / Trabajo',
        icon: '💼',
        description: 'Discreta, profesional y agradable en espacios cerrados'
      },
      {
        id: 'special',
        label: 'Ocasiones especiales',
        icon: '🌙',
        description:
          'Para citas, fiestas, salidas de noche o momentos especiales'
      },
      {
        id: 'sport',
        label: 'Deportivo / Activo',
        icon: '🏃',
        description:
          'Fresca y energizante, perfecta durante el ejercicio o actividades al aire libre'
      }
    ]
  }
];

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  version: QUIZ_CONFIG_VERSION,
  questions: DEFAULT_QUESTIONS,
  subfamilies: EXPANDED_SUBFAMILIES_FOR_QUIZ
};

export function cloneQuizConfig(config: QuizConfig): QuizConfig {
  return JSON.parse(JSON.stringify(config)) as QuizConfig;
}

export function getDefaultQuizConfig(): QuizConfig {
  return cloneQuizConfig(DEFAULT_QUIZ_CONFIG);
}

/** Devuelve la pregunta por su índice (0–9), con la de por defecto como respaldo. */
export function getQuizQuestion(config: QuizConfig, id: number): QuizQuestion {
  const found = config.questions.find((question) => question.id === id);
  const fallback = DEFAULT_QUIZ_CONFIG.questions.find((question) => question.id === id);
  return found || fallback || DEFAULT_QUIZ_CONFIG.questions[0];
}

/** Devuelve la opción de una pregunta por su id interno. */
export function getQuizOption(
  config: QuizConfig,
  questionId: number,
  optionId: string
): QuizOption | undefined {
  return getQuizQuestion(config, questionId).options.find(
    (option) => option.id === optionId
  );
}

/** Texto visible de una opción (o su id si algo falta). */
export function getQuizOptionLabel(
  config: QuizConfig,
  questionId: number,
  optionId: string
): string {
  return getQuizOption(config, questionId, optionId)?.label || optionId;
}

/** Lista de acordes de una familia, con la lista por defecto como respaldo. */
export function getQuizSubfamilies(
  config: QuizConfig,
  family: MainCategory
): QuizSubfamily[] {
  const list = config.subfamilies?.[family];
  if (Array.isArray(list) && list.length > 0) return list;
  return EXPANDED_SUBFAMILIES_FOR_QUIZ[family] || [];
}

/**
 * Normaliza una configuración venida de Supabase para que siempre tenga las
 * 10 preguntas, las opciones y las familias esperadas. Así una edición antigua
 * o incompleta nunca deja el test en blanco.
 */
export function normalizeQuizConfig(raw: unknown): QuizConfig {
  const fallback = getDefaultQuizConfig();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;

  const candidate = raw as Partial<QuizConfig>;
  const questions = fallback.questions.map((defaultQuestion) => {
    const incoming = Array.isArray(candidate.questions)
      ? candidate.questions.find((question) => question?.id === defaultQuestion.id)
      : undefined;
    if (!incoming || typeof incoming !== 'object') return defaultQuestion;

    const options = defaultQuestion.options.map((defaultOption) => {
      const incomingOption = Array.isArray(incoming.options)
        ? incoming.options.find((option) => option?.id === defaultOption.id)
        : undefined;
      if (!incomingOption || typeof incomingOption !== 'object') return defaultOption;
      return {
        ...defaultOption,
        label:
          typeof incomingOption.label === 'string' && incomingOption.label.trim()
            ? incomingOption.label
            : defaultOption.label,
        description:
          typeof incomingOption.description === 'string'
            ? incomingOption.description
            : defaultOption.description,
        icon:
          typeof incomingOption.icon === 'string' && incomingOption.icon.trim()
            ? incomingOption.icon
            : defaultOption.icon,
        codeRef:
          typeof incomingOption.codeRef === 'string' && incomingOption.codeRef.trim()
            ? incomingOption.codeRef
            : defaultOption.codeRef
      };
    });

    return {
      ...defaultQuestion,
      title:
        typeof incoming.title === 'string' && incoming.title.trim()
          ? incoming.title
          : defaultQuestion.title,
      titleForOther:
        typeof incoming.titleForOther === 'string' && incoming.titleForOther.trim()
          ? incoming.titleForOther
          : defaultQuestion.titleForOther,
      subtitle:
        typeof incoming.subtitle === 'string'
          ? incoming.subtitle
          : defaultQuestion.subtitle,
      subtitleForOther:
        typeof incoming.subtitleForOther === 'string'
          ? incoming.subtitleForOther
          : defaultQuestion.subtitleForOther,
      options
    };
  });

  const subfamilies = { ...fallback.subfamilies };
  if (candidate.subfamilies && typeof candidate.subfamilies === 'object') {
    (Object.keys(fallback.subfamilies) as MainCategory[]).forEach((family) => {
      const incomingList = candidate.subfamilies?.[family];
      if (!Array.isArray(incomingList) || incomingList.length === 0) return;
      const normalized = incomingList
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => ({
          id:
            typeof item.id === 'string' && item.id.trim()
              ? item.id
              : `custom-${family}-${index}`,
          label:
            typeof item.label === 'string' && item.label.trim()
              ? item.label
              : 'Acorde sin nombre',
          icon: typeof item.icon === 'string' ? item.icon : '✨',
          subgroup: typeof item.subgroup === 'string' ? item.subgroup : 'Acordes',
          notesSample: Array.isArray(item.notesSample)
            ? item.notesSample.filter((note): note is string => typeof note === 'string')
            : [],
          desc: typeof item.desc === 'string' ? item.desc : ''
        }));
      if (normalized.length > 0) subfamilies[family] = normalized;
    });
  }

  return {
    version: QUIZ_CONFIG_VERSION,
    questions,
    subfamilies
  };
}
