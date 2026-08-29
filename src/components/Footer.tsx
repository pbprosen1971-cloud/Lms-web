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
    <footer className="relative overflow-hidden bg-slate-900 text-slate-300 dark:bg-slate-950/95 transition-colors duration-300 border-t border-slate-800">
      {/* Educational Line Art Background Illustrations with Variant Colors & 40% Opacity */}
      <div 
        className="absolute inset-0 pointer-events-none select-none opacity-40 overflow-hidden" 
        aria-hidden="true"
      >
        <svg className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 600" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {/* Top Left: Graduation Cap & Open Book (Emerald & Cyan) */}
          <g transform="translate(60, 40) scale(1.1)" stroke="#10b981">
            {/* Mortarboard */}
            <polygon points="50,15 90,30 50,45 10,30" />
            <path d="M25,36 v22 c0,8 11,14 25,14 s25,-6 25,-14 v-22" />
            <path d="M90,30 v30" />
            <circle cx="90" cy="62" r="3" fill="#10b981" fillOpacity="0.4" />
          </g>
          
          <g transform="translate(180, 80) scale(0.9)" stroke="#06b6d4">
            {/* Open Book */}
            <path d="M10,60 C30,45 60,45 80,60 C100,45 130,45 150,60 L150,110 C130,95 100,95 80,110 C60,95 30,95 10,110 Z" />
            <line x1="80" y1="60" x2="80" y2="110" />
            <line x1="25" y1="68" x2="65" y2="68" />
            <line x1="25" y1="80" x2="65" y2="80" />
            <line x1="25" y1="92" x2="55" y2="92" />
            <line x1="95" y1="68" x2="135" y2="68" />
            <line x1="95" y1="80" x2="135" y2="80" />
            <line x1="95" y1="92" x2="125" y2="92" />
          </g>

          {/* Top Center-Left: Science Atom & Lightbulb (Sky & Amber) */}
          <g transform="translate(420, 30) scale(1)" stroke="#38bdf8">
            {/* Atom */}
            <circle cx="50" cy="50" r="8" fill="#38bdf8" fillOpacity="0.4" />
            <ellipse cx="50" cy="50" rx="45" ry="16" transform="rotate(30 50 50)" />
            <ellipse cx="50" cy="50" rx="45" ry="16" transform="rotate(-30 50 50)" />
            <ellipse cx="50" cy="50" rx="45" ry="16" transform="rotate(90 50 50)" />
          </g>

          <g transform="translate(580, 70) scale(0.95)" stroke="#f59e0b">
            {/* Lightbulb (Idea / Innovation) */}
            <path d="M40,15 A25,25 0 0,0 15,40 C15,52 23,60 25,68 L35,68 L35,74 L45,74 L45,68 L55,68 C57,60 65,52 65,40 A25,25 0 0,0 40,15 Z" />
            <line x1="30" y1="78" x2="50" y2="78" />
            <line x1="35" y1="82" x2="45" y2="82" />
            <line x1="40" y1="5" x2="40" y2="0" />
            <line x1="10" y1="20" x2="5" y2="15" />
            <line x1="70" y1="20" x2="75" y2="15" />
          </g>

          {/* Top Right: Certificate / Diploma & Compass (Indigo & Purple) */}
          <g transform="translate(850, 40) scale(1.05)" stroke="#818cf8">
            {/* Certificate */}
            <rect x="10" y="10" width="80" height="60" rx="4" />
            <line x1="22" y1="25" x2="65" y2="25" />
            <line x1="22" y1="35" x2="55" y2="35" />
            <line x1="22" y1="45" x2="45" y2="45" />
            <circle cx="70" cy="48" r="8" fill="#818cf8" fillOpacity="0.3" />
            <path d="M66,54 L62,65 L70,61 L78,65 L74,54" />
          </g>

          <g transform="translate(1080, 50) scale(0.9)" stroke="#c084fc">
            {/* Compass / Math Tool */}
            <circle cx="50" cy="20" r="6" />
            <line x1="47" y1="26" x2="20" y2="90" />
            <line x1="53" y1="26" x2="80" y2="90" />
            <path d="M30,65 Q50,75 70,65" />
            <line x1="50" y1="14" x2="50" y2="6" />
          </g>

          {/* Far Top Right: School Backpack & Globe (Teal & Blue) */}
          <g transform="translate(1260, 45) scale(0.95)" stroke="#14b8a6">
            {/* Globe */}
            <circle cx="50" cy="50" r="35" />
            <ellipse cx="50" cy="50" rx="16" ry="35" />
            <line x1="15" y1="50" x2="85" y2="50" />
            <path d="M20,30 Q50,40 80,30" />
            <path d="M20,70 Q50,60 80,70" />
            <path d="M50,10 A42,42 0 0,1 50,90 L50,100" />
            <line x1="30" y1="100" x2="70" y2="100" />
          </g>

          {/* Bottom Left: Test Exam Paper & Pencil (Rose & Lime) */}
          <g transform="translate(90, 360) scale(1)" stroke="#f43f5e">
            {/* Exam Paper with A+ */}
            <rect x="15" y="10" width="70" height="90" rx="4" />
            <line x1="28" y1="28" x2="50" y2="28" />
            <line x1="28" y1="40" x2="68" y2="40" />
            <line x1="28" y1="52" x2="68" y2="52" />
            <line x1="28" y1="64" x2="55" y2="64" />
            <circle cx="68" cy="78" r="12" fill="#f43f5e" fillOpacity="0.25" />
            <path d="M64,83 L68,73 L72,83 M65,80 L71,80" />
            <path d="M75,76 L79,76 M77,74 L77,78" />
          </g>

          <g transform="translate(230, 420) scale(0.85)" stroke="#84cc16">
            {/* Pencil & Ruler */}
            <path d="M10,80 L15,60 L70,5 L85,20 L30,75 Z" />
            <polygon points="10,80 15,60 30,75" fill="#84cc16" fillOpacity="0.25" />
            <line x1="60" y1="15" x2="75" y2="30" />
            <rect x="40" y="70" width="90" height="20" rx="2" transform="rotate(-20 40 70)" />
            <line x1="55" y1="68" x2="55" y2="76" transform="rotate(-20 40 70)" />
            <line x1="70" y1="68" x2="70" y2="76" transform="rotate(-20 40 70)" />
            <line x1="85" y1="68" x2="85" y2="76" transform="rotate(-20 40 70)" />
            <line x1="100" y1="68" x2="100" y2="76" transform="rotate(-20 40 70)" />
          </g>

          {/* Bottom Center: Trophy & Calculator (Amber / Gold & Sky) */}
          <g transform="translate(540, 360) scale(1)" stroke="#fbbf24">
            {/* Trophy */}
            <path d="M25,20 L75,20 L65,55 C60,70 40,70 35,55 Z" />
            <path d="M25,26 C12,26 12,46 27,48" />
            <path d="M75,26 C88,26 88,46 73,48" />
            <line x1="50" y1="68" x2="50" y2="85" />
            <rect x="30" y="85" width="40" height="12" rx="2" />
            {/* Star on trophy */}
            <polygon points="50,30 52,36 58,36 53,40 55,46 50,42 45,46 47,40 42,36 48,36" fill="#fbbf24" fillOpacity="0.5" />
          </g>

          <g transform="translate(740, 370) scale(0.95)" stroke="#38bdf8">
            {/* Calculator / Tech Device */}
            <rect x="15" y="10" width="55" height="80" rx="6" />
            <rect x="23" y="20" width="39" height="18" rx="2" />
            <circle cx="28" cy="50" r="3" fill="#38bdf8" />
            <circle cx="42" cy="50" r="3" fill="#38bdf8" />
            <circle cx="56" cy="50" r="3" fill="#38bdf8" />
            <circle cx="28" cy="62" r="3" fill="#38bdf8" />
            <circle cx="42" cy="62" r="3" fill="#38bdf8" />
            <circle cx="56" cy="62" r="3" fill="#38bdf8" />
            <circle cx="28" cy="74" r="3" fill="#38bdf8" />
            <circle cx="42" cy="74" r="3" fill="#38bdf8" />
            <circle cx="56" cy="74" r="3" fill="#38bdf8" />
          </g>

          {/* Bottom Right: Books Stack & Stopwatch (Cyan & Violet) */}
          <g transform="translate(1020, 370) scale(1)" stroke="#06b6d4">
            {/* Stack of books */}
            <rect x="15" y="65" width="80" height="16" rx="2" />
            <line x1="30" y1="65" x2="30" y2="81" />
            <rect x="20" y="47" width="70" height="16" rx="2" />
            <line x1="35" y1="47" x2="35" y2="63" />
            <rect x="25" y="29" width="60" height="16" rx="2" />
            <line x1="40" y1="29" x2="40" y2="45" />
            {/* Apple on top */}
            <circle cx="55" cy="20" r="8" fill="#f43f5e" stroke="#f43f5e" fillOpacity="0.4" />
            <path d="M55,12 Q58,6 63,7" stroke="#10b981" />
          </g>

          <g transform="translate(1240, 360) scale(1.05)" stroke="#a855f7">
            {/* Stopwatch / Exam Timer */}
            <circle cx="50" cy="55" r="32" />
            <line x1="50" y1="55" x2="50" y2="35" />
            <line x1="50" y1="55" x2="64" y2="55" />
            <line x1="50" y1="23" x2="50" y2="15" />
            <rect x="42" y="11" width="16" height="5" rx="1.5" />
            <line x1="72" y1="30" x2="78" y2="24" />
          </g>

          {/* Floating Math & Knowledge Symbols with Color Variant Palette */}
          <g opacity="0.85">
            <text x="360" y="180" fontSize="24" fontFamily="serif" fill="#10b981">∑</text>
            <text x="740" y="160" fontSize="26" fontFamily="serif" fill="#f59e0b">π</text>
            <text x="980" y="190" fontSize="22" fontFamily="serif" fill="#a855f7">√x</text>
            <text x="460" y="480" fontSize="24" fontFamily="serif" fill="#06b6d4">∞</text>
            <text x="1190" y="240" fontSize="20" fontFamily="serif" fill="#f43f5e">f(x)</text>
            <text x="80" y="230" fontSize="22" fontFamily="serif" fill="#38bdf8">E = mc²</text>
          </g>
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

