import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Timer, Zap } from 'lucide-react';
import { toBengaliDigits } from '../lib/dateUtils';

interface UpcomingExamCountdownProps {
  startTime?: string;
  examDate?: string;
  className?: string;
  formattedDateDisplay?: string;
}

export const UpcomingExamCountdown: React.FC<UpcomingExamCountdownProps> = ({
  startTime,
  examDate,
  className = '',
  formattedDateDisplay,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  // Real-time ticking interval updating every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Determine target time
  const targetMs = useMemo(() => {
    const candidate = (startTime && startTime.trim() !== 'নির্ধারিত নেই' ? startTime.trim() : '') ||
                      (examDate && examDate.trim() ? examDate.trim() : '');

    if (candidate) {
      const parsed = new Date(candidate).getTime();
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Default fallback if exam is marked upcoming but no exact datetime set yet:
    // schedule for 24 hours from today
    return Date.now() + 24 * 60 * 60 * 1000;
  }, [startTime, examDate]);

  const diffMs = targetMs - now;
  const isTimeReached = diffMs <= 0;

  // Calculate days, hours, minutes, seconds
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const hoursStr = toBengaliDigits(String(hours).padStart(2, '0'));
  const minutesStr = toBengaliDigits(String(minutes).padStart(2, '0'));
  const secondsStr = toBengaliDigits(String(seconds).padStart(2, '0'));
  const daysStr = toBengaliDigits(days);

  return (
    <div
      id="upcoming-exam-countdown-container"
      className={`p-3 bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-orange-50/80 dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-900 border border-amber-300/90 dark:border-amber-700/60 rounded-xl text-xs space-y-2.5 shadow-sm transition-all duration-300 ${className}`}
    >
      {/* Schedule Header Row */}
      <div className="flex items-center justify-between gap-1.5 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-1.5 font-medium leading-relaxed">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <span>
            শুরু হবে: <strong className="font-extrabold text-slate-900 dark:text-white">
              {formattedDateDisplay || 'শীঘ্রই দময় নির্ধারিত হবে'}
            </strong>
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200/90 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 uppercase tracking-wider shrink-0">
          শিডিউল
        </span>
      </div>

      {/* Real-time Countdown Timer Bar */}
      <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-900 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
          <span>শুরু হতে বাকি:</span>
        </div>

        {isTimeReached ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-extrabold shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span>পরীক্ষাটি এখন লাইভ চলছে!</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 self-start sm:self-auto flex-wrap">
            {days > 0 && (
              <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-950 px-2 py-1 rounded-lg border border-amber-300/80 dark:border-amber-800/80 shadow-xs">
                <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-xs">
                  {daysStr}
                </span>
                <span className="text-[10px] font-sans font-bold text-amber-800 dark:text-amber-400">
                  দিন
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-950 px-2 py-1 rounded-lg border border-amber-300/80 dark:border-amber-800/80 shadow-xs">
              <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-xs">
                {hoursStr}
              </span>
              <span className="text-[10px] font-sans font-bold text-amber-800 dark:text-amber-400">
                ঘণ্টা
              </span>
            </div>

            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">:</span>

            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-950 px-2 py-1 rounded-lg border border-amber-300/80 dark:border-amber-800/80 shadow-xs">
              <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-xs">
                {minutesStr}
              </span>
              <span className="text-[10px] font-sans font-bold text-amber-800 dark:text-amber-400">
                মিনিট
              </span>
            </div>

            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">:</span>

            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-950 px-2 py-1 rounded-lg border border-amber-300/80 dark:border-amber-800/80 shadow-xs">
              <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-xs">
                {secondsStr}
              </span>
              <span className="text-[10px] font-sans font-bold text-amber-800 dark:text-amber-400">
                সেকেন্ড
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingExamCountdown;
