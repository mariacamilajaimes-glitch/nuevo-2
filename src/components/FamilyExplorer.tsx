import React, { useState, useEffect } from 'react';
import { CatalogFragrance, MainCategory } from '../data/fraganzaCatalog';
import { getPerfumeBottlePhoto } from '../data/fragranceVisuals';
import { getCustomizedCatalog, getStoredFamilyPhoto, saveFamilyPhoto } from '../services/catalogStore';
import { GoogleImageUploadModal } from './GoogleImageUploadModal';
import {
  ChevronRight,
  Heart,
  Sparkles,
  Search,
  ArrowDown,
  ArrowUp,
  Compass,
  X,
  ArrowLeft,
  Layers,
  Camera
} from 'lucide-react';

interface FamilyExplorerProps {
  onSelectFragrance: (fragrance: CatalogFragrance) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  theme?: 'light' | 'dark';
  onNavigateToCatalog?: (family: string) => void;
  isAdmin?: boolean;
}

export const FamilyExplorer: React.FC<FamilyExplorerProps> = ({
  onSelectFragrance,
  favorites,
  onToggleFavorite,
  theme = 'dark',
  onNavigateToCatalog,
  isAdmin = false,
}) => {
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light'));

  // selectedFamily: null shows the 4 Family Cards Hub. When picked, opens dedicated family page!
  const [selectedFamily, setSelectedFamily] = useState<MainCategory | 'Todas' | null>(null);
  const [genderFilter, setGenderFilter] = useState<'Todos' | 'Dama' | 'Caballero' | 'Unisex'>('Todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // Default 'desc' (Mayor a Menor por código)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogList, setCatalogList] = useState<CatalogFragrance[]>(() => getCustomizedCatalog());
  const [editingFamilyPhoto, setEditingFamilyPhoto] = useState<string | null>(null);
  const [familyPhotosVersion, setFamilyPhotosVersion] = useState<number>(0);

  useEffect(() => {
    const handleUpdate = () => {
      setCatalogList(getCustomizedCatalog());
    };
    const handleFamilyUpdate = () => {
      setFamilyPhotosVersion((v) => v + 1);
    };
    window.addEventListener('fraganza_catalog_updated', handleUpdate);
    window.addEventListener('fraganza_family_photos_updated', handleFamilyUpdate);
    return () => {
      window.removeEventListener('fraganza_catalog_updated', handleUpdate);
      window.removeEventListener('fraganza_family_photos_updated', handleFamilyUpdate);
    };
  }, []);

  const families = [
    {
      id: 'Floral' as MainCategory,
      emoji: '🌸',
      title: 'Floral',
      subtitle: 'Rosas, Jazmín, Peonía, Lavanda',
      desc: 'El corazón clásico y romántico de la perfumería fina. Acordes de pétalos nobles, flores blancas y elegancia aterciopelada.',
      image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'Cítrico / Acuático' as MainCategory,
      emoji: '🍋',
      title: 'Cítrico / Acuático',
      subtitle: 'Bergamota, Limón, Brisa Marina, Frescor',
      desc: 'Energía chispeante, sol mediterráneo y notas ozónicas cristalinas que aportan vitalidad inmediata y sensación de limpieza pura.',
      image: 'https://images.unsplash.com/photo-1530630458144-014709e10016?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'Amaderado / Oriental' as MainCategory,
      emoji: '🌲',
      title: 'Amaderado / Oriental',
      subtitle: 'Sándalo, Oud, Ámbar, Especias, Cuero',
      desc: 'Presencia majestuosa, acordes cálidos y resinas profundas. Aportan distinción imponente, madurez y duración inigualable.',
      image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'Dulce / Acaramelado' as MainCategory,
      emoji: '🍯',
      title: 'Dulce / Acaramelado',
      subtitle: 'Vainilla, Caramelo, Tonka, Pralinés',
      desc: 'La sensualidad irresistible del universo gourmand. Notas golosas y licorosas que generan un aura magnética y adictiva.',
      image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const getCodeNumber = (codeStr: string): number => {
    const match = (codeStr || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const currentFamilyObj = families.find((f) => f.id === selectedFamily);

  const filteredFragrances = catalogList
    .filter((f) => {
      if (selectedFamily && selectedFamily !== 'Todas' && f.mainCategory !== selectedFamily) return false;
      if (genderFilter !== 'Todos' && f.gender !== genderFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesBrand = f.brand.toLowerCase().includes(q);
        const matchesCode = f.code.toLowerCase().includes(q);
        const matchesSubfamily = (f.subfamily || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBrand && !matchesCode && !matchesSubfamily) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const numA = getCodeNumber(a.code);
      const numB = getCodeNumber(b.code);
      if (sortOrder === 'desc') {
        // Mayor a Menor (ej. C-115, C-114 ... C-001)
        if (numB !== numA) return numB - numA;
        return b.code.localeCompare(a.code);
      } else {
        // Menor a Mayor (ej. C-001, C-002 ... C-115)
        if (numA !== numB) return numA - numB;
        return a.code.localeCompare(b.code);
      }
    });

  const handleSelectFamily = (famId: MainCategory | 'Todas') => {
    setSelectedFamily(famId);
    setSearchQuery('');
    setGenderFilter('Todos');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToHub = () => {
    setSelectedFamily(null);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ==============================================================
     VISTA 1: SELECTOR PRINCIPAL (HUB DE LAS 4 FAMILIAS)
     ============================================================== */
  if (selectedFamily === null) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-10 animate-in fade-in duration-200">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest ${
            isLight
              ? 'bg-amber-100 text-[#926615] border-amber-300'
              : 'bg-[#C9A84C]/15 border-[#C9A84C]/40 text-[#F0D080]'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>Familias Olfativas de Fraganza</span>
          </div>
          <h2 className={`text-3xl md:text-5xl font-extrabold font-serif-luxury tracking-tight ${
            isLight ? 'text-[#09090b]' : 'text-stone-100'
          }`}>
            Explora por Universos Aromáticos
          </h2>
          <p className={`text-sm max-w-xl mx-auto ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
            Selecciona una familia olfativa para abrir directamente su página exclusiva con todas sus colonias ordenadas.
          </p>
        </div>

        {/* 4 Family Cards Hub */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {families.map((fam) => {
            const count = catalogList.filter((f) => f.mainCategory === fam.id).length;

            return (
              <div
                key={fam.id}
                onClick={() => handleSelectFamily(fam.id)}
                className={`relative rounded-3xl overflow-hidden border p-6 flex flex-col justify-between space-y-4 cursor-pointer transition-all duration-300 group shadow-xl hover:-translate-y-1 hover:shadow-2xl ${
                  isLight
                    ? 'bg-white border-stone-200 hover:border-amber-400 hover:bg-stone-50/90 text-[#09090b]'
                    : 'bg-[#0e0e0e] border-stone-800 hover:border-[#C9A84C]/80 hover:bg-[#141414] text-stone-100'
                }`}
              >
                <div className={`relative aspect-4/3 rounded-2xl overflow-hidden border bg-gradient-to-br from-stone-800 to-stone-950 ${
                  isLight ? 'border-stone-200' : 'border-stone-800/80'
                }`}>
                  <img
                    src={getStoredFamilyPhoto(fam.id, fam.image)}
                    alt={fam.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-black/70 backdrop-blur-md flex items-center justify-center text-2xl border border-stone-700 shadow">
                    {fam.emoji}
                  </div>

                  {/* Poner / Cambiar Foto Button (admin only) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFamilyPhoto(fam.id);
                      }}
                      title={`Poner o cambiar foto de la familia ${fam.title}`}
                      className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-black/85 hover:bg-amber-500 hover:text-stone-950 text-amber-300 text-[11px] font-bold border border-amber-400/40 backdrop-blur-md transition flex items-center gap-1 shadow-lg z-10 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Poner Foto</span>
                    </button>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-10">
                    <div>
                      <h3 className="text-lg font-bold font-serif-luxury text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{fam.title}</h3>
                      <span className="text-[11px] text-[#F0D080] font-semibold block drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{count} creaciones</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <p className={`text-xs font-bold tracking-wide ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                    {fam.subtitle}
                  </p>
                  <p className={`text-[11px] leading-relaxed break-words whitespace-normal ${
                    isLight ? 'text-stone-700 font-medium' : 'text-stone-300'
                  }`}>
                    {fam.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectFamily(fam.id);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border bg-gradient-to-r from-[#A07830] via-[#C9A84C] to-[#A07830] text-stone-950 border-amber-300 shadow hover:brightness-110 cursor-pointer"
                >
                  <span>Abrir Familia ({count} colonias)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Global Access Option */}
        <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left ${
          isLight ? 'bg-amber-50/60 border-amber-200 text-stone-900' : 'bg-[#121212] border-stone-800 text-stone-200'
        }`}>
          <div>
            <h4 className={`text-base font-bold font-serif-luxury ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
              ¿Deseas ver todas las fragancias sin filtrar por familia?
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Explora las {catalogList.length} colonias de alta perfumería ordenadas de mayor a menor por código.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSelectFamily('Todas')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 flex items-center gap-2 ${
              isLight
                ? 'bg-white hover:bg-stone-100 text-stone-900 border-stone-300 shadow-sm'
                : 'bg-stone-900 hover:bg-stone-800 text-[#F0D080] border-[#C9A84C]/40 shadow'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Ver Catálogo Completo</span>
          </button>
        </div>
      </div>
    );
  }

  /* ==============================================================
     VISTA 2: PÁGINA DEDICADA DE LA FAMILIA SELECCIONADA
     (Abre directamente con todas las colonias sin tener que bajar)
     ============================================================== */
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Top Navigation Bar: Back Button & Quick Switcher */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isLight ? 'bg-white border-stone-200 shadow-sm text-stone-900' : 'bg-[#121212] border-stone-800 shadow-md text-stone-100'
      }`}>
        <button
          type="button"
          onClick={handleBackToHub}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
            isLight
              ? 'bg-amber-50 hover:bg-amber-100 text-[#926615] border-amber-300 shadow-xs'
              : 'bg-stone-900 hover:bg-stone-800 text-[#F0D080] border-[#C9A84C]/50 shadow'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Volver a Selector de Familias</span>
        </button>

        {/* Quick Family Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-semibold mr-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
            Cambiar a:
          </span>
          {families.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSelectFamily(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                selectedFamily === f.id
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 border-[#C9A84C] font-bold shadow'
                  : isLight
                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200'
                  : 'bg-[#181818] text-stone-300 hover:bg-[#222] border-stone-800'
              }`}
            >
              <span>{f.emoji} {f.title}</span>
            </button>
          ))}
          <button
            onClick={() => handleSelectFamily('Todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              selectedFamily === 'Todas'
                ? 'bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 border-[#C9A84C] font-bold shadow'
                : isLight
                ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200'
                : 'bg-[#181818] text-stone-300 hover:bg-[#222] border-stone-800'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Dedicated Hero Banner of Selected Family */}
      {currentFamilyObj ? (
        <div className={`relative rounded-3xl overflow-hidden border p-6 sm:p-8 shadow-xl ${
          isLight ? 'bg-white border-stone-200 text-[#09090b]' : 'bg-[#101010] border-stone-800 text-stone-100'
        }`}>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border shrink-0 relative shadow-md group">
                <img
                  src={getStoredFamilyPhoto(currentFamilyObj.id, currentFamilyObj.image)}
                  alt={currentFamilyObj.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-3xl">
                  {currentFamilyObj.emoji}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingFamilyPhoto(currentFamilyObj.id)}
                  title="Cambiar foto de la familia"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isLight ? 'bg-amber-100 text-[#926615] border-amber-300' : 'bg-amber-500/20 text-[#F0D080] border-amber-400/40'
                  }`}>
                    Familia Olfativa
                  </span>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    {filteredFragrances.length} colonias disponibles
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingFamilyPhoto(currentFamilyObj.id)}
                    className="text-[11px] font-bold text-amber-500 hover:text-amber-400 underline cursor-pointer ml-1 inline-flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Cambiar Foto</span>
                  </button>
                </div>
                <h1 className={`text-2xl sm:text-4xl font-extrabold font-serif-luxury ${
                  isLight ? 'text-[#09090b]' : 'text-stone-100'
                }`}>
                  {currentFamilyObj.title}
                </h1>
                <p className={`text-xs font-bold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                  {currentFamilyObj.subtitle}
                </p>
                <p className={`text-xs max-w-2xl leading-relaxed ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                  {currentFamilyObj.desc}
                </p>
              </div>
            </div>

            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={() => onNavigateToCatalog(currentFamilyObj.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 flex items-center gap-2 ${
                  isLight
                    ? 'bg-amber-50 hover:bg-amber-100 text-[#926615] border-amber-300 shadow-xs'
                    : 'bg-black hover:bg-stone-900 text-[#F0D080] border-[#C9A84C]/50 shadow'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Ver en Catálogo General</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-3xl border ${
          isLight ? 'bg-white border-stone-200 text-[#09090b]' : 'bg-[#101010] border-stone-800 text-stone-100'
        }`}>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif-luxury">
            Catálogo Completo de Fragancias
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Visualizando todas las colonias del catálogo oficial ordenadas por código.
          </p>
        </div>
      )}

      {/* Guidance Banner for Spectator */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${
        isLight
          ? 'bg-amber-50/80 border-amber-200 text-[#09090b]'
          : 'bg-[#121212] border-[#C9A84C]/40 text-stone-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-[#C9A84C] shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className={`font-bold block ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
              Guía de Exploración Olfativa
            </span>
            <span className="text-stone-500 dark:text-stone-400">
              Fragancias ordenadas <strong className={isLight ? 'text-stone-900 font-bold' : 'text-stone-100 font-bold'}>
                {sortOrder === 'desc' ? 'de mayor a menor' : 'de menor a mayor'}
              </strong> por su código oficial Fraganza para descubrir las creaciones más recientes.
            </span>
          </div>
        </div>

        {/* Sort Order Toggle Button */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-amber-100 text-stone-900 border-stone-300'
              : 'bg-stone-900 hover:bg-stone-800 text-[#F0D080] border-[#C9A84C]/50'
          }`}
        >
          {sortOrder === 'desc' ? (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
              <span>Código: Mayor a Menor (C-115 → C-001)</span>
            </>
          ) : (
            <>
              <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
              <span>Código: Menor a Mayor (C-001 → C-115)</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Bar: Live Search + Gender Filter */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isLight ? 'bg-white border-stone-200 shadow-md text-[#09090b]' : 'bg-[#0e0e0e] border-stone-800 shadow-xl text-stone-100'
      }`}>
        {/* Real-time search inside family explorer */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nombre, marca o código..."
            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border focus:outline-none transition ${
              isLight
                ? 'bg-stone-50 border-stone-300 text-[#09090b] focus:border-amber-500'
                : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Gender Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full md:w-auto">
          <span className={`text-[11px] uppercase tracking-wider font-bold mr-1 ${
            isLight ? 'text-stone-700' : 'text-stone-400'
          }`}>
            Perfil:
          </span>
          {(['Todos', 'Dama', 'Caballero', 'Unisex'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                genderFilter === g
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 font-bold shadow-md shadow-[#C9A84C]/20'
                  : isLight
                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                  : 'bg-[#181818] text-stone-300 hover:bg-[#222] border border-stone-800'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Fragrances in Family Grid */}
      <div className="space-y-4">
        <div className={`flex justify-between items-center text-xs ${
          isLight ? 'text-stone-600' : 'text-stone-400'
        }`}>
          <span>
            Mostrando <span className={`font-bold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>{filteredFragrances.length}</span> perfumes
            {searchQuery && ` (con filtro "${searchQuery}")`}
          </span>
          <div className="flex items-center gap-3">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-rose-500 hover:underline font-semibold cursor-pointer"
              >
                Limpiar filtro
              </button>
            )}
            <button
              type="button"
              onClick={handleBackToHub}
              className={`font-semibold hover:underline cursor-pointer ${isLight ? 'text-[#926615]' : 'text-[#C9A84C]'}`}
            >
              ← Volver al selector de familias
            </button>
          </div>
        </div>

        {filteredFragrances.length === 0 ? (
          <div className={`border rounded-3xl p-12 text-center space-y-4 ${
            isLight ? 'bg-white border-stone-200' : 'bg-[#0e0e0e] border-stone-800'
          }`}>
            <Sparkles className="w-10 h-10 text-amber-500/40 mx-auto" />
            <h3 className={`text-lg font-bold font-serif-luxury ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
              No se encontraron fragancias
            </h3>
            <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              Intenta cambiar los filtros de género o borrar el término de búsqueda.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Borrar filtro de búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFragrances.map((perfume) => {
              const isFav = favorites.includes(perfume.id);

              return (
                <div
                  key={perfume.id}
                  onClick={() => onSelectFragrance(perfume)}
                  className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-md cursor-pointer group ${
                    isLight
                      ? 'bg-white border-stone-200 text-[#09090b] hover:border-amber-400 hover:shadow-xl'
                      : 'bg-[#0e0e0e] border-stone-800 text-stone-100 hover:border-[#C9A84C]/40 hover:shadow-2xl'
                  }`}
                >
                  <div className={`relative w-full h-52 rounded-xl overflow-hidden border p-2 flex items-center justify-center ${
                    isLight
                      ? 'bg-stone-50 border-stone-200'
                      : 'bg-gradient-to-b from-stone-900 to-black border-stone-800'
                  }`}>
                    <img
                      src={getPerfumeBottlePhoto(perfume.name, perfume.gender, perfume.image, perfume.code)}
                      alt={perfume.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                    {!isLight && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    )}

                    <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                      isLight
                        ? 'bg-white/95 text-[#09090b] border-stone-300 shadow-xs'
                        : 'bg-black/80 text-[#F0D080] border-[#C9A84C]/30'
                    }`}>
                      {perfume.code}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(perfume.id);
                      }}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-full border transition ${
                        isLight
                          ? 'bg-white/95 border-stone-300 text-stone-600 hover:text-rose-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-stone-300 hover:text-rose-400'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold block ${
                      isLight ? 'text-[#926615]' : 'text-[#C9A84C]'
                    }`}>
                      {perfume.brand}
                    </span>
                    <h4 className={`text-base sm:text-lg font-bold font-serif-luxury break-words whitespace-normal leading-snug transition-colors ${
                      isLight ? 'text-[#09090b] group-hover:text-[#926615]' : 'text-stone-100 group-hover:text-[#F0D080]'
                    }`}>
                      {perfume.name}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isLight
                          ? 'bg-stone-100 text-stone-800 border-stone-200'
                          : 'bg-stone-900 text-stone-300 border-stone-800'
                      }`}>
                        {perfume.gender}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isLight
                          ? 'bg-amber-50 text-[#926615] border-amber-200'
                          : 'bg-stone-900 text-stone-300 border-stone-800'
                      }`}>
                        {perfume.subfamily || perfume.family}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isLight
                          ? 'bg-amber-100 text-[#926615] border-amber-300'
                          : 'bg-[#C9A84C]/10 text-[#F0D080] border-[#C9A84C]/30'
                      }`}>
                        {perfume.intensity}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed break-words whitespace-normal ${
                      isLight ? 'text-stone-700 font-medium' : 'text-stone-300'
                    }`}>
                      {perfume.description}
                    </p>
                  </div>

                  <div className={`pt-2 border-t flex justify-between items-center text-xs ${
                    isLight ? 'border-stone-200 text-stone-600' : 'border-stone-800 text-stone-500'
                  }`}>
                    <span>{perfume.skinCompat}</span>
                    <span className={`font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform ${
                      isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                    }`}>
                      Ficha y Similares <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Google Lens Style Image Upload Modal for Olfactory Families */}
      {editingFamilyPhoto && (
        <GoogleImageUploadModal
          isOpen={true}
          onClose={() => setEditingFamilyPhoto(null)}
          title={`Foto de la Familia ${editingFamilyPhoto}`}
          subtitle="Arrastra una imagen de Google, de tu equipo o pega con Ctrl+V"
          currentImage={getStoredFamilyPhoto(
            editingFamilyPhoto,
            families.find((f) => f.id === editingFamilyPhoto)?.image || ''
          )}
          theme={isLight ? 'light' : 'dark'}
          onImageSelected={async (newUrl) => {
            await saveFamilyPhoto(editingFamilyPhoto, newUrl);
            setFamilyPhotosVersion((v) => v + 1);
            setEditingFamilyPhoto(null);
          }}
        />
      )}
    </div>
  );
};
