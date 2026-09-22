/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Languages,
  Calculator,
  Cpu,
  GraduationCap,
  Briefcase,
  Search,
  ArrowRight,
  Clock,
  Calendar,
  Star,
  Flame,
  Trophy,
  Users,
  FileText,
  HelpCircle,
  Play,
  TrendingUp,
  Globe,
  Award,
  FlaskConical,
  Lock,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookMarked,
  Layers,
  Share2,
  Copy,
} from 'lucide-react';
import { Exam, LeaderboardUser, MinistryQuestionBank, Question, Review, SubjectStats, UserProfile, UpcomingExamSettings, PaymentPlan } from '../types';
import { motion } from 'motion/react';
import { SUBJECTS, MOCK_REVIEWS, MOCK_LEADERBOARD, INITIAL_STATS, INITIAL_MINISTRY_BANKS } from '../data';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeToUpcomingExamSettings } from '../services/firestoreService';
import { formatSafeDisplay, formatBengaliDateTimeSafe, toBengaliDigits, isScheduledLiveTimeReached } from '../lib/dateUtils';
import heroExamPrepBg from '../assets/images/hero_exam_prep_1786609165056.jpg';
import DailyChallengeWidget from './DailyChallengeWidget';
import { PlexusHeroBackground } from './PlexusHeroBackground';
import ManualPaymentModal from './ManualPaymentModal';
import UpcomingExamCountdown from './UpcomingExamCountdown';
import ModernNoticeTicker from './ModernNoticeTicker';
import FaqSection from './FaqSection';

const FALLBACK_SUBJECT_QUESTIONS: Record<string, Question[]> = {
  'বাংলা': [
    {
      id: 'fb-bn-1',
      text: 'বাংলা সাহিত্যের প্রথম সার্থক উপন্যাস কোনটি?',
      options: ['আলালের ঘরের দুলাল', 'দুর্গেশনন্দিনী', 'কপালকুণ্ডলা', 'বিষবৃক্ষ'],
      correctAnswer: 1,
      explanation: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায় রচিত "দুর্গেশনন্দিনী" (১৮৬৫) বাংলা সাহিত্যের প্রথম সার্থক উপন্যাস।',
      subject: 'বাংলা'
    },
    {
      id: 'fb-bn-2',
      text: 'চর্যাপদ কত সালে আবিষ্কৃত হয়?',
      options: ['১৯০৭', '১৯১৬', '১৮৯৭', '১৯২০'],
      correctAnswer: 0,
      explanation: 'মহামহোপাধ্যায় হরপ্রসাদ শাস্ত্রী ১৯০৭ সালে নেপালের রাজদরবারের রয়েল লাইব্রেরি থেকে চর্যাপদ আবিষ্কার করেন।',
      subject: 'বাংলা'
    },
    {
      id: 'fb-bn-3',
      text: 'কোনটি শুদ্ধ বানান?',
      options: ['স্বায়ত্বশাসন', 'স্বায়ত্তশাসন', 'স্বায়ত্বশাসণ', 'শ্বায়ত্বশাসন'],
      correctAnswer: 1,
      explanation: 'সঠিক শুদ্ধ বানান হলো "স্বায়ত্তশাসন" (স্বায়ত্ত + শাসন)।',
      subject: 'বাংলা'
    },
    {
      id: 'fb-bn-4',
      text: 'বাংলা ভাষায় ব্যবহৃত মৌলিক স্বরধ্বনি কয়টি?',
      options: ['৭টি', '১১টি', '৯টি', '২৫টি'],
      correctAnswer: 0,
      explanation: 'বাংলা ভাষায় মৌলিক স্বরধ্বনি মোট ৭টি: অ, আ, ই, উ, এ, ও এবং এ্যা।',
      subject: 'বাংলা'
    },
    {
      id: 'fb-bn-5',
      text: '‘অগ্নিবীণা’ কাব্যের প্রথম কবিতা কোনটি?',
      options: ['ধূমকেতু', 'খেয়াপারের তরণী', 'প্রলয়োল্লাস', 'বিদ্রোহী'],
      correctAnswer: 2,
      explanation: 'কাজী নজরুল ইসলামের "অগ্নিবীণা" কাব্যের প্রথম কবিতা "প্রলয়োল্লাস"।',
      subject: 'বাংলা'
    }
  ],
  'ইংরেজি': [
    {
      id: 'fb-en-1',
      text: 'Choose the correct form of verb: Many a student ___ failed in the exam.',
      options: ['have', 'has', 'were', 'are'],
      correctAnswer: 1,
      explanation: '"Many a" is followed by a singular noun and a singular verb. Therefore, "has" is correct.',
      subject: 'ইংরেজি'
    },
    {
      id: 'fb-en-2',
      text: 'Which one is the correct spelling?',
      options: ['Questionaire', 'Questionnaire', 'Questionair', 'Questionarrie'],
      correctAnswer: 1,
      explanation: 'The correct spelling is "Questionnaire" with double "n".',
      subject: 'ইংরেজি'
    },
    {
      id: 'fb-en-3',
      text: 'What is the synonym of "Competent"?',
      options: ['Incapable', 'Capable', 'Lazy', 'Clumsy'],
      correctAnswer: 1,
      explanation: '"Competent" means having necessary ability or skill, synonym is "Capable".',
      subject: 'ইংরেজি'
    },
    {
      id: 'fb-en-4',
      text: 'Hardly had he seen the police ___ he ran away.',
      options: ['than', 'then', 'when', 'before'],
      correctAnswer: 2,
      explanation: 'Structure with "Hardly had..." takes "when" in the clause.',
      subject: 'ইংরেজি'
    }
  ],
  'গণিত': [
    {
      id: 'fb-math-1',
      text: '১ থেকে ১০০ পর্যন্ত মৌলিক সংখ্যা কয়টি?',
      options: ['২০টি', '২৫টি', '২৪টি', '২৬টি'],
      correctAnswer: 1,
      explanation: '১ থেকে ১০০ পর্যন্ত মোট মৌলিক সংখ্যা ২৫টি (যেমন: ২, ৩, ৫, ৭, ১১, ১৩, ১৭, ১৯, ২৩, ২৯, ৩১, ৩৭, ৪১, ৪৩, ৪৭, ৫৩, ৫৯, ৬১, ৬৭, ৭১, ৭৩, ৭৯, ৮৩, ৮৯, ৯৭)।',
      subject: 'গণিত'
    },
    {
      id: 'fb-math-2',
      text: 'দুইটি সংখ্যার গ.সা.গু ৭ এবং ল.সা.গু ৮৪। একটি সংখ্যা ২১ হলে অপর সংখ্যাটি কত?',
      options: ['১৪', '২৮', '৪২', '৫৬'],
      correctAnswer: 1,
      explanation: 'অপর সংখ্যা = (গ.সা.গু × ল.সা.গু) / প্রথম সংখ্যা = (৭ × ৮৪) / ২১ = ২৮।',
      subject: 'গণিত'
    },
    {
      id: 'fb-math-3',
      text: 'ত্রিভুজের তিনটি কোণের সমষ্টি কত ডিগ্রী?',
      options: ['৯০°', '১৮০°', '৩৬০°', '২৭০°'],
      correctAnswer: 1,
      explanation: 'যেকোনো ত্রিভুজের তিন কোণের সমষ্টি দুই সমকোণ বা ১৮০ ডিগ্রী।',
      subject: 'গণিত'
    },
    {
      id: 'fb-math-4',
      text: '০.১ × ০.০১ × ০.০০১ = কত?',
      options: ['০.০০০১', '০.০০০০০১', '০.০০০১', '০.০০০১০'],
      correctAnswer: 1,
      explanation: '১ × ১ × ১ = ১। দশমিকের পর মোট ঘর ১ + ২ + ৩ = ৬টি। সুতরাং উত্তর ০.০০০০০১।',
      subject: 'গণিত'
    }
  ],
  'GK': [
    {
      id: 'fb-gk-1',
      text: 'বাংলাদেশের একমাত্র প্রবাল দ্বীপ কোনটি?',
      options: ['সন্দ্বীপ', 'মনপুরা', 'সেন্টমার্টিন', 'হাতিয়া'],
      correctAnswer: 2,
      explanation: 'কক্সবাজার জেলায় অবস্থিত সেন্টমার্টিন দ্বীপ বাংলাদেশের একমাত্র সামুদ্রিক প্রবাল দ্বীপ।',
      subject: 'GK'
    },
    {
      id: 'fb-gk-2',
      text: 'মুক্তিযুদ্ধে ১ নম্বর সেক্টর কোনটি ছিল?',
      options: ['ঢাকা', 'চট্টগ্রাম ও পার্বত্য চট্টগ্রাম', 'সিলেট', 'কুষ্টিয়া'],
      correctAnswer: 1,
      explanation: '১ নম্বর সেক্টর ছিল চট্টগ্রাম, পার্বত্য চট্টগ্রাম ও ফেনী নদী পর্যন্ত এলাকা।',
      subject: 'GK'
    },
    {
      id: 'fb-gk-3',
      text: 'বাংলাদেশের জাতীয় পতাকার দৈর্ঘ্য ও প্রস্থের সঠিক অনুপাত কোনটি?',
      options: ['১০:৬', '১০:৮', '৪:৩', '৫:৪'],
      correctAnswer: 0,
      explanation: 'বাংলাদেশের জাতীয় পতাকার দৈর্ঘ্য ও প্রস্থের অনুপাত ১০:৬ (অথবা ৫:৩)।',
      subject: 'GK'
    }
  ],
  'BCS': [
    {
      id: 'fb-bcs-1',
      text: 'আন্তর্জাতিক আদালতের (ICJ) বিচারক সংখ্যা কতজন?',
      options: ['১০ জন', '১২ জন', '১৫ জন', '১৮ জন'],
      correctAnswer: 2,
      explanation: 'নেদারল্যান্ডসের হেগে অবস্থিত আন্তর্জাতিক আদালতের স্থায়ী বিচারক সংখ্যা ১৫ জন।',
      subject: 'BCS'
    },
    {
      id: 'fb-bcs-2',
      text: 'বিশ্বের সবচেয়ে বড় ম্যানগ্রোভ বন কোনটি?',
      options: ['আমাজন', 'সুন্দরবন', 'ব্ল্যাক ফরেস্ট', 'তৈগা'],
      correctAnswer: 1,
      explanation: 'বাংলাদেশ ও ভারতের সীমান্তে অবস্থিত সুন্দরবন বিশ্বের সর্ববৃহৎ ম্যানগ্রোভ বন।',
      subject: 'BCS'
    }
  ],
  'ICT': [
    {
      id: 'fb-ict-1',
      text: 'URL এর পূর্ণরূপ কোনটি?',
      options: ['Uniform Resource Locator', 'Universal Resource Link', 'Unified Resource Language', 'United Resource Locator'],
      correctAnswer: 0,
      explanation: 'URL = Uniform Resource Locator, যা ওয়েবসাইটের ওয়েব ঠিকানা নির্দেশ করে।',
      subject: 'ICT'
    },
    {
      id: 'fb-ict-2',
      text: 'কম্পিউটারের স্থায়ী মেমোরি কোনটি?',
      options: ['RAM', 'ROM', 'Cache', 'Hard Disk'],
      correctAnswer: 1,
      explanation: 'ROM (Read Only Memory) হলো কম্পিউটারের স্থায়ী মেমোরি যা বিদ্যুৎ চলে গেলেও তথ্য মুছে যায় না।',
      subject: 'ICT'
    }
  ],
  'Bank': [
    {
      id: 'fb-bank-1',
      text: 'বাংলাদেশ ব্যাংক কত সালে তার কেন্দ্রীয় ব্যাংকিং কার্যক্রম শুরু করে?',
      options: ['১৯৭১ সালে', '১৯৭২ সালে', '১৯৭৩ সালে', '১৯৭৫ সালে'],
      correctAnswer: 1,
      explanation: '১৯৭২ সালের বাংলাদেশ ব্যাংক আদেশ অনুযায়ী ১৬ ডিসেম্বর ১৯৭১ থেকে কার্যকর হিসেবে বাংলাদেশ ব্যাংক গঠিত হয়।',
      subject: 'Bank'
    },
    {
      id: 'fb-bank-2',
      text: 'ব্যাংকিং খাতে SWIFT কোডের দৈর্ঘ্য সাধারণত কত অক্ষরের হয়?',
      options: ['৪-৬ অক্ষর', '৮-১১ অক্ষর', '১২-১৫ অক্ষর', '১৬ অক্ষর'],
      correctAnswer: 1,
      explanation: 'SWIFT (Society for Worldwide Interbank Financial Telecommunication) কোড ৮ থেকে ১১ টি অক্ষরের হয়।',
      subject: 'Bank'
    }
  ],
  '11th - 20th Grade Job': [
    {
      id: 'fb-grade-1',
      text: 'জাতীয় স্মৃতিসৌধের স্থপতি কে?',
      options: ['হামিদুর রহমান', 'সৈয়দ মাইনুল হোসেন', 'মাজহারুল ইসলাম', 'শামীম সিকদার'],
      correctAnswer: 1,
      explanation: 'সাভারে অবস্থিত জাতীয় স্মৃতিসৌধের স্থপতি স্থপতি সৈয়দ মাইনুল হোসেন।',
      subject: '11th - 20th Grade Job'
    }
  ],
  'বিজ্ঞান': [
    {
      id: 'fb-sci-1',
      text: 'কোনটি সাধারণ তাপমাত্রায় তরল ধাতু?',
      options: ['পারদ', 'সোডিয়াম', 'সীসা', 'অ্যালুমিনিয়াম'],
      correctAnswer: 0,
      explanation: 'পারদ (Mercury / Hg) হলো একমাত্র ধাতু যা সাধারণ ঘরের তাপমাত্রায় তরল অবস্থায় থাকে।',
      subject: 'বিজ্ঞান'
    },
    {
      id: 'fb-sci-2',
      text: 'কোষের "পাওয়ার হাউস" বা শক্তিঘর বলা হয় কোনটিকে?',
      options: ['সাইটোপ্লাজম', 'মাইটোকন্ড্রিয়া', 'রাইবোজোম', 'গলগি বডি'],
      correctAnswer: 1,
      explanation: 'মাইটোকন্ড্রিয়ায় কোষের যাবতীয় শক্তি উৎপাদিত ও সঞ্চিত হয় বলে একে কোষের পাওয়ার হাউস বলা হয়।',
      subject: 'বিজ্ঞান'
    },
    {
      id: 'fb-sci-3',
      text: 'সূর্যের আলো থেকে আমরা কোন ভিটামিন পাই?',
      options: ['ভিটামিন এ', 'ভিটামিন সি', 'ভিটামিন ডি', 'ভিটামিন কে'],
      correctAnswer: 2,
      explanation: 'সূর্যের অতিবেগুনী রশ্মির সাহায্যে মানুষের ত্বকে ভিটামিন ডি (Vitamin D) তৈরি হয়।',
      subject: 'বিজ্ঞান'
    },
    {
      id: 'fb-sci-4',
      text: 'বায়ুমণ্ডলে কোন গ্যাসের পরিমাণ সবচেয়ে বেশি?',
      options: ['অক্সিজেন', 'নাইট্রোজেন', 'কার্বন ডাই অক্সাইড', 'আর্গন'],
      correctAnswer: 1,
      explanation: 'বায়ুমণ্ডলে প্রায় ৭৮.০৮% নাইট্রোজেন এবং ২০.৯৫% অক্সিজেন থাকে।',
      subject: 'বিজ্ঞান'
    },
    {
      id: 'fb-sci-5',
      text: 'পানির রাসায়নিক সংকেত কোনটি?',
      options: ['H2O', 'CO2', 'NaCl', 'O2'],
      correctAnswer: 0,
      explanation: 'পানির রাসায়নিক সংকেত হলো H₂O (দুইটি হাইড্রোজেন পরমাণু ও একটি অক্সিজেন পরমাণু)।',
      subject: 'বিজ্ঞান'
    }
  ]
};

const formatBanglaDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return dateTimeStr;
  try {
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return date.toLocaleString();
  }
};

const PREMIUM_PLANS: PaymentPlan[] = [
  {
    id: '7_days',
    title: '৭ দিনের প্যাকেজ',
    duration: '৭ দিন মেয়াদ',
    durationDays: 7,
    price: 90,
    priceFormatted: '৳ ৯০',
    description: 'স্বল্পমেয়াদী রিভিশন ও দ্রুত প্রস্তুতির জন্য উপযুক্ত',
    badge: null,
    popular: false,
    features: [
      '৭ দিন সকল প্রিমিয়াম মডেল টেস্ট আনলক',
      'প্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা',
      'ইনস্ট্যান্ট মেরিট পজিশন ও রেজাল্ট শিট',
      'স্টাডি ম্যাটেরিয়াল আনলক'
    ]
  },
  {
    id: '30_days',
    title: '৩০ দিনের প্যাকেজ',
    duration: '৩০ দিন মেয়াদ',
    durationDays: 30,
    price: 339,
    priceFormatted: '৳ ৩৩৯',
    originalPrice: 360,
    originalPriceFormatted: '৳ ৩৬০',
    description: '১ মাসের নিবিড় প্রস্তুতি ও নিয়মিত কুইজ প্যাকেজ',
    badge: 'জনপ্রিয় (Popular)',
    popular: true,
    features: [
      '৩০ দিন সকল প্রিমিয়াম ও স্পেশাল পরীক্ষা আনলক',
      'বিষয়ভিত্তিক দুর্বলতা বিশ্লেষণ ও ট্র্যাকিং',
      'ভেরিফাইড পরীক্ষা সার্টিফিকেট',
      'লাইভ কুইজ ও পার্সোনাল ড্যাশবোর্ড',
      'স্টাডি ম্যাটেরিয়াল আনলক'
    ]
  },
  {
    id: '6_months',
    title: '৬ মাসের প্যাকেজ',
    duration: '৬ মাস মেয়াদ',
    durationDays: 180,
    price: 1900,
    priceFormatted: '৳ ১৯০০',
    originalPrice: 2040,
    originalPriceFormatted: '৳ ২০৪০',
    description: '৬ মাসের সম্পূর্ণ নিবিড় প্রস্তুতি ও সকল পরীক্ষার আনলিমিটেড অ্যাক্সেস',
    badge: 'সেরা ডিল (Best Value)',
    popular: false,
    features: [
      '৬ মাস সকল প্রিমিয়াম ও স্পেশাল মডেল টেস্ট আনলক',
      'প্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা',
      'বিষয়ভিত্তিক দুর্বলতা বিশ্লেষণ ও ট্র্যাকিং',
      'বিসিএস ও ব্যাংক স্পেশাল এক্সক্লুসিভ গাইড',
      'স্টাডি ম্যাটেরিয়াল আনলক'
    ]
  }
];

