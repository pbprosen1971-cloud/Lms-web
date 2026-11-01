/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Medal,
  Flame,
  Star,
  Sparkles,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Calendar,
  Globe,
  ChevronDown,
  Info,
  Zap,
  Crown,
  Target,
  ArrowUp,
} from 'lucide-react';
import { Exam, ExamResult, MeritLeaderboardEntry, UserProfile } from '../types';
import { calculateLeaderboard, getDhakaMonthYear } from '../services/leaderboardService';
import { toBengaliDigits } from '../lib/dateUtils';

interface LeaderboardProps {
  results?: ExamResult[];
  exams?: Exam[];
  currentUser?: UserProfile | null;
  limit?: number;
  className?: string;
  title?: string;
  showUserRankBanner?: boolean;
  initialTab?: 'overall' | 'monthly';
  showTabs?: boolean;
}

export default function Leaderboard({
  results = [],
  exams = [],
  currentUser,
  limit = 10,
  className = '',
  title = 'মেধাবী শিক্ষার্থী লিডারবোর্ড',
  showUserRankBanner = true,
  initialTab = 'overall',
  showTabs = true,
}: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'overall' | 'monthly'>(initialTab);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | undefined>(undefined);
  const [showRuleInfo, setShowRuleInfo] = useState(false);

  // Compute leaderboard with First Attempt & Live Exam only rules
  const leaderboardData = useMemo(() => {
    return calculateLeaderboard({
      results,
      exams,
      filterType: activeTab,
      selectedMonthKey,
      currentUser,
      limit,
    });
  }, [results, exams, activeTab, selectedMonthKey, currentUser, limit]);

  const {
    entries,
    currentUserEntry,
    currentUserRank,
    activeMonthLabel,
    availableMonths,
    totalParticipants,
    totalEligibleExamsCount,
  } = leaderboardData;

  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);
  const remainingEntries = entries.filter((e) => e.rank > 3);

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* 1. Header with Title & Action Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-transparent space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                <span>{title}</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse hidden sm:inline" />
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {activeTab === 'overall'
                  ? 'লাইভ পরীক্ষার সংখ্যা, গড় মার্ক ও কম ভুলের ভিত্তিতে সার্বিক মেধা তালিকা'
                  : `${activeMonthLabel} মাসের লাইভ পরীক্ষার সংখ্যা, গড় মার্ক ও কম ভুলের মেধা তালিকা`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowRuleInfo(!showRuleInfo)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="৩টি মেধা মানদণ্ড ও গণনার নিয়মাবলী দেখুন"
            >
              <Info className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 whitespace-nowrap">
              টপ {toBengaliDigits(limit)}
            </span>
          </div>
        </div>

        {/* Tabs: Overall vs Monthly Filter */}
        {showTabs && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('overall')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'overall'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>সার্বিক লিডারবোর্ড</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>মাসিক লিডারবোর্ড</span>
              </button>
            </div>

            {/* Monthly selector if Monthly is selected */}
            {activeTab === 'monthly' && availableMonths.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">মাস:</span>
                <select
                  value={selectedMonthKey || leaderboardData.activeMonthKey || availableMonths[0]?.key || ''}
                  onChange={(e) => setSelectedMonthKey(e.target.value || undefined)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-bold cursor-pointer outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Informative Policy Rules Banner */}
      {showRuleInfo ? (
        <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>মেধা তালিকা নির্ধারণের ৩টি মূল মানদণ্ড:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRuleInfo(false)}
              className="text-[11px] underline hover:text-amber-950 dark:hover:text-amber-100"
            >
              লুকান
            </button>
          </div>
          <ul className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
            <li><strong>অংশগ্রহণকৃত লাইভ পরীক্ষার সংখ্যা:</strong> যে শিক্ষার্থী যত বেশি লাইভ পরীক্ষায় অংশ নেবে, সে মেধা তালিকায় এগিয়ে থাকবে। (একই পরীক্ষায় একাধিকবার অংশ নিলে শুধু ১ম প্রচেষ্টা গণনা হবে)।</li>
            <li><strong>মোট গড় মার্ক:</strong> দুজন সমান সংখ্যক পরীক্ষায় অংশ নিলে, যার মোট গড় শতকরা মার্ক বেশি সে এগিয়ে থাকবে।</li>
            <li><strong>গড় ভুল সংখ্যা:</strong> সমান সংখ্যক পরীক্ষা ও সমান গড় মার্কের ক্ষেত্রে, যার গড় ভুল সংখ্যা যত কম সে শীর্ষে থাকবে।</li>
            <li><strong>মাসিক লিডারবোর্ড নীতি:</strong> চলতি মাস শেষ হওয়ার পর পরবর্তী মাসের ১ তারিখ থেকে চূড়ান্ত রেকর্ড প্রদর্শিত হয় (সর্বশেষ ২ সমাপ্ত মাসের রেকর্ড সংরক্ষিত থাকে)।</li>
          </ul>
        </div>
      ) : (
        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center text-center text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Live Exam দিন লিডারবোর্ড এগিয়ে থাকুন।</span>
          </span>
        </div>
      )}

      {/* 3. Student Leaderboard: Top 3 Podium Showcase (Reference Image Style) & List */}
      <div className="flex flex-col">
        {entries.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Trophy className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              এই ক্যাটাগরিতে এখনও কোনো লাইভ পরীক্ষার ফলাফল জমা পড়েনি।
            </p>
            <p className="text-[11px] text-slate-400">
              বেশি বেশি লাইভ পরীক্ষায় অংশ নিয়ে মেধা তালিকায় নিজের অবস্থান তৈরি করুন!
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium (2nd Left, 1st Center Elevated, 3rd Right) */}
            <div className="relative pt-8 pb-0 px-3 sm:px-6 bg-gradient-to-b from-[#141a2e] via-[#182038] to-[#121728] dark:from-[#0c111e] dark:via-[#111728] dark:to-[#0d1220] text-white overflow-hidden border-b border-slate-800">
              {/* Ambient Background Glows */}
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-44 bg-amber-500/15 rounded-full blur-3xl" />
              <div className="pointer-events-none absolute top-10 left-4 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl" />
              <div className="pointer-events-none absolute top-10 right-4 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />

              <div className="grid grid-cols-3 gap-2 sm:gap-3.5 items-end max-w-lg mx-auto relative z-10">
                {/* 2nd Place - Left Pedestal */}
                {second ? (
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar + Badge */}
                    <div className="relative mb-2">
                      <img
                        src={second.avatar}
                        alt={second.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover ring-4 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.45)] bg-slate-800"
                      />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[11px] font-black shadow-md border-2 border-[#141a2e] flex items-center justify-center">
                        ২
                      </div>
                    </div>

                    {/* Pedestal Box */}
                    <div className={`w-full pt-4 pb-4 px-1.5 sm:px-2 rounded-t-2xl sm:rounded-t-3xl bg-[#1e2742]/90 dark:bg-[#151c32]/95 border-t border-x border-cyan-400/30 backdrop-blur-sm flex flex-col items-center justify-between min-h-[145px] sm:min-h-[165px] ${
                      second.isCurrentUser ? 'ring-2 ring-emerald-400' : ''
                    }`}>
                      <div className="w-full">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate max-w-full px-1">
                          {second.name}
                        </h4>
                        {second.isCurrentUser && (
                          <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-600 text-white mt-0.5">
                            আপনি
                          </span>
                        )}
                      </div>

                      <div className="my-1">
                        <div className="text-base sm:text-xl font-black text-cyan-400 tracking-tight leading-none">
                          {toBengaliDigits(second.meritPercentage)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          গড় স্কোর
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 truncate w-full px-1">
                        {toBengaliDigits(second.eligibleLiveExamsCount)}টি এক্সাম
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="invisible" />
                )}

                {/* 1st Place - Center Pedestal (Elevated, Taller & Crowned) */}
                {first ? (
                  <div className="flex flex-col items-center text-center -mt-6 sm:-mt-8 z-10">
                    {/* Golden Crown */}
                    <div className="mb-1 filter drop-shadow-[0_2px_12px_rgba(251,191,36,0.7)] animate-pulse">
                      <Crown className="w-7 h-7 sm:w-9 sm:h-9 text-amber-400 fill-amber-400" />
                    </div>

                    {/* Avatar + Badge */}
                    <div className="relative mb-2">
                      <img
                        src={first.avatar}
                        alt={first.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-18 h-18 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)] bg-slate-800"
                      />
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black shadow-lg border-2 border-[#141a2e] flex items-center justify-center">
                        ১
                      </div>
                    </div>

                    {/* Pedestal Box */}
                    <div className={`w-full pt-5 pb-5 px-1.5 sm:px-2 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-[#2a365c] via-[#212b4a] to-[#182038] dark:from-[#1e2744] dark:via-[#161e36] dark:to-[#12182c] border-t-2 border-x border-amber-400/60 shadow-2xl backdrop-blur-md flex flex-col items-center justify-between min-h-[175px] sm:min-h-[200px] ${
                      first.isCurrentUser ? 'ring-2 ring-emerald-400' : ''
                    }`}>
                      <div className="w-full">
                        <h4 className="font-black text-sm sm:text-base text-white truncate max-w-full px-1 flex items-center justify-center gap-1">
                          <span>{first.name}</span>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </h4>
                        {first.isCurrentUser && (
                          <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-600 text-white mt-0.5">
                            আপনার প্রোফাইল
                          </span>
                        )}
                      </div>

                      <div className="my-1.5">
                        <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight leading-none drop-shadow-sm">
                          {toBengaliDigits(first.meritPercentage)}%
                        </div>
                        <div className="text-[10px] text-amber-200 font-bold mt-0.5">
                          চ্যাম্পিয়ন স্কোর
                        </div>
                      </div>

                      <div className="text-[10px] text-amber-200/90 font-bold truncate w-full px-1 bg-amber-500/20 py-0.5 rounded-md border border-amber-400/30">
                        {toBengaliDigits(first.eligibleLiveExamsCount)}টি লাইভ এক্সাম
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="invisible" />
                )}

                {/* 3rd Place - Right Pedestal */}
                {third ? (
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar + Badge */}
                    <div className="relative mb-2">
                      <img
                        src={third.avatar}
                        alt={third.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)] bg-slate-800"
                      />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-black shadow-md border-2 border-[#141a2e] flex items-center justify-center">
                        ৩
                      </div>
                    </div>

                    {/* Pedestal Box */}
                    <div className={`w-full pt-4 pb-4 px-1.5 sm:px-2 rounded-t-2xl sm:rounded-t-3xl bg-[#1e2742]/90 dark:bg-[#151c32]/95 border-t border-x border-emerald-400/30 backdrop-blur-sm flex flex-col items-center justify-between min-h-[145px] sm:min-h-[165px] ${
                      third.isCurrentUser ? 'ring-2 ring-emerald-400' : ''
                    }`}>
                      <div className="w-full">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate max-w-full px-1">
                          {third.name}
                        </h4>
                        {third.isCurrentUser && (
                          <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-600 text-white mt-0.5">
                            আপনি
                          </span>
                        )}
                      </div>

                      <div className="my-1">
                        <div className="text-base sm:text-xl font-black text-emerald-400 tracking-tight leading-none">
                          {toBengaliDigits(third.meritPercentage)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          গড় স্কোর
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 truncate w-full px-1">
                        {toBengaliDigits(third.eligibleLiveExamsCount)}টি এক্সাম
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="invisible" />
                )}
              </div>
            </div>

            {/* Remaining Positions (Rank 4, 5, etc.) Clean Card Rows */}
            {remainingEntries.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {remainingEntries.map((student) => (
                  <div
                    key={student.studentId}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                      student.isCurrentUser
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Number */}
                      <div className="w-7 sm:w-8 flex justify-center shrink-0">
                        <span className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500">
                          #{toBengaliDigits(student.rank)}
                        </span>
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border ${
                            student.isCurrentUser
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>

                      {/* Student Name & Meta */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {student.name}
                          </h4>
                          {student.isCurrentUser && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-600 text-white shrink-0">
                              <CheckCircle2 className="h-2.5 w-2.5" /> আপনি
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                            {toBengaliDigits(student.eligibleLiveExamsCount)}টি লাইভ এক্সাম
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            গড় ভুল: {toBengaliDigits(student.averageWrongAnswers)}টি
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score Tag with Rank Movement Arrow (Reference Image Style) */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {toBengaliDigits(student.meritPercentage)}%
                          </span>
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 shrink-0" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          গড় স্কোর
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Current User Rank Banner */}
      {showUserRankBanner && currentUser && (
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 min-w-0">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[11px] sm:text-xs truncate">
              {currentUserRank ? (
                <>
                  আপনার অবস্থান:{' '}
                  <strong className="text-slate-900 dark:text-white font-black">
                    #{toBengaliDigits(currentUserRank)}
                  </strong>{' '}
                  (লাইভ এক্সাম: {toBengaliDigits(currentUserEntry?.eligibleLiveExamsCount ?? 0)}টি, গড় মার্ক: {toBengaliDigits(currentUserEntry?.meritPercentage ?? 0)}%, গড় ভুল: {toBengaliDigits(currentUserEntry?.averageWrongAnswers ?? 0)}টি)
                </>
              ) : (
                <>
                  আপনি এখনও কোনো লাইভ পরীক্ষার ১ম প্রচেষ্টায় অংশ নেননি। বেশি বেশি লাইভ পরীক্ষায় অংশ নিয়ে মেধা তালিকায় স্থান করে নিন!
                </>
              )}
            </span>
          </div>

          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-0.5">
            <Flame className="h-3 w-3 fill-current" /> লাইভ আপডেট
          </span>
        </div>
      )}
    </div>
  );
}
