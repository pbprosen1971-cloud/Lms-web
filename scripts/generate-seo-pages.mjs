/**
 * Post-build script to generate dedicated static HTML files for all public routes.
 * This guarantees Netlify, Cloud Run, and search engine crawlers (Googlebot, Bingbot) receive
 * unique page titles, unique meta descriptions (snippets), rich OpenGraph/Schema tags,
 * and comprehensive semantic content without relying exclusively on client-side JS hydration.
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
    title: 'সরকারি চাকরি পরীক্ষার ফলাফল — Medha Exam',
    description: 'সকল সরকারি ও ব্যাংক নিয়োগ পরীক্ষার সর্বশেষ ফলাফল রোল নম্বর দিয়ে সহজে ও দ্রুত সার্চ করে দেখুন।',
    keywords: 'চাকরি পরীক্ষার ফলাফল, সরকারি চাকরির রেজাল্ট, নিয়োগ পরীক্ষার ফলাফল, job exam result bangladesh, bcs result, রোল নম্বর দিয়ে রেজাল্ট যাচাই, Medha Exam Job Results',
    heading: 'সরকারি চাকরি পরীক্ষার ফলাফল ও রোল নম্বর যাচাই',
    bodyText: 'মেধা এক্সাম রেজাল্ট পোর্টালে বিভিন্ন সরকারি অধিদপ্তর, মন্ত্রণালয়, স্বায়ত্তশাসিত প্রতিষ্ঠান ও ব্যাংকের নিয়োগ পরীক্ষার ফলাফল নিয়মিত হালনাগাদ করা হয়। এখানে পরীক্ষার নাম নির্বাচন করে আপনার রোল নম্বর সার্চ করে মুহূর্তেই ফলাফল ও উত্তীর্ণের অবস্থা যাচাই করতে পারবেন।'
  },
  {
    path: '/study-materials',
    title: 'বিসিএস লেকচার শিট ও স্টাডি ম্যাটেরিয়ালস — Medha Exam',
    description: 'বিসিএস ও সরকারি চাকরির প্রস্তুতিমূলক বিষয়ভিত্তিক লেকচার শিট, হ্যান্ডনোট এবং পিডিএফ সহজে ডাউনলোড করুন।',
    keywords: 'স্টাডি ম্যাটেরিয়ালস, বিসিএস লেকচার শিট, চাকরি প্রস্তুতি পিডিএফ, প্রাইমারি শিক্ষক নিয়োগ শিট, ব্যাংক প্রস্তুতি নোট, Medha Exam Study Materials',
    heading: 'বিসিএস ও সরকারি চাকরি প্রস্তুতি স্টাডি ম্যাটেরিয়ালস',
    bodyText: 'বাংলা সাহিত্য ও ব্যাকরণ, ইংরেজি ভাষা ও সাহিত্য, সাধারণ গণিত, মানসিক দক্ষতা, বাংলাদেশ বিষয়াবলী, আন্তর্জাতিক বিষয়াবলী, সাধারণ বিজ্ঞান ও কম্পিউটার প্রযুক্তি সহ সরকারি চাকরি পরীক্ষার সকল বিষয়ের পূর্ণাঙ্গ অধ্যায়ভিত্তিক লেকচার শিট, হ্যান্ডনোট ও স্টাডি ম্যাটেরিয়ালস এখানে পাওয়া যায়।'
  },
  {
    path: '/live-exam',
    title: 'লাইভ মডেল টেস্ট ও মেধা তালিকা — Medha Exam',
    description: 'বিসিএস ও নিয়োগ পরীক্ষার রিয়েল-টাইম লাইভ মডেল টেস্টে অংশ নিয়ে তাৎক্ষণিক রেজাল্ট এবং জাতীয় মেরিট পজিশন জানুন।',
    keywords: 'লাইভ মডেল টেস্ট, বিসিএস লাইভ এক্সাম, সরকারি চাকরি পরীক্ষা, BCS Live Exam, Online Model Test Bangladesh, মেধা তালিকা',
    heading: 'অনলাইন লাইভ মডেল টেস্ট ও মেধা যাচাই',
    bodyText: 'প্রকৃত পরীক্ষার পরিবেশে সময়সীমা অনুযায়ী অনলাইন এমসিকিউ মডেল টেস্টে অংশ নিন। পরীক্ষা শেষে বিস্তারিত ব্যাখ্যাসহ উত্তরপত্র এবং দেশব্যাপী শিক্ষার্থীদের মাঝে আপনার মেধাতালিকা ও অবস্থান পর্যবেক্ষণ করুন।'
  },
  {
    path: '/job-questionbank',
    title: 'মন্ত্রণালয়ভিত্তিক বিগত প্রশ্ন সমাধান — Medha Exam',
    description: 'সরকারি বিভিন্ন মন্ত্রণালয় ও অধিদপ্তরের বিগত নিয়োগ পরীক্ষার প্রশ্নব্যাংক এবং ব্যাখ্যাসহ নির্ভুল সমাধান অনুশীলন করুন।',
    keywords: 'চাকরি প্রশ্নব্যাংক, বিসিএস বিগত বছরের প্রশ্ন, ব্যাংক জব প্রশ্নব্যাংক, Job Question Bank Bangladesh, Previous Exam Questions',
    heading: 'চাকরি পরীক্ষার বিগত বছরের প্রশ্নব্যাংক ও ব্যাখ্যাসহ সমাধান',
    bodyText: '১০ম থেকে ৪৫তম বিসিএস প্রিলিমিনারি, সমন্বিত সরকারি ব্যাংক নিয়োগ পরীক্ষা, প্রাথমিক সহকারী শিক্ষক নিয়োগ এবং পিএসসি ও নন-ক্যাডার পরীক্ষার প্রশ্নপত্র এবং প্রতিটি প্রশ্নের নির্ভুল রেফারেন্স ও ব্যাখ্যা।'
  },
  {
    path: '/age-calculator',
    title: 'চাকরির বয়স ক্যালকুলেটর ও হিসাব — Medha Exam',
    description: 'সরকারি চাকরির নিয়োগ সার্কুলার অনুযায়ী আপনার বয়স কত বছর, মাস ও দিন তা নিমেষেই নির্ভুলভাবে গণনা করুন।',
    keywords: 'চাকরির বয়স ক্যালকুলেটর, সরকারি চাকরির বয়স গণনা, সার্কুলার বয়স ক্যালকুলেটর, BCS age calculator, job age calculator bangladesh, মেধা এক্সাম বয়স ক্যালকুলেটর',
    heading: 'সরকারি চাকরির বিজ্ঞপ্তি অনুযায়ী বয়স ক্যালকুলেটর',
    bodyText: 'নিয়োগ বিজ্ঞপ্তিতে উল্লেখিত নির্দিষ্ট তারিখ অনুযায়ী আপনার জন্মতারিখ দিয়ে নির্ভুলভাবে হিসাব করুন আপনার বর্তমান বয়স কত বছর, কত মাস এবং কত দিন হয়েছে। সাধারণ প্রার্থী ও কোটাধারীদের বয়সসীমা সহজেই মিলিয়ে নিন।'
  },
  {
    path: '/faq',
    title: 'সাধারণ জিজ্ঞাসা ও FAQ — Medha Exam',
    description: 'মেধা এক্সামে লাইভ পরীক্ষা দেওয়া, রেজাল্ট যাচাই ও একাউন্ট ব্যবহার সম্পর্কিত প্রয়োজনীয় তথ্যাবলী জানুন।',
    keywords: 'মেধা এক্সাম এফএকিউ, Medha Exam FAQ, পরীক্ষা নিয়মাবলী, রেজাল্ট দেখার নিয়ম, হেল্প সেন্টার',
    heading: 'মেধা এক্সাম ব্যবহার নির্দেশিকা ও সাধারণ প্রশ্নাবলী',
    bodyText: 'মেধা এক্সামে কীভাবে রেজিস্ট্রেশন করবেন, কীভাবে লাইভ পরীক্ষায় অংশ নেবেন, ফলাফল প্রকাশের নিয়মাবলী এবং প্রযুক্তিগত যেকোনো সহায়তার জন্য প্রশ্ন ও উত্তরগুলো বিস্তারিত জেনে নিন।'
  },
  {
    path: '/terms-and-conditions',
    title: 'ব্যবহারের শর্তাবলী ও নিয়ম — Medha Exam',
    description: 'মেধা এক্সাম প্ল্যাটফর্মের ব্যবহারবিধি, পরীক্ষার নীতিমালা এবং সেবাসমূহ গ্রহণের আইনি শর্তাবলী বিস্তারিত জানুন।',
    keywords: 'Terms and conditions, ব্যবহারের শর্তাবলী, মেধা এক্সাম নিয়মাবলী',
    heading: 'মেধা এক্সাম ব্যবহারের নিয়মাবলী ও শর্তাবলী',
    bodyText: 'মেধা এক্সাম প্ল্যাটফর্মের কন্টেন্ট ব্যবহার, পরীক্ষার নিয়মানুবর্তিতা, সাইট সিকিউরিটি এবং মেম্বারশিপ সম্পর্কিত শর্তাবলী বিস্তারিতভাবে বর্ণিত হয়েছে।'
  },
  {
    path: '/privacy-policy',
    title: 'গোপনীয়তা নীতিমালা ও সুরক্ষা — Medha Exam',
    description: 'মেধা এক্সামে শিক্ষার্থীদের ব্যক্তিগত তথ্য ও অ্যাকাউন্টের তথ্যের গোপনীয়তা এবং সুরক্ষা নীতিমালা জানুন।',
    keywords: 'Privacy policy, গোপনীয়তা নীতিমালা, মেধা এক্সাম ডেটা পলিসি',
    heading: 'মেধা এক্সাম গোপনীয়তা নীতিমালা ও ব্যবহারকারী তথ্য সুরক্ষা',
    bodyText: 'আমরা ব্যবহারকারীদের তথ্যের পূর্ণ গোপনীয়তা রক্ষা করি। আপনার মোবাইল নম্বর, ইমেইল ও অ্যাকাউন্টের তথ্যের গোপনীয়তা এবং নিরাপত্তা নিশ্চিত করতে আমরা প্রতিশ্রুতিবদ্ধ।'
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

  // Replace Schema.org BreadcrumbList / WebPage structured data
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': page.title,
    'description': page.description,
    'url': canonicalUrl,
    'inLanguage': 'bn',
    'isPartOf': {
      '@type': 'WebSite',
      'name': 'Medha Exam',
      'url': 'https://medhaexam.site/'
    },
    'breadcrumb': {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'হোম',
          'item': 'https://medhaexam.site/'
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': page.heading || page.title,
          'item': canonicalUrl
        }
      ]
    }
  };

  const schemaScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(pageSchema, null, 2)}\n    </script>`;
  html = html.replace('</head>', `${schemaScript}\n  </head>`);

  // Replace semantic crawler fallback with rich content AND valid internal navigation links!
  // This solves GSC "Crawled - currently not indexed" and "Referring page: None detected" issues.
  const crawlerHtml = `
      <main id="seo-crawler-content" style="max-width: 900px; margin: 0 auto; padding: 24px; font-family: system-ui, sans-serif; color: #1e293b;">
        <article>
          <header>
            <h1 style="font-size: 26px; font-weight: 800; color: #047857; margin-bottom: 12px;">${page.heading || page.title}</h1>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">${page.description}</p>
          </header>
          <section style="margin-top: 20px; font-size: 14px; line-height: 1.7; color: #475569;">
            <p>${page.bodyText}</p>
          </section>
          <nav aria-label="প্রধান নেভিগেশন লিংকসমূহ" style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; font-weight: bold; color: #64748b; margin-bottom: 8px;">মেধা এক্সাম গুরুত্বপূর্ণ লিঙ্কসমূহ:</p>
            <ul style="display: flex; flex-wrap: wrap; gap: 12px; list-style: none; padding: 0; margin: 0; font-size: 13px;">
              <li><a href="https://medhaexam.site/" style="color: #059669; text-decoration: underline;">হোম পেজ</a></li>
              <li><a href="https://medhaexam.site/live-exam" style="color: #059669; text-decoration: underline;">লাইভ এক্সাম</a></li>
              <li><a href="https://medhaexam.site/job-questionbank" style="color: #059669; text-decoration: underline;">প্রশ্নব্যাংক</a></li>
              <li><a href="https://medhaexam.site/all-job-result" style="color: #059669; text-decoration: underline;">চাকরি পরীক্ষার ফলাফল</a></li>
              <li><a href="https://medhaexam.site/study-materials" style="color: #059669; text-decoration: underline;">স্টাডি ম্যাটেরিয়ালস</a></li>
              <li><a href="https://medhaexam.site/age-calculator" style="color: #059669; text-decoration: underline;">বয়স ক্যালকুলেটর</a></li>
              <li><a href="https://medhaexam.site/faq" style="color: #059669; text-decoration: underline;">এফএকিউ</a></li>
              <li><a href="https://medhaexam.site/terms-and-conditions" style="color: #059669; text-decoration: underline;">ব্যবহারের শর্তাবলী</a></li>
              <li><a href="https://medhaexam.site/privacy-policy" style="color: #059669; text-decoration: underline;">গোপনীয়তা নীতিমালা</a></li>
            </ul>
          </nav>
        </article>
      </main>`;

  html = html.replace(
    /<main id="seo-crawler-content"[^>]*>[\s\S]*?<\/main>/i,
    crawlerHtml
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
