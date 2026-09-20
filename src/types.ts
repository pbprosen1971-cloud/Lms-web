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
  questions?: Question[];
  userAnswers?: Record<string, number>;
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  fullName: string;
  displayName?: string;
  email: string;
  phone?: string;
  photoURL?: string;
  avatar?: string;
  role: 'student' | 'admin';
  accountStatus: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string;
  studentId?: string;
  institution?: string;
  batch?: string;
  registrationDate?: string;
  joinedDate?: string;
  earnedCertificates?: Certificate[];
  isPremium?: boolean;
  isPremiumDate?: string;
  isPremiumExpiryDate?: string;
  inPremiumDate?: string;
  inPremiumExpiryDate?: string;
  referralCode?: string;
  referralCount?: number;
  referredBy?: string;
  referredAt?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerCode: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail: string;
  createdAt: string;
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
  archiveTime?: string;
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
  items?: UpcomingExamSettings[];
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

export type StudyMaterialCategory =
  | 'Syllabus'
  | 'Previous Questions'
  | 'Notes'
  | 'Suggestion'
  | 'Job Preparation'
  | 'Admission Preparation'
  | 'Other'
  | string;

export type StudyMaterialAccessType = 'free' | 'premium';
export type StudyMaterialStatus = 'published' | 'draft' | 'hidden';

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  category: StudyMaterialCategory;
  driveUrl: string;
  driveFileId: string;
  accessType: StudyMaterialAccessType; // 'free' | 'premium'
  status: StudyMaterialStatus; // 'published' | 'draft' | 'hidden'
  displayOrder?: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface MaterialAccessRecord {
  id: string;
  userId: string;
  materialId: string;
  materialTitle: string;
  category?: string;
  accessType: StudyMaterialAccessType;
  accessedAt: string;
  driveUrl?: string;
  driveFileId?: string;
}

// ==========================================
// DAILY PRACTICE TYPES
// ==========================================

export interface DailyPracticeSession {
  id: string;
  userId: string;
  dateKey: string; // e.g. "2026-09-14"
  questionIds: string[];
  questions?: Question[];
  totalQuestions: number;
  completed: boolean;
  score?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  timeSpentSeconds?: number;
  answers?: Record<string, number>;
  createdAt: string;
  completedAt?: string;
}

// ==========================================
// WRONG QUESTION TYPES
// ==========================================

export interface WrongQuestionRecord {
  questionId: string;
  userId: string;
  questionText: string;
  subject: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  addedAt: string;
  wrongCount: number;
  lastWrongAt: string;
  status: 'unmastered' | 'mastered';
  lastPracticedAt?: string;
  lastResult?: 'correct' | 'wrong';
}

// ==========================================
// MANUAL MOBILE BANKING PAYMENT SYSTEM TYPES
// ==========================================

export type PaymentMethodType = 'bkash' | 'nagad' | 'upay' | 'rocket';

export interface PaymentMethodConfig {
  id: PaymentMethodType;
  name: string;
  nameBn: string;
  enabled: boolean;
  accountNumber: string;
  accountName: string;
  accountType?: string; // 'Personal (Send Money)' | 'Merchant' | 'Agent'
  instruction: string;
  brandColor: string;
}

export interface PaymentPlan {
  id: string;
  title: string;
  duration: string;
  durationDays: number;
  price: number;
  priceFormatted: string;
  description: string;
  badge?: string | null;
  popular?: boolean;
  features: string[];
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  packageId: string;
  packageTitle: string;
  packageDurationDays?: number;
  transactionId: string;
  senderNumber: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}


