/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ArrowLeft, BookOpen, Target, Award, Users, CheckCircle2, Heart } from 'lucide-react';
import MedhaLogo from './MedhaLogo';

interface AboutUsViewProps {
  setView: (view: string) => void;
}

export default function AboutUsView({ setView }: AboutUsViewProps) {
  useEffect(() => {
    document.title = 'About Us (আমাদের সম্পর্কে) — Medha Exam';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমে ফিরে যান</span>
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            About Us / আমাদের পরিচিতি
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-[#00a854]/25 flex items-center justify-center shrink-0">
              <MedhaLogo className="w-full h-full" withBackground />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                About Us — মেধা এক্সাম
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                বাংলাদেশের চাকরি প্রার্থীদের সেরা অনলাইন প্রস্তুতি ও লাইভ মূল্যায়ন প্ল্যাটফর্ম।
              </p>
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">আমাদের লক্ষ্য (Our Mission)</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              বাংলাদেশের প্রতিটি প্রান্তের শিক্ষার্থীদের জন্য বিসিএস, সরকারি ব্যাংক, শিক্ষক নিবন্ধন ও অন্যান্য নিয়োগ পরীক্ষার প্রস্তুতি সহজ, সুলভ ও কার্যকর করা। রিয়েল-টাইম লাইভ পরীক্ষা ও বিস্তারিত ব্যাখ্যার মাধ্যমে দুর্বলতা চিহ্নিত করে মেধার বিকাশ ঘটানো।
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">আমাদের দৃষ্টিভঙ্গি (Our Vision)</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              স্বচ্ছ ও আধুনিক প্রযুক্তিনির্ভর পরীক্ষার মাধ্যমে শিক্ষার্থীদের নির্ভুল মূল্যায়ন নিশ্চিত করা এবং চাকরি পরীক্ষার জন্য নির্ভরযোগ্য স্টাডি ম্যাটেরিয়ালস ও প্রশ্নব্যাংক এক ঠিকানায় পৌঁছে দেওয়া।
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>মেধা এক্সামে যা যা পাবেন</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>প্রতিদিনের রিয়েলটাইম লাইভ মডেল টেস্ট</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>তাৎক্ষণিক ফলাফল ও জাতীয় মেধা তালিকা (Merit List)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>মন্ত্রণালয়ভিত্তিক বিগত নিয়োগ পরীক্ষার প্রশ্নব্যাংক</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>গুরুত্বপূর্ণ লেকচার শিট ও পিডিএফ স্টাডি ম্যাটেরিয়ালস</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>বিষয়ভিত্তিক ও সার্কুলার অনুযায়ী চাকরি বয়স ক্যালকুলেটর</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>চাকরি পরীক্ষার ফলাফল রোল নম্বর দিয়ে সহজে সার্চ</span>
            </div>
          </div>
        </div>

        {/* Founder & Developer Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">প্রতিষ্ঠাতা ও ডেভেলপার</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            মেধা এক্সাম প্ল্যাটফর্মটি পরিকল্পনা, নকশা ও উন্নয়ন করেছেন <strong className="text-slate-900 dark:text-white">Prosenjit Biswas</strong>। বাংলাদেশের হাজারো চাকরি প্রার্থীর স্বপ্নপূরণের পথকে সহজতর করতেই মেধা এক্সাম প্ল্যাটফর্মের নিরবচ্ছিন্ন যাত্রা।
          </p>
        </div>
      </div>
    </div>
  );
}
