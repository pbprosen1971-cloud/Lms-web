/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Safely converts any Firestore Timestamp, Date, string, number, or object to an ISO/string representation.
 * Guarantees that an Object with { seconds, nanoseconds } is NEVER returned as a raw object.
 */
export function safeTimestampToString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') {
    if (val > 100000000000) {
      return new Date(val).toISOString();
    }
    return String(val);
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch {
        return fallback;
      }
    }
    if ('seconds' in val && typeof val.seconds === 'number') {
      try {
        const ms = val.seconds * 1000 + (typeof val.nanoseconds === 'number' ? Math.floor(val.nanoseconds / 1000000) : 0);
        return new Date(ms).toISOString();
      } catch {
        return fallback;
      }
    }
    if (val instanceof Date) {
      try {
        return val.toISOString();
      } catch {
        return fallback;
      }
    }
  }
  return fallback;
}

/**
 * Safely converts a date input to a YYYY-MM-DD or simple date string.
 */
export function safeDateOnlyString(val: any, fallback: string = new Date().toISOString().split('T')[0]): string {
  const str = safeTimestampToString(val, '');
  if (!str) return fallback;
  if (str.includes('T')) return str.split('T')[0];
  return str;
}

/**
 * Formats a value for display in JSX. Guarantees a string output (never crashes React).
 */
export function formatSafeDisplay(val: any, fallback: string = '—'): string {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  
  const parsed = safeTimestampToString(val, '');
  if (parsed) {
    if (parsed.includes('T')) return parsed.split('T')[0];
    return parsed;
  }
  return fallback;
}

export const toBengaliDigits = (num: number | string): string => {
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(num).replace(/[0-9]/g, (d) => digits[d] || d);
};

export const formatBengaliDateTimeSafe = (dateVal?: any): string => {
  if (!dateVal) return 'নির্ধারিত নেই';
  const isoOrStr = safeTimestampToString(dateVal, typeof dateVal === 'string' ? dateVal : '');
  if (!isoOrStr) return 'নির্ধারিত নেই';

  try {
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return isoOrStr;
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const day = toBengaliDigits(d.getDate());
    const month = months[d.getMonth()];
    const year = toBengaliDigits(d.getFullYear());
    
    let hours = d.getHours();
    const minutes = toBengaliDigits(String(d.getMinutes()).padStart(2, '0'));
    const ampm = hours >= 12 ? 'রাত/দুপুর' : 'সকাল';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const bengaliHours = toBengaliDigits(hours);

    return `${day} ${month} ${year}, ${ampm} ${bengaliHours}:${minutes}`;
  } catch {
    return isoOrStr;
  }
};
