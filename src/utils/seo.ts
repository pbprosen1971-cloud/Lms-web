/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath: string;
  structuredData?: Record<string, any>;
}

export const BASE_SITE_URL = 'https://medhaexam.site';

export const SEO_PAGE_CONFIGS: Record<string, PageSEOConfig> = {
  home: {
    title: 'Medha Exam – সরকারি চাকরির MCQ ও অনলাইন মডেল টেস্ট',
    description: 'Medha Exam-এ BCS, সরকারি চাকরি ও নিয়োগ পরীক্ষার প্রস্তুতি নিন অনলাইন MCQ, বিষয়ভিত্তিক কুইজ, মডেল টেস্ট, ফলাফল বিশ্লেষণ এবং ব্যাখ্যাসহ প্রশ্নের মাধ্যমে।',
    keywords: 'মেধা এক্সাম, Medha Exam, Job Exam Portal, বিসিএস প্রস্তুতি, BCS Model Test, সরকারি চাকরি পরীক্ষা, ব্যাংক জব মডেল টেস্ট, প্রাইমারি শিক্ষক নিয়োগ পরীক্ষা, BCS Preliminary Exam, লাইভ পরীক্ষা, রেজাল্ট ও মেধাতালিকা',
    canonicalPath: '/',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'url': 'https://medhaexam.site/',
      'name': 'Medha Exam – সরকারি চাকরির MCQ ও অনলাইন মডেল টেস্ট',
      'alternateName': ['মেধা এক্সাম', 'Medha Exam', 'Job Exam Portal'],
      'description': 'Medha Exam-এ BCS, সরকারি চাকরি ও নিয়োগ পরীক্ষার প্রস্তুতি নিন অনলাইন MCQ, বিষয়ভিত্তিক কুইজ, মডেল টেস্ট, ফলাফল বিশ্লেষণ এবং ব্যাখ্যাসহ প্রশ্নের মাধ্যমে।',
      'inLanguage': 'bn'
    }
  },
  'age-calculator': {
    title: 'চাকরির বয়স ক্যালকুলেটর | বিসিএস ও সরকারি চাকরির বয়স হিসাব — Medha Exam',
    description: 'সরকারি চাকরি ও ব্যাংক নিয়োগ সার্কুলারের নির্ধারিত তারিখ অনুযায়ী নির্ভুল বয়স হিসাব করুন। আপনার বয়স কত বছর, মাস ও দিন তা নিমেষেই গণনা করুন মেধা এক্সামে।',
    keywords: 'চাকরির বয়স ক্যালকুলেটর, সরকারি চাকরির বয়স গণনা, সার্কুলার বয়স ক্যালকুলেটর, BCS age calculator, job age calculator bangladesh, মেধা এক্সাম বয়স ক্যালকুলেটর',
    canonicalPath: '/age-calculator',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'চাকরির বয়স ক্যালকুলেটর - Medha Exam',
      'url': 'https://medhaexam.site/age-calculator',
      'applicationCategory': 'UtilityApplication',
      'operatingSystem': 'All',
      'description': 'সরকারি চাকরি ও ব্যাংক নিয়োগ সার্কুলারের নির্ধারিত তারিখ অনুযায়ী নির্ভুল বয়স হিসাব করার অনলাইন ক্যালকুলেটর।',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'BDT'
      }
    }
  },
  'study-materials': {
    title: 'স্টাডি ম্যাটেরিয়ালস ও লেকচার শিট | বিসিএস ও চাকরি প্রস্তুতি — Medha Exam',
    description: 'বিসিএস, প্রাথমিক শিক্ষক নিয়োগ ও সরকারি ব্যাংকের প্রস্তুতিমূলক বিষয়ভিত্তিক পিডিএফ, লেকচার শিট, হ্যান্ডনোট ও স্টাডি ম্যাটেরিয়ালস সংগ্রহ ও ডাউনলোড করুন।',
    keywords: 'স্টাডি ম্যাটেরিয়ালস, বিসিএস লেকচার শিট, চাকরি প্রস্তুতি পিডিএফ, প্রাইমারি শিক্ষক নিয়োগ শিট, ব্যাংক প্রস্তুতি নোট, Medha Exam Study Materials',
    canonicalPath: '/study-materials',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'স্টাডি ম্যাটেরিয়ালস ও লেকচার শিট - Medha Exam',
      'url': 'https://medhaexam.site/study-materials',
      'description': 'সরকারি চাকরির পরীক্ষার প্রস্তুতিমূলক লেকচার শিট ও স্টাডি ম্যাটেরিয়ালস।'
    }
  },
  'daily-practice': {
    title: 'দৈনিক প্র্যাকটিস ও কুইজ প্রস্তুতি — Medha Exam',
    description: 'প্রতিদিন বিষয়ভিত্তিক প্রশ্ন প্র্যাকটিস ও স্পেশাল কুইজ অনুশীলনের মাধ্যমে বিসিএস ও সরকারি চাকরি পরীক্ষার পূর্ণ প্রস্তুতি নিশ্চিত করুন।',
    keywords: 'দৈনিক প্র্যাকটিস, জব কুইজ, সাধারণ জ্ঞান অনুশীলন, বিসিএস প্র্যাকটিস, Daily Job Practice',
    canonicalPath: '/daily-practice',
  },
  'wrong-questions': {
    title: 'ভুল উত্তর রিভিউ ও রিভিশন — Medha Exam',
    description: 'মডেল টেস্ট ও কুইজে আপনার ভুল হওয়া প্রশ্নগুলো আলাদাভাবে রিভিশন ও অনুশীলন করে দুর্বলতা দূর করুন মেধা এক্সামে।',
    keywords: 'ভুল উত্তর রিভিউ, প্রশ্ন রিভিশন, চাকরি পরীক্ষা প্রস্তুতি, Medha Exam revision',
    canonicalPath: '/wrong-questions',
  },
  faq: {
    title: 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ) — Medha Exam',
    description: 'মেধা এক্সামে লাইভ মডেল টেস্ট দেওয়া, রেজাল্ট শিট, মেধা তালিকা ও একাউন্ট ব্যবহার সম্পর্কিত সাধারণ প্রশ্নের উত্তর বিস্তারিত জানুন।',
    keywords: 'মেধা এক্সাম এফএকিউ, Medha Exam FAQ, পরীক্ষা নিয়মাবলী, রেজাল্ট দেখার নিয়ম, হেল্প সেন্টার',
    canonicalPath: '/faq',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'মেধা এক্সামে কীভাবে লাইভ মডেল টেস্ট বা পরীক্ষা দেব?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': "মেধা এক্সাম পোর্টালে লগইন করে 'লাইভ এক্সাম' সেকশনে যান। সেখানে নির্ধারিত সময়ে শুরু হওয়া পরীক্ষায় ক্লিক করে সময়সীমার মধ্যে পরীক্ষা সম্পন্ন করে জমা দিন।"
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
    title: 'ব্যবহারের শর্তাবলী ও নিয়মাবলী (Terms & Conditions) — Medha Exam',
    description: 'মেধা এক্সাম (medhaexam.site) পোর্টাল ব্যবহারের নিয়মাবলী, পরীক্ষার শর্তাবলী, পেমেন্ট ও মেম্বারশিপ সংক্রান্ত আইনি শর্তাবলী বিস্তারিত জানুন।',
    keywords: 'Terms and conditions, ব্যবহারের শর্তাবলী, মেধা এক্সাম নিয়মাবলী',
    canonicalPath: '/terms-and-conditions',
  },
  'privacy-policy': {
    title: 'গোপনীয়তা নীতিমালা (Privacy Policy) — Medha Exam',
    description: 'মেধা এক্সাম ব্যবহারকারীদের ব্যক্তিগত তথ্য সুরক্ষা, নিরাপত্তা, কুকিজ ও ডেটা সংরক্ষণ নীতিমালা সম্পর্কে স্পষ্ট ধারণা নিন।',
    keywords: 'Privacy policy, গোপনীয়তা নীতিমালা, মেধা এক্সাম ডেটা পলিসি',
    canonicalPath: '/privacy-policy',
  },
  'delete-account': {
    title: 'অ্যাকাউন্ট ডিলিট করার নিয়মাবলী — Medha Exam',
    description: 'মেধা এক্সাম অ্যাকাউন্ট এবং সংশ্লিষ্ট ব্যক্তিগত তথ্য ও ডেটা স্থায়ীভাবে মুছে ফেলার নিয়মাবলী ও অনুরোধের মাধ্যম।',
    keywords: 'অ্যাকাউন্ট ডিলিট, delete account medha exam',
    canonicalPath: '/delete-account',
  },
  login: {
    title: 'লগইন করুন | মেধা এক্সাম একাউন্ট — Medha Exam',
    description: 'আপনার মেধা এক্সাম অ্যাকাউন্টে লগইন করে বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার লাইভ মডেল টেস্টে অংশগ্রহণ করুন।',
    keywords: 'মেধা এক্সাম লগইন, Medha exam login, student login',
    canonicalPath: '/login',
  },
  register: {
    title: 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন — Medha Exam',
    description: 'মেধা এক্সামে ফ্রি রেজিস্ট্রেশন করে প্রতিদিনের লাইভ মডেল টেস্ট, মেধা তালিকা ও বিষয়ভিত্তিক স্টাডি ম্যাটেরিয়ালস সুবিধা উপভোগ করুন।',
    keywords: 'মেধা এক্সাম রেজিস্ট্রেশন, Medha exam registration, create account',
    canonicalPath: '/registration',
  },
  referral: {
    title: 'রেফারেল প্রোগ্রাম ও রিওয়ার্ড আর্নিং — Medha Exam',
    description: 'বন্ধুদের মেধা এক্সামে আমন্ত্রণ জানিয়ে জিতে নিন বিশেষ পুরস্কার ও রিওয়ার্ড পয়েন্ট। শেয়ার করুন আপনার রেফারেল কোড।',
    keywords: 'রেফারেল প্রোগ্রাম, মেধা এক্সাম রেফার, referral reward',
    canonicalPath: '/referral',
  }
};

/**
 * Updates document meta tags in the browser DOM dynamically upon route/view change.
 */
export function applySEO(view: string) {
  if (typeof document === 'undefined') return;

  const config = SEO_PAGE_CONFIGS[view] || SEO_PAGE_CONFIGS.home;
  const canonicalUrl = `${BASE_SITE_URL}${config.canonicalPath}`;

  // 1. Update Title
  document.title = config.title;

  // Helper to set/update a meta tag
  const setMeta = (attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Meta Tags
  setMeta('name', 'description', config.description);
  if (config.keywords) {
    setMeta('name', 'keywords', config.keywords);
  }

  // 3. OpenGraph Social Tags
  setMeta('property', 'og:title', config.title);
  setMeta('property', 'og:description', config.description);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:type', 'website');

  // 4. Twitter Card Tags
  setMeta('name', 'twitter:title', config.title);
  setMeta('name', 'twitter:description', config.description);

  // 5. Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // 6. Dynamic JSON-LD structured data if specified
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
}
