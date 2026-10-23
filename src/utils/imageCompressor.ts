/**
 * Client-Side Image Compression & Optimization Utility
 * 
 * Takes an uploaded File or Image, resizes it down to optimal responsive dimensions
 * (max 600px width/height for food thumbnails, 1200px for banners), and outputs a lightweight WebP / JPEG
 * base64 string or Blob (under 30KB - 80KB) so that users with mobile data experience instant loads.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (e.g. 0.75 for sharp 35KB output)
  mimeType?: 'image/webp' | 'image/jpeg';
}

export const compressImageFile = (
  file: File,
  options: CompressionOptions = {}
): Promise<{ base64: string; sizeInKb: number; width: number; height: number }> => {
  const {
    maxWidth = 640,
    maxHeight = 640,
    quality = 0.78,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed data URL
        const base64 = canvas.toDataURL(mimeType, quality);
        const approximateKb = Math.round((base64.length * 3) / 4 / 1024);

        resolve({
          base64,
          sizeInKb: approximateKb,
          width,
          height
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Optimized compressor specifically designed for multi-page restaurant printed menus
 * Preserves high legibility for small text and prices while reducing 5-10MB mobile uploads
 * to ~90KB-180KB (saving 95%+ bandwidth and mobile data).
 */
export const compressMenuPageImage = async (
  file: File,
  customTitle?: string
): Promise<{
  base64: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
  savingsPercent: number;
}> => {
  const originalSizeKb = Math.round(file.size / 1024);
  const result = await compressImageFile(file, {
    maxWidth: 1400,
    maxHeight: 2000,
    quality: 0.76,
    mimeType: 'image/jpeg',
  });

  const savingsPercent = originalSizeKb > 0 
    ? Math.max(0, Math.round(((originalSizeKb - result.sizeInKb) / originalSizeKb) * 100))
    : 0;

  return {
    base64: result.base64,
    originalSizeKb,
    compressedSizeKb: result.sizeInKb,
    width: result.width,
    height: result.height,
    savingsPercent
  };
};
