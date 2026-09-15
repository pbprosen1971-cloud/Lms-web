/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  XCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Trophy,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  Play,
  FileCheck,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { ExamResult, Question, UserProfile, WrongQuestionRecord } from '../types';
import {
  subscribeToUserWrongQuestions,
  updateWrongQuestionPracticeStatus
} from '../services/firestoreService';

interface WrongQuestionViewProps {
  user: UserProfile;
  setView: (view: string) => void;
  onExamSubmit?: (result: ExamResult) => void;
}

export default function WrongQuestionView({ user, setView, onExamSubmit }: WrongQuestionViewProps) {
  const [wrongRecords, setWrongRecords] = useState<WrongQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modes: 'overview' | 'practice' | 'exam-setup' | 'exam' | 'exam-result'
  const [mode, setMode] = useState<'overview' | 'practice' | 'exam-setup' | 'exam' | 'exam-result'>('overview');

  // Filter in overview: 'all' | 'unmastered' | 'mastered'
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmastered' | 'mastered'>('unmastered');

  // Active Practice State
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceSelectedAns, setPracticeSelectedAns] = useState<number | null>(null);
  const [practiceRevealed, setPracticeRevealed] = useState(false);

  // Exam Mode State
  const [examQuestionsCount, setExamQuestionsCount] = useState<number | 'all'>(10);
  const [examQuestions, setExamQuestions] = useState<WrongQuestionRecord[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examTimeLeft, setExamTimeLeft] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examResultData, setExamResultData] = useState<{
    score: number;
    total: number;
    correct: number;
    wrong: number;
  } | null>(null);

  const examTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to user's wrong questions in Firestore
  useEffect(() => {
    const uid = user.id || user.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToUserWrongQuestions(uid, (records) => {
      setWrongRecords(records);
      setLoading(false);
    });

    return () => unsub();
  }, [user.id, user.uid]);

  // Filtered list for practice & overview
  const displayedRecords = useMemo(() => {
    if (statusFilter === 'all') return wrongRecords;
    return wrongRecords.filter((r) => r.status === statusFilter);
  }, [wrongRecords, statusFilter]);

  const unmasteredCount = useMemo(() => {
    return wrongRecords.filter((r) => r.status === 'unmastered').length;
  }, [wrongRecords]);

  const masteredCount = useMemo(() => {
    return wrongRecords.filter((r) => r.status === 'mastered').length;
  }, [wrongRecords]);

  // --- PRACTICE MODE HANDLERS ---
  const handleStartPractice = () => {
    if (displayedRecords.length === 0) return;
    setPracticeIdx(0);
    setPracticeSelectedAns(null);
    setPracticeRevealed(false);
    setMode('practice');
  };

  const handlePracticeSelectOption = async (optIdx: number) => {
    if (practiceRevealed) return;
    const currentQ = displayedRecords[practiceIdx];
    if (!currentQ) return;

    setPracticeSelectedAns(optIdx);
    setPracticeRevealed(true);

    const isCorrect = optIdx === currentQ.correctAnswer;
    const uid = user.id || user.uid;

    try {
      await updateWrongQuestionPracticeStatus(uid, currentQ.questionId, isCorrect);
    } catch (e) {
      console.warn('Failed to update wrong question status:', e);
    }
  };

  const handlePracticeNext = () => {
    if (practiceIdx < displayedRecords.length - 1) {
      setPracticeIdx((prev) => prev + 1);
      setPracticeSelectedAns(null);
      setPracticeRevealed(false);
    } else {
      // Finished all practice
      setMode('overview');
    }
  };

  // --- EXAM MODE HANDLERS ---
  const handleStartExamSetup = () => {
    setMode('exam-setup');
  };

  const handleLaunchExam = (countChoice: number | 'all') => {
    // Pick from unmastered questions first, fallback to all wrong questions
    const pool = unmasteredCount > 0 ? wrongRecords.filter((r) => r.status === 'unmastered') : wrongRecords;

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const count = countChoice === 'all' ? shuffled.length : Math.min(countChoice, shuffled.length);
    const selected = shuffled.slice(0, count);

    setExamQuestions(selected);
    setExamIdx(0);
    setExamAnswers({});
    setExamSubmitted(false);
    // 1 minute per question
    setExamTimeLeft(count * 60);
    setMode('exam');
  };

  // Exam timer
  useEffect(() => {
    if (mode === 'exam' && !examSubmitted) {
      examTimerRef.current = setInterval(() => {
        setExamTimeLeft((prev) => {
          if (prev <= 1) {
            handleExamFinalSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    };
  }, [mode, examSubmitted, examQuestions, examAnswers]);

  const handleExamSelectOption = (optIdx: number) => {
    if (examSubmitted) return;
    const currentQ = examQuestions[examIdx];
    if (!currentQ) return;
    setExamAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: optIdx,
    }));
  };

  const handleExamFinalSubmit = async () => {
    if (examTimerRef.current) clearInterval(examTimerRef.current);
    setExamSubmitted(true);

    let correctCount = 0;
    let wrongCount = 0;
    const uid = user.id || user.uid;

    for (const q of examQuestions) {
      const ans = examAnswers[q.questionId];
      const isCorrect = ans === q.correctAnswer;
      if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      // Update question status in background
      if (ans !== undefined) {
        updateWrongQuestionPracticeStatus(uid, q.questionId, isCorrect).catch(console.warn);
      }
    }

    setExamResultData({
      score: correctCount,
      total: examQuestions.length,
      correct: correctCount,
      wrong: wrongCount,
    });

    setMode('exam-result');
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">ভুল প্রশ্ন ব্যাংক লোড হচ্ছে...</h2>
        <p className="text-xs text-slate-400">অনুগ্রহ করে একটু অপেক্ষা করুন</p>
      </div>
    );
  }

  // ==========================================
  // 1. PRACTICE MODE (One by one interactive)
  // ==========================================
  if (mode === 'practice') {
    const currentQ = displayedRecords[practiceIdx];

    if (!currentQ) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">অনুশীলন সম্পন্ন হয়েছে!</h2>
          <p className="text-xs text-slate-500">নির্বাচিত সব প্রশ্নের অনুশীলন শেষ হয়েছে।</p>
          <button
            onClick={() => setMode('overview')}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl"
          >
            তালিকায় ফিরুন
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Practice Header */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md uppercase">
              ভুল প্রশ্ন অনুশীলন
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              প্রশ্ন: {practiceIdx + 1} / {displayedRecords.length}
            </h1>
          </div>
          <button
            onClick={() => setMode('overview')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white text-xs font-bold rounded-xl transition-all"
          >
            বের হয়ে যান
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${((practiceIdx + 1) / displayedRecords.length) * 100}%` }}
          ></div>
        </div>

        {/* Interactive Question Card */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">টপিক: {currentQ.subject}</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                ভুল করেছিলেন: {currentQ.wrongCount} বার
              </span>
            </div>
            {currentQ.status === 'mastered' && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded flex items-center gap-1">
                <Check className="h-3 w-3" /> মাস্টার্ড
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQ.questionText}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = practiceSelectedAns === optIdx;
              const isCorrect = optIdx === currentQ.correctAnswer;

              let btnStyle = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

              if (practiceRevealed) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600 font-bold';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-600 line-through';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handlePracticeSelectOption(optIdx)}
                  className={`w-full p-4 border rounded-xl text-left text-sm sm:text-base font-medium flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                      {optionLabels[optIdx]}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {practiceRevealed && isCorrect && <Check className="h-5 w-5 text-emerald-600 shrink-0" />}
                  {practiceRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {practiceRevealed && (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  সঠিক উত্তর: {optionLabels[currentQ.correctAnswer]} ({currentQ.options[currentQ.correctAnswer]})
                </span>
                {practiceSelectedAns === currentQ.correctAnswer ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                    🎉 সঠিক উত্তর! স্ট্যাটাস আপডেট হয়েছে।
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded">
                    ভুল উত্তর! আবার স্মরণ রাখুন।
                  </span>
                )}
              </div>
              {currentQ.explanation && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                  <strong>ব্যাখ্যা:</strong> {currentQ.explanation}
                </p>
              )}
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              disabled={!practiceRevealed}
              onClick={handlePracticeNext}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <span>{practiceIdx < displayedRecords.length - 1 ? 'পরবর্তী প্রশ্ন' : 'অনুশীলন সমাপ্ত করুন'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. EXAM SETUP MODE (Select count)
  // ==========================================
  if (mode === 'exam-setup') {
    const totalAvail = wrongRecords.length;
    const countOptions: (number | 'all')[] = [10, 20, 50, 'all'];

    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <FileCheck className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              ভুল প্রশ্ন পরীক্ষা (Exam Mode)
            </h1>
            <p className="text-xs text-slate-400">
              আপনার অতীতের ভুল প্রশ্নগুলো দিয়ে একটি রিয়েল-টাইম টেস্ট দিন।
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-semibold">আপনার মোট ভুল প্রশ্ন</span>
            <div className="text-2xl font-black text-rose-600">{totalAvail} টি</div>
            <span className="text-[11px] text-slate-400 block">
              অংশগ্রহণের জন্য প্রশ্নের সংখ্যা নির্বাচন করুন:
            </span>
          </div>

          {/* Option Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {countOptions.map((opt) => {
              const isAll = opt === 'all';
              const reqCount = isAll ? totalAvail : (opt as number);
              // Only enable if available or if at least 1 question
              const isEnabled = totalAvail >= reqCount || (isAll && totalAvail > 0);

              return (
                <button
                  key={String(opt)}
                  disabled={!isEnabled}
                  onClick={() => handleLaunchExam(opt)}
                  className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                    isEnabled
                      ? 'bg-white dark:bg-slate-700 hover:border-primary hover:text-primary dark:hover:border-primary cursor-pointer shadow-sm hover:-translate-y-0.5'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <span className="block text-lg">
                    {isAll ? 'সবগুলো' : opt}
                  </span>
                  <span className="text-[10px] block opacity-75 font-normal">
                    {isAll ? `${totalAvail} টি` : `${opt} টি প্রশ্ন`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              onClick={() => setMode('overview')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
            >
              বাতিল করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. EXAM ACTIVE MODE
  // ==========================================
  if (mode === 'exam') {
    const currentQ = examQuestions[examIdx];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Exam Header with Timer */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md uppercase">
              ভুল প্রশ্ন মডেল টেস্ট
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              প্রশ্ন {examIdx + 1} / {examQuestions.length}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 font-mono text-sm font-bold">
            <Clock className="h-4 w-4" />
            <span>অবশিষ্ট সময়: {formatTimer(examTimeLeft)}</span>
          </div>
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3">
              <span className="text-xs font-bold text-slate-400">বিষয়: {currentQ.subject}</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                উত্তর প্রদান: {Object.keys(examAnswers).length} / {examQuestions.length}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.questionText}
            </h2>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = examAnswers[currentQ.questionId] === optIdx;

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleExamSelectOption(optIdx)}
                    className={`w-full p-4 border rounded-xl text-left text-sm sm:text-base font-medium flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary dark:bg-emerald-950/40 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {optionLabels[optIdx]}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation & Submit */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700/60">
              <button
                disabled={examIdx === 0}
                onClick={() => setExamIdx((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> পূর্ববর্তী
              </button>

              {examIdx < examQuestions.length - 1 ? (
                <button
                  onClick={() => setExamIdx((prev) => Math.min(examQuestions.length - 1, prev + 1))}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  পরবর্তী <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleExamFinalSubmit}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md"
                >
                  <Check className="h-4 w-4" /> পরীক্ষা জমা দিন
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Numbers Map */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-center gap-2">
          {examQuestions.map((q, idx) => {
            const isAnswered = examAnswers[q.questionId] !== undefined;
            const isCurrent = idx === examIdx;

            let btnClass = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
            if (isCurrent) {
              btnClass = 'ring-2 ring-primary bg-primary text-white font-bold';
            } else if (isAnswered) {
              btnClass = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold';
            }

            return (
              <button
                key={q.questionId}
                onClick={() => setExamIdx(idx)}
                className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center transition-all ${btnClass}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. EXAM RESULT MODE
  // ==========================================
  if (mode === 'exam-result' && examResultData) {
    const percentage = Math.round((examResultData.score / examResultData.total) * 100);

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm p-6 sm:p-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
            <Trophy className="h-4 w-4" />
            <span>ভুল প্রশ্ন পরীক্ষার ফলাফল</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            ফলাফল সারাংশ
          </h1>

          <div className="max-w-xs mx-auto p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">অর্জিত মার্কস</span>
            <div className="text-4xl font-black text-primary">
              {examResultData.score} / {examResultData.total}
            </div>
            <span className="text-xs font-bold text-slate-500">
              নির্ভুলতা: {percentage}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 block">{examResultData.correct}</span>
              <span className="text-[10px] text-slate-400 font-semibold">সঠিক (মাস্টার্ড হয়েছে)</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
              <XCircle className="h-5 w-5 text-rose-500 mx-auto mb-1" />
              <span className="text-lg font-black text-rose-700 dark:text-rose-400 block">{examResultData.wrong}</span>
              <span className="text-[10px] text-slate-400 font-semibold">ভুল রয়ে গেছে</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              onClick={() => setMode('overview')}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm rounded-xl shadow-md"
            >
              তালিকায় ফিরে যান
            </button>
            <button
              onClick={() => setView('dashboard')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white font-bold text-xs sm:text-sm rounded-xl"
            >
              ড্যাশবোর্ডে ফিরুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. OVERVIEW DASHBOARD MODE
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-rose-100 text-xs font-semibold">
            <XCircle className="h-3.5 w-3.5" />
            <span>ভুল প্রশ্ন ব্যাংক</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            ভুল প্রশ্ন অনুশীলন (Wrong Questions)
          </h1>
          <p className="text-rose-100 text-xs sm:text-sm max-w-xl">
            আপনি বিভিন্ন পরীক্ষায় যেসব প্রশ্ন ভুল করেছেন, সেগুলো এখানে সংরক্ষিত থাকে যাতে পুনরায় অনুশীলন করে নিজের ভুল শুধরে নিতে পারেন।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
          <button
            disabled={wrongRecords.length === 0}
            onClick={handleStartPractice}
            className="px-5 py-3 bg-white hover:bg-rose-50 text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
          >
            <BookOpen className="h-4 w-4" /> অনুশীলন শুরু করুন
          </button>
          <button
            disabled={wrongRecords.length === 0}
            onClick={handleStartExamSetup}
            className="px-5 py-3 bg-rose-950/40 hover:bg-rose-950/60 border border-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <FileCheck className="h-4 w-4" /> মডেল টেস্ট দিন
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">মোট ভুল প্রশ্ন</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{wrongRecords.length} টি</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">এখনও ভুল (Unmastered)</span>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">{unmasteredCount} টি</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">সংশোধিত (Mastered)</span>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{masteredCount} টি</h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('unmastered')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'unmastered'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ভুল প্রশ্নসমূহ ({unmasteredCount})
          </button>
          <button
            onClick={() => setStatusFilter('mastered')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'mastered'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            সংশোধিত/মাস্টার্ড ({masteredCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            সবগুলো ({wrongRecords.length})
          </button>
        </div>

        <button
          onClick={() => setView('dashboard')}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          ড্যাশবোর্ডে ফিরুন
        </button>
      </div>

      {/* List of Questions */}
      {displayedRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {statusFilter === 'unmastered' ? 'কোনো অমীমাংসিত ভুল প্রশ্ন নেই!' : 'কোনো প্রশ্ন পাওয়া যায়নি।'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            পরীক্ষায় ভুল হওয়া প্রশ্নগুলো স্বয়ংক্রিয়ভাবে এখানে যুক্ত হবে। কোনো পরীক্ষায় অংশ নিয়ে প্রস্তুতি যাচাই করুন।
          </p>
          <button
            onClick={() => setView('dashboard')}
            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm"
          >
            ড্যাশবোর্ডে পরীক্ষা দিন
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRecords.map((item, idx) => (
            <div
              key={item.questionId}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{item.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                    ভুল হয়েছে: {item.wrongCount} বার
                  </span>
                  {item.status === 'mastered' ? (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      মাস্টার্ড
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      অমীমাংসিত
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                {item.questionText}
              </h4>

              {/* Options mini view */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {item.options.map((opt, optIdx) => {
                  const isRight = optIdx === item.correctAnswer;
                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 border rounded-xl flex items-center justify-between ${
                        isRight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800 font-bold'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                          {optionLabels[optIdx]}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isRight && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {item.explanation && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-primary block mb-0.5">সঠিক উত্তর ও ব্যাখ্যা:</strong>
                  {item.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
