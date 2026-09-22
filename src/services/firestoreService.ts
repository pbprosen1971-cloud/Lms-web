/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Unsubscribe,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  safeTimestampToString,
  safeDateOnlyString,
  formatSafeDisplay
} from '../lib/dateUtils';
export { safeTimestampToString, safeDateOnlyString, formatSafeDisplay };
import {
  Exam,
  Question,
  ExamResult,
  UserProfile,
  UpcomingExamSettings,
  UpcomingExamDoc,
  ExamContentDoc,
  ExamQuestionDoc,
  ReferralRecord,
  StudyMaterial,
  MaterialAccessRecord,
  DailyPracticeSession,
  WrongQuestionRecord
} from '../types';
import { INITIAL_EXAMS, INITIAL_MINISTRY_BANKS } from '../data';

export interface FirestoreQuestion {
  id: string;
  examId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string | number;
  explanation?: string;
  questionNumber?: number;
  subject?: string;
  marks?: number;
}

// Convert Firestore question document to app Question object
export function mapFirestoreDocToQuestion(docSnap: any): Question {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || data.questionId || `q-${Date.now()}`;

  const optA = data.optionA ?? data.options?.[0] ?? '';
  const optB = data.optionB ?? data.options?.[1] ?? '';
  const optC = data.optionC ?? data.options?.[2] ?? '';
  const optD = data.optionD ?? data.options?.[3] ?? '';

  const options = [optA, optB, optC, optD];

  let correctAnswerIdx = 0;
  if (typeof data.correctAnswer === 'number') {
    correctAnswerIdx = data.correctAnswer;
  } else if (typeof data.correctAnswer === 'string') {
    const val = data.correctAnswer.trim().toUpperCase();
    if (val === 'A' || val === '1' || val === optA.toUpperCase()) correctAnswerIdx = 0;
    else if (val === 'B' || val === '2' || val === optB.toUpperCase()) correctAnswerIdx = 1;
    else if (val === 'C' || val === '3' || val === optC.toUpperCase()) correctAnswerIdx = 2;
    else if (val === 'D' || val === '4' || val === optD.toUpperCase()) correctAnswerIdx = 3;
    else {
      const parsed = parseInt(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) correctAnswerIdx = parsed;
    }
  }

  return {
    id,
    text: data.questionText || data.question || data.text || '',
    options,
    correctAnswer: correctAnswerIdx,
    explanation: data.explanation || '',
    questionNumber: data.questionNumber || 1,
    subject: data.subject || '',
  };
}

// ==========================================
// 1. DEDICATED /exam COLLECTION (UPCOMING EXAMS)
// ==========================================

/**
 * Save an Upcoming Exam to the dedicated /exam/{examId} collection in Firestore.
 * Also synchronizes /Exam/{examId} (Exam content) and siteSettings/upcomingExam.
 */
export async function saveUpcomingExamScheduleToFirestore(
  examData: {
    id?: string;
    examId?: string;
    title: string;
    description?: string;
    examDateTime?: string;
    archiveDateTime?: string;
    startTime?: string;
    startDate?: string;
    archiveTime?: string;
    examDate?: string;
    archiveDate?: string;
    examType?: 'free' | 'premium' | string;
    isPremium?: boolean;
    status?: 'upcoming' | 'live' | 'archive' | 'completed' | string;
    isPublished?: boolean;
    duration?: number;
    durationMinutes?: number;
    subject?: string;
    totalQuestions?: number;
    totalMarks?: number;
    questions?: Question[];
    createdBy?: string;
  },
  adminUid: string = 'admin'
): Promise<UpcomingExamDoc> {
  const targetExamId = examData.examId || examData.id || `upcoming-exam-${Date.now()}`;
  const examRef = doc(db, 'exam', targetExamId);

  // Check if doc already exists to preserve createdAt
  let isExisting = false;
  try {
    const existingSnap = await getDoc(examRef);
    if (existingSnap.exists()) {
      isExisting = true;
    }
  } catch (e) {}

  // CRITICAL: Scheduled start time must ONLY come from explicit examDateTime or startTime.
  // NEVER fall back to dateCreated, creation date, or today's date!
  const creationDateStr = ((examData as any).dateCreated || '').trim();
  const rawDateTime = (examData.examDateTime || examData.startTime || '').trim();
  const examDateTime = (rawDateTime && rawDateTime !== 'নির্ধারিত নেই' && rawDateTime !== creationDateStr) ? rawDateTime : '';

  const rawStartDate = (examData.startDate || '').trim();
  const startDate = (rawStartDate && rawStartDate !== 'নির্ধারিত নেই' && rawStartDate !== creationDateStr) 
    ? rawStartDate 
    : (examDateTime ? (examDateTime.includes('T') ? examDateTime.split('T')[0] : examDateTime) : '');

  const rawExamDate = (examData.examDate || '').trim();
  const examDate = (rawExamDate && rawExamDate !== 'নির্ধারিত নেই' && rawExamDate !== creationDateStr) 
    ? rawExamDate 
    : startDate;

  const rawArchive = examData.archiveDateTime || examData.archiveTime || examData.archiveDate || '';
  const archiveDateTime = rawArchive ? rawArchive.trim() : '';
  const archiveDate = archiveDateTime ? (archiveDateTime.includes('T') ? archiveDateTime.split('T')[0] : archiveDateTime) : '';

  const examType = examData.examType || (examData.isPremium ? 'premium' : 'free');
  const duration = Number(examData.durationMinutes || examData.duration || 30);
  const subject = examData.subject || 'BCS';
  const isPublished = examData.isPublished !== false;
  const status = examData.status || 'upcoming';
  const createdBy = examData.createdBy || adminUid || 'admin';

  const payload: any = {
    examId: targetExamId,
    title: examData.title.trim(),
    description: (examData.description || '').trim(),
    examDateTime: examDateTime || '',
    startTime: examDateTime || '',
    startDate: startDate || '',
    examDate: examDate || '',
    archiveDateTime: archiveDateTime || '',
    archiveTime: archiveDateTime || '',
    archiveDate: archiveDate || '',
    examType: examType,
    status: status,
    isPublished: isPublished,
    createdBy: createdBy,
    updatedAt: serverTimestamp(),
    subject: subject,
    duration: duration,
    durationMinutes: duration,
    totalQuestions: Number(examData.totalQuestions || examData.questions?.length || 0),
    totalMarks: Number(examData.totalMarks || examData.questions?.length || 0),
  };

  if (!isExisting) {
    payload.createdAt = serverTimestamp();
  }

  try {
    // 1. Write to /exam/{examId}
    await setDoc(examRef, payload, { merge: true });

    // 2. Also write to /Exam/{examId} (actual exam container)
    const capitalExamRef = doc(db, 'Exam', targetExamId);
    const capitalPayload: any = {
      examId: targetExamId,
      title: examData.title.trim(),
      description: (examData.description || '').trim(),
      examType: examType,
      duration: duration,
      totalMarks: Number(examData.totalMarks || examData.questions?.length || 0),
      totalQuestions: Number(examData.totalQuestions || examData.questions?.length || 0),
      status: status,
      examDateTime: examDateTime || '',
      startTime: examDateTime || '',
      startDate: startDate || '',
      examDate: examDate || '',
      archiveDateTime: archiveDateTime || '',
      archiveTime: archiveDateTime || '',
      archiveDate: archiveDate || '',
      updatedAt: serverTimestamp(),
      createdBy: createdBy,
    };
    if (!isExisting) {
      capitalPayload.createdAt = serverTimestamp();
    }
    await setDoc(capitalExamRef, capitalPayload, { merge: true });

    // 3. Write questions to /Exam/{examId}/questions if provided
    if (examData.questions && examData.questions.length > 0) {
      for (let i = 0; i < examData.questions.length; i++) {
        await saveQuestionToExamContent(targetExamId, examData.questions[i], i + 1);
      }
    }

    // 4. Backward compatibility: also sync to /exams/{examId}
    const legacyExamRef = doc(db, 'exams', targetExamId);
    await setDoc(legacyExamRef, {
      id: targetExamId,
      title: examData.title.trim(),
      description: (examData.description || '').trim(),
      category: subject,
      subject: subject,
      duration: duration,
      durationMinutes: duration,
      totalQuestions: Number(examData.totalQuestions || examData.questions?.length || 0),
      totalMarks: Number(examData.totalMarks || examData.questions?.length || 0),
      status: status,
      isPublished: isPublished,
      createdBy: createdBy,
      isPremium: examType === 'premium',
      startTime: examDateTime || '',
      startDate: startDate || '',
      examDateTime: examDateTime || '',
      examDate: examDate || '',
      archiveTime: archiveDateTime || '',
      archiveDateTime: archiveDateTime || '',
      dateCreated: (examData as any).dateCreated || new Date().toISOString().split('T')[0],
      createdAt: (examData as any).createdAt || serverTimestamp(),
    }, { merge: true });

    // 5. Update siteSettings/upcomingExam ONLY IF status is 'upcoming'
    if (status === 'upcoming') {
      try {
        await saveUpcomingExamSettings({
          examId: targetExamId,
          title: examData.title.trim(),
          description: (examData.description || '').trim(),
          examDate: examDate || '',
          startDate: startDate || '',
          startTime: examDateTime || '',
          archiveTime: archiveDateTime || '',
          duration: duration,
          durationMinutes: duration,
          isPublished: isPublished,
          subject: subject,
          totalQuestions: Number(examData.totalQuestions || examData.questions?.length || 0),
          totalMarks: Number(examData.totalMarks || examData.questions?.length || 0),
          isPremium: examType === 'premium',
          updatedBy: createdBy,
        }, createdBy);
      } catch (err) {
        console.warn("Could not sync to siteSettings/upcomingExam:", err);
      }
    } else if (status === 'live' || status === 'archive') {
      // Clear from upcoming exam siteSettings so it does not persist in upcoming banner
      await clearUpcomingExamSettings(targetExamId);
    }

    return {
      examId: targetExamId,
      title: examData.title.trim(),
      description: examData.description || '',
      examDateTime: examDateTime || '',
      startDate: startDate || '',
      startTime: examDateTime || '',
      archiveDateTime: archiveDateTime || '',
      archiveTime: archiveDateTime || '',
      examDate: examDate || '',
      archiveDate: archiveDate || '',
      examType,
      status,
      isPublished,
      createdBy,
      duration,
      durationMinutes: duration,
      subject,
      totalQuestions: Number(examData.totalQuestions || examData.questions?.length || 0),
      totalMarks: Number(examData.totalMarks || examData.questions?.length || 0),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `exam/${targetExamId}`);
    throw err;
  }
}

/**
 * Subscribe to all exams in Firestore (combines /exam, /Exam, and /exams)
 */
