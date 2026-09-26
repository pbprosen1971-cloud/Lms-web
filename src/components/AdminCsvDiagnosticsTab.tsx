/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Zap,
  ArrowRight,
  Database,
  Layers,
  HelpCircle,
  Upload,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  BookOpen,
  Languages,
  Calculator,
  Cpu,
  FlaskConical,
  Landmark,
  Globe,
  Scale,
  Compass,
  FileCheck,
} from 'lucide-react';
import { Exam, Question } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { detectQuestionSubject } from '../lib/subjectClassifier';
import { parseCsvText, processCsvData, CsvQuestionRow } from '../services/csvQuestionService';
import { toBengaliDigits } from '../lib/dateUtils';

interface AdminCsvDiagnosticsTabProps {
  exams: Exam[];
  onRefreshExams?: () => void;
}

interface QuestionDiagnosticRow {
  id: string;
  serial: number;
  text: string;
  options: string[];
  storedSubject: string;
  detectedSubject: string;
  homePageCategory: string;
  status: 'synced' | 'fallback_detected' | 'mismatch' | 'missing';
  issueDescription: string;
  rawDocData?: any;
}

export const AdminCsvDiagnosticsTab: React.FC<AdminCsvDiagnosticsTabProps> = ({
  exams,
  onRefreshExams,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [rawDbQuestions, setRawDbQuestions] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issues' | 'synced'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Repair State
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairProgress, setRepairProgress] = useState<{ current: number; total: number } | null>(null);
  const [repairSuccessMsg, setRepairSuccessMsg] = useState<string>('');
  const [repairErrorMsg, setRepairErrorMsg] = useState<string>('');

  // CSV Simulator State
  const [showCsvTester, setShowCsvTester] = useState<boolean>(false);
  const [csvInputText, setCsvInputText] = useState<string>('');
  const [csvSimulatedRows, setCsvSimulatedRows] = useState<Array<CsvQuestionRow & { mappedHomePageSubject: string }>>([]);
  const [csvParseErrors, setCsvParseErrors] = useState<string[]>([]);

  // Find currently selected exam
  const currentExam = useMemo(() => {
    return exams.find((e) => e.id === selectedExamId) || exams[0] || null;
  }, [exams, selectedExamId]);

  // Load questions directly from Firestore /Exam/{id}/questions subcollection
  const loadExamQuestionsFromFirestore = async (examId: string) => {
    if (!examId) return;
    setLoadingQuestions(true);
    setRepairSuccessMsg('');
    setRepairErrorMsg('');

    try {
      const qSubCol = collection(db, 'Exam', examId, 'questions');
      const qSnap = await getDocs(qSubCol);
      const list: any[] = [];
      qSnap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      // If subcollection is empty, fall back to exam.questions array
      if (list.length === 0) {
        const found = exams.find((e) => e.id === examId);
        if (found && Array.isArray(found.questions) && found.questions.length > 0) {
          found.questions.forEach((q, idx) => {
            list.push({
              id: q.id || `q-${idx}`,
              questionNumber: q.questionNumber || idx + 1,
              questionText: q.text,
              question: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              subject: q.subject,
            });
          });
        }
      }

      list.sort((a, b) => (Number(a.questionNumber) || 0) - (Number(b.questionNumber) || 0));
      setRawDbQuestions(list);
    } catch (err: any) {
      console.error('Error fetching questions for diagnostic:', err);
      setRepairErrorMsg('ফায়ারস্টোর থেকে প্রশ্ন লোড করতে ব্যর্থ হয়েছে: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadExamQuestionsFromFirestore(selectedExamId);
    }
  }, [selectedExamId]);

  // Analyze each question and construct diagnostic data
  const diagnostics = useMemo((): QuestionDiagnosticRow[] => {
    if (!currentExam) return [];

    return rawDbQuestions.map((q, idx) => {
      const qText = q.questionText || q.question || q.text || '';
      const storedSub = (q.subject || '').trim();
      const detectedSub = detectQuestionSubject(qText, q.options, q.explanation);

      let homePageCategory = storedSub;
      let status: 'synced' | 'fallback_detected' | 'mismatch' | 'missing' = 'synced';
      let issueDescription = 'প্রশ্নটির বিষয় হোম পেজ ক্যাটাগরির সাথে যথাযথভাবে সিঙ্কড আছে।';

      const KNOWN_HOME_SUBJECTS = [
        'বাংলা',
        'ইংরেজি',
        'গণিত',
        'বাংলাদেশ বিষয়াবলি -GK',
        'আন্তর্জাতিক সাধারন জ্ঞান',
        'ICT',
        'বিজ্ঞান',
        'বাংলা ব্যাকরণ',
        'নৈতিকতা মূল্যবোধ ও সুশাসন',
        'ভূগোল',
      ];

      const DOPTOR_LIST = ['BCS', 'Bank', '11th - 20th Grade Job', 'NTRCA - নিবন্ধন', 'Primary'];

      if (!storedSub) {
        status = 'missing';
        homePageCategory = detectedSub;
        issueDescription = `ফায়ারস্টোর ডকে 'subject' ফিল্ড অনুপস্থিত। এটি বর্তমানে স্বয়ংক্রিয় অনুমানের ভিত্তিতে '${detectedSub}' হিসেবে প্রদর্শিত হচ্ছে।`;
      } else if (storedSub === 'BCS' || storedSub === 'Model Test' || storedSub === 'বিসিএস') {
        status = 'fallback_detected';
        homePageCategory = detectedSub;
        issueDescription = `পরীক্ষার সাধারণ বিষয় '${storedSub}' সংরক্ষিত ছিল, যা নির্দিষ্ট বিষয় নয়। হোম পেজে এটি স্বয়ংক্রিয়ভাবে '${detectedSub}' বিভাগে প্রদর্শিত হচ্ছে।`;
      } else if (storedSub === 'GK' || storedSub === 'সাধারণ জ্ঞান') {
        status = 'fallback_detected';
        homePageCategory = detectedSub.includes('আন্তর্জাতিক') ? 'আন্তর্জাতিক সাধারন জ্ঞান' : 'বাংলাদেশ বিষয়াবলি -GK';
        issueDescription = `'${storedSub}' সাধারণ ট্যাগ ছিল। হোম পেজের ফিল্টারের সাথে মিলিয়ে '${homePageCategory}' এ সিঙ্ক করা হয়েছে।`;
      } else if (!KNOWN_HOME_SUBJECTS.includes(storedSub) && !DOPTOR_LIST.includes(storedSub)) {
        status = 'mismatch';
        homePageCategory = detectedSub;
        issueDescription = `'${storedSub}' নামটি হোম পেজের নির্দিষ্ট ১০টি বিষয় ক্যাটাগরির সাথে হুবহু মিলছে না। প্রস্তাবিত হোম পেজ বিষয়: '${detectedSub}'।`;
      }

      return {
        id: q.id || `diag-${idx}`,
        serial: Number(q.questionNumber) || idx + 1,
        text: qText,
        options: q.options || [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
        storedSubject: storedSub || '(অনুপস্থিত / Undefined)',
        detectedSubject: detectedSub,
        homePageCategory,
        status,
        issueDescription,
        rawDocData: q,
      };
    });
  }, [rawDbQuestions, currentExam]);

  // Aggregate Home Page Impact Matrix
  const homeCategoryMatrix = useMemo(() => {
    const counts: Record<string, number> = {
      'বাংলা': 0,
      'বাংলা ব্যাকরণ': 0,
      'ইংরেজি': 0,
      'গণিত': 0,
      'বাংলাদেশ বিষয়াবলি -GK': 0,
      'আন্তর্জাতিক সাধারন জ্ঞান': 0,
      'ICT': 0,
      'বিজ্ঞান': 0,
      'নৈতিকতা মূল্যবোধ ও সুশাসন': 0,
      'ভূগোল': 0,
    };

    diagnostics.forEach((d) => {
      if (counts[d.homePageCategory] !== undefined) {
        counts[d.homePageCategory]++;
      } else {
        counts[d.homePageCategory] = (counts[d.homePageCategory] || 0) + 1;
      }
    });

    return counts;
  }, [diagnostics]);

  // Filtered Diagnostics
  const filteredDiagnostics = useMemo(() => {
    return diagnostics.filter((d) => {
      if (statusFilter === 'issues' && d.status === 'synced') return false;
      if (statusFilter === 'synced' && d.status !== 'synced') return false;

      if (subjectFilter !== 'all' && d.homePageCategory !== subjectFilter && d.storedSubject !== subjectFilter) {
        return false;
      }

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          d.text.toLowerCase().includes(q) ||
          d.storedSubject.toLowerCase().includes(q) ||
          d.detectedSubject.toLowerCase().includes(q) ||
          String(d.serial).includes(q)
        );
      }

      return true;
    });
  }, [diagnostics, statusFilter, subjectFilter, searchFilter]);

  // Summary Counts
  const issueCounts = useMemo(() => {
    let missingCount = 0;
    let fallbackCount = 0;
    let mismatchCount = 0;
    let syncedCount = 0;

    diagnostics.forEach((d) => {
      if (d.status === 'missing') missingCount++;
      else if (d.status === 'fallback_detected') fallbackCount++;
      else if (d.status === 'mismatch') mismatchCount++;
      else syncedCount++;
    });

    return {
      total: diagnostics.length,
      missingCount,
      fallbackCount,
      mismatchCount,
      syncedCount,
      totalIssues: missingCount + fallbackCount + mismatchCount,
    };
  }, [diagnostics]);

  // Execute 1-Click Auto Repair: Writes the accurately mapped subject into Firestore
  const handleAutoRepairAndSync = async () => {
    if (!currentExam || diagnostics.length === 0) return;
    setIsRepairing(true);
    setRepairSuccessMsg('');
    setRepairErrorMsg('');
    setRepairProgress({ current: 0, total: diagnostics.length });

    const examId = currentExam.id;
    const repairedQuestions: Question[] = [];

    try {
      for (let i = 0; i < diagnostics.length; i++) {
        const d = diagnostics[i];
        const raw = d.rawDocData;
        const targetSubject = d.homePageCategory;

        // 1. Update subcollection document
        const qDocRef = doc(db, 'Exam', examId, 'questions', d.id);
        await setDoc(
          qDocRef,
          {
            subject: targetSubject,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Build normalized Question object
        repairedQuestions.push({
          id: d.id,
          text: d.text,
          options: d.options,
          correctAnswer: typeof raw.correctAnswer === 'number' ? raw.correctAnswer : 0,
          explanation: raw.explanation || '',
          questionNumber: d.serial,
          subject: targetSubject,
        });

        setRepairProgress({ current: i + 1, total: diagnostics.length });

        // Micro-pause to prevent write stream backpressure
        if (i % 8 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
      }

      // 2. Synchronize questions array to parent documents across /Exam, /exam, /exams
      const parentPayload = {
        questions: repairedQuestions,
        totalQuestions: repairedQuestions.length,
        totalMarks: repairedQuestions.length,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'Exam', examId), parentPayload, { merge: true });
      await setDoc(doc(db, 'exam', examId), parentPayload, { merge: true });
      await setDoc(doc(db, 'exams', examId), parentPayload, { merge: true });

      setRepairSuccessMsg(
        `✅ সফল হয়েছে! ${diagnostics.length}টি প্রশ্নের বিষয় সরাসরি ফায়ারস্টোরে সিঙ্ক ও সেভ করা হয়েছে। হোম পেজের সংশ্লিষ্ট বিষয় কার্ডগুলোতে প্রশ্নগুলো এখনই দৃশ্যমান হবে!`
      );

      // Reload fresh questions
      await loadExamQuestionsFromFirestore(examId);

      if (onRefreshExams) {
        onRefreshExams();
      }
    } catch (err: any) {
      console.error('Repair error:', err);
      setRepairErrorMsg('সিঙ্ক করতে ত্রুটি দেখা দিয়েছে: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsRepairing(false);
      setRepairProgress(null);
    }
  };

  // CSV Simulator / Parser
  const handleTestCsvInput = (rawText: string) => {
    setCsvInputText(rawText);
    setCsvParseErrors([]);

    if (!rawText.trim()) {
      setCsvSimulatedRows([]);
      return;
    }

    try {
      const parsed = processCsvData(rawText, []);
      if (parsed.fileErrors.length > 0) {
        setCsvParseErrors(parsed.fileErrors);
      }

      const rowsWithMapping = parsed.rows.map((r) => {
        let mapped = r.subject.trim();
        if (!mapped || mapped === 'BCS') {
          mapped = detectQuestionSubject(r.questionText, [r.optionA, r.optionB, r.optionC, r.optionD], r.explanation);
        }
        return {
          ...r,
          mappedHomePageSubject: mapped,
        };
      });

      setCsvSimulatedRows(rowsWithMapping);
    } catch (err: any) {
      setCsvParseErrors([`CSV পার্সিং ত্রুটি: ${err?.message || 'অজানা ত্রুটি'}`]);
    }
  };

  const getSubjectIcon = (subName: string) => {
    switch (subName) {
      case 'বাংলা':
        return <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'বাংলা ব্যাকরণ':
        return <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />;
      case 'ইংরেজি':
        return <Languages className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'গণিত':
        return <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'বাংলাদেশ বিষয়াবলি -GK':
        return <Landmark className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'আন্তর্জাতিক সাধারন জ্ঞান':
        return <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'ICT':
        return <Cpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case 'বিজ্ঞান':
        return <FlaskConical className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case 'নৈতিকতা মূল্যবোধ ও সুশাসন':
        return <Scale className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
      case 'ভূগোল':
        return <Compass className="h-4 w-4 text-lime-600 dark:text-lime-400" />;
      default:
        return <FileCheck className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-600/10 via-primary/5 to-teal-600/10 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 border border-emerald-500/20 dark:border-emerald-800/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV ও বিষয় ডায়াগনস্টিক ইঞ্জিন
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-800">
              হোম পেজ সিঙ্ক পরীক্ষক
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
            পরীক্ষার প্রশ্নাবলী ফায়ারস্টোরে কীভাবে সংরক্ষিত রয়েছে তা গভীরভাবে নিরীক্ষা করুন এবং হোম পেজ বিষয় ক্যাটাগরির সাথে সিঙ্ক না হওয়ার কারণ নির্ণয় ও স্বয়ংক্রিয় সমাধান করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadExamQuestionsFromFirestore(selectedExamId)}
            disabled={loadingQuestions || isRepairing}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="ফায়ারস্টোর থেকে নতুন করে ডেটা রিলোড করুন"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${loadingQuestions ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCsvTester(!showCsvTester)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              showCsvTester
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>CSV ফাইল টেস্ট স্যান্ডবক্স</span>
          </button>
        </div>
      </div>

      {/* 2. Exam Selector Dropdown */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            পরীক্ষা নির্বাচন করুন:
          </span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer max-w-md"
          >
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.questions?.length || exam.totalQuestions || 0}টি প্রশ্ন) [{exam.status}]
              </option>
            ))}
          </select>
        </div>

        {currentExam && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-mono">
              Exam ID: <strong>{currentExam.id}</strong>
            </span>
            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-lg font-bold">
              মূল বিষয়: {currentExam.subject || 'BCS'}
            </span>
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold">
              স্ট্যাটাস: {currentExam.status}
            </span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {repairSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{repairSuccessMsg}</span>
        </div>
      )}
      {repairErrorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{repairErrorMsg}</span>
        </div>
      )}

      {/* 3. Diagnostic Issue Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            মোট পরীক্ষিত প্রশ্ন
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {toBengaliDigits(issueCounts.total)} টি
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> নিখুঁত সিঙ্কড
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {toBengaliDigits(issueCounts.syncedCount)} টি
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-800/40 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> অনুমানকৃত বিষয়
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {toBengaliDigits(issueCounts.fallbackCount + issueCounts.missingCount)} টি
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-800/40 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> সমাধানযোগ্য ত্রুটি
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            {toBengaliDigits(issueCounts.totalIssues)} টি
          </span>
        </div>
      </div>

      {/* 4. Home Page Distribution Impact Matrix */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>হোম পেজ বিষয় ক্যাটাগরিতে এই পরীক্ষার প্রশ্নের উপস্থিতি (Live Distribution Matrix)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              এই পরীক্ষার প্রশ্নগুলো হোম পেজের কোন কোন বিষয় কার্ডে কয়টি করে প্রদর্শিত হচ্ছে তা নিচে দেখানো হলো:
            </p>
          </div>

          {/* 1-Click Auto Repair Button */}
          <button
            type="button"
            onClick={handleAutoRepairAndSync}
            disabled={isRepairing || loadingQuestions || diagnostics.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRepairing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>
                  ফায়ারস্টোরে সিঙ্ক হচ্ছে ({repairProgress?.current}/{repairProgress?.total})...
                </span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" />
                <span>১-ক্লিকে ডেটাবেজে বিষয় সিঙ্ক করুন</span>
              </>
            )}
          </button>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(homeCategoryMatrix).map(([sub, rawCount]) => {
            const count = Number(rawCount) || 0;
            const hasQuestions = count > 0;
            return (
              <div
                key={sub}
                onClick={() => setSubjectFilter(subjectFilter === sub ? 'all' : sub)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  hasQuestions
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 opacity-60'
                } ${subjectFilter === sub ? 'ring-2 ring-emerald-500 shadow-sm' : ''}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  {getSubjectIcon(sub)}
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      hasQuestions
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {toBengaliDigits(count)} টি
                  </span>
                </div>
                <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate" title={sub}>
                  {sub}
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {hasQuestions ? 'হোম পেজে সক্রিয়' : 'কোনো প্রশ্ন নেই'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CSV Test Sandbox (Expandable) */}
      {showCsvTester && (
        <div className="p-5 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-slate-950 border-2 border-emerald-500/30 rounded-3xl shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  CSV ফরম্যাট পরীক্ষক ও ম্যাপিং সিমুলেটর (CSV Upload Diagnostic Sandbox)
                </h4>
                <p className="text-[11px] text-slate-500">
                  নতুন CSV আপলোড করার আগে এখানে টেক্সট পেস্ট করে টেস্ট করুন—কোন প্রশ্ন হোম পেজের কোন বিষয়ে যাবে তা তাৎক্ষণিক দেখুন।
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCsvTester(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
            >
              বন্ধ করুন
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              CSV ফাইলের টেক্সট পেস্ট করুন (অথবা ফাইল ড্রপ করুন):
            </label>
            <textarea
              rows={4}
              value={csvInputText}
              onChange={(e) => handleTestCsvInput(e.target.value)}
              placeholder={`বিষয়/টপিক,প্রশ্ন বিবরণ,Option A,Option B,Option C,Option D,সঠিক উত্তর,ব্যাখ্যা\nবাংলা সাহিত্য,চর্যাপদ কোন ছন্দে রচিত?,মাত্রাবৃত্ত,অক্ষরবৃত্ত,স্বরবৃত্ত,মুক্তক,A,চর্যাপদ মূলত মাত্রাবৃত্ত ছন্দে রচিত।\nEnglish,What is the synonym of 'Abundant'?,Scarce,Plentiful,Rare,Small,B,Abundant means existing in large quantities.`}
              className="w-full p-3 font-mono text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {csvParseErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1">
              {csvParseErrors.map((err, idx) => (
                <p key={idx} className="text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> {err}
                </p>
              ))}
            </div>
          )}

          {csvSimulatedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  সিমুলেশন ফলাফল: {csvSimulatedRows.length}টি প্রশ্ন শনাক্ত হয়েছে
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">নং</th>
                      <th className="p-2.5">CSV ইনপুট বিষয়</th>
                      <th className="p-2.5">হোম পেজে যে বিষয়ে সিঙ্ক হবে</th>
                      <th className="p-2.5">প্রশ্ন বিবরণ</th>
                      <th className="p-2.5">সঠিক উত্তর</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                    {csvSimulatedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        <td className="p-2.5 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                          {r.subject || <span className="text-amber-500">(খালি)</span>}
                        </td>
                        <td className="p-2.5 font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          {getSubjectIcon(r.mappedHomePageSubject)}
                          <span>{r.mappedHomePageSubject}</span>
                        </td>
                        <td className="p-2.5 max-w-xs truncate text-slate-800 dark:text-slate-200">{r.questionText}</td>
                        <td className="p-2.5 font-mono text-emerald-600 font-bold">{r.correctAnswerLetter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Questions Diagnostic Inspection Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        {/* Table Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              প্রশ্নভিত্তিক ডায়াগনস্টিক রিপোর্ট ({filteredDiagnostics.length}টি প্রশ্ন)
            </h4>
            {subjectFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold rounded-md">
                বিষয়: {subjectFilter}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="প্রশ্ন বা বিষয় খুঁজুন..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">সকল অবস্থা</option>
              <option value="issues">শুধুমাত্র সমস্যাযুক্ত প্রশ্ন ({issueCounts.totalIssues})</option>
              <option value="synced">নিখুঁত সিঙ্কড প্রশ্ন ({issueCounts.syncedCount})</option>
            </select>

            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">সকল বিষয়</option>
              {Object.keys(homeCategoryMatrix).map((s) => (
                <option key={s} value={s}>
                  {s} ({homeCategoryMatrix[s]}টি)
                </option>
              ))}
            </select>

            {(searchFilter || statusFilter !== 'all' || subjectFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setStatusFilter('all');
                  setSubjectFilter('all');
                }}
                className="text-xs text-rose-500 font-bold hover:underline px-1.5"
              >
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loadingQuestions ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">ফায়ারস্টোর থেকে প্রশ্ন ডেটা বিশ্লেষণ হচ্ছে...</p>
          </div>
        ) : filteredDiagnostics.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">কোনো প্রশ্ন পাওয়া যায়নি।</p>
            <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
                <tr>
                  <th className="p-3 w-12 text-center">নং</th>
                  <th className="p-3 min-w-[200px]">প্রশ্ন বিবরণ</th>
                  <th className="p-3 min-w-[130px]">ডেটাবেজে সংরক্ষিত বিষয়</th>
                  <th className="p-3 min-w-[140px]">হোম পেজে সিঙ্ককৃত বিষয়</th>
                  <th className="p-3 min-w-[110px]">অবস্থা (Status)</th>
                  <th className="p-3 min-w-[200px]">ডায়াগনস্টিক বিবরণ ও সমাধান</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredDiagnostics.map((d) => {
                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        d.status === 'missing'
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : d.status === 'fallback_detected'
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Question Serial */}
                      <td className="p-3 font-mono font-bold text-center text-slate-400">
                        {toBengaliDigits(d.serial)}
                      </td>

                      {/* Question Text */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white leading-relaxed line-clamp-2">
                          {d.text}
                        </div>
                        {d.options && d.options.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            বিকল্প: {d.options.join(' | ')}
                          </div>
                        )}
                      </td>

                      {/* Stored Subject in DB */}
                      <td className="p-3">
                        <div className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] inline-block font-semibold">
                          {d.storedSubject}
                        </div>
                      </td>

                      {/* Home Page Mapped Category */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-black text-emerald-700 dark:text-emerald-300">
                          {getSubjectIcon(d.homePageCategory)}
                          <span>{d.homePageCategory}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        {d.status === 'synced' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-bold text-[10px]">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> সিঙ্কড
                          </span>
                        )}
                        {d.status === 'fallback_detected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md font-bold text-[10px]">
                            <Sparkles className="h-3 w-3 text-amber-600" /> অনুমানকৃত
                          </span>
                        )}
                        {d.status === 'missing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-md font-bold text-[10px]">
                            <AlertCircle className="h-3 w-3 text-rose-600" /> অনুপস্থিত
                          </span>
                        )}
                        {d.status === 'mismatch' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-md font-bold text-[10px]">
                            <AlertTriangle className="h-3 w-3 text-purple-600" /> ফিল্টার অমিল
                          </span>
                        )}
                      </td>

                      {/* Diagnostic Analysis & Root Cause */}
                      <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                        {d.issueDescription}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCsvDiagnosticsTab;
