/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  structuredData?: Record<string, any>;
}

export const BASE_SITE_URL = 'https://medhaexam.site';
export const DEFAULT_OG_IMAGE = `${BASE_SITE_URL}/og-image.png`;

export const SEO_PAGE_CONFIGS: Record<string, PageSEOConfig> = {
  home: {
    title: 'Medha Exam – সরকারি চাকরির অনলাইন মডেল টেস্ট',
    description: 'Medha Exam-এ সরকারি চাকরি ও বিসিএস পরীক্ষার সেরা প্রস্তুতি নিন লাইভ মডেল টেস্ট এবং ব্যাখ্যাসহ প্রশ্ন সমাধানের মাধ্যমে।',
    keywords: 'মেধা এক্সাম, Medha Exam, Job Exam Portal, বিসিএস প্রস্তুতি, BCS Model Test, সরকারি চাকরি পরীক্ষা, ব্যাংক জব মডেল টেস্ট, প্রাইমারি শিক্ষক নিয়োগ পরীক্ষা, BCS Preliminary Exam, লাইভ পরীক্ষা, রেজাল্ট ও মেধাতালিকা',
    canonicalPath: '/',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'url': `${BASE_SITE_URL}/`,
      'name': 'Medha Exam – সরকারি চাকরির অনলাইন মডেল টেস্ট',
      'alternateName': ['মেধা এক্সাম', 'Medha Exam', 'Job Exam Portal'],
      'description': 'Medha Exam-এ সরকারি চাকরি ও বিসিএস পরীক্ষার সেরা প্রস্তুতি নিন লাইভ মডেল টেস্ট এবং ব্যাখ্যাসহ প্রশ্ন সমাধানের মাধ্যমে।',
      'inLanguage': 'bn'
    }
  },
  'live-exam': {
    title: 'লাইভ মডেল টেস্ট ও মেধা তালিকা — Medha Exam',
    description: 'বিসিএস ও নিয়োগ পরীক্ষার রিয়েল-টাইম লাইভ মডেল টেস্টে অংশ নিয়ে তাৎক্ষণিক রেজাল্ট এবং জাতীয় মেরিট পজিশন জানুন।',
    keywords: 'লাইভ পরীক্ষা, লাইভ মডেল টেস্ট, বিসিএস লাইভ এক্সাম, BCS live model test, সরকারি চাকরি লাইভ পরীক্ষা, জব মডেল টেস্ট, অনলাইন কুইজ, Medha Exam live',
    canonicalPath: '/live-exam',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'লাইভ মডেল টেস্ট ও মেধা তালিকা — Medha Exam',
      'url': `${BASE_SITE_URL}/live-exam`,
      'description': 'বিসিএস ও নিয়োগ পরীক্ষার রিয়েল-টাইম লাইভ মডেল টেস্টে অংশ নিয়ে তাৎক্ষণিক রেজাল্ট এবং জাতীয় মেরিট পজিশন জানুন।',
      'about': {
        '@type': 'EducationalOccupationalCredential',
        'credentialCategory': 'Government Job Preparation Exam'
      },
      'hasPart': [
        {
          '@type': 'Quiz',
          'name': 'বিসিএস ও সরকারি চাকরি লাইভ মডেল টেস্ট',
          'educationalLevel': 'Competitive Job Exam'
        }
      ]
    }
  },
  'job-questionbank': {
    title: 'মন্ত্রণালয়ভিত্তিক বিগত প্রশ্ন সমাধান — Medha Exam',
    description: 'সরকারি বিভিন্ন মন্ত্রণালয় ও অধিদপ্তরের বিগত নিয়োগ পরীক্ষার প্রশ্নব্যাংক এবং ব্যাখ্যাসহ নির্ভুল সমাধান অনুশীলন করুন।',
    keywords: 'প্রশ্নব্যাংক, মন্ত্রণালয় প্রশ্ন ব্যাংক, সরকারি চাকরি প্রশ্ন সমাধান, বিগত সালের প্রশ্ন, Job Question Bank, Ministry Question Bank Bangladesh, বিসিএস প্রশ্ন ব্যাংক',
    canonicalPath: '/job-questionbank',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'মন্ত্রণালয়ভিত্তিক বিগত প্রশ্ন সমাধান — Medha Exam',
      'url': `${BASE_SITE_URL}/job-questionbank`,
      'description': 'সরকারি বিভিন্ন মন্ত্রণালয় ও অধিদপ্তরের বিগত নিয়োগ পরীক্ষার প্রশ্নব্যাংক এবং ব্যাখ্যাসহ নির্ভুল সমাধান অনুশীলন করুন।',
      'hasPart': [
        {
          '@type': 'LearningResource',
          'name': 'মন্ত্রণালয় নিয়োগ পরীক্ষার বিগত প্রশ্নব্যাংক ও সমাধান',
          'learningResourceType': 'Question Bank'
        }
      ]
    }
  },
  'study-materials': {
    title: 'বিসিএস লেকচার শিট ও স্টাডি ম্যাটেরিয়ালস — Medha Exam',
    description: 'বিসিএস ও সরকারি চাকরির প্রস্তুতিমূলক বিষয়ভিত্তিক লেকচার শিট, হ্যান্ডনোট এবং পিডিএফ সহজে ডাউনলোড করুন।',
    keywords: 'স্টাডি ম্যাটেরিয়ালস, বিসিএস লেকচার শিট, চাকরি প্রস্তুতি পিডিএফ, প্রাইমারি শিক্ষক নিয়োগ শিট, ব্যাংক প্রস্তুতি নোট, Medha Exam Study Materials',
    canonicalPath: '/study-materials',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'বিসিএস লেকচার শিট ও স্টাডি ম্যাটেরিয়ালস — Medha Exam',
      'url': `${BASE_SITE_URL}/study-materials`,
      'description': 'বিসিএস ও সরকারি চাকরির প্রস্তুতিমূলক বিষয়ভিত্তিক লেকচার শিট, হ্যান্ডনোট এবং পিডিএফ সহজে ডাউনলোড করুন।'
    }
  },
  'job-result': {
    title: 'সরকারি চাকরি পরীক্ষার ফলাফল — Medha Exam',
    description: 'সকল সরকারি ও ব্যাংক নিয়োগ পরীক্ষার সর্বশেষ ফলাফল রোল নম্বর দিয়ে সহজে ও দ্রুত সার্চ করে দেখুন।',
    keywords: 'চাকরি পরীক্ষার ফলাফল, সরকারি চাকরির রেজাল্ট, নিয়োগ পরীক্ষার রেজাল্ট, job exam result bangladesh, bcs result, রোল নম্বর দিয়ে রেজাল্ট যাচাই, Medha Exam Job Results',
    canonicalPath: '/all-job-result',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'সরকারি চাকরি পরীক্ষার ফলাফল — Medha Exam',
      'url': `${BASE_SITE_URL}/all-job-result`,
      'description': 'সকল সরকারি ও ব্যাংক নিয়োগ পরীক্ষার সর্বশেষ ফলাফল রোল নম্বর দিয়ে সহজে ও দ্রুত সার্চ করে দেখুন।'
    }
  },
  'age-calculator': {
    title: 'চাকরির বয়স ক্যালকুলেটর ও হিসাব — Medha Exam',
    description: 'সরকারি চাকরির নিয়োগ সার্কুলার অনুযায়ী আপনার বয়স কত বছর, মাস ও দিন তা নিমেষেই নির্ভুলভাবে গণনা করুন।',
    keywords: 'চাকরির বয়স ক্যালকুলেটর, সরকারি চাকরির বয়স গণনা, সার্কুলার বয়স ক্যালকুলেটর, BCS age calculator, job age calculator bangladesh, মেধা এক্সাম বয়স ক্যালকুলেটর',
    canonicalPath: '/age-calculator',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'চাকরির বয়স ক্যালকুলেটর ও হিসাব — Medha Exam',
      'url': `${BASE_SITE_URL}/age-calculator`,
      'applicationCategory': 'UtilityApplication',
      'operatingSystem': 'All',
      'description': 'সরকারি চাকরির নিয়োগ সার্কুলার অনুযায়ী আপনার বয়স কত বছর, মাস ও দিন তা নিমেষেই নির্ভুলভাবে গণনা করুন।',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'BDT'
      }
    }
  },
  'daily-practice': {
    title: 'দৈনিক প্র্যাকটিস ও কুইজ — Medha Exam',
    description: 'প্রতিদিন বিষয়ভিত্তিক প্রশ্ন প্র্যাকটিস ও স্পেশাল কুইজ অনুশীলনের মাধ্যমে চাকরি পরীক্ষার প্রস্তুতি নিন।',
    keywords: 'দৈনিক প্র্যাকটিস, জব কুইজ, সাধারণ জ্ঞান অনুশীলন, বিসিএস প্র্যাকটিস, Daily Job Practice',
    canonicalPath: '/daily-practice',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  'wrong-questions': {
    title: 'ভুল উত্তর রিভিউ ও রিভিশন — Medha Exam',
    description: 'মডেল টেস্ট ও কুইজে আপনার ভুল হওয়া প্রশ্নগুলো আলাদাভাবে রিভিশন ও অনুশীলন করে দুর্বলতা দূর করুন মেধা এক্সামে।',
    keywords: 'ভুল উত্তর রিভিউ, প্রশ্ন রিভিশন, চাকরি পরীক্ষা প্রস্তুতি, Medha Exam revision',
    canonicalPath: '/wrong-questions',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  faq: {
    title: 'সাধারণ জিজ্ঞাসা ও FAQ — Medha Exam',
    description: 'মেধা এক্সামে লাইভ পরীক্ষা দেওয়া, রেজাল্ট যাচাই ও একাউন্ট ব্যবহার সম্পর্কিত প্রয়োজনীয় তথ্যাবলী জানুন।',
    keywords: 'মেধা এক্সাম এফএকিউ, Medha Exam FAQ, পরীক্ষা নিয়মাবলী, রেজাল্ট দেখার নিয়ম, হেল্প সেন্টার',
    canonicalPath: '/faq',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'মেধা এক্সামে কীভাবে লাইভ মডেল টেস্ট বা পরীক্ষা দেব?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': "মেধা এক্সাম পোর্টালে লগইন করে 'লাইভ পরীক্ষা' সেকশনে যান। সেখানে নির্ধারিত সময়ে শুরু হওয়া পরীক্ষায় ক্লিক করে সময়সীমার মধ্যে পরীক্ষা সম্পন্ন করে জমা দিন।"
          }
        },
        {
          '@type': 'Question',
          'name': 'মেধা এক্সামে পরীক্ষার রেজাল্ট ও মেধা তালিকা কখন দেখতে পারব?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'পরীক্ষা সাবমিট করার সাথে সাথেই তাৎক্ষণিক স্কোর এবং সঠিক-ভুল উত্তরের ব্যাখ্যা দেখতে পাবেন। পরীক্ষা সমাপ্তির পর পূর্ণাঙ্গ জাতীয় ও ব্যাচ মেধা তালিকা প্রকাশিত হয়।'
          }
        },
        {
          '@type': 'Question',
          'name': 'মেধা এক্সামে কোন কোন চাকরির পরীক্ষার প্রস্তুতি নেওয়া যায়?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'বিসিএস (BCS), সরকারি ব্যাংক নিয়োগ, প্রাথমিক সহকারী শিক্ষক নিয়োগ, NTRCA শিক্ষক নিবন্ধন এবং বিভিন্ন মন্ত্রণালয় ও অধিদপ্তরের পরীক্ষার প্রস্তুতি নেওয়া যায়।'
          }
        }
      ]
    }
  },
  'terms-and-conditions': {
    title: 'ব্যবহারের শর্তাবলী ও নিয়ম — Medha Exam',
    description: 'মেধা এক্সাম প্ল্যাটফর্মের ব্যবহারবিধি, পরীক্ষার নীতিমালা এবং সেবাসমূহ গ্রহণের আইনি শর্তাবলী বিস্তারিত জানুন।',
    keywords: 'Terms and conditions, ব্যবহারের শর্তাবলী, মেধা এক্সাম নিয়মাবলী',
    canonicalPath: '/terms-and-conditions',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  'privacy-policy': {
    title: 'গোপনীয়তা নীতিমালা ও সুরক্ষা — Medha Exam',
    description: 'মেধা এক্সাম ব্যবহারকারীদের ব্যক্তিগত তথ্যের নিরাপত্তা ও ডেটা সংরক্ষণ সংক্রান্ত নীতিমালা জানুন।',
    keywords: 'Privacy policy, গোপনীয়তা নীতিমালা, মেধা এক্সাম ডেটা পলিসি',
    canonicalPath: '/privacy-policy',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  'delete-account': {
    title: 'অ্যাকাউন্ট ডিলিট করার নিয়মাবলী — Medha Exam',
    description: 'মেধা এক্সাম অ্যাকাউন্ট এবং সংশ্লিষ্ট ব্যক্তিগত তথ্য ও ডেটা স্থায়ীভাবে মুছে ফেলার নিয়মাবলী ও অনুরোধের মাধ্যম।',
    keywords: 'অ্যাকাউন্ট ডিলিট, delete account medha exam',
    canonicalPath: '/delete-account',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  'about-us': {
    title: 'About Us (আমাদের সম্পর্কে) — Medha Exam',
    description: 'মেধা এক্সাম প্ল্যাটফর্মের লক্ষ্য, উদ্দেশ্য এবং বিসিএস ও সরকারি চাকরি প্রার্থীদের প্রস্তুতি সহায়িকা সম্পর্কে জানুন।',
    keywords: 'About Us, আমাদের সম্পর্কে, মেধা এক্সাম পরিচিতি',
    canonicalPath: '/about-us',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  'contact-us': {
    title: 'Contact Us (যোগাযোগ) — Medha Exam',
    description: 'মেধা এক্সামের সাথে যোগাযোগ, হেল্পলাইন নম্বর, ইমেইল এবং অফিসিয়াল সোশ্যাল মিডিয়া সাপোর্ট চ্যানেল।',
    keywords: 'Contact Us, যোগাযোগ, হেল্পলাইন, কাস্টমার সাপোর্ট',
    canonicalPath: '/contact-us',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  login: {
    title: 'লগইন করুন | মেধা এক্সাম একাউন্ট — Medha Exam',
    description: 'আপনার মেধা এক্সাম অ্যাকাউন্টে লগইন করে বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার লাইভ মডেল টেস্টে অংশগ্রহণ করুন।',
    keywords: 'মেধা এক্সাম লগইন, Medha exam login, student login',
    canonicalPath: '/login',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  register: {
    title: 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন — Medha Exam',
    description: 'মেধা এক্সামে ফ্রি রেজিস্ট্রেশন করে প্রতিদিনের লাইভ মডেল টেস্ট, মেধা তালিকা ও বিষয়ভিত্তিক স্টাডি ম্যাটেরিয়ালস সুবিধা উপভোগ করুন।',
    keywords: 'মেধা এক্সাম রেজিস্ট্রেশন, Medha exam registration, create account',
    canonicalPath: '/registration',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  referral: {
    title: 'রেফারেল প্রোগ্রাম ও রিওয়ার্ড আর্নিং — Medha Exam',
    description: 'বন্ধুদের মেধা এক্সামে আমন্ত্রণ জানিয়ে জিতে নিন বিশেষ পুরস্কার ও রিওয়ার্ড পয়েন্ট। শেয়ার করুন আপনার রেফারেল কোড।',
    keywords: 'রেফারেল প্রোগ্রাম, মেধা এক্সাম রেফার, referral reward',
    canonicalPath: '/referral',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  dashboard: {
    title: 'ইউজার ড্যাশবোর্ড | প্রস্তুতি ও ফলাফল এনালাইসিস — Medha Exam',
    description: 'আপনার মেধা এক্সাম পার্সোনাল ড্যাশবোর্ডে পরীক্ষার ফলাফল, মেধার অগ্রগতি গ্রাফ, স্টাডি হিটম্যাপ এবং ডেইলি স্ট্রাক ট্র্যাক করুন।',
    keywords: 'মেধা এক্সাম ড্যাশবোর্ড, স্টুডেন্ট ড্যাশবোর্ড, মেধার অগ্রগতি, student dashboard',
    canonicalPath: '/dashboard',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  profile: {
    title: 'আমার প্রোফাইল ও সার্টিফিকেট — Medha Exam',
    description: 'আপনার মেধা এক্সাম প্রোফাইল তথ্য, পরীক্ষার সার্টিফিকেট এবং অ্যাকাউন্ট সেটিংস পরিচালনা করুন।',
    keywords: 'মেধা এক্সাম প্রোফাইল, ইউজার প্রোফাইল, পরীক্ষা সার্টিফিকেট',
    canonicalPath: '/profile',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  exam: {
    title: 'অনলাইন মডেল টেস্ট ও কুইজ চলছে — Medha Exam',
    description: 'মেধা এক্সামের লাইভ মডেল টেস্টে অংশ নিন। নির্দিষ্ট সময়ের মধ্যে নির্ভুল উত্তর দিয়ে মেধা তালিকায় শীর্ষস্থান অর্জন করুন।',
    keywords: 'লাইভ পরীক্ষা, অনলাইন পরীক্ষা, মডেল টেস্ট, MCQ কুইজ',
    canonicalPath: '/exam',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  result: {
    title: 'পরীক্ষার ফলাফল ও মেরিট শিট — Medha Exam',
    description: 'মেধা এক্সামের পরীক্ষার বিস্তারিত ফলাফল, বিষয়ভিত্তিক নম্বর বিশ্লেষণ, সঠিক ও ভুল উত্তরের সমাধান এবং মেধা পজিশন দেখুন।',
    keywords: 'পরীক্ষার রেজাল্ট, মেরিট লিস্ট, সমাধান শিট, exam result',
    canonicalPath: '/result',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  admin: {
    title: 'এডমিন কন্ট্রোল প্যানেল — Medha Exam',
    description: 'মেধা এক্সাম প্ল্যাটফর্মের পরীক্ষা তৈরি, প্রশ্ন ব্যাংক পরিচালনা, ইউজার ও পেমেন্ট ব্যবস্থাপনার প্রশাসনিক ড্যাশবোর্ড।',
    keywords: 'এডমিন প্যানেল, Medha Exam admin',
    canonicalPath: '/admin',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  },
  articles: {
    title: 'আর্টিকেল ও গাইডলাইন — বিসিএস ও সরকারি চাকরির প্রস্তুতি | Medha Exam',
    description: 'বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার সফল প্রস্তুতি, বিষয়ভিত্তিক শর্টকাট, পড়ার রুটিন ও ক্যারিয়ার গাইডলাইন বিষয়ক দরকারি আর্টিকেল পড়ুন।',
    keywords: 'আর্টিকেল, বিসিএস প্রস্তুতি টিপস, সরকারি চাকরি গাইডলাইন, বিসিএস বুক লিস্ট, পড়ার নিয়মাবলী, Medha Exam articles',
    canonicalPath: '/articles',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'আর্টিকেল ও গাইডলাইন — বিসিএস ও সরকারি চাকরির প্রস্তুতি | Medha Exam',
      'url': `${BASE_SITE_URL}/articles`,
      'description': 'বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার সফল প্রস্তুতি, বিষয়ভিত্তিক শর্টকাট, পড়ার রুটিন ও ক্যারিয়ার গাইডলাইন বিষয়ক দরকারি আর্টিকেল পড়ুন।',
    },
  },
};

/**
 * Normalizes input view or pathname into a recognized SEO key
 */
export function normalizeViewKey(input: string): string {
  if (!input) return 'home';

  // Strip query string and hashes
  const clean = input.split('?')[0].split('#')[0].toLowerCase().trim().replace(/\/$/, '') || '/';

  if (
    clean === '/live-exam' ||
    clean === 'live-exam' ||
    clean === '/live-exams' ||
    clean === 'live-exams' ||
    clean === '/liveexam' ||
    clean === 'liveexam'
  ) {
    return 'live-exam';
  }

  if (
    clean === '/job-questionbank' ||
    clean === 'job-questionbank' ||
    clean === '/questionbank' ||
    clean === 'questionbank' ||
    clean === '/question-bank' ||
    clean === 'question-bank' ||
    clean === '/jobquestionbank' ||
    clean === 'jobquestionbank'
  ) {
    return 'job-questionbank';
  }

  if (clean === '/registration' || clean === 'registration' || clean === '/register' || clean === 'register') {
    return 'register';
  }

  if (clean === '/articles' || clean === 'articles' || clean === '/article' || clean.startsWith('/article/')) {
    return 'articles';
  }

  if (clean === '/about' || clean === '/about-us' || clean === 'about' || clean === 'about-us') {
    return 'about-us';
  }

  if (clean === '/contact' || clean === '/contact-us' || clean === 'contact' || clean === 'contact-us' || clean === '/contract-us') {
    return 'contact-us';
  }

  // Remove leading slash if any
  const key = clean.startsWith('/') ? clean.substring(1) : clean;
  return key || 'home';
}

/**
 * Retrieves the SEO configuration for a view or path
 */
export function getSEOConfig(viewOrPath: string): PageSEOConfig {
  const key = normalizeViewKey(viewOrPath);
  return SEO_PAGE_CONFIGS[key] || SEO_PAGE_CONFIGS.home;
}

export function extractFirstArticleImage(article?: {
  bannerImage?: string;
  content?: string;
} | null): string | undefined {
  if (!article) return undefined;

  const normalizeImg = (raw?: string): string | undefined => {
    const trimmed = (raw || '').trim();
    if (!trimmed || trimmed.startsWith('data:')) return undefined;
    if (trimmed.startsWith('http://res.cloudinary.com/')) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    if (trimmed.startsWith('/')) {
      return `${BASE_SITE_URL}${trimmed}`;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return undefined;
  };

  const banner = normalizeImg(article.bannerImage);
  if (banner) return banner;

  const content = article.content || '';
  const mdMatch = content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/i);
  if (mdMatch?.[1]) {
    const found = normalizeImg(mdMatch[1]);
    if (found) return found;
  }

  const htmlMatch = content.match(/<img[^>]+src=["'](https?:\/\/[^"']+|\/[^"']+)["']/i);
  if (htmlMatch?.[1]) {
    const found = normalizeImg(htmlMatch[1]);
    if (found) return found;
  }

  return undefined;
}

function inferImageMimeType(url: string): string | null {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.png')) return 'image/png';
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  if (cleanUrl.endsWith('.gif')) return 'image/gif';
  return null;
}

/**
 * Updates document title, meta tags, OpenGraph, Twitter, and Schema.org JSON-LD dynamically.
 * Works seamlessly in client-side React SPA environments upon route/view transitions.
 */
export function applySEO(viewOrPath: string, overrides?: Partial<PageSEOConfig>): PageSEOConfig {
  if (typeof document === 'undefined') {
    return SEO_PAGE_CONFIGS.home;
  }

  const baseConfig = getSEOConfig(viewOrPath);
  const config: PageSEOConfig = {
    ...baseConfig,
    ...(overrides || {}),
  };

  const canonicalUrl = `${BASE_SITE_URL}${config.canonicalPath}`;
  const ogImg = config.ogImage || DEFAULT_OG_IMAGE;
  const isDefaultOg = ogImg === DEFAULT_OG_IMAGE;

  // 1. Update Document Title
  if (config.title) {
    document.title = config.title;
  }

  // Helper to safely set/update a meta element
  const setMeta = (attrName: string, attrVal: string, content: string) => {
    if (!content) return;
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const removeMeta = (attrName: string, attrVal: string) => {
    const el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (el) el.remove();
  };

  // 2. Standard Meta Tags
  setMeta('name', 'description', config.description);
  if (config.keywords) {
    setMeta('name', 'keywords', config.keywords);
  }

  // 3. OpenGraph Social Card Tags
  setMeta('property', 'og:title', config.title);
  setMeta('property', 'og:description', config.description);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:type', config.ogType || 'website');
  setMeta('property', 'og:image', ogImg);
  setMeta('property', 'og:image:secure_url', ogImg.replace(/^http:\/\//i, 'https://'));

  if (isDefaultOg) {
    setMeta('property', 'og:image:type', 'image/png');
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
  } else {
    const inferredMime = inferImageMimeType(ogImg);
    if (inferredMime) {
      setMeta('property', 'og:image:type', inferredMime);
    } else {
      removeMeta('property', 'og:image:type');
    }
    removeMeta('property', 'og:image:width');
    removeMeta('property', 'og:image:height');
  }

  setMeta(
    'property',
    'og:image:alt',
    isDefaultOg ? `${config.title} — Medha Exam Official Logo & Social Banner` : config.title
  );
  setMeta('property', 'og:site_name', 'Medha Exam');
  setMeta('property', 'og:locale', 'bn_BD');

  // 4. Twitter / X Card Tags
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:site', '@medhaexam');
  setMeta('name', 'twitter:title', config.title);
  setMeta('name', 'twitter:description', config.description);
  setMeta('name', 'twitter:image', ogImg);
  setMeta(
    'name',
    'twitter:image:alt',
    isDefaultOg ? `${config.title} — Medha Exam Official Logo & Social Banner` : config.title
  );

  // 5. Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // 6. Dynamic JSON-LD structured data
  const scriptId = 'page-specific-jsonld';
  let ldJsonEl = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (config.structuredData) {
    if (!ldJsonEl) {
      ldJsonEl = document.createElement('script');
      ldJsonEl.id = scriptId;
      ldJsonEl.type = 'application/ld+json';
      document.head.appendChild(ldJsonEl);
    }
    ldJsonEl.textContent = JSON.stringify(config.structuredData);
  } else if (ldJsonEl) {
    ldJsonEl.remove();
  }

  return config;
}
