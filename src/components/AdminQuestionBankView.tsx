/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  Calendar,
  Sparkles,
  Building2,
  Tag,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  FileText,
  FileCheck,
  Clock,
  Minus,
  Sliders,
  EyeOff,
  Play,
} from 'lucide-react';
import {
  QuestionBankItem,
  NewQuestionBankItem,
  QuestionBankCsvRow,
  QuestionBankCsvParseResult,
  subscribeToQuestionBank,
  addQuestionBankItem,
  batchAddQuestionBankItems,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  parseQuestionBankCsvText,
  revalidateQuestionBankRows,
  downloadQuestionBankCsvTemplate,
  saveMinistryQuestionBankBundle,
  saveMinistryQuestionBankToFirestore,
  deleteMinistryQuestionBankFromFirestore,
  updateMinistryQuestionBankInFirestore,
  updateMinistryBankDuration,
  toggleMinistryBankPublishStatus,
  normalizeCorrectAnswer,
  normalizeMinistryName,
  getMinistryComparisonKey,
  findMatchingMinistryName,
  saveCustomMinistryToRegistry,
  subscribeToCustomMinistries,
  COMMON_MINISTRIES,
  COMMON_SUBJECTS,
} from '../services/questionBankService';
import { toBengaliDigits, formatBengaliDateTimeSafe } from '../lib/dateUtils';
import { UserProfile, MinistryQuestionBank, MinistryBankQuestion } from '../types';
import QuestionBankPdfModal from './QuestionBankPdfModal';

interface AdminQuestionBankViewProps {
  currentUser?: UserProfile | null;
  ministryBanks?: MinistryQuestionBank[];
  onSaveMinistryBank?: (newBank: MinistryQuestionBank) => void;
  onDeleteMinistryBank?: (bankId: string) => void;
  setView?: (view: string) => void;
}

