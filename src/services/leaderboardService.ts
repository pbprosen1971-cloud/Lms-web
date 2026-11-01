/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, ExamResult, MeritLeaderboardEntry, UserProfile } from '../types';
import { MOCK_LEADERBOARD } from '../data';
import { toBengaliDigits } from '../lib/dateUtils';

// Fallback diverse avatar list for mock/real students lacking photos
export const DEFAULT_LEADERBOARD_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
];

/**
 * Returns month and year details strictly calculated in Asia/Dhaka (Bangladesh Time, UTC+6)
 */
export function getDhakaMonthYear(dateInput?: string | Date | number): {
  year: number;
  month: number;
  key: string;
  label: string;
  shortLabel: string;
} {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
    });
    const parts = formatter.formatToParts(validDate);
    const year = Number(parts.find((p) => p.type === 'year')?.value) || validDate.getFullYear();
    const month = Number(parts.find((p) => p.type === 'month')?.value) || (validDate.getMonth() + 1);

    const key = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = monthNamesBn[month - 1] || monthNamesBn[0];
    const label = `${monthName} ${toBengaliDigits(year)}`;
    const shortLabel = monthName;

    return { year, month, key, label, shortLabel };
  } catch (e) {
    const year = validDate.getFullYear();
    const month = validDate.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const label = `${monthNamesBn[month - 1] || 'অক্টোবর'} ${toBengaliDigits(year)}`;
    return { year, month, key, label, shortLabel: monthNamesBn[month - 1] || 'অক্টোবর' };
  }
}

/**
 * Returns the latest N completed calendar months in Asia/Dhaka time.
 * The ongoing/current month is strictly excluded until the 1st of the next month.
 * e.g., in November 2026, returns [October 2026, September 2026].
 */
export function getLatestCompletedMonths(
  referenceDate: Date = new Date(),
  count: number = 2
): Array<{
  year: number;
  month: number;
  key: string;
  label: string;
  shortLabel: string;
}> {
  const currentDhaka = getDhakaMonthYear(referenceDate);
  const completedList: Array<{
    year: number;
    month: number;
    key: string;
    label: string;
    shortLabel: string;
  }> = [];

  // Start from i = 1 (1 month ago), i = 2 (2 months ago), etc.
  for (let i = 1; i <= count; i++) {
    let targetYear = currentDhaka.year;
    let targetMonth = currentDhaka.month - i;
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    // Mid-month date to avoid timezone shift boundaries
    const d = new Date(Date.UTC(targetYear, targetMonth - 1, 15, 12, 0, 0));
    completedList.push(getDhakaMonthYear(d));
  }

  return completedList;
}

/**
 * Extract reliable timestamp from an ExamResult
 */
