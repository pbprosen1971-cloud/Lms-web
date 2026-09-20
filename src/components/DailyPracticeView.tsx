/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Trophy,
  ChevronRight,
  Check,
  Award,
  AlertCircle,
  Lock,
  BookOpen
} from 'lucide-react';
import { DailyPracticeSession, Exam, Question, UserProfile } from '../types';
import {
  getOrCreateDailyPracticeSession,
  saveDailyPracticeResult,
  recordWrongQuestions,
  fetchQuestionBankPool,
  getDailyPracticeDateKey
} from '../services/firestoreService';

interface DailyPracticeViewProps {
  user: UserProfile;
  exams: Exam[];
  setView: (view: string) => void;
}

export default function DailyPracticeView({ user, exams, setView }: DailyPracticeViewProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<DailyPracticeSession | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showReview, setShowReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten all available questions from passed exams
  const availableQuestionsFromExams = useMemo(() => {
    const list: Question[] = [];
    const seenIds = new Set<string>();

    if (Array.isArray(exams)) {
      exams.forEach((exam) => {
        // Avoid upcoming secret exams
        if (exam.status === 'upcoming') return;
        if (exam.questions && exam.questions.length > 0) {
          exam.questions.forEach((q) => {
            if (!seenIds.has(q.id)) {
              seenIds.add(q.id);
              list.push({
                ...q,
                subject: q.subject || exam.subject,
              });
            }
          });
        }
      });
    }

    return list;
  }, [exams]);

  // Load or generate today's session with date-based key and user-specific record
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setLoading(true);
      const uid = user.id || (user as any).uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        // Fetch question bank pool combining Firestore, Ministry Banks, and system exams
        let pool = availableQuestionsFromExams;
        if (pool.length < 10) {
          try {
            pool = await fetchQuestionBankPool(exams);
          } catch (e) {
            console.warn('Error fetching question bank pool, using local questions:', e);
          }
        }

        // Get existing or create new session stored under user-specific daily record (userId_YYYY-MM-DD)
        const loadedSession = await getOrCreateDailyPracticeSession(uid, pool);
        
        if (isMounted) {
          setSession(loadedSession);
          if (loadedSession.completed) {
            setSubmitted(true);
            setIsAlreadyCompleted(true);
            if (loadedSession.answers) {
              setAnswers(loadedSession.answers);
            }
            if (typeof loadedSession.timeSpentSeconds === 'number') {
              setTimerSeconds(loadedSession.timeSpentSeconds);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing daily practice session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [user.id, (user as any).uid, availableQuestionsFromExams, exams]);

  // Timer while practicing
  useEffect(() => {
    if (!submitted && !loading && session && !session.completed) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitted, loading, session]);

  const questions = session?.questions || [];
  const currentQuestion = questions[currentIdx];
  const currentDateKey = session?.dateKey || getDailyPracticeDateKey();
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const handleSelectOption = (optIdx: number) => {
    if (submitted || isAlreadyCompleted) return;
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optIdx,
    }));

    // Automatically advance to the next question after brief feedback (300ms)
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    if (currentIdx < questions.length - 1) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1));
      }, 300);
    }
  };

  const handlePromptSubmit = () => {
    setShowConfirmSubmit(true);
  };

  const handleFinalSubmit = async () => {
    if (!session || questions.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    let wrongCount = 0;
    const wrongList: { question: Question; subject?: string }[] = [];

    questions.forEach((q) => {
      const selected = answers[q.id];
      if (selected !== undefined) {
        if (selected === q.correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
          wrongList.push({ question: q, subject: q.subject });
        }
      } else {
        wrongCount++;
        wrongList.push({ question: q, subject: q.subject });
      }
    });

    const updatedSession: DailyPracticeSession = {
      ...session,
      completed: true,
      score: correctCount,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      timeSpentSeconds: timerSeconds,
      answers: answers,
      completedAt: new Date().toISOString(),
    };

    setSession(updatedSession);
    setSubmitted(true);
    setShowConfirmSubmit(false);

    // Save to Firestore under the user-specific daily record to prevent any further attempts today
    try {
      await saveDailyPracticeResult(updatedSession);
    } catch (e) {
      console.warn('Error saving daily practice result:', e);
    } finally {
      setIsSubmitting(false);
    }

    // Auto-record wrong questions from Daily Practice into user's Wrong Question Bank
    if (wrongList.length > 0) {
      const uid = user.id || (user as any).uid;
      recordWrongQuestions(uid, wrongList).catch((err) => {
        console.warn('Error recording wrong questions from daily practice:', err);
      });
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">আজকের ডেইলি প্র্যাকটিস লোড হচ্ছে...</h2>
        <p className="text-xs text-slate-400">প্রশ্ন ব্যাংক থেকে ১০টি প্রশ্ন নির্বাচন করা হচ্ছে</p>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">ডেইলি প্র্যাকটিস প্রশ্ন পাওয়া যায়নি</h2>
        <p className="text-xs text-slate-500">প্রশ্ন ব্যাংকে পর্যাপ্ত প্রশ্ন যুক্ত নেই। অনুগ্রহ করে কিছু সময় পর আবার চেষ্টা করুন।</p>
        <button
          onClick={() => setView('dashboard')}
          className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm"
        >
          ড্যাশবোর্ডে ফিরুন
        </button>
      </div>
    );
  }

  // Result Summary View (When finished or when already completed today)
  if (submitted && !showReview) {
    const score = session.score ?? 0;
    const total = session.totalQuestions || 10;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const correct = session.correctAnswers ?? score;
    const wrong = session.wrongAnswers ?? (total - correct);
    const timeSpent = session.timeSpentSeconds ?? timerSeconds;

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Single attempt constraint badge / alert */}
        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  আজকের ক্যালেন্ডার দিনের অনুশীলন সম্পন্ন
                </span>
                <span className="text-[11px] font-mono font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full">
                  তারিখ কী: {currentDateKey}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                প্রতি ক্যালেন্ডার দিনে শিক্ষার্থীদের জন্য শুধুমাত্র <strong>একটি একক প্রচেষ্টার (Single Attempt)</strong> সুযোগ নির্ধারিত। আপনি আজকের ১০টি প্রশ্নের অনুশীলন সফলভাবে শেষ করেছেন।
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold pt-0.5">
                পরবর্তী দৈনিক অনুশীলন আগামীকাল নতুন ১০টি বাছাইকৃত প্রশ্ন নিয়ে স্বয়ংক্রিয়ভাবে উপলব্ধ হবে।
              </p>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm p-6 sm:p-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
            <Sparkles className="h-4 w-4" />
            <span>দৈনিক অনুশীলন ফলাফল ও মূল্যায়ন</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            ফলাফল সারাংশ
          </h1>

          <p className="text-xs text-slate-400">
            শিক্ষার্থী: {user.name || user.fullName} • তারিখ: {new Date().toLocaleDateString('bn-BD')}
          </p>

          {/* Big Score Box */}
          <div className="max-w-xs mx-auto p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">আপনার স্কোর</span>
            <div className="text-4xl font-black text-primary">
              {score} / {total}
            </div>
            <span className="text-xs font-bold text-slate-500">
              নির্ভুলতা (Accuracy): {percentage}%
            </span>
          </div>

          {/* Stats 3 Columns */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 block">{correct}</span>
              <span className="text-[10px] text-slate-400 font-semibold">সঠিক উত্তর</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
              <XCircle className="h-5 w-5 text-rose-500 mx-auto mb-1" />
              <span className="text-lg font-black text-rose-700 dark:text-rose-400 block">{wrong}</span>
              <span className="text-[10px] text-slate-400 font-semibold">ভুল উত্তর</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
              <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <span className="text-lg font-black text-blue-700 dark:text-blue-400 block">{formatTimer(timeSpent)}</span>
              <span className="text-[10px] text-slate-400 font-semibold">ব্যয়িত সময়</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500 max-w-md mx-auto bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-3 rounded-xl">
            💡 <strong>মনে রাখবেন:</strong> যেকোনো ভুল উত্তর স্বয়ংক্রিয়ভাবে আপনার <strong>"ভুল প্রশ্ন অনুশীলন" (Wrong Question Practice)</strong> সংগ্রহে যুক্ত হয়েছে।
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              onClick={() => setShowReview(true)}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              <span>উত্তরপত্র রিভিউ দেখুন (Review Solutions)</span>
            </button>
            <button
              onClick={() => setView('dashboard')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
            >
              ড্যাশবোর্ডে ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Answer Review Mode
  if (submitted && showReview) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase">উত্তরপত্র পর্যালোচনা</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {currentDateKey}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              আজকের ১০টি প্রশ্নের সঠিক সমাধান ও ব্যাখ্যা
            </h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowReview(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              ফলাফল সামারি
            </button>
            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl"
            >
              ড্যাশবোর্ড
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctAnswer;
            const isSkipped = userAns === undefined;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{q.subject}</span>
                  </div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3.5 w-3.5" /> সঠিক
                    </span>
                  ) : isSkipped ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                      <HelpCircle className="h-3.5 w-3.5" /> উত্তর দেননি
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">
                      <XCircle className="h-3.5 w-3.5" /> ভুল
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                  {q.text}
                </h3>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isUserPick = userAns === optIdx;
                    const isRightAnswer = optIdx === q.correctAnswer;

                    let badgeClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';

                    if (isRightAnswer) {
                      badgeClass = 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 font-bold';
                    } else if (isUserPick && !isRightAnswer) {
                      badgeClass = 'bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700 line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 border rounded-xl text-xs sm:text-sm flex items-center justify-between ${badgeClass}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                            {optionLabels[optIdx]}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isRightAnswer && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-primary block">ব্যাখ্যা:</span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={() => setView('dashboard')}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md"
          >
            ড্যাশবোর্ডে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  // Active Practice Question Mode
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase">
              📅 দৈনিক অনুশীলন
            </span>
            <span className="text-xs font-semibold text-slate-400">
              তারিখ: {new Date().toLocaleDateString('bn-BD')} (Key: {currentDateKey})
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            আজকের ১০টি নির্বাচিত প্রশ্ন
          </h1>
          <p className="text-xs text-slate-500">
            প্রতি ক্যালেন্ডার দিনে একটিমাত্র প্রচেষ্টা অনুমোদিত। মনোযোগ দিয়ে সমাধান করুন।
          </p>
        </div>

        {/* Live Timer */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 shrink-0 font-mono text-sm font-bold">
          <Clock className="h-4 w-4 text-primary" />
          <span>সময়: {formatTimer(timerSeconds)}</span>
        </div>
      </div>

      {/* Progress Bar & Question Counter */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-500">
            প্রশ্ন: {currentIdx + 1} / {questions.length}
          </span>
          <span className="text-primary">
            উত্তর প্রদান: {answeredCount} / {questions.length}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Main Question Card */}
      {currentQuestion && (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3">
            <span className="text-xs font-bold text-slate-400">প্রশ্ন নম্বর {currentIdx + 1}</span>
            <span className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
              বিষয়: {currentQuestion.subject}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQuestion.text}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = answers[currentQuestion.id] === optIdx;

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-4 border rounded-xl text-left text-sm sm:text-base font-medium flex items-center gap-3 transition-all transform active:scale-[0.99] ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary dark:bg-emerald-950/40 shadow-sm font-semibold'
                      : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {optionLabels[optIdx]}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation & Submit controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700/60">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> পূর্ববর্তী
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                পরবর্তী <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handlePromptSubmit}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-md transform hover:-translate-y-0.5"
              >
                <Check className="h-4 w-4" /> উত্তরপত্র জমা দিন
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Numbers Map */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-center gap-2">
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = idx === currentIdx;

          let btnClass = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
          if (isCurrent) {
            btnClass = 'ring-2 ring-primary bg-primary text-white font-bold';
          } else if (isAnswered) {
            btnClass = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold';
          }

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center transition-all ${btnClass}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                উত্তরপত্র জমা দেওয়ার নিশ্চিতকরণ
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              আপনি ১০টি প্রশ্নের মধ্যে <strong>{answeredCount}টির</strong> উত্তর প্রদান করেছেন
              {unansweredCount > 0 ? ` এবং ${unansweredCount}টি উত্তর দেননি` : ''}।
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> মনে রাখবেন:
              </span>
              <p>
                জমা দেওয়ার পর আজকের ক্যালেন্ডার দিনের (Date: {currentDateKey}) পরীক্ষা চূড়ান্তভাবে সমাপ্ত হবে। আজকের জন্য আর পুনরায় পরীক্ষা দেওয়ার সুযোগ থাকবে না।
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
              >
                ফিরে যান ও উত্তর দিন
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>জমা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>হ্যাঁ, জমা দিন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
