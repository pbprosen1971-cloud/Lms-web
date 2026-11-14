import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const svgPath = path.resolve('public/logo.svg');
const publicDir = path.resolve('public');

export async function generateOG() {
  const svgBuffer = fs.readFileSync(svgPath);

  // Render high-res crisp logo at 270x270
  const logo270Buffer = await sharp(svgBuffer)
    .resize(270, 270)
    .png()
    .toBuffer();

  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Base Background Mesh Gradient -->
      <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080e1a" />
        <stop offset="35%" stop-color="#051f18" />
        <stop offset="70%" stop-color="#032920" />
        <stop offset="100%" stop-color="#011812" />
      </linearGradient>

      <!-- Emerald Brand Gradient for Highlights -->
      <linearGradient id="emeraldText" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4ade80" />
        <stop offset="60%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#10b981" />
      </linearGradient>

      <!-- Blue Gradient for Accent -->
      <linearGradient id="blueAccent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#93c5fd" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>

      <!-- Card Inner Glass Gradient -->
      <linearGradient id="glassCard" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.07)" />
        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.015)" />
      </linearGradient>

      <!-- Pill Badge Gradient -->
      <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(16, 185, 129, 0.22)" />
        <stop offset="100%" stop-color="rgba(6, 182, 212, 0.16)" />
      </linearGradient>

      <!-- Soft Glow Radial Gradients -->
      <radialGradient id="glowLeft" cx="20%" cy="50%" r="42%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
        <stop offset="45%" stop-color="#059669" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#080e1a" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="glowRight" cx="80%" cy="28%" r="48%">
        <stop offset="0%" stop-color="#2563eb" stop-opacity="0.25" />
        <stop offset="50%" stop-color="#0284c7" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#080e1a" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="glowBottom" cx="55%" cy="92%" r="45%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#080e1a" stop-opacity="0" />
      </radialGradient>

      <!-- Logo Frame Drop Shadow -->
      <filter id="logoShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="18" stdDeviation="26" flood-color="#000000" flood-opacity="0.65" />
        <feDropShadow dx="0" dy="0" stdDeviation="35" flood-color="#10b981" flood-opacity="0.32" />
      </filter>

      <!-- Pill Shadow -->
      <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.3" />
      </filter>
    </defs>

    <!-- 1. Background -->
    <rect width="1200" height="630" fill="url(#mainBg)" />

    <!-- 2. Ambient Lighting Glows -->
    <rect width="1200" height="630" fill="url(#glowLeft)" />
    <rect width="1200" height="630" fill="url(#glowRight)" />
    <rect width="1200" height="630" fill="url(#glowBottom)" />

    <!-- 3. Subtle Technical Grid Pattern Overlay -->
    <g opacity="0.05" stroke="#ffffff" stroke-width="1">
      <line x1="0" y1="105" x2="1200" y2="105" />
      <line x1="0" y1="210" x2="1200" y2="210" />
      <line x1="0" y1="315" x2="1200" y2="315" />
      <line x1="0" y1="420" x2="1200" y2="420" />
      <line x1="0" y1="525" x2="1200" y2="525" />
      <line x1="150" y1="0" x2="150" y2="630" />
      <line x1="300" y1="0" x2="300" y2="630" />
      <line x1="450" y1="0" x2="450" y2="630" />
      <line x1="600" y1="0" x2="600" y2="630" />
      <line x1="750" y1="0" x2="750" y2="630" />
      <line x1="900" y1="0" x2="900" y2="630" />
      <line x1="1050" y1="0" x2="1050" y2="630" />
    </g>

    <!-- 4. Premium Inset Glassmorphic Frame -->
    <rect x="28" y="28" width="1144" height="574" rx="28" fill="url(#glassCard)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" />
    <rect x="29" y="29" width="1142" height="572" rx="27" fill="none" stroke="rgba(16, 185, 129, 0.25)" stroke-width="1" />

    <!-- 5. Left Section: Logo Frame Container (Halo Squircle) -->
    <g transform="translate(74, 150)" filter="url(#logoShadow)">
      <!-- Outer Glow Ring -->
      <rect x="-14" y="-14" width="298" height="298" rx="76" fill="none" stroke="url(#emeraldText)" stroke-width="2.5" opacity="0.75" />
      <!-- Inner Dark Frosted Squircle Backing -->
      <rect x="-6" y="-6" width="282" height="282" rx="70" fill="#021c15" stroke="rgba(255, 255, 255, 0.16)" stroke-width="1.5" />
    </g>

    <!-- 6. Right Section: Typography and Feature Elements -->
    <g transform="translate(412, 0)">
      <!-- Category Pill Badge -->
      <g transform="translate(0, 80)" filter="url(#softShadow)">
        <rect x="0" y="0" width="380" height="42" rx="21" fill="url(#pillGrad)" stroke="rgba(52, 211, 153, 0.45)" stroke-width="1.2" />
        <!-- Verified star icon -->
        <circle cx="22" cy="21" r="9" fill="#10b981" />
        <path d="M 22 15 L 23.5 19 L 28 19.5 L 24.5 22.5 L 25.5 27 L 22 24.5 L 18.5 27 L 19.5 22.5 L 16 19.5 L 20.5 19 Z" fill="#ffffff" />
        <text x="38" y="27" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#a7f3d0" letter-spacing="0.3">
          বিসিএস ও সরকারি চাকরি প্রস্তুতি পোর্টাল
        </text>
      </g>

      <!-- Main English & Bengali Title -->
      <text x="0" y="186" font-family="system-ui, -apple-system, sans-serif" font-size="62" font-weight="900" fill="#ffffff" letter-spacing="-1">
        Medha Exam
      </text>

      <text x="395" y="185" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="url(#emeraldText)">
        মেধা এক্সাম
      </text>

      <!-- Core Bengali Subtitle -->
      <text x="0" y="238" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#f8fafc">
        সরকারি চাকরির অনলাইন লাইভ মডেল টেস্ট ও মেধা তালিকা
      </text>

      <!-- Secondary Tagline -->
      <text x="0" y="274" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="16" font-weight="400" fill="#94a3b8">
        বিসিএস, সরকারি ব্যাংক, প্রাথমিক শিক্ষক ও মন্ত্রণালয় নিয়োগ পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি
      </text>

      <!-- 4 Highlighting Badges (2x2 Grid) with crisp SVG vector icons -->
      <!-- Item 1: Live Model Test -->
      <g transform="translate(0, 314)">
        <rect x="0" y="0" width="340" height="56" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(16, 185, 129, 0.35)" stroke-width="1.2" />
        <!-- Icon circle with lightning path -->
        <circle cx="28" cy="28" r="16" fill="rgba(16, 185, 129, 0.2)" />
        <polygon points="28,18 20,28 26,28 25,38 35,26 29,26" fill="#34d399" />
        <text x="54" y="27" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#ffffff">
          লাইভ মডেল টেস্ট
        </text>
        <text x="54" y="45" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94a3b8">
          সময়ভিত্তিক রিয়েল-টাইম কুইজ
        </text>
      </g>

      <!-- Item 2: National Merit List -->
      <g transform="translate(360, 314)">
        <rect x="0" y="0" width="355" height="56" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(59, 130, 246, 0.35)" stroke-width="1.2" />
        <!-- Icon circle with trophy path -->
        <circle cx="28" cy="28" r="16" fill="rgba(59, 130, 246, 0.2)" />
        <g transform="translate(19, 19)" stroke="#60a5fa" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6V2h10v4c0 2.8-2.2 5-5 5s-5-2.2-5-5z" />
          <path d="M1 4h3v2c0 1.5-1 2.5-2.5 2.5H1V4z" />
          <path d="M14 4h3v2c0 1.5-1 2.5-2.5 2.5H14V4z" />
          <line x1="9" y1="11" x2="9" y2="15" />
          <line x1="6" y1="15" x2="12" y2="15" />
        </g>
        <text x="54" y="27" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#ffffff">
          জাতীয় মেধা তালিকা
        </text>
        <text x="54" y="45" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94a3b8">
          তাৎক্ষণিক মেরিট পজিশন ও স্কোর
        </text>
      </g>

      <!-- Item 3: Ministry Question Bank -->
      <g transform="translate(0, 386)">
        <rect x="0" y="0" width="340" height="56" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(245, 158, 11, 0.35)" stroke-width="1.2" />
        <!-- Icon circle with book path -->
        <circle cx="28" cy="28" r="16" fill="rgba(245, 158, 11, 0.2)" />
        <g transform="translate(19, 19)" stroke="#fbbf24" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 14.5A2.5 2.5 0 0 1 4.5 12H16M2 14.5A2.5 2.5 0 0 0 4.5 17H16V2H4.5A2.5 2.5 0 0 0 2 4.5v10z" />
        </g>
        <text x="54" y="27" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#ffffff">
          মন্ত্রণালয় বিগত প্রশ্নব্যাংক
        </text>
        <text x="54" y="45" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94a3b8">
          বছরভিত্তিক নির্ভুল প্রশ্ন সমাধান
        </text>
      </g>

      <!-- Item 4: Accurate Explanations -->
      <g transform="translate(360, 386)">
        <rect x="0" y="0" width="355" height="56" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(168, 85, 247, 0.35)" stroke-width="1.2" />
        <!-- Icon circle with check shield path -->
        <circle cx="28" cy="28" r="16" fill="rgba(168, 85, 247, 0.2)" />
        <g transform="translate(19, 19)" stroke="#c084fc" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 1a6 6 0 0 0-6 6c0 5 6 9 6 9s6-4 6-9a6 6 0 0 0-6-6z" />
          <path d="M6 7l2 2 4-4" />
        </g>
        <text x="54" y="27" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#ffffff">
          ব্যাখ্যাসহ প্রশ্ন সমাধান
        </text>
        <text x="54" y="45" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94a3b8">
          বিষয়ভিত্তিক বিস্তারিত বিশ্লেষণ
        </text>
      </g>

      <!-- Bottom Bar: Verified Website Pill & Trust Metrics -->
      <g transform="translate(0, 474)">
        <!-- URL pill -->
        <rect x="0" y="0" width="235" height="42" rx="21" fill="rgba(16, 185, 129, 0.18)" stroke="rgba(16, 185, 129, 0.5)" stroke-width="1.2" />
        <!-- Globe Icon -->
        <circle cx="21" cy="21" r="9" fill="#10b981" />
        <path d="M 17 21 L 19.5 23.5 L 25 18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <text x="38" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#6ee7b7">
          medhaexam.site
        </text>

        <!-- Right Side Stats -->
        <text x="255" y="27" font-family="'Noto Sans Bengali', system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#cbd5e1">
          ✦ ১,০০,০০০+ প্রশ্ন সমাধান  ✦ নিয়মিত লাইভ মডেল টেস্ট  ✦ ফ্রি স্টাডি রিসোর্স
        </text>
      </g>
    </g>
  </svg>
  `;

  // Composite the real logo at (74, 150)
  await sharp(Buffer.from(ogSvg))
    .composite([
      {
        input: logo270Buffer,
        top: 150,
        left: 74
      }
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('Successfully regenerated premium og-image.png (1200x630)');
}

generateOG().catch(err => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});
