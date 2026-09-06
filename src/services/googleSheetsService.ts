/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, ExamResult, Question, UserProfile, PaymentRecord } from '../types';
import { getGoogleAccessToken } from '../lib/googleAuth';
import { saveQuestionToFirestore, mapFirestoreDocToQuestion } from './firestoreService';
import { doc, setDoc, collection, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Standard Google Sheets column definitions
export const SHEET_COLUMNS = {
  STUDENTS: ['uid', 'studentId', 'fullName', 'email', 'phone', 'batch', 'accountStatus', 'registrationDate'],
  EXAMS: ['examId', 'title', 'category', 'duration', 'totalQuestions', 'totalMarks', 'passMarks', 'price', 'status', 'createdAt'],
  QUESTION_BANK: ['questionId', 'examId', 'questionNumber', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'marks'],
  RESULTS: ['resultId', 'userId', 'studentId', 'examId', 'examTitle', 'score', 'totalMarks', 'percentage', 'correctAnswers', 'wrongAnswers', 'skippedAnswers', 'submittedAt'],
  PAYMENTS: ['paymentId', 'userId', 'studentId', 'transactionId', 'gateway', 'amount', 'currency', 'paymentStatus', 'paidAt'],
  DOWNLOADS: ['fileId', 'title', 'category', 'googleDriveUrl', 'description', 'status', 'createdAt'],
};

export interface SheetRowValidation {
  rowNumber: number;
  questionId: string;
  examId: string;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswerIndex: number;
  explanation: string;
  marks: number;
  isValid: boolean;
  errors: string[];
}

export interface SheetQuestionsParseResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  errorRowNumbers: number[];
  rows: SheetRowValidation[];
  validQuestions: {
    question: Question;
    examId: string;
    questionNumber: number;
  }[];
}

export interface SheetStudentRowValidation {
  rowNumber: number;
  uid: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  batch: string;
  accountStatus: string;
  registrationDate: string;
  isValid: boolean;
  errors: string[];
}

export interface SheetStudentsParseResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  errorRowNumbers: number[];
  rows: SheetStudentRowValidation[];
  validStudents: UserProfile[];
}

const DEFAULT_SPREADSHEET_KEY = 'medha_connected_spreadsheet_id';

export function getSavedSpreadsheetId(): string {
  return localStorage.getItem(DEFAULT_SPREADSHEET_KEY) || '';
}

export function saveSpreadsheetId(id: string) {
  localStorage.setItem(DEFAULT_SPREADSHEET_KEY, id.trim());
}

