/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { MinistryQuestionBank, MinistryBankQuestion } from '../types';
import { recordDeletedMinistryBankInRegistry } from './firestoreService';

export interface QuestionBankItem {
  id: string;
  ministry: string; // Ministry / Department (e.g. জনপ্রশাসন মন্ত্রণালয়)
  subject: string;  // Subject / Topic (e.g. সাধারণ জ্ঞান, বাংলা, ইংরেজি)
  question: string; // Question statement
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  options: string[]; // [optionA, optionB, optionC, optionD]
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D' | 'ক' | 'খ' | 'গ' | 'ঘ'
  correctAnswerLetter: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  source?: string; // Source / Exam Name (optional)
  year?: string;   // Year (optional)
  examHeldDate?: string; // পরীক্ষা অনুষ্ঠিত তারিখ
  questionType?: string; // e.g. "MCQ"
  status: 'active' | 'draft';
  createdAt: string; // ISO string
  updatedAt: string;
  createdBy?: string;
}

export type NewQuestionBankItem = Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt'>;

export interface QuestionBankImportDefaults {
  ministry?: string;
  subject?: string;
  sourceExam?: string;
  examHeldDate?: string;
  year?: string;
}

export interface QuestionBankCsvRow {
  id: string;
  serial: number;
  ministry: string;
  subject: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswerRaw: string;
  correctAnswerLetter: 'A' | 'B' | 'C' | 'D';
  correctAnswerBengali: 'ক' | 'খ' | 'গ' | 'ঘ';
  explanation: string;
  source: string;
  year: string;
  examHeldDate?: string;
  isValid: boolean;
  errors: string[];
  isDuplicateInCsv: boolean;
  isDuplicateInDb: boolean;
}

