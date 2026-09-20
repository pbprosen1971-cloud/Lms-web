/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Bookmark,
  ChevronRight,
  User,
  ExternalLink,
  BookOpen,
  XCircle,
  RotateCcw,
  Check,
  Gift
} from 'lucide-react';
import { Exam, ExamResult, UserProfile, DailyPracticeSession, WrongQuestionRecord } from '../types';
import { formatSafeDisplay } from '../lib/dateUtils';
import ActivityHeatmap from './ActivityHeatmap';
import { subscribeToTodayDailyPractice, subscribeToUserWrongQuestions } from '../services/firestoreService';

interface DashboardViewProps {
  user: UserProfile;
  exams: Exam[];
  results: ExamResult[];
  setView: (view: string) => void;
  setSelectedExam: (exam: Exam) => void;
  setSelectedResult: (result: ExamResult) => void;
}

export default function DashboardView({
  user,
  exams,
  results,
  setView,
  setSelectedExam,
  setSelectedResult,
}: DashboardViewProps) {
  // Filter exams by statuses
  const liveExams = useMemo(() => exams.filter((e) => e.status === 'live'), [exams]);
  const upcomingExams = useMemo(() => exams.filter((e) => e.status === 'upcoming'), [exams]);
  const archiveExams = useMemo(() => exams.filter((e) => e.status === 'archive'), [exams]);

  // Greeting text based on local timezone/time of day
  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'শুভ সকাল';
    } else if (hour >= 12 && hour < 17) {
      return 'শুভ দুপুর';
    } else if (hour >= 17 && hour < 20) {
      return 'শুভ সন্ধ্যা';
    } else {
      return 'শুভ রাত্রি';
    }
  };

  // User-specific results
  const userResults = useMemo(() => {
    return results.filter(
      (r) =>
        r.studentId === user.id ||
        (r.studentEmail && user.email && r.studentEmail.toLowerCase() === user.email.toLowerCase())
    );
  }, [results, user.id, user.email]);

  const [heatmapStreak, setHeatmapStreak] = useState<number | null>(null);
  const [dailyPracticeSession, setDailyPracticeSession] = useState<DailyPracticeSession | null>(null);
  const [wrongQuestionsList, setWrongQuestionsList] = useState<WrongQuestionRecord[]>([]);

  // Real-time subscriptions for Daily Practice and Wrong Questions
  useEffect(() => {
    const uid = user.id || user.uid;
    if (!uid) return;

    const unsubDaily = subscribeToTodayDailyPractice(uid, (session) => {
      setDailyPracticeSession(session);
    });

    const unsubWrong = subscribeToUserWrongQuestions(uid, (records) => {
      setWrongQuestionsList(records);
    });

    return () => {
      unsubDaily();
      unsubWrong();
    };
  }, [user.id, user.uid]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalTaken = userResults.length;
    const avgScore =
      totalTaken > 0
        ? Math.round((userResults.reduce((sum, r) => sum + r.score, 0) / userResults.reduce((sum, r) => sum + r.totalQuestions, 0)) * 100)
        : 0;

    const streak = heatmapStreak !== null ? heatmapStreak : (user.role === 'admin' ? 0 : 12);
    return { totalTaken, avgScore, streak };
  }, [userResults, user.role, heatmapStreak]);

  const handleStartExam = (exam: Exam) => {
    setSelectedExam(exam);
    setView('exam');
  };

  const handleViewResult = (result: ExamResult) => {
    setSelectedResult(result);
    setView('result');
  };

  // Pure SVG custom Progress Area Chart for performance over time
  const renderProgressChart = () => {
    if (userResults.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-xs">
          অগ্রগতি গ্রাফ দেখানোর জন্য অন্তত একটি পরীক্ষা দিন।
        </div>
      );
    }

    // Chart points: Map results percentage scores
    const scores = userResults.slice(-6).map((r) => Math.round((r.score / r.totalQuestions) * 100));
    
    // SVG Dimensions
    const width = 500;
    const height = 180;
    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = 100;
    const pointsCount = scores.length;
    const stepX = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

    // Generate path points
    const points = scores.map((score, index) => {
      const x = padding + index * stepX;
      const y = padding + chartHeight - (score / maxVal) * chartHeight;
      return { x, y };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Area path closing coordinates for elegant gradient fill
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`
      : '';

    return (
      <div className="w-full overflow-x-auto select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px] overflow-visible">
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (Y-axis helpers) */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = padding + chartHeight - (level / maxVal) * chartHeight;
            return (
              <g key={level}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e2e8f0"
                  className="dark:stroke-slate-800"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-semibold"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          {areaPath && <path d={areaPath} fill="url(#chart-grad)" />}

          {/* Line Plot */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#16a34a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Nodes & Value Tags */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#ffffff"
                stroke="#16a34a"
                strokeWidth="2.5"
                className="cursor-pointer"
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="fill-slate-800 dark:fill-slate-200 text-[10px] font-bold"
              >
                {scores[idx]}%
              </text>
              {/* Exam label abbreviation */}
              <text
                x={p.x}
                y={padding + chartHeight + 15}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] font-semibold"
              >
                টেস্ট {idx + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-brand-bg dark:bg-slate-900 text-slate-800 dark:text-slate-100 theme-transition">
      
      {/* 1. Greeting Card (Welcome Panel) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 fill-current animate-bounce" />
            <span>স্বাগতম ড্যাশবোর্ডে!</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {getGreetingText()}, {user.name}!
          </h1>
          <p className="text-emerald-100 text-sm max-w-xl">
            আজকে আপনার পরীক্ষার প্রস্তুতি কেমন? নিচের লাইভ কুইজে অংশ নিন অথবা আপনার সাম্প্রতিক পরীক্ষার ফলাফল বিশ্লেষণ করুন।
          </p>
        </div>
        
        {/* Quick actions for testing inside card */}
        <div className="relative z-10 flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setView('referral')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all duration-200 cursor-pointer"
          >
            <Gift className="h-4 w-4 text-slate-900" />
            <span>রেফারেল ও রিওয়ার্ড</span>
          </button>
          <button
            onClick={() => setView('profile')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-emerald-700 font-bold text-xs rounded-xl shadow-md hover:bg-emerald-50 transition-colors duration-200 cursor-pointer"
          >
            <User className="h-4 w-4" /> প্রোফাইল দেখুন
          </button>
        </div>
      </div>

      {/* 2. Stats summary & Progress Chart section (12 Column grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Statistics Summary - Left col */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-2xl">
              <Flame className="h-6 w-6 fill-current" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">ডেইলি স্ট্রাক</p>
              <h3 className="text-xl font-extrabold">{stats.streak} দিন</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">অংশগ্রহণকৃত এক্সাম</p>
              <h3 className="text-xl font-extrabold">{stats.totalTaken} টি</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 rounded-2xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">গড় পরীক্ষার মার্কস</p>
              <h3 className="text-xl font-extrabold">{stats.avgScore}%</h3>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Chart Card - Right col */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              আপনার মেধা অগ্রগতি গ্রাফ
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">সর্বশেষ ৫টি পরীক্ষা</span>
          </div>
          {renderProgressChart()}
        </div>

      </div>

      {/* 3. Quick Action Grid with consistent glass-card styling & navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: 📅 Daily Practice */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  ১০ MCQ / দিন
                </span>
                {dailyPracticeSession?.completed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                    <Check className="h-3 w-3" /> সম্পন্ন
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                দৈনিক অনুশীলন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                প্রতিদিন নির্বাচিত ১০টি প্রশ্ন সমাধান করুন এবং মেধা যাচাইয়ের ধারাবাহিকতা রক্ষা করুন।
              </p>
            </div>

            {dailyPracticeSession?.completed ? (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">আজকের স্কোর:</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                  {dailyPracticeSession.score ?? 0} / {dailyPracticeSession.totalQuestions ?? 10}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>আজকের প্র্যাকটিস বাকি</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">১০টি প্রশ্ন উপলব্ধ</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              তারিখ: {new Date().toLocaleDateString('bn-BD')}
            </span>
            <button
              onClick={() => setView('daily-practice')}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                dailyPracticeSession?.completed
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5'
              }`}
            >
              <span>{dailyPracticeSession?.completed ? 'রিভিউ দেখুন' : 'অনুশীলন শুরু'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: ❌ Wrong Question Practice */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm hover:shadow-md hover:border-rose-500/40 dark:hover:border-rose-500/40 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/50 dark:text-rose-300 px-2.5 py-0.5 rounded-full">
                  স্মার্ট রিভিশন
                </span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-800/50">
                  {wrongQuestionsList.length} টি ভুল
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                ভুল প্রশ্ন অনুশীলন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                পরীক্ষায় ভুল হওয়া প্রশ্নের ব্যক্তিগত ব্যাংক। দুর্বলতা চিহ্নিত করে নির্ভুল প্রস্তুতি নিন।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center justify-between">
                <span className="text-amber-800 dark:text-amber-300">অমীমাংসিত:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {wrongQuestionsList.filter((q) => q.status === 'unmastered').length}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between">
                <span className="text-emerald-800 dark:text-emerald-300">মাস্টার্ড:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {wrongQuestionsList.filter((q) => q.status === 'mastered').length}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              ব্যক্তিগত ব্যাংক
            </span>
            <button
              onClick={() => setView('wrong-questions')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-sm"
            >
              <span>ভুল প্রশ্ন দেখুন</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: 📊 My Results & Performance */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 flex flex-col justify-between transition-all duration-200 group relative overflow-hidden">
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 px-2.5 py-0.5 rounded-full">
                  পারফরম্যান্স
                </span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                  {userResults.length} টি পরীক্ষা
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                আমার ফলাফল
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                আপনার দেওয়া প্রতিটি পরীক্ষার বিস্তারিত ফলাফল, স্কোরশিট ও সমাধান বিশ্লেষণ পর্যালোচনা করুন।
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-between text-xs">
              <span className="text-blue-800 dark:text-blue-300 font-medium">গড় অর্জিত স্কোর:</span>
              <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                {stats.avgScore}%
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              {userResults.length > 0 ? `সর্বশেষ: ${formatSafeDisplay(userResults[0]?.dateTaken, 'আজ')}` : 'কোনো পরীক্ষা নেই'}
            </span>
            <a
              href="#recent-results-sec"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-sm"
            >
              <span>ফলাফল দেখুন</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

      </div>

      {/* 4. 30-Day Activity Heatmap & Participation Frequency */}
      <ActivityHeatmap
        user={user}
        results={userResults}
        exams={exams}
        onStartExam={handleStartExam}
        onViewResult={handleViewResult}
        onStreakCalculated={(s) => setHeatmapStreak(s)}
      />

      {/* Quick Navigation Glass Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setView('daily-practice')}
          className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 border border-slate-200/80 dark:border-slate-700/70 hover:border-emerald-500/30 rounded-2xl text-center space-y-1.5 transition-all hover:-translate-y-0.5 shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            দৈনিক অনুশীলন
          </span>
        </button>

        <button
          onClick={() => setView('wrong-questions')}
          className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-slate-200/80 dark:border-slate-700/70 hover:border-rose-500/30 rounded-2xl text-center space-y-1.5 transition-all hover:-translate-y-0.5 shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
            <XCircle className="h-5 w-5" />
          </div>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            ভুল প্রশ্ন ব্যাংক
          </span>
        </button>

        <button
          onClick={() => setView('study-materials')}
          className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-purple-500/10 dark:hover:bg-purple-500/15 border border-slate-200/80 dark:border-slate-700/70 hover:border-purple-500/30 rounded-2xl text-center space-y-1.5 transition-all hover:-translate-y-0.5 shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            স্টাডি ম্যাটেরিয়াল
          </span>
        </button>

        <button
          onClick={() => setView('profile')}
          className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-amber-500/10 dark:hover:bg-amber-500/15 border border-slate-200/80 dark:border-slate-700/70 hover:border-amber-500/30 rounded-2xl text-center space-y-1.5 transition-all hover:-translate-y-0.5 shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
            <Award className="h-5 w-5" />
          </div>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            প্রোফাইল ও সার্টিফিকেট
          </span>
        </button>
      </div>

      {/* 4. Live Exam Lists (Live, Upcoming, Archive) */}
      <div id="live-exams-sec" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Live & Upcoming Exams List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Clock className="h-5.5 w-5.5 text-primary" />
              চলতি ও আসন্ন কুইজ সমূহ
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{liveExams.length + upcomingExams.length} টি মোট</span>
          </div>

          <div className="space-y-4">
            {/* Live Exams list */}
            {liveExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-800 p-4 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl flex justify-between items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded dark:bg-emerald-950/40 dark:text-emerald-400">
                      LIVE EXAM
                    </span>
                    <span className="text-xs text-slate-400">{exam.subject}</span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">{exam.title}</h4>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{exam.totalQuestions} টি প্রশ্ন</span>
                    <span>•</span>
                    <span>{exam.durationMinutes} মিনিট</span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartExam(exam)}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  পরীক্ষা দিন
                </button>
              </div>
            ))}

            {/* Upcoming Exams list */}
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-800 p-4 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex justify-between items-center gap-4 opacity-85"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded dark:bg-amber-950/40 dark:text-amber-400">
                      UPCOMING
                    </span>
                    <span className="text-xs text-slate-400">{exam.subject}</span>
                  </div>
                  <h4 className="font-bold text-sm leading-snug text-slate-700 dark:text-slate-200 line-clamp-1">{exam.title}</h4>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    সময়: {exam.startTime}
                  </div>
                </div>

                <button
                  disabled
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed"
                >
                  অপেক্ষা করুন
                </button>
              </div>
            ))}
          </div>

          {/* Archived / Past Exams */}
          <div className="pt-4 space-y-4">
            <h4 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              আর্কাইভ কুইজ সমূহ (অনুশীলন করুন)
            </h4>
            <div className="space-y-3">
              {archiveExams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => handleStartExam(exam)}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                      {exam.subject[0]}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm line-clamp-1">{exam.title}</h5>
                      <span className="text-[10px] text-slate-400">তৈরি হয়েছে: {formatSafeDisplay(exam.dateCreated, '—')}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Recent Results list Card */}
        <div id="recent-results-sec" className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Award className="h-5.5 w-5.5 text-primary" />
              সাম্প্রতিক পরীক্ষার ফলাফলসমূহ
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{userResults.length} টি মোট</span>
          </div>

          <div className="space-y-4">
            {userResults.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-center space-y-2">
                <FileText className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-sm">কোনো ফলাফল পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-500">আপনার কোনো পরীক্ষার রেকর্ড নেই। লাইভ এক্সাম বাটনে ক্লিক করে পরীক্ষা শুরু করুন।</p>
              </div>
            ) : (
              userResults.map((result) => {
                const percentage = Math.round((result.score / result.totalQuestions) * 100);
                const scoreColor =
                  percentage >= 80
                    ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-500/20'
                    : percentage >= 50
                    ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-500/20'
                    : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 border-rose-500/20';

                return (
                  <div
                    key={result.id}
                    onClick={() => handleViewResult(result)}
                    className="p-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex justify-between items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-sm leading-tight truncate">{result.examTitle}</h4>
                      <p className="text-[10px] text-slate-400">পরীক্ষার তারিখ: {formatSafeDisplay(result.dateTaken, '—')}</p>
                      
                      {/* Accurate details summary */}
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="text-emerald-600 font-medium">সঠিক: {result.correctAnswers}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-rose-600 font-medium">ভুল: {result.wrongAnswers}</span>
                      </div>
                    </div>

                    <div className={`px-3.5 py-2.5 border rounded-xl text-center shrink-0 min-w-[70px] ${scoreColor}`}>
                      <span className="block text-lg font-extrabold leading-none">{result.score}</span>
                      <span className="text-[10px] uppercase font-semibold">/{result.totalQuestions} মার্ক্স</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
