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
} from '../services/firestoreService';

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
  const [activeTab, setActiveTab] = useState<'analytics' | 'students' | 'results' | 'create_exam' | 'questions' | 'settings' | 'upcoming_exams' | 'live_archived_exams' | 'google_sheets'>('analytics');

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
  const [newStatus, setNewStatus] = useState<'live' | 'upcoming'>('live');
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

  // Dedicated Firestore siteSettings/upcomingExam persistent state
  const [isEditingFeatured, setIsEditingFeatured] = useState<boolean>(false);
  const [settingTitle, setSettingTitle] = useState<string>(upcomingExamSettings?.title || '');
  const [settingDesc, setSettingDesc] = useState<string>(upcomingExamSettings?.description || '');
  const [settingSubject, setSettingSubject] = useState<string>(upcomingExamSettings?.subject || 'BCS');
  const [settingDuration, setSettingDuration] = useState<number>(upcomingExamSettings?.duration || upcomingExamSettings?.durationMinutes || 30);
  const [settingStartTime, setSettingStartTime] = useState<string>(upcomingExamSettings?.startTime || '');
  const [settingDate, setSettingDate] = useState<string>(upcomingExamSettings?.examDate || '');
  const [settingIsPublished, setSettingIsPublished] = useState<boolean>(upcomingExamSettings?.isPublished !== false);
  const [settingIsPremium, setSettingIsPremium] = useState<boolean>(upcomingExamSettings?.isPremium || false);
  const [settingExamId, setSettingExamId] = useState<string>(upcomingExamSettings?.examId || '');
  const [settingSaving, setSettingSaving] = useState<boolean>(false);
  const [settingSuccessMsg, setSettingSuccessMsg] = useState<string>('');
  const [settingErrorMsg, setSettingErrorMsg] = useState<string>('');
  const [lastSavedUpcomingExam, setLastSavedUpcomingExam] = useState<Exam | null>(null);

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
    if (upcomingExamSettings) {
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
  }, [upcomingExamSettings]);

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
      const rawDate = settingDate ? settingDate.trim() : (rawStart ? (rawStart.includes('T') ? rawStart.split('T')[0] : rawStart) : '');

      // 2. Prepare Exam object for the upcoming exams list & question editor
      const syncExam: Exam = {
        id: targetExamId,
        title: settingTitle.trim(),
        subject: settingSubject,
        durationMinutes: Number(settingDuration) || 30,
        totalQuestions: existingExam?.questions?.length || existingExam?.totalQuestions || 0,
        totalMarks: existingExam?.questions?.length || existingExam?.totalMarks || 0,
        status: 'upcoming',
        isPublished: settingIsPublished,
        isPremium: settingIsPremium,
        startTime: rawStart || undefined,
        startDate: rawDate || undefined,
        dateCreated: rawDate || '',
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
      setSettingSuccessMsg(`"${settingTitle.trim()}" পরীক্ষাটি ফায়ারস্টোরে সফলভাবে সংরক্ষিত ও হোম পেজের সাথে সিঙ্ক হয়েছে। আপনি এখনই "প্রশ্ন যুক্ত ও পরিচালনা করুন" বাটনে ক্লিক করে প্রশ্ন যুক্ত করতে পারেন!`);
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
    setSettingDate(exam.dateCreated || '');
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
      examDate: exam.dateCreated || '',
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
        archiveTime: upcomingArchiveTime ? upcomingArchiveTime.trim() : undefined,
        dateCreated: rawDate || '',
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
    if (onUpdateExam) {
      onUpdateExam(updatedExam);
    }

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
    if (onUpdateExam) {
      onUpdateExam(updatedExam);
    }

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

  // Trigger print result sheet
  const handleDownloadResultSheet = () => {
    window.print();
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
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">শিক্ষার্থী তালিকা ও একাউন্ট কন্ট্রোল</h3>
                
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
                            <button
                              onClick={() => handleDeleteStudent(stud.id, stud.email)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/30"
                              title="সদস্য মুছুন"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EXAM RESULT SHEET */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">সর্বশেষ কুইজ ফলাফল বিবরণী</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">শিক্ষার্থীদের দেওয়া সর্বশেষ কুইজের বিস্তারিত বিবরণ শিট।</p>
                </div>
                
                {/* Print/Download results action */}
                <button
                  onClick={handleDownloadResultSheet}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <Download className="h-4 w-4" /> ডাউনলোড রেজাল্ট শিট
                </button>
              </div>

              {/* Table of results taken */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                      <th className="p-3">শিক্ষার্থী</th>
                      <th className="p-3">পরীক্ষার নাম</th>
                      <th className="p-3 text-center">প্রাপ্ত নম্বর</th>
                      <th className="p-3 text-center">সঠিক/ভুল</th>
                      <th className="p-3 text-right">তারিখ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/50">
                    {allResults.map((res) => {
                      const percentage = Math.round((res.score / res.totalQuestions) * 100);
                      return (
                        <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <span className="font-semibold block text-slate-900 dark:text-white">{res.studentName}</span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">{res.studentEmail}</span>
                          </td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 font-medium max-w-[200px] truncate">{res.examTitle}</td>
                          <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400">{res.score} / {res.totalQuestions} ({percentage}%)</td>
                          <td className="p-3 text-center">
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{res.correctAnswers}✓</span>
                            <span className="text-slate-400 dark:text-slate-500 mx-1">|</span>
                            <span className="text-rose-700 dark:text-rose-400 font-bold">{res.wrongAnswers}✗</span>
                          </td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300 font-mono font-medium">{res.dateTaken}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

                {/* Step 2: Add Single Questions Form */}
                <form onSubmit={handleAddQuestionToDraft} className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-extrabold flex items-center justify-center">২</span>
                      <span>প্রশ্ন, ৪টি বিকল্প উত্তর, সঠিক উত্তর ও বিশদ ব্যাখ্যা যুক্তকরণ</span>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                      যুক্তকৃত প্রশ্ন: {mbQuestionsList.length} টি
                    </span>
                  </h4>

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
                  {/* FEATURED UPCOMING EXAM & HOMEPAGE HEADLINE SYNC CARD */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-500/20">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3.5 py-1 bg-amber-500 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          হোম পেজ ফিচার্ড শিরোনাম ও আপকামিং পরীক্ষা পরিচালনা
                        </span>
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                          Firestore <code className="text-amber-700 dark:text-amber-300 font-mono">siteSettings/upcomingExam & /exam</code>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {upcomingExamSettings?.title && !isEditingFeatured && (
                          <>
                            {upcomingExamSettings?.isPublished !== false ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold rounded-xl">
                                <Check className="h-3.5 w-3.5" /> হোম পেজে লাইভ প্রদর্শিত
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl">
                                <EyeOff className="h-3.5 w-3.5" /> হোম পেজে খসড়া (লুকানো)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingFeatured || !upcomingExamSettings?.title ? (
                      /* EDIT / CREATE FORM DIRECTLY SYNCED WITH FIRESTORE */
                      <form onSubmit={handleSaveUpcomingSettingsForm} className="space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-amber-500" />
                            <span>{upcomingExamSettings?.title ? 'আসন্ন পরীক্ষার তথ্য সম্পাদনা করুন' : 'নতুন আসন্ন পরীক্ষার সময়সূচি ও শিরোনাম যুক্ত করুন'}</span>
                          </h4>
                          {upcomingExamSettings?.title && (
                            <button
                              type="button"
                              onClick={() => setIsEditingFeatured(false)}
                              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all"
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
                            {upcomingExamSettings?.title && (
                              <button
                                type="button"
                                onClick={() => setIsEditingFeatured(false)}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
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
                                  <span>ফায়ারস্টোরে সেভ ও সিঙ্ক করুন</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      /* DISPLAY VIEW OF THE FEATURED SYNCED EXAM */
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        <div className="lg:col-span-8 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-amber-700 bg-amber-100/80 dark:bg-amber-900/60 dark:text-amber-300 px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                              {upcomingExamSettings.subject || 'BCS'}
                            </span>
                            {upcomingExamSettings.isPremium && (
                              <span className="text-xs font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <Crown className="h-3 w-3 fill-current" />
                                প্রিমিয়াম
                              </span>
                            )}
                            {upcomingExamSettings.startTime && (
                              <span className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 font-semibold">
                                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                লাইভ শুরু: {formatBanglaDateTime(upcomingExamSettings.startTime)}
                              </span>
                            )}
                            <span className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                              ⏱️ {upcomingExamSettings.duration || upcomingExamSettings.durationMinutes || 30} মিনিট
                            </span>
                          </div>

                          <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                            {upcomingExamSettings.title}
                          </h4>

                          {upcomingExamSettings.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                              {upcomingExamSettings.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 font-mono">
                            <span>Firestore ID: <code className="text-amber-600 dark:text-amber-400">{upcomingExamSettings.examId || 'upcoming-exam'}</code></span>
                          </div>
                        </div>

                        <div className="lg:col-span-4 flex flex-col items-stretch justify-center gap-2.5">
                          {/* Manage Questions Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const targetExam = exams.find(e => e.id === upcomingExamSettings.examId || e.title.trim().toLowerCase() === upcomingExamSettings.title?.trim().toLowerCase()) || {
                                id: upcomingExamSettings.examId || `upcoming-exam-${Date.now()}`,
                                title: upcomingExamSettings.title,
                                subject: upcomingExamSettings.subject || 'BCS',
                                durationMinutes: upcomingExamSettings.duration || upcomingExamSettings.durationMinutes || 30,
                                totalQuestions: 0,
                                totalMarks: 0,
                                status: 'upcoming',
                                isPublished: upcomingExamSettings.isPublished !== false,
                                isPremium: !!upcomingExamSettings.isPremium,
                                startTime: upcomingExamSettings.startTime || undefined,
                                dateCreated: upcomingExamSettings.examDate || new Date().toISOString().split('T')[0],
                                questions: [],
                              };
                              setSelectedUpcomingExamForQuestions(targetExam);
                              setNewQuestText('');
                              setNewQuestOptions(['', '', '', '']);
                              setNewQuestCorrect(0);
                              setNewQuestExplanation('');
                              setNewQuestMarks(1);
                            }}
                            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:shadow-lg"
                          >
                            <ListPlus className="h-4 w-4" />
                            <span>প্রশ্ন যুক্ত ও পরিচালনা করুন</span>
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSettingTitle(upcomingExamSettings.title || '');
                                setSettingDesc(upcomingExamSettings.description || '');
                                setSettingSubject(upcomingExamSettings.subject || 'BCS');
                                setSettingDuration(upcomingExamSettings.duration || upcomingExamSettings.durationMinutes || 30);
                                setSettingStartTime(upcomingExamSettings.startTime || '');
                                setSettingIsPremium(!!upcomingExamSettings.isPremium);
                                setSettingIsPublished(upcomingExamSettings.isPublished !== false);
                                setIsEditingFeatured(true);
                              }}
                              className="px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-amber-500" />
                              <span>সম্পাদনা</span>
                            </button>

                            {/* Toggle Publish / Draft */}
                            <button
                              type="button"
                              onClick={async () => {
                                const newStatus = upcomingExamSettings.isPublished === false;
                                const updatedPayload: UpcomingExamSettings = {
                                  ...upcomingExamSettings,
                                  isPublished: newStatus,
                                };
                                setSettingSaving(true);
                                try {
                                  await saveUpcomingExamSettings(updatedPayload, currentUser?.uid || 'admin');
                                  if (onSaveUpcomingExamSettings) {
                                    await onSaveUpcomingExamSettings(updatedPayload);
                                  }
                                  setSettingSuccessMsg(
                                    newStatus
                                      ? 'হোম পেজে ফিচার্ড শিরোনাম সফলভাবে দৃশ্যমান করা হয়েছে।'
                                      : 'হোম পেজ থেকে ফিচার্ড শিরোনাম লুকানো হয়েছে (খসড়া)।'
                                  );
                                  setTimeout(() => setSettingSuccessMsg(''), 4000);
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setSettingSaving(false);
                                }
                              }}
                              className="px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              {upcomingExamSettings.isPublished !== false ? (
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

                          {/* Make Live Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              const targetExamId = upcomingExamSettings.examId || `upcoming-exam-${Date.now()}`;
                              const existingExam = exams.find(e => e.id === targetExamId || e.title === upcomingExamSettings.title);
                              const qList = existingExam?.questions || [];
                              const liveExam: Exam = {
                                id: targetExamId,
                                title: upcomingExamSettings.title,
                                subject: upcomingExamSettings.subject || 'BCS',
                                durationMinutes: upcomingExamSettings.duration || upcomingExamSettings.durationMinutes || 30,
                                totalQuestions: qList.length,
                                totalMarks: qList.length,
                                status: 'live',
                                isPublished: true,
                                isPremium: !!upcomingExamSettings.isPremium,
                                startTime: upcomingExamSettings.startTime || undefined,
                                dateCreated: upcomingExamSettings.examDate || new Date().toISOString().split('T')[0],
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
                                setSettingSuccessMsg(`"${upcomingExamSettings.title}" পরীক্ষাটি সরাসরি লাইভ করা হয়েছে এবং চলমান পরীক্ষায় স্থানান্তরিত হয়েছে!`);
                                setTimeout(() => setSettingSuccessMsg(''), 6000);
                              } catch (err) {
                                console.error('Error making live:', err);
                                if (onUpdateExam) onUpdateExam(liveExam);
                              }
                            }}
                            className="w-full px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>এখনই লাইভ করুন</span>
                          </button>
                        </div>
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

        </div>

      </div>

    </div>
  );
}