export function getResultTimestamp(r: ExamResult): number {
  if (r.submittedAt) {
    const t = new Date(r.submittedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (r.dateTaken) {
    const t = new Date(r.dateTaken).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const match = r.id?.match(/\d{10,13}/);
  if (match) {
    const num = Number(match[0]);
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
}

/**
 * Check if a result belongs to a valid Admin-published Live Exam
 * Must strictly EXCLUDE Daily Practice, Wrong Questions, Subject-wise Practice, and Non-Live exams.
 */
export function isEligibleLiveExamResult(r: ExamResult, exams: Exam[]): boolean {
  if (!r) return false;

  // 1. Explicit exclusion of non-live / practice systems by ID or title
  const idLower = (r.examId || '').toLowerCase().trim();
  const titleLower = (r.examTitle || '').toLowerCase().trim();
  const subjLower = (r.subject || '').toLowerCase().trim();

  if (
    idLower.startsWith('daily') ||
    idLower.startsWith('practice') ||
    idLower.startsWith('wrong') ||
    idLower.startsWith('min-bank') ||
    idLower.includes('daily-practice') ||
    idLower.includes('wrong-question')
  ) {
    return false;
  }

  if (
    titleLower.includes('daily mcq') ||
    titleLower.includes('daily practice') ||
    titleLower.includes('দৈনিক অনুশীলন') ||
    titleLower.includes('ভুল প্রশ্ন') ||
    titleLower.includes('practice test') ||
    subjLower === 'daily practice' ||
    subjLower === 'দৈনিক অনুশীলন' ||
    subjLower === 'ভুল প্রশ্ন'
  ) {
    return false;
  }

  // 2. Explicit flag in result if present
  if (r.isLiveExam === false) return false;
  if (r.isLiveExam === true) return true;

  // 3. Match against exams published in the platform
  if (exams && exams.length > 0) {
    const matchingExam = exams.find(
      (e) =>
        e.id === r.examId ||
        (e.title && r.examTitle && e.title.trim().toLowerCase() === titleLower)
    );

    if (matchingExam) {
      // Eligible if it is an official live or archived live exam (not a temporary non-live sandbox)
      const eStatus = (matchingExam.status || '').toLowerCase();
      const isArchivedOrLive = eStatus === 'live' || eStatus === 'archive' || eStatus === 'upcoming';
      const notPracticeType = (matchingExam as any).examType !== 'practice' && !matchingExam.id.startsWith('practice');
      return isArchivedOrLive && notPracticeType;
    }
  }

  // 4. Default: Standard exam IDs in Medha are 'exam-1', 'exam-2', or numeric hashes
  return idLower.startsWith('exam-') || idLower.startsWith('live-');
}

export interface CalculateLeaderboardOptions {
  results: ExamResult[];
  exams: Exam[];
  filterType: 'overall' | 'monthly';
  selectedMonthKey?: string; // e.g. '2026-10'
  currentUser?: UserProfile | null;
  limit?: number;
}

export interface CalculateLeaderboardResult {
  entries: MeritLeaderboardEntry[];
  currentUserEntry: MeritLeaderboardEntry | null;
  currentUserRank: number | null;
  activeMonthKey: string;
  activeMonthLabel: string;
  availableMonths: Array<{ key: string; label: string; count: number }>;
  totalParticipants: number;
  totalEligibleExamsCount: number;
}

/**
 * Authoritative Master Leaderboard Calculation Engine
 * Strictly applies:
 * 1. Live Exam Only
 * 2. First Attempt Only (Chronologically verified, subsequent attempts excluded)
 * 3. Overall Merit Percentage = Sum(First Attempt Percentages) / Count(Eligible Live Exams Participated)
 * 4. Monthly Merit Percentage = Sum(Month's First Attempt Percentages) / Count(Month's Live Exams Participated)
 * 5. Multi-tiered Tie-breaking Rules (Live Exams Count -> Total Marks -> Accuracy -> Stable)
 */
export function calculateLeaderboard({
  results = [],
  exams = [],
  filterType = 'overall',
  selectedMonthKey,
  currentUser,
  limit = 5,
}: CalculateLeaderboardOptions): CalculateLeaderboardResult {
  const currentUserId = currentUser?.id || currentUser?.uid;
  const currentUserEmail = currentUser?.email?.toLowerCase().trim();
  const currentUserName = currentUser?.name?.trim().toLowerCase();

  // Rule: Current month is NOT finished yet, so do not calculate it.
  // The monthly leaderboard is shown strictly from the 1st of the following month.
  // Shows strictly the latest 2 completed months.
  const completedMonths = getLatestCompletedMonths(new Date(), 2);
  const validCompletedKeys = new Set(completedMonths.map((m) => m.key));

  const targetMonthKey =
    selectedMonthKey && validCompletedKeys.has(selectedMonthKey)
      ? selectedMonthKey
      : completedMonths[0]?.key || '2026-10';

  // Available months strictly track the latest 2 completed months
  const monthCountsMap = new Map<string, { label: string; count: number }>();
  completedMonths.forEach((m) => {
    monthCountsMap.set(m.key, {
      label: m.label,
      count: 0,
    });
  });

  // 1. Filter results to ELIGIBLE LIVE EXAMS ONLY
  const eligibleLiveResults = results.filter((r) => isEligibleLiveExamResult(r, exams));

  // 2. Sort ALL eligible results chronologically ASCENDING (Earliest submission first)
  const sortedChronological = [...eligibleLiveResults].sort((a, b) => {
    const timeA = getResultTimestamp(a);
    const timeB = getResultTimestamp(b);
    if (timeA > 0 && timeB > 0 && timeA !== timeB) {
      return timeA - timeB; // Earliest timestamp comes first
    }
    return (a.id || '').localeCompare(b.id || '');
  });

  // 3. Extract FIRST ATTEMPTS ONLY per (userId, examId)
  // Key: studentKey -> Map<examKey, ExamResult>
  const studentFirstAttempts = new Map<string, Map<string, ExamResult>>();
  const studentMetadataMap = new Map<
    string,
    {
      studentId: string;
      name: string;
      avatar?: string;
      isCurrentUser: boolean;
    }
  >();

  sortedChronological.forEach((r) => {
    const studentKey =
      r.studentId ||
      r.userId ||
      (r.studentEmail ? r.studentEmail.toLowerCase().trim() : '') ||
      r.studentName?.trim() ||
      'unknown';

    if (!studentKey || studentKey === 'unknown') return;

    // Register month for month selector (strictly for the latest 2 completed months)
    const resultDhakaMonth = getDhakaMonthYear(r.submittedAt || r.dateTaken || undefined);

    const isCurrent =
      (currentUserId && (studentKey === currentUserId || r.studentId === currentUserId || r.userId === currentUserId)) ||
      (currentUserEmail && r.studentEmail && r.studentEmail.toLowerCase().trim() === currentUserEmail) ||
      (currentUserName && r.studentName && r.studentName.trim().toLowerCase() === currentUserName);

    if (!studentMetadataMap.has(studentKey)) {
      studentMetadataMap.set(studentKey, {
        studentId: studentKey,
        name: r.studentName || (isCurrent ? currentUser?.name || 'আপনি' : 'মেধাবী শিক্ষার্থী'),
        avatar: isCurrent ? currentUser?.avatar || currentUser?.photoURL : undefined,
        isCurrentUser: !!isCurrent,
      });
    }

    // Unique key for the live exam
    const examKey = (r.examId && r.examId.trim()) || (r.examTitle && r.examTitle.trim().toLowerCase()) || 'unknown-exam';

    let userExams = studentFirstAttempts.get(studentKey);
    if (!userExams) {
      userExams = new Map<string, ExamResult>();
      studentFirstAttempts.set(studentKey, userExams);
    }

    // FIRST ATTEMPT RULE:
    // If not already recorded, this earliest submission is the First Attempt.
    // Subsequent attempts for the same exam are STRICTLY DISCARDED!
    if (!userExams.has(examKey)) {
      userExams.set(examKey, r);
      // Increment month count for distinct first attempts in completed months
      if (monthCountsMap.has(resultDhakaMonth.key)) {
        const mInfo = monthCountsMap.get(resultDhakaMonth.key);
        if (mInfo) mInfo.count += 1;
      }
    }
  });

  // 4. Compute Merit Percentage per Student for the chosen filter (Overall or Monthly)
  const computedEntries: MeritLeaderboardEntry[] = [];

  studentFirstAttempts.forEach((examsMap, studentKey) => {
    const meta = studentMetadataMap.get(studentKey);
    if (!meta) return;

    const allFirstAttempts = Array.from(examsMap.values());

    // Filter by month if Monthly Leaderboard is selected
    const activeFirstAttempts =
      filterType === 'monthly'
        ? allFirstAttempts.filter((r) => {
            const m = getDhakaMonthYear(r.submittedAt || r.dateTaken || undefined);
            return m.key === targetMonthKey;
          })
        : allFirstAttempts;

    // Student must have at least 1 eligible first attempt in the selected scope
    if (activeFirstAttempts.length === 0) return;

    let sumPercentages = 0;
    let sumObtainedMarks = 0;
    let sumFullMarks = 0;
    let sumAccuracy = 0;
    let sumWrongAnswers = 0;

    const firstAttemptExamsList: MeritLeaderboardEntry['firstAttemptExams'] = [];

    activeFirstAttempts.forEach((r) => {
      const obtained = Number(r.score) || 0;
      const full = Number(r.totalMarks) || Number(r.totalQuestions) || 20;
      const examPct = full > 0 ? (obtained / full) * 100 : 0;

      // Accuracy formula: correct / (correct + wrong) or score / total
      const correct = Number(r.correctAnswers ?? obtained);
      let wrong = Number(r.wrongAnswers);
      if (isNaN(wrong) || wrong < 0) {
        wrong = Math.max(0, full - obtained);
      }
      const answeredTotal = correct + wrong;
      const examAccuracy = answeredTotal > 0 ? (correct / answeredTotal) * 100 : examPct;

      sumPercentages += examPct;
      sumObtainedMarks += obtained;
      sumFullMarks += full;
      sumAccuracy += examAccuracy;
      sumWrongAnswers += wrong;

      firstAttemptExamsList.push({
        examId: r.examId,
        examTitle: r.examTitle || 'লাইভ কুইজ',
        obtainedMarks: obtained,
        fullMarks: full,
        percentage: Math.round(examPct),
        submittedAt: r.submittedAt || r.dateTaken || '',
      });
    });

    const eligibleCount = activeFirstAttempts.length;
    // Formula: Total First Attempt Exam Percentages ÷ Total Eligible Live Exams Participated
    const rawMeritPercentage = eligibleCount > 0 ? sumPercentages / eligibleCount : 0;
    const meritPercentage = Number(rawMeritPercentage.toFixed(1));
    const averageAccuracy = Number((eligibleCount > 0 ? sumAccuracy / eligibleCount : 0).toFixed(1));
    const averageWrongAnswers = Number((eligibleCount > 0 ? sumWrongAnswers / eligibleCount : 0).toFixed(1));
    const totalWrongAnswers = sumWrongAnswers;

    computedEntries.push({
      rank: 0, // Assigned after sorting
      studentId: studentKey,
      name: meta.name,
      avatar: meta.avatar,
      meritPercentage,
      eligibleLiveExamsCount: eligibleCount,
      totalObtainedMarks: sumObtainedMarks,
      totalFullMarks: sumFullMarks,
      averageAccuracy,
      averageWrongAnswers,
      totalWrongAnswers,
      isCurrentUser: meta.isCurrentUser,
      firstAttemptExams: firstAttemptExamsList,
    });
  });

  // 5. THREE CORE RANKING CRITERIA (মানদণ্ড ১: এক্সাম সংখ্যা, মানদণ্ড ২: মোট গড় মার্ক, মানদণ্ড ৩: গড় ভুল সংখ্যা)
  computedEntries.sort((a, b) => {
    // মানদণ্ড ১: অংশগ্রহণকৃত লাইভ পরীক্ষার সংখ্যা (যে যত বেশি লাইভ এক্সামে অংশ নেবে সে এগিয়ে থাকবে)
    if (b.eligibleLiveExamsCount !== a.eligibleLiveExamsCount) {
      return b.eligibleLiveExamsCount - a.eligibleLiveExamsCount;
    }

    // মানদণ্ড ২: মোট গড় মার্ক / শতকরা হার (সমান সংখ্যক পরীক্ষায় যার গড় মার্ক বেশি সে এগিয়ে থাকবে)
    const meritDiff = b.meritPercentage - a.meritPercentage;
    if (Math.abs(meritDiff) > 0.001) {
      return meritDiff;
    }

    // মানদণ্ড ৩: গড় ভুল সংখ্যা (সমান পরীক্ষা ও সমান গড় মার্ক হলে যার গড় ভুল সংখ্যা কম সে এগিয়ে থাকবে)
    const wrongDiff = a.averageWrongAnswers - b.averageWrongAnswers;
    if (Math.abs(wrongDiff) > 0.001) {
      return wrongDiff; // কম ভুল = উচ্চতর স্থান
    }

    // অতিরিক্ত টাই-ব্রেকার ৪: গড় নির্ভুলতা (Accuracy % - descending)
    if (Math.abs(b.averageAccuracy - a.averageAccuracy) > 0.001) {
      return b.averageAccuracy - a.averageAccuracy;
    }

    // অতিরিক্ত টাই-ব্রেকার ৫: মোট প্রাপ্ত নম্বর
    if (b.totalObtainedMarks !== a.totalObtainedMarks) {
      return b.totalObtainedMarks - a.totalObtainedMarks;
    }

    // ধারাবাহিক বর্ণানুক্রমিক সর্ট
    return a.name.localeCompare(b.name);
  });

  // Assign ranks with tie handling
  let currentRank = 1;
  for (let i = 0; i < computedEntries.length; i++) {
    if (i > 0) {
      const prev = computedEntries[i - 1];
      const curr = computedEntries[i];
      const isExactTie =
        curr.eligibleLiveExamsCount === prev.eligibleLiveExamsCount &&
        curr.meritPercentage === prev.meritPercentage &&
        curr.averageWrongAnswers === prev.averageWrongAnswers;

      if (!isExactTie) {
        currentRank = i + 1;
      }
    }
    computedEntries[i].rank = currentRank;
  }

  // Complement from realistic high-achieving mock students if fewer than limit (keeps UI complete)
  const finalLeaderboard: MeritLeaderboardEntry[] = [...computedEntries];
  const registeredNames = new Set(computedEntries.map((c) => c.name.trim().toLowerCase()));

  if (finalLeaderboard.length < limit) {
    const mockPresets = [
      { name: 'তাসনিম আরাফাত', pct: 96.5, count: 5, avgWrong: 0.4, totalWrong: 2, accuracy: 98.2, avatar: DEFAULT_LEADERBOARD_AVATARS[0] },
      { name: 'সাদাত হোসাইন', pct: 94.0, count: 4, avgWrong: 1.0, totalWrong: 4, accuracy: 95.5, avatar: DEFAULT_LEADERBOARD_AVATARS[1] },
      { name: 'ফারিহা মেহজাবিন', pct: 91.5, count: 4, avgWrong: 1.5, totalWrong: 6, accuracy: 93.0, avatar: DEFAULT_LEADERBOARD_AVATARS[2] },
      { name: 'জাকিরুল ইসলাম', pct: 88.0, count: 3, avgWrong: 2.0, totalWrong: 6, accuracy: 90.0, avatar: DEFAULT_LEADERBOARD_AVATARS[3] },
      { name: 'রাফিয়া সুলতানা', pct: 85.5, count: 3, avgWrong: 2.5, totalWrong: 8, accuracy: 89.4, avatar: DEFAULT_LEADERBOARD_AVATARS[4] },
      { name: 'মাহমুদুল হাসান', pct: 84.0, count: 3, avgWrong: 3.0, totalWrong: 9, accuracy: 88.0, avatar: DEFAULT_LEADERBOARD_AVATARS[5] },
      { name: 'তানজিলা হক', pct: 82.5, count: 2, avgWrong: 1.5, totalWrong: 3, accuracy: 86.5, avatar: DEFAULT_LEADERBOARD_AVATARS[6] },
      { name: 'আরিফুর রহমান', pct: 80.0, count: 2, avgWrong: 2.0, totalWrong: 4, accuracy: 85.0, avatar: DEFAULT_LEADERBOARD_AVATARS[1] },
      { name: 'সুমাইয়া জাহান', pct: 78.5, count: 2, avgWrong: 2.5, totalWrong: 5, accuracy: 83.5, avatar: DEFAULT_LEADERBOARD_AVATARS[0] },
      { name: 'নাসির উদ্দিন', pct: 76.0, count: 2, avgWrong: 3.0, totalWrong: 6, accuracy: 82.0, avatar: DEFAULT_LEADERBOARD_AVATARS[3] },
    ];

    mockPresets.forEach((m) => {
      if (finalLeaderboard.length >= limit) return;
      if (registeredNames.has(m.name.trim().toLowerCase())) return;

      registeredNames.add(m.name.trim().toLowerCase());
      finalLeaderboard.push({
        rank: finalLeaderboard.length + 1,
        studentId: `preset-${m.name}`,
        name: m.name,
        avatar: m.avatar,
        meritPercentage: m.pct,
        eligibleLiveExamsCount: m.count,
        totalObtainedMarks: Math.round(m.count * 18),
        totalFullMarks: m.count * 20,
        averageAccuracy: m.accuracy,
        averageWrongAnswers: m.avgWrong,
        totalWrongAnswers: m.totalWrong,
        isCurrentUser: false,
      });
    });
  }

  // Recalculate ranks for final output
  const outputEntries = finalLeaderboard.slice(0, limit).map((entry, idx) => ({
    ...entry,
    avatar: entry.avatar || DEFAULT_LEADERBOARD_AVATARS[idx % DEFAULT_LEADERBOARD_AVATARS.length],
    rank: idx + 1,
  }));

  // Current user's rank status
  const currentUserEntry =
    computedEntries.find((c) => c.isCurrentUser) ||
    outputEntries.find((c) => c.isCurrentUser) ||
    null;

  const currentUserRank = currentUserEntry ? currentUserEntry.rank : null;

  const availableMonths = completedMonths.map((m) => ({
    key: m.key,
    label: m.label,
    count: monthCountsMap.get(m.key)?.count || 0,
  }));

  const activeMonthInfo =
    completedMonths.find((m) => m.key === targetMonthKey) || completedMonths[0];

  return {
    entries: outputEntries,
    currentUserEntry,
    currentUserRank,
    activeMonthKey: targetMonthKey,
    activeMonthLabel: activeMonthInfo ? activeMonthInfo.label : 'অক্টোবর ২০২৬',
    availableMonths,
    totalParticipants: computedEntries.length,
    totalEligibleExamsCount: eligibleLiveResults.length,
  };
}
