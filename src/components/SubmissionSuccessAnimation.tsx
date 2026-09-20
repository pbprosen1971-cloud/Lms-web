import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles, CloudCheck, X } from 'lucide-react';

interface SubmissionSuccessAnimationProps {
  show: boolean;
  onClose: () => void;
  message?: string;
  examTitle?: string;
}

export default function SubmissionSuccessAnimation({
  show,
  onClose,
  message,
  examTitle,
}: SubmissionSuccessAnimationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  // Subtle flare particles data
  const particles = [
    { angle: 0, distance: 38, color: '#10B981', size: 6, delay: 0.05 },
    { angle: 45, distance: 44, color: '#F59E0B', size: 5, delay: 0.1 },
    { angle: 90, distance: 36, color: '#10B981', size: 7, delay: 0.08 },
    { angle: 135, distance: 42, color: '#06B6D4', size: 5, delay: 0.12 },
    { angle: 180, distance: 38, color: '#10B981', size: 6, delay: 0.05 },
    { angle: 225, distance: 46, color: '#F59E0B', size: 5, delay: 0.15 },
    { angle: 270, distance: 36, color: '#06B6D4', size: 7, delay: 0.09 },
    { angle: 315, distance: 42, color: '#10B981', size: 5, delay: 0.11 },
  ];

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[92%] sm:w-auto">
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
            className="relative overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl shadow-xl shadow-emerald-500/10 p-4 sm:p-5 flex items-start gap-4 text-slate-800 dark:text-slate-100"
          >
            {/* Pop & Flare Checkmark Container */}
            <div className="relative shrink-0 flex items-center justify-center w-12 h-12">
              {/* Expanding celebration halo / flare ring */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: [0.6, 1.4, 1.8], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400/40 to-teal-300/20 blur-sm pointer-events-none"
              />

              {/* Celebration Flare Particles */}
              {particles.map((p, idx) => {
                const rad = (p.angle * Math.PI) / 180;
                const x = Math.cos(rad) * p.distance;
                const y = Math.sin(rad) * p.distance;

                return (
                  <motion.span
                    key={idx}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                      x: [0, x * 0.7, x],
                      y: [0, y * 0.7, y],
                      scale: [0, 1.3, 0],
                      opacity: [1, 0.9, 0],
                    }}
                    transition={{
                      duration: 0.9,
                      delay: p.delay,
                      ease: 'easeOut',
                    }}
                    style={{
                      backgroundColor: p.color,
                      width: p.size,
                      height: p.size,
                    }}
                    className="absolute rounded-full pointer-events-none"
                  />
                );
              })}

              {/* Main Checkmark Pop Badge */}
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: [0, 1.25, 1], rotate: [-25, 8, 0] }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.08 }}
                className="relative z-10 w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.22, type: 'spring', stiffness: 450, damping: 16 }}
                >
                  <Check className="w-6 h-6 stroke-[2.8]" />
                </motion.div>
              </motion.div>
            </div>

            {/* Message Details */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  সাবমিশন সফল হয়েছে!
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-snug break-words">
                {message ||
                  (examTitle
                    ? `"${examTitle}" পরীক্ষার ফলাফল সফলভাবে ফায়ারস্টোরে সংরক্ষিত হয়েছে।`
                    : 'পরীক্ষার ফলাফল সফলভাবে ফায়ারস্টোর ক্লাউড ডাটাবেজে সংরক্ষিত হয়েছে।')}
              </p>

              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md w-fit border border-emerald-500/20">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Firestore Cloud Synced</span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={onClose}
              className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="বন্ধ করুন"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress Timer Bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 origin-left"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
