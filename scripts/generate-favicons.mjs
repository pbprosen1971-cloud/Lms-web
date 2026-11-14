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

  // 8. og-image.png (1200x630 banner with logo and portal branding)
  const { generateOG } = await import('./generate-og-image.mjs');
  await generateOG();
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
