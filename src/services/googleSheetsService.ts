/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, ExamResult, Question, UserProfile, PaymentRecord } from '../types';
import { getGoogleAccessToken } from '../lib/googleAuth';
import { saveQuestionToFirestore } from './firestoreService';

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
      s.id || s.uid || '',
      s.fullName || s.name || '',
      s.email || '',
      s.phone || '',
      s.institution || 'সাধারণ ব্যাচ',
      s.accountStatus || 'active',
      s.createdAt || s.joinedDate || new Date().toISOString(),
    ])
  ];
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
      'Question Bank': formatQuestionsForSheet(dataPayload.exams),
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
