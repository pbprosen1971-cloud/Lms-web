/**
 * Client-side image validator and canvas optimizer.
 * Ensures images conform to format (JPG, JPEG, PNG, WebP),
 * limits max size to 2 MB, and downscales dimensions to at most 512x512.
 */

export interface OptimizedImageResult {
  blob: Blob;
  previewUrl: string;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION = 512; // 512x512 max bounds

/**
 * Validates and optimizes an image file before upload.
 */
export async function optimizeProfileImage(file: File): Promise<OptimizedImageResult> {
  // 1. Format validation
  const mimeType = file.type?.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extension);

  if (!ALLOWED_MIME_TYPES.includes(mimeType) && !isAllowedExt) {
    throw new Error('শুধুমাত্র JPG, JPEG, PNG এবং WebP ফরম্যাটের ছবি অনুমোদন করা হবে।');
  }

  // 2. Size validation (max 2 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট (2 MB) হতে পারবে। আপনার ফাইলের আকার: ${sizeInMb} MB`);
  }

  // 3. Load image into memory for canvas downscaling
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ছবি পড়তে সমস্যা হয়েছে। অন্য কোনো ফাইল নির্বাচন করুন।'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('ছবির ডেটা লোড করতে ব্যর্থ হয়েছে। অনুগ্রহ করে সঠিক ছবি নির্বাচন করুন।'));
      img.onload = () => {
        try {
          // Calculate new dimensions preserving aspect ratio with max 512x512
          let targetWidth = img.naturalWidth || img.width;
          let targetHeight = img.naturalHeight || img.height;

          if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
              targetWidth = MAX_DIMENSION;
            } else {
              targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
              targetHeight = MAX_DIMENSION;
            }
          }

          // Off-screen canvas
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('ব্রাউজার ক্যানভাস ইনিশিয়ালাইজ করতে ব্যর্থ হয়েছে।');
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Export as optimized WebP or JPEG
          const exportType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = exportType === 'image/jpeg' ? 0.88 : undefined;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('ছবি অপটিমাইজেশন সম্পন্ন করতে ব্যর্থ হয়েছে।'));
                return;
              }

              const previewUrl = URL.createObjectURL(blob);
              resolve({
                blob,
                previewUrl,
                originalName: file.name,
                originalSize: file.size,
                optimizedSize: blob.size,
                width: targetWidth,
                height: targetHeight,
              });
            },
            exportType,
            quality
          );
        } catch (err: any) {
          reject(new Error(err?.message || 'ছবি অপটিমাইজেশনের সময় ত্রুটি ঘটেছে।'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
