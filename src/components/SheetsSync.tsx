/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Upload,
  Download,
  RefreshCw,
  PlusCircle,
  FileCheck,
  Search,
  Users,
  BookOpen,
  Award,
  CreditCard,
  Layers,
  ArrowRight,
  ShieldCheck,
  LogIn,
  LogOut,
  Info,
  Clock,
  CheckCircle,
  XCircle,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Check,
  AlertCircle,
  Sliders,
  Sparkles,
  History,
  Activity,
  Zap,
  ListOrdered
} from 'lucide-react';
import { Exam, ExamResult, Question, UserProfile, PaymentRecord } from '../types';
import {
  connectGoogleSheetsAccount,
  disconnectGoogleAccount,
  getConnectedGoogleUser,
  getGoogleAccessToken,
  isGoogleConnected,
  subscribeGoogleAuth
} from '../lib/googleAuth';
import {
  createMasterSpreadsheetTemplate,
  exportAllDataToGoogleSheets,
  exportToGoogleSheets,
  formatExamsForSheet,
  formatPaymentsForSheet,
  formatQuestionsForSheet,
  formatResultsForSheet,
  formatStudentsForSheet,
  getPendingSyncQueue,
  getSavedSpreadsheetId,
  getSpreadsheetMetadata,
  importQuestionsToFirestore,
  readAndValidateQuestionsFromSheet,
  retryPendingResultSyncs,
  saveSpreadsheetId,
  SheetQuestionsParseResult,
  SheetRowValidation
} from '../services/googleSheetsService';

export interface OperationLog {
  id: string;
  timestamp: Date;
  type: 'import' | 'export' | 'sync' | 'template' | 'auth';
  target: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  rowCount?: number;
}

interface SheetsSyncProps {
  students: UserProfile[];
  exams: Exam[];
  results: ExamResult[];
  onUpdateExam?: (exam: Exam) => void;
  onRefreshData?: () => void;
}

type DashboardTab = 'hub' | 'import' | 'export' | 'settings' | 'logs';

