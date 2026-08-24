/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, LeaderboardUser, MinistryQuestionBank, Review, SubjectStats } from './types';

export const SUBJECTS: SubjectStats[] = [
  {
    subject: 'বাংলা',
    examsCount: 24,
    questionsCount: 480,
    iconName: 'BookOpen',
    colorClass: 'from-emerald-500/10 to-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  {
    subject: 'ইংরেজি',
    examsCount: 18,
    questionsCount: 360,
    iconName: 'Languages',
    colorClass: 'from-blue-500/10 to-blue-500/20 text-blue-600 dark:text-blue-400',
  },
  {
    subject: 'গণিত',
    examsCount: 15,
    questionsCount: 300,
    iconName: 'Calculator',
    colorClass: 'from-amber-500/10 to-amber-500/20 text-amber-600 dark:text-amber-400',
  },
  {
    subject: 'GK',
    examsCount: 12,
    questionsCount: 240,
    iconName: 'Globe',
    colorClass: 'from-purple-500/10 to-purple-500/20 text-purple-600 dark:text-purple-400',
  },
  {
    subject: 'BCS',
    examsCount: 35,
    questionsCount: 700,
    iconName: 'GraduationCap',
    colorClass: 'from-rose-500/10 to-rose-500/20 text-rose-600 dark:text-rose-400',
  },
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev1',
    name: 'তন্ময় রহমান',
    role: 'BCS পরীক্ষার্থী (৪৬তম প্রিলিমিনারি)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    rating: 5,
    text: 'এই সাইটের এক্সাম ইন্টারফেসটি চমৎকার। রিয়েল-টাইম টাইমার এবং ডিটেইলড রেজাল্ট শিট আমাকে আমার দুর্বলতাগুলো কাটিয়ে উঠতে দারুণভাবে সাহায্য করেছে।',
  },
  {
    id: 'rev2',
    name: 'নুসরাত জাহান লিয়া',
    role: 'ঢাকা বিশ্ববিদ্যালয় ভর্তি পরীক্ষার্থী',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    rating: 5,
    text: 'এখানে বাংলা ও ইংরেজির জন্য চমৎকার সব কুইজ রয়েছে। বিশেষ করে রিভিউর ব্যাখ্যাগুলো অনেক কাজের। মোবাইল ফ্রেন্ডলি হওয়ায় যাতায়াতের সময়ও পরীক্ষা দিতে পারি!',
  },
  {
    id: 'rev3',
    name: 'আরিয়ান শেখ',
    role: 'ব্যাংক জব প্রস্তুতি গ্রুপ',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    rating: 4.8,
    text: 'গণিতের শর্টকাট সমাধানের ব্যাখ্যাগুলো অসাধারণ। ড্যাশবোর্ড এনালাইটিক্স দেখে বুঝতে পারি প্রতি সপ্তাহে আমার কতটা ইম্প্রুভমেন্ট হচ্ছে। হাইলি রিকমেন্ডেড!',
  },
];

