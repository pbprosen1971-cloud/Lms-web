/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam, Question } from '../types';
import { toBengaliDigits } from '../lib/dateUtils';

export type ExamPdfVersion = 'questions_only' | 'with_answers';

export interface ExamPdfOptions {
  siteName?: string;
  version: ExamPdfVersion;
  onProgress?: (status: string) => void;
}

/**
 * Escapes HTML characters to prevent rendering bugs and injection
 */
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * High-definition math & text formatter for exam question papers and answer sheets.
 * - Restores safe formatting tags
 * - Converts Unicode superscripts (⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻ ⁿ ˣ ʸ) into elevated bold math superscripts
 * - Converts caret power notation (e.g. x^2, 2^3, (a+b)^2, ২^২) into crisp <sup> elements
 * - Standardizes multiplication (×) and division (÷) operators with balanced math spacing
 * - Guarantees numbers, formulas, and symbols are sharp, clear, and never clipped or blurred
 */
function formatMathAndContent(raw: any): string {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // 1. Escape HTML entities
  str = str.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;')
           .replace(/'/g, '&#039;');

  // Restore safe inline tags
  str = str.replace(/&lt;(\/?(sup|sub|b|strong|i|em|br))&gt;/gi, '<$1>');

  // High-clarity superscript and subscript inline styles
  const supStyle = `font-size: 0.72em; font-weight: 800; vertical-align: baseline; position: relative; top: -0.42em; line-height: 0; font-family: 'Poppins', 'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif; margin-left: 1.5px; margin-right: 1.5px; display: inline-block;`;
  const subStyle = `font-size: 0.72em; font-weight: 800; vertical-align: baseline; position: relative; top: 0.28em; line-height: 0; font-family: 'Poppins', 'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif; margin-left: 1.5px; margin-right: 1.5px; display: inline-block;`;

  // 2. Normalize existing <sup> and <sub> tags
  str = str.replace(/<sup(?:\s+[^>]*)?>(.*?)<\/sup>/gi, `<sup style="${supStyle}">$1</sup>`);
  str = str.replace(/<sub(?:\s+[^>]*)?>(.*?)<\/sub>/gi, `<sub style="${subStyle}">$1</sub>`);

  // 3. Map Unicode superscript characters to styled superscripts
  const unicodeSupMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
    'ⁿ': 'n', 'ˣ': 'x', 'ʸ': 'y'
  };

  str = str.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣʸ]+/g, (match) => {
    const converted = match.split('').map(ch => unicodeSupMap[ch] || ch).join('');
    return `<sup style="${supStyle}">${converted}</sup>`;
  });

  // 4. Convert caret power notation (e.g. 2^3, x^2, (a+b)^2, ২^২)
  str = str.replace(/\^([0-9a-zA-Z\u0980-\u09FF\+\-]+)/g, `<sup style="${supStyle}">$1</sup>`);

  // 5. Enhance math multiplication '×' and division '÷' operators
  str = str.replace(/\s*×\s*/g, ` <span style="font-weight: 700; font-family: 'Segoe UI', Arial, sans-serif; margin: 0 1px;">×</span> `);
  str = str.replace(/\s*÷\s*/g, ` <span style="font-weight: 700; font-family: 'Segoe UI', Arial, sans-serif; margin: 0 1px;">÷</span> `);

  return str;
}


/**
 * Safely parses and resolves the correct answer index (0, 1, 2, or 3) from any database representation:
 * - Direct number index: 0, 1, 2, 3
 * - English letter: 'A', 'B', 'C', 'D' (or lowercase)
 * - Bengali letter: 'ক', 'খ', 'গ', 'ঘ'
 * - String numbers: '0', '1', '2', '3' or 1-based '1', '2', '3', '4'
 * - Matching option text: if the answer field holds the text of one of the options
 * - Intelligent explanation verification: if an answer is 0/'A', but the question explanation specifically names another option (খ, গ, ঘ)
 */
