/**
 * Cloudinary Secure Signed Upload Service.
 * Interacts with /api/cloudinary-sign (Netlify Function / Express Backend)
 * to receive a signed upload signature, then performs a direct multipart upload
 * to Cloudinary with real-time upload progress.
 */

import { auth } from '../lib/firebase';

export interface CloudinarySignResponse {
  success: boolean;
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId?: string;
  message?: string;
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface UploadOptions {
  onProgress?: (percentage: number) => void;
}

/**
 * Uploads an image blob to Cloudinary using signed authentication.
 */
export async function uploadImageToCloudinary(
  blob: Blob,
  fileName: string,
  options?: UploadOptions
): Promise<CloudinaryUploadResult> {
  // 1. Verify User is Authenticated with Firebase
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('ছবি আপলোড করতে আপনাকে অবশ্যই মেধা এক্সাম অ্যাকাউন্টে লগইন থাকতে হবে।');
  }

  // 2. Fetch Firebase ID Token
  let idToken = '';
  try {
    idToken = await currentUser.getIdToken(true);
  } catch {
    throw new Error('ব্যবহারকারীর ভেরিফিকেশন টোকেন সংগ্রহ করা যায়নি। আবার লগইন করার চেষ্টা করুন।');
  }

  // 3. Request Signature from Backend (/api/cloudinary-sign)
  const signResponse = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      uid: currentUser.uid,
      fileName,
    }),
  });

  const signData = await signResponse.json();

  if (!signResponse.ok || !signData.success) {
    const errorMsg = signData?.message || 'Cloudinary আপলোড সিগনেচার গ্রহণ করতে ব্যর্থ হয়েছে।';
    throw new Error(errorMsg);
  }

  const { timestamp, signature, apiKey, cloudName, folder, publicId } = signData;

  if (!cloudName || !apiKey || !signature) {
    throw new Error('Cloudinary কনফিগারেশন অসম্পূর্ণ। দয়া করে পরিবেশ ভেরিয়েবলসমূহ চেক করুন।');
  }

  // 4. Construct FormData for Cloudinary Upload
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  if (folder) formData.append('folder', folder);
  if (publicId) formData.append('public_id', publicId);

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // 5. Upload via XMLHttpRequest to capture live progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadEndpoint);

    // Track upload progress
    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      let respData: any = {};
      try {
        respData = JSON.parse(xhr.responseText);
      } catch {
        respData = { error: { message: xhr.responseText } };
      }

      if (xhr.status >= 200 && xhr.status < 300 && respData.secure_url) {
        options?.onProgress?.(100);
        resolve({
          secureUrl: respData.secure_url,
          publicId: respData.public_id || '',
          format: respData.format || '',
          width: respData.width || 0,
          height: respData.height || 0,
          bytes: respData.bytes || 0,
        });
      } else {
        const rawErr = respData?.error?.message || respData?.message || xhr.statusText;
        let banglaErr = 'ছবি ক্লাউডে আপলোড করতে ব্যর্থ হয়েছে।';

        // Check if free plan limit / quota exceeded
        const lower = String(rawErr).toLowerCase();
        if (lower.includes('limit') || lower.includes('quota') || lower.includes('credit')) {
          banglaErr = 'Cloudinary ফ্রি-প্ল্যান স্টোরেজ বা আপলোড সীমা অতিক্রম করেছে। অনুগ্রহ করে এডমিন ড্যাশবোর্ড চেক করুন।';
        } else if (lower.includes('invalid signature') || lower.includes('signature')) {
          banglaErr = 'নিরাপত্তা সিগনেচার যাচাইকরণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।';
        } else if (rawErr) {
          banglaErr = `Cloudinary আপলোড ত্রুটি: ${rawErr}`;
        }

        reject(new Error(banglaErr));
      }
    };

    xhr.onerror = () => {
      reject(new Error('ইন্টারনেট সংযোগ বিচ্ছিন্ন অথবা নেটওয়ার্ক ত্রুটির কারণে আপলোড ব্যর্থ হয়েছে।'));
    };

    xhr.onabort = () => {
      reject(new Error('ছবি আপলোড বাতিল করা হয়েছে।'));
    };

    xhr.send(formData);
  });
}
