/**
 * CSV Question parser, validator, and template generator for Upcoming Exams.
 * Supports standard RFC 4180 CSV with quotes, newlines, Bengali UTF-8 characters.
 */

export interface CsvQuestionRow {
  id: string; // unique key for editing & tracking in preview
  serial: number;
  subject: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswerRaw: string;
  correctAnswerIndex: number; // 0, 1, 2, 3 (-1 if invalid)
  correctAnswerLetter: string; // 'A', 'B', 'C', 'D' (empty if invalid)
  explanation: string;
  isValid: boolean;
  errors: string[];
  isDuplicateInCsv?: boolean;
  isDuplicateInDb?: boolean;
}

export interface CsvParseResult {
  rows: CsvQuestionRow[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
  headers: string[];
  fileErrors: string[];
}

/**
 * Expected columns (Exact names from user requirement)
 */
export const REQUIRED_CSV_COLUMNS = [
  'বিষয়/টপিক',
  'প্রশ্ন বিবরণ',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'সঠিক উত্তর',
  'ব্যাখ্যা',
];

/**
 * Standard CSV line parser that properly handles quotes, commas inside quotes, escaped quotes, and newlines.
 */
export function parseCsvText(csvText: string): string[][] {
  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        // Carriage return: check if next is \n
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push last field & row if anything left
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Map correct answer text to 0-3 index and A-D letter.
 * Accepts:
 * 'A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'
 * 'ক', 'খ', 'গ', 'ঘ'
 * Returns -1 and '' if invalid.
 */
export function mapCorrectAnswer(input: string): { index: number; letter: string } {
  if (!input) return { index: -1, letter: '' };
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // English letters
  if (lower === 'a' || trimmed === 'A') return { index: 0, letter: 'A' };
  if (lower === 'b' || trimmed === 'B') return { index: 1, letter: 'B' };
  if (lower === 'c' || trimmed === 'C') return { index: 2, letter: 'C' };
  if (lower === 'd' || trimmed === 'D') return { index: 3, letter: 'D' };

  // Bengali letters
  if (trimmed === 'ক') return { index: 0, letter: 'A' };
  if (trimmed === 'খ') return { index: 1, letter: 'B' };
  if (trimmed === 'গ') return { index: 2, letter: 'C' };
  if (trimmed === 'ঘ') return { index: 3, letter: 'D' };

  // Option 1, 2, 3, 4 fallback if user entered digits
  if (trimmed === '1' || trimmed === '১') return { index: 0, letter: 'A' };
  if (trimmed === '2' || trimmed === '২') return { index: 1, letter: 'B' };
  if (trimmed === '3' || trimmed === '৩') return { index: 2, letter: 'C' };
  if (trimmed === '4' || trimmed === '৪') return { index: 3, letter: 'D' };

  return { index: -1, letter: '' };
}

/**
 * Validates a single row given the data and existing questions context
 */
export function validateQuestionRow(
  row: Omit<CsvQuestionRow, 'isValid' | 'errors'>,
  allCsvQuestionTexts: string[],
  existingExamQuestionTexts: string[] = []
): { isValid: boolean; errors: string[]; isDuplicateInCsv: boolean; isDuplicateInDb: boolean } {
  const errors: string[] = [];
  const normalizedQuestion = row.questionText.trim().toLowerCase();

  if (!row.subject.trim()) {
    errors.push('বিষয়/টপিক খালি রাখা যাবে না');
  }

  if (!row.questionText.trim()) {
    errors.push('প্রশ্ন বিবরণ খালি রাখা যাবে না');
  }

  if (!row.optionA.trim()) {
    errors.push('Option A খালি রাখা যাবে না');
  }

  if (!row.optionB.trim()) {
    errors.push('Option B খালি রাখা যাবে না');
  }

  if (!row.optionC.trim()) {
    errors.push('Option C খালি রাখা যাবে না');
  }

  if (!row.optionD.trim()) {
    errors.push('Option D খালি রাখা যাবে না');
  }

  if (!row.correctAnswerRaw.trim()) {
    errors.push('সঠিক উত্তর উল্লেখ করা হয়নি');
  } else if (row.correctAnswerIndex < 0 || !row.correctAnswerLetter) {
    errors.push('সঠিক উত্তর শুধুমাত্র A/B/C/D অথবা ক/খ/গ/ঘ হতে হবে');
  }

  // Duplicate in CSV check
  const duplicateCountInCsv = allCsvQuestionTexts.filter(
    q => q.trim().toLowerCase() === normalizedQuestion && normalizedQuestion.length > 0
  ).length;
  const isDuplicateInCsv = duplicateCountInCsv > 1;
  if (isDuplicateInCsv) {
    errors.push('এই CSV ফাইলে একই প্রশ্ন একাধিকবার রয়েছে (Duplicate in CSV)');
  }

  // Duplicate in Existing Exam check
  const isDuplicateInDb = existingExamQuestionTexts.some(
    eq => eq.trim().toLowerCase() === normalizedQuestion && normalizedQuestion.length > 0
  );
  if (isDuplicateInDb) {
    errors.push('এই প্রশ্নটি উক্ত পরীক্ষায় ইতিমধ্যে সংরক্ষিত আছে (Duplicate in Exam)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    isDuplicateInCsv,
    isDuplicateInDb,
  };
}

/**
 * Parse uploaded CSV file contents, check headers, and validate rows.
 */
export function processCsvData(
  csvText: string,
  existingExamQuestions: { text: string }[] = []
): CsvParseResult {
  const fileErrors: string[] = [];
  const rawRows = parseCsvText(csvText);

  if (!rawRows || rawRows.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      fileErrors: ['CSV ফাইলটি খালি। অনুগ্রহ করে সঠিক CSV ফাইল আপলোড করুন।'],
    };
  }

  // Filter out completely blank lines at the top
  const firstNonEmptyIndex = rawRows.findIndex(r => r.some(cell => cell.trim().length > 0));
  if (firstNonEmptyIndex === -1) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      fileErrors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি।'],
    };
  }

