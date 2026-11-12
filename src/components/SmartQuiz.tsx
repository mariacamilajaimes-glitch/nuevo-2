import React, { useState } from 'react';
import { CatalogFragrance, CATALOG, MainCategory } from '../data/fraganzaCatalog';
import { getCustomizedCatalog } from '../services/catalogStore';
import { EXPANDED_SUBFAMILIES_FOR_QUIZ } from '../data/fragranticaNotesDictionary';
import { includesNormalized, normalizeText } from '../utils/textNormalize';
import { QuizResultCard } from './QuizResultCard';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Flame,
  Droplet,
  Flower2,
  Trees,
  Sun,
  Shield,
  Briefcase,
  Moon,
  Zap,
  RotateCcw,
  Search
} from 'lucide-react';

interface SmartQuizProps {
  onSelectFragrance: (fragrance: CatalogFragrance) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  theme?: 'light' | 'dark';
}

export const SmartQuiz: React.FC<SmartQuizProps> = ({
  onSelectFragrance,
  favorites,
  onToggleFavorite,
  theme = 'dark',
}) => {
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light'));
  // Current question index: 0 through 8
  const [currentQ, setCurrentQ] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [winner, setWinner] = useState<CatalogFragrance | null>(null);
  const [winnerMatchPercent, setWinnerMatchPercent] = useState<number>(0);

  // User answers
  const [targetUser, setTargetUser] = useState<string>('Para mí');
  const [genderChoice, setGenderChoice] = useState<string>('Unisex / Sin preferencia');
  const [ageRange, setAgeRange] = useState<string>('21–30 años');
  const [skinType, setSkinType] = useState<string>('Normal');
  const [intensityChoice, setIntensityChoice] = useState<string>('Equilibrada');
  const [familyChoice, setFamilyChoice] = useState<MainCategory>('Amaderado / Oriental');
  const [subFamilyChoices, setSubFamilyChoices] = useState<string[]>([]);
  const [subfamilyFilter, setSubfamilyFilter] = useState<string>('');
  const [personalityChoice, setPersonalityChoice] = useState<string>('Elegante & Sofisticada');
  const [exclusionChoice, setExclusionChoice] = useState<string>('Estoy abierto/a a todo');
  const [occasionChoice, setOccasionChoice] = useState<string>('Ocasiones especiales');

  const isForMe = targetUser === 'Para mí';

  // Subfamilies map based on Question 5
  const subFamiliesMap: Record<MainCategory, string[]> = {
    'Floral': [
      'Rosa romántica',
      'Jazmín elegante',
      'Lavanda fresca',
      'Flores dulces avainilladas',
      'Peonía suave'
    ],
    'Dulce / Acaramelado': [
      'Vainilla cremosa',
      'Caramelo y pralinés',
      'Coco dulce',
      'Café y cacao',
      'Miel y tonka'
    ],
    'Cítrico / Acuático': [
      'Limón y bergamota',
      'Naranja y mandarina',
      'Brisa marina fresca',
      'Cítricos tropicales',
      'Pomelo intenso'
    ],
    'Amaderado / Oriental': [
      'Madera suave y elegante (sándalo, cedro)',
      'Cuero intenso',
      'Tabaco sofisticado',
      'Oud árabe',
      'Ámbar y especias orientales'
    ]
  };

  const handleSelectAnswer = (qIndex: number, answer: any) => {
    switch (qIndex) {
      case 0:
        setTargetUser(answer);
        setTimeout(() => setCurrentQ(1), 220);
        break;
      case 1:
        setGenderChoice(answer);
        setTimeout(() => setCurrentQ(2), 220);
        break;
      case 2:
        setAgeRange(answer);
        setTimeout(() => setCurrentQ(3), 220);
        break;
      case 3:
        setSkinType(answer);
        setTimeout(() => setCurrentQ(4), 220);
        break;
      case 4:
        setIntensityChoice(answer);
        setTimeout(() => setCurrentQ(5), 220);
        break;
      case 5:
        setFamilyChoice(answer);
        setSubFamilyChoices([]); // reset subfamilies for new family
        setTimeout(() => setCurrentQ(6), 220);
        break;
      case 6:
        // Sub-families selection (handled separately for 2 choices)
        break;
      case 7:
        setPersonalityChoice(answer);
        setTimeout(() => setCurrentQ(8), 220);
        break;
      case 8:
        setExclusionChoice(answer);
        setTimeout(() => setCurrentQ(9), 220);
        break;
      case 9:
        setOccasionChoice(answer);
        calculateAndFinish(answer);
        break;
      default:
        break;
    }
  };

  const handleToggleSubfamily = (sub: string) => {
    let next: string[];
    if (subFamilyChoices.includes(sub)) {
      next = subFamilyChoices.filter(s => s !== sub);
    } else {
      if (subFamilyChoices.length >= 2) {
        next = [subFamilyChoices[1], sub];
      } else {
        next = [...subFamilyChoices, sub];
      }
    }
    setSubFamilyChoices(next);

    // If 2 selected, allow auto advance after brief pause
    if (next.length === 2) {
      setTimeout(() => {
        setCurrentQ(7);
      }, 400);
    }
  };

  const calculateAndFinish = (finalOccasion: string) => {
    // Motor de recomendación ponderado: compara las respuestas con las notas
    // reales de la pirámide, la familia, la intensidad y la ocasión.
    const liveCatalog = getCustomizedCatalog();

    // Normaliza texto (sin acentos ni mayúsculas) para comparar notas.
    const n = (value: string) => normalizeText(value || '');
    const hasAny = (haystack: string, keywords: string[]) =>
      keywords.some((keyword) => haystack.includes(n(keyword)));

    const familyDefs = EXPANDED_SUBFAMILIES_FOR_QUIZ[familyChoice] || [];
    const selectedSubDefs = subFamilyChoices
      .map((label) => familyDefs.find((def) => def.label === label || def.id === label))
      .filter((def): def is NonNullable<typeof def> => Boolean(def));

    const EXCLUSION_LABELS = {
      sweet: 'Muy dulce o empalagoso',
      strong: 'Muy fuerte o abrumador',
      floral: 'Muy floral',
      citrus: 'Muy cítrico',
      woody: 'Muy amaderado u oscuro'
    } as const;

    const isDisqualified = (perfume: CatalogFragrance, notesText: string): boolean => {
      if (exclusionChoice === EXCLUSION_LABELS.sweet) {
        return (
          perfume.mainCategory === 'Dulce / Acaramelado' ||
          perfume.sweetness === 'Muy Dulce' ||
          hasAny(notesText, ['vainilla', 'caramelo', 'praline', 'miel', 'azúcar', 'tonka', 'chocolate', 'cacao', 'coco', 'dátil'])
        );
      }
      if (exclusionChoice === EXCLUSION_LABELS.strong) {
        return (
          perfume.intensity === 'Envolvente' ||
          (perfume.intensity === 'Intensa' && hasAny(notesText, ['oud', 'cuero', 'tabaco', 'incienso', 'ámbar']))
        );
      }
      if (exclusionChoice === EXCLUSION_LABELS.floral) {
        return (
          perfume.mainCategory === 'Floral' ||
          n(perfume.family).includes('floral') ||
          hasAny(notesText, ['rosa', 'jazmín', 'peonía', 'tuberosa', 'gardenia', 'azahar', 'ylang', 'nardo', 'flor'])
        );
      }
      if (exclusionChoice === EXCLUSION_LABELS.citrus) {
        return (
          perfume.mainCategory === 'Cítrico / Acuático' ||
          hasAny(notesText, ['limón', 'bergamota', 'naranja', 'mandarina', 'pomelo', 'cítrico', 'mar', 'calone', 'acuático'])
        );
      }
      if (exclusionChoice === EXCLUSION_LABELS.woody) {
        return (
          perfume.mainCategory === 'Amaderado / Oriental' ||
          hasAny(notesText, ['oud', 'cuero', 'incienso', 'madera', 'cedro', 'sándalo', 'pachulí', 'vetiver', 'tabaco', 'ámbar'])
        );
      }
      return false;
    };

    const scored = liveCatalog.map((perfume) => {
      const notesText = n(perfume.allNotes.join(' '));
      const familyText = n(perfume.family + ' ' + (perfume.subfamily || ''));
      const metaText = n(
        [
          perfume.personality,
          perfume.tags.join(' '),
          perfume.sensation,
          perfume.description,
          perfume.occasion,
          perfume.environment,
          perfume.family,
          perfume.subfamily || ''
        ].join(' ')
      );

      let score = 0;

      // 1. Género: misma categoría o unisex.
      if (genderChoice === 'Dama' || genderChoice === 'Caballero') {
        if (perfume.gender === genderChoice) score += 140;
        else if (perfume.gender === 'Unisex') score += 70;
      } else {
        score += perfume.gender === 'Unisex' ? 60 : 40;
      }

      // 2. Familia principal (la respuesta más importante).
      if (perfume.mainCategory === familyChoice) {
        score += 180;
      } else {
        const familyKey = n(familyChoice).split(' ')[0];
        if (familyKey && familyText.includes(familyKey)) score += 70;
        else score -= 40;
      }

      // 3. Subfamilias elegidas: coincidencia con notas reales de la pirámide.
      selectedSubDefs.forEach((def) => {
        const sampleMatches = def.notesSample.filter((sample) =>
          notesText.includes(n(sample))
        ).length;
        if (sampleMatches > 0) score += 30 + Math.min(sampleMatches, 2) * 35;

        const groupWords = n(def.subgroup + ' ' + def.label)
          .split(/\s+/)
          .filter((word) => word.length > 3);
        if (groupWords.some((word) => familyText.includes(word))) score += 25;
      });

      // 4. Química de la piel.
      if (skinType === 'Piel Seca') {
        if (perfume.skinCompat === 'Piel Seca') score += 45;
        if (hasAny(notesText, ['ámbar', 'cedro', 'sándalo', 'vainilla', 'tonka', 'almizcle'])) score += 30;
        if (perfume.intensity === 'Intensa' || perfume.intensity === 'Envolvente') score += 30;
      } else if (skinType === 'Piel Grasa') {
        if (perfume.skinCompat === 'Piel Grasa') score += 45;
        if (hasAny(notesText, ['limón', 'bergamota', 'mar', 'acuático', 'calone'])) score += 30;
        if (perfume.intensity === 'Suave' || perfume.intensity === 'Moderada') score += 30;
        if (perfume.sweetness === 'Muy Dulce' && perfume.intensity === 'Envolvente') score -= 40;
      } else if (perfume.skinCompat === 'Versátil' || perfume.skinCompat === 'Piel Mixta') {
        score += 35;
      }

      // 5. Intensidad deseada: exacta, cercana o contraria.
      const intensityOrder = ['Suave', 'Moderada', 'Intensa', 'Envolvente'];
      const wantedIntensity =
        intensityChoice === 'Suave / Fresca'
          ? 'Suave'
          : intensityChoice === 'Intensa'
          ? 'Intensa'
          : 'Moderada';
      const wantedIdx = intensityOrder.indexOf(wantedIntensity);
      const actualIdx = intensityOrder.indexOf(perfume.intensity);
      if (wantedIdx === actualIdx) score += 90;
      else if (Math.abs(wantedIdx - actualIdx) === 1) score += 35;
      else score -= 55;

      // 6. Personalidad / qué busca en un perfume.
      const personalityMap: Record<string, string[]> = {
        'Inolvidable': ['inolvidable', 'seductor', 'memorable', 'magnético', 'distinción', 'elegante'],
        'Agradable': ['agradable', 'equilibrado', 'encantador', 'amigable', 'dulce', 'limpio'],
        'Versatil': ['versátil', 'diario', 'casual', 'fácil'],
        'Fresco y comodo': ['fresco', 'cómodo', 'limpio', 'brisa', 'ligero', 'acuático'],
        'Fuerte': ['fuerte', 'potente', 'audaz', 'oud', 'cuero', 'intenso'],
        'Suave': ['suave', 'sutil', 'discreto', 'íntimo', 'delicado']
      };
      if (hasAny(metaText, personalityMap[personalityChoice] || [])) score += 70;
      if (personalityChoice === 'Versatil' && perfume.environment === 'Indistinto') score += 30;
      if (personalityChoice === 'Fresco y comodo' && perfume.mainCategory === 'Cítrico / Acuático') score += 40;
      if (
        (personalityChoice === 'Fuerte' || personalityChoice === 'Inolvidable') &&
        (perfume.intensity === 'Intensa' || perfume.intensity === 'Envolvente')
      ) {
        score += 35;
      }
      if (personalityChoice === 'Suave' && perfume.intensity === 'Suave') score += 35;

      // 7. Ocasión de uso.
      const occasionMap: Record<string, string[]> = {
        'Ocasiones especiales': ['fiesta', 'cita', 'noche', 'seductor', 'especial', 'gala'],
        'Oficina / Trabajo': ['oficina', 'trabajo', 'formal', 'discreto', 'limpio', 'ejecutivo'],
        'Todo uso / Diario': ['diario', 'casual', 'versátil', 'día', 'todo uso'],
        'Deportivo / Activo': ['deporte', 'activo', 'fresco', 'gimnasio', 'energía']
      };
      if (hasAny(metaText, occasionMap[finalOccasion] || [])) score += 65;
      if (finalOccasion === 'Ocasiones especiales' && perfume.environment === 'Noche') score += 35;
      if (finalOccasion === 'Oficina / Trabajo' && perfume.environment === 'Día') score += 25;
      if (finalOccasion === 'Todo uso / Diario' && perfume.environment === 'Indistinto') score += 30;

      // 8. Afinidad de edad.
      const ageMatch = n(perfume.ageRange).match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
      const userAge = ageRange.includes('46') ? 46 : parseInt(ageRange, 10);
      if (ageMatch && !Number.isNaN(userAge)) {
        const perfumeStart = parseInt(ageMatch[1], 10);
        const perfumeEnd = parseInt(ageMatch[2], 10);
        if (userAge >= perfumeStart && userAge <= perfumeEnd) score += 50;
        else if (Math.abs(userAge - (perfumeStart + perfumeEnd) / 2) <= 12) score += 20;
        else score -= 15;
      }

      // 9. Coherencia del dulzor con la familia elegida.
      if (familyChoice === 'Dulce / Acaramelado') {
        if (perfume.sweetness === 'Muy Dulce') score += 45;
        else if (perfume.sweetness === 'Moderado') score += 15;
        else score -= 25;
      } else if (familyChoice === 'Cítrico / Acuático') {
        if (perfume.sweetness === 'Fresco' || perfume.sweetness === 'Seco') score += 35;
      }

      // 10. Popularidad: solo como desempate suave.
      if (perfume.popularity === 'Alta') score += 6;

      // Afinidad real (0–100 %): evalúa cada dimensión por separado con un
      // peso fijo, para no mostrar un porcentaje inventado.
      let matchPoints = 0;
      const addDimension = (weight: number, ratio: number) => {
        matchPoints += weight * Math.max(0, Math.min(1, ratio));
      };

      // Género (15)
      addDimension(
        15,
        genderChoice === 'Dama' || genderChoice === 'Caballero'
          ? perfume.gender === genderChoice
            ? 1
            : perfume.gender === 'Unisex'
            ? 0.6
            : 0
          : perfume.gender === 'Unisex'
          ? 1
          : 0.8
      );

      // Familia (25)
      const familyKeyForMatch = n(familyChoice).split(' ')[0];
      addDimension(
        25,
        perfume.mainCategory === familyChoice
          ? 1
          : familyKeyForMatch && familyText.includes(familyKeyForMatch)
          ? 0.5
          : 0
      );

      // Subfamilias (15)
      if (selectedSubDefs.length === 0) {
        addDimension(15, 0.75);
      } else {
        const subRatios: number[] = selectedSubDefs.map((def) => {
          const sampleMatches = def.notesSample.filter((sample) =>
            notesText.includes(n(sample))
          ).length;
          if (sampleMatches > 0) return 1;
          const groupWords = n(def.subgroup + ' ' + def.label)
            .split(/\s+/)
            .filter((word) => word.length > 3);
          return groupWords.some((word) => familyText.includes(word)) ? 0.5 : 0;
        });
        addDimension(
          15,
          subRatios.reduce((total, value) => total + value, 0) / subRatios.length
        );
      }

      // Piel (10)
      let skinRatio = 0.5;
      if (skinType === 'Piel Seca') {
        skinRatio =
          perfume.skinCompat === 'Piel Seca'
            ? 1
            : hasAny(notesText, ['ámbar', 'cedro', 'sándalo', 'vainilla', 'tonka', 'almizcle']) &&
              (perfume.intensity === 'Intensa' || perfume.intensity === 'Envolvente')
            ? 0.8
            : 0.4;
      } else if (skinType === 'Piel Grasa') {
        skinRatio =
          perfume.skinCompat === 'Piel Grasa'
            ? 1
            : hasAny(notesText, ['limón', 'bergamota', 'mar', 'acuático', 'calone']) &&
              (perfume.intensity === 'Suave' || perfume.intensity === 'Moderada')
            ? 0.8
            : 0.4;
      } else {
        skinRatio =
          perfume.skinCompat === 'Versátil' || perfume.skinCompat === 'Piel Mixta' ? 1 : 0.6;
      }
      addDimension(10, skinRatio);

      // Intensidad (10)
      const intensityDistance = Math.abs(wantedIdx - actualIdx);
      addDimension(10, intensityDistance === 0 ? 1 : intensityDistance === 1 ? 0.6 : 0.2);

      // Personalidad (10)
      const personalityHit = hasAny(metaText, personalityMap[personalityChoice] || []);
      const personalityBonus =
        (personalityChoice === 'Versatil' && perfume.environment === 'Indistinto') ||
        (personalityChoice === 'Fresco y comodo' &&
          perfume.mainCategory === 'Cítrico / Acuático') ||
        ((personalityChoice === 'Fuerte' || personalityChoice === 'Inolvidable') &&
          (perfume.intensity === 'Intensa' || perfume.intensity === 'Envolvente')) ||
        (personalityChoice === 'Suave' && perfume.intensity === 'Suave');
      addDimension(10, personalityHit ? 1 : personalityBonus ? 0.7 : 0.4);

      // Ocasión (10)
      const occasionHit = hasAny(metaText, occasionMap[finalOccasion] || []);
      const occasionBonus =
        (finalOccasion === 'Ocasiones especiales' && perfume.environment === 'Noche') ||
        (finalOccasion === 'Oficina / Trabajo' && perfume.environment === 'Día') ||
        (finalOccasion === 'Todo uso / Diario' && perfume.environment === 'Indistinto');
      addDimension(10, occasionHit ? 1 : occasionBonus ? 0.7 : 0.4);

      // Edad (5)
      let ageRatio = 0.5;
      if (ageMatch && !Number.isNaN(userAge)) {
        const perfumeStart = parseInt(ageMatch[1], 10);
        const perfumeEnd = parseInt(ageMatch[2], 10);
        if (userAge >= perfumeStart && userAge <= perfumeEnd) ageRatio = 1;
        else if (Math.abs(userAge - (perfumeStart + perfumeEnd) / 2) <= 12) ageRatio = 0.6;
        else ageRatio = 0.3;
      }
      addDimension(5, ageRatio);

      return {
        perfume,
        score,
        disqualified: isDisqualified(perfume, notesText),
        matchPercent: Math.round(matchPoints)
      };
    });

    // Si pidió evitar algo, se descartan esos perfumes; si quedan muy pocas
    // opciones, se aplica una penalización fuerte en lugar de eliminarlos.
    let candidates = scored.filter((item) => !item.disqualified);
    if (candidates.length < 5) {
      candidates = scored.map((item) => ({
        ...item,
        score: item.disqualified ? item.score - 400 : item.score
      }));
    }

    candidates.sort((a, b) => b.score - a.score);
    const topMatch = candidates[0] || {
      perfume: liveCatalog[0] || CATALOG[0],
      score: 0,
      disqualified: false,
      matchPercent: 0
    };

    setWinner(topMatch.perfume);
    setWinnerMatchPercent(topMatch.matchPercent);
    setIsFinished(true);

    // Launch luxury gold confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C9A84C', '#F0D080', '#A07830', '#ffffff']
      });
    } catch {}
  };

  const restartQuiz = () => {
    setCurrentQ(0);
    setIsFinished(false);
    setWinner(null);
    setWinnerMatchPercent(0);
    setSubFamilyChoices([]);
  };

  if (isFinished && winner) {
    return (
      <QuizResultCard
        winner={winner}
        matchPercent={winnerMatchPercent}
        occasionAnswer={occasionChoice}
        skinAnswer={skinType}
        intensityAnswer={intensityChoice}
        onSelectFragrance={onSelectFragrance}
        onRestartQuiz={restartQuiz}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        theme={theme}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Title & Subtitle */}
      <div className="text-center space-y-3 pt-2">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest shadow-md ${
          isLight
            ? 'bg-amber-100 text-[#926615] border-amber-300'
            : 'bg-[#C9A84C]/15 border-[#C9A84C]/40 text-[#F0D080]'
        }`}>
          <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span>Test Inteligente de Perfumería</span>
        </div>
        <h1 className={`text-3xl md:text-5xl font-extrabold font-serif-luxury tracking-tight ${
          isLight ? 'text-[#09090b]' : 'text-stone-100'
        }`}>
          Descubre Tu Fragancia Ideal
        </h1>
        <p className={`max-w-xl mx-auto text-sm md:text-base leading-relaxed ${
          isLight ? 'text-stone-600' : 'text-stone-400'
        }`}>
          Un algoritmo exclusivo calibrado con la biblioteca oficial de Fraganza. Selección automática al responder.
        </p>
      </div>

      {/* Main Question Card with Gold Glow */}
      <div className={`relative rounded-3xl border p-6 md:p-10 shadow-2xl backdrop-blur-xl ${
        isLight
          ? 'bg-white border-stone-200 text-[#09090b] shadow-stone-900/5'
          : 'bg-[#0d0d0d] border-[#C9A84C]/30 text-stone-100 shadow-[#C9A84C]/10'
      }`}>
        {/* Subtle decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A07830] via-[#F0D080] to-[#A07830]" />

        {/* Stepper Header */}
        <div className={`flex items-center justify-between pb-6 border-b mb-8 ${
          isLight ? 'border-stone-200' : 'border-stone-800/80'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs uppercase tracking-widest font-bold ${
              isLight ? 'text-[#926615]' : 'text-[#F0D080]'
            }`}>
              Pregunta {currentQ + 1} de 10
            </span>
          </div>

          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentQ
                    ? 'w-7 bg-[#F0D080] shadow-sm shadow-[#C9A84C]'
                    : idx < currentQ
                    ? 'w-3 bg-[#A07830]'
                    : 'w-3 bg-stone-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* PREGUNTA 0 */}
        {currentQ === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                ¿A quién va dirigida la fragancia?
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Permite al algoritmo calibrar sugerencias para uso personal o para obsequiar a alguien especial.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                { title: 'Para mí', desc: 'Desea encontrar su nueva firma olfativa predilecta' },
                { title: 'Para otra persona', desc: 'Busca sorprender a alguien especial con una fragancia inolvidable' }
              ].map((opt) => (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => handleSelectAnswer(0, opt.title)}
                  className={`p-6 rounded-2xl text-left border transition-all duration-300 ${
                    targetUser === opt.title
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-lg font-bold font-serif-luxury ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{opt.title}</span>
                    <ArrowRight className="w-4 h-4 text-[#C9A84C]" />
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 1 */}
        {currentQ === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿Qué perfil o género de fragancia buscas para ti?' : '¿Qué perfil o género de fragancia busca la persona?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? 'Filtraremos de inmediato nuestro catálogo según tu preferencia.' : 'Filtraremos de inmediato nuestro catálogo según el perfil seleccionado.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                { id: 'Dama', label: 'Dama', codeRef: 'D-', desc: 'Elegancia femenina, florales radiantes, dulces y frutales chic' },
                { id: 'Caballero', label: 'Caballero', codeRef: 'C-', desc: 'Varonil, maderas nobles, especias cálidas y acordes fougère' },
                { id: 'Unisex / Sin preferencia', label: 'Unisex / Sin preferencia', codeRef: 'U-', desc: 'Composiciones modernas y versátiles sin distinción de género' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAnswer(1, opt.id)}
                  className={`p-6 rounded-2xl text-left border transition-all duration-300 ${
                    genderChoice === opt.id
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-lg font-bold font-serif-luxury ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{opt.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isLight
                        ? 'bg-amber-100 text-[#926615] border-amber-300'
                        : 'bg-stone-900 text-[#F0D080] border-stone-700'
                    }`}>
                      {opt.codeRef}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 2 */}
        {currentQ === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿En qué rango de edad te encuentras?' : '¿En qué rango de edad se encuentra la persona?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? 'Nos permite calibrar entre propuestas juveniles dinámicas o creaciones maduras y señoriales para ti.' : 'Ayuda a calibrar entre propuestas juveniles dinámicas o creaciones maduras y señoriales.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { range: '15–20 años', desc: 'Chispeante, fresco y juvenil' },
                { range: '21–30 años', desc: 'Moderno, seductor y fiestero' },
                { range: '31–45 años', desc: 'Sofisticado, ejecutivo y seguro' },
                { range: '46 años o más', desc: 'Distinguido, aristocrático y clásico' }
              ].map((opt) => (
                <button
                  key={opt.range}
                  type="button"
                  onClick={() => handleSelectAnswer(2, opt.range)}
                  className={`p-5 rounded-2xl text-center border transition-all duration-300 ${
                    ageRange === opt.range
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <p className={`font-serif-luxury font-bold text-base mb-1 ${
                    isLight ? 'text-[#09090b]' : 'text-stone-100'
                  }`}>{opt.range}</p>
                  <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 3 */}
        {currentQ === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿Qué tipo de piel tienes?' : '¿Qué tipo de piel posee la persona?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? 'Tu química dérmica y nivel de hidratación influyen directamente en la fijación y duración de tu perfume.' : 'La química dérmica y el nivel de hidratación influyen directamente en la fijación y duración del perfume.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                {
                  id: 'Piel Seca',
                  emoji: '🏜️',
                  title: 'Piel Seca',
                  desc: 'Absorbe el perfume rápido; recomendamos fórmulas con mayor fijación o acordes densos como ámbar, maderas nobles y vainilla.'
                },
                {
                  id: 'Piel Mixta',
                  emoji: '⚖️',
                  title: 'Piel Mixta',
                  desc: 'Zona T con mayor oleosidad; equilibrio óptimo para proyectar acordes aromáticos, especiados y notas intermedias.'
                },
                {
                  id: 'Normal',
                  emoji: '🌸',
                  title: 'Piel Normal',
                  desc: 'Equilibrio perfecto de pH e hidratación; proyecta fielmente cualquier composición olfativa de salida a fondo.'
                },
                {
                  id: 'Piel Grasa',
                  emoji: '✨',
                  title: 'Piel Grasa',
                  desc: 'Mayor oleosidad natural; intensifica y proyecta mucho más el perfume; las fragancias frescas y acuáticas duran horas prolongadas.'
                }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAnswer(3, item.id)}
                  className={`p-5 rounded-2xl text-left border transition-all duration-300 ${
                    skinType === item.id
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{item.emoji}</span>
                    <span className={`font-serif-luxury font-bold text-base ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{item.title}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 4 */}
        {currentQ === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿Qué nivel de intensidad o proyección prefieres?' : '¿Qué nivel de intensidad o proyección prefiere la persona?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? 'Define el radio de proyección y la huella sensorial que deseas dejar en tu entorno.' : 'Define el radio de proyección y la huella sensorial que dejará en el ambiente.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                {
                  id: 'Suave / Fresca',
                  icon: '🌿',
                  label: 'Suave / Fresca',
                  desc: 'Discreta, ligera, ideal para el día a día y cercanía sin saturar el espacio'
                },
                {
                  id: 'Equilibrada',
                  icon: '✨',
                  label: 'Equilibrada',
                  desc: 'Ni demasiado tenue ni abrumadora, altamente versátil y elegante en cualquier momento'
                },
                {
                  id: 'Intensa',
                  icon: '🔥',
                  label: 'Intensa',
                  desc: 'Proyección fuerte, gran estela duradera que deja huella inolvidable a su paso'
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAnswer(4, opt.id)}
                  className={`p-6 rounded-2xl text-left border transition-all duration-300 ${
                    intensityChoice === opt.id
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{opt.icon}</span>
                    <span className={`font-serif-luxury font-bold text-base ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{opt.label}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 5 */}
        {currentQ === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿Qué familia olfativa despierta mayor afinidad en ti?' : '¿Qué familia olfativa despierta mayor afinidad en la persona?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? 'Representa el pilar y carácter aromático predominante que más disfrutas.' : 'Representa el pilar y carácter aromático predominante de la fragancia.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                {
                  id: 'Floral' as MainCategory,
                  icon: '🌸',
                  title: 'Floral',
                  desc: 'Rosas románticas, jazmín noble, peonía fresca y lavanda'
                },
                {
                  id: 'Dulce / Acaramelado' as MainCategory,
                  icon: '🍯',
                  title: 'Dulce / Acaramelado',
                  desc: 'Vainilla cremosa, caramelo, haba tonka y pralinés adictivos'
                },
                {
                  id: 'Cítrico / Acuático' as MainCategory,
                  icon: '🍋',
                  title: 'Cítrico / Acuático',
                  desc: 'Bergamota viva, limón siciliano, brisa marina y frescor revitalizante'
                },
                {
                  id: 'Amaderado / Oriental' as MainCategory,
                  icon: '🌲',
                  title: 'Amaderado / Oriental',
                  desc: 'Sándalo cremoso, oud árabe, ámbar gris, especias cálidas y cuero'
                }
              ].map((fam) => (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => handleSelectAnswer(5, fam.id)}
                  className={`p-6 rounded-2xl text-left border transition-all duration-300 ${
                    familyChoice === fam.id
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{fam.icon}</span>
                    <span className={`font-serif-luxury font-bold text-lg ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{fam.title}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{fam.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 6 (Sub-familia condicional, basada en la biblioteca olfativa) */}
        {currentQ === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                  isLight ? 'text-[#09090b]' : 'text-stone-100'
                }`}>
                  {isForMe ? '¿Cuáles de estos acordes aromáticos prefieres o disfrutas más?' : '¿Cuáles de estos acordes aromáticos prefiere o disfruta más la persona?'}
                </h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  isLight
                    ? 'bg-amber-100 text-[#926615] border-amber-300'
                    : 'bg-[#C9A84C]/20 text-[#F0D080] border-[#C9A84C]/40'
                }`}>
                  Elige hasta dos ({subFamilyChoices.length}/2)
                </span>
              </div>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Aromas catalogados según la familia <span className={isLight ? 'text-[#926615] font-bold' : 'text-[#F0D080] font-semibold'}>{familyChoice}</span> (basados en la biblioteca olfativa oficial de Fraganza).
              </p>

              {/* Quick filter input */}
              <div className="relative mt-3">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-stone-400' : 'text-stone-400'}`} />
                <input
                  type="text"
                  value={subfamilyFilter}
                  onChange={(e) => setSubfamilyFilter(e.target.value)}
                  placeholder={`Filtrar notas de ${familyChoice} (ej. vainilla, oud, lavanda, bergamota)...`}
                  className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none ${
                    isLight
                      ? 'bg-stone-50 border-stone-300 text-[#09090b] placeholder-stone-400 focus:border-amber-500 shadow-xs'
                      : 'bg-[#121212] border-stone-800 text-stone-200 placeholder-stone-500 focus:border-[#C9A84C]'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 max-h-[50vh] overflow-y-auto pr-1">
              {(EXPANDED_SUBFAMILIES_FOR_QUIZ[familyChoice] || [])
                .filter((sub) => {
                  if (!subfamilyFilter.trim()) return true;
                  return (
                    includesNormalized(sub.label, subfamilyFilter) ||
                    includesNormalized(sub.desc, subfamilyFilter) ||
                    includesNormalized(sub.subgroup, subfamilyFilter) ||
                    sub.notesSample.some((n) => includesNormalized(n, subfamilyFilter))
                  );
                })
                .map((sub) => {
                  const selected = subFamilyChoices.includes(sub.label);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleToggleSubfamily(sub.label)}
                      className={`p-4 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between space-y-2 group ${
                        selected
                          ? isLight
                            ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] font-semibold shadow-md ring-1 ring-[#C9A84C]'
                            : 'bg-[#C9A84C]/20 border-[#C9A84C] text-stone-100 font-semibold shadow-lg shadow-[#C9A84C]/15 ring-1 ring-[#C9A84C]'
                          : isLight
                          ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50'
                          : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#181818]'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{sub.icon}</span>
                          <div>
                            <span className={`text-sm font-bold block transition-colors ${
                              isLight
                                ? 'text-[#09090b] group-hover:text-[#926615]'
                                : 'text-stone-100 group-hover:text-[#F0D080]'
                            }`}>
                              {sub.label}
                            </span>
                            <span className={`text-[10px] uppercase font-mono tracking-wider ${
                              isLight ? 'text-amber-800' : 'text-[#C9A84C]/80'
                            }`}>
                              {sub.subgroup}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                            selected
                              ? 'bg-[#C9A84C] border-[#C9A84C] text-stone-950 font-bold'
                              : isLight
                              ? 'border-stone-300 bg-stone-100'
                              : 'border-stone-700 bg-stone-900'
                          }`}
                        >
                          {selected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>

                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                        isLight ? 'text-stone-600' : 'text-stone-400'
                      }`}>
                        {sub.desc}
                      </p>

                      <div className={`flex flex-wrap gap-1 pt-1 border-t ${
                        isLight ? 'border-stone-200' : 'border-stone-800/60'
                      }`}>
                        {sub.notesSample.map((n, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[9px] border ${
                              isLight
                                ? 'bg-stone-100 text-stone-700 border-stone-200'
                                : 'bg-stone-900/90 text-stone-300 border border-stone-800'
                            }`}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className={`pt-4 flex justify-between items-center border-t ${
              isLight ? 'border-stone-200' : 'border-stone-800/80'
            }`}>
              <span className={`text-xs ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>
                {subFamilyChoices.length === 2
                  ? '¡2 seleccionados! Avanzando automáticamente...'
                  : 'Selecciona 1 o 2 opciones favoritas'}
              </span>
              {subFamilyChoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentQ(7)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A07830] to-[#F0D080] text-stone-950 text-xs font-bold transition-all shadow-md hover:brightness-110 cursor-pointer"
                >
                  Continuar con {subFamilyChoices.length} selección{subFamilyChoices.length > 1 ? 'es' : ''}
                </button>
              )}
            </div>
          </div>
        )}

        {/* PREGUNTA 7 (¿Qué buscas en un perfume?) */}
        {currentQ === 7 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿Qué buscas en un perfume?' : '¿Qué busca esa persona en un perfume?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe
                  ? 'Elige el propósito, estilo y sensación que deseas proyectar para filtrar las opciones ideales de Fraganza.'
                  : 'Define el estilo o la sensación que mejor encaja con sus momentos y personalidad.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {[
                {
                  id: 'Inolvidable',
                  icon: '✨',
                  title: 'Que sea Inolvidable',
                  desc: 'Estela magnética y memorable que despierte elogios y deje una huella única a donde vayas.'
                },
                {
                  id: 'Agradable',
                  icon: '😊',
                  title: 'Que sea Agradable',
                  desc: 'Equilibrado, acogedor y fácil de gustar a todos, ideal para causar una impresión positiva sin abrumar.'
                },
                {
                  id: 'Versatil',
                  icon: '🎯',
                  title: 'Que sea Versátil',
                  desc: 'Todo terreno infalible que combine armónicamente con cualquier atuendo, día, noche u ocasión casual.'
                },
                {
                  id: 'Fresco y comodo',
                  icon: '🍃',
                  title: 'Que sea Fresco y Cómodo',
                  desc: 'Sensación revitalizante, limpia y ligera como una brisa marina o cítrica, muy placentera de portar.'
                },
                {
                  id: 'Fuerte',
                  icon: '🔥',
                  title: 'Que sea Fuerte',
                  desc: 'Potente proyección, presencia marcada y duración descomunal que se haga notar con gran autoridad.'
                },
                {
                  id: 'Suave',
                  icon: '🕊️',
                  title: 'Que sea Suave',
                  desc: 'Aura íntima, sutil y discreta pegada a la piel, refinada y con elegancia sobria sin estridencias.'
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAnswer(7, opt.id)}
                  className={`p-5 rounded-2xl text-left border transition-all duration-300 flex flex-col justify-between space-y-2 group cursor-pointer ${
                    personalityChoice === opt.id
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{opt.icon}</span>
                    <p className={`font-serif-luxury font-bold text-sm transition-colors ${
                      isLight
                        ? 'text-[#09090b] group-hover:text-[#926615]'
                        : 'text-stone-100 group-hover:text-[#F0D080]'
                    }`}>
                      {opt.title}
                    </p>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${
                    isLight ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 8 (Exclusión) */}
        {currentQ === 8 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿Existe alguna faceta o aroma que prefieras evitar?' : '¿Existe alguna faceta o nota que esa persona prefiera evitar?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe
                  ? 'Filtro para descartar acordes o intensidades que no sean de tu agrado.'
                  : 'Filtro de exclusión negativa para descartar acordes o intensidades que le resulten incómodas.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {[
                { title: 'Muy dulce o empalagoso', desc: 'Descartar caramelo excesivo o praliné pesado' },
                { title: 'Muy fuerte o abrumador', desc: 'Descartar estelas envolventes o intrusivas' },
                { title: 'Muy floral', desc: 'Descartar buqués florales dominantes' },
                { title: 'Muy cítrico', desc: 'Descartar cítricos punzantes o ácidos' },
                { title: 'Muy amaderado u oscuro', desc: 'Descartar maderas densas, cuero u oud' },
                { title: 'Estoy abierto/a a todo', desc: 'No excluir ninguna nota, evaluar todo el catálogo' }
              ].map((opt) => (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => handleSelectAnswer(8, opt.title)}
                  className={`p-5 rounded-2xl text-left border transition-all duration-300 ${
                    exclusionChoice === opt.title
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <p className={`font-serif-luxury font-bold text-sm mb-1 ${
                    isLight ? 'text-[#09090b]' : 'text-stone-100'
                  }`}>{opt.title}</p>
                  <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREGUNTA 9 (Ocasión de uso) */}
        {currentQ === 9 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold font-serif-luxury ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                {isForMe ? '¿En qué ocasión o escenario usarás principalmente tu fragancia?' : '¿En qué ocasión o escenario usará principalmente la fragancia esa persona?'}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe
                  ? 'Determinará el escenario de uso idóneo y el consejo personalizado del perfumista para ti.'
                  : 'Determinará el escenario de uso idóneo y el consejo personalizado del perfumista.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                {
                  id: 'Todo uso / Diario',
                  icon: '🌅',
                  title: 'Todo uso / Diario',
                  desc: 'Para llevar siempre, cómoda y fresca en cualquier momento'
                },
                {
                  id: 'Oficina / Trabajo',
                  icon: '💼',
                  title: 'Oficina / Trabajo',
                  desc: 'Discreta, profesional y agradable en espacios cerrados'
                },
                {
                  id: 'Ocasiones especiales',
                  icon: '🌙',
                  title: 'Ocasiones especiales',
                  desc: 'Para citas, fiestas, salidas de noche o momentos especiales'
                },
                {
                  id: 'Deportivo / Activo',
                  icon: '🏃',
                  title: 'Deportivo / Activo',
                  desc: 'Fresca y energizante, perfecta durante el ejercicio o actividades al aire libre'
                }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAnswer(9, item.id)}
                  className={`p-6 rounded-2xl text-left border transition-all duration-300 ${
                    occasionChoice === item.id
                      ? isLight
                        ? 'bg-amber-100/90 border-[#C9A84C] text-[#09090b] shadow-md ring-1 ring-[#C9A84C]'
                        : 'bg-[#C9A84C]/15 border-[#C9A84C] text-stone-100 shadow-xl shadow-[#C9A84C]/10 ring-1 ring-[#C9A84C]'
                      : isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:bg-stone-50 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-300 hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`font-serif-luxury font-bold text-lg ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{item.title}</span>
                  </div>
                  <p className={`text-xs italic leading-relaxed ${
                    isLight ? 'text-stone-600' : 'text-stone-400'
                  }`}>{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer controls: Back button */}
        {currentQ > 0 && (
          <div className={`pt-8 mt-8 border-t flex justify-between items-center ${
            isLight ? 'border-stone-200' : 'border-stone-800/80'
          }`}>
            <button
              type="button"
              onClick={() => setCurrentQ(currentQ - 1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300 shadow-xs'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Pregunta anterior</span>
            </button>
            <span className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>
              Fraganza · Algoritmo Olfativo v2.0
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
