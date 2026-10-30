/**
 * Post-build script to generate dedicated static HTML files for all public routes.
 * This guarantees Netlify and search engine crawlers (Googlebot, Bingbot) receive
 * unique page titles, unique meta descriptions (snippets), and rich OpenGraph/Schema tags
 * without relying exclusively on client-side JS hydration.
 */

import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.warn('⚠️  dist/index.html not found. Run vite build first.');
  process.exit(0);
}

const template = fs.readFileSync(templatePath, 'utf-8');

const BASE_URL = 'https://medhaexam.site';

const PAGES = [
  {
    path: '/all-job-result',
    title: 'চাকরি পরীক্ষার ফলাফল  | সরকারি চাকরির রেজাল্ট – Medha Exam',
    description: 'Medha Exam থেকে বিভিন্ন সরকারি চাকরির পরীক্ষার ফলাফল দেখুন। পরীক্ষার শিরোনাম নির্বাচন করে আপনার রোল নম্বর দিয়ে সহজেই ফলাফল যাচাই করুন।',
    keywords: 'চাকরি পরীক্ষার ফলাফল, সরকারি চাকরির রেজাল্ট, নিয়োগ পরীক্ষার ফলাফল, job exam result bangladesh, bcs result, রোল নম্বর দিয়ে রেজাল্ট যাচাই, Medha Exam Job Results',
  },
  {
    path: '/age-calculator',
    title: 'চাকরির বয়স ক্যালকুলেটর | বিসিএস ও সরকারি চাকরির বয়স হিসাব — Medha Exam',
    description: 'সরকারি চাকরি ও ব্যাংক নিয়োগ সার্কুলারের নির্ধারিত তারিখ অনুযায়ী নির্ভুল বয়স হিসাব করুন। আপনার বয়স কত বছর, মাস ও দিন তা নিমেষেই গণনা করুন মেধা এক্সামে।',
    keywords: 'চাকরির বয়স ক্যালকুলেটর, সরকারি চাকরির বয়স গণনা, সার্কুলার বয়স ক্যালকুলেটর, BCS age calculator, job age calculator bangladesh, মেধা এক্সাম বয়স ক্যালকুলেটর',
  },
  {
    path: '/study-materials',
    title: 'স্টাডি ম্যাটেরিয়ালস ও লেকচার শিট | বিসিএস ও চাকরি প্রস্তুতি — Medha Exam',
    description: 'বিসিএস, প্রাথমিক শিক্ষক নিয়োগ ও সরকারি ব্যাংকের প্রস্তুতিমূলক বিষয়ভিত্তিক পিডিএফ, লেকচার শিট, হ্যান্ডনোট ও স্টাডি ম্যাটেরিয়ালস সংগ্রহ ও ডাউনলোড করুন।',
    keywords: 'স্টাডি ম্যাটেরিয়ালস, বিসিএস লেকচার শিট, চাকরি প্রস্তুতি পিডিএফ, প্রাইমারি শিক্ষক নিয়োগ শিট, ব্যাংক প্রস্তুতি নোট, Medha Exam Study Materials',
  },
  {
    path: '/daily-practice',
    title: 'দৈনিক প্র্যাকটিস ও কুইজ প্রস্তুতি — Medha Exam',
    description: 'প্রতিদিন বিষয়ভিত্তিক প্রশ্ন প্র্যাকটিস ও স্পেশাল কুইজ অনুশীলনের মাধ্যমে বিসিএস ও সরকারি চাকরি পরীক্ষার পূর্ণ প্রস্তুতি নিশ্চিত করুন।',
    keywords: 'দৈনিক প্র্যাকটিস, জব কুইজ, সাধারণ জ্ঞান অনুশীলন, বিসিএস প্র্যাকটিস, Daily Job Practice',
  },
  {
    path: '/faq',
    title: 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ) — Medha Exam',
    description: 'মেধা এক্সামে লাইভ মডেল টেস্ট দেওয়া, রেজাল্ট শিট, মেধা তালিকা ও একাউন্ট ব্যবহার সম্পর্কিত সাধারণ প্রশ্নের উত্তর বিস্তারিত জানুন।',
    keywords: 'মেধা এক্সাম এফএকিউ, Medha Exam FAQ, পরীক্ষা নিয়মাবলী, রেজাল্ট দেখার নিয়ম, হেল্প সেন্টার',
  },
  {
    path: '/terms-and-conditions',
    title: 'ব্যবহারের শর্তাবলী ও নিয়মাবলী (Terms & Conditions) — Medha Exam',
    description: 'মেধা এক্সাম (medhaexam.site) পোর্টাল ব্যবহারের নিয়মাবলী, পরীক্ষার শর্তাবলী, পেমেন্ট ও মেম্বারশিপ সংক্রান্ত আইনি শর্তাবলী বিস্তারিত জানুন।',
    keywords: 'Terms and conditions, ব্যবহারের শর্তাবলী, মেধা এক্সাম নিয়মাবলী',
  },
  {
    path: '/privacy-policy',
    title: 'গোপনীয়তা নীতিমালা (Privacy Policy) — Medha Exam',
    description: 'মেধা এক্সাম ব্যবহারকারীদের ব্যক্তিগত তথ্য সুরক্ষা, নিরাপত্তা, কুকিজ ও ডেটা সংরক্ষণ নীতিমালা সম্পর্কে স্পষ্ট ধারণা নিন।',
    keywords: 'Privacy policy, গোপনীয়তা নীতিমালা, মেধা এক্সাম ডেটা পলিসি',
  },
  {
    path: '/delete-account',
    title: 'অ্যাকাউন্ট ডিলিট করার নিয়মাবলী — Medha Exam',
    description: 'মেধা এক্সাম অ্যাকাউন্ট এবং সংশ্লিষ্ট ব্যক্তিগত তথ্য ও ডেটা স্থায়ীভাবে মুছে ফেলার নিয়মাবলী ও অনুরোধের মাধ্যম।',
    keywords: 'অ্যাকাউন্ট ডিলিট, delete account medha exam',
  },
  {
    path: '/registration',
    title: 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন — Medha Exam',
    description: 'মেধা এক্সামে ফ্রি রেজিস্ট্রেশন করে প্রতিদিনের লাইভ মডেল টেস্ট, মেধা তালিকা ও বিষয়ভিত্তিক স্টাডি ম্যাটেরিয়ালস সুবিধা উপভোগ করুন।',
    keywords: 'মেধা এক্সাম রেজিস্ট্রেশন, Medha exam registration, create account',
  },
  {
    path: '/login',
    title: 'লগইন করুন | মেধা এক্সাম একাউন্ট — Medha Exam',
    description: 'আপনার মেধা এক্সাম অ্যাকাউন্টে লগইন করে বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার লাইভ মডেল টেস্টে অংশগ্রহণ করুন।',
    keywords: 'মেধা এক্সাম লগইন, Medha exam login, student login',
  },
  {
    path: '/referral',
    title: 'রেফারেল প্রোগ্রাম ও রিওয়ার্ড আর্নিং — Medha Exam',
    description: 'বন্ধুদের মেধা এক্সামে আমন্ত্রণ জানিয়ে জিতে নিন বিশেষ পুরস্কার ও রিওয়ার্ড পয়েন্ট। শেয়ার করুন আপনার রেফারেল কোড।',
    keywords: 'রেফারেল প্রোগ্রাম, মেধা এক্সাম রেফার, referral reward',
  }
];

