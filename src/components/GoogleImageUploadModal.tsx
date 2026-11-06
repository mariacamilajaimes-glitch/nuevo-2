import React, { useState, useRef, useEffect, DragEvent, ClipboardEvent } from 'react';
import { X, Upload, Search, Check, Image as ImageIcon, Sparkles, Loader2, Link, ArrowRight } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface GoogleImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (imageUrl: string) => void | Promise<void>;
  title?: string;
  subtitle?: string;
  currentImage?: string;
  theme?: 'light' | 'dark';
}

export const GoogleImageUploadModal: React.FC<GoogleImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageSelected,
  title = 'Busca cualquier imagen o arrástrala aquí',
  subtitle = 'Arrastra una foto desde tu equipo, de Google o pega con Ctrl+V',
  currentImage,
  theme = 'dark',
}) => {
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light'));

  const [inputUrl, setInputUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentImage || null);
      setInputUrl('');
      setErrorMessage(null);
      setSuccessNotice(null);
    }
  }, [isOpen, currentImage]);

  // Global paste handler while modal is open (handles Ctrl + V anywhere)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = async (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await processFile(file, '¡Imagen pegada desde portapapeles!');
            return;
          }
        }
      }

      // Check if text is an image URL
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
        e.preventDefault();
        await handleApplyUrl(text);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const processFile = async (file: File, noticeText?: string) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, AVIF).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawResult = reader.result as string;
          // Compress image to maintain high speed and prevent storage exhaustion
          const optimized = await compressImage(rawResult, 800, 800, 0.85);
          const finalUrl = optimized || rawResult;
          setPreviewUrl(finalUrl);
          setSuccessNotice(noticeText || '¡Imagen lista para usar!');
        } catch {
          setPreviewUrl(reader.result as string);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessing(false);
      setErrorMessage('No se pudo procesar la imagen seleccionada.');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 1. Check for dropped file from computer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file, '¡Imagen arrastrada y optimizada con éxito!');
      return;
    }

    // 2. Check for image dragged from Google search or other websites
    const uriList = e.dataTransfer.getData('text/uri-list');
    if (uriList && (uriList.startsWith('http://') || uriList.startsWith('https://'))) {
      await handleApplyUrl(uriList);
      return;
    }

    // 3. Check for HTML img element dragged from another page
    const htmlData = e.dataTransfer.getData('text/html');
    if (htmlData) {
      const match = htmlData.match(/src=["'](.*?)["']/);
      if (match && match[1] && (match[1].startsWith('http') || match[1].startsWith('data:'))) {
        await handleApplyUrl(match[1]);
        return;
      }
    }

    // 4. Check for plain text URL
    const plainText = e.dataTransfer.getData('text/plain');
    if (plainText && (plainText.startsWith('http://') || plainText.startsWith('https://'))) {
      await handleApplyUrl(plainText);
      return;
    }
  };

  const handleApplyUrl = async (urlToApply: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed) {
      setErrorMessage('Ingresa o pega un vínculo de imagen válido.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // If it's a data URI, compress it
    if (trimmed.startsWith('data:image/')) {
      try {
        const compressed = await compressImage(trimmed, 800, 800, 0.85);
        setPreviewUrl(compressed || trimmed);
        setSuccessNotice('¡Imagen vinculada con éxito!');
      } catch {
        setPreviewUrl(trimmed);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Regular URL
    setPreviewUrl(trimmed);
    setSuccessNotice('¡Vínculo de imagen cargado!');
    setIsProcessing(false);
  };

  const handleSaveAndConfirm = async () => {
    if (!previewUrl) {
      setErrorMessage('Por favor arrastra o pega una imagen antes de guardar.');
      return;
    }

    setIsProcessing(true);
    try {
      await onImageSelected(previewUrl);
      onClose();
    } catch {
      setErrorMessage('Hubo un error al guardar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border p-6 sm:p-8 flex flex-col space-y-5 transition-colors duration-200 ${
          isLight
            ? 'bg-white text-stone-900 border-stone-200 shadow-stone-900/15'
            : 'bg-[#121212] text-stone-100 border-[#C9A84C]/40 shadow-[#C9A84C]/15'
        }`}
      >
        {/* Top Header matching Google Lens style */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Google Lens / Image Icon Graphic */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-amber-500/20 border-amber-400/40 text-[#F0D080]'
            }`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-bold font-serif-luxury ${
                isLight ? 'text-stone-900' : 'text-stone-100'
              }`}>
                {title}
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isLight
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dashed Drag & Drop Box (Google Lens style as shown in user screenshot) */}
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-3xl border-2 border-dashed p-7 sm:p-9 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
            isDragging
              ? isLight
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                : 'border-[#C9A84C] bg-amber-500/15 scale-[1.01]'
              : isLight
              ? 'border-stone-300 bg-stone-50/70 hover:bg-stone-100/70 hover:border-blue-400'
              : 'border-stone-700 bg-stone-900/60 hover:bg-stone-900/90 hover:border-[#C9A84C]/70'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0], '¡Archivo cargado!');
              }
            }}
          />

          {/* Central Illustrated Icon (Landscape / Mountains matching Google) */}
          <div className="relative mb-3">
            <div className={`w-16 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-transform duration-300 ${
              isDragging ? 'scale-110' : ''
            } ${
              isLight ? 'bg-white border-blue-200 text-blue-500' : 'bg-black/60 border-amber-400/40 text-amber-400'
            }`}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" stroke="currentColor" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 text-white shadow">
              <Upload className="w-2.5 h-2.5" />
            </div>
          </div>

          <p className={`text-xs sm:text-sm font-medium ${isLight ? 'text-stone-700' : 'text-stone-200'}`}>
            Arrastra una imagen hasta aquí o{' '}
            <span className={`font-bold underline cursor-pointer ${
              isLight ? 'text-blue-600 hover:text-blue-700' : 'text-[#F0D080] hover:text-amber-300'
            }`}>
              sube un archivo
            </span>
          </p>

          <span className={`text-[11px] mt-1.5 ${isLight ? 'text-stone-400' : 'text-stone-500'}`}>
            Soporta JPG, PNG, WEBP, o pega con Ctrl+V desde el portapapeles
          </span>
        </div>

        {/* Divider with centered "o" */}
        <div className="relative flex items-center justify-center">
          <div className={`w-full border-t ${isLight ? 'border-stone-200' : 'border-stone-800'}`} />
          <span className={`absolute px-4 text-xs font-semibold uppercase tracking-wider ${
            isLight ? 'bg-white text-stone-400' : 'bg-[#121212] text-stone-500'
          }`}>
            o
          </span>
        </div>

        {/* Pill URL Search / Paste Row (Google Lens bottom bar style) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyUrl(inputUrl);
                }
              }}
              placeholder="Pegar vínculo de imagen"
              className={`w-full pl-4 pr-10 py-3 rounded-full text-xs sm:text-sm border transition-all outline-none ${
                isLight
                  ? 'bg-stone-50 border-stone-300 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-500 focus:bg-black focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20'
              }`}
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleApplyUrl(inputUrl)}
            disabled={!inputUrl.trim() || isProcessing}
            className={`px-5 py-3 rounded-full text-xs sm:text-sm font-bold border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm disabled:opacity-50'
                : 'bg-gradient-to-r from-[#A07830] via-[#C9A84C] to-[#A07830] hover:brightness-110 text-stone-950 border-amber-300 shadow disabled:opacity-50'
            }`}
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Buscar</span>
          </button>
        </div>

        {/* Notices */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {successNotice && (
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Live Image Preview (when selected) */}
        {previewUrl && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-black/60 border-stone-800'
          }`}>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 shrink-0 bg-stone-900/20 p-1 flex items-center justify-center shadow-xs">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">
                  Vista previa de la imagen
                </span>
                <span className={`text-[11px] ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                  Lista para aplicar a este elemento
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                Cambiar
              </button>

              <button
                type="button"
                onClick={handleSaveAndConfirm}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#A07830] via-[#C9A84C] to-[#A07830] hover:brightness-110 text-stone-950 text-xs font-bold border border-amber-300 shadow cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Guardar y Aplicar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
