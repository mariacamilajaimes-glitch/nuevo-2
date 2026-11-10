import React, { useState, useMemo, useEffect } from 'react';
import { CatalogFragrance, CATALOG, ALL_UNIQUE_NOTES } from '../data/fraganzaCatalog';
import {
  getCustomizedCatalog,
  deleteNoteGlobally,
  mergeNotesGlobally,
  updateNoteCategoryGlobally
} from '../services/catalogStore';
import { getNoteDetail, FRAGRANTICA_NOTES, NoteDetail } from '../data/fragranticaNotesDictionary';
import {
  getRealNotePhoto,
  computeFragranticaAccords,
  BRAND_CONFIGS,
  getPerfumeBottlePhoto
} from '../data/fragranceVisuals';
import {
  Search,
  Filter,
  Plus,
  X,
  Sparkles,
  ChevronRight,
  Heart,
  Ban,
  Check,
  Flame,
  Layers,
  Info,
  BookOpen,
  Droplets,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  GitMerge,
  Edit3,
  Tag
} from 'lucide-react';

interface AdvancedSearchProps {
  onSelectFragrance: (fragrance: CatalogFragrance) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  theme?: 'light' | 'dark';
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSelectFragrance,
  favorites,
  onToggleFavorite,
  theme = 'dark',
}) => {
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light'));
  // Mode: 'notes' (Fragrantica visual notes finder), 'text' (search by code/name), or 'glossary' (Fragrantica notes encyclopedia)
  const [searchMode, setSearchMode] = useState<'notes' | 'text' | 'glossary'>('notes');

  // Text/Code search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pyramid filter position
  const [pyramidPosition, setPyramidPosition] = useState<'all' | 'top' | 'heart' | 'base'>('all');

  // Note category filter
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('Todas');

  // Filter query inside the 247 real notes
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');

  // Included & Excluded notes
  const [includedNotes, setIncludedNotes] = useState<string[]>(['Vainilla']);
  const [excludedNotes, setExcludedNotes] = useState<string[]>([]);

  // Active note detail modal state (¿A qué huele esta nota?)
  const [selectedNoteDetail, setSelectedNoteDetail] = useState<NoteDetail | null>(null);

  // Glossary filter state
  const [glossarySearch, setGlossarySearch] = useState<string>('');
  const [glossaryFamily, setGlossaryFamily] = useState<string>('Todas');

  // Admin Note Manager modal state
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('fraganza_admin_logged') === 'true';
  const [isAdminNoteManagerOpen, setIsAdminNoteManagerOpen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'delete' | 'merge' | 'category' | 'manage_families'>('delete');
  const [adminSelectedNote, setAdminSelectedNote] = useState<string>('Vainilla');
  const [adminTargetMergeNote, setAdminTargetMergeNote] = useState<string>('Vainilla');
  const [adminNewCategory, setAdminNewCategory] = useState<string>('Gourmand & Dulces');
  const [adminNewFamilyInput, setAdminNewFamilyInput] = useState<string>('');
  const [adminActionStatus, setAdminActionStatus] = useState<string | null>(null);

  // Default and custom note categories (families)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fraganza_note_families');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      'Todas',
      'Florales',
      'Cítricos',
      'Frutales',
      'Gourmand & Dulces',
      'Maderas',
      'Especias',
      'Aromáticas & Verdes',
      'Acuáticas & Frescas',
      'Cuero & Resinas'
    ];
  });

  // Dynamic catalog containing admin overrides
  const [catalogList, setCatalogList] = useState<CatalogFragrance[]>(() => getCustomizedCatalog());

  useEffect(() => {
    const handleUpdate = () => {
      setCatalogList(getCustomizedCatalog());
    };
    window.addEventListener('fraganza_catalog_updated', handleUpdate);
    window.addEventListener('fraganza_notes_updated', handleUpdate);
    return () => {
      window.removeEventListener('fraganza_catalog_updated', handleUpdate);
      window.removeEventListener('fraganza_notes_updated', handleUpdate);
    };
  }, []);

  // Compute all unique notes strictly present in the selected pyramid position
  const availableNotesForPosition = useMemo(() => {
    const set = new Set<string>();
    catalogList.forEach((f) => {
      if (pyramidPosition === 'top') {
        (f.pyramid.top || []).forEach((n) => set.add(n));
      } else if (pyramidPosition === 'heart') {
        (f.pyramid.heart || []).forEach((n) => set.add(n));
      } else if (pyramidPosition === 'base') {
        (f.pyramid.base || []).forEach((n) => set.add(n));
      } else {
        f.allNotes.forEach((n) => set.add(n));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalogList, pyramidPosition]);

  // Frequency count of notes in catalog
  const noteFrequencyMap = useMemo(() => {
    const map: Record<string, number> = {};
    catalogList.forEach((f) => {
      f.allNotes.forEach((n) => {
        map[n] = (map[n] || 0) + 1;
      });
    });
    return map;
  }, [catalogList]);

  // Filtered list of notes to display in the visual Fragrantica grid
  const displayedNotes = useMemo(() => {
    let list = availableNotesForPosition;

    // Filter by category
    if (noteCategoryFilter !== 'Todas') {
      list = list.filter((n) => {
        const visual = getRealNotePhoto(n);
        return visual.category === noteCategoryFilter;
      });
    }

    // Filter by search query
    if (noteSearchQuery.trim()) {
      const q = noteSearchQuery.toLowerCase();
      list = list.filter((n) => n.toLowerCase().includes(q));
    }

    // Sort by popularity (frequency in catalog) so most common notes appear first
    return list.sort((a, b) => (noteFrequencyMap[b] || 0) - (noteFrequencyMap[a] || 0));
  }, [availableNotesForPosition, noteCategoryFilter, noteSearchQuery, noteFrequencyMap]);

  // Note categories present in the catalog (Dynamic from customCategories)
  const availableCategories = customCategories;

  const handleAddFamily = (newFamily: string) => {
    const trimmed = newFamily.trim();
    if (!trimmed) return;
    if (customCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setAdminActionStatus(`La familia "${trimmed}" ya existe en el catálogo.`);
      setTimeout(() => setAdminActionStatus(null), 3000);
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    try {
      localStorage.setItem('fraganza_note_families', JSON.stringify(updated));
    } catch {}
    setAdminNewFamilyInput('');
    setAdminActionStatus(`¡Familia "${trimmed}" agregada con éxito!`);
    setTimeout(() => setAdminActionStatus(null), 3500);
  };

  const handleDeleteFamily = (familyToDelete: string) => {
    if (familyToDelete === 'Todas') return;
    const updated = customCategories.filter((c) => c !== familyToDelete);
    setCustomCategories(updated);
    if (noteCategoryFilter === familyToDelete) {
      setNoteCategoryFilter('Todas');
    }
    try {
      localStorage.setItem('fraganza_note_families', JSON.stringify(updated));
    } catch {}
    setAdminActionStatus(`Familia "${familyToDelete}" eliminada.`);
    setTimeout(() => setAdminActionStatus(null), 3500);
  };

  // Toggle note inclusion
  const toggleIncludeNote = (note: string) => {
    if (includedNotes.includes(note)) {
      setIncludedNotes(includedNotes.filter((n) => n !== note));
    } else {
      setIncludedNotes([...includedNotes, note]);
      // Remove from excluded if it was there
      setExcludedNotes(excludedNotes.filter((n) => n !== note));
    }
  };

  // Toggle note exclusion
  const toggleExcludeNote = (note: string) => {
    if (excludedNotes.includes(note)) {
      setExcludedNotes(excludedNotes.filter((n) => n !== note));
    } else {
      setExcludedNotes([...excludedNotes, note]);
      // Remove from included if it was there
      setIncludedNotes(includedNotes.filter((n) => n !== note));
    }
  };

  const clearAllNoteFilters = () => {
    setIncludedNotes([]);
    setExcludedNotes([]);
    setNoteSearchQuery('');
  };

  // Results calculation for Notes Search
  const noteSearchResults = useMemo(() => {
    return catalogList.map((perfume) => {
      // Determine candidate notes based on pyramid position
      let candidateNotes: string[] = [];
      if (pyramidPosition === 'top') candidateNotes = perfume.pyramid.top;
      else if (pyramidPosition === 'heart') candidateNotes = perfume.pyramid.heart;
      else if (pyramidPosition === 'base') candidateNotes = perfume.pyramid.base;
      else candidateNotes = perfume.allNotes;

      const candLower = candidateNotes.map((n) => n.toLowerCase());

      // Check excluded notes: if any match, reject perfume
      const hasExcluded = excludedNotes.some((ex) =>
        perfume.allNotes.some((pn) => pn.toLowerCase().includes(ex.toLowerCase()))
      );
      if (hasExcluded) return null;

      // Check matched included notes
      const matched = includedNotes.filter((inc) =>
        candLower.some((cn) => cn.includes(inc.toLowerCase()) || inc.toLowerCase().includes(cn))
      );

      // If user selected included notes, only show perfumes that match at least 1 note
      if (includedNotes.length > 0 && matched.length === 0) return null;

      return {
        perfume,
        matchedNotes: matched,
        score: matched.length * 15 + (perfume.popularity === 'Alta' ? 3 : 0),
      };
    })
      .filter((item): item is { perfume: CatalogFragrance; matchedNotes: string[]; score: number } => item !== null)
      .sort((a, b) => b.score - a.score);
  }, [catalogList, includedNotes, excludedNotes, pyramidPosition]);

  // Autocomplete suggestions for Text/Code search
  const textSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();

    if (q.startsWith('d-') || q === 'd') {
      return catalogList.filter((f) => f.code.toLowerCase().startsWith(q) || f.gender === 'Dama').slice(0, 10);
    }
    if (q.startsWith('c-') || q === 'c') {
      return catalogList.filter((f) => f.code.toLowerCase().startsWith(q) || f.gender === 'Caballero').slice(0, 10);
    }
    if (q.startsWith('u-') || q === 'u') {
      return catalogList.filter((f) => f.code.toLowerCase().startsWith(q) || f.gender === 'Unisex').slice(0, 10);
    }

    return catalogList.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.brand.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [catalogList, searchTerm]);

  // Fragrances that contain the selected note in detail modal
  const perfumesWithSelectedNote = useMemo(() => {
    if (!selectedNoteDetail) return [];
    const target = selectedNoteDetail.name.toLowerCase();
    return catalogList.filter((f) =>
      f.allNotes.some((n) => n.toLowerCase().includes(target) || target.includes(n.toLowerCase()))
    ).slice(0, 8);
  }, [catalogList, selectedNoteDetail]);

  // Glossary notes list
  const glossaryList = useMemo(() => {
    const list = Object.values(FRAGRANTICA_NOTES);
    return list.filter((n) => {
      const matchFamily = glossaryFamily === 'Todas' || n.family === glossaryFamily;
      const matchText =
        !glossarySearch.trim() ||
        n.name.toLowerCase().includes(glossarySearch.toLowerCase()) ||
        n.description.toLowerCase().includes(glossarySearch.toLowerCase()) ||
        n.subgroup.toLowerCase().includes(glossarySearch.toLowerCase());
      return matchFamily && matchText;
    });
  }, [glossaryFamily, glossarySearch]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-2 sm:px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/40 text-[#F0D080] text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span>Buscador por Notas & Enciclopedia Olfativa</span>
        </div>
        <h2 className={`text-3xl md:text-5xl font-extrabold font-serif-luxury tracking-tight ${
          isLight ? 'text-[#09090b]' : 'text-stone-100'
        }`}>
          Buscador Visual de Notas Olfativas
        </h2>
        <p className={`text-xs sm:text-sm max-w-2xl mx-auto ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
          Explora las <span className={`font-semibold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>{ALL_UNIQUE_NOTES.length} notas</span> registradas en el catálogo Fraganza. Incluye o excluye notas olfativas para encontrar el perfume exacto.
        </p>

        {/* Tab switch */}
        <div className="flex justify-center pt-2">
          <div className={`inline-flex flex-wrap justify-center p-1.5 rounded-2xl border gap-1 ${
            isLight ? 'bg-stone-100 border-stone-200' : 'bg-[#121212] border-stone-800'
          }`}>
            <button
              onClick={() => setSearchMode('notes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                searchMode === 'notes'
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 shadow-md shadow-[#C9A84C]/20'
                  : isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Búsqueda Visual por Notas ({ALL_UNIQUE_NOTES.length})
            </button>
            <button
              onClick={() => setSearchMode('glossary')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                searchMode === 'glossary'
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 shadow-md shadow-[#C9A84C]/20'
                  : isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              ¿A qué huele cada nota? (Glosario)
            </button>
            <button
              onClick={() => setSearchMode('text')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                searchMode === 'text'
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 shadow-md shadow-[#C9A84C]/20'
                  : isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Buscar por Nombre o Código (D-, C-, U-)
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: VISUAL FRAGRANTICA NOTES SEARCH (Real photos)            */}
      {/* ============================================================== */}
      {searchMode === 'notes' && (
        <div className="space-y-6">
          {/* Active selection control bar */}
          <div className={`rounded-3xl border p-5 sm:p-7 shadow-xl space-y-6 ${
            isLight
              ? 'bg-white border-stone-200 shadow-stone-900/5 text-[#09090b]'
              : 'bg-[#0f0f0f] border-[#C9A84C]/30 shadow-[#C9A84C]/5 text-stone-100'
          }`}>
            <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
              isLight ? 'border-stone-200' : 'border-stone-800/80'
            }`}>
              <div>
                <h3 className={`text-lg font-bold font-serif-luxury flex items-center gap-2 ${
                  isLight ? 'text-[#09090b]' : 'text-stone-100'
                }`}>
                  <Filter className="w-4 h-4 text-[#C9A84C]" />
                  Filtro Olfativo por Pirámide & Notas
                </h3>
                <p className={`text-xs mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Haz clic en cualquier nota para <span className="text-emerald-600 font-semibold">incluirla (+)</span> o para <span className="text-rose-600 font-semibold">excluirla (-)</span>. Se muestran las {availableNotesForPosition.length} notas disponibles en el catálogo.
                </p>
              </div>

              {/* Position selector */}
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs ${
                isLight ? 'bg-stone-100 border-stone-200' : 'bg-[#141414] border-stone-800'
              }`}>
                {[
                  { id: 'all', label: `Todas las notas (${ALL_UNIQUE_NOTES.length})` },
                  { id: 'top', label: 'Salida' },
                  { id: 'heart', label: 'Corazón' },
                  { id: 'base', label: 'Fondo' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setPyramidPosition(pos.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      pyramidPosition === pos.id
                        ? 'bg-[#C9A84C] text-stone-950 font-bold shadow'
                        : isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Included & Excluded Chips Tray */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Included tray */}
              <div className={`rounded-2xl border p-4 space-y-2 ${
                isLight ? 'bg-emerald-50/70 border-emerald-300' : 'bg-[#141414] border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-emerald-800' : 'text-emerald-400'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    Notas Deseadas ({includedNotes.length})
                  </span>
                  {includedNotes.length > 0 && (
                    <button
                      onClick={() => setIncludedNotes([])}
                      className={`text-[11px] transition-colors ${isLight ? 'text-stone-600 hover:text-rose-600' : 'text-stone-500 hover:text-rose-400'}`}
                    >
                      Limpiar deseadas
                    </button>
                  )}
                </div>
                {includedNotes.length === 0 ? (
                  <p className={`text-xs italic py-1 ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>
                    Selecciona notas de la galería inferior para filtrar...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {includedNotes.map((note) => {
                      const visual = getRealNotePhoto(note);
                      return (
                        <div
                          key={note}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs group ${
                            isLight
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          }`}
                        >
                          <img
                            src={visual.photoUrl}
                            alt={note}
                            className="w-5 h-5 rounded-md object-cover bg-white"
                          />
                          <span>{note}</span>
                          <button
                            onClick={() => toggleIncludeNote(note)}
                            className={isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-white'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Excluded tray */}
              <div className={`rounded-2xl border p-4 space-y-2 ${
                isLight ? 'bg-rose-50/70 border-rose-300' : 'bg-[#141414] border-rose-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-rose-800' : 'text-rose-400'
                  }`}>
                    <Ban className="w-4 h-4" />
                    Notas Excluidas ({excludedNotes.length})
                  </span>
                  {excludedNotes.length > 0 && (
                    <button
                      onClick={() => setExcludedNotes([])}
                      className={`text-[11px] transition-colors ${isLight ? 'text-stone-600 hover:text-rose-600' : 'text-stone-500 hover:text-rose-400'}`}
                    >
                      Limpiar excluidas
                    </button>
                  )}
                </div>
                {excludedNotes.length === 0 ? (
                  <p className={`text-xs italic py-1 ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>
                    Ninguna nota descartada. (Haz clic secundario o usa el botón (-) para descartar)
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {excludedNotes.map((note) => {
                      const visual = getRealNotePhoto(note);
                      return (
                        <div
                          key={note}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs line-through group ${
                            isLight
                              ? 'bg-rose-100 border-rose-300 text-rose-950 font-bold shadow-xs'
                              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                          }`}
                        >
                          <img
                            src={visual.photoUrl}
                            alt={note}
                            className="w-5 h-5 rounded-md object-cover grayscale bg-white"
                          />
                          <span>{note}</span>
                          <button
                            onClick={() => toggleExcludeNote(note)}
                            className={isLight ? 'text-stone-600 hover:text-stone-950 no-underline' : 'text-stone-400 hover:text-white no-underline'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Filter controls inside note gallery: Search box & Family pills */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-stone-500' : 'text-stone-400'}`} />
                  <input
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    placeholder="Filtrar notas existentes (ej. rosa, vainilla, oud)..."
                    className={`w-full border rounded-xl pl-10 pr-14 py-2 text-xs focus:outline-none ${
                      isLight
                        ? 'bg-stone-50 border-stone-300 text-[#09090b] placeholder-stone-400 focus:border-amber-500 shadow-xs'
                        : 'bg-[#141414] border-stone-800 text-stone-100 placeholder-stone-500 focus:border-[#C9A84C]'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {noteSearchQuery && (
                      <img
                        src="/assets/aistudio/fraganza_logo_d0313cc4.png"
                        alt="Fraganza"
                        className="h-4.5 w-auto object-contain opacity-90 drop-shadow"
                      />
                    )}
                    {noteSearchQuery && (
                      <button
                        onClick={() => setNoteSearchQuery('')}
                        className={`p-0.5 ${isLight ? 'text-stone-500 hover:text-stone-900' : 'text-stone-500 hover:text-stone-300'}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-2 self-end sm:self-auto text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  <span>Mostrando: <strong className={isLight ? 'text-[#09090b]' : 'text-stone-200'}>{displayedNotes.length}</strong> de {availableNotesForPosition.length} notas</span>
                  {(includedNotes.length > 0 || excludedNotes.length > 0 || noteSearchQuery) && (
                    <button
                      onClick={clearAllNoteFilters}
                      className={`text-xs hover:underline flex items-center gap-1 ml-2 font-bold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Reiniciar
                    </button>
                  )}
                </div>
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNoteCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-all border ${
                      noteCategoryFilter === cat
                        ? isLight
                          ? 'bg-amber-100 text-[#926615] border-amber-400 font-bold shadow-xs'
                          : 'bg-[#C9A84C]/25 text-[#F0D080] border-[#C9A84C] font-semibold'
                        : isLight
                        ? 'bg-stone-100 text-stone-700 border-stone-200 hover:border-amber-300'
                        : 'bg-[#141414] text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FRAGRANTICA-STYLE VISUAL NOTE GRID (Pure White in Light Mode) */}
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs px-1 flex-wrap gap-2 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                <span className="font-semibold">Catálogo de Notas Olfativas</span>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSelectedNote(displayedNotes[0] || 'Vainilla');
                        setIsAdminNoteManagerOpen(true);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow border ${
                        isLight
                          ? 'bg-amber-100 text-[#926615] border-amber-300 hover:bg-amber-200'
                          : 'bg-[#C9A84C]/20 border-[#C9A84C] text-[#F0D080] hover:bg-[#C9A84C]/30'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Gestionar Notas Repetidas / Familias</span>
                    </button>
                  )}
                  <span className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
                    [+] Añadir · [-] Excluir · [?] Ver reseña
                  </span>
                </div>
              </div>

              <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[460px] overflow-y-auto p-2.5 rounded-2xl border ${
                isLight
                  ? 'bg-white border-stone-200 shadow-sm'
                  : 'bg-[#0a0a0a] border-stone-800/80'
              }`}>
                {displayedNotes.map((note) => {
                  const visual = getRealNotePhoto(note);
                  const isIncluded = includedNotes.includes(note);
                  const isExcluded = excludedNotes.includes(note);
                  const count = noteFrequencyMap[note] || 0;

                  return (
                    <div
                      key={note}
                      className={`relative flex flex-col items-center p-2.5 rounded-2xl border transition-all duration-200 group ${
                        isIncluded
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                            : 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                          : isExcluded
                          ? isLight
                            ? 'bg-rose-50 border-rose-400 line-through opacity-70'
                            : 'bg-rose-950/30 border-rose-500 line-through opacity-60'
                          : isLight
                          ? 'bg-white border-stone-200 hover:border-amber-400 hover:bg-amber-50/30 shadow-xs'
                          : 'bg-[#121212] border-stone-800/80 hover:border-[#C9A84C]/50 hover:bg-[#181818]'
                      }`}
                    >
                      {/* Admin quick manage button */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdminSelectedNote(note);
                            setAdminTargetMergeNote(note.replace(/[,.]/g, '').trim());
                            const detail = getNoteDetail(note);
                            setAdminNewCategory(detail?.family || 'Gourmand & Dulces');
                            setIsAdminNoteManagerOpen(true);
                          }}
                          title={`Gestionar nota "${note}" (eliminar / fusionar / familia)`}
                          className="absolute -top-1.5 -left-1.5 z-10 p-1 rounded-full bg-stone-900 border border-[#C9A84C] text-[#F0D080] hover:bg-[#C9A84C] hover:text-stone-950 transition-colors shadow"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Real Photograph Tile */}
                      <div
                        onClick={() => toggleIncludeNote(note)}
                        className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-1 bg-white shadow-sm border border-stone-200/60 flex items-center justify-center overflow-hidden cursor-pointer group-hover:scale-105 transition-transform"
                        title={`Haz clic para incluir ${note}`}
                      >
                        <img
                          src={visual.photoUrl}
                          alt={note}
                          className="w-full h-full object-cover rounded-xl"
                          loading="lazy"
                        />
                        {/* Status badge */}
                        {isIncluded && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center font-bold text-xs shadow">
                            ✓
                          </div>
                        )}
                        {isExcluded && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow">
                            ✕
                          </div>
                        )}
                      </div>

                      {/* Note Name underneath in high contrast black in light mode */}
                      <span
                        onClick={() => toggleIncludeNote(note)}
                        className={`text-xs font-semibold text-center mt-2 cursor-pointer break-words max-w-[95px] leading-tight ${
                          isIncluded
                            ? isLight ? 'text-emerald-800 font-bold' : 'text-emerald-300 font-bold'
                            : isExcluded
                            ? isLight ? 'text-rose-800' : 'text-rose-400'
                            : isLight
                            ? 'text-[#09090b] group-hover:text-[#926615]'
                            : 'text-stone-200 group-hover:text-[#F0D080]'
                        }`}
                        title={note}
                      >
                        {note.toLowerCase()}
                      </span>

                      {/* Fragrance count badge */}
                      <span className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
                        {count} {count === 1 ? 'fragancia' : 'fragancias'}
                      </span>

                      {/* Quick action buttons on hover/focus */}
                      <div className={`flex items-center gap-1 mt-2 pt-1.5 border-t w-full justify-center ${
                        isLight ? 'border-stone-200' : 'border-stone-800/60'
                      }`}>
                        <button
                          type="button"
                          onClick={() => toggleIncludeNote(note)}
                          title="Incluir nota en la búsqueda"
                          className={`p-1 rounded-md text-[10px] transition-colors ${
                            isIncluded
                              ? 'bg-emerald-500 text-stone-950 font-bold'
                              : isLight
                              ? 'text-stone-600 hover:text-emerald-700 hover:bg-stone-200'
                              : 'text-stone-400 hover:text-emerald-400 hover:bg-stone-800'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExcludeNote(note)}
                          title="Excluir nota de la búsqueda"
                          className={`p-1 rounded-md text-[10px] transition-colors ${
                            isExcluded
                              ? 'bg-rose-500 text-white font-bold'
                              : isLight
                              ? 'text-stone-600 hover:text-rose-700 hover:bg-stone-200'
                              : 'text-stone-400 hover:text-rose-400 hover:bg-stone-800'
                          }`}
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const detail = getNoteDetail(note);
                            setSelectedNoteDetail(detail);
                          }}
                          title="¿A qué huele esta nota? (Reseña)"
                          className="p-1 rounded-md text-[10px] text-stone-400 hover:text-[#F0D080] hover:bg-stone-800"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PERFUME SEARCH RESULTS (Matching included/excluded notes) */}
          <div className="space-y-4 pt-4">
            {/* Results header */}
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? 'border-stone-200' : 'border-stone-800'
            }`}>
              <h3 className={`text-xl font-bold font-serif-luxury flex items-center gap-2 ${
                isLight ? 'text-[#09090b]' : 'text-stone-100'
              }`}>
                <span>Resultados Encontrados</span>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-amber-100 text-[#926615] border-amber-300'
                    : 'bg-[#C9A84C]/20 text-[#F0D080] border-[#C9A84C]/40'
                }`}>
                  {noteSearchResults.length} perfumes
                </span>
              </h3>
              <span className={`text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Ordenados por mayor afinidad con tus notas
              </span>
            </div>

            {noteSearchResults.length === 0 ? (
              <div className={`text-center py-16 rounded-3xl border space-y-3 ${
                isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#0f0f0f] border-stone-800 text-stone-400'
              }`}>
                <Flame className="w-10 h-10 text-amber-500 mx-auto" />
                <p className={`text-base font-semibold ${isLight ? 'text-[#09090b]' : 'text-stone-300'}`}>
                  No se encontraron perfumes con esta combinación exacta.
                </p>
                <p className="text-xs max-w-md mx-auto text-stone-500">
                  Prueba eliminando notas excluidas o cambiando la posición en la pirámide (Salida, Corazón o Fondo).
                </p>
                <button
                  onClick={clearAllNoteFilters}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#A07830] to-[#C9A84C] text-stone-950 font-bold text-xs hover:brightness-110 uppercase"
                >
                  Reiniciar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {noteSearchResults.map(({ perfume, matchedNotes }) => {
                  const accords = computeFragranticaAccords(
                    perfume.family,
                    perfume.allNotes,
                    perfume.sweetness,
                    perfume.intensity
                  );
                  const isFav = favorites.includes(perfume.id);
                  const bottlePhoto = getPerfumeBottlePhoto(perfume.name, perfume.gender, perfume.image, perfume.code);
                  const brandCfg = BRAND_CONFIGS[perfume.brand] || {
                    label: perfume.brand.toUpperCase(),
                    fontClass: 'tracking-widest font-sans font-bold',
                    bgColor: isLight ? '#f4ede0' : '#ffffff',
                    textColor: '#1a1a1a'
                  };

                  return (
                    <div
                      key={perfume.id}
                      onClick={() => onSelectFragrance(perfume)}
                      className={`group relative rounded-3xl border p-5 transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                        isLight
                          ? 'bg-white border-stone-200 text-[#09090b] shadow-md hover:border-amber-400 hover:shadow-xl'
                          : 'bg-[#0d0d0d] border-stone-800 hover:border-[#C9A84C]/60 text-stone-100 shadow-xl hover:shadow-[#C9A84C]/10'
                      }`}
                    >
                      {/* Top row: Brand Badge & Code */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div
                          className="px-2.5 py-1 rounded-md text-[10px] shadow-sm uppercase font-black"
                          style={{ backgroundColor: brandCfg.bgColor, color: brandCfg.textColor }}
                        >
                          <span className={brandCfg.fontClass}>{brandCfg.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs px-2.5 py-1 rounded-lg border font-bold ${
                            isLight
                              ? 'bg-amber-50 text-[#926615] border-amber-300'
                              : 'bg-stone-900 border-stone-800 text-[#F0D080]'
                          }`}>
                            {perfume.code}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(perfume.id);
                            }}
                            className={`p-1.5 rounded-lg border transition ${
                              isLight
                                ? 'bg-stone-100 border-stone-300 text-stone-600 hover:text-rose-500'
                                : 'bg-stone-900 border-stone-800 hover:text-rose-400'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Main Fragrantica Hero Split: Bottle on Left, Accords on Right */}
                      <div className="grid grid-cols-12 gap-3 items-center py-2">
                        {/* Left: Real Bottle Image */}
                        <div className={`col-span-5 relative aspect-[3/4] rounded-2xl overflow-hidden border p-2 flex items-center justify-center ${
                          isLight
                            ? 'bg-stone-50 border-stone-200'
                            : 'bg-gradient-to-b from-stone-900 to-black border-stone-800/80'
                        }`}>
                          <img
                            src={bottlePhoto}
                            alt={perfume.name}
                            className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ${
                              isLight ? 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]' : 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]'
                            }`}
                            loading="lazy"
                          />
                          <span className={`absolute bottom-2 left-2 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            perfume.gender === 'Dama'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                              : perfume.gender === 'Caballero'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          }`}>
                            {perfume.gender}
                          </span>
                        </div>

                        {/* Right: Fragrantica "Acordes Principales" */}
                        <div className="col-span-7 space-y-2">
                          <div className={`border-b pb-1 ${isLight ? 'border-stone-200' : 'border-stone-800/80'}`}>
                            <h4 className={`text-base font-bold font-serif-luxury leading-tight break-words whitespace-normal transition-colors ${
                              isLight ? 'text-[#09090b] group-hover:text-[#926615]' : 'text-stone-100 group-hover:text-[#F0D080]'
                            }`}>
                              {perfume.name}
                            </h4>
                            <p className={`text-[11px] break-words ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{perfume.subfamily}</p>
                          </div>

                          {/* Colored Accord Bars */}
                          <div className="space-y-1 pt-1">
                            <span className={`text-[10px] uppercase tracking-wider block font-bold ${
                              isLight ? 'text-stone-700' : 'text-stone-400'
                            }`}>
                              Acordes principales:
                            </span>
                            {accords.slice(0, 4).map((acc) => (
                              <div
                                key={acc.name}
                                style={{
                                  backgroundColor: acc.color,
                                  color: acc.textColor,
                                  width: `${acc.percentage}%`
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow-sm transition-all"
                              >
                                {acc.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Olfactory pyramid preview (Real photographic icons) */}
                      <div className={`pt-3 border-t space-y-1.5 mt-2 ${
                        isLight ? 'border-stone-200' : 'border-stone-800/80'
                      }`}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={isLight ? 'text-stone-600' : 'text-stone-400'}>Notas clave:</span>
                          <span className={`font-medium text-[10px] ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                            {matchedNotes.length} nota{matchedNotes.length !== 1 ? 's' : ''} coincidente{matchedNotes.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {perfume.allNotes.slice(0, 5).map((n) => {
                            const visual = getRealNotePhoto(n);
                            const matched = matchedNotes.some((m) => m.toLowerCase() === n.toLowerCase());
                            return (
                              <div
                                key={n}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${
                                  matched
                                    ? isLight
                                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                                      : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                                    : isLight
                                    ? 'bg-amber-50/70 border-amber-200/80 text-[#926615] font-medium'
                                    : 'bg-[#141414] border-stone-800 text-stone-400'
                                }`}
                              >
                                <img
                                  src={visual.photoUrl}
                                  alt={n}
                                  className="w-3.5 h-3.5 rounded-sm object-cover bg-white"
                                />
                                <span>{n}</span>
                              </div>
                            );
                          })}
                          {perfume.allNotes.length > 5 && (
                            <span className={`text-[10px] self-center ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
                              +{perfume.allNotes.length - 5}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom action */}
                      <div className={`pt-3 mt-2 flex items-center justify-between text-xs font-semibold ${
                        isLight ? 'text-[#926615]' : 'text-[#C9A84C] group-hover:text-[#F0D080]'
                      }`}>
                        <span>Ver Ficha Completa</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: GLOSSARY / ¿A QUÉ HUELE CADA NOTA?                       */}
      {/* ============================================================== */}
      {searchMode === 'glossary' && (
        <div className="space-y-6">
          <div className={`rounded-3xl border p-6 space-y-4 ${
            isLight ? 'bg-white border-stone-200 shadow-md text-[#09090b]' : 'bg-[#0f0f0f] border-[#C9A84C]/30 text-stone-100'
          }`}>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className={`text-xl font-bold font-serif-luxury ${isLight ? 'text-[#09090b]' : 'text-stone-100'}`}>
                  Enciclopedia & Perfil Sensorial de Notas
                </h3>
                <p className={`text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Aprende a qué huele cada ingrediente de perfumería con sus fotos reales y familias botánicas.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-stone-500' : 'text-stone-400'}`} />
                <input
                  type="text"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  placeholder="Buscar nota (ej. oud, rosa, ámbar)..."
                  className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none ${
                    isLight
                      ? 'bg-stone-50 border-stone-300 text-[#09090b] placeholder-stone-400 focus:border-amber-500 shadow-xs'
                      : 'bg-[#141414] border-stone-800 text-stone-100 placeholder-stone-500 focus:border-[#C9A84C]'
                  }`}
                />
              </div>
            </div>

            {/* Families */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              {['Todas', 'Floral', 'Dulce / Acaramelado', 'Cítrico / Acuático', 'Amaderado / Oriental'].map((f) => (
                <button
                  key={f}
                  onClick={() => setGlossaryFamily(f)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border ${
                    glossaryFamily === f
                      ? 'bg-gradient-to-r from-[#A07830] to-[#C9A84C] text-stone-950 font-bold shadow-xs'
                      : isLight
                      ? 'bg-stone-100 text-stone-700 border-stone-200 hover:border-amber-400'
                      : 'bg-[#141414] text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {glossaryList.map((item) => {
              const visual = getRealNotePhoto(item.name);
              return (
                <div
                  key={item.name}
                  onClick={() => setSelectedNoteDetail(item)}
                  className={`rounded-2xl border p-4 space-y-3 cursor-pointer group transition-all ${
                    isLight
                      ? 'bg-white border-stone-200 text-[#09090b] shadow-sm hover:border-amber-400'
                      : 'bg-[#0f0f0f] border-stone-800 text-stone-100 hover:border-[#C9A84C]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white p-1 overflow-hidden shrink-0 shadow-sm border border-stone-200/60">
                      <img
                        src={visual.photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm transition-colors ${
                        isLight ? 'text-[#09090b] group-hover:text-[#926615]' : 'text-stone-100 group-hover:text-[#F0D080]'
                      }`}>
                        {item.name}
                      </h4>
                      <span className={`text-[10px] uppercase tracking-wider block font-bold ${
                        isLight ? 'text-[#926615]' : 'text-[#C9A84C]'
                      }`}>
                        {item.subgroup} · {item.family}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border inline-block mt-0.5 ${
                        isLight ? 'bg-stone-100 border-stone-200 text-stone-600' : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}>
                        Fase típica: {item.pyramidTypical}
                      </span>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed break-words whitespace-normal ${
                    isLight ? 'text-stone-700 font-medium' : 'text-stone-300'
                  }`}>
                    {item.description}
                  </p>

                  <div className={`pt-2 border-t flex justify-between items-center text-[11px] font-bold ${
                    isLight ? 'border-stone-200 text-[#926615]' : 'border-stone-800/80 text-[#F0D080]'
                  }`}>
                    <span>¿A qué huele? Ver perfil</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 3: TEXT & CODE SEARCH (D-, C-, U-)                          */}
      {/* ============================================================== */}
      {searchMode === 'text' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="relative">
            <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe el nombre o código: D-001, C-015, U-002, Carolina Herrera..."
              className={`w-full border rounded-2xl pl-12 pr-16 py-3.5 text-sm focus:outline-none shadow-md ${
                isLight
                  ? 'bg-white border-stone-300 text-[#09090b] placeholder-stone-400 focus:border-amber-500'
                  : 'bg-[#0f0f0f] border-[#C9A84C]/40 text-stone-100 placeholder-stone-500 focus:border-[#C9A84C]'
              }`}
            />
            {searchTerm && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <img
                  src="/assets/aistudio/fraganza_logo_d0313cc4.png"
                  alt="Fraganza"
                  className="h-6 w-auto object-contain drop-shadow opacity-95 animate-in fade-in"
                />
                <button
                  onClick={() => setSearchTerm('')}
                  className={`p-1 rounded-full ${isLight ? 'text-stone-400 hover:text-stone-800' : 'text-stone-500 hover:text-stone-200'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {textSuggestions.length > 0 && (
            <div className={`rounded-2xl border divide-y overflow-hidden shadow-2xl ${
              isLight
                ? 'bg-white border-stone-200 divide-stone-200 text-[#09090b]'
                : 'bg-[#0f0f0f] border-stone-800 divide-stone-800 text-stone-100'
            }`}>
              <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold ${
                isLight ? 'bg-amber-50 text-[#926615] border-b border-amber-200' : 'bg-stone-950 text-[#F0D080] border-b border-stone-800'
              }`}>
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/aistudio/fraganza_logo_d0313cc4.png"
                    alt="Logo"
                    className="h-5 w-auto object-contain"
                  />
                  <span>Coincidencias Fraganza ({textSuggestions.length})</span>
                </div>
                <span className="font-mono text-[10px] text-stone-400">Clic para ver ficha</span>
              </div>
              {textSuggestions.map((perfume) => {
                const bottlePhoto = getPerfumeBottlePhoto(perfume.name, perfume.gender, perfume.image, perfume.code);
                return (
                  <div
                    key={perfume.id}
                    onClick={() => onSelectFragrance(perfume)}
                    className={`p-4 flex items-center justify-between transition-colors cursor-pointer ${
                      isLight ? 'hover:bg-amber-50/50' : 'hover:bg-[#151515]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-14 rounded-xl border p-1 shrink-0 overflow-hidden ${
                        isLight ? 'bg-stone-50 border-stone-200' : 'bg-black border-stone-800'
                      }`}>
                        <img
                          src={bottlePhoto}
                          alt={perfume.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs px-2 py-0.5 rounded border font-bold ${
                            isLight ? 'bg-amber-50 border-amber-300 text-[#926615]' : 'bg-stone-900 border-stone-800 text-[#F0D080]'
                          }`}>
                            {perfume.code}
                          </span>
                          <span className={`font-bold text-sm ${isLight ? 'text-[#09090b]' : 'text-stone-100'}`}>{perfume.name}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>{perfume.brand} · {perfume.family}</p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* NOTE SENSORY DETAIL MODAL (¿A qué huele esta nota?)              */}
      {/* ============================================================== */}
      {selectedNoteDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`relative w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border ${
            isLight
              ? 'bg-white border-stone-200 text-[#09090b]'
              : 'bg-[#0d0d0d] border-[#C9A84C]/50 text-stone-100'
          }`}>
            <button
              onClick={() => setSelectedNoteDetail(null)}
              className={`absolute top-5 right-5 p-2 rounded-full transition-colors ${
                isLight ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-100' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Note Header with Real Photo */}
            <div className={`flex items-center gap-4 border-b pb-5 ${isLight ? 'border-stone-200' : 'border-stone-800'}`}>
              <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-sm border border-stone-200/60 shrink-0">
                <img
                  src={getRealNotePhoto(selectedNoteDetail.name).photoUrl}
                  alt={selectedNoteDetail.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                  isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                }`}>
                  {selectedNoteDetail.subgroup} · {selectedNoteDetail.family}
                </span>
                <h3 className={`text-2xl font-bold font-serif-luxury ${isLight ? 'text-[#09090b]' : 'text-stone-100'}`}>
                  {selectedNoteDetail.name}
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border inline-block mt-1 ${
                  isLight ? 'bg-stone-100 border-stone-200 text-stone-600' : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}>
                  Ubicación habitual: Notas de {selectedNoteDetail.pyramidTypical}
                </span>
              </div>
            </div>

            {/* Sensory Description */}
            <div className="py-4 space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                ¿A qué huele esta nota?
              </h4>
              <p className={`text-sm leading-relaxed ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                {selectedNoteDetail.description}
              </p>

              <div className={`rounded-2xl border p-4 space-y-1.5 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141414] border-stone-800/80'
              }`}>
                <span className={`text-xs font-semibold block ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>Perfil Sensorial:</span>
                <p className={`text-xs font-medium italic ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                  "{selectedNoteDetail.sensoryProfile}"
                </p>
              </div>
            </div>

            {/* Direct inclusion buttons */}
            <div className="flex gap-2 py-2">
              <button
                onClick={() => {
                  toggleIncludeNote(selectedNoteDetail.name);
                  setSelectedNoteDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Incluir en búsqueda</span>
              </button>
              <button
                onClick={() => {
                  toggleExcludeNote(selectedNoteDetail.name);
                  setSelectedNoteDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-900 to-rose-700 text-rose-100 text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>Excluir de búsqueda</span>
              </button>
            </div>

            {/* Perfumes that contain this note */}
            {perfumesWithSelectedNote.length > 0 && (
              <div className="pt-4 border-t border-stone-800 space-y-2">
                <span className="text-xs font-bold text-stone-400 block">
                  Perfumes destacados de Fraganza con {selectedNoteDetail.name}:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {perfumesWithSelectedNote.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedNoteDetail(null);
                        onSelectFragrance(f);
                      }}
                      className="p-2 rounded-xl bg-[#141414] border border-stone-800 hover:border-[#C9A84C]/50 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-[10px] text-[#F0D080] font-bold shrink-0">{f.code}</span>
                      <span className="text-xs text-stone-200 font-medium break-words">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADMIN NOTE MANAGER MODAL (Delete typos, merge duplicates, recategorize) */}
      {/* ============================================================== */}
      {isAdminNoteManagerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsAdminNoteManagerOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#0f0f0f] border border-[#C9A84C]/50 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#C9A84C]/20 border border-[#C9A84C] text-[#F0D080]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-luxury text-stone-100">
                    Panel Administrador de Notas Olfativas
                  </h3>
                  <p className="text-xs text-stone-400">
                    Elimina notas repetidas con coma o error tipográfico, fusiónalas y reorganiza sus familias.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminNoteManagerOpen(false)}
                className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Message */}
            {adminActionStatus && (
              <div className="p-3 rounded-xl bg-[#C9A84C]/20 border border-[#C9A84C] text-xs font-semibold text-[#F0D080] flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#F0D080] shrink-0" />
                <span>{adminActionStatus}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 gap-1 text-xs">
              <button
                onClick={() => setAdminActiveTab('delete')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                  adminActiveTab === 'delete'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Nota</span>
              </button>

              <button
                onClick={() => setAdminActiveTab('merge')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                  adminActiveTab === 'merge'
                    ? 'bg-[#C9A84C]/20 text-[#F0D080] border border-[#C9A84C]/50'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Fusionar Repetidas</span>
              </button>

              <button
                onClick={() => setAdminActiveTab('category')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                  adminActiveTab === 'category'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Corregir Familia</span>
              </button>

              <button
                onClick={() => setAdminActiveTab('manage_families')}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                  adminActiveTab === 'manage_families'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Gestionar Familias</span>
              </button>
            </div>

            {/* TAB 1: ELIMINAR NOTA */}
            {adminActiveTab === 'delete' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className={`font-semibold block mb-1.5 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    Selecciona la nota que deseas eliminar de todo el catálogo:
                  </label>
                  <select
                    value={adminSelectedNote}
                    onChange={(e) => setAdminSelectedNote(e.target.value)}
                    className={`w-full rounded-xl p-3 focus:border-rose-500 focus:outline-none border ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900 shadow-sm'
                        : 'bg-black/80 border-stone-700 text-stone-100'
                    }`}
                  >
                    {availableNotesForPosition.map((n) => (
                      <option key={n} value={n}>
                        {n} ({noteFrequencyMap[n] || 0} perfumes)
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  isLight
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-rose-950/20 border-rose-900/60 text-rose-300'
                }`}>
                  <p className="font-semibold">⚠️ Advertencia de eliminación global:</p>
                  <p className={`text-[11px] leading-relaxed ${isLight ? 'text-rose-800' : 'text-rose-400/90'}`}>
                    Al confirmar, la nota <strong className={isLight ? 'text-rose-950 font-bold' : 'text-rose-200'}>"{adminSelectedNote}"</strong> será suprimida de todas las pirámides (salida, corazón, fondo y acordes) en los {noteFrequencyMap[adminSelectedNote] || 0} perfumes que la contienen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!adminSelectedNote) return;
                    const count = await deleteNoteGlobally(adminSelectedNote);
                    setAdminActionStatus(`Nota "${adminSelectedNote}" eliminada con éxito de ${count} perfumes.`);
                    setTimeout(() => setAdminActionStatus(null), 4000);
                  }}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar "{adminSelectedNote}" de todas las fragancias</span>
                </button>
              </div>
            )}

            {/* TAB 2: FUSIONAR NOTAS REPETIDAS */}
            {adminActiveTab === 'merge' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className={`font-semibold block mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    1. Nota con error, coma sobrante o letra duplicada (Origen):
                  </label>
                  <input
                    type="text"
                    value={adminSelectedNote}
                    onChange={(e) => setAdminSelectedNote(e.target.value)}
                    placeholder="Ej: Vainilla,"
                    className={`w-full rounded-xl p-3 focus:border-[#C9A84C] focus:outline-none mb-2 border ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900'
                        : 'bg-black/80 border-stone-700 text-stone-100'
                    }`}
                  />
                  <select
                    value={adminSelectedNote}
                    onChange={(e) => setAdminSelectedNote(e.target.value)}
                    className={`w-full rounded-xl p-2.5 text-xs focus:border-[#C9A84C] focus:outline-none border ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900'
                        : 'bg-black/80 border-stone-700 text-stone-300'
                    }`}
                  >
                    {availableNotesForPosition.map((n) => (
                      <option key={n} value={n}>
                        {n} ({noteFrequencyMap[n] || 0} perfumes)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`font-semibold block mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    2. Nota canónica oficial a la que se unificará (Destino):
                  </label>
                  <input
                    type="text"
                    value={adminTargetMergeNote}
                    onChange={(e) => setAdminTargetMergeNote(e.target.value)}
                    placeholder="Ej: Vainilla"
                    className={`w-full rounded-xl p-3 focus:border-emerald-500 focus:outline-none mb-2 border ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900'
                        : 'bg-black/80 border-stone-700 text-stone-100'
                    }`}
                  />
                  <select
                    value={adminTargetMergeNote}
                    onChange={(e) => setAdminTargetMergeNote(e.target.value)}
                    className={`w-full rounded-xl p-2.5 text-xs focus:border-emerald-500 focus:outline-none border ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900'
                        : 'bg-black/80 border-stone-700 text-stone-300'
                    }`}
                  >
                    {availableNotesForPosition.map((n) => (
                      <option key={n} value={n}>
                        {n} ({noteFrequencyMap[n] || 0} perfumes)
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`p-3.5 rounded-xl border text-[11px] leading-relaxed ${
                  isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-amber-950/20 border-amber-900/60 text-amber-300'
                }`}>
                  Cualquier perfume que tenga <strong className={isLight ? 'text-amber-900 font-bold' : 'text-amber-100'}>"{adminSelectedNote}"</strong> será actualizado automáticamente para usar <strong className={isLight ? 'text-emerald-800 font-bold' : 'text-emerald-300'}>"{adminTargetMergeNote}"</strong>, unificando la nota sin duplicar ocurrencias.
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!adminSelectedNote.trim() || !adminTargetMergeNote.trim()) return;
                    const count = await mergeNotesGlobally(adminSelectedNote.trim(), adminTargetMergeNote.trim());
                    setAdminActionStatus(`Se fusionó "${adminSelectedNote}" en "${adminTargetMergeNote}" en ${count} perfumes.`);
                    setTimeout(() => setAdminActionStatus(null), 4000);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 font-bold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition"
                >
                  <GitMerge className="w-4 h-4 text-stone-950" />
                  <span>Fusionar "{adminSelectedNote}" → "{adminTargetMergeNote}"</span>
                </button>
              </div>
            )}

            {/* TAB 3: CORREGIR FAMILIA OLFATIVA DE LA NOTA */}
            {adminActiveTab === 'category' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className={`font-semibold block mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    Selecciona la nota que deseas reclasificar:
                  </label>
                  <select
                    value={adminSelectedNote}
                    onChange={(e) => {
                      setAdminSelectedNote(e.target.value);
                      const detail = getNoteDetail(e.target.value);
                      if (detail?.family) setAdminNewCategory(detail.family);
                    }}
                    className={`w-full rounded-xl p-3 focus:border-indigo-500 focus:outline-none border ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900'
                        : 'bg-black/80 border-stone-700 text-stone-100'
                    }`}
                  >
                    {availableNotesForPosition.map((n) => (
                      <option key={n} value={n}>
                        {n} ({noteFrequencyMap[n] || 0} perfumes)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`font-semibold block mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    Familia / Categoría Olfativa correcta:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {[
                      'Florales',
                      'Cítricos',
                      'Frutales',
                      'Gourmand & Dulces',
                      'Maderas',
                      'Especias',
                      'Aromáticas & Verdes',
                      'Acuáticas & Frescas',
                      'Cuero & Resinas'
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAdminNewCategory(cat)}
                        className={`p-3 rounded-xl border text-left font-medium transition ${
                          adminNewCategory === cat
                            ? isLight
                              ? 'bg-indigo-100 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-400'
                              : 'bg-indigo-600/30 border-indigo-400 text-white font-bold ring-1 ring-indigo-400'
                            : isLight
                            ? 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-400'
                            : 'bg-black/60 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!adminSelectedNote) return;
                    await updateNoteCategoryGlobally(adminSelectedNote, adminNewCategory);
                    setAdminActionStatus(`Familia de "${adminSelectedNote}" actualizada a "${adminNewCategory}".`);
                    setTimeout(() => setAdminActionStatus(null), 4000);
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar familia "{adminNewCategory}" para "{adminSelectedNote}"</span>
                </button>
              </div>
            )}

            {/* TAB 4: AGREGAR O ELIMINAR FAMILIAS DE NOTAS */}
            {adminActiveTab === 'manage_families' && (
              <div className="space-y-5 text-xs">
                {/* Form to add a new olfactory family */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/60 border-stone-800'
                }`}>
                  <label className={`font-bold block ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                    Agregar Nueva Familia Olfativa al Catálogo:
                  </label>
                  <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    Crea una categoría personalizada para agrupar notas (ej. "Animales & Almizcle", "Balsámicas & Resinas", "Herbales & Silvestres").
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminNewFamilyInput}
                      onChange={(e) => setAdminNewFamilyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFamily(adminNewFamilyInput);
                        }
                      }}
                      placeholder="Nombre de la nueva familia..."
                      className={`flex-1 rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none border ${
                        isLight
                          ? 'bg-white border-stone-300 text-stone-900'
                          : 'bg-[#141414] border-stone-700 text-stone-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddFamily(adminNewFamilyInput)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 font-bold flex items-center gap-1.5 shadow hover:brightness-110 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>

                {/* List of current families with delete action */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                      Familias Registradas ({customCategories.filter(c => c !== 'Todas').length}):
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
                      Haz clic en el icono de papelera para eliminar una familia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {customCategories.filter(c => c !== 'Todas').map((cat) => {
                      const count = ALL_UNIQUE_NOTES.filter(n => {
                        const d = getNoteDetail(n);
                        return d.family === cat;
                      }).length;

                      return (
                        <div
                          key={cat}
                          className={`flex items-center justify-between p-3 rounded-xl border transition ${
                            isLight
                              ? 'bg-white border-stone-200 text-stone-900 shadow-xs'
                              : 'bg-black/60 border-stone-800 text-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-[#C9A84C]" />
                            <span className="font-semibold">{cat}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              isLight ? 'bg-stone-100 border-stone-200 text-stone-600' : 'bg-stone-900 border-stone-800 text-stone-400'
                            }`}>
                              {count} notas
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que deseas eliminar la familia "${cat}"?`)) {
                                handleDeleteFamily(cat);
                              }
                            }}
                            title={`Eliminar familia ${cat}`}
                            className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
