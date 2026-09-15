/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Eye,
  Download,
  Lock,
  Crown,
  ExternalLink,
  Calendar,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import { MaterialAccessRecord, UserProfile } from '../types';
import {
  subscribeToUserMaterialAccess,
  buildDrivePreviewUrl,
  buildDriveDownloadUrl,
  buildDriveViewUrl
} from '../services/firestoreService';
import { formatSafeDisplay } from '../lib/dateUtils';

interface UserStudyMaterialsProps {
  user: UserProfile;
  setView: (view: string) => void;
}

export default function UserStudyMaterials({ user, setView }: UserStudyMaterialsProps) {
  const [records, setRecords] = useState<MaterialAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewRecord, setPreviewRecord] = useState<MaterialAccessRecord | null>(null);

  // Check if current user has active premium membership
  const isUserPremium = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.isPremium) {
      if (user.isPremiumExpiryDate) {
        const exp = new Date(user.isPremiumExpiryDate).getTime();
        if (!isNaN(exp) && exp < Date.now()) {
          return false;
        }
      }
      return true;
    }
    return false;
  }, [user]);

  useEffect(() => {
    const targetUid = user.id || user.uid || '';
    if (!targetUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToUserMaterialAccess(targetUid, (data) => {
      setRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user.id, user.uid]);

  const handlePreview = (rec: MaterialAccessRecord) => {
    if (rec.accessType === 'premium' && !isUserPremium) {
      return;
    }
    setPreviewRecord(rec);
  };

  const handleDownload = (rec: MaterialAccessRecord) => {
    if (rec.accessType === 'premium' && !isUserPremium) {
      return;
    }
    const downloadUrl = buildDriveDownloadUrl(rec.driveFileId || rec.driveUrl || '');
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const handleBecomePremium = () => {
    setView('home');
    setTimeout(() => {
      const el = document.getElementById('pricing') || document.getElementById('packages');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
          <BookOpen className="h-4.5 w-4.5 text-primary" />
          আমার স্টাডি ম্যাটেরিয়াল (My Study Materials)
        </h3>
        <button
          onClick={() => setView('study-materials')}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          সব পিডিএফ দেখুন &rarr;
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center space-y-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          <p className="text-xs text-slate-500">ম্যাটেরিয়াল ইতিহাস লোড হচ্ছে...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <FileText className="h-8 w-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              আপনি এখনও কোনো স্টাডি ম্যাটেরিয়াল পড়েননি বা ডাউনলোড করেননি।
            </p>
            <p className="text-[11px] text-slate-500">
              বিসিএস, ব্যাংক বা অন্যান্য সরকারি চাকরির হ্যান্ডনোট ও প্রশ্ন সংগ্রহ করতে স্টাডি ম্যাটেরিয়াল পেজ ভিজিট করুন।
            </p>
          </div>
          <button
            onClick={() => setView('study-materials')}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-xs"
          >
            📚 স্টাডি ম্যাটেরিয়াল ব্রাউজ করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {records.map((rec) => {
            const isPremium = rec.accessType === 'premium';
            const hasAccess = !isPremium || isUserPremium;

            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {rec.category || 'সাধারণ'}
                    </span>

                    {isPremium ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Crown className="h-2.5 w-2.5" /> Premium
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span>🆓</span> Free
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {rec.materialTitle}
                  </h4>

                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>অ্যাক্সেস: {formatSafeDisplay(rec.accessedAt, '—')}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {hasAccess ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePreview(rec)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        <Eye className="h-3 w-3 text-primary" />
                        <span>প্রিভিউ</span>
                      </button>

                      <button
                        onClick={() => handleDownload(rec)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        <Download className="h-3 w-3" />
                        <span>ডাউনলোড</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-1 text-amber-700 dark:text-amber-400 text-[11px] font-bold">
                        <Lock className="h-3 w-3" />
                        <span>লক করা প্রিমিয়াম কনটেন্ট</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        এই PDFটি অ্যাক্সেস করতে প্রিমিয়াম মেম্বারশিপ প্রয়োজন।
                      </p>
                      <button
                        onClick={handleBecomePremium}
                        className="w-full py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold"
                      >
                        প্রিমিয়াম মেম্বার হোন
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {previewRecord.materialTitle}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(previewRecord)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold"
                >
                  <Download className="h-3 w-3" />
                  <span>ডাউনলোড</span>
                </button>
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950">
              <iframe
                src={buildDrivePreviewUrl(previewRecord.driveFileId || previewRecord.driveUrl || '')}
                title={previewRecord.materialTitle}
                className="w-full h-full border-0"
                allow="autoplay"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