export const MOCK_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'তাসনিম আরাফাত', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120', score: 2450, examsTaken: 52, streak: 14 },
  { rank: 2, name: 'সাদাত হোসাইন', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120', score: 2320, examsTaken: 48, streak: 8 },
  { rank: 3, name: 'ফারিহা মেহজাবিন', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120', score: 2210, examsTaken: 45, streak: 12 },
  { rank: 4, name: 'জাকিরুল ইসলাম', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120', score: 2180, examsTaken: 43, streak: 5 },
  { rank: 5, name: 'রাফিয়া সুলতানা', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120', score: 2090, examsTaken: 41, streak: 7 },
];

export const INITIAL_STATS = {
  studentsCount: 18450,
  examsTakenCount: 142300,
  questionsSolvedCount: 924500,
};

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-1',
    title: '৪৫তম বিসিএস প্রিলিমিনারি মডেল টেস্ট - বাংলা সাহিত্য ও ব্যাকরণ',
    subject: 'BCS',
    durationMinutes: 10,
    totalQuestions: 10,
    totalMarks: 10,
    status: 'live',
    dateCreated: '2026-07-15',
    questions: [
      {
        id: 'q1-1',
        text: 'বাংলা সাহিত্যের প্রথম সার্থক উপন্যাস কোনটি?',
        options: ['আলালের ঘরের দুলাল', 'দুর্গেশনন্দিনী', 'কপালকুণ্ডলা', 'বিষবৃক্ষ'],
        correctAnswer: 1,
        explanation: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায় রচিত "দুর্গেশনন্দিনী" (১৮৬৫) বাংলা সাহিত্যের প্রথম সার্থক উপন্যাস।',
        subject: 'বাংলা সাহিত্য'
      },
      {
        id: 'q1-2',
        text: 'চর্যাপদ কত সালে আবিষ্কৃত হয়?',
        options: ['১৯০৭', '১৯১৬', '১৮৯৭', '১৯২০'],
        correctAnswer: 0,
        explanation: 'মহামহোপাধ্যায় হরপ্রসাদ শাস্ত্রী ১৯০৭ সালে নেপালের রাজদরবারের রয়েল লাইব্রেরি থেকে চর্যাপদ আবিষ্কার করেন। এটি ১৯১৬ সালে প্রকাশিত হয়।',
        subject: 'বাংলা সাহিত্য'
      },
      {
        id: 'q1-3',
        text: '"সংশপ্তক" কার বিখ্যাত ভাস্কর্য?',
        options: ['হামিদুজ্জামান খান', 'শামীম সিকদার', 'আব্দুল রাজ্জাক', 'নিতুন কুণ্ডু'],
        correctAnswer: 0,
        explanation: '"সংশপ্তক" জাহাঙ্গীরনগর বিশ্ববিদ্যালয়ে অবস্থিত বিখ্যাত ভাস্কর্য যা হামিদুজ্জামান খান নির্মাণ করেছেন।',
        subject: 'সাধারণ জ্ঞান ও শিল্প'
      },
      {
        id: 'q1-4',
        text: 'কোনটি সমার্থক শব্দ নয়?',
        options: ['অনল', 'পাবন', 'পাবক', 'পবন'],
        correctAnswer: 3,
        explanation: 'অনল, পাবন, পাবক শব্দের অর্থ আগুন। কিন্তু "পবন" শব্দের অর্থ বাতাস বা বায়ু।',
        subject: 'বাংলা ব্যাকরণ'
      },
      {
        id: 'q1-5',
        text: '"অগ্নিবীণা" কাব্যের প্রথম কবিতা কোনটি?',
        options: ['ধূমকেতু', 'খেয়াপারের তরণী', 'প্রলয়োল্লাস', 'বিদ্রোহী'],
        correctAnswer: 2,
        explanation: 'কাজী নজরুল ইসলামের যুগান্তকারী কাব্যগ্রন্থ "অগ্নিবীণা" (১৯২২) এর প্রথম কবিতা হলো "প্রলয়োল্লাস"।',
        subject: 'বাংলা সাহিত্য'
      },
      {
        id: 'q1-6',
        text: 'কোন বানানটি শুদ্ধ?',
        options: ['মূমুর্ষু', 'মুমূর্ষু', 'মুমূর্ষ', 'মূমূর্ষু'],
        correctAnswer: 1,
        explanation: 'সঠিক শুদ্ধ বানান হলো "মুমূর্ষু" (ম-এ হ্রস্ব উ, ম-এ দীর্ঘ উ রেফ, ষ-এ হ্রস্ব উ)।',
        subject: 'বাংলা ব্যাকরণ'
      },
      {
        id: 'q1-7',
        text: 'বাংলা ভাষায় ব্যবহৃত মৌলিক স্বরধ্বনি কয়টি?',
        options: ['৭টি', '১১টি', '৯টি', '২৫টি'],
        correctAnswer: 0,
        explanation: 'বাংলা ভাষায় মৌলিক স্বরধ্বনি মোট ৭টি: অ, আ, ই, উ, এ, ও এবং এ্যা।',
        subject: 'বাংলা ব্যাকরণ'
      },
      {
        id: 'q1-8',
        text: '"কবর" কবিতাটি কোন ছন্দে রচিত?',
        options: ['অক্ষরবৃত্ত ছন্দ', 'মাত্রাবৃত্ত ছন্দ', 'স্বরবৃত্ত ছন্দ', 'গদ্য ছন্দ'],
        correctAnswer: 0,
        explanation: 'জসীমউদ্দীন রচিত অত্যন্ত জনপ্রিয় "কবর" কবিতাটি ১৪ মাত্রার মূল অক্ষরবৃত্ত ছন্দে রচিত।',
        subject: 'বাংলা সাহিত্য'
      },
      {
        id: 'q1-9',
        text: '"গীতাঞ্জলি" কাব্যের ইংরেজি অনুবাদ কে করেন?',
        options: ['ডব্লিউ বি ইয়েটস', 'রবীন্দ্রনাথ ঠাকুর', 'রবার্ট ফ্রস্ট', 'টি এস এলিয়ট'],
        correctAnswer: 1,
        explanation: 'রবীন্দ্রনাথ ঠাকুর নিজেই তাঁর গীতাঞ্জলি কাব্যের অনুবাদ "Song Offerings" নামে করেন। ডব্লিউ বি ইয়েটস এর মুখবন্ধ বা ইন্ট্রোডাকশন লিখেছিলেন।',
        subject: 'বাংলা সাহিত্য'
      },
      {
        id: 'q1-10',
        text: 'তৎসম শব্দের "তৎ" বলতে কোনটি বোঝায়?',
        options: ['সংস্কৃত', 'প্রাকৃত', 'বাংলা', 'তদ্ভব'],
        correctAnswer: 0,
        explanation: 'তৎসম = তৎ (তার) + সম (সমান)। অর্থাৎ সংস্কৃতের সমান। এখানে "তৎ" বলতে সংস্কৃতকে নির্দেশ করা হয়।',
        subject: 'বাংলা ব্যাকরণ'
      },
    ]
  },
  {
    id: 'exam-2',
    title: 'English Grammar Masterclass - Right Form of Verbs',
    subject: 'ইংরেজি',
    durationMinutes: 8,
    totalQuestions: 8,
    totalMarks: 8,
    status: 'live',
    dateCreated: '2026-07-16',
    isPremium: true,
    questions: [
      {
        id: 'q2-1',
        text: 'Choose the correct form of verb: Many a student ___ failed in the exam.',
        options: ['have', 'has', 'were', 'are'],
        correctAnswer: 1,
        explanation: '"Many a" is followed by a singular noun and a singular verb. Therefore, "has" is correct.',
        subject: 'English Grammar'
      },
      {
        id: 'q2-2',
        text: 'If I had known you were coming, I ___ you at the station.',
        options: ['would meet', 'would have met', 'will meet', 'had met'],
        correctAnswer: 1,
        explanation: 'This is a Third Conditional sentence. The structure is "If + Past Perfect, would have + Past Participle".',
        subject: 'English Grammar'
      },
      {
        id: 'q2-3',
        text: 'Identify the synonym of "Obdurate":',
        options: ['Flexible', 'Stubborn', 'Generous', 'Indifferent'],
        correctAnswer: 1,
        explanation: '"Obdurate" means stubbornly refusing to change one\'s opinion or course of action. Hence, "Stubborn" is the correct synonym.',
        subject: 'Vocabulary'
      },
      {
        id: 'q2-4',
        text: 'The phrase "Achilles\' heel" means:',
        options: ['Strongest point', 'A weak point', 'An expensive asset', 'Running fast'],
        correctAnswer: 1,
        explanation: '"Achilles\' heel" is a mythological idiom meaning a person\'s only vulnerable point or weakness.',
        subject: 'Idioms and Phrases'
      },
      {
        id: 'q2-5',
        text: 'Choose the correct preposition: He is devoid ___ common sense.',
        options: ['of', 'from', 'with', 'for'],
        correctAnswer: 0,
        explanation: 'The appropriate preposition with "devoid" is "of" (devoid of = empty of / lacking).',
        subject: 'Prepositions'
      },
      {
        id: 'q2-6',
        text: 'No sooner had the thief seen the police ___ he ran away.',
        options: ['then', 'than', 'when', 'before'],
        correctAnswer: 1,
        explanation: 'The correlation is "No sooner had ... than ...". Note the spelling is "than", not "then".',
        subject: 'Conjunctions'
      },
      {
        id: 'q2-7',
        text: 'What is the noun form of the word "Beautiful"?',
        options: ['Beautify', 'Beautifully', 'Beauty', 'Beauteous'],
        correctAnswer: 2,
        explanation: '"Beauty" is the noun form. "Beautify" is the verb, and "Beautifully" is the adverb.',
        subject: 'Parts of Speech'
      },
      {
        id: 'q2-8',
        text: 'Identify the active voice: "My watch has been stolen."',
        options: ['Someone has stolen my watch.', 'My watch is stolen by someone.', 'Who has stolen my watch?', 'Someone stole my watch.'],
        correctAnswer: 0,
        explanation: 'The passive sentence is in the Present Perfect tense ("has been stolen"). The active form must be in Present Perfect with "Someone" as subject: "Someone has stolen my watch."',
        subject: 'Voice Change'
      }
    ]
  },
  {
    id: 'exam-3',
    title: 'প্রাথমিক বিদ্যালয় সহকারী শিক্ষক নিয়োগ প্রস্তুতি - গণিত',
    subject: 'গণিত',
    durationMinutes: 10,
    totalQuestions: 6,
    totalMarks: 10,
    status: 'live',
    dateCreated: '2026-07-17',
    questions: [
      {
        id: 'q3-1',
        text: 'একটি সংখ্যার ৩ গুণ থেকে ১৫ বিয়োগ করলে বিয়োগফল ৩০ হয়। সংখ্যাটি কত?',
        options: ['১০', '১৫', '১২', '২০'],
        correctAnswer: 1,
        explanation: 'ধরি সংখ্যাটি x। প্রশ্নানুযায়ী: 3x - 15 = 30 => 3x = 45 => x = 15।',
        subject: 'বীজগণিত'
      },
      {
        id: 'q3-2',
        text: 'বার্ষিক ১০% সরল মুনাফায় ৮০০ টাকার ২ বছরের মুনাফা কত হবে?',
        options: ['৮০ টাকা', '১৬০ টাকা', '১২০ টাকা', '২০০ টাকা'],
        correctAnswer: 1,
        explanation: 'মুনাফা (I) = Pnr = 800 × 2 × (10/100) = 160 টাকা।',
        subject: 'সরল মুনাফা'
      },
      {
        id: 'q3-3',
        text: 'একটি ত্রিভুজের তিন কোণের অনুপাত ১:২:৩ হলে, বৃহত্তম কোণের মান কত ডিগ্রী?',
        options: ['৬০°', '৯০°', '১০০°', '৪৫°'],
        correctAnswer: 1,
        explanation: 'ত্রিভুজের ৩ কোণের সমষ্টি ১৮০°। কোণগুলো x, 2x, 3x। সুতরাং x + 2x + 3x = 180° => 6x = 180° => x = 30°। বৃহত্তম কোণটি = 3x = 3 × 30° = 90°।',
        subject: 'জ্যামিতি'
      },
      {
        id: 'q3-4',
        text: '০.১ × ০.০১ × ০.০০১ = কত?',
        options: ['০.০০০১', '০.০০০০০১', '০.০০১', '০.০০০০১'],
        correctAnswer: 1,
        explanation: 'এখানে মোট দশমিকের পর ঘর সংখ্যা: ১ + ২ + ৩ = ৬টি। সুতরাং উত্তর হবে ০.০০০০০১।',
        subject: 'দশমিক ভগ্নাংশ'
      },
      {
        id: 'q3-5',
        text: 'লগারিদমের ক্ষেত্রে log₂(৮) এর মান কত?',
        options: ['২', '৩', '৪', '৮'],
        correctAnswer: 1,
        explanation: 'log₂ 8 = log₂ (2³) = 3 log₂ 2 = 3 × 1 = 3।',
        subject: 'বীজগণিত'
      },
      {
        id: 'q3-6',
        text: '১০ জন লোক একটি কাজ ১৫ দিনে করতে পারে। ওই কাজ ৫ জন লোক কত দিনে শেষ করতে পারবে?',
        options: ['২০ দিনে', '৩০ দিনে', '২৫ দিনে', '১৫ দিনে'],
        correctAnswer: 1,
        explanation: 'ঐকিক নিয়ম: ১০ জন করে ১৫ দিনে, অতএব ১ জন করে ১৫ × ১০ দিনে। অতএব ৫ জন করে (১৫ × ১০) / ৫ = ৩০ দিনে।',
        subject: 'ঐকিক নিয়ম'
      }
    ]
  },
  {
    id: 'exam-4',
    title: 'বিশ্ব পরিচিতি ও সাধারণ জ্ঞান (General Knowledge) মডেল টেস্ট',
    subject: 'GK',
    durationMinutes: 10,
    totalQuestions: 6,
    totalMarks: 6,
    status: 'live',
    archiveTime: '2026-07-20T12:00:00',
    dateCreated: '2026-07-18',
    isPremium: true,
    questions: [
      {
        id: 'q4-1',
        text: 'বিশ্বের দীর্ঘতম নদী কোনটি?',
        options: ['আমাজন', 'নীলনদ', 'মিসিসিপি', 'ইয়াংসি'],
        correctAnswer: 1,
        explanation: 'নীলনদ বিশ্বের দীর্ঘতম নদী, যার দৈর্ঘ্য প্রায় ৬,৬৫০ কিলোমিটার।',
        subject: 'ভূগোল ও বিশ্বের সাধারণ জ্ঞান'
      },
      {
        id: 'q4-2',
        text: 'বাংলাদেশের স্বাধীনতা যুদ্ধে বীরত্বসূচক খেতাব "বীরশ্রেষ্ঠ" কতজনকে দেওয়া হয়েছে?',
        options: ['৭ জন', '৬৮ জন', '১৭৫ জন', '৪২৬ জন'],
        correctAnswer: 0,
        explanation: 'বাংলাদেশের স্বাধীনতা যুদ্ধে চরম বীরত্ব প্রদর্শনের জন্য ৭ জনকে সর্বোচ্চ সামরিক খেতাব "বীরশ্রেষ্ঠ" দেওয়া হয়।',
        subject: 'বাংলাদেশ মুক্তিযুদ্ধ ও ইতিহাস'
      },
      {
        id: 'q4-3',
        text: 'ইউনেস্কো (UNESCO) এর সদর দপ্তর কোথায় অবস্থিত?',
        options: ['নিউইয়র্ক', 'লন্ডন', 'প্যারিস', 'জেনেভা'],
        correctAnswer: 2,
        explanation: 'ইউনেস্কোর সদর দপ্তর ফ্রান্সের প্যারিস শহরে অবস্থিত।',
        subject: 'আন্তর্জাতিক সংস্থা ও সদর দপ্তর'
      },
      {
        id: 'q4-4',
        text: '"মুজিবনগর সরকার" কত তারিখে শপথ গ্রহণ করেছিল?',
        options: ['১০ এপ্রিল ১৯৭১', '১৭ এপ্রিল ১৯৭১', '১৬ ডিসেম্বর ১৯৭১', '৭ মার্চ ১৯৭১'],
        correctAnswer: 1,
        explanation: '১৯৭১ সালের ১০ এপ্রিল মুজিবনগর সরকার গঠিত হয় এবং ১৭ এপ্রিল মেহেরপুরের বৈদ্যনাথতলায় (বর্তমান মুজিবনগর) শপথ গ্রহণ করে।',
        subject: 'বাংলাদেশ ইতিহাস'
      },
      {
        id: 'q4-5',
        text: 'সূর্য থেকে পৃথিবীতে আলো আসতে কত সময় লাগে?',
        options: ['প্রায় ৮ মিনিট ২০ সেকেন্ড', 'প্রায় ৫ মিনিট', 'প্রায় ১০ মিনিট', 'প্রায় ১২ মিনিট ১৫ সেকেন্ড'],
        correctAnswer: 0,
        explanation: 'সূর্য থেকে পৃথিবীতে আলো আসতে আনুমানিক ৮ মিনিট ২০ সেকেন্ড (বা ৫০০ সেকেন্ড) সময় লাগে।',
        subject: 'বিজ্ঞান'
      },
      {
        id: 'q4-6',
        text: 'নোবেল পুরস্কারের প্রবর্তক আলফ্রেড নোবেল কি আবিষ্কার করেছিলেন?',
        options: ['ডিনামাইট', 'পেনিসিলিন', 'এক্স-রে', 'টেলিফোন'],
        correctAnswer: 0,
        explanation: 'সুইডিশ বিজ্ঞানী আলফ্রেড নোবেল ডিনামাইট আবিষ্কার করেছিলেন এবং তাঁর উইল অনুযায়ী ১৯০১ সাল থেকে নোবেল পুরস্কার প্রবর্তন করা হয়।',
        subject: 'বিজ্ঞান ও আবিষ্কার'
      }
    ]
  },
  {
    id: 'exam-5',
    title: 'Upcoming BCS Preparation Mock Exam - বাংলাদেশ বিষয়াবলী',
    subject: 'BCS',
    durationMinutes: 15,
    totalQuestions: 5,
    totalMarks: 5,
    status: 'upcoming',
    startTime: '2026-07-25T14:00:00',
    dateCreated: '2026-07-19',
    isPremium: true,
    questions: [
      {
        id: 'q-5-1',
        text: 'মুজিবনগর সরকার কত তারিখে শপথ গ্রহণ করেছিল?',
        options: ['১০ এপ্রিল ১৯৭১', '১৭ এপ্রিল ১৯৭১', '২৫ মার্চ ১৯৭১', '১৬ ডিসেম্বর ১৯৭১'],
        correctAnswer: 1,
        explanation: '১৭ এপ্রিল ১৯৭১ মেহেরপুরের বৈদ্যনাথতলার (বর্তমান মুজিবনগর) আম্রকাননে মুজিবনগর সরকার শপথ গ্রহণ করে।',
        subject: 'মুক্তিযুদ্ধ ও বাংলাদেশ'
      },
      {
        id: 'q-5-2',
        text: 'বাংলাদেশের সংবিধান কত তারিখে গৃহীত হয়?',
        options: ['৪ নভেম্বর ১৯৭২', '১৬ ডিসেম্বর ১৯৭২', '২৬ মার্চ ১৯৭২', '৭ মার্চ ১৯৭৩'],
        correctAnswer: 0,
        explanation: '৪ নভেম্বর ১৯৭২ বাংলাদেশ গণপরিষদে সংবিধান গৃহীত হয় এবং ১৬ ডিসেম্বর ১৯৭২ থেকে কার্যকর হয়।',
        subject: 'বাংলাদেশ সংবিধান'
      },
      {
        id: 'q-5-3',
        text: 'বাংলাদেশের সর্বোচ্চ বেসামরিক পুরস্কার কোনটি?',
        options: ['একুশে পদক', 'স্বাধীনতা পুরস্কার', 'বীরশ্রেষ্ঠ পদক', 'বাংলা একাডেমি সাহিত্য পুরস্কার'],
        correctAnswer: 1,
        explanation: 'স্বাধীনতা পুরস্কার (বা স্বাধীনতা পদক) গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের সর্বোচ্চ বেসামরিক সম্মাননা পদক।',
        subject: 'বাংলাদেশ বিষয়াবলী'
      },
      {
        id: 'q-5-4',
        text: 'পদ্মা সেতুর দৈর্ঘ্য কত কিলোমিটার?',
        options: ['৬.১৫ কিমি', '৪.৮ কিমি', '৫.২৫ কিমি', '৭.২ কিমি'],
        correctAnswer: 0,
        explanation: 'পদ্মা সেতুর মূল দৈর্ঘ্য ৬.১৫ কিলোমিটার (প্রস্তাবে ৪১টি স্প্যান এবং ৪২টি পিলার)।',
        subject: 'জাতীয় উন্নয়ন ও মেগা প্রকল্প'
      },
      {
        id: 'q-5-5',
        text: 'সুন্দরবনকে বিশ্ব ঐতিহ্য (World Heritage) ঘোষণা করে কোন সংস্থা?',
        options: ['UNICEF', 'UNESCO', 'UNDP', 'WWF'],
        correctAnswer: 1,
        explanation: '১৯৯৭ সালের ৬ ডিসেম্বর ইউনেস্কো (UNESCO) সুন্দরবনকে বিশ্ব ঐতিহ্যবাহী স্থান হিসেবে স্বীকৃতি প্রদান করে।',
        subject: 'পরিবেশ ও ঐতিহ্য'
      }
    ]
  },
  {
    id: 'exam-6',
    title: '১১তম - ২০তম গ্রেড সরকারি চাকরি নিয়োগ প্রিলিমিনারি মডেল টেস্ট',
    subject: '11th - 20th Grade Job',
    durationMinutes: 12,
    totalQuestions: 5,
    totalMarks: 5,
    status: 'upcoming',
    startTime: '2026-07-27T10:00:00',
    dateCreated: '2026-07-20',
    questions: [
      {
        id: 'q-6-1',
        text: 'বাংলা বর্ণমালায় মাত্রাহীন বর্ণ কয়টি?',
        options: ['৭টি', '৮টি', '১০টি', '১১টি'],
        correctAnswer: 2,
        explanation: 'বাংলা বর্ণমালায় মোট ১০টি মাত্রাহীন বর্ণ রয়েছে (স্বরবর্ণে ৪টি: এ, ঐ, ও, ঔ এবং ব্যঞ্জনবর্ণে ৬টি: ঙ, ঞ, ৎ, ং, ঃ, ঁ)।',
        subject: 'বাংলা ব্যাকরণ'
      },
      {
        id: 'q-6-2',
        text: 'কোনটি শুদ্ধ বানান?',
        options: ['মুহুর্ত', 'মুহূর্ত', 'মুহুর্ত্ত', 'মুহুর্থ'],
        correctAnswer: 1,
        explanation: 'শুদ্ধ বানান হলো "মুহূর্ত" (ম-হ্রস্ব উ, হ-দীর্ঘ উ, র-ফলা এবং ত)।',
        subject: 'বাংলা বানান'
      },
      {
        id: 'q-6-3',
        text: 'What is the synonym of "Vigilant"?',
        options: ['Careless', 'Watchful', 'Lazy', 'Weak'],
        correctAnswer: 1,
        explanation: 'Vigilant শব্দের অর্থ সতর্ক বা জাগ্রত। এর সমার্থক শব্দ হলো Watchful/Alert।',
        subject: 'English Vocabulary'
      },
      {
        id: 'q-6-4',
        text: '১০% সরল মুনাফায় ৫০০ টাকার ৩ বছরের মুনাফা কত হবে?',
        options: ['১০০ টাকা', '১২০ টাকা', '১৫০ টাকা', '১৮০ টাকা'],
        correctAnswer: 2,
        explanation: 'I = Pnr / 100 = 500 * 3 * 10 / 100 = ১৫০ টাকা।',
        subject: 'গণিত'
      },
      {
        id: 'q-6-5',
        text: 'কম্পিউটারের মস্তিষ্ক (Brain of Computer) কাকে বলা হয়?',
        options: ['RAM', 'CPU', 'Hard Disk', 'Motherboard'],
        correctAnswer: 1,
        explanation: 'CPU (Central Processing Unit)-কে কম্পিউটারের মস্তিষ্ক বা ব্রেইন বলা হয়।',
        subject: 'সাধারণ জ্ঞান ও আইসিটি'
      }
    ]
  },
  {
    id: 'exam-7',
    title: '৪র্থ বিষয়ভিত্তিক মডেল টেস্ট - সাধারণ জ্ঞান ও মুক্তিযুদ্ধ',
    subject: 'BCS',
    durationMinutes: 10,
    totalQuestions: 5,
    totalMarks: 5,
    status: 'archive',
    dateCreated: '2026-06-10',
    isPremium: true,
    questions: [
      {
        id: 'q-7-1',
        text: 'ঐতিহাসিক ৭ই মার্চের ভাষণ কোন ময়দানে দেওয়া হয়েছিল?',
        options: ['পল্টন ময়দান', 'রেসকোর্স ময়দান', 'ধানমন্ডি ৩২', 'বাহাদুর শাহ পার্ক'],
        correctAnswer: 1,
        explanation: '১৯৭১ সালের ৭ই মার্চ বঙ্গবন্ধু শেখ মুজিবুর রহমান তৎকালীন রেসকোর্স ময়দানে (বর্তমান সোহরাওয়ার্দী উদ্যান) ঐতিহাসিক ভাষণ দেন।',
        subject: 'মুক্তিযুদ্ধ'
      },
      {
        id: 'q-7-2',
        text: 'বাংলাদেশের জাতীয় পতাকার অনুপাত কত?',
        options: ['১০:৬ (বা ৫:৩)', '৪:৩', '৩:২', '৫:৪'],
        correctAnswer: 0,
        explanation: 'বাংলাদেশের জাতীয় পতাকার দৈর্ঘ্য ও প্রস্থের অনুপাত ১০:৬ বা ৫:৩।',
        subject: 'বাংলাদেশ পরিচিতি'
      },
      {
        id: 'q-7-3',
        text: 'বীরশ্রেষ্ঠ খেতাবপ্রাপ্ত শহীদদের সংখ্যা কতজন?',
        options: ['৫ জন', '৭ জন', '১১ জন', '৬৮ জন'],
        correctAnswer: 1,
        explanation: 'বাংলাদেশের মহান মুক্তিযুদ্ধে সর্বোচ্চ সাহসিকতার জন্য ৭ জন মুক্তিযোদ্ধাকে "বীরশ্রেষ্ঠ" খেতাবে ভূষিত করা হয়।',
        subject: 'মুক্তিযুদ্ধ'
      },
      {
        id: 'q-7-4',
        text: 'বাংলাদেশের কেন্দ্রীয় ব্যাংকের নাম কি?',
        options: ['সোনালী ব্যাংক', 'বাংলাদেশ ব্যাংক', 'কৃষি ব্যাংক', 'রূপালী ব্যাংক'],
        correctAnswer: 1,
        explanation: 'বাংলাদেশ ব্যাংক গণপ্রজাতন্ত্রী বাংলাদেশের কেন্দ্রীয় ব্যাংক ও সর্বোচ্চ আর্থিক নিয়ন্ত্রণ সংস্থা।',
        subject: 'অর্থনীতি'
      },
      {
        id: 'q-7-5',
        text: 'বিশ্ব পরিবেশ দিবস কত তারিখে পালিত হয়?',
        options: ['৫ জুন', '২২ এপ্রিল', '৮ মার্চ', '১ মে'],
        correctAnswer: 0,
        explanation: 'প্রতি বছর ৫ জুন বিশ্বব্যাপী বিশ্ব পরিবেশ দিবস (World Environment Day) হিসেবে পালিত হয়।',
        subject: 'আন্তর্জাতিক বিষয়াবলী'
      }
    ]
  }
];

export const INITIAL_MINISTRY_BANKS: MinistryQuestionBank[] = [
  {
    id: 'min-bank-1',
    ministryName: 'অর্থ মন্ত্রণালয়',
    title: 'সহকারী হিসাবরক্ষণ কর্মকর্তা ও নিরীক্ষক নিয়োগ প্রশ্ন ব্যাংক ২০২৫',
    totalQuestions: 5,
    durationMinutes: 10,
    dateCreated: '২০২৬-০৭-২০',
    isPublished: true,
    questions: [
      {
        id: 'mbq-1-1',
        text: 'বাংলাদেশের জাতীয় আয় গণনায় কোন পদ্ধতিটি ব্যবহৃত হয়?',
        options: ['উৎপাদন পদ্ধতি', 'আয় পদ্ধতি', 'ব্যয় পদ্ধতি', 'উপরের সবকটি'],
        correctAnswer: 3,
        explanation: 'বাংলাদেশ পরিসংখ্যান ব্যুরো (BBS) বাংলাদেশের মোট দেশজ উৎপাদন (GDP) ও জাতীয় আয় নিরূপণে উৎপাদন, আয় ও ব্যয়—তিনটি পদ্ধতি সমন্বিতভাবে ব্যবহার করে।',
        subject: 'অর্থনীতি ও হিসাববিজ্ঞান'
      },
      {
        id: 'mbq-1-2',
        text: 'বাংলাদেশ ব্যাংক কত সালে প্রতিষ্ঠিত হয়?',
        options: ['১৯৭১ সালে', '১৯৭২ সালে', '১৯৭৩ সালে', '১৯৭৪ সালে'],
        correctAnswer: 1,
        explanation: '১৯৭২ সালের ১৬ ডিসেম্বর বাংলাদেশ ব্যাংক অর্ডার, ১৯৭২ (পিও নং ১২৭) অনুযায়ী বাংলাদেশ ব্যাংক আনুষ্ঠানিকভাবে কেন্দ্রীয় ব্যাংক হিসেবে কার্যক্রম শুরু করে।',
        subject: 'ব্যাংকিং ও অর্থ'
      },
      {
        id: 'mbq-1-3',
        text: 'কম্পিউটারের প্রধান মেমরি নিচের কোনটি?',
        options: ['RAM', 'Hard Disk', 'Pen Drive', 'CD-ROM'],
        correctAnswer: 0,
        explanation: 'RAM (Random Access Memory) হলো কম্পিউটারের প্রাথমিক বা প্রধান মেমরি, যা অস্থির (volatile) মেমরি হিসেবে পরিচিত।',
        subject: 'তথ্যপ্রযুক্তি'
      },
      {
        id: 'mbq-1-4',
        text: '"সঞ্চয়" শব্দের সঠিক সন্ধি বিচ্ছেদ কোনটি?',
        options: ['সং + চয়', 'সম্ + চয়', 'সন + চয়', 'সঙ + চয়'],
        correctAnswer: 1,
        explanation: 'ম স্থানে স্বরধ্বনি ব্যঞ্জনধ্বনির সাথে যুক্ত হলে "সম্" ব্যবহৃত হয়। যেমন: সম্ + চয় = সঞ্চয়।',
        subject: 'বাংলা ব্যাকরণ'
      },
      {
        id: 'mbq-1-5',
        text: 'Which one is the correct spelling?',
        options: ['Bureaucracy', 'Beureaucracy', 'Bureaucrasy', 'Burocracy'],
        correctAnswer: 0,
        explanation: 'Correct spelling is Bureaucracy (আমলাতন্ত্র)। Formula: B-U-R-E-A-U-C-R-A-C-Y.',
        subject: 'ইংরেজি'
      }
    ]
  },
  {
    id: 'min-bank-2',
    ministryName: 'জনপ্রশাসন মন্ত্রণালয়',
    title: 'প্রশাসনিক কর্মকর্তা (AO) ও উপ-সহকারী সচিবালয় কর্মকর্তা প্রশ্ন ব্যাংক',
    totalQuestions: 4,
    durationMinutes: 8,
    dateCreated: '২০২৬-০৭-২২',
    isPublished: true,
    questions: [
      {
        id: 'mbq-2-1',
        text: 'সরকারি চাকরি আইন কত সালে পাস হয়?',
        options: ['২০১৫ সালে', '২০১৭ সালে', '২০১৮ সালে', '২০২০ সালে'],
        correctAnswer: 2,
        explanation: 'সরকারি চাকরি আইন ২০১৮ সালের ১৪ নভেম্বর জাতীয় সংসদে পাস হয় এবং ২০১৯ সালের ১ অক্টোবর থেকে কার্যকর হয়।',
        subject: 'প্রশাসন ও আইন'
      },
      {
        id: 'mbq-2-2',
        text: 'বাংলাদেশ সচিবালয় কোন মন্ত্রণালয়ের অধীনে পরিচালিত হয়?',
        options: ['মন্ত্রিপরিষদ বিভাগ', 'জনপ্রশাসন মন্ত্রণালয়', 'গৃহায়ন ও গণপূর্ত মন্ত্রণালয়', 'অর্থ মন্ত্রণালয়'],
        correctAnswer: 1,
        explanation: 'বাংলাদেশ সচিবালয়ের সার্বিক প্রশাসনিক ও সিভিল সার্ভিস ব্যবস্থাপনা জনপ্রশাসন মন্ত্রণালয়ের অধীন।',
        subject: 'সাধারণ জ্ঞান'
      },
      {
        id: 'mbq-2-3',
        text: 'নিচের কোনটি শুদ্ধ বানান?',
        options: ['পিপীলিকা', 'পিপিলিকা', 'পিপীলীকা', 'পিপিলীকা'],
        correctAnswer: 0,
        explanation: 'পিপীলিকা (প + ই-কার + প + ঈ-কার + ল + ই-কার + কা)। সঠিক রূপ: পিপীলিকা।',
        subject: 'বাংলা ব্যাকরণ'
      },
      {
        id: 'mbq-2-4',
        text: 'The phrase "Nouveau Riche" means:',
        options: ['New rich', 'Very poor', 'Noble family', 'Old money'],
        correctAnswer: 0,
        explanation: 'Nouveau Riche is a French origin phrase meaning a person who has recently acquired wealth (নবদ্য ধনী)।',
        subject: 'English Vocabulary'
      }
    ]
  },
  {
    id: 'min-bank-3',
    ministryName: 'স্বরাষ্ট্র মন্ত্রণালয়',
    title: 'ফায়ার সার্ভিস, পাসপোর্ট ও বহিরাগমন অধিদপ্তর স্পেশাল প্রশ্ন ব্যাংক',
    totalQuestions: 4,
    durationMinutes: 8,
    dateCreated: '২০২৬-০৭-২৩',
    isPublished: true,
    questions: [
      {
        id: 'mbq-3-1',
        text: 'বাংলাদেশের ই-পাসপোর্ট চালু হয় কত সালে?',
        options: ['২০১৮ সালে', '২০১৯ সালে', '২০২০ সালে', '২০২১ সালে'],
        correctAnswer: 2,
        explanation: '২০২০ সালের ২২ জানুয়ারি বাংলাদেশে আনুষ্ঠানিকভাবে ই-পাসপোর্ট (e-Passport) সেবার উদ্বোধন করা হয়।',
        subject: 'সাধারণ জ্ঞান'
      },
      {
        id: 'mbq-3-2',
        text: 'ফায়ার সার্ভিস ও সিভিল ডিফেন্স কোন মন্ত্রণালয়ের অধীনস্থ প্রতিষ্ঠান?',
        options: ['স্বরাষ্ট্র মন্ত্রণালয়', 'দুর্যোগ ব্যবস্থাপনা ও ত্রাণ মন্ত্রণালয়', 'প্রতিরক্ষা মন্ত্রণালয়', 'গৃহায়ন মন্ত্রণালয়'],
        correctAnswer: 0,
        explanation: 'ফায়ার সার্ভিস ও সিভিল ডিফেন্স অধিদপ্তর স্বরাষ্ট্র মন্ত্রণালয়ের সুরক্ষা সেবা বিভাগের অধীনে পরিচালিত হয়।',
        subject: 'সাধারণ জ্ঞান'
      },
      {
        id: 'mbq-3-3',
        text: 'কোনটি অগ্নিনির্বাপণে ব্যবহৃত কেমিক্যাল গ্যাস?',
        options: ['কার্বন ডাই অক্সাইড (CO2)', 'অক্সিজেন', 'নাইট্রোজেন', 'মিথেন'],
        correctAnswer: 0,
        explanation: 'কার্বন ডাই অক্সাইড (CO2) গ্যাস বাতাসের অক্সিজেন সরবরাহ বিচ্ছিন্ন করে দ্রুত আগুন নেভাতে ভূমিকা রাখে।',
        subject: 'বিজ্ঞান'
      },
      {
        id: 'mbq-3-4',
        text: 'শতকরা বার্ষিক ১০ টাকা হারে ৫,০০০ টাকার ৩ বছরের মুনাফা কত?',
        options: ['১,০০০ টাকা', '১,২৫০ টাকা', '১,৫০০ টাকা', '১,৭৫০ টাকা'],
        correctAnswer: 2,
        explanation: 'I = P * r * n = ৫০০০ * (১০/১০০) * ৩ = ১,৫০০ টাকা।',
        subject: 'গণিত'
      }
    ]
  }
];
