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
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Exam, Question, ExamResult, UserProfile, UpcomingExamSettings } from '../types';

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
}

// Convert Firestore question document to app Question object
export function mapFirestoreDocToQuestion(docSnap: any): Question {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || `q-${Date.now()}`;

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
    text: data.questionText || data.text || '',
    options,
    correctAnswer: correctAnswerIdx,
    explanation: data.explanation || '',
    questionNumber: data.questionNumber || 1,
    subject: data.subject || '',
  };
}

// Subscribe to exams in Firestore
export function subscribeToExams(callback: (exams: Exam[]) => void): Unsubscribe {
  const examsRef = collection(db, 'exams');
  return onSnapshot(examsRef, (snapshot) => {
    const list: Exam[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        title: data.title || '',
        subject: data.category || data.subject || 'বাংলা',
        durationMinutes: Number(data.duration || data.durationMinutes || 10),
        totalQuestions: Number(data.totalQuestions || 0),
        totalMarks: Number(data.totalMarks || 0),
        status: data.status || 'live',
        isPublished: data.isPublished !== false,
        createdBy: data.createdBy || '',
        questions: data.questions || [],
        startTime: data.startTime || undefined,
        archiveTime: data.archiveTime || undefined,
        dateCreated: data.createdAt || data.dateCreated || new Date().toISOString().split('T')[0],
        isPremium: !!data.isPremium,
      });
    });
    list.sort((a, b) => b.id.localeCompare(a.id));
    callback(list);
  }, (err) => {
    console.warn("Firestore error listening to exams collection:", err);
  });
}

// Save or Update Exam in Firestore
export async function saveExamToFirestore(exam: Exam, createdByUid: string = 'admin'): Promise<void> {
  const examRef = doc(db, 'exams', exam.id);

  const payload = {
    id: exam.id,
    title: exam.title,
    category: exam.subject,
    subject: exam.subject,
    duration: Number(exam.durationMinutes || 10),
    durationMinutes: Number(exam.durationMinutes || 10),
    totalQuestions: Number(exam.totalQuestions || exam.questions?.length || 0),
    totalMarks: Number(exam.totalMarks || exam.questions?.length || 0),
    status: exam.status || 'live',
    isPublished: exam.isPublished !== false,
    createdBy: exam.createdBy || createdByUid,
    createdAt: exam.dateCreated || new Date().toISOString().split('T')[0],
    dateCreated: exam.dateCreated || new Date().toISOString().split('T')[0],
    isPremium: !!exam.isPremium,
    startTime: exam.startTime || null,
    archiveTime: exam.archiveTime || null,
  };

  try {
    await setDoc(examRef, payload, { merge: true });

    // Also save embedded questions if present
    if (exam.questions && exam.questions.length > 0) {
      for (let i = 0; i < exam.questions.length; i++) {
        const q = exam.questions[i];
        await saveQuestionToFirestore(q, exam.id, i + 1);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `exams/${exam.id}`);
  }
}

// Toggle Exam Published State in Firestore
export async function toggleExamPublishInFirestore(examId: string, currentPublished: boolean): Promise<void> {
  const examRef = doc(db, 'exams', examId);
  try {
    await setDoc(examRef, { isPublished: !currentPublished }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `exams/${examId}`);
  }
}

// Delete Exam and its associated Questions from Firestore
export async function deleteExamFromFirestore(examId: string): Promise<void> {
  try {
    // 1. Delete questions associated with examId
    const qQuery = query(collection(db, 'questions'), where('examId', '==', examId));
    const qSnapshot = await getDocs(qQuery);
    const deletePromises = qSnapshot.docs.map(qDoc => deleteDoc(doc(db, 'questions', qDoc.id)));
    await Promise.all(deletePromises);

    // 2. Delete exam document
    await deleteDoc(doc(db, 'exams', examId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `exams/${examId}`);
  }
}

// Subscribe to questions for a specific examId from Firestore
export function subscribeToQuestionsByExamId(examId: string, callback: (questions: Question[]) => void): Unsubscribe {
  const qQuery = query(collection(db, 'questions'), where('examId', '==', examId));
  return onSnapshot(qQuery, (snapshot) => {
    const list: Question[] = [];
    snapshot.forEach((docSnap) => {
      list.push(mapFirestoreDocToQuestion(docSnap));
    });
    list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    callback(list);
  }, (err) => {
    console.warn(`Firestore error listening to questions for exam ${examId}:`, err);
  });
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
export async function deleteQuestionFromFirestore(questionId: string, examId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'questions', questionId));

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
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
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
        updatedAt: data.updatedAt || data.lastUpdated || '',
        lastUpdated: data.lastUpdated || '',
      });
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("Firestore error listening to siteSettings/upcomingExam:", err);
  });
}

// Get single Upcoming Exam settings snapshot from Firestore
export async function getUpcomingExamSettings(): Promise<UpcomingExamSettings | null> {
  try {
    const docRef = doc(db, 'siteSettings', 'upcomingExam');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
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
        updatedAt: data.updatedAt || data.lastUpdated || '',
        lastUpdated: data.lastUpdated || '',
      };
    }
    return null;
  } catch (err) {
    console.warn("Error getting siteSettings/upcomingExam:", err);
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
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'siteSettings/upcomingExam');
  }
}
