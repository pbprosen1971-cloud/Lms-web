import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  Check,
  Save,
  Loader2,
  FileCheck,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Exam, Question, ExamQuestionDoc } from '../types';
import {
  CsvQuestionRow,
  CsvParseResult,
  processCsvData,
  revalidateAllRows,
  downloadCsvQuestionTemplate,
} from '../services/csvQuestionService';
import { saveQuestionsBatchToExamContent } from '../services/firestoreService';

interface CsvQuestionImportProps {
  selectedExam: Exam;
  onQuestionsImported: (newQuestions: Question[]) => void;
  onClose?: () => void;
}

export const CsvQuestionImport: React.FC<CsvQuestionImportProps> = ({
  selectedExam,
  onQuestionsImported,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CsvQuestionRow>>({});
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const [importErrorMsg, setImportErrorMsg] = useState<string>('');

  // Handle file selection and parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccessMsg('');
    setImportErrorMsg('');
    setEditingRowId(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = processCsvData(text, selectedExam.questions || []);
        setParseResult(result);
        if (result.fileErrors.length > 0) {
          setImportErrorMsg(result.fileErrors[0]);
        }
      } catch (err: any) {
        console.error('CSV Parsing Error:', err);
        setImportErrorMsg('CSV ফাইলটি রিড করতে সমস্যা হয়েছে। দয়া করে UTF-8 ফরম্যাটে সংরক্ষিত CSV ফাইল ব্যবহার করুন।');
      }
    };
    reader.onerror = () => {
      setImportErrorMsg('ফাইলটি লোড করা সম্ভব হয়নি।');
    };
    reader.readAsText(file, 'utf-8');

    // Reset file input so user can re-upload same file if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete a row from preview
  const handleDeleteRow = (rowId: string) => {
    if (!parseResult) return;
    const remaining = parseResult.rows.filter((r) => r.id !== rowId);
    const reval = revalidateAllRows(remaining, selectedExam.questions || []);
    setParseResult({
      ...parseResult,
      rows: reval.rows,
      totalCount: reval.rows.length,
      validCount: reval.validCount,
      invalidCount: reval.invalidCount,
    });
    if (editingRowId === rowId) {
      setEditingRowId(null);
    }
  };

  // Start editing a row
  const handleStartEdit = (row: CsvQuestionRow) => {
    setEditingRowId(row.id);
    setEditForm({ ...row });
  };

  // Save inline edit and revalidate
  const handleSaveEdit = () => {
    if (!parseResult || !editingRowId) return;

    const updatedRows = parseResult.rows.map((r) => {
      if (r.id === editingRowId) {
        return {
          ...r,
          subject: (editForm.subject || '').trim(),
          questionText: (editForm.questionText || '').trim(),
          optionA: (editForm.optionA || '').trim(),
          optionB: (editForm.optionB || '').trim(),
          optionC: (editForm.optionC || '').trim(),
          optionD: (editForm.optionD || '').trim(),
          correctAnswerRaw: (editForm.correctAnswerRaw || '').trim(),
          explanation: (editForm.explanation || '').trim(),
        };
      }
      return r;
    });

    const reval = revalidateAllRows(updatedRows, selectedExam.questions || []);
    setParseResult({
      ...parseResult,
      rows: reval.rows,
      totalCount: reval.rows.length,
      validCount: reval.validCount,
      invalidCount: reval.invalidCount,
    });
    setEditingRowId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditForm({});
  };

  // Execute bulk import into existing Firestore structure
  const handleImportAll = async () => {
    if (!parseResult || parseResult.rows.length === 0) return;
    if (parseResult.invalidCount > 0) {
      alert('সবগুলো প্রশ্নের ত্রুটি সংশোধন না করা পর্যন্ত Import করা যাবে না।');
      return;
    }

    setImporting(true);
    setImportErrorMsg('');
    setImportSuccessMsg('');

    const currentQuestions = selectedExam.questions || [];
    let nextQuestionNumber = currentQuestions.length + 1;

    const newlyCreatedQuestions: Question[] = [];
    const totalToImport = parseResult.rows.length;
    setImportProgress({ current: 0, total: totalToImport });

    const itemsToSave: Array<{ q: Partial<ExamQuestionDoc>; questionNum: number }> = [];

    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i];
      const qNumber = nextQuestionNumber++;
      const questionId = `q-${selectedExam.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const resolvedSubject = (row.subject || selectedExam.subject || 'বাংলা').trim();

      const questionDoc: ExamQuestionDoc = {
        questionId,
        question: row.questionText,
        questionText: row.questionText,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctAnswer: row.correctAnswerLetter,
        explanation: row.explanation,
        marks: 1,
        subject: resolvedSubject,
      };

      const legacyQuestion: Question = {
        id: questionId,
        text: row.questionText,
        options: [row.optionA, row.optionB, row.optionC, row.optionD],
        correctAnswer: row.correctAnswerIndex,
        subject: resolvedSubject,
        explanation: row.explanation || undefined,
        questionNumber: qNumber,
      };

      itemsToSave.push({ q: questionDoc, questionNum: qNumber });
      newlyCreatedQuestions.push(legacyQuestion);
    }

    try {
      // Use batched saver with rate limiting and single parent sync to prevent write stream exhaustion
      await saveQuestionsBatchToExamContent(
        selectedExam.id,
        itemsToSave,
        (current, total) => {
          setImportProgress({ current, total });
        }
      );

      // Notify parent to refresh list immediately
      onQuestionsImported(newlyCreatedQuestions);

      setImportSuccessMsg(`✅ ${newlyCreatedQuestions.length}টি প্রশ্ন সফলভাবে Import হয়েছে এবং ফায়ারস্টোরে সংরক্ষিত হয়েছে!`);
      setParseResult(null); // Clear preview on success
      setTimeout(() => {
        if (onClose) onClose();
      }, 3500);
    } catch (err: any) {
      console.error('Firestore Import Failed:', err);
      setImportErrorMsg(`❌ Import failed: ফায়ারস্টোরে প্রশ্ন সংরক্ষণ করতে সমস্যা হয়েছে (${err?.message || 'Unknown error'})`);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="bg-slate-50/90 dark:bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-4 transition-all">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>CSV দিয়ে প্রশ্ন Import (Bulk Question Import)</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              নির্দিষ্ট ফরম্যাটের CSV ফাইল আপলোড করে একসাথে একাধিক প্রশ্ন পরীক্ষাটিতে যুক্ত করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Template Download Button */}
          <button
            type="button"
            onClick={downloadCsvQuestionTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            title="নমুনা CSV ফাইল ডাউনলোড করুন"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>📥 CSV Template Download</span>
          </button>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>CSV Upload</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="বন্ধ করুন"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* CSV Column Format Helper Info */}
      {!parseResult && (
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <HelpCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>CSV কলামের ক্রম ও ফরম্যাট নির্দেশিকা:</span>
          </div>
          <div className="overflow-x-auto text-[11px] font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            বিষয়/টপিক, প্রশ্ন বিবরণ, Option A, Option B, Option C, Option D, সঠিক উত্তর, ব্যাখ্যা
          </div>
          <p className="text-[11px] leading-relaxed">
            • সঠিক উত্তরের ঘরে <strong>A / B / C / D</strong> অথবা বাংলা <strong>ক / খ / গ / ঘ</strong> লিখুন।<br />
            • CSV ফাইলে প্রশ্ন আপলোড করার পর নিচে সম্পূর্ণ প্রিভিউ ও প্রতিটি প্রশ্ন এডিট করার সুযোগ পাবেন।
          </p>
        </div>
      )}

      {/* Global Error Banner */}
      {importErrorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{importErrorMsg}</div>
        </div>
      )}

      {/* Global Success Banner */}
      {importSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold animate-fade-in">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* PREVIEW SECTION */}
      {parseResult && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Status summary banner */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                মোট শনাক্তকৃত প্রশ্ন: <strong className="text-slate-900 dark:text-white">{parseResult.totalCount} টি</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                <Check className="h-3.5 w-3.5" />
                সঠিক (Valid): {parseResult.validCount} টি
              </span>
              {parseResult.invalidCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  ত্রুটিযুক্ত (Invalid): {parseResult.invalidCount} টি
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                  <FileCheck className="h-3.5 w-3.5" />
                  সবগুলো প্রস্তুত
                </span>
              )}
            </div>

            {/* Import Action Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportAll}
                disabled={parseResult.invalidCount > 0 || parseResult.totalCount === 0 || importing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title={
                  parseResult.invalidCount > 0
                    ? 'সবগুলো প্রশ্নের ত্রুটি সংশোধন না করা পর্যন্ত Import বাটন নিষ্ক্রিয় থাকবে'
                    : 'সবগুলো প্রশ্ন ফায়ারস্টোরে সেভ করুন'
                }
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Import হচ্ছে... {importProgress ? `(${importProgress.current}/${importProgress.total})` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>সবগুলো Import করুন ({parseResult.validCount} টি)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setParseResult(null)}
                disabled={importing}
                className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </div>

          {/* Validation guidance warning if errors exist */}
          {parseResult.invalidCount > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>মনোযোগ দিন:</strong> {parseResult.invalidCount}টি প্রশ্নে ভুল বা অসম্পূর্ণ তথ্য রয়েছে (লাল দাগ চিহ্নিত)। 
                ডানপাশের <strong>✏️ Edit</strong> বাটনে ক্লিক করে তথ্য ঠিক করুন অথবা অপ্রয়োজনীয় হলে <strong>🗑️ Delete</strong> করুন। 
                সবগুলো সারি Valid হলেই “সবগুলো Import করুন” বাটনটি সক্রিয় হবে।
              </div>
            </div>
          )}

          {/* PREVIEW TABLE */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 sticky top-0 z-10 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5 pl-3 w-12 text-center">ক্রম</th>
                    <th className="p-2.5 w-24">বিষয়</th>
                    <th className="p-2.5 min-w-[200px]">প্রশ্ন বিবরণ</th>
                    <th className="p-2.5 min-w-[110px]">Option A</th>
                    <th className="p-2.5 min-w-[110px]">Option B</th>
                    <th className="p-2.5 min-w-[110px]">Option C</th>
                    <th className="p-2.5 min-w-[110px]">Option D</th>
                    <th className="p-2.5 w-20 text-center">সঠিক উত্তর</th>
                    <th className="p-2.5 min-w-[140px]">ব্যাখ্যা</th>
                    <th className="p-2.5 w-28 text-center">স্ট্যাটাস</th>
                    <th className="p-2.5 pr-3 w-20 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {parseResult.rows.map((row) => {
                    const isEditing = editingRowId === row.id;

                    if (isEditing) {
                      return (
                        <tr key={row.id} className="bg-emerald-50/50 dark:bg-emerald-950/20">
                          <td className="p-2.5 text-center font-bold text-slate-500">{row.serial}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editForm.subject ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="বিষয়"
                            />
                          </td>
                          <td className="p-2">
                            <textarea
                              rows={2}
                              value={editForm.questionText ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="প্রশ্ন"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editForm.optionA ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, optionA: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="অপশন A"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editForm.optionB ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, optionB: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="অপশন B"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editForm.optionC ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, optionC: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="অপশন C"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editForm.optionD ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, optionD: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="অপশন D"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={editForm.correctAnswerRaw ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, correctAnswerRaw: e.target.value })}
                              className="w-14 px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs text-center font-bold"
                              placeholder="A/ক"
                            />
                          </td>
                          <td className="p-2">
                            <textarea
                              rows={2}
                              value={editForm.explanation ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-emerald-400 rounded-lg text-xs"
                              placeholder="ব্যাখ্যা"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-[10px] text-emerald-600 font-bold">এডিটিং চলছে</span>
                          </td>
                          <td className="p-2 pr-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-xs"
                                title="সংরক্ষণ করুন"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300"
                                title="বাতিল"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          row.isValid
                            ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <td className="p-2.5 pl-3 text-center font-bold text-slate-500">{row.serial}</td>
                        <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{row.subject || '—'}</td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                          <p className="line-clamp-2 leading-relaxed">{row.questionText}</p>
                          {row.errors.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {row.errors.map((err, eIdx) => (
                                <p key={eIdx} className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                  • {err}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{row.optionA}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{row.optionB}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{row.optionC}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{row.optionD}</td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                              row.correctAnswerIndex >= 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {row.correctAnswerLetter ? `${row.correctAnswerLetter} (${row.correctAnswerRaw})` : row.correctAnswerRaw || '—'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                          {row.explanation || '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <Check className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                              <X className="h-3 w-3" /> Error
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 pr-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="সারিটি এডিট করুন"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="সারিটি মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvQuestionImport;
