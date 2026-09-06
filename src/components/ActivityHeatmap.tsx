/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Flame,
  Award,
  CheckCircle2,
  CalendarDays,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Zap,
  Check,
} from 'lucide-react';
import { Exam, ExamResult, UserProfile } from '../types';

interface ActivityHeatmapProps {
  user: UserProfile;
  results: ExamResult[];
  exams: Exam[];
  onStartExam?: (exam: Exam) => void;
  onViewResult?: (result: ExamResult) => void;
  onStreakCalculated?: (streak: number) => void;
}

export interface DayActivity {
  date: Date;
  dateKey: string; // "YYYY-MM-DD"
  dayOfMonth: number;
  dayOfMonthBn: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayShortBn: string;
  dayNameBn: string;
  monthNameBn: string;
  formattedDateBn: string;
  isToday: boolean;
  exams: ExamResult[];
  count: number;
  level: 0 | 1 | 2 | 3;
  avgScore: number;
  isDemo?: boolean;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const WEEKDAYS_SHORT_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const WEEKDAYS_FULL_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const MONTHS_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export function toBnDigits(num: number | string): string {
  return String(num)
    .split('')
    .map((ch) => {
      const parsed = parseInt(ch, 10);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? BENGALI_DIGITS[parsed] : ch;
    })
    .join('');
}

// Robust parsing of date strings from ISO, timestamps, or Bengali formatted dates
export function parseResultDateKey(result: ExamResult): string {
  if (result.submittedAt) {
    const d = new Date(result.submittedAt);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  if (result.dateTaken) {
    let raw = String(result.dateTaken).trim();
    // Replace Bengali digits if present
    BENGALI_DIGITS.forEach((bn, idx) => {
      raw = raw.split(bn).join(String(idx));
    });

    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  return '';
}

export default function ActivityHeatmap({
  user,
  results,
  exams,
  onStartExam,
  onViewResult,
  onStreakCalculated,
}: ActivityHeatmapProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [useDemoFallback, setUseDemoFallback] = useState<boolean>(true);

  // Generate 30 days window up to today
  const last30Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayActivity[] = [];

    // Map existing user results by local YYYY-MM-DD
    const resultsByDate = new Map<string, ExamResult[]>();
    results.forEach((r) => {
      const key = parseResultDateKey(r);
      if (key) {
        if (!resultsByDate.has(key)) {
          resultsByDate.set(key, []);
        }
        resultsByDate.get(key)!.push(r);
      }
    });

    // Check if user has real results in the last 30 days
    let realResultsInWindow = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${dayStr}`;
      if (resultsByDate.has(key) && resultsByDate.get(key)!.length > 0) {
        realResultsInWindow += resultsByDate.get(key)!.length;
      }
    }

    // Realistic simulated activity pattern for demonstration if no real results in last 30 days
    // This showcases a 12-day streak ending today/yesterday (matching the test student dashboard)
    const shouldInjectDemo = user.role !== 'admin' && realResultsInWindow === 0 && useDemoFallback;

    // Build the 30-day activity items
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = d.getDate();
      const dayStr = String(dayNum).padStart(2, '0');
      const dateKey = `${y}-${m}-${dayStr}`;

      const dayOfWeek = d.getDay();
      const isToday = i === 0;

      let dayExams = resultsByDate.get(dateKey) || [];
      let isDemoItem = false;

      // Inject simulated exams for demonstration if active
      if (shouldInjectDemo) {
        // 12-day continuous streak (from index 18 to 29)
        // plus some earlier activity on days 3, 5, 8, 12, 15
        const isStreakDay = i <= 11; // Last 12 days (indices 18 to 29)
        const isPastActiveDay = [14, 17, 21, 24, 26].includes(i);

        if (isStreakDay || isPastActiveDay) {
          isDemoItem = true;
          // Vary frequency between 1, 2, or 3 exams for rich visual diversity
          const frequency = i % 5 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
          const subjects = ['BCS', 'বাংলা', 'ইংরেজি', 'গণিত', 'GK'];
          const demoTitles = [
            'বিসিএস প্রিলিমিনারি মডেল টেস্ট',
            'বাংলা ব্যাকরণ ও সাহিত্য অনুশীলন',
            'English Grammar & Vocabulary Test',
            'প্রাথমিক গণিত ও মানসিক দক্ষতা',
            'বাংলাদেশ ও আন্তর্জাতিক সাধারণ জ্ঞান',
          ];

          const generatedDemoExams: ExamResult[] = [];
          for (let f = 0; f < frequency; f++) {
            const subj = subjects[(i + f) % subjects.length];
            const title = demoTitles[(i + f) % demoTitles.length];
            const score = 7 + ((i + f) % 4);
            const totalMarks = 10;
            generatedDemoExams.push({
              id: `demo-${dateKey}-${f}`,
              examId: `exam-${f + 1}`,
              examTitle: title,
              subject: subj,
              userId: user.id || 'student-demo',
              studentId: user.id || 'student-demo',
              studentName: user.name || 'শিক্ষার্থী',
              studentEmail: user.email || 'student@medha.com',
              score: score,
              totalMarks: totalMarks,
              percentage: Math.round((score / totalMarks) * 100),
              totalQuestions: 10,
              correctAnswers: score,
              wrongAnswers: totalMarks - score,
              skippedAnswers: 0,
              unansweredQuestions: 0,
              submittedAt: new Date(d.getTime() + (10 + f * 4) * 3600000).toISOString(),
              dateTaken: `${toBnDigits(dayNum)} ${MONTHS_BN[d.getMonth()]} ${toBnDigits(y)}`,
              timeSpentSeconds: 320 + f * 60,
              subjectPerformance: {
                [subj]: { correct: score, total: totalMarks },
              },
            });
          }
          dayExams = generatedDemoExams;
        }
      }

      const count = dayExams.length;
      const level: 0 | 1 | 2 | 3 = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
      const avgScore =
        count > 0
          ? Math.round(
              dayExams.reduce((sum, e) => sum + (e.score / (e.totalQuestions || 1)) * 100, 0) / count
            )
          : 0;

      days.push({
        date: d,
        dateKey,
        dayOfMonth: dayNum,
        dayOfMonthBn: toBnDigits(dayNum),
        dayOfWeek,
        dayShortBn: WEEKDAYS_SHORT_BN[dayOfWeek],
        dayNameBn: WEEKDAYS_FULL_BN[dayOfWeek],
        monthNameBn: MONTHS_BN[d.getMonth()],
        formattedDateBn: `${toBnDigits(dayNum)} ${MONTHS_BN[d.getMonth()]}, ${toBnDigits(y)}`,
        isToday,
        exams: dayExams,
        count,
        level,
        avgScore,
        isDemo: isDemoItem,
      });
    }

    return days;
  }, [results, user.id, user.name, user.email, user.role, useDemoFallback]);

  // Calculate Streak & Participation Stats
  const stats = useMemo(() => {
    const totalDays = last30Days.length;
    const activeDays = last30Days.filter((d) => d.count > 0).length;
    const totalExams = last30Days.reduce((sum, d) => sum + d.count, 0);
    const participationRate = Math.round((activeDays / totalDays) * 100);

    // Current Streak (consecutive active days ending today or yesterday)
    let currentStreak = 0;
    const todayIndex = totalDays - 1;
    const todayActive = last30Days[todayIndex]?.count > 0;
    const yesterdayActive = todayIndex > 0 && last30Days[todayIndex - 1]?.count > 0;

    if (todayActive) {
      currentStreak = 1;
      for (let i = todayIndex - 1; i >= 0; i--) {
        if (last30Days[i].count > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else if (yesterdayActive) {
      // Streak maintained from yesterday awaiting today's test
      currentStreak = 1;
      for (let i = todayIndex - 2; i >= 0; i--) {
        if (last30Days[i].count > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest Streak across the 30-day window
    let longestStreak = 0;
    let tempStreak = 0;
    for (const d of last30Days) {
      if (d.count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    const hasDemoData = last30Days.some((d) => d.isDemo);

    return {
      activeDays,
      totalExams,
      participationRate,
      currentStreak,
      longestStreak,
      hasDemoData,
    };
  }, [last30Days]);

  // Sync calculated streak to parent if provided
  React.useEffect(() => {
    if (onStreakCalculated) {
      onStreakCalculated(stats.currentStreak);
    }
  }, [stats.currentStreak, onStreakCalculated]);

  // Active selected day
  const selectedDay = useMemo(() => {
    if (selectedDayKey) {
      const found = last30Days.find((d) => d.dateKey === selectedDayKey);
      if (found) return found;
    }
    // Default to today
    return last30Days[last30Days.length - 1] || null;
  }, [last30Days, selectedDayKey]);

  // Range text: e.g. "৭ আগস্ট ২০২৬ — ৫ সেপ্টেম্বর ২০২৬"
  const rangeText = useMemo(() => {
    if (last30Days.length === 0) return '';
    const first = last30Days[0];
    const last = last30Days[last30Days.length - 1];
    return `${first.formattedDateBn} থেকে ${last.formattedDateBn}`;
  }, [last30Days]);

  // For the 7-day calendar matrix: pad preceding days of the first week
  const calendarGridCells = useMemo(() => {
    if (last30Days.length === 0) return [];
    const firstDayOfWeek = last30Days[0].dayOfWeek; // 0 (Sun) to 6 (Sat)
    const emptySlots = firstDayOfWeek; // Empty padding before day 1

    return { emptySlots, days: last30Days };
  }, [last30Days]);

  // Heatmap intensity color mapping
  const getCellClasses = (day: DayActivity, isSelected: boolean) => {
    const base =
      'relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none text-center';

    const selectedRing = isSelected
      ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md scale-105 z-10'
      : 'hover:scale-105 hover:shadow-sm';

    let colorClass = '';
    switch (day.level) {
      case 0:
        colorClass =
          'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70';
        break;
      case 1:
        colorClass =
          'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80 border border-emerald-300/80 dark:border-emerald-800';
        break;
      case 2:
        colorClass =
          'bg-emerald-300 hover:bg-emerald-400 text-emerald-950 dark:bg-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-600 border border-emerald-400 dark:border-emerald-600 font-semibold';
        break;
      case 3:
        colorClass =
          'bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400 border border-emerald-700 font-bold shadow-sm';
        break;
    }

    return `${base} ${selectedRing} ${colorClass}`;
  };

  return (
    <div
      id="activity-heatmap-card"
      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/70 dark:border-slate-700/70 p-6 sm:p-8 shadow-sm space-y-6 transition-all"
    >
      {/* 1. Header with Title, Range & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              বিগত ৩০ দিনের অ্যাক্টিভিটি হিটম্যাপ
            </h3>
            {stats.currentStreak > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20">
                <Flame className="h-3.5 w-3.5 fill-current animate-pulse" />
                {toBnDigits(stats.currentStreak)} দিন স্ট্রিক
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
            <span>{rangeText}</span>
            <span>•</span>
            <span>দৈনিক অনুশীলন স্ট্রিক ও কুইজ অংশগ্রহণের ফ্রিকোয়েন্সি</span>
          </p>
        </div>

        {/* View Mode Switcher and Demo status */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {stats.hasDemoData && (
            <button
              onClick={() => setUseDemoFallback(!useDemoFallback)}
              title={useDemoFallback ? 'নমুনা ডেটা লুকাতে ক্লিক করুন' : 'নমুনা ডেটা দেখতে ক্লিক করুন'}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {useDemoFallback ? 'নমুনা প্রিভিউ সক্রিয়' : 'শুধুমাত্র লাইভ ডেটা'}
            </button>
          )}

          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              ক্যালেন্ডার গ্রিড
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              টাইমলাইন ভিউ
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar (4 Responsive Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Current Streak */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Flame className="h-6 w-6 fill-current" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">চলমান স্ট্রিক</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {toBnDigits(stats.currentStreak)}
              </span>
              <span className="text-xs font-semibold text-slate-500">দিন</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {stats.currentStreak > 0 ? 'ধারাবাহিক অনুশীলন সক্রিয়' : 'আজ পরীক্ষা দিন'}
            </span>
          </div>
        </div>

        {/* Metric 2: Longest Streak */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">সর্বোচ্চ স্ট্রিক</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {toBnDigits(stats.longestStreak)}
              </span>
              <span className="text-xs font-semibold text-slate-500">দিন</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">৩০ দিনের সেরা রেকর্ড</span>
          </div>
        </div>

        {/* Metric 3: Active Days */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">সক্রিয় উপস্থিতি</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {toBnDigits(stats.activeDays)}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ ৩০ দিন</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {toBnDigits(stats.participationRate)}% নিয়মিততা
            </span>
          </div>
        </div>

        {/* Metric 4: Total Exams in 30 days */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">সম্পন্ন কুইজ</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {toBnDigits(stats.totalExams)}
              </span>
              <span className="text-xs font-semibold text-slate-500">টি মোট</span>
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              গড় {toBnDigits(Math.round((stats.totalExams / 30) * 10) / 10)} পরীক্ষা/দিন
            </span>
          </div>
        </div>
      </div>

      {/* 3. Heatmap Matrix Display */}
      {viewMode === 'calendar' ? (
        /* Calendar Grid Mode: 7 Column Table (Sun to Sat) with 5 week rows */
        <div className="space-y-2">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
            {WEEKDAYS_SHORT_BN.map((dayName, idx) => (
              <div
                key={dayName}
                className="py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {/* Preceding empty padding slots for month start alignment */}
            {Array.from({ length: calendarGridCells.emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-14 sm:h-18 rounded-xl bg-slate-50/40 dark:bg-slate-900/20 border border-dashed border-slate-200/40 dark:border-slate-800/40 opacity-40 pointer-events-none"
              />
            ))}

            {/* 30 Day Heatmap Cells */}
            {calendarGridCells.days.map((day) => {
              const isSelected = selectedDay?.dateKey === day.dateKey;
              return (
                <div
                  key={day.dateKey}
                  onClick={() => setSelectedDayKey(day.dateKey)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`h-14 sm:h-18 p-1.5 sm:p-2 ${getCellClasses(day, isSelected)}`}
                  title={`${day.formattedDateBn} (${day.dayNameBn}): ${
                    day.count > 0 ? `${day.count}টি পরীক্ষা সম্পন্ন` : 'কোনো পরীক্ষা দেননি'
                  }`}
                >
                  {/* Top row inside cell: Day number + Today indicator */}
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold leading-none">
                      {day.dayOfMonthBn}
                    </span>

                    {day.isToday && (
                      <span className="px-1 py-0.2 text-[9px] font-black rounded bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-900 leading-tight">
                        আজ
                      </span>
                    )}

                    {/* Month boundary label if 1st of month */}
                    {!day.isToday && day.dayOfMonth === 1 && (
                      <span className="text-[9px] font-bold opacity-80 truncate hidden sm:inline">
                        {day.monthNameBn}
                      </span>
                    )}
                  </div>

                  {/* Center / Bottom: Activity frequency badge or dots */}
                  <div className="mt-auto w-full flex items-center justify-center gap-1">
                    {day.count === 0 ? (
                      <span className="text-[10px] opacity-40 font-medium hidden sm:inline">—</span>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {/* Dot indicator for exam count */}
                        {Array.from({ length: Math.min(day.count, 3) }).map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              day.level === 3 ? 'bg-white' : 'bg-emerald-600 dark:bg-emerald-300'
                            }`}
                          />
                        ))}
                        {day.count > 3 && (
                          <span className="text-[9px] font-bold leading-none ml-0.5">+</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Exam count label on larger screens */}
                  {day.count > 0 && (
                    <span className="text-[9px] font-semibold opacity-90 hidden sm:block leading-none mt-0.5">
                      {toBnDigits(day.count)}টি পরীক্ষা
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Timeline Mode: 30 Continuous Sequential Day Columns with Vertical Frequency Bars */
        <div className="space-y-4">
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5 min-w-[640px]">
              {last30Days.map((day) => {
                const isSelected = selectedDay?.dateKey === day.dateKey;
                // Bar height proportional to exam count (max capped at 100%)
                const barHeight = day.count === 0 ? '8%' : day.count === 1 ? '40%' : day.count === 2 ? '70%' : '100%';

                return (
                  <div
                    key={day.dateKey}
                    onClick={() => setSelectedDayKey(day.dateKey)}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`flex flex-col items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer select-none h-32 border ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    {/* Weekday abbreviation */}
                    <span className="text-[9px] text-slate-400 font-bold">{day.dayShortBn}</span>

                    {/* Frequency Vertical Bar */}
                    <div className="w-full flex-1 flex flex-col justify-end items-center my-1">
                      <div
                        style={{ height: barHeight }}
                        className={`w-full max-w-[14px] rounded-t-md transition-all duration-300 ${
                          day.level === 0
                            ? 'bg-slate-200 dark:bg-slate-800'
                            : day.level === 1
                            ? 'bg-emerald-300 dark:bg-emerald-700'
                            : day.level === 2
                            ? 'bg-emerald-500 dark:bg-emerald-500'
                            : 'bg-emerald-700 dark:bg-emerald-400 shadow-xs'
                        }`}
                      />
                    </div>

                    {/* Day number */}
                    <span
                      className={`text-[10px] font-bold leading-none ${
                        day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {day.dayOfMonthBn}
                    </span>

                    {day.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Legend & Streak Guidance Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        {/* Streak status message */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            {stats.currentStreak >= 7 ? (
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                অসাধারণ! আপনি টানা {toBnDigits(stats.currentStreak)} দিন পরীক্ষায় অংশ নিয়েছেন। সাফল্য নিশ্চিত করতে নিয়মিত থাকুন!
              </span>
            ) : stats.currentStreak > 0 ? (
              <span>
                আপনার স্ট্রিক চলমান ({toBnDigits(stats.currentStreak)} দিন)। প্রতিদিন অন্তত ১টি পরীক্ষা দিয়ে স্ট্রিক রক্ষা করুন।
              </span>
            ) : (
              <span>আজকের লাইভ কুইজে অংশ নিয়ে আপনার স্ট্রিক শুরু করুন!</span>
            )}
          </span>
        </div>

        {/* Heatmap Level Legend */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span className="text-[11px] font-semibold">অংশগ্রহণ:</span>
          <span className="text-[10px] text-slate-400">কম</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              title="০ পরীক্ষা"
            />
            <span
              className="w-4 h-4 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800"
              title="১টি পরীক্ষা"
            />
            <span
              className="w-4 h-4 rounded-md bg-emerald-300 dark:bg-emerald-700 border border-emerald-400 dark:border-emerald-600"
              title="২টি পরীক্ষা"
            />
            <span
              className="w-4 h-4 rounded-md bg-emerald-600 dark:bg-emerald-500 border border-emerald-700"
              title="৩ বা ততোধিক পরীক্ষা"
            />
          </div>
          <span className="text-[10px] text-slate-400">বেশি</span>
        </div>
      </div>

      {/* 5. Selected Day Breakdown Card */}
      {selectedDay && (
        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/70 p-5 space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3 h-3 rounded-full ${
                  selectedDay.count > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                {selectedDay.formattedDateBn} ({selectedDay.dayNameBn})
                {selectedDay.isToday && (
                  <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    আজকের দিন
                  </span>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                মোট অংশগ্রহণ:{' '}
                <strong className="text-slate-800 dark:text-slate-100">
                  {toBnDigits(selectedDay.count)} টি পরীক্ষা
                </strong>
              </span>
              {selectedDay.count > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    গড় মার্ক্স: {toBnDigits(selectedDay.avgScore)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* List of Exams for the Selected Day */}
          {selectedDay.count === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                এই দিনে কোনো পরীক্ষায় অংশগ্রহণ করা হয়নি। স্ট্রিক অক্ষুণ্ণ রাখতে এবং মেধা শাণিত করতে
                প্রতিদিন অন্তত একটি কুইজ দিন।
              </p>
              {selectedDay.isToday && exams.length > 0 && (
                <a
                  href="#live-exams-sec"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-xs transition-transform hover:-translate-y-0.5"
                >
                  <Zap className="h-4 w-4" /> আজকের লাইভ পরীক্ষা দিন
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {selectedDay.exams.map((examResult) => {
                const percentage =
                  examResult.percentage ||
                  Math.round((examResult.score / (examResult.totalQuestions || 1)) * 100);

                const badgeColor =
                  percentage >= 80
                    ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 border-emerald-500/20'
                    : percentage >= 50
                    ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40 border-amber-500/20'
                    : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40 border-rose-500/20';

                return (
                  <div
                    key={examResult.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {examResult.subject}
                        </span>
                        {examResult.timeSpentSeconds && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {toBnDigits(Math.round(examResult.timeSpentSeconds / 60))} মিনিট
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                        {examResult.examTitle}
                      </h5>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>সঠিক: {toBnDigits(examResult.correctAnswers)}</span>
                        <span>ভুল: {toBnDigits(examResult.wrongAnswers)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-1.5 border rounded-xl text-center ${badgeColor}`}>
                        <span className="block text-base font-extrabold leading-tight">
                          {toBnDigits(examResult.score)}
                        </span>
                        <span className="text-[9px] font-bold block uppercase">
                          /{toBnDigits(examResult.totalQuestions)} মার্ক্স
                        </span>
                      </div>

                      {onViewResult && !examResult.id.startsWith('demo-') && (
                        <button
                          onClick={() => onViewResult(examResult)}
                          className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="ফলাফল বিশ্লেষণ দেখুন"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
