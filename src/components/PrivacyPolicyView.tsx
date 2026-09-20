/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  Shield,
  Lock,
  FileText,
  CreditCard,
  UserCheck,
  Trash2,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';

interface PrivacyPolicyViewProps {
  setView: (view: string) => void;
}

export default function PrivacyPolicyView({ setView }: PrivacyPolicyViewProps) {
  useEffect(() => {
    document.title = 'Privacy Policy — Medha Exam';
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
            <span>সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              Google Play Compliant
            </span>
          </div>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Privacy Policy — Medha Exam
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                মেধা এক্সাম (Medha Exam) আপনার ব্যক্তিগত তথ্যের গোপনীয়তা ও সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার প্রদান করে। এই পলিসিতে স্পষ্টভাবে উল্লেখ রয়েছে আমরা বাস্তবক্ষেত্রে কী ধরনের তথ্য সংগ্রহ করি, কীভাবে ব্যবহার করি এবং আপনার তথ্য কীভাবে সুরক্ষিত ও নিয়ন্ত্রণযোগ্য রাখা হয়।
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Information We Collect */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <UserCheck className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">১. আমরা যেসব তথ্য সংগ্রহ করি (Information We Collect)</h2>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            মেধা এক্সাম প্ল্যাটফর্মে অ্যাকাউন্টের কার্যকারিতা নিশ্চিত করতে এবং পরীক্ষার মানসম্মত মূল্যায়ন সেবা প্রদানের জন্য আমরা শুধুমাত্র প্রয়োজনীয় তথ্য সংগ্রহ করে থাকি:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                অ্যাকাউন্ট ও প্রোফাইল তথ্য
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>আপনার নাম (Name)</li>
                <li>ইমেইল ঠিকানা (Email address)</li>
                <li>প্রোফাইল ছবি ও শিক্ষাপ্রতিষ্ঠান (ঐচ্ছিক)</li>
                <li>ফোন নম্বর (যদি প্রদান করা হয়)</li>
                <li>Google Sign-In অ্যাকাউন্ট আইডি ও মৌলিক তথ্য</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                পরীক্ষা ও অ্যাকাডেমিক অ্যাক্টিভিটি
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>অংশগ্রহণকৃত পরীক্ষার তালিকা (Exam Attempts)</li>
                <li>প্রদত্ত উত্তর ও স্কোরের বিস্তারিত বিবরণী</li>
                <li>ডেইলি প্র্যাকটিস অ্যাক্টিভিটি (Daily Practice)</li>
                <li>ভুল উত্তর প্র্যাকটিস রেকর্ড (Wrong Question Practice)</li>
                <li>অর্জিত পয়েন্ট ও মেরিট পজিশন</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                রেফারেল ও প্রিমিয়াম মেম্বারশিপ
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>ব্যক্তিগত রেফারেল কোড ও অর্জিত রেফারেল রিওয়ার্ড</li>
                <li>রেফারেলের মাধ্যমে যুক্ত ব্যবহারকারীদের সংখ্যা ও অগ্রগতি</li>
                <li>প্রিমিয়াম প্যাকেজ মেম্বারশিপ স্ট্যাটাস ও মেয়াদ</li>
                <li>স্টাডি ম্যাটেরিয়াল (Study Materials) ডাউনলোড ও ভিউ হিস্ট্রি</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                ম্যানুয়াল পেমেন্ট তথ্য (Payment Data)
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                <li>নির্বাচিত পেমেন্ট মেথড (যেমন: বিকাশ, নগদ, রকেট, উপায়)</li>
                <li>ট্রানজেকশন আইডি (Transaction ID - TrxID)</li>
                <li>প্রেরক অ্যাকাউন্ট নম্বর (যদি ব্যবহারকারী স্বপ্রণোদিতভাবে প্রদান করেন)</li>
                <li>পেমেন্ট প্যাকেজ ও ভেরিফিকেশন স্ট্যাটাস</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: How We Use Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">২. তথ্যের ব্যবহার (How We Use Information)</h2>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            সংগৃহীত তথ্য কেবলমাত্র নিম্নলিখিত সুস্পষ্ট শিক্ষামূলক ও প্রশাসনিক উদ্দেশ্যে ব্যবহৃত হয়:
          </p>

          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>অ্যাকাউন্ট ব্যবস্থাপনা ও অথেনটিকেশন:</strong> লগইন নিশ্চিতকরণ, পাসওয়ার্ড রিসেট এবং প্রোফাইল তথ্য সংরক্ষণ।</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>পরীক্ষা গ্রহণ ও স্বয়ংক্রিয় ফলাফল হিসাব:</strong> রিয়েল-টাইম টেস্ট পরিচালনা, প্রশ্নের সমাধান বিশ্লেষণ ও সার্টিফিকেট প্রদান।</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>অনুশীলন সুবিধা ও দুর্বলতা ট্র্যাকিং:</strong> ডেইলি প্র্যাকটিস ও ভুল প্রশ্ন সংগ্রহাগারের মাধ্যমে প্রস্তুতির ঘাটতি চিহ্নিত করা।</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>রেফারেল ও প্রিমিয়াম প্যাকেজ এক্টিভেশন:</strong> রেফারেল বোনাস গণনা ও ম্যানুয়াল পেমেন্ট অ্যাডমিন কর্তৃক ভেরিফাই করে মেম্বারশিপ চালু করা।</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>প্ল্যাটফর্মের নিরাপত্তা ও সহায়তা:</strong> স্প্যাম প্রতিরোধ, অ্যাকাউন্টের অপব্যবহার রোধ এবং ব্যবহারকারীর সহায়তায় প্রয়োজনীয় নোটিফিকেশন প্রদান।</span>
            </li>
          </ul>
        </div>

        {/* Section 3: Third-Party Services */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Lock className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৩. থার্ড-পার্টি সার্ভিসসমূহ (Third-Party Services)</h2>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            মেধা এক্সাম বাস্তবসম্মতভাবে শুধুমাত্র বিশ্বস্ত ও বিশ্বমানের অবকাঠামোগত সেবা ব্যবহার করে:
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Firebase Authentication &amp; Cloud Firestore (Google LLC)</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                সুরক্ষিত ইউজার লগইন, এনক্রিপ্টেড ডাটাবেজ স্টোরেজ এবং রিয়েল-টাইম ডেটা সিঙ্কিংয়ের জন্য গুগল ক্লাউড ফায়ারবেস ব্যবহৃত হয়।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Google Sign-In Identity Services</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                ১-ক্লিকে ব্যবহারকারীর প্রমাণীকরণের সুবিধার্থে স্ট্যান্ডার্ড Google OAuth টোকেন ব্যবহৃত হয়।
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            * দ্রষ্টব্য: মেধা এক্সাম কোনো বাণিজ্যিক বিজ্ঞাপনী ট্র্যাকিং নেটওয়ার্কের কাছে আপনার ব্যক্তিগত তথ্য বিক্রি বা হস্তান্তর করে না।
          </p>
        </div>

        {/* Section 4: Payment Security Notice */}
        <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-300">
              ৪. পেমেন্ট ও পিন সুরক্ষা (Payment &amp; PIN Security)
            </h2>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-amber-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
            <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              মেধা এক্সাম কখনোই বিকাশ, নগদ, রকেট বা উপায়ের পিন (PIN), পাসওয়ার্ড বা ওটিপি (OTP) সংগ্রহ করে না।
            </p>
            <p className="leading-relaxed">
              মেধা এক্সামে সকল পেমেন্ট সম্পূর্ণ <strong>ম্যানুয়াল প্রক্রিয়ায়</strong> সম্পন্ন হয়। শিক্ষার্থী তার নিজস্ব মোবাইল ব্যাংকিং অ্যাপ বা ডায়াল কোড ব্যবহার করে আমাদের নির্দিষ্ট মার্চেন্ট/ব্যক্তিগত নম্বরে টাকা পাঠিয়ে শুধুমাত্র পেমেন্ট মেথড এবং প্রমাণ হিসেবে <strong>Transaction ID (TrxID)</strong> সাবমিট করেন।
            </p>
          </div>
        </div>

        {/* Section 5: Data Security */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৫. তথ্য সুরক্ষা (Data Security)</h2>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            আপনার তথ্য সুরক্ষিত রাখতে আমরা আধুনিক SSL/TLS এনক্রিপশন, গুগল ক্লাউড ফায়ারস্টোর সিকিউরিটি রুলস (Firestore Security Rules) এবং কঠোর রুলস-ভিত্তিক অ্যাক্সেস নিয়ন্ত্রণ ব্যবহার করি। তবে স্মরণ রাখা জরুরি, ইন্টারনেটের মাধ্যমে ডেটা ট্রান্সমিশন বা ইলেকট্রনিক সংরক্ষণের কোনো ব্যবস্থাই শতভাগ নিরাপদ হওয়ার নিরঙ্কুশ নিশ্চয়তা প্রদান করতে পারে না।
          </p>
        </div>

        {/* Section 6: Data Retention */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Info className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৬. তথ্য সংরক্ষণ নীতিমালা (Data Retention)</h2>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            যতদিন ব্যবহারকারীর অ্যাকাউন্ট সক্রিয় থাকে, ততদিন তার অ্যাকাডেমিক অগ্রগতি এবং পরীক্ষার ফলাফল সংরক্ষিত থাকে। প্রতারণা ও জালিয়াতি প্রতিরোধ, আর্থিক অডিট এবং আইনি দায়বদ্ধতা নিশ্চিত করার উদ্দেশ্যে পেমেন্ট ট্রানজেকশন আইডি সংক্রান্ত রেকর্ড প্রযোজ্য মেয়াদে সংরক্ষিত থাকতে পারে।
          </p>
        </div>

        {/* Section 7: Data Deletion Rights */}
        <div className="bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-rose-900 dark:text-rose-300">
              ৭. অ্যাকাউন্ট ও তথ্য মুছে ফেলার অধিকার (Data &amp; Account Deletion)
            </h2>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            গুগল প্লে পলিসি ও ব্যবহারকারীর ব্যক্তিগত অধিকারের প্রতি শ্রদ্ধাশীল হয়ে মেধা এক্সাম সহজ অ্যাকাউন্ট ও ডেটা ডিলিশন প্রক্রিয়া প্রদান করে:
          </p>

          <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <p>
              • <strong>ইন-অ্যাপ ডিলিশন (In-App):</strong> আপনি প্রোফাইল সেটিংসের <em>"Privacy &amp; Account"</em> সেকশন থেকে সরাসরি <strong>Delete Account</strong> বাটনে ক্লিক করে অ্যাকাউন্ট ও সংশ্লিষ্ট ব্যক্তিগত ডেটা স্থায়ীভাবে মুছে ফেলতে পারেন।
            </p>
            <p>
              • <strong>ওয়েব ডিলিশন পোর্টাল (Web Portal):</strong> লগইন ছাড়াও আমাদের অফিসিয়াল ওয়েব পেজ{' '}
              <button
                onClick={() => setView('delete-account')}
                className="text-primary font-bold underline hover:text-emerald-600 cursor-pointer"
              >
                /delete-account
              </button>{' '}
              থেকে ইমেইল ও নাম দিয়ে মুছে ফেলার অনুরোধ দাখিল করা যাবে।
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setView('delete-account')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>অ্যাকাউন্ট ডিলিট রিকোয়েস্ট পেজে যান</span>
            </button>
          </div>
        </div>

        {/* Section 8: Contact Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Mail className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">৮. আমাদের সাথে যোগাযোগ (Contact Us)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400 block">অ্যাপ্লিকেশনের নাম:</span>
              <strong className="text-slate-900 dark:text-white text-sm">মেধা এক্সাম (Medha Exam)</strong>
            </div>
            <div>
              <span className="text-slate-400 block">প্রতিষ্ঠাতা ও ডেভেলপার:</span>
              <strong className="text-slate-900 dark:text-white text-sm">Prosenjit Biswas</strong>
            </div>
            <div>
              <span className="text-slate-400 block">অফিসিয়াল সাপোর্ট ইমেইল:</span>
              <a href="mailto:pbprosen1971@gmail.com" className="text-primary font-bold underline">
                pbprosen1971@gmail.com
              </a>
            </div>
            <div>
              <span className="text-slate-400 block">বিকল্প সাপোর্ট ইমেইল:</span>
              <a href="mailto:support@medhaexam.com" className="text-primary font-bold underline">
                support@medhaexam.com
              </a>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block">ঠিকানা:</span>
              <span className="text-slate-700 dark:text-slate-300">মাদারীপুর, ঢাকা, বাংলাদেশ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
