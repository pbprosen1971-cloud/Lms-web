/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
  Sparkles,
  RefreshCw,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Database,
  Tag,
  ArrowRight,
  Layers,
  GraduationCap,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Exam, Question, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { updateQuestionInFirestore } from '../services/firestoreService';
import { detectQuestionSubject } from '../lib/subjectClassifier';
import { toBengaliDigits } from '../lib/dateUtils';

export interface QuestionItemWithMeta extends Question {
  examId: string;
  examTitle: string;
  examStatus: string;
  examSubject?: string;
  originalIndex?: number;
}

interface QuestionManagementViewProps {
  exams: Exam[];
  onUpdateExam?: (updatedExam: Exam) => void;
  onRefreshExams?: () => void;
  currentUser?: UserProfile | null;
}

export const HOME_SUBJECT_OPTIONS = [
  'বাংলা',
  'বাংলা ব্যাকরণ',
  'ইংরেজি',
  'গণিত',
  'বাংলাদেশ বিষয়াবলি -GK',
  'আন্তর্জাতিক সাধারন জ্ঞান',
  'ICT',
  'বিজ্ঞান',
  'নৈতিকতা মূল্যবোধ ও সুশাসন',
  'ভূগোল',
];

export const CATEGORY_OPTIONS = [
  'BCS',
  'Bank',
  '11th - 20th Grade Job',
  'NTRCA - নিবন্ধন',
  'Primary',
  'স্পেশাল মডেল টেস্ট',
  'সাধারণ জ্ঞান',
];

