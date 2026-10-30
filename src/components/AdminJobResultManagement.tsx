/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  Plus,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Calendar,
  FileSpreadsheet,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
  FileCheck,
  RefreshCw,
  Hash,
  Download,
  Users,
} from 'lucide-react';
import { JobExamResult } from '../types';
import {
  subscribeToAllJobResultsForAdmin,
  saveJobResultToFirestore,
  toggleJobResultPublishStatus,
  deleteJobResultFromFirestore,
  parseJobResultCsv,
  normalizeRollNumber,
  CsvParseResult,
} from '../services/jobResultService';
import { toBengaliDigits, formatBengaliDateTimeSafe } from '../lib/dateUtils';

interface AdminJobResultManagementProps {
  currentUserEmail?: string;
  onViewPublicPage?: () => void;
}

export default function AdminJobResultManagement({
  currentUserEmail,
  onViewPublicPage,
}: AdminJobResultManagementProps) {
  const [results, setResults] = useState<JobExamResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');

  // Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formExamTitle, setFormExamTitle] = useState<string>('');
  const [formExamDate, setFormExamDate] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'published' | 'unpublished'>('published');
  const [formNotes, setFormNotes] = useState<string>('');

  // CSV Parsing State
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvParseData, setCsvParseData] = useState<CsvParseResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit Modal State
  const [editingResult, setEditingResult] = useState<JobExamResult | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'published' | 'unpublished'>('published');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editCsvParseData, setEditCsvParseData] = useState<CsvParseResult | null>(null);
  const [editCsvFileName, setEditCsvFileName] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Inspect Modal State
  const [inspectingResult, setInspectingResult] = useState<JobExamResult | null>(null);

  // Delete Confirmation Modal State
  const [deletingResult, setDeletingResult] = useState<JobExamResult | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Alert Feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const datePickerInputRef = useRef<HTMLInputElement | null>(null);
  const editDatePickerInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to convert ISO date (YYYY-MM-DD) to friendly Bengali date string
  const convertIsoToBengaliDate = (isoStr: string): string => {
    if (!isoStr) return '';
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        const months = [
          'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
          'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        const monthName = months[month - 1] || '';
        return `${toBengaliDigits(day)} ${monthName} ${toBengaliDigits(year)}`;
      }
    } catch (e) {
      console.error(e);
    }
    return isoStr;
  };

  const getRelativeDateBengali = (daysOffset: number = 0): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return convertIsoToBengaliDate(`${year}-${month}-${day}`);
  };

  // Real-time Firestore Subscription
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToAllJobResultsForAdmin((list) => {
      setResults(list);
      setIsLoading(false);
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

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return results.filter((r) => {
      const matchesSearch =
        !q ||
        r.examTitle.toLowerCase().includes(q) ||
        r.examDate.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && r.status === 'published') ||
        (statusFilter === 'unpublished' && r.status === 'unpublished');

      return matchesSearch && matchesStatus;
    });
  }, [results, searchQuery, statusFilter]);

  // Total summary statistics
  const stats = useMemo(() => {
    const totalExams = results.length;
    const publishedCount = results.filter((r) => r.status === 'published').length;
    const unpublishedCount = results.filter((r) => r.status === 'unpublished').length;
    const totalQualified = results.reduce((sum, r) => sum + (r.totalQualified || 0), 0);
    return { totalExams, publishedCount, unpublishedCount, totalQualified };
  }, [results]);

  // Handle CSV Upload for New Form
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseJobResultCsv(text);
        if (parsed.rollNumbers.length === 0) {
          setCsvError('ফাইলে কোনো বৈধ রোল নম্বর পাওয়া যায়নি। অনুগ্রহ করে সঠিক CSV ফাইল আপলোড করুন।');
          setCsvParseData(null);
          return;
        }
        setCsvParseData(parsed);
      } catch (err: any) {
        console.error('CSV parse error:', err);
        setCsvError('CSV ফাইলটি রিড করতে ত্রুটি হয়েছে: ' + (err?.message || 'অজানা ত্রুটি'));
        setCsvParseData(null);
      }
    };
    reader.onerror = () => {
      setCsvError('ফাইল পড়তে ব্যর্থ হয়েছে।');
      setCsvParseData(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Handle CSV Upload for Edit Modal
  const handleEditCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseJobResultCsv(text);
        if (parsed.rollNumbers.length === 0) {
          setErrorMsg('এডিট ফাইলে কোনো বৈধ রোল নম্বর পাওয়া যায়নি।');
          setEditCsvParseData(null);
          return;
        }
        setEditCsvParseData(parsed);
      } catch (err: any) {
        setErrorMsg('CSV ফাইল রিড করতে সমস্যা: ' + err?.message);
        setEditCsvParseData(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Submit New Result
  const handleCreateResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formExamTitle.trim()) {
      setErrorMsg('পরীক্ষার শিরোনাম পূরণ করা আবশ্যক।');
      return;
    }
    if (!formExamDate.trim()) {
      setErrorMsg('পরীক্ষা অনুষ্ঠিত তারিখ প্রদান করা আবশ্যক।');
      return;
    }
    if (!csvParseData || csvParseData.rollNumbers.length === 0) {
      setErrorMsg('উত্তীর্ণ রোল নম্বরের তালিকা সম্বলিত CSV ফাইল আপলোড করা আবশ্যক।');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveJobResultToFirestore(
        {
          examTitle: formExamTitle.trim(),
          examDate: formExamDate.trim(),
          rollNumbers: csvParseData.rollNumbers,
          status: formStatus,
          notes: formNotes.trim(),
        },
        currentUserEmail
      );

      setSuccessMsg(
        `অভিনন্দন! "${formExamTitle.trim()}" পরীক্ষার মোট ${toBengaliDigits(
          csvParseData.rollNumbers.length
        )}টি রোল নম্বর সহ ফলাফল সফলভাবে সংরক্ষিত হয়েছে!`
      );

      // Reset form
      setFormExamTitle('');
      setFormExamDate('');
      setFormStatus('published');
      setFormNotes('');
      setCsvFileName('');
      setCsvParseData(null);
      setShowAddForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Save job result error:', err);
      setErrorMsg('ফলাফল ফায়ারস্টোরে সংরক্ষণ করতে ত্রুটি হয়েছে: ' + (err?.message || 'অজানা ত্রুটি'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (res: JobExamResult) => {
    setEditingResult(res);
    setEditTitle(res.examTitle || '');
    setEditDate(res.examDate || '');
    setEditStatus(res.status || 'published');
    setEditNotes(res.notes || '');
    setEditCsvParseData(null);
    setEditCsvFileName('');
  };

  // Save Edit Modal
  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;
    if (!editTitle.trim() || !editDate.trim()) {
      setErrorMsg('শিরোনাম এবং তারিখ ফাঁকা রাখা যাবে না।');
      return;
    }

    setIsSavingEdit(true);
    try {
      const rollsToSave = editCsvParseData
        ? editCsvParseData.rollNumbers
        : editingResult.rollNumbers;

      await saveJobResultToFirestore(
        {
          id: editingResult.id,
          examTitle: editTitle.trim(),
          examDate: editDate.trim(),
          rollNumbers: rollsToSave,
          status: editStatus,
          notes: editNotes.trim(),
          createdAt: editingResult.createdAt,
        },
        currentUserEmail
      );

      setSuccessMsg(`"${editTitle.trim()}" পরীক্ষার ফলাফল সফলভাবে আপডেট করা হয়েছে।`);
      setEditingResult(null);
      setEditCsvParseData(null);
    } catch (err: any) {
      console.error('Failed to update result:', err);
      setErrorMsg('আপডেট করতে সমস্যা হয়েছে: ' + (err?.message || ''));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Toggle Publish / Unpublish
  const handleTogglePublish = async (res: JobExamResult) => {
    const newStatus = res.status === 'published' ? 'unpublished' : 'published';
    try {
      await toggleJobResultPublishStatus(res.id, newStatus);
      setSuccessMsg(
        newStatus === 'published'
          ? `✅ "${res.examTitle}" ফলাফল সফলভাবে ওয়েবসাইটে প্রকাশ করা হয়েছে।`
          : `👁️‍🗨️ "${res.examTitle}" ফলাফল ওয়েবসাইট থেকে অপ্রকাশিত (খসড়া) করা হয়েছে।`
      );
    } catch (err: any) {
      console.error('Failed to toggle publish status:', err);
      setErrorMsg('স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingResult) return;
    setIsDeleting(true);
    try {
      await deleteJobResultFromFirestore(deletingResult.id);
      setSuccessMsg(`"${deletingResult.examTitle}" পরীক্ষার ফলাফল সফলভাবে মুছে ফেলা হয়েছে।`);
      setDeletingResult(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMsg('ফলাফল মুছে ফেলতে ত্রুটি হয়েছে: ' + (err?.message || ''));
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = 'roll\n383883\n838388\n338389\n928383\n048291\n572019\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'job_result_roll_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Award className="h-3.5 w-3.5" />
                <span>চাকরি পরীক্ষা ফলাফল ম্যানেজমেন্ট</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <span>Firestore: /jobresult</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                <span>Privacy-Safe Search</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              চাকরি পরীক্ষা ফলাফল ব্যবস্থাপনা ও CSV আপলোড
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              বিভিন্ন সরকারি ও স্বায়ত্তশাসিত চাকরি নিয়োগ পরীক্ষার ফলাফল প্রকাশ, রোল নম্বরের CSV তালিকা আপলোড, প্রকাশনা নিয়ন্ত্রণ ও পরীক্ষণ পরিচালনা করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="CSV টেমপ্লেট ডাউনলোড করুন"
            >
              <Download className="h-4 w-4" />
              <span>CSV টেমপ্লেট</span>
            </button>

            {onViewPublicPage && (
              <button
                type="button"
                onClick={onViewPublicPage}
                className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="পাবলিক রেজাল্ট পেজ দেখুন"
              >
                <span>🌐 রেজাল্ট পেজ দেখুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowAddForm((prev) => !prev);
                setCsvError(null);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{showAddForm ? 'ফর্ম বন্ধ করুন' : 'নতুন ফলাফল যুক্ত করুন'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-emerald-200/50 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-200/50 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">মোট পরীক্ষা</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {toBengaliDigits(stats.totalExams)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">সংরক্ষিত ফলাফল</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">প্রকাশিত ফলাফল</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {toBengaliDigits(stats.publishedCount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">ওয়েবসাইটে লাইভ আছে</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">অপ্রকাশিত (খসড়া)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <EyeOff className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {toBengaliDigits(stats.unpublishedCount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">গোপন রাখা হয়েছে</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">মোট উত্তীর্ণ রোল</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">
            {toBengaliDigits(stats.totalQualified)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">ডেটাবেজে নিবন্ধিত</p>
        </div>
      </div>

      {/* FORM: ADD NEW JOB RESULT */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 gap-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <Plus className="h-4 w-4" />
                <span>নতুন ফলাফল ইনপুট ফর্ম</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                চাকরি পরীক্ষার নতুন ফলাফল যুক্ত করুন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                পরীক্ষার নাম, তারিখ এবং উত্তীর্ণ রোল নম্বর সম্বলিত CSV ফাইল আপলোড করে প্রকাশ করুন।
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 self-start"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateResultSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Exam Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>পরীক্ষার শিরোনাম (Exam Title)</span>
                  <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: স্বাস্থ্য সহকারী নিয়োগ পরীক্ষার ফলাফল"
                  value={formExamTitle}
                  onChange={(e) => setFormExamTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Exam Date */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    <span>পরীক্ষা অনুষ্ঠিত তারিখ (Exam Date)</span>
                    <span className="text-rose-500 font-black">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ক্যালেন্ডার দিয়ে সহজে ইনপুট দিন
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ২৫ অক্টোবর ২০২৬ (ডানপাশের ক্যালেন্ডার ব্যবহার করুন)"
                    value={formExamDate}
                    onChange={(e) => setFormExamDate(e.target.value)}
                    className="w-full pl-4 pr-14 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />

                  {/* Calendar Picker on Right Side */}
                  <div className="absolute right-2 flex items-center">
                    <input
                      ref={datePickerInputRef}
                      type="date"
                      tabIndex={-1}
                      aria-label="ক্যালেন্ডার থেকে তারিখ নির্বাচন করুন"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormExamDate(convertIsoToBengaliDate(e.target.value));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (datePickerInputRef.current && 'showPicker' in datePickerInputRef.current) {
                            (datePickerInputRef.current as any).showPicker();
                          } else {
                            datePickerInputRef.current?.focus();
                          }
                        } catch {
                          datePickerInputRef.current?.click();
                        }
                      }}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center hover:scale-105 active:scale-95"
                      title="ক্যালেন্ডার খুলুন ও সহজে তারিখ বসান"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">দ্রুত ইনপুট:</span>
                  <button
                    type="button"
                    onClick={() => setFormExamDate(getRelativeDateBengali(0))}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    আজকের তারিখ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormExamDate(getRelativeDateBengali(-1))}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/60 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    গতকাল
                  </button>
                </div>
              </div>
            </div>

            {/* Publication Status & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ফলাফল প্রকাশের অবস্থা (Publication Status)
                </label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setFormStatus('published')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formStatus === 'published'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>প্রকাশিত (Published)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('unpublished')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formStatus === 'unpublished'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <EyeOff className="h-4 w-4" />
                    <span>অপ্রকাশিত (খসড়া)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  অতিরিক্ত নোট / বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: লিখিত পরীক্ষার উত্তীর্ণদের তালিকা"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* CSV File Upload Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>রোল নম্বর তালিকা (CSV File Upload)</span>
                  <span className="text-rose-500 font-black">*</span>
                </label>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  <span>নমুনা CSV ডাউনলোড</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                id="job-result-csv-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />

              {!csvParseData && (
                <label
                  htmlFor="job-result-csv-input"
                  className="group relative border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                    CSV ফাইল আপলোড করতে এখানে ক্লিক করুন অথবা টেনে এনে ছেড়ে দিন
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    কলাম ফরম্যাট: <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-emerald-600">roll</code> অথবা এক কলামে প্রতিটি রোল আলাদা রো-তে
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 font-semibold shadow-xs">
                    <span>✓ শুরুর শূন্য (Leading Zeros) ও ডুপ্লিকেট ফিল্টারিং সম্পূর্ণ সুরক্ষিত</span>
                  </div>
                </label>
              )}

              {csvError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* CSV Verification Preview Box */}
              {csvParseData && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 sm:p-5 space-y-3 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                          ফাইল যাচাই সম্পন্ন: {csvFileName}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                            মোট উত্তীর্ণ রোল: {toBengaliDigits(csvParseData.totalParsed)} টি
                          </span>
                          {csvParseData.duplicateCount > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              (ডুপ্লিকেট বাদ: {toBengaliDigits(csvParseData.duplicateCount)} টি)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCsvParseData(null);
                        setCsvFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      অন্য ফাইল নির্বাচন করুন
                    </button>
                  </div>

                  {/* Sample rolls pill list */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      নমুনা রোল নম্বর প্রিভিউ (প্রথম ১৫টি):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                      {csvParseData.sampleRolls.map((roll, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded font-mono text-xs font-bold"
                        >
                          {roll}
                        </span>
                      ))}
                      {csvParseData.totalParsed > 15 && (
                        <span className="px-2 py-0.5 text-slate-400 text-xs font-semibold">
                          ... আরও {toBengaliDigits(csvParseData.totalParsed - 15)} টি
                        </span>
                      )}
                    </div>
                  </div>

                  {csvParseData.warnings.length > 0 && (
                    <div className="space-y-1 pt-1 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                      {csvParseData.warnings.slice(0, 3).map((w, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                বাতিল করুন
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !csvParseData || csvParseData.rollNumbers.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>ফলাফল সংরক্ষিত হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ফলাফল নিশ্চিত ও সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="পরীক্ষার শিরোনাম বা তারিখ দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সকল ({toBengaliDigits(results.length)})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              প্রকাশিত ({toBengaliDigits(stats.publishedCount)})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('unpublished')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'unpublished'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              খসড়া ({toBengaliDigits(stats.unpublishedCount)})
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS TABLE */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>ফলাফলের তালিকা</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {toBengaliDigits(filteredResults.length)} টি
            </span>
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">ফায়ারস্টোর থেকে ফলাফল লোড হচ্ছে...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <Award className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              কোনো চাকরি পরীক্ষার ফলাফল পাওয়া যায়নি
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              উপরে &ldquo;নতুন ফলাফল যুক্ত করুন&rdquo; বাটনে ক্লিক করে পরীক্ষার নাম, তারিখ ও উত্তীর্ণদের CSV তালিকা আপলোড করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">পরীক্ষার শিরোনাম</th>
                  <th className="py-3.5 px-4">পরীক্ষার তারিখ</th>
                  <th className="py-3.5 px-4 text-center">মোট উত্তীর্ণ রোল</th>
                  <th className="py-3.5 px-4 text-center">প্রকাশের অবস্থা</th>
                  <th className="py-3.5 px-4">সর্বশেষ আপডেট</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {filteredResults.map((item) => {
                  const isPub = item.status === 'published';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                    >
                      {/* Title */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-extrabold text-slate-900 dark:text-white line-clamp-2 max-w-sm">
                          {item.examTitle}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{item.examDate}</span>
                        </div>
                      </td>

                      {/* Total Qualified */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Users className="h-3.5 w-3.5" />
                          <span>{toBengaliDigits(item.totalQualified)} জন</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                            isPub
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isPub ? <CheckCircle2 className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <span>{isPub ? 'প্রকাশিত' : 'খসড়া'}</span>
                        </span>
                      </td>

                      {/* Updated At */}
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{formatBengaliDateTimeSafe(item.updatedAt || item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect rolls */}
                          <button
                            type="button"
                            onClick={() => setInspectingResult(item)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            title="রোল তালিকা দেখুন"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                            title="সম্পাদনা করুন"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Publish / Unpublish */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(item)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              isPub
                                ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            }`}
                            title={isPub ? 'অপ্রকাশিত করুন' : 'প্রকাশ করুন'}
                          >
                            {isPub ? <EyeOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeletingResult(item)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EDIT RESULT */}
      {editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-emerald-600" />
                <span>ফলাফল সম্পাদনা (Edit Job Result)</span>
              </h4>
              <button
                onClick={() => setEditingResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">পরীক্ষার শিরোনাম</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>পরীক্ষার তারিখ</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ক্যালেন্ডার</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="absolute right-1.5 flex items-center">
                      <input
                        ref={editDatePickerInputRef}
                        type="date"
                        tabIndex={-1}
                        aria-label="ক্যালেন্ডার থেকে তারিখ নির্বাচন করুন"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        onChange={(e) => {
                          if (e.target.value) {
                            setEditDate(convertIsoToBengaliDate(e.target.value));
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (editDatePickerInputRef.current && 'showPicker' in editDatePickerInputRef.current) {
                              (editDatePickerInputRef.current as any).showPicker();
                            } else {
                              editDatePickerInputRef.current?.focus();
                            }
                          } catch {
                            editDatePickerInputRef.current?.click();
                          }
                        }}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        title="ক্যালেন্ডার থেকে তারিখ নির্বাচন করুন"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">প্রকাশের অবস্থা</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="published">প্রকাশিত (Published)</option>
                    <option value="unpublished">অপ্রকাশিত (Unpublished)</option>
                  </select>
                </div>
              </div>

              {/* Optional replace CSV */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    বিদ্যমান রোল সংখ্যা: {toBengaliDigits(editingResult.totalQualified)} টি
                  </span>
                  <span className="text-[11px] text-slate-400">রোল তালিকা প্রতিস্থাপন করতে চাইলে:</span>
                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleEditCsvFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />

                {editCsvParseData && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>নতুন CSV শনাক্ত: {toBengaliDigits(editCsvParseData.totalParsed)} টি রোল</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCsvParseData(null);
                        setEditCsvFileName('');
                        if (editFileInputRef.current) editFileInputRef.current.value = '';
                      }}
                      className="text-rose-600 text-[11px]"
                    >
                      বাতিল
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingResult(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <span>পরিবর্তন সংরক্ষণ করুন</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT ROLLS */}
      {inspectingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                  {inspectingResult.examTitle}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>তারিখ: {inspectingResult.examDate}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    মোট উত্তীর্ণ: {toBengaliDigits(inspectingResult.totalQualified)} জন
                  </span>
                </div>
              </div>

              <button
                onClick={() => setInspectingResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {inspectingResult.rollNumbers.map((roll, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    {roll}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
              <span className="text-slate-400">
                সংরক্ষণ তারিখ: {formatBengaliDateTimeSafe(inspectingResult.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setInspectingResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer hover:bg-slate-200"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                আপনি কি নিশ্চিত ফলাফলটি মুছে ফেলতে চান?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                &ldquo;<strong className="text-slate-800 dark:text-slate-200">{deletingResult.examTitle}</strong>&rdquo; ফলাফলটি ফায়ারস্টোর ডেটাবেস এবং ওয়েবসাইট থেকে স্থায়ীভাবে ডিলিট হয়ে যাবে। এই কাজ পূর্বাবস্থায় ফেরানো যাবে না।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingResult(null)}
                disabled={isDeleting}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>মুছে ফেলা হচ্ছে...</span>
                  </>
                ) : (
                  <span>স্থায়ীভাবে মুছুন</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
