import { ProjectPhoto } from '../types';

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;
const OUTPUT_MIME_TYPE = 'image/jpeg';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    image.src = src;
  });
}

export async function fileToProjectPhoto(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<ProjectPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen');
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo preparar el lienzo de la imagen');
    }

    // Flatten transparency so the JPEG preview stays clean on all browsers.
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL(OUTPUT_MIME_TYPE, quality),
      mimeType: OUTPUT_MIME_TYPE,
      fileName: file.name,
      width,
      height,
      capturedAt: new Date().toISOString(),
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
