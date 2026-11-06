import React, { useState, useEffect, useRef } from 'react';
import {
  CatalogFragrance,
  findSimilarFragrancesJaccard,
  TieredJaccardResult,
  getOccasionDescription,
  getFullFragranceReview,
  getPunctualFragranceBreakdown,
  splitCompoundNote,
  sanitizeNotesArray,
  MainCategory
} from '../data/fraganzaCatalog';
import {
  getRealNotePhoto,
  computeFragranticaAccords,
  BRAND_CONFIGS,
  getPerfumeBottlePhoto
} from '../data/fragranceVisuals';
import { getCustomizedFragrance, saveAdminFragranceUpdate } from '../services/catalogStore';
import { compressImage } from '../utils/imageCompressor';
import { AdminFragranceEditorModal } from './AdminFragranceEditorModal';
import { AdminNotePhotoEditorModal } from './AdminNotePhotoEditorModal';
import {
  X,
  Heart,
  Sparkles,
  Flame,
  ChevronRight,
  Edit3,
  Camera,
  Check,
  Save,
  Layers,
  Upload
} from 'lucide-react';

interface FragranceModalProps {
  fragrance: CatalogFragrance | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectAnother: (fragrance: CatalogFragrance) => void;
  isAdmin?: boolean;
  onRequireAdminAuth?: () => void;
  theme?: 'light' | 'dark';
}

