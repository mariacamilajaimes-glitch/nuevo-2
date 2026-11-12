import React, { useEffect, useState } from 'react';

/**
 * Limpia el fondo oscuro de las fotografías de frascos.
 *
 * Muchas fotos del catálogo traen un fondo negro o gris muy oscuro. En modo
 * día eso rompe la estética (una tarjeta blanca con un bloque negro dentro).
 * Este componente detecta los píxeles oscuros conectados al borde de la foto
 * (el fondo) y los pinta de blanco, sin tocar el frasco.
 *
 * - Solo actúa en modo día (`isLight`).
 * - Cachea el resultado por URL para no procesar la misma foto varias veces.
 * - Si el navegador bloquea el canvas (CORS), devuelve la imagen original.
 */

const processedCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

function processBottlePhoto(src: string): Promise<string> {
  const cached = processedCache.get(src);
  if (cached) return Promise.resolve(cached);

  const running = inFlight.get(src);
  if (running) return running;

  const promise = new Promise<string>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';

    image.onload = () => {
      try {
        const maxSide = 700;
        const scale = Math.min(
          1,
          maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1)
        );
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const isDarkBackground = (index: number): boolean => {
          const offset = index * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          // Oscuro y prácticamente neutro (negro/gris de fondo). El umbral
          // cubre también los fondos gris oscuro de algunas fotos de estudio.
          return (r + g + b) / 3 < 92 && max - min < 24;
        };

        const enqueue = (x: number, y: number) => {
          const index = y * width + x;
          if (visited[index]) return;
          if (!isDarkBackground(index)) return;
          visited[index] = 1;
          queue.push(index);
        };

        // Semillas: todos los píxeles del borde de la imagen.
        for (let x = 0; x < width; x += 1) {
          enqueue(x, 0);
          enqueue(x, height - 1);
        }
        for (let y = 0; y < height; y += 1) {
          enqueue(0, y);
          enqueue(width - 1, y);
        }

        // Relleno por inundación: solo el fondo conectado con el borde.
        let head = 0;
        while (head < queue.length) {
          const index = queue[head];
          head += 1;
          const x = index % width;
          const y = (index - x) / width;
          if (x > 0) enqueue(x - 1, y);
          if (x < width - 1) enqueue(x + 1, y);
          if (y > 0) enqueue(x, y - 1);
          if (y < height - 1) enqueue(x, y + 1);
        }

        for (const index of queue) {
          const offset = index * 4;
          pixels[offset] = 255;
          pixels[offset + 1] = 255;
          pixels[offset + 2] = 255;
          pixels[offset + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        const result = canvas.toDataURL('image/jpeg', 0.9);
        processedCache.set(src, result);
        resolve(result);
      } catch {
        resolve(src);
      }
    };

    image.onerror = () => resolve(src);
    image.src = src;
  });

  inFlight.set(src, promise);
  promise.finally(() => inFlight.delete(src));
  return promise;
}

interface SmartBottleImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  isLight: boolean;
}

export const SmartBottleImage: React.FC<SmartBottleImageProps> = ({
  src,
  isLight,
  ...imgProps
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    isLight ? processedCache.get(src) || src : src
  );

  useEffect(() => {
    let active = true;

    if (!isLight) {
      setResolvedSrc(src);
      return () => {
        active = false;
      };
    }

    const cached = processedCache.get(src);
    if (cached) {
      setResolvedSrc(cached);
      return () => {
        active = false;
      };
    }

    setResolvedSrc(src);
    processBottlePhoto(src)
      .then((result) => {
        if (active) setResolvedSrc(result);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [src, isLight]);

  return <img src={resolvedSrc} {...imgProps} />;
};
