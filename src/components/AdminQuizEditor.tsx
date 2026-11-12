import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MainCategory } from '../data/fraganzaCatalog';
import {
  QuizConfig,
  QuizQuestion,
  QuizSubfamily,
  getDefaultQuizConfig,
  normalizeQuizConfig
} from '../data/quizConfig';
import {
  getCachedQuizConfig,
  loadQuizConfig,
  resetQuizConfig,
  saveQuizConfig
} from '../services/quizConfigStore';
import {
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ListChecks
} from 'lucide-react';

const FAMILIES: MainCategory[] = [
  'Floral',
  'Dulce / Acaramelado',
  'Cítrico / Acuático',
  'Amaderado / Oriental'
];

const inputClass =
  'w-full bg-black/70 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C9A84C]';

const labelClass = 'text-[11px] font-semibold text-[#F0D080] block mb-1';

/**
 * Editor de las preguntas y opciones del Test Inteligente.
 *
 * Solo se editan los textos visibles (títulos, subtítulos, etiquetas, iconos y
 * descripciones). Los `id` internos no se tocan para que el algoritmo siga
 * funcionando igual. Los acordes de la pregunta "elige hasta dos" sí se pueden
 * añadir o eliminar porque el motor los puntúa por sus notas de muestra.
 */
export const AdminQuizEditor: React.FC = () => {
  const [config, setConfig] = useState<QuizConfig>(() => getCachedQuizConfig());
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const [activeFamily, setActiveFamily] = useState<MainCategory>('Floral');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    loadQuizConfig()
      .then((next) => {
        if (active) setConfig(next);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const familySubfamilies = useMemo(
    () => config.subfamilies?.[activeFamily] || [],
    [config.subfamilies, activeFamily]
  );

  const updateQuestion = (id: number, patch: Partial<QuizQuestion>) => {
    setConfig((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question
      )
    }));
    setStatus(null);
  };

  const updateOption = (
    questionId: number,
    optionId: string,
    patch: { label?: string; description?: string; icon?: string; codeRef?: string }
  ) => {
    setConfig((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, ...patch } : option
              )
            }
          : question
      )
    }));
    setStatus(null);
  };

  const updateSubfamily = (index: number, patch: Partial<QuizSubfamily>) => {
    setConfig((prev) => {
      const list = [...(prev.subfamilies?.[activeFamily] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], ...patch };
      return {
        ...prev,
        subfamilies: { ...prev.subfamilies, [activeFamily]: list }
      };
    });
    setStatus(null);
  };

  const addSubfamily = () => {
    setConfig((prev) => {
      const list = [...(prev.subfamilies?.[activeFamily] || [])];
      const baseId = `acorde-personalizado-${activeFamily}-${Date.now()}`;
      list.push({
        id: baseId,
        label: 'Nuevo acorde',
        icon: '✨',
        subgroup: 'Acordes',
        notesSample: [],
        desc: 'Describe este acorde para que el algoritmo lo reconozca.'
      });
      return {
        ...prev,
        subfamilies: { ...prev.subfamilies, [activeFamily]: list }
      };
    });
    setStatus(null);
  };

  const removeSubfamily = (index: number) => {
    setConfig((prev) => {
      const list = [...(prev.subfamilies?.[activeFamily] || [])];
      list.splice(index, 1);
      return {
        ...prev,
        subfamilies: { ...prev.subfamilies, [activeFamily]: list }
      };
    });
    setStatus(null);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setStatus(null);
    try {
      await saveQuizConfig(normalizeQuizConfig(config));
      setConfig(normalizeQuizConfig(config));
      setStatus({ type: 'ok', text: 'Test guardado. Los visitantes ya ven los cambios.' });
    } catch (err) {
      setStatus({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo guardar el test. Revisa tu sesión de administrador.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (isSaving) return;
    if (!window.confirm('¿Restaurar las 10 preguntas y opciones originales del test?')) return;
    setIsSaving(true);
    setStatus(null);
    try {
      await resetQuizConfig();
      setConfig(getDefaultQuizConfig());
      setStatus({ type: 'ok', text: 'Test restaurado a los valores originales.' });
    } catch (err) {
      setStatus({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo restaurar el test. Revisa tu sesión de administrador.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-4 rounded-2xl bg-[#141414] border border-[#C9A84C]/30 space-y-1">
        <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#F0D080]" />
          <span>Editor del Test Inteligente</span>
        </h4>
        <p className="text-xs text-stone-400">
          Cambia los textos, iconos y acordes que ven los visitantes. Los cambios se guardan en
          Supabase y se aplican a todo el mundo. Los identificadores internos se conservan para que
          el algoritmo siga acertando.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 font-bold text-xs shadow-lg hover:brightness-110 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Guardando…' : 'Guardar Test'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving || isLoading}
          className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors flex items-center gap-1.5 border border-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span>Restaurar Originales</span>
        </button>

        {isLoading && (
          <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Cargando configuración…
          </span>
        )}
      </div>

      {status && (
        <div
          className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
            status.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          {status.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <div className="space-y-2">
        {config.questions.map((question) => {
          const isOpen = openQuestion === question.id;
          const isFamilyQuestion = question.id === 6;
          return (
            <div
              key={question.id}
              className="rounded-2xl bg-[#121212] border border-stone-800 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenQuestion(isOpen ? null : question.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-stone-900/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#F0D080] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {question.id + 1}
                  </span>
                  <span className="text-xs font-semibold text-stone-200 truncate">
                    {question.title}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-[#C9A84C] shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-stone-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-stone-800 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        {question.id === 0 ? 'Pregunta' : 'Pregunta (para mí)'}
                      </label>
                      <input
                        type="text"
                        value={question.title}
                        onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    {question.id !== 0 && (
                      <div>
                        <label className={labelClass}>Pregunta (para otra persona)</label>
                        <input
                          type="text"
                          value={question.titleForOther || ''}
                          onChange={(e) =>
                            updateQuestion(question.id, { titleForOther: e.target.value })
                          }
                          placeholder={question.title}
                          className={inputClass}
                        />
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>
                        {question.id === 0 ? 'Texto de apoyo' : 'Texto de apoyo (para mí)'}
                      </label>
                      <input
                        type="text"
                        value={question.subtitle || ''}
                        onChange={(e) => updateQuestion(question.id, { subtitle: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    {question.id !== 0 && (
                      <div>
                        <label className={labelClass}>Texto de apoyo (para otra persona)</label>
                        <input
                          type="text"
                          value={question.subtitleForOther || ''}
                          onChange={(e) =>
                            updateQuestion(question.id, { subtitleForOther: e.target.value })
                          }
                          placeholder={question.subtitle || ''}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>

                  {isFamilyQuestion ? (
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>Familia olfativa a editar</label>
                        <div className="flex flex-wrap gap-2">
                          {FAMILIES.map((family) => (
                            <button
                              key={family}
                              type="button"
                              onClick={() => setActiveFamily(family)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                activeFamily === family
                                  ? 'bg-[#C9A84C] text-stone-950 border-[#C9A84C]'
                                  : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-[#C9A84C]/50'
                              }`}
                            >
                              {family}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {familySubfamilies.map((sub, index) => (
                          <div
                            key={sub.id}
                            className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <div className="sm:col-span-2">
                                <label className={labelClass}>Icono</label>
                                <input
                                  type="text"
                                  value={sub.icon}
                                  onChange={(e) => updateSubfamily(index, { icon: e.target.value })}
                                  className={inputClass}
                                />
                              </div>
                              <div className="sm:col-span-5">
                                <label className={labelClass}>Acorde</label>
                                <input
                                  type="text"
                                  value={sub.label}
                                  onChange={(e) => updateSubfamily(index, { label: e.target.value })}
                                  className={inputClass}
                                />
                              </div>
                              <div className="sm:col-span-5">
                                <label className={labelClass}>Grupo</label>
                                <input
                                  type="text"
                                  value={sub.subgroup}
                                  onChange={(e) =>
                                    updateSubfamily(index, { subgroup: e.target.value })
                                  }
                                  className={inputClass}
                                />
                              </div>
                            </div>
                            <div>
                              <label className={labelClass}>Descripción</label>
                              <input
                                type="text"
                                value={sub.desc}
                                onChange={(e) => updateSubfamily(index, { desc: e.target.value })}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>
                                Notas que lo activan (separadas por coma)
                              </label>
                              <NotesInput
                                value={sub.notesSample}
                                onChange={(notes) =>
                                  updateSubfamily(index, { notesSample: notes })
                                }
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeSubfamily(index)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Eliminar acorde
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addSubfamily}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C9A84C]" /> Añadir acorde a {activeFamily}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className={labelClass}>Opciones de respuesta</label>
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <div
                            key={option.id}
                            className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 grid grid-cols-1 sm:grid-cols-12 gap-2"
                          >
                            {(option.icon !== undefined || question.id === 3) && (
                              <div className="sm:col-span-2">
                                <label className={labelClass}>Icono</label>
                                <input
                                  type="text"
                                  value={option.icon || ''}
                                  onChange={(e) =>
                                    updateOption(question.id, option.id, { icon: e.target.value })
                                  }
                                  className={inputClass}
                                />
                              </div>
                            )}
                            {option.codeRef !== undefined && (
                              <div className="sm:col-span-2">
                                <label className={labelClass}>Código</label>
                                <input
                                  type="text"
                                  value={option.codeRef || ''}
                                  onChange={(e) =>
                                    updateOption(question.id, option.id, {
                                      codeRef: e.target.value
                                    })
                                  }
                                  className={inputClass}
                                />
                              </div>
                            )}
                            <div className={option.codeRef !== undefined ? 'sm:col-span-8' : 'sm:col-span-10'}>
                              <label className={labelClass}>Etiqueta</label>
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) =>
                                  updateOption(question.id, option.id, { label: e.target.value })
                                }
                                className={inputClass}
                              />
                            </div>
                            <div className="sm:col-span-12">
                              <label className={labelClass}>Descripción</label>
                              <input
                                type="text"
                                value={option.description}
                                onChange={(e) =>
                                  updateOption(question.id, option.id, {
                                    description: e.target.value
                                  })
                                }
                                className={inputClass}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-stone-500">
                        Las opciones conservan su identificador interno para no alterar el algoritmo.
                        Puedes cambiar todos los textos e iconos.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Campo de notas que conserva las comas mientras se escribe. */
const NotesInput: React.FC<{ value: string[]; onChange: (notes: string[]) => void }> = ({
  value,
  onChange
}) => {
  const joined = value.join(', ');
  const [text, setText] = useState(joined);
  const lastJoined = useRef(joined);

  useEffect(() => {
    if (lastJoined.current !== joined) {
      lastJoined.current = joined;
      setText(joined);
    }
  }, [joined]);

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const next = e.target.value
          .split(',')
          .map((note) => note.trim())
          .filter(Boolean);
        lastJoined.current = next.join(', ');
        onChange(next);
      }}
      placeholder="Ej. Vainilla, Caramelo, Praliné"
      className={inputClass}
    />
  );
};
