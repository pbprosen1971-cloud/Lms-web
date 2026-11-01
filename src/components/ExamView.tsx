/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, ShieldAlert, ChevronLeft, ChevronRight, CheckCircle, HelpCircle, Eye, CornerDownRight } from 'lucide-react';
import { Exam, ExamResult, Question } from '../types';
import { subscribeToQuestionsByExamId, recordWrongQuestions } from '../services/firestoreService';

interface ExamViewProps {
  exam: Exam;
  user: any;
  onExamSubmit: (result: ExamResult) => void;
  setView: (view: string) => void;
}

export default function ExamView({ exam, user, onExamSubmit, setView }: ExamViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState((exam.durationMinutes || 10) * 60);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [firestoreQuestions, setFirestoreQuestions] = useState<Question[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to live Firestore questions associated with this examId
  useEffect(() => {
    const unsub = subscribeToQuestionsByExamId(exam.id, (qList) => {
      setFirestoreQuestions(qList);
    });
    return () => unsub();
  }, [exam.id]);

  // Return exact list of questions added to the exam from Firestore, fallback to exam.questions or generator
  const questionsList = useMemo(() => {
    if (firestoreQuestions && firestoreQuestions.length > 0) {
      return firestoreQuestions;
    }
    if (exam.questions && exam.questions.length > 0) {
      return exam.questions;
    }
    // If the exam has no questions added yet, generate default questions matching exam.totalQuestions
    const count = exam.totalQuestions || 10;
    const list: Question[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: `q-gen-${i}`,
        text: `এটি সাধারণ জ্ঞান ও মানসিক দক্ষতা বিষয়ের কুইজ প্রশ্ন নম্বর ${i + 1}। সঠিক উত্তর নির্বাচন করুন।`,
        options: [
          `প্রথম বিকল্প উত্তরপত্র ${i + 1}`,
          `সঠিক সমাধান এবং সম্ভাব্য বিকল্প ${i + 1}`,
          `তৃতীয় বৈকল্পিক উত্তরপত্র ${i + 1}`,
          `চতুর্থ বৈকল্পিক উত্তরপত্র ${i + 1}`,
        ],
        correctAnswer: 1,
        explanation: `প্রশ্ন নম্বর ${i + 1} এর বিশদ সমাধান এখানে ব্যাখ্যা করা হলো।`,
        subject: exam.subject,
      });
    }
    return list;
  }, [firestoreQuestions, exam]);

  // Check if current user has already submitted this live exam
  const currentUid = user?.id || user?.uid;
  const currentEmail = user?.email?.toLowerCase().trim();

  const isAlreadySubmitted = useMemo(() => {
    const isLive = exam.status === 'live' || exam.status === 'archive' || !!(exam as any).isLiveExam;
    if (!isLive) return false;

    if (currentUid && localStorage.getItem(`medha_submitted_${currentUid}_${exam.id}`) === 'true') {
      return true;
    }
    try {
      const browserSubs = JSON.parse(localStorage.getItem('medha_submitted_exam_ids') || '[]');
      if (Array.isArray(browserSubs) && browserSubs.includes(exam.id)) {
        return true;
      }
    } catch (e) {}

    try {
      const savedResults = JSON.parse(localStorage.getItem('exam_results_sheet') || '[]');
      if (Array.isArray(savedResults)) {
        const found = savedResults.some(
          (r: any) =>
            (r.userId === currentUid || r.studentId === currentUid || (currentEmail && r.studentEmail?.toLowerCase().trim() === currentEmail)) &&
            r.examId === exam.id
        );
        if (found) return true;
      }
    } catch (e) {}

    return false;
  }, [exam.id, exam.status, currentUid, currentEmail]);

  // Start the Live countdown timer
  useEffect(() => {
    if (isAlreadySubmitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto submit
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questionsList, answers, isAlreadySubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questionsList[currentIdx];
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const handleSelectOption = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));

    // Automatically advance to the next question after a brief feedback delay (300ms)
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    if (currentIdx < questionsList.length - 1) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentIdx((prev) => Math.min(questionsList.length - 1, prev + 1));
      }, 300);
    }
  };

  // Submit and compile results
  const handleFinalSubmit = (isTimeUp = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    questionsList.forEach((q) => {
      const selected = answers[q.id];
      if (selected === undefined) {
        unansweredCount++;
      } else if (selected === q.correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const score = correctCount; // 1 mark per question
    const timeSpent = exam.durationMinutes * 60 - timeLeft;

    // Subject performance breakdowns
    const subjectPerformance: { [subject: string]: { correct: number; total: number } } = {};
    questionsList.forEach((q) => {
      const subj = q.subject || exam.subject;
      if (!subjectPerformance[subj]) {
        subjectPerformance[subj] = { correct: 0, total: 0 };
      }
      subjectPerformance[subj].total++;
      if (answers[q.id] === q.correctAnswer) {
        subjectPerformance[subj].correct++;
      }
    });

    const totalMarks = exam.totalMarks || questionsList.length;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const currentUid = user?.id || user?.uid || 'guest';

    const answeredTotal = correctCount + wrongCount;
    const accuracy = answeredTotal > 0 ? Number(((correctCount / answeredTotal) * 100).toFixed(1)) : percentage;

    const isLive = exam.status === 'live' || exam.status === 'archive' || !!(exam as any).isLiveExam;

    // Check existing submissions for this user & exam to accurately stamp attemptNumber & isFirstAttempt
    let attemptNum = 1;
    try {
      const savedResults = JSON.parse(localStorage.getItem('exam_results_sheet') || '[]');
      if (Array.isArray(savedResults)) {
        const prevAttempts = savedResults.filter(
          (r: any) =>
            (r.userId === currentUid || r.studentId === currentUid || (user?.email && r.studentEmail === user.email)) &&
            r.examId === exam.id
        );
        attemptNum = prevAttempts.length + 1;
        if (isLive && prevAttempts.length > 0) {
          console.warn("Blocked duplicate attempt on live exam.");
          setView('result');
          return;
        }
      }
    } catch (e) {}

    const resultRecord: ExamResult = {
      id: 'res-' + Date.now(),
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      userId: currentUid,
      studentId: currentUid,
      studentName: user?.name || user?.fullName || 'অতিথি শিক্ষার্থী',
      studentEmail: user?.email || 'guest@medha.com',
      score: score,
      totalMarks: totalMarks,
      percentage: percentage,
      totalQuestions: questionsList.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      skippedAnswers: unansweredCount,
      unansweredQuestions: unansweredCount,
      submittedAt: new Date().toISOString(),
      dateTaken: new Date().toLocaleDateString('bn-BD'),
      timeSpentSeconds: timeSpent,
      subjectPerformance: subjectPerformance,
      questions: questionsList,
      userAnswers: answers,
      isFirstAttempt: attemptNum === 1,
      attemptNumber: attemptNum,
      isLiveExam: isLive,
      accuracy: accuracy,
      examDate: exam.startDate || (exam as any).examDate || new Date().toISOString().split('T')[0],
      examType: exam.isPremium ? 'premium' : 'free',
    };

    // Client-side cache for question review resilience and one-time live exam tracking
    try {
      localStorage.setItem(`medha_exam_answers_${resultRecord.id}`, JSON.stringify(answers));
      localStorage.setItem(`medha_exam_answers_${resultRecord.examId}`, JSON.stringify(answers));
      localStorage.setItem(`medha_exam_questions_${resultRecord.examId}`, JSON.stringify(questionsList));
      if (currentUid) {
        localStorage.setItem(`medha_submitted_${currentUid}_${resultRecord.examId}`, 'true');
        const prevSubList = JSON.parse(localStorage.getItem(`medha_submitted_exams_${currentUid}`) || '[]');
        if (!prevSubList.includes(resultRecord.examId)) {
          prevSubList.push(resultRecord.examId);
          localStorage.setItem(`medha_submitted_exams_${currentUid}`, JSON.stringify(prevSubList));
        }
      }
      const browserSubs = JSON.parse(localStorage.getItem('medha_submitted_exam_ids') || '[]');
      if (!browserSubs.includes(resultRecord.examId)) {
        browserSubs.push(resultRecord.examId);
        localStorage.setItem('medha_submitted_exam_ids', JSON.stringify(browserSubs));
      }
    } catch (e) {}

    onExamSubmit(resultRecord);

    // Record incorrect answers in Wrong Question Practice bank for authenticated user
    if (currentUid && currentUid !== 'guest') {
      const wrongList = questionsList
        .filter((q) => {
          const ans = answers[q.id];
          return ans !== undefined && ans !== q.correctAnswer;
        })
        .map((q) => ({
          question: q,
          subject: q.subject || exam.subject,
        }));

      if (wrongList.length > 0) {
        recordWrongQuestions(currentUid, wrongList).catch((err) => {
          console.warn('Could not record wrong questions to repository:', err);
        });
      }
    }

    setView('result');
  };

  const isTimeLow = timeLeft < 120; // 2 minutes or less

  // OMR numbers labels
  const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];

  if (isAlreadySubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 sm:p-10 shadow-lg space-y-5">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
              সাবমিট হয়েছে
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              আপনি ইতিমধ্যে এই পরীক্ষাটি দিয়েছেন
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              মেধা নীতিমালার আলোকে একজন শিক্ষার্থী প্রতিটি লাইভ পরীক্ষায় শুধুমাত্র একবার অংশগ্রহণ করতে পারেন। আপনার পূর্ববর্তী ফলাফল ও সমাধান শিট সিস্টেমে সংরক্ষিত রয়েছে।
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setView('result')}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl shadow-md transition-colors"
            >
              ফলাফল ও সমাধান দেখুন
            </button>
            <button
              onClick={() => setView('home')}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors"
            >
              হোম পেজে ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-brand-bg dark:bg-slate-900 text-slate-800 dark:text-slate-100 theme-transition">
      
      {/* Top Banner with Exam Title & Timer */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase">
            {exam.subject}
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {exam.title}
          </h1>
        </div>

        {/* Live Timer Top Right */}
        <div
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border font-mono text-base font-bold shadow-sm transition-all duration-300 shrink-0 self-end md:self-auto ${
            isTimeLow
              ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400 animate-pulse'
              : 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          <Clock className={`h-5 w-5 ${isTimeLow ? 'text-rose-500' : 'text-primary'}`} />
          <div className="text-right">
            <span className="text-[10px] block font-sans text-slate-400 font-bold uppercase leading-none">অবশিষ্ট সময়</span>
            <span className="text-lg">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* Left Col (8-Columns): Interactive Question Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-6">
            
            {/* Question Header Status */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-4">
              <span className="text-xs font-bold text-slate-400">
                প্রশ্ন {currentIdx + 1} / {questionsList.length}
              </span>
              <span className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                টপিক: {currentQuestion.subject || exam.subject}
              </span>
            </div>

            {/* Question Statement */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentQuestion.text}
              </h2>
            </div>

            {/* 4 OMR Multiple-Choice Options */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-4 border rounded-xl text-left text-sm sm:text-base font-medium flex items-center gap-3 transition-all transform active:scale-[0.99] ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary dark:bg-emerald-950/40 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Circle badge for ক, খ, গ, ঘ */}
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {optionLabels[idx]}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Exam Navigation Control Row */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm ${
                currentIdx === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <ChevronLeft className="h-4.5 w-4.5" /> পূর্ববর্তী প্রশ্ন
            </button>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all transform hover:-translate-y-0.5"
            >
              পরীক্ষা সাবমিট করুন
            </button>

            <button
              onClick={() => setCurrentIdx((prev) => Math.min(questionsList.length - 1, prev + 1))}
              disabled={currentIdx === questionsList.length - 1}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm ${
                currentIdx === questionsList.length - 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              পরবর্তী প্রশ্ন <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Right Col (4-Columns): Question Palette Sidebar (১–৫০) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700/50 pb-3">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
              <Eye className="h-4.5 w-4.5 text-primary" />
              প্রশ্ন প্যালেট (১–{questionsList.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">সবগুলো প্রশ্নের উত্তর নিশ্চিত করতে প্যালেট গ্রিডটি ব্যবহার করুন।</p>
          </div>

          {/* Palette Color Guidelines */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-primary text-white border border-primary flex items-center justify-center text-[8px] font-bold">✓</span>
              <span>উত্তরকৃত</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-white dark:bg-slate-950 border border-primary flex items-center justify-center"></span>
              <span>বর্তমান</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"></span>
              <span>উত্তরহীন</span>
            </div>
          </div>

          {/* Grid Palette 1-50 */}
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-2 max-h-[350px] overflow-y-auto pr-1">
            {questionsList.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = currentIdx === idx;
              
              // Colors logic based on status
              const btnClass = isCurrent
                ? 'bg-primary/10 border-2 border-primary text-primary font-bold dark:bg-emerald-950/30'
                : isAnswered
                ? 'bg-primary text-white border-primary font-semibold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800';

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`aspect-square rounded-lg text-xs flex items-center justify-center border font-semibold transition-all ${btnClass}`}
                >
                  {(idx + 1).toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">উত্তর করা হয়েছে:</span>
                <span className="text-primary font-bold">{Object.keys(answers).length} টি</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">বাকি আছে:</span>
                <span className="text-rose-500 font-bold">{questionsList.length - Object.keys(answers).length} টি</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Submit Dialog Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2.5 text-rose-500 font-bold text-lg">
              <ShieldAlert className="h-6 w-6" />
              <span>নিশ্চিতকরণ উইজেট</span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিতভাবে এই পরীক্ষাটি জমা দিতে চান? জমা দেওয়ার পর কোনো পরিবর্তন করা যাবে না এবং আপনার রেজাল্ট শিট তৈরি হবে।
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span>মোট প্রশ্ন সংখ্যা:</span>
                <span className="font-bold">{questionsList.length} টি</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>উত্তর করেছেন:</span>
                <span className="font-bold">{Object.keys(answers).length} টি</span>
              </div>
              <div className="flex justify-between text-rose-500 font-semibold">
                <span>উত্তর করেননি:</span>
                <span className="font-bold">{questionsList.length - Object.keys(answers).length} টি</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white text-xs font-bold rounded-xl"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => handleFinalSubmit()}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-xl shadow-md"
              >
                হ্যাঁ, জমা দিন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
