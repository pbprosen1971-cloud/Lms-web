import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const svgPath = path.resolve('public/logo.svg');
const publicDir = path.resolve('public');

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. favicon-48x48.png (Google Search standard multiple of 48px)
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('Generated favicon-48x48.png');

  // 2. favicon-96x96.png (2x Google Search)
  await sharp(svgBuffer)
    .resize(96, 96)
    .png()
    .toFile(path.join(publicDir, 'favicon-96x96.png'));
  console.log('Generated favicon-96x96.png');

  // 3. favicon-32x32.png & favicon-16x16.png
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  // 4. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 5. icon-192.png (192x192 for PWA and Google mobile)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 6. icon-512.png (512x512 for Schema.org Organization logo & PWA)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 7. favicon.ico - Sharp can write a PNG file named favicon.ico or 48x48/32x32
  // Most modern browsers and Googlebot accept a PNG-encoded .ico file at root.
  const ico48Buffer = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico48Buffer);
  console.log('Generated favicon.ico');

  // 8. og-image.png (1200x630 banner with green/blue gradient and logo centered)
  // Create a stunning 1200x630 branded card for Google, WhatsApp, Facebook, Twitter
  const logo240Buffer = await sharp(svgBuffer).resize(240, 240).png().toBuffer();
  
  const ogSvg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#042f2e" />
          <stop offset="100%" stop-color="#022c22" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <circle cx="340" cy="315" r="160" fill="#059669" opacity="0.15" filter="blur(40px)" />
      <circle cx="860" cy="315" r="180" fill="#2563eb" opacity="0.15" filter="blur(40px)" />
      <text x="560" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="800" fill="#ffffff">Medha Exam</text>
      <text x="560" y="330" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="600" fill="#34d399">মেধা এক্সাম — Job Exam Portal</text>
      <text x="560" y="380" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার লাইভ প্রস্তুতি</text>
    </svg>
  `;

  await sharp(Buffer.from(ogSvg))
    .composite([
      {
        input: logo240Buffer,
        top: 195,
        left: 260
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated og-image.png');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
