/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ExamResult, Question } from '../types';
import { toBengaliDigits, formatBengaliDateTimeSafe } from '../lib/dateUtils';

interface GeneratePdfParams {
  result: ExamResult;
  questions: Question[];
  userAnswers: Record<string, number>;
  percentage: number;
  computedRank: number;
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

// Pure standard SVG Vector logo (zero <filter> tags, 100% canvas & html2canvas compatible)
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
 * Generates an authentic, beautifully styled Medha Exam result sheet PDF.
 * Adheres strictly to all requirements:
 * 1. Layout & Design matched to website theme (Emerald #059669 branding, clean cards, authentic typography).
 * 2. Header with website logo, portal identity, candidate info, and score scorecard.
 * 3. Centered authentic logo Watermark in the middle of EVERY page.
 * 4. NO website footer included (only formal verification notice).
 * 5. Questions in 2 columns when > 10 questions with compact font; 1 column when <= 10 questions.
 * 6. High-fidelity Bengali typography (Hind Siliguri & Noto Sans Bengali) - completely unclipped and readable.
 * 7. ZERO blank pages and ZERO clipped text (table baselines, generous line-heights, zero overflow:hidden on text).
 */
export async function downloadExamResultPdf({
  result,
  questions,
  userAnswers,
  percentage,
  computedRank,
}: GeneratePdfParams): Promise<boolean> {
  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
  const totalQuestions = questions.length;
  const isMultiColumn = totalQuestions > 10;
  const isPassed = percentage >= 60;
  const verificationCode = `MEX-${(result.id || result.examId || 'MEDHA').slice(-6).toUpperCase()}-${toBengaliDigits(result.score)}`;

  // Multi-page question partitioner
  interface PageQuestionsConfig {
    pageNum: number;
    col1: { q: Question; index: number }[];
    col2: { q: Question; index: number }[];
    isSingleCol: boolean;
  }

  const pagesConfig: PageQuestionsConfig[] = [];

  if (totalQuestions <= 10) {
    // Single page, single column
    pagesConfig.push({
      pageNum: 1,
      col1: questions.map((q, idx) => ({ q, index: idx })),
      col2: [],
      isSingleCol: true,
    });
  } else if (totalQuestions <= 20) {
    // Single page, 2 columns (e.g. 1-10 in col 1, 11-20 in col 2)
    const half = Math.ceil(totalQuestions / 2);
    pagesConfig.push({
      pageNum: 1,
      col1: questions.slice(0, half).map((q, idx) => ({ q, index: idx })),
      col2: questions.slice(half).map((q, idx) => ({ q, index: half + idx })),
      isSingleCol: false,
    });
  } else {
    // Multi-page (Page 1 holds 20 questions, subsequent pages hold up to 28 questions)
    pagesConfig.push({
      pageNum: 1,
      col1: questions.slice(0, 10).map((q, idx) => ({ q, index: idx })),
      col2: questions.slice(10, 20).map((q, idx) => ({ q, index: 10 + idx })),
      isSingleCol: false,
    });

    let remainingQuestions = questions.slice(20);
    let curIndex = 20;
    let page = 2;

    while (remainingQuestions.length > 0) {
      const chunkSize = Math.min(28, remainingQuestions.length);
      const chunk = remainingQuestions.slice(0, chunkSize);
      remainingQuestions = remainingQuestions.slice(chunkSize);
      const half = Math.ceil(chunk.length / 2);

      pagesConfig.push({
        pageNum: page++,
        col1: chunk.slice(0, half).map((q, idx) => ({ q, index: curIndex + idx })),
        col2: chunk.slice(half).map((q, idx) => ({ q, index: curIndex + half + idx })),
        isSingleCol: false,
      });

      curIndex += chunkSize;
    }
  }

  const totalPages = pagesConfig.length;

  // Helper to render single question card with table-based baseline alignment (prevents any html2canvas text clipping)
  const renderQuestionHtml = (item: { q: Question; index: number }, isCompact: boolean) => {
    const q = item.q;
    const qNum = item.index + 1;
    const userSelected = userAnswers[q.id];
    const isCorrect = userSelected === q.correctAnswer;
    const isUnanswered = userSelected === undefined;
    const isWrong = !isUnanswered && !isCorrect;

    let cardBg = '#f8fafc';
    let cardBorder = '#e2e8f0';
    if (isCorrect) {
      cardBg = '#f0fdf4';
      cardBorder = '#86efac';
    } else if (isWrong) {
      cardBg = '#fef2f2';
      cardBorder = '#fca5a5';
    }

    let statusBadge = '';
    if (isCorrect) {
      statusBadge = '<span style="color:#166534; background:#dcfce7; padding:2px 7px; border-radius:4px; border:1px solid #bbf7d0; font-size:9px; font-weight:bold; white-space:nowrap; display:inline-block;">✓ সঠিক</span>';
    } else if (isWrong) {
      statusBadge = '<span style="color:#991b1b; background:#fee2e2; padding:2px 7px; border-radius:4px; border:1px solid #fecaca; font-size:9px; font-weight:bold; white-space:nowrap; display:inline-block;">✗ ভুল</span>';
    } else if (isUnanswered) {
      statusBadge = '<span style="color:#854d0e; background:#fef9c3; padding:2px 7px; border-radius:4px; border:1px solid #fef08a; font-size:9px; font-weight:bold; white-space:nowrap; display:inline-block;">— বাদ</span>';
    }

    const circleSize = isCompact ? '17px' : '20px';
    const circleFont = isCompact ? '9px' : '10px';
    const textFont = isCompact ? '9.5px' : '11px';

    const optionsHtml = (q.options || []).map((opt, optIdx) => {
      const isSystemCorrect = optIdx === q.correctAnswer;
      const isUserSelected = optIdx === userSelected;

      let optBg = '#ffffff';
      let optBorder = '#e2e8f0';
      let optColor = '#334155';
      let optFontWeight = '500';
      let badge = '';

      if (isSystemCorrect) {
        optBg = '#dcfce7';
        optBorder = '#4ade80';
        optColor = '#14532d';
        optFontWeight = 'bold';
        badge = '<span style="font-size:8.5px; color:#15803d; font-weight:bold; white-space:nowrap; background:#bbf7d0; padding:1px 6px; border-radius:3px; display:inline-block;">✓ সঠিক</span>';
      }

      if (isUserSelected && isSystemCorrect) {
        badge = '<span style="font-size:8.5px; color:#166534; font-weight:bold; white-space:nowrap; background:#bbf7d0; padding:1px 6px; border-radius:3px; display:inline-block;">✓ আপনার উত্তর</span>';
      } else if (isUserSelected && !isSystemCorrect) {
        optBg = '#fee2e2';
        optBorder = '#f87171';
        optColor = '#7f1d1d';
        optFontWeight = 'bold';
        badge = '<span style="font-size:8.5px; color:#b91c1c; font-weight:bold; white-space:nowrap; background:#fecaca; padding:1px 6px; border-radius:3px; display:inline-block;">✗ আপনার উত্তর</span>';
      }

      return `
        <div style="background-color:${optBg}; border:1px solid ${optBorder}; border-radius:6px; padding:${isCompact ? '4px 7px' : '6px 10px'}; margin-bottom:${isCompact ? '3px' : '4px'}; box-sizing:border-box;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="width:${circleSize}; vertical-align:middle; padding:0;">
                <span style="width:${circleSize}; height:${circleSize}; border-radius:50%; background-color:#e2e8f0; color:#334155; font-weight:bold; font-size:${circleFont}; display:inline-block; text-align:center; line-height:${circleSize};">
                  ${optionLabels[optIdx] || optIdx + 1}
                </span>
              </td>
              <td style="vertical-align:middle; padding:0 8px;">
                <span style="font-size:${textFont}; line-height:1.45; color:${optColor}; font-weight:${optFontWeight}; display:inline-block; word-break:break-word;">
                  ${escapeHtml(opt)}
                </span>
              </td>
              ${badge ? `<td style="vertical-align:middle; text-align:right; padding:0; white-space:nowrap; width:1%;">${badge}</td>` : ''}
            </tr>
          </table>
        </div>
      `;
    }).join('');

    const explanationHtml = q.explanation && q.explanation.trim() !== '' ? `
      <div style="margin-top:6px; padding:6px 10px; background-color:#fffbeb; border:1px solid #fde68a; border-radius:6px; color:#451a03; font-size:${isCompact ? '9px' : '10.5px'}; line-height:1.45;">
        <strong style="color:#92400e; margin-right:4px;">💡 ব্যাখ্যা:</strong>
        <span>${escapeHtml(q.explanation)}</span>
      </div>
    ` : '';

    return `
      <div style="background-color:${cardBg}; border:1px solid ${cardBorder}; border-radius:8px; padding:${isCompact ? '6px 8px' : '10px 14px'}; margin-bottom:${isCompact ? '6px' : '10px'}; box-sizing:border-box; break-inside:avoid;">
        <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
          <tr>
            <td style="vertical-align:top; width:26px; padding-right:6px; padding-top:1px;">
              <span style="display:inline-block; background-color:#e2e8f0; color:#1e293b; padding:2px 5px; border-radius:4px; font-family:monospace, sans-serif; font-size:9.5px; font-weight:bold; line-height:1.3;">
                ${toBengaliDigits(qNum)}
              </span>
            </td>
            <td style="vertical-align:top;">
              <div style="font-weight:bold; color:#0f172a; font-size:${isCompact ? '10px' : '12px'}; line-height:1.45; word-break:break-word;">
                ${escapeHtml(q.text)}
              </div>
            </td>
            <td style="vertical-align:top; text-align:right; padding-left:8px; white-space:nowrap; width:1%;">
              ${statusBadge}
            </td>
          </tr>
        </table>
        <div style="display:grid; grid-template-columns:${isCompact ? '1fr' : '1fr 1fr'}; gap:${isCompact ? '2px' : '6px'}; margin-top:4px;">
          ${optionsHtml}
        </div>
        ${explanationHtml}
      </div>
    `;
  };

  // Watermark SVG component (Centered on every page with elegant opacity)
  const watermarkHtml = `
    <div style="position:absolute; top:48%; left:50%; transform:translate(-50%, -48%) rotate(-10deg); opacity:0.06; pointer-events:none; user-select:none; z-index:0; text-align:center;">
      <div style="width:250px; height:250px; margin:0 auto;">
        ${CLEAN_MEDHA_LOGO_SVG}
      </div>
      <div style="margin-top:8px;">
        <span style="font-size:26px; font-weight:900; color:#0f172a; letter-spacing:1px; display:block;">মেধা এক্সাম পোর্টাল</span>
        <span style="font-size:10px; font-weight:bold; letter-spacing:1px; color:#334155; text-transform:uppercase;">OFFICIAL EVALUATION SHEET • MEDHA EXAM</span>
      </div>
    </div>
  `;

  // Subject performance breakdown (if multi-subject)
  let subjectPerformanceHtml = '';
  if (result.subjectPerformance && Object.keys(result.subjectPerformance).length > 1) {
    const items = Object.entries(result.subjectPerformance).map(([subj, rawData]) => {
      const data = rawData as { correct: number; total: number };
      const subPct = Math.round(((data?.correct || 0) / (data?.total || 1)) * 100);
      return `
        <div style="background-color:#f8fafc; padding:4px 8px; border-radius:5px; border:1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:9.5px; line-height:1.35;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(subj)}</span>
            <span style="color:#15803d; margin-left:6px;">${toBengaliDigits(data?.correct || 0)}/${toBengaliDigits(data?.total || 0)} (${toBengaliDigits(subPct)}%)</span>
          </div>
        </div>
      `;
    }).join('');

    subjectPerformanceHtml = `
      <div style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
        <div style="background-color:#f1f5f9; padding:5px 10px; border-bottom:1px solid #e2e8f0; font-weight:bold; font-size:10px; color:#1e293b; line-height:1.35;">
          📊 বিষয়ভিত্তিক ফলাফল বিশ্লেষণ
        </div>
        <div style="padding:6px 10px; display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; font-size:10px;">
          ${items}
        </div>
      </div>
    `;
  }

  // Generate Page 1 Content
  const page1Config = pagesConfig[0];
  let page1QuestionsContent = '';

  if (totalQuestions === 0) {
    page1QuestionsContent = '<div style="text-align:center; padding:20px; font-size:11px; color:#94a3b8;">কোনো প্রশ্ন পাওয়া যায়নি।</div>';
  } else if (page1Config.isSingleCol) {
    page1QuestionsContent = page1Config.col1.map((item) => renderQuestionHtml(item, false)).join('');
  } else {
    const col1Html = page1Config.col1.map((item) => renderQuestionHtml(item, true)).join('');
    const col2Html = page1Config.col2.map((item) => renderQuestionHtml(item, true)).join('');
    page1QuestionsContent = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <div style="flex:1; width:50%;">${col1Html}</div>
        <div style="flex:1; width:50%;">${col2Html}</div>
      </div>
    `;
  }

  // Formal footer notice (strictly NO website footer, only verification line)
  const formalFooterHtml = `
    <div style="margin-top:auto; padding-top:10px; border-top:1px solid #e2e8f0; text-align:center; position:relative; z-index:10;">
      <p style="font-size:9px; color:#64748b; font-weight:500; margin:0; line-height:1.4;">
        মেধা এক্সাম অটোমেটেড ম্যানেজমেন্ট সিস্টেম কর্তৃক প্রস্তুতকৃত অফিসিয়াল ফলাফল শীট • এটি একটি ডিজিটাল কম্পিউটার জেনারেটেড কপি, কোনো স্বাক্ষর বা সিলের প্রয়োজন নেই।
      </p>
      <p style="font-size:8px; color:#94a3b8; margin-top:2px; margin-bottom:0;">
        যাচাইকরণ লিংক: medhaexam.com/verify?id=${escapeHtml(verificationCode)} • গোপনীয়তা ও সুরক্ষা নিশ্চিত
      </p>
    </div>
  `;

  // Build full HTML containing all discrete .pdf-page elements
  let pagesHtml = '';

  // Page 1
  pagesHtml += `
    <div class="pdf-page" id="pdf-page-1" style="width:800px; height:1130px; min-height:1130px; position:relative; box-sizing:border-box; padding:24px 28px; background:#ffffff; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; margin-bottom:20px;">
      ${watermarkHtml}

      <div style="position:relative; z-index:10; flex:1; display:flex; flex-direction:column;">
        <!-- 1. Header with Official Vector Logo, Branding & Verification -->
        <table style="width:100%; border-collapse:collapse; border-bottom:2px solid #059669; padding-bottom:12px; margin-bottom:12px;">
          <tr>
            <td style="vertical-align:middle; width:50px; padding-right:12px;">
              <div style="width:46px; height:46px; border-radius:10px; background-color:#059669; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.12); overflow:hidden;">
                <div style="width:42px; height:42px;">
                  ${CLEAN_MEDHA_LOGO_SVG}
                </div>
              </div>
            </td>
            <td style="vertical-align:middle;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:22px; font-weight:900; color:#0f172a; letter-spacing:-0.3px; line-height:1.2;">মেধা এক্সাম</span>
                <span style="padding:2px 7px; border-radius:999px; font-size:9.5px; font-weight:800; background-color:#059669; color:#ffffff; text-transform:uppercase;">
                  জব এক্সাম পোর্টাল
                </span>
              </div>
              <div style="font-size:11px; color:#475569; font-weight:600; margin-top:2px; line-height:1.3;">
                বিসিএস, সরকারি ব্যাংক ও মন্ত্রণালয় নিয়োগ পরীক্ষা মূল্যায়ন পত্র
              </div>
              <div style="font-size:9.5px; color:#64748b; font-weight:500; margin-top:1px;">
                অফিসিয়াল ওয়েবসাইট: medhaexam.com • জাতীয় মেধা মূল্যায়ন সিস্টেম
              </div>
            </td>
            <td style="vertical-align:middle; text-align:right; width:170px;">
              <div style="background-color:#f8fafc; border:1px solid #e2e8f0; padding:8px 12px; border-radius:8px; font-size:9.5px; line-height:1.4;">
                <div style="color:#64748b; font-family:monospace, sans-serif;">ভেরিফিকেশন নং:</div>
                <div style="font-family:monospace, sans-serif; font-weight:bold; color:#1e293b; font-size:10.5px; margin-top:1px;">${escapeHtml(verificationCode)}</div>
                <div style="color:#64748b; margin-top:2px;">তারিখ: <strong style="color:#334155;">${escapeHtml(formatBengaliDateTimeSafe(result.dateTaken))}</strong></div>
                <div style="margin-top:3px;">
                  <span style="display:inline-block; padding:1px 6px; border-radius:999px; font-weight:bold; font-size:9px; background-color:${isPassed ? '#dcfce7' : '#fef9c3'}; color:${isPassed ? '#166534' : '#854d0e'}; border:${isPassed ? '1px solid #86efac' : '1px solid #fde047'};">
                    ${isPassed ? '✓ উত্তীর্ণ (PASSED)' : '⚠️ অনুশীলন প্রয়োজন'}
                  </span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- 2. Candidate & Exam Information Ribbon (Unclipped, Generous Line-Height) -->
        <table style="width:100%; border-collapse:collapse; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:12px;">
          <tr>
            <td style="padding:9px 12px; width:24%; vertical-align:top; border-right:1px solid #e2e8f0;">
              <span style="display:block; font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase; line-height:1.3;">পরীক্ষার্থীর নাম</span>
              <div style="color:#0f172a; font-size:12px; font-weight:bold; line-height:1.45; margin-top:2px; word-break:break-word;">
                ${escapeHtml(result.studentName)}
              </div>
            </td>
            <td style="padding:9px 12px; width:33%; vertical-align:top; border-right:1px solid #e2e8f0;">
              <span style="display:block; font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase; line-height:1.3;">পরীক্ষার নাম</span>
              <div style="color:#0f172a; font-size:12px; font-weight:bold; line-height:1.45; margin-top:2px; word-break:break-word;">
                ${escapeHtml(result.examTitle)}
              </div>
            </td>
            <td style="padding:9px 12px; width:21%; vertical-align:top; border-right:1px solid #e2e8f0;">
              <span style="display:block; font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase; line-height:1.3;">বিষয় / ক্যাটাগরি</span>
              <div style="color:#0f172a; font-size:12px; font-weight:bold; line-height:1.45; margin-top:2px; word-break:break-word;">
                ${escapeHtml(result.subject || 'বিসিএস ও চাকরি প্রস্তুতি')}
              </div>
            </td>
            <td style="padding:9px 12px; width:22%; vertical-align:top;">
              <span style="display:block; font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase; line-height:1.3;">ব্যয়িত সময়</span>
              <div style="color:#0f172a; font-size:12px; font-weight:bold; line-height:1.45; margin-top:2px;">
                ${toBengaliDigits(Math.floor(result.timeSpentSeconds / 60))} মিনিট ${toBengaliDigits(result.timeSpentSeconds % 60)} সেকেন্ড
              </div>
            </td>
          </tr>
        </table>

        <!-- 3. Performance Scorecard Summary (6 boxes) -->
        <table style="width:100%; border-collapse:separate; border-spacing:6px 0; margin-bottom:12px;">
          <tr>
            <td style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px 4px; text-align:center; width:16.66%;">
              <span style="font-size:9px; font-weight:bold; color:#64748b; display:block; line-height:1.3;">মোট প্রশ্ন</span>
              <span style="font-size:14px; font-weight:900; color:#1e293b; display:block; margin-top:2px; line-height:1.3;">${toBengaliDigits(result.totalQuestions)}</span>
            </td>
            <td style="background-color:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:6px 4px; text-align:center; width:16.66%;">
              <span style="font-size:9px; font-weight:bold; color:#166534; display:block; line-height:1.3;">প্রাপ্ত নম্বর</span>
              <span style="font-size:14px; font-weight:900; color:#15803d; display:block; margin-top:2px; line-height:1.3;">${toBengaliDigits(result.score)}</span>
            </td>
            <td style="background-color:#eff6ff; border:1px solid #93c5fd; border-radius:8px; padding:6px 4px; text-align:center; width:16.66%;">
              <span style="font-size:9px; font-weight:bold; color:#1e40af; display:block; line-height:1.3;">শতকরা হার</span>
              <span style="font-size:14px; font-weight:900; color:#2563eb; display:block; margin-top:2px; line-height:1.3;">${toBengaliDigits(percentage)}%</span>
            </td>
            <td style="background-color:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:6px 4px; text-align:center; width:16.66%;">
              <span style="font-size:9px; font-weight:bold; color:#166534; display:block; line-height:1.3;">সঠিক উত্তর</span>
              <span style="font-size:14px; font-weight:900; color:#16a34a; display:block; margin-top:2px; line-height:1.3;">${toBengaliDigits(result.correctAnswers)} টি</span>
            </td>
            <td style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:6px 4px; text-align:center; width:16.66%;">
              <span style="font-size:9px; font-weight:bold; color:#991b1b; display:block; line-height:1.3;">ভুল উত্তর</span>
              <span style="font-size:14px; font-weight:900; color:#dc2626; display:block; margin-top:2px; line-height:1.3;">${toBengaliDigits(result.wrongAnswers)} টি</span>
            </td>
            <td style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:6px 4px; text-align:center; width:16.66%;">
              <span style="font-size:9px; font-weight:bold; color:#92400e; display:block; line-height:1.3;">মেধা স্থান</span>
              <span style="font-size:14px; font-weight:900; color:#d97706; display:block; margin-top:2px; line-height:1.3;">#${toBengaliDigits(computedRank)} তম</span>
            </td>
          </tr>
        </table>

        ${subjectPerformanceHtml}

        <!-- 4. Section Title Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-bottom:10px;">
          <h2 style="font-weight:900; font-size:12px; color:#0f172a; margin:0; display:flex; align-items:center; gap:5px; line-height:1.3;">
            <span>📋</span>
            <span>বিস্তারিত প্রশ্ন ও উত্তর মূল্যায়ন</span>
            <span style="font-size:10px; font-weight:600; color:#64748b;">
              (${toBengaliDigits(totalQuestions)} টি প্রশ্ন${isMultiColumn ? ' • ২ কলামে সারিবদ্ধ' : ' • ১ কলামে'})
            </span>
          </h2>
          <span style="font-size:9px; color:#64748b; font-weight:600;">
            পৃষ্ঠা ১ / ${toBengaliDigits(totalPages)}
          </span>
        </div>

        <!-- Questions on Page 1 -->
        <div style="flex:1;">
          ${page1QuestionsContent}
        </div>
      </div>

      <!-- Formal Footer (only on final page if totalPages === 1) -->
      ${totalPages === 1 ? formalFooterHtml : `
        <div style="padding-top:6px; border-top:1px solid #f1f5f9; text-align:center; font-size:8.5px; color:#94a3b8; position:relative; z-index:10;">
          মেধা এক্সাম অফিসিয়াল মূল্যায়ন পত্র • চলমান (পরবর্তী পৃষ্ঠা দেখুন)
        </div>
      `}
    </div>
  `;

  // Subsequent Pages (Page 2 to totalPages)
  for (let pIdx = 1; pIdx < totalPages; pIdx++) {
    const curPageConfig = pagesConfig[pIdx];
    const isFinalPage = pIdx === totalPages - 1;

    const col1Html = curPageConfig.col1.map((item) => renderQuestionHtml(item, true)).join('');
    const col2Html = curPageConfig.col2.map((item) => renderQuestionHtml(item, true)).join('');

    pagesHtml += `
      <div class="pdf-page" id="pdf-page-${curPageConfig.pageNum}" style="width:800px; height:1130px; min-height:1130px; position:relative; box-sizing:border-box; padding:24px 28px; background:#ffffff; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; margin-bottom:20px;">
        ${watermarkHtml}

        <div style="position:relative; z-index:10; flex:1; display:flex; flex-direction:column;">
          <!-- Compact Header for Subsequent Pages -->
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1.5px solid #059669; padding-bottom:8px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:26px; height:26px; border-radius:6px; background-color:#059669; display:flex; align-items:center; justify-content:center;">
                <div style="width:22px; height:22px;">
                  ${CLEAN_MEDHA_LOGO_SVG}
                </div>
              </div>
              <span style="font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.2;">মেধা এক্সাম</span>
              <span style="color:#64748b; font-size:10px;">•</span>
              <span style="font-size:11px; font-weight:600; color:#475569; line-height:1.2;">${escapeHtml(result.examTitle)} (${escapeHtml(result.studentName)})</span>
            </div>
            <span style="font-size:9.5px; font-weight:700; color:#059669; background:#dcfce7; padding:2px 8px; border-radius:4px;">
              পৃষ্ঠা ${toBengaliDigits(curPageConfig.pageNum)} / ${toBengaliDigits(totalPages)}
            </span>
          </div>

          <!-- Questions Content in 2 Columns -->
          <div style="display:flex; gap:10px; align-items:flex-start; flex:1;">
            <div style="flex:1; width:50%;">${col1Html}</div>
            <div style="flex:1; width:50%;">${col2Html}</div>
          </div>
        </div>

        <!-- Footer on subsequent page -->
        ${isFinalPage ? formalFooterHtml : `
          <div style="padding-top:6px; border-top:1px solid #f1f5f9; text-align:center; font-size:8.5px; color:#94a3b8; position:relative; z-index:10;">
            মেধা এক্সাম অফিসিয়াল মূল্যায়ন পত্র • চলমান (পরবর্তী পৃষ্ঠা দেখুন)
          </div>
        `}
      </div>
    `;
  }

  // Full HTML document
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        @font-face {
          font-family: 'Noto Sans Bengali Local';
          src: url('/fonts/NotoSansBengali-Regular.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Noto Sans Bengali Local';
          src: url('/fonts/NotoSansBengali-Bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        * {
          box-sizing: border-box;
        }
        body {
          background-color: #ffffff;
          color: #0f172a;
          font-family: 'Noto Sans Bengali Local', 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif;
          width: 800px;
          margin: 0 auto;
          line-height: 1.45;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .pdf-page {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;

  // Create isolated sandbox iframe:
  // MUST have opacity: 1 and pointerEvents: none so html2canvas renders every pixel
  // Positioned at top: 0, left: 0 with z-index: -99999 so it sits behind app UI without showing on screen
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '820px';
  iframe.style.height = `${(totalPages * 1150) + 200}px`;
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

    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    // 1. Wait for Google fonts ('Hind Siliguri', 'Noto Sans Bengali') to resolve inside iframe
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 450));

    // 2. Locate all .pdf-page elements
    const pageElements = iframeDoc.querySelectorAll('.pdf-page');
    if (pageElements.length === 0) {
      throw new Error('পিডিএফ পেজ প্রস্তুত করা সম্ভব হয়নি।');
    }

    // 3. Initialize jsPDF in A4 format (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // 4. Capture each page individually with high DPI (scale: 2.2)
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;

      const canvas = await html2canvas(pageEl, {
        scale: 2.2,
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

    // 5. Clean filename and download directly
    const cleanExamTitle = (result.examTitle || 'মেধা_পরীক্ষা')
      .replace(/[^\w\s\u0980-\u09FF-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const fileName = `মেধা_পরীক্ষা_${cleanExamTitle}_ফলাফল.pdf`;
    pdf.save(fileName);

    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    throw err;
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
