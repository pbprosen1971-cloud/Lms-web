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
  writeBatch
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
  ExamQuestionDoc
} from '../types';

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

  const examDateTime = examData.examDateTime || examData.startTime || examData.examDate || '';
  const archiveDateTime = examData.archiveDateTime || examData.archiveTime || examData.archiveDate || '';
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
    examDateTime: examDateTime,
    archiveDateTime: archiveDateTime,
    examDate: examDateTime ? examDateTime.split('T')[0] : (examData.examDate || ''),
    archiveDate: archiveDateTime ? archiveDateTime.split('T')[0] : (examData.archiveDate || ''),
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
      startTime: examDateTime || null,
      archiveTime: archiveDateTime || null,
      createdAt: examDateTime ? examDateTime.split('T')[0] : new Date().toISOString().split('T')[0],
      dateCreated: examDateTime ? examDateTime.split('T')[0] : new Date().toISOString().split('T')[0],
    }, { merge: true });

    // 5. Update siteSettings/upcomingExam ONLY IF status is 'upcoming'
    if (status === 'upcoming' && isPublished) {
      const siteSettingsRef = doc(db, 'siteSettings', 'upcomingExam');
      await setDoc(siteSettingsRef, {
        title: examData.title.trim(),
        description: (examData.description || '').trim(),
        examId: targetExamId,
        examDate: examDateTime ? examDateTime.split('T')[0] : '',
        startTime: examDateTime,
        duration: duration,
        durationMinutes: duration,
        isPublished: isPublished,
        subject: subject,
        totalQuestions: Number(examData.totalQuestions || examData.questions?.length || 0),
        totalMarks: Number(examData.totalMarks || examData.questions?.length || 0),
        isPremium: examType === 'premium',
        updatedBy: createdBy,
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
    } else if (status === 'live' || status === 'archive') {
      // Clear from upcoming exam siteSettings so it does not persist in upcoming banner
      await clearUpcomingExamSettings(targetExamId);
    }

    return {
      examId: targetExamId,
      title: examData.title.trim(),
      description: examData.description || '',
      examDateTime,
      archiveDateTime,
      examDate: examDateTime ? examDateTime.split('T')[0] : '',
      archiveDate: archiveDateTime ? archiveDateTime.split('T')[0] : '',
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

    // Finally merge /Exam (capital - authoritative exam container)
    capitalDocsMap.forEach((v, k) => {
      const existing = combinedMap.get(k);
      combinedMap.set(k, {
        ...(existing || {}),
        ...v,
        questions: (v.questions && v.questions.length > 0) ? v.questions : (existing?.questions || []),
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
      const dateCreatedStr = safeDateOnlyString(data.examDate || data.createdAt || data.dateCreated);

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
      const dateCreatedStr = safeDateOnlyString(data.examDate || data.createdAt || data.dateCreated);

      capitalDocsMap.set(examId, {
        id: examId,
        examId: examId,
        title: String(data.title || ''),
        description: String(data.description || ''),
        subject: String(data.subject || data.category || 'BCS'),
        durationMinutes: Number(data.durationMinutes || data.duration || 30),
        totalQuestions: totalQ,
        totalMarks: totalM,
        status: (data.status as any) || 'live',
        isPublished: data.isPublished !== false,
        createdBy: String(data.createdBy || ''),
        questions: qList,
        startTime: startTimeStr || undefined,
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
      const dateCreatedStr = safeDateOnlyString(data.createdAt || data.dateCreated || data.examDate);

      legacyDocsMap.set(examId, {
        id: examId,
        title: String(data.title || ''),
        description: String(data.description || ''),
        subject: String(data.category || data.subject || 'বাংলা'),
        durationMinutes: Number(data.duration || data.durationMinutes || 10),
        totalQuestions: totalQ,
        totalMarks: totalM,
        status: (data.status as any) || 'live',
        isPublished: data.isPublished !== false,
        createdBy: String(data.createdBy || ''),
        questions: qList,
        startTime: startTimeStr || undefined,
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
export async function clearUpcomingExamSettings(examIdToClear?: string): Promise<void> {
  try {
    const docRef = doc(db, 'siteSettings', 'upcomingExam');
    if (examIdToClear) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.examId && data.examId !== examIdToClear) {
          // It's referencing a different upcoming exam, keep it intact
          return;
        }
      }
    }
    await deleteDoc(docRef);
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
  updates: Partial<UpcomingExamDoc> & { questions?: Question[] }
): Promise<void> {
  try {
    const examRef = doc(db, 'exam', examId);
    const payload: any = {
      ...updates,
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
    await setDoc(capitalExamRef, capitalUpdates, { merge: true });

    // Also sync /exams/{examId}
    const legacyRef = doc(db, 'exams', examId);
    await setDoc(legacyRef, {
      ...(updates.title && { title: updates.title }),
      ...(updates.subject && { subject: updates.subject, category: updates.subject }),
      ...(updates.status && { status: updates.status }),
      ...(updates.isPublished !== undefined && { isPublished: updates.isPublished }),
      ...(updates.examType && { isPremium: updates.examType === 'premium' }),
      ...(updates.examDateTime && { startTime: updates.examDateTime }),
      ...(updates.archiveDateTime && { archiveTime: updates.archiveDateTime }),
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
 * Delete Upcoming Exam from /exam/{examId}, /Exam/{examId}, and its questions
 */
export async function deleteUpcomingExamFromFirestore(examId: string): Promise<void> {
  try {
    // 1. Delete /Exam/{examId}/questions subcollection
    const subQSnap = await getDocs(collection(db, 'Exam', examId, 'questions'));
    const subQDeletes = subQSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(subQDeletes);

    // 2. Delete /Exam/{examId}
    await deleteDoc(doc(db, 'Exam', examId));

    // 3. Delete /exam/{examId}
    await deleteDoc(doc(db, 'exam', examId));

    // 4. Delete legacy /exams/{examId} and /questions
    await deleteExamFromFirestore(examId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `exam/${examId}`);
    throw err;
  }
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
  // Delegate to saveUpcomingExamScheduleToFirestore
  await saveUpcomingExamScheduleToFirestore({
    examId: exam.id,
    title: exam.title,
    description: (exam as any).description || '',
    examDateTime: exam.startTime,
    archiveDateTime: exam.archiveTime,
    examDate: exam.dateCreated,
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

        const settingsObj: UpcomingExamSettings = {
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          examId: data.examId || '',
          examDate: data.examDate || '',
          startTime: data.startTime || '',
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

      const settingsObj: UpcomingExamSettings = {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        examId: data.examId || '',
        examDate: data.examDate || '',
        startTime: data.startTime || '',
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

// Save or Update Upcoming Exam settings in Firestore (siteSettings/upcomingExam)
export async function saveUpcomingExamSettings(settings: UpcomingExamSettings, updatedByUid: string = 'admin'): Promise<void> {
  const docRef = doc(db, 'siteSettings', 'upcomingExam');
  const nowIso = new Date().toISOString();
  
  const payload = {
    title: (settings.title || '').trim(),
    description: (settings.description || '').trim(),
    examId: settings.examId || '',
    examDate: settings.examDate || '',
    startTime: settings.startTime || '',
    duration: Number(settings.duration || settings.durationMinutes || 15),
    durationMinutes: Number(settings.durationMinutes || settings.duration || 15),
    isPublished: settings.isPublished !== false,
    subject: settings.subject || 'BCS',
    totalQuestions: Number(settings.totalQuestions || 0),
    totalMarks: Number(settings.totalMarks || 0),
    isPremium: !!settings.isPremium,
    updatedBy: settings.updatedBy || updatedByUid,
    updatedAt: serverTimestamp(),
    lastUpdated: nowIso,
  };

  try {
    localStorage.setItem('cached_upcoming_exam_settings', JSON.stringify({ ...payload, updatedAt: nowIso }));
  } catch (e) {}

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'siteSettings/upcomingExam');
  }
}