export function resolveCorrectAnswerIndex(qOrData: any, options: string[]): number {
  if (!qOrData) return 0;
  const raw = qOrData.correctAnswerIndex ?? qOrData.correctAnswer ?? qOrData.correctOption ?? qOrData.answer ?? qOrData.correct ?? qOrData.ans;

  let directIdx = -1;

  if (typeof raw === 'number' && !isNaN(raw) && raw >= 0 && raw < options.length) {
    directIdx = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();

    // English letter match
    if (upper === 'A' || upper === '(A)' || upper === 'A.') directIdx = 0;
    else if (upper === 'B' || upper === '(B)' || upper === 'B.') directIdx = 1;
    else if (upper === 'C' || upper === '(C)' || upper === 'C.') directIdx = 2;
    else if (upper === 'D' || upper === '(D)' || upper === 'D.') directIdx = 3;
    // Bengali letter match
    else if (trimmed === 'ক' || trimmed === '(ক)' || trimmed === 'ক.') directIdx = 0;
    else if (trimmed === 'খ' || trimmed === '(খ)' || trimmed === 'খ.') directIdx = 1;
    else if (trimmed === 'গ' || trimmed === '(গ)' || trimmed === 'গ.') directIdx = 2;
    else if (trimmed === 'ঘ' || trimmed === '(ঘ)' || trimmed === 'ঘ.') directIdx = 3;
    // Bengali digits
    else if (trimmed === '১') directIdx = 0;
    else if (trimmed === '২') directIdx = 1;
    else if (trimmed === '৩') directIdx = 2;
    else if (trimmed === '৪') directIdx = 3;
    else {
      // Check if raw string is identical to one of the options
      for (let i = 0; i < options.length; i++) {
        if (options[i] && options[i].trim() && (options[i].trim().toLowerCase() === trimmed.toLowerCase() || options[i].trim() === trimmed)) {
          directIdx = i;
          break;
        }
      }

      if (directIdx === -1) {
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed)) {
          if (parsed >= 0 && parsed < options.length) directIdx = parsed;
          else if (parsed >= 1 && parsed <= options.length) directIdx = parsed - 1;
        }
      }
    }
  }

  // Explanation verification:
  // If directIdx was 0 (or unassigned -1), but explanation specifically mentions a different option (e.g. option 1, 2, or 3)
  const exp = typeof qOrData.explanation === 'string' ? qOrData.explanation.trim() : '';
  if (exp && options.length >= 2) {
    let expMatchedIdx = -1;
    let expMatchCount = 0;

    options.forEach((opt, idx) => {
      const cleanOpt = (opt || '').trim();
      if (cleanOpt.length >= 2) {
        // Look for exact word or phrase boundary in explanation
        if (exp.includes(cleanOpt)) {
          expMatchedIdx = idx;
          expMatchCount++;
        }
      }
    });

    // If explanation unequivocally identifies an option
    if (expMatchCount === 1 && expMatchedIdx !== -1) {
      if (directIdx <= 0 || directIdx === expMatchedIdx) {
        return expMatchedIdx;
      }
    }
  }

  return directIdx >= 0 && directIdx < options.length ? directIdx : 0;
}

/**
 * Maps a Firestore doc to Question type safely
 */
function mapDocToQuestion(docSnap: any): Question {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || `q-${Date.now()}`;

  const optA = data.optionA ?? data.options?.[0] ?? '';
  const optB = data.optionB ?? data.options?.[1] ?? '';
  const optC = data.optionC ?? data.options?.[2] ?? '';
  const optD = data.optionD ?? data.options?.[3] ?? '';

  const options = Array.isArray(data.options) && data.options.length >= 2
    ? data.options
    : [optA, optB, optC, optD].filter(Boolean).length >= 2
      ? [optA, optB, optC, optD]
      : Array.isArray(data.options) ? data.options : ['', '', '', ''];

  const correctAnswer = resolveCorrectAnswerIndex(data, options);

  return {
    id,
    text: data.text || data.questionText || data.question || '',
    options,
    correctAnswer,
    explanation: data.explanation || '',
    subject: data.subject || '',
    questionNumber: typeof data.questionNumber === 'number' ? data.questionNumber : undefined,
  };
}

/**
 * Fetches questions for an exam from Firestore if not already attached.
 * Checks /Exam/{examId}/questions, then /exam/{examId}/questions, then /questions.
 */
