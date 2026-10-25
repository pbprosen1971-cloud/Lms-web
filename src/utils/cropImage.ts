/**
 * Utility to extract cropped image from react-easy-crop pixelArea.
 * Produces an optimized 512×512 JPEG/WebP Blob with high-quality smoothing.
 */

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CroppedImageOutput {
  blob: Blob;
  sizeBytes: number;
  width: number;
  height: number;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  targetSize = 512,
  quality = 0.85
): Promise<Blob> {
  const image = await createImage(imageSrc);

  // If crop region is much larger than target size (e.g. 2000px on a 4K camera photo),
  // extract crop first, then downsample with step canvas for sharp antialiasing (like sharp's lanczos3)
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = pixelCrop.width;
  cropCanvas.height = pixelCrop.height;
  const cropCtx = cropCanvas.getContext('2d');

  if (!cropCtx) {
    throw new Error('ক্যানভাস ইনিশিয়ালাইজ করতে ব্যর্থ হয়েছে।');
  }

  cropCtx.imageSmoothingEnabled = true;
  cropCtx.imageSmoothingQuality = 'high';

  cropCtx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Final 512x512 Canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const outCtx = outCanvas.getContext('2d');

  if (!outCtx) {
    throw new Error('ক্যানভাস ইনিশিয়ালাইজ করতে ব্যর্থ হয়েছে।');
  }

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  // Multi-step downsampling if crop is more than 2x the target
  let currentCanvas: HTMLCanvasElement = cropCanvas;
  let curW = pixelCrop.width;
  let curH = pixelCrop.height;

  while (curW > targetSize * 2 && curH > targetSize * 2) {
    const stepCanvas = document.createElement('canvas');
    const stepW = Math.floor(curW / 2);
    const stepH = Math.floor(curH / 2);
    stepCanvas.width = stepW;
    stepCanvas.height = stepH;

    const stepCtx = stepCanvas.getContext('2d');
    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(currentCanvas, 0, 0, stepW, stepH);
      currentCanvas = stepCanvas;
      curW = stepW;
      curH = stepH;
    } else {
      break;
    }
  }

  outCtx.drawImage(currentCanvas, 0, 0, targetSize, targetSize);

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('ক্রপ করা সংকুচিত ছবি তৈরি করতে ব্যর্থ হয়েছে।'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}
