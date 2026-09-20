import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ExamResult } from '../types';
import { OFFICIAL_MEDHA_LOGO_SVG } from '../lib/officialLogoSvg';

export interface PdfReportOptions {
  siteName?: string;
  examTitleFilter?: string;
  generatedBy?: string;
  logoUrl?: string;
}

/**
 * Format number nicely
 */
function formatNumber(num: number): string {
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}

/**
 * Generate and download high-definition, flawless Bengali PDF report.
 * Uses robust HTML table and block layout with Google Fonts ('Hind Siliguri', 'Noto Sans Bengali')
 * and the official website vector logo, ensuring pristine Bengali rendering and perfect header branding.
 */
export async function generateStudentResultsPdfReport(
  results: ExamResult[],
  options: PdfReportOptions = {}
): Promise<boolean> {
  if (!results || results.length === 0) {
    alert('ডাউনলোড করার জন্য কোনো ফলাফল পাওয়া যায়নি।');
    return false;
  }

  const {
    siteName = 'মেধা এক্সাম',
    examTitleFilter = 'All Exams',
    generatedBy = 'Medha Exam Administration',
  } = options;

  // 1. Calculate KPI Metrics & Top Scorer
  const totalSubmissions = results.length;
  const uniqueStudents = new Set(
    results.map(r => (r.studentEmail || r.studentId || r.userId || r.studentName || '').toLowerCase())
  ).size;

  interface EnrichedResult {
    original: ExamResult;
    percentage: number;
    score: number;
    totalQ: number;
  }

  const enrichedResults: EnrichedResult[] = results.map(r => {
    const totalQ = r.totalQuestions > 0 ? r.totalQuestions : (r.totalMarks > 0 ? r.totalMarks : 1);
    const scoreVal = typeof r.score === 'number' ? r.score : 0;
    const percentage = Math.round((scoreVal / totalQ) * 100);
    return {
      original: r,
      percentage,
      score: scoreVal,
      totalQ,
    };
  });

  // Sort descending by percentage, then score, then student name
  enrichedResults.sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (b.score !== a.score) return b.score - a.score;
    return (a.original.studentName || '').localeCompare(b.original.studentName || '');
  });

  const topPerformer = enrichedResults.length > 0 ? enrichedResults[0] : null;

  const validPercentages = enrichedResults.map(r => r.percentage);
  const avgPercentage = validPercentages.length > 0
    ? Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length)
    : 0;

  const highestScore = topPerformer ? topPerformer.score : 0;
  const highestTotalQ = topPerformer ? topPerformer.totalQ : 0;
  const highestPercentage = topPerformer ? topPerformer.percentage : 0;

  const passingCount = enrichedResults.filter(r => r.percentage >= 40).length;
  const passRate = totalSubmissions > 0 ? Math.round((passingCount / totalSubmissions) * 100) : 0;

  const genDateStr = new Date().toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 2. Build off-screen container with solid, non-collapsing table layout
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', Kalpurush, sans-serif";
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-1000';
  container.style.lineHeight = '1.4';

  // Build rows HTML
  const rowsHtml = enrichedResults.map((item, index) => {
    const res = item.original;
    const rank = index + 1;
    const name = res.studentName || 'শিক্ষার্থী';
    const email = res.studentEmail || '—';
    const exam = res.examTitle || res.subject || 'মডেল টেস্ট';
    const score = `${formatNumber(item.score)} / ${item.totalQ}`;
    const pct = `${item.percentage}%`;
    const correct = typeof res.correctAnswers === 'number' ? res.correctAnswers : 0;
    const wrong = typeof res.wrongAnswers === 'number' ? res.wrongAnswers : 0;
    const skipped = typeof res.skippedAnswers === 'number' ? res.skippedAnswers : 0;
    const breakdown = `${correct}✓ | ${wrong}✗${skipped > 0 ? ` | ${skipped}` : ''}`;
    const date = res.dateTaken || res.submittedAt || '—';

    let rankBadge = `<span style="font-weight:700; color:#64748b; font-size:11px;">${rank}</span>`;
    if (rank === 1) {
      rankBadge = `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 6px; border-radius:12px; font-weight:800; font-size:11px;">১</span>`;
    } else if (rank === 2) {
      rankBadge = `<span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:2px 6px; border-radius:12px; font-weight:800; font-size:11px;">২</span>`;
    } else if (rank === 3) {
      rankBadge = `<span style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; padding:2px 6px; border-radius:12px; font-weight:800; font-size:11px;">৩</span>`;
    }

    const rowBg = index % 2 === 1 ? '#f8fafc' : '#ffffff';

    return `
      <tr style="background:${rowBg}; border-bottom:1px solid #e2e8f0; font-size:11px;">
        <td style="padding:8px 6px; text-align:center; vertical-align:middle;">${rankBadge}</td>
        <td style="padding:8px 8px; font-weight:700; color:#0f172a; vertical-align:middle; line-height:1.3;">${escapeHtml(name)}</td>
        <td style="padding:8px 8px; color:#475569; font-family:monospace, sans-serif; font-size:10.5px; vertical-align:middle; word-break:break-all;">${escapeHtml(email)}</td>
        <td style="padding:8px 8px; color:#1e293b; font-weight:500; vertical-align:middle; line-height:1.3;">${escapeHtml(exam)}</td>
        <td style="padding:8px 8px; text-align:center; font-weight:800; color:#059669; vertical-align:middle;">${score}</td>
        <td style="padding:8px 6px; text-align:center; font-weight:700; color:#0f172a; vertical-align:middle;">${pct}</td>
        <td style="padding:8px 6px; text-align:center; font-size:10px; color:#475569; white-space:nowrap; vertical-align:middle;">${breakdown}</td>
        <td style="padding:8px 8px; text-align:right; color:#64748b; font-size:10px; white-space:nowrap; vertical-align:middle;">${escapeHtml(date)}</td>
      </tr>
    `;
  }).join('');

  // Prepare inline official logo SVG with fixed 46px dimensions so html2canvas renders all vector strokes instantly
  const inlineLogoSvg = OFFICIAL_MEDHA_LOGO_SVG
    .replace('<svg ', '<svg width="46" height="46" style="width:46px; height:46px; display:block;" ');

  container.innerHTML = `
    <div style="width:800px; padding:0; background:#ffffff; box-sizing:border-box;">
      
      <!-- 1. Header Banner with Official Website Logo in Left Corner -->
      <table style="width:100%; border-collapse:collapse; background:#0f172a; border-bottom:3px solid #10b981;">
        <tr>
          <td style="padding:14px 18px; vertical-align:middle;">
            <table style="border-collapse:collapse;">
              <tr>
                <!-- Official Website Vector Logo -->
                <td style="vertical-align:middle; width:48px; padding-right:12px;">
                  <div style="width:46px; height:46px; min-width:46px; max-width:46px; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.35);">
                    ${inlineLogoSvg}
                  </div>
                </td>
                <!-- Brand Title & Official Report Badge & Exam Info -->
                <td style="vertical-align:middle;">
                  <table style="border-collapse:collapse;">
                    <tr>
                      <td style="vertical-align:middle; padding-right:8px; white-space:nowrap;">
                        <span style="font-size:18px; font-weight:800; color:#ffffff; letter-spacing:0.5px; line-height:1;">
                          ${escapeHtml(siteName.toUpperCase())}
                        </span>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:9.5px; background:#059669; color:#ffffff; padding:2.5px 8px; border-radius:4px; font-weight:800; letter-spacing:0.6px; border:1px solid #10b981; line-height:1; display:inline-block; vertical-align:middle; text-transform:uppercase; box-shadow:0 1px 3px rgba(0,0,0,0.2);">
                          OFFICIAL REPORT
                        </span>
                      </td>
                    </tr>
                  </table>
                  <div style="font-size:11.5px; color:#93c5fd; margin-top:4px; font-weight:500; line-height:1.3;">
                    ${escapeHtml(examTitleFilter !== 'All Exams' ? `পরীক্ষা / বিষয়: ${examTitleFilter}` : 'সকল পরীক্ষা ও মডেল টেস্ট ফলাফল বিবরণী')}
                  </div>
                </td>
              </tr>
            </table>
          </td>
          <!-- Header Right Meta -->
          <td style="padding:14px 18px; text-align:right; vertical-align:middle; width:220px;">
            <div style="font-size:10px; color:#94a3b8; line-height:1.2;">তৈরির তারিখ:</div>
            <div style="font-size:11px; color:#f1f5f9; font-weight:600; margin-top:2px; line-height:1.2;">${genDateStr}</div>
            <div style="font-size:9.5px; color:#64748b; margin-top:3px; line-height:1.2;">প্রস্তুতকারক: ${escapeHtml(generatedBy)}</div>
          </td>
        </tr>
      </table>

      <!-- 2. Spotlight & Performance Summary Cards (Table Layout) -->
      <div style="padding:14px 18px 10px 18px;">
        <table style="width:100%; border-collapse:separate; border-spacing:10px 0;">
          <tr>
            <!-- Left: Top Scorer Card -->
            <td style="width:50%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #10b981; border-radius:10px; padding:10px 14px; vertical-align:top;">
              <div style="font-size:9.5px; font-weight:800; color:#059669; text-transform:uppercase; letter-spacing:0.5px;">
                🏆 শীর্ষ স্থান অর্জনকারী (Top Scorer)
              </div>
              ${topPerformer ? `
                <div style="font-size:14px; font-weight:800; color:#0f172a; margin-top:4px; line-height:1.25;">
                  ${escapeHtml(topPerformer.original.studentName || 'শিক্ষার্থী')}
                </div>
                <div style="font-size:10px; color:#475569; margin-top:2px; font-family:monospace, sans-serif;">
                  ${escapeHtml(topPerformer.original.studentEmail || '')}
                </div>
                <div style="margin-top:6px;">
                  <span style="font-size:11.5px; font-weight:800; color:#047857; background:#dcfce7; padding:2px 8px; border-radius:6px; border:1px solid #86efac; display:inline-block;">
                    নম্বর: ${formatNumber(highestScore)} / ${highestTotalQ} (${highestPercentage}%)
                  </span>
                </div>
              ` : `
                <div style="font-size:11px; color:#64748b; margin-top:6px;">কোনো ফলাফল পাওয়া যায়নি</div>
              `}
            </td>

            <!-- Right: Performance Metrics Card -->
            <td style="width:50%; background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #3b82f6; border-radius:10px; padding:10px 14px; vertical-align:top;">
              <div style="font-size:9.5px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:0.5px;">
                📊 পরীক্ষার সামগ্রিক পরিসংখ্যান (Metrics)
              </div>
              <table style="width:100%; border-collapse:collapse; margin-top:6px; font-size:10.5px;">
                <tr>
                  <td style="padding:2px 0; color:#64748b; width:50%;">মোট পরীক্ষার্থী: <strong style="color:#0f172a;">${totalSubmissions} (${uniqueStudents} জন)</strong></td>
                  <td style="padding:2px 0; color:#64748b; width:50%;">গড় নম্বর: <strong style="color:#0f172a;">${avgPercentage}%</strong></td>
                </tr>
                <tr>
                  <td style="padding:2px 0; color:#64748b; width:50%;">পাস রেট (≥৪০%): <strong style="color:#0f172a;">${passRate}%</strong></td>
                  <td style="padding:2px 0; color:#64748b; width:50%;">সর্বোচ্চ স্কোর: <strong style="color:#059669;">${highestPercentage}%</strong></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- 3. Results Data Table -->
      <div style="padding:4px 18px 16px 18px;">
        <table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
          <thead>
            <tr style="background:#0f172a; color:#ffffff; font-size:11px; text-align:left;">
              <th style="padding:9px 6px; text-align:center; width:36px;">মেধা</th>
              <th style="padding:9px 8px; width:135px;">শিক্ষার্থীর নাম</th>
              <th style="padding:9px 8px; width:140px;">ইমেইল / আইডি</th>
              <th style="padding:9px 8px; width:165px;">পরীক্ষার নাম</th>
              <th style="padding:9px 8px; text-align:center; width:68px;">নম্বর</th>
              <th style="padding:9px 6px; text-align:center; width:45px;">শতকরা</th>
              <th style="padding:9px 6px; text-align:center; width:78px;">সঠিক / ভুল</th>
              <th style="padding:9px 8px; text-align:right; width:85px;">সাবমিটের সময়</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 4. Footer Banner -->
      <table style="width:100%; border-collapse:collapse; border-top:1px solid #e2e8f0; background:#f8fafc; font-size:9.5px; color:#94a3b8;">
        <tr>
          <td style="padding:10px 18px; text-align:left;">
            Generated by <strong>${escapeHtml(generatedBy)}</strong> • Official Medha Exam Assessment Portal
          </td>
          <td style="padding:10px 18px; text-align:right;">
            www.medhaexam.com
          </td>
        </tr>
      </table>

    </div>
  `;

  document.body.appendChild(container);

  try {
    // Ensure document fonts and images are ready
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise(r => setTimeout(r, 250));

    // Render HTML to high-DPI Canvas using html2canvas
    const canvas = await html2canvas(container, {
      scale: 2.2, // Crisp resolution without memory bloat
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Calculate dimensions for A4 Portrait (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Map canvas height proportional to PDF width
    const imgProps = pdf.getImageProperties(imgData);
    const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

    let heightLeft = renderHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderHeight);
    heightLeft -= pdfHeight;

    // Handle multi-page if table spans multiple pages
    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderHeight);
      heightLeft -= pdfHeight;
    }

    // Save and download file
    const safeDate = new Date().toISOString().split('T')[0];
    const safeTitle = examTitleFilter.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_').substring(0, 25);
    const fileName = `Medha_Exam_Report_${safeTitle || 'Exam'}_${safeDate}.pdf`;
    pdf.save(fileName);

    return true;
  } catch (err) {
    console.error('Failed to generate HTML-rendered PDF report:', err);
    alert('PDF তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    return false;
  } finally {
    // Clean up off-screen DOM element
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Basic HTML escaping helper to prevent script injection in generated report
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
