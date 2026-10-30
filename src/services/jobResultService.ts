/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { removeUndefinedFields } from './firestoreService';
import { JobExamResult, JobExamResultSummary, JobResultCheckResponse } from '../types';

export const JOB_RESULT_COLLECTION = 'jobresult';

const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Normalizes roll number string:
 * - Trims whitespace
 * - Converts Bengali digits to standard Arabic digits
 * - Strictly preserves leading zeros (e.g. '01234' remains '01234')
 */
export function normalizeRollNumber(raw: string | number): string {
  if (raw === undefined || raw === null) return '';
  let str = String(raw).trim();
  // Replace Bengali digits
  str = str.replace(/[০-৯]/g, (match) => BN_TO_EN_DIGITS[match] || match);
  // Remove any surrounding quotes
  str = str.replace(/^["']+|["']+$/g, '').trim();
  return str;
}

export interface CsvParseResult {
  rollNumbers: string[];
  totalParsed: number;
  duplicateCount: number;
  invalidCount: number;
  sampleRolls: string[];
  warnings: string[];
}

/**
 * Parses a CSV file string containing a list of qualified roll numbers:
 * - Ignores header rows like 'roll', 'roll_no', 'রোল', etc.
 * - Extracts each roll number per line or CSV field
 * - Discards empty lines
 * - Discards duplicates while preserving order
 * - Keeps roll numbers as strings with leading zeros intact
 * - Flags warnings for non-standard / invalid rolls
 */
export function parseJobResultCsv(csvText: string): CsvParseResult {
  if (!csvText || !csvText.trim()) {
    return {
      rollNumbers: [],
      totalParsed: 0,
      duplicateCount: 0,
      invalidCount: 0,
      sampleRolls: [],
      warnings: ['CSV ফাইলটি সম্পূর্ণ খালি।'],
    };
  }

  // Remove BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const lines = cleanText.split(/\r\n|\n|\r/);
  const seenRolls = new Set<string>();
  const validRolls: string[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;
  const warnings: string[] = [];

  const HEADER_KEYWORDS = [
    'roll',
    'roll_no',
    'rollno',
    'roll_number',
    'rollnumber',
    'রোল',
    'রোল নম্বর',
    'রোল নং',
    'serial',
    'sl',
    'candidate_roll',
  ];

  let isFirstNonEmpty = true;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Handle single line with commas or single column
    const cells = rawLine.split(',').map((c) => c.trim()).filter(Boolean);
    if (cells.length === 0) continue;

    // Check first non-empty cell if it's a known header
    const firstCellLower = cells[0].toLowerCase().replace(/[^a-z0-9\u0980-\u09FF_]/g, '');
    if (isFirstNonEmpty && HEADER_KEYWORDS.includes(firstCellLower)) {
      isFirstNonEmpty = false;
      continue;
    }
    isFirstNonEmpty = false;

    // Extract roll numbers from line
    for (const cell of cells) {
      const normalized = normalizeRollNumber(cell);
      if (!normalized) continue;

      // Skip header in subsequent columns if repeated
      if (HEADER_KEYWORDS.includes(normalized.toLowerCase())) {
        continue;
      }

      // Validate roll number: should contain digits, not contain spaces or emojis
      const isValidFormat = /^[0-9a-zA-Z\-_/]+$/.test(normalized);
      if (!isValidFormat) {
        invalidCount++;
        if (warnings.length < 5) {
          warnings.push(`লাইন ${i + 1}: অগ্রহণযোগ্য অক্ষরযুক্ত রোল বাদ দেওয়া হয়েছে (${normalized})`);
        }
        continue;
      }

      if (seenRolls.has(normalized)) {
        duplicateCount++;
      } else {
        seenRolls.add(normalized);
        validRolls.push(normalized);
      }
    }
  }

  if (duplicateCount > 0) {
    warnings.unshift(`মোট ${duplicateCount}টি ডুপ্লিকেট রোল স্বয়ংক্রিয়ভাবে বাদ দেওয়া হয়েছে।`);
  }

  return {
    rollNumbers: validRolls,
    totalParsed: validRolls.length,
    duplicateCount,
    invalidCount,
    sampleRolls: validRolls.slice(0, 15),
    warnings,
  };
}

/**
 * Real-time subscriber for Public Job Examination Results:
 * Fetches only published results and strips out full roll number arrays
 * to protect public privacy and reduce network bandwidth.
 */
export function subscribeToPublishedJobResults(
  onUpdate: (results: JobExamResultSummary[]) => void
): () => void {
  try {
    const colRef = collection(db, JOB_RESULT_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const summaries: JobExamResultSummary[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data && data.status === 'published') {
            summaries.push({
              id: docSnap.id,
              examTitle: data.examTitle || 'চাকরি পরীক্ষার ফলাফল',
              examDate: data.examDate || '',
              totalQualified:
                typeof data.totalQualified === 'number'
                  ? data.totalQualified
                  : Array.isArray(data.rollNumbers)
                  ? data.rollNumbers.length
                  : 0,
              status: 'published',
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              publishedAt: data.publishedAt || data.updatedAt || '',
            });
          }
        });

        // Sort descending by updatedAt or createdAt
        summaries.sort((a, b) => {
          const timeA = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        onUpdate(summaries);
      },
      (error) => {
        console.warn('subscribeToPublishedJobResults snapshot error:', error);
        onUpdate([]);
      }
    );
  } catch (error) {
    console.warn('subscribeToPublishedJobResults initialization error:', error);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Real-time subscriber for Admin Job Examination Results:
 * Admin receives complete documents including status and roll numbers for management.
 */
export function subscribeToAllJobResultsForAdmin(
  onUpdate: (results: JobExamResult[]) => void
): () => void {
  try {
    const colRef = collection(db, JOB_RESULT_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: JobExamResult[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data) {
            const rolls = Array.isArray(data.rollNumbers)
              ? data.rollNumbers.map((r: any) => normalizeRollNumber(r))
              : [];
            list.push({
              id: docSnap.id,
              examTitle: data.examTitle || '',
              examDate: data.examDate || '',
              rollNumbers: rolls,
              totalQualified:
                typeof data.totalQualified === 'number' ? data.totalQualified : rolls.length,
              status: data.status === 'unpublished' ? 'unpublished' : 'published',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              publishedAt: data.publishedAt || '',
              createdBy: data.createdBy || '',
              notes: data.notes || '',
            });
          }
        });

        // Sort descending by updatedAt or createdAt
        list.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        onUpdate(list);
      },
      (error) => {
        console.warn('subscribeToAllJobResultsForAdmin snapshot error:', error);
        onUpdate([]);
      }
    );
  } catch (error) {
    console.warn('subscribeToAllJobResultsForAdmin initialization error:', error);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Saves or updates a Job Examination Result in Firestore collection `jobresult`.
 */
export async function saveJobResultToFirestore(
  resultData: Partial<JobExamResult> & {
    examTitle: string;
    examDate: string;
    rollNumbers: string[];
    status: 'published' | 'unpublished';
  },
  currentUserEmail?: string
): Promise<string> {
  const resultId = resultData.id || `job-result-${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Deduplicate and normalize roll numbers
  const normalizedRolls = Array.from(
    new Set(resultData.rollNumbers.map((r) => normalizeRollNumber(r)).filter(Boolean))
  );

  const payload: JobExamResult = {
    id: resultId,
    examTitle: resultData.examTitle.trim(),
    examDate: resultData.examDate.trim(),
    rollNumbers: normalizedRolls,
    totalQualified: normalizedRolls.length,
    status: resultData.status,
    createdAt: resultData.createdAt || nowIso,
    updatedAt: nowIso,
    publishedAt:
      resultData.status === 'published'
        ? resultData.publishedAt || nowIso
        : resultData.publishedAt || '',
    createdBy: resultData.createdBy || currentUserEmail || 'admin@medha.com',
    notes: resultData.notes?.trim() || '',
  };

  try {
    const docRef = doc(db, JOB_RESULT_COLLECTION, resultId);
    const sanitizedPayload = removeUndefinedFields(payload);
    await setDoc(docRef, sanitizedPayload, { merge: true });
    return resultId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${JOB_RESULT_COLLECTION}/${resultId}`);
    throw error;
  }
}

