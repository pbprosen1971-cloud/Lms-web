/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  FileCheck,
  ShieldAlert,
  BookOpen,
  CreditCard,
  UserX,
  Scale,
  ArrowLeft,
  AlertTriangle,
  Gift,
  HelpCircle
} from 'lucide-react';

interface TermsAndConditionsViewProps {
  setView: (view: string) => void;
}

export default function TermsAndConditionsView({ setView }: TermsAndConditionsViewProps) {
  useEffect(() => {
    document.title = 'Terms & Conditions — Medha Exam';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমে ফিরে যান</span>
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>সর্বশেষ সংস্করণ: সেপ্টেম্বর ২০২৬</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
              অফিসিয়াল নীতিমালা
            </span>
          </div>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Scale className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Terms &amp; Conditions — Medha Exam
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                মেধা এক্সাম (Medha Exam) প্ল্যাটফর্মে আপনাকে স্বাগতম। এই অ্যাপ্লিকেশন বা ওয়েবসাইট ব্যবহারের পূর্বে দয়া করে নিচের শর্তাবলী ও নিয়মনীতিগুলো যত্নসহকারে পড়ুন। প্ল্যাটফর্মটি ব্যবহারের মাধ্যমে আপনি এই সকল শর্তাবলীতে সম্মতি প্রদান করছেন।
              </p>
            </div>
          </div>
        </div>

        {/* 1. Account Usage & User Responsibilities */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <FileCheck className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">১. অ্যাকাউন্ট ব্যবহার ও ব্যবহারকারীর দায়িত্ব</h2>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
            <li>অ্যাকাউন্ট খোলার সময় সঠিক নাম, কার্যক্ষম ইমেইল এবং প্রয়োজনীয় সঠিক তথ্য প্রদান করা বাধ্যতামূলক।</li>
            <li>আপনার লগইন তথ্য ও পাসওয়ার্ডের গোপনীয়তা রক্ষার পূর্ণ দায়িত্ব আপনার নিজের।</li>
            <li>একজনের অ্যাকাউন্ট অন্য কোনো ব্যক্তির কাছে হস্তান্তর, ভাড়া বা বিক্রি করা সম্পূর্ণ নিষিদ্ধ।</li>
            <li>কোনো সন্দেহজনক বা অননুমোদিত কার্যকলাপ নজরে এলে তাৎক্ষণিক কর্তৃপক্ষকে অবহিত করতে হবে।</li>
          </ul>
        </div>

        {/* 2. Exam Rules & Anti-Cheating Policy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">২. পরীক্ষা ও অসদুপায় প্রতিরোধ নীতি (Anti-Cheating)</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            মেধা এক্সাম একটি মেধাভিত্তিক ও সৎ প্রতিযোগিতার প্ল্যাটফর্ম। পরীক্ষার নির্ভুলতা ও ন্যায্যতা রক্ষায় নিম্নলিখিত নিয়মসমূহ কঠোরভাবে প্রয়োগ করা হয়:
          </p>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
            <li>পরীক্ষায় নির্ধারিত সময়ের মধ্যে নিজ মেধা ও সততার সাথে সকল প্রশ্নের উত্তর সম্পন্ন করতে হবে।</li>
            <li>স্বয়ংক্রিয় বট (Automated Bots), স্ক্রিপ্ট, ব্রাউজার প্লাগইন বা স্ক্র্যাপার ব্যবহার সম্পূর্ণ নিষিদ্ধ।</li>
            <li>লাইভ পরীক্ষার প্রশ্ন ফাঁস করা, অননুমোদিতভাবে কপি বা অন্যত্র শেয়ার করা কপিরাইট আইনের লঙ্ঘন।</li>
            <li>অসদুপায় বা অসঙ্গতি প্রমাণিত হলে সংশ্লিষ্ট পরীক্ষার স্কোর বাতিল এবং অ্যাকাউন্ট সাময়িকভাবে বা স্থায়ীভাবে স্থগিত করা হতে পারে।</li>
          </ul>
        </div>

        {/* 3. Daily Practice & Wrong Question Practice */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৩. ডেইলি প্র্যাকটিস ও ভুল প্রশ্ন অনুশীলন বিধি</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            দৈনিক কুইজ (Daily Practice) এবং ব্যক্তিগত ভুল প্রশ্ন সংগ্রহাগার (Wrong Question Practice) ফিচারগুলো শিক্ষার্থীদের ব্যক্তিগত দক্ষতা বৃদ্ধির উদ্দেশ্যে প্রণীত। ব্যবহারকারী তার ব্যক্তিগত অগ্রগতি পর্যবেক্ষণ করতে পারবেন, তবে এই তথ্য অন্য কোনো বাণিজ্যিক উদ্দেশ্যে ব্যবহার করা যাবে না।
          </p>
        </div>

        {/* 4. Study Material Usage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৪. স্টাডি ম্যাটেরিয়াল ও কপিরাইট</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            মেধা এক্সামে প্রকাশিত সকল পিডিএফ শিট, লেকচার নোট ও মডেল টেস্ট কনটেন্ট মেধা এক্সামের মেধা সম্পদ। এগুলো শুধুমাত্র শিক্ষার্থীর ব্যক্তিগত অধ্যয়নের জন্য উন্মুক্ত। কর্তৃপক্ষের লিখিত অনুমতি ব্যতীত এসব কনটেন্ট রি-আপলোড, প্রিন্ট করে বিক্রি বা অন্য কোনো সাইটে প্রকাশ করা আইনত দণ্ডনীয়।
          </p>
        </div>

        {/* 5. Premium Membership & Manual Payment Terms (CRITICAL) */}
        <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-300">
              ৫. প্রিমিয়াম মেম্বারশিপ ও ম্যানুয়াল পেমেন্ট নীতিমালা
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 space-y-2">
              <strong className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                গুরুত্বপূর্ণ বিজ্ঞপ্তি — পেমেন্ট এক্টিভেশন প্রক্রিয়া:
              </strong>
              <p>
                পেমেন্ট তথ্য সাবমিট করলেই প্রিমিয়াম মেম্বারশিপ <strong>স্বয়ংক্রিয়ভাবে একটিভ হবে না</strong>।
                মেধা এক্সামের ম্যানুয়াল পেমেন্ট সিস্টেমে অ্যাডমিন কর্তৃক আপনার প্রেরিত Transaction ID (TrxID) এবং ব্যাংক স্টেটমেন্ট যথাযথভাবে ভেরিফাই করার পর মেম্বারশিপ সক্রিয় করা হবে। সাধারণ কর্মঘণ্টায় সাধারণত ২০ মিনিট থেকে কয়েক ঘণ্টার মধ্যে ভেরিফিকেশন সম্পন্ন হয়।
              </p>
            </div>

            <ul className="space-y-2 list-disc list-inside">
              <li><strong>জাল ট্রানজেকশন প্রতিরোধ:</strong> কোনো ভুয়া, নকল বা অন্যের ব্যবহৃত Transaction ID সাবমিট করা কঠোরভাবে নিষিদ্ধ। এমন অসদুপায় প্রমাণিত হলে অ্যাকাউন্ট সাথে সাথে স্থায়ীভাবে ব্লক/ব্যান করা হবে।</li>
              <li><strong>টাকা ফেরত নীতি:</strong> মেম্বারশিপ সক্রিয় হয়ে যাওয়ার পর এবং কনটেন্ট অ্যাক্সেস পাওয়ার পর সাধারণত কোনো রিফান্ড প্রযোজ্য নয়। তবে কারিগরি ত্রুটির ক্ষেত্রে অ্যাডমিন টিম পর্যালোচনা সাপেক্ষে সিদ্ধান্ত গ্রহণ করবে।</li>
            </ul>
          </div>
        </div>

        {/* 6. Referral System Rules */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Gift className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৬. রেফারেল প্রোগ্রাম নীতিমালা</h2>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
            <li>রেফারেল প্রোগ্রাম প্রকৃত বন্ধুদের মেধা এক্সামে যুক্ত করার জন্য তৈরি।</li>
            <li>নিজেকে নিজে রেফার করা (Self-referral), একই ডিভাইসে ভুয়া অ্যাকাউন্ট তৈরি করা বা স্প্যামিংয়ের আশ্রয় নেওয়া সম্পূর্ণ নিষিদ্ধ।</li>
            <li>অন্যায্য উপায়ে অর্জিত রেফারেল পয়েন্ট বা রিওয়ার্ড সিস্টেম থেকে তাৎক্ষণিক বাতিল করার ক্ষমতা কর্তৃপক্ষ সংরক্ষণ করে।</li>
          </ul>
        </div>

        {/* 7. Disclaimer & Limitation of Liability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৭. শিক্ষামূলক ডিসক্লেইমার ও দায়বদ্ধতার সীমাবদ্ধতা</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            মেধা এক্সাম একটি সহায়ক শিক্ষামূলক প্রস্তুতিমূলক টুল। সরকারি বা বেসরকারি নিয়োগ পরীক্ষায় চাকরি পাওয়ার কোনো গ্যারান্টি বা নিশ্চয়তা মেধা এক্সাম প্রদান করে না। প্রশ্নের নির্ভুলতা নিশ্চিত করতে আমরা সর্বোচ্চ যত্ন নিয়ে থাকি, তবে কোনো অনিচ্ছাকৃত মুদ্রণপ্রমাদ বা তথ্যের অমিলের জন্য সৃষ্ট কোনো প্রত্যক্ষ বা পরোক্ষ ক্ষতির জন্য মেধা এক্সাম কর্তৃপক্ষ দায়ী থাকবে না।
          </p>
        </div>

        {/* 8. Account Suspension & Termination */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <UserX className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৮. অ্যাকাউন্ট স্থগিত বা বাতিলকরণ</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            প্ল্যাটফর্মের শর্তাবলী লঙ্ঘন, সাইবার আক্রমণ বা অসদুপায় অবলম্বনের ক্ষেত্রে যেকোনো ব্যবহারকারীর অ্যাকাউন্ট পূর্ব নোটিশ ছাড়াই সাময়িক বা স্থায়ীভাবে স্থগিত করার পূর্ণ অধিকার মেধা এক্সাম কর্তৃপক্ষের রয়েছে।
          </p>
        </div>

        {/* 9. Contact */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">যোগাযোগ ও সহায়তা</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            শর্তাবলী সংক্রান্ত যেকোনো প্রশ্ন বা ব্যাখ্যার জন্য আমাদের সাথে যোগাযোগ করতে পারেন:{' '}
            <a href="mailto:pbprosen1971@gmail.com" className="text-primary font-bold underline">
              pbprosen1971@gmail.com
            </a>{' '}
            অথবা{' '}
            <a href="mailto:support@medhaexam.com" className="text-primary font-bold underline">
              support@medhaexam.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