export const FragranceModal: React.FC<FragranceModalProps> = ({
  fragrance: initialFragrance,
  onClose,
  isFavorite,
  onToggleFavorite,
  onSelectAnother,
  isAdmin = false,
  theme = 'dark',
}) => {
  const [selectedNotePopup, setSelectedNotePopup] = useState<string | null>(null);
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState<boolean>(false);
  const [editingNoteForPhoto, setEditingNoteForPhoto] = useState<string | null>(null);
  const [, setNoteVersion] = useState<number>(0);
  const [currentFragrance, setCurrentFragrance] = useState<CatalogFragrance | null>(initialFragrance);

  // Admin inline edit states
  const [isQuickEditing, setIsQuickEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const [editBrand, setEditBrand] = useState<string>('');
  const [editFamily, setEditFamily] = useState<string>('');
  const [editSubfamily, setEditSubfamily] = useState<string>('');
  const [editMainCategory, setEditMainCategory] = useState<MainCategory>('Floral');
  const [editImage, setEditImage] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const photoUploadInputRef = useRef<HTMLInputElement>(null);

  // Global single theme synced with laptop / phone and header toggle
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light'));

  useEffect(() => {
    if (initialFragrance) {
      const customized = getCustomizedFragrance(initialFragrance.code) || initialFragrance;
      setCurrentFragrance(customized);
      setEditName(customized.name);
      setEditCode(customized.code);
      setEditBrand(customized.brand);
      setEditFamily(customized.family);
      setEditSubfamily(customized.subfamily || customized.family);
      setEditMainCategory(customized.mainCategory || 'Floral');
      setEditImage(customized.image || '');
    } else {
      setCurrentFragrance(null);
    }
  }, [initialFragrance]);

  // Listen for admin catalog updates and custom note photos
  useEffect(() => {
    const handleUpdate = () => {
      if (initialFragrance) {
        const customized = getCustomizedFragrance(initialFragrance.code) || initialFragrance;
        setCurrentFragrance(customized);
        setEditName(customized.name);
        setEditCode(customized.code);
        setEditBrand(customized.brand);
        setEditFamily(customized.family);
        setEditSubfamily(customized.subfamily || customized.family);
        setEditMainCategory(customized.mainCategory || 'Floral');
        setEditImage(customized.image || '');
      }
      setNoteVersion((v) => v + 1);
    };
    window.addEventListener('fraganza_catalog_updated', handleUpdate);
    window.addEventListener('fraganza_notes_updated', handleUpdate);
    return () => {
      window.removeEventListener('fraganza_catalog_updated', handleUpdate);
      window.removeEventListener('fraganza_notes_updated', handleUpdate);
    };
  }, [initialFragrance]);

  if (!currentFragrance) return null;

  const fragrance = currentFragrance;

  const handleBottlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFragrance) return;
    setIsSaving(true);
    setSaveStatus('Comprimiendo y guardando nueva foto de perfil...');
    try {
      const compressed = await compressImage(file, 400, 400, 0.82);
      setEditImage(compressed);
      await saveAdminFragranceUpdate(currentFragrance.code, { image: compressed });
      setCurrentFragrance({ ...currentFragrance, image: compressed });
      setSaveStatus('¡Foto de perfil actualizada con éxito en la base de datos!');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch {
      setSaveStatus('Error al procesar la imagen.');
      setTimeout(() => setSaveStatus(null), 3500);
    } finally {
      setIsSaving(false);
      if (photoUploadInputRef.current) photoUploadInputRef.current.value = '';
    }
  };

  const handleQuickAdminSave = async () => {
    if (!currentFragrance) return;
    setIsSaving(true);
    setSaveStatus('Guardando cambios en Base de Datos...');

    const trimmedName = editName.trim() || currentFragrance.name;
    const trimmedCode = editCode.trim().toUpperCase() || currentFragrance.code;
    const trimmedBrand = editBrand.trim() || currentFragrance.brand;
    const trimmedFamily = editFamily.trim() || currentFragrance.family;
    const trimmedSubfamily = editSubfamily.trim() || currentFragrance.subfamily;
    const trimmedImage = editImage.trim() || currentFragrance.image;

    await saveAdminFragranceUpdate(currentFragrance.code, {
      name: trimmedName,
      code: trimmedCode,
      brand: trimmedBrand,
      family: trimmedFamily,
      subfamily: trimmedSubfamily,
      mainCategory: editMainCategory,
      image: trimmedImage,
    });

    const updatedFragrance: CatalogFragrance = {
      ...currentFragrance,
      name: trimmedName,
      code: trimmedCode,
      brand: trimmedBrand,
      family: trimmedFamily,
      subfamily: trimmedSubfamily,
      mainCategory: editMainCategory,
      image: trimmedImage,
    };

    setCurrentFragrance(updatedFragrance);
    setIsSaving(false);
    setSaveStatus('¡Cambios guardados con éxito en la base de datos!');
    setTimeout(() => {
      setSaveStatus(null);
      setIsQuickEditing(false);
    }, 2000);
  };

  // Similar perfumes calculated using Weighted Jaccard Similarity (Salida 25%, Corazón 35%, Fondo 40%)
  const similarItems: TieredJaccardResult[] = findSimilarFragrancesJaccard(fragrance, 4);

  // Fragrantica Accords (passes custom accords if customized by admin)
  const mainAccords = computeFragranticaAccords(
    fragrance.family,
    fragrance.allNotes,
    fragrance.sweetness,
    fragrance.intensity,
    fragrance.mainAccords
  );

  // Brand config
  const brandCfg = BRAND_CONFIGS[fragrance.brand] || {
    label: fragrance.brand.toUpperCase(),
    fontClass: 'tracking-widest font-sans font-bold',
    bgColor: isLight ? '#f4ede0' : '#ffffff',
    textColor: '#1a1a1a'
  };

  const bottlePhoto = getPerfumeBottlePhoto(fragrance.name, fragrance.gender, fragrance.image, fragrance.code);
  const breakdown = getPunctualFragranceBreakdown(fragrance);

  // Intensity meter values
  const intensityLevels = [
    { id: 'Suave', label: 'Suave', bars: 1, sillage: 'Íntimo (~0.5 m)', desc: 'Aura discreta y pegada a la piel' },
    { id: 'Moderada', label: 'Moderada', bars: 2, sillage: 'Elegante (~1.5 m)', desc: 'Proyección a la distancia de un brazo' },
    { id: 'Intensa', label: 'Intensa', bars: 3, sillage: 'Notable (~2.5 m)', desc: 'Estela que deja huella al pasar' },
    { id: 'Envolvente', label: 'Envolvente', bars: 4, sillage: 'Descomunal (>3 m)', desc: 'Máxima fijación y difusión' },
  ];

  const currentLevelIdx =
    fragrance.intensity === 'Suave'
      ? 1
      : fragrance.intensity === 'Moderada'
      ? 2
      : fragrance.intensity === 'Intensa'
      ? 3
      : 4;

  // Split and sanitize compound notes with slashes (e.g. "Cedro / Sándalo" -> ["Cedro", "Sándalo"])
  const topNotes = sanitizeNotesArray(fragrance.pyramid?.top || []);
  const heartNotes = sanitizeNotesArray(fragrance.pyramid?.heart || []);
  const baseNotes = sanitizeNotesArray(fragrance.pyramid?.base || []);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div
          className={`relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[94vh] flex flex-col transition-colors duration-300 ${
            isLight
              ? 'bg-white text-[#09090b] border border-stone-200 shadow-stone-900/10'
              : 'bg-[#0c0c0c] text-stone-100 border border-[#C9A84C]/40 shadow-[#C9A84C]/20'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar with Controls */}
          <div
            className={`flex items-center justify-between p-3.5 sm:px-6 border-b z-20 transition-colors ${
              isLight
                ? 'bg-white border-stone-200 text-[#09090b]'
                : 'bg-[#0f0f0f] border-stone-800/80 text-stone-100'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isLight
                  ? 'bg-amber-50 text-[#926615] border-amber-300'
                  : 'bg-black text-[#F0D080] border-[#C9A84C]/50'
              }`}>
                {fragrance.code}
              </span>

              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsQuickEditing(!isQuickEditing)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border ${
                      isQuickEditing
                        ? 'bg-[#A07830] text-stone-950 border-[#F0D080]'
                        : isLight
                        ? 'bg-amber-100 text-[#926615] border-amber-300 hover:bg-amber-200'
                        : 'bg-[#C9A84C] text-stone-950 border-[#C9A84C] hover:brightness-110'
                    }`}
                    title="Modificar nombre, código, marca y familias"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isQuickEditing ? 'Ocultar Edición' : 'Editar Datos'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminEditorOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border ${
                      isLight
                        ? 'bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200'
                        : 'bg-stone-900 text-[#F0D080] border-stone-700 hover:border-[#C9A84C]'
                    }`}
                    title="Editor completo de foto real y notas"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Foto & Notas</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className={`p-1.5 rounded-full transition-colors border ${
                  isLight
                    ? 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border-stone-300'
                    : 'text-stone-400 hover:text-stone-100 bg-stone-900 hover:bg-black border-stone-800'
                }`}
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`overflow-y-auto p-4 sm:p-8 space-y-8 ${isLight ? 'bg-white' : 'bg-[#0c0c0c]'}`}>
            {/* ADMIN INLINE QUICK EDITING PANEL */}
            {isAdmin && isQuickEditing && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-amber-50/70 border-amber-300/80 shadow-md text-[#09090b]'
                    : 'bg-[#18140c] border-[#C9A84C]/50 shadow-xl text-stone-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3 pb-2 border-b border-amber-300/40">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#C9A84C]" />
                    <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                      isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                    }`}>
                      Edición de Ficha (Nombre, Código, Marca y Familias)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500">
                    Sincronización en Base de Datos & Memoria Local
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Nombre */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                      Nombre del Perfume:
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border focus:outline-none ${
                        isLight
                          ? 'bg-white border-stone-300 text-[#09090b] focus:border-amber-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
                      }`}
                      placeholder="Nombre del perfume"
                    />
                  </div>

                  {/* Código */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                      Código Fraganza:
                    </label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                        isLight
                          ? 'bg-white border-stone-300 text-[#926615] focus:border-amber-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-[#F0D080] focus:border-[#C9A84C]'
                      }`}
                      placeholder="Ej: C-001"
                    />
                  </div>

                  {/* Casa Fabricante (Brand) */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                      Casa Fabricante (Marca):
                    </label>
                    <input
                      type="text"
                      value={editBrand}
                      onChange={(e) => setEditBrand(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border focus:outline-none ${
                        isLight
                          ? 'bg-white border-stone-300 text-[#09090b] focus:border-amber-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
                      }`}
                      placeholder="Ej: Carolina Herrera"
                    />
                  </div>

                  {/* Familia Olfativa */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                      Familia Olfativa:
                    </label>
                    <input
                      type="text"
                      value={editFamily}
                      onChange={(e) => setEditFamily(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl text-xs border focus:outline-none ${
                        isLight
                          ? 'bg-white border-stone-300 text-[#09090b] focus:border-amber-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
                      }`}
                      placeholder="Ej: Amaderada, Cítrica"
                    />
                  </div>

                  {/* Subfamilia Olfativa */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                      Subfamilia Olfativa:
                    </label>
                    <input
                      type="text"
                      value={editSubfamily}
                      onChange={(e) => setEditSubfamily(e.target.value)}
                      className={`w-full py-2 px-3 rounded-xl text-xs border focus:outline-none ${
                        isLight
                          ? 'bg-white border-stone-300 text-[#09090b] focus:border-amber-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
                      }`}
                      placeholder="Ej: Oriental Amaderada"
                    />
                  </div>

                  {/* Categoría Principal */}
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
                      Categoría Principal:
                    </label>
                    <select
                      value={editMainCategory}
                      onChange={(e) => setEditMainCategory(e.target.value as MainCategory)}
                      className={`w-full py-2 px-3 rounded-xl text-xs border focus:outline-none ${
                        isLight
                          ? 'bg-white border-stone-300 text-[#09090b] focus:border-amber-500 shadow-xs'
                          : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
                      }`}
                    >
                      <option value="Floral">Floral</option>
                      <option value="Dulce / Acaramelado">Dulce / Acaramelado</option>
                      <option value="Cítrico / Acuático">Cítrico / Acuático</option>
                      <option value="Amaderado / Oriental">Amaderado / Oriental</option>
                    </select>
                  </div>

                  {/* Bottle / Profile photo input */}
                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-stone-700' : 'text-[#F0D080]'}`}>
                      Foto de Perfil / Botella (URL o Subir Archivo)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        placeholder="https://... o sube una imagen de tu dispositivo"
                        className={`flex-1 py-2 px-3 rounded-xl text-xs border focus:outline-none ${
                          isLight
                            ? 'bg-white border-stone-300 text-[#09090b] focus:border-amber-500 shadow-xs'
                            : 'bg-black/80 border-stone-700 text-stone-100 focus:border-[#C9A84C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => photoUploadInputRef.current?.click()}
                        disabled={isSaving}
                        className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Foto</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-300/40 flex-wrap gap-2">
                  <div className="text-xs font-semibold">
                    {saveStatus && (
                      <span className={`flex items-center gap-1.5 ${saveStatus.includes('éxito') ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {saveStatus.includes('éxito') && <Check className="w-3.5 h-3.5" />}
                        {saveStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickEditing(false)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:text-stone-900 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAdminSave}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#A07830] via-[#C9A84C] to-[#A07830] text-stone-950 text-xs font-bold shadow hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Guardando...' : 'Guardar Cambios en Base de Datos'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden Photo Upload Input for Admin */}
            <input
              type="file"
              ref={photoUploadInputRef}
              accept="image/*"
              onChange={handleBottlePhotoUpload}
              className="hidden"
            />

            {/* TOP SECTION: Fragrantica layout with Bottle on Left and Brand/Accords on Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* Left: Real Bottle Photo & Code */}
              <div className="md:col-span-5 space-y-3">
                <div
                  className={`relative w-full aspect-[3/4] max-w-xs mx-auto rounded-3xl overflow-hidden border p-4 flex items-center justify-center group transition-colors ${
                    isLight
                      ? 'bg-stone-50 border-stone-200 shadow-md'
                      : 'bg-gradient-to-b from-stone-900 via-[#0d0d0d] to-black border-[#C9A84C]/40 shadow-2xl'
                  }`}
                >
                  <img
                    src={bottlePhoto}
                    alt={fragrance.name}
                    className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ${
                      isLight
                        ? 'drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]'
                        : 'drop-shadow-[0_8px_24px_rgba(201,168,76,0.15)]'
                    }`}
                  />

                  {/* Direct Edit Photo Button for Admin */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => photoUploadInputRef.current?.click()}
                      title="Cambiar foto de perfil del frasco"
                      className="absolute top-3 left-3 bg-black/85 hover:bg-amber-500 hover:text-stone-950 text-amber-300 px-2.5 py-1.5 rounded-xl border border-amber-400/40 text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition cursor-pointer z-10"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Editar Foto</span>
                    </button>
                  )}

                  {/* Favorite button */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(fragrance.id)}
                    className={`absolute top-3 right-3 p-2 rounded-xl border shadow z-10 ${
                      isLight
                        ? 'bg-white/95 border-stone-300 text-stone-600 hover:text-rose-500'
                        : 'bg-black/80 border-stone-800 text-stone-300 hover:text-rose-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  {/* Gender badge */}
                  <span className={`absolute bottom-3 right-3 text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${
                    fragrance.gender === 'Dama'
                      ? 'bg-rose-950/90 text-rose-200 border border-rose-800'
                      : fragrance.gender === 'Caballero'
                      ? 'bg-blue-950/90 text-blue-200 border border-blue-800'
                      : 'bg-amber-950/90 text-amber-200 border border-amber-800'
                  }`}>
                    {fragrance.gender}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => photoUploadInputRef.current?.click()}
                      className="w-full py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-400/50 text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Cambiar Foto de Perfil Directamente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdminEditorOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#A07830] via-[#C9A84C] to-[#A07830] text-stone-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow hover:brightness-110 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Poner Foto Real / Editar Ficha Completa</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Brand Card, Name & Fragrantica "Acordes Principales" */}
              <div className="md:col-span-7 space-y-4">
                {/* Brand Logo Card & Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div
                        className="inline-block px-3 py-1 rounded-md text-xs shadow font-black uppercase"
                        style={{ backgroundColor: brandCfg.bgColor, color: brandCfg.textColor }}
                      >
                        <span className={brandCfg.fontClass}>{brandCfg.label}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg border font-mono text-xs font-bold shadow ${
                        isLight
                          ? 'bg-amber-50 text-[#926615] border-amber-300'
                          : 'bg-black/90 text-[#F0D080] border-[#C9A84C]/60'
                      }`}>
                        Código: {fragrance.code}
                      </span>
                    </div>

                    {/* Entire name without truncation in pure high-contrast black */}
                    <h2 className={`text-2xl sm:text-3xl font-extrabold font-serif-luxury tracking-tight break-words whitespace-normal ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>
                      {fragrance.name}
                    </h2>
                    <p className={`text-xs mt-1 break-words font-medium ${isLight ? 'text-stone-700' : 'text-stone-400'}`}>
                      {fragrance.family} · <span className={isLight ? 'text-[#926615] font-bold' : 'text-[#F0D080]'}>{fragrance.subfamily}</span>
                    </p>
                  </div>
                </div>

                {/* Acordes Principales (Fragrantica layout) */}
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isLight
                    ? 'bg-stone-50 border-stone-200'
                    : 'bg-[#141414] border-stone-800'
                }`}>
                  <span className={`text-xs uppercase tracking-wider font-bold block ${
                    isLight ? 'text-[#09090b]' : 'text-[#F0D080]'
                  }`}>
                    acordes principales
                  </span>
                  <div className="space-y-1.5 pt-1">
                    {mainAccords.map((accord) => (
                      <div
                        key={accord.name}
                        style={{
                          backgroundColor: accord.color,
                          color: accord.textColor,
                          width: `${accord.percentage}%`
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all whitespace-normal break-words"
                      >
                        {accord.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Intensity & Sillage Gauge */}
                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  isLight
                    ? 'bg-stone-50 border-stone-200'
                    : 'bg-[#141414] border-[#C9A84C]/30'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                    }`}>
                      <Flame className="w-4 h-4 text-[#C9A84C]" />
                      <span>Intensidad & Estela</span>
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                      isLight
                        ? 'bg-white border-stone-300 text-[#09090b]'
                        : 'bg-stone-900 border-stone-800 text-stone-100'
                    }`}>
                      {fragrance.intensity}
                    </span>
                  </div>

                  {/* 4 Segment Gauge */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {intensityLevels.map((lvl, idx) => {
                      const active = idx < currentLevelIdx;
                      return (
                        <div key={lvl.id} className="space-y-1">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              active
                                ? 'bg-gradient-to-r from-[#A07830] via-[#C9A84C] to-[#F0D080] shadow-sm shadow-[#C9A84C]/40'
                                : isLight ? 'bg-stone-200' : 'bg-stone-800'
                            }`}
                          />
                          <span className={`text-[9px] block text-center uppercase tracking-tighter ${
                            active
                              ? isLight ? 'text-[#926615] font-bold' : 'text-[#F0D080] font-bold'
                              : isLight ? 'text-stone-400' : 'text-stone-600'
                          }`}>
                            {lvl.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between text-[11px] pt-1 border-t gap-1 ${
                    isLight ? 'border-stone-200 text-stone-600' : 'border-stone-800/60 text-stone-400'
                  }`}>
                    <span>Radio de proyección: <strong className={isLight ? 'text-stone-900' : 'text-stone-200'}>{intensityLevels[currentLevelIdx - 1]?.sillage}</strong></span>
                    <span>{intensityLevels[currentLevelIdx - 1]?.desc}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ¿A QUÉ HUELE ESTA FRAGANCIA? (Puntual, directo y sin relleno) */}
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-md ${
              isLight
                ? 'bg-stone-50 border-stone-200'
                : 'bg-[#141414] border-[#C9A84C]/40'
            }`}>
              <div className={`flex items-center justify-between flex-wrap gap-2 border-b pb-3 ${
                isLight ? 'border-stone-200' : 'border-stone-800'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C9A84C]" />
                  <h3 className={`text-sm sm:text-base font-bold font-serif-luxury uppercase tracking-wider ${
                    isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                  }`}>
                    ¿A Qué Huele Esta Fragancia?
                  </h3>
                </div>
                <span className={`text-[11px] font-mono ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Perfil Olfativo Puntual
                </span>
              </div>

              {/* Punctual Sensory Breakdown */}
              <div className="space-y-3">
                <p className={`text-sm leading-relaxed font-sans font-medium break-words whitespace-normal ${
                  isLight ? 'text-stone-800' : 'text-stone-200'
                }`}>
                  {breakdown.resumen || getFullFragranceReview(fragrance)}
                </p>
              </div>

              {/* Sensory Breakdown Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-black/60 border-stone-800'
                }`}>
                  <span className={`block text-[10px] uppercase font-mono ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>Sensación:</span>
                  <span className={`font-semibold block mt-0.5 break-words whitespace-normal ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                    {fragrance.sensation || 'Cálida / Especiada'}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-black/60 border-stone-800'
                }`}>
                  <span className={`block text-[10px] uppercase font-mono ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>Nivel de Dulzor:</span>
                  <span className={`font-semibold block mt-0.5 break-words whitespace-normal ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                    {fragrance.sweetness || 'Moderado'}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-black/60 border-stone-800'
                }`}>
                  <span className={`block text-[10px] uppercase font-mono ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>Piel Óptima:</span>
                  <span className={`font-semibold block mt-0.5 break-words whitespace-normal ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                    {fragrance.skinCompat}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-black/60 border-stone-800'
                }`}>
                  <span className={`block text-[10px] uppercase font-mono ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>Personalidad:</span>
                  <span className={`font-semibold block mt-0.5 break-words whitespace-normal ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                    {fragrance.personality || 'Seductor, Urbano'}
                  </span>
                </div>
              </div>
            </div>

            {/* CUÁNDO USARLO (Pure white / stone-50 in light mode, fixing black box from image_287d6261.png) */}
            <div className={`p-5 rounded-3xl border space-y-3 ${
              isLight
                ? 'bg-stone-50 border-stone-200 shadow-xs text-[#09090b]'
                : 'bg-[#0f0f0f] border-stone-800 text-stone-100'
            }`}>
              <h4 className={`text-xs uppercase tracking-widest font-bold block ${
                isLight ? 'text-[#926615]' : 'text-[#F0D080]'
              }`}>
                CUÁNDO USARLO
              </h4>
              <p className={`text-sm leading-relaxed break-words whitespace-normal ${
                isLight ? 'text-stone-800 font-medium' : 'text-stone-200'
              }`}>
                {getOccasionDescription(fragrance.occasion)}
              </p>
              <div className={`pt-2 text-xs flex flex-wrap items-center gap-3 border-t ${
                isLight ? 'text-stone-600 border-stone-200' : 'text-stone-400 border-stone-800/80'
              }`}>
                <span>Ambiente: <strong className={isLight ? 'text-[#09090b] font-bold' : 'text-stone-200'}>{fragrance.environment}</strong></span>
                <span>•</span>
                <span>Rango de edad recomendado: <strong className={isLight ? 'text-[#09090b] font-bold' : 'text-stone-200'}>{fragrance.ageRange}</strong></span>
              </div>
            </div>

            {/* PIRÁMIDE OLFATIVA (Splits compound notes into separate distinct golden badges) */}
            <div className={`p-6 rounded-3xl border space-y-6 ${
              isLight
                ? 'bg-stone-50 border-stone-200 shadow-xs'
                : 'bg-[#0d0d0d] border-[#C9A84C]/35'
            }`}>
              <div className={`text-center space-y-1.5 border-b pb-3 ${
                isLight ? 'border-stone-200' : 'border-stone-800'
              }`}>
                <h4 className={`text-xs uppercase tracking-widest font-bold ${
                  isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                }`}>
                  PIRÁMIDE OLFATIVA
                </h4>
                <p className={`text-xs ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                  Evolución cronológica de cada acorde sobre tu piel. Notas individuales con fotos reales.
                </p>
                {isAdmin && (
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                    isLight
                      ? 'bg-amber-100/80 border-amber-300 text-[#926615]'
                      : 'bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#F0D080]'
                  }`}>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Modo Administrador: Haz clic en cualquier nota para copiar y pegar su foto</span>
                  </div>
                )}
              </div>

              {/* NOTAS DE SALIDA (TOP) */}
              <div className="space-y-2 text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${
                  isLight
                    ? 'bg-white border-amber-300 text-[#926615] shadow-xs'
                    : 'bg-stone-900 border-stone-800 text-[#F0D080]'
                }`}>
                  <span>SALIDA (Top Notes)</span>
                  <span className={`text-[10px] font-normal ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>Primeros 15 minutos</span>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {topNotes.map((note) => {
                    const visual = getRealNotePhoto(note);
                    return (
                      <div
                        key={note}
                        onClick={() => {
                          if (isAdmin) {
                            setEditingNoteForPhoto(note);
                          } else {
                            setSelectedNotePopup(note);
                          }
                        }}
                        className={`flex flex-col items-center p-2 rounded-2xl border cursor-pointer group transition-all relative ${
                          isLight
                            ? 'bg-white border-amber-300/80 hover:border-amber-500 shadow-xs'
                            : 'bg-[#141414] border-stone-800 hover:border-[#C9A84C]'
                        }`}
                        title={isAdmin ? `Administrador: Clic para copiar/pegar foto de ${note}` : `Ver detalles de ${note}`}
                      >
                        {isAdmin && (
                          <div className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-[#C9A84C] text-stone-950 flex items-center justify-center shadow-md">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <div className="w-14 h-14 rounded-xl bg-white p-1 overflow-hidden shadow group-hover:scale-105 transition-transform border border-amber-200/50">
                          <img
                            src={visual.photoUrl}
                            alt={note}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <span className={`text-xs mt-1.5 max-w-[90px] text-center break-words whitespace-normal leading-tight capitalize ${
                          isLight
                            ? 'text-[#09090b] font-semibold group-hover:text-[#926615]'
                            : 'text-stone-200 group-hover:text-[#F0D080]'
                        }`}>
                          {note.toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NOTAS DE CORAZÓN (HEART) */}
              <div className={`space-y-2 text-center pt-2 border-t ${
                isLight ? 'border-stone-200' : 'border-stone-800/80'
              }`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${
                  isLight
                    ? 'bg-white border-rose-300 text-rose-700 shadow-xs'
                    : 'bg-stone-900 border-stone-800 text-rose-300'
                }`}>
                  <span>CORAZÓN (Heart Notes)</span>
                  <span className={`text-[10px] font-normal ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>2 a 4 horas</span>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {heartNotes.map((note) => {
                    const visual = getRealNotePhoto(note);
                    return (
                      <div
                        key={note}
                        onClick={() => {
                          if (isAdmin) {
                            setEditingNoteForPhoto(note);
                          } else {
                            setSelectedNotePopup(note);
                          }
                        }}
                        className={`flex flex-col items-center p-2 rounded-2xl border cursor-pointer group transition-all relative ${
                          isLight
                            ? 'bg-white border-rose-200 hover:border-rose-400 shadow-xs'
                            : 'bg-[#141414] border-stone-800 hover:border-rose-400'
                        }`}
                        title={isAdmin ? `Administrador: Clic para copiar/pegar foto de ${note}` : `Ver detalles de ${note}`}
                      >
                        {isAdmin && (
                          <div className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-[#C9A84C] text-stone-950 flex items-center justify-center shadow-md">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <div className="w-14 h-14 rounded-xl bg-white p-1 overflow-hidden shadow group-hover:scale-105 transition-transform border border-rose-200/50">
                          <img
                            src={visual.photoUrl}
                            alt={note}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <span className={`text-xs mt-1.5 max-w-[90px] text-center break-words whitespace-normal leading-tight capitalize ${
                          isLight
                            ? 'text-[#09090b] font-semibold group-hover:text-rose-700'
                            : 'text-stone-200 group-hover:text-rose-300'
                        }`}>
                          {note.toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NOTAS DE FONDO (BASE) */}
              <div className={`space-y-2 text-center pt-2 border-t ${
                isLight ? 'border-stone-200' : 'border-stone-800/80'
              }`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${
                  isLight
                    ? 'bg-white border-amber-300 text-[#926615] shadow-xs'
                    : 'bg-stone-900 border-stone-800 text-amber-300'
                }`}>
                  <span>BASE / FONDO (Base Notes)</span>
                  <span className={`text-[10px] font-normal ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>Más de 6 a 12 horas</span>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {baseNotes.map((note) => {
                    const visual = getRealNotePhoto(note);
                    return (
                      <div
                        key={note}
                        onClick={() => {
                          if (isAdmin) {
                            setEditingNoteForPhoto(note);
                          } else {
                            setSelectedNotePopup(note);
                          }
                        }}
                        className={`flex flex-col items-center p-2 rounded-2xl border cursor-pointer group transition-all relative ${
                          isLight
                            ? 'bg-white border-amber-300/80 hover:border-amber-500 shadow-xs'
                            : 'bg-[#141414] border-stone-800 hover:border-amber-400'
                        }`}
                        title={isAdmin ? `Administrador: Clic para copiar/pegar foto de ${note}` : `Ver detalles de ${note}`}
                      >
                        {isAdmin && (
                          <div className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-[#C9A84C] text-stone-950 flex items-center justify-center shadow-md">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <div className="w-14 h-14 rounded-xl bg-white p-1 overflow-hidden shadow group-hover:scale-105 transition-transform border border-amber-200/50">
                          <img
                            src={visual.photoUrl}
                            alt={note}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <span className={`text-xs mt-1.5 max-w-[90px] text-center break-words whitespace-normal leading-tight capitalize ${
                          isLight
                            ? 'text-[#09090b] font-semibold group-hover:text-[#926615]'
                            : 'text-stone-200 group-hover:text-amber-300'
                        }`}>
                          {note.toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FRAGANCIAS SIMILARES (White mode consistency, fixing black box from image_3d359744.png) */}
            <div className={`space-y-4 pt-6 border-t ${isLight ? 'border-stone-200' : 'border-stone-800'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className={`text-lg font-bold font-serif-luxury flex items-center gap-2 ${
                    isLight ? 'text-[#09090b]' : 'text-stone-100'
                  }`}>
                    <Sparkles className="w-4 h-4 text-[#C9A84C]" />
                    <span>Fragancias Similares</span>
                  </h4>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    Alternativas con mayor afinidad y notas compartidas en salida, corazón y fondo.
                  </p>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-mono self-start sm:self-auto border ${
                  isLight
                    ? 'bg-amber-50 text-[#926615] border-amber-300'
                    : 'bg-[#181818] border-[#C9A84C]/40 text-[#F0D080]'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
                  <span>Afinidad Olfativa</span>
                </div>
              </div>

              {similarItems.length === 0 ? (
                <div className={`p-6 text-center rounded-2xl border text-xs ${
                  isLight
                    ? 'bg-stone-50 border-stone-200 text-stone-600'
                    : 'bg-[#121212] border-stone-800 text-stone-400'
                }`}>
                  No hay otras fragancias en este rango con afinidad de notas compartidas suficientes.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {similarItems.map(({ fragrance: sim, jaccardPercentage, sharedTopNotes, sharedHeartNotes, sharedBaseNotes, allSharedNotes }) => {
                    const simBottle = getPerfumeBottlePhoto(sim.name, sim.gender, sim.image, sim.code);
                    const cleanTop = sanitizeNotesArray(sharedTopNotes);
                    const cleanHeart = sanitizeNotesArray(sharedHeartNotes);
                    const cleanBase = sanitizeNotesArray(sharedBaseNotes);

                    return (
                      <div
                        key={sim.id}
                        onClick={() => onSelectAnother(sim)}
                        className={`p-3.5 rounded-2xl border cursor-pointer group transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                          isLight
                            ? 'bg-white border-stone-200 shadow-md hover:border-amber-400 text-[#09090b]'
                            : 'bg-[#121212] border-stone-800 hover:border-[#C9A84C] text-stone-100'
                        }`}
                      >
                        {/* Match Score Pill */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                            isLight
                              ? 'bg-stone-100 text-[#09090b] border-stone-300'
                              : 'bg-black/80 text-[#F0D080] border-stone-800'
                          }`}>
                            {sim.code}
                          </span>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                            isLight
                              ? 'bg-amber-100 text-[#926615] border-amber-300'
                              : 'bg-[#1e1708] border-[#C9A84C]/60 text-[#F0D080]'
                          }`}>
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{jaccardPercentage}% afinidad</span>
                          </div>
                        </div>

                        {/* Flacon bottle real photo (Clean white / stone-50 in light mode) */}
                        <div className={`relative aspect-square rounded-xl border p-2 overflow-hidden flex items-center justify-center ${
                          isLight
                            ? 'bg-stone-50 border-stone-200'
                            : 'bg-gradient-to-b from-stone-900 to-black border-stone-800/80'
                        }`}>
                          <img
                            src={simBottle}
                            alt={sim.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                          />
                          <span className={`absolute bottom-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            sim.gender === 'Dama'
                              ? 'bg-rose-950/90 text-rose-200 border border-rose-800'
                              : sim.gender === 'Caballero'
                              ? 'bg-blue-950/90 text-blue-200 border border-blue-800'
                              : 'bg-amber-950/90 text-amber-200 border border-amber-800'
                          }`}>
                            {sim.gender}
                          </span>
                        </div>

                        {/* Name & Brand with full text, NO truncation */}
                        <div>
                          <span className={`text-[10px] uppercase tracking-wider block font-bold ${
                            isLight ? 'text-[#926615]' : 'text-stone-400'
                          }`}>
                            {sim.brand}
                          </span>
                          <h5 className={`font-bold text-xs break-words whitespace-normal leading-snug ${
                            isLight ? 'text-[#09090b] group-hover:text-[#926615]' : 'text-stone-100 group-hover:text-[#F0D080]'
                          }`}>
                            {sim.name}
                          </h5>
                          <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                            {sim.family}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className={`w-full h-1.5 rounded-full overflow-hidden border ${
                            isLight ? 'bg-stone-200 border-stone-300' : 'bg-stone-900 border-stone-800'
                          }`}>
                            <div
                              className="h-full bg-gradient-to-r from-[#C9A84C] to-[#F0D080] rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(15, jaccardPercentage))}%` }}
                            />
                          </div>
                        </div>

                        {/* Shared Notes by Tier (Divided notes with golden accents) */}
                        <div className={`pt-2 border-t space-y-1 text-[10px] ${
                          isLight ? 'border-stone-200' : 'border-stone-800/80'
                        }`}>
                          {cleanTop.length > 0 && (
                            <div className="flex flex-col space-y-1">
                              <span className={`font-semibold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                                Salida compartida:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {cleanTop.map((note) => (
                                  <span
                                    key={note}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      isLight
                                        ? 'bg-amber-50 text-[#926615] border-amber-300'
                                        : 'bg-[#1e1708] text-[#F0D080] border-[#C9A84C]/40'
                                    }`}
                                  >
                                    {note}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {cleanHeart.length > 0 && (
                            <div className="flex flex-col space-y-1">
                              <span className={`font-semibold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                                Corazón compartido:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {cleanHeart.map((note) => (
                                  <span
                                    key={note}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      isLight
                                        ? 'bg-amber-50 text-[#926615] border-amber-300'
                                        : 'bg-[#1e1708] text-[#F0D080] border-[#C9A84C]/40'
                                    }`}
                                  >
                                    {note}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {cleanBase.length > 0 && (
                            <div className="flex flex-col space-y-1">
                              <span className={`font-semibold ${isLight ? 'text-[#926615]' : 'text-[#F0D080]'}`}>
                                Fondo compartido:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {cleanBase.map((note) => (
                                  <span
                                    key={note}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      isLight
                                        ? 'bg-amber-50 text-[#926615] border-amber-300'
                                        : 'bg-[#1e1708] text-[#F0D080] border-[#C9A84C]/40'
                                    }`}
                                  >
                                    {note}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {allSharedNotes.length === 0 && (
                            <span className={`italic block ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>
                              Similitud por familia y acordes
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* INGREDIENT DETAIL POPUP MODAL */}
          {selectedNotePopup && (() => {
            const noteVisual = getRealNotePhoto(selectedNotePopup);
            const isTop = topNotes.includes(selectedNotePopup);
            const isHeart = heartNotes.includes(selectedNotePopup);
            const isBase = baseNotes.includes(selectedNotePopup);

            return (
              <div
                className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
                onClick={() => setSelectedNotePopup(null)}
              >
                <div
                  className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 border ${
                    isLight
                      ? 'bg-white border-stone-200 text-[#09090b]'
                      : 'bg-[#121212] border-[#C9A84C]/50 text-stone-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedNotePopup(null)}
                    className={`absolute top-4 right-4 p-1.5 rounded-full border ${
                      isLight
                        ? 'text-stone-500 hover:text-stone-900 bg-stone-100 border-stone-300'
                        : 'text-stone-400 hover:text-stone-100 bg-stone-900 border-stone-800'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="w-24 h-24 mx-auto rounded-2xl bg-white p-1.5 shadow-xl overflow-hidden border border-[#C9A84C]/40">
                    <img
                      src={noteVisual.photoUrl}
                      alt={noteVisual.name || selectedNotePopup}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <h4 className={`text-xl font-bold font-serif-luxury capitalize break-words ${
                      isLight ? 'text-[#09090b]' : 'text-stone-100'
                    }`}>
                      {noteVisual.name || selectedNotePopup}
                    </h4>
                    {noteVisual.botanicalName && (
                      <p className={`text-xs italic ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                        {noteVisual.botanicalName}
                      </p>
                    )}
                    <p className={`text-[10px] uppercase font-mono tracking-wider font-bold ${
                      isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                    }`}>
                      Grupo: {noteVisual.category.toUpperCase()}
                    </p>
                    <div className="flex justify-center gap-1.5 pt-1 text-[11px]">
                      {isTop && (
                        <span className={`px-2 py-0.5 rounded border font-semibold ${
                          isLight
                            ? 'bg-amber-50 border-amber-300 text-[#926615]'
                            : 'bg-stone-900 border-[#F0D080]/40 text-[#F0D080]'
                        }`}>
                          Salida (Top)
                        </span>
                      )}
                      {isHeart && (
                        <span className={`px-2 py-0.5 rounded border font-semibold ${
                          isLight
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-stone-900 border-rose-500/40 text-rose-300'
                        }`}>
                          Corazón (Heart)
                        </span>
                      )}
                      {isBase && (
                        <span className={`px-2 py-0.5 rounded border font-semibold ${
                          isLight
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-stone-900 border-amber-500/40 text-amber-300'
                        }`}>
                          Fondo (Base)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed text-left space-y-1 ${
                    isLight
                      ? 'bg-stone-50 border-stone-200 text-stone-800'
                      : 'bg-black/50 border-stone-800 text-stone-300'
                  }`}>
                    <span className={`font-bold text-[11px] block uppercase tracking-wide ${
                      isLight ? 'text-[#926615]' : 'text-[#F0D080]'
                    }`}>
                      Perfil Aromático:
                    </span>
                    <p>{noteVisual.description}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetNote = selectedNotePopup;
                          setSelectedNotePopup(null);
                          setEditingNoteForPhoto(targetNote);
                        }}
                        className={`w-full py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isLight
                            ? 'bg-amber-50 hover:bg-amber-100 text-[#926615] border-amber-300'
                            : 'bg-stone-800 hover:bg-stone-700 text-[#F0D080] border-[#C9A84C]/40'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Nota (Nombre, Descripción, Foto)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedNotePopup(null)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-[#A07830] to-[#C9A84C] text-stone-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
                    >
                      Cerrar Ficha
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Admin Full Editor Modal */}
      {isAdmin && (
        <>
          <AdminFragranceEditorModal
            fragrance={fragrance}
            isOpen={isAdminEditorOpen}
            onClose={() => setIsAdminEditorOpen(false)}
            onSaved={(updated) => {
              setCurrentFragrance(updated);
            }}
          />

          <AdminNotePhotoEditorModal
            noteName={editingNoteForPhoto}
            isOpen={!!editingNoteForPhoto}
            onClose={() => setEditingNoteForPhoto(null)}
            onSaved={() => {
              setNoteVersion((v) => v + 1);
            }}
          />
        </>
      )}
    </>
  );
};