export interface QuestionBankCsvParseResult {
  rows: QuestionBankCsvRow[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
  headers: string[];
  fileErrors: string[];
}

export const COMMON_MINISTRIES = [
  'ভূমি রেকর্ড ও জরিপ অদিদপ্তর',
  'জনপ্রশাসন মন্ত্রণালয়',
  'শিক্ষা মন্ত্রণালয়',
  'অর্থ মন্ত্রণালয়',
  'স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়',
  'গৃহায়ন ও গণপূর্ত মন্ত্রণালয়',
  'স্বরাষ্ট্র মন্ত্রণালয়',
  'তথ্য ও সম্প্রচার মন্ত্রণালয়',
  'সমাজকল্যাণ মন্ত্রণালয়',
  'আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়',
  'পররাষ্ট্র মন্ত্রণালয়',
  'কৃষি মন্ত্রণালয়',
  'ডাক, টেলিযোগাযোগ ও তথ্যপ্রযুক্তি মন্ত্রণালয়',
  'বানিজ্য মন্ত্রণালয়',
  'স্থানীয় সরকার, পল্লী উন্নয়ন ও সমবায় মন্ত্রণালয়',
  'রেলপথ মন্ত্রণালয়',
  'সড়ক পরিবহন ও সেতু মন্ত্রণালয়',
  'বিদ্যুৎ, জ্বালানি ও খনিজ সম্পদ মন্ত্রণালয়',
  'মুক্তিযুদ্ধ বিষয়ক মন্ত্রণালয়',
  'শ্রম ও কর্মসংস্থান মন্ত্রণালয়',
  'মহিলা ও শিশু বিষয়ক মন্ত্রণালয়',
  'পরিবেশ, বন ও জলবায়ু পরিবর্তন মন্ত্রণালয়',
  'স্বাস্থ্য অধিদপ্তর',
  'কৃষি সম্প্রসারণ অধিদপ্তর',
  'সমাজসেবা অধিদপ্তর',
  'প্রাথমিক শিক্ষা অধিদপ্তর',
  'মাধ্যমিক ও উচ্চশিক্ষা অধিদপ্তর (মাউশি)',
  'মাদকদ্রব্য নিয়ন্ত্রণ অধিদপ্তর',
  'দুর্যোগ ব্যবস্থাপনা অধিদপ্তর',
  'পরিবার পরিকল্পনা অধিদপ্তর',
  'বাংলাদেশ রেলওয়ে',
  'বাংলাদেশ ব্যাংক ও সরকারি ব্যাংক',
  'বাংলাদেশ সিভিল সার্ভিস (বিসিএস)',
];

export const COMMON_SUBJECTS = [
  'বাংলা',
  'বাংলা ব্যাকরণ ও সাহিত্য',
  'ইংরেজি (English)',
  'গণিত (Mathematics)',
  'বাংলাদেশ বিষয়াবলি',
  'আন্তর্জাতিক বিষয়াবলি',
  'বিজ্ঞান',
  'সাধারণ বিজ্ঞান',
  'কম্পিউটার ও তথ্যপ্রযুক্তি (ICT)',
  'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা',
  'মানসিক দক্ষতা',
  'নৈতিকতা, মূল্যবোধ ও সুশাসন',
  'সাধারণ জ্ঞান (GK)',
];

/**
 * Normalizes user answer input into canonical A/B/C/D letter and Bengali label.
 * Supports:
 * - Direct letters: 'A', 'B', 'C', 'D' (case-insensitive)
 * - Bengali letters: 'ক', 'খ', 'গ', 'ঘ'
 * - Digits / Bengali numbers: '1', '2', '3', '4' / '১', '২', '৩', '৪'
 * - Formatted strings: 'A.', '(A)', 'A)', 'Option A', 'Option 1', 'OptionA', 'Ans: A', 'ক.', '(ক)', 'ক)'
 * - Option Text Matching: If user writes the actual option text in the answer column (e.g. "বাঘ")
 */
export function normalizeCorrectAnswer(
  val: any,
  optionsContext?: { optionA?: string; optionB?: string; optionC?: string; optionD?: string }
): {
  valid: boolean;
  letter: 'A' | 'B' | 'C' | 'D';
  bengaliLetter: 'ক' | 'খ' | 'গ' | 'ঘ';
  index: number;
} {
  if (val === undefined || val === null) {
    return { valid: false, letter: 'A', bengaliLetter: 'ক', index: 0 };
  }

  // Clean string: remove BOM, zero-width chars, spaces
  let str = String(val)
    .replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .trim();

  if (!str) {
    return { valid: false, letter: 'A', bengaliLetter: 'ক', index: 0 };
  }

  // Strip prefix words like "Ans:", "Answer:", "সঠিক উত্তর:", "উত্তর:"
  let cleaned = str
    .replace(/^(ans|answer|সঠিক উত্তর|উত্তর)\s*[:：\-\.]*\s*/i, '')
    .replace(/^[\(\[\{\<"']+|[\)\]\}\>"'\.\,\:\-]+$/g, '')
    .trim();

  const lower = cleaned.toLowerCase();

  // Check Option A / ক / 1 / ১
  if (
    lower === 'a' ||
    lower === 'option a' ||
    lower === 'optiona' ||
    lower === 'option_a' ||
    lower === 'option-a' ||
    lower === 'opt a' ||
    lower === 'opt-a' ||
    lower === 'opta' ||
    lower === 'optione_a' ||
    lower === '1' ||
    lower === 'option 1' ||
    lower === 'option1' ||
    cleaned === 'ক' ||
    cleaned === 'অপশন ক' ||
    cleaned === 'অপশনক' ||
    cleaned === 'অপশন ১' ||
    cleaned === 'অপশন১' ||
    cleaned === '১'
  ) {
    return { valid: true, letter: 'A', bengaliLetter: 'ক', index: 0 };
  }

  // Check Option B / খ / 2 / ২
  if (
    lower === 'b' ||
    lower === 'option b' ||
    lower === 'optionb' ||
    lower === 'option_b' ||
    lower === 'option-b' ||
    lower === 'opt b' ||
    lower === 'opt-b' ||
    lower === 'optb' ||
    lower === 'optione_b' ||
    lower === '2' ||
    lower === 'option 2' ||
    lower === 'option2' ||
    cleaned === 'খ' ||
    cleaned === 'অপশন খ' ||
    cleaned === 'অপশনখ' ||
    cleaned === 'অপশন ২' ||
    cleaned === 'অপশন২' ||
    cleaned === '২'
  ) {
    return { valid: true, letter: 'B', bengaliLetter: 'খ', index: 1 };
  }

  // Check Option C / গ / 3 / ৩
  if (
    lower === 'c' ||
    lower === 'option c' ||
    lower === 'optionc' ||
    lower === 'option_c' ||
    lower === 'option-c' ||
    lower === 'opt c' ||
    lower === 'opt-c' ||
    lower === 'optc' ||
    lower === 'optione_c' ||
    lower === '3' ||
    lower === 'option 3' ||
    lower === 'option3' ||
    cleaned === 'গ' ||
    cleaned === 'অপশন গ' ||
    cleaned === 'অপশনগ' ||
    cleaned === 'অপশন ৩' ||
    cleaned === 'অপশন৩' ||
    cleaned === '৩'
  ) {
    return { valid: true, letter: 'C', bengaliLetter: 'গ', index: 2 };
  }

  // Check Option D / ঘ / 4 / ৪
  if (
    lower === 'd' ||
    lower === 'option d' ||
    lower === 'optiond' ||
    lower === 'option_d' ||
    lower === 'option-d' ||
    lower === 'opt d' ||
    lower === 'opt-d' ||
    lower === 'optd' ||
    lower === 'optione_d' ||
    lower === '4' ||
    lower === 'option 4' ||
    lower === 'option4' ||
    cleaned === 'ঘ' ||
    cleaned === 'অপশন ঘ' ||
    cleaned === 'অপশনঘ' ||
    cleaned === 'অপশন ৪' ||
    cleaned === 'অপশন৪' ||
    cleaned === '৪'
  ) {
    return { valid: true, letter: 'D', bengaliLetter: 'ঘ', index: 3 };
  }

  // Check against Option Texts if supplied
  if (optionsContext) {
    const normClean = cleaned.toLowerCase().replace(/[\s\.\,\-_]/g, '');
    const cleanA = (optionsContext.optionA || '').trim().toLowerCase().replace(/[\s\.\,\-_]/g, '');
    const cleanB = (optionsContext.optionB || '').trim().toLowerCase().replace(/[\s\.\,\-_]/g, '');
    const cleanC = (optionsContext.optionC || '').trim().toLowerCase().replace(/[\s\.\,\-_]/g, '');
    const cleanD = (optionsContext.optionD || '').trim().toLowerCase().replace(/[\s\.\,\-_]/g, '');

    if (normClean && cleanA && normClean === cleanA) {
      return { valid: true, letter: 'A', bengaliLetter: 'ক', index: 0 };
    }
    if (normClean && cleanB && normClean === cleanB) {
      return { valid: true, letter: 'B', bengaliLetter: 'খ', index: 1 };
    }
    if (normClean && cleanC && normClean === cleanC) {
      return { valid: true, letter: 'C', bengaliLetter: 'গ', index: 2 };
    }
    if (normClean && cleanD && normClean === cleanD) {
      return { valid: true, letter: 'D', bengaliLetter: 'ঘ', index: 3 };
    }
  }

  // Try extracting standalone letter from string (e.g. "উত্তর (ক)")
  const letterMatch = cleaned.match(/(?:^|\b|\s|\()([A-Da-dক-ঘ1-4১-৪])(?:\)|\.|\b|\s|$)/);
  if (letterMatch) {
    const l = letterMatch[1].toLowerCase();
    if (l === 'a' || l === 'ক' || l === '1' || l === '১') return { valid: true, letter: 'A', bengaliLetter: 'ক', index: 0 };
    if (l === 'b' || l === 'খ' || l === '2' || l === '২') return { valid: true, letter: 'B', bengaliLetter: 'খ', index: 1 };
    if (l === 'c' || l === 'গ' || l === '3' || l === '৩') return { valid: true, letter: 'C', bengaliLetter: 'গ', index: 2 };
    if (l === 'd' || l === 'ঘ' || l === '4' || l === '৪') return { valid: true, letter: 'D', bengaliLetter: 'ঘ', index: 3 };
  }

  return { valid: false, letter: 'A', bengaliLetter: 'ক', index: 0 };
}

const COLLECTION_NAME = 'QuestionBank';

/**
 * Subscribes in real-time to the dedicated /QuestionBank collection
 * Standalone: Does NOT sync with any exam or question collections
 */
export function subscribeToQuestionBank(
  callback: (items: QuestionBankItem[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const qbCol = collection(db, COLLECTION_NAME);
    const qbQuery = query(qbCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      qbQuery,
      (snapshot) => {
        const items: QuestionBankItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const norm = normalizeCorrectAnswer(data.correctAnswer || data.correctAnswerLetter || 'A');

          const optA = data.optionA || data.options?.[0] || '';
          const optB = data.optionB || data.options?.[1] || '';
          const optC = data.optionC || data.options?.[2] || '';
          const optD = data.optionD || data.options?.[3] || '';

          items.push({
            id: docSnap.id,
            ministry: data.ministry || data.ministryName || 'সাধারণ',
            subject: data.subject || data.topic || 'সাধারণ জ্ঞান',
            question: data.question || data.questionText || data.text || '',
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            options: Array.isArray(data.options) && data.options.length === 4 ? data.options : [optA, optB, optC, optD],
            correctAnswer: data.correctAnswer || norm.letter,
            correctAnswerLetter: norm.letter,
            explanation: data.explanation || '',
            source: data.source || data.examName || '',
            year: data.year || '',
            questionType: data.questionType || 'MCQ',
            status: data.status === 'draft' ? 'draft' : 'active',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || '',
          });
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error setting up QuestionBank subscription:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Adds a single Question directly to /QuestionBank/{questionId}
 */
export async function addQuestionBankItem(item: NewQuestionBankItem): Promise<string> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const norm = normalizeCorrectAnswer(item.correctAnswer);

    const docData = {
      ...item,
      id: newDocRef.id,
      correctAnswer: item.correctAnswer || norm.letter,
      correctAnswerLetter: norm.letter,
      options: [item.optionA, item.optionB, item.optionC, item.optionD],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDocRef, docData);
    if (item.ministry) {
      saveCustomMinistryToRegistry(item.ministry).catch(() => {});
    }
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    throw error;
  }
}

/**
 * Batch adds multiple questions to /QuestionBank/{questionId}
 */
export async function batchAddQuestionBankItems(
  items: NewQuestionBankItem[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;
  const now = new Date().toISOString();

  // Process in chunks of 400 to respect Firestore batch limit of 500
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      const colRef = collection(db, COLLECTION_NAME);
      const newDocRef = doc(colRef);
      const norm = normalizeCorrectAnswer(item.correctAnswer);

      const optA = (item.optionA || '').trim();
      const optB = (item.optionB || '').trim();
      const optC = (item.optionC || '').trim();
      const optD = (item.optionD || '').trim();

      const docPayload: Record<string, any> = {
        ministry: (item.ministry || '').trim(),
        subject: (item.subject || '').trim(),
        question: (item.question || '').trim(),
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        options: Array.isArray(item.options) && item.options.length === 4 ? item.options : [optA, optB, optC, optD],
        correctAnswer: item.correctAnswer || norm.letter,
        correctAnswerLetter: norm.letter,
        explanation: (item.explanation || '').trim(),
        source: (item.source || '').trim(),
        year: (item.year || '').trim(),
        examHeldDate: (item.examHeldDate || '').trim(),
        questionType: item.questionType || 'MCQ',
        status: item.status || 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: item.createdBy || auth.currentUser?.email || 'admin',
        id: newDocRef.id,
      };

      batch.set(newDocRef, docPayload);
    });

    try {
      await batch.commit();
      successCount += chunk.length;
    } catch (err: any) {
      console.error('Batch commit failed for chunk:', err, {
        authUid: auth.currentUser?.uid,
        authEmail: auth.currentUser?.email,
        chunkSize: chunk.length,
      });
      failedCount += chunk.length;
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
    }

    if (onProgress) {
      onProgress(Math.min(i + chunk.length, items.length), items.length);
    }
  }

  if (items.length > 0) {
    const uniqueMins = Array.from(new Set(items.map((it) => it.ministry).filter(Boolean)));
    uniqueMins.forEach((m) => {
      saveCustomMinistryToRegistry(m).catch(() => {});
    });
  }

  return { success: successCount, failed: failedCount };
}

/**
 * Updates an existing Question in /QuestionBank/{questionId} ONLY
 */
export async function updateQuestionBankItem(
  id: string,
  updates: Partial<QuestionBankItem>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const now = new Date().toISOString();

    const cleanUpdates: any = {
      ...updates,
      updatedAt: now,
    };

    if (updates.correctAnswer) {
      const norm = normalizeCorrectAnswer(updates.correctAnswer);
      cleanUpdates.correctAnswerLetter = norm.letter;
    }

    if (
      updates.optionA !== undefined ||
      updates.optionB !== undefined ||
      updates.optionC !== undefined ||
      updates.optionD !== undefined
    ) {
      cleanUpdates.options = [
        updates.optionA ?? '',
        updates.optionB ?? '',
        updates.optionC ?? '',
        updates.optionD ?? '',
      ];
    }

    delete cleanUpdates.id; // Do not overwrite doc id field

    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

/**
 * Deletes a single Question from /QuestionBank/{questionId} ONLY
 */
export async function deleteQuestionBankItem(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

/**
 * /**
 * Detect delimiter by analyzing the first line (comma, semicolon, tab).
 */
export function detectCsvDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
}

/**
 * Standard RFC 4180 CSV parser supporting multiline cells, escaped quotes,
 * auto-detected delimiter (comma, semicolon, tab), and Bengali UTF-8
 */
export function parseRawCsvText(csvText: string): string[][] {
  let cleanText = csvText
    .replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const delimiter = detectCsvDelimiter(cleanText);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Validates a single QuestionBank CSV row:
 * - Ministry/Department empty check (with form fallback)
 * - Subject empty check (with form fallback)
 * - Question empty check
 * - Option A, B, C, D empty check
 * - Correct Answer valid check (A/B/C/D, ক/খ/গ/ঘ, 1/2/3/4, or matching option text)
 * - Duplicate in CSV check
 * - Duplicate in DB check (informational warning flag, does NOT block validity)
 */
export function validateQuestionBankRow(
  row: Omit<QuestionBankCsvRow, 'isValid' | 'errors' | 'isDuplicateInCsv' | 'isDuplicateInDb'>,
  allRowsQuestionTexts: string[],
  existingQuestions: QuestionBankItem[] = []
): { isValid: boolean; errors: string[]; isDuplicateInCsv: boolean; isDuplicateInDb: boolean } {
  const errors: string[] = [];
  const qClean = (row.question || '').trim().toLowerCase();

  // 1. Ministry check
  if (!row.ministry || row.ministry.trim() === '') {
    errors.push('মন্ত্রণালয় / অধিদপ্তরের নাম ফাঁকা রাখা যাবে না');
  }

  // 2. Subject check
  if (!row.subject || row.subject.trim() === '') {
    errors.push('বিষয় / টপিক ফাঁকা রাখা যাবে না');
  }

  // 3. Question check
  if (!row.question || row.question.trim() === '') {
    errors.push('প্রশ্নের বিবরণ ফাঁকা রাখা যাবে না');
  }

  // 4. Options check
  if (!row.optionA || row.optionA.trim() === '') {
    errors.push('Option A ফাঁকা রাখা যাবে না');
  }
  if (!row.optionB || row.optionB.trim() === '') {
    errors.push('Option B ফাঁকা রাখা যাবে না');
  }
  if (!row.optionC || row.optionC.trim() === '') {
    errors.push('Option C ফাঁকা রাখা যাবে না');
  }
  if (!row.optionD || row.optionD.trim() === '') {
    errors.push('Option D ফাঁকা রাখা যাবে না');
  }

  // 5. Correct Answer check (with option text matching context)
  const norm = normalizeCorrectAnswer(row.correctAnswerRaw, {
    optionA: row.optionA,
    optionB: row.optionB,
    optionC: row.optionC,
    optionD: row.optionD,
  });
  if (!row.correctAnswerRaw || !norm.valid) {
    errors.push('সঠিক উত্তর অবশ্যই A, B, C, D অথবা ক, খ, গ, ঘ হতে হবে');
  }

  // 6. Duplicate check in CSV
  let isDuplicateInCsv = false;
  if (qClean) {
    const csvMatches = allRowsQuestionTexts.filter((t) => t.trim().toLowerCase() === qClean);
    if (csvMatches.length > 1) {
      isDuplicateInCsv = true;
      errors.push('CSV ফাইলের মধ্যে প্রশ্নটি একাধিকবার বিদ্যমান (Duplicate)');
    }
  }

  // 7. Duplicate check in existing QuestionBank
  // Note: Existing in DB is tracked as an informational flag (isDuplicateInDb),
  // but does NOT invalidate the row from being imported or updated.
  let isDuplicateInDb = false;
  if (qClean && existingQuestions.length > 0) {
    const dbMatch = existingQuestions.some((eq) => (eq.question || '').trim().toLowerCase() === qClean);
    if (dbMatch) {
      isDuplicateInDb = true;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    isDuplicateInCsv,
    isDuplicateInDb,
  };
}

/**
 * Revalidates all QuestionBank CSV rows after edit or deletion
 */
export function revalidateQuestionBankRows(
  rows: QuestionBankCsvRow[],
  existingQuestions: QuestionBankItem[] = []
): { rows: QuestionBankCsvRow[]; validCount: number; invalidCount: number } {
  const allQuestionTexts = rows.map((r) => (r.question || '').trim());

  let validCount = 0;
  let invalidCount = 0;

  const revalidated = rows.map((row, idx) => {
    const valResult = validateQuestionBankRow(
      {
        ...row,
        serial: idx + 1,
      },
      allQuestionTexts,
      existingQuestions
    );

    if (valResult.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    const norm = normalizeCorrectAnswer(row.correctAnswerRaw, {
      optionA: row.optionA,
      optionB: row.optionB,
      optionC: row.optionC,
      optionD: row.optionD,
    });

    return {
      ...row,
      serial: idx + 1,
      correctAnswerLetter: norm.letter,
      correctAnswerBengali: norm.bengaliLetter,
      isValid: valResult.isValid,
      errors: valResult.errors,
      isDuplicateInCsv: valResult.isDuplicateInCsv,
      isDuplicateInDb: valResult.isDuplicateInDb,
    };
  });

  return { rows: revalidated, validCount, invalidCount };
}

/**
 * Cleans a header name by removing whitespace, quotes, dashes, and underscores
 */
function cleanHeaderName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/["'’]/g, '')
    .replace(/[\s\-_/\\.:,]+/g, '');
}

/**
 * Header index finder supporting flexible Bengali and English names,
 * tolerant to spaces, punctuation, underscores, and BOM.
 */
function findColumnIndex(headers: string[], names: string[]): number {
  const cleanTargetNames = names.map(cleanHeaderName);
  for (let i = 0; i < headers.length; i++) {
    const cleanH = cleanHeaderName(headers[i]);
    if (cleanTargetNames.includes(cleanH)) return i;
  }
  return -1;
}

/**
 * Parses and validates CSV text into structured QuestionBank rows.
 * Supports both:
 * 1. 7-column format (Question, Option A-D, Correct Answer, Explanation) where Ministry,
 *    Exam Title, Exam Held Date, and Subject are supplied via `defaults` from the manual form.
 * 2. 11-column format where Ministry/Department and Subject/Topic are in the CSV itself.
 */
export function parseQuestionBankCsvText(
  csvText: string,
  existingQuestions: QuestionBankItem[] = [],
  defaults?: QuestionBankImportDefaults
): QuestionBankCsvParseResult {
  const parsed = parseRawCsvText(csvText);
  const fileErrors: string[] = [];

  // Filter out empty rows
  const nonEmptyRows = parsed.filter((r) => r.some((c) => c.trim().length > 0));

  if (nonEmptyRows.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      fileErrors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি বা ফাইলটি সম্পূর্ণ ফাঁকা।'],
    };
  }

  const headerRow = nonEmptyRows[0];
  const dataRows = nonEmptyRows.slice(1);

  if (dataRows.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: headerRow,
      fileErrors: ['হেডার রো ব্যতিত ফাইলে কোনো প্রশ্নের রো পাওয়া যায়নি।'],
    };
  }

  // Find column indexes supporting flexible Bengali and English names
  const colMinistry = findColumnIndex(headerRow, [
    'ministry/department',
    'ministry',
    'department',
    'মন্ত্রণালয়/অধিদপ্তর',
    'মন্ত্রণালয়/দপ্তর',
    'মন্ত্রণালয়',
    'মন্ত্রণালয়',
    'দপ্তর',
    'অধিদপ্তর',
    'প্রতিষ্ঠান',
  ]);
  const colSubject = findColumnIndex(headerRow, [
    'subject/topic',
    'subject',
    'topic',
    'বিষয়/টপিক',
    'বিষয়',
    'বিষয়াবলী',
    'টপিক',
  ]);
  const colQuestion = findColumnIndex(headerRow, [
    'question',
    'question text',
    'questiontext',
    'questions',
    'question name',
    'প্রশ্ন',
    'প্রশ্ন বিবরণ',
    'প্রশ্নসমূহ',
    'প্রশ্ন নং',
  ]);
  const colOptA = findColumnIndex(headerRow, [
    'option a',
    'optiona',
    'option_a',
    'opt a',
    'opta',
    'a',
    'option 1',
    'option1',
    'opt 1',
    'opt1',
    'অপশন এ',
    'অপশন ক',
    'অপশনক',
    'অপশন ১',
    'ক',
  ]);
  const colOptB = findColumnIndex(headerRow, [
    'option b',
    'optionb',
    'option_b',
    'opt b',
    'optb',
    'b',
    'option 2',
    'option2',
    'opt 2',
    'opt2',
    'অপশন বি',
    'অপশন খ',
    'অপশনখ',
    'অপশন ২',
    'খ',
  ]);
  const colOptC = findColumnIndex(headerRow, [
    'option c',
    'optionc',
    'option_c',
    'opt c',
    'optc',
    'c',
    'option 3',
    'option3',
    'opt 3',
    'opt3',
    'অপশন সি',
    'অপশন গ',
    'অপশনগ',
    'অপশন ৩',
    'গ',
  ]);
  const colOptD = findColumnIndex(headerRow, [
    'option d',
    'optiond',
    'option_d',
    'opt d',
    'optd',
    'd',
    'option 4',
    'option4',
    'opt 4',
    'opt4',
    'অপশন ডি',
    'অপশন ঘ',
    'অপশনঘ',
    'অপশন ৪',
    'ঘ',
  ]);
  const colCorrect = findColumnIndex(headerRow, [
    'correct answer',
    'correctanswer',
    'correct_answer',
    'correct',
    'answer',
    'ans',
    'right answer',
    'rightanswer',
    'correct option',
    'correctoption',
    'সঠিক উত্তর',
    'সঠিকউত্তর',
    'উত্তর',
  ]);
  const colExpl = findColumnIndex(headerRow, [
    'explanation',
    'explanations',
    'expl',
    'note',
    'ব্যাখ্যা',
    'সমাধান',
    'উত্তর ব্যাখ্যা',
  ]);
  const colSource = findColumnIndex(headerRow, [
    'source/exam',
    'source',
    'exam',
    'উৎস/পরীক্ষা',
    'উৎস',
    'পরীক্ষার নাম',
    'শিরোনাম',
  ]);
  const colYear = findColumnIndex(headerRow, ['year', 'সাল', 'বছর']);

  // Required columns presence verification
  if (colQuestion === -1) fileErrors.push('Missing column: "Question" (প্রশ্ন)');
  if (colOptA === -1) fileErrors.push('Missing column: "Option A" (অপশন ক)');
  if (colOptB === -1) fileErrors.push('Missing column: "Option B" (অপশন খ)');
  if (colOptC === -1) fileErrors.push('Missing column: "Option C" (অপশন গ)');
  if (colOptD === -1) fileErrors.push('Missing column: "Option D" (অপশন ঘ)');
  if (colCorrect === -1) fileErrors.push('Missing column: "Correct Answer" (সঠিক উত্তর)');

  const defaultMin = (defaults?.ministry || '').trim();
  if (colMinistry === -1 && !defaultMin) {
    fileErrors.push(
      'মন্ত্রণালয় / অধিদপ্তর নির্ধারিত নেই: ফর্মে মন্ত্রণালয় সিলেক্ট করুন অথবা CSV-তে "Ministry/Department" কলাম রাখুন।'
    );
  }

  if (fileErrors.length > 0) {
    return {
      rows: [],
      totalCount: dataRows.length,
      validCount: 0,
      invalidCount: dataRows.length,
      headers: headerRow,
      fileErrors,
    };
  }

  // Pre-collect question texts for duplicate detection
  const allQuestionTexts = dataRows.map((row) => (row[colQuestion] || '').trim());

  let validCount = 0;
  let invalidCount = 0;

  const rows: QuestionBankCsvRow[] = dataRows.map((row, idx) => {
    // If ministry column exists but cell is empty, fallback to defaultMin
    const rawMin = colMinistry !== -1 ? (row[colMinistry] || '').trim() : '';
    const ministry = (rawMin || defaultMin).trim();

    // If subject column exists but cell is empty, fallback to defaults
    const rawSub = colSubject !== -1 ? (row[colSubject] || '').trim() : '';
    const subject = (rawSub || defaults?.subject || defaultMin || 'সাধারণ প্রস্তুতি').trim();

    const question = (row[colQuestion] || '').trim();
    const optionA = (row[colOptA] || '').trim();
    const optionB = (row[colOptB] || '').trim();
    const optionC = (row[colOptC] || '').trim();
    const optionD = (row[colOptD] || '').trim();
    const correctAnswerRaw = (row[colCorrect] || '').trim();
    const explanation = colExpl !== -1 ? (row[colExpl] || '').trim() : '';
    const source = (
      colSource !== -1 && row[colSource]?.trim() ? row[colSource].trim() : defaults?.sourceExam || ''
    ).trim();
    const year = (
      colYear !== -1 && row[colYear]?.trim() ? row[colYear].trim() : defaults?.year || ''
    ).trim();
    const examHeldDate = (defaults?.examHeldDate || '').trim();

    const norm = normalizeCorrectAnswer(correctAnswerRaw, {
      optionA,
      optionB,
      optionC,
      optionD,
    });

    const valResult = validateQuestionBankRow(
      {
        id: `csv_row_${idx + 1}_${Date.now()}`,
        serial: idx + 1,
        ministry,
        subject,
        question,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswerRaw,
        correctAnswerLetter: norm.letter,
        correctAnswerBengali: norm.bengaliLetter,
        explanation,
        source,
        year,
        examHeldDate,
      },
      allQuestionTexts,
      existingQuestions
    );

    if (valResult.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    return {
      id: `csv_row_${idx + 1}_${Date.now()}`,
      serial: idx + 1,
      ministry,
      subject,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswerRaw,
      correctAnswerLetter: norm.letter,
      correctAnswerBengali: norm.bengaliLetter,
      explanation,
      source,
      year,
      examHeldDate,
      isValid: valResult.isValid,
      errors: valResult.errors,
      isDuplicateInCsv: valResult.isDuplicateInCsv,
      isDuplicateInDb: valResult.isDuplicateInDb,
    };
  });

  return {
    rows,
    totalCount: rows.length,
    validCount,
    invalidCount,
    headers: headerRow,
    fileErrors,
  };
}

/**
 * Generates and downloads the official CSV template with UTF-8 BOM encoding.
 * Specifically includes: Question, Option A, Option B, Option C, Option D, Correct Answer, Explanation
 * since Ministry, Exam Title, and Exam Held Date are provided directly in the manual form.
 */
export function downloadQuestionBankCsvTemplate(): void {
  const BOM = '\uFEFF';
  const headers = [
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Explanation',
  ];

  const sampleRows = [
    [
      'মুজিবনগর সরকারের শপথ বাক্য কে পাঠ করান?',
      'অধ্যাপক ইউসুফ আলী',
      'তাজউদ্দীন আহমদ',
      'সৈয়দ নজরুল ইসলাম',
      'এম এ হান্নান',
      'A',
      '১৯৭১ সালের ১৭ এপ্রিল মেহেরপুরের বৈদ্যনাথতলায় মুজিবনগর সরকারের আনুষ্ঠানিক শপথ গ্রহণ অনুষ্ঠিত হয় এবং অধ্যাপক ইউসুফ আলী শপথ বাক্য পাঠ করান।',
    ],
    [
      '‘কাজী নজরুল ইসলাম’ কোন পত্রিকার সম্পাদক ছিলেন?',
      'ধূমকেতু',
      'সংবাদ',
      'কল্লোল',
      'সমকাল',
      'ক',
      '১৯২২ সালে কবি কাজী নজরুল ইসলামের সম্পাদনায় অর্ধ-সাপ্তাহিক ‘ধূমকেতু’ পত্রিকা প্রকাশিত হয়।',
    ],
    [
      'মানবদেহের রক্তের গ্রুপ কে আবিষ্কার করেন?',
      'কার্ল ল্যান্ডস্টেইনার',
      'রবার্ট হুক',
      'আলেকজান্ডার ফ্লেমিং',
      'লুই পাস্তুর',
      'A',
      '১৯০১ সালে অস্ট্রিয়ান বিজ্ঞানী কার্ল ল্যান্ডস্টেইনার মানবদেহের রক্তের প্রধান গ্রুপ (A, B, AB, O) আবিষ্কার করেন।',
    ],
    [
      'কম্পিউটারের মস্তিষ্ক হিসেবে কোনটি কাজ করে?',
      'RAM',
      'CPU',
      'Hard Disk',
      'Motherboard',
      'B',
      'Central Processing Unit (CPU) কম্পিউটারের যাবতীয় তথ্য প্রক্রিয়াকরণ করে বিধায় একে কম্পিউটারের মস্তিষ্ক বলা হয়।',
    ],
    [
      'কোনটি খাঁটি বাংলা উপসর্গ?',
      'অঘা',
      'অনাবৃত',
      'বেয়াদব',
      'দরখাস্ত',
      'ক',
      '‘অঘা’ খাঁটি বাংলা উপসর্গ (যেমন: অঘারাম, অঘাচণ্ডী)।',
    ],
  ];

  const escapeField = (val: string): string => {
    if (!val) return '""';
    const clean = String(val).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const csvContent =
    BOM +
    headers.map(escapeField).join(',') +
    '\n' +
    sampleRows.map((r) => r.map(escapeField).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Medha_Question_Input_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Persists a MinistryQuestionBank to Firestore /ministryQuestionBanks/{bankId}
 * and caches into localStorage for instant visibility on Homepage.
 */
export async function saveMinistryQuestionBankToFirestore(
  bank: MinistryQuestionBank
): Promise<void> {
  if (bank.ministryName) {
    saveCustomMinistryToRegistry(bank.ministryName).catch(() => {});
  }
  try {
    await setDoc(doc(db, 'ministryQuestionBanks', bank.id), bank, { merge: true });
  } catch (err) {
    console.warn('Failed to persist to Firestore /ministryQuestionBanks:', err);
  }

  try {
    const raw = localStorage.getItem('ministry_question_banks');
    let list: MinistryQuestionBank[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((b) => b.id === bank.id);
    if (idx >= 0) {
      list[idx] = bank;
    } else {
      list = [bank, ...list];
    }
    localStorage.setItem('ministry_question_banks', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to update localStorage ministry_question_banks:', e);
  }
}

/**
 * Saves both:
 * 1. Dedicated questions into /QuestionBank/{questionId} (standalone)
 * 2. Complete Ministry Question Bank into /ministryQuestionBanks/{bankId} (immediately visible on Homepage)
 */
export async function saveMinistryQuestionBankBundle(
  bankMeta: {
    ministryName: string;
    title: string;
    examHeldDate?: string;
    subject?: string;
    year?: string;
    durationMinutes?: number;
  },
  questions: Array<{
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswerRaw: string;
    explanation?: string;
  }>,
  currentUserEmail?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ bankId: string; count: number }> {
  const bankId = `min-bank-${Date.now()}`;

  // 1. Prepare QuestionBank standalone items
  const standaloneItems: NewQuestionBankItem[] = questions.map((q) => {
    const norm = normalizeCorrectAnswer(q.correctAnswerRaw, {
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    });
    return {
      ministry: bankMeta.ministryName.trim(),
      subject: (bankMeta.subject || bankMeta.ministryName).trim(),
      question: q.question.trim(),
      optionA: q.optionA.trim(),
      optionB: q.optionB.trim(),
      optionC: q.optionC.trim(),
      optionD: q.optionD.trim(),
      options: [q.optionA.trim(), q.optionB.trim(), q.optionC.trim(), q.optionD.trim()],
      correctAnswer: norm.letter,
      correctAnswerLetter: norm.letter,
      explanation: (q.explanation || '').trim(),
      source: bankMeta.title.trim(),
      year: bankMeta.year?.trim() || '',
      examHeldDate: bankMeta.examHeldDate?.trim() || '',
      questionType: 'MCQ',
      status: 'active',
      createdBy: currentUserEmail || 'admin',
    };
  });

  // Batch insert into /QuestionBank
  const batchResult = await batchAddQuestionBankItems(standaloneItems, onProgress);
  if (batchResult.failed > 0 && batchResult.success === 0) {
    throw new Error(`ফায়ারস্টোরে প্রশ্নব্যাংকের প্রশ্নসমূহ আপলোড করতে ব্যর্থ হয়েছে (${batchResult.failed}টি প্রশ্ন ব্যর্থ)। দয়া করে এডমিন হিসেবে লগইন নিশ্চিত করে পুনরায় চেষ্টা করুন।`);
  }

  // 2. Prepare MinistryQuestionBank document for Homepage
  const formattedQuestions: MinistryBankQuestion[] = questions.map((q, idx) => {
    const norm = normalizeCorrectAnswer(q.correctAnswerRaw, {
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    });
    const letter = norm.letter;
    const correctIdx = letter === 'A' ? 0 : letter === 'B' ? 1 : letter === 'C' ? 2 : 3;
    return {
      id: `min-q-${Date.now()}-${idx + 1}`,
      text: q.question.trim(),
      options: [q.optionA.trim(), q.optionB.trim(), q.optionC.trim(), q.optionD.trim()],
      correctAnswer: correctIdx,
      explanation: (q.explanation || '').trim(),
      subject: bankMeta.subject || bankMeta.ministryName,
    };
  });

  const ministryBankDoc: MinistryQuestionBank = {
    id: bankId,
    ministryName: bankMeta.ministryName.trim(),
    title: bankMeta.title.trim(),
    examHeldDate: bankMeta.examHeldDate?.trim() || undefined,
    durationMinutes: bankMeta.durationMinutes || 10,
    totalQuestions: formattedQuestions.length,
    questions: formattedQuestions,
    dateCreated: new Date().toLocaleDateString('bn-BD'),
    isPublished: true,
  };

  // Persist to Firestore /ministryQuestionBanks & localStorage
  await saveMinistryQuestionBankToFirestore(ministryBankDoc);

  return { bankId, count: questions.length };
}

/**
 * Deletes a MinistryQuestionBank completely from Firestore /ministryQuestionBanks/{bankId}
 * AND ALSO deletes all associated questions from the /QuestionBank collection,
 * and purges it from localStorage and the Firestore deletion registry.
 */
export async function deleteMinistryQuestionBankFromFirestore(
  bankId: string,
  bankTitle?: string,
  ministryName?: string,
  questionTexts?: string[]
): Promise<{ deletedQuestionsCount: number }> {
  const cleanId = (bankId || '').trim();
  const cleanTitle = (bankTitle || '').trim();
  let targetMinistry = (ministryName || '').trim();
  let targetQuestions = [...(questionTexts || [])];

  // If ministryName or questionTexts are missing, try fetching the document first to identify questions
  if (cleanId && (!targetMinistry || targetQuestions.length === 0)) {
    try {
      const docSnap = await getDoc(doc(db, 'ministryQuestionBanks', cleanId));
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<MinistryQuestionBank>;
        if (!targetMinistry && data.ministryName) {
          targetMinistry = data.ministryName.trim();
        }
        if (targetQuestions.length === 0 && Array.isArray(data.questions)) {
          targetQuestions = data.questions.map((q) => (q.text || '').trim()).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch ministryQuestionBanks doc prior to delete:', e);
    }
  }

  // 1. Delete from /ministryQuestionBanks/{bankId}
  try {
    if (cleanId) {
      await deleteDoc(doc(db, 'ministryQuestionBanks', cleanId));
    }
  } catch (err) {
    console.warn('Failed to delete from Firestore /ministryQuestionBanks:', err);
  }

  // 2. Cascade delete ALL associated standalone items from /QuestionBank collection
  let deletedQuestionsCount = 0;
  try {
    const qbSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const toDeleteDocIds: string[] = [];

    const normTitle = cleanTitle.toLowerCase();
    const normMinistry = targetMinistry.toLowerCase();
    const qTextSet = new Set(targetQuestions.map((t) => t.trim().toLowerCase()).filter(Boolean));

    qbSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const itemSource = (data.source || '').trim().toLowerCase();
      const itemMinistry = (data.ministry || '').trim().toLowerCase();
      const itemQuestion = (data.question || '').trim().toLowerCase();

      let isMatch = false;
      // Match by exact or partial bank title / source
      if (normTitle && (itemSource === normTitle || (normTitle.length > 3 && itemSource.includes(normTitle)))) {
        isMatch = true;
      }
      // Match by ministry name
      if (normMinistry && (itemMinistry === normMinistry || (normMinistry.length > 3 && itemMinistry.includes(normMinistry)))) {
        isMatch = true;
      }
      // Match by question text
      if (qTextSet.size > 0 && qTextSet.has(itemQuestion)) {
        isMatch = true;
      }

      if (isMatch) {
        toDeleteDocIds.push(docSnap.id);
      }
    });

    // Delete in chunks of 400 (under Firestore's 500 batch limit)
    for (let i = 0; i < toDeleteDocIds.length; i += 400) {
      const chunk = toDeleteDocIds.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((docId) => {
        batch.delete(doc(db, COLLECTION_NAME, docId));
      });
      await batch.commit();
      deletedQuestionsCount += chunk.length;
    }
  } catch (err) {
    console.warn('Failed to delete associated items from /QuestionBank:', err);
  }

  // 3. Record in Firestore Deletion Registry so it never re-seeds or reappears
  try {
    await recordDeletedMinistryBankInRegistry(cleanId, cleanTitle);
  } catch (e) {}

  // 4. Purge from localStorage
  try {
    const raw = localStorage.getItem('ministry_question_banks');
    if (raw) {
      const list: MinistryQuestionBank[] = JSON.parse(raw);
      const filtered = list.filter((b) => b.id !== cleanId && (!cleanTitle || b.title !== cleanTitle));
      localStorage.setItem('ministry_question_banks', JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Failed to remove from localStorage ministry_question_banks:', e);
  }

  return { deletedQuestionsCount };
}

/**
 * Deletes all questions from /QuestionBank matching a specific ministry name.
 * Useful for purging orphaned questions (e.g. "সিকিউরিটি প্রিন্টিং প্রেস") or resetting a department's questions.
 */
export async function deleteQuestionsByMinistry(ministryName: string): Promise<number> {
  const normTarget = (ministryName || '').trim().toLowerCase();
  if (!normTarget) return 0;

  try {
    const qbSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const toDeleteDocIds: string[] = [];

    qbSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const itemMinistry = (data.ministry || '').trim().toLowerCase();
      if (itemMinistry === normTarget || (normTarget.length > 3 && itemMinistry.includes(normTarget))) {
        toDeleteDocIds.push(docSnap.id);
      }
    });

    let count = 0;
    for (let i = 0; i < toDeleteDocIds.length; i += 400) {
      const chunk = toDeleteDocIds.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((docId) => {
        batch.delete(doc(db, COLLECTION_NAME, docId));
      });
      await batch.commit();
      count += chunk.length;
    }
    return count;
  } catch (error) {
    console.error('Failed to delete questions by ministry:', error);
    throw error;
  }
}

/**
 * Updates a MinistryQuestionBank in Firestore /ministryQuestionBanks/{bankId}
 * (e.g. title, ministryName, examHeldDate, durationMinutes, isPublished, questions)
 * and syncs into localStorage.
 */
export async function updateMinistryQuestionBankInFirestore(
  bankId: string,
  updates: Partial<MinistryQuestionBank>
): Promise<void> {
  try {
    await setDoc(doc(db, 'ministryQuestionBanks', bankId), updates, { merge: true });
  } catch (err) {
    console.warn('Failed to update Firestore /ministryQuestionBanks:', err);
    throw err;
  }

  try {
    const raw = localStorage.getItem('ministry_question_banks');
    if (raw) {
      const list: MinistryQuestionBank[] = JSON.parse(raw);
      const idx = list.findIndex((b) => b.id === bankId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem('ministry_question_banks', JSON.stringify(list));
      }
    }
  } catch (e) {
    console.warn('Failed to update localStorage ministry_question_banks:', e);
  }
}

/**
 * Specifically updates the exam duration (durationMinutes) of a ministry bank in Firestore and local state.
 */
export async function updateMinistryBankDuration(
  bankId: string,
  durationMinutes: number
): Promise<void> {
  return updateMinistryQuestionBankInFirestore(bankId, { durationMinutes: Math.max(1, durationMinutes) });
}

/**
 * Toggles homepage visibility of a ministry bank in Firestore.
 */
export async function toggleMinistryBankPublishStatus(
  bankId: string,
  isPublished: boolean
): Promise<void> {
  return updateMinistryQuestionBankInFirestore(bankId, { isPublished });
}

const CUSTOM_MINISTRIES_STORAGE_KEY = 'medha_custom_ministries_v1';

/**
 * Normalizes a ministry/department name so slight whitespace differences
 * do not create duplicate entries.
 */
export function normalizeMinistryName(name: string): string {
  return (name || '').replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes a ministry name into a comparison key so that minor spelling variations
 * (e.g. 'ভূমি রেকর্ড ও জরিপ অদিদপ্তর' vs 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর' or 'য়' vs 'য়')
 * resolve to the exact same ministry group instead of splitting on the Homepage or Dropdown.
 */
export function getMinistryComparisonKey(name: string): string {
  return normalizeMinistryName(name)
    .toLowerCase()
    .replace(/অদিদপ্তর/g, 'অধিদপ্তর')
    .replace(/মন্ত্রনালয়/g, 'মন্ত্রণালয়')
    .replace(/মন্ত্রনালয়/g, 'মন্ত্রণালয়')
    .replace(/য়/g, 'য়')
    .replace(/ড়/g, 'ড়')
    .replace(/ঢ়/g, 'ঢ়');
}

/**
 * Finds an existing canonical ministry name from a list of known ministries if it matches by comparison key;
 * otherwise returns the normalized input name.
 */
export function findMatchingMinistryName(inputName: string, existingMinistries: string[]): string {
  const clean = normalizeMinistryName(inputName);
  if (!clean) return '';
  const targetKey = getMinistryComparisonKey(clean);
  for (const existing of existingMinistries) {
    const cleanExisting = normalizeMinistryName(existing);
    if (cleanExisting && getMinistryComparisonKey(cleanExisting) === targetKey) {
      return cleanExisting;
    }
  }
  return clean;
}

/**
 * Reads saved custom ministries from localStorage.
 */
export function getSavedCustomMinistriesFromLocal(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MINISTRIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((m) => normalizeMinistryName(String(m))).filter(Boolean)));
      }
    }
  } catch (e) {
    console.warn('Failed to read custom ministries from localStorage:', e);
  }
  return [];
}

/**
 * Persists a newly added or used ministry name into both localStorage and
 * Firestore (siteSettings/customMinistries) so it permanently stays in all dropdowns
 * for future question banks under the same ministry.
 */
export async function saveCustomMinistryToRegistry(ministryName: string): Promise<string> {
  const clean = normalizeMinistryName(ministryName);
  if (!clean) return '';

  // 1. Update localStorage immediately
  let updatedList: string[] = [];
  try {
    const existing = getSavedCustomMinistriesFromLocal();
    const matched = findMatchingMinistryName(clean, existing);
    const mergedMap = new Map<string, string>();
    [matched, ...existing].forEach((m) => {
      const c = normalizeMinistryName(m);
      const k = getMinistryComparisonKey(c);
      if (c && k && !mergedMap.has(k)) {
        mergedMap.set(k, c);
      }
    });
    updatedList = Array.from(mergedMap.values());
    localStorage.setItem(CUSTOM_MINISTRIES_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.warn('Failed to save custom ministry to localStorage:', e);
  }

  // 2. Persist to Firestore siteSettings/customMinistries
  try {
    const docRef = doc(db, 'siteSettings', 'customMinistries');
    await setDoc(
      docRef,
      {
        ministries: updatedList.length > 0 ? updatedList : [clean],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync custom ministry to Firestore siteSettings/customMinistries:', err);
  }

  return clean;
}

/**
 * Subscribes to Firestore siteSettings/customMinistries and merges with localStorage
 * so all custom ministries are always available in the dropdown across sessions.
 */
export function subscribeToCustomMinistries(onUpdate: (ministries: string[]) => void): () => void {
  const initialLocal = getSavedCustomMinistriesFromLocal();
  onUpdate(initialLocal);

  try {
    const docRef = doc(db, 'siteSettings', 'customMinistries');
    return onSnapshot(
      docRef,
      (snap) => {
        const local = getSavedCustomMinistriesFromLocal();
        let remote: string[] = [];
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.ministries)) {
            remote = data.ministries.map((m: any) => normalizeMinistryName(String(m))).filter(Boolean);
          }
        }
        const mergedMap = new Map<string, string>();
        [...remote, ...local].forEach((m) => {
          const c = normalizeMinistryName(m);
          const k = getMinistryComparisonKey(c);
          if (c && k && !mergedMap.has(k)) {
            mergedMap.set(k, c);
          }
        });
        const merged = Array.from(mergedMap.values());
        try {
          localStorage.setItem(CUSTOM_MINISTRIES_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}
        onUpdate(merged);
      },
      (err) => {
        console.warn('Error subscribing to customMinistries:', err);
        onUpdate(getSavedCustomMinistriesFromLocal());
      }
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Converts any date string (ISO, DD-MM-YYYY, YYYY-MM-DD, Bengali digits, or date string)
 * into a comparable numeric timestamp (epoch ms).
 * Returns -1 if unparseable/missing so that items with no date appear after items with dates.
 */
export function parseComparableDate(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== 'string') return -1;
  const str = dateStr.trim();
  if (!str) return -1;

  // Convert Bengali numerals to standard 0-9
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const normalized = str.replace(/[০-৯]/g, (d) => bnToEn[d] || d).trim();

  // 1. Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = normalized.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const parsed = new Date(year, month, day).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // 2. Format: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const parsed = new Date(year, month, day).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // 3. Direct standard Date parse (covers ISO timestamps, English date strings)
  const directTimestamp = Date.parse(normalized);
  if (!isNaN(directTimestamp) && directTimestamp > 0) {
    return directTimestamp;
  }

  // 4. Bengali month names (e.g. "৭ নভেম্বর ২০২৬" or "নভেম্বর ২০২৬")
  const bnMonths: Record<string, number> = {
    'জানুয়ারি': 0, 'জানুয়ারি': 0,
    'ফেব্রুয়ারি': 1, 'ফেব্রুয়ারি': 1,
    'মার্চ': 2,
    'এপ্রিল': 3,
    'মে': 4,
    'জুন': 5,
    'জুলাই': 6,
    'আগস্ট': 7,
    'সেপ্টেম্বর': 8,
    'অক্টোবর': 9,
    'নভেম্বর': 10,
    'ডিসেম্বর': 11,
  };
  for (const [mName, mIdx] of Object.entries(bnMonths)) {
    if (str.includes(mName)) {
      const yearMatch = normalized.match(/(\d{4})/);
      const dayMatch = normalized.match(/(\d{1,2})/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
      const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
      return new Date(year, mIdx, day).getTime();
    }
  }

  // 5. Pure 4-digit year e.g. "2026"
  const yearOnlyMatch = normalized.match(/\b(\d{4})\b/);
  if (yearOnlyMatch) {
    return new Date(parseInt(yearOnlyMatch[1], 10), 0, 1).getTime();
  }

  return -1;
}

/**
 * Extracts numeric upload / creation timestamp from a MinistryQuestionBank
 */
export function getBankUploadTimestamp(bank: MinistryQuestionBank): number {
  if (!bank) return 0;

  // 1. Extract millisecond timestamp from id (e.g. min-bank-1731000000000)
  const idTimestampMatch = (bank.id || '').match(/\b(\d{10,14})\b/);
  if (idTimestampMatch) {
    const ts = parseInt(idTimestampMatch[1], 10);
    if (!isNaN(ts) && ts > 1000000000) {
      return ts;
    }
  }

  // 2. Check createdAt field if present
  const anyBank = bank as any;
  if (anyBank.createdAt) {
    const ts = parseComparableDate(anyBank.createdAt);
    if (ts > 0) return ts;
  }

  // 3. Check dateCreated field
  if (bank.dateCreated) {
    const ts = parseComparableDate(bank.dateCreated);
    if (ts > 0) return ts;
  }

  return 0;
}

/**
 * Sorts Ministry Question Banks according to user specifications:
 * 1. Most recent exam held date (অনুষ্ঠিত তারিখ যেটা সম্প্রতি) comes first.
 * 2. If held dates are identical, latest uploaded/created (সর্বশেষ আপলোড করা) comes first.
 */
export function sortMinistryQuestionBanks(banks: MinistryQuestionBank[]): MinistryQuestionBank[] {
  if (!Array.isArray(banks) || banks.length <= 1) return banks || [];

  return [...banks].sort((a, b) => {
    const dateA = parseComparableDate(a.examHeldDate);
    const dateB = parseComparableDate(b.examHeldDate);

    // 1. Primary sort: examHeldDate descending (most recent first)
    if (dateA !== dateB) {
      return dateB - dateA;
    }

    // 2. Secondary sort: upload / creation timestamp descending (latest uploaded first)
    const uploadA = getBankUploadTimestamp(a);
    const uploadB = getBankUploadTimestamp(b);
    if (uploadA !== uploadB) {
      return uploadB - uploadA;
    }

    // 3. Deterministic fallback by id
    return (b.id || '').localeCompare(a.id || '');
  });
}