interface HomeViewProps {
  exams: Exam[];
  setView: (view: string) => void;
  setSelectedExam: (exam: Exam) => void;
  user: UserProfile | null;
  onUpdateUser?: (updated: UserProfile) => void;
  ministryBanks?: MinistryQuestionBank[];
  upcomingExamSettings?: UpcomingExamSettings | null;
}

export default function HomeView({
  exams,
  setView,
  setSelectedExam,
  user,
  onUpdateUser,
  ministryBanks = [],
  upcomingExamSettings: propUpcomingSettings,
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Firestore upcoming exam settings real-time state with fallback
  const [localUpcomingSettings, setLocalUpcomingSettings] = useState<UpcomingExamSettings | null>(propUpcomingSettings || null);

  // Sync prop changes or subscribe if prop is not passed
  useEffect(() => {
    if (propUpcomingSettings !== undefined) {
      setLocalUpcomingSettings(propUpcomingSettings);
    }
  }, [propUpcomingSettings]);

  useEffect(() => {
    // If not passed from parent, listen directly
    const unsubscribe = subscribeToUpcomingExamSettings((settings) => {
      setLocalUpcomingSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  const activeUpcomingSetting = propUpcomingSettings || localUpcomingSettings;

  // Filter out upcoming settings if the exam has already been transitioned to live or archive, or if startTime has passed
  const validUpcomingSetting = useMemo(() => {
    if (!activeUpcomingSetting || !activeUpcomingSetting.title || activeUpcomingSetting.isPublished === false) {
      return null;
    }
    const sExamId = activeUpcomingSetting.examId;
    if (sExamId) {
      const matchExam = exams.find(e => e.id === sExamId);
      if (matchExam && (matchExam.status === 'live' || matchExam.status === 'archive' || matchExam.status === 'archived')) {
        if (!activeUpcomingSetting.items || activeUpcomingSetting.items.length <= 1) {
          return null;
        }
      }
    }
    const rawStart = activeUpcomingSetting.startTime;
    if (rawStart && rawStart.trim() && isScheduledLiveTimeReached(rawStart)) {
      if (!activeUpcomingSetting.items || activeUpcomingSetting.items.length <= 1) {
        return null;
      }
    }
    return activeUpcomingSetting;
  }, [activeUpcomingSetting, exams]);

  // Ministry Question Bank Practice Modal State
  const [activeMinistryBank, setActiveMinistryBank] = useState<MinistryQuestionBank | null>(null);
  const [mbPracticeTab, setMbPracticeTab] = useState<'qa' | 'interactive'>('qa');
  const [mbUserAnswers, setMbUserAnswers] = useState<Record<string, number>>({});
  const [selectedMinistryFilter, setSelectedMinistryFilter] = useState<string>('ALL');

  const publishedMinistryBanks = useMemo(() => {
    const raw = ministryBanks && ministryBanks.length > 0 ? ministryBanks : INITIAL_MINISTRY_BANKS;
    const published = raw.filter(b => b.isPublished !== false);
    return published.length > 0 ? published : INITIAL_MINISTRY_BANKS;
  }, [ministryBanks]);

  const existingMinistryFilters = useMemo(() => {
    const set = new Set<string>();
    publishedMinistryBanks.forEach(b => {
      if (b.ministryName && b.ministryName.trim()) {
        set.add(b.ministryName.trim());
      }
    });
    return Array.from(set);
  }, [publishedMinistryBanks]);

  const filteredMinistryBanks = useMemo(() => {
    if (selectedMinistryFilter === 'ALL') return publishedMinistryBanks;
    return publishedMinistryBanks.filter(b => b.ministryName === selectedMinistryFilter);
  }, [publishedMinistryBanks, selectedMinistryFilter]);

  const handleStartMinistryExam = (bank: MinistryQuestionBank) => {
    const convertedExam: Exam = {
      id: `exam-${bank.id}`,
      title: `${bank.ministryName}: ${bank.title}`,
      subject: bank.ministryName,
      durationMinutes: bank.durationMinutes || 10,
      totalQuestions: bank.questions.length,
      totalMarks: bank.questions.length,
      dateCreated: bank.dateCreated || new Date().toLocaleDateString('bn-BD'),
      status: 'live',
      isPremium: bank.isPremium,
      questions: bank.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        subject: q.subject || bank.ministryName,
      })),
    };

    if (bank.isPremium && (!user || !user.isPremium)) {
      if (!user) {
        setView('login');
      } else {
        setBlockedExam(convertedExam);
        setShowPaymentModal(true);
      }
      return;
    }

    if (!user) {
      setView('login');
      return;
    }

    setSelectedExam(convertedExam);
    setView('exam');
  };

  // Manual Mobile Banking billing states
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>(PREMIUM_PLANS[1]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [blockedExam, setBlockedExam] = useState<Exam | null>(null);

  // Live Exam Share state
  const [sharingExam, setSharingExam] = useState<Exam | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const getExamShareUrl = (exam: Exam): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?examId=${encodeURIComponent(exam.id)}`;
  };

  const handleShareLiveExam = async (exam: Exam, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const shareUrl = getExamShareUrl(exam);
    const shareTitle = `${exam.title} - লাইভ পরীক্ষা | মেধা জব এক্সাম`;
    const shareText = `মেধা জব পোর্টালে ${exam.subject} বিষয়ের লাইভ পরীক্ষা "${exam.title}" চলছে! এখনই অংশ নিন:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If user aborted/cancelled native share sheet, do not fallback to modal
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback or full share options modal
    setSharingExam(exam);
    setShareCopied(false);
  };

  const copyShareLink = async (url: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch (e) {
      console.warn('Failed to copy link', e);
    }
  };

  // Practice modal state
  const [practiceSubject, setPracticeSubject] = useState<string | null>(null);
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceTab, setPracticeTab] = useState<'qa' | 'interactive'>('qa');
  const [interactiveAnswers, setInteractiveAnswers] = useState<Record<string, number>>({});

  // Get practice questions for a specific subject or department category
  const getQuestionsForSubject = (subjectName: string): { question: Question; examTitle: string }[] => {
    const result: { question: Question; examTitle: string }[] = [];

    exams.forEach(exam => {
      // Exclude upcoming exams so questions aren't leaked before live date
      if (exam.status === 'upcoming') return;

      if (exam.questions && exam.questions.length > 0) {
        exam.questions.forEach(q => {
          const effSub = q.subject || exam.subject || '';
          
          const isMatch = 
            effSub === subjectName ||
            exam.subject === subjectName ||
            (subjectName === 'GK' && (effSub === 'সাধারণ জ্ঞান' || effSub === 'GK' || exam.subject === 'সাধারণ জ্ঞান' || exam.subject === 'GK')) ||
            (subjectName === 'Bank' && (effSub.toLowerCase().includes('bank') || (exam.subject && exam.subject.toLowerCase().includes('bank')))) ||
            (subjectName === 'BCS' && (effSub === 'BCS' || exam.subject === 'BCS')) ||
            (effSub && (effSub.includes(subjectName) || subjectName.includes(effSub)));

          if (isMatch) {
            result.push({
              question: q,
              examTitle: exam.title
            });
          }
        });
      }
    });

    const fallbacks = FALLBACK_SUBJECT_QUESTIONS[subjectName] || [];
    fallbacks.forEach(fq => {
      if (!result.some(item => item.question.id === fq.id || item.question.text === fq.text)) {
        result.push({
          question: fq,
          examTitle: `${subjectName} স্ট্যান্ডার্ড প্রশ্ন ব্যাংক`
        });
      }
    });

    return result;
  };

  // Dynamic Subjects calculation based on exams and question bank
  const dynamicSubjects = useMemo(() => {
    const DEFAULT_SUBJECT_CONFIGS: Record<string, { iconName: string; colorClass: string }> = {
      'বাংলা': { iconName: 'BookOpen', colorClass: 'from-emerald-500/10 to-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
      'ইংরেজি': { iconName: 'Languages', colorClass: 'from-blue-500/10 to-blue-500/20 text-blue-600 dark:text-blue-400' },
      'গণিত': { iconName: 'Calculator', colorClass: 'from-amber-500/10 to-amber-500/20 text-amber-600 dark:text-amber-400' },
      'GK': { iconName: 'Globe', colorClass: 'from-purple-500/10 to-purple-500/20 text-purple-600 dark:text-purple-400' },
      'BCS': { iconName: 'GraduationCap', colorClass: 'from-rose-500/10 to-rose-500/20 text-rose-600 dark:text-rose-400' },
      'ICT': { iconName: 'Cpu', colorClass: 'from-cyan-500/10 to-cyan-500/20 text-cyan-600 dark:text-cyan-400' },
      'বিজ্ঞান': { iconName: 'FlaskConical', colorClass: 'from-teal-500/10 to-teal-500/20 text-teal-600 dark:text-teal-400' },
      'Bank': { iconName: 'Briefcase', colorClass: 'from-indigo-500/10 to-indigo-500/20 text-indigo-600 dark:text-indigo-400' },
      '11th - 20th Grade Job': { iconName: 'Award', colorClass: 'from-orange-500/10 to-orange-500/20 text-orange-600 dark:text-orange-400' },
    };

    const ALL_KNOWN_SUBJECTS = ['বাংলা', 'ইংরেজি', 'গণিত', 'GK', 'ICT', 'বিজ্ঞান', 'BCS', 'Bank', '11th - 20th Grade Job'];
    const examSubjects = exams.map(e => e.subject).filter(Boolean);
    const uniqueSubjects = Array.from(new Set([...ALL_KNOWN_SUBJECTS, ...examSubjects]));

    return uniqueSubjects.map(subName => {
      const matchingExams = exams.filter(e => 
        e.subject === subName || 
        (subName === 'GK' && (e.subject === 'সাধারণ জ্ঞান' || e.subject === 'GK')) ||
        (subName === 'Bank' && e.subject?.toLowerCase().includes('bank'))
      );
      
      const questionsForSub = getQuestionsForSubject(subName);

      const config = DEFAULT_SUBJECT_CONFIGS[subName] || {
        iconName: 'BookOpen',
        colorClass: 'from-emerald-500/10 to-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      };

      return {
        subject: subName,
        examsCount: matchingExams.length || 1,
        questionsCount: questionsForSub.length,
        iconName: config.iconName,
        colorClass: config.colorClass,
      };
    });
  }, [exams]);

  const DOPTOR_LIST = ['BCS', 'Bank', '11th - 20th Grade Job'];

  const subjectCategories = useMemo(() => {
    return dynamicSubjects.filter(s => !DOPTOR_LIST.includes(s.subject));
  }, [dynamicSubjects]);

  const doptorCategories = useMemo(() => {
    return dynamicSubjects.filter(s => DOPTOR_LIST.includes(s.subject));
  }, [dynamicSubjects]);

  const activePracticeQuestions = useMemo(() => {
    if (!practiceSubject) return [];
    let list = getQuestionsForSubject(practiceSubject);

    if (practiceSearch.trim()) {
      const term = practiceSearch.toLowerCase();
      list = list.filter(item => 
        item.question.text.toLowerCase().includes(term) ||
        item.question.options.some(opt => opt.toLowerCase().includes(term)) ||
        (item.question.explanation && item.question.explanation.toLowerCase().includes(term))
      );
    }
    return list;
  }, [exams, practiceSubject, practiceSearch]);

  const getGreetingText = () => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'শুভ সকাল';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'শুভ দুপুর';
    } else if (hour >= 17 && hour < 20) {
      timeGreeting = 'শুভ সন্ধ্যা';
    } else {
      timeGreeting = 'শুভ রাত্রি';
    }

    if (user) {
      return `${timeGreeting}, ${user.name}`;
    }
    return `${timeGreeting}, সুধী`;
  };

  // Helper to render subject-specific icons safely
  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen':
        return <BookOpen className="h-6 w-6" />;
      case 'Languages':
        return <Languages className="h-6 w-6" />;
      case 'Calculator':
        return <Calculator className="h-6 w-6" />;
      case 'Cpu':
        return <Cpu className="h-6 w-6" />;
      case 'GraduationCap':
        return <GraduationCap className="h-6 w-6" />;
      case 'Briefcase':
        return <Briefcase className="h-6 w-6" />;
      case 'Globe':
        return <Globe className="h-6 w-6" />;
      case 'FlaskConical':
        return <FlaskConical className="h-6 w-6" />;
      case 'Award':
        return <Award className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  // Filter exams based on search query and subject card selection
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject ? exam.subject === selectedSubject : true;
      return matchesSearch && matchesSubject;
    });
  }, [exams, searchQuery, selectedSubject]);

  const liveExams = useMemo(() => {
    const now = Date.now();
    return filteredExams.filter((exam) => {
      if (exam.status === 'archive' || exam.status === 'archived') return false;

      // Check if this upcoming exam's scheduled time has arrived -> auto-transition to live
      // CRITICAL: Must have an explicit scheduled timestamp with hours:minutes set by admin
      if (exam.status === 'upcoming') {
        const hasReachedSchedule = isScheduledLiveTimeReached(
          exam.startTime, 
          (exam as any).examDateTime
        );
        if (hasReachedSchedule) {
          // Check if it also passed archive time
          const archStr = exam.archiveDateTime || exam.archiveTime || (exam as any).archiveDate;
          if (archStr && archStr.trim()) {
            const archDate = new Date(archStr);
            if (!isNaN(archDate.getTime()) && now >= archDate.getTime()) {
              return false;
            }
          }
          return true; // Scheduled time reached, allowed in Live section
        }
        return false;
      }

      const archStr = exam.archiveDateTime || exam.archiveTime || (exam as any).archiveDate;
      if (archStr && archStr.trim()) {
        const archDate = new Date(archStr);
        if (!isNaN(archDate.getTime()) && now >= archDate.getTime()) {
          return false;
        }
      }
      return exam.status === 'live';
    });
  }, [filteredExams]);

  const archiveExams = useMemo(() => {
    const now = Date.now();
    return filteredExams.filter((exam) => {
      if (exam.status === 'archive' || exam.status === 'archived') return true;

      if (exam.status === 'upcoming') {
        const hasReachedSchedule = isScheduledLiveTimeReached(
          exam.startTime, 
          (exam as any).examDateTime
        );
        if (!hasReachedSchedule) return false;
      }

      const archStr = exam.archiveDateTime || exam.archiveTime || (exam as any).archiveDate;
      if (archStr && archStr.trim()) {
        const archDate = new Date(archStr);
        if (!isNaN(archDate.getTime()) && now >= archDate.getTime()) {
          return true;
        }
      }
      return false;
    });
  }, [filteredExams]);

  const upcomingExams = useMemo(() => {
    return exams.filter((exam) => {
      if (exam.status !== 'upcoming') return false;
      // An upcoming exam stays in Upcoming UNLESS it has an explicit scheduled date/time set by admin that arrived
      if (isScheduledLiveTimeReached(
        exam.startTime, 
        (exam as any).examDateTime
      )) {
        return false; // Reached schedule, moves to Live
      }
      return true;
    });
  }, [exams]);

  const handleStartExam = (exam: Exam) => {
    if (exam.isPremium && (!user || !user.isPremium)) {
      if (!user) {
        setView('login');
      } else {
        setBlockedExam(exam);
        setShowPaymentModal(true);
      }
      return;
    }

    setSelectedExam(exam);
    if (!user) {
      setView('login');
    } else {
      setView('exam');
    }
  };

  const handleSubjectClick = (subjectName: string) => {
    if (selectedSubject === subjectName) {
      setSelectedSubject(null); // Deselect if clicked again
    } else {
      setSelectedSubject(subjectName);
    }
  };

  return (
    <div className="space-y-16 pb-16 bg-brand-bg dark:bg-slate-900 text-slate-800 dark:text-slate-100 theme-transition">
      {/* Horizontal Scrolling Modern Notice Bar right below Header */}
      <ModernNoticeTicker />

      {/* 1. Hero Section (Welcome + Start Exam CTA) */}
      <section className="relative overflow-hidden py-16 sm:py-24 min-h-[460px] flex items-center bg-slate-900 text-white shadow-2xl rounded-b-3xl">
        {/* Background Plexus Video & Image with Readability Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <PlexusHeroBackground opacity={0.88} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-slate-950/20 dark:from-slate-950/85 dark:via-slate-950/45 dark:to-slate-950/25 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full transition-transform duration-300 ease-out hover:-translate-y-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-950/80 text-emerald-300 backdrop-blur-md text-xs sm:text-sm font-bold border border-emerald-400/40 shadow-lg shadow-emerald-950/50 animate-pulse-heartbeat animate-pulse-glow-primary">
                <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="flex items-center gap-1.5 font-bold tracking-normal">
                  <span className="font-extrabold text-white bg-emerald-600/80 px-2 py-0.5 rounded-md text-xs tracking-wider shadow-sm">১০০%</span>
                  <span className="text-emerald-200 font-semibold">প্রফেশনাল এক্সাম প্ল্যাটফর্ম</span>
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                {getGreetingText()}! <br />
                ঘরে বসেই নিন <span className="animated-gradient-text font-black drop-shadow-sm">চাকরির পরীক্ষার</span> প্রস্তুতি!
              </h1>
              
              <p className="text-base sm:text-lg text-slate-200/90 max-w-2xl font-normal leading-relaxed drop-shadow-sm">
                মেধা এক্সাম পোর্টালের মাধ্যমে BCS, ব্যাংক, আইসিটি ও সাধারণ জ্ঞানের রিয়েল-টাইম পরীক্ষা দিন। নিজেকে যাচাই করুন এবং লিডারবোর্ডে এগিয়ে থাকুন।
              </p>

              {/* Subtle decorative gradient divider separating top hero content */}
              <div className="pt-2 w-full max-w-md">
                <div className="h-px bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-transparent" />
              </div>

              {/* CTA Buttons & Navigation */}
              <div className="flex flex-wrap items-center justify-start gap-4 pt-2">
                <a
                  href="#featured-exams"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 rounded-xl shadow-xl shadow-emerald-950/40 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 hover:shadow-emerald-500/30 hover:shadow-2xl hover:border-emerald-300/60 transform hover:-translate-y-1 hover:scale-[1.03] active:scale-95 transition-all duration-300 ease-out border border-emerald-400/30 group"
                >
                  <span>এক্সাম শুরু করুন</span>
                  <Play className="h-5 w-5 fill-current transition-transform duration-300 group-hover:scale-125 group-hover:translate-x-0.5 text-white" />
                </a>
              </div>

            </div>

            {/* Daily Challenge Widget - Fetches live random question from Firebase */}
            <div className="lg:col-span-5 w-full mt-4 lg:mt-0">
              <DailyChallengeWidget
                onStartExam={(examId) => {
                  if (examId) {
                    const match = exams.find(e => e.id === examId);
                    if (match) {
                      handleStartExam(match);
                      return;
                    }
                  }
                  const live = exams.find(e => e.status === 'live');
                  if (live) {
                    handleStartExam(live);
                  } else if (exams.length > 0) {
                    handleStartExam(exams[0]);
                  } else {
                    setView('exams');
                  }
                }}
              />
            </div>

          </div>
        </div>
      </section>

      {/* Decorative Subtle Gradient Divider */}
      <div className="relative -mt-10 mb-2 flex items-center justify-center px-4">
        <div className="w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-emerald-500/30 dark:via-emerald-400/25 to-transparent" />
      </div>

      {/* 2. Search & Subject Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Search Box */}
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">আপনার কাঙ্খিত পরীক্ষাটি খুঁজুন</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পরীক্ষার নাম বা বিষয় লিখে সার্চ করুন (যেমন: BCS, বাংলা, গণিত...)"
              className="block w-full pl-11 pr-4 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-md transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                মুছে ফেলুন
              </button>
            )}
          </div>
        </div>

        {/* Subject Cards & Doptor Category Cards */}
        <div className="space-y-8">
          {/* 1. বিষয়সমূহ ক্যাটাগরি */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" />
                  <span>বিষয়সমূহ ক্যাটাগরি</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">শিক্ষাভিত্তিক বিষয়সমূহের মডেল টেস্ট, অনুশীলন ও প্রশ্ন-উত্তর</p>
              </div>
              {selectedSubject && (
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>সব বিষয় ফিল্টার তুলুন</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {subjectCategories.map((subject) => {
                const isSelected = selectedSubject === subject.subject;
                return (
                  <div
                    key={subject.subject}
                    onClick={() => {
                      handleSubjectClick(subject.subject);
                      setPracticeSubject(subject.subject);
                      setInteractiveAnswers({});
                      setPracticeSearch('');
                    }}
                    className={`group relative cursor-pointer rounded-2xl p-4 border text-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`inline-flex p-3 rounded-xl mb-2.5 transition-transform group-hover:scale-110 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : subject.colorClass
                      }`}
                    >
                      {getSubjectIcon(subject.iconName)}
                    </div>
                    <h4 className="font-extrabold text-sm sm:text-base leading-tight line-clamp-1 text-slate-900 dark:text-slate-100">{subject.subject}</h4>
                    <div className={`text-[11px] mt-1 space-y-0.5 ${isSelected ? 'text-white font-semibold' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>
                      <p>{subject.examsCount} টি এক্সাম</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{subject.questionsCount} টি প্রশ্ন</p>
                    </div>

                    <div className={`mt-3 py-1 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-300 group-hover:bg-primary group-hover:text-white'
                    }`}>
                      <span>অনুশীলন করুন</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. দপ্তর ক্যাটাগরি (BCS, Bank, 11th - 20th Grade Job) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-amber-500" />
                  <span>দপ্তর ক্যাটাগরি</span>
                  <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full">
                    জব প্রিপারেশন
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">বিসিএস, ব্যাংক ও ১১তম-২০তম গ্রেডের স্পেশাল মডেল টেস্ট ও প্রশ্ন ব্যাংক</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {doptorCategories.map((subject) => {
                const isSelected = selectedSubject === subject.subject;
                return (
                  <div
                    key={subject.subject}
                    onClick={() => {
                      handleSubjectClick(subject.subject);
                      setPracticeSubject(subject.subject);
                      setInteractiveAnswers({});
                      setPracticeSearch('');
                    }}
                    className={`group relative cursor-pointer rounded-2xl p-4 sm:p-5 border text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0D47A1] to-[#2196F3] text-white border-primary shadow-lg shadow-primary/25'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`p-3.5 rounded-2xl shrink-0 transition-transform group-hover:scale-110 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : subject.colorClass
                        }`}
                      >
                        {getSubjectIcon(subject.iconName)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-base sm:text-lg leading-tight text-slate-900 dark:text-slate-100">{subject.subject}</h4>
                        <div className={`text-xs space-x-2 ${isSelected ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                          <span>{subject.examsCount} টি এক্সাম</span>
                          <span>•</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{subject.questionsCount} টি প্রশ্ন</span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-2 rounded-xl shrink-0 transition-all flex items-center gap-1 text-[11px] font-bold ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white'
                    }`}>
                      <span className="hidden sm:inline">অনুশীলন</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Exams Section */}
      <section id="featured-exams" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              চলতি ও আসন্ন পরীক্ষা সমূহ
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">আপনার সুবিধাজনক সময়ে পরীক্ষায় অংশ নিয়ে মেধা যাচাই করুন।</p>
          </div>
          {selectedSubject && (
            <div className="self-start px-3 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-300 text-xs font-bold rounded-lg border border-primary/20">
              ফিল্টার: {selectedSubject}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live Exams Grid */}
          <div className="lg:col-span-8">
            {liveExams.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center h-full flex flex-col justify-center items-center">
                <FileText className="h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">কোনো চলমান পরীক্ষা পাওয়া যায়নি</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">সার্চ ফিল্টারটি পরিবর্তন করে পুনরায় চেষ্টা করুন অথবা ড্যাশবোর্ড দেখুন।</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubject(null);
                  }}
                  className="mt-4 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                >
                  রিসেট করুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveExams.map((exam, index) => (
                  <motion.div
                    key={exam.id}
                    id={`live-exam-${exam.id}`}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{
                      duration: 0.45,
                      delay: Math.min(index * 0.08, 0.32),
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 flex flex-col justify-between scroll-mt-28"
                  >
                    {/* Exam Status Badge & Subject */}
                    <div className="p-6 pb-4 space-y-3 flex-grow animate-fade-in-up">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-primary bg-primary/10 dark:bg-primary/20 dark:text-emerald-300 border border-primary/20 px-2.5 py-1 rounded-md capitalize">
                            {exam.subject}
                          </span>
                          {exam.isPremium ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 uppercase">
                              <Lock className="h-2.5 w-2.5" />
                              Premium
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 uppercase">
                              Free
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          চলমান (Live)
                        </span>
                      </div>

                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                        {exam.title}
                      </h3>

                      {/* Metadata Row */}
                      <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {exam.questions && exam.questions.length > 0 ? exam.questions.length : (exam.totalQuestions ?? 0)}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 font-medium">প্রশ্ন সংখ্যা</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-200/80 dark:border-slate-800 pl-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {exam.durationMinutes} মিনিট
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 font-medium">সময়সীমা</span>
                        </div>
                        <div className="flex flex-col border-l border-slate-200/80 dark:border-slate-800 pl-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {exam.totalMarks ?? (exam.questions && exam.questions.length > 0 ? exam.questions.length : (exam.totalQuestions ?? 0))}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 font-medium">মোট মার্কস</span>
                        </div>
                      </div>
                    </div>

                    {/* Exam Action Footer */}
                    <div className="p-6 pt-3 pb-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">
                        তৈরি হয়েছে: {formatSafeDisplay(exam.dateCreated, '—')}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Share Button (Only for Live Exam) */}
                        <button
                          type="button"
                          onClick={(e) => handleShareLiveExam(exam, e)}
                          title="লাইভ পরীক্ষা শেয়ার করুন বা লিংক কপি করুন"
                          className="inline-flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-emerald-400 bg-white hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm transition-all duration-200 active:scale-95"
                          aria-label="শেয়ার করুন"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                          অংশ নিন
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Dedicated Upcoming Exams Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-24 space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                  <span>আসন্ন পরীক্ষা সমূহ (Upcoming)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/80">
                  শিডিউল লাইভ
                </span>
              </h3>

              {/* Unified Upcoming Exams List */}
              {(() => {
                const upcomingList: Array<{
                  id: string;
                  title: string;
                  subject?: string;
                  description?: string;
                  startTime?: string;
                  examDate?: string;
                  startDate?: string;
                  dateCreated?: string;
                  durationMinutes?: number;
                  totalQuestions?: number;
                  totalMarks?: number;
                  isPremium?: boolean;
                }> = [];

                const seenIds = new Set<string>();
                const seenTitles = new Set<string>();

                const itemsToProcess = (validUpcomingSetting?.items && Array.isArray(validUpcomingSetting.items) && validUpcomingSetting.items.length > 0)
                  ? validUpcomingSetting.items
                  : (validUpcomingSetting && validUpcomingSetting.title ? [validUpcomingSetting] : []);

                itemsToProcess.forEach(item => {
                  if (item && item.title && item.isPublished !== false) {
                    // If scheduled time has already arrived, this exam is live, not upcoming
                    if (isScheduledLiveTimeReached(
                      item.startTime, 
                      (item as any).examDateTime
                    )) {
                      return;
                    }

                    const titleKey = item.title.trim().toLowerCase();
                    const itemId = item.examId || item.id || `featured-${titleKey}`;
                    if (!seenIds.has(itemId) && !seenTitles.has(titleKey)) {
                      upcomingList.push({
                        id: itemId,
                        title: item.title,
                        subject: item.subject || 'BCS',
                        description: item.description || '',
                        startTime: item.startTime || '',
                        examDate: item.examDate || '',
                        startDate: (item as any).startDate || '',
                        dateCreated: (item as any).dateCreated || '',
                        durationMinutes: item.durationMinutes || (item as any).duration || 30,
                        totalQuestions: item.totalQuestions || 0,
                        totalMarks: item.totalMarks || 0,
                        isPremium: !!item.isPremium,
                      });
                      seenIds.add(itemId);
                      seenTitles.add(titleKey);
                    }
                  }
                });

                upcomingExams.forEach(exam => {
                  const normTitle = (exam.title || '').trim().toLowerCase();
                  if (!seenIds.has(exam.id) && !seenTitles.has(normTitle)) {
                    const qCount = (exam.questions && exam.questions.length > 0) 
                      ? exam.questions.length 
                      : (exam.totalQuestions || 0);
                    upcomingList.push({
                      id: exam.id,
                      title: exam.title,
                      subject: exam.subject || 'BCS',
                      description: exam.description || '',
                      startTime: exam.startTime || '',
                      examDate: (exam as any).examDate || '',
                      startDate: (exam as any).startDate || '',
                      dateCreated: exam.dateCreated || '',
                      durationMinutes: exam.durationMinutes || 30,
                      totalQuestions: qCount,
                      totalMarks: exam.totalMarks || qCount,
                      isPremium: !!exam.isPremium,
                    });
                    seenIds.add(exam.id);
                    seenTitles.add(normTitle);
                  }
                });

                if (upcomingList.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 space-y-2">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        খুব শীঘ্রই নতুন পরীক্ষা যুক্ত হবে, আমাদের সাথে থাকুন।
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {upcomingList.map((item, idx) => (
                      <div
                        key={`upcoming-item-${item.id}-${idx}`}
                        className="p-4 bg-amber-50/80 dark:bg-slate-800/80 border border-amber-200/90 dark:border-amber-500/30 rounded-2xl space-y-3 relative overflow-hidden transition-all duration-200 hover:border-amber-500/50 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-300/80 dark:border-amber-800">
                            {item.subject || 'BCS'}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.isPremium && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md dark:bg-amber-950/70 dark:text-amber-300">
                                <Lock className="h-2.5 w-2.5" />
                                Premium
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300/90 px-2 py-0.5 rounded-md dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              আসন্ন লাইভ
                            </span>
                          </div>
                        </div>

                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug">
                          {item.title}
                        </h4>

                        {item.description && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* প্রশ্ন সংখ্যা দেখানো যাবে না: user explicitly requested to hide question count from upcoming exams */}

                        {/* Real-time countdown timer that triggers when exam is in 'upcoming' status, showing hours/minutes until start */}
                        {(() => {
                          const rawStart = (item.startTime && item.startTime.trim() !== 'নির্ধারিত নেই') ? item.startTime.trim() : '';
                          const creationDate = ((item as any).dateCreated || '').trim();
                          const createdAt = ((item as any).createdAt || '').trim();

                          // Scheduled live time MUST be an explicit schedule with a specific time or distinct future timestamp set by admin.
                          const hasExplicitSchedule = !!(rawStart &&
                            !(creationDate && (rawStart === creationDate || rawStart.startsWith(creationDate))) &&
                            !(createdAt && rawStart.startsWith(createdAt.substring(0, 10))) &&
                            (rawStart.includes('T') || rawStart.includes(':')));

                          const scheduleCandidate = hasExplicitSchedule
                            ? rawStart
                            : (rawStart && (rawStart.includes('T') || rawStart.includes(':')) ? rawStart : item.startTime);

                          const formattedDate = scheduleCandidate ? formatBanglaDateTime(scheduleCandidate) : undefined;

                          return (
                            <UpcomingExamCountdown
                              startTime={scheduleCandidate || item.startTime}
                              examDate={item.examDate}
                              formattedDateDisplay={formattedDate}
                            />
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* 3.5. Archived Exams Section */}
      <section id="archived-exams" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              আর্কাইভকৃত পরীক্ষা সমূহ (Archive Exams)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">পূর্বে হয়ে যাওয়া পরীক্ষাগুলোর প্রশ্ন ও সমাধান দেখে নিজেকে ঝালিয়ে নিন।</p>
          </div>
        </div>

        {archiveExams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center">
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3 animate-pulse" />
            <p className="text-slate-600 dark:text-slate-400 text-sm">বর্তমানে কোনো আর্কাইভকৃত পরীক্ষা পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {archiveExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Exam Status Badge & Subject */}
                <div className="p-6 pb-4 space-y-3 flex-grow">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md capitalize">
                      {exam.subject}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                      আর্কাইভ (Archive)
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                    {exam.title}
                  </h3>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {exam.questions && exam.questions.length > 0 ? exam.questions.length : (exam.totalQuestions ?? 0)}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">প্রশ্ন</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200/80 dark:border-slate-800 pl-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {exam.durationMinutes} মিনিট
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">সময়</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200/80 dark:border-slate-800 pl-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {exam.totalMarks ?? (exam.questions && exam.questions.length > 0 ? exam.questions.length : (exam.totalQuestions ?? 0))}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">মার্কস</span>
                    </div>
                  </div>
                </div>

                {/* Exam Action Footer */}
                <div className="p-6 pt-3 pb-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    আর্কাইভ হয়েছে: {exam.archiveTime ? new Date(exam.archiveTime).toLocaleDateString('bn-BD') : exam.dateCreated}
                  </span>
                  <button
                    onClick={() => handleStartExam(exam)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all duration-200"
                  >
                    রিভিউ এক্সাম
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3.5. Ministry & Department Question Bank Section (Below Archive Exam) */}
      <section id="ministry-banks-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary dark:text-emerald-300 text-xs font-bold rounded-lg mb-2 border border-primary/20">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>মন্ত্রণালয় ও অধিদপ্তর বিশেষ প্রস্তুতি</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>মন্ত্রণালয় ও দপ্তরভিত্তিক প্রশ্ন ব্যাংকসমূহ</span>
              <span className="px-2.5 py-0.5 bg-primary/10 text-primary dark:text-emerald-300 border border-primary/20 text-xs font-bold rounded-full">
                {publishedMinistryBanks.length} টি প্রশ্ন ব্যাংক
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              এডমিন প্যানেলে প্রকাশিত বিভিন্ন মন্ত্রণালয়ের বিষয়ভিত্তিক নিয়োগ পরীক্ষার প্রশ্ন, বিকল্প উত্তর, সঠিক উত্তর ও বিশদ সমাধান থেকে পছন্দ অনুযায়ী অনুশীলন বা পরীক্ষা দিন।
            </p>
          </div>
        </div>

        {/* Ministry Filter Tabs */}
        {existingMinistryFilters.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedMinistryFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedMinistryFilter === 'ALL'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              সকল মন্ত্রণালয় ({publishedMinistryBanks.length})
            </button>
            {existingMinistryFilters.map((minName, idx) => {
              const count = publishedMinistryBanks.filter(b => b.ministryName === minName).length;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedMinistryFilter(minName)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedMinistryFilter === minName
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🏢 {minName} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Grid of Published Question Banks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMinistryBanks.map((bank) => (
            <div
              key={bank.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs rounded-xl">
                    🏢 {bank.ministryName}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {bank.questions?.length || bank.totalQuestions || 0} টি প্রশ্ন
                  </span>
                </div>

                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
                  {bank.title}
                </h4>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{bank.durationMinutes || 10} মিনিট</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-700 dark:text-slate-300">ব্যাখ্যাসহ সমাধান</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  onClick={() => {
                    setActiveMinistryBank(bank);
                    setMbPracticeTab('qa');
                    setMbUserAnswers({});
                  }}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>অনুশীলন করুন</span>
                </button>

                <button
                  onClick={() => handleStartMinistryExam(bank)}
                  className="w-full py-2.5 px-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>পরীক্ষা দিন</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Statistics Panel (Students, Exams, Questions) */}
      <section className="bg-slate-900 text-white dark:bg-slate-950 transition-colors duration-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            
            {/* Stat Item 1 */}
            <div className="space-y-3 p-6 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="inline-flex p-3 rounded-2xl bg-primary/20 text-primary">
                <Users className="h-8 w-8" />
              </div>
              <p className="text-4xl font-extrabold text-white">
                {INITIAL_STATS.studentsCount.toLocaleString()}+
              </p>
              <h4 className="text-base font-semibold text-slate-300">নিবন্ধিত শিক্ষার্থী</h4>
              <p className="text-xs text-slate-500">প্রতিদিন শত শত শিক্ষার্থী আমাদের সাথে যুক্ত হচ্ছে।</p>
            </div>

            {/* Stat Item 2 */}
            <div className="space-y-3 p-6 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-4xl font-extrabold text-white">
                {INITIAL_STATS.examsTakenCount.toLocaleString()}+
              </p>
              <h4 className="text-base font-semibold text-slate-300">সম্পন্নকৃত পরীক্ষা</h4>
              <p className="text-xs text-slate-500">শিক্ষার্থীরা এ পর্যন্ত সফলতার সাথে পরীক্ষা দিয়েছেন।</p>
            </div>

            {/* Stat Item 3 */}
            <div className="space-y-3 p-6 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                <HelpCircle className="h-8 w-8" />
              </div>
              <p className="text-4xl font-extrabold text-white">
                {INITIAL_STATS.questionsSolvedCount.toLocaleString()}+
              </p>
              <h4 className="text-base font-semibold text-slate-300">সমাধানকৃত প্রশ্ন</h4>
              <p className="text-xs text-slate-500">আমাদের রিচ কোয়েশ্চেন ব্যাংকের অন্তর্ভুক্ত প্রশ্নাবলী।</p>
            </div>

          </div>
        </div>
      </section>

      {/* Premium Membership & Pricing Section */}
      <section id="premium-pricing" data-section="packages" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent dark:from-amber-950/20 dark:via-transparent dark:to-transparent rounded-3xl border border-amber-500/20 p-6 sm:p-10 relative overflow-hidden shadow-sm space-y-8">
          
          {/* Background Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* Section Heading */}
          <div className="text-center max-w-2xl mx-auto space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>মেধা প্রিমিয়াম মেম্বারশিপ প্যাকেজ (Medha Premium Membership)</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              আপনার প্রয়োজন অনুযায়ী সেরা প্যাকেজ বেছে নিন
            </h2>
            
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              সকল প্রিমিয়াম ও স্পেশাল কুইজ/মডেল টেস্ট আনলক করুন, প্রশ্ন বিশ্লেষণ ও সমাধান দেখে প্রস্তুতিকে করুন শতভাগ নিখুঁত!
            </p>
          </div>

          {/* 3 Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 items-stretch">
            {PREMIUM_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between relative shadow-md hover:shadow-xl ${
                  plan.id === '6_months'
                    ? 'bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-500/80 dark:border-amber-500/60 shadow-amber-500/10 hover:border-amber-500'
                    : plan.id === '30_days'
                    ? 'bg-gradient-to-b from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500/80 dark:border-emerald-500/60 shadow-emerald-500/10 hover:border-emerald-500'
                    : 'bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                {plan.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 font-extrabold text-[11px] rounded-full shadow-md uppercase tracking-wider z-10 flex items-center gap-1 text-white ${
                      plan.id === '6_months'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/30 ring-2 ring-white dark:ring-slate-900'
                        : plan.id === '30_days'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-2 ring-white dark:ring-slate-900'
                        : 'bg-gradient-to-r from-slate-600 to-slate-700'
                    }`}
                  >
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="pt-1">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{plan.title}</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{plan.duration}</span>
                  </div>

                  <div className="py-3.5 border-y border-slate-200/80 dark:border-slate-800 flex flex-col justify-center min-h-[96px]">
                    {plan.originalPriceFormatted ? (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 line-through decoration-rose-500 decoration-2">
                          {plan.originalPriceFormatted}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold border border-rose-200/80 dark:border-rose-900/60 shadow-2xs">
                          বিশেষ ছাড়
                        </span>
                      </div>
                    ) : (
                      <div className="h-5 mb-1" aria-hidden="true" />
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{plan.priceFormatted}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">/ {plan.duration}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{plan.description}</p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  {user?.isPremium ? (
                    <div className="py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold text-center border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> সক্রিয় মেম্বারশিপ
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        if (!user) {
                          setView('login');
                        } else {
                          setBlockedExam(null);
                          setShowPaymentModal(true);
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-98 ${
                        plan.id === '6_months'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/25 ring-1 ring-amber-400/40'
                          : plan.id === '30_days'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25 ring-1 ring-emerald-400/40'
                          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      {user ? 'প্যাকেজটি সাবস্ক্রাইব করুন' : 'লগইন করে সাবস্ক্রাইব করুন'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400 font-bold pt-2">
            <span>🔒 বিকাশ / নগদ / রকেট / উপায় ম্যানুয়াল পেমেন্ট</span>
            <span>•</span>
            <span>⚡ এডমিন ভেরিফিকেশন ও প্রিমিয়াম অ্যাক্টিভেশন</span>
            <span>•</span>
            <span>📞 ২৪/৭ কাস্টমার সাপোর্ট</span>
          </div>

        </div>
      </section>

      {/* 5. Top Students Leaderboard & Student Reviews (Side by Side Grid for Desktop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Top Students Leaderboard */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                মেধাবী শিক্ষার্থী লিডারবোর্ড
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">এই সপ্তাহের সেরা স্কোরধারী শিক্ষার্থীদের তালিকা।</p>
            </div>
            <span className="text-xs font-bold text-primary dark:text-emerald-400">সাপ্তাহিক আপডেট</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {MOCK_LEADERBOARD.map((student, idx) => (
                <div
                  key={student.rank}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-8 flex justify-center">
                      {student.rank === 1 ? (
                        <Trophy className="h-6 w-6 text-amber-500" />
                      ) : student.rank === 2 ? (
                        <Trophy className="h-6 w-6 text-slate-400" />
                      ) : student.rank === 3 ? (
                        <Trophy className="h-6 w-6 text-amber-700" />
                      ) : (
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">#{student.rank}</span>
                      )}
                    </div>

                    <img
                      src={student.avatar}
                      alt={student.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />

                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{student.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <span>{student.examsTaken} টি টেস্ট</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                          <Flame className="h-3 w-3 fill-current" /> {student.streak} দিন স্ট্রাক
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score badge */}
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm rounded-lg border border-emerald-500/20">
                      {student.score} পয়েন্ট
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student Reviews */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500 fill-current" />
              আমাদের শিক্ষার্থীদের মতামত
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">শিক্ষার্থীরা আমাদের প্ল্যাটফর্ম সম্পর্কে যা বলছেন।</p>
          </div>

          <div className="space-y-4">
            {MOCK_REVIEWS.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={review.avatar}
                      alt={review.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                        {review.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{review.role}</p>
                    </div>
                  </div>
                  
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-xs font-bold ml-1 text-slate-800 dark:text-slate-200">{review.rating}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{review.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </section>
      
      {/* 6. Frequently Asked Questions (FAQ Section) */}
      <FaqSection isStandAlone={false} setView={setView} />

      {/* Manual Mobile Banking Payment Modal */}
      <ManualPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setBlockedExam(null);
        }}
        selectedPlan={selectedPlan}
        user={user}
        blockedExam={blockedExam}
        onViewProfile={() => {
          setView('profile');
        }}
        onExamUnlock={(exam) => {
          setSelectedExam(exam);
          setView('exam');
          setBlockedExam(null);
        }}
      />

      {/* Subject Q&A & Practice Modal */}
      {practiceSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
            
            {/* Modal Header Banner */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/10 via-emerald-500/10 to-transparent border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-primary text-white rounded-xl shadow-md">
                    <BookMarked className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {practiceSubject} - বিষয়ভিত্তিক প্রশ্ন-উত্তর ও অনুশীলন
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                  এই বিষয়ের সকল প্রশ্ন, সঠিক উত্তর ও ব্যাখ্যা বিস্তারিত দেখুন এবং অনুশীলনের মাধ্যমে মেধা যাচাই করুন।
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setPracticeSubject(null)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Subject Selector Bar & Search Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Subject & Doptor Quick Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-xs font-bold text-slate-400 shrink-0">ক্যাটাগরি:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">বিষয়:</span>
                  {subjectCategories.map(s => (
                    <button
                      key={s.subject}
                      onClick={() => {
                        setPracticeSubject(s.subject);
                        setSelectedSubject(s.subject);
                        setInteractiveAnswers({});
                        setPracticeSearch('');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        practiceSubject === s.subject
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {s.subject} ({s.questionsCount})
                    </button>
                  ))}

                  <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase shrink-0">দপ্তর:</span>
                  {doptorCategories.map(s => (
                    <button
                      key={s.subject}
                      onClick={() => {
                        setPracticeSubject(s.subject);
                        setSelectedSubject(s.subject);
                        setInteractiveAnswers({});
                        setPracticeSearch('');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        practiceSubject === s.subject
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }`}
                    >
                      {s.subject} ({s.questionsCount})
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setPracticeTab('qa')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    practiceTab === 'qa'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>প্রশ্ন-উত্তর ও ব্যাখ্যা</span>
                </button>
                <button
                  onClick={() => setPracticeTab('interactive')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    practiceTab === 'interactive'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>ইন্টারেক্টিভ কুইজ</span>
                </button>
              </div>
            </div>

            {/* Filter / Search Bar inside Modal */}
            <div className="p-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`${practiceSubject} বিষয়ের প্রশ্ন বা উত্তর লিখে খুঁজুন...`}
                  value={practiceSearch}
                  onChange={(e) => setPracticeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {practiceSearch && (
                  <button
                    onClick={() => setPracticeSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    মুছে ফেলুন
                  </button>
                )}
              </div>
            </div>

            {/* Questions Content List (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 sm:space-y-8 flex-grow">
              {activePracticeQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold">এই মুহূর্তে কোনো প্রশ্ন খুঁজে পাওয়া যায়নি।</p>
                  <p className="text-xs">সার্চ টার্মটি পরিবর্তন করুন অথবা অন্য বিষয় সিলেক্ট করুন।</p>
                </div>
              ) : (
                activePracticeQuestions.map((item, idx) => {
                  const q = item.question;
                  const selectedOpt = interactiveAnswers[q.id];
                  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];

                  return (
                    <div
                      key={`${q.id}-${idx}`}
                      className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 hover:border-primary/40 shadow-sm transition-all"
                    >
                      {/* Question Top Metadata */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                        <span className="text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                          প্রশ্ন নং {idx + 1}
                        </span>
                        <span className="text-slate-500 font-medium">
                          উৎস: {item.examTitle}
                        </span>
                      </div>

                      {/* Question Title */}
                      <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-relaxed sm:leading-loose pt-1">
                        {q.text}
                      </h4>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === q.correctAnswer;
                          const isSelectedByUser = selectedOpt === optIdx;

                          if (practiceTab === 'qa') {
                            // Standard Q&A mode: Always highlight correct answer
                            return (
                              <div
                                key={optIdx}
                                className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between font-medium leading-relaxed min-h-[48px] ${
                                  isCorrect
                                    ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-3 pr-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {optionLabels[optIdx]}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                                {isCorrect && (
                                  <span className="text-[11px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0 ml-2">
                                    <Check className="h-3.5 w-3.5" /> সঠিক উত্তর
                                  </span>
                                )}
                              </div>
                            );
                          } else {
                            // Interactive Practice Mode
                            let btnStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-primary/50';
                            
                            if (selectedOpt !== undefined) {
                              if (isCorrect) {
                                btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold';
                              } else if (isSelectedByUser && !isCorrect) {
                                btnStyle = 'bg-rose-500/15 border-rose-500 text-rose-950 dark:text-rose-200 font-bold';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  if (selectedOpt === undefined) {
                                    setInteractiveAnswers(prev => ({ ...prev, [q.id]: optIdx }));
                                  }
                                }}
                                className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm text-left transition-all flex items-center justify-between min-h-[48px] ${btnStyle}`}
                              >
                                <div className="flex items-center gap-3 pr-2">
                                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                                    {optionLabels[optIdx]}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                                {selectedOpt !== undefined && isCorrect && (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 ml-2" />
                                )}
                                {selectedOpt !== undefined && isSelectedByUser && !isCorrect && (
                                  <XCircle className="h-5 w-5 text-rose-500 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          }
                        })}
                      </div>

                      {/* Explanation Box */}
                      {q.explanation && (practiceTab === 'qa' || selectedOpt !== undefined) && (
                        <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-2 mt-3 animate-fade-in">
                          <p className="font-bold flex items-center gap-1.5 text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                            <Sparkles className="h-4 w-4" />
                            <span>উত্তর বিশ্লেষণ & ব্যাখ্যা:</span>
                          </p>
                          <p className="leading-relaxed sm:leading-loose text-slate-800 dark:text-amber-100/90">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                মোট {activePracticeQuestions.length} টি প্রশ্ন সংরক্ষিত আছে
              </span>
              <button
                onClick={() => {
                  const targetSub = practiceSubject;
                  setPracticeSubject(null);
                  setSelectedSubject(targetSub);
                  const el = document.getElementById('featured-exams');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{practiceSubject} এর লাইভ পরীক্ষাগুলোতে যান</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. Ministry Question Bank Interactive Practice Modal */}
      {activeMinistryBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-primary/20 text-primary-light border border-primary/30 text-[11px] font-extrabold rounded-md">
                    🏢 {activeMinistryBank.ministryName}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {activeMinistryBank.questions.length} টি প্রশ্ন
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold leading-snug">
                  {activeMinistryBank.title}
                </h3>
              </div>

              <button
                onClick={() => setActiveMinistryBank(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all"
                title="বন্ধ করুন"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Sub-Header Tabs */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMbPracticeTab('qa')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    mbPracticeTab === 'qa'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  📖 উত্তর ও বিশদ সমাধান
                </button>
                <button
                  onClick={() => setMbPracticeTab('interactive')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    mbPracticeTab === 'interactive'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  ⚡ ইন্টারেক্টিভ সেলফ-টেস্ট
                </button>
              </div>

              <button
                onClick={() => {
                  const bankToStart = activeMinistryBank;
                  setActiveMinistryBank(null);
                  handleStartMinistryExam(bankToStart);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>⏱️ পরীক্ষা মোডে সুইচ করুন</span>
              </button>
            </div>

            {/* Questions Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow">
              {activeMinistryBank.questions.map((q, qIdx) => {
                const selectedOpt = mbUserAnswers[q.id];
                const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];

                return (
                  <div
                    key={q.id || qIdx}
                    className="p-5 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                        <span className="text-primary mr-1 bg-primary/10 px-2 py-0.5 rounded-lg text-xs font-extrabold">
                          প্রশ্ন {qIdx + 1}
                        </span>{' '}
                        {q.text}
                      </h4>
                      {q.subject && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                          {q.subject}
                        </span>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === q.correctAnswer;
                        const isSelectedByUser = selectedOpt === optIdx;

                        if (mbPracticeTab === 'qa') {
                          // Standard QA View
                          return (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  {optionLabels[optIdx]}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-extrabold">
                                  সঠিক উত্তর
                                </span>
                              )}
                            </div>
                          );
                        } else {
                          // Interactive practice mode
                          let btnStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50';

                          if (selectedOpt !== undefined) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                            } else if (isSelectedByUser && !isCorrect) {
                              btnStyle = 'bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-200 font-bold';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (selectedOpt === undefined) {
                                  setMbUserAnswers(prev => ({ ...prev, [q.id]: optIdx }));
                                }
                              }}
                              className={`p-3 rounded-xl border text-xs sm:text-sm text-left transition-all flex items-center justify-between ${btnStyle}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                                  {optionLabels[optIdx]}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {selectedOpt !== undefined && isCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              )}
                              {selectedOpt !== undefined && isSelectedByUser && !isCorrect && (
                                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                              )}
                            </button>
                          );
                        }
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (mbPracticeTab === 'qa' || selectedOpt !== undefined) && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-1.5 animate-fade-in">
                        <p className="font-bold flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <Sparkles className="h-4 w-4" />
                          <span>বিশদ সমাধান ও ব্যাখ্যা:</span>
                        </p>
                        <p className="leading-relaxed text-slate-800 dark:text-amber-100/90">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                মোট {activeMinistryBank.questions.length} টি প্রশ্ন অনুশীলনের জন্য প্রস্তুত
              </span>
              <button
                onClick={() => {
                  const bankToStart = activeMinistryBank;
                  setActiveMinistryBank(null);
                  handleStartMinistryExam(bankToStart);
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>⏱️ রিয়েল-টাইম পরীক্ষা দিন</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. Live Exam Share Modal */}
      {sharingExam && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSharingExam(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-primary dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    লাইভ পরীক্ষা শেয়ার করুন
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    বন্ধুদের সাথে লিংকটি শেয়ার করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSharingExam(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="বন্ধ করুন"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Exam Details Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md capitalize">
                  {sharingExam.subject}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full dark:bg-emerald-950/70 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  চলমান লাইভ
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {sharingExam.title}
              </h4>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                সোশ্যাল মিডিয়ায় সরাসরি শেয়ার
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔥 মেধা জব পোর্টালে লাইভ পরীক্ষা "${sharingExam.title}" চলছে! অংশ নিন:\n${getExamShareUrl(sharingExam)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all active:scale-95"
                >
                  <span className="text-base mb-1">💬</span>
                  <span>হোয়াটসঅ্যাপ</span>
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getExamShareUrl(sharingExam))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all active:scale-95"
                >
                  <span className="text-base mb-1">📘</span>
                  <span>ফেসবুক</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(getExamShareUrl(sharingExam))}&text=${encodeURIComponent(`🔥 মেধা জব পোর্টালে লাইভ পরীক্ষা "${sharingExam.title}" চলছে!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50/80 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 font-bold text-xs transition-all active:scale-95"
                >
                  <span className="text-base mb-1">✈️</span>
                  <span>টেলিগ্রাম</span>
                </a>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                পরীক্ষার লিংক কপি করুন
              </span>
              <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1 font-mono select-all">
                  {getExamShareUrl(sharingExam)}
                </span>
                <button
                  type="button"
                  onClick={() => copyShareLink(getExamShareUrl(sharingExam))}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    shareCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-sm'
                  }`}
                >
                  {shareCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>কপি লিংক</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSharingExam(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