  const rawHeaders = rawRows[firstNonEmptyIndex].map(h => h.trim());
  const dataRows = rawRows.slice(firstNonEmptyIndex + 1);

  // Validate headers
  // Clean headers (remove zero-width characters or subtle BOM)
  const cleanedHeaders = rawHeaders.map(h => h.replace(/[\u200B-\u200D\uFEFF]/g, '').trim());

  // Check required column matches (flexible normalization for minor whitespace)
  const findColIndex = (colName: string): number => {
    return cleanedHeaders.findIndex(
      h => h.toLowerCase() === colName.toLowerCase() ||
           h.replace(/\s+/g, '') === colName.replace(/\s+/g, '')
    );
  };

  const subjectCol = findColIndex('বিষয়/টপিক');
  const questionCol = findColIndex('প্রশ্ন বিবরণ');
  const optACol = findColIndex('Option A');
  const optBCol = findColIndex('Option B');
  const optCCol = findColIndex('Option C');
  const optDCol = findColIndex('Option D');
  const ansCol = findColIndex('সঠিক উত্তর');
  const expCol = findColIndex('ব্যাখ্যা');

  const missingColumns: string[] = [];
  if (subjectCol === -1) missingColumns.push('বিষয়/টপিক');
  if (questionCol === -1) missingColumns.push('প্রশ্ন বিবরণ');
  if (optACol === -1) missingColumns.push('Option A');
  if (optBCol === -1) missingColumns.push('Option B');
  if (optCCol === -1) missingColumns.push('Option C');
  if (optDCol === -1) missingColumns.push('Option D');
  if (ansCol === -1) missingColumns.push('সঠিক উত্তর');
  if (expCol === -1) missingColumns.push('ব্যাখ্যা');

  if (missingColumns.length > 0) {
    fileErrors.push(
      `CSV ফাইলে আবশ্যকীয় কলাম অনুপস্থিত বা কলামের নাম ভুল: "${missingColumns.join(', ')}"। দয়া করে প্রদত্ত টেমপ্লেট ডাউনলোড করে ফরম্যাট চেক করুন।`
    );
  }

  // Pre-collect all question texts to detect duplicates
  const allQuestionTexts: string[] = [];
  const existingDbQuestionTexts = existingExamQuestions.map(q => q.text || '');

  // Step 1: Pre-process non-empty rows
  const parsedRows: Array<Omit<CsvQuestionRow, 'isValid' | 'errors' | 'isDuplicateInCsv' | 'isDuplicateInDb'>> = [];
  let rowSerialCounter = 1;

  for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
    const row = dataRows[rIdx];
    // Skip totally empty rows
    const isRowEmpty = row.every(cell => cell.trim().length === 0);
    if (isRowEmpty) continue;

