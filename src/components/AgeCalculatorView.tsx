/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Info,
  Clock,
  Gift,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface AgeCalculatorViewProps {
  setView: (view: string) => void;
}

interface CalendarDate {
  year: number;
  month: number; // 1 to 12
  day: number;   // 1 to 31
}

interface AgeCalculationResult {
  years: number;
  months: number;
  days: number;
  mode: 'circular' | 'today';
  eligibilityStatus?: 'eligible' | 'under_age' | 'over_age';
  nextBirthdayDaysRemaining?: number;
  nextBirthdayFormatted?: string;
  birthDateFormatted: string;
  targetDateFormatted: string;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const BENGALI_MONTHS = [
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

export function toBengaliNumber(val: number | string): string {
  return String(val).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
}

/**
 * Returns the exact number of days in a given month (1-12) of a given year.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns today's date from the user's local system clock without timezone offset issues.
 */
function getTodayLocal(): CalendarDate {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Formats a CalendarDate into YYYY-MM-DD for HTML date input values.
 */
function formatYMD(d: CalendarDate): string {
  const yyyy = String(d.year).padStart(4, '0');
  const mm = String(d.month).padStart(2, '0');
  const dd = String(d.day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a CalendarDate or YYYY-MM-DD string into DD/MM/YYYY.
 */
function formatYMDToDMY(ymd: string): string {
  const parsed = parseYMD(ymd);
  if (!parsed) return '';
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  const yyyy = String(parsed.year).padStart(4, '0');
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Auto-formats user typing into dd/mm/yyyy (supports both English and Bengali digits).
 */
function formatMaskDMY(raw: string): string {
  const normalized = raw.replace(/[০-৯]/g, (ch) => {
    const idx = BENGALI_DIGITS.indexOf(ch);
    return idx !== -1 ? String(idx) : ch;
  });

  // Pad single digit before slash e.g. "5/" -> "05/" or "05/4/" -> "05/04/"
  const padded = normalized
    .replace(/^(\d)[/.-]/, '0$1/')
    .replace(/^(\d{2})[/.-](\d)[/.-]/, '$1/0$2/');

  const digits = padded.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Parses a DD/MM/YYYY string into YYYY-MM-DD if complete, or 'INVALID' if 10 chars but invalid date.
 */
function parseDMYToYMD(dmy: string): string {
  const trimmed = dmy.trim();
  if (!trimmed) return '';
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return trimmed.length >= 10 ? 'INVALID' : '';
  const dd = match[1];
  const mm = match[2];
  const yyyy = match[3];
  const ymd = `${yyyy}-${mm}-${dd}`;
  return parseYMD(ymd) ? ymd : 'INVALID';
}

/**
 * Parses a YYYY-MM-DD string directly into a CalendarDate without UTC/Timezone shift.
 */
function parseYMD(value: string): CalendarDate | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return null;

  return { year, month, day };
}

/**
 * Compares two CalendarDates:
 * returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/**
 * Formats a CalendarDate in readable Bengali (e.g. "১৫ মে ২০২৬").
 */
function formatBengaliCalendarDate(d: CalendarDate): string {
  const dayBn = toBengaliNumber(d.day);
  const monthBn = BENGALI_MONTHS[d.month - 1] || '';
  const yearBn = toBengaliNumber(d.year);
  return `${dayBn} ${monthBn} ${yearBn}`;
}

/**
 * Calculates exact calendar age in years, months, and days between birthDate and targetDate.
 */
function calculateExactCalendarAge(
  birth: CalendarDate,
  target: CalendarDate
): { years: number; months: number; days: number } {
  let years = target.year - birth.year;
  let months = target.month - birth.month;
  let days = target.day - birth.day;

  if (days < 0) {
    const prevMonth = target.month === 1 ? 12 : target.month - 1;
    const prevMonthYear = target.month === 1 ? target.year - 1 : target.year;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);
    const effectiveBirthDay = Math.min(birth.day, daysInPrevMonth);
    days = daysInPrevMonth - effectiveBirthDay + target.day;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

/**
 * Calculates next birthday date and remaining days from a reference date (today).
 */
function calculateNextBirthdayInfo(
  birth: CalendarDate,
  today: CalendarDate
): { daysRemaining: number; nextBirthdayDate: CalendarDate } {
  let nextYear = today.year;
  const maxDayThisYear = getDaysInMonth(nextYear, birth.month);
  let candidateDay = Math.min(birth.day, maxDayThisYear);
  let candidate: CalendarDate = {
    year: nextYear,
    month: birth.month,
    day: candidateDay,
  };

  // If this year's birthday has already passed, move to next year
  if (compareCalendarDates(candidate, today) < 0) {
    nextYear = today.year + 1;
    const maxDayNextYear = getDaysInMonth(nextYear, birth.month);
    candidateDay = Math.min(birth.day, maxDayNextYear);
    candidate = {
      year: nextYear,
      month: birth.month,
      day: candidateDay,
    };
  }

  const todayUtcMs = Date.UTC(today.year, today.month - 1, today.day);
  const nextUtcMs = Date.UTC(candidate.year, candidate.month - 1, candidate.day);
  const daysRemaining = Math.max(0, Math.round((nextUtcMs - todayUtcMs) / 86400000));

  return {
    daysRemaining,
    nextBirthdayDate: candidate,
  };
}

export default function AgeCalculatorView({ setView }: AgeCalculatorViewProps) {
  const [birthDateStr, setBirthDateStr] = useState<string>('');
  const [birthInputText, setBirthInputText] = useState<string>('');
  const [circularDateStr, setCircularDateStr] = useState<string>('');
  const [circularInputText, setCircularInputText] = useState<string>('');
  const [useTodayDate, setUseTodayDate] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<AgeCalculationResult | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [scrollPulse, setScrollPulse] = useState<boolean>(false);
  const resultSectionRef = useRef<HTMLDivElement | null>(null);
  const birthPickerRef = useRef<HTMLInputElement | null>(null);
  const circularPickerRef = useRef<HTMLInputElement | null>(null);

  const todayStr = useMemo(() => formatYMD(getTodayLocal()), []);
  const todayDMYStr = useMemo(() => formatYMDToDMY(todayStr), [todayStr]);

  const scrollToResultSection = () => {
    setTimeout(() => {
      const el = resultSectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const navbarOffset = 90;
      const targetTop = Math.max(0, window.scrollY + rect.top - navbarOffset);
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
      setScrollPulse(true);
      setTimeout(() => setScrollPulse(false), 1200);
    }, 80);
  };

  const runAgeCalculation = (
    bStr: string,
    cStr: string,
    isTodayMode: boolean,
    showEmptyErrors: boolean
  ): boolean => {
    const todayLocal = getTodayLocal();

    if (!bStr.trim()) {
      setCalculationResult(null);
      if (showEmptyErrors) {
        setValidationError('অনুগ্রহ করে আপনার জন্ম তারিখ নির্বাচন করুন।');
      } else {
        setValidationError('');
      }
      return false;
    }

    const parsedBirth = parseYMD(bStr);
    if (!parsedBirth) {
      setCalculationResult(null);
      setValidationError('আপনার জন্ম তারিখটি সঠিক নয়। অনুগ্রহ করে বৈধ তারিখ নির্বাচন করুন।');
      return false;
    }

    // Future birth date is strictly forbidden
    if (compareCalendarDates(parsedBirth, todayLocal) > 0) {
      setCalculationResult(null);
      setValidationError('ভবিষ্যতের কোনো জন্মতারিখ গ্রহণ করা যাবে না। অনুগ্রহ করে সঠিক জন্ম তারিখ নির্বাচন করুন।');
      return false;
    }

    let targetCalendarDate: CalendarDate;

    if (isTodayMode) {
      targetCalendarDate = todayLocal;
    } else {
      if (!cStr.trim()) {
        setCalculationResult(null);
        if (showEmptyErrors) {
          setValidationError(
            'অনুগ্রহ করে সার্কুলারে নির্ধারিত তারিখ নির্বাচন করুন অথবা "আজকের তারিখ অনুযায়ী বয়স গণনা করুন" অপশনে টিক দিন।'
          );
        } else {
          setValidationError('');
        }
        return false;
      }

      const parsedCircular = parseYMD(cStr);
      if (!parsedCircular) {
        setCalculationResult(null);
        setValidationError('সার্কুলারে নির্ধারিত তারিখটি সঠিক নয়। অনুগ্রহ করে বৈধ তারিখ নির্বাচন করুন।');
        return false;
      }
      targetCalendarDate = parsedCircular;
    }

    // Target calculation date cannot be earlier than birth date
    if (compareCalendarDates(targetCalendarDate, parsedBirth) < 0) {
      setCalculationResult(null);
      setValidationError(
        isTodayMode
          ? 'আজকের তারিখের চেয়ে জন্ম তারিখ পরে হতে পারে না।'
          : 'সার্কুলারে নির্ধারিত তারিখ আপনার জন্ম তারিখের আগের হতে পারে না। অনুগ্রহ করে সঠিক তারিখ নির্বাচন করুন।'
      );
      return false;
    }

    setValidationError('');

    const { years, months, days } = calculateExactCalendarAge(parsedBirth, targetCalendarDate);

    if (isTodayMode) {
      const { daysRemaining, nextBirthdayDate } = calculateNextBirthdayInfo(parsedBirth, todayLocal);
      setCalculationResult({
        years,
        months,
        days,
        mode: 'today',
        nextBirthdayDaysRemaining: daysRemaining,
        nextBirthdayFormatted: formatBengaliCalendarDate(nextBirthdayDate),
        birthDateFormatted: formatBengaliCalendarDate(parsedBirth),
        targetDateFormatted: formatBengaliCalendarDate(targetCalendarDate),
      });
    } else {
      // Government job general age eligibility check:
      // Minimum: 18 years completed (years >= 18)
      // Maximum: Not exceeding 32 years (years < 32 || (years === 32 && months === 0 && days === 0))
      let eligibilityStatus: 'eligible' | 'under_age' | 'over_age';
      if (years < 18) {
        eligibilityStatus = 'under_age';
      } else if (years > 32 || (years === 32 && (months > 0 || days > 0))) {
        eligibilityStatus = 'over_age';
      } else {
        eligibilityStatus = 'eligible';
      }

      setCalculationResult({
        years,
        months,
        days,
        mode: 'circular',
        eligibilityStatus,
        birthDateFormatted: formatBengaliCalendarDate(parsedBirth),
        targetDateFormatted: formatBengaliCalendarDate(targetCalendarDate),
      });
    }

    return true;
  };

  const handleBirthDateChange = (nextBirthStr: string) => {
    setBirthDateStr(nextBirthStr);
    setBirthInputText(formatYMDToDMY(nextBirthStr));
    if (hasSubmitted || calculationResult || validationError) {
      runAgeCalculation(nextBirthStr, circularDateStr, useTodayDate, false);
    }
  };

  const handleBirthTextChange = (rawText: string) => {
    const formatted = formatMaskDMY(rawText);
    setBirthInputText(formatted);
    const ymd = parseDMYToYMD(formatted);
    const nextBirthStr = ymd || (formatted.length > 0 ? 'INVALID' : '');
    setBirthDateStr(nextBirthStr);
    if (ymd && ymd !== 'INVALID') {
      if (hasSubmitted || calculationResult || validationError) {
        runAgeCalculation(ymd, circularDateStr, useTodayDate, false);
      }
    } else if (!formatted) {
      setCalculationResult(null);
    }
  };

  const handleCircularDateChange = (nextCircularStr: string) => {
    setCircularDateStr(nextCircularStr);
    setCircularInputText(formatYMDToDMY(nextCircularStr));
    if (hasSubmitted || calculationResult || validationError) {
      runAgeCalculation(birthDateStr, nextCircularStr, useTodayDate, false);
    }
  };

  const handleCircularTextChange = (rawText: string) => {
    const formatted = formatMaskDMY(rawText);
    setCircularInputText(formatted);
    const ymd = parseDMYToYMD(formatted);
    const nextCircularStr = ymd || (formatted.length > 0 ? 'INVALID' : '');
    setCircularDateStr(nextCircularStr);
    if (ymd && ymd !== 'INVALID') {
      if (hasSubmitted || calculationResult || validationError) {
        runAgeCalculation(birthDateStr, ymd, useTodayDate, false);
      }
    } else if (!formatted) {
      setCalculationResult(null);
    }
  };

  const handleToggleTodayMode = (checked: boolean) => {
    setUseTodayDate(checked);
    setValidationError('');

    // Clear old mode's result or immediately recalculate for the new mode
    if (birthDateStr.trim() && birthDateStr !== 'INVALID') {
      if (checked) {
        runAgeCalculation(birthDateStr, circularDateStr, true, false);
      } else if (circularDateStr.trim() && circularDateStr !== 'INVALID') {
        runAgeCalculation(birthDateStr, circularDateStr, false, false);
      } else {
        setCalculationResult(null);
      }
    } else {
      setCalculationResult(null);
    }
  };

  const handleCalculateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    const isSuccess = runAgeCalculation(birthDateStr, circularDateStr, useTodayDate, true);
    if (isSuccess) {
      scrollToResultSection();
    }
  };

  const handleReset = () => {
    setBirthDateStr('');
    setBirthInputText('');
    setCircularDateStr('');
    setCircularInputText('');
    setUseTodayDate(false);
    setValidationError('');
    setCalculationResult(null);
    setHasSubmitted(false);
    setScrollPulse(false);
  };

  return (
    <div className="min-h-[82vh] bg-slate-50/70 dark:bg-slate-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Back & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary dark:text-emerald-400">
              <Calculator className="h-4 w-4" />
              <span>মেধা এক্সাম • চাকরির বয়স ক্যালকুলেটর</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              চাকরির বয়স ক্যালকুলেটর
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              নিয়োগ বিজ্ঞপ্তিতে নির্ধারিত তারিখ অথবা আজকের তারিখ অনুযায়ী আপনার প্রকৃত বয়স (বছর, মাস ও দিন) নির্ভুলভাবে হিসাব করুন।
            </p>
          </div>

          <button
            type="button"
            onClick={() => setView('home')}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>হোমে ফিরুন</span>
          </button>
        </div>

        {/* Main Calculator Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {/* Card Header Bar */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600/10 via-sky-500/5 to-transparent dark:from-emerald-500/15 dark:via-sky-500/5 dark:to-transparent border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/15 dark:bg-primary/20 text-primary dark:text-emerald-400 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  বয়স গণনার তথ্য প্রদান করুন
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  {useTodayDate
                    ? 'মোড ২: আজকের তারিখ অনুযায়ী সাধারণ বয়স গণনা সক্রিয় আছে'
                    : 'মোড ১: সার্কুলার অনুযায়ী চাকরির বয়স যাচাই (১৮–৩২ বছর)'}
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              আজকের তারিখ: {formatBengaliCalendarDate(getTodayLocal())}
            </span>
          </div>

          {/* Calculator Form */}
          <form onSubmit={handleCalculateSubmit} noValidate className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Input 1: Birth Date (dd/mm/yyyy) */}
              <div className="space-y-2">
                <label
                  htmlFor="birth-date-input"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200"
                >
                  আপনার জন্ম তারিখ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="birth-date-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    value={birthInputText}
                    onChange={(e) => handleBirthTextChange(e.target.value)}
                    onClick={() => {
                      if (!birthInputText) {
                        try {
                          birthPickerRef.current?.showPicker?.();
                        } catch (_) {}
                      }
                    }}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-primary dark:focus:border-emerald-400 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white text-sm font-semibold tracking-wider placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all"
                  />
                  {/* Synchronized Native Calendar Date Picker Trigger */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                    <Calendar className="h-4 w-4 pointer-events-none text-primary dark:text-emerald-400" />
                    <input
                      ref={birthPickerRef}
                      type="date"
                      tabIndex={-1}
                      aria-label="ক্যালেন্ডার থেকে জন্ম তারিখ নির্বাচন করুন"
                      value={parseYMD(birthDateStr) ? birthDateStr : ''}
                      max={todayStr}
                      onChange={(e) => handleBirthDateChange(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as HTMLInputElement).showPicker?.();
                        } catch (_) {}
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  দিন/মাস/বছর (dd/mm/yyyy) ফরম্যাটে লিখুন অথবা ডানপাশের ক্যালেন্ডার আইকনে ক্লিক করুন
                </p>
              </div>

              {/* Input 2: Circular Date (dd/mm/yyyy) */}
              <div className="space-y-2">
                <label
                  htmlFor="circular-date-input"
                  className={`block text-sm font-bold transition-colors ${
                    useTodayDate
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  সার্কুলারে নির্ধারিত তারিখ {!useTodayDate && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    id="circular-date-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    value={useTodayDate ? todayDMYStr : circularInputText}
                    disabled={useTodayDate}
                    onChange={(e) => handleCircularTextChange(e.target.value)}
                    onClick={() => {
                      if (!useTodayDate && !circularInputText) {
                        try {
                          circularPickerRef.current?.showPicker?.();
                        } catch (_) {}
                      }
                    }}
                    className={`w-full pl-4 pr-11 py-3 rounded-xl border text-sm font-semibold tracking-wider placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                      useTodayDate
                        ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:border-primary dark:focus:border-emerald-400 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white'
                    }`}
                  />
                  {/* Synchronized Native Calendar Date Picker Trigger */}
                  <div
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      useTodayDate
                        ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer'
                    }`}
                  >
                    <Calendar
                      className={`h-4 w-4 pointer-events-none ${
                        useTodayDate ? 'text-slate-400 dark:text-slate-600' : 'text-primary dark:text-emerald-400'
                      }`}
                    />
                    {!useTodayDate && (
                      <input
                        ref={circularPickerRef}
                        type="date"
                        tabIndex={-1}
                        aria-label="ক্যালেন্ডার থেকে সার্কুলারে নির্ধারিত তারিখ নির্বাচন করুন"
                        value={parseYMD(circularDateStr) ? circularDateStr : ''}
                        onChange={(e) => handleCircularDateChange(e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as HTMLInputElement).showPicker?.();
                          } catch (_) {}
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {useTodayDate
                    ? `আজকের তারিখ (${todayDMYStr}) স্বয়ংক্রিয়ভাবে ব্যবহৃত হচ্ছে`
                    : 'নিয়োগ বিজ্ঞপ্তিতে উল্লেখ করা বয়স গণনার তারিখ (dd/mm/yyyy) দিন'}
                </p>
              </div>
            </div>

            {/* Checkbox below the second Date Picker */}
            <div className="pt-1">
              <label
                htmlFor="use-today-checkbox"
                className={`flex items-start sm:items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  useTodayDate
                    ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800/80'
                    : 'bg-slate-50/80 dark:bg-slate-950/50 border-slate-200/90 dark:border-slate-800 hover:border-primary/40'
                }`}
              >
                <input
                  id="use-today-checkbox"
                  type="checkbox"
                  checked={useTodayDate}
                  onChange={(e) => handleToggleTodayMode(e.target.checked)}
                  className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-emerald-600"
                />
                <div className="space-y-0.5">
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                    আজকের তারিখ অনুযায়ী বয়স গণনা করুন
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    টিক দিলে সার্কুলারের তারিখ নিষ্ক্রিয় হবে এবং আজকের তারিখ ({formatBengaliCalendarDate(getTodayLocal())}) অনুযায়ী আপনার বর্তমান সাধারণ বয়স গণনা করা হবে।
                  </span>
                </div>
              </label>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 flex items-start gap-3 animate-fade-in"
              >
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm font-bold leading-relaxed">
                  {validationError}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-extrabold text-sm shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Calculator className="h-4 w-4" />
                <span>বয়স হিসাব করুন</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="py-3.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-200/90 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>আবার হিসাব করুন</span>
              </button>
            </div>
          </form>

          {/* Calculation Result Section */}
          {calculationResult && (
            <div
              ref={resultSectionRef}
              id="age-calculation-result"
              className={`px-6 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-5 scroll-mt-24 transition-all duration-500 animate-fade-in-up ${
                scrollPulse ? 'ring-2 ring-primary/40 bg-emerald-50/40 dark:bg-emerald-950/20' : ''
              }`}
            >
              {/* MODE 1: Circular Date Job Age Verification */}
              {calculationResult.mode === 'circular' && (
                <div className="space-y-5 pt-4">
                  {/* Calculated Age Summary Box */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        সার্কুলারে নির্ধারিত তারিখে আপনার বয়স
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        জন্ম তারিখ: {calculationResult.birthDateFormatted} · গণনার তারিখ: {calculationResult.targetDateFormatted}
                      </span>
                    </div>

                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      আপনার বর্তমান বয়স:{' '}
                      <span className="text-primary dark:text-emerald-400">
                        {toBengaliNumber(calculationResult.years)} বছর {toBengaliNumber(calculationResult.months)} মাস {toBengaliNumber(calculationResult.days)} দিন
                      </span>
                    </p>

                    {/* Year / Month / Day Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-center">
                        <span className="block text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                          {toBengaliNumber(calculationResult.years)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">বছর</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 text-center">
                        <span className="block text-2xl sm:text-3xl font-black text-sky-700 dark:text-sky-400">
                          {toBengaliNumber(calculationResult.months)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">মাস</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-center">
                        <span className="block text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                          {toBengaliNumber(calculationResult.days)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">দিন</span>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Status Banner (18 - 32 Years) */}
                  {calculationResult.eligibilityStatus === 'eligible' && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500/80 dark:border-emerald-500/60 text-emerald-950 dark:text-emerald-100 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <h3 className="text-lg sm:text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                          অভিনন্দন! 🎉
                        </h3>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        আপনার বয়স নির্ধারিত সীমার মধ্যে রয়েছে। সাধারণ ১৮–৩২ বছর বয়সসীমা অনুযায়ী আপনি চাকরি বয়সের শর্ত পূরণ করেছেন।
                      </p>
                    </div>
                  )}

                  {calculationResult.eligibilityStatus === 'under_age' && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/80 dark:border-amber-500/60 text-amber-950 dark:text-amber-100 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
                        <h3 className="text-lg sm:text-xl font-extrabold text-amber-800 dark:text-amber-300">
                          দুঃখিত!
                        </h3>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
                        সার্কুলারে নির্ধারিত তারিখ অনুযায়ী আপনার বয়স ১৮ বছর পূর্ণ হয়নি।
                      </p>
                    </div>
                  )}

                  {calculationResult.eligibilityStatus === 'over_age' && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/80 dark:border-rose-500/60 text-rose-950 dark:text-rose-100 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0" />
                        <h3 className="text-lg sm:text-xl font-extrabold text-rose-800 dark:text-rose-300">
                          দুঃখিত!
                        </h3>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200 leading-relaxed">
                        সার্কুলারে নির্ধারিত তারিখ অনুযায়ী আপনার বয়স ৩২ বছর অতিক্রম করেছে।
                      </p>
                    </div>
                  )}

                  {/* Mandatory Notice */}
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">
                      চূড়ান্ত বয়সসীমা ও যোগ্যতার জন্য সংশ্লিষ্ট নিয়োগ বিজ্ঞপ্তি অনুসরণ করুন।
                    </p>
                  </div>
                </div>
              )}

              {/* MODE 2: Today's Date General Age Calculation (No Job Eligibility Message) */}
              {calculationResult.mode === 'today' && (
                <div className="space-y-5 pt-4">
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200/90 dark:border-sky-900/60 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        <span>আপনার বর্তমান বয়স</span>
                      </h3>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        জন্ম তারিখ: {calculationResult.birthDateFormatted} · আজ: {calculationResult.targetDateFormatted}
                      </span>
                    </div>

                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
                      আপনার বয়স বর্তমানে{' '}
                      <span className="text-primary dark:text-emerald-400">
                        {toBengaliNumber(calculationResult.years)} বছর {toBengaliNumber(calculationResult.months)} মাস {toBengaliNumber(calculationResult.days)} দিন।
                      </span>
                    </p>

                    {/* Year / Month / Day Breakdown */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-center">
                        <span className="block text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                          {toBengaliNumber(calculationResult.years)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">বছর</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 text-center">
                        <span className="block text-2xl sm:text-3xl font-black text-sky-700 dark:text-sky-400">
                          {toBengaliNumber(calculationResult.months)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">মাস</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-center">
                        <span className="block text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                          {toBengaliNumber(calculationResult.days)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">দিন</span>
                      </div>
                    </div>

                    {/* Additional Birthday & Completed Years Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                        <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          মোট পূর্ণ বছর
                        </span>
                        <span className="mt-1 block text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {toBengaliNumber(calculationResult.years)} বছর পূর্ণ
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                        <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          পরবর্তী জন্মদিন পর্যন্ত বাকি দিন
                        </span>
                        <span className="mt-1 block text-sm sm:text-base font-extrabold text-sky-700 dark:text-sky-400">
                          {calculationResult.nextBirthdayDaysRemaining === 0
                            ? 'আজ আপনার জন্মদিন! 🎂'
                            : `${toBengaliNumber(calculationResult.nextBirthdayDaysRemaining ?? 0)} দিন`}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                        <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Gift className="h-3.5 w-3.5 text-primary" />
                          <span>পরবর্তী জন্মদিনের তারিখ</span>
                        </span>
                        <span className="mt-1 block text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {calculationResult.nextBirthdayFormatted}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Helpful Info Section at Bottom */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>সরকারি চাকরির বয়স গণনার সাধারণ নিয়মাবলী</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 list-disc list-inside leading-relaxed">
            <li>
              সরকারি চাকরিতে আবেদনের সাধারণ বয়সসীমা সর্বনিম্ন <strong>১৮ বছর</strong> এবং সর্বোচ্চ <strong>৩২ বছর</strong>।
            </li>
            <li>
              নিয়োগ বিজ্ঞপ্তিতে উল্লেখিত নির্দিষ্ট তারিখে প্রার্থীর বয়স ১৮ বছর পূর্ণ হতে হবে এবং ৩২ বছর অতিক্রম করা যাবে না।
            </li>
            <li>
              চূড়ান্ত বয়সসীমা ও যোগ্যতার জন্য সংশ্লিষ্ট নিয়োগ বিজ্ঞপ্তি অনুসরণ করুন।
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
