/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExamResult, Question } from '../types';
import { toBengaliDigits, formatBengaliDateTimeSafe } from '../lib/dateUtils';
import MedhaLogo from './MedhaLogo';

interface ResultPdfSheetProps {
  result: ExamResult;
  questions: Question[];
  userAnswers: Record<string, number>;
  percentage: number;
  computedRank: number;
}

export const ResultPdfSheet: React.FC<ResultPdfSheetProps> = ({
  result,
  questions,
  userAnswers,
  percentage,
  computedRank,
}) => {
  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
  const isMultiColumn = questions.length > 10;

  // Split into 2 columns if more than 10 questions
  const half = Math.ceil(questions.length / 2);
  const col1Questions = isMultiColumn ? questions.slice(0, half) : questions;
  const col2Questions = isMultiColumn ? questions.slice(half) : [];

  // Pass status
  const isPassed = percentage >= 60;
  const verificationCode = `MEX-${(result.id || result.examId || 'MEDHA').slice(-6).toUpperCase()}-${toBengaliDigits(result.score)}`;

  const renderQuestionItem = (q: Question, idx: number, actualIndex: number) => {
    const qNum = actualIndex + 1;
    const userSelected = userAnswers[q.id];
    const isCorrect = userSelected === q.correctAnswer;
    const isUnanswered = userSelected === undefined;
    const isWrong = !isUnanswered && !isCorrect;

    // Determine card background and border colors using pure hex
    let cardBg = '#f8fafc';
    let cardBorder = '#e2e8f0';
    if (isCorrect) {
      cardBg = '#f0fdf4';
      cardBorder = '#86efac';
    } else if (isWrong) {
      cardBg = '#fef2f2';
      cardBorder = '#fca5a5';
    }

    return (
      <div
        key={q.id || idx}
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '10px',
          padding: isMultiColumn ? '8px 10px' : '12px 14px',
          fontSize: isMultiColumn ? '9.5px' : '11.5px',
          lineHeight: '1.35',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          color: '#0f172a',
          boxSizing: 'border-box',
          marginBottom: isMultiColumn ? '8px' : '10px',
        }}
      >
        {/* Question Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', color: '#0f172a', lineHeight: '1.45', wordBreak: 'break-word', flex: 1 }}>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: '#e2e8f0',
                color: '#1e293b',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace, sans-serif',
                fontSize: '10px',
                marginRight: '6px',
                fontWeight: 'bold',
                lineHeight: '1.3',
              }}
            >
              {toBengaliDigits(qNum)}
            </span>
            <span>{q.text}</span>
          </div>

          {/* Quick status badge */}
          <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 'bold' }}>
            {isCorrect && (
              <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                ✓ সঠিক
              </span>
            )}
            {isWrong && (
              <span style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                ✗ ভুল
              </span>
            )}
            {isUnanswered && (
              <span style={{ color: '#854d0e', backgroundColor: '#fef9c3', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fef08a' }}>
                — বাদ
              </span>
            )}
          </span>
        </div>

        {/* 4 Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMultiColumn ? '1fr' : '1fr 1fr',
            gap: '4px',
            marginTop: '4px',
          }}
        >
          {q.options.map((opt, optIdx) => {
            const isSystemCorrect = optIdx === q.correctAnswer;
            const isUserSelected = optIdx === userSelected;

            let optBg = '#ffffff';
            let optBorder = '#e2e8f0';
            let optColor = '#334155';
            let optFontWeight = 'normal';
            let badge = null;

            if (isSystemCorrect) {
              optBg = '#dcfce7';
              optBorder = '#4ade80';
              optColor = '#14532d';
              optFontWeight = 'bold';
              badge = <span style={{ fontSize: '8.5px', color: '#15803d', marginLeft: '4px', fontWeight: 'bold' }}>✓ সঠিক উত্তর</span>;
            }

            if (isUserSelected && isSystemCorrect) {
              badge = <span style={{ fontSize: '8.5px', color: '#166534', marginLeft: '4px', fontWeight: 'bold' }}>✓ আপনার উত্তর</span>;
            } else if (isUserSelected && !isSystemCorrect) {
              optBg = '#fee2e2';
              optBorder = '#f87171';
              optColor = '#7f1d1d';
              optFontWeight = 'bold';
              badge = <span style={{ fontSize: '8.5px', color: '#b91c1c', marginLeft: '4px', fontWeight: 'bold' }}>✗ আপনার উত্তর</span>;
            }

            return (
              <div
                key={optIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMultiColumn ? '5px 8px' : '7px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${optBorder}`,
                  backgroundColor: optBg,
                  color: optColor,
                  fontWeight: optFontWeight,
                  fontSize: isMultiColumn ? '9.5px' : '11px',
                  lineHeight: '1.45',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#e2e8f0',
                      color: '#334155',
                      fontWeight: 'bold',
                      fontSize: '9.5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {optionLabels[optIdx]}
                  </span>
                  <span style={{ wordBreak: 'break-word', lineHeight: '1.45' }}>{opt}</span>
                </div>
                {badge}
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        {q.explanation && q.explanation.trim() !== '' && (
          <div
            style={{
              marginTop: '6px',
              padding: '6px 8px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              color: '#451a03',
              fontSize: isMultiColumn ? '9px' : '10px',
              lineHeight: '1.35',
            }}
          >
            <strong style={{ color: '#92400e', marginRight: '4px' }}>💡 ব্যাখ্যা:</strong>
            <span>{q.explanation}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        margin: '0 auto',
        position: 'relative',
        padding: '24px 28px',
        fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif",
        width: '100%',
        maxWidth: '840px',
        boxSizing: 'border-box',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. Official Header with Website Logo, Info, and Seal (Website Theme)     */}
      {/* ========================================================================= */}
      <div
        style={{
          borderBottom: '2px solid #059669',
          paddingBottom: '16px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          {/* Logo & Portal Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            >
              <MedhaLogo style={{ width: '100%', height: '100%', color: '#ffffff' }} withBackground={false} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                  মেধা এক্সাম
                </h1>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  জব এক্সাম পোর্টাল
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#475569', fontWeight: 600, margin: '2px 0 0 0' }}>
                বিসিএস, সরকারি ব্যাংক ও মন্ত্রণালয় নিয়োগ পরীক্ষা মূল্যায়ন পত্র
              </p>
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, margin: '1px 0 0 0' }}>
                অফিসিয়াল ওয়েবসাইট: medhaexam.com • জাতীয় মেধা মূল্যায়ন সিস্টেম
              </p>
            </div>
          </div>

          {/* Verification Badge / Status Stamp */}
          <div
            style={{
              textAlign: 'right',
              flexShrink: 0,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '10px',
              minWidth: '160px',
            }}
          >
            <div style={{ fontFamily: 'monospace, sans-serif', color: '#64748b' }}>ভেরিফিকেশন নং:</div>
            <div style={{ fontFamily: 'monospace, sans-serif', fontWeight: 'bold', color: '#1e293b', fontSize: '11px' }}>
              {verificationCode}
            </div>
            <div style={{ color: '#64748b', paddingTop: '2px' }}>
              তারিখ: <strong style={{ color: '#334155' }}>{formatBengaliDateTimeSafe(result.dateTaken)}</strong>
            </div>
            <div style={{ paddingTop: '4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  backgroundColor: isPassed ? '#dcfce7' : '#fef9c3',
                  color: isPassed ? '#166534' : '#854d0e',
                  border: isPassed ? '1px solid #86efac' : '1px solid #fde047',
                }}
              >
                {isPassed ? '✓ উত্তীর্ণ (PASSED)' : '⚠️ অনুশীলন প্রয়োজন'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Candidate & Exam Information Strip                                    */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '11px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.3' }}>
              পরীক্ষার্থীর নাম
            </span>
            <strong style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', display: 'block', lineHeight: '1.45', marginTop: '2px', wordBreak: 'break-word' }}>
              {result.studentName}
            </strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.3' }}>
              পরীক্ষার নাম
            </span>
            <strong style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', display: 'block', lineHeight: '1.45', marginTop: '2px', wordBreak: 'break-word' }}>
              {result.examTitle}
            </strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.3' }}>
              বিষয় / ক্যাটাগরি
            </span>
            <strong style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', display: 'block', lineHeight: '1.45', marginTop: '2px', wordBreak: 'break-word' }}>
              {result.subject || 'বিসিএস ও চাকরি প্রস্তুতি'}
            </strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.3' }}>
              ব্যয়িত সময়
            </span>
            <strong style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', display: 'block', lineHeight: '1.45', marginTop: '2px' }}>
              {toBengaliDigits(Math.floor(result.timeSpentSeconds / 60))} মিনিট {toBengaliDigits(result.timeSpentSeconds % 60)} সেকেন্ড
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Performance Scorecard Summary (Score, Correct, Wrong, Rank, etc.)     */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Total Questions */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>মোট প্রশ্ন</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b' }}>
            {toBengaliDigits(result.totalQuestions)}
          </span>
        </div>

        {/* Total Score */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#166534', display: 'block' }}>প্রাপ্ত নম্বর</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#15803d' }}>
            {toBengaliDigits(result.score)}
          </span>
        </div>

        {/* Percentage */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#1e40af', display: 'block' }}>শতকরা হার</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#2563eb' }}>
            {toBengaliDigits(percentage)}%
          </span>
        </div>

        {/* Correct Answers */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#166534', display: 'block' }}>সঠিক উত্তর</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#16a34a' }}>
            {toBengaliDigits(result.correctAnswers)} টি
          </span>
        </div>

        {/* Wrong Answers */}
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#991b1b', display: 'block' }}>ভুল উত্তর</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626' }}>
            {toBengaliDigits(result.wrongAnswers)} টি
          </span>
        </div>

        {/* Rank */}
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#92400e', display: 'block' }}>মেধা স্থান</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#d97706' }}>
            #{toBengaliDigits(computedRank)} তম
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Subject-wise Evaluation (If multi-subject)                            */}
      {/* ========================================================================= */}
      {result.subjectPerformance && Object.keys(result.subjectPerformance).length > 1 && (
        <div
          style={{
            marginBottom: '20px',
            position: 'relative',
            zIndex: 10,
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div style={{ backgroundColor: '#f1f5f9', padding: '6px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '11px', color: '#1e293b' }}>
            📊 বিষয়ভিত্তিক ফলাফল বিশ্লেষণ
          </div>
          <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
            {Object.entries(result.subjectPerformance).map(([subj, rawData]) => {
              const data = rawData as { correct: number; total: number };
              const subPct = Math.round(((data?.correct || 0) / (data?.total || 1)) * 100);
              return (
                <div key={subj} style={{ backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subj}</span>
                    <span style={{ color: '#15803d' }}>
                      {toBengaliDigits(data?.correct || 0)}/{toBengaliDigits(data?.total || 0)} ({toBengaliDigits(subPct)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Questions & Answers Section with Authentic Watermark                  */}
      {/* ========================================================================= */}
      <div style={{ position: 'relative', marginTop: '16px' }}>
        {/* Authentic Centered Logo Watermark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
            opacity: 0.05,
          }}
        >
          <div style={{ width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)' }}>
            <MedhaLogo style={{ width: '100%', height: '100%', color: '#0f172a' }} withBackground={true} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', transform: 'rotate(-12deg)' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '1px', display: 'block' }}>
              মেধা এক্সাম পোর্টাল
            </span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1.5px', color: '#334155', textTransform: 'uppercase' }}>
              OFFICIAL EVALUATION SHEET • MEDHA EXAM
            </span>
          </div>
        </div>

        {/* Section Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '8px',
            marginBottom: '12px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <h2 style={{ fontWeight: 900, fontSize: '13px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📋</span>
            <span>বিস্তারিত প্রশ্ন ও উত্তর মূল্যায়ন</span>
            <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748b' }}>
              ({toBengaliDigits(questions.length)} টি প্রশ্ন
              {isMultiColumn ? ' • ২ কলামে সারিবদ্ধ' : ''})
            </span>
          </h2>
          <span style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 500 }}>
            সবুজ: সঠিক উত্তর | লাল: আপনার ভুল উত্তর | হলুদ: ব্যাখ্যা
          </span>
        </div>

        {/* Questions Display: 2 Columns if > 10 questions, 1 Column if <= 10 */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '11px', color: '#94a3b8' }}>
              কোনো প্রশ্ন পাওয়া যায়নি।
            </div>
          ) : isMultiColumn ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
              {/* Column 1 (Questions 1 to half) */}
              <div>
                {col1Questions.map((q, idx) => renderQuestionItem(q, idx, idx))}
              </div>

              {/* Column 2 (Questions half+1 to end) */}
              <div>
                {col2Questions.map((q, idx) => renderQuestionItem(q, idx, half + idx))}
              </div>
            </div>
          ) : (
            <div>
              {questions.map((q, idx) => renderQuestionItem(q, idx, idx))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. Formal Document Footer (NO website footer, only verification line)    */}
      {/* ========================================================================= */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <p style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 500, lineHeight: '1.4', margin: 0 }}>
          মেধা এক্সাম অটোমেটেড ম্যানেজমেন্ট সিস্টেম কর্তৃক প্রস্তুতকৃত অফিসিয়াল ফলাফল শীট • এটি একটি ডিজিটাল কম্পিউটার জেনারেটেড কপি, কোনো স্বাক্ষর বা সিলের প্রয়োজন নেই।
        </p>
        <p style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '3px', margin: 0 }}>
          যাচাইকরণ লিংক: medhaexam.com/verify?id={verificationCode} • গোপনীয়তা ও সুরক্ষা নিশ্চিত
        </p>
      </div>
    </div>
  );
};

export default ResultPdfSheet;