export function subscribeToExams(callback: (exams: Exam[]) => void): Unsubscribe {
  // Listen to /exam (dedicated collection for upcoming & scheduled exams)
  const examRef = collection(db, 'exam');
  // Listen to /Exam (dedicated questions and exam document container)
  const capitalExamRef = collection(db, 'Exam');
  // Listen to legacy /exams
  const examsLegacyRef = collection(db, 'exams');

  let examDocsMap = new Map<string, Exam>();
  let capitalDocsMap = new Map<string, Exam>();
  let legacyDocsMap = new Map<string, Exam>();

  const emitMergedList = () => {
    const combinedMap = new Map<string, Exam>();
    // First apply legacy /exams
    legacyDocsMap.forEach((v, k) => combinedMap.set(k, v));

    // Then merge /exam (dedicated upcoming/scheduled collection)
    examDocsMap.forEach((v, k) => {
      const existing = combinedMap.get(k);
      combinedMap.set(k, {
        ...(existing || {}),
        ...v,
        questions: (existing?.questions && existing.questions.length > 0) ? existing.questions : (v.questions || []),
        description: v.description || existing?.description,
      });
    });

    // Finally merge /exam (dedicated upcoming/scheduled collection)
    // CRITICAL: Upcoming status in /exam MUST be preserved so exams aren't prematurely marked live
    examDocsMap.forEach((v, k) => {
      const existing = combinedMap.get(k);
      combinedMap.set(k, {
        ...(existing || {}),
        ...v,
        status: v.status === 'upcoming' ? 'upcoming' : (existing?.status || v.status),
        questions: (existing?.questions && existing.questions.length > 0) ? existing.questions : (v.questions || []),
        description: v.description || existing?.description,
      });
    });

    const list = Array.from(combinedMap.values());
    list.sort((a, b) => b.id.localeCompare(a.id));
    callback(list);
  };

  const unsubExam = onSnapshot(examRef, (snapshot) => {
    examDocsMap.clear();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const examId = docSnap.id || data.examId || data.id;
      const qList = Array.isArray(data.questions) ? data.questions : [];
      const totalQ = qList.length > 0 ? qList.length : (typeof data.totalQuestions === 'number' ? data.totalQuestions : Number(data.totalQuestions || 0));
      const totalM = typeof data.totalMarks === 'number' && data.totalMarks > 0 ? data.totalMarks : (totalQ > 0 ? totalQ : 0);

      const startTimeStr = safeTimestampToString(data.examDateTime || data.startTime || undefined);
      const archiveTimeStr = safeTimestampToString(data.archiveDateTime || data.archiveTime || undefined);
      const rawDateStr = data.startDate || data.examDate || data.createdAt || data.dateCreated;
      const dateCreatedStr = rawDateStr ? safeDateOnlyString(rawDateStr) : '';

      examDocsMap.set(examId, {
        id: examId,
        title: String(data.title || ''),
        description: String(data.description || ''),
        subject: String(data.subject || data.category || 'BCS'),
        durationMinutes: Number(data.durationMinutes || data.duration || 30),
        totalQuestions: totalQ,
        totalMarks: totalM,
        status: (data.status as any) || 'upcoming',
        isPublished: data.isPublished !== false,
        createdBy: String(data.createdBy || ''),
        questions: qList,
        startTime: startTimeStr || undefined,
        startDate: data.startDate || (startTimeStr ? (startTimeStr.includes('T') ? startTimeStr.split('T')[0] : startTimeStr) : '') || undefined,
        archiveTime: archiveTimeStr || undefined,
        dateCreated: dateCreatedStr,
        isPremium: data.examType === 'premium' || !!data.isPremium,
      });
    });
    emitMergedList();
  }, (err) => {
    console.warn("Firestore error listening to /exam collection:", err);
  });

  const unsubCapitalExam = onSnapshot(capitalExamRef, (snapshot) => {
    capitalDocsMap.clear();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const examId = docSnap.id || data.examId || data.id;
      const qList = Array.isArray(data.questions) ? data.questions : [];
      const totalQ = qList.length > 0 ? qList.length : (typeof data.totalQuestions === 'number' ? data.totalQuestions : Number(data.totalQuestions || 0));
      const totalM = typeof data.totalMarks === 'number' && data.totalMarks > 0 ? data.totalMarks : (totalQ > 0 ? totalQ : 0);

      const startTimeStr = safeTimestampToString(data.examDateTime || data.startTime || undefined);
      const archiveTimeStr = safeTimestampToString(data.archiveDateTime || data.archiveTime || undefined);
      const rawDateStr = data.startDate || data.examDate || data.createdAt || data.dateCreated;
      const dateCreatedStr = rawDateStr ? safeDateOnlyString(rawDateStr) : '';

      capitalDocsMap.set(examId, {
        id: examId,
        examId: examId,
        title: String(data.title || ''),
        description: String(data.description || ''),
        subject: String(data.subject || data.category || 'BCS'),
        durationMinutes: Number(data.durationMinutes || data.duration || 30),
        totalQuestions: totalQ,
        totalMarks: totalM,
        status: (data.status as any) || 'upcoming',
        isPublished: data.isPublished !== false,
        createdBy: String(data.createdBy || ''),
        questions: qList,
        startTime: startTimeStr || undefined,
        startDate: data.startDate || (startTimeStr ? (startTimeStr.includes('T') ? startTimeStr.split('T')[0] : startTimeStr) : '') || undefined,
        archiveTime: archiveTimeStr || undefined,
        archiveDateTime: archiveTimeStr || undefined,
        dateCreated: dateCreatedStr,
        isPremium: data.examType === 'premium' || !!data.isPremium,
      });
    });
    emitMergedList();
  }, (err) => {
    console.warn("Firestore error listening to /Exam collection:", err);
  });

  const unsubLegacy = onSnapshot(examsLegacyRef, (snapshot) => {
    legacyDocsMap.clear();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const examId = docSnap.id || data.id;
      const qList = Array.isArray(data.questions) ? data.questions : [];
      const totalQ = qList.length > 0 ? qList.length : (typeof data.totalQuestions === 'number' ? data.totalQuestions : Number(data.totalQuestions || 0));
      const totalM = typeof data.totalMarks === 'number' && data.totalMarks > 0 ? data.totalMarks : (totalQ > 0 ? totalQ : 0);

      const startTimeStr = safeTimestampToString(data.startTime || data.examDateTime || undefined);
      const archiveTimeStr = safeTimestampToString(data.archiveTime || data.archiveDateTime || undefined);
      const rawDateStr = data.startDate || data.examDate || data.createdAt || data.dateCreated;
      const dateCreatedStr = rawDateStr ? safeDateOnlyString(rawDateStr) : '';

      legacyDocsMap.set(examId, {
        id: examId,
        title: String(data.title || ''),
        description: String(data.description || ''),
        subject: String(data.category || data.subject || 'বাংলা'),
        durationMinutes: Number(data.duration || data.durationMinutes || 10),
        totalQuestions: totalQ,
        totalMarks: totalM,
        status: (data.status as any) || 'upcoming',
        isPublished: data.isPublished !== false,
        createdBy: String(data.createdBy || ''),
        questions: qList,
        startTime: startTimeStr || undefined,
        startDate: data.startDate || (startTimeStr ? (startTimeStr.includes('T') ? startTimeStr.split('T')[0] : startTimeStr) : '') || undefined,
        archiveTime: archiveTimeStr || undefined,
        dateCreated: dateCreatedStr,
        isPremium: !!data.isPremium,
      });
    });
    emitMergedList();
  }, (err) => {
    console.warn("Firestore error listening to /exams collection:", err);
  });

  return () => {
    unsubExam();
    unsubCapitalExam();
    unsubLegacy();
  };
}

/**
 * Fetch a single Upcoming Exam document from /exam/{examId}
 */
export async function getUpcomingExamById(examId: string): Promise<UpcomingExamDoc | null> {
  try {
    const examDoc = await getDoc(doc(db, 'exam', examId));
    if (examDoc.exists()) {
      const data = examDoc.data();
      return {
        examId: examDoc.id,
        title: data.title || '',
        description: data.description || '',
        examDateTime: data.examDateTime || data.startTime || '',
        archiveDateTime: data.archiveDateTime || data.archiveTime || '',
        examDate: data.examDate || '',
        archiveDate: data.archiveDate || '',
        examType: data.examType || (data.isPremium ? 'premium' : 'free'),
        status: data.status || 'upcoming',
        isPublished: data.isPublished !== false,
        createdBy: data.createdBy || '',
        duration: Number(data.duration || data.durationMinutes || 30),
        durationMinutes: Number(data.durationMinutes || data.duration || 30),
        subject: data.subject || 'BCS',
        totalQuestions: Number(data.totalQuestions || 0),
        totalMarks: Number(data.totalMarks || 0),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }
    return null;
  } catch (err) {
    console.warn(`Error fetching /exam/${examId}:`, err);
    return null;
  }
}

/**
 * Clear or Remove Upcoming Exam banner settings from Firestore
 */
export async function clearUpcomingExamSettings(examIdToClear?: string, examTitleToClear?: string): Promise<void> {
  try {
    const docRef = doc(db, 'siteSettings', 'upcomingExam');
    const cleanId = (examIdToClear || '').trim();
    const cleanTitle = (examTitleToClear || '').trim().toLowerCase();

    const isMatch = (it: any) => {
      if (!it) return false;
      if (cleanId && (it.examId === cleanId || it.id === cleanId)) return true;
      if (cleanTitle && it.title && it.title.trim().toLowerCase() === cleanTitle) return true;
      return false;
    };

    if (cleanId || cleanTitle) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        let items: any[] = Array.isArray(data.items) ? [...data.items] : [];
        if (items.length > 0) {
          items = items.filter(it => !isMatch(it));
          if (items.length > 0) {
            const nextPrimary = items.find(it => it.isPublished !== false) || items[0];
            await setDoc(docRef, {
              title: nextPrimary.title,
              description: nextPrimary.description || '',
              examId: nextPrimary.examId || nextPrimary.id || '',
              examDate: nextPrimary.examDate || '',
              startDate: nextPrimary.startDate || '',
              startTime: nextPrimary.startTime || '',
              archiveTime: nextPrimary.archiveTime || '',
              duration: nextPrimary.duration || 30,
              durationMinutes: nextPrimary.durationMinutes || 30,
              isPublished: nextPrimary.isPublished !== false,
              subject: nextPrimary.subject || 'BCS',
              totalQuestions: nextPrimary.totalQuestions || 0,
              totalMarks: nextPrimary.totalMarks || 0,
              isPremium: !!nextPrimary.isPremium,
              updatedAt: serverTimestamp(),
              lastUpdated: new Date().toISOString(),
              items: items,
            });
            if (cleanId) {
              try {
                await deleteDoc(doc(db, 'siteSettings', `upcomingExam_${cleanId}`));
              } catch (e) {}
            }
            return;
          }
        }
        if (data.examId && !isMatch(data)) {
          // It's referencing a different upcoming exam, keep it intact
          return;
        }
      }
    }
    await deleteDoc(docRef);
    if (cleanId) {
      try {
        await deleteDoc(doc(db, 'siteSettings', `upcomingExam_${cleanId}`));
      } catch (e) {}
    }
    try {
      localStorage.removeItem('cached_upcoming_exam_settings');
    } catch (e) {}
  } catch (err) {
    console.warn("Notice: Error removing siteSettings/upcomingExam:", err);
  }
}

/**
 * Update an Upcoming Exam in /exam/{examId}
 */
