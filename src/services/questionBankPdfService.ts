/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MinistryQuestionBank, MinistryBankQuestion } from '../types';
import { toBengaliDigits } from '../lib/dateUtils';

export type QuestionBankPdfMode = 'with_answers' | 'questions_only';

export interface QuestionBankPdfOptions {
  bank: MinistryQuestionBank;
  mode: QuestionBankPdfMode;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Clean standard SVG vector logo (Zero filters, 100% canvas & html2canvas compatible)
const CLEAN_MEDHA_LOGO_SVG = `
<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="115" fill="#00a854"/>
  <path d="M 112 118 C 112 105 125 96 138 103 L 260 220 L 230 250 L 112 135 Z" fill="#1d4ed8"/>
  <path d="M 100 335 L 100 125 C 100 102 124 92 142 108 L 335 305" stroke="#ffffff" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M 230 220 L 340 115" stroke="#ffffff" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M 345 125 L 345 285" stroke="#ffffff" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="368" cy="368" r="66" fill="#ffffff"/>
  <circle cx="368" cy="368" r="54" fill="#2563eb"/>
  <path d="M 336 368 L 358 390 L 404 336" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`;

/**
 * Downloads Question Bank PDF according to exact requirements:
 * 1) Dynamic page height measurement:
 *    - Each question's rendered height is measured dynamically.
 *    - If a question cannot fit completely in the remaining space of the current page,
 *      it is pushed to the next page ("কোন প্রশ্ন পেজ শেষ যায়গায় না ধরলে সেটা পরের পেজে দেখাবে").
 *    - Zero clipped questions, zero cut-off options!
 * 2) Clean word spacing:
 *    - Explicit word-spacing (3px / 0.18em) on headers and text so words never collide or smash together.
 *    - Normal text-rendering prevents html2canvas from collapsing Bengali space glyphs.
 * 3) Layout:
 *    - Header: Ministry/Department Name (BOLD), Title, Exam Held Date (Middle aligned)
 *    - Footer: 'বিভিন্ন প্রশ্ন ব্যাংক অনুশীলন ও পরিক্ষা দিতে visit- Medha Exam Portal'
 *    - Watermark: Centered Medha Logo watermark on EVERY page
 *    - UTF-8 BOM (\uFEFF) & UTF-8 charset ensures Bengali text never garbles or breaks
 */
export async function downloadQuestionBankPdf({
  bank,
  mode,
}: QuestionBankPdfOptions): Promise<boolean> {
  const questions = bank.questions || [];
  const totalQuestions = questions.length;
  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
  const ministryName = bank.ministryName || 'বাংলাদেশ সরকারি মন্ত্রণালয় ও দপ্তর';
  const title = bank.title || 'নিয়োগ পরীক্ষা প্রশ্ন ব্যাংক';
  const examHeldDate = bank.examHeldDate || '';
  const durationMinutes = bank.durationMinutes || 10;
  const isAnswersMode = mode === 'with_answers';

  // Helper to render question card HTML
  const renderQuestionHtml = (item: { q: MinistryBankQuestion; index: number }) => {
    const { q, index } = item;
    const qNum = toBengaliDigits(index + 1);
    const subjectBadge = q.subject
      ? `<span style="font-size:9.5px; font-weight:700; color:#475569; background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 6px; border-radius:4px; margin-left:6px; word-spacing:1px;">${escapeHtml(q.subject)}</span>`
      : '';

    if (isAnswersMode) {
      // 1) WITH ANSWERS & EXPLANATIONS (সবুজ কালারে হাইলাইট থাকবে উত্তর অপশন)
      const optionsHtml = (q.options || []).map((opt, optIdx) => {
        const isCorrect = optIdx === q.correctAnswer;
        const optLabel = optionLabels[optIdx] || `${optIdx + 1}`;

        if (isCorrect) {
          // Emerald green highlighted correct answer option
          return `
            <div style="background:#dcfce7; border:1.5px solid #16a34a; border-radius:7px; padding:6px 9px; display:flex; align-items:flex-start; gap:7px; color:#14532d; font-weight:700; word-spacing:2px; box-sizing:border-box;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; background:#16a34a; color:#ffffff; border-radius:50%; font-size:10px; font-weight:bold; flex-shrink:0; margin-top:1px;">
                ${optLabel}
              </span>
              <span style="font-size:11.5px; line-height:1.4; word-break:break-word; flex:1; word-spacing:2px;">
                ${escapeHtml(opt)}
              </span>
              <span style="font-size:10px; color:#15803d; font-weight:800; flex-shrink:0; margin-left:auto; word-spacing:1px;">✓ সঠিক উত্তর</span>
            </div>
          `;
        }

        // Standard neutral option
        return `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:7px; padding:6px 9px; display:flex; align-items:flex-start; gap:7px; color:#334155; word-spacing:2px; box-sizing:border-box;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:50%; font-size:10px; font-weight:bold; flex-shrink:0; margin-top:1px;">
              ${optLabel}
            </span>
            <span style="font-size:11.5px; line-height:1.4; word-break:break-word; flex:1; word-spacing:2px;">
              ${escapeHtml(opt)}
            </span>
          </div>
        `;
      }).join('');

      const explanationHtml = q.explanation && q.explanation.trim() ? `
        <div style="margin-top:7px; padding:7px 11px; background:#fefce8; border:1px solid #fef08a; border-radius:7px; font-size:10.5px; color:#713f12; line-height:1.45; word-spacing:2px;">
          <strong style="color:#854d0e; display:block; margin-bottom:2px; word-spacing:2px;">💡 সমাধান ও বিশদ ব্যাখ্যা:</strong>
          <span style="word-spacing:2px;">${escapeHtml(q.explanation)}</span>
        </div>
      ` : '';

      return `
        <div class="q-item-card" style="margin-bottom:10px; padding:9px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; break-inside:avoid; page-break-inside:avoid; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:700; color:#0f172a; margin-bottom:7px; line-height:1.45; word-break:break-word; word-spacing:2px;">
            <span style="color:#059669; font-weight:800; margin-right:5px;">${qNum}।</span>
            <span style="word-spacing:2px;">${escapeHtml(q.text)}</span>
            ${subjectBadge}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            ${optionsHtml}
          </div>
          ${explanationHtml}
        </div>
      `;
    } else {
      // 2) QUESTIONS ONLY (সিম্পল ডিজাইন - উত্তর ও ব্যাখ্যা ছাড়া)
      const optionsHtml = (q.options || []).map((opt, optIdx) => {
        const optLabel = optionLabels[optIdx] || `${optIdx + 1}`;
        return `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:5px 9px; display:flex; align-items:flex-start; gap:6px; color:#1e293b; word-spacing:2px; box-sizing:border-box;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:17px; height:17px; background:#f8fafc; border:1px solid #cbd5e1; color:#334155; border-radius:50%; font-size:9.5px; font-weight:700; flex-shrink:0; margin-top:1px;">
              ${optLabel}
            </span>
            <span style="font-size:11.5px; line-height:1.35; word-break:break-word; flex:1; word-spacing:2px;">
              ${escapeHtml(opt)}
            </span>
          </div>
        `;
      }).join('');

      return `
        <div class="q-item-card" style="margin-bottom:8px; padding:8px 12px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; break-inside:avoid; page-break-inside:avoid; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px; line-height:1.4; word-break:break-word; word-spacing:2px;">
            <span style="color:#2563eb; font-weight:800; margin-right:5px;">${qNum}।</span>
            <span style="word-spacing:2px;">${escapeHtml(q.text)}</span>
            ${subjectBadge}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            ${optionsHtml}
          </div>
        </div>
      `;
    }
  };

  // STEP 1: Create hidden iframe to measure exact rendered heights of questions
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '820px';
  iframe.style.height = '1200px';
  iframe.style.zIndex = '-99999';
  iframe.style.opacity = '1';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#ffffff';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('আইফ্রেম ডকুমেন্ট অ্যাক্সেস করা সম্ভব হয়নি।');
    }

