/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  HelpCircle,
  Sparkles,
  BookOpen,
  GraduationCap,
  CreditCard,
  FileText,
  ShieldCheck,
  MessageSquare,
  X,
  ArrowRight,
  ExternalLink,
  Mail,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FaqItem {
  id: number;
  question: string;
  answer: string[];
  category: 'about' | 'exam' | 'practice' | 'premium' | 'study' | 'account' | 'support';
  tags: string[];
}

export const FAQ_DATA: FaqItem[] = [
  {
    id: 1,
    question: 'Medha Exam কী?',
    answer: [
      'Medha Exam হলো একটি online educational এবং MCQ examination platform। এখানে শিক্ষার্থীরা বিভিন্ন চাকরি ও প্রতিযোগিতামূলক পরীক্ষার প্রস্তুতির জন্য MCQ পরীক্ষা, practice, result analysis, Daily Practice, Wrong Question Practice এবং Study Materials ব্যবহার করতে পারে।'
    ],
    category: 'about',
    tags: ['medha', 'exam', 'platform', 'mcq', 'মেধা এক্সাম', 'পরিচিতি']
  },
  {
    id: 2,
    question: 'Medha Exam-এ কী ধরনের পরীক্ষা দেওয়া যায়?',
    answer: [
      'Medha Exam-এ বিভিন্ন চাকরি ও প্রতিযোগিতামূলক পরীক্ষাভিত্তিক MCQ পরীক্ষা এবং practice করা যায়। Admin কর্তৃক প্রকাশিত পরীক্ষাগুলো ব্যবহারকারীরা নির্ধারিত সময় ও নিয়ম অনুযায়ী অংশগ্রহণ করতে পারে।'
    ],
    category: 'exam',
    tags: ['exam', 'types', 'bcs', 'bank', 'চাকরি', 'পরীক্ষা']
  },
  {
    id: 3,
    question: 'Medha Exam ব্যবহার করতে কি Account তৈরি করতে হবে?',
    answer: [
      'কিছু basic information দেখা গেলেও Exam, Result, Profile, Referral, Premium এবং অন্যান্য personalized features ব্যবহারের জন্য Account প্রয়োজন হতে পারে।',
      'Email/Password অথবা Google Login ব্যবহার করে Account তৈরি বা Login করা যায়।'
    ],
    category: 'account',
    tags: ['account', 'login', 'signup', 'google', 'লগইন', 'অ্যাকাউন্ট']
  },
  {
    id: 4,
    question: 'আমি কীভাবে Exam দেব?',
    answer: [
      'Login করার পর Exam section-এ গিয়ে available examination নির্বাচন করুন। এরপর পরীক্ষার নির্দেশনা অনুসরণ করে MCQ প্রশ্নগুলোর উত্তর দিন এবং নির্ধারিত সময়ের মধ্যে Exam submit করুন।'
    ],
    category: 'exam',
    tags: ['how to exam', 'exam participate', 'পরীক্ষা পদ্ধতি']
  },
  {
    id: 5,
    question: 'Exam দেওয়ার পর Result কোথায় পাব?',
    answer: [
      'Exam submit করার পর আপনার Result দেখতে পাবেন এছাড়াও Dashboard থেকে Score, Marks, Accuracy এবং available performance information দেখতে পারবেন।'
    ],
    category: 'exam',
    tags: ['result', 'score', 'dashboard', 'রেজাল্ট', 'মার্কস']
  },
  {
    id: 6,
    question: 'Exam-এর ভুল ও সঠিক উত্তর কি পরে দেখা যায়?',
    answer: [
      'হ্যাঁ। Exam Result-এর Question & Answer Review section-এ প্রশ্ন, options, আপনার selected answer, correct answer এবং available explanation দেখা যাবে।',
      'সঠিক উত্তর Green এবং ভুল উত্তর আলাদাভাবে লাল highlight করা হবে।'
    ],
    category: 'exam',
    tags: ['review', 'explanation', 'correct answer', 'ভুল উত্তর', 'রিভিউ']
  },
  {
    id: 7,
    question: 'Daily Practice কী?',
    answer: [
      'Daily Practice হলো প্রতিদিনের MCQ practice feature। Dashboard থেকে প্রতিদিন Free ১০টি সংখ্যক প্রশ্নের মাধ্যমে আপনার নিয়মিত প্রস্তুতি ও practice করার সুযোগ থাকবে।'
    ],
    category: 'practice',
    tags: ['daily practice', 'free mcq', 'প্রতিদিনের প্র্যাকটিস']
  },
  {
    id: 8,
    question: 'Wrong Question Practice কী?',
    answer: [
      'আপনি পূর্ববর্তী পরীক্ষাগুলোতে যেসব প্রশ্নের উত্তর ভুল করেছেন, সেগুলো নিয়ে Wrong Question Practice করা যায়।',
      'এর মাধ্যমে নিজের দুর্বল বিষয়গুলো পুনরায় practice করার সুযোগ পাওয়া যায়।'
    ],
    category: 'practice',
    tags: ['wrong questions', 'mistakes', 'রিভিশন', 'ভুল প্রশ্ন']
  },
  {
    id: 9,
    question: 'Referral System কী?',
    answer: [
      'Medha Exam-এর Referral System ব্যবহার করে আপনার referral link বা code অন্যদের সঙ্গে share করতে পারবেন।',
      'আপনার referral-এর মাধ্যমে নতুন user Sign up করলে আপনার account-এ referral activity/count প্রদর্শিত হতে পারে।',
      'Referral-এর ক্ষেত্রে platform-এর নির্ধারিত নিয়ম প্রযোজ্য হবে।'
    ],
    category: 'practice',
    tags: ['referral', 'bonus', 'points', 'রেফারেল', 'ইনভাইট']
  },
  {
    id: 10,
    question: 'Premium Membership কী?',
    answer: [
      'Premium Membership-এর মাধ্যমে নির্দিষ্ট Premium features এবং Premium-only content ব্যবহার করার সুযোগ পাওয়া যায়।',
      'কোন কোন সুবিধা Premium-এর অন্তর্ভুক্ত তা website-এর Premium Membership section-এ দেখানো থাকবে।'
    ],
    category: 'premium',
    tags: ['premium', 'membership', 'features', 'প্রিমিয়াম']
  },
  {
    id: 11,
    question: 'Premium Membership কীভাবে পাওয়া যাবে?',
    answer: [
      'Premium Membership section থেকে available package নির্বাচন করে প্রদর্শিত payment instructions অনুযায়ী payment করতে হবে।',
      'Manual payment হলে Transaction ID submit করার পর administrator payment যাচাই করবেন। Payment approve হওয়ার পর existing Premium Membership system অনুযায়ী Premium access activate হবে।'
    ],
    category: 'premium',
    tags: ['premium activation', 'upgrade', 'প্যাকেজ']
  },
  {
    id: 12,
    question: 'কোন কোন মাধ্যমে Payment করা যায়?',
    answer: [
      'বর্তমানে available payment methods-এর মধ্যে bKash, Nagad, Upay এবং Rocket যুক্ত আছে।',
      'Payment করার আগে website-এ প্রদর্শিত active payment method এবং account number অবশ্যই যাচাই করুন।'
    ],
    category: 'premium',
    tags: ['payment methods', 'bkash', 'nagad', 'rocket', 'upay', 'বিকাশ', 'নগদ']
  },
  {
    id: 13,
    question: 'Payment করার পর কী করতে হবে?',
    answer: [
      'Payment করার পর website-এর payment form-এ সঠিক Payment Method, Amount এবং Transaction ID প্রদান করে payment request submit করতে হবে।',
      'Administrator payment যাচাই করার পর request Approved হবে।'
    ],
    category: 'premium',
    tags: ['transaction id', 'trxid', 'payment submit', 'পেমেন্ট সাবমিট']
  },
  {
    id: 14,
    question: 'Payment করার পর সঙ্গে সঙ্গে Premium চালু হয় না কেন?',
    answer: [
      'Manual payment system ব্যবহারের কারণে প্রতিটি payment administrator দ্বারা যাচাই করা হয়।',
      'Payment verification সম্পন্ন হওয়ার পর approved payment-এর জন্য Premium Membership activate করা হয়। এতে সর্বোচ্চ সময় ১০ মিনিট লাগতে পারে ,তবে বেশিভাগ ইউজার সাথে সাথে premium active হয়ে যায়।'
    ],
    category: 'premium',
    tags: ['payment delay', 'verification', 'activation time', 'সময়সীমা']
  },
  {
    id: 15,
    question: 'Study Materials কী?',
    answer: [
      'Study Materials section-এ পরীক্ষার প্রস্তুতির জন্য বিভিন্ন educational PDF বা অন্যান্য study resources থাকতে পারে। যেমন সিলেবাস,প্রশ্ন ব্যাংক,স্পেশাল নোট ও স্পেশাল সাজেশন PDF',
      'কিছু materials Free এবং কিছু materials Premium Members-এর জন্য নির্ধারিত হতে পারে।'
    ],
    category: 'study',
    tags: ['study materials', 'pdf', 'notes', 'স্টাডি ম্যাটেরিয়াল', 'নোট', 'সাজেশন']
  },
  {
    id: 16,
    question: 'Free Study Materials কি সবাই ব্যবহার করতে পারবে?',
    answer: [
      'হ্যাঁ। Admin কর্তৃক Free হিসেবে প্রকাশিত Study Materials eligible users ব্যবহার করতে পারবেন।'
    ],
    category: 'study',
    tags: ['free pdf', 'open materials', 'ফ্রি ম্যাটেরিয়াল']
  },
  {
    id: 17,
    question: 'Premium Study Materials কে ব্যবহার করতে পারবে?',
    answer: [
      'Premium হিসেবে প্রকাশিত Study Materials শুধুমাত্র active Premium Membership থাকা users-এর জন্য accessible হবে।'
    ],
    category: 'study',
    tags: ['premium pdf', 'exclusive materials', 'প্রিমিয়াম ম্যাটেরিয়াল']
  },
  {
    id: 18,
    question: 'আমার Account-এর তথ্য কি নিরাপদ?',
    answer: [
      'Medha Exam ব্যবহারকারীর account এবং data নিরাপদ রাখার জন্য appropriate security measures ব্যবহার করে।',
      'তবে ব্যবহারকারীর নিজের password, OTP বা authentication information অন্য কারও সঙ্গে share করা উচিত নয়। Medha Exam এসব তথ্য জানতে চাইবে না।'
    ],
    category: 'account',
    tags: ['security', 'privacy', 'password', 'নিরাপত্তা', 'পাসওয়ার্ড']
  },
  {
    id: 19,
    question: 'আমি কি আমার Account Delete করতে পারব?',
    answer: [
      'হ্যাঁ। Medha Exam-এর Account Deletion ব্যবস্থা ব্যবহার করে account deletion request করা যাবে।',
      'Account deletion এবং data retention সম্পর্কে বিস্তারিত জানতে Privacy Policy দেখুন।'
    ],
    category: 'account',
    tags: ['delete account', 'data retention', 'অ্যাকাউন্ট ডিলিট']
  },
  {
    id: 20,
    question: 'Medha Exam কি চাকরি নিশ্চিত করে?',
    answer: [
      'না। Medha Exam একটি educational এবং examination preparation platform।',
      'এটি চাকরি, পরীক্ষায় উত্তীর্ণ হওয়া বা কোনো নির্দিষ্ট ফলাফল নিশ্চিত করে না।'
    ],
    category: 'about',
    tags: ['job guarantee', 'disclaimer', 'চাকরি নিশ্চয়তা']
  },
  {
    id: 21,
    question: 'কোনো প্রশ্ন বা উত্তরে ভুল থাকলে কী করব?',
    answer: [
      'কোনো প্রশ্ন, উত্তর বা explanation-এ ভুল মনে হলে Medha Exam-এর available support/contact option-এর মাধ্যমে বিষয়টি জানাতে পারেন।',
      'প্রয়োজন অনুযায়ী কর্তৃপক্ষ বিষয়টি পর্যালোচনা করতে পারে।'
    ],
    category: 'support',
    tags: ['mistake report', 'error in question', 'রিপোর্ট', 'ভুল সংশোধন']
  },
  {
    id: 22,
    question: 'Medha Exam-এর সঙ্গে কীভাবে যোগাযোগ করব?',
    answer: [
      'কোনো সমস্যা, প্রশ্ন বা সহায়তার প্রয়োজন হলে website-এর Contact/Support section ব্যবহার করুন অথবা প্রদর্শিত official support email-এ যোগাযোগ করুন।'
    ],
    category: 'support',
    tags: ['contact', 'support', 'email', 'যোগাযোগ', 'হেল্পলাইন']
  }
];

