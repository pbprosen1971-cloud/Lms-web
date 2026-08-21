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
} from 'lucide-react';
import { Exam, ExamResult, MinistryBankQuestion, MinistryQuestionBank, Question, UserProfile } from '../types';
import { onSnapshot, collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import SheetsSync from './SheetsSync';
import AdminGoogleSheetsTab from './AdminGoogleSheetsTab';
import {
  saveQuestionToFirestore,
  deleteQuestionFromFirestore,
  saveExamToFirestore,
  deleteExamFromFirestore,
  toggleExamPublishInFirestore
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
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'students' | 'results' | 'create_exam' | 'questions' | 'settings' | 'upcoming_exams' | 'google_sheets'>('analytics');

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
          name: data.fullName || data.name || (data.email ? data.email.split('@')[0] : 'ইউজার'),
          fullName: data.fullName || data.name || (data.email ? data.email.split('@')[0] : 'ইউজার'),
          email: data.email || '',
          role: data.role || 'student',
          accountStatus: data.accountStatus || 'active',
          createdAt: data.createdAt || '',
          lastLogin: data.lastLogin || '',
          institution: data.institution || '',
          phone: data.phone || '',
          isPremium: isPrem,
          isPremiumDate: isPremDate,
          isPremiumExpiryDate: isPremExpiryDate,
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
      snapshot.forEach((doc) => {
        list.push(doc.data() as ExamResult);
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
  const [upcomingSubject, setUpcomingSubject] = useState('BCS');
  const [upcomingDuration, setUpcomingDuration] = useState(30);
  const [upcomingStartTime, setUpcomingStartTime] = useState('');
  const [upcomingArchiveTime, setUpcomingArchiveTime] = useState('');
  const [upcomingIsPremium, setUpcomingIsPremium] = useState<boolean>(false);
  const [selectedUpcomingExamForQuestions, setSelectedUpcomingExamForQuestions] = useState<Exam | null>(null);

  const [newQuestText, setNewQuestText] = useState('');
  const [newQuestOptions, setNewQuestOptions] = useState<string[]>(['', '', '', '']);
  const [newQuestCorrect, setNewQuestCorrect] = useState<number>(0);
  const [newQuestExplanation, setNewQuestExplanation] = useState('');
  const [newQuestSubject, setNewQuestSubject] = useState<string>('বাংলা');

  // Submit new upcoming exam
  const handleCreateUpcomingExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upcomingTitle) return;

    const createdExam: Exam = {
      id: `exam-created-${Date.now()}`,
      title: upcomingTitle,
      subject: upcomingSubject,
      durationMinutes: Number(upcomingDuration),
      totalQuestions: 0,
      totalMarks: 0,
      status: 'upcoming',
      questions: [],
      startTime: upcomingStartTime || undefined,
      archiveTime: upcomingArchiveTime || undefined,
      dateCreated: new Date().toLocaleDateString('en-CA'),
      isPremium: upcomingIsPremium,
    };

    onCreateExam(createdExam);
    
    // Reset fields
    setUpcomingTitle('');
    setUpcomingDuration(30);
    setUpcomingStartTime('');
    setUpcomingArchiveTime('');
    setUpcomingIsPremium(false);
    
    setCreateSuccessMsg('নতুন আপকামিং পরীক্ষাটি সফলভাবে শিডিউল করা হয়েছে! এটি হোম পেজের আপকামিং তালিকায় দেখাবে।');
    setTimeout(() => setCreateSuccessMsg(''), 5000);
  };

  // Add a question to selected upcoming exam
  const handleAddQuestionToUpcoming = async () => {
    if (!selectedUpcomingExamForQuestions || !newQuestText.trim()) return;

    const newQuestion: Question = {
      id: `q-created-${Date.now()}`,
      text: newQuestText,
      options: [...newQuestOptions],
      correctAnswer: newQuestCorrect,
      subject: newQuestSubject || selectedUpcomingExamForQuestions.subject || 'বাংলা',
      explanation: newQuestExplanation.trim() || undefined,
    };

    const updatedQuestions = [...(selectedUpcomingExamForQuestions.questions || []), newQuestion];
    const updatedExam: Exam = {
      ...selectedUpcomingExamForQuestions,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
      totalMarks: updatedQuestions.length,
    };

    try {
      await saveQuestionToFirestore(newQuestion, selectedUpcomingExamForQuestions.id, updatedQuestions.length);
      if (onUpdateExam) {
        onUpdateExam(updatedExam);
      }
      setSelectedUpcomingExamForQuestions(updatedExam);

      setNewQuestText('');
      setNewQuestOptions(['', '', '', '']);
      setNewQuestCorrect(0);
      setNewQuestExplanation('');

      setCreateSuccessMsg('কুইজে নতুন প্রশ্নটি সফলভাবে ফায়ারস্টোরে যুক্ত করা হয়েছে!');
      setTimeout(() => setCreateSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Failed to add question to Firestore:", err);
    }
  };

  // Delete a question from selected upcoming exam
  const handleDeleteQuestionFromUpcoming = async (questionId: string) => {
    if (!selectedUpcomingExamForQuestions) return;

    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই প্রশ্নটি ফায়ারস্টোর থেকে মুছে ফেলতে চান?')) {
      return;
    }

    const updatedQuestions = (selectedUpcomingExamForQuestions.questions || []).filter(q => q.id !== questionId);
    const updatedExam: Exam = {
      ...selectedUpcomingExamForQuestions,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
      totalMarks: updatedQuestions.length,
    };

    try {
      await deleteQuestionFromFirestore(questionId, selectedUpcomingExamForQuestions.id);
      if (onUpdateExam) {
        onUpdateExam(updatedExam);
      }
      setSelectedUpcomingExamForQuestions(updatedExam);

      setCreateSuccessMsg('প্রশ্নটি সফলভাবে ফায়ারস্টোর থেকে মুছে ফেলা হয়েছে!');
      setTimeout(() => setCreateSuccessMsg(''), 3000);
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
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" /> ড্যাশবোর্ড এনালাইটিক্স
          </button>

          <button
            onClick={() => { setActiveTab('students'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'students'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <Users className="h-4.5 w-4.5" /> শিক্ষার্থী ব্যবস্থাপনা
          </button>

          <button
            onClick={() => { setActiveTab('results'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'results'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <FileText className="h-4.5 w-4.5" /> এক্সাম রেজাল্ট শিট
          </button>

          <button
            onClick={() => { setActiveTab('questions'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'questions'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" /> কোশ্চেন ব্যাংক (প্রশ্নাবলী)
          </button>

          <button
            onClick={() => { setActiveTab('upcoming_exams'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'upcoming_exams'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <Clock className="h-4.5 w-4.5" /> আপকামিং পরীক্ষা (Upcoming)
          </button>

          <button
            onClick={() => { setActiveTab('google_sheets'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'google_sheets'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <FileSpreadsheet className="h-4.5 w-4.5" /> SheetsSync (Google Sheets)
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
            className={`w-full p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all ${
              activeTab === 'settings'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60'
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
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1">
                  <span className="text-3xl font-extrabold text-primary">{students.length} জন</span>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">মোট শিক্ষার্থী (Firebase)</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1">
                  <span className="text-3xl font-extrabold text-primary">{exams.length} টি</span>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">মোট পরীক্ষা</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1">
                  <span className="text-3xl font-extrabold text-primary">৭২%</span>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">গড় পাস রেট</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center space-y-1">
                  <span className="text-3xl font-extrabold text-primary">৪৫০+</span>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">সংগৃহীত প্রশ্ন</span>
                </div>
              </div>

              {/* Graphic Chart visual mock */}
              <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-4">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">শিক্ষার্থী নিবন্ধনের মাসিক ট্রেন্ড (Trend)</h4>
                <div className="h-40 flex items-end gap-3 pt-6 border-b border-slate-100 dark:border-slate-700">
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
                      <span className="text-[10px] text-slate-400 font-bold">{data.m}</span>
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
                <h3 className="font-bold text-lg">শিক্ষার্থী তালিকা ও একাউন্ট কন্ট্রোল</h3>
                
                {/* Search input inside tab */}
                <div className="relative max-w-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="নাম, ইমেইল বা UID দিয়ে খুঁজুন..."
                    className="block w-full pl-9 pr-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Students Grid/Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/60">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                          {dbLoading ? (
                            <span>ফায়ারবেস রিয়েলটাইম ডেটা লোড হচ্ছে...</span>
                          ) : (
                            <span>ফায়ারবেস ডেটাবেজে কোনো নিবন্ধনকৃত শিক্ষার্থী পাওয়া যায়নি।</span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((stud) => (
                        <tr key={stud.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-3 font-mono text-[11px]">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 font-semibold block truncate max-w-[120px]" title={stud.uid || stud.id}>
                              {stud.uid || stud.id}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>{stud.name}</span>
                            {stud.role === 'admin' ? (
                              <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] rounded-md border border-purple-500/20">
                                এডমিন
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-md border border-emerald-500/20">
                                শিক্ষার্থী
                              </span>
                            )}
                            {stud.isPremium && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] rounded-md border border-amber-500/20 flex items-center gap-1">
                                <Crown className="h-3 w-3 fill-current" />
                                প্রিমিয়াম
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500">
                            {stud.institution ? (
                              <span>{stud.institution}</span>
                            ) : (
                              <span className="text-slate-400 italic">- (ফাঁকা)</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-400">{stud.email}</td>
                          <td className="p-3 font-mono text-xs">
                            {stud.phone ? (
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{stud.phone}</span>
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
                  <h3 className="font-bold text-lg">সর্বশেষ কুইজ ফলাফল বিবরণী</h3>
                  <p className="text-xs text-slate-400">শিক্ষার্থীদের দেওয়া সর্বশেষ কুইজের বিস্তারিত বিবরণ শিট।</p>
                </div>
                
                {/* Print/Download results action */}
                <button
                  onClick={handleDownloadResultSheet}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 self-start"
                >
                  <Download className="h-4 w-4" /> ডাউনলোড রেজাল্ট শিট
                </button>
              </div>

              {/* Table of results taken */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-slate-500 font-bold">
                      <th className="p-3">শিক্ষার্থী</th>
                      <th className="p-3">পরীক্ষার নাম</th>
                      <th className="p-3 text-center">প্রাপ্ত নম্বর</th>
                      <th className="p-3 text-center">সঠিক/ভুল</th>
                      <th className="p-3 text-right">তারিখ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {allResults.map((res) => {
                      const percentage = Math.round((res.score / res.totalQuestions) * 100);
                      return (
                        <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-3">
                            <span className="font-semibold block text-slate-800 dark:text-white">{res.studentName}</span>
                            <span className="text-[10px] text-slate-400">{res.studentEmail}</span>
                          </td>
                          <td className="p-3 text-slate-500 max-w-[200px] truncate">{res.examTitle}</td>
                          <td className="p-3 text-center font-bold text-emerald-600">{res.score} / {res.totalQuestions} ({percentage}%)</td>
                          <td className="p-3 text-center">
                            <span className="text-emerald-500">{res.correctAnswers}✓</span>
                            <span className="text-slate-300 mx-1">|</span>
                            <span className="text-rose-500">{res.wrongAnswers}✗</span>
                          </td>
                          <td className="p-3 text-right text-slate-400 font-mono">{res.dateTaken}</td>
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
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>হোম পেজে প্রকাশিত</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>হোম পেজে প্রকাশ করুন</span>
                                </>
                              )}
                            </button>

                            {/* Add More Questions Button */}
                            <button
                              type="button"
                              onClick={() => handleStartAddMoreQuestions(bank)}
                              className="py-2 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>আরও প্রশ্ন যুক্ত করুন</span>
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

          {/* TAB 6: PLATFORM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg">প্ল্যাটফর্ম কন্ট্রোল ও গেটওয়ে সেটিংস</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">গেস্ট পরীক্ষার্থীর জন্য লাইভ এক্সাম অনুমোদন</h4>
                    <p className="text-[11px] text-slate-400">লগইন ছাড়া শিক্ষার্থীদের পরীক্ষা দিতে সুযোগ দিন।</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowGuest}
                    onChange={(e) => setSettings({ ...settings, allowGuest: e.target.checked })}
                    className="w-4.5 h-4.5 text-primary focus:ring-primary rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">মেইনটেইনেন্স মোড (Maintenance Mode)</h4>
                    <p className="text-[11px] text-slate-400">প্ল্যাটফর্মে সাময়িক মেরামত কাজ করার জন্য সাইট বন্ধ রাখুন।</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="w-4.5 h-4.5 text-primary focus:ring-primary rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">মোবাইল নম্বর বাধ্যতামূলক করা</h4>
                    <p className="text-[11px] text-slate-400">নিবন্ধনের সময় শিক্ষার্থীর ফোন নম্বর প্রদান বাধ্যতামূলক করা হবে।</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requirePhone}
                    onChange={(e) => setSettings({ ...settings, requirePhone: e.target.checked })}
                    className="w-4.5 h-4.5 text-primary focus:ring-primary rounded"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setCreateSuccessMsg('প্ল্যাটফর্মের কনফিগারেশন সেটিংস সফলভাবে আপডেট করা হয়েছে!');
                  setTimeout(() => setCreateSuccessMsg(''), 3000);
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md"
              >
                সেটিংস সংরক্ষণ করুন
              </button>
            </div>
          )}

          {/* TAB 7: UPCOMING EXAMS & QUESTIONS MANAGEMENT */}
          {activeTab === 'upcoming_exams' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-4 gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">আসন্ন পরীক্ষা ও শিডিউল সেটিংস</h3>
                  <p className="text-xs text-slate-400 mt-1">এখানে নতুন আসন্ন পরীক্ষা তৈরি করুন এবং সেগুলোতে সরাসরি প্রশ্নাবলী যুক্ত করুন।</p>
                </div>
                {selectedUpcomingExamForQuestions && (
                  <button
                    onClick={() => setSelectedUpcomingExamForQuestions(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg text-xs font-bold self-start"
                  >
                    ← তালিকায় ফিরে যান
                  </button>
                )}
              </div>

              {/* Status Message */}
              {createSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{createSuccessMsg}</span>
                </div>
              )}

              {!selectedUpcomingExamForQuestions ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Create New Upcoming Exam Form (Left: 5 cols) */}
                  <form onSubmit={handleCreateUpcomingExamSubmit} className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800">
                      <PlusCircle className="h-4 w-4 text-primary" />
                      নতুন আপকামিং কুইজ অ্যাড করুন
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">পরীক্ষার শিরোনাম (Title)</label>
                      <input
                        type="text"
                        required
                        placeholder="যেমন: ৪৬তম বিসিএস প্রিলি মডেল টেস্ট-০৩"
                        value={upcomingTitle}
                        onChange={(e) => setUpcomingTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <span>🏢 দপ্তর / পরীক্ষার ক্যাটাগরি</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">হোম পেজ কানেক্টেড</span>
                        </label>
                        <select
                          value={upcomingSubject}
                          onChange={(e) => setUpcomingSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-amber-50/40 dark:bg-slate-950 border border-amber-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none font-semibold"
                        >
                          <option value="BCS">BCS (বিসিএস)</option>
                          <option value="Bank">Bank (ব্যাংক চাকরি)</option>
                          <option value="11th - 20th Grade Job">11th - 20th Grade (১১তম-২০তম গ্রেড)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">সিলেক্টকৃত দপ্তর অনুযায়ী এই পরীক্ষার সকল প্রশ্ন হোম পেজের উক্ত ক্যাটাগরিতে সরাসরি যুক্ত হবে।</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">সময়সীমা (মিনিট)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={upcomingDuration}
                          onChange={(e) => setUpcomingDuration(Number(e.target.value))}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>লাইভ ডেট ও সময় (Live Date & Time)</span>
                        </span>
                        <span className="text-[10px] text-primary font-semibold">ক্যালেন্ডার সিলেক্ট করুন</span>
                      </label>
                      <input
                        ref={startTimeInputRef}
                        type="datetime-local"
                        value={upcomingStartTime}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {}
                        }}
                        onChange={(e) => setUpcomingStartTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none font-medium cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded-md [&::-webkit-calendar-picker-indicator]:dark:invert"
                      />
                      <p className="text-[10px] text-slate-400">ইনপুট বক্সে বা আইকনে সরাসরি ক্লিক করে নেটিভ ক্যালেন্ডার পিকার ব্যবহার করুন।</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>আর্কাইভ ডেট ও সময় (Archive Date & Time)</span>
                        </span>
                        <span className="text-[10px] text-amber-600 font-semibold">ক্যালেন্ডার সিলেক্ট করুন</span>
                      </label>
                      <input
                        ref={archiveTimeInputRef}
                        type="datetime-local"
                        value={upcomingArchiveTime}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {}
                        }}
                        onChange={(e) => setUpcomingArchiveTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none font-medium cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded-md [&::-webkit-calendar-picker-indicator]:dark:invert"
                      />
                      <p className="text-[10px] text-slate-400">ইনপুট বক্সে বা আইকনে সরাসরি ক্লিক করে নেটিভ ক্যালেন্ডার পিকার ব্যবহার করুন।</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                        <span>এক্সাম টাইপ (Free / Premium)</span>
                      </label>
                      <select
                        value={upcomingIsPremium ? 'premium' : 'free'}
                        onChange={(e) => setUpcomingIsPremium(e.target.value === 'premium')}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="free">🆓 ফ্রি এক্সাম (Free Exam)</option>
                        <option value="premium">⭐ প্রিমিয়াম এক্সাম (Premium Exam)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        লক্ষণীয়: ফ্রি বা প্রিমিয়াম ব্যাজটি শুধুমাত্র লাইভ সেকশনে প্রকাশিত হবে, আপকামিং সেকশনে গোপন থাকবে।
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      আপকামিং পরীক্ষা শিডিউল করুন
                    </button>
                  </form>

                  {/* List of Existing Upcoming Exams (Right: 7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800">
                      <Clock className="h-4 w-4 text-amber-500" />
                      শিডিউলকৃত আপকামিং পরীক্ষাসমূহ ({exams.filter(e => e.status === 'upcoming').length} টি)
                    </h4>

                    {exams.filter(e => e.status === 'upcoming').length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 dark:text-slate-500">
                        <Calendar className="h-10 w-10 mx-auto mb-2.5 text-slate-300" />
                        <p className="text-xs">বর্তমানে কোনো আপকামিং পরীক্ষা নেই। বামদিকের ফর্মটি ব্যবহার করে নতুন পরীক্ষা যুক্ত করুন।</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {exams.filter(e => e.status === 'upcoming').map((exam) => (
                          <div key={exam.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded capitalize">
                                  {exam.subject}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                                  exam.isPremium
                                    ? 'text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                                }`}>
                                  {exam.isPremium ? '⭐ প্রিমিয়াম (Premium)' : '🆓 ফ্রি (Free)'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateExam) {
                                      onUpdateExam({ ...exam, isPremium: !exam.isPremium });
                                    }
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-primary underline font-medium"
                                  title="ফ্রি/প্রিমিয়াম টাইপ পরিবর্তন করুন"
                                >
                                  ({exam.isPremium ? 'ফ্রি করুন' : 'প্রিমিয়াম করুন'})
                                </button>
                                {exam.startTime && (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    শুরু: {formatBanglaDateTime(exam.startTime)}
                                  </span>
                                )}
                                {exam.archiveTime && (
                                  <span className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded flex items-center gap-1" title={exam.archiveTime}>
                                    <Clock className="h-2.5 w-2.5 text-rose-500" />
                                    আর্কাইভ: {new Date(exam.archiveTime).toLocaleDateString('bn-BD')} {new Date(exam.archiveTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-sm text-slate-800 dark:text-white leading-snug">{exam.title}</h5>
                              <p className="text-[11px] text-slate-400">সময়সীমা: {exam.durationMinutes} মিনিট | প্রশ্নসংখ্যা: {exam.questions?.length || 0} টি</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateExam) {
                                    onUpdateExam({ ...exam, status: 'live' });
                                    setCreateSuccessMsg(`"${exam.title}" পরীক্ষাটি সরাসরি লাইভ সেকশনে যুক্ত করা হয়েছে!`);
                                    setTimeout(() => setCreateSuccessMsg(''), 4000);
                                  }
                                }}
                                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/10 flex items-center justify-center gap-1"
                                title="পরীক্ষাটি এখনই লাইভ সেকশনে যুক্ত করুন"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                এখনই লাইভ করুন
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUpcomingExamForQuestions(exam);
                                  // reset question editor
                                  setNewQuestText('');
                                  setNewQuestOptions(['', '', '', '']);
                                  setNewQuestCorrect(0);
                                  setNewQuestExplanation('');
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1"
                              >
                                <PlusCircle className="h-4 w-4" />
                                প্রশ্ন যুক্ত করুন ({exam.questions?.length || 0})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Questions management for selected upcoming exam */
                <div className="space-y-6">
                  {/* Exam Summary Info Header */}
                  <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">UPCOMING</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">বিষয়: {selectedUpcomingExamForQuestions.subject}</span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{selectedUpcomingExamForQuestions.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">নির্ধারিত সময়: {selectedUpcomingExamForQuestions.durationMinutes} মিনিট | প্রশ্ন সংখ্যা: <strong className="text-emerald-600 dark:text-emerald-400">{selectedUpcomingExamForQuestions.questions?.length || 0} টি</strong></p>
                    </div>
                    <button
                      onClick={() => setSelectedUpcomingExamForQuestions(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 self-start md:self-center"
                    >
                      ← কুইজ তালিকায় ফিরে যান
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Add New Question Form (Left: 5 cols) */}
                    <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-5 space-y-4">
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800">
                        <PlusCircle className="h-4 w-4 text-emerald-600" />
                        নতুন প্রশ্ন যুক্ত করুন
                      </h4>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🏢 দপ্তর / বিষয় ক্যাটাগরি</label>
                        <select
                          value={newQuestSubject}
                          onChange={(e) => setNewQuestSubject(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <optgroup label="🏢 দপ্তর / জব ক্যাটাগরি">
                            <option value="BCS">BCS (বিসিএস)</option>
                            <option value="Bank">Bank (ব্যাংক চাকরি)</option>
                            <option value="11th - 20th Grade Job">11th - 20th Grade (১১তম-২০তম গ্রেড)</option>
                          </optgroup>
                          <optgroup label="📚 বিষয় ক্যাটাগরি">
                            <option value="বাংলা">বাংলা (Bangla)</option>
                            <option value="ইংরেজি">ইংরেজি (English)</option>
                            <option value="গণিত">গণিত (Math)</option>
                            <option value="GK">সাধারণ জ্ঞান (GK)</option>
                            <option value="ICT">ICT (তথ্যপ্রযুক্তি)</option>
                            <option value="বিজ্ঞান">বিজ্ঞান (Science)</option>
                          </optgroup>
                        </select>
                        <p className="text-[10px] text-slate-400">পরীক্ষাটি লাইভ হলে প্রশ্নটি হোম পেজের এই ক্যাটাগরিতে সরাসরি যুক্ত হবে।</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">প্রশ্নের বিবরণ (Question Text)</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="প্রশ্নটি এখানে টাইপ করুন..."
                          value={newQuestText}
                          onChange={(e) => setNewQuestText(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-2.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">অপশনসমূহ এবং সঠিক উত্তর নির্বাচন করুন</label>
                        {[0, 1, 2, 3].map((optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="upcomingCorrectOpt"
                              checked={newQuestCorrect === optIdx}
                              onChange={() => setNewQuestCorrect(optIdx)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              required
                              placeholder={`অপশন ${optIdx === 0 ? 'ক' : optIdx === 1 ? 'খ' : optIdx === 2 ? 'গ' : 'ঘ'}`}
                              value={newQuestOptions[optIdx]}
                              onChange={(e) => {
                                const copy = [...newQuestOptions];
                                copy[optIdx] = e.target.value;
                                setNewQuestOptions(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">প্রশ্নের ব্যাখ্যা (Explanation - Optional)</label>
                        <textarea
                          rows={2}
                          placeholder="শিক্ষার্থীদের জন্য প্রশ্নের ব্যাখ্যা বা সমাধান এখানে লিখুন..."
                          value={newQuestExplanation}
                          onChange={(e) => setNewQuestExplanation(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleAddQuestionToUpcoming}
                        disabled={!newQuestText.trim() || newQuestOptions.some(o => !o.trim())}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="h-4 w-4" />
                        এই প্রশ্নটি যুক্ত করুন
                      </button>
                    </div>

                    {/* Question List View (Right: 7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
                        <span>প্রশ্নাবলী তালিকা ({selectedUpcomingExamForQuestions.questions?.length || 0} টি)</span>
                        <span className="text-[11px] text-slate-400">বৃত্ত সঠিক উত্তর নির্দেশ করে</span>
                      </h4>

                      {(!selectedUpcomingExamForQuestions.questions || selectedUpcomingExamForQuestions.questions.length === 0) ? (
                        <div className="bg-slate-50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 dark:text-slate-500">
                          <HelpCircle className="h-10 w-10 mx-auto mb-2.5 text-slate-300 animate-bounce" />
                          <p className="text-xs">বর্তমানে কুইজে কোনো প্রশ্ন যুক্ত করা হয়নি। বামদিকের ফর্মটি ব্যবহার করে প্রশ্ন যুক্ত করুন।</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                          {selectedUpcomingExamForQuestions.questions.map((q, idx) => (
                            <div key={q.id || idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl shadow-sm relative group">
                              <button
                                onClick={() => handleDeleteQuestionFromUpcoming(q.id)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                              <div className="space-y-2 pr-6">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-900/40">
                                    বিষয়: {q.subject || selectedUpcomingExamForQuestions.subject || 'সাধারণ'}
                                  </span>
                                </div>
                                <p className="font-bold text-xs text-slate-900 dark:text-white leading-relaxed">
                                  {idx + 1}. {q.text}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                                        q.correctAnswer === oIdx
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300 font-semibold'
                                          : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold">
                                        {oIdx === 0 ? 'ক' : oIdx === 1 ? 'খ' : oIdx === 2 ? 'গ' : 'ঘ'}
                                      </span>
                                      <span className="truncate">{opt}</span>
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg text-[10px] text-slate-500 border border-slate-100 dark:border-slate-900">
                                    <strong className="text-slate-700 dark:text-slate-300">সমাধান/ব্যাখ্যা:</strong> {q.explanation}
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

          {/* TAB 7: GOOGLE SHEETS INTEGRATION & DATA MANAGEMENT (SheetsSync) */}
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