export default function SheetsSync({
  students,
  exams,
  results,
  onUpdateExam,
  onRefreshData
}: SheetsSyncProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<DashboardTab>('hub');

  // Google Auth State
  const [isConnected, setIsConnected] = useState<boolean>(isGoogleConnected());
  const [googleUser, setGoogleUser] = useState(getConnectedGoogleUser());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Spreadsheet ID & Metadata
  const [spreadsheetId, setSpreadsheetId] = useState<string>(getSavedSpreadsheetId());
  const [sheetMetadata, setSheetMetadata] = useState<any>(null);
  const [verifyingSheet, setVerifyingSheet] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string>('');

  // Import System State
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || 'bcs-preliminary-01');
  const [importSheetName, setImportSheetName] = useState<string>('Question Bank');
  const [readingQuestions, setReadingQuestions] = useState(false);
  const [parsedData, setParsedData] = useState<SheetQuestionsParseResult | null>(null);
  const [importingToDb, setImportingToDb] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'errors'>('all');

  // Export States with Per-Table Status Indicators
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportStatusMsg, setExportStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tableExportStatus, setTableExportStatus] = useState<Record<string, { status: 'idle' | 'running' | 'success' | 'error'; lastExported?: Date; count?: number; error?: string }>>({
    Students: { status: 'idle' },
    Exams: { status: 'idle' },
    'Question Bank': { status: 'idle' },
    Results: { status: 'idle' },
    Payments: { status: 'idle' },
    Downloads: { status: 'idle' },
  });

  // Sync Queue State
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(getPendingSyncQueue().length);
  const [retryingSync, setRetryingSync] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);

  // Operation Logs State
  const [logs, setLogs] = useState<OperationLog[]>([
    {
      id: 'init-1',
      timestamp: new Date(),
      type: 'auth',
      target: 'Google Auth & Firestore',
      status: isGoogleConnected() ? 'success' : 'warning',
      message: isGoogleConnected() ? 'Google Sheets ও ফায়ারস্টোর কানেকশন সক্রিয়' : 'Google Sheets কানেকশন অপেক্ষমান',
    }
  ]);

  const addLog = (
    type: OperationLog['type'],
    target: string,
    status: OperationLog['status'],
    message: string,
    rowCount?: number
  ) => {
    const newLog: OperationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      type,
      target,
      status,
      message,
      rowCount,
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  // Subscribe to Auth token changes
  useEffect(() => {
    const unsub = subscribeGoogleAuth((token) => {
      const connected = !!token;
      setIsConnected(connected);
      const user = getConnectedGoogleUser();
      setGoogleUser(user);
      if (connected) {
        addLog('auth', 'Google Account', 'success', `গুগল একাউন্ট সংযুক্ত: ${user?.email || 'Authorized'}`);
      }
    });
    return () => unsub();
  }, []);

  // Update sheet link when spreadsheetId changes
  useEffect(() => {
    if (spreadsheetId) {
      const clean = spreadsheetId.includes('/d/')
        ? spreadsheetId.split('/d/')[1].split('/')[0]
        : spreadsheetId.trim();
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${clean}/edit`);
    } else {
      setSheetUrl('');
    }
  }, [spreadsheetId]);

  // Initial Sheet Verification on load if token and ID present
  useEffect(() => {
    if (isGoogleConnected() && spreadsheetId && !sheetMetadata) {
      handleVerifySheet(spreadsheetId, false);
    }
  }, [isConnected]);

  // Periodic check of sync queue
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingSyncCount(getPendingSyncQueue().length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Google Login / Connect
  const handleConnectGoogle = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await connectGoogleSheetsAccount();
      setAuthLoading(false);
      addLog('auth', 'Google Account', 'success', `গুগল অথেন্টিকেশন সফল: ${res.user?.email || 'Authorized'}`);
      if (spreadsheetId) {
        handleVerifySheet(spreadsheetId, true);
      }
    } catch (err: any) {
      console.error('Google connect error:', err);
      const errorText = err?.message || 'গুগল একাউন্ট কানেক্ট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      setAuthError(errorText);
      addLog('auth', 'Google Account', 'error', errorText);
      setAuthLoading(false);
    }
  };

  // Handle Disconnect
  const handleDisconnectGoogle = () => {
    disconnectGoogleAccount();
    setSheetMetadata(null);
    addLog('auth', 'Google Account', 'warning', 'গুগল একাউন্ট ডিসকানেক্ট করা হয়েছে');
  };

  // Handle Verify Spreadsheet
  const handleVerifySheet = async (idToVerify?: string, showNotification = true) => {
    const targetId = idToVerify || spreadsheetId;
    if (!targetId.trim()) {
      if (showNotification) alert('অনুগ্রহ করে একটি স্প্রেডশীট আইডি প্রদান করুন।');
      return;
    }

    if (!isGoogleConnected()) {
      if (showNotification) alert('স্প্রেডশীট যাচাই করতে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setVerifyingSheet(true);
    setAuthError('');
    try {
      const meta = await getSpreadsheetMetadata(targetId);
      setSheetMetadata(meta);
      saveSpreadsheetId(targetId);
      addLog('template', meta.title || 'Spreadsheet', 'success', `স্প্রেডশীট "${meta.title}" সফলভাবে যাচাই ও সংযুক্ত`);
      if (showNotification) {
        setExportStatusMsg({
          type: 'success',
          message: `স্প্রেডশীট "${meta.title}" সফলভাবে ভেরিফাই ও কানেক্ট করা হয়েছে!`
        });
        setTimeout(() => setExportStatusMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Verify error:', err);
      setSheetMetadata(null);
      const msg = err?.message || 'স্প্রেডশীট যাচাই ব্যর্থ হয়েছে। আইডি ও পারমিশন নিশ্চিত করুন।';
      setAuthError(msg);
      addLog('template', 'Spreadsheet Verification', 'error', msg);
    } finally {
      setVerifyingSheet(false);
    }
  };

  // Handle 1-Click Master Template Creation
  const handleCreateMasterTemplate = async () => {
    if (!isGoogleConnected()) {
      alert('নতুন স্প্রেডশীট তৈরি করতে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setCreatingTemplate(true);
    setAuthError('');
    try {
      const res = await createMasterSpreadsheetTemplate();
      setSpreadsheetId(res.spreadsheetId);
      setSheetUrl(res.spreadsheetUrl);
      addLog('template', 'Master Template', 'success', '১-ক্লিকে মাস্টার স্প্রেডশীট তৈরি সম্পন্ন');
      setExportStatusMsg({
        type: 'success',
        message: '🎉 মেধা এক্সাম পোর্টাল মাস্টার স্প্রেডশীট সফলভাবে আপনার গুগল ড্রাইভে তৈরি করা হয়েছে!'
      });
      await handleVerifySheet(res.spreadsheetId, false);
    } catch (err: any) {
      console.error('Create template error:', err);
      const msg = err?.message || 'টেমপ্লেট তৈরি করতে সমস্যা হয়েছে।';
      setAuthError(msg);
      addLog('template', 'Master Template', 'error', msg);
    } finally {
      setCreatingTemplate(false);
    }
  };

  // -------------------------------------------------------------
  // QUESTION IMPORT FLOW
  // -------------------------------------------------------------
  const handleReadAndValidateQuestions = async () => {
    if (!spreadsheetId) {
      alert('অনুগ্রহ করে স্প্রেডশীট আইডি প্রদান করুন বা নতুন মাস্টার স্প্রেডশীট তৈরি করুন।');
      return;
    }
    if (!isGoogleConnected()) {
      alert('প্রশ্ন পড়তে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setReadingQuestions(true);
    setImportStatusMsg(null);
    setParsedData(null);

    try {
      const result = await readAndValidateQuestionsFromSheet(
        spreadsheetId,
        selectedExamId,
        importSheetName || 'Question Bank'
      );
      setParsedData(result);
      if (result.totalRows === 0) {
        setImportStatusMsg({
          type: 'error',
          message: `"${importSheetName}" শিটে কোনো প্রশ্নের সারি পাওয়া যায়নি।`
        });
        addLog('import', 'Question Bank', 'error', `"${importSheetName}" ট্যাবে কোনো সারি নেই`);
      } else if (result.errorCount > 0) {
        setImportStatusMsg({
          type: 'warning',
          message: `${result.totalRows} টি সারির মধ্যে ${result.validCount} টি সঠিক এবং ${result.errorCount} টি সারিতে ত্রুটি পাওয়া গেছে। নিচের তালিকা পরীক্ষা করুন।`
        });
        addLog('import', 'Question Bank', 'warning', `${result.validCount} টি বৈধ, ${result.errorCount} টি ত্রুটিযুক্ত প্রশ্ন শনাক্ত`, result.totalRows);
      } else {
        setImportStatusMsg({
          type: 'success',
          message: `অভিনন্দন! মোট ${result.validCount} টি প্রশ্নের সবকটি সফলভাবে যাচাই হয়েছে। ডেটাবেজে ইমপোর্ট করার জন্য প্রস্তুত!`
        });
        addLog('import', 'Question Bank', 'success', `সকল ${result.validCount} টি প্রশ্ন সফলভাবে যাচাই সম্পন্ন`, result.validCount);
      }
    } catch (err: any) {
      console.error('Read questions error:', err);
      const msg = err?.message || 'গুগল শিট থেকে প্রশ্ন পড়তে সমস্যা হয়েছে।';
      setImportStatusMsg({ type: 'error', message: msg });
      addLog('import', 'Question Bank', 'error', msg);
    } finally {
      setReadingQuestions(false);
    }
  };

  const handleConfirmImportToFirestore = async () => {
    if (!parsedData || parsedData.validQuestions.length === 0) {
      alert('ইমপোর্ট করার জন্য কোনো বৈধ প্রশ্ন পাওয়া যায়নি।');
      return;
    }

    const targetExam = exams.find(e => e.id === selectedExamId);
    const examTitle = targetExam?.title || selectedExamId;

    if (!window.confirm(`আপনি কি "${examTitle}" পরীক্ষার অধীনে ${parsedData.validQuestions.length} টি প্রশ্ন ফায়ারস্টোর ডেটাবেজে সংরক্ষণ করতে চান?`)) {
      return;
    }

    setImportingToDb(true);
    try {
      const importRes = await importQuestionsToFirestore(
        parsedData.validQuestions,
        selectedExamId
      );

      if (importRes.successCount > 0) {
        if (targetExam && onUpdateExam) {
          const newQuestionsList = [
            ...(targetExam.questions || []),
            ...parsedData.validQuestions.map(v => v.question)
          ];
          onUpdateExam({
            ...targetExam,
            questions: newQuestionsList,
            totalQuestions: newQuestionsList.length,
            totalMarks: newQuestionsList.length
          });
        }

        const successMsg = `🎉 সফলভাবে ${importRes.successCount} টি প্রশ্ন Firebase Firestore ডেটাবেজে যুক্ত করা হয়েছে! ${
          importRes.failedCount > 0 ? `(${importRes.failedCount} টি ব্যর্থ)` : ''
        }`;
        setImportStatusMsg({ type: 'success', message: successMsg });
        addLog('import', `Exam: ${examTitle}`, 'success', `${importRes.successCount} টি প্রশ্ন ফায়ারস্টোরে সফলভাবে সংরক্ষিত`, importRes.successCount);

        setParsedData(null);
        if (onRefreshData) onRefreshData();
      } else {
        const errorMsg = `প্রশ্ন ইমপোর্ট ব্যর্থ হয়েছে। ত্রুটি: ${importRes.errors.join(', ')}`;
        setImportStatusMsg({ type: 'error', message: errorMsg });
        addLog('import', `Exam: ${examTitle}`, 'error', errorMsg);
      }
    } catch (err: any) {
      console.error('Import to DB error:', err);
      const errorMsg = err?.message || 'ফায়ারস্টোর ডেটাবেজে ইমপোর্ট করার সময় সমস্যা হয়েছে।';
      setImportStatusMsg({ type: 'error', message: errorMsg });
      addLog('import', 'Firestore Batch', 'error', errorMsg);
    } finally {
      setImportingToDb(false);
    }
  };

  // -------------------------------------------------------------
  // EXPORT DATA FLOW
  // -------------------------------------------------------------
  const handleExportIndividual = async (
    type: 'Students' | 'Exams' | 'Question Bank' | 'Results' | 'Payments' | 'Downloads'
  ) => {
    if (!spreadsheetId) {
      alert('অনুগ্রহ করে স্প্রেডশীট আইডি প্রদান করুন।');
      return;
    }
    if (!isGoogleConnected()) {
      alert('ডেটা এক্সপোর্ট করতে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setExportingType(type);
    setExportStatusMsg(null);
    setTableExportStatus(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'running' }
    }));

    let rows: any[][] = [];
    if (type === 'Students') rows = formatStudentsForSheet(students);
    else if (type === 'Exams') rows = formatExamsForSheet(exams);
    else if (type === 'Question Bank') rows = formatQuestionsForSheet(exams);
    else if (type === 'Results') rows = formatResultsForSheet(results);
    else if (type === 'Payments') rows = formatPaymentsForSheet();
    else if (type === 'Downloads') rows = formatStudentsForSheet(students);

    try {
      const res = await exportToGoogleSheets(type, spreadsheetId, rows);
      setTableExportStatus(prev => ({
        ...prev,
        [type]: {
          status: 'success',
          lastExported: new Date(),
          count: rows.length
        }
      }));
      setExportStatusMsg({
        type: 'success',
        message: `🎉 ${res.message}`
      });
      addLog('export', type, 'success', `${rows.length} টি রেকর্ড সফলভাবে শিটে এক্সপোর্ট হয়েছে`, rows.length);
    } catch (err: any) {
      console.error(`Export ${type} error:`, err);
      const msg = err?.message || `${type} এক্সপোর্ট করতে সমস্যা হয়েছে।`;
      setTableExportStatus(prev => ({
        ...prev,
        [type]: {
          status: 'error',
          error: msg
        }
      }));
      setExportStatusMsg({
        type: 'error',
        message: msg
      });
      addLog('export', type, 'error', msg);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportAll = async () => {
    if (!spreadsheetId) {
      alert('অনুগ্রহ করে স্প্রেডশীট আইডি প্রদান করুন।');
      return;
    }
    if (!isGoogleConnected()) {
      alert('সকল ডেটা এক্সপোর্ট করতে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setExportingType('all');
    setExportStatusMsg(null);

    // Set all tables to running
    setTableExportStatus({
      Students: { status: 'running' },
      Exams: { status: 'running' },
      'Question Bank': { status: 'running' },
      Results: { status: 'running' },
      Payments: { status: 'running' },
      Downloads: { status: 'running' },
    });

    try {
      const res = await exportAllDataToGoogleSheets(spreadsheetId, {
        students,
        exams,
        results
      });
      const now = new Date();
      setTableExportStatus({
        Students: { status: 'success', lastExported: now, count: students.length },
        Exams: { status: 'success', lastExported: now, count: exams.length },
        'Question Bank': { status: 'success', lastExported: now, count: exams.reduce((a, e) => a + (e.questions?.length || 0), 0) },
        Results: { status: 'success', lastExported: now, count: results.length },
        Payments: { status: 'success', lastExported: now, count: 0 },
        Downloads: { status: 'success', lastExported: now, count: 0 },
      });
      setExportStatusMsg({
        type: 'success',
        message: `🎉 ${res.message}`
      });
      addLog('export', 'All Tables (Master Sync)', 'success', 'সকল ৬টি টেবিল একযোগে গুগল শিটে এক্সপোর্ট সম্পন্ন');
    } catch (err: any) {
      console.error('Export all error:', err);
      const msg = err?.message || 'সকল ডেটা এক্সপোর্ট করতে সমস্যা হয়েছে।';
      setExportStatusMsg({
        type: 'error',
        message: msg
      });
      addLog('export', 'All Tables', 'error', msg);
    } finally {
      setExportingType(null);
    }
  };

  // -------------------------------------------------------------
  // SYNC QUEUE RETRY
  // -------------------------------------------------------------
  const handleRetrySyncs = async () => {
    if (!isGoogleConnected()) {
      alert('রেজাল্ট সিঙ্ক করতে প্রথমে Google অ্যাকাউন্ট কানেক্ট করুন।');
      return;
    }

    setRetryingSync(true);
    setSyncStatusMsg('');
    try {
      const outcome = await retryPendingResultSyncs(spreadsheetId);
      setPendingSyncCount(getPendingSyncQueue().length);
      const resMsg = `সিঙ্ক সমাপ্ত: ${outcome.succeeded} টি সফল, ${outcome.failed} টি অবশিষ্ট।`;
      setSyncStatusMsg(resMsg);
      addLog('sync', 'Pending Queue', outcome.failed > 0 ? 'warning' : 'success', resMsg);
    } catch (err: any) {
      console.error('Retry sync error:', err);
      const errTxt = 'সিঙ্ক প্রক্রিয়া সম্পন্ন হতে পারেনি।';
      setSyncStatusMsg(errTxt);
      addLog('sync', 'Pending Queue', 'error', errTxt);
    } finally {
      setRetryingSync(false);
    }
  };

  // Filter preview rows
  const filteredPreviewRows = useMemo(() => {
    return (parsedData?.rows || []).filter((r: SheetRowValidation) => {
      if (previewFilter === 'valid') return r.isValid;
      if (previewFilter === 'errors') return !r.isValid;
      return true;
    });
  }, [parsedData, previewFilter]);

  // Overall question count
  const totalQuestionsInSystem = useMemo(() => {
    return exams.reduce((acc, e) => acc + (e.questions?.length || 0), 0);
  }, [exams]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. MASTER HEADER & REAL-TIME STATUS BAR */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-300 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SheetsSync™ Enterprise Bridge</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">Firestore ↔ Google Sheets Integration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              শিটসিঙ্ক ড্যাশবোর্ড (SheetsSync Dashboard)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ফায়ারবেস ফায়ারস্টোর ডেটাবেজ ও গুগল স্প্রেডশীটের মধ্যে রিয়েল-টাইম ডেটা সিঙ্ক্রোনাইজেশন, বাল্ক কুইজ প্রশ্ন ইমপোর্ট ও প্রশাসনিক ব্যাকআপ পরিচালনা করুন।
            </p>
          </div>

          {/* Connection Pill & Action */}
          <div className="bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-slate-300">Google Sheets স্ট্যাটাস:</span>
              {isConnected ? (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1.5 font-bold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  সংযুক্ত (Connected)
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1.5 font-bold text-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  সংযোগ বিচ্ছিন্ন (Disconnected)
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-mono bg-black/20 px-2 py-1 rounded">
                  {googleUser?.email || 'Authorized'}
                </span>
                <button
                  onClick={handleDisconnectGoogle}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="গুগল অ্যাকাউন্ট ডিসকানেক্ট করুন"
                >
                  <LogOut className="h-3 w-3" />
                  লগআউট
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={authLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {authLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span>Google দিয়ে অথেন্টিকেট করুন</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Live Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10 text-xs">
          {/* Card 1: Firestore Live */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Primary DB</div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Firestore লাইভ
              </div>
            </div>
          </div>

          {/* Card 2: Questions Ready */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">প্রশ্ন ব্যাংক</div>
              <div className="font-bold text-white">{totalQuestionsInSystem} টি প্রশ্ন ({exams.length} পরীক্ষা)</div>
            </div>
          </div>

          {/* Card 3: Results Tracked */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ফলাফল রেকর্ড</div>
              <div className="font-bold text-white">{results.length} টি রেজাল্ট লগ</div>
            </div>
          </div>

          {/* Card 4: Sync Queue */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${pendingSyncCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">সিঙ্ক কিউ (Queue)</div>
              <div className="font-bold text-white flex items-center gap-1.5">
                {pendingSyncCount > 0 ? (
                  <span className="text-amber-300 font-extrabold">{pendingSyncCount} টি সিঙ্ক পেন্ডিং</span>
                ) : (
                  <span className="text-emerald-300">১০০% আপ-টু-ডেট</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {authError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{authError}</span>
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('hub')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'hub'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>ড্যাশবোর্ড ও সিঙ্ক হাব (Overview)</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'import'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="h-4 w-4 text-indigo-600" />
          <span>প্রশ্ন ইমপোর্ট (Question Import)</span>
          {parsedData && (
            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-full font-bold">
              {parsedData.validCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'export'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Download className="h-4 w-4 text-blue-600" />
          <span>ডেটা এক্সপোর্ট (Export Hub)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="h-4 w-4 text-emerald-600" />
          <span>স্প্রেডশীট কনফিগারেশন</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4 text-slate-500" />
          <span>অপারেশন লগ ({logs.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW & SYNC HUB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Sync Health & Quick Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Health Card: Auto-Sync */}
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">রিয়েলটাইম সিঙ্ক</span>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    সক্রিয় (Active)
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  স্বয়ংক্রিয় রেজাল্ট সিঙ্ক
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  শিক্ষার্থীরা পরীক্ষা জমা দেওয়ার সাথে সাথে ব্যাকগ্রাউন্ডে গুগল শিটের "Results" ট্যাবে ফলাফল যুক্ত হবে।
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-500">স্ট্যাটাস: <strong className="text-slate-800 dark:text-white">Auto-push Enabled</strong></span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ প্রস্তুত</span>
              </div>
            </div>

            {/* Health Card: Pending Queue */}
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">অফলাইন / ফলব্যাক কিউ</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    pendingSyncCount > 0
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {pendingSyncCount} টি আইটেম
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-indigo-500" />
                  পেন্ডিং রেজাল্ট সিঙ্ক কিউ
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ইন্টারনেট বা সাময়িক টোকেন বিঘ্ন ঘটলে ফলাফলগুলো স্বয়ংক্রিয়ভাবে কিউতে জমা থাকে এবং ১-ক্লিকে শিটে পাঠানো যায়।
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                <button
                  onClick={handleRetrySyncs}
                  disabled={retryingSync || !isConnected || pendingSyncCount === 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {retryingSync ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  <span>এখনই সিঙ্ক করুন ({pendingSyncCount})</span>
                </button>
              </div>
            </div>

            {/* Health Card: Spreadsheet Connection */}
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">সংযুক্ত শিট</span>
                  {sheetMetadata ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                      লিঙ্কড
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                      কনফিগারেশন প্রয়োজন
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 truncate">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="truncate">{sheetMetadata?.title || 'মাস্টার স্প্রেডশীট'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {spreadsheetId ? `ID: ${spreadsheetId.substring(0, 22)}...` : 'কোনো স্প্রেডশীট এখনো সংযুক্ত করা হয়নি।'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                {sheetUrl ? (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>গুগল শিট ব্রাউজ করুন</span>
                  </a>
                ) : (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>শিট কনফিগার করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Quick Action Bento Grid */}
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  দ্রুত একশন হাব (Quick Operations)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  এক ক্লিকে গুরুত্বপূর্ণ সিঙ্ক ও ব্যাকআপ অপারেশন সম্পন্ন করুন।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <button
                onClick={() => setActiveTab('import')}
                className="p-4 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl w-fit shadow-md shadow-indigo-600/20 mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">প্রশ্ন ইমপোর্ট করুন</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  গুগল শিটের Question Bank থেকে স্বয়ংক্রিয় ভ্যালিডেশন সহ ফায়ারস্টোরে ইমপোর্ট
                </p>
              </button>

              <button
                onClick={() => handleExportAll()}
                disabled={exportingType === 'all' || !isConnected || !spreadsheetId}
                className="p-4 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-2xl text-left transition-all group cursor-pointer disabled:opacity-60"
              >
                <div className="p-2.5 bg-blue-600 text-white rounded-xl w-fit shadow-md shadow-blue-600/20 mb-3 group-hover:scale-105 transition-transform">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">১-ক্লিকে সম্পূর্ণ ব্যাকআপ</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Students, Exams, Questions, Results সকল ৬টি টেবিল একযোগে গুগল শিটে সেভ
                </p>
              </button>

              <button
                onClick={() => handleExportIndividual('Results')}
                disabled={exportingType === 'Results' || !isConnected || !spreadsheetId}
                className="p-4 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl text-left transition-all group cursor-pointer disabled:opacity-60"
              >
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl w-fit shadow-md shadow-emerald-600/20 mb-3 group-hover:scale-105 transition-transform">
                  <Award className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">রেজাল্ট এক্সপোর্ট</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  সকল শিক্ষার্থীর {results.length} টি ফলাফল গুগল শিটের Results ট্যাবে স্থানান্তর
                </p>
              </button>

              <button
                onClick={() => handleCreateMasterTemplate()}
                disabled={creatingTemplate || !isConnected}
                className="p-4 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-2xl text-left transition-all group cursor-pointer disabled:opacity-60"
              >
                <div className="p-2.5 bg-amber-600 text-white rounded-xl w-fit shadow-md shadow-amber-600/20 mb-3 group-hover:scale-105 transition-transform">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">নতুন মাস্টার টেমপ্লেট</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  আপনার গুগল ড্রাইভে ৬টি প্রিসেট টেবিল সহ রেডিমেড স্প্রেডশীট জেনারেট করুন
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: QUESTION IMPORT DASHBOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'import' && (
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-md">
                  Import Wizard
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-600" />
                  গুগল শিট থেকে প্রশ্ন ইমপোর্ট সিস্টেম
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                শিটের প্রতিটি প্রশ্ন যাচাই (Validation), অপশন এনালাইসিস, ত্রুটি শনাক্তকরণ এবং সরাসরি ফায়ারস্টোরে ব্যাচ ইমপোর্ট।
              </p>
            </div>

            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>শিটে প্রশ্ন এডিট করুন ↗</span>
              </a>
            )}
          </div>

          {/* Import Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700">
            <div className="lg:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                ১. লক্ষ্য পরীক্ষা নির্বাচন করুন (Target Exam):
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.subject}) - [{exam.questions?.length || 0} টি বর্তমান প্রশ্ন]
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                ২. শিট ট্যাবের নাম (Sheet Tab):
              </label>
              <input
                type="text"
                value={importSheetName}
                onChange={(e) => setImportSheetName(e.target.value)}
                placeholder="Question Bank"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="lg:col-span-3">
              <button
                onClick={handleReadAndValidateQuestions}
                disabled={readingQuestions || !isConnected || !spreadsheetId}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {readingQuestions ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                <span>যাচাই ও প্রিভিউ করুন</span>
              </button>
            </div>
          </div>

          {/* Validation Status Notice */}
          {importStatusMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-medium border flex items-center gap-3 ${
                importStatusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : importStatusMsg.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {importStatusMsg.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : importStatusMsg.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              )}
              <div className="leading-relaxed font-semibold">{importStatusMsg.message}</div>
            </div>
          )}

          {/* Parsed Questions Preview Table */}
          {parsedData && parsedData.rows.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* Stats Badges & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    মোট প্রশ্ন: <strong>{parsedData.totalRows}</strong> টি
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    সঠিক: {parsedData.validCount} টি
                  </span>
                  {parsedData.errorCount > 0 && (
                    <span className="px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      ত্রুটিযুক্ত: {parsedData.errorCount} টি (সারি: {parsedData.errorRowNumbers.join(', ')})
                    </span>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      previewFilter === 'all'
                        ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    সকল ({parsedData.totalRows})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      previewFilter === 'valid'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    বৈধ ({parsedData.validCount})
                  </button>
                  {parsedData.errorCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('errors')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        previewFilter === 'errors'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50'
                      }`}
                    >
                      ত্রুটিযুক্ত ({parsedData.errorCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Questions Table */}
              <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <th className="p-3 w-12 text-center">সারি</th>
                      <th className="p-3">প্রশ্নের বিবরণ (Question Text)</th>
                      <th className="p-3">অপশনসমূহ (A, B, C, D)</th>
                      <th className="p-3 text-center">সঠিক উত্তর</th>
                      <th className="p-3">ব্যাখ্যা / সমাধান</th>
                      <th className="p-3 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800/60">
                    {filteredPreviewRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          #{row.rowNumber}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-100 max-w-xs">
                          <div className="leading-snug">{row.questionText || <span className="text-rose-500 italic">(ফাঁকা)</span>}</div>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {row.questionId}</span>
                        </td>
                        <td className="p-3 space-y-0.5 min-w-[180px]">
                          <div className={`px-2 py-0.5 rounded text-[11px] ${row.correctAnswerIndex === 0 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                            A. {row.optionA || <span className="text-rose-500 italic">(খালি)</span>}
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[11px] ${row.correctAnswerIndex === 1 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                            B. {row.optionB || <span className="text-rose-500 italic">(খালি)</span>}
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[11px] ${row.correctAnswerIndex === 2 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                            C. {row.optionC || <span className="text-rose-500 italic">(খালি)</span>}
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[11px] ${row.correctAnswerIndex === 3 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                            D. {row.optionD || <span className="text-rose-500 italic">(খালি)</span>}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                            {row.correctAnswer}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 max-w-[150px] truncate text-[11px]">
                          {row.explanation || '-'}
                        </td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold rounded-full border border-emerald-500/20">
                              ✓ বৈধ
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-500/20">
                                ✕ ত্রুটিযুক্ত
                              </span>
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
                                {row.errors.join(' | ')}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">ফায়ারস্টোর ডেটাবেজে সংরক্ষণ</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ইমপোর্ট সম্পন্ন হলে প্রশ্নগুলো ফায়ারস্টোরে সেভ হবে এবং শিক্ষার্থীরা পরীক্ষায় অংশ নিতে পারবে।
                  </p>
                </div>
                <button
                  onClick={handleConfirmImportToFirestore}
                  disabled={importingToDb || parsedData.validCount === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {importingToDb ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Firebase Firestore-এ ইমপোর্ট করুন ({parsedData.validCount} টি প্রশ্ন)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DATA EXPORT HUB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'export' && (
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-md">
                  Export System
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  গুগল শিটে ডেটা এক্সপোর্ট হাব
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                প্ল্যাটফর্মের সকল রেকর্ড স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট স্প্রেডশীট কলাম ফরম্যাটে রূপান্তর করে গুগল শিটে সেভ করুন।
              </p>
            </div>

            <button
              onClick={handleExportAll}
              disabled={exportingType === 'all' || !isConnected || !spreadsheetId}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {exportingType === 'all' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              <span>১-ক্লিকে সকল ৬টি টেবিল একসাথে ব্যাকআপ করুন</span>
            </button>
          </div>

          {exportStatusMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold border flex items-center gap-2.5 ${
                exportStatusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {exportStatusMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{exportStatusMsg.message}</span>
            </div>
          )}

          {/* 6 Dedicated Table Export Action Cards with Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Students */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Users className="h-4 w-4" />
                    <span>Students (শিক্ষার্থী)</span>
                  </div>
                  {/* Status Indicator */}
                  {tableExportStatus.Students.status === 'running' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> এক্সপোর্ট হচ্ছে...
                    </span>
                  )}
                  {tableExportStatus.Students.status === 'success' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                      ✓ সফল ({tableExportStatus.Students.count} সারি)
                    </span>
                  )}
                  {tableExportStatus.Students.status === 'error' && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                      ✕ ব্যর্থ
                    </span>
                  )}
                  {tableExportStatus.Students.status === 'idle' && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                      প্রস্তুত (Idle)
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  মোট শিক্ষার্থী: {students.length} জন
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  uid, studentId, fullName, email, phone, batch, status
                </p>
              </div>
              <button
                onClick={() => handleExportIndividual('Students')}
                disabled={exportingType === 'Students' || !isConnected || !spreadsheetId}
                className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Students to Sheets</span>
              </button>
            </div>

            {/* Card 2: Exams */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                    <BookOpen className="h-4 w-4" />
                    <span>Exams (পরীক্ষাসমূহ)</span>
                  </div>
                  {tableExportStatus.Exams.status === 'running' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> এক্সপোর্ট হচ্ছে...
                    </span>
                  )}
                  {tableExportStatus.Exams.status === 'success' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                      ✓ সফল ({tableExportStatus.Exams.count} সারি)
                    </span>
                  )}
                  {tableExportStatus.Exams.status === 'idle' && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                      প্রস্তুত (Idle)
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  মোট পরীক্ষা: {exams.length} টি
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  examId, title, category, duration, marks, passMarks
                </p>
              </div>
              <button
                onClick={() => handleExportIndividual('Exams')}
                disabled={exportingType === 'Exams' || !isConnected || !spreadsheetId}
                className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Exams to Sheets</span>
              </button>
            </div>

            {/* Card 3: Question Bank */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                    <BookOpen className="h-4 w-4" />
                    <span>Question Bank (প্রশ্ন)</span>
                  </div>
                  {tableExportStatus['Question Bank'].status === 'running' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> এক্সপোর্ট হচ্ছে...
                    </span>
                  )}
                  {tableExportStatus['Question Bank'].status === 'success' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                      ✓ সফল ({tableExportStatus['Question Bank'].count} সারি)
                    </span>
                  )}
                  {tableExportStatus['Question Bank'].status === 'idle' && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                      প্রস্তুত (Idle)
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  মোট প্রশ্ন: {totalQuestionsInSystem} টি
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  questionId, examId, text, options A-D, answer, exp
                </p>
              </div>
              <button
                onClick={() => handleExportIndividual('Question Bank')}
                disabled={exportingType === 'Question Bank' || !isConnected || !spreadsheetId}
                className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Questions to Sheets</span>
              </button>
            </div>

            {/* Card 4: Results */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                    <Award className="h-4 w-4" />
                    <span>Results (ফলাফল)</span>
                  </div>
                  {tableExportStatus.Results.status === 'running' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> এক্সপোর্ট হচ্ছে...
                    </span>
                  )}
                  {tableExportStatus.Results.status === 'success' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                      ✓ সফল ({tableExportStatus.Results.count} সারি)
                    </span>
                  )}
                  {tableExportStatus.Results.status === 'idle' && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                      প্রস্তুত (Idle)
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  মোট সাবমিশন: {results.length} টি
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  resultId, studentId, examId, score, percentage, time
                </p>
              </div>
              <button
                onClick={() => handleExportIndividual('Results')}
                disabled={exportingType === 'Results' || !isConnected || !spreadsheetId}
                className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Results to Sheets</span>
              </button>
            </div>

            {/* Card 5: Payments */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                    <CreditCard className="h-4 w-4" />
                    <span>Payments (পেমেন্ট)</span>
                  </div>
                  {tableExportStatus.Payments.status === 'success' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                      ✓ সিঙ্কড
                    </span>
                  )}
                  {tableExportStatus.Payments.status === 'idle' && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                      প্রস্তুত (Idle)
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  লেনদেন হিস্ট্রি
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  paymentId, userId, txId, gateway, amount, status
                </p>
              </div>
              <button
                onClick={() => handleExportIndividual('Payments')}
                disabled={exportingType === 'Payments' || !isConnected || !spreadsheetId}
                className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Payments to Sheets</span>
              </button>
            </div>

            {/* Card 6: Downloads */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-600 font-bold text-xs">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Downloads (ফাইল রিসোর্স)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                    প্রস্তুত (Idle)
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  পিডিএফ ও স্টাডি মেটেরিয়ালস
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  fileId, title, category, driveUrl, status
                </p>
              </div>
              <button
                onClick={() => handleExportIndividual('Downloads')}
                disabled={exportingType === 'Downloads' || !isConnected || !spreadsheetId}
                className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Downloads to Sheets</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: SPREADSHEET SETTINGS & TEMPLATE GENERATOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-md">
                  Configuration
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  মাস্টার গুগল স্প্রেডশীট কনফিগারেশন
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                মাস্টার গুগল স্প্রেডশীট আইডি লিংক করুন অথবা ১-ক্লিকে সমস্ত প্রি-সেট ফরম্যাট সংবলিত ফাইল তৈরি করুন।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCreateMasterTemplate}
                disabled={creatingTemplate || !isConnected}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {creatingTemplate ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                <span>১-ক্লিকে মাস্টার স্প্রেডশীট তৈরি করুন</span>
              </button>

              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>গুগল শিট খুলুন ↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Spreadsheet ID Input & Verification */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700">
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Google Spreadsheet ID অথবা সম্পূর্ণ URL:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="যেমন: 1BxiMVs0XRZ5nCyIC7Xy66K..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                টিপস: ব্রাউজারের গুগল শিট এড্রেস বার থেকে সরাসরি সম্পূর্ণ লিংক পেস্ট করতে পারেন।
              </p>
            </div>

            <div className="md:col-span-4 flex items-end h-full pt-4 md:pt-0">
              <button
                onClick={() => handleVerifySheet(undefined, true)}
                disabled={verifyingSheet || !spreadsheetId.trim() || !isConnected}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {verifyingSheet ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                )}
                <span>যাচাই ও কানেক্ট করুন</span>
              </button>
            </div>
          </div>

          {/* Metadata Details if verified */}
          {sheetMetadata && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  সংযুক্ত স্প্রেডশীট: <strong className="font-extrabold">{sheetMetadata.title}</strong>
                </span>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  {sheetMetadata.sheets?.length || 0} টি শিট ট্যাব অন্তর্ভুক্ত
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {sheetMetadata.sheets?.map((s: any) => (
                  <span
                    key={s.sheetId || s.title}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    {s.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: OPERATION AUDIT LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" />
                রিয়েল-টাইম অপারেশন ও অডিট লগ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                গুগল শিট ও ফায়ারস্টোরের মধ্যকার সকল সাম্প্রতিক ইমপোর্ট, এক্সপোর্ট ও ব্যাকগ্রাউন্ড সিঙ্ক ইভেন্ট।
              </p>
            </div>
            <button
              onClick={() => setLogs(prev => prev.slice(0, 1))}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold"
            >
              লগ ক্লিয়ার করুন
            </button>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {logs.map((l) => (
              <div
                key={l.id}
                className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {l.status === 'success' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                    ) : l.status === 'warning' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{l.target}</span>
                      <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-[10px] rounded uppercase font-mono text-slate-600 dark:text-slate-300">
                        {l.type}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{l.message}</div>
                  </div>
                </div>

                <div className="text-right shrink-0 text-[11px] text-slate-400 font-mono">
                  {l.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
