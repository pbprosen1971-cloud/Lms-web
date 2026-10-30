/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  FileCheck,
  ShieldCheck,
  BookOpen,
  X,
  Share2,
  Copy,
  Check,
  Facebook,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { JobExamResultSummary, JobResultCheckResponse } from '../types';
import {
  subscribeToPublishedJobResults,
  checkJobResultRoll,
  normalizeRollNumber,
} from '../services/jobResultService';
import { toBengaliDigits, formatBengaliDateTimeSafe } from '../lib/dateUtils';

interface JobExaminationResultsViewProps {
  setView?: (view: string) => void;
  initialSelectedId?: string;
}

export default function JobExaminationResultsView({
  setView,
  initialSelectedId,
}: JobExaminationResultsViewProps) {
  const [results, setResults] = useState<JobExamResultSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilterQuery, setSearchFilterQuery] = useState<string>('');

  // Selected Result for Roll Searching
  const [selectedResult, setSelectedResult] = useState<JobExamResultSummary | null>(null);

  // Roll Number Search State
  const [inputRollNumber, setInputRollNumber] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchOutcome, setSearchOutcome] = useState<JobResultCheckResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Link copy toast
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to real-time published results from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToPublishedJobResults((list) => {
      setResults(list);
      setIsLoading(false);

      // If initialSelectedId was provided or in URL hash/params
      if (initialSelectedId && !selectedResult) {
        const matched = list.find((r) => r.id === initialSelectedId);
        if (matched) {
          setSelectedResult(matched);
        }
      }
    });
    return () => unsub();
  }, [initialSelectedId]);

  // Check URL query parameters on mount for deep linking (e.g. ?resultId=xxx)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const resId = urlParams.get('id') || urlParams.get('resultId');
      if (resId && results.length > 0) {
        const found = results.find((r) => r.id === resId);
        if (found) {
          setSelectedResult(found);
        }
      }
    } catch {}
  }, [results]);

  // Latest published result (for top-right Latest Update showcase)
  const latestResult = useMemo(() => {
    return results.length > 0 ? results[0] : null;
  }, [results]);

  // Filtered results list for grid search
  const filteredResults = useMemo(() => {
    const q = searchFilterQuery.toLowerCase().trim();
    if (!q) return results;
    return results.filter(
      (r) =>
        r.examTitle.toLowerCase().includes(q) ||
        r.examDate.toLowerCase().includes(q)
    );
  }, [results, searchFilterQuery]);

  // Other published results (excluding current active result)
  const otherResults = useMemo(() => {
    if (!selectedResult) return results;
    return results.filter((r) => r.id !== selectedResult.id);
  }, [results, selectedResult]);

  // Handle Select an Exam to search roll
  const handleSelectResult = (res: JobExamResultSummary) => {
    setSelectedResult(res);
    setInputRollNumber('');
    setSearchOutcome(null);
    setSearchError(null);

    // Scroll to search section smoothly
    setTimeout(() => {
      document.getElementById('roll-search-section')?.scrollIntoView({ behavior: 'smooth' });
      searchInputRef.current?.focus();
    }, 100);
  };

  // Handle Roll Number Search Submit
  const handleSearchRollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult) return;

    setSearchError(null);
    const cleanRoll = normalizeRollNumber(inputRollNumber);

    if (!cleanRoll) {
      setSearchError('অনুগ্রহ করে আপনার সঠিক রোল নম্বরটি লিখুন।');
      return;
    }

    setIsSearching(true);
    setSearchOutcome(null);

    try {
      const outcome = await checkJobResultRoll(selectedResult.id, cleanRoll);
      setSearchOutcome(outcome);

      // If user qualified, trigger celebratory confetti!
      if (outcome.qualified) {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#38B262', '#10B981', '#3B82F6', '#F59E0B', '#FFFFFF'],
          });
        } catch {}
      }
    } catch (err: any) {
      console.error('Search roll error:', err);
      setSearchError('ফলাফল যাচাই করতে প্রযুক্তিগত সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSearching(false);
    }
  };

  // Copy or share current result link
  const handleCopyShareLink = async () => {
    if (!selectedResult) return;
    const url = `${window.location.origin}/all-job-result?id=${encodeURIComponent(selectedResult.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedResult.examTitle,
          text: `${selectedResult.examTitle} এর ফলাফল প্রকাশিত হয়েছে। আপনার রোল দিয়ে ফলাফল যাচাই করুন:`,
          url,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  // Share individual result card
  const handleShareResultCard = async (e: React.MouseEvent, item: JobExamResultSummary) => {
    e.stopPropagation();
    const url = `${window.location.origin}/all-job-result?id=${encodeURIComponent(item.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.examTitle,
          text: `${item.examTitle} এর ফলাফল প্রকাশিত হয়েছে। আপনার রোল দিয়ে ফলাফল যাচাই করুন:`,
          url,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCardId(item.id);
      setTimeout(() => setCopiedCardId(null), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ========================================================= */}
        {/* SECTION 1: PAGE HEADER & LATEST UPDATE SHOWCASE          */}
        {/* ========================================================= */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-10 shadow-2xl border border-emerald-500/30">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 cols: Page Title & Description */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-400/30 backdrop-blur-md shadow-xs">
                <Award className="h-4 w-4" />
                <span>সরকারি চাকরি পরীক্ষা রেজাল্ট পোর্টাল</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                চাকরি পরীক্ষার ফলাফল
              </h1>

              <p className="text-sm sm:text-base text-slate-200 max-w-xl leading-relaxed">
                বিভিন্ন সরকারি চাকরির পরীক্ষার ফলাফল দেখুন এবং আপনার রোল নম্বর দিয়ে ফলাফল যাচাই করুন।
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>শতভাগ নির্ভুল ও নিরাপদ</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>তাৎক্ষণিক রোল ভেরিফিকেশন</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>লাইভ আপডেট</span>
                </span>
              </div>
            </div>

            {/* Right 5 cols: Latest Update Section */}
            <div className="lg:col-span-5">
              {latestResult ? (
                <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative group hover:border-emerald-400/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/25 text-rose-300 border border-rose-400/30 animate-pulse">
                      <Flame className="h-3.5 w-3.5 text-rose-400" />
                      <span>সর্বশেষ আপডেট</span>
                    </span>

                    <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatBengaliDateTimeSafe(latestResult.publishedAt || latestResult.updatedAt)}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-black text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {latestResult.examTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                        <span>পরীক্ষার তারিখ: {latestResult.examDate}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-300 font-bold">
                        <Users className="h-3.5 w-3.5" />
                        <span>উত্তীর্ণ: {toBengaliDigits(latestResult.totalQualified)} জন</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectResult(latestResult)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
                  >
                    <span>ফলাফল ও রোল নম্বর যাচাই করুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center text-slate-300 text-xs space-y-2">
                  <Award className="h-8 w-8 mx-auto text-emerald-400 opacity-60" />
                  <p className="font-bold">বর্তমানে নতুন কোনো ফলাফল প্রকাশের অপেক্ষায় রয়েছে</p>
                  <p className="text-[11px] text-slate-400">এডমিন প্যানেল থেকে ফলাফল প্রকাশিত হলে এখানে দেখা যাবে।</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: RESULT DETAILS & ROLL SEARCH (When selected)   */}
        {/* ========================================================= */}
        {selectedResult && (
          <div
            id="roll-search-section"
            className="scroll-mt-6 bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn"
          >
            {/* Header of Search Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    ফলাফল অনুসন্ধান
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>পরীক্ষা অনুষ্ঠিত তারিখ - {selectedResult.examDate}</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {selectedResult.examTitle}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  মোট উত্তীর্ণ হয়েছেন: <strong className="text-emerald-600 dark:text-emerald-400">{toBengaliDigits(selectedResult.totalQualified)} জন</strong>। নিচে আপনার রোল নম্বর দিয়ে ফলাফল চেক করুন।
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="এই রেজাল্টের লিংক কপি করুন"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'কপি হয়েছে!' : 'শেয়ার লিংক'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>সকল ফলাফল</span>
                </button>
              </div>
            </div>

            {/* Grid: Search Input on Left, Related Results Sidebar on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 8 Cols: Input & Search Results */}
              <div className="lg:col-span-8 space-y-6">
                <form
                  onSubmit={handleSearchRollSubmit}
                  className="bg-slate-50 dark:bg-slate-800/60 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/70 space-y-4"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="roll-search-input"
                      className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <Search className="h-4 w-4 text-emerald-600" />
                        <span>আপনার রোল নম্বর লিখুন (Enter Roll Number)</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        বাংলা বা ইংরেজি যেকোনো সংখ্যা সমর্থিত
                      </span>
                    </label>

                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        id="roll-search-input"
                        type="text"
                        required
                        placeholder="যেমন: 383883 অথবা ৩৮৩৮৮৩"
                        value={inputRollNumber}
                        onChange={(e) => {
                          setInputRollNumber(e.target.value);
                          if (searchError) setSearchError(null);
                        }}
                        className="w-full px-4 sm:px-5 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-inner tracking-wider"
                      />

                      {inputRollNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputRollNumber('');
                            setSearchOutcome(null);
                            searchInputRef.current?.focus();
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {searchError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold text-center sm:text-left">
                      💡 রোল নম্বরের শুরুতে শূন্য (যেমন: 0123) থাকলে তা হুবহু টাইপ করুন।
                    </span>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      {/* Facebook Result Update Link */}
                      <a
                        href="https://www.facebook.com/medhaexam"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-5 py-3.5 bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/30 hover:border-[#1877F2] font-black text-xs sm:text-sm rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xs group cursor-pointer"
                        title="মেধা এক্সাম ফেসবুক পেজে যান ও দ্রুত রেজাল্ট আপডেট জানুন"
                      >
                        <Facebook className="h-4 w-4 fill-current shrink-0 group-hover:scale-110 transition-transform" />
                        <span>রেজাল্ট আপডেট জানুন</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                      </a>

                      {/* Submit: ফলাফল দেখুন */}
                      <button
                        type="submit"
                        disabled={isSearching || !inputRollNumber.trim()}
                        className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSearching ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>ফলাফল যাচাই করা হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4" />
                            <span>ফলাফল দেখুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* SEARCH OUTCOME: QUALIFIED (উত্তীর্ণ) */}
                {searchOutcome && searchOutcome.qualified && (
                  <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/30 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-5 animate-scaleUp shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-200 dark:border-emerald-800/60">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30">
                          🎉
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            অভিনন্দন! আপনি উত্তীর্ণ হয়েছেন
                          </span>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                            ফলাফল: <span className="text-emerald-600 dark:text-emerald-400">উত্তীর্ণ</span>
                          </h3>
                        </div>
                      </div>

                      <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs">
                        ✓ প্রকাশিত তালিকায় অন্তর্ভুক্ত
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                      🎉 অভিনন্দন! আপনার রোল নম্বরটি প্রকাশিত ফলাফলে পাওয়া গেছে। আপনি এই পরীক্ষায় উত্তীর্ণ হয়েছেন।
                    </p>

                    {/* Result Details Pill Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[11px] font-bold text-slate-400">পরীক্ষার শিরোনাম</span>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                          {searchOutcome.examTitle || selectedResult.examTitle}
                        </p>
                      </div>

                      <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[11px] font-bold text-slate-400">অনুষ্ঠিত তারিখ</span>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {searchOutcome.examDate || selectedResult.examDate}
                        </p>
                      </div>

                      <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[11px] font-bold text-slate-400">যাচাইকৃত রোল নম্বর</span>
                        <p className="text-sm sm:text-base font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-wider">
                          {searchOutcome.searchedRoll}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEARCH OUTCOME: NOT FOUND (ফলাফলে পাওয়া যায়নি) */}
                {searchOutcome && !searchOutcome.qualified && (
                  <div className="bg-slate-100/80 dark:bg-slate-850 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 animate-scaleUp shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-black">
                          ℹ️
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            ফলাফল যাচাই স্ট্যাটাস
                          </span>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                            স্ট্যাটাস: <span className="text-amber-600 dark:text-amber-400">ফলাফলে পাওয়া যায়নি</span>
                          </h3>
                        </div>
                      </div>

                      <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        তালিকাভুক্ত নয়
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                        দুঃখিত! আপনার দেওয়া রোল নম্বরটি প্রকাশিত ফলাফলে পাওয়া যায়নি।
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <strong className="text-amber-600 dark:text-amber-400">note:</strong> অনুগ্রহ করে রোল নম্বরটি সঠিকভাবে লিখেছেন কিনা এবং অ্যাডমিট কার্ডের রোল নম্বরের সাথে মিলিয়ে পুনরায় যাচাই করুন।
                      </p>
                    </div>

                    {/* Result Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400">পরীক্ষার শিরোনাম</span>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                          {searchOutcome.examTitle || selectedResult.examTitle}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400">অনুষ্ঠিত তারিখ</span>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {searchOutcome.examDate || selectedResult.examDate}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400">অনুসন্ধানকৃত রোল নম্বর</span>
                        <p className="text-sm sm:text-base font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5 tracking-wider">
                          {searchOutcome.searchedRoll}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right 4 Cols: RESULT-TO-RESULT NAVIGATION (অন্যান্য পরীক্ষার ফলাফল) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/70 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      <span>অন্যান্য পরীক্ষার ফলাফল</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      {toBengaliDigits(otherResults.length)} টি
                    </span>
                  </div>

                  {otherResults.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      অন্য কোনো ফলাফল এখনও প্রকাশিত হয়নি।
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                      {otherResults.map((other) => (
                        <button
                          key={other.id}
                          type="button"
                          onClick={() => handleSelectResult(other)}
                          className="w-full text-left p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all cursor-pointer group space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                              {other.examTitle}
                            </h4>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>পরীক্ষা অনুষ্ঠিত তারিখ - {other.examDate}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {toBengaliDigits(other.totalQualified)} জন উত্তীর্ণ
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 3: PUBLISHED RESULTS GRID LIST                    */}
        {/* ========================================================= */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  প্রকাশিত চাকরি পরীক্ষার ফলাফলসমূহ
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                যে পরীক্ষার ফলাফল দেখতে চান তার ওপর ক্লিক করে নির্দিষ্ট পেজে প্রবেশ করুন।
              </p>
            </div>

            {/* Quick in-page search box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="পরীক্ষার নাম দিয়ে খুঁজুন..."
                value={searchFilterQuery}
                onChange={(e) => setSearchFilterQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="h-7 w-7 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">ফলাফল তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                📋
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {searchFilterQuery
                  ? 'আপনার খোঁজা অনুযায়ী কোনো পরীক্ষার ফলাফল মেলেনি'
                  : 'বর্তমানে কোনো পরীক্ষার ফলাফল প্রকাশিত নেই'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                সরকারি নিয়োগ পরীক্ষার ফলাফল প্রস্তুত হওয়ার সাথে সাথে এখানে তালিকাভুক্ত করা হবে। নিয়মিত চেক করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResults.map((item) => {
                const isSelected = selectedResult?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border transition-all duration-300 flex flex-col justify-between gap-4 group hover:shadow-xl cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs'
                    }`}
                    onClick={() => handleSelectResult(item)}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>ফলাফল প্রকাশিত</span>
                        </span>

                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>পরীক্ষা অনুষ্ঠিত তারিখ - {item.examDate}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {item.examTitle}
                      </h3>

                      {/* Qualified Stat Box */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                          মোট উত্তীর্ণ পরীক্ষার্থী
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{toBengaliDigits(item.totalQualified)} জন</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {/* Result Share Button (replacing update date) */}
                      <button
                        type="button"
                        onClick={(e) => handleShareResultCard(e, item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                          copiedCardId === item.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                        }`}
                        title="এই পরীক্ষার ফলাফল শেয়ার করুন"
                      >
                        {copiedCardId === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>কপি হয়েছে!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>রেজাল্ট শেয়ার</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectResult(item);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Result দেখুন</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