export async function updateUpcomingExamInFirestore(
  examId: string,
  updates: Partial<UpcomingExamDoc> & { questions?: Question[]; startDate?: string; startTime?: string }
): Promise<void> {
  try {
    const examRef = doc(db, 'exam', examId);
    const rawDateTime = updates.examDateTime !== undefined ? updates.examDateTime : updates.startTime;
    const examDateTime = rawDateTime !== undefined ? (rawDateTime ? rawDateTime.trim() : '') : undefined;
    const startDate = examDateTime !== undefined ? (examDateTime ? (examDateTime.includes('T') ? examDateTime.split('T')[0] : examDateTime) : '') : (updates.startDate !== undefined ? updates.startDate : undefined);

    const payload: any = {
      ...updates,
      ...(examDateTime !== undefined && { examDateTime, startTime: examDateTime, startDate, examDate: startDate }),
      updatedAt: serverTimestamp(),
    };
    await setDoc(examRef, payload, { merge: true });

    // Also update /Exam/{examId}
    const capitalExamRef = doc(db, 'Exam', examId);
    const capitalUpdates: any = { updatedAt: serverTimestamp() };
    if (updates.title) capitalUpdates.title = updates.title;
    if (updates.description !== undefined) capitalUpdates.description = updates.description;
    if (updates.examType) capitalUpdates.examType = updates.examType;
    if (updates.durationMinutes || updates.duration) capitalUpdates.duration = updates.durationMinutes || updates.duration;
    if (updates.status) capitalUpdates.status = updates.status;
    if (updates.totalQuestions !== undefined) capitalUpdates.totalQuestions = updates.totalQuestions;
    if (updates.totalMarks !== undefined) capitalUpdates.totalMarks = updates.totalMarks;
    if (updates.questions !== undefined) capitalUpdates.questions = updates.questions;
    if (examDateTime !== undefined) {
      capitalUpdates.examDateTime = examDateTime;
      capitalUpdates.startTime = examDateTime;
      capitalUpdates.startDate = startDate;
      capitalUpdates.examDate = startDate;
    }
    await setDoc(capitalExamRef, capitalUpdates, { merge: true });

    // Also sync /exams/{examId}
    const legacyRef = doc(db, 'exams', examId);
    await setDoc(legacyRef, {
      ...(updates.title && { title: updates.title }),
      ...(updates.subject && { subject: updates.subject, category: updates.subject }),
      ...(updates.status && { status: updates.status }),
      ...(updates.isPublished !== undefined && { isPublished: updates.isPublished }),
      ...(updates.examType && { isPremium: updates.examType === 'premium' }),
      ...(examDateTime !== undefined && { startTime: examDateTime, startDate: startDate, examDateTime: examDateTime, examDate: startDate }),
      ...(updates.archiveDateTime && { archiveTime: updates.archiveDateTime, archiveDateTime: updates.archiveDateTime }),
      ...(updates.totalQuestions !== undefined && { totalQuestions: updates.totalQuestions }),
      ...(updates.totalMarks !== undefined && { totalMarks: updates.totalMarks }),
      ...(updates.questions !== undefined && { questions: updates.questions }),
    }, { merge: true });

    // If exam is live or archived, clear upcoming site settings if matching
    if (updates.status === 'live' || updates.status === 'archive' || updates.status === 'completed') {
      await clearUpcomingExamSettings(examId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `exam/${examId}`);
    throw err;
  }
}

/**
 * Delete Upcoming Exam from /exam, /Exam, /exams, /questions, and subcollections.
 * Searches and removes by examId AND by title to ensure complete Firestore deletion.
 */
export async function deleteUpcomingExamFromFirestore(examId: string, examTitle?: string): Promise<void> {
  const cleanId = (examId || '').trim();
  const cleanTitle = (examTitle || '').trim().toLowerCase();
  const idsToDelete = new Set<string>();
  if (cleanId) idsToDelete.add(cleanId);

  const checkDoc = (docSnap: any) => {
    const data = docSnap.data();
    const docId = docSnap.id;
    const docExamId = (data?.examId || data?.id || '').trim();
    const docTitle = (data?.title || '').trim().toLowerCase();

    if (
      (cleanId && (docId === cleanId || docExamId === cleanId)) ||
      (cleanTitle && docTitle === cleanTitle) ||
      (cleanTitle && docTitle && (docTitle.includes(cleanTitle) || cleanTitle.includes(docTitle)))
    ) {
      idsToDelete.add(docId);
      if (docExamId) idsToDelete.add(docExamId);
    }
  };

  try {
    const snap1 = await getDocs(collection(db, 'exam'));
    snap1.forEach(checkDoc);
  } catch (e) {}

  try {
    const snap2 = await getDocs(collection(db, 'Exam'));
    snap2.forEach(checkDoc);
  } catch (e) {}

  try {
    const snap3 = await getDocs(collection(db, 'exams'));
    snap3.forEach(checkDoc);
  } catch (e) {}

  // For every identified doc id, remove from /Exam (with subquestions), /exam, /exams, and /questions
  for (const id of Array.from(idsToDelete)) {
    try {
      // 1. Delete /Exam/{id}/questions subcollection
      const subQSnap = await getDocs(collection(db, 'Exam', id, 'questions'));
      const subQDeletes = subQSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(subQDeletes);
    } catch (e) {}

    try {
      // 2. Delete /Exam/{id}
      await deleteDoc(doc(db, 'Exam', id));
    } catch (e) {}

    try {
      // 3. Delete /exam/{id}
      await deleteDoc(doc(db, 'exam', id));
    } catch (e) {}

    try {
      // 4. Delete legacy /exams/{id} and /questions
      await deleteExamFromFirestore(id);
    } catch (e) {}

    try {
      // 5. Delete individual siteSettings doc if exists
      await deleteDoc(doc(db, 'siteSettings', `upcomingExam_${id}`));
    } catch (e) {}
  }

  // Also clean up siteSettings/upcomingExam
  try {
    await deleteUpcomingExamFromSiteSettings(cleanId, examTitle);
  } catch (e) {}
}

// ==========================================
// 2. DEDICATED /Exam & QUESTIONS SUBCOLLECTION
// ==========================================

/**
 * Save a Question into /Exam/{examId}/questions/{questionId}
 */
export async function saveQuestionToExamContent(
  examId: string,
  q: Partial<ExamQuestionDoc> | Question,
  questionNum?: number
): Promise<void> {
  const qId = (q as any).id || (q as any).questionId || `q-${examId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const qRef = doc(db, 'Exam', examId, 'questions', qId);

  let optA = '';
  let optB = '';
  let optC = '';
  let optD = '';
  let correctLetter = 'A';
  let questionText = '';
  let explanation = '';
  let marks = 1;

  if ('options' in q && Array.isArray(q.options)) {
    optA = q.options[0] || '';
    optB = q.options[1] || '';
    optC = q.options[2] || '';
    optD = q.options[3] || '';
    correctLetter = q.correctAnswer === 0 ? 'A' : q.correctAnswer === 1 ? 'B' : q.correctAnswer === 2 ? 'C' : 'D';
    questionText = q.text || '';
    explanation = q.explanation || '';
  } else {
    const qDoc = q as ExamQuestionDoc;
    optA = qDoc.optionA || '';
    optB = qDoc.optionB || '';
    optC = qDoc.optionC || '';
    optD = qDoc.optionD || '';
    correctLetter = (qDoc.correctAnswer || 'A').toUpperCase();
    questionText = qDoc.questionText || '';
    explanation = qDoc.explanation || '';
    marks = Number(qDoc.marks || 1);
  }

  const payload: any = {
    questionId: qId,
    questionNumber: questionNum || (q as any).questionNumber || 1,
    questionText: questionText,
    question: questionText,
    optionA: optA,
    optionB: optB,
    optionC: optC,
    optionD: optD,
    options: [optA, optB, optC, optD],
    correctAnswer: correctLetter,
    explanation: explanation,
    marks: marks,
    updatedAt: serverTimestamp(),
  };

  // Check if exists
  try {
    const existingSnap = await getDoc(qRef);
    if (!existingSnap.exists()) {
      payload.createdAt = serverTimestamp();
    }
  } catch (e) {}

  try {
    await setDoc(qRef, payload, { merge: true });

    // 2. Also sync to legacy /questions collection
    await saveQuestionToFirestore({
      id: qId,
      text: questionText,
      options: [optA, optB, optC, optD],
      correctAnswer: correctLetter === 'A' ? 0 : correctLetter === 'B' ? 1 : correctLetter === 'C' ? 2 : 3,
      explanation: explanation,
      questionNumber: questionNum || (q as any).questionNumber || 1,
      subject: (q as any).subject || '',
    }, examId, questionNum);

    // 3. Recalculate and fetch all current questions in this exam
    const qSnap = await getDocs(collection(db, 'Exam', examId, 'questions'));
    const allQuestions: Question[] = [];
    qSnap.forEach(docSnap => {
      allQuestions.push(mapFirestoreDocToQuestion(docSnap));
    });
    allQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    const count = allQuestions.length;

    // 4. Update /Exam/{examId}
    await setDoc(doc(db, 'Exam', examId), {
      totalQuestions: count,
      totalMarks: count,
      questions: allQuestions,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 5. Update /exam/{examId}
    await setDoc(doc(db, 'exam', examId), {
      totalQuestions: count,
      totalMarks: count,
      questions: allQuestions,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 6. Update /exams/{examId} legacy collection
    await setDoc(doc(db, 'exams', examId), {
      totalQuestions: count,
      totalMarks: count,
      questions: allQuestions,
    }, { merge: true });

    // 7. Update siteSettings/upcomingExam if referencing this exam
    try {
      const siteSettingsRef = doc(db, 'siteSettings', 'upcomingExam');
      const siteSnap = await getDoc(siteSettingsRef);
      if (siteSnap.exists()) {
        const siteData = siteSnap.data();
        let itemsUpdated = false;
        let newItems = siteData.items;
        if (Array.isArray(siteData.items)) {
          newItems = siteData.items.map((it: any) => {
            if (it.id === examId || it.examId === examId) {
              itemsUpdated = true;
              return { ...it, totalQuestions: count, totalMarks: count };
            }
            return it;
          });
        }
        await setDoc(siteSettingsRef, {
          ...(siteData.examId === examId ? { totalQuestions: count, totalMarks: count } : {}),
          ...(itemsUpdated ? { items: newItems } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {}
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `Exam/${examId}/questions/${qId}`);
    throw err;
  }
}

/**
 * Delete Question from /Exam/{examId}/questions/{questionId}
 */
export async function deleteQuestionFromExamContent(examId: string, questionId: string, questionText?: string): Promise<void> {
  try {
    // 1. Direct delete from subcollection
    if (questionId) {
      try {
        await deleteDoc(doc(db, 'Exam', examId, 'questions', questionId));
      } catch (e) {
        console.warn("Direct subcollection question doc delete error:", e);
      }
    }

    // 2. Scan subcollection in case doc ID differs from questionId
    try {
      const qSnap = await getDocs(collection(db, 'Exam', examId, 'questions'));
      for (const qDoc of qSnap.docs) {
        const d = qDoc.data();
        if (
          qDoc.id === questionId ||
          d.questionId === questionId ||
          d.id === questionId ||
          (questionText && (d.question === questionText || d.questionText === questionText || d.text === questionText))
        ) {
          await deleteDoc(doc(db, 'Exam', examId, 'questions', qDoc.id));
        }
      }
    } catch (e) {
      console.warn("Error scanning Exam subcollection for delete:", e);
    }

    // 3. Also delete from legacy questions collection
    await deleteQuestionFromFirestore(questionId, examId, questionText);

    // 4. Recalculate remaining questions and count
    let count = 0;
    const remainingQuestions: Question[] = [];
    try {
      const remainingSnap = await getDocs(collection(db, 'Exam', examId, 'questions'));
      remainingSnap.forEach(docSnap => {
        remainingQuestions.push(mapFirestoreDocToQuestion(docSnap));
      });
      remainingQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
      count = remainingQuestions.length;
    } catch (e) {}

    // 5. Update counts and question array across all exam collection mirrors
    try {
      await setDoc(doc(db, 'Exam', examId), {
        totalQuestions: count,
        totalMarks: count,
        questions: remainingQuestions,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {}

    try {
      await setDoc(doc(db, 'exam', examId), {
        totalQuestions: count,
        totalMarks: count,
        questions: remainingQuestions,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {}

    try {
      await setDoc(doc(db, 'exams', examId), {
        totalQuestions: count,
        totalMarks: count,
        questions: remainingQuestions,
      }, { merge: true });
    } catch (e) {}

    try {
      const siteSettingsRef = doc(db, 'siteSettings', 'upcomingExam');
      const siteSnap = await getDoc(siteSettingsRef);
      if (siteSnap.exists()) {
        const siteData = siteSnap.data();
        if (siteData.examId === examId) {
          await setDoc(siteSettingsRef, {
            totalQuestions: count,
            totalMarks: count,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
    } catch (e) {}

  } catch (err) {
    console.error(`Failed to delete question ${questionId} from Exam/${examId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `Exam/${examId}/questions/${questionId}`);
    throw err;
  }
}