/**
 * Toggles status between 'published' and 'unpublished'.
 */
export async function toggleJobResultPublishStatus(
  resultId: string,
  newStatus: 'published' | 'unpublished'
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const docRef = doc(db, JOB_RESULT_COLLECTION, resultId);
    const updates: any = {
      status: newStatus,
      updatedAt: nowIso,
    };
    if (newStatus === 'published') {
      updates.publishedAt = nowIso;
    }
    await setDoc(docRef, removeUndefinedFields(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${JOB_RESULT_COLLECTION}/${resultId}`);
    throw error;
  }
}

/**
 * Deletes a Job Examination Result permanently from Firestore `jobresult`.
 */
export async function deleteJobResultFromFirestore(resultId: string): Promise<void> {
  try {
    const docRef = doc(db, JOB_RESULT_COLLECTION, resultId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${JOB_RESULT_COLLECTION}/${resultId}`);
    throw error;
  }
}

/**
 * Verifies if a user's roll number is qualified in the specified exam result.
 * Primary: Uses secure backend API endpoint `/api/check-job-result`.
 * Fallback: Reads single document from Firestore directly if backend API is not available.
 */
export async function checkJobResultRoll(
  resultId: string,
  rollNumber: string
): Promise<JobResultCheckResponse> {
  const cleanRoll = normalizeRollNumber(rollNumber);
  if (!cleanRoll) {
    return {
      success: false,
      qualified: false,
      examTitle: '',
      examDate: '',
      searchedRoll: '',
      message: 'অনুগ্রহ করে একটি সঠিক রোল নম্বর প্রদান করুন।',
    };
  }

  // 1. Try secure backend API endpoint first (Privacy preserving: does not send full roll list to browser)
  try {
    const response = await fetch('/api/check-job-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resultId,
        rollNumber: cleanRoll,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.qualified === 'boolean') {
        return {
          success: true,
          qualified: data.qualified,
          examTitle: data.examTitle || '',
          examDate: data.examDate || '',
          searchedRoll: cleanRoll,
          message: data.message,
        };
      }
    }
  } catch (apiErr) {
    console.warn('Backend /api/check-job-result verification offline, falling back to Firestore:', apiErr);
  }

  // 2. Direct Firestore fallback (e.g. static preview or offline)
  try {
    const docRef = doc(db, JOB_RESULT_COLLECTION, resultId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return {
        success: false,
        qualified: false,
        examTitle: '',
        examDate: '',
        searchedRoll: cleanRoll,
        message: 'নির্বাচিত পরীক্ষার ফলাফল খুঁজে পাওয়া যায়নি।',
      };
    }

    const data = snap.data() as JobExamResult;
    if (data.status !== 'published') {
      return {
        success: false,
        qualified: false,
        examTitle: data.examTitle || '',
        examDate: data.examDate || '',
        searchedRoll: cleanRoll,
        message: 'এই পরীক্ষার ফলাফল এখনও প্রকাশিত হয়নি।',
      };
    }

    const rolls = Array.isArray(data.rollNumbers)
      ? data.rollNumbers.map((r) => normalizeRollNumber(r))
      : [];

    const isQualified = rolls.includes(cleanRoll);

    return {
      success: true,
      qualified: isQualified,
      examTitle: data.examTitle || 'চাকরি পরীক্ষা',
      examDate: data.examDate || '',
      searchedRoll: cleanRoll,
    };
  } catch (dbErr: any) {
    console.error('Firestore checkJobResultRoll error:', dbErr);
    return {
      success: false,
      qualified: false,
      examTitle: '',
      examDate: '',
      searchedRoll: cleanRoll,
      message: 'ফলাফল যাচাই করতে প্রযুক্তিগত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    };
  }
}