export const QuestionManagementView: React.FC<QuestionManagementViewProps> = ({
  exams,
  onUpdateExam,
  onRefreshExams,
  currentUser,
}) => {
  // Direct firestore loaded questions (to complement exams state)
  const [directDbQuestions, setDirectDbQuestions] = useState<QuestionItemWithMeta[]>([]);
  const [loadingFirestore, setLoadingFirestore] = useState<boolean>(false);
  const [firestoreLoaded, setFirestoreLoaded] = useState<boolean>(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_attention' | 'synced'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Edit Modal State
  const [editingQuestion, setEditingQuestion] = useState<QuestionItemWithMeta | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [editText, setEditText] = useState<string>('');
  const [editOpt1, setEditOpt1] = useState<string>('');
  const [editOpt2, setEditOpt2] = useState<string>('');
  const [editOpt3, setEditOpt3] = useState<string>('');
  const [editOpt4, setEditOpt4] = useState<string>('');
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<number>(0);
  const [editExplanation, setEditExplanation] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('');
  const [autoDetectNotice, setAutoDetectNotice] = useState<string>('');

  // Extract all questions from the current exams prop
  const examExtractedQuestions = useMemo((): QuestionItemWithMeta[] => {
    const list: QuestionItemWithMeta[] = [];
    exams.forEach((exam) => {
      if (Array.isArray(exam.questions) && exam.questions.length > 0) {
        exam.questions.forEach((q, idx) => {
          list.push({
            ...q,
            examId: exam.id,
            examTitle: exam.title,
            examStatus: exam.status,
            examSubject: exam.subject,
            originalIndex: idx + 1,
            subject: q.subject || exam.subject || '',
            category: q.category || exam.subject || '',
          });
        });
      }
    });
    return list;
  }, [exams]);

  // Combine examExtractedQuestions with directDbQuestions (deduplicating by unique key)
  const allQuestions = useMemo((): QuestionItemWithMeta[] => {
    const map = new Map<string, QuestionItemWithMeta>();

    // 1. Add questions extracted from exams
    examExtractedQuestions.forEach((q) => {
      const key = `${q.examId}_${q.id}`;
      map.set(key, q);
    });

    // 2. Merge direct db questions (if loaded)
    directDbQuestions.forEach((q) => {
      const key = `${q.examId}_${q.id}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          ...q,
          subject: q.subject || existing.subject,
          category: q.category || existing.category,
        });
      } else {
        map.set(key, q);
      }
    });

    return Array.from(map.values());
  }, [examExtractedQuestions, directDbQuestions]);

  // Load fresh questions directly from all exams' Firestore subcollections
  const handleLoadDirectFromFirestore = async () => {
    setLoadingFirestore(true);
    setSaveErrorMsg('');
    try {
      const aggregated: QuestionItemWithMeta[] = [];

      for (const exam of exams) {
        try {
          const subQCol = collection(db, 'Exam', exam.id, 'questions');
          const snap = await getDocs(subQCol);
          snap.forEach((d) => {
            const data = d.data();
            const qId = d.id;
            const qText = data.questionText || data.question || data.text || '';
            const opts = data.options || [data.optionA, data.optionB, data.optionC, data.optionD].filter(Boolean);
            
            let cAns = 0;
            if (typeof data.correctAnswer === 'number') {
              cAns = data.correctAnswer;
            } else if (typeof data.correctAnswer === 'string') {
              const letter = data.correctAnswer.trim().toUpperCase();
              if (letter === 'B' || letter === '2') cAns = 1;
              else if (letter === 'C' || letter === '3') cAns = 2;
              else if (letter === 'D' || letter === '4') cAns = 3;
            }

            aggregated.push({
              id: qId,
              text: qText,
              options: opts.length === 4 ? opts : [data.optionA || '', data.optionB || '', data.optionC || '', data.optionD || ''],
              correctAnswer: cAns,
              explanation: data.explanation || '',
              questionNumber: data.questionNumber || 1,
              subject: (data.subject || '').trim(),
              category: (data.category || exam.subject || '').trim(),
              examId: exam.id,
              examTitle: exam.title,
              examStatus: exam.status,
              examSubject: exam.subject,
            });
          });
        } catch (e) {
          console.warn(`Subcollection read error for exam ${exam.id}:`, e);
        }
      }

      setDirectDbQuestions(aggregated);
      setFirestoreLoaded(true);
    } catch (err: any) {
      console.error('Failed to load questions from Firestore:', err);
    } finally {
      setLoadingFirestore(false);
    }
  };

  // Helper to determine whether a question's subject/category is properly synced with home page
  const getQuestionHealth = (q: QuestionItemWithMeta) => {
    const sub = (q.subject || '').trim();
    if (!sub) return { status: 'missing', label: 'বিষয় ফাঁকা (অনুপস্থিত)' };
    if (sub === 'BCS' || sub === 'বিসিএস' || sub === 'Model Test') {
      return { status: 'generic', label: 'জেনারেল ট্যাগ (নির্দিষ্ট বিষয় নয়)' };
    }
    if (sub === 'GK' || sub === 'সাধারণ জ্ঞান') {
      return { status: 'generic_gk', label: 'জেনারেল GK (হোম পেজ ফিল্টারে অস্পষ্ট)' };
    }
    if (HOME_SUBJECT_OPTIONS.includes(sub)) {
      return { status: 'synced', label: 'হোম পেজে সিঙ্কড' };
    }
    return { status: 'custom', label: 'কাস্টম বিষয়' };
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let totalQuestionsCount = allQuestions.length;
    let missingSubjectCount = 0;
    let genericCount = 0;
    let syncedCount = 0;

    const subjectCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    allQuestions.forEach((q) => {
      const health = getQuestionHealth(q);
      if (health.status === 'missing') missingSubjectCount++;
      else if (health.status === 'generic' || health.status === 'generic_gk') genericCount++;
      else syncedCount++;

      const sub = q.subject || 'অনুপস্থিত';
      subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;

      const cat = q.category || q.examSubject || 'সাধারণ';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return {
      total: totalQuestionsCount,
      missingSubjectCount,
      genericCount,
      syncedCount,
      needsAttentionCount: missingSubjectCount + genericCount,
      subjectCounts,
      categoryCounts,
    };
  }, [allQuestions]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      // 1. Exam Filter
      if (selectedExamId !== 'all' && q.examId !== selectedExamId) {
        return false;
      }

      // 2. Subject Filter
      if (selectedSubject !== 'all') {
        if (selectedSubject === 'missing') {
          if (q.subject && q.subject.trim()) return false;
        } else if (q.subject !== selectedSubject) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== 'all') {
        const cat = q.category || q.examSubject;
        if (cat !== selectedCategory) {
          return false;
        }
      }

      // 4. Status Filter
      if (statusFilter === 'needs_attention') {
        const health = getQuestionHealth(q);
        if (health.status === 'synced') return false;
      } else if (statusFilter === 'synced') {
        const health = getQuestionHealth(q);
        if (health.status !== 'synced') return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const qLower = searchQuery.toLowerCase().trim();
        const inText = q.text.toLowerCase().includes(qLower);
        const inExam = q.examTitle.toLowerCase().includes(qLower);
        const inSub = (q.subject || '').toLowerCase().includes(qLower);
        const inCat = (q.category || '').toLowerCase().includes(qLower);
        const inOptions = Array.isArray(q.options) && q.options.some((opt) => opt.toLowerCase().includes(qLower));
        const inExplanation = (q.explanation || '').toLowerCase().includes(qLower);
        const inNumber = String(q.questionNumber || '').includes(qLower);

        if (!inText && !inExam && !inSub && !inCat && !inOptions && !inExplanation && !inNumber) {
          return false;
        }
      }

      return true;
    });
  }, [allQuestions, selectedExamId, selectedSubject, selectedCategory, statusFilter, searchQuery]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExamId, selectedSubject, selectedCategory, statusFilter, searchQuery, pageSize]);

  // Paginated Questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;

  // Open Edit Modal
  const handleOpenEditModal = (q: QuestionItemWithMeta) => {
    setEditingQuestion(q);
    setEditText(q.text || '');
    setEditOpt1(q.options?.[0] || '');
    setEditOpt2(q.options?.[1] || '');
    setEditOpt3(q.options?.[2] || '');
    setEditOpt4(q.options?.[3] || '');
    setEditCorrectAnswer(typeof q.correctAnswer === 'number' ? q.correctAnswer : 0);
    setEditExplanation(q.explanation || '');

    const currentSub = (q.subject || '').trim();
    if (HOME_SUBJECT_OPTIONS.includes(currentSub)) {
      setEditSubject(currentSub);
      setCustomSubject('');
    } else if (currentSub) {
      setEditSubject('custom');
      setCustomSubject(currentSub);
    } else {
      // If missing, run automatic detection to provide an immediate smart default
      const detected = detectQuestionSubject(q.text, q.options, q.explanation);
      setEditSubject(detected);
      setCustomSubject('');
      setAutoDetectNotice(`স্বয়ংক্রিয়ভাবে সনাক্তকৃত বিষয়: "${detected}"`);
    }

    const currentCat = (q.category || q.examSubject || '').trim();
    if (CATEGORY_OPTIONS.includes(currentCat)) {
      setEditCategory(currentCat);
      setCustomCategory('');
    } else if (currentCat) {
      setEditCategory('custom');
      setCustomCategory(currentCat);
    } else {
      setEditCategory('BCS');
      setCustomCategory('');
    }

    setSaveSuccessMsg('');
    setSaveErrorMsg('');
  };

  // Close Edit Modal
  const handleCloseEditModal = () => {
    if (isSaving) return;
    setEditingQuestion(null);
    setAutoDetectNotice('');
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
  };

  // Run AI Auto-detect subject on the currently edited question
  const handleAutoDetectSubject = () => {
    const detected = detectQuestionSubject(
      editText,
      [editOpt1, editOpt2, editOpt3, editOpt4].filter(Boolean),
      editExplanation
    );
    if (HOME_SUBJECT_OPTIONS.includes(detected)) {
      setEditSubject(detected);
      setCustomSubject('');
    } else {
      setEditSubject('custom');
      setCustomSubject(detected);
    }
    setAutoDetectNotice(`প্রশ্নটি বিশ্লেষণ করে প্রস্তাবিত বিষয়: "${detected}" নির্বাচন করা হয়েছে।`);
    setTimeout(() => setAutoDetectNotice(''), 5000);
  };

  // Submit and save updated question directly to Firestore
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const resolvedSubject = editSubject === 'custom' ? customSubject.trim() : editSubject.trim();
    const resolvedCategory = editCategory === 'custom' ? customCategory.trim() : editCategory.trim();

    if (!resolvedSubject) {
      setSaveErrorMsg('অনুগ্রহ করে প্রশ্নের বিষয় (Subject) নির্বাচন করুন বা লিখুন।');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const optionsArray = [editOpt1.trim(), editOpt2.trim(), editOpt3.trim(), editOpt4.trim()];

      // 1. Update Firestore & Sync Parent Exam
      const result = await updateQuestionInFirestore(
        editingQuestion.examId,
        editingQuestion.id,
        {
          subject: resolvedSubject,
          category: resolvedCategory,
          text: editText.trim(),
          options: optionsArray,
          correctAnswer: editCorrectAnswer,
          explanation: editExplanation.trim(),
          questionNumber: editingQuestion.questionNumber,
        },
        exams
      );

      // 2. Propagate to parent React application state (HomeView & Exam views)
      if (result.updatedExam && onUpdateExam) {
        onUpdateExam(result.updatedExam);
      }

      // 3. Update directDbQuestions state if cached
      setDirectDbQuestions((prev) =>
        prev.map((q) => {
          if (q.id === editingQuestion.id && q.examId === editingQuestion.examId) {
            return {
              ...q,
              subject: resolvedSubject,
              category: resolvedCategory,
              text: editText.trim(),
              options: optionsArray,
              correctAnswer: editCorrectAnswer,
              explanation: editExplanation.trim(),
            };
          }
          return q;
        })
      );

      setSaveSuccessMsg(
        `✅ সফল হয়েছে! প্রশ্নটির বিষয় "${resolvedSubject}" ও ক্যাটাগরি "${resolvedCategory}" ফায়ারস্টোরে আপডেট করা হয়েছে এবং হোম পেজে সিঙ্ক করা হয়েছে!`
      );

      if (onRefreshExams) {
        onRefreshExams();
      }

      // Close modal after brief feedback
      setTimeout(() => {
        handleCloseEditModal();
      }, 1400);
    } catch (err: any) {
      console.error('Error saving question update:', err);
      setSaveErrorMsg('সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Helper color map for subjects
  const getSubjectBadgeStyle = (subjectName: string) => {
    switch (subjectName) {
      case 'বাংলা':
      case 'বাংলা ব্যাকরণ':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'ইংরেজি':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'গণিত':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'বাংলাদেশ বিষয়াবলি -GK':
      case 'বাংলাদেশ বিষয়াবলী':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'আন্তর্জাতিক সাধারন জ্ঞান':
      case 'আন্তর্জাতিক বিষয়াবলি':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'ICT':
        return 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'বিজ্ঞান':
        return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'নৈতিকতা মূল্যবোধ ও সুশাসন':
        return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'ভূগোল':
        return 'bg-lime-50 dark:bg-lime-950/40 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/30 border border-primary/40 text-primary-light flex items-center gap-1">
                <Database className="h-3 w-3" /> ফায়ারস্টোর ডেটাবেজ ম্যানেজমেন্ট
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300">
                মোট প্রশ্ন: {toBengaliDigits(allQuestions.length)} টি
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>প্রশ্ন ও বিষয় ক্যাটাগরি ব্যবস্থাপনা (Question Management)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              ডেটাবেজে সংরক্ষিত সকল পরীক্ষার প্রশ্নের বিষয় (Subject) ও ক্যাটাগরি (Category) পর্যালোচনা করুন, যেকোনো ভুল বিষয় সরাসরি এডিট করে সংশোধন করুন এবং হোম পেজে ইনস্ট্যান্ট সিঙ্ক নিশ্চিত করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadDirectFromFirestore}
              disabled={loadingFirestore}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              title="ফায়ারস্টোর সাব-কালেকশন থেকে সরাসরি প্রশ্ন রিফ্রেশ করুন"
            >
              <RefreshCw className={`h-4 w-4 ${loadingFirestore ? 'animate-spin text-primary-light' : ''}`} />
              <span>{loadingFirestore ? 'লোড হচ্ছে...' : 'ফায়ারস্টোর থেকে রিফ্রেশ'}</span>
            </button>
          </div>
        </div>

        {/* Quick Diagnostic Notice Banner if any questions need attention */}
        {metrics.needsAttentionCount > 0 && (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-400/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>মনোযোগ প্রয়োজন:</strong> {toBengaliDigits(metrics.needsAttentionCount)} টি প্রশ্নের বিষয় ক্যাটাগরি হোম পেজের নির্দিষ্ট বিষয়ের সাথে পুরোপুরি সিঙ্কড নেই। ফিল্টার করে এখনই ঠিক করুন।
              </span>
            </div>
            <button
              onClick={() => setStatusFilter('needs_attention')}
              className="px-2.5 py-1 bg-amber-400 text-slate-900 font-bold rounded-lg text-[11px] hover:bg-amber-300 transition-colors shrink-0"
            >
              শুধুমাত্র এগুলো দেখুন
            </button>
          </div>
        )}
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>মোট প্রশ্ন</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {toBengaliDigits(metrics.total)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {toBengaliDigits(exams.length)} টি পরীক্ষা থেকে
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span>সিঙ্কড বিষয়</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {toBengaliDigits(metrics.syncedCount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            হোম পেজে যথাযথ প্রদর্শিত
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-bold">
            <span>মনোযোগ আবশ্যক</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {toBengaliDigits(metrics.needsAttentionCount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            বিষয়হীন বা সাধারণ ট্যাগ
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-bold">
            <span>ফিল্টার ফলাফল</span>
            <Filter className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">
            {toBengaliDigits(filteredQuestions.length)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            বর্তমান ফিল্টারে দৃশ্যমান
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="প্রশ্নের বাক্য, বিকল্প, ব্যাখ্যা বা পরীক্ষার শিরোনাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Exam & Subject Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Exam Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">পরীক্ষা:</span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[190px] truncate"
              >
                <option value="all">সকল পরীক্ষা ({exams.length})</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.questions?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">বিষয়:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">সকল বিষয়</option>
                {HOME_SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub} ({metrics.subjectCounts[sub] || 0})
                  </option>
                ))}
                <option value="missing">অনুপস্থিত / ফাঁকা</option>
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">ক্যাটাগরি:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">সকল ক্যাটাগরি</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Toggle */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">সকল স্ট্যাটাস</option>
              <option value="needs_attention">⚠️ মনোযোগ প্রয়োজন</option>
              <option value="synced">✅ পুরোপুরি সিঙ্কড</option>
            </select>

            {/* Reset Filters */}
            {(selectedExamId !== 'all' || selectedSubject !== 'all' || selectedCategory !== 'all' || statusFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedExamId('all');
                  setSelectedSubject('all');
                  setSelectedCategory('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-2 text-xs text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* Quick Subject Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Tag className="h-3 w-3" /> দ্রুত ফিল্টার:
          </span>
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              selectedSubject === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            সব ({allQuestions.length})
          </button>
          {HOME_SUBJECT_OPTIONS.slice(0, 7).map((sub) => {
            const count = metrics.subjectCounts[sub] || 0;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedSubject === sub
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {sub} ({toBengaliDigits(count)})
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions Table Container */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <span>প্রশ্নের তালিকা</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                প্রদর্শিত: {toBengaliDigits(filteredQuestions.length)} টি
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              প্রতিটি প্রশ্নের পাশে থাকা "সম্পাদনা" বাটনে ক্লিক করে বিষয় ও ক্যাটাগরি আপডেট করুন।
            </p>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">প্রতি পৃষ্ঠায়:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value={10}>১০</option>
              <option value={15}>১৫</option>
              <option value={25}>২৫</option>
              <option value={50}>৫০</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {paginatedQuestions.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">কোনো প্রশ্ন পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                বর্তমান ফিল্টার ও সার্চ অনুযায়ী কোনো প্রশ্ন মেলেনি। ফিল্টার পরিবর্তন বা রিসেট করুন।
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5 min-w-[280px]">প্রশ্ন ও অপশনসমূহ</th>
                  <th className="p-3.5 w-36">বিষয় (Subject)</th>
                  <th className="p-3.5 w-32">ক্যাটাগরি</th>
                  <th className="p-3.5 w-44">মূল পরীক্ষা</th>
                  <th className="p-3.5 w-24 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {paginatedQuestions.map((q, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const health = getQuestionHealth(q);
                  const isMissingOrGeneric = health.status !== 'synced';

                  return (
                    <tr
                      key={`${q.examId}_${q.id}_${idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors"
                    >
                      {/* Serial Number */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                        {toBengaliDigits(globalIdx)}
                      </td>

                      {/* Question Text and Options */}
                      <td className="p-3.5 space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13px] leading-relaxed">
                          {q.text}
                        </div>

                        {/* 4 Options Preview */}
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-1 text-[11px]">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctAnswer;
                              const label = ['ক', 'খ', 'গ', 'ঘ'][oIdx] || String(oIdx + 1);
                              return (
                                <span
                                  key={oIdx}
                                  className={`px-2 py-0.5 rounded border truncate ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold'
                                      : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800'
                                  }`}
                                  title={`${label}. ${opt}`}
                                >
                                  <strong>{label}.</strong> {opt}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation Note if exists */}
                        {q.explanation && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                            💡 {q.explanation}
                          </div>
                        )}
                      </td>

                      {/* Subject Badge */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${getSubjectBadgeStyle(
                              q.subject
                            )}`}
                          >
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span>{q.subject || '(ফাঁকা)'}</span>
                          </span>

                          {isMissingOrGeneric && (
                            <span className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              ⚠️ {health.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="p-3.5 align-top">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <GraduationCap className="h-3 w-3 text-slate-400" />
                          <span>{q.category || q.examSubject || 'সাধারণ'}</span>
                        </span>
                      </td>

                      {/* Exam Title */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 text-xs">
                            {q.examTitle}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              q.examStatus === 'live'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : q.examStatus === 'upcoming'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}
                          >
                            {q.examStatus === 'live' ? 'চলমান' : q.examStatus === 'upcoming' ? 'আসন্ন' : 'আর্কাইভ'}
                          </span>
                        </div>
                      </td>

                      {/* Action Button: Edit */}
                      <td className="p-3.5 text-center align-middle">
                        <button
                          onClick={() => handleOpenEditModal(q)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-2xs active:scale-95"
                          title="বিষয় ও ক্যাটাগরি সংশোধন করুন"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>এডিট</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredQuestions.length > pageSize && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              মোট <strong>{toBengaliDigits(filteredQuestions.length)}</strong> টির মধ্যে{' '}
              <strong>{toBengaliDigits((currentPage - 1) * pageSize + 1)}</strong> -{' '}
              <strong>{toBengaliDigits(Math.min(currentPage * pageSize, filteredQuestions.length))}</strong> প্রদর্শন করা হচ্ছে
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                পৃষ্ঠা {toBengaliDigits(currentPage)} / {toBengaliDigits(totalPages)}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  প্রশ্ন সম্পাদনা ও ক্যাটাগরি সিঙ্ক
                </span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  বিষয় ও ক্যাটাগরি সংশোধন
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  পরীক্ষা: {editingQuestion.examTitle}
                </p>
              </div>
              <button
                onClick={handleCloseEditModal}
                disabled={isSaving}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Auto-detect notification */}
              {autoDetectNotice && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>{autoDetectNotice}</span>
                </div>
              )}

              {/* Subject Selection Field (Primary Focus) */}
              <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>হোম পেজ বিষয় ক্যাটাগরি (Subject) *</span>
                  </label>

                  {/* Auto Detect helper button */}
                  <button
                    type="button"
                    onClick={handleAutoDetectSubject}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                    title="প্রশ্নের বিষয়বস্তু বিশ্লেষণ করে স্বয়ংক্রিয়ভাবে বিষয় নির্ধারণ করুন"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>স্বয়ংক্রিয় সনাক্ত করুন</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  হোম পেজের বিষয় কার্ডগুলোর সাথে মিল রেখে সঠিক বিষয় নির্বাচন করুন। এটি পরিবর্তন করলে হোম পেজের সংশ্লিষ্ট বিষয়ে প্রশ্নটি স্বয়ংক্রিয়ভাবে দৃশ্যমান হবে।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      নির্দিষ্ট বিষয় তালিকা থেকে নির্বাচন:
                    </label>
                    <select
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- বিষয় নির্বাচন করুন --</option>
                      {HOME_SUBJECT_OPTIONS.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="custom">অন্যান্য / কাস্টম বিষয় লিখুন...</option>
                    </select>
                  </div>

                  {editSubject === 'custom' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        কাস্টম বিষয়ের নাম:
                      </label>
                      <input
                        type="text"
                        required
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="যেমন: বাংলা ব্যাকরণ"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Quick Subject Click Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {HOME_SUBJECT_OPTIONS.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        setEditSubject(sub);
                        setCustomSubject('');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        editSubject === sub
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category / Department Selection Field */}
              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-2.5">
                <label className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>দপ্তর / পরীক্ষা ক্যাটাগরি (Category)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      ক্যাটাগরি তালিকা:
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="custom">অন্যান্য / কাস্টম ক্যাটাগরি...</option>
                    </select>
                  </div>

                  {editCategory === 'custom' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        কাস্টম ক্যাটাগরির নাম:
                      </label>
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="যেমন: প্রাইমারি"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Question Statement */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  প্রশ্ন বিবরণ (Question Text) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  ৪টি বিকল্প (ক, খ, গ, ঘ)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-4">ক.</span>
                    <input
                      type="text"
                      required
                      value={editOpt1}
                      onChange={(e) => setEditOpt1(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-4">খ.</span>
                    <input
                      type="text"
                      required
                      value={editOpt2}
                      onChange={(e) => setEditOpt2(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-4">গ.</span>
                    <input
                      type="text"
                      required
                      value={editOpt3}
                      onChange={(e) => setEditOpt3(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-4">ঘ.</span>
                    <input
                      type="text"
                      required
                      value={editOpt4}
                      onChange={(e) => setEditOpt4(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Correct Answer and Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    সঠিক উত্তর *
                  </label>
                  <select
                    value={editCorrectAnswer}
                    onChange={(e) => setEditCorrectAnswer(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-emerald-800 dark:text-emerald-200"
                  >
                    <option value={0}>১ম অপশন (ক)</option>
                    <option value={1}>২য় অপশন (খ)</option>
                    <option value={2}>৩য় অপশন (গ)</option>
                    <option value={3}>৪র্থ অপশন (ঘ)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ব্যাখ্যা ও সমাধান (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={editExplanation}
                    onChange={(e) => setEditExplanation(e.target.value)}
                    placeholder="সঠিক উত্তরের বিশদ ব্যাখ্যা..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Feedback messages */}
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {saveErrorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{isSaving ? 'ফায়ারস্টোরে সেভ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ ও সিঙ্ক করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionManagementView;
