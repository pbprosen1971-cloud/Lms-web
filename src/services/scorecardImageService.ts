/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { ExamResult } from '../types';
import { toBengaliDigits, formatBengaliDateTimeSafe } from '../lib/dateUtils';

interface ScorecardImageParams {
  result: ExamResult;
  percentage: number;
  computedRank: number;
  feedback: {
    title: string;
    sub: string;
    color?: string;
  };
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

// Clean standard SVG logo without filter tags for 100% canvas compatibility
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
 * Generates and downloads a high-resolution, social-media ready scorecard image.
 * Uses an isolated sandbox iframe with embedded Bengali typography and scalable vector art.
 */
export async function downloadExamResultImage({
  result,
  percentage,
  computedRank,
  feedback,
}: ScorecardImageParams): Promise<boolean> {
  const isPassed = percentage >= 60;
  const verificationCode = `MEX-${(result.id || result.examId || 'MEDHA').slice(-6).toUpperCase()}-${toBengaliDigits(result.score)}`;
  const dateFormatted = formatBengaliDateTimeSafe(result.dateTaken || new Date().toISOString());
  const minutesSpent = Math.floor(result.timeSpentSeconds / 60);
  const secondsSpent = result.timeSpentSeconds % 60;
  const accuracy = (result.correctAnswers + result.wrongAnswers) > 0
    ? Math.round((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100)
    : percentage;

  // Build the complete HTML for the social share scorecard card (800x820px, 2x scale = 1600x1640px)
  const scorecardHtml = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @font-face {
          font-family: 'Noto Sans Bengali Local';
          src: url('/fonts/NotoSansBengali-Regular.ttf') format('truetype');
          font-weight: 400;
        }
        @font-face {
          font-family: 'Noto Sans Bengali Local';
          src: url('/fonts/NotoSansBengali-Bold.ttf') format('truetype');
          font-weight: 700;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background-color: #090d16;
          font-family: 'Noto Sans Bengali Local', 'Hind Siliguri', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: 820px;
          height: 840px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          -webkit-font-smoothing: antialiased;
        }
        .card {
          width: 780px;
          height: 800px;
          background: linear-gradient(145deg, #064e3b 0%, #065f46 22%, #0f172a 68%, #032b1d 100%);
          border-radius: 28px;
          padding: 32px 36px;
          color: #ffffff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          border: 2px solid rgba(16, 185, 129, 0.45);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .glow-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }
        .glow-1 {
          top: -40px;
          right: -40px;
          width: 260px;
          height: 260px;
          background: rgba(16, 185, 129, 0.28);
        }
        .glow-2 {
          bottom: -50px;
          left: -40px;
          width: 240px;
          height: 240px;
          background: rgba(37, 99, 235, 0.22);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding-bottom: 18px;
          position: relative;
          z-index: 5;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background-color: #00a854;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 168, 84, 0.35);
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.3px;
          color: #ffffff;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #a7f3d0;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .verified-badge {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(52, 211, 153, 0.45);
          color: #6ee7b7;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .exam-info-panel {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 16px 22px;
          margin-top: 18px;
          position: relative;
          z-index: 5;
        }
        .exam-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.3;
          margin-bottom: 6px;
        }
        .candidate-meta {
          font-size: 13px;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .candidate-meta strong {
          color: #f8fafc;
          font-weight: 700;
        }
        .score-row {
          display: flex;
          gap: 18px;
          margin-top: 18px;
          position: relative;
          z-index: 5;
        }
        .score-dial-card {
          flex: 1.15;
          background: linear-gradient(135deg, rgba(6, 95, 70, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%);
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-radius: 20px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .radial-progress-box {
          position: relative;
          width: 104px;
          height: 104px;
          flex-shrink: 0;
        }
        .radial-progress-box svg {
          transform: rotate(-90deg);
          width: 104px;
          height: 104px;
        }
        .radial-score-text {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }
        .percentage-num {
          font-size: 24px;
          line-height: 1;
          color: #ffffff;
        }
        .percentage-sub {
          font-size: 9.5px;
          color: #a7f3d0;
          font-weight: 700;
          margin-top: 2px;
        }
        .score-details-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .marks-tag {
          font-size: 24px;
          font-weight: 900;
          color: #34d399;
          line-height: 1.2;
        }
        .status-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
          background: ${isPassed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
          color: ${isPassed ? '#6ee7b7' : '#fca5a5'};
          border: 1px solid ${isPassed ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)'};
          width: fit-content;
        }
        .feedback-card {
          flex: 1.25;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 18px 22px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .feedback-title {
          font-size: 18px;
          font-weight: 800;
          color: #fbbf24;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feedback-desc {
          font-size: 12px;
          color: #cbd5e1;
          line-height: 1.45;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 18px;
          position: relative;
          z-index: 5;
        }
        .stat-box {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .stat-label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 900;
          line-height: 1.2;
        }
        .stat-sub {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .footer {
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 5;
        }
        .footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .site-link {
          font-size: 14px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.2px;
        }
        .site-motto {
          font-size: 10px;
          color: #94a3b8;
        }
        .footer-right {
          font-size: 10px;
          color: #64748b;
          text-align: right;
          font-family: monospace;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="glow-circle glow-1"></div>
        <div class="glow-circle glow-2"></div>

        <!-- 1. Header with Logo & Brand -->
        <div class="header">
          <div class="brand">
            <div class="logo-box">
              <div style="width: 40px; height: 40px;">
                ${CLEAN_MEDHA_LOGO_SVG}
              </div>
            </div>
            <div>
              <div class="brand-title">মেধা পরীক্ষা পোর্টাল</div>
              <div class="brand-subtitle">
                <span>medhaexam.site</span>
                <span>•</span>
                <span>ডিজিটাল মূল্যায়ন ও মেধা যাচাই</span>
              </div>
            </div>
          </div>
          <div class="verified-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>ভেরিফাইড রেজাল্ট</span>
          </div>
        </div>

        <!-- 2. Exam Title & Candidate Info -->
        <div class="exam-info-panel">
          <div class="exam-title">${escapeHtml(result.examTitle)}</div>
          <div class="candidate-meta">
            <span>পরীক্ষার্থী: <strong>${escapeHtml(result.studentName)}</strong></span>
            <span>•</span>
            <span>তারিখ: <strong>${escapeHtml(dateFormatted)}</strong></span>
          </div>
        </div>

        <!-- 3. Visual Score & Performance Feedback -->
        <div class="score-row">
          <div class="score-dial-card">
            <div class="radial-progress-box">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(255, 255, 255, 0.12)" stroke-width="10" fill="transparent"/>
                <circle cx="50" cy="50" r="40" stroke="#10b981" stroke-width="10" fill="transparent"
                  stroke-dasharray="251.2"
                  stroke-dashoffset="${251.2 - (251.2 * percentage) / 100}"
                  stroke-linecap="round"
                />
              </svg>
              <div class="radial-score-text">
                <span class="percentage-num">${toBengaliDigits(percentage)}%</span>
                <span class="percentage-sub">স্কোর</span>
              </div>
            </div>
            <div class="score-details-col">
              <div class="marks-tag">${toBengaliDigits(result.score)} / ${toBengaliDigits(result.totalQuestions)}</div>
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">অর্জিত মোট নম্বর</div>
              <div class="status-pill">${isPassed ? '✓ উত্তীর্ণ (কৃতকার্য)' : 'পুনরায় চেষ্টা প্রয়োজন'}</div>
            </div>
          </div>

          <div class="feedback-card">
            <div class="feedback-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
              <span>${escapeHtml(feedback.title)}</span>
            </div>
            <div class="feedback-desc">${escapeHtml(feedback.sub)}</div>
            <div style="font-size: 10px; color: #6ee7b7; margin-top: 8px; font-weight: 600;">
              ★ মেধা পরীক্ষা পোর্টালে আপনার প্রস্তুতি নিয়মিত যাচাই করুন
            </div>
          </div>
        </div>

        <!-- 4. Key Performance Metrics Grid -->
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-label">মেধা স্থান (Rank)</span>
            <span class="stat-value" style="color: #fbbf24;">#${toBengaliDigits(computedRank)} তম</span>
            <span class="stat-sub">শীর্ষ মেধা তালিকায়</span>
          </div>

          <div class="stat-box">
            <span class="stat-label">সঠিক উত্তর</span>
            <span class="stat-value" style="color: #34d399;">${toBengaliDigits(result.correctAnswers)} টি</span>
            <span class="stat-sub">সঠিক প্রয়োগ</span>
          </div>

          <div class="stat-box">
            <span class="stat-label">ভুল উত্তর</span>
            <span class="stat-value" style="color: #f87171;">${toBengaliDigits(result.wrongAnswers)} টি</span>
            <span class="stat-sub">অনুত্তরিত: ${toBengaliDigits(result.unansweredQuestions)} টি</span>
          </div>

          <div class="stat-box">
            <span class="stat-label">ব্যয়িত সময়</span>
            <span class="stat-value" style="color: #60a5fa;">${toBengaliDigits(minutesSpent)}মি ${toBengaliDigits(secondsSpent)}সে</span>
            <span class="stat-sub">নির্ভুলতা: ${toBengaliDigits(accuracy)}%</span>
          </div>
        </div>

        <!-- 5. Footer with Portal Web Address & Security Verification -->
        <div class="footer">
          <div class="footer-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <div>
              <div class="site-link">medhaexam.site</div>
              <div class="site-motto">বিসিএস, প্রাইমারি শিক্ষক ও সরকারি চাকরি পরীক্ষা প্রস্তুতি</div>
            </div>
          </div>
          <div class="footer-right">
            <div>সনদ আইডি: ${escapeHtml(verificationCode)}</div>
            <div>অফিসিয়াল ডিজিটাল রেজাল্ট কপি</div>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  // Create isolated sandbox iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '840px';
  iframe.style.height = '860px';
  iframe.style.zIndex = '-99999';
  iframe.style.opacity = '1';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#090d16';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('আইফ্রেম ডকুমেন্ট তৈরি করা যায়নি।');
    }

    iframeDoc.open();
    iframeDoc.write(scorecardHtml);
    iframeDoc.close();

    // Wait for fonts to resolve
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 400));

    const cardElement = iframeDoc.querySelector('.card') as HTMLElement || iframeDoc.body;

    const canvas = await html2canvas(cardElement, {
      scale: 2.2, // Retina resolution (~1700px width)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#090d16',
      logging: false,
    });

    const imageBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png', 0.95)
    );

    if (!imageBlob) {
      throw new Error('ক্যানভাস থেকে ছবি প্রস্তুত করা যায়নি।');
    }

    // Sanitize file name
    const safeExamTitle = (result.examTitle || 'exam_result').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_').slice(0, 30);
    const safeStudentName = (result.studentName || 'student').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_').slice(0, 20);
    const fileName = `medha_scorecard_${safeExamTitle}_${safeStudentName}.png`;

    // Trigger direct browser download
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    return true;
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
