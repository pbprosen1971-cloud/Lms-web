/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  PlusCircle,
  Settings,
  Download,
  BookOpen,
  Search,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Calendar,
  ShieldCheck,
  Play,
  Sparkles,
  Crown,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  X,
  ListPlus,
  Star,
  Plus,
  Trophy,
  CreditCard,
  FileDown,
  Printer,
  Loader2,
  Filter,
} from 'lucide-react';
import {
  Exam,
  ExamResult,
  MinistryBankQuestion,
  MinistryQuestionBank,
  Question,
  UserProfile,
  UpcomingExamSettings,
  UpcomingExamDoc,
  ExamQuestionDoc,
} from '../types';
import { onSnapshot, collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  safeTimestampToString,
  safeDateOnlyString,
  formatSafeDisplay,
} from '../lib/dateUtils';
import SheetsSync from './SheetsSync';
import AdminGoogleSheetsTab from './AdminGoogleSheetsTab';
import { AdminLiveArchivedExamTab } from './AdminLiveArchivedExamTab';
import AdminReferralLeaderboard from './AdminReferralLeaderboard';
import { generateStudentResultsPdfReport } from '../services/pdfReportService';
import {
  saveQuestionToFirestore,
  deleteQuestionFromFirestore,
  saveExamToFirestore,
  deleteExamFromFirestore,
  toggleExamPublishInFirestore,
  saveUpcomingExamSettings,
  saveUpcomingExamScheduleToFirestore,
  updateUpcomingExamInFirestore,
  deleteUpcomingExamFromFirestore,
  saveQuestionToExamContent,
  deleteQuestionFromExamContent,
  subscribeToExamQuestions,
  clearUpcomingExamSettings,
  deleteUpcomingExamFromSiteSettings,
} from '../services/firestoreService';
import {
  readAndValidateQuestionsFromSheet,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  SheetQuestionsParseResult,
} from '../services/googleSheetsService';
import {
  isGoogleConnected,
  connectGoogleSheetsAccount,
} from '../lib/googleAuth';
import AdminStudyMaterials from './AdminStudyMaterials';
import AdminPaymentManagement from './AdminPaymentManagement';

const formatBanglaDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return dateTimeStr;
  try {
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return date.toLocaleString();
  }
};

interface AdminViewProps {
  exams: Exam[];
  results: ExamResult[];
  onCreateExam: (newExam: Exam) => void;
  onUpdateExam?: (updatedExam: Exam) => void;
  onDeleteExam?: (examId: string) => void;
  ministryBanks?: MinistryQuestionBank[];
  onSaveMinistryBank?: (newBank: MinistryQuestionBank) => void;
  onDeleteMinistryBank?: (bankId: string) => void;
  setView: (view: string) => void;
  onUpdateUser?: (updated: UserProfile) => void;
  currentUser?: UserProfile | null;
  upcomingExamSettings?: UpcomingExamSettings | null;
  onSaveUpcomingExamSettings?: (settings: UpcomingExamSettings) => Promise<void> | void;
}

const SUBJECT_OPTIONS = ['বাংলা', 'ইংরেজি', 'গণিত', 'GK', 'ICT', 'বিজ্ঞান'];
const DOPTOR_OPTIONS = ['BCS', 'Bank', '11th - 20th Grade Job'];