/**
 * Subscribe to questions for an exam from /Exam/{examId}/questions (with fallback to /questions)
 */
export function subscribeToExamQuestions(examId: string, callback: (questions: Question[]) => void): Unsubscribe {
  const subQRef = collection(db, 'Exam', examId, 'questions');
  
  return onSnapshot(subQRef, (snapshot) => {
    if (!snapshot.empty) {
      const list: Question[] = [];
      snapshot.forEach((docSnap) => {
        list.push(mapFirestoreDocToQuestion(docSnap));
      });
      list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
      callback(list);
    } else {
      // Fallback to legacy /questions query
      const legacyQuery = query(collection(db, 'questions'), where('examId', '==', examId));
      getDocs(legacyQuery).then((lSnap) => {
        const list: Question[] = [];
        lSnap.forEach((docSnap) => {
          list.push(mapFirestoreDocToQuestion(docSnap));
        });
        list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
        callback(list);
      }).catch((e) => {
        console.warn("Legacy question query error:", e);
      });
    }
  }, (err) => {
    console.warn(`Firestore error listening to /Exam/${examId}/questions:`, err);
  });
}

// ==========================================
// 3. LEGACY EXAM & QUESTIONS WRAPPERS
// ==========================================

// Save or Update Exam in Firestore
export async function saveExamToFirestore(exam: Exam, createdByUid: string = 'admin'): Promise<void> {
  const cleanStartTime = (exam.startTime && exam.startTime.trim() !== 'নির্ধারিত নেই' && exam.startTime.trim() !== exam.dateCreated) 
    ? exam.startTime.trim() 
    : '';
  const cleanStartDate = (exam.startDate && exam.startDate.trim() !== 'নির্ধারিত নেই' && exam.startDate.trim() !== exam.dateCreated) 
    ? exam.startDate.trim() 
    : (cleanStartTime ? (cleanStartTime.includes('T') ? cleanStartTime.split('T')[0] : cleanStartTime) : '');
  const cleanExamDate = ((exam as any).examDate && (exam as any).examDate.trim() !== 'নির্ধারিত নেই' && (exam as any).examDate.trim() !== exam.dateCreated) 
    ? (exam as any).examDate.trim() 
    : cleanStartDate;

  // Delegate to saveUpcomingExamScheduleToFirestore
  await saveUpcomingExamScheduleToFirestore({
    examId: exam.id,
    title: exam.title,
    description: (exam as any).description || '',
    examDateTime: cleanStartTime || '',
    archiveDateTime: exam.archiveTime || '',
    examDate: cleanExamDate || '',
    startDate: cleanStartDate || '',
    archiveDate: exam.archiveTime ? exam.archiveTime.split('T')[0] : '',
    examType: exam.isPremium ? 'premium' : 'free',
    status: exam.status,
    isPublished: exam.isPublished !== false,
    durationMinutes: exam.durationMinutes,
    duration: exam.durationMinutes,
    subject: exam.subject,
    totalQuestions: exam.totalQuestions,
    totalMarks: exam.totalMarks,
    questions: exam.questions,
    createdBy: exam.createdBy || createdByUid,
  }, createdByUid);
}

// Toggle Exam Published State in Firestore
export async function toggleExamPublishInFirestore(examId: string, currentPublished: boolean): Promise<void> {
  try {
    await updateUpcomingExamInFirestore(examId, { isPublished: !currentPublished });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `exam/${examId}`);
  }
}

/**
 * Update an Exam's status ('live', 'archive') and optionally its archiveDateTime in Firestore.
 * Synchronizes across /Exam/{examId}, /exam/{examId}, and legacy /exams/{examId}.
 */
export async function updateExamArchiveStatus(
  examId: string,
  status: 'live' | 'archive' | 'upcoming' | string,
  archiveDateTime?: string
): Promise<void> {
  try {
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (archiveDateTime !== undefined) {
      updates.archiveDateTime = archiveDateTime;
      updates.archiveTime = archiveDateTime;
      updates.archiveDate = archiveDateTime ? archiveDateTime.split('T')[0] : '';
    }

    // 1. Update /Exam/{examId} (authoritative container)
    await setDoc(doc(db, 'Exam', examId), updates, { merge: true });

    // 2. Update /exam/{examId}
    await setDoc(doc(db, 'exam', examId), updates, { merge: true });

    // 3. Update legacy /exams/{examId}
    await setDoc(doc(db, 'exams', examId), {
      status,
      ...(archiveDateTime !== undefined && { archiveTime: archiveDateTime }),
    }, { merge: true });

    // 4. If status is 'archive', clear from upcoming siteSettings if matching
    if (status === 'archive' || status === 'archived') {
      await clearUpcomingExamSettings(examId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `Exam/${examId}`);
    throw err;
  }
}

/**
 * Moves an exam back to 'upcoming' status across /Exam, /exam, and /exams
 * and synchronizes it into siteSettings/upcomingExam items so it is fully managed as an upcoming exam.
 */
export async function updateExamToUpcoming(examId: string, examData?: Partial<Exam>): Promise<void> {
  await updateExamArchiveStatus(examId, 'upcoming');
  if (examData) {
    try {
      await saveUpcomingExamSettings({
        examId: examId,
        title: examData.title || '',
        description: examData.description || '',
        subject: examData.subject || 'BCS',
        durationMinutes: examData.durationMinutes || 30,
        duration: examData.durationMinutes || 30,
        isPublished: examData.isPublished !== false,
        isPremium: !!examData.isPremium,
        totalQuestions: examData.totalQuestions || examData.questions?.length || 0,
        totalMarks: examData.totalMarks || examData.questions?.length || 0,
        startTime: examData.startTime || '',
        startDate: examData.startDate || '',
        examDate: (examData as any).examDate || examData.startDate || '',
        archiveTime: examData.archiveTime || '',
      });
    } catch (err) {
      console.warn("Could not sync to upcoming settings:", err);
    }
  }
}

/**
 * Update Exam archive date/time across /Exam, /exam, and /exams
 */
export async function updateExamArchiveDateTime(
  examId: string,
  archiveDateTime: string
): Promise<void> {
  try {
    const payload = {
      archiveDateTime,
      archiveTime: archiveDateTime,
      archiveDate: archiveDateTime ? archiveDateTime.split('T')[0] : '',
      updatedAt: serverTimestamp(),
    };

    // 1. Update /Exam/{examId}
    await setDoc(doc(db, 'Exam', examId), payload, { merge: true });

    // 2. Update /exam/{examId}
    await setDoc(doc(db, 'exam', examId), payload, { merge: true });

    // 3. Update legacy /exams/{examId}
    await setDoc(doc(db, 'exams', examId), {
      archiveTime: archiveDateTime,
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `Exam/${examId}`);
    throw err;
  }
}

/**
 * Permanently delete an Exam and its associated questions from Firestore.
 * Deletes from /Exam/{examId} + subcollection /questions, /exam/{examId}, legacy /exams/{examId} & /questions.
 * Strictly preserves users, results, payments, and site settings.
 */
export async function deleteExamPermanently(examId: string): Promise<void> {
  try {
    // 1. Delete /Exam/{examId}/questions subcollection
    const subQSnap = await getDocs(collection(db, 'Exam', examId, 'questions'));
    const subQDeletes = subQSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(subQDeletes);

    // 2. Delete /Exam/{examId}
    await deleteDoc(doc(db, 'Exam', examId));

    // 3. Delete /exam/{examId}
    await deleteDoc(doc(db, 'exam', examId));

    // 4. Delete legacy /exams/{examId} and legacy /questions
    await deleteExamFromFirestore(examId);

    // 5. Clean up siteSettings if this exam was in upcoming settings
    await clearUpcomingExamSettings(examId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `Exam/${examId}`);
    throw err;
  }
}

// Delete Exam and its associated Questions from Firestore
export async function deleteExamFromFirestore(examId: string): Promise<void> {
  try {
    // 1. Delete questions associated with examId in legacy /questions
    const qQuery = query(collection(db, 'questions'), where('examId', '==', examId));
    const qSnapshot = await getDocs(qQuery);
    const deletePromises = qSnapshot.docs.map(qDoc => deleteDoc(doc(db, 'questions', qDoc.id)));
    await Promise.all(deletePromises);

    // 2. Delete /exams document
    await deleteDoc(doc(db, 'exams', examId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `exams/${examId}`);
  }
}

// Subscribe to questions for a specific examId from Firestore
export function subscribeToQuestionsByExamId(examId: string, callback: (questions: Question[]) => void): Unsubscribe {
  return subscribeToExamQuestions(examId, callback);
}

/**
 * Fetch a single random question from the Firebase database to encourage daily user engagement.
 * Can be seeded by a date string (e.g. 'YYYY-MM-DD') for daily consistency, or unseeded for next/random challenge.
 */
export async function fetchDailyChallengeQuestion(seedDate?: string): Promise<{ question: Question; sourceExamTitle?: string } | null> {
  try {
    const qCol = collection(db, 'questions');
    const qSnap = await getDocs(qCol);

    const allQuestions: Array<{ q: Question; examId?: string; subject?: string }> = [];

    if (!qSnap.empty) {
      qSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const mapped = mapFirestoreDocToQuestion(docSnap);
        const validOptions = mapped.options ? mapped.options.filter(o => o && o.trim()) : [];
        if (mapped.text && mapped.text.trim() && validOptions.length >= 2) {
          allQuestions.push({
            q: { ...mapped, options: validOptions },
            examId: data.examId,
            subject: data.subject || mapped.subject
          });
        }
      });
    }

    // Fallback: If root questions is empty, try /Exam subcollections
    if (allQuestions.length === 0) {
      const examSnap = await getDocs(collection(db, 'Exam'));
      for (const examDoc of examSnap.docs) {
        const subSnap = await getDocs(collection(db, 'Exam', examDoc.id, 'questions'));
        subSnap.forEach((subDoc) => {
          const mapped = mapFirestoreDocToQuestion(subDoc);
          const validOptions = mapped.options ? mapped.options.filter(o => o && o.trim()) : [];
          if (mapped.text && mapped.text.trim() && validOptions.length >= 2) {
            allQuestions.push({
              q: { ...mapped, options: validOptions },
              examId: examDoc.id,
              subject: mapped.subject
            });
          }
        });
        if (allQuestions.length >= 25) break;
      }
    }

    if (allQuestions.length === 0) {
      return null;
    }

    // Deterministic selection based on seedDate, or random
    let selectedItem: { q: Question; examId?: string; subject?: string };
    if (seedDate) {
      let hash = 0;
      for (let i = 0; i < seedDate.length; i++) {
        hash = (hash * 31 + seedDate.charCodeAt(i)) & 0xffffffff;
      }
      const index = Math.abs(hash) % allQuestions.length;
      selectedItem = allQuestions[index];
    } else {
      const index = Math.floor(Math.random() * allQuestions.length);
      selectedItem = allQuestions[index];
    }

    // Resolve source exam title and subject if available
    let sourceExamTitle: string | undefined = undefined;
    if (selectedItem.examId) {
      try {
        const eDoc = await getDoc(doc(db, 'Exam', selectedItem.examId));
        if (eDoc.exists()) {
          sourceExamTitle = eDoc.data()?.title;
          if (!selectedItem.q.subject && eDoc.data()?.subject) {
            selectedItem.q.subject = eDoc.data()?.subject;
          }
        } else {
          const eDoc2 = await getDoc(doc(db, 'exams', selectedItem.examId));
          if (eDoc2.exists()) {
            sourceExamTitle = eDoc2.data()?.title;
            if (!selectedItem.q.subject && eDoc2.data()?.subject) {
              selectedItem.q.subject = eDoc2.data()?.subject;
            }
          }
        }
      } catch {
        // Non-blocking
      }
    }

    // If subject is still empty, infer from title
    if (!selectedItem.q.subject && sourceExamTitle) {
      const t = sourceExamTitle.toLowerCase();
      if (t.includes('বাংলা')) selectedItem.q.subject = 'বাংলা';
      else if (t.includes('english') || t.includes('ইংরেজি')) selectedItem.q.subject = 'ইংরেজি';
      else if (t.includes('গণিত') || t.includes('math')) selectedItem.q.subject = 'গণিত';
      else if (t.includes('জ্ঞান') || t.includes('মুক্তিযুদ্ধ') || t.includes('gk')) selectedItem.q.subject = 'সাধারণ জ্ঞান';
      else if (t.includes('সমাজসেবা') || t.includes('অফিস সহায়ক')) selectedItem.q.subject = 'চাকরি প্রস্তুতি';
      else selectedItem.q.subject = 'বিসিএস ও চাকরি পরীক্ষা';
    } else if (!selectedItem.q.subject) {
      selectedItem.q.subject = 'বিসিএস ও চাকরি পরীক্ষা';
    }

    return {
      question: selectedItem.q,
      sourceExamTitle
    };
  } catch (err) {
    console.error('Error in fetchDailyChallengeQuestion from Firestore:', err);
    return null;
  }
}

// Save single Question to Firestore questions collection
export async function saveQuestionToFirestore(q: Question, examId: string, questionNum?: number): Promise<void> {
  const qId = q.id || `q-${examId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const qRef = doc(db, 'questions', qId);

  const optA = q.options?.[0] || '';
  const optB = q.options?.[1] || '';
  const optC = q.options?.[2] || '';
  const optD = q.options?.[3] || '';

  const correctLetter = q.correctAnswer === 0 ? 'A' : q.correctAnswer === 1 ? 'B' : q.correctAnswer === 2 ? 'C' : 'D';

  const payload = {
    id: qId,
    examId: examId,
    questionText: q.text,
    text: q.text,
    optionA: optA,
    optionB: optB,
    optionC: optC,
    optionD: optD,
    options: [optA, optB, optC, optD],
    correctAnswer: correctLetter,
    correctAnswerIndex: q.correctAnswer,
    explanation: q.explanation || '',
    questionNumber: questionNum || q.questionNumber || 1,
    subject: q.subject || '',
  };

  try {
    await setDoc(qRef, payload, { merge: true });

    // Update totalQuestions on the exam document
    const qCountQuery = query(collection(db, 'questions'), where('examId', '==', examId));
    const qCountSnap = await getDocs(qCountQuery);
    const count = qCountSnap.size;

    await setDoc(doc(db, 'exams', examId), {
      totalQuestions: count,
      totalMarks: count
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `questions/${qId}`);
  }
}

// Delete single Question from Firestore
export async function deleteQuestionFromFirestore(questionId: string, examId: string, questionText?: string): Promise<void> {
  try {
    if (questionId) {
      try {
        await deleteDoc(doc(db, 'questions', questionId));
      } catch (e) {}
    }

    // Also scan legacy questions by examId in case document ID was auto-generated
    try {
      const qQuery = query(collection(db, 'questions'), where('examId', '==', examId));
      const qSnap = await getDocs(qQuery);
      for (const qDoc of qSnap.docs) {
        const d = qDoc.data();
        if (
          qDoc.id === questionId ||
          d.id === questionId ||
          d.questionId === questionId ||
          (questionText && (d.questionText === questionText || d.text === questionText || d.question === questionText))
        ) {
          await deleteDoc(doc(db, 'questions', qDoc.id));
        }
      }
    } catch (e) {}

    // Update totalQuestions on exam document
    const qCountQuery = query(collection(db, 'questions'), where('examId', '==', examId));
    const qCountSnap = await getDocs(qCountQuery);
    const count = qCountSnap.size;

    await setDoc(doc(db, 'exams', examId), {
      totalQuestions: count,
      totalMarks: count
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questions/${questionId}`);
  }
}

