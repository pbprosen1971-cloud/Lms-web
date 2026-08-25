/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  text: string;
  options: string[]; // Exactly 4 options
  correctAnswer: number; // 0 to 3 index
  explanation?: string;
  subject: string;
  questionNumber?: number;
}

export interface Exam {
  id: string;
  examId?: string;
  title: string;
  description?: string;
  subject: 'বাংলা' | 'ইংরেজি' | 'গণিত' | 'GK' | 'BCS' | '11th - 20th Grade Job' | string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  questions: Question[];
  status: 'live' | 'upcoming' | 'archive' | 'archived' | string;
  startTime?: string; // For upcoming exams
  startDate?: string; // Start date field for upcoming exams
  examDateTime?: string; // Standard exam datetime
  examDate?: string; // Standard exam date
  archiveTime?: string; // For auto-archiving
  archiveDateTime?: string; // Standard archive timestamp
  dateCreated: string;
  isPremium?: boolean; // True if the exam is premium
  isPublished?: boolean;
  createdBy?: string;
}

export interface SubjectStats {
  subject: string;
  examsCount: number;
  questionsCount: number;
  iconName: string;
  colorClass: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  userId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  totalMarks: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  unansweredQuestions: number;
  submittedAt: string;
  dateTaken: string;
  timeSpentSeconds: number;
  subjectPerformance: {
    [subject: string]: {
      correct: number;
      total: number;
    };
  };
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  fullName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  avatar?: string;
  role: 'student' | 'admin';
  accountStatus: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string;
  institution?: string;
  joinedDate?: string;
  earnedCertificates?: Certificate[];
  isPremium?: boolean;
  isPremiumDate?: string;
  isPremiumExpiryDate?: string;
  inPremiumDate?: string;
  inPremiumExpiryDate?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  gateway: 'bkash' | 'nagad' | 'rocket' | 'card' | string;
  transactionId: string;
  amount: number;
  paymentStatus: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

export interface Certificate {
  id: string;
  examTitle: string;
  issueDate: string;
  score: number;
  credentialId: string;
}

export interface Review {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
}

export interface MinistryBankQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  subject?: string;
}

export interface MinistryQuestionBank {
  id: string;
  ministryName: string; // e.g. "অর্থ মন্ত্রণালয়" or "জনপ্রশাসন মন্ত্রণালয়"
  title: string; // e.g. "সহকারী পরিচালক নিয়োগ প্রশ্ন ব্যাংক ২০২৫"
  totalQuestions: number;
  durationMinutes?: number;
  questions: MinistryBankQuestion[];
  dateCreated: string;
  isPublished?: boolean;
  isPremium?: boolean;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  examsTaken: number;
  streak: number;
}

export interface UpcomingExamSettings {
  id?: string;
  title: string;
  description?: string;
  examId?: string;
  examDate?: string;
  startDate?: string;
  startTime?: string;
  duration?: number;
  durationMinutes?: number;
  isPublished?: boolean;
  subject?: string;
  totalQuestions?: number;
  totalMarks?: number;
  isPremium?: boolean;
  updatedBy?: string;
  updatedAt?: string | any;
  lastUpdated?: string;
}

export interface UpcomingExamDoc {
  examId: string;
  title: string;
  description?: string;
  examDateTime?: string;
  startDate?: string;
  startTime?: string;
  archiveDateTime?: string;
  archiveTime?: string;
  examDate?: string;
  archiveDate?: string;
  examType: 'free' | 'premium' | string;
  status: 'upcoming' | 'live' | 'archive' | 'completed' | string;
  isPublished: boolean;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
  duration?: number;
  durationMinutes?: number;
  subject?: string;
  totalQuestions?: number;
  totalMarks?: number;
  questions?: Question[];
}

export interface ExamContentDoc {
  examId: string;
  title: string;
  description?: string;
  examType?: string;
  duration: number;
  totalMarks: number;
  totalQuestions: number;
  status: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

export interface ExamQuestionDoc {
  questionId: string;
  questionNumber?: number;
  question?: string;
  questionText?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  marks: number;
  createdAt?: any;
  updatedAt?: any;
}

