/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Mail, Phone, MapPin, Facebook, Youtube, ShieldCheck, CreditCard } from 'lucide-react';
import { Exam } from '../types';
import { INITIAL_EXAMS } from '../data';
import PaymentPartnersBar from './PaymentLogos';

interface FooterProps {
  setView: (view: string) => void;
  setSelectedExam?: (exam: Exam) => void;
  exams?: Exam[];
}

export default function Footer({ setView, setSelectedExam, exams }: FooterProps) {
  const displayExams = (exams && exams.length > 0 ? exams : INITIAL_EXAMS);
  const liveExams = displayExams.filter((e) => e.status === 'live').slice(0, 5);

  const handleExamClick = (examItem: Exam) => {
    if (setSelectedExam) {
      setSelectedExam(examItem);
      setView('exam');
    } else {
      setView('home');
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 dark:bg-slate-950/95 transition-colors duration-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
              <div className="p-2 rounded-xl bg-primary text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-white">মেধা এক্সাম</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              মেধা এক্সাম একটি প্রফেশনাল ও শিক্ষার্থী বান্ধব অনলাইন মূল্যায়ন প্ল্যাটফর্ম। BCS, ব্যাংক এবং বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষার সেরা প্রস্তুতির জন্য।
            </p>
            <div className="text-xs text-slate-300 font-medium pt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400">Founder & Developer:</span>
              <a
                href="https://www.facebook.com/prosenjitbiswas47"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-emerald-400 font-semibold underline decoration-primary/40 hover:decoration-emerald-400 transition-colors inline-flex items-center gap-1"
                title="Prosenjit Biswas Facebook Profile"
              >
                Prosenjit Biswas
                <Facebook className="h-3.5 w-3.5 inline text-[#1877F2]" />
              </a>
            </div>
            <div className="flex space-x-3 pt-2">
              <a
                href="https://www.facebook.com/digitalnews00"
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook পেজ"
                aria-label="Facebook Page"
                className="p-2.5 bg-slate-800/80 text-slate-300 hover:bg-[#1877F2] hover:text-white hover:scale-110 hover:shadow-lg hover:shadow-[#1877F2]/30 active:scale-95 rounded-xl transition-all duration-300 transform border border-slate-700/50 hover:border-transparent flex items-center justify-center group"
              >
                <Facebook className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              </a>
              <a
                href="https://www.facebook.com/prosenjitbiswas47"
                target="_blank"
                rel="noopener noreferrer"
                title="Founder Facebook"
                aria-label="Founder Profile"
                className="p-2.5 bg-slate-800/80 text-slate-300 hover:bg-[#1877F2] hover:text-white hover:scale-110 hover:shadow-lg hover:shadow-[#1877F2]/30 active:scale-95 rounded-xl transition-all duration-300 transform border border-slate-700/50 hover:border-transparent flex items-center justify-center group"
              >
                <Facebook className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 text-emerald-400 group-hover:text-white" />
              </a>
              <a
                href="https://www.youtube.com/channel/UCeEFIEQjlsNHJTz4ZY-_WvA"
                target="_blank"
                rel="noopener noreferrer"
                title="YouTube চ্যানেল"
                aria-label="YouTube Channel"
                className="p-2.5 bg-slate-800/80 text-slate-300 hover:bg-[#FF0000] hover:text-white hover:scale-110 hover:shadow-lg hover:shadow-[#FF0000]/30 active:scale-95 rounded-xl transition-all duration-300 transform border border-slate-700/50 hover:border-transparent flex items-center justify-center group"
              >
                <Youtube className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">গুরুত্বপূর্ণ লিঙ্ক</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => setView('home')} className="hover:text-primary transition-colors duration-200">হোম পেজ</button>
              </li>
              <li>
                <button onClick={() => setView('dashboard')} className="hover:text-primary transition-colors duration-200">স্টুডেন্ট ড্যাশবোর্ড</button>
              </li>
              <li>
                <button onClick={() => setView('profile')} className="hover:text-primary transition-colors duration-200">প্রোফাইল সেটিংস</button>
              </li>
              <li>
                <button onClick={() => setView('login')} className="hover:text-primary transition-colors duration-200">লগইন / রেজিস্টার</button>
              </li>
            </ul>
          </div>

          {/* Live Exams Links */}
          <div>
            <h3 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">লাইভ এক্সামসমূহ</h3>
            <ul className="space-y-2.5 text-sm">
              {liveExams.map((exam) => (
                <li key={exam.id}>
                  <button
                    onClick={() => handleExamClick(exam)}
                    className="hover:text-primary text-slate-400 transition-colors duration-200 text-left line-clamp-1 flex items-center gap-1.5"
                    title={exam.title}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>{exam.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details & Security */}
          <div className="space-y-3 text-sm text-slate-400">
            <h3 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">যোগাযোগ</h3>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>মাদারীপুর, ঢাকা, বাংলাদেশ</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>+৮৮০৯৬৭৮৬৩৮৭১১</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>support@medhaexam.com</span>
            </div>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>১০০% সুরক্ষিত ও এনক্রিপ্টেড পেমেন্ট</span>
            </div>
          </div>
        </div>

        {/* Payment Partners Showcase */}
        <div className="mt-10 pt-8 border-t border-slate-800/80">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-5 bg-slate-800/50 backdrop-blur-md border border-slate-700/60 rounded-2xl p-5 md:px-7">
            <div className="text-center lg:text-left">
              <h4 className="text-white font-semibold text-sm sm:text-base tracking-wide">
                Our Payment Partner's
              </h4>
            </div>

            {/* Horizontal Aligned Uniform Payment Logos (Same Height & Width) */}
            <PaymentPartnersBar />
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© ২০২৬ মেধা এক্সাম। সর্বস্বত্ব সংরক্ষিত। <span className="hidden sm:inline">|</span> <span className="text-slate-400">Founder & Developer: <a href="https://www.facebook.com/prosenjitbiswas47" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">Prosenjit Biswas</a></span></p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-400">গোপনীয়তা নীতি</a>
            <a href="#" className="hover:text-slate-400">ব্যবহারের শর্তাবলী</a>
            <a href="#" className="hover:text-slate-400">কুকি পলিসি</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

