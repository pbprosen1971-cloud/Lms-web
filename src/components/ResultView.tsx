/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, CheckCircle, XCircle, HelpCircle, Download, FileText, ChevronRight, RefreshCw, Trophy, Calendar, Sparkles, Share2, Copy, Check } from 'lucide-react';
import { ExamResult } from '../types';
import { formatSafeDisplay } from '../lib/dateUtils';

interface ResultViewProps {
  result: ExamResult;
  setView: (view: string) => void;
  user: any;
}

export default function ResultView({ result, setView, user }: ResultViewProps) {
  const [copied, setCopied] = useState(false);
  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  // Compute standard rankings for demo/realism based on score percentage
  const computedRank = Math.max(1, Math.round(150 - (percentage / 100) * 148));

  // Determine feedback text in Bengali
  const getFeedback = () => {
    if (percentage >= 80) return { title: 'অসাধারণ প্রস্তুতি!', sub: 'আপনি চমৎকার করেছেন। এই ধারাটি বজায় রাখুন।', color: 'text-emerald-600 dark:text-emerald-400' };
    if (percentage >= 60) return { title: 'ভালো প্রস্তুতি!', sub: 'আপনার ভালো দক্ষতা রয়েছে। আর একটু চেষ্টা করলেই শতভাগ করা সম্ভব।', color: 'text-blue-600 dark:text-blue-400' };
    return { title: 'অনুশীলন প্রয়োজন!', sub: 'কিছু বিষয়ে আরও মনোযোগ দিতে হবে। পুনরায় চেষ্টা করতে পারেন।', color: 'text-amber-600 dark:text-amber-400' };
  };

  const feedback = getFeedback();

  // Share text template
  const shareTitle = `মেধা পরীক্ষা ফলাফল: ${result.examTitle}`;
  const shareText = `🎯 আমি "মেধা পোর্টালে" '${result.examTitle}' পরীক্ষায় ${result.score}/${result.totalQuestions} মার্কস (${percentage}%) অর্জন করেছি! 🏆\nমেধা স্থান: #${computedRank}।\n\nআপনিও আপনার প্রস্তুতি যাচাই করুন: ${window.location.origin}`;

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.origin,
        });
      } catch (e) {
        console.log('Share dismissed', e);
      }
    } else {
      handleCopyShare();
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Print results / simulated PDF download
  const handlePrintResult = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 bg-brand-bg dark:bg-slate-900 text-slate-800 dark:text-slate-100 theme-transition print:bg-white print:p-0">
      
      {/* Printable Area Wrapper */}
      <div className="space-y-8 print:border-0 print:shadow-none">
        
        {/* Result Header Panel */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm text-center space-y-4 print:border-none print:shadow-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary dark:bg-primary/20 text-xs font-semibold rounded-full">
            <Trophy className="h-4 w-4" />
            <span>পরীক্ষার ফলাফল এবং মেধা মূল্যায়ন</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {result.examTitle}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400">
            পরীক্ষার্থীর নাম: <strong className="font-semibold text-slate-700 dark:text-slate-200">{result.studentName}</strong> ({result.studentEmail}) • তারিখ: {formatSafeDisplay(result.dateTaken, '—')}
          </p>

          <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4 max-w-sm mx-auto">
            <h2 className={`font-extrabold text-lg sm:text-xl ${feedback.color}`}>{feedback.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{feedback.sub}</p>
          </div>
        </div>

        {/* 1. Score Circular Representation & Rank Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Circular Score representation (Left 5-cols) */}
          <div className="md:col-span-5 bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-4">
            <span className="text-sm font-bold text-slate-500">আপনার স্কোর শতকরা</span>
            
            {/* SVG Circular Dial */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100 dark:stroke-slate-700"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Dial */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-primary"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner score label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{percentage}%</span>
                <span className="text-[11px] font-bold text-slate-400 mt-0.5">পাস মার্কস ৬০%</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-sm font-bold block text-primary">{result.score} / {result.totalQuestions} মার্ক্স</span>
              <span className="text-[10px] text-slate-400">পরীক্ষায় অংশ নিয়েছেন ১,২৫০ জন</span>
            </div>
          </div>

          {/* Rank & Stats Summary Column (Right 7-cols) */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Computed Rank Card */}
            <div className="bg-white dark:bg-slate-800 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 dark:bg-amber-950/20 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">মেধা স্থান (Rank)</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">#{computedRank} তম</h3>
                <span className="text-[10px] text-slate-400 block">শীর্ষ ১২% শিক্ষার্থীর মধ্যে</span>
              </div>
            </div>

            {/* Time Spent Card */}
            <div className="bg-white dark:bg-slate-800 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 dark:bg-blue-950/20 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">ব্যয়িত সময় (Time)</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {Math.floor(result.timeSpentSeconds / 60)} মি: {result.timeSpentSeconds % 60} সে:
                </h3>
                <span className="text-[10px] text-slate-400 block">গড় সময় ছিল ৮ মিনিট</span>
              </div>
            </div>

            {/* Answer Stats Details Grid */}
            <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl grid grid-cols-3 gap-2 text-center">
              <div className="space-y-1">
                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                <span className="block text-base font-black text-emerald-600 dark:text-emerald-400">{result.correctAnswers} টি</span>
                <span className="text-[10px] text-slate-400 block font-semibold">সঠিক উত্তর</span>
              </div>
              <div className="space-y-1 border-l border-slate-200 dark:border-slate-700/60">
                <XCircle className="h-5 w-5 text-rose-500 mx-auto" />
                <span className="block text-base font-black text-rose-600 dark:text-rose-400">{result.wrongAnswers} টি</span>
                <span className="text-[10px] text-slate-400 block font-semibold">ভুল উত্তর</span>
              </div>
              <div className="space-y-1 border-l border-slate-200 dark:border-slate-700/60">
                <HelpCircle className="h-5 w-5 text-amber-500 mx-auto" />
                <span className="block text-base font-black text-amber-600 dark:text-amber-400">{result.unansweredQuestions} টি</span>
                <span className="text-[10px] text-slate-400 block font-semibold">উড়িয়েছেন</span>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Social Media Share Banner Card */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 sm:p-6 rounded-2xl shadow-lg shadow-emerald-600/15 space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                <h3 className="font-extrabold text-base sm:text-lg">বন্ধুদের সাথে আপনার পরীক্ষার স্কোর শেয়ার করুন!</h3>
              </div>
              <p className="text-xs text-emerald-100">
                ফেসবুক বা হোয়াটসঅ্যাপে আপনার রেজাল্ট ও মেধা স্থান শেয়ার করে সহপাঠীদের সাথে প্রতিযোগিতা করুন।
              </p>
            </div>
            
            {copied && (
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full animate-bounce flex items-center gap-1.5 shrink-0">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                মেসেজ কপি হয়েছে!
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* WhatsApp Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              <span>হোয়াটসঅ্যাপে শেয়ার</span>
            </button>

            {/* Facebook Share Button */}
            <button
              onClick={handleFacebookShare}
              className="px-4 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>ফেসবুকে শেয়ার</span>
            </button>

            {/* Copy Result Text Button */}
            <button
              onClick={handleCopyShare}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'কপি হয়েছে!' : 'ফলাফল কপি করুন'}</span>
            </button>

            {/* Web Share API (Mobile / Native browser fallback) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
              >
                <Share2 className="h-4 w-4" />
                <span>অন্যান্য অ্যাপস</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Subject-wise breakdown list */}
        <div className="bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700/50 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              বিষয়ভিত্তিক মেধা মূল্যায়ন
            </h3>
            <span className="text-xs text-slate-400">সঠিক / সর্বমোট প্রশ্ন</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(result.subjectPerformance).map(([subj, data]) => {
              const scorePercent = Math.round((data.correct / data.total) * 100);
              return (
                <div
                  key={subj}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">{subj}</span>
                    <span className="text-primary">{data.correct} / {data.total} ({scorePercent}%)</span>
                  </div>
                  
                  {/* Progress Line bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${scorePercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex flex-wrap gap-4 items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
          <button
            onClick={() => setView('dashboard')}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            ড্যাশবোর্ডে ফিরে যান
          </button>

          {/* Trigger browser PDF generation / print view */}
          <button
            onClick={handlePrintResult}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Download className="h-4.5 w-4.5" />
            রেজাল্ট পিডিএফ ডাউনলোড
          </button>
        </div>

      </div>

      {/* Decorative Simulated Certificate (Print Only / Hidden in Browser) */}
      <div className="hidden print:block border-[12px] border-double border-emerald-600 p-12 text-center bg-white text-slate-800 max-w-4xl mx-auto rounded-none relative">
        <div className="absolute top-4 left-4 text-[10px] text-slate-400 font-mono">MEDHA-PORTAL-OFFICIAL</div>
        <div className="space-y-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-full">
              <Award className="h-10 w-10 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-serif text-slate-900 font-extrabold uppercase tracking-wide">কৃতিত্বের সনদপত্র</h1>
          <p className="text-xs text-slate-400 italic">Certificate of Excellence</p>

          <p className="text-sm pt-4 max-w-lg mx-auto leading-relaxed">
            এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <strong className="text-lg font-bold text-slate-900">{result.studentName}</strong> মেধা কুইজ পোর্টালে সফলতার সাথে <strong className="text-slate-900">"{result.examTitle}"</strong> সম্পন্ন করেছেন।
          </p>

          <div className="py-4">
            <span className="text-slate-400 block text-xs">অর্জিত মার্কস</span>
            <span className="text-3xl font-black text-emerald-600">{result.score} / {result.totalQuestions}</span>
            <span className="text-xs text-slate-500 block font-semibold">({percentage}% শতকরা)</span>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
            <div className="text-left space-y-1">
              <span className="text-slate-400 block">ইস্যুর তারিখ</span>
              <strong className="text-slate-800">{result.dateTaken}</strong>
            </div>
            <div className="text-right space-y-1">
              <span className="text-slate-400 block">পরিচালক (মেধা এক্সাম)</span>
              <strong className="text-slate-800">এম. আশরাফ</strong>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
