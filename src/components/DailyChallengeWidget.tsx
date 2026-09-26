/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Share2,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Award,
  Check,
  Loader2
} from 'lucide-react';
import { Question } from '../types';
import { fetchDailyChallengeQuestion } from '../services/firestoreService';
import confetti from 'canvas-confetti';

interface DailyChallengeWidgetProps {
  onStartExam?: (examId?: string) => void;
  className?: string;
}

export const DailyChallengeWidget: React.FC<DailyChallengeWidgetProps> = ({
  onStartExam,
  className = ''
}) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [sourceExamTitle, setSourceExamTitle] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(1);
  const [hasCompletedToday, setHasCompletedToday] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [questionsAnsweredSession, setQuestionsAnsweredSession] = useState<number>(0);

  // Format today's date in Bangla for display
  const getBanglaDateDisplay = () => {
    const today = new Date();
    const bnMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const bnDigits: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    const day = today.getDate().toString().replace(/\d/g, d => bnDigits[d] || d);
    const month = bnMonths[today.getMonth()];
    const year = today.getFullYear().toString().replace(/\d/g, d => bnDigits[d] || d);
    return `${day} ${month}, ${year}`;
  };

  // Convert numbers to Bangla digits
  const toBanglaNumber = (num: number) => {
    const bnDigits: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return num.toString().replace(/\d/g, d => bnDigits[d] || d);
  };

  // Bengali option markers
  const optionPrefixes = ['ক', 'খ', 'গ', 'ঘ', 'ঙ'];

  // Initialize streak & date state
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('medha_daily_streak_date');
      const savedStreak = parseInt(localStorage.getItem('medha_daily_streak_count') || '1', 10);
      
      setStreak(isNaN(savedStreak) || savedStreak < 1 ? 1 : savedStreak);

      if (savedDate === todayStr) {
        setHasCompletedToday(true);
      } else if (savedDate) {
        // Check if savedDate was yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().split('T')[0];
        if (savedDate !== yestStr) {
          // Streak broken
          setStreak(1);
          localStorage.setItem('medha_daily_streak_count', '1');
        }
      }
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Fetch question from Firebase
  const loadQuestion = useCallback(async (isRandomShuffle = false) => {
    setLoading(true);
    setError(null);
    setSelectedOption(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      // If not random shuffle, seed with today's date for daily challenge consistency
      const seed = isRandomShuffle ? undefined : todayStr;
      const res = await fetchDailyChallengeQuestion(seed);

      if (res && res.question) {
        setQuestion(res.question);
        setSourceExamTitle(res.sourceExamTitle);
      } else {
        setError('ডাটাবেজে বর্তমানে কোনো প্রশ্ন পাওয়া যায়নি।');
      }
    } catch (err) {
      console.error('Error in DailyChallengeWidget loadQuestion:', err);
      setError('প্রশ্নটি লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestion(false);
  }, [loadQuestion]);

  // Trigger celebratory particle explosion across the whole website display
  const triggerCelebrationParticles = () => {
    try {
      const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6', '#FBBF24', '#06B6D4'];

      // 1. Immediate vibrant burst from center/widget area
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.55 },
        colors,
        zIndex: 99999,
        scalar: 1.1,
      });

      // 2. High-spread side fireworks cannons for 3.2 seconds
      const duration = 3200;
      const animationEnd = Date.now() + duration;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 45 * (timeLeft / duration);

        // Cannon from left
        confetti({
          particleCount: Math.floor(particleCount),
          angle: 60,
          spread: 75,
          origin: { x: 0, y: 0.75 },
          colors,
          zIndex: 99999,
        });

        // Cannon from right
        confetti({
          particleCount: Math.floor(particleCount),
          angle: 120,
          spread: 75,
          origin: { x: 1, y: 0.75 },
          colors,
          zIndex: 99999,
        });

        // Top sky shower
        confetti({
          particleCount: Math.floor(particleCount * 0.4),
          spread: 100,
          origin: { x: Math.random(), y: 0.05 },
          colors,
          zIndex: 99999,
        });
      }, 250);
    } catch (err) {
      console.warn('Particle celebration error:', err);
    }
  };

  // Handle option selection
  const handleSelectOption = (index: number) => {
    if (selectedOption !== null || !question) return; // Prevent multiple answers on same question

    setSelectedOption(index);
    setQuestionsAnsweredSession(prev => prev + 1);

    const isCorrect = index === question.correctAnswer;
    if (isCorrect) {
      // Trigger full website display celebration particles
      triggerCelebrationParticles();

      // Update streak
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const savedDate = localStorage.getItem('medha_daily_streak_date');
        let currentStreak = parseInt(localStorage.getItem('medha_daily_streak_count') || '1', 10);
        if (isNaN(currentStreak) || currentStreak < 1) currentStreak = 1;

        if (savedDate !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yestStr = yesterday.toISOString().split('T')[0];

          const newStreak = savedDate === yestStr ? currentStreak + 1 : 1;
          setStreak(newStreak);
          setHasCompletedToday(true);
          localStorage.setItem('medha_daily_streak_date', todayStr);
          localStorage.setItem('medha_daily_streak_count', newStreak.toString());
        }
      } catch {
        // ignore
      }
    }
  };

  // Share challenge question
  const handleShare = async () => {
    if (!question) return;
    const shareText = `🎯 আজকের মেধা ডেইলি চ্যালেঞ্জ (${getBanglaDateDisplay()}):\n` +
      `প্রশ্ন: ${question.text}\n` +
      question.options.map((opt, i) => `${optionPrefixes[i] || i + 1}) ${opt}`).join('\n') +
      `\n\nসঠিক উত্তর জানতে ও নিজেকে যাচাই করতে ভিজিট করুন মেধা এক্সাম পোর্টাল!`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        alert(shareText);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      id="daily-challenge-widget"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 p-5 sm:p-6 transition-all duration-300 ${className}`}
    >
      {/* Subtle glowing ambient accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Bar: Badge + Streak Counter + Date */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-300 shadow-sm">
            <Flame className="h-4 w-4 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
            <span>দৈনিক চ্যালেঞ্জ</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            {getBanglaDateDisplay()}
          </span>
        </div>

        {/* Streak Counter Chip */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/80 border border-slate-700 text-slate-200 shadow-sm"
            title="প্রতিদিন ১টি প্রশ্ন উত্তর দিয়ে স্ট্রিক বজায় রাখুন"
          >
            <span className="text-amber-400">🔥</span>
            <span>{toBanglaNumber(streak)} দিনের স্ট্রিক</span>
          </div>

          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs flex items-center gap-1"
            title="বন্ধুদের সাথে প্রশ্ন শেয়ার করুন"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-bold">কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[10px]">শেয়ার</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-300">
            আজকের চ্যালেঞ্জ প্রশ্ন লোড হচ্ছে...
          </p>
        </div>
      )}

      {/* 3. Error State */}
      {!loading && error && (
        <div className="py-8 text-center space-y-3">
          <HelpCircle className="h-10 w-10 text-amber-400 mx-auto opacity-80" />
          <p className="text-sm text-slate-300 font-medium">{error}</p>
          <button
            onClick={() => loadQuestion(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            <RotateCcw className="h-3.5 w-3.5" /> পুনরায় লোড করুন
          </button>
        </div>
      )}

      {/* 4. Question & Interactive Options Display */}
      {!loading && !error && question && (
        <div className="relative z-10 pt-4 space-y-4 text-left">
          {/* Category & Exam Title info */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              {question.subject || 'সাধারণ জ্ঞান ও চাকরি প্রস্তুতি'}
            </span>

            {sourceExamTitle && (
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]" title={sourceExamTitle}>
                উৎস: {sourceExamTitle}
              </span>
            )}
          </div>

          {/* Question Text */}
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold text-emerald-400 tracking-wider uppercase">
              আজকের প্রশ্ন:
            </span>
            <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {question.text}
            </p>
          </div>

          {/* Options List */}
          <div className="space-y-2.5 pt-1">
            {question.options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              const isAnswered = selectedOption !== null;
              const isCorrectOption = idx === question.correctAnswer;

              let btnStyle = 'border-slate-700/80 bg-slate-900/90 text-slate-100 hover:border-emerald-400 hover:bg-slate-800/90 hover:text-white';

              if (isAnswered) {
                if (isCorrectOption) {
                  btnStyle = 'border-emerald-400 bg-emerald-950/90 text-emerald-100 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/20';
                } else if (isSelected && !isCorrectOption) {
                  btnStyle = 'border-rose-400 bg-rose-950/90 text-rose-100 ring-2 ring-rose-400/60 shadow-lg shadow-rose-500/20';
                } else {
                  btnStyle = 'border-slate-800 bg-slate-950/60 text-slate-400 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-3.5 rounded-xl border font-medium text-sm transition-all duration-200 flex items-center justify-between group ${
                    isAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                  } ${btnStyle}`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        isAnswered && isCorrectOption
                          ? 'border-emerald-300 bg-emerald-500 text-slate-950 font-black'
                          : isAnswered && isSelected && !isCorrectOption
                          ? 'border-rose-300 bg-rose-500 text-white font-black'
                          : 'border-slate-600 bg-slate-950 text-slate-200 group-hover:border-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950'
                      }`}
                    >
                      {optionPrefixes[idx] || idx + 1}
                    </span>
                    <span className="font-semibold text-slate-100 group-hover:text-white">
                      {optionText}
                    </span>
                  </span>

                  {/* Feedback icon */}
                  {isAnswered && (
                    <div className="shrink-0 ml-2">
                      {isCorrectOption ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>সঠিক</span>
                        </span>
                      ) : isSelected ? (
                        <span className="flex items-center gap-1 text-rose-400 font-bold text-xs bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/40">
                          <XCircle className="h-4 w-4" />
                          <span>ভুল</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 5. Feedback & Explanation Section */}
          {selectedOption !== null && (
            <div
              className={`p-4 rounded-xl border text-sm transition-all duration-300 ${
                selectedOption === question.correctAnswer
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              }`}
            >
              {selectedOption === question.correctAnswer ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 text-base">
                    <Award className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span>চমৎকার! আপনার উত্তরটি একদম সঠিক! 🎉</span>
                  </div>
                  <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
                    নিয়মিত মেধা এক্সাম পোর্টালে পরিক্ষা দিন। প্রস্তুতি সবার থেকে এক ধাপ এগিয়ে রাখুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-300 text-base">
                    <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
                    <span>উত্তরটি সঠিক নয়।</span>
                  </div>
                  <p className="text-rose-100/90 text-xs sm:text-sm leading-relaxed">
                    নিয়মিত মেধা এক্সাম পোর্টালে পরিক্ষা দিন। প্রস্তুতি সবার থেকে এক ধাপ এগিয়ে রাখুন।
                  </p>
                  <p className="text-rose-100/90 text-xs sm:text-sm leading-relaxed">
                    সঠিক উত্তরটি হলো:{' '}
                    <span className="font-bold text-white bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {optionPrefixes[question.correctAnswer]}) {question.options[question.correctAnswer]}
                    </span>
                  </p>
                </div>
              )}

              {/* Detailed Explanation if available */}
              {question.explanation && question.explanation.trim() !== '' && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs leading-relaxed text-slate-300">
                  <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                    <BookOpen className="h-3.5 w-3.5" /> ব্যাখ্যা:
                  </span>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* 6. Action Controls: Next Random Question & Full Exam Link */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 text-xs">
            <button
              onClick={() => loadQuestion(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-all border border-slate-700 shadow-sm active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>{selectedOption !== null ? 'পরবর্তী প্রশ্ন খেলুন' : 'অন্য প্রশ্ন দেখুন'}</span>
            </button>

            {onStartExam && (
              <button
                onClick={() => onStartExam()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-950/50 hover:shadow-emerald-500/20 active:scale-95"
              >
                <span>সম্পূর্ণ মডেল টেস্ট দিন</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer reassurance */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-400">
        <span className="hidden" aria-hidden="true">
          <Trophy className="h-3 w-3" />
          রিয়েল-টাইম ফায়ারবেস কোশ্চেন ব্যাংক
        </span>
        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
          <Trophy className="h-3.5 w-3.5 text-emerald-400" />
          প্রতিদিন ১টি প্রশ্ন উত্তর দিয়ে প্রস্তুতি যাচাই করুন
        </span>
      </div>
    </div>
  );
};

export default DailyChallengeWidget;