    const utf8Bom = '\uFEFF';

    // Measure scratchpad HTML
    const measureHtml = `${utf8Bom}<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; word-spacing: 2px; }
    body {
      margin: 0; padding: 20px;
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', -apple-system, sans-serif;
      font-size: 12px; line-height: 1.45;
      text-rendering: normal !important;
      font-feature-settings: normal !important;
    }
    .measure-box { width: 740px; box-sizing: border-box; }
  </style>
</head>
<body>
  <div class="measure-box">
    ${questions.map((q, idx) => `
      <div id="q-measure-${idx}" style="box-sizing:border-box;">
        ${renderQuestionHtml({ q, index: idx })}
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(measureHtml);
    iframeDoc.close();

    // Wait for fonts to be ready
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 350));

    // Measure actual rendered pixel heights
    const measuredHeights: number[] = [];
    for (let i = 0; i < questions.length; i++) {
      const el = iframeDoc.getElementById(`q-measure-${i}`);
      const h = el ? el.getBoundingClientRect().height : (isAnswersMode ? 140 : 100);
      measuredHeights.push(Math.ceil(h));
    }

    // STEP 2: Partition questions dynamically into pages
    // Total page height = 1130px.
    // Page 1:
    //   - Top padding: 24px, Bottom padding: 24px
    //   - Main Header: ~155px
    //   - Footer: ~40px
    //   - Usable height for questions on Page 1: 1130 - 48 - 155 - 40 - 25 (buffer) = ~862px.
    // Subsequent Pages (Page 2+):
    //   - Top padding: 24px, Bottom padding: 24px
    //   - Mini Header: ~42px
    //   - Footer: ~40px
    //   - Usable height for questions on Subsequent Pages: 1130 - 48 - 42 - 40 - 25 (buffer) = ~975px.

    const PAGE1_MAX_HEIGHT = 850;
    const SUB_PAGE_MAX_HEIGHT = 960;

    interface PageConfig {
      pageNum: number;
      questions: { q: MinistryBankQuestion; index: number }[];
    }

    const pages: PageConfig[] = [];
    let curPageQuestions: { q: MinistryBankQuestion; index: number }[] = [];
    let curPageHeight = 0;
    let curPageNum = 1;

    for (let i = 0; i < questions.length; i++) {
      const qHeight = measuredHeights[i] || (isAnswersMode ? 130 : 90);
      const maxLimit = curPageNum === 1 ? PAGE1_MAX_HEIGHT : SUB_PAGE_MAX_HEIGHT;

      // If adding this question exceeds the page limit and we already have at least 1 question on this page:
      // Push this question to the next page ("কোন প্রশ্ন পেজ শেষ যায়গায় না ধরলে সেটা পরের পেজে দেখাবে")
      if (curPageHeight + qHeight > maxLimit && curPageQuestions.length > 0) {
        pages.push({
          pageNum: curPageNum,
          questions: curPageQuestions,
        });
        curPageNum++;
        curPageQuestions = [{ q: questions[i], index: i }];
        curPageHeight = qHeight;
      } else {
        curPageQuestions.push({ q: questions[i], index: i });
        curPageHeight += qHeight;
      }
    }

    if (curPageQuestions.length > 0) {
      pages.push({
        pageNum: curPageNum,
        questions: curPageQuestions,
      });
    }

    const totalPages = pages.length;

    // STEP 3: Generate the pristine final multi-page HTML
    let pagesHtml = '';

    pages.forEach((page) => {
      const isFirstPage = page.pageNum === 1;

      // Header layout requirement:
      // "আর pdf লেআউট এমন হবে যেন হেডারে নিদিস্ট মন্ত্রনালয় / অধিদপ্তর নাম(bold) তার নিচে শিরোনাম বা টাইটেল তার নিচে পরিক্ষা অনুস্টিত যে তারিখ এডমিন দ্বারা প্রদত্ত , এই লেখা গুলো middle alignment রাখবে।"
      // Added explicit word-spacing: 3px and &nbsp; so words NEVER merge or collide!
      const headerBlock = isFirstPage ? `
        <div style="text-align:center; border-bottom:2.5px solid #059669; padding-bottom:10px; margin-bottom:14px; position:relative; z-index:2; flex-shrink:0;">
          <!-- Top Branding Logo & Name -->
          <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:5px;">
            <div style="width:26px; height:26px; display:inline-block; flex-shrink:0;">
              ${CLEAN_MEDHA_LOGO_SVG}
            </div>
            <span style="font-size:15px; font-weight:800; color:#059669; word-spacing:3px; letter-spacing:0.2px;">
              মেধা এক্সাম পোর্টাল &nbsp;(Medha Exam Portal)
            </span>
          </div>

          <!-- 1. Ministry / Department Name (BOLD, Center aligned) -->
          <h1 style="font-size:18px; font-weight:800; color:#0f172a; margin:0 0 3px 0; text-align:center; line-height:1.4; word-spacing:3px; letter-spacing:0.2px;">
            ${escapeHtml(ministryName)}
          </h1>

          <!-- 2. Question Bank Title (Center aligned) -->
          <h2 style="font-size:14px; font-weight:700; color:#047857; margin:0 0 4px 0; text-align:center; line-height:1.4; word-spacing:3px; letter-spacing:0.2px;">
            ${escapeHtml(title)}
          </h2>

          <!-- 3. Exam Held Date (Admin Provided, Center aligned) -->
          <div style="font-size:11px; font-weight:600; color:#475569; text-align:center; margin-bottom:5px; word-spacing:3px;">
            ${examHeldDate ? `<span>পরিক্ষা অনুষ্ঠিত তারিখ: <strong style="color:#0f172a;">${escapeHtml(examHeldDate)}</strong></span> &nbsp;•&nbsp; ` : ''}
            <span>মোট প্রশ্ন: <strong style="color:#0f172a;">${toBengaliDigits(totalQuestions)} টি</strong></span> &nbsp;•&nbsp;
            <span>সময়: <strong style="color:#0f172a;">${toBengaliDigits(durationMinutes)} মিনিট</strong></span>
          </div>

          <!-- Mode Indicator Badge -->
          <div style="text-align:center;">
            ${isAnswersMode
              ? '<span style="display:inline-block; font-size:10px; font-weight:800; color:#065f46; background:#d1fae5; border:1px solid #86efac; padding:2px 10px; border-radius:20px; word-spacing:2px;">✓ প্রশ্ন উত্তর ও বিশদ ব্যাখ্যাসহ সমাধান পত্র</span>'
              : '<span style="display:inline-block; font-size:10px; font-weight:800; color:#1e293b; background:#f1f5f9; border:1px solid #cbd5e1; padding:2px 10px; border-radius:20px; word-spacing:2px;">📝 পরীক্ষার্থী অনুশীলন প্রশ্নপত্র (প্রশ্ন ও অপশন)</span>'
            }
          </div>
        </div>
      ` : `
        <!-- Subsequent Page Top Mini-Header with clear word spacing and separation -->
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1.5px solid #e2e8f0; padding-bottom:7px; margin-bottom:12px; position:relative; z-index:2; flex-shrink:0;">
          <div style="font-size:11.5px; font-weight:700; color:#0f172a; flex:1; text-align:left; line-height:1.4; word-spacing:3px;">
            <span style="color:#059669; font-weight:800; margin-right:6px;">${escapeHtml(ministryName)}</span>
            <span style="color:#94a3b8; margin-right:6px;">|</span>
            <span style="color:#1e293b; font-weight:700;">${escapeHtml(title)}</span>
          </div>
          <div style="font-size:10px; font-weight:800; color:#047857; background:#d1fae5; border:1px solid #a7f3d0; padding:1.5px 7px; border-radius:6px; margin-left:12px; flex-shrink:0; word-spacing:2px;">
            ${isAnswersMode ? 'উত্তর ও ব্যাখ্যাসহ' : 'অনুশীলন প্রশ্নপত্র'}
          </div>
        </div>
      `;

      // Questions container for this page
      const questionsBlock = `
        <div style="flex:1; position:relative; z-index:2; display:flex; flex-direction:column; justify-content:flex-start;">
          ${page.questions.map(renderQuestionHtml).join('')}
        </div>
      `;

      // Footer requirement:
      // "সর্বশেষ হেডারে লেখা থাকবে- বিভিন্ন প্রশ্ন ব্যাংক অনুশীলন ও পরিক্ষা দিতে visit- Medha Exam Portal"
      const footerBlock = `
        <div style="border-top:1.5px solid #059669; padding-top:7px; margin-top:auto; display:flex; align-items:center; justify-content:space-between; font-size:10.5px; position:relative; z-index:2; flex-shrink:0;">
          <div style="font-weight:700; color:#047857; display:flex; align-items:center; gap:5px; word-spacing:2px;">
            <span>🌐 বিভিন্ন প্রশ্ন ব্যাংক অনুশীলন ও পরিক্ষা দিতে visit-</span>
            <strong style="color:#059669; text-decoration:underline;">Medha Exam Portal</strong>
          </div>
          <div style="font-weight:700; color:#64748b; font-size:10px; word-spacing:2px;">
            পৃষ্ঠা ${toBengaliDigits(page.pageNum)} / ${toBengaliDigits(totalPages)}
          </div>
        </div>
      `;

      // Watermark requirement:
      // "আর প্রতি পেজ এর মধ্য আমাদের লগো watermark করে দিবে।"
      const watermarkSvg = `
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:330px; height:330px; opacity:0.065; z-index:0; pointer-events:none;">
          ${CLEAN_MEDHA_LOGO_SVG}
        </div>
      `;

      pagesHtml += `
        <div class="pdf-page" style="width:800px; height:1130px; box-sizing:border-box; padding:24px 30px; background:#ffffff; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; page-break-after:always; margin:0 auto 20px auto;">
          ${watermarkSvg}
          ${headerBlock}
          ${questionsBlock}
          ${footerBlock}
        </div>
      `;
    });

    const finalHtml = `${utf8Bom}<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Medha Exam Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      word-spacing: 2px;
    }
    body, html {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      word-spacing: 2px;
      text-rendering: normal !important;
      font-feature-settings: normal !important;
    }
    h1, h2, h3, h4, p, span, strong, div {
      word-spacing: 2px;
    }
    .pdf-page {
      background: #ffffff;
    }
    @media print {
      body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .pdf-page {
        margin: 0 !important;
        padding: 20px 24px !important;
        page-break-after: always !important;
        height: 100vh !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

    // STEP 4: Render the final multipage layout into the iframe
    iframe.style.height = `${totalPages * 1150 + 200}px`;
    iframeDoc.open();
    iframeDoc.write(finalHtml);
    iframeDoc.close();

    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 450));

    const pageElements = iframeDoc.querySelectorAll('.pdf-page');
    if (pageElements.length === 0) {
      throw new Error('পিডিএফ পেজ প্রস্তুত করা সম্ভব হয়নি।');
    }

    // STEP 5: Capture each page individually with html2canvas and assemble into jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;

      const canvas = await html2canvas(pageEl, {
        scale: 2.2, // Ultra sharp vector-like resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: 1130,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }

    const cleanTitle = (bank.title || 'প্রশ্নব্যাংক')
      .replace(/[^\w\s\u0980-\u09FF-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const cleanMinistry = (bank.ministryName || 'মন্ত্রণালয়')
      .replace(/[^\w\s\u0980-\u09FF-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const suffix = isAnswersMode ? 'উত্তর_ও_ব্যাখ্যাসহ' : 'প্রশ্নপত্র_অনুশীলন';
    const fileName = `মেধা_${cleanMinistry}_${cleanTitle}_${suffix}.pdf`;

    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error('Error generating Question Bank PDF:', err);
    throw err;
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
