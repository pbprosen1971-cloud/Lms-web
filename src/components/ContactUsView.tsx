/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ArrowLeft, Phone, Mail, MapPin, MessageSquare, Send, ExternalLink, ShieldCheck } from 'lucide-react';

interface ContactUsViewProps {
  setView: (view: string) => void;
}

export default function ContactUsView({ setView }: ContactUsViewProps) {
  useEffect(() => {
    document.title = 'Contact Us (যোগাযোগ) — Medha Exam';
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
            Contact Us / যোগাযোগ
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Contact Us — যোগাযোগ করুন
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            মেধা এক্সাম প্ল্যাটফর্ম সংক্রান্ত যেকোনো জিজ্ঞাসা, কারিগরি সহায়তা বা পরামর্শের জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন।
          </p>
        </div>

        {/* Contact Methods Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {/* Phone */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">ফোন / হেল্পলাইন</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">সরাসরি কল করে কথা বলুন</p>
            <a
              href="tel:01873423847"
              className="inline-block text-sm font-bold text-primary hover:underline"
            >
              01873-423847
            </a>
          </div>

          {/* Email */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">ইমেইল সাপোর্ট</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">অফিসিয়াল ইমেইল বার্তা পাঠান</p>
            <a
              href="mailto:support@medhaexam.com"
              className="inline-block text-sm font-bold text-primary hover:underline truncate max-w-full"
            >
              support@medhaexam.com
            </a>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">অফিস ঠিকানা</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">আমাদের অবস্থান</p>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              মাদারীপুর, ঢাকা, বাংলাদেশ
            </span>
          </div>
        </div>

        {/* Social Support Channels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">সোশ্যাল মিডিয়া ও ইনস্ট্যান্ট সাপোর্ট</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="https://wa.me/message/CMBTDT2F7TBNB1"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-3 hover:scale-105 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[#25D366] text-white flex items-center justify-center font-bold">
                WA
              </div>
              <div>
                <span className="block font-bold text-slate-900 dark:text-white text-sm">WhatsApp</span>
                <span className="text-xs text-slate-500">তাৎক্ষণিক মেসেজ</span>
              </div>
            </a>

            <a
              href="https://t.me/Medhaexam"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 flex items-center gap-3 hover:scale-105 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[#229ED9] text-white flex items-center justify-center font-bold">
                TG
              </div>
              <div>
                <span className="block font-bold text-slate-900 dark:text-white text-sm">Telegram</span>
                <span className="text-xs text-slate-500">@Medhaexam</span>
              </div>
            </a>

            <a
              href="https://www.facebook.com/medhaexam"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-3 hover:scale-105 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[#1877F2] text-white flex items-center justify-center font-bold">
                FB
              </div>
              <div>
                <span className="block font-bold text-slate-900 dark:text-white text-sm">Facebook Page</span>
                <span className="text-xs text-slate-500">মেধা এক্সাম অফিসিয়াল</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