/**
 * Fetch spreadsheet metadata to check title and available sheets
 */
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Sheets অথেনটিকেশন টোকেন পাওয়া যায়নি। দয়া করে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
  }

  const res = await fetch(`/api/sheets/metadata?spreadsheetId=${encodeURIComponent(spreadsheetId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'স্প্রেডশীট তথ্য লোড করা সম্ভব হয়নি। স্প্রেডশীট আইডি বা পারমিশন যাচাই করুন।');
  }

  return data.metadata;
}

/**
 * Create a fresh Master Exam Portal Google Spreadsheet template with all 6 required sheets
 */
export async function createMasterSpreadsheetTemplate(): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google অ্যাকাউন্ট কানেক্ট করা নেই। দয়া করে প্রথমে কানেক্ট করুন।');
  }

  const res = await fetch('/api/sheets/create-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'মেধা এক্সাম পোর্টাল - মাস্টার ডেটাবেজ ও রিপোর্টিং',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'নতুন Google স্প্রেডশীট তৈরি করা সম্ভব হয়নি।');
  }

  saveSpreadsheetId(data.spreadsheetId);
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

/**
 * Read and validate questions from Google Sheets Question Bank tab
 */
export async function readAndValidateQuestionsFromSheet(
  spreadsheetId: string,
  targetExamId?: string,
  sheetName: string = 'Question Bank'
): Promise<SheetQuestionsParseResult> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Sheets অ্যাক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে Google অ্যাকাউন্ট কানেক্ট করুন।');
  }

  const res = await fetch('/api/sheets/read-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      spreadsheetId,
      sheetName,
      targetExamId,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Google Sheets থেকে প্রশ্ন পড়তে সমস্যা হয়েছে।');
  }

  return data.data as SheetQuestionsParseResult;
}

/**
 * Import validated questions permanently into Firebase Firestore
 */
export async function importQuestionsToFirestore(
  validQuestions: { question: Question; examId: string; questionNumber: number }[],
  overrideExamId?: string
): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const item of validQuestions) {
    const finalExamId = overrideExamId || item.examId || 'general-exam';
    try {
      await saveQuestionToFirestore(item.question, finalExamId, item.questionNumber);
      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`প্রশ্ন ${item.question.text.substring(0, 25)}... সংরক্ষণে ত্রুটি: ${err?.message || 'অজানা ত্রুটি'}`);
    }
  }

  return { successCount, failedCount, errors };
}

/**
 * Helper to convert Students data to rows
 */
export function formatStudentsForSheet(students: UserProfile[]): any[][] {
  return [
    SHEET_COLUMNS.STUDENTS,
    ...students.map(s => [
      s.uid || s.id || '',
      s.studentId || s.id || s.uid || '',
      s.fullName || s.name || '',
      s.email || '',
      s.phone || '',
      s.batch || s.institution || 'ঢাকা কলেজ',
      s.accountStatus || 'active',
      s.registrationDate || s.createdAt || s.joinedDate || new Date().toISOString(),
    ])
  ];
}

/**
 * Read and validate students from Google Sheets tab
 */
export async function readAndValidateStudentsFromSheet(
  spreadsheetId: string,
  sheetName: string = 'Students'
): Promise<SheetStudentsParseResult> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Sheets অথেনটিকেশন টোকেন পাওয়া যায়নি। দয়া করে প্রথমে Google একাউন্ট কানেক্ট করুন।');
  }

  const res = await fetch('/api/sheets/read-students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      spreadsheetId,
      sheetName,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'শিট থেকে শিক্ষার্থীদের তথ্য পড়া সম্ভব হয়নি।');
  }

  return data.data;
}

/**
 * Save parsed students from Google Sheets to Firestore
 */
export async function saveStudentsToFirestore(
  students: UserProfile[]
): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const stud of students) {
    const docId = stud.uid || stud.id;
    if (!docId) continue;
    try {
      await setDoc(doc(db, 'users', docId), {
        uid: docId,
        id: docId,
        studentId: stud.studentId || docId,
        name: stud.fullName || stud.name,
        fullName: stud.fullName || stud.name,
        email: stud.email || '',
        phone: stud.phone || '',
        batch: stud.batch || stud.institution || 'ঢাকা কলেজ',
        institution: stud.batch || stud.institution || 'ঢাকা কলেজ',
        accountStatus: stud.accountStatus || 'active',
        role: stud.role || (stud.email?.toLowerCase() === 'medha@admin.com' ? 'admin' : 'student'),
        createdAt: stud.createdAt || stud.registrationDate || new Date().toISOString(),
        registrationDate: stud.registrationDate || stud.createdAt || new Date().toISOString(),
        lastLogin: stud.lastLogin || new Date().toISOString(),
        isPremium: stud.isPremium ?? (stud.email?.toLowerCase() === 'medha@admin.com'),
      }, { merge: true });
      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`শিক্ষার্থী ${stud.fullName || docId} সংরক্ষণে সমস্যা: ${err?.message || 'অজানা সমস্যা'}`);
    }
  }

  return { successCount, failedCount, errors };
}

/**
 * Helper to convert Exams data to rows
 */
export function formatExamsForSheet(exams: Exam[]): any[][] {
  return [
    SHEET_COLUMNS.EXAMS,
    ...exams.map(e => [
      e.id || '',
      e.title || '',
      e.subject || 'সাধারণ',
      Number(e.durationMinutes || 10),
      Number(e.totalQuestions || e.questions?.length || 0),
      Number(e.totalMarks || e.questions?.length || 0),
      Math.ceil((Number(e.totalMarks || e.questions?.length || 0)) * 0.4), // 40% pass marks
      e.isPremium ? '৳ ২৪৯' : 'ফ্রি',
      e.status || 'live',
      e.dateCreated || new Date().toISOString().split('T')[0],
    ])
  ];
}

/**
 * Helper to convert Questions data to rows
 */
export function formatQuestionsForSheet(exams: Exam[], questionsList?: Question[]): any[][] {
  const rows: any[][] = [SHEET_COLUMNS.QUESTION_BANK];

  if (questionsList && questionsList.length > 0) {
    questionsList.forEach((q, idx) => {
      const correctLetter = q.correctAnswer === 0 ? 'A' : q.correctAnswer === 1 ? 'B' : q.correctAnswer === 2 ? 'C' : 'D';
      rows.push([
        q.id || `q-${idx + 1}`,
        'general',
        q.questionNumber || idx + 1,
        q.text || '',
        q.options?.[0] || '',
        q.options?.[1] || '',
        q.options?.[2] || '',
        q.options?.[3] || '',
        correctLetter,
        q.explanation || '',
        1
      ]);
    });
    return rows;
  }

  exams.forEach(exam => {
    (exam.questions || []).forEach((q, idx) => {
      const correctLetter = q.correctAnswer === 0 ? 'A' : q.correctAnswer === 1 ? 'B' : q.correctAnswer === 2 ? 'C' : 'D';
      rows.push([
        q.id || `q-${exam.id}-${idx + 1}`,
        exam.id,
        q.questionNumber || idx + 1,
        q.text || '',
        q.options?.[0] || '',
        q.options?.[1] || '',
        q.options?.[2] || '',
        q.options?.[3] || '',
        correctLetter,
        q.explanation || '',
        1
      ]);
    });
  });

  return rows;
}

/**
 * Helper to convert Results data to rows
 */
export function formatResultsForSheet(results: ExamResult[]): any[][] {
  return [
    SHEET_COLUMNS.RESULTS,
    ...results.map(r => [
      r.id || '',
      r.userId || r.studentId || '',
      r.studentId || r.userId || '',
      r.examId || '',
      r.examTitle || '',
      Number(r.score || 0),
      Number(r.totalMarks || 0),
      `${Math.round(r.percentage || 0)}%`,
      Number(r.correctAnswers || 0),
      Number(r.wrongAnswers || 0),
      Number(r.skippedAnswers || r.unansweredQuestions || 0),
      r.submittedAt || new Date().toISOString(),
    ])
  ];
}

/**
 * Helper to convert Payments data to rows
 */
export function formatPaymentsForSheet(payments: PaymentRecord[] = []): any[][] {
  if (payments.length === 0) {
    // Return header with default demo sample if empty
    return [
      SHEET_COLUMNS.PAYMENTS,
      [
        'pay-sample-01',
        'student-demo-1',
        'student-demo-1',
        'TRX-ZINI-982184',
        'bKash',
        249,
        'BDT',
        'completed',
        new Date().toISOString()
      ]
    ];
  }

  return [
    SHEET_COLUMNS.PAYMENTS,
    ...payments.map(p => [
      p.id || '',
      p.userId || '',
      p.userId || '',
      p.transactionId || '',
      p.gateway || 'bKash',
      Number(p.amount || 249),
      'BDT',
      p.paymentStatus || 'completed',
      p.createdAt || new Date().toISOString(),
    ])
  ];
}

/**
 * Helper to convert Downloads data to rows
 */
export function formatDownloadsForSheet(): any[][] {
  return [
    SHEET_COLUMNS.DOWNLOADS,
    [
      'dl-bcs-01',
      '৪৫তম বিসিএস প্রিলিমিনারি সম্পূর্ণ প্রশ্ন সমাধান PDF',
      'BCS',
      'https://drive.google.com',
      'বিসিএস প্রিলিমিনারি সকল বিষয়ের ব্যাখ্যাসহ সমাধান গাইড',
      'active',
      new Date().toISOString().split('T')[0],
    ],
    [
      'dl-bank-02',
      'বাংলাদেশ ব্যাংক সহকারী পরিচালক বিগত ১০ বছরের প্রশ্ন ব্যাংক',
      'Bank',
      'https://drive.google.com',
      'ব্যাংক নিয়োগ পরীক্ষার গণিত ও ইংরেজি স্পেশাল হ্যান্ডনোট',
      'active',
      new Date().toISOString().split('T')[0],
    ],
    [
      'dl-primary-03',
      'প্রাথমিক শিক্ষক নিয়োগ চূড়ান্ত সাজেশন্স ও মডেল প্রশ্ন',
      'Primary',
      'https://drive.google.com',
      'নতুন সিলেবাসের আলোকে তৈরি পূর্ণাঙ্গ পিডিএফ হ্যান্ডবুক',
      'active',
      new Date().toISOString().split('T')[0],
    ]
  ];
}

/**
 * Export a specific sheet tab data to Google Sheets
 */
export async function exportToGoogleSheets(
  sheetType: 'Students' | 'Exams' | 'Question Bank' | 'Results' | 'Payments' | 'Downloads',
  spreadsheetId: string,
  rows: any[][]
): Promise<{ success: boolean; message: string; updatedRows: number }> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google অ্যাকাউন্ট কানেক্ট করা নেই। দয়া করে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
  }

  const res = await fetch('/api/sheets/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      spreadsheetId,
      sheetName: sheetType,
      rows,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `${sheetType} শিটে ডেটা এক্সপোর্ট ব্যর্থ হয়েছে।`);
  }

  return data;
}

/**
 * Export all 6 data tables to Google Sheets in one operation
 */
export async function exportAllDataToGoogleSheets(
  spreadsheetId: string,
  dataPayload: {
    students: UserProfile[];
    exams: Exam[];
    results: ExamResult[];
    payments?: PaymentRecord[];
    questions?: Question[];
  }
): Promise<{ success: boolean; message: string; details: Record<string, number> }> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google অ্যাকাউন্ট কানেক্ট করা নেই। দয়া করে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
  }

  const payload = {
    spreadsheetId,
    sheets: {
      'Students': formatStudentsForSheet(dataPayload.students),
      'Exams': formatExamsForSheet(dataPayload.exams),
      'Question Bank': formatQuestionsForSheet(dataPayload.exams, dataPayload.questions),
      'Results': formatResultsForSheet(dataPayload.results),
      'Payments': formatPaymentsForSheet(dataPayload.payments || []),
      'Downloads': formatDownloadsForSheet(),
    }
  };

  const res = await fetch('/api/sheets/export-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'সকল ডেটা এক্সপোর্ট সম্পন্ন করা যায়নি।');
  }

  return data;
}

/**
 * Result Sync System:
 * Automatically syncs exam results to Google Sheets Results tab in the background.
 * If sync fails, queues in localStorage for later retry without altering Firebase.
 */
const SYNC_QUEUE_KEY = 'medha_pending_sheet_results_queue';

export function getPendingSyncQueue(): ExamResult[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function queueResultForSync(result: ExamResult) {
  const queue = getPendingSyncQueue();
  if (!queue.some(r => r.id === result.id)) {
    queue.push(result);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

export function removeResultFromSyncQueue(resultId: string) {
  const queue = getPendingSyncQueue().filter(r => r.id !== resultId);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Automatically sync single result to connected Google Sheet
 */
export async function syncResultToGoogleSheets(
  result: ExamResult,
  customSpreadsheetId?: string
): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const spreadsheetId = customSpreadsheetId || getSavedSpreadsheetId();
  if (!spreadsheetId) {
    // No connected sheet configured yet, queue for later sync
    queueResultForSync(result);
    return { success: true, synced: false, error: 'কোনো সংযুক্ত গুগল শিট আইডি নেই (কিউতে সংরক্ষিত)' };
  }

  const token = getGoogleAccessToken();
  if (!token) {
    // Token not available in current session, queue for retry
    queueResultForSync(result);
    return { success: true, synced: false, error: 'Google অথেনটিকেশন নেই (কিউতে সংরক্ষিত)' };
  }

  try {
    const res = await fetch('/api/sheets/sync-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        spreadsheetId,
        result,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      removeResultFromSyncQueue(result.id);
      return { success: true, synced: true };
    } else {
      queueResultForSync(result);
      return { success: false, synced: false, error: data.message || 'সিঙ্ক ব্যর্থ হয়েছে' };
    }
  } catch (err: any) {
    queueResultForSync(result);
    return { success: false, synced: false, error: err?.message || 'নেটওয়ার্ক সমস্যা' };
  }
}

/**
 * Retry all pending queued results sync
 */
export async function retryPendingResultSyncs(spreadsheetId?: string): Promise<{ total: number; succeeded: number; failed: number }> {
  const queue = getPendingSyncQueue();
  if (queue.length === 0) return { total: 0, succeeded: 0, failed: 0 };

  const targetSpreadsheetId = spreadsheetId || getSavedSpreadsheetId();
  let succeeded = 0;
  let failed = 0;

  for (const item of queue) {
    const res = await syncResultToGoogleSheets(item, targetSpreadsheetId);
    if (res.synced) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { total: queue.length, succeeded, failed };
}

/**
 * Automatically sync student record to connected Google Sheet
 */
export async function syncStudentToGoogleSheets(
  student: UserProfile,
  customSpreadsheetId?: string
): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const spreadsheetId = customSpreadsheetId || getSavedSpreadsheetId();
  if (!spreadsheetId) return { success: false, synced: false, error: 'কোনো সংযুক্ত গুগল শিট আইডি নেই' };

  const token = getGoogleAccessToken();
  if (!token) return { success: false, synced: false, error: 'Google অথেনটিকেশন নেই' };

  try {
    const res = await fetch('/api/sheets/sync-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ spreadsheetId, student }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, synced: res.ok && data.success, error: data.message };
  } catch (err: any) {
    return { success: false, synced: false, error: err?.message || 'নেটওয়ার্ক সমস্যা' };
  }
}

/**
 * Automatically sync exam record to connected Google Sheet
 */
export async function syncExamToGoogleSheets(
  exam: Exam,
  customSpreadsheetId?: string
): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const spreadsheetId = customSpreadsheetId || getSavedSpreadsheetId();
  if (!spreadsheetId) return { success: false, synced: false, error: 'কোনো সংযুক্ত গুগল শিট আইডি নেই' };

  const token = getGoogleAccessToken();
  if (!token) return { success: false, synced: false, error: 'Google অথেনটিকেশন নেই' };

  try {
    const res = await fetch('/api/sheets/sync-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ spreadsheetId, exam }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, synced: res.ok && data.success, error: data.message };
  } catch (err: any) {
    return { success: false, synced: false, error: err?.message || 'নেটওয়ার্ক সমস্যা' };
  }
}

/**
 * Automatically sync question record to connected Google Sheet
 */
export async function syncQuestionToGoogleSheets(
  question: Question,
  examId: string = 'general',
  questionNumber: number = 1,
  customSpreadsheetId?: string
): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const spreadsheetId = customSpreadsheetId || getSavedSpreadsheetId();
  if (!spreadsheetId) return { success: false, synced: false, error: 'কোনো সংযুক্ত গুগল শিট আইডি নেই' };

  const token = getGoogleAccessToken();
  if (!token) return { success: false, synced: false, error: 'Google অথেনটিকেশন নেই' };

  try {
    const res = await fetch('/api/sheets/sync-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ spreadsheetId, question, examId, questionNumber }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, synced: res.ok && data.success, error: data.message };
  } catch (err: any) {
    return { success: false, synced: false, error: err?.message || 'নেটওয়ার্ক সমস্যা' };
  }
}

/**
 * Automatically sync payment record to connected Google Sheet
 */
export async function syncPaymentToGoogleSheets(
  payment: PaymentRecord,
  customSpreadsheetId?: string
): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const spreadsheetId = customSpreadsheetId || getSavedSpreadsheetId();
  if (!spreadsheetId) return { success: false, synced: false, error: 'কোনো সংযুক্ত গুগল শিট আইডি নেই' };

  const token = getGoogleAccessToken();
  if (!token) return { success: false, synced: false, error: 'Google অথেনটিকেশন নেই' };

  try {
    const res = await fetch('/api/sheets/sync-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ spreadsheetId, payment }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, synced: res.ok && data.success, error: data.message };
  } catch (err: any) {
    return { success: false, synced: false, error: err?.message || 'নেটওয়ার্ক সমস্যা' };
  }
}

/**
 * Safely reads all existing Firestore collections and exports them into the connected Google Sheet.
 * STRICTLY READ-ONLY: Never alters, modifies or deletes anything in Firestore.
 */
export async function exportExistingFirestoreDataToGoogleSheets(
  targetSpreadsheetId?: string
): Promise<{
  success: boolean;
  message: string;
  counts: {
    students: number;
    exams: number;
    questions: number;
    results: number;
    payments: number;
  };
}> {
  const spreadsheetId = targetSpreadsheetId || getSavedSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('কোনো সংযুক্ত গুগল স্প্রেডশীট আইডি পাওয়া যায়নি। দয়া করে প্রথমে গুগল শিট নির্বাচন বা তৈরি করুন।');
  }

  // 1. Fetch Students from Firestore (Read-Only)
  const studentsSnap = await getDocs(collection(db, 'users'));
  const students: UserProfile[] = [];
  studentsSnap.forEach((d) => {
    const data = d.data() as any;
    students.push({
      id: d.id,
      uid: d.id,
      studentId: data.studentId || d.id,
      name: data.fullName || data.name || 'শিক্ষার্থী',
      fullName: data.fullName || data.name || 'শিক্ষার্থী',
      displayName: data.fullName || data.name || 'শিক্ষার্থী',
      email: data.email || '',
      phone: data.phone || '',
      batch: data.batch || data.institution || 'সাধারণ ব্যাচ',
      institution: data.institution || data.batch || '',
      role: data.role === 'admin' ? 'admin' : 'student',
      isPremium: !!data.isPremium,
      accountStatus: data.accountStatus === 'blocked' ? 'blocked' : 'active',
      createdAt: data.registrationDate || data.createdAt || new Date().toISOString(),
      lastLogin: data.lastLogin || new Date().toISOString(),
    });
  });

  // 2. Fetch Exams from Firestore (Read-Only across 'exams', 'exam', 'Exam')
  const examsMap = new Map<string, Exam>();
  for (const collName of ['exams', 'exam', 'Exam']) {
    try {
      const snap = await getDocs(collection(db, collName));
      snap.forEach((d) => {
        if (!examsMap.has(d.id)) {
          const data = d.data() as any;
          examsMap.set(d.id, {
            id: d.id,
            title: data.title || 'অনলাইন পরীক্ষা',
            subject: data.subject || 'সাধারণ',
            durationMinutes: Number(data.durationMinutes || data.duration || 10),
            totalQuestions: Number(data.totalQuestions || 0),
            totalMarks: Number(data.totalMarks || 0),
            isPremium: !!data.isPremium,
            status: data.status || 'live',
            dateCreated: data.dateCreated || new Date().toISOString().split('T')[0],
            questions: data.questions || [],
          } as Exam);
        }
      });
    } catch (e) {
      console.warn(`Read ${collName} collection:`, e);
    }
  }
  const exams = Array.from(examsMap.values());

  // 3. Fetch Questions from Firestore (Read-Only)
  const questionsMap = new Map<string, Question>();
  try {
    const qSnap = await getDocs(collection(db, 'questions'));
    qSnap.forEach((d) => {
      questionsMap.set(d.id, mapFirestoreDocToQuestion(d));
    });
  } catch (e) {
    console.warn('Read questions collection:', e);
  }
  // Include questions inside exams if any
  exams.forEach((ex) => {
    (ex.questions || []).forEach((q) => {
      if (q && q.id && !questionsMap.has(q.id)) {
        questionsMap.set(q.id, q);
      }
    });
  });
  const questions = Array.from(questionsMap.values());

  // 4. Fetch Results from Firestore (Read-Only)
  const results: ExamResult[] = [];
  try {
    const rSnap = await getDocs(collection(db, 'results'));
    rSnap.forEach((d) => {
      const data = d.data() as any;
      results.push({
        id: d.id,
        userId: data.userId || data.studentId || 'guest',
        studentId: data.studentId || data.userId || 'guest',
        studentName: data.studentName || 'শিক্ষার্থী',
        examId: data.examId || '',
        examTitle: data.examTitle || '',
        score: Number(data.score || 0),
        totalMarks: Number(data.totalMarks || 0),
        percentage: Number(data.percentage || 0),
        correctAnswers: Number(data.correctAnswers || 0),
        wrongAnswers: Number(data.wrongAnswers || 0),
        skippedAnswers: Number(data.skippedAnswers || 0),
        submittedAt: data.submittedAt || new Date().toISOString(),
      } as ExamResult);
    });
  } catch (e) {
    console.warn('Read results collection:', e);
  }

  // 5. Fetch Payments from Firestore (Read-Only)
  const payments: PaymentRecord[] = [];
  try {
    const pSnap = await getDocs(collection(db, 'payments'));
    pSnap.forEach((d) => {
      const data = d.data() as any;
      payments.push({
        id: d.id,
        userId: data.userId || '',
        transactionId: data.transactionId || '',
        gateway: data.gateway || 'bKash',
        amount: Number(data.amount || 249),
        paymentStatus: data.paymentStatus || 'completed',
        createdAt: data.createdAt || new Date().toISOString(),
      } as PaymentRecord);
    });
  } catch (e) {
    console.warn('Read payments collection:', e);
  }

  // Export all tables to Google Sheets without altering Firestore
  const exportRes = await exportAllDataToGoogleSheets(spreadsheetId, {
    students,
    exams,
    questions,
    results,
    payments,
  });

  return {
    success: exportRes.success,
    message: exportRes.message || 'বিদ্যমান সকল Firestore ডেটা গুগল শীটে যোগ করা হয়েছে।',
    counts: {
      students: students.length,
      exams: exams.length,
      questions: questions.length,
      results: results.length,
      payments: payments.length,
    },
  };
}

/**
 * Initializes automatic real-time listener for Firestore documents.
 * Whenever documents are created or updated via the website, they are instantly
 * synchronized to the connected Google Sheet.
 */
let unsubscribers: Unsubscribe[] = [];

export function startFirestoreRealtimeSheetsSync(
  onSyncEvent?: (collection: string, docId: string, status: string) => void
): () => void {
  // Stop existing listeners if running
  stopFirestoreRealtimeSheetsSync();

  const syncCache = new Set<string>();
  const isInitialized: Record<string, boolean> = {
    users: false,
    exams: false,
    questions: false,
    results: false,
    payments: false,
  };

  // 1. Users real-time listener
  try {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (!isInitialized.users) {
        // Mark initial batch as loaded
        snapshot.docs.forEach((d) => syncCache.add(`user-${d.id}`));
        isInitialized.users = true;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const d = change.doc;
          const data = d.data() as any;
          const student: UserProfile = {
            id: d.id,
            uid: d.id,
            studentId: data.studentId || d.id,
            name: data.fullName || data.name || 'শিক্ষার্থী',
            fullName: data.fullName || data.name || 'শিক্ষার্থী',
            displayName: data.fullName || data.name || 'শিক্ষার্থী',
            email: data.email || '',
            phone: data.phone || '',
            batch: data.batch || data.institution || 'সাধারণ ব্যাচ',
            institution: data.institution || data.batch || '',
            role: data.role === 'admin' ? 'admin' : 'student',
            isPremium: !!data.isPremium,
            accountStatus: data.accountStatus === 'blocked' ? 'blocked' : 'active',
            createdAt: data.registrationDate || data.createdAt || new Date().toISOString(),
            lastLogin: data.lastLogin || new Date().toISOString(),
          };
          syncStudentToGoogleSheets(student).then((res) => {
            if (res.synced) onSyncEvent?.('Students', d.id, 'synced');
          });
        }
      });
    });
    unsubscribers.push(unsubUsers);
  } catch (e) {
    console.warn('Realtime sync users listener:', e);
  }

  // 2. Exams real-time listener
  try {
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      if (!isInitialized.exams) {
        snapshot.docs.forEach((d) => syncCache.add(`exam-${d.id}`));
        isInitialized.exams = true;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const d = change.doc;
          const data = d.data() as any;
          const exam: Exam = {
            id: d.id,
            title: data.title || 'অনলাইন পরীক্ষা',
            subject: data.subject || 'সাধারণ',
            durationMinutes: Number(data.durationMinutes || data.duration || 10),
            totalQuestions: Number(data.totalQuestions || 0),
            totalMarks: Number(data.totalMarks || 0),
            isPremium: !!data.isPremium,
            status: data.status || 'live',
            dateCreated: data.dateCreated || new Date().toISOString().split('T')[0],
            questions: data.questions || [],
          };
          syncExamToGoogleSheets(exam).then((res) => {
            if (res.synced) onSyncEvent?.('Exams', d.id, 'synced');
          });
        }
      });
    });
    unsubscribers.push(unsubExams);
  } catch (e) {
    console.warn('Realtime sync exams listener:', e);
  }

  // 3. Results real-time listener
  try {
    const unsubResults = onSnapshot(collection(db, 'results'), (snapshot) => {
      if (!isInitialized.results) {
        snapshot.docs.forEach((d) => syncCache.add(`result-${d.id}`));
        isInitialized.results = true;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const d = change.doc;
          const data = d.data() as any;
          const result: ExamResult = {
            id: d.id,
            userId: data.userId || data.studentId || 'guest',
            studentId: data.studentId || data.userId || 'guest',
            studentName: data.studentName || 'শিক্ষার্থী',
            studentEmail: data.studentEmail || '',
            examId: data.examId || '',
            examTitle: data.examTitle || '',
            subject: data.subject || 'সাধারণ',
            score: Number(data.score || 0),
            totalMarks: Number(data.totalMarks || 0),
            percentage: Number(data.percentage || 0),
            totalQuestions: Number(data.totalQuestions || 0),
            correctAnswers: Number(data.correctAnswers || 0),
            wrongAnswers: Number(data.wrongAnswers || 0),
            skippedAnswers: Number(data.skippedAnswers || 0),
            unansweredQuestions: Number(data.unansweredQuestions || 0),
            submittedAt: data.submittedAt || new Date().toISOString(),
            dateTaken: data.dateTaken || new Date().toLocaleDateString('bn-BD'),
            timeSpentSeconds: Number(data.timeSpentSeconds || 0),
            subjectPerformance: data.subjectPerformance || {},
          };
          syncResultToGoogleSheets(result).then((res) => {
            if (res.synced) onSyncEvent?.('Results', d.id, 'synced');
          });
        }
      });
    });
    unsubscribers.push(unsubResults);
  } catch (e) {
    console.warn('Realtime sync results listener:', e);
  }

  // 4. Questions real-time listener
  try {
    const unsubQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      if (!isInitialized.questions) {
        snapshot.docs.forEach((d) => syncCache.add(`question-${d.id}`));
        isInitialized.questions = true;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const d = change.doc;
          const q = mapFirestoreDocToQuestion(d);
          syncQuestionToGoogleSheets(q, 'general', q.questionNumber || 1).then((res) => {
            if (res.synced) onSyncEvent?.('Question Bank', d.id, 'synced');
          });
        }
      });
    });
    unsubscribers.push(unsubQuestions);
  } catch (e) {
    console.warn('Realtime sync questions listener:', e);
  }

  return stopFirestoreRealtimeSheetsSync;
}

export function stopFirestoreRealtimeSheetsSync() {
  unsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  unsubscribers = [];
}