export async function fetchExamQuestions(exam: Exam): Promise<Question[]> {
  const normalizeList = (list: Question[]): Question[] => {
    return list.map(q => {
      const opts = Array.isArray(q.options) ? q.options : [];
      const resolved = resolveCorrectAnswerIndex(q, opts);
      return {
        ...q,
        correctAnswer: resolved,
      };
    }).sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  };

  if (exam.questions && exam.questions.length > 0) {
    return normalizeList(exam.questions);
  }

  const examId = exam.id;
  if (!examId) return [];

  try {
    // 1. Check /Exam/{examId}/questions
    const subQSnap = await getDocs(collection(db, 'Exam', examId, 'questions'));
    if (!subQSnap.empty) {
      const list: Question[] = [];
      subQSnap.forEach(d => list.push(mapDocToQuestion(d)));
      return list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    }

    // 2. Check /exam/{examId}/questions (lowercase fallback)
    const lowerSubQSnap = await getDocs(collection(db, 'exam', examId, 'questions'));
    if (!lowerSubQSnap.empty) {
      const list: Question[] = [];
      lowerSubQSnap.forEach(d => list.push(mapDocToQuestion(d)));
      return list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    }

    // 3. Fallback: /questions collection with examId
    const legacyQ = query(collection(db, 'questions'), where('examId', '==', examId));
    const legacySnap = await getDocs(legacyQ);
    if (!legacySnap.empty) {
      const list: Question[] = [];
      legacySnap.forEach(d => list.push(mapDocToQuestion(d)));
      return list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    }
  } catch (err) {
    console.warn(`Error fetching questions for exam ${examId}:`, err);
  }

  return [];
}

const BENGALI_OPTION_PREFIXES = ['(ক)', '(খ)', '(গ)', '(ঘ)', '(ঙ)', '(চ)'];

/**
 * Creates HTML string for a single question item with clean, compact 2-column or 1-column layout
 * so multiple questions fit per page without wasting paper.
 */
function buildQuestionHtml(q: Question, idx: number, version: ExamPdfVersion): string {
  const qNum = toBengaliDigits(idx + 1);
  const validOptions = Array.isArray(q.options) ? q.options.filter(o => o !== null && o !== undefined) : [];
  
  const correctIdx = resolveCorrectAnswerIndex(q, validOptions);

  // Check if all options can comfortably fit in a 2-column grid (<= 45 characters each)
  const allOptionsCompact = validOptions.every(opt => (opt ? String(opt).trim().length <= 45 : true));

  // Helper to render a single option box
  const renderSingleOption = (opt: string, optIdx: number, isCorrect: boolean): string => {
    const prefix = BENGALI_OPTION_PREFIXES[optIdx] || `(${optIdx + 1})`;
    const formattedOpt = formatMathAndContent(opt);

    if (isCorrect) {
      return `
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ecfdf5; border: 1.5px solid #10b981; border-radius: 6px; margin: 0; table-layout: auto;">
          <tr>
            <td style="padding: 5px 8px; vertical-align: middle; color: #065f46; font-size: 11.5px; font-weight: 700; line-height: 1.35; text-align: left;">
              <span style="color: #047857; font-weight: 800; margin-right: 5px;">${prefix}</span><span>${formattedOpt}</span>
            </td>
            <td style="padding: 3px 6px; vertical-align: middle; text-align: right; width: 85px; white-space: nowrap;">
              <span style="display: inline-block; vertical-align: middle; background-color: #059669; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2.5px 7px; border-radius: 4px; line-height: 13px; text-align: center; white-space: nowrap; font-family: 'Noto Sans Bengali', -apple-system, sans-serif;">
                ✓ সঠিক উত্তর
              </span>
            </td>
          </tr>
        </table>
      `;
    }

    return `
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1.5px solid transparent; margin: 0; table-layout: auto;">
        <tr>
          <td style="padding: 5px 8px; vertical-align: middle; color: #1e293b; font-size: 11.5px; font-weight: 600; line-height: 1.35; text-align: left;">
            <span style="font-weight: 700; color: #475569; margin-right: 5px;">${prefix}</span><span>${formattedOpt}</span>
          </td>
        </tr>
      </table>
    `;
  };

  let optionsContainerHtml = '';
  if (allOptionsCompact && validOptions.length <= 4) {
    const rowsHtml: string[] = [];
    for (let r = 0; r < validOptions.length; r += 2) {
      const optLeft = renderSingleOption(validOptions[r], r, version === 'with_answers' && r === correctIdx);
      const rightIdx = r + 1;
      const optRight = rightIdx < validOptions.length
        ? renderSingleOption(validOptions[rightIdx], rightIdx, version === 'with_answers' && rightIdx === correctIdx)
        : '';

      rowsHtml.push(`
        <tr>
          <td style="width: 50%; vertical-align: middle; padding: 1.5px 6px 1.5px 0;">
            ${optLeft}
          </td>
          <td style="width: 50%; vertical-align: middle; padding: 1.5px 0 1.5px 6px;">
            ${optRight}
          </td>
        </tr>
      `);
    }

    optionsContainerHtml = `
      <table style="width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; margin: 2px 0;">
        ${rowsHtml.join('')}
      </table>
    `;
  } else {
    const rowsHtml = validOptions.map((opt, oIdx) => `
      <tr>
        <td style="width: 100%; vertical-align: middle; padding: 1.5px 0;">
          ${renderSingleOption(opt, oIdx, version === 'with_answers' && oIdx === correctIdx)}
        </td>
      </tr>
    `).join('');

    optionsContainerHtml = `
      <table style="width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; margin: 2px 0;">
        ${rowsHtml}
      </table>
    `;
  }

  const explanationHtml = (version === 'with_answers' && q.explanation && q.explanation.trim()) ? `
    <div style="margin-top: 4px; padding: 5px 9px; background-color: #f8fafc; border-left: 3.5px solid #0284c7; border-radius: 4px; font-size: 11px; color: #334155; line-height: 1.45;">
      <span style="font-weight: 800; color: #0369a1; margin-right: 4px;">ব্যাখ্যা:</span>${formatMathAndContent(q.explanation)}
    </div>
  ` : '';

  return `
    <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.4;">
      <span style="font-weight: 800; color: #059669; margin-right: 4px;">${qNum}.</span> ${formatMathAndContent(q.text)}
    </div>
    ${optionsContainerHtml}
    ${explanationHtml}
  `;
}

