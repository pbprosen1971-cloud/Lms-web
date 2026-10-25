/**
 * Reusable Modern Skeleton Loader with Shimmer Animation.
 * Designed to match Medha Exam's card, list, avatar, and metrics shapes,
 * based on modern skeleton UI standards (similar to YouTube reference).
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export function Skeleton({ className = '', variant = 'rounded' }: SkeletonProps) {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rectangular'
      ? 'rounded-none'
      : 'rounded-xl';

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/80 ${variantClass} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent" />
    </div>
  );
}

/**
 * Skeleton for Live & Upcoming Exam Cards (similar to YouTube cards in reference photo).
 */
export function ExamCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="পরীক্ষার তথ্য লোড হচ্ছে..."
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Card Header Image / Banner Area (YouTube style in reference) */}
        <Skeleton className="h-28 sm:h-32 w-full rounded-2xl" />

        {/* Title (2 lines) */}
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>

        {/* Meta Stats row */}
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Button */}
      <div className="pt-2">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Grid of Exam Card Skeletons
 */
export function ExamGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ExamCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for Study Materials PDF Cards
 */
export function StudyMaterialCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="স্টাডি ম্যাটেরিয়াল লোড হচ্ছে..."
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function StudyMaterialGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StudyMaterialCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for Dashboard User Statistics Cards
 */
export function DashboardMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Dashboard Recent Exams List
 */
export function DashboardRecentExamSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Profile Header Card
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-6">
      <Skeleton className="w-24 h-24 rounded-full shrink-0" variant="circular" />
      <div className="space-y-2.5 flex-1 text-center md:text-left">
        <Skeleton className="h-6 w-48 mx-auto md:mx-0" />
        <Skeleton className="h-4 w-36 mx-auto md:mx-0" />
        <Skeleton className="h-3.5 w-64 mx-auto md:mx-0" />
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  );
}