function generateHtmlForPage(page) {
  let html = template;
  const canonicalUrl = `${BASE_URL}${page.path}`;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${page.title}</title>`);

  // Replace Description
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${page.description}" />`
  );

  // Replace or add Keywords
  if (page.keywords) {
    if (/<meta\s+name=["']keywords["']/i.test(html)) {
      html = html.replace(
        /<meta\s+name=["']keywords["']\s+content=["'].*?["']\s*\/?>/i,
        `<meta name="keywords" content="${page.keywords}" />`
      );
    }
  }

  // Replace Canonical Link
  html = html.replace(
    /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Replace OpenGraph Title & Description
  html = html.replace(
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${page.title}" />`
  );
  html = html.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${page.description}" />`
  );
  html = html.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  // Replace Twitter Title & Description
  html = html.replace(
    /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:title" content="${page.title}" />`
  );
  html = html.replace(
    /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:description" content="${page.description}" />`
  );

  // Replace fallback crawler <h1> and <p> inside #seo-crawler-content
  html = html.replace(
    /<main id="seo-crawler-content"[^>]*>[\s\S]*?<\/main>/i,
    `<main id="seo-crawler-content" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
        <h1>${page.title}</h1>
        <p>${page.description}</p>
      </main>`
  );

  return html;
}

for (const page of PAGES) {
  const routeFolder = path.join(distDir, page.path.replace(/^\//, ''));
  if (!fs.existsSync(routeFolder)) {
    fs.mkdirSync(routeFolder, { recursive: true });
  }
  const destHtmlPath = path.join(routeFolder, 'index.html');
  const customizedHtml = generateHtmlForPage(page);
  fs.writeFileSync(destHtmlPath, customizedHtml, 'utf-8');
  console.log(`✅ Generated dedicated SEO static entry: ${destHtmlPath}`);
}

console.log('🎉 All public route SEO static pages generated successfully!');