// Save Exam Result to Firestore
export async function saveResultToFirestore(result: ExamResult): Promise<void> {
  const resultRef = doc(db, 'results', result.id);
  const payload = {
    id: result.id,
    userId: result.userId || result.studentId || 'guest',
    studentId: result.studentId || result.userId || 'guest',
    studentName: result.studentName || 'ইউজার',
    studentEmail: result.studentEmail || '',
    examId: result.examId,
    examTitle: result.examTitle,
    subject: result.subject || '',
    score: Number(result.score || 0),
    totalMarks: Number(result.totalMarks || 0),
    percentage: Number(result.percentage || 0),
    totalQuestions: Number(result.totalQuestions || 0),
    correctAnswers: Number(result.correctAnswers || 0),
    wrongAnswers: Number(result.wrongAnswers || 0),
    skippedAnswers: Number(result.skippedAnswers || 0),
    unansweredQuestions: Number(result.unansweredQuestions || 0),
    submittedAt: result.submittedAt || new Date().toISOString(),
    dateTaken: result.dateTaken || new Date().toLocaleDateString('bn-BD'),
    timeSpentSeconds: Number(result.timeSpentSeconds || 0),
    subjectPerformance: result.subjectPerformance || {},
  };

  try {
    await setDoc(resultRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `results/${result.id}`);
  }
}

// Subscribe to Upcoming Exam settings document in Firestore (siteSettings/upcomingExam)
export function subscribeToUpcomingExamSettings(callback: (settings: UpcomingExamSettings | null) => void): Unsubscribe {
  const docRef = doc(db, 'siteSettings', 'upcomingExam');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let formattedUpdatedAt = '';
        if (data.updatedAt) {
          if (typeof data.updatedAt.toDate === 'function') {
            formattedUpdatedAt = data.updatedAt.toDate().toISOString();
          } else if (typeof data.updatedAt === 'string') {
            formattedUpdatedAt = data.updatedAt;
          }
        }

        // CRITICAL: startTime must ONLY come from data.startTime. Never fall back to startDate or examDate!
        const startTime = (data.startTime && typeof data.startTime === 'string' && data.startTime.trim() !== 'নির্ধারিত নেই') ? data.startTime.trim() : '';
        const startDate = (data.startDate && typeof data.startDate === 'string' && data.startDate.trim() !== 'নির্ধারিত নেই') ? data.startDate.trim() : '';
        const examDate = (data.examDate && typeof data.examDate === 'string' && data.examDate.trim() !== 'নির্ধারিত নেই') ? data.examDate.trim() : startDate;

        // Parse multiple upcoming exams from items array if present
        let parsedItems: UpcomingExamSettings[] | undefined = undefined;
        if (Array.isArray(data.items)) {
          parsedItems = data.items.map((it: any) => {
            const itStart = (it.startTime && typeof it.startTime === 'string' && it.startTime.trim() !== 'নির্ধারিত নেই') ? it.startTime.trim() : '';
            const itDate = (it.startDate && typeof it.startDate === 'string' && it.startDate.trim() !== 'নির্ধারিত নেই') 
              ? it.startDate.trim() 
              : ((it.examDate && typeof it.examDate === 'string' && it.examDate.trim() !== 'নির্ধারিত নেই') ? it.examDate.trim() : '');
            return {
              id: it.id || it.examId || '',
              examId: it.examId || it.id || '',
              title: it.title || '',
              description: it.description || '',
              subject: it.subject || 'BCS',
              duration: Number(it.duration || it.durationMinutes || 30),
              durationMinutes: Number(it.durationMinutes || it.duration || 30),
              startTime: itStart,
              startDate: itDate,
              examDate: itDate,
              archiveTime: it.archiveTime || '',
              isPublished: it.isPublished !== false,
              isPremium: !!it.isPremium,
              totalQuestions: Number(it.totalQuestions || 0),
              totalMarks: Number(it.totalMarks || 0),
              updatedBy: it.updatedBy || '',
              updatedAt: it.updatedAt || '',
              lastUpdated: it.lastUpdated || '',
            };
          });
        }

        const settingsObj: UpcomingExamSettings = {
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          examId: data.examId || '',
          examDate: examDate,
          startDate: startDate,
          startTime: startTime,
          archiveTime: data.archiveTime || '',
          duration: Number(data.duration || data.durationMinutes || 15),
          durationMinutes: Number(data.durationMinutes || data.duration || 15),
          isPublished: data.isPublished !== false,
          subject: data.subject || 'BCS',
          totalQuestions: Number(data.totalQuestions || 0),
          totalMarks: Number(data.totalMarks || 0),
          isPremium: !!data.isPremium,
          updatedBy: data.updatedBy || '',
          updatedAt: formattedUpdatedAt || data.lastUpdated || '',
          lastUpdated: data.lastUpdated || formattedUpdatedAt || '',
          items: parsedItems,
        };
        try {
          localStorage.setItem('cached_upcoming_exam_settings', JSON.stringify(settingsObj));
        } catch (e) {}
        callback(settingsObj);
      } else {
        // Document does not exist in Firestore
        callback(null);
      }
    },
    (err) => {
      console.warn("Firestore error listening to siteSettings/upcomingExam:", err);
      const cached = localStorage.getItem('cached_upcoming_exam_settings');
      if (cached) {
        try {
          callback(JSON.parse(cached));
        } catch (e) {}
      }
    }
  );
}

