/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Calendar,
  Building2,
  Clock,
  Loader2,
  AlertCircle,
  FileCheck,
  Check,
} from 'lucide-react';
import { MinistryQuestionBank } from '../types';
import { toBengaliDigits } from '../lib/dateUtils';
import { downloadQuestionBankPdf, QuestionBankPdfMode } from '../services/questionBankPdfService';

interface QuestionBankPdfModalProps {
  bank: MinistryQuestionBank | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionBankPdfModal: React.FC<QuestionBankPdfModalProps> = ({
  bank,
  isOpen,
  onClose,
}) => {
  const [downloadingMode, setDownloadingMode] = useState<QuestionBankPdfMode | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !bank) return null;

  const questionsCount = bank.questions?.length || bank.totalQuestions || 0;

  const handleDownload = async (mode: QuestionBankPdfMode) => {
    if (downloadingMode) return;
    setDownloadingMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await downloadQuestionBankPdf({ bank, mode });
      setSuccessMsg(
        mode === 'with_answers'
          ? 'উত্তর ও ব্যাখ্যাসহ প্রশ্ন ব্যাংক পিডিএফ সফলভাবে ডাউনলোড হয়েছে!'
          : 'শুধুমাত্র প্রশ্ন ও অপশনসহ অনুশীলন প্রশ্নপত্র পিডিএফ সফলভাবে ডাউনলোড হয়েছে!'
      );
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      console.error('PDF download error:', err);
      setErrorMsg('পিডিএফ তৈরিতে কিছুটা সমস্যা হয়েছে, পুনরায় চেষ্টা করুন অথবা প্রিন্ট অপশনটি ব্যবহার করুন।');
    } finally {
      setDownloadingMode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-scaleUp">
        {/* Modal Top Header (Compact) */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="space-y-0.5 flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="px-2 py-0.5 bg-white/20 text-white font-black rounded-md flex items-center gap-1 shadow-xs">
                <FileText className="h-3 w-3" />
                <span>PDF ডাউনলোড</span>
              </span>
              <span className="font-bold text-emerald-200 bg-emerald-900/50 px-2 py-0.5 rounded-md">
                {toBengaliDigits(questionsCount)} টি প্রশ্ন
              </span>
              <span className="font-bold text-emerald-200 bg-emerald-900/50 px-2 py-0.5 rounded-md">
                সময়: {toBengaliDigits(bank.durationMinutes || 10)} মিনিট
              </span>
              {bank.examHeldDate && (
                <span className="hidden sm:inline text-emerald-200 font-medium">
                  • অনুষ্ঠিত: <strong className="text-white">{bank.examHeldDate}</strong>
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black truncate text-white">
              {bank.title} <span className="text-emerald-200 font-normal text-xs">({bank.ministryName})</span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={downloadingMode !== null}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="বন্ধ করুন"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Body (Compact & Fitted without scrolling) */}
        <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Status Notifications */}
          {successMsg && (
            <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TWO COMPACT DOWNLOAD OPTIONS (RESIZED TO PREVENT OVERFLOW/SCROLL) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* OPTION 1: WITH ANSWERS & EXPLANATIONS */}
            <div className="bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 border-2 border-emerald-500/60 dark:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 hover:shadow-md hover:border-emerald-600 transition-all relative overflow-hidden group">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded shadow-xs">
                    অপশন ১
                  </span>
                  <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>উত্তর সবুজ কালারে হাইলাইট</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                    ১) প্রশ্ন উত্তর ব্যাখ্যা সহ PDF
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    সঠিক উত্তরটি <strong className="text-emerald-700 dark:text-emerald-400">সবুজ কালারে হাইলাইট</strong> এবং প্রতিটি প্রশ্নের বিশদ সমাধান থাকবে।
                  </p>
                </div>

                {/* Compact Feature Pills */}
                <div className="space-y-1 pt-0.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-medium">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>সঠিক উত্তর স্পষ্ট সবুজ রঙে চিহ্নিত</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-medium">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>বিশদ ব্যাখ্যা ও রিভিশন নোটস সংযুক্ত</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={downloadingMode !== null}
                onClick={() => handleDownload('with_answers')}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloadingMode === 'with_answers' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>ডাউনলোড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>উত্তরসহ PDF ডাউনলোড</span>
                  </>
                )}
              </button>
            </div>

            {/* OPTION 2: QUESTIONS ONLY (SIMPLE DESIGN FOR PRACTICE) */}
            <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 hover:shadow-md hover:border-slate-400 dark:hover:border-slate-600 transition-all relative overflow-hidden group">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 bg-slate-700 dark:bg-slate-600 text-white text-[10px] font-black rounded shadow-xs">
                    অপশন ২
                  </span>
                  <span className="flex items-center gap-1 text-[10.5px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    <HelpCircle className="h-3 w-3 text-slate-500" />
                    <span>পরীক্ষার্থী কপি (মক টেস্ট)</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                    ২) শুধুমাত্র প্রশ্ন ও অপশন (উত্তরবিহীন)
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    কোনো উত্তর বা ব্যাখ্যা থাকবে না। <strong className="text-slate-800 dark:text-slate-200">সিম্পল ডিজাইনে</strong> কেবল প্রশ্ন ও চারটি অপশন থাকবে।
                  </p>
                </div>

                {/* Compact Feature Pills */}
                <div className="space-y-1 pt-0.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Check className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>কোনো উত্তর চিহ্নিত থাকবে না (পরীক্ষার্থী কপি)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Check className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>মডেল টেস্ট ও স্ব-মূল্যায়নের জন্য উপযুক্ত</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={downloadingMode !== null}
                onClick={() => handleDownload('questions_only')}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloadingMode === 'questions_only' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>ডাউনলোড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>প্রশ্নপত্র PDF ডাউনলোড</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Footer Watermark and Layout Note (Compact single-line) */}
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">🛡️ UTF-8 BOM ও সেন্ট্রাল ওয়াটারমার্ক সহ জেনারেট হবে।</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">A4 সাইজ</span>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="py-2.5 px-4 sm:px-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            সরাসরি ব্রাউজারে ডাউনলোড হবে
          </span>
          <button
            type="button"
            disabled={downloadingMode !== null}
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 ml-auto"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankPdfModal;