let cachedWatermarkUrl: string | null = null;

/**
 * Creates a subtle, semi-transparent watermark pattern with 'Medha Exam'
 * running diagonally across each page to prevent unauthorized redistribution.
 */
function getWatermarkPatternUrl(): string {
  if (cachedWatermarkUrl) return cachedWatermarkUrl;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 280, 180);
    ctx.save();
    ctx.translate(140, 90);
    ctx.rotate(-28 * Math.PI / 180);

    // Primary Brand watermark: 'Medha Exam'
    ctx.font = 'bold 22px "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.052)'; // subtle semi-transparent slate
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Medha Exam', 0, -8);

    // Secondary Site watermark: 'medhaexam.site'
    ctx.font = '700 11px "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(5, 150, 105, 0.052)'; // subtle semi-transparent emerald
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('medhaexam.site', 0, 14);

    ctx.restore();
    cachedWatermarkUrl = canvas.toDataURL('image/png');
    return cachedWatermarkUrl;
  } catch (err) {
    console.warn('Watermark generation warning:', err);
    return '';
  }
}

interface PageElements {
  pageEl: HTMLElement;
  questionsContainer: HTMLElement;
  footerPageNumSpan: HTMLElement;
  maxQuestionsHeight: number;
}

/**
 * Generates and downloads a compact, multi-page Bengali MCQ Exam Question PDF.
 * Multiple questions (10 to 16) are placed on each page (saving paper and pages).
 * Overflowing questions cleanly wrap to the next page so no option or text is cut off or missing.
 */