// Get single Upcoming Exam settings snapshot from Firestore
export async function getUpcomingExamSettings(): Promise<UpcomingExamSettings | null> {
  try {
    const docRef = doc(db, 'siteSettings', 'upcomingExam');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let formattedUpdatedAt = '';
      if (data.updatedAt) {
        if (typeof data.updatedAt.toDate === 'function') {
          formattedUpdatedAt = data.updatedAt.toDate().toISOString();
        } else if (typeof data.updatedAt === 'string') {
          formattedUpdatedAt = data.updatedAt;
        }
      }

      // CRITICAL: startTime must ONLY come from data.startTime. Never fall back to startDate or examDate!
      const startTime = (data.startTime && typeof data.startTime === 'string' && data.startTime.trim() !== 'নির্ধারিত নেই') ? data.startTime.trim() : '';
      const startDate = (data.startDate && typeof data.startDate === 'string' && data.startDate.trim() !== 'নির্ধারিত নেই') ? data.startDate.trim() : '';
      const examDate = (data.examDate && typeof data.examDate === 'string' && data.examDate.trim() !== 'নির্ধারিত নেই') ? data.examDate.trim() : startDate;

      let parsedItems: UpcomingExamSettings[] | undefined = undefined;
      if (Array.isArray(data.items)) {
        parsedItems = data.items.map((it: any) => {
          const itStart = (it.startTime && typeof it.startTime === 'string' && it.startTime.trim() !== 'নির্ধারিত নেই') ? it.startTime.trim() : '';
          const itDate = (it.startDate && typeof it.startDate === 'string' && it.startDate.trim() !== 'নির্ধারিত নেই') 
            ? it.startDate.trim() 
            : ((it.examDate && typeof it.examDate === 'string' && it.examDate.trim() !== 'নির্ধারিত নেই') ? it.examDate.trim() : '');
          return {
            id: it.id || it.examId || '',
            examId: it.examId || it.id || '',
            title: it.title || '',
            description: it.description || '',
            subject: it.subject || 'BCS',
            duration: Number(it.duration || it.durationMinutes || 30),
            durationMinutes: Number(it.durationMinutes || it.duration || 30),
            startTime: itStart,
            startDate: itDate,
            examDate: itDate,
            archiveTime: it.archiveTime || '',
            isPublished: it.isPublished !== false,
            isPremium: !!it.isPremium,
            totalQuestions: Number(it.totalQuestions || 0),
            totalMarks: Number(it.totalMarks || 0),
            updatedBy: it.updatedBy || '',
            updatedAt: it.updatedAt || '',
            lastUpdated: it.lastUpdated || '',
          };
        });
      }

      const settingsObj: UpcomingExamSettings = {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        examId: data.examId || '',
        examDate: examDate,
        startDate: startDate,
        startTime: startTime,
        archiveTime: data.archiveTime || '',
        duration: Number(data.duration || data.durationMinutes || 15),
        durationMinutes: Number(data.durationMinutes || data.duration || 15),
        isPublished: data.isPublished !== false,
        subject: data.subject || 'BCS',
        totalQuestions: Number(data.totalQuestions || 0),
        totalMarks: Number(data.totalMarks || 0),
        isPremium: !!data.isPremium,
        updatedBy: data.updatedBy || '',
        updatedAt: formattedUpdatedAt || data.lastUpdated || '',
        lastUpdated: data.lastUpdated || formattedUpdatedAt || '',
        items: parsedItems,
      };
      try {
        localStorage.setItem('cached_upcoming_exam_settings', JSON.stringify(settingsObj));
      } catch (e) {}
      return settingsObj;
    }
    return null;
  } catch (err) {
    console.warn("Error getting siteSettings/upcomingExam from Firestore:", err);
    const cached = localStorage.getItem('cached_upcoming_exam_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  }
}

// Save or Update Upcoming Exam settings in Firestore (siteSettings/upcomingExam & siteSettings collection)
export async function saveUpcomingExamSettings(settings: UpcomingExamSettings, updatedByUid: string = 'admin'): Promise<void> {
  const docRef = doc(db, 'siteSettings', 'upcomingExam');
  const nowIso = new Date().toISOString();
  
  // CRITICAL: startTime must ONLY come from explicit settings.startTime.
  // NEVER fall back to startDate or examDate or creation dates! If admin didn't set a live time, it MUST be empty!
  const rawDateTime = (settings.startTime && typeof settings.startTime === 'string' && settings.startTime.trim() !== 'নির্ধারিত নেই') ? settings.startTime.trim() : '';
  const startTime = rawDateTime ? rawDateTime.trim() : '';
  const startDate = (settings.startDate && typeof settings.startDate === 'string' && settings.startDate.trim() !== 'নির্ধারিত নেই') 
    ? settings.startDate.trim() 
    : (startTime ? (startTime.includes('T') ? startTime.split('T')[0] : startTime) : '');
  const examDate = (settings.examDate && typeof settings.examDate === 'string' && settings.examDate.trim() !== 'নির্ধারিত নেই') 
    ? settings.examDate.trim() 
    : startDate;
  const examId = settings.examId || settings.id || `upcoming-exam-${Date.now()}`;

  const currentItem: UpcomingExamSettings = {
    id: examId,
    examId: examId,
    title: (settings.title || '').trim(),
    description: (settings.description || '').trim(),
    examDate: examDate || '',
    startDate: startDate || '',
    startTime: startTime || '',
    archiveTime: settings.archiveTime || '',
    duration: Number(settings.duration || settings.durationMinutes || 15),
    durationMinutes: Number(settings.durationMinutes || settings.duration || 15),
    isPublished: settings.isPublished !== false,
    subject: settings.subject || 'BCS',
    totalQuestions: Number(settings.totalQuestions || 0),
    totalMarks: Number(settings.totalMarks || 0),
    isPremium: !!settings.isPremium,
    updatedBy: settings.updatedBy || updatedByUid,
    updatedAt: nowIso,
    lastUpdated: nowIso,
  };

  // 1. Fetch existing siteSettings/upcomingExam to preserve and merge all upcoming exams in items list
  let items: UpcomingExamSettings[] = [];
  if (Array.isArray(settings.items) && settings.items.length > 0) {
    items = [...settings.items];
  } else {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const snapData = snap.data();
        if (Array.isArray(snapData.items)) {
          items = snapData.items.map((it: any) => ({ ...it }));
        } else if (snapData.title && snapData.examId && snapData.examId !== examId) {
          items.push({
            id: snapData.examId,
            examId: snapData.examId,
            title: snapData.title,
            description: snapData.description || '',
            subject: snapData.subject || 'BCS',
            duration: Number(snapData.duration || 30),
            durationMinutes: Number(snapData.durationMinutes || snapData.duration || 30),
            startTime: snapData.startTime || '',
            startDate: snapData.startDate || '',
            examDate: snapData.examDate || '',
            archiveTime: snapData.archiveTime || '',
            isPublished: snapData.isPublished !== false,
            isPremium: !!snapData.isPremium,
            totalQuestions: Number(snapData.totalQuestions || 0),
            totalMarks: Number(snapData.totalMarks || 0),
          });
        }
      }
    } catch (e) {
      console.warn("Could not read existing upcomingExam items:", e);
    }
  }

  // Update or append currentItem into items
  const existingIdx = items.findIndex(
    it => (it.examId && it.examId === examId) ||
          (it.id && it.id === examId) ||
          (it.title && currentItem.title && it.title.trim().toLowerCase() === currentItem.title.trim().toLowerCase())
  );
  if (existingIdx >= 0) {
    items[existingIdx] = { ...items[existingIdx], ...currentItem };
  } else {
    items.push(currentItem);
  }

  // Choose the first active/published item as top-level properties for backward compatibility
  const primaryItem = items.find(it => it.isPublished !== false) || currentItem;

  const payload = {
    title: primaryItem.title,
    description: primaryItem.description || '',
    examId: primaryItem.examId || examId,
    examDate: primaryItem.examDate || '',
    startDate: primaryItem.startDate || '',
    startTime: primaryItem.startTime || '',
    archiveTime: primaryItem.archiveTime || '',
    duration: primaryItem.duration || 30,
    durationMinutes: primaryItem.durationMinutes || 30,
    isPublished: primaryItem.isPublished !== false,
    subject: primaryItem.subject || 'BCS',
    totalQuestions: primaryItem.totalQuestions || 0,
    totalMarks: primaryItem.totalMarks || 0,
    isPremium: !!primaryItem.isPremium,
    updatedBy: settings.updatedBy || updatedByUid,
    updatedAt: serverTimestamp(),
    lastUpdated: nowIso,
    items: items,
  };

  try {
    localStorage.setItem('cached_upcoming_exam_settings', JSON.stringify({ ...payload, updatedAt: nowIso }));
  } catch (e) {}

  try {
    // 1. Write unified list in siteSettings/upcomingExam
    await setDoc(docRef, payload, { merge: true });

    // 2. Also write individual document in siteSettings collection: siteSettings/upcomingExam_${examId}
    const individualDocRef = doc(db, 'siteSettings', `upcomingExam_${examId}`);
    await setDoc(individualDocRef, {
      ...currentItem,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'siteSettings/upcomingExam');
  }
}

