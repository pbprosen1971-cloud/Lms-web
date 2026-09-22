import React, { useState, useEffect } from 'react';
import { Megaphone, ExternalLink, X, BellRing } from 'lucide-react';
import { BannerNoticeSettings } from '../types';
import { subscribeToBannerNotice, DEFAULT_BANNER_NOTICE } from '../services/notificationService';

interface ModernNoticeTickerProps {
  onNavigate?: (urlOrHash: string) => void;
  className?: string;
}

export const ModernNoticeTicker: React.FC<ModernNoticeTickerProps> = ({
  onNavigate,
  className = ''
}) => {
  const [notice, setNotice] = useState<BannerNoticeSettings>(DEFAULT_BANNER_NOTICE);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToBannerNotice((data) => {
      setNotice(data);
    });
    return () => unsubscribe();
  }, []);

  if (!notice.enabled || !notice.text || dismissed) {
    return null;
  }

  const speedClass = notice.speed === 'slow'
    ? 'animate-marquee-slow'
    : notice.speed === 'fast'
    ? 'animate-marquee-fast'
    : 'animate-marquee-normal';

  const handleClick = () => {
    if (notice.linkUrl) {
      if (notice.linkUrl.startsWith('#')) {
        const el = document.querySelector(notice.linkUrl);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (onNavigate) {
        onNavigate(notice.linkUrl);
      } else {
        window.location.href = notice.linkUrl;
      }
    }
  };

  return (
    <div
      id="home-modern-notice-ticker"
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 sm:mt-4 mb-2 transition-all duration-300 ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50/95 via-teal-50/90 to-cyan-50/90 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-900/90 border border-emerald-300/80 dark:border-emerald-500/30 p-2 sm:p-2.5 shadow-xs hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Fixed Left Badge with Dynamic Modern Red & Green Styling */}
          <div className="shrink-0 relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-emerald-600 text-white text-xs font-extrabold shadow-md shadow-rose-500/20 border border-white/20 select-none backdrop-blur-xs transition-all duration-300 hover:scale-[1.03] group/badge">
            {/* Dynamic animated glow sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
            
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-90" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300 ring-1 ring-white/60" />
            </span>
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-amber-300 drop-shadow-xs transition-transform duration-300 group-hover/badge:rotate-12" />
            <span className="relative z-10 tracking-tight whitespace-nowrap drop-shadow-xs">
              {notice.badgeText || 'বিজ্ঞপ্তি'}
            </span>
          </div>

          {/* Marquee Viewport with Left/Right Soft Fade Gradients */}
          <div className="flex-1 overflow-hidden relative marquee-container flex items-center min-w-0 h-6">
            {/* Left fade shadow */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-emerald-50/95 dark:from-slate-900 to-transparent z-10" />

            {/* Scrolling text container - pauses on hover */}
            <div
              onClick={handleClick}
              className={`inline-block whitespace-nowrap font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm cursor-pointer select-none ${speedClass}`}
              title="মাউস রাখুন স্ক্রল থামাতে"
            >
              <span className="inline-flex items-center gap-2">
                <span>{notice.text}</span>
                {notice.linkUrl && (
                  <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400 text-xs font-bold underline underline-offset-2 ml-2">
                    [বিস্তারিত দেখুন]
                  </span>
                )}
              </span>
            </div>

            {/* Right fade shadow */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-cyan-50/90 dark:from-slate-900 to-transparent z-10" />
          </div>

          {/* Right Action / Dismiss Button */}
          <div className="shrink-0 flex items-center gap-1">
            {notice.linkUrl && (
              <button
                type="button"
                onClick={handleClick}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors shrink-0"
              >
                <span>দেখুন</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="বিজ্ঞপ্তি বন্ধ করুন"
              title="বিজ্ঞপ্তি বন্ধ করুন"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModernNoticeTicker;
