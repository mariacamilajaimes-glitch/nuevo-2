import React, { useEffect, useState } from 'react';
import { CatalogFragrance, CATALOG, MainCategory } from '../data/fraganzaCatalog';
import { getCustomizedCatalog } from '../services/catalogStore';
import {
  QuizConfig,
  getQuizOptionLabel,
  getQuizQuestion,
  getQuizSubfamilies
} from '../data/quizConfig';
import {
  getCachedQuizConfig,
  loadQuizConfig,
  subscribeQuizConfig
} from '../services/quizConfigStore';
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
  // Current question index: 0 through 9
  const [currentQ, setCurrentQ] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [winner, setWinner] = useState<CatalogFragrance | null>(null);
  const [winnerMatchPercent, setWinnerMatchPercent] = useState<number>(0);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(() => getCachedQuizConfig());

  // User answers: se guardan los `id` internos de cada opción. Así el panel
  // puede cambiar los textos sin romper el algoritmo.
  const [targetUser, setTargetUser] = useState<string>('me');
  const [genderChoice, setGenderChoice] = useState<string>('Unisex');
  const [ageRange, setAgeRange] = useState<string>('21-30');
  const [skinType, setSkinType] = useState<string>('Normal');
  const [intensityChoice, setIntensityChoice] = useState<string>('Equilibrada');
  const [familyChoice, setFamilyChoice] = useState<MainCategory>('Amaderado / Oriental');
  const [subFamilyChoices, setSubFamilyChoices] = useState<string[]>([]);
  const [subfamilyFilter, setSubfamilyFilter] = useState<string>('');
  const [personalityChoice, setPersonalityChoice] = useState<string>('Inolvidable');
  const [exclusionChoice, setExclusionChoice] = useState<string>('open');
  const [occasionChoice, setOccasionChoice] = useState<string>('special');

  const isForMe = targetUser === 'me';

  // Carga la configuración compartida desde Supabase y escucha cambios del
  // panel de administrador sin recargar la página.
  useEffect(() => {
    let active = true;
    loadQuizConfig().then((next) => {
      if (active) setQuizConfig(next);
    });
    const unsubscribe = subscribeQuizConfig((next) => setQuizConfig(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const question = (id: number) => getQuizQuestion(quizConfig, id);
  const optionLabel = (questionId: number, optionId: string) =>
    getQuizOptionLabel(quizConfig, questionId, optionId);
  const familySubfamilies = getQuizSubfamilies(quizConfig, familyChoice);

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

  const handleToggleSubfamily = (subId: string) => {
    let next: string[];
    if (subFamilyChoices.includes(subId)) {
      next = subFamilyChoices.filter((s) => s !== subId);
    } else {
      if (subFamilyChoices.length >= 2) {
        next = [subFamilyChoices[1], subId];
      } else {
        next = [...subFamilyChoices, subId];
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

    const familyDefs = getQuizSubfamilies(quizConfig, familyChoice);
    const selectedSubDefs = subFamilyChoices
      .map((id) => familyDefs.find((def) => def.id === id))
      .filter((def): def is NonNullable<typeof def> => Boolean(def));

    const isDisqualified = (perfume: CatalogFragrance, notesText: string): boolean => {
      if (exclusionChoice === 'sweet') {
        return (
          perfume.mainCategory === 'Dulce / Acaramelado' ||
          perfume.sweetness === 'Muy Dulce' ||
          hasAny(notesText, ['vainilla', 'caramelo', 'praline', 'miel', 'azúcar', 'tonka', 'chocolate', 'cacao', 'coco', 'dátil'])
        );
      }
      if (exclusionChoice === 'strong') {
        return (
          perfume.intensity === 'Envolvente' ||
          (perfume.intensity === 'Intensa' && hasAny(notesText, ['oud', 'cuero', 'tabaco', 'incienso', 'ámbar']))
        );
      }
      if (exclusionChoice === 'floral') {
        return (
          perfume.mainCategory === 'Floral' ||
          n(perfume.family).includes('floral') ||
          hasAny(notesText, ['rosa', 'jazmín', 'peonía', 'tuberosa', 'gardenia', 'azahar', 'ylang', 'nardo', 'flor'])
        );
      }
      if (exclusionChoice === 'citrus') {
        return (
          perfume.mainCategory === 'Cítrico / Acuático' ||
          hasAny(notesText, ['limón', 'bergamota', 'naranja', 'mandarina', 'pomelo', 'cítrico', 'mar', 'calone', 'acuático'])
        );
      }
      if (exclusionChoice === 'woody') {
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
        special: ['fiesta', 'cita', 'noche', 'seductor', 'especial', 'gala'],
        office: ['oficina', 'trabajo', 'formal', 'discreto', 'limpio', 'ejecutivo'],
        daily: ['diario', 'casual', 'versátil', 'día', 'todo uso'],
        sport: ['deporte', 'activo', 'fresco', 'gimnasio', 'energía']
      };
      if (hasAny(metaText, occasionMap[finalOccasion] || [])) score += 65;
      if (finalOccasion === 'special' && perfume.environment === 'Noche') score += 35;
      if (finalOccasion === 'office' && perfume.environment === 'Día') score += 25;
      if (finalOccasion === 'daily' && perfume.environment === 'Indistinto') score += 30;

      // 8. Afinidad de edad.
      const ageMatch = n(perfume.ageRange).match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
      const userAge = ageRange === '46+' ? 46 : parseInt(ageRange, 10);
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
        (finalOccasion === 'special' && perfume.environment === 'Noche') ||
        (finalOccasion === 'office' && perfume.environment === 'Día') ||
        (finalOccasion === 'daily' && perfume.environment === 'Indistinto');
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
        occasionAnswer={optionLabel(9, occasionChoice)}
        skinAnswer={optionLabel(3, skinType)}
        intensityAnswer={optionLabel(4, intensityChoice)}
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
                {question(0).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {question(0).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {question(0).options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAnswer(0, opt.id)}
                  className={`p-6 rounded-2xl text-left border transition-all duration-300 ${
                    targetUser === opt.id
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
                    <ArrowRight className="w-4 h-4 text-[#C9A84C]" />
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.description}</p>
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
                {isForMe ? question(1).title : question(1).titleForOther || question(1).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(1).subtitle : question(1).subtitleForOther || question(1).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {question(1).options.map((opt) => (
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
                    {opt.codeRef && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        isLight
                          ? 'bg-amber-100 text-[#926615] border-amber-300'
                          : 'bg-stone-900 text-[#F0D080] border-stone-700'
                      }`}>
                        {opt.codeRef}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.description}</p>
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
                {isForMe ? question(2).title : question(2).titleForOther || question(2).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(2).subtitle : question(2).subtitleForOther || question(2).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {question(2).options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAnswer(2, opt.id)}
                  className={`p-5 rounded-2xl text-center border transition-all duration-300 ${
                    ageRange === opt.id
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
                  }`}>{opt.label}</p>
                  <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.description}</p>
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
                {isForMe ? question(3).title : question(3).titleForOther || question(3).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(3).subtitle : question(3).subtitleForOther || question(3).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {question(3).options.map((item) => (
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
                    <span className="text-xl">{item.icon}</span>
                    <span className={`font-serif-luxury font-bold text-base ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>{item.label}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{item.description}</p>
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
                {isForMe ? question(4).title : question(4).titleForOther || question(4).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(4).subtitle : question(4).subtitleForOther || question(4).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {question(4).options.map((opt) => (
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
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.description}</p>
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
                {isForMe ? question(5).title : question(5).titleForOther || question(5).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(5).subtitle : question(5).subtitleForOther || question(5).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {question(5).options.map((fam) => (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => handleSelectAnswer(5, fam.id as MainCategory)}
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
                    }`}>{fam.label}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{fam.description}</p>
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
                  {isForMe ? question(6).title : question(6).titleForOther || question(6).title}
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
                {question(6).subtitle} <span className={isLight ? 'text-[#926615] font-bold' : 'text-[#F0D080] font-semibold'}>{familyChoice}</span>
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
              {(familySubfamilies || [])
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
                  const selected = subFamilyChoices.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleToggleSubfamily(sub.id)}
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
                {isForMe ? question(7).title : question(7).titleForOther || question(7).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(7).subtitle : question(7).subtitleForOther || question(7).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {question(7).options.map((opt) => (
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
                      {opt.label}
                    </p>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${
                    isLight ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    {opt.description}
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
                {isForMe ? question(8).title : question(8).titleForOther || question(8).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(8).subtitle : question(8).subtitleForOther || question(8).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {question(8).options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAnswer(8, opt.id)}
                  className={`p-5 rounded-2xl text-left border transition-all duration-300 ${
                    exclusionChoice === opt.id
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
                  }`}>{opt.label}</p>
                  <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{opt.description}</p>
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
                {isForMe ? question(9).title : question(9).titleForOther || question(9).title}
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {isForMe ? question(9).subtitle : question(9).subtitleForOther || question(9).subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {question(9).options.map((item) => (
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
                    }`}>{item.label}</span>
                  </div>
                  <p className={`text-xs italic leading-relaxed ${
                    isLight ? 'text-stone-600' : 'text-stone-400'
                  }`}>{item.description}</p>
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