// Delete an upcoming exam from siteSettings and associated collections
export async function deleteUpcomingExamFromSiteSettings(examId: string, examTitle?: string): Promise<void> {
  const docRef = doc(db, 'siteSettings', 'upcomingExam');
  try {
    const cleanId = (examId || '').trim();
    const cleanTitle = (examTitle || '').trim().toLowerCase();

    const isMatch = (it: any) => {
      if (!it) return false;
      const itId = (it.examId || it.id || '').trim();
      const itTitle = (it.title || '').trim().toLowerCase();
      if (cleanId && (itId === cleanId || cleanId === itId)) return true;
      if (cleanTitle && itTitle === cleanTitle) return true;
      if (cleanTitle && itTitle && (itTitle.includes(cleanTitle) || cleanTitle.includes(itTitle))) return true;
      return false;
    };

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let items: UpcomingExamSettings[] = Array.isArray(data.items) ? [...data.items] : [];

      if (items.length === 0 && data.title) {
        if (isMatch(data)) {
          await deleteDoc(docRef);
          try {
            localStorage.removeItem('cached_upcoming_exam_settings');
          } catch (e) {}
        }
      } else {
        const initialCount = items.length;
        items = items.filter(it => !isMatch(it));
        const rootMatched = isMatch(data);

        if (items.length > 0) {
          const nextPrimary = items.find(it => it.isPublished !== false) || items[0];
          const updatedPayload = {
            title: nextPrimary.title,
            description: nextPrimary.description || '',
            examId: nextPrimary.examId || nextPrimary.id || '',
            examDate: nextPrimary.examDate || '',
            startDate: nextPrimary.startDate || '',
            startTime: nextPrimary.startTime || '',
            archiveTime: nextPrimary.archiveTime || '',
            duration: nextPrimary.duration || 30,
            durationMinutes: nextPrimary.durationMinutes || 30,
            isPublished: nextPrimary.isPublished !== false,
            subject: nextPrimary.subject || 'BCS',
            totalQuestions: nextPrimary.totalQuestions || 0,
            totalMarks: nextPrimary.totalMarks || 0,
            isPremium: !!nextPrimary.isPremium,
            updatedAt: serverTimestamp(),
            lastUpdated: new Date().toISOString(),
            items: items,
          };
          await setDoc(docRef, updatedPayload);
          try {
            localStorage.setItem('cached_upcoming_exam_settings', JSON.stringify(updatedPayload));
          } catch (e) {}
        } else if (initialCount > 0 || rootMatched) {
          await deleteDoc(docRef);
          try {
            localStorage.removeItem('cached_upcoming_exam_settings');
          } catch (e) {}
        }
      }
    }
    // Delete individual doc from siteSettings
    if (cleanId) {
      try {
        await deleteDoc(doc(db, 'siteSettings', `upcomingExam_${cleanId}`));
      } catch (e) {}
    }
    // Also scan siteSettings collection for any matching upcoming exam docs
    try {
      const siteSettingsSnap = await getDocs(collection(db, 'siteSettings'));
      for (const sDoc of siteSettingsSnap.docs) {
        if (sDoc.id.startsWith('upcomingExam_')) {
          const sData = sDoc.data();
          if (isMatch(sData) || sDoc.id === `upcomingExam_${cleanId}`) {
            await deleteDoc(sDoc.ref);
          }
        }
      }
    } catch (e) {}

    // Also delete from /exam, /Exam, /exams
    if (cleanId) {
      try {
        await deleteDoc(doc(db, 'exam', cleanId));
        await deleteDoc(doc(db, 'Exam', cleanId));
        await deleteDoc(doc(db, 'exams', cleanId));
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Error deleting upcoming exam from siteSettings:", err);
  }
}

// ========================================================
//               REFERRAL SYSTEM SERVICES
// ========================================================

/**
 * Generates a clean, unique alphanumeric referral code (e.g. PROS1234, MEDH5678)
 */
export function generateReferralCode(seedName?: string): string {
  let prefix = 'MEDHA';
  if (seedName) {
    const cleaned = seedName.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (cleaned.length >= 3) {
      prefix = cleaned.slice(0, 4);
    }
  }
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomDigits}`;
}

/**
 * Searches users collection for an existing user with the given referralCode
 */
export async function findUserByReferralCode(code: string): Promise<UserProfile | null> {
  if (!code || !code.trim()) return null;
  const cleanCode = code.trim().toUpperCase();
  try {
    const q = query(collection(db, 'users'), where('referralCode', '==', cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
  } catch (err) {
    console.warn("Error looking up referral code:", err);
  }
  return null;
}

/**
 * Records a referral atomically in Firestore:
 * 1. Checks against self-referral and duplicate referral
 * 2. Writes to /referrals/{referredUserId}
 * 3. Increments referrer's referralCount atomically
 * 4. Updates referred user's doc with referredBy and referredAt
 */
export async function recordReferral(
  referrer: UserProfile,
  referredUser: { uid: string; name: string; email: string }
): Promise<{ success: boolean; message?: string }> {
  const referrerUid = referrer.id || referrer.uid;
  const targetUid = referredUser.uid;

  if (!referrerUid || !targetUid) {
    return { success: false, message: 'অকার্যকর ব্যবহারকারী আইডি।' };
  }

  // Self-referral protection
  if (referrerUid === targetUid) {
    return { success: false, message: 'নিজের রেফারেল কোড নিজে ব্যবহার করা যাবে না।' };
  }

  if (referrer.email && referredUser.email && referrer.email.trim().toLowerCase() === referredUser.email.trim().toLowerCase()) {
    return { success: false, message: 'একই ইমেইল দিয়ে নিজের অ্যাকাউন্টে রেফার নেওয়া যাবে না।' };
  }

  const referrerRef = doc(db, 'users', referrerUid);
  const referredUserRef = doc(db, 'users', targetUid);
  const referralRef = doc(db, 'referrals', targetUid);

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Check if referral record already exists
      const referralSnap = await transaction.get(referralRef);
      if (referralSnap.exists()) {
        return { success: false, message: 'এই অ্যাকাউন্টটি ইতোমধ্যে রেফার হিসেবে নথিভুক্ত রয়েছে।' };
      }

      // 2. Check if the referred user already has referredBy
      const referredUserSnap = await transaction.get(referredUserRef);
      if (referredUserSnap.exists()) {
        const data = referredUserSnap.data();
        if (data?.referredBy) {
          return { success: false, message: 'এই শিক্ষার্থী ইতোমধ্যে একজন রেফারারের অধীনে নিবন্ধিত।' };
        }
      }

      // 3. Read current referrer count
      const referrerSnap = await transaction.get(referrerRef);
      let currentCount = 0;
      if (referrerSnap.exists()) {
        currentCount = Number(referrerSnap.data()?.referralCount || 0);
      } else {
        currentCount = Number(referrer.referralCount || 0);
      }
      const newCount = currentCount + 1;
      const nowIso = new Date().toISOString();

      // 4. Create referral document
      const referralRecord: ReferralRecord = {
        id: targetUid,
        referrerId: referrerUid,
        referrerCode: referrer.referralCode || '',
        referredUserId: targetUid,
        referredUserName: referredUser.name || 'শিক্ষার্থী',
        referredUserEmail: referredUser.email || '',
        createdAt: nowIso,
      };
      transaction.set(referralRef, referralRecord);

      // 5. Update referrer count
      transaction.set(referrerRef, {
        referralCount: newCount,
        lastReferralAt: nowIso,
      }, { merge: true });

      // 6. Update referred user doc
      transaction.set(referredUserRef, {
        referredBy: referrerUid,
        referredByCode: referrer.referralCode || '',
        referredAt: nowIso,
      }, { merge: true });

      return { success: true };
    });

    return result;
  } catch (err) {
    console.warn("Transaction failed, trying direct setDoc fallback:", err);
    try {
      const nowIso = new Date().toISOString();
      const referralRecord: ReferralRecord = {
        id: targetUid,
        referrerId: referrerUid,
        referrerCode: referrer.referralCode || '',
        referredUserId: targetUid,
        referredUserName: referredUser.name || 'শিক্ষার্থী',
        referredUserEmail: referredUser.email || '',
        createdAt: nowIso,
      };
      await setDoc(referralRef, referralRecord);
      await setDoc(referrerRef, {
        referralCount: (referrer.referralCount || 0) + 1,
        lastReferralAt: nowIso,
      }, { merge: true });
      await setDoc(referredUserRef, {
        referredBy: referrerUid,
        referredByCode: referrer.referralCode || '',
        referredAt: nowIso,
      }, { merge: true });
      return { success: true };
    } catch (fallbackErr) {
      console.warn("Fallback referral record error:", fallbackErr);
      return { success: false, message: 'রেফারেল সংরক্ষণে সমস্যা হয়েছে।' };
    }
  }
}

/**
 * Get all referrals made by a specific referrer
 */
export async function getReferralsForUser(userId: string): Promise<ReferralRecord[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'referrals'), where('referrerId', '==', userId));
    const snap = await getDocs(q);
    const records: ReferralRecord[] = [];
    snap.forEach((d) => {
      records.push({ id: d.id, ...d.data() } as ReferralRecord);
    });
    records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return records;
  } catch (err) {
    console.warn("Error fetching referrals for user:", err);
    return [];
  }
}

/**
 * Realtime subscription to referrals made by a specific user
 */
export function subscribeToReferralsForUser(
  userId: string,
  callback: (referrals: ReferralRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, 'referrals'), where('referrerId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const records: ReferralRecord[] = [];
      snap.forEach((d) => {
        records.push({ id: d.id, ...d.data() } as ReferralRecord);
      });
      records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(records);
    },
    (err) => {
      console.warn("Subscription error for user referrals:", err);
    }
  );
}

/**
 * Get all referrals on platform (for Admin)
 */
export async function getAllReferrals(): Promise<ReferralRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'referrals'));
    const records: ReferralRecord[] = [];
    snap.forEach((d) => {
      records.push({ id: d.id, ...d.data() } as ReferralRecord);
    });
    records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return records;
  } catch (err) {
    console.warn("Error fetching all referrals:", err);
    return [];
  }
}

/**
 * Realtime subscription to all referrals on platform (for Admin)
 */
export function subscribeToAllReferrals(callback: (referrals: ReferralRecord[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'referrals'),
    (snap) => {
      const records: ReferralRecord[] = [];
      snap.forEach((d) => {
        records.push({ id: d.id, ...d.data() } as ReferralRecord);
      });
      records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(records);
    },
    (err) => {
      console.warn("Subscription error for all referrals:", err);
    }
  );
}

/* ==========================================================================
   STUDY MATERIALS & PDF RESOURCES SERVICE (GOOGLE DRIVE INTEGRATION)
   ========================================================================== */

/**
 * Robust Google Drive File ID extraction utility.
 * Supports /file/d/{id}, ?id={id}, /open?id={id}, /uc?id={id}, and direct ID strings.
 */
export function extractDriveFileId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Pattern 1: https://drive.google.com/file/d/{id}/view...
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (match1 && match1[1]) return match1[1];

  // Pattern 2: https://drive.google.com/open?id={id} or /uc?id={id}
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (match2 && match2[1]) return match2[1];

  // Pattern 3: /d/{id} general match
  const match3 = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (match3 && match3[1]) return match3[1];

  // Pattern 4: direct ID alphanumeric string of standard Google Drive token length
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return trimmed;
  }

  return '';
}

/**
 * Builds standard Google Drive PDF Preview / Embed URL.
 */
export function buildDrivePreviewUrl(fileIdOrUrl: string): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return fileIdOrUrl;
}

/**
 * Builds Google Drive Direct Download / Open URL.
 */
export function buildDriveDownloadUrl(fileIdOrUrl: string): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return fileIdOrUrl;
}

/**
 * Builds Google Drive External View URL.
 */
export function buildDriveViewUrl(fileIdOrUrl: string): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }
  return fileIdOrUrl;
}

/**
 * Fetch Study Materials from Firestore with optional status filter.
 */
export async function fetchStudyMaterials(publishedOnly: boolean = false): Promise<StudyMaterial[]> {
  try {
    const collRef = collection(db, 'studyMaterials');
    let q = query(collRef);
    if (publishedOnly) {
      q = query(collRef, where('status', '==', 'published'));
    }

    const snap = await getDocs(q);
    const materials: StudyMaterial[] = [];
    snap.forEach((d) => {
      materials.push({ id: d.id, ...d.data() } as StudyMaterial);
    });

    // Sort by displayOrder ascending, then createdAt descending
    materials.sort((a, b) => {
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return materials;
  } catch (err) {
    console.warn("Error fetching study materials:", err);
    return [];
  }
}

/**
 * Realtime subscription to study materials.
 */
export function subscribeToStudyMaterials(
  callback: (materials: StudyMaterial[]) => void,
  publishedOnly: boolean = false
): Unsubscribe {
  const collRef = collection(db, 'studyMaterials');
  const q = publishedOnly
    ? query(collRef, where('status', '==', 'published'))
    : collRef;

  return onSnapshot(
    q,
    (snap) => {
      const materials: StudyMaterial[] = [];
      snap.forEach((d) => {
        materials.push({ id: d.id, ...d.data() } as StudyMaterial);
      });

      materials.sort((a, b) => {
        const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
        const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      callback(materials);
    },
    (err) => {
      console.warn("Subscription error for study materials:", err);
    }
  );
}

/**
 * Create or update a Study Material document in /studyMaterials.
 */
export async function saveStudyMaterial(
  materialData: Partial<StudyMaterial>,
  adminUid: string = 'admin'
): Promise<string> {
  const materialId = materialData.id || `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const driveFileId = materialData.driveFileId || extractDriveFileId(materialData.driveUrl || '');
  const nowStr = new Date().toISOString();

  const payload: Record<string, any> = {
    title: materialData.title?.trim() || 'Untitled Material',
    description: materialData.description?.trim() || '',
    category: materialData.category || 'Other',
    driveUrl: materialData.driveUrl?.trim() || '',
    driveFileId: driveFileId,
    accessType: materialData.accessType === 'premium' ? 'premium' : 'free',
    status: materialData.status || 'published',
    displayOrder: typeof materialData.displayOrder === 'number' ? materialData.displayOrder : 0,
    thumbnailUrl: materialData.thumbnailUrl?.trim() || '',
    updatedAt: nowStr,
    updatedAtServer: serverTimestamp(),
  };

  if (!materialData.id) {
    payload.createdAt = nowStr;
    payload.createdAtServer = serverTimestamp();
    payload.createdBy = adminUid;
  }

  const docRef = doc(db, 'studyMaterials', materialId);
  await setDoc(docRef, payload, { merge: true });
  return materialId;
}

/**
 * Delete a Study Material document from /studyMaterials.
 */
export async function deleteStudyMaterial(materialId: string): Promise<void> {
  if (!materialId) return;
  const docRef = doc(db, 'studyMaterials', materialId);
  await deleteDoc(docRef);
}

/**
 * Quick toggle status (published, draft, hidden).
 */
export async function updateStudyMaterialStatus(
  materialId: string,
  status: 'published' | 'draft' | 'hidden'
): Promise<void> {
  if (!materialId) return;
  const docRef = doc(db, 'studyMaterials', materialId);
  await updateDoc(docRef, {
    status,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  });
}

/**
 * Record user access/download history.
 * Uses composite doc ID `${userId}_${materialId}` to prevent excessive duplicate documents.
 */
