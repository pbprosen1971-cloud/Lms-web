/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { Exam, ExamResult, UserProfile } from '../types';

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

  // Statistics calculation
  const stats = useMemo(() => {
    const totalTaken = userResults.length;
    const avgScore =
      totalTaken > 0
        ? Math.round((userResults.reduce((sum, r) => sum + r.score, 0) / userResults.reduce((sum, r) => sum + r.totalQuestions, 0)) * 100)
        : 0;

    const streak = user.role === 'admin' ? 0 : 12; // Standard default streak for testing
    return { totalTaken, avgScore, streak };
  }, [userResults, user.role]);

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
        <div className="relative z-10 flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setView('profile')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-emerald-700 font-bold text-xs rounded-xl shadow-md hover:bg-emerald-50 transition-colors duration-200"
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

      {/* 3. Quick Action Buttons Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="#live-exams-sec"
          className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-500/10 rounded-2xl text-center space-y-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center mx-auto">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <span className="block text-xs font-bold text-emerald-800 dark:text-emerald-300">আজকের লাইভ পরীক্ষা</span>
        </a>

        <a
          href="#recent-results-sec"
          className="p-4 bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-blue-500/10 rounded-2xl text-center space-y-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center mx-auto">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <span className="block text-xs font-bold text-blue-800 dark:text-blue-300">ফলাফল ও বিশ্লেষণ</span>
        </a>

        <button
          onClick={() => setView('profile')}
          className="p-4 bg-purple-500/5 hover:bg-purple-500/10 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-500/10 rounded-2xl text-center space-y-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center mx-auto">
            <Award className="h-4.5 w-4.5" />
          </div>
          <span className="block text-xs font-bold text-purple-800 dark:text-purple-300">অর্জিত সার্টিফিকেটস</span>
        </button>

        <button
          onClick={() => setView('home')}
          className="p-4 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-500/10 rounded-2xl text-center space-y-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center mx-auto">
            <Bookmark className="h-4.5 w-4.5" />
          </div>
          <span className="block text-xs font-bold text-amber-800 dark:text-amber-300">নতুন পরীক্ষা খুঁজুন</span>
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
                      <span className="text-[10px] text-slate-400">তৈরি হয়েছে: {exam.dateCreated}</span>
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
                      <p className="text-[10px] text-slate-400">পরীক্ষার তারিখ: {result.dateTaken}</p>
                      
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