export default function AdminView({
  exams,
  results,
  onCreateExam,
  onUpdateExam,
  onDeleteExam,
  ministryBanks = [],
  onSaveMinistryBank,
  onDeleteMinistryBank,
  setView,
  onUpdateUser,
  currentUser,
  upcomingExamSettings,
  onSaveUpcomingExamSettings,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'students' | 'results' | 'create_exam' | 'questions' | 'settings' | 'upcoming_exams' | 'live_archived_exams' | 'google_sheets' | 'referral_leaderboard' | 'study_materials' | 'payments'>('analytics');

  // Ministry Question Bank Admin Form State
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [selectedMinistryDropdown, setSelectedMinistryDropdown] = useState<string>('');
  const [customMinistryName, setCustomMinistryName] = useState<string>('');
  const [mbTitle, setMbTitle] = useState<string>('');
  const [mbDuration, setMbDuration] = useState<number>(10);

  // Single question input state for ministry question bank
  const [qText, setQText] = useState<string>('');
  const [qOpt1, setQOpt1] = useState<string>('');
  const [qOpt2, setQOpt2] = useState<string>('');
  const [qOpt3, setQOpt3] = useState<string>('');
  const [qOpt4, setQOpt4] = useState<string>('');
  const [qCorrect, setQCorrect] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState<string>('');
  const [qSubject, setQSubject] = useState<string>('সাধারণ জ্ঞান');

  // List of questions added to the current question bank set being created/edited
  const [mbQuestionsList, setMbQuestionsList] = useState<MinistryBankQuestion[]>([]);
  const [mbSuccessMsg, setMbSuccessMsg] = useState<string>('');

  // Google Sheets import state for Ministry Question Bank
  const [showMbSheetModal, setShowMbSheetModal] = useState<boolean>(false);
  const [mbSpreadsheetId, setMbSpreadsheetId] = useState<string>(getSavedSpreadsheetId() || '');
  const [mbSheetTabName, setMbSheetTabName] = useState<string>('Question Bank');
  const [mbImportTargetMinistry, setMbImportTargetMinistry] = useState<string>('');
  const [mbImportTargetTitle, setMbImportTargetTitle] = useState<string>('');
  const [mbImportLoading, setMbImportLoading] = useState<boolean>(false);
  const [mbImportConnecting, setMbImportConnecting] = useState<boolean>(false);
  const [mbImportError, setMbImportError] = useState<string>('');
  const [mbParsedSheetData, setMbParsedSheetData] = useState<SheetQuestionsParseResult | null>(null);
  const [mbAppendMode, setMbAppendMode] = useState<'append' | 'replace'>('append');

  // Extract existing ministry names for the dropdown
  const existingMinistries = useMemo(() => {
    const set = new Set<string>();
    (ministryBanks || []).forEach(b => {
      if (b.ministryName && b.ministryName.trim()) {
        set.add(b.ministryName.trim());
      }
    });
    return Array.from(set);
  }, [ministryBanks]);

  // Reset the question bank form
  const handleResetMinistryForm = () => {
    setEditingBankId(null);
    setSelectedMinistryDropdown('');
    setCustomMinistryName('');
    setMbTitle('');
    setMbDuration(10);
    setMbQuestionsList([]);
    setQText('');
    setQOpt1('');
    setQOpt2('');
    setQOpt3('');
    setQOpt4('');
    setQCorrect(0);
    setQExplanation('');
  };

  // Start adding more questions to an existing bank
  const handleStartAddMoreQuestions = (bank: MinistryQuestionBank) => {
    setEditingBankId(bank.id);
    setSelectedMinistryDropdown(bank.ministryName);
    setCustomMinistryName('');
    setMbTitle(bank.title);
    setMbDuration(bank.durationMinutes || 10);
    setMbQuestionsList(bank.questions ? [...bank.questions] : []);

    const formEl = document.getElementById('ministry-bank-form-header');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }

    setMbSuccessMsg(`"${bank.title}" লোড করা হয়েছে। নিচে আরও নতুন প্রশ্ন যুক্ত করে সংরক্ষণ করুন।`);
    setTimeout(() => setMbSuccessMsg(''), 4000);
  };

  // Toggle Home Page publication status for a ministry bank
  const handleTogglePublishMinistryBank = (bank: MinistryQuestionBank) => {
    const isCurrentlyPublished = bank.isPublished !== false;
    const updatedBank: MinistryQuestionBank = {
      ...bank,
      isPublished: !isCurrentlyPublished,
    };

    if (onSaveMinistryBank) {
      onSaveMinistryBank(updatedBank);
    }

    const actionText = !isCurrentlyPublished
      ? `"${bank.title}" হোম পেজে সফলভাবে প্রকাশ করা হয়েছে!`
      : `"${bank.title}" হোম পেজ থেকে নামানো হয়েছে (খসড়া হিসেবে সংরক্ষিত)।`;

    setMbSuccessMsg(actionText);
    setTimeout(() => setMbSuccessMsg(''), 4000);
  };

  // Handle adding a single question to draft list
  const handleAddQuestionToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !qOpt1.trim() || !qOpt2.trim() || !qOpt3.trim() || !qOpt4.trim()) {
      alert('অনুগ্রহ করে প্রশ্ন ও ৪টি অপশন সঠিকভাবে পূরণ করুন।');
      return;
    }

    const newQuestion: MinistryBankQuestion = {
      id: `mbq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text: qText.trim(),
      options: [qOpt1.trim(), qOpt2.trim(), qOpt3.trim(), qOpt4.trim()],
      correctAnswer: qCorrect,
      explanation: qExplanation.trim() || undefined,
      subject: qSubject.trim() || 'সাধারণ জ্ঞান',
    };

    setMbQuestionsList(prev => [...prev, newQuestion]);

    // Reset single question input fields
    setQText('');
    setQOpt1('');
    setQOpt2('');
    setQOpt3('');
    setQOpt4('');
    setQCorrect(0);
    setQExplanation('');
  };

  // Connect Google account directly from the Ministry Question Bank import modal
  const handleMbConnectGoogle = async () => {
    setMbImportConnecting(true);
    setMbImportError('');
    try {
      await connectGoogleSheetsAccount();
    } catch (err: any) {
      console.error('Connect Google error in ministry modal:', err);
      setMbImportError(err?.message || 'Google অ্যাকাউন্ট কানেক্ট করতে সমস্যা হয়েছে।');
    } finally {
      setMbImportConnecting(false);
    }
  };

  // Open Google Sheets import modal and prefill ministry/title if available
  const handleOpenMbSheetModal = () => {
    const currentMinistry = (selectedMinistryDropdown && selectedMinistryDropdown !== '__NEW__')
      ? selectedMinistryDropdown
      : customMinistryName.trim();
    setMbImportTargetMinistry(currentMinistry);
    setMbImportTargetTitle(mbTitle.trim());
    setMbImportError('');
    setMbParsedSheetData(null);
    if (!mbSpreadsheetId) {
      setMbSpreadsheetId(getSavedSpreadsheetId() || '');
    }
    setShowMbSheetModal(true);
  };

  // Fetch & Validate questions from Google Sheet for Ministry Question Bank
  const handleMbFetchQuestionsFromSheet = async () => {
    if (!mbSpreadsheetId.trim()) {
      setMbImportError('অনুগ্রহ করে গুগল স্প্রেডশীট আইডি বা লিংক প্রদান করুন।');
      return;
    }
    if (!isGoogleConnected()) {
      setMbImportError('প্রশ্ন পড়তে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setMbImportLoading(true);
    setMbImportError('');
    setMbParsedSheetData(null);

    try {
      // Save ID for future use
      saveSpreadsheetId(mbSpreadsheetId.trim());

      const result = await readAndValidateQuestionsFromSheet(
        mbSpreadsheetId.trim(),
        undefined, // targetExamId not needed for ministry bank
        mbSheetTabName.trim() || 'Question Bank'
      );

      setMbParsedSheetData(result);

      if (result.totalRows === 0) {
        setMbImportError(`"${mbSheetTabName}" ট্যাবে কোনো প্রশ্নের রেকর্ড পাওয়া যায়নি। ট্যাবটির নাম ও কলাম ঠিক আছে কিনা নিশ্চিত করুন।`);
      } else if (result.validCount === 0) {
        setMbImportError(`শিট থেকে ${result.totalRows} টি সারি পাওয়া গেলেও কোনো বৈধ বহুনির্বাচনী প্রশ্ন পাওয়া যায়নি। কলাম ও ফরম্যাট যাচাই করুন।`);
      }
    } catch (err: any) {
      console.error('Fetch ministry questions from sheet error:', err);
      setMbImportError(err?.message || 'গুগল শিট থেকে প্রশ্ন পড়তে সমস্যা হয়েছে। স্প্রেডশীট এক্সেস ও ইন্টারনেট কানেকশন যাচাই করুন।');
    } finally {
      setMbImportLoading(false);
    }
  };

  // Apply parsed questions from Google Sheet into the Ministry Question Bank draft list
  const handleApplyMbSheetQuestions = () => {
    if (!mbParsedSheetData || mbParsedSheetData.validQuestions.length === 0) {
      setMbImportError('ইমপোর্ট করার জন্য কোনো বৈধ প্রশ্ন পাওয়া যায়নি।');
      return;
    }

    // Convert sheet questions to MinistryBankQuestion format
    const convertedQuestions: MinistryBankQuestion[] = mbParsedSheetData.validQuestions.map((vq, idx) => {
      const q = vq.question;
      return {
        id: `mbq-sheet-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        text: q.text,
        options: Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : [
              q.options?.[0] || 'বিকল্প ১',
              q.options?.[1] || 'বিকল্প ২',
              q.options?.[2] || 'বিকল্প ৩',
              q.options?.[3] || 'বিকল্প ৪'
            ],
        correctAnswer: (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3)
          ? q.correctAnswer
          : 0,
        explanation: q.explanation || undefined,
        subject: q.subject || 'সাধারণ জ্ঞান',
      };
    });

    // Update draft questions list
    if (mbAppendMode === 'replace') {
      setMbQuestionsList(convertedQuestions);
    } else {
      setMbQuestionsList(prev => [...prev, ...convertedQuestions]);
    }

    // If ministry name was typed in the modal and not set in main form, copy it over
    if (mbImportTargetMinistry.trim() && !selectedMinistryDropdown && !customMinistryName) {
      if (existingMinistries.includes(mbImportTargetMinistry.trim())) {
        setSelectedMinistryDropdown(mbImportTargetMinistry.trim());
      } else {
        setSelectedMinistryDropdown('__NEW__');
        setCustomMinistryName(mbImportTargetMinistry.trim());
      }
    }

    // If bank title was typed in modal and not set in main form, copy it over
    if (mbImportTargetTitle.trim() && !mbTitle) {
      setMbTitle(mbImportTargetTitle.trim());
    }

    const importedCount = convertedQuestions.length;
    setShowMbSheetModal(false);
    setMbParsedSheetData(null);
    setMbSuccessMsg(`🎉 গুগল শিট থেকে সফলভাবে ${importedCount} টি প্রশ্ন প্রশ্ন ব্যাংকে ইমপোর্ট করা হয়েছে! এবার শিরোনাম ও তথ্য নিশ্চিত করে নিচে "প্রশ্ন ব্যাংক সংরক্ষণ করুন" বাটনে ক্লিক করুন।`);
    setTimeout(() => setMbSuccessMsg(''), 6000);

    // Smooth scroll to the questions draft list
    setTimeout(() => {
      const el = document.getElementById('ministry-bank-form-header');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Handle saving the full Ministry Question Bank
  const handleSaveMinistryQuestionBank = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMinistry = (selectedMinistryDropdown && selectedMinistryDropdown !== '__NEW__')
      ? selectedMinistryDropdown
      : customMinistryName.trim();

    if (!targetMinistry) {
      alert('অনুগ্রহ করে মন্ত্রণালয়ের নাম সিলেক্ট বা প্রদান করুন।');
      return;
    }
    if (!mbTitle.trim()) {
      alert('অনুগ্রহ করে প্রশ্ন ব্যাংকের শিরোনাম প্রদান করুন।');
      return;
    }
    if (mbQuestionsList.length === 0) {
      alert('কমপক্ষে ১ টি প্রশ্ন যুক্ত করুন।');
      return;
    }

    // Find if editing existing bank to preserve its publication state
    const existingBank = editingBankId ? ministryBanks.find(b => b.id === editingBankId) : null;

    const savedBank: MinistryQuestionBank = {
      id: editingBankId || `min-bank-${Date.now()}`,
      ministryName: targetMinistry,
      title: mbTitle.trim(),
      totalQuestions: mbQuestionsList.length,
      durationMinutes: mbDuration || 10,
      questions: mbQuestionsList,
      dateCreated: existingBank?.dateCreated || new Date().toLocaleDateString('bn-BD'),
      isPublished: existingBank ? (existingBank.isPublished ?? true) : true, // published by default
    };

    if (onSaveMinistryBank) {
      onSaveMinistryBank(savedBank);
    }

    setMbSuccessMsg(
      editingBankId
        ? `"${targetMinistry}" এর অধীনে "${mbTitle}" প্রশ্ন ব্যাংক আপডেট ও সংরক্ষণ করা হয়েছে!`
        : `"${targetMinistry}" এর অধীনে "${mbTitle}" প্রশ্ন ব্যাংকটি সফলভাবে সংরক্ষিত হয়েছে!`
    );
    setTimeout(() => setMbSuccessMsg(''), 4000);

    // Reset form after saving
    handleResetMinistryForm();
  };
  
  // Real-time Firestore subscribers
  const [firestoreStudents, setFirestoreStudents] = useState<any[]>([]);
  const [firestoreResults, setFirestoreResults] = useState<ExamResult[]>([]);
  const [deletedMockEmails, setDeletedMockEmails] = useState<string[]>([]);
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Listen to all users collection in Firebase Firestore in real-time
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const uid = data.uid || docSnap.id;
        let isPrem = !!data.isPremium;
        let isPremDate = data.isPremiumDate || '';
        let isPremExpiryDate = data.isPremiumExpiryDate || '';

        // Auto check expiration
        if (isPrem && isPremExpiryDate) {
          const expTime = new Date(isPremExpiryDate).getTime();
          if (!isNaN(expTime) && expTime < Date.now()) {
            isPrem = false;
            isPremDate = '';
            isPremExpiryDate = '';
            try {
              setDoc(doc(db, 'users', docSnap.id), {
                isPremium: false,
                isPremiumDate: '',
                isPremiumExpiryDate: '',
              }, { merge: true });
            } catch (e) {
              console.warn("Auto-expiry firestore update failed:", e);
            }
          }
        }

        list.push({
          ...data,
          id: docSnap.id,
          uid: uid,
          name: String(data.fullName || data.name || (data.email ? data.email.split('@')[0] : 'ইউজার')),
          fullName: String(data.fullName || data.name || (data.email ? data.email.split('@')[0] : 'ইউজার')),
          email: String(data.email || ''),
          role: String(data.role || 'student'),
          accountStatus: String(data.accountStatus || 'active'),
          createdAt: safeTimestampToString(data.createdAt, ''),
          lastLogin: safeTimestampToString(data.lastLogin, ''),
          joinedDate: safeDateOnlyString(data.joinedDate || data.createdAt, new Date().toLocaleDateString('bn-BD')),
          institution: String(data.institution || ''),
          phone: String(data.phone || ''),
          isPremium: isPrem,
          isPremiumDate: safeTimestampToString(isPremDate, ''),
          isPremiumExpiryDate: safeTimestampToString(isPremExpiryDate, ''),
        });
      });
      setFirestoreStudents(list);
      setDbLoading(false);
    }, (error) => {
      console.warn("Error listening to users collection:", error);
      setDbLoading(false);
    });

    // 2. Listen to results collection
    const unsubscribeResults = onSnapshot(collection(db, 'results'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          ...data,
          id: docSnap.id || data.id,
          userId: String(data.userId || data.studentId || 'guest'),
          studentId: String(data.studentId || data.userId || 'guest'),
          studentName: String(data.studentName || 'ইউজার'),
          studentEmail: String(data.studentEmail || ''),
          examId: String(data.examId || ''),
          examTitle: String(data.examTitle || ''),
          subject: String(data.subject || ''),
          score: Number(data.score || 0),
          totalMarks: Number(data.totalMarks || 0),
          percentage: Number(data.percentage || 0),
          totalQuestions: Number(data.totalQuestions || 0),
          correctAnswers: Number(data.correctAnswers || 0),
          wrongAnswers: Number(data.wrongAnswers || 0),
          skippedAnswers: Number(data.skippedAnswers || 0),
          unansweredQuestions: Number(data.unansweredQuestions || 0),
          submittedAt: safeTimestampToString(data.submittedAt || data.createdAt, new Date().toISOString()),
          dateTaken: safeDateOnlyString(data.dateTaken || data.submittedAt || data.createdAt, new Date().toLocaleDateString('bn-BD')),
          timeSpentSeconds: Number(data.timeSpentSeconds || 0),
          subjectPerformance: data.subjectPerformance || {},
        } as ExamResult);
      });
      list.sort((a, b) => b.id.localeCompare(a.id));
      setFirestoreResults(list);
    }, (error) => {
      console.warn("Error listening to results collection:", error);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeResults();
    };
  }, []);

  // Create Exam state variables
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('বাংলা');
  const [newDuration, setNewDuration] = useState(15);
  const [newStatus, setNewStatus] = useState<'live' | 'upcoming'>('upcoming');
  const [newQuestions, setNewQuestions] = useState<Omit<Question, 'id'>[]>([
    { text: '', options: ['', '', '', ''], correctAnswer: 0, subject: '' },
  ]);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  // Upcoming Exam creation & questions addition state variables
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const archiveTimeInputRef = useRef<HTMLInputElement>(null);

  const handleOpenPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const el = ref.current as any;
    if (el) {
      if (typeof el.showPicker === 'function') {
        try {
          el.showPicker();
        } catch {
          el.focus?.();
        }
      } else {
        el.focus?.();
      }
    }
  };

  const [upcomingTitle, setUpcomingTitle] = useState('');
  const [upcomingDescription, setUpcomingDescription] = useState('');
  const [upcomingSubject, setUpcomingSubject] = useState('BCS');
  const [upcomingDuration, setUpcomingDuration] = useState(30);
  const [upcomingStartTime, setUpcomingStartTime] = useState('');
  const [upcomingArchiveTime, setUpcomingArchiveTime] = useState('');
  const [upcomingIsPremium, setUpcomingIsPremium] = useState<boolean>(false);
  const [upcomingIsPublished, setUpcomingIsPublished] = useState<boolean>(true);
  const [editingUpcomingExamId, setEditingUpcomingExamId] = useState<string | null>(null);
  const [upcomingSaving, setUpcomingSaving] = useState<boolean>(false);
  const [upcomingSuccessMsg, setUpcomingSuccessMsg] = useState<string>('');
  const [upcomingErrorMsg, setUpcomingErrorMsg] = useState<string>('');
  const [selectedUpcomingExamForQuestions, setSelectedUpcomingExamForQuestions] = useState<Exam | null>(null);

  // Dedicated Firestore siteSettings/upcomingExam multi-exam persistent state
  const [isEditingFeatured, setIsEditingFeatured] = useState<boolean>(false);
  const [isAddingNewUpcoming, setIsAddingNewUpcoming] = useState<boolean>(false);
  const [settingTitle, setSettingTitle] = useState<string>('');
  const [settingDesc, setSettingDesc] = useState<string>('');
  const [settingSubject, setSettingSubject] = useState<string>('BCS');
  const [settingDuration, setSettingDuration] = useState<number>(30);
  const [settingStartTime, setSettingStartTime] = useState<string>('');
  const [settingDate, setSettingDate] = useState<string>('');
  const [settingIsPublished, setSettingIsPublished] = useState<boolean>(true);
  const [settingIsPremium, setSettingIsPremium] = useState<boolean>(false);
  const [settingExamId, setSettingExamId] = useState<string>('');
  const [settingSaving, setSettingSaving] = useState<boolean>(false);
  const [settingSuccessMsg, setSettingSuccessMsg] = useState<string>('');
  const [settingErrorMsg, setSettingErrorMsg] = useState<string>('');
  const [lastSavedUpcomingExam, setLastSavedUpcomingExam] = useState<Exam | null>(null);

  // Combined multiple upcoming exams from siteSettings and exams collection
  const combinedUpcomingExams = useMemo(() => {
    const list: Array<{
      id: string;
      examId: string;
      title: string;
      subject: string;
      description?: string;
      durationMinutes: number;
      startTime?: string;
      startDate?: string;
      examDate?: string;
      isPublished: boolean;
      isPremium: boolean;
      totalQuestions: number;
      totalMarks: number;
      questions?: Question[];
    }> = [];

    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    const itemsFromSettings = (upcomingExamSettings?.items && Array.isArray(upcomingExamSettings.items) && upcomingExamSettings.items.length > 0)
      ? upcomingExamSettings.items
      : (upcomingExamSettings && upcomingExamSettings.title ? [upcomingExamSettings] : []);

    itemsFromSettings.forEach(item => {
      if (!item || !item.title) return;
      const tKey = item.title.trim().toLowerCase();
      const examId = item.examId || item.id || `upcoming-${tKey}`;

      const matchExam = exams.find(e => e.id === examId || e.title.trim().toLowerCase() === tKey);
      const qCount = matchExam?.questions?.length || matchExam?.totalQuestions || item.totalQuestions || 0;

      list.push({
        id: examId,
        examId: examId,
        title: item.title,
        subject: item.subject || matchExam?.subject || 'BCS',
        description: item.description || (matchExam as any)?.description || '',
        durationMinutes: item.durationMinutes || item.duration || matchExam?.durationMinutes || 30,
        startTime: item.startTime || matchExam?.startTime || '',
        startDate: item.startDate || matchExam?.startDate || '',
        examDate: (item.examDate && item.examDate !== matchExam?.dateCreated) ? item.examDate : ((matchExam as any)?.examDate && (matchExam as any)?.examDate !== matchExam?.dateCreated ? (matchExam as any)?.examDate : ''),
        isPublished: item.isPublished !== false,
        isPremium: !!item.isPremium || !!matchExam?.isPremium,
        totalQuestions: qCount,
        totalMarks: qCount,
        questions: matchExam?.questions || [],
      });
      seenIds.add(examId);
      seenTitles.add(tKey);
    });

    exams.filter(e => e.status === 'upcoming').forEach(exam => {
      const tKey = (exam.title || '').trim().toLowerCase();
      if (!seenIds.has(exam.id) && !seenTitles.has(tKey)) {
        const qCount = exam.questions?.length || exam.totalQuestions || 0;
        list.push({
          id: exam.id,
          examId: exam.id,
          title: exam.title,
          subject: exam.subject || 'BCS',
          description: (exam as any).description || '',
          durationMinutes: exam.durationMinutes || 30,
          startTime: exam.startTime || '',
          startDate: exam.startDate || '',
          examDate: (exam as any).examDate && (exam as any).examDate !== exam.dateCreated ? (exam as any).examDate : '',
          isPublished: exam.isPublished !== false,
          isPremium: !!exam.isPremium,
          totalQuestions: qCount,
          totalMarks: qCount,
          questions: exam.questions || [],
        });
        seenIds.add(exam.id);
        seenTitles.add(tKey);
      }
    });

    return list;
  }, [upcomingExamSettings, exams]);

  const handleStartAddNewUpcoming = () => {
    setSettingExamId(`upcoming-exam-${Date.now()}`);
    setSettingTitle('');
    setSettingDesc('');
    setSettingSubject('BCS');
    setSettingDuration(30);
    setSettingStartTime('');
    setSettingDate('');
    setSettingIsPremium(false);
    setSettingIsPublished(true);
    setIsAddingNewUpcoming(true);
    setEditingUpcomingExamId(null);
    setIsEditingFeatured(false);
    setSettingErrorMsg('');
    setSettingSuccessMsg('');
  };

  const handleStartEditUpcoming = (item: any) => {
    const examId = item.examId || item.id;
    setSettingExamId(examId);
    setSettingTitle(item.title || '');
    setSettingDesc(item.description || '');
    setSettingSubject(item.subject || 'BCS');
    setSettingDuration(item.durationMinutes || item.duration || 30);
    const cleanStart = (item.startTime && item.startTime !== item.dateCreated && item.startTime !== 'নির্ধারিত নেই') ? item.startTime : '';
    const cleanDate = (item.examDate && item.examDate !== item.dateCreated && item.examDate !== 'নির্ধারিত নেই') 
      ? item.examDate 
      : ((item.startDate && item.startDate !== item.dateCreated && item.startDate !== 'নির্ধারিত নেই') ? item.startDate : '');
    setSettingStartTime(cleanStart);
    setSettingDate(cleanDate);
    setSettingIsPremium(!!item.isPremium);
    setSettingIsPublished(item.isPublished !== false);
    setEditingUpcomingExamId(examId);
    setIsAddingNewUpcoming(false);
    setIsEditingFeatured(false);
    setSettingErrorMsg('');
    setSettingSuccessMsg('');
  };

  const handleCancelUpcomingForm = () => {
    setIsAddingNewUpcoming(false);
    setEditingUpcomingExamId(null);
    setIsEditingFeatured(false);
    setSettingErrorMsg('');
  };

  const handleDeleteUpcomingExamItem = async (examId: string, examTitle: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${examTitle}" আপকামিং পরীক্ষাটি মুছে ফেলতে চান? এটি ডাটাবেজ থেকেও মুছে যাবে।`)) {
      return;
    }
    try {
      setSettingSaving(true);
      await deleteUpcomingExamFromSiteSettings(examId);
      await deleteUpcomingExamFromFirestore(examId);
      if (onDeleteExam) {
        onDeleteExam(examId);
      }
      setSettingSuccessMsg(`"${examTitle}" পরীক্ষাটি সফলভাবে মুছে ফেলা হয়েছে।`);
      setTimeout(() => setSettingSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setSettingErrorMsg('পরীক্ষাটি মুছতে সমস্যা হয়েছে।');
    } finally {
      setSettingSaving(false);
    }
  };

  const handleTogglePublishUpcomingExam = async (item: any) => {
    const newStatus = item.isPublished === false;
    const examId = item.examId || item.id;
    try {
      setSettingSaving(true);
      const updatedItem: UpcomingExamSettings = {
        title: item.title,
        description: item.description,
        subject: item.subject,
        duration: item.durationMinutes || 30,
        durationMinutes: item.durationMinutes || 30,
        startTime: item.startTime,
        examDate: item.examDate,
        isPublished: newStatus,
        isPremium: !!item.isPremium,
        examId: examId,
        updatedBy: currentUser?.email || 'medha@admin.com',
      };
      await saveUpcomingExamSettings(updatedItem, currentUser?.uid || 'admin');
      if (onSaveUpcomingExamSettings) {
        await onSaveUpcomingExamSettings(updatedItem);
      }
      setSettingSuccessMsg(newStatus ? `"${item.title}" পরীক্ষাটি হোম পেজে দৃশ্যমান করা হয়েছে।` : `"${item.title}" পরীক্ষাটি লুকানো হয়েছে (খসড়া)।`);
      setTimeout(() => setSettingSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSettingSaving(false);
    }
  };

  const handleMakeUpcomingExamLive = async (item: any) => {
    const targetExamId = item.examId || item.id || `upcoming-exam-${Date.now()}`;
    const existingExam = exams.find(e => e.id === targetExamId || e.title === item.title);
    const qList = item.questions || existingExam?.questions || [];
    const liveExam: Exam = {
      id: targetExamId,
      title: item.title,
      subject: item.subject || 'BCS',
      durationMinutes: item.durationMinutes || 30,
      totalQuestions: qList.length,
      totalMarks: qList.length,
      status: 'live',
      isPublished: true,
      isPremium: !!item.isPremium,
      startTime: item.startTime || undefined,
      dateCreated: item.examDate || new Date().toISOString().split('T')[0],
      questions: qList,
    };

    try {
      await updateUpcomingExamInFirestore(targetExamId, {
        status: 'live',
        isPublished: true,
        questions: qList,
        totalQuestions: qList.length,
        totalMarks: qList.length,
      });
      await clearUpcomingExamSettings(targetExamId);
      if (onUpdateExam) {
        onUpdateExam(liveExam);
      }
      setSettingSuccessMsg(`"${item.title}" পরীক্ষাটি সরাসরি লাইভ করা হয়েছে এবং চলমান পরীক্ষায় স্থানান্তরিত হয়েছে!`);
      setTimeout(() => setSettingSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Error making live:', err);
      if (onUpdateExam) onUpdateExam(liveExam);
    }
  };

  // Real-time Firestore sync for questions of the selected upcoming exam
  useEffect(() => {
    if (!selectedUpcomingExamForQuestions?.id) return;
    const unsub = subscribeToExamQuestions(selectedUpcomingExamForQuestions.id, (liveQuestions) => {
      setSelectedUpcomingExamForQuestions(prev => {
        if (!prev || prev.id !== selectedUpcomingExamForQuestions.id) return prev;
        return {
          ...prev,
          questions: liveQuestions,
          totalQuestions: liveQuestions.length,
          totalMarks: liveQuestions.length,
        };
      });
    });
    return () => unsub();
  }, [selectedUpcomingExamForQuestions?.id]);

  useEffect(() => {
    if (upcomingExamSettings && !editingUpcomingExamId && !isAddingNewUpcoming && !settingTitle) {
      if (upcomingExamSettings.title !== undefined) setSettingTitle(upcomingExamSettings.title);
      if (upcomingExamSettings.description !== undefined) setSettingDesc(upcomingExamSettings.description || '');
      if (upcomingExamSettings.subject !== undefined) setSettingSubject(upcomingExamSettings.subject || 'BCS');
      if (upcomingExamSettings.duration !== undefined || upcomingExamSettings.durationMinutes !== undefined) {
        setSettingDuration(upcomingExamSettings.duration || upcomingExamSettings.durationMinutes || 30);
      }
      if (upcomingExamSettings.startTime !== undefined) setSettingStartTime(upcomingExamSettings.startTime || '');
      if (upcomingExamSettings.examDate !== undefined) setSettingDate(upcomingExamSettings.examDate || '');
      if (upcomingExamSettings.isPublished !== undefined) setSettingIsPublished(upcomingExamSettings.isPublished);
      if (upcomingExamSettings.isPremium !== undefined) setSettingIsPremium(!!upcomingExamSettings.isPremium);
      if (upcomingExamSettings.examId !== undefined) setSettingExamId(upcomingExamSettings.examId || '');
    }
  }, [upcomingExamSettings, editingUpcomingExamId, isAddingNewUpcoming, settingTitle]);

  const handleSaveUpcomingSettingsForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSettingErrorMsg('');
    setSettingSuccessMsg('');

    if (!settingTitle.trim()) {
      setSettingErrorMsg('দয়া করে আসন্ন পরীক্ষার শিরোনাম (Title) প্রদান করুন।');
      return;
    }

    setSettingSaving(true);
    try {
      // 1. Determine or generate Exam ID
      const targetExamId = settingExamId || `upcoming-exam-${Date.now()}`;
      const existingExam = exams.find(ex => ex.id === targetExamId);

      const rawStart = settingStartTime ? settingStartTime.trim() : '';
      const rawDate = rawStart 
        ? (rawStart.includes('T') ? rawStart.split('T')[0] : rawStart) 
        : (settingDate && settingDate !== existingExam?.dateCreated ? settingDate.trim() : '');

      // 2. Prepare Exam object for the upcoming exams list & question editor
      const syncExam: Exam = {
        id: targetExamId,
        title: settingTitle.trim(),
        description: settingDesc.trim(),
        subject: settingSubject,
        durationMinutes: Number(settingDuration) || 30,
        totalQuestions: existingExam?.questions?.length || existingExam?.totalQuestions || 0,
        totalMarks: existingExam?.questions?.length || existingExam?.totalMarks || 0,
        status: 'upcoming',
        isPublished: settingIsPublished,
        isPremium: settingIsPremium,
        startTime: rawStart || undefined,
        startDate: rawDate || undefined,
        examDate: rawDate || undefined,
        dateCreated: existingExam?.dateCreated || new Date().toISOString().split('T')[0],
        questions: existingExam?.questions || [],
      };

      // 4. Save Exam to Firestore /exam, /Exam, /exams
      await saveUpcomingExamScheduleToFirestore({
        id: targetExamId,
        title: settingTitle.trim(),
        description: settingDesc.trim(),
        subject: settingSubject,
        durationMinutes: Number(settingDuration) || 30,
        startTime: rawStart || '',
        startDate: rawDate || '',
        examDate: rawDate || '',
        archiveTime: existingExam?.archiveTime,
        isPremium: settingIsPremium,
        isPublished: settingIsPublished,
        questions: existingExam?.questions || [],
      }, currentUser?.uid || 'admin');

      if (existingExam) {
        if (onUpdateExam) onUpdateExam(syncExam);
      } else {
        if (onCreateExam) onCreateExam(syncExam);
      }
      setSettingExamId(targetExamId);
      setLastSavedUpcomingExam(syncExam);

      // 5. Prepare Upcoming Exam Settings Payload
      const payload: UpcomingExamSettings = {
        title: settingTitle.trim(),
        description: settingDesc.trim(),
        subject: settingSubject,
        duration: Number(settingDuration) || 30,
        durationMinutes: Number(settingDuration) || 30,
        startTime: rawStart || '',
        startDate: rawDate || '',
        examDate: rawDate || '',
        isPublished: settingIsPublished,
        isPremium: settingIsPremium,
        examId: targetExamId,
        updatedBy: currentUser?.email || 'medha@admin.com',
      };

      await saveUpcomingExamSettings(payload, currentUser?.uid || 'admin');
      if (onSaveUpcomingExamSettings) {
        await onSaveUpcomingExamSettings(payload);
      }
      setIsEditingFeatured(false);
      setIsAddingNewUpcoming(false);
      setEditingUpcomingExamId(null);
      setSettingSuccessMsg(`"${settingTitle.trim()}" পরীক্ষাটি ফায়ারস্টোর siteSettings ও পরীক্ষা তালিকায় সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setSettingSuccessMsg(''), 8000);
    } catch (err: any) {
      console.error('Failed to save upcoming exam settings:', err);
      setSettingErrorMsg('ফায়ারস্টোরে সেভ করতে সমস্যা হয়েছে। দয়া করে ইন্টারনেট ও ফায়ারস্টোর সংযোগ পরীক্ষা করুন।');
    } finally {
      setSettingSaving(false);
    }
  };

  const handleApplyExamToSiteSettings = async (exam: Exam) => {
    setSettingTitle(exam.title);
    setSettingSubject(exam.subject || 'BCS');
    setSettingDuration(exam.durationMinutes || 30);
    setSettingStartTime(exam.startTime || '');
    const cleanExamDate = (exam as any).examDate && (exam as any).examDate !== exam.dateCreated ? (exam as any).examDate : '';
    setSettingDate(cleanExamDate);
    setSettingIsPremium(!!exam.isPremium);
    setSettingExamId(exam.id);
    setSettingIsPublished(true);

    const payload: UpcomingExamSettings = {
      title: exam.title,
      description: (exam as any).description || `${exam.subject} স্পেশাল মডেল টেস্ট`,
      subject: exam.subject || 'BCS',
      duration: exam.durationMinutes || 30,
      durationMinutes: exam.durationMinutes || 30,
      startTime: exam.startTime || '',
      startDate: cleanExamDate,
      examDate: cleanExamDate,
      isPublished: true,
      isPremium: !!exam.isPremium,
      examId: exam.id,
      updatedBy: currentUser?.email || 'medha@admin.com',
    };

    setSettingSaving(true);
    try {
      await saveUpcomingExamSettings(payload, currentUser?.uid || 'admin');
      if (onSaveUpcomingExamSettings) {
        await onSaveUpcomingExamSettings(payload);
      }
      setSettingSuccessMsg(`"${exam.title}" পরীক্ষাটি সাইটের প্রধান আসন্ন পরীক্ষা হিসেবে ফায়ারস্টোরে সফলভাবে সেট করা হয়েছে!`);
      setTimeout(() => setSettingSuccessMsg(''), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setSettingSaving(false);
    }
  };

  const [newQuestText, setNewQuestText] = useState('');
  const [newQuestOptions, setNewQuestOptions] = useState<string[]>(['', '', '', '']);
  const [newQuestCorrect, setNewQuestCorrect] = useState<number>(0);
  const [newQuestExplanation, setNewQuestExplanation] = useState('');
  const [newQuestMarks, setNewQuestMarks] = useState<number>(1);
  const [newQuestSubject, setNewQuestSubject] = useState<string>('বাংলা');

  // Submit new or edited upcoming exam schedule
  const handleSaveUpcomingScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upcomingTitle.trim()) {
      setUpcomingErrorMsg('দয়া করে পরীক্ষার শিরোনাম প্রদান করুন।');
      return;
    }

    setUpcomingSaving(true);
    setUpcomingErrorMsg('');
    setUpcomingSuccessMsg('');

    try {
      const targetExamId = editingUpcomingExamId || `upcoming-exam-${Date.now()}`;
      const existingExam = exams.find(e => e.id === targetExamId);

      const rawStart = upcomingStartTime ? upcomingStartTime.trim() : '';
      const rawDate = rawStart ? (rawStart.includes('T') ? rawStart.split('T')[0] : rawStart) : '';

      const scheduleData = {
        id: targetExamId,
        title: upcomingTitle.trim(),
        description: upcomingDescription.trim(),
        subject: upcomingSubject,
        durationMinutes: Number(upcomingDuration) || 30,
        startTime: rawStart || '',
        startDate: rawDate || '',
        examDate: rawDate || '',
        archiveTime: upcomingArchiveTime ? upcomingArchiveTime.trim() : '',
        archiveDateTime: upcomingArchiveTime ? upcomingArchiveTime.trim() : '',
        isPremium: upcomingIsPremium,
        isPublished: upcomingIsPublished,
      };

      await saveUpcomingExamScheduleToFirestore(scheduleData, currentUser?.uid || 'admin');

      const updatedExamObj: Exam = {
        id: targetExamId,
        title: upcomingTitle.trim(),
        subject: upcomingSubject,
        durationMinutes: Number(upcomingDuration) || 30,
        totalQuestions: existingExam?.questions?.length || 0,
        totalMarks: existingExam?.questions?.length || 0,
        status: 'upcoming',
        isPublished: upcomingIsPublished,
        isPremium: upcomingIsPremium,
        startTime: rawStart || undefined,
        startDate: rawDate || undefined,
        examDate: rawDate || undefined,
        archiveTime: upcomingArchiveTime ? upcomingArchiveTime.trim() : undefined,
        dateCreated: existingExam?.dateCreated || new Date().toISOString().split('T')[0],
        questions: existingExam?.questions || [],
      };

      if (editingUpcomingExamId) {
        if (onUpdateExam) onUpdateExam(updatedExamObj);
        setUpcomingSuccessMsg(`"${upcomingTitle.trim()}" পরীক্ষাটি ফায়ারস্টোরে সফলভাবে আপডেট করা হয়েছে!`);
      } else {
        if (onCreateExam) onCreateExam(updatedExamObj);
        setUpcomingSuccessMsg(`"${upcomingTitle.trim()}" নতুন আপকামিং পরীক্ষাটি ফায়ারস্টোরে সফলভাবে শিডিউল করা হয়েছে!`);
      }

      // Reset form
      setEditingUpcomingExamId(null);
      setUpcomingTitle('');
      setUpcomingDescription('');
      setUpcomingDuration(30);
      setUpcomingStartTime('');
      setUpcomingArchiveTime('');
      setUpcomingIsPremium(false);
      setUpcomingIsPublished(true);

      setTimeout(() => setUpcomingSuccessMsg(''), 6000);
    } catch (err: any) {
      console.error("Failed to save upcoming exam:", err);
      setUpcomingErrorMsg('ফায়ারস্টোরে সংরক্ষণ করতে ত্রুটি হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setUpcomingSaving(false);
    }
  };

  // Start editing an upcoming exam
  const handleStartEditUpcomingExam = (exam: Exam) => {
    setEditingUpcomingExamId(exam.id);
    setUpcomingTitle(exam.title || '');
    setUpcomingDescription((exam as any).description || '');
    setUpcomingSubject(exam.subject || 'BCS');
    setUpcomingDuration(exam.durationMinutes || 30);
    setUpcomingStartTime(exam.startTime || '');
    setUpcomingArchiveTime(exam.archiveTime || '');
    setUpcomingIsPremium(!!exam.isPremium);
    setUpcomingIsPublished(exam.isPublished !== false);
    setUpcomingErrorMsg('');
    setUpcomingSuccessMsg('');

    const formEl = document.getElementById('upcoming-exam-schedule-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancel edit mode
  const handleCancelEditUpcomingExam = () => {
    setEditingUpcomingExamId(null);
    setUpcomingTitle('');
    setUpcomingDescription('');
    setUpcomingDuration(30);
    setUpcomingStartTime('');
    setUpcomingArchiveTime('');
    setUpcomingIsPremium(false);
    setUpcomingIsPublished(true);
    setUpcomingErrorMsg('');
  };

  // Delete an upcoming exam permanently from Firestore
  const handleDeleteUpcomingExam = async (exam: Exam) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${exam.title}" পরীক্ষাটি ফায়ারস্টোর ডেটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান? এর সকল প্রশ্নও মুছে যাবে।`)) {
      return;
    }

    try {
      await deleteUpcomingExamFromFirestore(exam.id);
      await deleteUpcomingExamFromSiteSettings(exam.id);
      if (onDeleteExam) {
        onDeleteExam(exam.id);
      }
      setUpcomingSuccessMsg(`"${exam.title}" পরীক্ষাটি ফায়ারস্টোর থেকে সফলভাবে মুছে ফেলা হয়েছে!`);
      setTimeout(() => setUpcomingSuccessMsg(''), 5000);
    } catch (err) {
      console.error("Failed to delete upcoming exam:", err);
      setUpcomingErrorMsg('পরীক্ষাটি মুছতে সমস্যা হয়েছে।');
    }
  };

  // Toggle publish status of upcoming exam
  const handleToggleUpcomingPublish = async (exam: Exam) => {
    const newPublishStatus = exam.isPublished === false;
    try {
      await updateUpcomingExamInFirestore(exam.id, {
        isPublished: newPublishStatus,
        status: newPublishStatus ? 'upcoming' : 'draft',
      });
      if (onUpdateExam) {
        onUpdateExam({ ...exam, isPublished: newPublishStatus });
      }
      setUpcomingSuccessMsg(
        newPublishStatus
          ? `"${exam.title}" পরীক্ষাটি হোম পেজে সফলভাবে প্রকাশ করা হয়েছে!`
          : `"${exam.title}" পরীক্ষাটি হোম পেজ থেকে নামানো হয়েছে (খসড়া হিসেবে সংরক্ষিত)।`
      );
      setTimeout(() => setUpcomingSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
    }
  };

  // Add a question to selected upcoming exam in /Exam/{examId}/questions
  const handleAddQuestionToUpcoming = async () => {
    if (!selectedUpcomingExamForQuestions || !newQuestText.trim()) return;

    if (newQuestOptions.some(opt => !opt.trim())) {
      alert('দয়া করে ৪টি অপশনই সঠিকভাবে পূরণ করুন।');
      return;
    }

    const currentQuestions = selectedUpcomingExamForQuestions.questions || [];
    const questionNumber = currentQuestions.length + 1;
    const questionId = `q-${selectedUpcomingExamForQuestions.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const optLetter = newQuestCorrect === 0 ? 'A' : newQuestCorrect === 1 ? 'B' : newQuestCorrect === 2 ? 'C' : 'D';

    const questionDoc: ExamQuestionDoc = {
      questionId,
      question: newQuestText.trim(),
      questionText: newQuestText.trim(),
      optionA: newQuestOptions[0].trim(),
      optionB: newQuestOptions[1].trim(),
      optionC: newQuestOptions[2].trim(),
      optionD: newQuestOptions[3].trim(),
      correctAnswer: optLetter,
      explanation: newQuestExplanation.trim(),
      marks: Number(newQuestMarks) || 1,
    };

    const newQuestionLegacy: Question = {
      id: questionId,
      text: newQuestText.trim(),
      options: [newQuestOptions[0].trim(), newQuestOptions[1].trim(), newQuestOptions[2].trim(), newQuestOptions[3].trim()],
      correctAnswer: newQuestCorrect,
      subject: newQuestSubject || selectedUpcomingExamForQuestions.subject || 'বাংলা',
      explanation: newQuestExplanation.trim() || undefined,
      questionNumber: questionNumber,
    };

    const updatedQuestions = [...currentQuestions, newQuestionLegacy];
    const updatedExam: Exam = {
      ...selectedUpcomingExamForQuestions,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
      totalMarks: updatedQuestions.length,
    };

    // Instant UI update
    setSelectedUpcomingExamForQuestions(updatedExam);

    // Reset question form
    setNewQuestText('');
    setNewQuestOptions(['', '', '', '']);
    setNewQuestCorrect(0);
    setNewQuestExplanation('');
    setNewQuestMarks(1);

    try {
      await saveQuestionToExamContent(selectedUpcomingExamForQuestions.id, questionDoc, questionNumber);

      setCreateSuccessMsg(`নতুন প্রশ্ন #${questionNumber} ফায়ারস্টোরের /Exam/${selectedUpcomingExamForQuestions.id}/questions এ সফলভাবে যুক্ত ও সিঙ্ক হয়েছে!`);
      setTimeout(() => setCreateSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Failed to add question to Firestore:", err);
      alert('ফায়ারস্টোরে প্রশ্ন যুক্ত করতে সমস্যা হয়েছে।');
    }
  };

  // Delete a question from selected upcoming exam in /Exam/{examId}/questions & Firestore
  const handleDeleteQuestionFromUpcoming = async (questionId: string, questionText?: string) => {
    if (!selectedUpcomingExamForQuestions) return;

    const targetId = questionId;
    const targetText = questionText;

    const updatedQuestions = (selectedUpcomingExamForQuestions.questions || []).filter(
      q => (targetId ? q.id !== targetId : true) && (targetText ? q.text !== targetText : true)
    );
    const updatedExam: Exam = {
      ...selectedUpcomingExamForQuestions,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
      totalMarks: updatedQuestions.length,
    };

    // Update component state immediately for instant, responsive UI feedback
    setSelectedUpcomingExamForQuestions(updatedExam);

    try {
      // 1. Delete from /Exam/{examId}/questions/{questionId} and /questions collections
      await deleteQuestionFromExamContent(selectedUpcomingExamForQuestions.id, targetId, targetText);

      // 2. Also sync the updated questions array & totalQuestions directly into /exam and /Exam documents
      await updateUpcomingExamInFirestore(selectedUpcomingExamForQuestions.id, {
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
        totalMarks: updatedQuestions.length,
      });

      setCreateSuccessMsg('প্রশ্নটি ফায়ারস্টোর ডেটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে এবং সংখ্যা আপডেট হয়েছে!');
      setTimeout(() => setCreateSuccessMsg(''), 3500);
    } catch (err) {
      console.error("Failed to delete question from Firestore:", err);
    }
  };

  // Search filter inside admin tabs
  const [searchQuery, setSearchQuery] = useState('');

  // Helper dictionary to normalize Bengali digits
  const bnDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };

  // Helper to extract timestamp in ms for sorting
  const getResultTimeMs = (r: ExamResult): number => {
    if (r.submittedAt) {
      const t = new Date(r.submittedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (r.dateTaken) {
      let raw = String(r.dateTaken).trim();
      for (const [bn, en] of Object.entries(bnDigits)) {
        raw = raw.split(bn).join(en);
      }
      const t = new Date(raw).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    const match = r.id ? r.id.match(/\d{10,}/) : null;
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  // Combine Firestore results with preloaded results
  const allResults = useMemo(() => {
    const combined = [...firestoreResults];
    results.forEach(res => {
      if (!combined.some(r => r.id === res.id)) {
        combined.push(res);
      }
    });
    return combined;
  }, [firestoreResults, results]);

  // Results Tab States
  const [onlyLatestResults, setOnlyLatestResults] = useState<boolean>(true);
  const [resultsExamFilter, setResultsExamFilter] = useState<string>('all');
  const [resultsSearchQuery, setResultsSearchQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Deduplicate results per student per exam, keeping strictly the latest result
  const { dedupedLatestResults, examAttemptCounts, duplicateAttemptsCount } = useMemo(() => {
    // Sort chronologically descending (newest first)
    const sorted = [...allResults].sort((a, b) => {
      const timeA = getResultTimeMs(a);
      const timeB = getResultTimeMs(b);
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    const seenMap = new Map<string, ExamResult>();
    const countsMap = new Map<string, number>();

    sorted.forEach((res) => {
      // Build unique student key (prioritizing email, userId, studentId, or normalized name)
      const email = (res.studentEmail || '').trim().toLowerCase();
      const userId = (res.userId || '').trim().toLowerCase();
      const studentId = (res.studentId || '').trim().toLowerCase();
      const name = (res.studentName || '').trim().toLowerCase();

      let studentKey = `id:${res.id || Math.random()}`;
      if (email && email !== 'undefined' && email !== 'null') {
        studentKey = `email:${email}`;
      } else if (userId && userId !== 'guest' && userId !== 'undefined') {
        studentKey = `user:${userId}`;
      } else if (studentId && studentId !== 'guest' && studentId !== 'undefined') {
        studentKey = `student:${studentId}`;
      } else if (name && name !== 'ইউজার' && name !== 'guest') {
        studentKey = `name:${name}`;
      }

      // Build unique exam key
      const examId = (res.examId || '').trim().toLowerCase();
      const title = (res.examTitle || '').trim().toLowerCase();
      const examKey = (examId && examId !== 'undefined') ? `examId:${examId}` : (title ? `title:${title}` : 'exam');

      const compositeKey = `${studentKey}:::${examKey}`;

      // Increment attempt counter for this user & exam
      countsMap.set(compositeKey, (countsMap.get(compositeKey) || 0) + 1);

      // Only save the very first occurrence (which is the latest)
      if (!seenMap.has(compositeKey)) {
        seenMap.set(compositeKey, res);
      }
    });

    const deduped = Array.from(seenMap.values());
    return {
      dedupedLatestResults: deduped,
      examAttemptCounts: countsMap,
      duplicateAttemptsCount: Math.max(0, allResults.length - deduped.length),
    };
  }, [allResults]);

  // Active pool of results for display: either only the latest attempt or all historical attempts
  const resultsPool = useMemo(() => {
    return onlyLatestResults ? dedupedLatestResults : allResults;
  }, [onlyLatestResults, dedupedLatestResults, allResults]);

  // Unique exams present in results
  const uniqueResultExams = useMemo(() => {
    const titles = new Set<string>();
    resultsPool.forEach(r => {
      const t = r.examTitle?.trim();
      if (t) titles.add(t);
    });
    return Array.from(titles).sort();
  }, [resultsPool]);

  // Filtered results based on exam selection and search term
  const filteredResults = useMemo(() => {
    return resultsPool.filter(res => {
      if (resultsExamFilter !== 'all') {
        const matchTitle = (res.examTitle || '').trim().toLowerCase() === resultsExamFilter.trim().toLowerCase();
        const matchId = res.examId === resultsExamFilter;
        if (!matchTitle && !matchId) return false;
      }
      if (resultsSearchQuery.trim()) {
        const q = resultsSearchQuery.toLowerCase().trim();
        const matchName = (res.studentName || '').toLowerCase().includes(q);
        const matchEmail = (res.studentEmail || '').toLowerCase().includes(q);
        const matchTitle = (res.examTitle || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchTitle) return false;
      }
      return true;
    });
  }, [resultsPool, resultsExamFilter, resultsSearchQuery]);

  // Results Metrics
  const resultStats = useMemo(() => {
    const total = filteredResults.length;
    const uniqueStudents = new Set(
      filteredResults.map(r => (r.studentEmail || r.studentId || r.userId || r.studentName || '').toLowerCase())
    ).size;

    const scores = filteredResults.map(r => {
      const totalQ = r.totalQuestions > 0 ? r.totalQuestions : (r.totalMarks > 0 ? r.totalMarks : 1);
      const scoreVal = typeof r.score === 'number' ? r.score : 0;
      return Math.max(0, Math.min(100, Math.round((scoreVal / totalQ) * 100)));
    });

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const highestScore = scores.length > 0
      ? Math.max(...scores)
      : 0;

    return { total, uniqueStudents, avgScore, highestScore };
  }, [filteredResults]);

  // Local overrides for student premium status
  const [localPremiumOverrides, setLocalPremiumOverrides] = useState<Record<string, boolean>>({});

  // Combine and calculate stats for real Firebase students (excluding un-registered mock data)
  const students = useMemo(() => {
    const combined = [...firestoreStudents];

    // Include current student if logged in and not yet in firestore list
    if (
      currentUser &&
      currentUser.role !== 'admin' &&
      !combined.some(s => s.id === currentUser.id || s.uid === currentUser.uid || (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase()))
    ) {
      combined.push(currentUser);
    }

    return combined.map(stud => {
      const studentExams = allResults.filter(
        r => r.studentEmail?.toLowerCase() === stud.email?.toLowerCase() || r.studentId === stud.id || r.userId === stud.uid || r.userId === stud.id
      );

      const overrideById = stud.id ? localPremiumOverrides[stud.id] : undefined;
      const overrideByEmail = stud.email ? localPremiumOverrides[stud.email] : undefined;
      const isPrem = overrideById !== undefined
        ? overrideById
        : overrideByEmail !== undefined
          ? overrideByEmail
          : !!stud.isPremium;

      return {
        ...stud,
        uid: stud.uid || stud.id,
        name: stud.fullName || stud.name || stud.email?.split('@')[0] || 'শিক্ষার্থী',
        institution: stud.institution || '',
        examsCount: studentExams.length || stud.examsCount || 0,
        joinedDate: stud.createdAt ? formatBanglaDateTime(stud.createdAt) : (stud.joinedDate || stud.joined || ''),
        isPremium: isPrem,
        isPremiumDate: stud.isPremiumDate || '',
        isPremiumExpiryDate: stud.isPremiumExpiryDate || '',
      };
    });
  }, [firestoreStudents, currentUser, allResults, localPremiumOverrides]);

  // System general Settings
  const [settings, setSettings] = useState({
    siteName: 'মেধা এক্সাম',
    allowGuest: true,
    maintenanceMode: false,
    darkByDefault: false,
    requirePhone: true,
  });

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.institution.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.uid && s.uid.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Handle deleting a student
  const handleDeleteStudent = async (id: string, email: string) => {
    setDeletedMockEmails(prev => [...prev, email]);
    if (firestoreStudents.some(s => s.id === id)) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (err) {
        console.warn("Deleted student from UI. Firestore delete details:", err);
      }
    }
  };

  // Handle toggling student premium membership status
  const handleToggleStudentPremium = async (stud: any) => {
    const currentStatus = !!stud.isPremium;
    const newStatus = !currentStatus;

    const targetDocId = stud.id || stud.uid || stud.email;
    const studEmail = stud.email;

    const nowIso = newStatus ? new Date().toISOString() : '';
    const expiryIso = newStatus ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : '';

    // 1. Immediately update local override state for visual responsiveness
    setLocalPremiumOverrides(prev => {
      const updated = { ...prev };
      if (stud.id) updated[stud.id] = newStatus;
      if (stud.uid) updated[stud.uid] = newStatus;
      if (stud.email) updated[stud.email] = newStatus;
      return updated;
    });

    // 2. Persist to Firestore backend
    if (targetDocId) {
      try {
        await setDoc(doc(db, 'users', targetDocId), {
          id: targetDocId,
          uid: targetDocId,
          name: stud.name || stud.fullName || '',
          fullName: stud.fullName || stud.name || '',
          email: studEmail || '',
          institution: stud.institution || '',
          phone: stud.phone || '',
          isPremium: newStatus,
          isPremiumDate: nowIso,
          isPremiumExpiryDate: expiryIso,
          inPremiumDate: nowIso,
          inPremiumExpiryDate: expiryIso,
          role: stud.role || 'student',
        }, { merge: true });
      } catch (err) {
        console.warn("Could not save premium status to firestore:", err);
      }
    }

    // 3. Update localStorage active user session & App state if matching current user
    const activeSessionStr = localStorage.getItem('active_user_session');
    if (activeSessionStr) {
      try {
        const activeSession = JSON.parse(activeSessionStr);
        if (
          (stud.id && activeSession.id === stud.id) || 
          (activeSession.email && studEmail && activeSession.email.toLowerCase() === studEmail.toLowerCase())
        ) {
          const updatedUser = {
            ...activeSession,
            isPremium: newStatus,
            isPremiumDate: nowIso,
            isPremiumExpiryDate: expiryIso,
          };
          localStorage.setItem('active_user_session', JSON.stringify(updatedUser));
          if (onUpdateUser) {
            onUpdateUser(updatedUser);
          }
        }
      } catch (e) {}
    }
  };

  // Student Profile Editing & Name Repair States
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editStudentName, setEditStudentName] = useState<string>('');
  const [editStudentInstitution, setEditStudentInstitution] = useState<string>('');
  const [editStudentPhone, setEditStudentPhone] = useState<string>('');
  const [savingStudent, setSavingStudent] = useState<boolean>(false);
  const [studentSaveMsg, setStudentSaveMsg] = useState<string>('');

  const [repairingNames, setRepairingNames] = useState<boolean>(false);
  const [repairCount, setRepairCount] = useState<number | null>(null);

  const handleOpenEditStudent = (stud: any) => {
    setEditingStudent(stud);
    setEditStudentName(stud.name || stud.fullName || '');
    setEditStudentInstitution(stud.institution || '');
    setEditStudentPhone(stud.phone || '');
    setStudentSaveMsg('');
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingStudent(true);
    setStudentSaveMsg('');

    const targetDocId = editingStudent.uid || editingStudent.id;
    const updatedName = editStudentName.trim() || (editingStudent.email ? editingStudent.email.split('@')[0] : 'শিক্ষার্থী');

    try {
      await setDoc(doc(db, 'users', targetDocId), {
        name: updatedName,
        fullName: updatedName,
        displayName: updatedName,
        institution: editStudentInstitution.trim(),
        phone: editStudentPhone.trim(),
      }, { merge: true });

      setStudentSaveMsg('শিক্ষার্থীর প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
      setTimeout(() => {
        setEditingStudent(null);
        setStudentSaveMsg('');
      }, 1200);
    } catch (err) {
      console.error("Failed to update student profile in Firestore:", err);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleRepairCorruptedNames = async () => {
    setRepairingNames(true);
    let count = 0;
    try {
      for (const stud of firestoreStudents) {
        const email = (stud.email || '').toLowerCase().trim();
        const isFounder = email === 'pbprosen1971@gmail.com' || email === 'prosenjit@medha.com';
        if ((stud.name === 'Prosenjit Biswas' || stud.fullName === 'Prosenjit Biswas') && !isFounder) {
          const correctName = (stud.displayName && stud.displayName !== 'Prosenjit Biswas') 
            ? stud.displayName 
            : (stud.email ? stud.email.split('@')[0] : 'শিক্ষার্থী');
          const targetDocId = stud.uid || stud.id;
          await setDoc(doc(db, 'users', targetDocId), {
            name: correctName,
            fullName: correctName,
            displayName: correctName,
          }, { merge: true });
          count++;
        }
      }
      setRepairCount(count);
      setTimeout(() => setRepairCount(null), 5000);
    } catch (err) {
      console.warn("Batch name repair failed:", err);
    } finally {
      setRepairingNames(false);
    }
  };

  // Add more option inputs dynamically to new question creator
  const handleAddQuestionField = () => {
    setNewQuestions([
      ...newQuestions,
      { text: '', options: ['', '', '', ''], correctAnswer: 0, subject: '' },
    ]);
  };

  const handleQuestionFieldChange = (index: number, key: string, value: any) => {
    const updated = [...newQuestions];
    if (key === 'text') {
      updated[index].text = value;
    } else if (key === 'correctAnswer') {
      updated[index].correctAnswer = parseInt(value);
    } else if (key === 'subject') {
      updated[index].subject = value;
    }
    setNewQuestions(updated);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...newQuestions];
    updated[questionIndex].options[optionIndex] = value;
    setNewQuestions(updated);
  };

  // Submit new exam
  const handleCreateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    // Build real question list with unique IDs
    const finalQuestions: Question[] = newQuestions.map((q, idx) => ({
      ...q,
      id: `q-created-${Date.now()}-${idx}`,
      subject: q.subject || newSubject,
    }));

    const createdExam: Exam = {
      id: `exam-created-${Date.now()}`,
      title: newTitle,
      subject: newSubject,
      durationMinutes: Number(newDuration),
      totalQuestions: finalQuestions.length,
      totalMarks: finalQuestions.length,
      status: newStatus,
      questions: finalQuestions,
      dateCreated: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
    };

    onCreateExam(createdExam);
    
    // Reset fields
    setNewTitle('');
    setNewDuration(15);
    setNewQuestions([{ text: '', options: ['', '', '', ''], correctAnswer: 0, subject: '' }]);
    
    setCreateSuccessMsg('নতুন পরীক্ষাটি সফলভাবে তৈরি করা হয়েছে! এটি এখন শিক্ষার্থীদের ড্যাশবোর্ডে উপলব্ধ।');
    setTimeout(() => setCreateSuccessMsg(''), 5000);
  };

  // Trigger browser print
  const handleDownloadResultSheet = () => {
    window.print();
  };

  // Trigger jsPDF summary report download
  const handleDownloadPdfReport = async () => {
    if (filteredResults.length === 0) {
      alert('ডাউনলোড করার জন্য কোনো ফলাফল পাওয়া যায়নি।');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await generateStudentResultsPdfReport(filteredResults, {
        siteName: settings.siteName || 'মেধা এক্সাম',
        examTitleFilter: resultsExamFilter === 'all'
          ? (onlyLatestResults ? 'All Exams (Latest Attempts Only)' : 'All Exams (All Attempts)')
          : (onlyLatestResults ? `${resultsExamFilter} (Latest Attempt Only)` : resultsExamFilter),
        generatedBy: currentUser?.name || 'Medha Exam Administration',
      });
    } catch (err) {
      console.error('Failed to generate PDF summary report:', err);
      alert('PDF রিপোর্ট তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-brand-bg dark:bg-slate-900 text-slate-800 dark:text-slate-100 theme-transition">
      
      {/* Admin Panel Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            মেধা এক্সাম এডমিন প্যানেল
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">প্ল্যাটফর্মের পরীক্ষা, শিক্ষার্থী এবং সম্পূর্ণ ডেটাবেজ পরিচালনা করুন।</p>
        </div>
        
        {/* Quick Back to home helper */}
        <button
          onClick={() => setView('home')}
          className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl flex items-center gap-1"
        >
          শিক্ষার্থী পোর্টালে যান <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Admin Sidebar Navigation tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* 1. Left Col (3-Cols) Tabs Selector */}
        <div className="lg:col-span-3 flex flex-col gap-2 print:hidden">
          <button
            onClick={() => { setActiveTab('analytics'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'analytics'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" /> ড্যাশবোর্ড এনালাইটিক্স
          </button>

          <button
            onClick={() => { setActiveTab('students'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'students'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <Users className="h-4.5 w-4.5" /> শিক্ষার্থী ব্যবস্থাপনা
          </button>

          <button
            onClick={() => { setActiveTab('results'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'results'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <FileText className="h-4.5 w-4.5" /> এক্সাম রেজাল্ট শিট
          </button>

          <button
            onClick={() => { setActiveTab('questions'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'questions'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" /> কোশ্চেন ব্যাংক (প্রশ্নাবলী)
          </button>

          <button
            onClick={() => { setActiveTab('upcoming_exams'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'upcoming_exams'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <Clock className="h-4.5 w-4.5" /> আপকামিং পরীক্ষা (Upcoming)
          </button>

          <button
            onClick={() => { setActiveTab('live_archived_exams'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'live_archived_exams'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <Layers className="h-4.5 w-4.5" /> চলমান ও আর্কাইভ পরীক্ষা নিয়ন্ত্রণ
          </button>

          <button
            onClick={() => { setActiveTab('google_sheets'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'google_sheets'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <FileSpreadsheet className="h-4.5 w-4.5" /> SheetsSync (Google Sheets)
          </button>

          <button
            onClick={() => { setActiveTab('referral_leaderboard'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'referral_leaderboard'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <Trophy className="h-4.5 w-4.5" /> রেফারেল লিডারবোর্ড
          </button>

          <button
            onClick={() => { setActiveTab('study_materials'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'study_materials'
                ? 'bg-[#38B262] text-white shadow-md shadow-[#38B262]/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" /> 📚 স্টাডি ম্যাটেরিয়াল (PDF)
          </button>

          <button
            onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'payments'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <CreditCard className="h-4.5 w-4.5" /> 💳 পেমেন্ট ও মেম্বারশিপ
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'settings'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            <Settings className="h-4.5 w-4.5" /> প্লাটফর্ম সেটিংস
          </button>
        </div>

        {/* 2. Right Col (9-Cols) Dynamic Content Panel */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-sm">
          
          {/* TAB 1: DASHBOARD ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <h3 className="font-bold text-lg">সিস্টেম এনালাইটিক্স সারসংক্ষেপ</h3>
              
              {/* Analytics Metric Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-3xl font-extrabold text-primary">{students.length} জন</span>
                  <span className="block text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">মোট শিক্ষার্থী (Firebase)</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-3xl font-extrabold text-primary">{exams.length} টি</span>
                  <span className="block text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">মোট পরীক্ষা</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-3xl font-extrabold text-primary">৭২%</span>
                  <span className="block text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">গড় পাস রেট</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-3xl font-extrabold text-primary">৪৫০+</span>
                  <span className="block text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">সংগৃহীত প্রশ্ন</span>
                </div>
              </div>

              {/* Graphic Chart visual mock */}
              <div className="p-6 border border-slate-200/80 dark:border-slate-700 rounded-2xl space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">শিক্ষার্থী নিবন্ধনের মাসিক ট্রেন্ড (Trend)</h4>
                <div className="h-40 flex items-end gap-3 pt-6 border-b border-slate-200 dark:border-slate-700">
                  {/* Bar graphs */}
                  {[
                    { m: 'জানুয়ারি', h: 'h-[30%]' },
                    { m: 'ফেব্রুয়ারি', h: 'h-[45%]' },
                    { m: 'মার্চ', h: 'h-[65%]' },
                    { m: 'এপ্রিল', h: 'h-[50%]' },
                    { m: 'মে', h: 'h-[80%]' },
                    { m: 'জুন', h: 'h-[95%]' },
                  ].map((data, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-full bg-primary/25 hover:bg-primary rounded-t-lg transition-all duration-300 cursor-pointer ${data.h}`}></div>
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">{data.m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENT MANAGEMENT */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">শিক্ষার্থী তালিকা ও একাউন্ট কন্ট্রোল</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">মোট শিক্ষার্থী: {firestoreStudents.length} জন</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleRepairCorruptedNames}
                    disabled={repairingNames}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    title="ডেটাবেজের ডিফল্ট নামগুলো রিয়েল নামে সিঙ্ক করুন"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${repairingNames ? 'animate-spin' : ''}`} />
                    <span>{repairingNames ? 'সংস্কার হচ্ছে...' : 'নাম অটো-সংস্কার'}</span>
                  </button>

                  {/* Search input inside tab */}
                  <div className="relative max-w-xs w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="নাম, ইমেইল বা UID দিয়ে খুঁজুন..."
                      className="block w-full pl-9 pr-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {repairCount !== null && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{repairCount > 0 ? `${repairCount} জন শিক্ষার্থীর নাম সফলভাবে সংস্কার করা হয়েছে!` : 'সব শিক্ষার্থীর নাম ইতোমধ্যে সঠিকভাবে সেট করা আছে।'}</span>
                </div>
              )}

              {/* Students Grid/Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                      <th className="p-3 font-mono text-xs">UID / আইডি</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">শিক্ষা প্রতিষ্ঠান</th>
                      <th className="p-3">ইমেইল</th>
                      <th className="p-3">ফোন নম্বর</th>
                      <th className="p-3 text-center">মেম্বারশিপ (মেয়াদ)</th>
                      <th className="p-3 text-center">মোট কুইজ</th>
                      <th className="p-3 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-600 dark:text-slate-400 font-medium">
                          {dbLoading ? (
                            <span>ফায়ারবেস রিয়েলটাইম ডেটা লোড হচ্ছে...</span>
                          ) : (
                            <span>ফায়ারবেস ডেটাবেজে কোনো নিবন্ধনকৃত শিক্ষার্থী পাওয়া যায়নি।</span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((stud) => (
                        <tr key={stud.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-[11px]">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 font-semibold block truncate max-w-[120px]" title={stud.uid || stud.id}>
                              {stud.uid || stud.id}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>{stud.name}</span>
                            {stud.role === 'admin' ? (
                              <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] rounded-md border border-purple-500/20">
                                এডমিন
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded-md border border-emerald-500/20">
                                শিক্ষার্থী
                              </span>
                            )}
                            {stud.isPremium && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] rounded-md border border-amber-500/20 flex items-center gap-1">
                                <Crown className="h-3 w-3 fill-current" />
                                প্রিমিয়াম
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {stud.institution ? (
                              <span>{stud.institution}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">- (ফাঁকা)</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300 font-medium">{stud.email}</td>
                          <td className="p-3 font-mono text-xs">
                            {stud.phone ? (
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{stud.phone}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">- (ফাঁকা)</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleStudentPremium(stud)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto cursor-pointer ${
                                stud.isPremium
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-amber-500/20 hover:brightness-110'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                              title="ক্লিক করে প্রিমিয়াম/ফ্রি স্ট্যাটাস পরিবর্তন করুন"
                            >
                              {stud.isPremium ? (
                                <>
                                  <Crown className="h-3.5 w-3.5 fill-current" />
                                  <span>প্রিমিয়াম মেম্বার</span>
                                </>
                              ) : (
                                <span>ফ্রি ইউজার</span>
                              )}
                            </button>
                            {stud.isPremium && stud.isPremiumExpiryDate && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                মেয়াদ: {new Date(stud.isPremiumExpiryDate).toLocaleDateString('bn-BD')}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold">{stud.examsCount} বার</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditStudent(stud)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="প্রোফাইল তথ্য ও নাম এডিট করুন"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(stud.id, stud.email)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/30 transition-colors"
                                title="সদস্য মুছুন"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Edit Student Modal */}
              {editingStudent && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">শিক্ষার্থীর তথ্য সংশোধন</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{editingStudent.email}</p>
                      </div>
                      <button
                        onClick={() => setEditingStudent(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveStudent} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          শিক্ষার্থীর পূর্ণ নাম *
                        </label>
                        <input
                          type="text"
                          required
                          value={editStudentName}
                          onChange={(e) => setEditStudentName(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="সঠিক নাম লিখুন"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          শিক্ষা প্রতিষ্ঠান
                        </label>
                        <input
                          type="text"
                          value={editStudentInstitution}
                          onChange={(e) => setEditStudentInstitution(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="শিক্ষা প্রতিষ্ঠানের নাম"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          ফোন নম্বর
                        </label>
                        <input
                          type="text"
                          value={editStudentPhone}
                          onChange={(e) => setEditStudentPhone(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="০১৭০০-০০০০০০"
                        />
                      </div>

                      {studentSaveMsg && (
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{studentSaveMsg}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          disabled={savingStudent}
                          className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {savingStudent ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                          <span>{savingStudent ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXAM RESULT SHEET & SUMMARY REPORT */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {/* Header with Title and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    শিক্ষার্থী পরীক্ষার ফলাফল বিবরণী ও সারাংশ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    কুইজ ও মডেল টেস্টের ফলাফল বিবরণী পর্যালোচনা করুন এবং jsPDF দ্বারা অফিশিয়াল PDF সারাংশ রিপোর্ট ডাউনলোড করুন।
                  </p>
                </div>
                
                {/* PDF and Print Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleDownloadPdfReport}
                    disabled={isGeneratingPdf || filteredResults.length === 0}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="নির্বাচিত ফলাফলগুলোর অফিশিয়াল PDF সামারি রিপোর্ট ডাউনলোড করুন"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>PDF প্রস্তুত হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        <span>PDF রিপোর্ট ডাউনলোড ({filteredResults.length})</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadResultSheet}
                    className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="ব্রাউজার প্রিন্ট ডায়ালগ খুলুন"
                  >
                    <Printer className="h-4 w-4" />
                    <span>প্রিন্ট শিট</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {onlyLatestResults ? 'সর্বশেষ ফলাফল' : 'মোট সাবমিশন'}
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                    {resultStats.total} টি
                  </span>
                  {onlyLatestResults && duplicateAttemptsCount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                      ({duplicateAttemptsCount} টি ডুপ্লিকেট বাদ)
                    </span>
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    অনন্য শিক্ষার্থী
                  </span>
                  <span className="text-2xl font-black text-primary mt-1 block">
                    {resultStats.uniqueStudents} জন
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    গড় স্কোর (Avg)
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {resultStats.avgScore}%
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    সর্বোচ্চ স্কোর (Top)
                  </span>
                  <span className="text-2xl font-black text-amber-500 mt-1 block">
                    {resultStats.highestScore}%
                  </span>
                </div>
              </div>

              {/* Filter and Search Controls */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={resultsSearchQuery}
                    onChange={(e) => setResultsSearchQuery(e.target.value)}
                    placeholder="শিক্ষার্থীর নাম, ইমেইল অথবা পরীক্ষা দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-8 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  {resultsSearchQuery && (
                    <button
                      onClick={() => setResultsSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Controls Group */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Toggle: Only Latest Results vs All Attempts */}
                  <button
                    type="button"
                    onClick={() => setOnlyLatestResults(prev => !prev)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                      onlyLatestResults
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title={onlyLatestResults ? 'সকল প্রচেষ্টা দেখতে ক্লিক করুন' : 'শুধু সর্বশেষ ফলাফল দেখতে ক্লিক করুন'}
                  >
                    {onlyLatestResults ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>শুধু সর্বশেষ ফলাফল ({dedupedLatestResults.length})</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                        <span>সকল প্রচেষ্টা ({allResults.length})</span>
                      </>
                    )}
                  </button>

                  {/* Exam Filter Dropdown */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    <span>ফিল্টার:</span>
                  </div>
                  <select
                    value={resultsExamFilter}
                    onChange={(e) => setResultsExamFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 font-medium cursor-pointer"
                  >
                    <option value="all">সকল পরীক্ষা ({resultsPool.length})</option>
                    {uniqueResultExams.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>

                  {(resultsExamFilter !== 'all' || resultsSearchQuery) && (
                    <button
                      onClick={() => {
                        setResultsExamFilter('all');
                        setResultsSearchQuery('');
                      }}
                      className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold px-2 py-1 underline cursor-pointer"
                    >
                      রিসেট
                    </button>
                  )}
                </div>
              </div>

              {/* Informative notification when duplicates are filtered */}
              {onlyLatestResults && duplicateAttemptsCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      <strong>ডুপ্লিকেট মুক্ত:</strong> শিক্ষার্থীরা একই পরীক্ষা একাধিকবার দিলেও কেবল তাদের <strong>সর্বশেষ পরীক্ষার ফলাফল</strong> প্রদর্শিত হচ্ছে (পুরনো {duplicateAttemptsCount} টি প্রচেষ্টা ফিল্টার করা হয়েছে)।
                    </span>
                  </div>
                  <button
                    onClick={() => setOnlyLatestResults(false)}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-900 dark:hover:text-emerald-100 shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    সকল পুরনো প্রচেষ্টা দেখুন
                  </button>
                </div>
              )}

              {/* Table of results taken */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-xs">
                {filteredResults.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      কোনো ফলাফল পাওয়া যায়নি।
                    </p>
                    <p className="text-xs text-slate-400">
                      {resultsSearchQuery || resultsExamFilter !== 'all'
                        ? 'আপনার সার্চ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।'
                        : 'এখনও কোনো শিক্ষার্থী পরীক্ষা সম্পন্ন করেনি।'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                        <th className="p-3.5 w-12 text-center">#</th>
                        <th className="p-3.5">শিক্ষার্থী</th>
                        <th className="p-3.5">ইমেইল / ইউজার আইডি</th>
                        <th className="p-3.5">পরীক্ষার নাম</th>
                        <th className="p-3.5 text-center">প্রাপ্ত নম্বর</th>
                        <th className="p-3.5 text-center">সঠিক/ভুল/বাদ</th>
                        <th className="p-3.5 text-right">তারিখ ও সময়</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/50">
                      {filteredResults.map((res, index) => {
                        const totalQ = res.totalQuestions > 0 ? res.totalQuestions : (res.totalMarks > 0 ? res.totalMarks : 1);
                        const percentage = Math.round(((res.score || 0) / totalQ) * 100);

                        // Find total attempts by this student on this specific exam
                        const sEmail = (res.studentEmail || '').trim().toLowerCase();
                        const sUid = (res.userId || '').trim().toLowerCase();
                        const sId = (res.studentId || '').trim().toLowerCase();
                        const sName = (res.studentName || '').trim().toLowerCase();
                        let sKey = `id:${res.id || ''}`;
                        if (sEmail && sEmail !== 'undefined') sKey = `email:${sEmail}`;
                        else if (sUid && sUid !== 'guest' && sUid !== 'undefined') sKey = `user:${sUid}`;
                        else if (sId && sId !== 'guest' && sId !== 'undefined') sKey = `student:${sId}`;
                        else if (sName && sName !== 'ইউজার' && sName !== 'guest') sKey = `name:${sName}`;

                        const eId = (res.examId || '').trim().toLowerCase();
                        const eTitle = (res.examTitle || '').trim().toLowerCase();
                        const eKey = (eId && eId !== 'undefined') ? `examId:${eId}` : (eTitle ? `title:${eTitle}` : 'exam');
                        const cKey = `${sKey}:::${eKey}`;
                        const attemptCount = examAttemptCounts.get(cKey) || 1;

                        return (
                          <tr key={res.id || index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3.5 text-center font-mono text-slate-400 text-xs">
                              {index + 1}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {res.studentName || 'অজ্ঞাত শিক্ষার্থী'}
                                </span>
                                {attemptCount > 1 && onlyLatestResults && (
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 inline-flex items-center gap-0.5"
                                    title={`এই শিক্ষার্থী এই পরীক্ষাটি মোট ${attemptCount} বার সম্পন্ন করেছেন। এখানে শুধু সর্বশেষ পরীক্ষার ফলাফল দেখানো হচ্ছে।`}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    সর্বশেষ ({attemptCount} বার)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              {res.studentEmail ? (
                                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-medium block truncate max-w-[220px]" title={res.studentEmail}>
                                  {res.studentEmail}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                  ইমেইল নেই
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-800 dark:text-slate-200 font-medium max-w-[240px]">
                              <span className="line-clamp-2">{res.examTitle || 'মডেল টেস্ট'}</span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                                {res.score} / {totalQ}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                                percentage >= 70
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : percentage >= 40
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              }`}>
                                {percentage}%
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="সঠিক">
                                  {res.correctAnswers || 0}✓
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="text-rose-600 dark:text-rose-400 font-bold" title="ভুল">
                                  {res.wrongAnswers || 0}✗
                                </span>
                                {(res.skippedAnswers || 0) > 0 && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="text-slate-400 dark:text-slate-500 font-medium" title="উত্তর দেননি">
                                      {res.skippedAnswers} বাদ
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-right text-slate-600 dark:text-slate-300 font-mono text-xs">
                              {res.dateTaken || res.submittedAt || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CREATE EXAM FORM */}
          {activeTab === 'create_exam' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg">নতুন কুইজ / মডেল টেস্ট তৈরি করুন</h3>
                <p className="text-xs text-slate-400">পরীক্ষার নাম, সময় ও প্রশ্নপত্র যুক্ত করে সরাসরি প্রকাশ করুন।</p>
              </div>

              {/* Success validation feedback */}
              {createSuccessMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <Check className="h-5 w-5 shrink-0" />
                  <span>{createSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateExamSubmit} className="space-y-6">
                
                {/* Metadatas */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">পরীক্ষার শিরোনাম</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="যেমন: ৪৬তম বিসিএস মডেল টেস্ট..."
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">সময়সীমা (মিনিট)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>📚 বিষয়সমূহ ক্যাটাগরি</span>
                      </label>
                      <select
                        value={SUBJECT_OPTIONS.includes(newSubject) ? newSubject : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewSubject(e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- বিষয় ক্যাটাগরি নির্বাচন করুন --</option>
                        <option value="বাংলা">বাংলা (Bangla)</option>
                        <option value="ইংরেজি">ইংরেজি (English)</option>
                        <option value="গণিত">গণিত (Math)</option>
                        <option value="GK">সাধারণ জ্ঞান (GK)</option>
                        <option value="ICT">ICT (তথ্যপ্রযুক্তি)</option>
                        <option value="বিজ্ঞান">বিজ্ঞান (Science)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <span>🏢 দপ্তর ক্যাটাগরি</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">জব</span>
                      </label>
                      <select
                        value={DOPTOR_OPTIONS.includes(newSubject) ? newSubject : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewSubject(e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-slate-900 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- দপ্তর ক্যাটাগরি নির্বাচন করুন --</option>
                        <option value="BCS">BCS (বিসিএস)</option>
                        <option value="Bank">Bank (ব্যাংক চাকরি)</option>
                        <option value="11th - 20th Grade Job">11th - 20th Grade (১১তম-২০তম গ্রেড)</option>
                      </select>
                    </div>
                  </div>

                  {/* Exam Status Selector: Upcoming vs Live */}
                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
                    <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>পরীক্ষার প্রাথমিক অবস্থা (Status)</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs font-medium">
                        <input
                          type="radio"
                          name="createExamStatus"
                          value="upcoming"
                          checked={newStatus === 'upcoming'}
                          onChange={() => setNewStatus('upcoming')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">আসন্ন পরীক্ষা (Upcoming - ডিফল্ট)</span>
                        <span className="text-[10px] text-slate-500">(এডমিন পরবর্তীতে শিডিউল বা লাইভ করতে পারবেন)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium">
                        <input
                          type="radio"
                          name="createExamStatus"
                          value="live"
                          checked={newStatus === 'live'}
                          onChange={() => setNewStatus('live')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">সরাসরি লাইভ প্রকাশ করুন (Live)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sub questions lists header */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">MCQ প্রশ্নাবলী তালিকা ({newQuestions.length} টি)</h4>
                    <button
                      type="button"
                      onClick={handleAddQuestionField}
                      className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> আরেকটি প্রশ্ন যোগ করুন
                    </button>
                  </div>

                  {/* MCQ questions lists inputs */}
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {newQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-3 border border-slate-100 dark:border-slate-700 relative">
                        <span className="absolute top-2 right-3 text-[10px] font-mono font-bold text-slate-400">প্রশ্ন #{idx + 1}</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">প্রশ্ন বিবৃতি (Question statement)</label>
                            <input
                              type="text"
                              required
                              placeholder="যেমন: বাংলা সাহিত্যের প্রথম নিদর্শন কোনটি?"
                              value={q.text}
                              onChange={(e) => handleQuestionFieldChange(idx, 'text', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">সঠিক বিকল্প সূচক</label>
                            <select
                              value={q.correctAnswer}
                              onChange={(e) => handleQuestionFieldChange(idx, 'correctAnswer', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                            >
                              <option value={0}>১ম অপশন (ক)</option>
                              <option value={1}>২য় অপশন (খ)</option>
                              <option value={2}>৩য় অপশন (গ)</option>
                              <option value={3}>৪র্থ অপশন (ঘ)</option>
                            </select>
                          </div>
                        </div>

                        {/* Options k, kh, g, gh */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="space-y-0.5">
                              <label className="text-[9px] font-bold text-slate-400">বিকল্প {['ক', 'খ', 'গ', 'ঘ'][oIdx]}</label>
                              <input
                                type="text"
                                required
                                placeholder={`অপশন ${oIdx + 1}`}
                                value={opt}
                                onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20"
                >
                  পরীক্ষাটি সংরক্ষণ এবং প্রকাশ করুন
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: MINISTRY QUESTION BANK CREATION DASHBOARD */}
          {activeTab === 'questions' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span>প্রশ্ন ব্যাংক ম্যানেজমেন্ট কন্ট্রোল</span>
                </div>
                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                  মন্ত্রণালয় ও দপ্তরভিত্তিক প্রশ্ন ব্যাংক ইনপুট ড্যাশবোর্ড
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  এডমিন প্যানেল থেকে মন্ত্রণালয়ের নাম টাইপ বা ড্রপডাউন থেকে সিলেক্ট করে প্রশ্ন, ৪টি অপশন, সঠিক উত্তর ও বিশদ ব্যাখ্যাসহ প্রশ্ন ব্যাংক যুক্ত করুন। এই প্রশ্নগুলো তাৎক্ষণিকভাবে হোম পেজের প্রশ্ন ব্যাংক সেকশনে প্রকাশ পাবে।
                </p>
              </div>

              {/* Status Banner */}
              {mbSuccessMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-3 animate-fadeIn">
                  <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>{mbSuccessMsg}</span>
                </div>
              )}

              {/* Input Form Section */}
              <div id="ministry-bank-form-header" className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
                
                {/* Editing Indicator Banner */}
                {editingBankId && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>আপনি বর্তমানে একটি বিদ্যমান প্রশ্ন ব্যাংকে কাজ করছেন (সম্পাদনা / আরও প্রশ্ন যুক্তকরণ)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetMinistryForm}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] transition-all"
                    >
                      বাতিল করে নতুন প্রশ্ন ব্যাংক তৈরি করুন
                    </button>
                  </div>
                )}

                {/* Step 1: Ministry and Title Info */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-extrabold flex items-center justify-center">১</span>
                    <span>মন্ত্রণালয় / দপ্তর ও প্রশ্ন ব্যাংক শিরোনাম সেট করুন</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ministry Dropdown / Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>🏢 মন্ত্রণালয় / দপ্তর নির্বাচন করুন</span>
                        {existingMinistries.length > 0 && (
                          <span className="text-[10px] text-primary font-semibold">ড্রপডাউন থেকে সিলেক্ট করুন</span>
                        )}
                      </label>
                      <select
                        value={selectedMinistryDropdown}
                        onChange={(e) => {
                          setSelectedMinistryDropdown(e.target.value);
                          if (e.target.value !== '__NEW__') {
                            setCustomMinistryName('');
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- পূর্বে ব্যবহৃত মন্ত্রণালয় ড্রপডাউন তালিকা --</option>
                        {existingMinistries.map((minName, idx) => (
                          <option key={idx} value={minName}>
                            🏢 {minName}
                          </option>
                        ))}
                        <option value="__NEW__">➕ নতুন মন্ত্রণালয় / দপ্তরের নাম টাইপ করুন</option>
                      </select>
                    </div>

                    {/* Custom Ministry Name Input (If new selected or no dropdown choice) */}
                    {(!selectedMinistryDropdown || selectedMinistryDropdown === '__NEW__') && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          নতুন মন্ত্রণালয় / দপ্তরের পূর্ণ নাম লিখুন <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: প্রতিরক্ষা মন্ত্রণালয় বা গৃহায়ন ও গণপূর্ত মন্ত্রণালয়"
                          value={customMinistryName}
                          onChange={(e) => setCustomMinistryName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none font-medium"
                        />
                      </div>
                    )}

                    {/* Question Bank Title */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        প্রশ্ন ব্যাংকের শিরোনাম / পদের নাম <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="যেমন: সহকারী পরিচালক ও হিসাবরক্ষণ কর্মকর্তা নিয়োগ পরীক্ষা ২০২৫"
                        value={mbTitle}
                        onChange={(e) => setMbTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Add Single Questions Form or Batch Import */}
                <form onSubmit={handleAddQuestionToDraft} className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-extrabold flex items-center justify-center">২</span>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        প্রশ্ন সংযোজন (ম্যানুয়াল টাইপ অথবা সরাসরি গুগল শিট ইমপোর্ট)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct Google Sheets Batch Import Button */}
                      <button
                        type="button"
                        onClick={handleOpenMbSheetModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                        title="গুগল শিট থেকে একসাথে অনেক প্রশ্ন ইমপোর্ট করুন"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>গুগল শিট থেকে প্রশ্ন ইমপোর্ট</span>
                        <span className="bg-emerald-800/60 text-[10px] px-1.5 py-0.5 rounded font-mono">NEW</span>
                      </button>

                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        মোট প্রশ্ন: {mbQuestionsList.length} টি
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-9 space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">প্রশ্ন বিবৃতি (Question Text)</label>
                      <input
                        type="text"
                        placeholder="যেমন: বাংলাদেশের প্রথম ই-পাসপোর্ট সেবা কত সালে চালু করা হয়?"
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none font-medium"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">বিষয় / ক্যাটাগরি</label>
                      <input
                        type="text"
                        placeholder="যেমন: সাধারণ জ্ঞান"
                        value={qSubject}
                        onChange={(e) => setQSubject(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">বিকল্প (ক)</label>
                      <input
                        type="text"
                        placeholder="অপশন ক"
                        value={qOpt1}
                        onChange={(e) => setQOpt1(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">বিকল্প (খ)</label>
                      <input
                        type="text"
                        placeholder="অপশন খ"
                        value={qOpt2}
                        onChange={(e) => setQOpt2(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">বিকল্প (গ)</label>
                      <input
                        type="text"
                        placeholder="অপশন গ"
                        value={qOpt3}
                        onChange={(e) => setQOpt3(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">বিকল্প (ঘ)</label>
                      <input
                        type="text"
                        placeholder="অপশন ঘ"
                        value={qOpt4}
                        onChange={(e) => setQOpt4(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Correct answer and explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>সঠিক বিকল্প নির্বাচন করুন</span>
                      </label>
                      <select
                        value={qCorrect}
                        onChange={(e) => setQCorrect(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none"
                      >
                        <option value={0}>১ম অপশন (ক) সঠিক</option>
                        <option value={1}>২য় অপশন (খ) সঠিক</option>
                        <option value={2}>৩য় অপশন (গ) সঠিক</option>
                        <option value={3}>৪র্থ অপশন (ঘ) সঠিক</option>
                      </select>
                    </div>

                    <div className="md:col-span-8 space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        বিশদ ব্যাখ্যা ও নোট (Explanation)
                      </label>
                      <input
                        type="text"
                        placeholder="সঠিক উত্তর কেন হলো এবং প্রাসঙ্গিক গুরুত্বপূর্ণ তথ্য সম্বলিত বিশদ ব্যাখ্যা লিখুন..."
                        value={qExplanation}
                        onChange={(e) => setQExplanation(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <PlusCircle className="h-4 w-4 text-primary-light" />
                    + এই প্রশ্নটি তালিকায় যুক্ত করুন
                  </button>
                </form>

                {/* Added Draft Questions List */}
                {mbQuestionsList.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                    <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>তালিকায় যুক্ত হওয়া প্রশ্নসমূহ ({mbQuestionsList.length} টি)</span>
                      <span className="text-[10px] text-slate-400">হোম পেজে প্রকাশের আগে যাচাই করুন</span>
                    </h5>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {mbQuestionsList.map((q, idx) => (
                        <div key={q.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs space-y-1.5 relative">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              <span className="text-primary font-extrabold mr-1">প্রশ্ন {idx + 1}.</span> {q.text}
                            </p>
                            <button
                              type="button"
                              onClick={() => setMbQuestionsList(prev => prev.filter(item => item.id !== q.id))}
                              className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                              title="প্রশ্ন মুছুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                            {q.options.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className={`px-2 py-0.5 rounded border ${
                                  oIdx === q.correctAnswer
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 font-bold'
                                    : 'border-slate-100 dark:border-slate-800'
                                }`}
                              >
                                {['ক', 'খ', 'গ', 'ঘ'][oIdx]}. {opt}
                              </span>
                            ))}
                          </div>

                          {q.explanation && (
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg border border-blue-100/60 dark:border-blue-900/30">
                              💡 <strong>ব্যাখ্যা:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveMinistryQuestionBank}
                    className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="h-5 w-5" />
                    {editingBankId ? 'প্রশ্ন ব্যাংক আপডেট ও সংরক্ষণ করুন' : 'প্রশ্ন ব্যাংক সংরক্ষণ করুন'} ({mbQuestionsList.length} টি প্রশ্ন)
                  </button>
                </div>
              </div>

              {/* Section 3: List of All Ministry Question Banks currently stored */}
              <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <span>🏢 পূর্বের সকল প্রশ্ন ব্যাংকসমূহ (হোম পেজে প্রকাশ ও তথ্য নিয়ন্ত্রণ)</span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
                      {ministryBanks.length} টি
                    </span>
                  </h4>
                </div>

                {ministryBanks.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                    এখনো কোনো মন্ত্রণালয়ের প্রশ্ন ব্যাংক যুক্ত করা হয়নি। উপরের ফর্মটি ব্যবহার করে সহজে নতুন প্রশ্ন ব্যাংক তৈরি করুন।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ministryBanks.map((bank) => {
                      const isPublished = bank.isPublished !== false;

                      return (
                        <div
                          key={bank.id}
                          className={`p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm transition-all space-y-4 ${
                            isPublished
                              ? 'border-slate-200/80 dark:border-slate-800 hover:border-primary/50'
                              : 'border-amber-200/80 dark:border-amber-900/40 bg-amber-500/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary dark:text-primary-light text-[11px] font-bold rounded-lg">
                                  🏢 {bank.ministryName}
                                </span>
                                {isPublished ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-md">
                                    <Check className="h-3 w-3" />
                                    হোম পেজে প্রকাশিত
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-md">
                                    👁️ খসড়া (হোম পেজে অদৃশ্য)
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-sm text-slate-800 dark:text-white leading-snug">
                                {bank.title}
                              </h5>
                            </div>

                            {onDeleteMinistryBank && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`আপনি কি "${bank.title}" প্রশ্ন ব্যাংকটি মুছে ফেলতে চান?`)) {
                                    onDeleteMinistryBank(bank.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                                title="প্রশ্ন ব্যাংক মুছুন"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>❓ {bank.questions?.length || bank.totalQuestions || 0} টি প্রশ্ন</span>
                            <span>⏱️ {bank.durationMinutes || 10} মিনিট</span>
                            <span>📅 {bank.dateCreated}</span>
                          </div>

                          {/* Control Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {/* Publish / Unpublish Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleTogglePublishMinistryBank(bank)}
                              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                isPublished
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                              }`}
                            >
                              {isPublished ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" />
                                  <span>অপ্রকাশিত করুন</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>হোমে প্রকাশ করুন</span>
                                </>
                              )}
                            </button>

                            {/* View / Edit Questions Button */}
                            <button
                              type="button"
                              onClick={() => handleStartAddMoreQuestions(bank)}
                              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                            >
                              <Layers className="h-3.5 w-3.5" />
                              <span>প্রশ্নাবলী ({bank.questions?.length || 0})</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MODAL: Import Questions from Google Sheets for Ministry Question Bank */}
              {showMbSheetModal && (
                <div
                  id="ministry-sheets-import-modal"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn overflow-y-auto"
                >
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
                    {/* Modal Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                            গুগল শীট থেকে সরাসরি প্রশ্ন ইমপোর্ট
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            নির্দিষ্ট মন্ত্রণালয় ও শিরোনামের প্রশ্ন ব্যাংকে অনেক প্রশ্ন একসাথে যুক্ত করুন
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMbSheetModal(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                      {/* Google Auth Banner */}
                      {!isGoogleConnected() ? (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                                ⚠️ গুগল অ্যাকাউন্ট এখনও কানেক্ট করা হয়নি
                              </p>
                              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                আপনার স্প্রেডশীট থেকে প্রশ্ন লোড করতে নিচের বাটনে ক্লিক করে গুগল অনুমোদন দিন।
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleMbConnectGoogle}
                              disabled={mbImportConnecting}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {mbImportConnecting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>কানেক্টিং...</span>
                                </>
                              ) : (
                                <>
                                  <FileSpreadsheet className="h-4 w-4" />
                                  <span>গুগল কানেক্ট করুন</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            Google Sheets কানেকশন সক্রিয় আছে
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            OAuth Active
                          </span>
                        </div>
                      )}

                      {/* Error Banner if any */}
                      {mbImportError && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                          <div className="space-y-1">
                            <span>{mbImportError}</span>
                            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
                              পরামর্শ: কলাম হেডার যথাক্রমে questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation আছে কিনা নিশ্চিত করুন।
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sheet ID & Tab Configuration */}
                      <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>গুগল স্প্রেডশীট আইডি বা পূর্ণাঙ্গ লিংক (Spreadsheet ID or URL)</span>
                            <span className="text-[11px] text-primary font-normal">কপি-পেস্ট করুন</span>
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms অথবা পূর্ণ লিংক"
                            value={mbSpreadsheetId}
                            onChange={(e) => setMbSpreadsheetId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              শীটের ট্যাবের নাম (Sheet Tab Name)
                            </label>
                            <input
                              type="text"
                              placeholder="ডিফল্ট: Question Bank অথবা Sheet1"
                              value={mbSheetTabName}
                              onChange={(e) => setMbSheetTabName(e.target.value)}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              বিদ্যমান প্রশ্নের সাথে সংযোজন পদ্ধতি
                            </label>
                            <select
                              value={mbAppendMode}
                              onChange={(e) => setMbAppendMode(e.target.value as 'append' | 'replace')}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none"
                            >
                              <option value="append">বিদ্যমান প্রশ্নের সাথে আরও যুক্ত করুন (Append)</option>
                              <option value="replace">পূর্বের ড্রাফট মুছে নতুনগুলো দিয়ে প্রতিস্থাপন করুন (Replace)</option>
                            </select>
                          </div>
                        </div>

                        {/* Read & Validate Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleMbFetchQuestionsFromSheet}
                            disabled={mbImportLoading || !mbSpreadsheetId.trim()}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {mbImportLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>গুগল শিট থেকে প্রশ্ন যাচাই ও পড়া হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <Search className="h-4 w-4" />
                                <span>স্প্রেডশীট যাচাই ও প্রশ্নাবলী লোড করুন</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Ministry and Bank Title Assignment */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            মন্ত্রণালয় / দপ্তর নির্বাচন বা টাইপ
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: পররাষ্ট্র মন্ত্রণালয় বা ডাক ও টেলিযোগাযোগ বিভাগ"
                            value={mbImportTargetMinistry}
                            onChange={(e) => setMbImportTargetMinistry(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            প্রশ্ন ব্যাংক শিরোনাম
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: সহকারী পরিচালক ও কম্পিউটার অপারেটর পরীক্ষা"
                            value={mbImportTargetTitle}
                            onChange={(e) => setMbImportTargetTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Sheet Format Guide */}
                      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-800 dark:text-blue-300 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>📋 গুগল শিটের স্ট্যান্ডার্ড কলাম বিন্যাস:</span>
                        </div>
                        <p className="font-mono text-[10px] bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-blue-200/50 dark:border-blue-800/40 overflow-x-auto whitespace-nowrap">
                          questionText | optionA | optionB | optionC | optionD | correctAnswer (1-4 বা ক-ঘ) | explanation
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          টিপ: অপশন ও সঠিক উত্তর যেকোনো ফরম্যাটে (ক, খ, গ, ঘ অথবা A, B, C, D অথবা 1, 2, 3, 4) সাপোর্ট করে।
                        </p>
                      </div>

                      {/* Verification & Preview Box */}
                      {mbParsedSheetData && (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800 dark:text-white">যাচাইয়ের ফলাফল:</span>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                                {mbParsedSheetData.validCount} টি প্রশ্ন প্রস্তুত
                              </span>
                              {mbParsedSheetData.errorCount > 0 && (
                                <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                  {mbParsedSheetData.errorCount} টি ত্রুটিযুক্ত বাদ পড়েছে
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              মোট সারি: {mbParsedSheetData.totalRows}
                            </span>
                          </div>

                          {/* Quick Preview of First 3 Questions */}
                          {mbParsedSheetData.validQuestions.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                প্রথম কয়েকটি প্রশ্নের প্রিভিউ:
                              </div>
                              {mbParsedSheetData.validQuestions.slice(0, 3).map((vq, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                                >
                                  <div className="font-bold text-slate-800 dark:text-white flex items-start gap-1.5">
                                    <span className="text-primary">{idx + 1}.</span>
                                    <span>{vq.question.text}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                                    {vq.question.options.map((opt, oIdx) => (
                                      <span
                                        key={oIdx}
                                        className={`px-1.5 py-0.5 rounded ${
                                          oIdx === vq.question.correctAnswer
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                                            : ''
                                        }`}
                                      >
                                        {['ক', 'খ', 'গ', 'ঘ'][oIdx]}. {opt}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {mbParsedSheetData.validQuestions.length > 3 && (
                                <p className="text-[10px] text-center text-slate-400">
                                  ...এবং আরও {mbParsedSheetData.validQuestions.length - 3} টি প্রশ্ন
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setShowMbSheetModal(false)}
                        className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
                      >
                        বন্ধ করুন
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyMbSheetQuestions}
                        disabled={!mbParsedSheetData || mbParsedSheetData.validQuestions.length === 0}
                        className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-xl text-xs shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          {mbParsedSheetData?.validQuestions.length || 0} টি প্রশ্ন প্রশ্ন ব্যাংকে যুক্ত করুন
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: UPCOMING EXAMS & FEATURED HEADLINE */}
          {activeTab === 'upcoming_exams' && (
            <div className="space-y-8">
              {/* Header / Intro */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Calendar className="h-6 w-6 text-amber-500" />
                    <span>আপকামিং পরীক্ষা ও হোম পেজ ফিচার্ড শিরোনাম পরিচালনা</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    হোম পেজে প্রদর্শিত আসন্ন পরীক্ষার শিরোনাম, সময়সূচি এবং প্রশ্নাবলী সরাসরি ডেটাবেজে সিঙ্ক করুন।
                  </p>
                </div>
              </div>

              {/* Status messages */}
              {settingSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>{settingSuccessMsg}</span>
                </div>
              )}
              {upcomingSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>{upcomingSuccessMsg}</span>
                </div>
              )}
              {createSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>{createSuccessMsg}</span>
                </div>
              )}

              {!selectedUpcomingExamForQuestions ? (
                <div className="space-y-6">
                  {/* HEADER TOOLBAR FOR MULTI-UPCOMING EXAMS */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border border-amber-500/30 rounded-3xl shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-amber-500 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          আসন্ন পরীক্ষা শিডিউল পরিচালনা
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-black rounded-lg border border-amber-300 dark:border-amber-800">
                          মোট {combinedUpcomingExams.length}টি পরীক্ষা
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          Firestore: siteSettings/upcomingExam & /exam
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        এখানে একাধিক আসন্ন পরীক্ষা যুক্ত, সম্পাদনা, প্রশ্ন সংযোজন ও হোম পেজের সাথে রিয়েল-টাইম সিঙ্ক করতে পারবেন।
                      </p>
                    </div>

                    {!isAddingNewUpcoming && !editingUpcomingExamId && (
                      <button
                        type="button"
                        onClick={handleStartAddNewUpcoming}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-lg shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>নতুন আপকামিং পরীক্ষা যুক্ত করুন</span>
                      </button>
                    )}
                  </div>

                  {/* EDIT / CREATE FORM DIRECTLY SYNCED WITH FIRESTORE */}
                  {(isAddingNewUpcoming || !!editingUpcomingExamId || combinedUpcomingExams.length === 0) && (
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                      <form onSubmit={handleSaveUpcomingSettingsForm} className="space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-amber-500" />
                            <span>{editingUpcomingExamId ? 'আসন্ন পরীক্ষার তথ্য সম্পাদনা করুন' : 'নতুন আসন্ন পরীক্ষার সময়সূচি ও শিরোনাম যুক্ত করুন'}</span>
                          </h4>
                          {combinedUpcomingExams.length > 0 && (
                            <button
                              type="button"
                              onClick={handleCancelUpcomingForm}
                              className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all border border-slate-200 dark:border-slate-700"
                            >
                              বাতিল
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          {/* Title */}
                          <div className="md:col-span-8 space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <span>পরীক্ষার শিরোনাম (Title)</span>
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="যেমন: ৪৭তম বিসিএস প্রিলিমিনারি পূর্ণাঙ্গ মডেল টেস্ট"
                              value={settingTitle}
                              onChange={(e) => setSettingTitle(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Subject */}
                          <div className="md:col-span-4 space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                              বিষয় / দপ্তর ক্যাটাগরি
                            </label>
                            <select
                              value={settingSubject}
                              onChange={(e) => setSettingSubject(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            >
                              <option value="BCS">BCS (বিসিএস)</option>
                              <option value="Bank">Bank (ব্যাংক চাকরি)</option>
                              <option value="11th - 20th Grade Job">11th - 20th Grade (১১তম-২০তম গ্রেড)</option>
                              <option value="মন্ত্রণালয় প্রস্তুতি">মন্ত্রণালয় প্রস্তুতি</option>
                              <option value="সাধারণ জ্ঞান">সাধারণ জ্ঞান</option>
                              <option value="বাংলা">বাংলা</option>
                              <option value="ইংরেজি">ইংরেজি</option>
                              <option value="গণিত">গণিত</option>
                              <option value="ICT">ICT (তথ্যপ্রযুক্তি)</option>
                              <option value="বিজ্ঞান">বিজ্ঞান</option>
                            </select>
                          </div>

                          {/* Description */}
                          <div className="md:col-span-12 space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                              সংক্ষিপ্ত বিবরণ ও নির্দেশনা
                            </label>
                            <textarea
                              rows={2}
                              placeholder="যেমন: সম্পূর্ণ সিলেবাস অনুযায়ী বিশেষ প্রস্তুতিমূলক মডেল টেস্ট। নির্ধারিত সময়ে পরীক্ষাটি শুরু হবে।"
                              value={settingDesc}
                              onChange={(e) => setSettingDesc(e.target.value)}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Live Start Date & Time */}
                          <div className="md:col-span-5 space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                <span>লাইভ শুরুর তারিখ ও সময়</span>
                              </span>
                              <span className="text-[10px] text-amber-600 font-bold">ক্যালেন্ডার</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={settingStartTime}
                              onClick={(e) => {
                                try {
                                  e.currentTarget.showPicker();
                                } catch (err) {}
                              }}
                              onChange={(e) => setSettingStartTime(e.target.value)}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                            />
                          </div>

                          {/* Duration */}
                          <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                              সময়সীমা (মিনিট)
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={settingDuration}
                              onChange={(e) => setSettingDuration(Number(e.target.value))}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Premium Type */}
                          <div className="md:col-span-4 space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                              পরীক্ষার ধরন (Type)
                            </label>
                            <select
                              value={settingIsPremium ? 'premium' : 'free'}
                              onChange={(e) => setSettingIsPremium(e.target.value === 'premium')}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            >
                              <option value="free">🆓 ফ্রি পরীক্ষা (Free)</option>
                              <option value="premium">⭐ প্রিমিয়াম পরীক্ষা (Premium)</option>
                            </select>
                          </div>
                        </div>

                        {/* Toggles & Submit */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-amber-500/20">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settingIsPublished}
                              onChange={(e) => setSettingIsPublished(e.target.checked)}
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              হোম পেজের আপকামিং সেকশনে দৃশ্যমান রাখুন
                            </span>
                          </label>

                          <div className="flex items-center gap-2.5">
                            {combinedUpcomingExams.length > 0 && (
                              <button
                                type="button"
                                onClick={handleCancelUpcomingForm}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                              >
                                বাতিল
                              </button>
                            )}

                            <button
                              type="submit"
                              disabled={settingSaving}
                              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {settingSaving ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span>ফায়ারস্টোরে সেভ হচ্ছে...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span>{editingUpcomingExamId ? 'পরিবর্তন সংরক্ষণ করুন' : 'ফায়ারস্টোরে সেভ ও সিঙ্ক করুন'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* LIST OF ALL UPCOMING EXAMS */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-500" />
                        <span>সকল শিডিউলকৃত আপকামিং পরীক্ষা ({combinedUpcomingExams.length}টি)</span>
                      </h4>
                      {combinedUpcomingExams.length > 0 && !isAddingNewUpcoming && !editingUpcomingExamId && (
                        <button
                          type="button"
                          onClick={handleStartAddNewUpcoming}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>আরেকটি পরীক্ষা যোগ করুন</span>
                        </button>
                      )}
                    </div>

                    {combinedUpcomingExams.length === 0 ? (
                      <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                        <Calendar className="h-10 w-10 text-amber-500/60 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          বর্তমানে কোনো আপকামিং পরীক্ষা শিডিউল করা নেই
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          উপরের ফর্মটি পূরণ করে নতুন আসন্ন পরীক্ষার শিরোনাম ও শিডিউল যুক্ত করুন। এটি স্বয়ংক্রিয়ভাবে ডাটাবেজ ও হোম পেজে প্রদর্শিত হবে।
                        </p>
                        <button
                          type="button"
                          onClick={handleStartAddNewUpcoming}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          <span>প্রথম আপকামিং পরীক্ষা তৈরি করুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {combinedUpcomingExams.map((item, idx) => {
                          const examKey = item.examId || item.id || `upcoming-exam-${idx}`;
                          return (
                            <div
                              key={examKey}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-amber-500/40 transition-all space-y-4"
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                                <div className="lg:col-span-8 space-y-2.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-extrabold text-amber-700 bg-amber-100/80 dark:bg-amber-900/60 dark:text-amber-300 px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                                      {item.subject || 'BCS'}
                                    </span>
                                    {item.isPremium && (
                                      <span className="text-xs font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                        <Crown className="h-3 w-3 fill-current" />
                                        প্রিমিয়াম
                                      </span>
                                    )}
                                    {item.isPublished !== false ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold rounded-lg">
                                        <Check className="h-3 w-3" /> হোম পেজে দৃশ্যমান
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-[11px] font-bold rounded-lg">
                                        <EyeOff className="h-3 w-3" /> খসড়া (লুকানো)
                                      </span>
                                    )}
                                    {item.startTime && (
                                      <span className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 font-semibold">
                                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                        লাইভ শুরু: {formatBanglaDateTime(item.startTime)}
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                                      ⏱️ {item.durationMinutes} মিনিট
                                    </span>
                                    <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1">
                                      <ListPlus className="h-3 w-3" /> {item.totalQuestions} টি প্রশ্ন
                                    </span>
                                  </div>

                                  <h4 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                                    {item.title}
                                  </h4>

                                  {item.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                                      {item.description}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-400 font-mono">
                                    <span>ID: <code className="text-amber-600 dark:text-amber-400">{examKey}</code></span>
                                  </div>
                                </div>

                                <div className="lg:col-span-4 flex flex-col items-stretch justify-center gap-2">
                                  {/* Manage Questions Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetExam: Exam = {
                                        id: examKey,
                                        title: item.title,
                                        subject: item.subject || 'BCS',
                                        durationMinutes: item.durationMinutes || 30,
                                        totalQuestions: item.totalQuestions || 0,
                                        totalMarks: item.totalMarks || 0,
                                        status: 'upcoming',
                                        isPublished: item.isPublished !== false,
                                        isPremium: !!item.isPremium,
                                        startTime: (item.startTime && item.startTime !== (item as any).dateCreated && item.startTime !== 'নির্ধারিত নেই') ? item.startTime : undefined,
                                        startDate: (item.startDate && item.startDate !== (item as any).dateCreated && item.startDate !== 'নির্ধারিত নেই') ? item.startDate : undefined,
                                        examDate: (item.examDate && item.examDate !== (item as any).dateCreated && item.examDate !== 'নির্ধারিত নেই') ? item.examDate : undefined,
                                        dateCreated: (item as any).dateCreated || new Date().toISOString().split('T')[0],
                                        questions: item.questions || [],
                                      };
                                      setSelectedUpcomingExamForQuestions(targetExam);
                                      setNewQuestText('');
                                      setNewQuestOptions(['', '', '', '']);
                                      setNewQuestCorrect(0);
                                      setNewQuestExplanation('');
                                      setNewQuestMarks(1);
                                    }}
                                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer hover:shadow-md"
                                  >
                                    <ListPlus className="h-4 w-4" />
                                    <span>প্রশ্ন পরিচালনা ({item.totalQuestions}টি)</span>
                                  </button>

                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditUpcoming(item)}
                                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                    >
                                      <Edit3 className="h-3.5 w-3.5 text-amber-500" />
                                      <span>সম্পাদনা</span>
                                    </button>

                                    {/* Toggle Publish / Draft */}
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePublishUpcomingExam(item)}
                                      className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      {item.isPublished !== false ? (
                                        <>
                                          <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                                          <span>লুকান</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="h-3.5 w-3.5 text-amber-600" />
                                          <span>প্রকাশ</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Make Live Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleMakeUpcomingExamLive(item)}
                                      className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Play className="h-3 w-3 fill-current" />
                                      <span>লাইভ করুন</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUpcomingExamItem(examKey, item.title)}
                                      className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>মুছুন</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* QUESTIONS MANAGEMENT SUBVIEW FOR SELECTED UPCOMING EXAM */
                <div className="space-y-6">
                  {/* Exam Info Card */}
                  <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/30 border border-emerald-500/20 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-md">
                          UPCOMING EXAM
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          বিষয়: <strong>{selectedUpcomingExamForQuestions.subject}</strong>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Firestore Collection: /Exam/{selectedUpcomingExamForQuestions.id}/questions
                        </span>
                      </div>
                      <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-snug">
                        {selectedUpcomingExamForQuestions.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        নির্ধারিত সময়: <strong>{selectedUpcomingExamForQuestions.durationMinutes} মিনিট</strong> | মোট প্রশ্নসংখ্যা: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedUpcomingExamForQuestions.questions?.length || 0} টি</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedUpcomingExamForQuestions(null)}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-center transition-all"
                    >
                      ← তালিকায় ফিরে যান
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Add New Question Form (Left: 5 cols) */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <PlusCircle className="h-4 w-4 text-emerald-600" />
                          <span>নতুন প্রশ্ন যোগ করুন (Add Question)</span>
                        </h4>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          /Exam/{'{examId}'}/questions
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">বিষয় / টপিক</label>
                          <select
                            value={newQuestSubject}
                            onChange={(e) => setNewQuestSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="বাংলা">বাংলা (Bangla)</option>
                            <option value="ইংরেজি">ইংরেজি (English)</option>
                            <option value="গণিত">গণিত (Math)</option>
                            <option value="সাধারণ জ্ঞান">সাধারণ জ্ঞান (GK)</option>
                            <option value="ICT">ICT (তথ্যপ্রযুক্তি)</option>
                            <option value="বিজ্ঞান">বিজ্ঞান (Science)</option>
                            <option value="ভূগোল">ভূগোল (Geography)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">নম্বর (Marks)</label>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={newQuestMarks}
                            onChange={(e) => setNewQuestMarks(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">প্রশ্নের বিবরণ (Question Text) *</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="প্রশ্নটি এখানে বাংলায় বা ইংরেজিতে লিখুন..."
                          value={newQuestText}
                          onChange={(e) => setNewQuestText(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          অপশনসমূহ পূরণ করুন এবং সঠিক উত্তর নির্বাচন করুন *
                        </label>
                        {[0, 1, 2, 3].map((optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <label className="cursor-pointer">
                              <input
                                type="radio"
                                name="upcomingCorrectOpt"
                                checked={newQuestCorrect === optIdx}
                                onChange={() => setNewQuestCorrect(optIdx)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={`অপশন ${optIdx === 0 ? 'ক (Option A)' : optIdx === 1 ? 'খ (Option B)' : optIdx === 2 ? 'গ (Option C)' : 'ঘ (Option D)'}`}
                              value={newQuestOptions[optIdx]}
                              onChange={(e) => {
                                const copy = [...newQuestOptions];
                                copy[optIdx] = e.target.value;
                                setNewQuestOptions(copy);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-medium"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          প্রশ্নের ব্যাখ্যা / সমাধান (Explanation - Optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="পরীক্ষার্থীদের সঠিক উত্তর বুঝতে সাহায্য করতে বিস্তারিত ব্যাখ্যা দিন..."
                          value={newQuestExplanation}
                          onChange={(e) => setNewQuestExplanation(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddQuestionToUpcoming}
                        disabled={!newQuestText.trim() || newQuestOptions.some(o => !o.trim())}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>ফায়ারস্টোরে প্রশ্নটি সংরক্ষণ করুন (Save to Firestore)</span>
                      </button>
                    </div>

                    {/* Question List View (Right: 7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="space-y-0.5">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="h-4 w-4 text-emerald-600" />
                            <span>সংরক্ষিত প্রশ্নাবলী ({selectedUpcomingExamForQuestions.questions?.length || 0} টি)</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            রিয়েলটাইম সিঙ্ক: /Exam/{selectedUpcomingExamForQuestions.id}/questions
                          </span>
                        </div>

                        {/* Direct Live Release from inside Question Manager */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedUpcomingExamForQuestions) return;
                            const qList = selectedUpcomingExamForQuestions.questions || [];
                            const updated: Exam = {
                              ...selectedUpcomingExamForQuestions,
                              status: 'live',
                              isPublished: true,
                              totalQuestions: qList.length,
                              totalMarks: qList.length,
                            };
                            try {
                              await updateUpcomingExamInFirestore(selectedUpcomingExamForQuestions.id, {
                                status: 'live',
                                isPublished: true,
                                questions: qList,
                                totalQuestions: qList.length,
                                totalMarks: qList.length,
                              });
                              await clearUpcomingExamSettings(selectedUpcomingExamForQuestions.id);
                              if (onUpdateExam) {
                                onUpdateExam(updated);
                              }
                              setSelectedUpcomingExamForQuestions(updated);
                              setCreateSuccessMsg(`"${selectedUpcomingExamForQuestions.title}" পরীক্ষাটি সম্পূর্ণ (${qList.length} টি) প্রশ্নাবলীসহ ফায়ারবেজে আপলোড ও হোম পেজে লাইভ করা হয়েছে! আপকামিং সেকশন থেকে এটি লাইভে স্থানান্তরিত হয়েছে।`);
                              setTimeout(() => setCreateSuccessMsg(''), 7000);
                            } catch (e) {
                              console.error(e);
                              if (onUpdateExam) {
                                onUpdateExam(updated);
                              }
                              setSelectedUpcomingExamForQuestions(updated);
                              alert('লাইভ করতে সমস্যা হয়েছে, তবে লোকাল স্টেট আপডেট করা হয়েছে।');
                            }
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                          title="সকল প্রশ্নসহ পরীক্ষাটি ডাটাবেজে ফাইনাল আপলোড করে হোম পেজে লাইভ করুন"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>ডাটাবেজে আপলোড ও লাইভ করুন</span>
                        </button>
                      </div>

                      {(!selectedUpcomingExamForQuestions.questions || selectedUpcomingExamForQuestions.questions.length === 0) ? (
                        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                          <HelpCircle className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">বর্তমানে কোনো প্রশ্ন যুক্ত করা হয়নি।</p>
                          <p className="text-xs">বামপাশের ফর্মটি ব্যবহার করে এই পরীক্ষায় প্রশ্ন যোগ করুন।</p>
                        </div>
                      ) : (
                        <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                          {selectedUpcomingExamForQuestions.questions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm relative group hover:border-emerald-500/40 transition-all"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuestionFromUpcoming(q.id, q.text);
                                }}
                                className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer z-10 active:scale-95"
                                title="প্রশ্নটি ফায়ারস্টোর ডেটাবেজ থেকে মুছে ফেলুন"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                              <div className="space-y-2.5 pr-8">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
                                    প্রশ্ন #{idx + 1}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {q.subject || selectedUpcomingExamForQuestions.subject || 'সাধারণ'}
                                  </span>
                                </div>

                                <p className="font-extrabold text-xs text-slate-900 dark:text-white leading-relaxed">
                                  {q.text}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                  {q.options.map((opt, oIdx) => {
                                    const isCorrect = q.correctAnswer === oIdx;
                                    return (
                                      <div
                                        key={oIdx}
                                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                          isCorrect
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 font-bold'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                          {oIdx === 0 ? 'ক' : oIdx === 1 ? 'খ' : oIdx === 2 ? 'গ' : 'ঘ'}
                                        </span>
                                        <span className="truncate">{opt}</span>
                                        {isCorrect && (
                                          <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {q.explanation && (
                                  <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-900">
                                    <strong className="text-slate-800 dark:text-slate-200">সমাধান / ব্যাখ্যা:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LIVE & ARCHIVED EXAM CONTROL */}
          {activeTab === 'live_archived_exams' && (
            <AdminLiveArchivedExamTab
              exams={exams}
              currentUser={currentUser || null}
              onUpdateExam={onUpdateExam}
              onDeleteExam={onDeleteExam}
            />
          )}

          {/* TAB 8: GOOGLE SHEETS INTEGRATION & DATA MANAGEMENT (SheetsSync) */}
          {activeTab === 'google_sheets' && (
            <SheetsSync
              students={students}
              exams={exams}
              results={allResults}
              onUpdateExam={onUpdateExam}
              onRefreshData={() => {}}
            />
          )}

          {/* TAB 9: REFERRAL LEADERBOARD */}
          {activeTab === 'referral_leaderboard' && (
            <AdminReferralLeaderboard students={students} />
          )}

          {/* TAB 10: STUDY MATERIALS & PDF RESOURCES */}
          {activeTab === 'study_materials' && (
            <AdminStudyMaterials currentUser={currentUser} />
          )}

          {/* TAB 11: MANUAL PAYMENT REQUESTS & METHODS */}
          {activeTab === 'payments' && (
            <AdminPaymentManagement currentUser={currentUser} />
          )}

        </div>

      </div>

    </div>
  );
}