export const AdminQuestionBankView: React.FC<AdminQuestionBankViewProps> = ({
  currentUser,
  ministryBanks = [],
  onSaveMinistryBank,
  onDeleteMinistryBank,
  setView,
}) => {
  // Real-time questions from /QuestionBank
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tabs / Active View inside Question Bank: 'home_banks' | 'list' | 'manual_add'
  const [activeSubTab, setActiveSubTab] = useState<'home_banks' | 'list' | 'manual_add'>('home_banks');

  // Search & Filter state for /QuestionBank standalone list
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMinistry, setFilterMinistry] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  // Search & Filter state for Homepage Question Banks
  const [homeBanksSearch, setHomeBanksSearch] = useState<string>('');
  const [homeBanksMinistryFilter, setHomeBanksMinistryFilter] = useState<string>('all');
  const [customDurationInputs, setCustomDurationInputs] = useState<Record<string, number>>({});

  // Home Bank Edit Modal State
  const [editingBankModal, setEditingBankModal] = useState<MinistryQuestionBank | null>(null);
  const [editBankForm, setEditBankForm] = useState<{
    ministryName: string;
    title: string;
    examHeldDate: string;
    durationMinutes: number;
    isPublished: boolean;
  }>({
    ministryName: '',
    title: '',
    examHeldDate: '',
    durationMinutes: 10,
    isPublished: true,
  });
  const [isSavingBankEdit, setIsSavingBankEdit] = useState<boolean>(false);

  // Home Bank Delete Modal State
  const [bankToDelete, setBankToDelete] = useState<MinistryQuestionBank | null>(null);
  const [isDeletingBank, setIsDeletingBank] = useState<boolean>(false);

  // Home Bank Inspect Questions Modal State
  const [inspectingBank, setInspectingBank] = useState<MinistryQuestionBank | null>(null);

  // Question Bank PDF Download Modal State
  const [pdfBankToDownload, setPdfBankToDownload] = useState<MinistryQuestionBank | null>(null);

  // Pagination for Question List
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Manual Question Form State
  const [formMinistryChoice, setFormMinistryChoice] = useState<string>('');
  const [customMinistry, setCustomMinistry] = useState<string>('');
  const [formSubjectChoice, setFormSubjectChoice] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [questionText, setQuestionText] = useState<string>('');
  const [optionA, setOptionA] = useState<string>('');
  const [optionB, setOptionB] = useState<string>('');
  const [optionC, setOptionC] = useState<string>('');
  const [optionD, setOptionD] = useState<string>('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState<string>('');
  const [sourceExam, setSourceExam] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [examHeldDate, setExamHeldDate] = useState<string>(''); // পরিক্ষা অনুষ্টিত তারিখ
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [savingManual, setSavingManual] = useState<boolean>(false);

  // Editing existing question state (for modal)
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<QuestionBankItem>>({});
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Viewing question details modal
  const [viewingQuestion, setViewingQuestion] = useState<QuestionBankItem | null>(null);

  // Delete confirmation
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvParseResult, setCsvParseResult] = useState<QuestionBankCsvParseResult | null>(null);
  const [editingCsvRow, setEditingCsvRow] = useState<QuestionBankCsvRow | null>(null);
  const [csvEditFormData, setCsvEditFormData] = useState<Partial<QuestionBankCsvRow>>({});
  const [isImportingCsv, setIsImportingCsv] = useState<boolean>(false);
  const [csvImportProgress, setCsvImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);

  // 1. Subscribe to Firestore /QuestionBank
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToQuestionBank(
      (items) => {
        setQuestions(items);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load QuestionBank:', err);
        setErrorMsg('প্রশ্ন ব্যাংক লোড করতে সমস্যা হয়েছে।');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Persisted custom ministries registry (from Firestore siteSettings/customMinistries & localStorage)
  const [customSavedMinistries, setCustomSavedMinistries] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToCustomMinistries((list) => {
      setCustomSavedMinistries(list);
    });
    return () => unsub();
  }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Derived unique ministries, subjects, and years for filters
  const uniqueMinistries = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.ministry) set.add(q.ministry);
    });
    return Array.from(set).sort();
  }, [questions]);

  // Derived unique ministries for Home Banks filter
  const existingHomeBankMinistries = useMemo(() => {
    const map = new Map<string, string>();
    (ministryBanks || []).forEach((b) => {
      const clean = normalizeMinistryName(b.ministryName);
      const key = getMinistryComparisonKey(clean);
      if (clean && key && !map.has(key)) {
        map.set(key, clean);
      }
    });
    return Array.from(map.values()).sort();
  }, [ministryBanks]);

  // All active & previously saved ministries so once a ministry has questions added under it,
  // it permanently stays in the dropdown for adding subsequent question banks under the same ministry.
  const activeSavedMinistries = useMemo(() => {
    const map = new Map<string, string>();
    const addName = (raw?: string) => {
      const clean = normalizeMinistryName(raw || '');
      const key = getMinistryComparisonKey(clean);
      if (clean && key && !map.has(key)) {
        map.set(key, clean);
      }
    };
    (ministryBanks || []).forEach((b) => addName(b.ministryName));
    questions.forEach((q) => addName(q.ministry));
    customSavedMinistries.forEach((m) => addName(m));
    addName('ভূমি রেকর্ড ও জরিপ অদিদপ্তর');
    return Array.from(map.values());
  }, [ministryBanks, questions, customSavedMinistries]);

  const allMinistryDropdownOptions = useMemo(() => {
    const activeKeys = new Set(activeSavedMinistries.map((m) => getMinistryComparisonKey(m)));
    const remainingCommon = COMMON_MINISTRIES.filter(
      (m) => !activeKeys.has(getMinistryComparisonKey(m))
    );
    return {
      activeSaved: activeSavedMinistries,
      popularCommon: remainingCommon.slice(0, 10),
      otherCommon: remainingCommon.slice(10),
      allCombined: [...activeSavedMinistries, ...remainingCommon],
    };
  }, [activeSavedMinistries]);

  // Filtered Home Question Banks
  const filteredHomeBanks = useMemo(() => {
    return (ministryBanks || []).filter((bank) => {
      if (
        homeBanksMinistryFilter !== 'all' &&
        getMinistryComparisonKey(bank.ministryName) !== getMinistryComparisonKey(homeBanksMinistryFilter)
      ) {
        return false;
      }
      if (homeBanksSearch.trim()) {
        const query = homeBanksSearch.toLowerCase().trim();
        const matchTitle = (bank.title || '').toLowerCase().includes(query);
        const matchMin = (bank.ministryName || '').toLowerCase().includes(query);
        const matchDate = (bank.examHeldDate || '').toLowerCase().includes(query);
        if (!matchTitle && !matchMin && !matchDate) {
          return false;
        }
      }
      return true;
    });
  }, [ministryBanks, homeBanksSearch, homeBanksMinistryFilter]);

  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.subject) set.add(q.subject);
    });
    return Array.from(set).sort();
  }, [questions]);

  const uniqueYears = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.year) set.add(q.year);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [questions]);

  // Filtered Question List
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchQ = (q.question || '').toLowerCase().includes(query);
        const matchSrc = (q.source || '').toLowerCase().includes(query);
        const matchExpl = (q.explanation || '').toLowerCase().includes(query);
        const matchMin = (q.ministry || '').toLowerCase().includes(query);
        const matchSub = (q.subject || '').toLowerCase().includes(query);
        if (!matchQ && !matchSrc && !matchExpl && !matchMin && !matchSub) {
          return false;
        }
      }

      if (filterMinistry !== 'all' && q.ministry !== filterMinistry) {
        return false;
      }

      if (filterSubject !== 'all' && q.subject !== filterSubject) {
        return false;
      }

      if (filterYear !== 'all' && q.year !== filterYear) {
        return false;
      }

      return true;
    });
  }, [questions, searchQuery, filterMinistry, filterSubject, filterYear]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMinistry, filterSubject, filterYear]);

  // Quick Duration Adjustment Handler (+5, +10, +15, -5 min)
  const handleQuickAdjustDuration = async (bank: MinistryQuestionBank, deltaMinutes: number) => {
    const current = bank.durationMinutes || 10;
    const newDuration = Math.max(1, current + deltaMinutes);
    const updatedBank: MinistryQuestionBank = { ...bank, durationMinutes: newDuration };

    if (onSaveMinistryBank) {
      onSaveMinistryBank(updatedBank);
    }

    try {
      await updateMinistryBankDuration(bank.id, newDuration);
      setSuccessMsg(
        `✅ "${bank.title}"-এর পরীক্ষার সময় পরিবর্তন করে ${toBengaliDigits(newDuration)} মিনিট নির্ধারণ করা হয়েছে এবং ফায়ারস্টোরে সফলভাবে সংরক্ষিত হয়েছে।`
      );
    } catch (e: any) {
      console.error('Failed to update duration in Firestore:', e);
      setErrorMsg('পরীক্ষার সময় আপডেট করতে সমস্যা হয়েছে: ' + (e?.message || ''));
    }
  };

  // Direct Custom Duration Setter
  const handleSetCustomDuration = async (bank: MinistryQuestionBank) => {
    const customVal = customDurationInputs[bank.id];
    if (!customVal || customVal < 1 || isNaN(customVal)) return;

    const updatedBank: MinistryQuestionBank = { ...bank, durationMinutes: customVal };

    if (onSaveMinistryBank) {
      onSaveMinistryBank(updatedBank);
    }

    try {
      await updateMinistryBankDuration(bank.id, customVal);
      setSuccessMsg(
        `✅ "${bank.title}"-এর পরীক্ষার সময় ${toBengaliDigits(customVal)} মিনিট নির্ধারণ করা হয়েছে এবং ফায়ারস্টোরে সংরক্ষিত হয়েছে।`
      );
    } catch (e: any) {
      console.error('Failed to update duration in Firestore:', e);
      setErrorMsg('পরীক্ষার সময় আপডেট করতে সমস্যা হয়েছে: ' + (e?.message || ''));
    }
  };

  // Toggle Publish / Hide Status
  const handleTogglePublish = async (bank: MinistryQuestionBank) => {
    const newStatus = bank.isPublished === false ? true : false;
    const updatedBank: MinistryQuestionBank = { ...bank, isPublished: newStatus };

    if (onSaveMinistryBank) {
      onSaveMinistryBank(updatedBank);
    }

    try {
      await toggleMinistryBankPublishStatus(bank.id, newStatus);
      setSuccessMsg(
        newStatus
          ? `✅ "${bank.title}" হোম পেজে দৃশ্যমান করা হয়েছে।`
          : `👁️‍🗨️ "${bank.title}" হোম পেজ থেকে হাইড (অপ্রকাশিত) করা হয়েছে।`
      );
    } catch (e: any) {
      console.error('Failed to toggle publish status in Firestore:', e);
      setErrorMsg('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে: ' + (e?.message || ''));
    }
  };

  // Open Edit Bank Modal
  const handleOpenEditBankModal = (bank: MinistryQuestionBank) => {
    setEditingBankModal(bank);
    setEditBankForm({
      ministryName: bank.ministryName || '',
      title: bank.title || '',
      examHeldDate: bank.examHeldDate || '',
      durationMinutes: bank.durationMinutes || 10,
      isPublished: bank.isPublished !== false,
    });
  };

  // Save Edit Bank Modal
  const handleSaveBankEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankModal) return;
    if (!editBankForm.ministryName.trim() || !editBankForm.title.trim()) {
      setErrorMsg('মন্ত্রণালয়ের নাম এবং পরীক্ষার শিরোনাম ফাঁকা রাখা যাবে না।');
      return;
    }

    setIsSavingBankEdit(true);
    try {
      const dur = Math.max(1, Number(editBankForm.durationMinutes) || 10);
      const cleanMin = findMatchingMinistryName(
        editBankForm.ministryName,
        allMinistryDropdownOptions.allCombined
      );
      await saveCustomMinistryToRegistry(cleanMin);

      const updated: MinistryQuestionBank = {
        ...editingBankModal,
        ministryName: cleanMin,
        title: editBankForm.title.trim(),
        examHeldDate: editBankForm.examHeldDate.trim() || undefined,
        durationMinutes: dur,
        isPublished: editBankForm.isPublished,
      };

      await updateMinistryQuestionBankInFirestore(updated.id, {
        ministryName: updated.ministryName,
        title: updated.title,
        examHeldDate: updated.examHeldDate,
        durationMinutes: updated.durationMinutes,
        isPublished: updated.isPublished,
      });

      if (onSaveMinistryBank) {
        onSaveMinistryBank(updated);
      }

      setSuccessMsg(`✅ "${updated.title}" প্রশ্ন ব্যাংকের তথ্য ও সময় ফায়ারস্টোরে সফলভাবে সংরক্ষিত হয়েছে।`);
      setEditingBankModal(null);
    } catch (err: any) {
      console.error('Update bank error:', err);
      setErrorMsg('প্রশ্ন ব্যাংক আপডেট করতে সমস্যা হয়েছে: ' + (err?.message || ''));
    } finally {
      setIsSavingBankEdit(false);
    }
  };

  // Delete Ministry Bank completely from Firestore
  const handleConfirmDeleteBank = async () => {
    if (!bankToDelete) return;
    setIsDeletingBank(true);
    setErrorMsg(null);
    try {
      const bankId = bankToDelete.id;
      const bankTitle = bankToDelete.title;

      await deleteMinistryQuestionBankFromFirestore(bankId);

      if (onDeleteMinistryBank) {
        onDeleteMinistryBank(bankId);
      }

      setSuccessMsg(
        `✅ "${bankTitle}" প্রশ্ন ব্যাংকটি ফায়ারস্টোর ডাটাবেস এবং হোম পেজ থেকে স্থায়ীভাবে সম্পূর্ণ মুছে ফেলা হয়েছে।`
      );
      setBankToDelete(null);
    } catch (err: any) {
      console.error('Delete bank error:', err);
      setErrorMsg('প্রশ্ন ব্যাংক ডিলিট করতে সমস্যা হয়েছে: ' + (err?.message || ''));
    } finally {
      setIsDeletingBank(false);
    }
  };

  // Reset manual add form (keep selected ministry so admin can easily add more under the same ministry)
  const handleResetManualForm = (keepMinistry?: string) => {
    if (keepMinistry) {
      setFormMinistryChoice(keepMinistry);
      setCustomMinistry('');
    } else {
      setFormMinistryChoice('');
      setCustomMinistry('');
    }
    setFormSubjectChoice('');
    setCustomSubject('');
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('A');
    setExplanation('');
    setSourceExam('');
    setYear('');
    setExamHeldDate('');
    setDurationMinutes(10);
  };

  // Submit manual add question directly to /QuestionBank
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const rawMinistry =
      formMinistryChoice === '__CUSTOM__' || !formMinistryChoice
        ? customMinistry
        : formMinistryChoice;
    const ministry = findMatchingMinistryName(rawMinistry, allMinistryDropdownOptions.allCombined);
    const subject =
      (formSubjectChoice === '__CUSTOM__' || !formSubjectChoice
        ? customSubject.trim()
        : formSubjectChoice.trim()) ||
      ministry ||
      'সাধারণ বিষয়';

    if (!ministry) {
      setErrorMsg('দয়া করে মন্ত্রণালয় বা অধিদপ্তরের নাম লিখুন বা সিলেক্ট করুন।');
      return;
    }
    if (!questionText.trim()) {
      setErrorMsg('প্রশ্নের বিবরণ ফাঁকা রাখা যাবে না।');
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMsg('৪টি অপশনই (Option A, B, C, D) সঠিকভাবে পূরণ করতে হবে।');
      return;
    }

    try {
      setSavingManual(true);
      await saveCustomMinistryToRegistry(ministry);

      const newQuestion: NewQuestionBankItem = {
        ministry,
        subject,
        question: questionText.trim(),
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
        correctAnswer,
        correctAnswerLetter: correctAnswer,
        explanation: explanation.trim(),
        source: sourceExam.trim(),
        year: year.trim() || (examHeldDate ? examHeldDate.split('-')[0] : ''),
        questionType: 'MCQ',
        status: 'active',
        createdBy: currentUser?.email || 'admin',
      };

      await addQuestionBankItem(newQuestion);

      // If sourceExam or ministry is provided, also sync into MinistryQuestionBanks for Homepage
      const targetTitle = sourceExam.trim() || `${ministry} প্রশ্ন ব্যাংক`;
      const norm = normalizeCorrectAnswer(correctAnswer);
      const letter = norm.letter;
      const correctIdx = letter === 'A' ? 0 : letter === 'B' ? 1 : letter === 'C' ? 2 : 3;

      const qItem: MinistryBankQuestion = {
        id: `min-q-${Date.now()}`,
        text: questionText.trim(),
        options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
        correctAnswer: correctIdx,
        explanation: explanation.trim(),
        subject,
      };

      const existingBank = (ministryBanks || []).find(
        (b) =>
          getMinistryComparisonKey(b.ministryName) === getMinistryComparisonKey(ministry) &&
          normalizeMinistryName(b.title) === normalizeMinistryName(targetTitle)
      );

      let updatedBank: MinistryQuestionBank;
      if (existingBank) {
        const updatedQs = [...existingBank.questions, qItem];
        updatedBank = {
          ...existingBank,
          ministryName: existingBank.ministryName,
          totalQuestions: updatedQs.length,
          questions: updatedQs,
          durationMinutes: durationMinutes || existingBank.durationMinutes || 10,
          examHeldDate: examHeldDate.trim() || existingBank.examHeldDate,
        };
      } else {
        updatedBank = {
          id: `min-bank-${Date.now()}`,
          ministryName: ministry,
          title: targetTitle,
          examHeldDate: examHeldDate.trim() || undefined,
          durationMinutes: durationMinutes || 10,
          totalQuestions: 1,
          questions: [qItem],
          dateCreated: new Date().toLocaleDateString('bn-BD'),
          isPublished: true,
        };
      }

      if (onSaveMinistryBank) {
        onSaveMinistryBank(updatedBank);
      }
      await saveMinistryQuestionBankToFirestore(updatedBank);

      setSuccessMsg(
        `✅ "${ministry}" এর অধীনে প্রশ্নটি সফলভাবে সংরক্ষিত হয়েছে এবং এই মন্ত্রণালয়ের নাম ড্রপডাউনে স্থায়ীভাবে যুক্ত করা হয়েছে!`
      );
      handleResetManualForm(ministry);
      setActiveSubTab('list');
    } catch (err: any) {
      console.error('Failed to add question:', err);
      setErrorMsg(err.message || 'প্রশ্ন সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSavingManual(false);
    }
  };

  // Edit existing question in /QuestionBank
  const handleOpenEdit = (q: QuestionBankItem) => {
    setEditingQuestion(q);
    setEditForm({
      ministry: q.ministry,
      subject: q.subject,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      source: q.source || '',
      year: q.year || '',
      status: q.status || 'active',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    if (!editForm.ministry?.trim() || !editForm.subject?.trim() || !editForm.question?.trim()) {
      setErrorMsg('মন্ত্রণালয়, বিষয় এবং প্রশ্নের বিবরণ অবশ্যই পূরণ করতে হবে।');
      return;
    }
    if (!editForm.optionA?.trim() || !editForm.optionB?.trim() || !editForm.optionC?.trim() || !editForm.optionD?.trim()) {
      setErrorMsg('৪টি অপশনই পূরণ করতে হবে।');
      return;
    }

    try {
      setSavingEdit(true);
      const norm = normalizeCorrectAnswer(editForm.correctAnswer || 'A');

      await updateQuestionBankItem(editingQuestion.id, {
        ministry: editForm.ministry.trim(),
        subject: editForm.subject.trim(),
        question: editForm.question.trim(),
        optionA: editForm.optionA.trim(),
        optionB: editForm.optionB.trim(),
        optionC: editForm.optionC.trim(),
        optionD: editForm.optionD.trim(),
        correctAnswer: norm.letter,
        correctAnswerLetter: norm.letter,
        explanation: editForm.explanation?.trim() || '',
        source: editForm.source?.trim() || '',
        year: editForm.year?.trim() || '',
        status: editForm.status === 'draft' ? 'draft' : 'active',
      });

      setSuccessMsg('প্রশ্নটি সফলভাবে আপডেট করা হয়েছে!');
      setEditingQuestion(null);
    } catch (err: any) {
      console.error('Failed to update question:', err);
      setErrorMsg('প্রশ্ন আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete question from /QuestionBank
  const handleDeleteQuestion = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteQuestionBankItem(id);
      setSuccessMsg('প্রশ্নটি সফলভাবে /QuestionBank কালেকশন থেকে মুছে ফেলা হয়েছে।');
      setDeletingQuestionId(null);
    } catch (err: any) {
      console.error('Failed to delete question:', err);
      setErrorMsg('প্রশ্ন মুছতে সমস্যা হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV File Handler
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvUploadError(null);
    setErrorMsg(null);

    const targetMinistry = (
      formMinistryChoice === '__CUSTOM__' || !formMinistryChoice ? customMinistry.trim() : formMinistryChoice.trim()
    );
    const targetSubject = (
      formSubjectChoice === '__CUSTOM__' || !formSubjectChoice ? customSubject.trim() : formSubjectChoice.trim()
    );

    if (!targetMinistry) {
      setCsvUploadError('অনুগ্রহ করে প্রথমে উপরের ফর্ম থেকে মন্ত্রণালয় / অধিদপ্তর নির্বাচন বা টাইপ করুন।');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const defaults = {
      ministry: targetMinistry,
      subject: targetSubject || targetMinistry,
      sourceExam: sourceExam.trim() || `${targetMinistry} প্রশ্ন ব্যাংক`,
      examHeldDate: examHeldDate.trim(),
      year: year.trim(),
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseQuestionBankCsvText(text, questions, defaults);
        setCsvParseResult(result);
        if (result.fileErrors.length > 0) {
          setCsvUploadError(result.fileErrors.join(' | '));
        }
      } catch (err: any) {
        console.error('CSV parse error:', err);
        setCsvUploadError('CSV ফাইল প্রসেস করতে ত্রুটি হয়েছে। নিশ্চিত করুন ফাইলটি বৈধ UTF-8 টেক্সট।');
      }
    };
    reader.onerror = () => {
      setCsvUploadError('ফাইলটি পড়া সম্ভব হয়নি।');
    };
    reader.readAsText(file, 'utf-8');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete a row from CSV preview
  const handleDeleteCsvRow = (rowId: string) => {
    if (!csvParseResult) return;
    const remaining = csvParseResult.rows.filter((r) => r.id !== rowId);
    const reval = revalidateQuestionBankRows(remaining, questions);
    setCsvParseResult({
      ...csvParseResult,
      rows: reval.rows,
      totalCount: reval.rows.length,
      validCount: reval.validCount,
      invalidCount: reval.invalidCount,
    });
    if (editingCsvRow?.id === rowId) {
      setEditingCsvRow(null);
    }
  };

  // Open CSV row edit modal
  const handleOpenEditCsvRow = (row: QuestionBankCsvRow) => {
    setEditingCsvRow(row);
    setCsvEditFormData({ ...row });
  };

  // Save edited CSV row
  const handleSaveCsvRowEdit = () => {
    if (!editingCsvRow || !csvParseResult) return;

    const updatedRows = csvParseResult.rows.map((r) => {
      if (r.id === editingCsvRow.id) {
        const norm = normalizeCorrectAnswer(csvEditFormData.correctAnswerRaw || 'A');
        return {
          ...r,
          ...csvEditFormData,
          correctAnswerRaw: csvEditFormData.correctAnswerRaw || 'A',
          correctAnswerLetter: norm.letter,
          correctAnswerBengali: norm.bengaliLetter,
        } as QuestionBankCsvRow;
      }
      return r;
    });

    const reval = revalidateQuestionBankRows(updatedRows, questions);
    setCsvParseResult({
      ...csvParseResult,
      rows: reval.rows,
      totalCount: reval.rows.length,
      validCount: reval.validCount,
      invalidCount: reval.invalidCount,
    });

    setEditingCsvRow(null);
  };

  // Import all valid rows to /QuestionBank and /ministryQuestionBanks (immediately visible on Homepage)
  const handleImportAllCsvRows = async () => {
    if (!csvParseResult || csvParseResult.invalidCount > 0 || csvParseResult.rows.length === 0) {
      return;
    }

    const rawMinistry =
      (formMinistryChoice === '__CUSTOM__' || !formMinistryChoice
        ? customMinistry.trim()
        : formMinistryChoice.trim()) ||
      csvParseResult.rows[0]?.ministry ||
      'সাধারণ মন্ত্রণালয়';
    const ministry = findMatchingMinistryName(rawMinistry, allMinistryDropdownOptions.allCombined);

    const targetTitle = sourceExam.trim() || csvParseResult.rows[0]?.source || `${ministry} প্রশ্ন ব্যাংক`;
    const targetSubject = (formSubjectChoice === '__CUSTOM__' || !formSubjectChoice ? customSubject.trim() : formSubjectChoice.trim()) || ministry;
    const targetDate = examHeldDate.trim() || csvParseResult.rows[0]?.examHeldDate || undefined;
    const targetYear = year.trim() || csvParseResult.rows[0]?.year || undefined;

    try {
      setIsImportingCsv(true);
      setCsvImportProgress({ current: 0, total: csvParseResult.rows.length });
      await saveCustomMinistryToRegistry(ministry);
      setFormMinistryChoice(ministry);
      setCustomMinistry('');

      const { bankId, count } = await saveMinistryQuestionBankBundle(
        {
          ministryName: ministry,
          title: targetTitle,
          examHeldDate: targetDate,
          subject: targetSubject,
          year: targetYear,
          durationMinutes: durationMinutes || 10,
        },
        csvParseResult.rows.map((r) => ({
          question: r.question,
          optionA: r.optionA,
          optionB: r.optionB,
          optionC: r.optionC,
          optionD: r.optionD,
          correctAnswerRaw: r.correctAnswerRaw,
          explanation: r.explanation,
        })),
        currentUser?.email || 'admin',
        (completed, total) => {
          setCsvImportProgress({ current: completed, total });
        }
      );

      // Trigger callback to update App.tsx ministryBanks state immediately
      if (onSaveMinistryBank) {
        const formattedQuestions: MinistryBankQuestion[] = csvParseResult.rows.map((r, idx) => {
          const norm = normalizeCorrectAnswer(r.correctAnswerRaw);
          const letter = norm.letter;
          const correctIdx = letter === 'A' ? 0 : letter === 'B' ? 1 : letter === 'C' ? 2 : 3;
          return {
            id: `min-q-${Date.now()}-${idx + 1}`,
            text: r.question.trim(),
            options: [r.optionA.trim(), r.optionB.trim(), r.optionC.trim(), r.optionD.trim()],
            correctAnswer: correctIdx,
            explanation: (r.explanation || '').trim(),
            subject: targetSubject,
          };
        });

        onSaveMinistryBank({
          id: bankId,
          ministryName: ministry,
          title: targetTitle,
          examHeldDate: targetDate,
          durationMinutes: durationMinutes || 10,
          totalQuestions: formattedQuestions.length,
          questions: formattedQuestions,
          dateCreated: new Date().toLocaleDateString('bn-BD'),
          isPublished: true,
        });
      }

      setSuccessMsg(
        `অভিনন্দন! মোট ${toBengaliDigits(count)} টি প্রশ্ন সরাসরি ফায়ারস্টোরে আপলোড হয়েছে এবং হোম পেজে “মন্ত্রণালয় ও দপ্তরভিত্তিক প্রশ্ন ব্যাংকসমূহ”-এ সাথে সাথে দৃশ্যমান হয়েছে!`
      );
      setCsvParseResult(null);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg('ইম্পোর্ট চলাকালীন কোনো ত্রুটি ঘটেছে: ' + err.message);
    } finally {
      setIsImportingCsv(false);
      setCsvImportProgress(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Standalone QuestionBank Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5">
          {/* Top Row: Title, Badges & Quick Home Link */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>ডেডিকেটেড প্রশ্ন ব্যাংক</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Firestore: /QuestionBank</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  <span>সম্পূর্ণ স্বতন্ত্র (No Exam Interference)</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                কোশ্চেন ব্যাংক ম্যানেজমেন্ট সিস্টেম
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                মন্ত্রণালয়, অধিদপ্তর ও সরকারি নিয়োগ পরীক্ষার প্রশ্নাবলী আলাদাভাবে সংগ্রহ, ম্যানুয়াল এন্ট্রি ও CSV ইম্পোর্ট করুন। এখানে সংরক্ষিত প্রশ্ন অন্যান্য পরীক্ষার ডেটাকে পরিবর্তন করবে না।
              </p>
            </div>

            {setView && (
              <button
                type="button"
                onClick={() => setView('home')}
                className="self-start shrink-0 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                title="হোম পেজে প্রকাশিত প্রশ্ন ব্যাংকসমূহ দেখুন"
              >
                <span>🏠 হোম পেজ দেখুন</span>
              </button>
            )}
          </div>

          {/* Bottom Row: Uniform Responsive Navigation Bar */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setActiveSubTab('home_banks')}
              className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'home_banks'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                  : 'bg-white/10 hover:bg-white/15 text-amber-200 border border-amber-400/30'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">হোম পেজ প্রশ্ন ব্যাংক ({toBengaliDigits(ministryBanks.length)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('manual_add')}
              className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'manual_add'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-primary/40'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">প্রশ্ন ব্যাংক তৈরি ও ইনপুট</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('list')}
              className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'list'
                  ? 'bg-white text-slate-900 shadow-lg ring-2 ring-white/50'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span className="truncate">প্রশ্ন তালিকা ({toBengaliDigits(questions.length)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            {setView && (
              <button
                type="button"
                onClick={() => setView('home')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>🏠 হোম পেজে দেখুন</span>
              </button>
            )}
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOP DASHBOARD METRICS SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">মোট প্রশ্ন</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {toBengaliDigits(questions.length)}
            </span>
            <span className="text-xs text-slate-400">টি প্রশ্ন</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সরাসরি /QuestionBank এ সংরক্ষিত</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">মন্ত্রণালয় / অধিদপ্তর</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {toBengaliDigits(uniqueMinistries.length)}
            </span>
            <span className="text-xs text-slate-400">টি প্রতিষ্ঠান</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">স্বতন্ত্র ফিল্টারিং ও বিভাগ</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">বিষয় / টপিক</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {toBengaliDigits(uniqueSubjects.length)}
            </span>
            <span className="text-xs text-slate-400">টি বিষয়</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">বাংলা, ইংরেজি, গণিত, GK ইত্যাদি</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">সক্রিয় প্রশ্ন</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {toBengaliDigits(questions.filter((q) => q.status === 'active').length)}
            </span>
            <span className="text-xs text-emerald-600 font-bold">প্রস্তুত</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">শিক্ষার্থীদের জন্য উন্মুক্ত</p>
        </div>
      </div>

      {/* SUB-VIEW 0: HOMEPAGE QUESTION BANKS MANAGEMENT & CONTROL */}
      {activeSubTab === 'home_banks' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          {/* Header & Intro */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700 gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <Building2 className="h-4 w-4" />
                <span>হোম পেজ প্রশ্ন ব্যাংক নিয়ন্ত্রণ কেন্দ্র</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>হোম পেজের প্রশ্ন ব্যাংকসমূহ পরিচালনা</span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {toBengaliDigits(ministryBanks.length)} টি প্রশ্ন ব্যাংক
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
                হোম পেজের <strong className="text-slate-800 dark:text-slate-200">“মন্ত্রণালয় ও দপ্তরভিত্তিক প্রশ্ন ব্যাংকসমূহ”</strong> সেকশনের সকল প্রশ্ন ব্যাংক এখান থেকে নিয়ন্ত্রণ করুন। প্রতিটি পরীক্ষার সময় (মিনিট) বাড়ানো/কমানো, তথ্য এডিট, প্রকাশ বা হাইড এবং প্রয়োজনে সম্পূর্ণ প্রশ্ন ব্যাংক ফায়ারস্টোর ডাটাবেস সহ স্থায়ীভাবে মুছে ফেলুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveSubTab('manual_add')}
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-xl shadow-md shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>➕ নতুন প্রশ্ন ব্যাংক তৈরি</span>
              </button>

              {setView && (
                <button
                  type="button"
                  onClick={() => setView('home')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🏠 হোম পেজ দেখুন</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-emerald-50 to-indigo-50 dark:from-amber-950/30 dark:via-slate-900/60 dark:to-indigo-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-extrabold text-slate-900 dark:text-white">
                💡 পরীক্ষার সময় (Time Duration) নিয়ন্ত্রণ নির্দেশনা:
              </p>
              <p className="leading-relaxed">
                নিচের প্রতিটি প্রশ্ন ব্যাংকের কার্ডে থাকা <span className="font-bold text-amber-700 dark:text-amber-300">[-৫ মি.]</span>, <span className="font-bold text-emerald-700 dark:text-emerald-300">[+৫ মি.]</span>, <span className="font-bold text-emerald-700 dark:text-emerald-300">[+১০ মি.]</span> বাটনে ক্লিক করে অথবা কাস্টম মিনিট লিখে এক ক্লিকে সময় বাড়াতে বা কমাতে পারেন। নির্ধারিত সময় সরাসরি ফায়ারস্টোরে আপডেট হয়ে হোম পেজ এবং মূল পরীক্ষার টাইমার-এ কার্যকর হবে।
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={homeBanksSearch}
                onChange={(e) => setHomeBanksSearch(e.target.value)}
                placeholder="প্রশ্ন ব্যাংকের শিরোনাম, মন্ত্রণালয় বা অনুষ্ঠিত তারিখ দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
              {homeBanksSearch && (
                <button
                  type="button"
                  onClick={() => setHomeBanksSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={homeBanksMinistryFilter}
                onChange={(e) => setHomeBanksMinistryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="all">সকল মন্ত্রণালয় ({ministryBanks.length})</option>
                {existingHomeBankMinistries.map((m) => (
                  <option key={m} value={m}>
                    {m} ({(ministryBanks || []).filter((b) => b.ministryName === m).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredHomeBanks.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 space-y-4">
              <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto animate-pulse" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-200">
                  কোনো প্রশ্ন ব্যাংক পাওয়া যায়নি
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {homeBanksSearch || homeBanksMinistryFilter !== 'all'
                    ? 'আপনার ফিল্টারের সাথে মিলে এমন কোনো প্রশ্ন ব্যাংক নেই। ফিল্টার রিসেট করুন।'
                    : 'নতুন প্রশ্ন ব্যাংক তৈরি করতে বা CSV দিয়ে যুক্ত করতে নিচের বাটনে ক্লিক করুন।'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHomeBanksSearch('');
                  setHomeBanksMinistryFilter('all');
                  setActiveSubTab('manual_add');
                }}
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                ➕ নতুন প্রশ্ন ব্যাংক যুক্ত করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredHomeBanks.map((bank) => {
                const qCount = bank.questions?.length || bank.totalQuestions || 0;
                const isPub = bank.isPublished !== false;
                const currentDuration = bank.durationMinutes || 10;
                const customVal = customDurationInputs[bank.id];

                return (
                  <div
                    key={bank.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-amber-400/50 transition-all flex flex-col justify-between space-y-5 relative"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-extrabold">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{bank.ministryName}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {isPub ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-extrabold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>হোম পেজে সক্রিয়</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold">
                              <EyeOff className="h-3 w-3" />
                              <span>অপ্রকাশিত (হাইড)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                        {bank.title}
                      </h4>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                          <span>{toBengaliDigits(qCount)} টি প্রশ্ন</span>
                        </span>

                        {bank.examHeldDate && (
                          <span className="inline-flex items-center gap-1 text-primary dark:text-emerald-400 font-bold">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>অনুষ্ঠিত: {bank.examHeldDate}</span>
                          </span>
                        )}

                        {bank.dateCreated && (
                          <span className="text-[11px] text-slate-400">
                            তৈরি: {bank.dateCreated}
                          </span>
                        )}
                      </div>

                      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                      {/* DEDICATED EXAM DURATION CONTROL BOX FOR THIS BANK */}
                      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 dark:from-amber-950/30 dark:via-slate-900 dark:to-emerald-950/30 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <Clock className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 dark:text-white block">
                                পরীক্ষার সময় নিয়ন্ত্রণ
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                হোম পেজ ও পরীক্ষার কাউন্টডাউন
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xs">
                              <span>⏱️ {toBengaliDigits(currentDuration)} মিনিট</span>
                            </span>
                          </div>
                        </div>

                        {/* Quick Adjust Buttons */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <span>দ্রুত সময় বাড়ান / কমান:</span>
                            <span className="text-[10px] text-slate-400">তাত্ক্ষণিক ফায়ারস্টোরে সেভ হয়</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            <button
                              type="button"
                              disabled={currentDuration <= 5}
                              onClick={() => handleQuickAdjustDuration(bank, -5)}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              title="৫ মিনিট কমান"
                            >
                              <Minus className="h-3 w-3" />
                              <span>৫ মি.</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(bank, 5)}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                              title="৫ মিনিট বাড়ান"
                            >
                              <Plus className="h-3 w-3" />
                              <span>৫ মি.</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(bank, 10)}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                              title="১০ মিনিট বাড়ান"
                            >
                              <Plus className="h-3 w-3" />
                              <span>১০ মি.</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(bank, 15)}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                              title="১৫ মিনিট বাড়ান"
                            >
                              <Plus className="h-3 w-3" />
                              <span>১৫ মি.</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAdjustDuration(bank, 20)}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                              title="২০ মিনিট বাড়ান"
                            >
                              <Plus className="h-3 w-3" />
                              <span>২০ মি.</span>
                            </button>
                          </div>
                        </div>

                        {/* Custom Minute Direct Input */}
                        <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                            নির্দিষ্ট মিনিট:
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            placeholder="যেমন: ২৫"
                            value={customVal ?? ''}
                            onChange={(e) =>
                              setCustomDurationInputs((prev) => ({
                                ...prev,
                                [bank.id]: parseInt(e.target.value, 10),
                              }))
                            }
                            className="w-24 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetCustomDuration(bank)}
                            disabled={!customVal || customVal < 1 || isNaN(customVal)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            সেভ করুন
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card Actions Row */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBankModal(bank)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="প্রশ্ন ব্যাংকের তথ্য ও সময় সম্পাদন করুন"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>এডিট</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const canonicalMin = findMatchingMinistryName(
                              bank.ministryName,
                              allMinistryDropdownOptions.allCombined
                            );
                            setFormMinistryChoice(canonicalMin);
                            setCustomMinistry('');
                            setSourceExam('');
                            setActiveSubTab('manual_add');
                            setTimeout(() => {
                              document.getElementById('ministry-bank-form-header')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-teal-300 font-extrabold text-xs rounded-xl border border-primary/30 transition-all flex items-center gap-1 cursor-pointer"
                          title={`"${bank.ministryName}" এর অধীনে নতুন আরেকটি প্রশ্ন ব্যাংক যুক্ত করুন`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>এই মন্ত্রণালয়ে নতুন প্রশ্ন ব্যাংক</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectingBank(bank)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                          title="এই ব্যাংকের সকল প্রশ্ন দেখুন"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>প্রশ্ন দেখুন ({toBengaliDigits(qCount)})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfBankToDownload(bank)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-xl border border-emerald-300 dark:border-emerald-800 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                          title="প্রশ্ন ব্যাংক PDF ডাউনলোড"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(bank)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                            isPub
                              ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                          title={isPub ? 'হোম পেজ থেকে হাইড করুন' : 'হোম পেজে প্রকাশ করুন'}
                        >
                          {isPub ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{isPub ? 'হাইড করুন' : 'প্রকাশ করুন'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBankToDelete(bank)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
                        title="ফায়ারস্টোর ডাটাবেস ও হোম পেজ থেকে সম্পূর্ণ ডিলিট করুন"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>ফায়ারস্টোর থেকে ডিলিট</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 1: MANUAL ADD QUESTION FORM */}
      {activeSubTab === 'manual_add' && (
        <div
          id="ministry-bank-form-header"
          className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                <Plus className="h-4 w-4" />
                <span>ম্যানুয়াল প্রশ্ন ইনপুট ও CSV ইম্পোর্ট সিস্টেম</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                মন্ত্রণালয়ভিত্তিক প্রশ্ন ব্যাংক ও প্রশ্ন যুক্তকরণ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                মন্ত্রণালয়, শিরোনাম ও পরীক্ষার তারিখ লিখে CSV ফাইল আপলোড করুন অথবা সরাসরি একটি একটি করে প্রশ্ন ম্যানুয়ালি লিখুন।
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={downloadQuestionBankCsvTemplate}
                className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5"
                title="৭ কলামের CSV টেমপ্লেট ডাউনলোড করুন"
              >
                <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>📥 CSV Template ডাউনলোড</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="CSV ফাইল নির্বাচন করুন"
              >
                <Upload className="h-4 w-4" />
                <span>📤 CSV দিয়ে প্রশ্ন Import</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleManualAddSubmit} className="space-y-6">
            {/* Step 1: Ministry Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>মন্ত্রণালয় / অধিদপ্তর <span className="text-rose-500">*</span></span>
                </span>
                <span className="text-[10px] text-primary font-semibold">ড্রপডাউন বা কাস্টম</span>
              </label>
              <select
                value={formMinistryChoice}
                onChange={(e) => {
                  setFormMinistryChoice(e.target.value);
                  if (e.target.value !== '__CUSTOM__') {
                    setCustomMinistry('');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">-- মন্ত্রণালয় / অধিদপ্তর তালিকা থেকে বাছুন --</option>
                {allMinistryDropdownOptions.activeSaved.length > 0 && (
                  <optgroup label="📌 পূর্বে যুক্ত ও সক্রিয় মন্ত্রণালয় / অধিদপ্তরসমূহ">
                    {allMinistryDropdownOptions.activeSaved.map((m, idx) => (
                      <option key={`saved_min_${idx}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="জনপ্রিয় মন্ত্রণালয় ও অধিদপ্তর">
                  {allMinistryDropdownOptions.popularCommon.map((m, idx) => (
                    <option key={`m_${idx}`} value={m}>{m}</option>
                  ))}
                </optgroup>
                <optgroup label="অন্যান্য মন্ত্রণালয় ও অধিদপ্তর">
                  {allMinistryDropdownOptions.otherCommon.map((m, idx) => (
                    <option key={`m2_${idx}`} value={m}>{m}</option>
                  ))}
                </optgroup>
                <option value="__CUSTOM__">➕ নতুন মন্ত্রণালয় / অধিদপ্তরের নাম লিখুন...</option>
              </select>

              {(!formMinistryChoice || formMinistryChoice === '__CUSTOM__') && (
                <div className="pt-1.5 animate-fadeIn space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="মন্ত্রণালয় বা অধিদপ্তরের পূর্ণ নাম টাইপ করুন (যেমন: ভূমি রেকর্ড ও জরিপ অদিদপ্তর)"
                    value={customMinistry}
                    onChange={(e) => setCustomMinistry(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    💡 একবার নতুন মন্ত্রণালয়ের নাম লিখে প্রশ্ন যুক্ত করলে সেটি স্বয়ংক্রিয়ভাবে উপরের ড্রপডাউন তালিকায় সংরক্ষিত থাকবে, যাতে পরবর্তীতে একই মন্ত্রণালয়ের অধীনে নতুন প্রশ্ন ব্যাংক যুক্ত করা যায়।
                  </p>
                </div>
              )}
            </div>

            {/* Optional Source, Year, Exam Date, and Exam Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  উৎস / পরীক্ষার নাম (Optional)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: সহকারী পরিচালক নিয়োগ পরীক্ষা"
                  value={sourceExam}
                  onChange={(e) => setSourceExam(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  সাল / Year (Optional)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ২০২৪ বা ২০২৩"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Exam Held Date Input (পরিক্ষা অনুষ্টিত তারিখ) */}
              <div className="space-y-1.5">
                <label htmlFor="mbExamHeldDate" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>পরিক্ষা অনুষ্টিত তারিখ</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">তারিখ নির্বাচন</span>
                </label>
                <input
                  type="date"
                  id="mbExamHeldDate"
                  name="পরিক্ষা অনুষ্টিত তারিখ"
                  value={examHeldDate}
                  onChange={(e) => setExamHeldDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none font-medium cursor-pointer"
                  title="পরিক্ষা অনুষ্টিত তারিখ নির্বাচন করুন"
                />
              </div>

              {/* NEW: Exam Duration Setting Input (পরিক্ষার সময় - মিনিট) */}
              <div className="space-y-1.5">
                <label htmlFor="mbDurationMinutes" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>পরিক্ষার সময় (মিনিট) *</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{toBengaliDigits(durationMinutes)} মিনিট</span>
                </label>
                <input
                  type="number"
                  id="mbDurationMinutes"
                  name="পরিক্ষার সময়"
                  min="1"
                  max="300"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 10))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  title="প্রশ্ন ব্যাংক পরীক্ষার মোট সময় মিনিট হিসেবে নির্ধারণ করুন"
                  placeholder="১০"
                />
              </div>
            </div>

            {/* Quick Duration Preset Pills */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>পরিক্ষার সময় দ্রুত নির্ধারণ:</span>
              </span>
              {[5, 10, 15, 20, 25, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    durationMinutes === mins
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {toBengaliDigits(mins)} মিনিট
                </button>
              ))}
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {/* CSV IMPORT & TEMPLATE SECTION INSIDE MANUAL INPUT SYSTEM */}
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="bg-gradient-to-br from-emerald-50/70 via-slate-50/50 to-indigo-50/60 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-slate-800/70 border-2 border-dashed border-emerald-500/40 dark:border-emerald-600/40 rounded-3xl p-5 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-200/50 dark:border-slate-700">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 mb-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>CSV দিয়ে বাল্ক প্রশ্ন Import</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>নির্দিষ্ট মন্ত্রণালয় ও শিরোনামের জন্য CSV আপলোড</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    উপরে দেওয়া মন্ত্রণালয়/দপ্তর, শিরোনাম এবং পরীক্ষার তারিখের অধীনে CSV ফাইলের প্রশ্নগুলো স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে। CSV ফাইলে শুধু থাকবে: <strong className="text-slate-800 dark:text-slate-200">প্রশ্ন, অপশন ক, খ, গ, ঘ, সঠিক উত্তর ও ব্যাখ্যা</strong>।
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={downloadQuestionBankCsvTemplate}
                    className="px-3.5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="৭ কলামের অফিসিয়াল CSV টেমপ্লেট ডাউনলোড করুন"
                  >
                    <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>📥 CSV Template ডাউনলোড</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    title="CSV ফাইল নির্বাচন করুন"
                  >
                    <Upload className="h-4 w-4" />
                    <span>📤 CSV দিয়ে প্রশ্ন Import</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Context Header Tag */}
              <div className="flex flex-wrap items-center gap-2 text-xs bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <span className="font-bold text-slate-500 dark:text-slate-400">অ্যাসাইনমেন্ট শিরোনাম:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-200 dark:border-indigo-800">
                  🏢 {formMinistryChoice === '__CUSTOM__' || !formMinistryChoice ? customMinistry || 'মন্ত্রণালয় নির্বাচন করুন' : formMinistryChoice}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600">
                  📝 {sourceExam.trim() || 'পরীক্ষার শিরোনাম লিখুন'}
                </span>
                {examHeldDate && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    📅 {examHeldDate}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>সময়: {toBengaliDigits(durationMinutes)} মিনিট</span>
                </span>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                id="qb-csv-upload-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />

              {/* Upload Dropzone */}
              {!csvParseResult && (
                <div>
                  <label
                    htmlFor="qb-csv-upload-input"
                    className="group relative border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/60 dark:bg-slate-900/40 rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                      CSV ফাইল আপলোড করতে এখানে ক্লিক করুন বা ফাইলটি টেনে এনে ছেড়ে দিন
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-lg">
                      প্রয়োজনীয় কলাম: Question, Option A, Option B, Option C, Option D, Correct Answer, Explanation
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 font-semibold shadow-xs">
                      <span>✓ UTF-8 এনকোডিং ও বাংলা টেক্সট সম্পূর্ণ সাপোর্ট</span>
                    </div>
                  </label>
                </div>
              )}

              {/* Upload Error Alert */}
              {csvUploadError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{csvUploadError}</span>
                </div>
              )}

              {/* CSV PREVIEW TABLE & DIRECT FIRESTORE UPLOAD */}
              {csvParseResult && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 animate-fadeIn">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <h5 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        <span>CSV প্রিভিউ ও তাৎক্ষণিক যাচাই (Preview & Validation)</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        সবগুলো রো ভ্যালিড থাকলে নিচের বাটনে ক্লিক করে এক ক্লিকে ফায়ারস্টোরে আপলোড ও হোম পেজে দৃশ্যমান করুন।
                      </p>
                    </div>

                    {/* Stats badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                        মোট: {toBengaliDigits(csvParseResult.totalCount)} টি
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>বৈধ: {toBengaliDigits(csvParseResult.validCount)}</span>
                      </div>
                      {csvParseResult.invalidCount > 0 && (
                        <div className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-1 border border-rose-200 dark:border-rose-800 animate-pulse">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>ত্রুটিপূর্ণ: {toBengaliDigits(csvParseResult.invalidCount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invalid Rows Warning */}
                  {csvParseResult.invalidCount > 0 && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">
                          সাবধান: {toBengaliDigits(csvParseResult.invalidCount)} টি প্রশ্নে ত্রুটি পাওয়া গেছে!
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          টেবিলের ডানে থাকা &apos;✏️ এডিট&apos; বাটনে ক্লিক করে সঠিক উত্তর (A/B/C/D বা ক/খ/গ/ঘ) ঠিক করুন অথবা &apos;🗑️ ডিলিট&apos; দিয়ে রো বাদ দিন। সব রো সঠিক হলেই ফায়ারস্টোরে আপলোড সম্ভব হবে।
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isImportingCsv && csvImportProgress && (
                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>ফায়ারস্টোরে আপলোড ও হোম পেজে সিঙ্ক হচ্ছে...</span>
                        </span>
                        <span>
                          {toBengaliDigits(csvImportProgress.current)} / {toBengaliDigits(csvImportProgress.total)}
                        </span>
                      </div>
                      <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${(csvImportProgress.current / csvImportProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto max-h-[380px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5 w-12 text-center">ক্রম</th>
                            <th className="p-2.5 min-w-[200px]">প্রশ্ন বিবরণ</th>
                            <th className="p-2.5 w-24">অপশন ক</th>
                            <th className="p-2.5 w-24">অপশন খ</th>
                            <th className="p-2.5 w-24">অপশন গ</th>
                            <th className="p-2.5 w-24">অপশন ঘ</th>
                            <th className="p-2.5 w-20 text-center">সঠিক উত্তর</th>
                            <th className="p-2.5 w-32">ব্যাখ্যা</th>
                            <th className="p-2.5 w-24 text-center">স্ট্যাটাস</th>
                            <th className="p-2.5 w-20 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/80">
                          {csvParseResult.rows.map((row) => (
                            <tr
                              key={row.id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors ${
                                !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                              }`}
                            >
                              <td className="p-2.5 text-center font-bold text-slate-500">
                                {toBengaliDigits(row.serial)}
                              </td>
                              <td className="p-2.5 font-medium text-slate-900 dark:text-white leading-relaxed">
                                {row.question || <span className="text-rose-500 italic">ফাঁকা</span>}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.optionA || <span className="text-rose-500 italic">-</span>}</td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.optionB || <span className="text-rose-500 italic">-</span>}</td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.optionC || <span className="text-rose-500 italic">-</span>}</td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.optionD || <span className="text-rose-500 italic">-</span>}</td>
                              <td className="p-2.5 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs">
                                  {row.correctAnswerBengali}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={row.explanation}>
                                {row.explanation || '-'}
                              </td>
                              <td className="p-2.5 text-center">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <Check className="h-3 w-3" />
                                    <span>সঠিক</span>
                                  </span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800" title={row.errors.join('\n')}>
                                      <AlertCircle className="h-3 w-3" />
                                      <span>ত্রুটি</span>
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCsvRow(row)}
                                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                                    title="রো এডিট করুন"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCsvRow(row.id)}
                                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                    title="রো মুছে ফেলুন"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action buttons below Preview */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCsvParseResult(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all self-start cursor-pointer"
                    >
                      প্রিভিউ বাতিল করুন
                    </button>

                    <div className="flex items-center gap-3">
                      {csvParseResult.invalidCount > 0 ? (
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                          ⚠️ ত্রুটিগুলো ঠিক করে এরপর ইম্পোর্ট করুন
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>সবগুলো প্রশ্ন সম্পূর্ণ প্রস্তুত</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleImportAllCsvRows}
                        disabled={isImportingCsv || csvParseResult.invalidCount > 0 || csvParseResult.rows.length === 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isImportingCsv ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>আপলোড হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span>🚀 ফায়ারস্টোরে আপলোড করুন ও হোম পেজে প্রকাশ করুন ({toBengaliDigits(csvParseResult.validCount)} টি প্রশ্ন)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {/* MANUAL SINGLE QUESTION INPUT SECTION                   */}
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-800 px-4 py-1 text-slate-500 dark:text-slate-400 font-extrabold rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                  অথবা ম্যানুয়ালি একটি একটি করে প্রশ্ন লিখুন
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>প্রশ্নের বিবরণ (Question Text) <span className="text-rose-500">*</span></span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="এখানে প্রশ্নটি লিখুন... (যেমন: মুজিবনগর সরকারের শপথ বাক্য কে পাঠ করান?)"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed font-medium"
              />
            </div>

            {/* Options A, B, C, D */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>৪টি অপশন (Option A, B, C, D) ও সঠিক উত্তর নির্বাচন <span className="text-rose-500">*</span></span>
                <span className="text-[11px] text-slate-400">সঠিক উত্তরের পাশের রেডিও বাটনে ক্লিক করুন</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A */}
                <div
                  onClick={() => setCorrectAnswer('A')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    correctAnswer === 'A'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    correctAnswer === 'A' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    ক
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Option A (ক) এর উত্তর"
                      value={optionA}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setOptionA(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                  {correctAnswer === 'A' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                </div>

                {/* Option B */}
                <div
                  onClick={() => setCorrectAnswer('B')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    correctAnswer === 'B'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    correctAnswer === 'B' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    খ
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Option B (খ) এর উত্তর"
                      value={optionB}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setOptionB(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                  {correctAnswer === 'B' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                </div>

                {/* Option C */}
                <div
                  onClick={() => setCorrectAnswer('C')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    correctAnswer === 'C'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    correctAnswer === 'C' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    গ
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Option C (গ) এর উত্তর"
                      value={optionC}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setOptionC(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                  {correctAnswer === 'C' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                </div>

                {/* Option D */}
                <div
                  onClick={() => setCorrectAnswer('D')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    correctAnswer === 'D'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    correctAnswer === 'D' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    ঘ
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Option D (ঘ) এর উত্তর"
                      value={optionD}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setOptionD(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                  {correctAnswer === 'D' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                </div>
              </div>
            </div>

            {/* Explanation (Optional) */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>বিশদ ব্যাখ্যা / Explanation (ঐচ্ছিক)</span>
                <span className="text-[10px] text-slate-400">পরীক্ষার্থীদের সুবিধার্থে সংক্ষিপ্ত বা পূর্ণ ব্যাখ্যা</span>
              </label>
              <textarea
                rows={2}
                placeholder="সঠিক উত্তরের প্রেক্ষাপট বা ব্যাখ্যা লিখুন (ঐচ্ছিক)..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
              />
            </div>

            {/* Submit Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetManualForm}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                ফর্ম রিসেট করুন
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('list')}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                >
                  তালিকায় ফিরে যান
                </button>

                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-xl text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingManual ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>প্রশ্ন সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 3: QUESTION BANK DASHBOARD & LIST */}
      {activeSubTab === 'list' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>প্রশ্ন ব্যাংক আর্কাইভ (/QuestionBank)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                মন্ত্রণালয় ও বিষয়ভিত্তিক সংরক্ষিত সকল প্রশ্নের তালিকা, অনুসন্ধান ও ব্যবস্থাপনা
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('manual_add')}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন প্রশ্ন ও CSV ইম্পোর্ট</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="প্রশ্ন, উৎস বা ব্যাখ্যা সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Ministry Filter */}
            <div>
              <select
                value={filterMinistry}
                onChange={(e) => setFilterMinistry(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">🏢 সকল মন্ত্রণালয় / অধিদপ্তর ({uniqueMinistries.length})</option>
                {uniqueMinistries.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">📚 সকল বিষয় ({uniqueSubjects.length})</option>
                {uniqueSubjects.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">📅 সকল সাল</option>
                {uniqueYears.map((y, idx) => (
                  <option key={idx} value={y}>{y}</option>
                ))}
              </select>

              {(searchQuery || filterMinistry !== 'all' || filterSubject !== 'all' || filterYear !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterMinistry('all');
                    setFilterSubject('all');
                    setFilterYear('all');
                  }}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shrink-0 transition-colors"
                  title="ফিল্টার ক্লিয়ার করুন"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Question List Cards / Table */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-bold">প্রশ্ন ব্যাংক লোড হচ্ছে...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 space-y-3">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {questions.length === 0
                  ? 'QuestionBank-এ বর্তমানে কোনো প্রশ্ন সংরক্ষিত নেই।'
                  : 'প্রদত্ত ফিল্টারের সাথে কোনো প্রশ্ন মেলেনি।'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ম্যানুয়াল ফর্ম দিয়ে প্রশ্ন যোগ করুন অথবা CSV ফাইল দিয়ে এক ক্লিকে শত শত প্রশ্ন ইম্পোর্ট করুন।
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('manual_add')}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>প্রশ্ন যোগ ও CSV ইম্পোর্ট</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <span>
                  মোট {toBengaliDigits(filteredQuestions.length)} টি প্রশ্ন পাওয়া গেছে (পৃষ্ঠা {toBengaliDigits(currentPage)} / {toBengaliDigits(totalPages)})
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {paginatedQuestions.map((q, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const norm = normalizeCorrectAnswer(q.correctAnswer);

                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group space-y-3"
                    >
                      {/* Top Badges & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center">
                            {toBengaliDigits(globalIdx)}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{q.ministry}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                            {q.subject}
                          </span>
                          {q.source && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {q.source} {q.year ? `(${q.year})` : ''}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingQuestion(q)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                            title="এডিট করুন"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingQuestionId(q.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                        {q.question}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
                        {[
                          { label: 'ক', letter: 'A', text: q.optionA },
                          { label: 'খ', letter: 'B', text: q.optionB },
                          { label: 'গ', letter: 'C', text: q.optionC },
                          { label: 'ঘ', letter: 'D', text: q.optionD },
                        ].map((opt) => {
                          const isCorrect = norm.letter === opt.letter;
                          return (
                            <div
                              key={opt.letter}
                              className={`p-2 rounded-xl flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {opt.label}
                              </span>
                              <span className="break-words flex-1">{opt.text}</span>
                              {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation if present */}
                      {q.explanation && (
                        <div className="p-2.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-800 dark:text-slate-200">ব্যাখ্যা: </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>পূর্ববর্তী</span>
                  </button>

                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    পৃষ্ঠা {toBengaliDigits(currentPage)} / {toBengaliDigits(totalPages)}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    <span>পরবর্তী</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW FULL QUESTION DETAILS */}
      {viewingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  প্রশ্নের বিস্তারিত বিবরণ
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingQuestion(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                  🏢 {viewingQuestion.ministry}
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/60">
                  📚 {viewingQuestion.subject}
                </span>
                {viewingQuestion.source && (
                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    উৎস: {viewingQuestion.source} {viewingQuestion.year ? `(${viewingQuestion.year})` : ''}
                  </span>
                )}
                <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  স্ট্যাটাস: {viewingQuestion.status}
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-1 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">প্রশ্ন:</span>
                <p className="text-sm font-black text-slate-900 dark:text-white leading-relaxed">
                  {viewingQuestion.question}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400">অপশনসমূহ:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { label: 'ক', letter: 'A', text: viewingQuestion.optionA },
                    { label: 'খ', letter: 'B', text: viewingQuestion.optionB },
                    { label: 'গ', letter: 'C', text: viewingQuestion.optionC },
                    { label: 'ঘ', letter: 'D', text: viewingQuestion.optionD },
                  ].map((opt) => {
                    const norm = normalizeCorrectAnswer(viewingQuestion.correctAnswer);
                    const isCorrect = norm.letter === opt.letter;
                    return (
                      <div
                        key={opt.letter}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                        {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewingQuestion.explanation && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">বিশদ ব্যাখ্যা:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {viewingQuestion.explanation}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 space-y-1">
                <div>Firestore Document ID: <code className="text-primary font-mono">{viewingQuestion.id}</code></div>
                <div>কালেকশন: <code className="font-mono text-emerald-600">/QuestionBank/{viewingQuestion.id}</code></div>
                <div>তৈরির তারিখ: {formatBengaliDateTimeSafe(viewingQuestion.createdAt)}</div>
                {viewingQuestion.createdBy && <div>তৈরি করেছেন: {viewingQuestion.createdBy}</div>}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingQuestion(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-300"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT QUESTION MODAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  প্রশ্ন সম্পাদনা (/QuestionBank)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">মন্ত্রণালয় / অধিদপ্তর</label>
                  <input
                    type="text"
                    value={editForm.ministry || ''}
                    onChange={(e) => setEditForm({ ...editForm, ministry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">বিষয় / টপিক</label>
                  <input
                    type="text"
                    value={editForm.subject || ''}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">প্রশ্নের বিবরণ</label>
                <textarea
                  rows={3}
                  value={editForm.question || ''}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option A (ক)</label>
                  <input
                    type="text"
                    value={editForm.optionA || ''}
                    onChange={(e) => setEditForm({ ...editForm, optionA: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option B (খ)</label>
                  <input
                    type="text"
                    value={editForm.optionB || ''}
                    onChange={(e) => setEditForm({ ...editForm, optionB: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option C (গ)</label>
                  <input
                    type="text"
                    value={editForm.optionC || ''}
                    onChange={(e) => setEditForm({ ...editForm, optionC: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option D (ঘ)</label>
                  <input
                    type="text"
                    value={editForm.optionD || ''}
                    onChange={(e) => setEditForm({ ...editForm, optionD: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Correct Answer Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">সঠিক উত্তর নির্বাচন</label>
                <div className="flex gap-2">
                  {[
                    { label: 'Option A (ক)', val: 'A' },
                    { label: 'Option B (খ)', val: 'B' },
                    { label: 'Option C (গ)', val: 'C' },
                    { label: 'Option D (ঘ)', val: 'D' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, correctAnswer: btn.val })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        normalizeCorrectAnswer(editForm.correctAnswer).letter === btn.val
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">ব্যাখ্যা (Optional)</label>
                <textarea
                  rows={2}
                  value={editForm.explanation || ''}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">উৎস / পরীক্ষার নাম</label>
                  <input
                    type="text"
                    value={editForm.source || ''}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">সাল / Year</label>
                  <input
                    type="text"
                    value={editForm.year || ''}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-6 py-2 bg-primary text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>আপডেট সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT CSV PREVIEW ROW MODAL */}
      {editingCsvRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                CSV রো #{toBengaliDigits(editingCsvRow.serial)} সম্পাদনা ও ত্রুটি সংশোধন
              </h4>
              <button
                type="button"
                onClick={() => setEditingCsvRow(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">মন্ত্রণালয় / দপ্তর</label>
                  <input
                    type="text"
                    value={csvEditFormData.ministry || ''}
                    onChange={(e) => setCsvEditFormData({ ...csvEditFormData, ministry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">বিষয় / টপিক</label>
                  <input
                    type="text"
                    value={csvEditFormData.subject || ''}
                    onChange={(e) => setCsvEditFormData({ ...csvEditFormData, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">প্রশ্ন বিবরণ</label>
                <textarea
                  rows={2}
                  value={csvEditFormData.question || ''}
                  onChange={(e) => setCsvEditFormData({ ...csvEditFormData, question: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option A</label>
                  <input
                    type="text"
                    value={csvEditFormData.optionA || ''}
                    onChange={(e) => setCsvEditFormData({ ...csvEditFormData, optionA: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option B</label>
                  <input
                    type="text"
                    value={csvEditFormData.optionB || ''}
                    onChange={(e) => setCsvEditFormData({ ...csvEditFormData, optionB: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option C</label>
                  <input
                    type="text"
                    value={csvEditFormData.optionC || ''}
                    onChange={(e) => setCsvEditFormData({ ...csvEditFormData, optionC: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Option D</label>
                  <input
                    type="text"
                    value={csvEditFormData.optionD || ''}
                    onChange={(e) => setCsvEditFormData({ ...csvEditFormData, optionD: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">সঠিক উত্তর (A / B / C / D অথবা ক / খ / গ / ঘ)</label>
                <input
                  type="text"
                  placeholder="A অথবা ক"
                  value={csvEditFormData.correctAnswerRaw || ''}
                  onChange={(e) => setCsvEditFormData({ ...csvEditFormData, correctAnswerRaw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">ব্যাখ্যা</label>
                <textarea
                  rows={2}
                  value={csvEditFormData.explanation || ''}
                  onChange={(e) => setCsvEditFormData({ ...csvEditFormData, explanation: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingCsvRow(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveCsvRowEdit}
                className="px-5 py-2 bg-primary text-white font-extrabold rounded-xl text-xs"
              >
                যাচাই ও আপডেট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION MODAL */}
      {deletingQuestionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                আপনি কি প্রশ্নটি ডিলিট করতে চান?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                এই প্রশ্নটি সরাসরি /QuestionBank কালেকশন থেকে স্থায়ীভাবে মুছে যাবে। অন্যান্য পরীক্ষার ডেটা সম্পূর্ণ অপরিবর্তিত থাকবে।
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingQuestionId(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors"
              >
                না, রাখুন
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteQuestion(deletingQuestionId)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>হ্যাঁ, ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT HOMEPAGE MINISTRY QUESTION BANK MODAL */}
      {editingBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    প্রশ্ন ব্যাংক সম্পাদন (Edit Question Bank)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    মন্ত্রণালয়ের নাম, পরীক্ষার শিরোনাম ও পরীক্ষার সময় আপডেট করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBankModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  মন্ত্রণালয় / অধিদপ্তর *
                </label>
                <input
                  type="text"
                  required
                  list="edit-ministry-datalist"
                  value={editBankForm.ministryName}
                  onChange={(e) => setEditBankForm({ ...editBankForm, ministryName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="যেমন: ভূমি রেকর্ড ও জরিপ অদিদপ্তর"
                />
                <datalist id="edit-ministry-datalist">
                  {allMinistryDropdownOptions.allCombined.map((m, i) => (
                    <option key={`dl_min_${i}`} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  পরীক্ষার শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={editBankForm.title}
                  onChange={(e) => setEditBankForm({ ...editBankForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="যেমন: সহকারী পরিচালক নিয়োগ প্রশ্ন ব্যাংক"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>অনুষ্ঠিত হওয়ার তারিখ</span>
                  </label>
                  <input
                    type="date"
                    value={editBankForm.examHeldDate}
                    onChange={(e) => setEditBankForm({ ...editBankForm, examHeldDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Exam Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>পরীক্ষার সময় (মিনিট) *</span>
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      {toBengaliDigits(editBankForm.durationMinutes)} মিনিট
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    required
                    value={editBankForm.durationMinutes}
                    onChange={(e) =>
                      setEditBankForm({
                        ...editBankForm,
                        durationMinutes: Math.max(1, parseInt(e.target.value, 10) || 10),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quick Duration Pills in Edit Modal */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                  দ্রুত সময় নির্বাচন:
                </span>
                {[5, 10, 15, 20, 25, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEditBankForm({ ...editBankForm, durationMinutes: mins })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      editBankForm.durationMinutes === mins
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {toBengaliDigits(mins)} মি.
                  </button>
                ))}
              </div>

              {/* Publish Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editBankForm.isPublished}
                    onChange={(e) => setEditBankForm({ ...editBankForm, isPublished: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                      হোম পেজে দৃশ্যমান (Published)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      চেক করা থাকলে হোম পেজের “মন্ত্রণালয় ও দপ্তরভিত্তিক প্রশ্ন ব্যাংকসমূহ” তালিকায় প্রদর্শিত হবে
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBankModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingBankEdit}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {isSavingBankEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>পরিবর্তন সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DELETE HOMEPAGE MINISTRY QUESTION BANK MODAL */}
      {bankToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="h-7 w-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                ফায়ারস্টোর ডাটাবেস থেকে সম্পূর্ণ মুছে ফেলবেন?
              </h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                ⚠️ এই কাজটি আর পূর্বাবস্থায় ফিরিয়ে আনা যাবে না!
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">মন্ত্রণালয়:</span>
                <span className="font-extrabold text-slate-800 dark:text-white">{bankToDelete.ministryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">শিরোনাম:</span>
                <span className="font-extrabold text-slate-800 dark:text-white text-right max-w-[200px] truncate">{bankToDelete.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">মোট প্রশ্ন:</span>
                <span className="font-extrabold text-slate-800 dark:text-white">{toBengaliDigits(bankToDelete.questions?.length || bankToDelete.totalQuestions || 0)} টি</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">বর্তমান সময়:</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">{toBengaliDigits(bankToDelete.durationMinutes || 10)} মিনিট</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              এই প্রশ্ন ব্যাংকটি ফায়ারস্টোর ডাটাবেসের <code className="text-rose-600 dark:text-rose-400 font-mono">/ministryQuestionBanks/{bankToDelete.id}</code> ডকুমেন্ট এবং হোম পেজ থেকে চিরতরে মুছে ফেলা হবে।
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingBank}
                onClick={() => setBankToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={isDeletingBank}
                onClick={handleConfirmDeleteBank}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {isDeletingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>হ্যাঁ, ডিলিট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: VIEW MINISTRY QUESTION BANK QUESTIONS */}
      {inspectingBank && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  🏢 {inspectingBank.ministryName}
                </span>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {inspectingBank.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>মোট প্রশ্ন: {toBengaliDigits(inspectingBank.questions?.length || 0)} টি</span>
                  <span>•</span>
                  <span>পরীক্ষার সময়: {toBengaliDigits(inspectingBank.durationMinutes || 10)} মিনিট</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPdfBankToDownload(inspectingBank)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="এই প্রশ্ন ব্যাংকটি PDF আকারে ডাউনলোড করুন"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>PDF ডাউনলোড</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingBank(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {!inspectingBank.questions || inspectingBank.questions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">এই প্রশ্ন ব্যাংকে কোনো প্রশ্ন পাওয়া যায়নি।</div>
              ) : (
                inspectingBank.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-black text-primary px-2 py-0.5 rounded-md bg-primary/10">
                        #{toBengaliDigits(idx + 1)}
                      </span>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex-1">
                        {q.text}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswer === optIdx;
                        const letter = optIdx === 0 ? 'ক' : optIdx === 1 ? 'খ' : optIdx === 2 ? 'গ' : 'ঘ';
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-extrabold shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {letter}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <strong className="text-amber-700 dark:text-amber-300">ব্যাখ্যা:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                মোট {toBengaliDigits(inspectingBank.questions?.length || 0)} টি প্রশ্ন প্রদর্শিত
              </span>
              <button
                type="button"
                onClick={() => setInspectingBank(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: QUESTION BANK PDF DOWNLOAD MODAL */}
      <QuestionBankPdfModal
        bank={pdfBankToDownload}
        isOpen={!!pdfBankToDownload}
        onClose={() => setPdfBankToDownload(null)}
      />
    </div>
  );
};