export async function recordMaterialAccess(
  userId: string,
  material: {
    id: string;
    title: string;
    category?: string;
    accessType: 'free' | 'premium';
    driveUrl?: string;
    driveFileId?: string;
  }
): Promise<void> {
  if (!userId || !material.id) return;
  try {
    const accessId = `${userId}_${material.id}`;
    const docRef = doc(db, 'materialAccess', accessId);
    await setDoc(
      docRef,
      {
        userId,
        materialId: material.id,
        materialTitle: material.title,
        category: material.category || 'Other',
        accessType: material.accessType,
        driveUrl: material.driveUrl || '',
        driveFileId: material.driveFileId || '',
        accessedAt: new Date().toISOString(),
        accessedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Error logging material access:", err);
  }
}

/**
 * Fetch a specific user's study material access history.
 */
export async function fetchUserMaterialAccess(userId: string): Promise<MaterialAccessRecord[]> {
  if (!userId) return [];
  try {
    const collRef = collection(db, 'materialAccess');
    const q = query(collRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const records: MaterialAccessRecord[] = [];
    snap.forEach((d) => {
      records.push({ id: d.id, ...d.data() } as MaterialAccessRecord);
    });

    records.sort((a, b) => (b.accessedAt || '').localeCompare(a.accessedAt || ''));
    return records;
  } catch (err) {
    console.warn("Error fetching user material access history:", err);
    return [];
  }
}

/**
 * Realtime subscription to user's study material access history.
 */
export function subscribeToUserMaterialAccess(
  userId: string,
  callback: (records: MaterialAccessRecord[]) => void
): Unsubscribe {
  if (!userId) return () => {};
  const collRef = collection(db, 'materialAccess');
  const q = query(collRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snap) => {
      const records: MaterialAccessRecord[] = [];
      snap.forEach((d) => {
        records.push({ id: d.id, ...d.data() } as MaterialAccessRecord);
      });
      records.sort((a, b) => (b.accessedAt || '').localeCompare(a.accessedAt || ''));
      callback(records);
    },
    (err) => {
      console.warn("Subscription error for user material access:", err);
    }
  );
}

// ==========================================
// 12. DAILY PRACTICE SERVICE (10 MCQ / DAY)
// ==========================================

/**
 * Get the standardized date key for Daily Practice (YYYY-MM-DD)
 * Format: "2026-09-14"
 */
export function getDailyPracticeDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches all available questions from the question bank across Firestore,
 * Ministry question banks, live/archived exams, and system base banks.
 */
export async function fetchQuestionBankPool(examsProp?: Exam[]): Promise<Question[]> {
  const list: Question[] = [];
  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();

  const addValidQuestion = (q: any, defaultSubject?: string) => {
    if (!q || !q.text || typeof q.text !== 'string' || q.text.trim().length === 0) return;
    if (!Array.isArray(q.options) || q.options.length < 2) return;
    if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) return;

    const normalizedText = q.text.trim().toLowerCase();
    const id = q.id || `bank-q-${Math.random().toString(36).substring(2, 9)}`;

    if (seenIds.has(id) || seenTexts.has(normalizedText)) return;

    seenIds.add(id);
    seenTexts.add(normalizedText);

    list.push({
      ...q,
      id,
      text: q.text.trim(),
      subject: q.subject || defaultSubject || 'সাধারণ প্রস্তুতি',
      options: q.options.map(o => String(o).trim()),
    });
  };

  // 1. Collect from passed exams (excluding secret upcoming exams)
  if (Array.isArray(examsProp) && examsProp.length > 0) {
    examsProp.forEach(exam => {
      if (exam.status === 'upcoming') return;
      if (Array.isArray(exam.questions)) {
        exam.questions.forEach(q => addValidQuestion(q, exam.subject));
      }
    });
  }

  // 2. Query Firestore /questions collection if populated
  try {
    const qSnap = await getDocs(collection(db, 'questions'));
    qSnap.forEach(docSnap => {
      const q = mapFirestoreDocToQuestion(docSnap);
      addValidQuestion(q);
    });
  } catch (err) {
    console.warn("Could not query /questions in Firestore:", err);
  }

  // 3. Query Firestore /ministryQuestionBanks if populated
  try {
    const mSnap = await getDocs(collection(db, 'ministryQuestionBanks'));
    mSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (Array.isArray(data.questions)) {
        data.questions.forEach((q: any) => {
          addValidQuestion(q, data.ministryName || 'মন্ত্রণালয় প্রস্তুতি');
        });
      }
    });
  } catch (err) {
    console.warn("Could not query /ministryQuestionBanks in Firestore:", err);
  }

  // 4. Always ensure a comprehensive question pool by merging INITIAL_EXAMS
  INITIAL_EXAMS.forEach(exam => {
    if (Array.isArray(exam.questions)) {
      exam.questions.forEach(q => addValidQuestion(q, exam.subject));
    }
  });

  // 5. Merge INITIAL_MINISTRY_BANKS
  INITIAL_MINISTRY_BANKS.forEach(bank => {
    if (Array.isArray(bank.questions)) {
      bank.questions.forEach(q => addValidQuestion(q, bank.ministryName));
    }
  });

  return list;
}

/**
 * Get or initialize today's Daily Practice session for a user.
 * - Stores under a user-specific daily record `dailyPractice/${userId}_${dateKey}` to prevent multiple attempts per calendar day.
 * - If record exists (completed or in-progress), loads it directly.
 * - If completed, user is prevented from re-taking it.
 * - If not yet created for today, fetches 10 random questions from the question bank and persists them to Firestore.
 */
export async function getOrCreateDailyPracticeSession(
  userId: string,
  allAvailableQuestions?: Question[]
): Promise<DailyPracticeSession> {
  const dateKey = getDailyPracticeDateKey();
  const sessionId = `${userId}_${dateKey}`;
  const practiceRef = doc(db, 'dailyPractice', sessionId);

  // 1. Check if user already has a session created for today in Firestore
  try {
    const snap = await getDoc(practiceRef);
    if (snap.exists()) {
      const data = snap.data() as DailyPracticeSession;
      let sessionQuestions = Array.isArray(data.questions) && data.questions.length > 0 ? data.questions : [];

      // If questions array wasn't stored directly, hydrate from pool
      if (sessionQuestions.length === 0 && Array.isArray(data.questionIds) && data.questionIds.length > 0) {
        const pool = (allAvailableQuestions && allAvailableQuestions.length > 0)
          ? allAvailableQuestions
          : await fetchQuestionBankPool();
        const questionMap = new Map<string, Question>();
        pool.forEach(q => questionMap.set(q.id, q));
        
        data.questionIds.forEach(id => {
          const found = questionMap.get(id);
          if (found) sessionQuestions.push(found);
        });
      }

      return {
        ...data,
        questions: sessionQuestions
      };
    }
  } catch (e) {
    console.warn("Error fetching daily practice from firestore, will generate session:", e);
  }

  // 2. Fetch or use pool of questions from question bank
  const pool = (allAvailableQuestions && allAvailableQuestions.length >= 10)
    ? allAvailableQuestions
    : await fetchQuestionBankPool();

  // 3. Select 10 randomized questions with Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selectedQuestions = shuffled.slice(0, 10);
  const questionIds = selectedQuestions.map(q => q.id);

  const newSession: DailyPracticeSession = {
    id: sessionId,
    userId,
    dateKey,
    questionIds,
    questions: selectedQuestions,
    totalQuestions: selectedQuestions.length,
    completed: false,
    createdAt: new Date().toISOString()
  };

  // 4. Persist immediately into Firestore under user-specific daily record to lock in today's questions
  try {
    await setDoc(practiceRef, {
      id: sessionId,
      userId,
      dateKey,
      questionIds,
      questions: selectedQuestions,
      totalQuestions: selectedQuestions.length,
      completed: false,
      createdAt: newSession.createdAt
    });
  } catch (e) {
    console.warn("Could not save new daily practice session to Firestore:", e);
  }

  return newSession;
}

/**
 * Save completed Daily Practice result
 * Sets completed to true to prevent multiple attempts for this calendar day.
 */
export async function saveDailyPracticeResult(
  session: DailyPracticeSession
): Promise<void> {
  const practiceRef = doc(db, 'dailyPractice', session.id);
  const payload = {
    ...session,
    completed: true,
    completedAt: session.completedAt || new Date().toISOString()
  };

  try {
    await setDoc(practiceRef, payload, { merge: true });
  } catch (e) {
    console.error("Could not save daily practice result to Firestore:", e);
    throw e;
  }
}

/**
 * Real-time subscription to user's today's Daily Practice session
 */
export function subscribeToTodayDailyPractice(
  userId: string,
  callback: (session: DailyPracticeSession | null) => void
): Unsubscribe {
  if (!userId) {
    callback(null);
    return () => {};
  }
  const dateKey = getDailyPracticeDateKey();
  const sessionId = `${userId}_${dateKey}`;
  const practiceRef = doc(db, 'dailyPractice', sessionId);

  return onSnapshot(practiceRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as DailyPracticeSession);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("Error subscribing to daily practice:", err);
    callback(null);
  });
}

// ==========================================
// 13. WRONG QUESTIONS SERVICE (PRIVATE REPOSITORY)
// ==========================================

/**
 * Save or increment wrong questions for a user in /wrongQuestions/{userId}/questions/{questionId}
 */
export async function recordWrongQuestions(
  userId: string,
  wrongQuestions: {
    question: Question;
    subject?: string;
  }[]
): Promise<void> {
  if (!userId || wrongQuestions.length === 0) return;

  const now = new Date().toISOString();

  for (const item of wrongQuestions) {
    const q = item.question;
    const qDocRef = doc(db, 'wrongQuestions', userId, 'questions', q.id);

    try {
      const snap = await getDoc(qDocRef);
      if (snap.exists()) {
        const prev = snap.data();
        await updateDoc(qDocRef, {
          wrongCount: (prev.wrongCount || 1) + 1,
          lastWrongAt: now,
          status: 'unmastered' // Re-mark as unmastered if answered wrongly again
        });
      } else {
        await setDoc(qDocRef, {
          questionId: q.id,
          userId,
          questionText: q.text,
          subject: q.subject || item.subject || 'সাধারণ',
          options: q.options || [],
          correctAnswer: q.correctAnswer ?? 0,
          explanation: q.explanation || '',
          addedAt: now,
          lastWrongAt: now,
          wrongCount: 1,
          status: 'unmastered'
        });
      }
    } catch (e) {
      console.warn(`Failed to record wrong question ${q.id} for user ${userId}:`, e);
    }
  }
}

/**
 * Update wrong question status after practice/exam
 * If answered correctly: status can become 'mastered'
 * If answered incorrectly: status remains 'unmastered' and wrongCount can increment
 */
export async function updateWrongQuestionPracticeStatus(
  userId: string,
  questionId: string,
  isCorrect: boolean
): Promise<void> {
  if (!userId || !questionId) return;

  const qDocRef = doc(db, 'wrongQuestions', userId, 'questions', questionId);
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(qDocRef);
    if (snap.exists()) {
      const prev = snap.data();
      if (isCorrect) {
        await updateDoc(qDocRef, {
          status: 'mastered',
          lastPracticedAt: now,
          lastResult: 'correct'
        });
      } else {
        await updateDoc(qDocRef, {
          status: 'unmastered',
          wrongCount: (prev.wrongCount || 1) + 1,
          lastWrongAt: now,
          lastPracticedAt: now,
          lastResult: 'wrong'
        });
      }
    }
  } catch (e) {
    console.warn(`Failed to update wrong question status for ${questionId}:`, e);
  }
}

/**
 * Real-time subscription to a user's wrong questions list
 */
export function subscribeToUserWrongQuestions(
  userId: string,
  callback: (questions: WrongQuestionRecord[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const subcollRef = collection(db, 'wrongQuestions', userId, 'questions');

  return onSnapshot(subcollRef, (snap) => {
    const list: WrongQuestionRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        questionId: docSnap.id,
        userId: data.userId || userId,
        questionText: data.questionText || '',
        subject: data.subject || '',
        options: data.options || [],
        correctAnswer: typeof data.correctAnswer === 'number' ? data.correctAnswer : 0,
        explanation: data.explanation || '',
        addedAt: data.addedAt || '',
        wrongCount: data.wrongCount || 1,
        lastWrongAt: data.lastWrongAt || '',
        status: data.status || 'unmastered',
        lastPracticedAt: data.lastPracticedAt,
        lastResult: data.lastResult
      });
    });
    // Sort by unmastered first, then by highest wrong count
    list.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'unmastered' ? -1 : 1;
      }
      return (b.wrongCount || 1) - (a.wrongCount || 1);
    });
    callback(list);
  }, (err) => {
    console.warn("Error subscribing to wrong questions:", err);
    callback([]);
  });
}