    const subject = subjectCol !== -1 && row[subjectCol] !== undefined ? row[subjectCol].trim() : '';
    const questionText = questionCol !== -1 && row[questionCol] !== undefined ? row[questionCol].trim() : '';
    const optionA = optACol !== -1 && row[optACol] !== undefined ? row[optACol].trim() : '';
    const optionB = optBCol !== -1 && row[optBCol] !== undefined ? row[optBCol].trim() : '';
    const optionC = optCCol !== -1 && row[optCCol] !== undefined ? row[optCCol].trim() : '';
    const optionD = optDCol !== -1 && row[optDCol] !== undefined ? row[optDCol].trim() : '';
    const correctAnswerRaw = ansCol !== -1 && row[ansCol] !== undefined ? row[ansCol].trim() : '';
    const explanation = expCol !== -1 && row[expCol] !== undefined ? row[expCol].trim() : '';

    const { index: ansIdx, letter: ansLetter } = mapCorrectAnswer(correctAnswerRaw);

    allQuestionTexts.push(questionText);

    parsedRows.push({
      id: `csv-row-${rowSerialCounter}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      serial: rowSerialCounter,
      subject,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswerRaw,
      correctAnswerIndex: ansIdx,
      correctAnswerLetter: ansLetter,
      explanation,
    });

    rowSerialCounter++;
  }

  if (parsedRows.length === 0 && fileErrors.length === 0) {
    fileErrors.push('CSV ফাইলে কোনো প্রশ্নের সারি (Rows) পাওয়া যায়নি।');
  }

  // Step 2: Full validation on each row
  const validatedRows: CsvQuestionRow[] = parsedRows.map(row => {
    const validation = validateQuestionRow(row, allQuestionTexts, existingDbQuestionTexts);
    return {
      ...row,
      isValid: validation.isValid,
      errors: validation.errors,
      isDuplicateInCsv: validation.isDuplicateInCsv,
      isDuplicateInDb: validation.isDuplicateInDb,
    };
  });

  const validCount = validatedRows.filter(r => r.isValid).length;
  const invalidCount = validatedRows.length - validCount;

  return {
    rows: validatedRows,
    totalCount: validatedRows.length,
    validCount,
    invalidCount,
    headers: cleanedHeaders,
    fileErrors,
  };
}

/**
 * Re-validates a list of CsvQuestionRow after an inline edit or deletion
 */
export function revalidateAllRows(
  rows: CsvQuestionRow[],
  existingExamQuestions: { text: string }[] = []
): { rows: CsvQuestionRow[]; validCount: number; invalidCount: number } {
  const allQuestionTexts = rows.map(r => r.questionText);
  const existingDbQuestionTexts = existingExamQuestions.map(q => q.text || '');

  const updatedRows: CsvQuestionRow[] = rows.map((row, idx) => {
    const { index: ansIdx, letter: ansLetter } = mapCorrectAnswer(row.correctAnswerRaw);
    const updatedRowBase = {
      ...row,
      serial: idx + 1,
      correctAnswerIndex: ansIdx,
      correctAnswerLetter: ansLetter,
    };
    const validation = validateQuestionRow(updatedRowBase, allQuestionTexts, existingDbQuestionTexts);
    return {
      ...updatedRowBase,
      isValid: validation.isValid,
      errors: validation.errors,
      isDuplicateInCsv: validation.isDuplicateInCsv,
      isDuplicateInDb: validation.isDuplicateInDb,
    };
  });

  const validCount = updatedRows.filter(r => r.isValid).length;
  const invalidCount = updatedRows.length - validCount;

  return { rows: updatedRows, validCount, invalidCount };
}

/**
 * Generate and trigger download of the CSV template with UTF-8 BOM.
 */
export function downloadCsvQuestionTemplate(): void {
  const headers = REQUIRED_CSV_COLUMNS.join(',');
  const sampleRows = [
    'বাংলা,"বাংলাদেশের জাতীয় কবি কে?",কাজী নজরুল ইসলাম,রবীন্দ্রনাথ ঠাকুর,জসীমউদ্দীন,মাইকেল মধুসূদন দত্ত,A,বাংলাদেশের জাতীয় কবি কাজী নজরুল ইসলাম।',
    'ইংরেজি,"What is the antonym of \'Optimistic\'?",Hopeful,Pessimistic,Confident,Positive,B,"The antonym of optimistic is pessimistic."',
    'গণিত,"ত্রিভুজের তিন কোণের সমষ্টি কত ডিগ্রী?",১৮০°,৩৬০°,৯০°,২৭০°,ক,ত্রিভুজের যেকোনো তিনটি কোণের সমষ্টি সর্বদা ১৮০ ডিগ্রী বা দুই সমকোণ হয়।',
  ];

  const csvContent = '\uFEFF' + headers + '\n' + sampleRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'medha_exam_upcoming_questions_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
