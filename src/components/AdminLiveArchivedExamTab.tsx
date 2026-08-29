/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Archive,
  Play,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  Crown,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  EyeOff,
  Filter,
  Flame,
  BookOpen,
} from 'lucide-react';
import { Exam, UserProfile } from '../types';
import {
  updateExamArchiveStatus,
  updateExamArchiveDateTime,
  deleteExamPermanently,
} from '../services/firestoreService';
import {
  safeTimestampToString,
  safeDateOnlyString,
  formatSafeDisplay,
  toBengaliDigits,
  formatBengaliDateTimeSafe,
} from '../lib/dateUtils';

interface AdminLiveArchivedExamTabProps {
  exams: Exam[];
  currentUser: UserProfile | null;
  onUpdateExam?: (exam: Exam) => void;
  onDeleteExam?: (examId: string) => void;
}

export const formatBengaliDateTime = (dateVal?: any): string => {
  return formatBengaliDateTimeSafe(dateVal);
};

export const AdminLiveArchivedExamTab: React.FC<AdminLiveArchivedExamTabProps> = ({
  exams,
  currentUser,
  onUpdateExam,
  onDeleteExam,
}) => {
  const [subTab, setSubTab] = useState<'live' | 'archived'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'free' | 'premium'>('all');

  // Modal States
  const [dateModalExam, setDateModalExam] = useState<Exam | null>(null);
  const [modalDateTime, setModalDateTime] = useState<string>('');
  
  const [statusModalExam, setStatusModalExam] = useState<Exam | null>(null);
  const [targetStatus, setTargetStatus] = useState<'live' | 'archive'>('archive');
  const [restoreDateTime, setRestoreDateTime] = useState<string>('');

  const [deleteModalExam, setDeleteModalExam] = useState<Exam | null>(null);

  // Processing & Feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);

  // Calculate Live & Archived Exams based on Firestore status & archiveDateTime
  const now = Date.now();

  const allLiveExams = useMemo(() => {
    return exams.filter((exam) => {
      if (exam.status === 'archive' || exam.status === 'archived') return false;
      if (exam.status === 'upcoming') return false;
      
      const archStr = exam.archiveDateTime || exam.archiveTime || (exam as any).archiveDate;
      if (archStr) {
        const archDate = new Date(archStr);
        if (!isNaN(archDate.getTime()) && now >= archDate.getTime()) {
          return false;
        }
      }
      return exam.status === 'live';
    });
  }, [exams, now]);

  const allArchivedExams = useMemo(() => {
    return exams.filter((exam) => {
      if (exam.status === 'upcoming') return false;
      if (exam.status === 'archive' || exam.status === 'archived') return true;

      const archStr = exam.archiveDateTime || exam.archiveTime || (exam as any).archiveDate;
      if (archStr) {
        const archDate = new Date(archStr);
        if (!isNaN(archDate.getTime()) && now >= archDate.getTime()) {
          return true;
        }
      }
      return false;
    });
  }, [exams, now]);

  // Unique Subjects for filtering
  const subjectsList = useMemo(() => {
    const subs = new Set<string>();
    exams.forEach(e => {
      if (e.subject) subs.add(e.subject);
    });
    return Array.from(subs);
  }, [exams]);

  // Filtered List for active subTab
  const currentList = useMemo(() => {
    const baseList = subTab === 'live' ? allLiveExams : allArchivedExams;
    return baseList.filter((exam) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        exam.title.toLowerCase().includes(q) ||
        exam.id.toLowerCase().includes(q) ||
        (exam.subject && exam.subject.toLowerCase().includes(q));

      const matchesSubject = selectedSubject === 'all' || exam.subject === selectedSubject;
      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'premium' ? !!exam.isPremium : !exam.isPremium);

      return matchesSearch && matchesSubject && matchesType;
    });
  }, [subTab, allLiveExams, allArchivedExams, searchQuery, selectedSubject, selectedType]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedExamId(id);
    setTimeout(() => setCopiedExamId(null), 2000);
  };

  // Open Date Modal
  const handleOpenDateModal = (exam: Exam) => {
    setDateModalExam(exam);
    const existing = exam.archiveDateTime || exam.archiveTime || '';
    setModalDateTime(existing);
    setErrorMsg('');
  };

  // Save Archive Date/Time
  const handleSaveArchiveDateTime = async () => {
    if (!dateModalExam) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      await updateExamArchiveDateTime(dateModalExam.id, modalDateTime);
      if (onUpdateExam) {
        onUpdateExam({
          ...dateModalExam,
          archiveDateTime: modalDateTime || undefined,
          archiveTime: modalDateTime || undefined,
        });
      }
      showNotification(`"${dateModalExam.title}" পরীক্ষার আর্কাইভ তারিখ সফলভাবে সংরক্ষণ করা হয়েছে!`);
      setDateModalExam(null);
    } catch (err: any) {
      console.error("Failed to update archive date:", err);
      showNotification("আর্কাইভ তারিখ আপডেট করতে ত্রুটি হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।", true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick preset helper
  const handleApplyPresetHours = (hours: number) => {
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setModalDateTime(localISOTime);
  };

  // Open Status Modal (Archive or Live)
  const handleOpenStatusModal = (exam: Exam, target: 'live' | 'archive') => {
    setStatusModalExam(exam);
    setTargetStatus(target);
    const existing = exam.archiveDateTime || exam.archiveTime || '';
    setRestoreDateTime(existing);
    setErrorMsg('');
  };

  // Confirm Status Change
  const handleConfirmStatusChange = async () => {
    if (!statusModalExam) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      if (targetStatus === 'archive') {
        await updateExamArchiveStatus(statusModalExam.id, 'archive');
        if (onUpdateExam) {
          onUpdateExam({
            ...statusModalExam,
            status: 'archive',
          });
        }
        showNotification(`"${statusModalExam.title}" পরীক্ষাটি সফলভাবে আর্কাইভে পাঠানো হয়েছে!`);
      } else {
        // Restore to Live
        await updateExamArchiveStatus(statusModalExam.id, 'live', restoreDateTime || undefined);
        if (onUpdateExam) {
          onUpdateExam({
            ...statusModalExam,
            status: 'live',
            archiveDateTime: restoreDateTime || undefined,
            archiveTime: restoreDateTime || undefined,
          });
        }
        showNotification(`"${statusModalExam.title}" পরীক্ষাটি সফলভাবে পুনরায় লাইভ চালু করা হয়েছে!`);
      }
      setStatusModalExam(null);
    } catch (err: any) {
      console.error("Status change error:", err);
      showNotification("পরীক্ষার স্ট্যাটাস পরিবর্তন করতে ত্রুটি হয়েছে।", true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Permanent Delete Modal
  const handleOpenDeleteModal = (exam: Exam) => {
    setDeleteModalExam(exam);
    setErrorMsg('');
  };

  // Confirm Permanent Deletion
  const handleConfirmPermanentDelete = async () => {
    if (!deleteModalExam) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      await deleteExamPermanently(deleteModalExam.id);
      if (onDeleteExam) {
        onDeleteExam(deleteModalExam.id);
      }
      showNotification(`"${deleteModalExam.title}" পরীক্ষা এবং এর সংশ্লিষ্ট প্রশ্ন ডেটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে!`);
      setDeleteModalExam(null);
    } catch (err: any) {
      console.error("Permanent delete error:", err);
      showNotification("পরীক্ষাটি মুছতে ত্রুটি হয়েছে।", true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                চলমান ও আর্কাইভ পরীক্ষা নিয়ন্ত্রণ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                হোম পেজে প্রদর্শিত লাইভ এবং আর্কাইভ পরীক্ষাগুলোর স্থিতি, সময়সীমা এবং নিয়ন্ত্রণ করুন।
              </p>
            </div>
          </div>
        </div>

        {/* Real-time stats pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            লাইভ: {toBengaliDigits(allLiveExams.length)} টি
          </div>
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            আর্কাইভ: {toBengaliDigits(allArchivedExams.length)} টি
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 font-medium flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs sm:text-sm text-rose-800 dark:text-rose-200 font-medium flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-800 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sub Tabs Selection (Live vs Archived) */}
      <div className="flex items-center gap-3 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => { setSubTab('live'); }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            subTab === 'live'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/50 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${subTab === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          <span>চলমান পরীক্ষা (Live Exams)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
            subTab === 'live'
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {toBengaliDigits(allLiveExams.length)}
          </span>
        </button>

        <button
          onClick={() => { setSubTab('archived'); }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            subTab === 'archived'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/50 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Archive className="h-4 w-4" />
          <span>আর্কাইভ পরীক্ষা (Archived Exams)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
            subTab === 'archived'
              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {toBengaliDigits(allArchivedExams.length)}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পরীক্ষার নাম বা ID দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Subject Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">সকল বিষয়</option>
            {subjectsList.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Type Filter (All / Free / Premium) */}
        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">সকল ধরন (Free/Pro)</option>
            <option value="free">ফ্রি পরীক্ষা</option>
            <option value="premium">প্রিমিয়াম পরীক্ষা</option>
          </select>
        </div>
      </div>

      {/* Exam Cards List */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              {subTab === 'live' ? <Clock className="h-6 w-6" /> : <Archive className="h-6 w-6" />}
            </div>
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              {subTab === 'live' ? 'কোনো চলমান পরীক্ষা পাওয়া যায়নি' : 'কোনো আর্কাইভ পরীক্ষা পাওয়া যায়নি'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedSubject !== 'all' || selectedType !== 'all'
                ? 'অনুসন্ধানের সাথে কোনো পরীক্ষা মিলেনি। ফিল্টার পরিবর্তন করে চেষ্টা করুন।'
                : subTab === 'live'
                ? 'বর্তমানে হোম পেজে কোনো লাইভ পরীক্ষা সক্রিয় নেই।'
                : 'বর্তমানে কোনো আর্কাইভ করা পরীক্ষা নেই।'}
            </p>
          </div>
        ) : (
          currentList.map((exam) => {
            const hasArchiveTime = !!(exam.archiveDateTime || exam.archiveTime);
            const archiveDateFormatted = formatBengaliDateTime(exam.archiveDateTime || exam.archiveTime);
            const questionCount = exam.questions?.length || exam.totalQuestions || 0;
            const marksCount = exam.totalMarks || questionCount;

            return (
              <div
                key={exam.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4"
              >
                {/* Top Row: Badges, Title & Copy ID */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Live or Archived Badge */}
                      {subTab === 'live' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          চলমান (Live)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Archive className="h-3 w-3" />
                          আর্কাইভ (Archived)
                        </span>
                      )}

                      {/* Subject Tag */}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {exam.subject || 'সাধারণ'}
                      </span>

                      {/* Free / Premium Badge */}
                      {exam.isPremium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Crown className="h-3 w-3 text-amber-500" /> প্রিমিয়াম
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          ফ্রি
                        </span>
                      )}

                      {/* Auto-archive countdown indicator if live */}
                      {subTab === 'live' && hasArchiveTime && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                          <Clock className="h-3 w-3 text-sky-600 dark:text-sky-400" /> অটো-আর্কাইভ শিডিউল্ড
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white pt-1 leading-snug">
                      {exam.title}
                    </h4>

                    {/* Description if present */}
                    {exam.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {exam.description}
                      </p>
                    )}
                  </div>

                  {/* Monospace Exam ID pill with copy button */}
                  <div className="flex items-center gap-1 self-start bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400 select-none">ID:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{exam.id}</span>
                    <button
                      onClick={() => handleCopyId(exam.id)}
                      title="ID কপি করুন"
                      className="p-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors ml-1"
                    >
                      {copiedExamId === exam.id ? (
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold">সময়সীমা:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {toBengaliDigits(exam.durationMinutes || 0)} মিনিট
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold">মোট প্রশ্ন ও মার্কস:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {toBengaliDigits(questionCount)} টি ({toBengaliDigits(marksCount)} মার্ক)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold">তৈরির তারিখ:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {formatSafeDisplay(exam.dateCreated, '—')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      {subTab === 'live' ? 'আর্কাইভ তারিখ ও সময়:' : 'আর্কাইভ হওয়ার তারিখ:'}
                    </span>
                    <span className={`font-extrabold ${hasArchiveTime ? 'text-primary dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {archiveDateFormatted}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Set / Edit Archive Date Button */}
                    <button
                      onClick={() => handleOpenDateModal(exam)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{hasArchiveTime ? 'আর্কাইভ তারিখ পরিবর্তন' : 'আর্কাইভ তারিখ সেট করুন'}</span>
                    </button>

                    {/* 2. Sub-tab specific action: Archive or Restore */}
                    {subTab === 'live' ? (
                      <>
                        <button
                          onClick={() => handleOpenStatusModal(exam, 'archive')}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          <span>আর্কাইভ করুন</span>
                        </button>

                        <button
                          onClick={() => handleOpenStatusModal(exam, 'archive')}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="পরীক্ষাটি লাইভ থেকে নামিয়ে আর্কাইভে স্থানান্তর করুন"
                        >
                          <EyeOff className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          <span>লাইভ থেকে সরান</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenStatusModal(exam, 'live')}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>পুনরায় চালু করুন (Make Live)</span>
                      </button>
                    )}
                  </div>

                  {/* 3. Permanent Delete Button */}
                  <button
                    onClick={() => handleOpenDeleteModal(exam)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-all ml-auto cursor-pointer"
                    title="ডেটাবেজ থেকে এই পরীক্ষা ও এর সকল প্রশ্ন স্থায়ীভাবে মুছে ফেলুন"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    <span>স্থায়ীভাবে মুছে ফেলুন</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. MODAL: SET / EDIT ARCHIVE DATE & TIME */}
      {/* ========================================================= */}
      {dateModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    আর্কাইভ তারিখ ও সময় নির্ধারণ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">পরীক্ষা: {dateModalExam.title}</p>
                </div>
              </div>
              <button
                onClick={() => setDateModalExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  আর্কাইভের নির্দিষ্ট তারিখ ও সময় (Auto Archive DateTime)
                </label>
                <input
                  type="datetime-local"
                  value={modalDateTime}
                  onChange={(e) => setModalDateTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  এই সময়ের পর পরীক্ষাটি স্বয়ংক্রিয়ভাবে হোম পেজের লাইভ থেকে আর্কাইভ সেকশনে স্থানান্তরিত হবে।
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">দ্রুত সময় যোগ করুন (Presets):</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetHours(1)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    +১ ঘণ্টা
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetHours(6)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    +৬ ঘণ্টা
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetHours(12)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    +১২ ঘণ্টা
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetHours(24)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    +১ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetHours(72)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    +৩ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetHours(168)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    +৭ দিন
                  </button>
                  {modalDateTime && (
                    <button
                      type="button"
                      onClick={() => setModalDateTime('')}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      সময় মুছে ফেলুন (আনলিমিটেড)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDateModalExam(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveArchiveDateTime}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MODAL: STATUS CHANGE (ARCHIVE OR RESTORE TO LIVE) */}
      {/* ========================================================= */}
      {statusModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                targetStatus === 'archive' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
              }`}>
                {targetStatus === 'archive' ? <Archive className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {targetStatus === 'archive' ? 'পরীক্ষাটি আর্কাইভ করবেন?' : 'পরীক্ষাটি পুনরায় লাইভ চালু করবেন?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{statusModalExam.title}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {targetStatus === 'archive' ? (
                <p className="leading-relaxed">
                  এই পরীক্ষাটি আর্কাইভ করলে এটি হোম পেজের <strong>"আর্কাইভ পরীক্ষা"</strong> সেকশনে চলে যাবে। এর প্রশ্ন এবং অতীত রেজাল্টসমূহ সম্পূর্ণ অক্ষত থাকবে।
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    পরীক্ষাটি পুনরায় <strong>"চলমান পরীক্ষা (Live)"</strong> হিসেবে হোম পেজে প্রকাশ করা হবে এবং শিক্ষার্থীরা পরীক্ষায় অংশ নিতে পারবে।
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ঐচ্ছিক: নতুন আর্কাইভ তারিখ সেট করুন
                    </label>
                    <input
                      type="datetime-local"
                      value={restoreDateTime}
                      onChange={(e) => setRestoreDateTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStatusModalExam(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmStatusChange}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                  targetStatus === 'archive'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {targetStatus === 'archive' ? 'আর্কাইভ নিশ্চিত করুন' : 'লাইভ চালু নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODAL: PERMANENT DELETE WARNING */}
      {/* ========================================================= */}
      {deleteModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-rose-600 dark:text-rose-400">
                  স্থায়ীভাবে পরীক্ষাটি মুছে ফেলতে চান?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">আইডি: {deleteModalExam.id}</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/70 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-2">
              <p className="font-bold">
                ⚠️ সতর্কবার্তা: "{deleteModalExam.title}" পরীক্ষাটি ফায়ারস্টোর ডেটাবেজ থেকে সম্পূর্ণ মুছে ফেলা হবে।
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 dark:text-rose-300">
                <li>এই পরীক্ষার সকল প্রশ্ন ডেটাবেজ থেকে স্থায়ীভাবে মুছে যাবে।</li>
                <li>এটি হোম পেজ এবং অ্যাডমিন প্যানেল থেকে সরিয়ে নেওয়া হবে।</li>
                <li>এই প্রক্রিয়াটি কোনোভাবেই পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalExam(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                হ্যাঁ, স্থায়ীভাবে মুছুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