export async function downloadExamQuestionPdf(
  exam: Exam,
  questions: Question[],
  options: ExamPdfOptions
): Promise<boolean> {
  if (!questions || questions.length === 0) {
    alert('এই পরীক্ষায় ডাউনলোড করার মতো কোনো প্রশ্ন পাওয়া যায়নি।');
    return false;
  }

  const { version, onProgress } = options;
  if (onProgress) onProgress('PDF প্রস্তুত করা হচ্ছে...');

  const durationMin = exam.durationMinutes || 30;
  const totalQCount = questions.length;
  const totalMarks = exam.totalMarks || totalQCount;

  // Master container (render in-viewport beneath current view for perfect subpixel font metrics)
  const masterContainer = document.createElement('div');
  masterContainer.style.position = 'fixed';
  masterContainer.style.left = '0';
  masterContainer.style.top = '0';
  masterContainer.style.width = '820px';
  masterContainer.style.zIndex = '-99999';
  masterContainer.style.pointerEvents = 'none';
  masterContainer.style.backgroundColor = '#ffffff';

  document.body.appendChild(masterContainer);

  // Version subtitle text
  const versionBadge = version === 'questions_only' 
    ? `<span style="font-size: 10px; font-weight: 700; color: #475569; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 10px; border-radius: 10px;">প্রশ্নপত্র (Question Paper)</span>`
    : `<span style="font-size: 10px; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 10px;">প্রশ্ন, সঠিক উত্তর ও ব্যাখ্যাসহ সমাধানপত্র (Answer Key & Explanations)</span>`;

  // Helper to create an A4 page element
  const createPage = (pageNumber: number): PageElements => {
    const pageEl = document.createElement('div');
    pageEl.style.boxSizing = 'border-box';
    pageEl.style.width = '794px';
    pageEl.style.height = '1123px';
    pageEl.style.maxHeight = '1123px';
    pageEl.style.minHeight = '1123px';
    pageEl.style.backgroundColor = '#ffffff';
    pageEl.style.color = '#0f172a';
    pageEl.style.position = 'relative';
    pageEl.style.fontFamily = "'Noto Sans Bengali', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hind Siliguri', Kalpurush, sans-serif";
    // Left margin 52px (ample margin as requested), right 36px, top 24px, bottom 18px
    pageEl.style.padding = '24px 36px 18px 52px';
    pageEl.style.display = 'flex';
    pageEl.style.flexDirection = 'column';
    pageEl.style.justifyContent = 'space-between';
    pageEl.style.overflow = 'hidden';
    pageEl.style.marginBottom = '25px';

    // Header: Full header on Page 1, compact running header on subsequent pages
    let headerHtml = '';
    // Available height on Page 1: 1123 - padding(42) - header(~145) - footer(~32) - buffer(15) = ~880px
    // Available height on Page 2+: 1123 - padding(42) - header(~28) - footer(~32) - buffer(15) = ~1000px
    let maxQuestionsHeight = pageNumber === 1 ? 880 : 1000;

    if (pageNumber === 1) {
      headerHtml = `
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; flex-shrink: 0;">
          <div style="font-size: 10.5px; font-weight: 700; color: #059669; letter-spacing: 0.5px; margin-bottom: 2px; text-transform: uppercase;">
            মেধা এক্সাম (Medha Exam) • অনলাইন পরীক্ষা ও প্রস্তুতি
          </div>
          <h1 style="font-size: 19px; font-weight: 900; color: #0f172a; margin: 2px 0 4px 0; line-height: 1.3;">
            ${escapeHtml(exam.title)}
          </h1>
          <div style="font-size: 11.5px; font-weight: 600; color: #334155; margin-bottom: 5px; display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap;">
            <span>⏱️ সময়: <strong>${toBengaliDigits(durationMin)} মিনিট</strong></span>
            <span>•</span>
            <span>📝 মোট প্রশ্ন: <strong>${toBengaliDigits(totalQCount)} টি</strong></span>
            <span>•</span>
            <span>🎯 পূর্ণমান: <strong>${toBengaliDigits(totalMarks)}</strong></span>
            ${exam.subject ? `<span>•</span><span>বিষয়: <strong>${escapeHtml(exam.subject)}</strong></span>` : ''}
          </div>
          <div>
            ${versionBadge}
          </div>
        </div>
      `;
    } else {
      headerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 5px; margin-bottom: 10px; font-size: 10.5px; color: #475569; font-weight: 700; flex-shrink: 0;">
          <span style="font-weight: 800; color: #0f172a;">${escapeHtml(exam.title)}</span>
          <span style="color: #059669;">${version === 'questions_only' ? 'প্রশ্নপত্র' : 'প্রশ্ন ও সমাধানপত্র'}</span>
        </div>
      `;
    }

    // Dedicated Footer on EVERY page with medhaexam.site & page number
    const footerHtml = `
      <div style="border-top: 1.5px solid #e2e8f0; padding-top: 6px; margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #64748b; flex-shrink: 0; font-family: 'Noto Sans Bengali', 'Poppins', sans-serif;">
        <span style="font-weight: 600;">মেধা এক্সাম (Medha Exam)</span>
        <span style="color: #059669; font-weight: 800; font-family: monospace, sans-serif; font-size: 11.5px; letter-spacing: 0.5px;">medhaexam.site</span>
        <span class="page-num-span" style="font-weight: 700; color: #334155;">পৃষ্ঠা ${toBengaliDigits(pageNumber)}</span>
      </div>
    `;

    const watermarkUrl = getWatermarkPatternUrl();

    pageEl.innerHTML = `
      ${watermarkUrl ? `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; background-image: url('${watermarkUrl}'); background-repeat: repeat;"></div>` : ''}
      <div style="position: relative; z-index: 1; flex-shrink: 0;">
        ${headerHtml}
      </div>
      <div class="questions-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; z-index: 1;"></div>
      <div style="position: relative; z-index: 1; flex-shrink: 0; margin-top: auto;">
        ${footerHtml}
      </div>
    `;

    masterContainer.appendChild(pageEl);

    const questionsContainer = pageEl.querySelector('.questions-container') as HTMLElement;
    const footerPageNumSpan = pageEl.querySelector('.page-num-span') as HTMLElement;

    return { pageEl, questionsContainer, footerPageNumSpan, maxQuestionsHeight };
  };

  try {
    // Ensure document fonts are fully loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise(r => setTimeout(r, 250));

    const pages: PageElements[] = [];
    let currentPage = createPage(1);
    pages.push(currentPage);

    let currentAccumulatedHeight = 0;

    // Populate questions with intelligent multi-question pagination
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qItemEl = document.createElement('div');
      qItemEl.style.boxSizing = 'border-box';
      qItemEl.style.marginBottom = '8px';
      qItemEl.style.paddingBottom = '6px';
      qItemEl.style.borderBottom = '1px dashed #e2e8f0';
      qItemEl.innerHTML = buildQuestionHtml(q, i, version);

      // Append to the current page so browser lays out the DOM element
      currentPage.questionsContainer.appendChild(qItemEl);

      // Measure real rendered height of this question item
      const itemRectHeight = qItemEl.getBoundingClientRect().height;
      const qHeight = Math.max(qItemEl.offsetHeight, itemRectHeight, 45);

      // Check if adding this question exceeds the page's allowed questions area
      const willExceed = (currentAccumulatedHeight + qHeight) > currentPage.maxQuestionsHeight;

      if (willExceed && currentPage.questionsContainer.children.length > 1) {
        // Remove question from full page so nothing gets clipped
        currentPage.questionsContainer.removeChild(qItemEl);

        // Open a clean new page
        currentPage = createPage(pages.length + 1);
        pages.push(currentPage);

        // Add the question to the beginning of the new page
        currentPage.questionsContainer.appendChild(qItemEl);

        const newPageItemHeight = Math.max(qItemEl.offsetHeight, qItemEl.getBoundingClientRect().height, 45);
        currentAccumulatedHeight = newPageItemHeight + 8; // item height + margin
      } else {
        currentAccumulatedHeight += qHeight + 8;
      }
    }

    // Update all page footers with total pages count (e.g., পৃষ্ঠা ১ / ৫)
    const totalPagesCount = pages.length;
    pages.forEach((p, idx) => {
      p.footerPageNumSpan.innerText = `পৃষ্ঠা ${toBengaliDigits(idx + 1)} / ${toBengaliDigits(totalPagesCount)}`;
    });

    if (onProgress) onProgress('PDF পেজ রেন্ডার করা হচ্ছে...');

    // Initialize jsPDF A4 Portrait (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Render each page into an exact A4 sheet
    for (let i = 0; i < pages.length; i++) {
      if (onProgress) onProgress(`পেজ ${toBengaliDigits(i + 1)} / ${toBengaliDigits(totalPagesCount)} প্রস্তুত হচ্ছে...`);
      
      const canvas = await html2canvas(pages[i].pageEl, {
        scale: 2.2, // Ultra-sharp Bengali & math typography
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Lossless PNG format ensures clean numbers, superscripts, math operators, and zero JPEG compression artifacts
      const pageImgData = canvas.toDataURL('image/png');

      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    // Save and download file
    const cleanTitle = (exam.title || 'Exam')
      .replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_')
      .substring(0, 30);
    const suffix = version === 'questions_only' ? 'Question_Paper' : 'With_Answers_Solution';
    const fileName = `MedhaExam_${cleanTitle}_${suffix}.pdf`;

    pdf.save(fileName);
    if (onProgress) onProgress('ডাউনলোড সম্পন্ন হয়েছে!');
    return true;
  } catch (err) {
    console.error('Failed to generate exam question PDF:', err);
    alert('PDF তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    return false;
  } finally {
    if (masterContainer.parentNode) {
      masterContainer.parentNode.removeChild(masterContainer);
    }
  }
}