const CATEGORIES = [
  { key: 'all', label: 'সকল প্রশ্ন', count: 22, icon: HelpCircle },
  { key: 'exam', label: 'পরীক্ষা ও রেজাল্ট', count: 4, icon: GraduationCap },
  { key: 'practice', label: 'অনুশীলন ও রেফারেল', count: 3, icon: Sparkles },
  { key: 'premium', label: 'প্রিমিয়াম ও পেমেন্ট', count: 5, icon: CreditCard },
  { key: 'study', label: 'স্টাডি ম্যাটেরিয়াল', count: 3, icon: BookOpen },
  { key: 'account', label: 'অ্যাকাউন্ট ও নিরাপত্তা', count: 4, icon: ShieldCheck },
  { key: 'support', label: 'সহায়তা ও যোগাযোগ', count: 3, icon: MessageSquare }
];

interface FaqSectionProps {
  isStandAlone?: boolean;
  setView?: (view: string) => void;
}

export default function FaqSection({ isStandAlone = false, setView }: FaqSectionProps) {
  const [openIds, setOpenIds] = useState<number[]>([1, 2]); // First two questions opened by default
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleQuestion = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenIds(FAQ_DATA.map((item) => item.id));
  };

  const collapseAll = () => {
    setOpenIds([]);
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      // Category filter
      const matchesCategory =
        activeCategory === 'all' ||
        item.category === activeCategory ||
        (activeCategory === 'account' && (item.category === 'account' || item.category === 'about')) ||
        (activeCategory === 'support' && (item.category === 'support' || item.category === 'about'));

      // Search filter
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCategory;

      const matchesQuery =
        item.question.toLowerCase().includes(query) ||
        item.answer.some((p) => p.toLowerCase().includes(query)) ||
        item.tags.some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  // Convert English digits to Bengali numerals for clean presentation
  const toBanglaNum = (num: number): string => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map((c) => bnDigits[parseInt(c, 10)] || c).join('');
  };

  return (
    <section
      id="faq"
      className={`scroll-mt-20 ${
        isStandAlone
          ? 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10'
          : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10'
      }`}
    >
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-emerald-400 text-xs font-bold border border-primary/20">
          <HelpCircle className="h-4 w-4" />
          <span>সহায়তা ও সাধারণ জিজ্ঞাসা</span>
        </div>

        {/* Primary Requested Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          ❓ Frequently Asked Questions
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          মেধা এক্সাম প্ল্যাটফর্মের পরীক্ষা পদ্ধতি, ফলাফল, প্র্যাকটিস ফিচার, প্রিমিয়াম মেম্বারশিপ ও পেমেন্ট সংক্রান্ত সকল সাধারণ প্রশ্নের উত্তর একনজরে জেনে নিন।
        </p>
      </div>

      {/* Interactive Controls Bar: Search & Expand/Collapse */}
      <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="প্রশ্ন বা বিষয় লিখে খুঁজুন (যেমন: পেমেন্ট, রেজাল্ট, ভুল প্রশ্ন)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Expand / Collapse All Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              সব খুলুন
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              সব বন্ধ করুন
            </button>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70 border border-slate-200/70 dark:border-slate-700/70'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions Counter Alert */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          মোট <strong>{toBanglaNum(filteredFaqs.length)}</strong> টি প্রশ্ন প্রদর্শিত হচ্ছে
          {searchQuery && ` ("${searchQuery}" এর ফলাফলে)`}
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-primary hover:underline font-semibold"
          >
            সার্চ ক্লিয়ার করুন
          </button>
        )}
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3.5" role="region" aria-label="Frequently Asked Questions List">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <HelpCircle className="h-10 w-10 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              কোনো প্রশ্ন খুঁজে পাওয়া যায়নি
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              অন্য কোনো কিওয়ার্ড লিখে সার্চ করুন অথবা সকল প্রশ্ন ক্যাটাগরি নির্বাচন করুন।
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-colors"
            >
              সকল প্রশ্ন দেখুন
            </button>
          </div>
        ) : (
          filteredFaqs.map((item) => {
            const isOpen = openIds.includes(item.id);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isOpen
                    ? 'bg-white dark:bg-slate-900 border-primary/50 dark:border-emerald-500/50 shadow-md shadow-primary/5'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {/* Question Accordion Button */}
                <button
                  type="button"
                  id={`faq-question-${item.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  onClick={() => toggleQuestion(item.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-colors cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Index Number Badge */}
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-extrabold transition-colors duration-200 ${
                        isOpen
                          ? 'bg-primary text-white shadow-xs shadow-primary/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}
                    >
                      {toBanglaNum(item.id)}
                    </span>

                    {/* Question Text */}
                    <h3
                      className={`text-sm sm:text-base font-bold transition-colors duration-200 leading-snug ${
                        isOpen
                          ? 'text-primary dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-emerald-400'
                      }`}
                    >
                      {item.question}
                    </h3>
                  </div>

                  {/* Expand / Collapse Chevron */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'rotate-180 bg-primary/10 dark:bg-primary/20 text-primary dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {/* Answer Accordion Content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-question-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="pl-10 sm:pl-12 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {item.answer.map((paragraph, pIdx) => {
                            // Highlighting Green / Red / Key names cleanly if mentioned
                            const hasGreenHighlight = paragraph.includes('Green');
                            const hasRedHighlight = paragraph.includes('লাল');

                            return (
                              <p key={pIdx} className="leading-relaxed">
                                {hasGreenHighlight || hasRedHighlight ? (
                                  <span>
                                    {paragraph.split('Green').map((part, partIdx, arr) => (
                                      <React.Fragment key={partIdx}>
                                        {part.split('লাল').map((subPart, subIdx, subArr) => (
                                          <React.Fragment key={subIdx}>
                                            {subPart}
                                            {subIdx < subArr.length - 1 && (
                                              <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 mx-0.5">
                                                লাল
                                              </span>
                                            )}
                                          </React.Fragment>
                                        ))}
                                        {partIdx < arr.length - 1 && (
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 mx-0.5">
                                            Green
                                          </span>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </span>
                                ) : (
                                  paragraph
                                )}
                              </p>
                            );
                          })}

                          {/* Contextual Quick Action Buttons according to FAQ topic */}
                          {item.id === 4 && setView && (
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  const el = document.getElementById('featured-exams');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                  else setView('home');
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                              >
                                <span>লাইভ এক্সামসমূহ দেখুন</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {(item.id === 10 || item.id === 11 || item.id === 12) && setView && (
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  const el = document.getElementById('premium-pricing');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                  else setView('home');
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                <span>প্রিমিয়াম প্যাকেজসমূহ দেখুন</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {(item.id === 15 || item.id === 16 || item.id === 17) && setView && (
                            <div className="pt-2">
                              <button
                                onClick={() => setView('study-materials')}
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                              >
                                <span>📚 স্টাডি ম্যাটেরিয়াল সংগ্রহ দেখুন</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {item.id === 19 && setView && (
                            <div className="pt-2">
                              <button
                                onClick={() => setView('delete-account')}
                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                              >
                                <span>🗑️ অ্যাকাউন্ট ডিলিট পেইজে যান</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Support & Contact Helpdesk Box */}
      <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-emerald-500/5 to-teal-500/10 border border-primary/20 dark:border-emerald-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>আরও কোনো প্রশ্ন বা সহায়তা প্রয়োজন?</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            আপনার কোনো প্রশ্ন বা পেমেন্ট সংক্রান্ত কোনো বিষয় জানার থাকলে আমাদের অফিশিয়াল ফেসবুক পেইজ অথবা সাপোর্ট ইমেইলে সরাসরি মেসেজ পাঠাতে পারেন।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <a
            href="https://www.facebook.com/digitalnews00"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/25 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>ফেসবুক মেসেঞ্জার সাপোর্ট</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="mailto:pbprosen1971@gmail.com"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-center flex items-center justify-center gap-2"
          >
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span>ইমেইল পাঠান</span>
          </a>
        </div>
      </div>
    </section>
  );
}
