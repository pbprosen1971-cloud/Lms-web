/**
 * CSV Question parser, validator, and template generator for Upcoming Exams.
 * Supports standard RFC 4180 CSV with quotes, newlines, Bengali UTF-8 characters.
 * Enhanced with:
 * - Multi-encoding & BOM sanitization (FEFF, EF BB BF, zero-width chars, non-breaking spaces).
 * - Unicode NFC normalization and Bengali decomposed character handling (য + ় vs য়).
 * - Smart column alias matching (বিষয়/টপিক, বিষয়, বিষয়, Subject, Topic, etc.).
 * - Auto-detection of column positions by content if headers have unusual names.
 * - Excel merged cell inheritance (carrying forward subject across empty merged rows).
 * - Automatic delimiter sniffing (comma, semicolon, tab).
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
  detectedSubjectColumn?: string;
  usedDelimiter?: string;
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
 * Normalizes text by removing BOMs, zero-width characters, non-breaking spaces,
 * and canonicalizing Unicode (NFC) with Bengali nukta normalization.
 */
export function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0\uFFFD\u00EF\u00BB\u00BF]/g, '')
    .normalize('NFC')
    // Canonicalize Bengali decomposed nukta: য (U+09AF) + ় (U+09BC) -> য় (U+09DF)
    .replace(/\u09AF\u09BC/g, '\u09DF')
    .trim();
}

/**
 * Detect delimiter by analyzing the first line (comma, semicolon, tab).
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
}

/**
 * Standard CSV line parser that properly handles quotes, commas inside quotes,
 * escaped quotes, delimiters, and newlines.
 */
export function parseCsvText(csvText: string, customDelimiter?: string): { rows: string[][]; delimiter: string } {
  // Strip UTF-8 BOM if present
  let cleanText = csvText
    .replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const delimiter = customDelimiter || detectDelimiter(cleanText);

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
      } else if (char === delimiter) {
        currentRow.push(sanitizeText(currentField));
        currentField = '';
      } else if (char === '\r') {
        // Carriage return: check if next is \n
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(sanitizeText(currentField));
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(sanitizeText(currentField));
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
    currentRow.push(sanitizeText(currentField));
    rows.push(currentRow);
  }

  return { rows, delimiter };
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
  const trimmed = sanitizeText(input);
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
  const normalizedQuestion = sanitizeText(row.questionText).toLowerCase();

  if (!sanitizeText(row.subject)) {
    errors.push('বিষয়/টপিক খালি রাখা যাবে না');
  }

  if (!sanitizeText(row.questionText)) {
    errors.push('প্রশ্ন বিবরণ খালি রাখা যাবে না');
  }

  if (!sanitizeText(row.optionA)) {
    errors.push('Option A খালি রাখা যাবে না');
  }

  if (!sanitizeText(row.optionB)) {
    errors.push('Option B খালি রাখা যাবে না');
  }

  if (!sanitizeText(row.optionC)) {
    errors.push('Option C খালি রাখা যাবে না');
  }

  if (!sanitizeText(row.optionD)) {
    errors.push('Option D খালি রাখা যাবে না');
  }

  if (!sanitizeText(row.correctAnswerRaw)) {
    errors.push('সঠিক উত্তর উল্লেখ করা হয়নি');
  } else if (row.correctAnswerIndex < 0 || !row.correctAnswerLetter) {
    errors.push('সঠিক উত্তর শুধুমাত্র A/B/C/D অথবা ক/খ/গ/ঘ হতে হবে');
  }

  // Duplicate in CSV check
  const duplicateCountInCsv = allCsvQuestionTexts.filter(
    q => sanitizeText(q).toLowerCase() === normalizedQuestion && normalizedQuestion.length > 0
  ).length;
  const isDuplicateInCsv = duplicateCountInCsv > 1;
  if (isDuplicateInCsv) {
    errors.push('এই CSV ফাইলে একই প্রশ্ন একাধিকবার রয়েছে (Duplicate in CSV)');
  }

  // Duplicate in Existing Exam check
  const isDuplicateInDb = existingExamQuestionTexts.some(
    eq => sanitizeText(eq).toLowerCase() === normalizedQuestion && normalizedQuestion.length > 0
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
 * Common known subjects in Bengali job exams to assist position/content-based auto-detection
 */
const KNOWN_SUBJECT_KEYWORDS = [
  'বাংলা', 'ইংরেজি', 'গণিত', 'বাংলাদেশ', 'আন্তর্জাতিক', 'বিজ্ঞান', 'আইসিটি',
  'ict', 'কম্পিউটার', 'ভূগোল', 'নৈতিকতা', 'সাধারণ জ্ঞান', 'gk', 'math', 'english',
  'bangla', 'bcs', 'bank', 'primary', 'পৌরনীতি', 'অর্থনীতি', 'ইতিহাস'
];

/**
 * Checks if a string looks like a subject name
 */
function looksLikeSubject(val: string): boolean {
  if (!val) return false;
  const clean = sanitizeText(val).toLowerCase();
  return KNOWN_SUBJECT_KEYWORDS.some(k => clean.includes(k));
}

/**
 * Parse uploaded CSV file contents, check headers, and validate rows.
 * Includes auto-detection for column headers, aliases, and merged cell carryover.
 */
export function processCsvData(
  csvText: string,
  existingExamQuestions: { text: string }[] = [],
  fallbackSubject?: string
): CsvParseResult {
  const fileErrors: string[] = [];
  const { rows: rawRows, delimiter } = parseCsvText(csvText);

  if (!rawRows || rawRows.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      fileErrors: ['CSV ফাইলটি খালি। অনুগ্রহ করে সঠিক CSV ফাইল আপলোড করুন।'],
      usedDelimiter: delimiter,
    };
  }

  // Filter out completely blank lines at the top
  const firstNonEmptyIndex = rawRows.findIndex(r => r.some(cell => sanitizeText(cell).length > 0));
  if (firstNonEmptyIndex === -1) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      fileErrors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি।'],
      usedDelimiter: delimiter,
    };
  }

  const rawHeaders = rawRows[firstNonEmptyIndex].map(h => sanitizeText(h));
  const dataRows = rawRows.slice(firstNonEmptyIndex + 1);

  // Clean headers (remove zero-width characters, spaces, punctuation)
  const cleanedHeaders = rawHeaders.map(h => sanitizeText(h));
  const strippedHeaders = cleanedHeaders.map(h =>
    h.toLowerCase().replace(/[\s\/\-_()|,\.:]/g, '')
  );

  /**
   * Smart column index finder with broad aliases and regex matching
   */
  const findColIndexByAliases = (
    aliases: string[],
    regex?: RegExp,
    excludeRegex?: RegExp
  ): number => {
    // 1. Direct exact or stripped match
    for (const alias of aliases) {
      const aliasClean = sanitizeText(alias).toLowerCase();
      const aliasStripped = aliasClean.replace(/[\s\/\-_()|,\.:]/g, '');

      const idx = cleanedHeaders.findIndex((h, i) => {
        const hClean = h.toLowerCase();
        const hStripped = strippedHeaders[i];
        return hClean === aliasClean || hStripped === aliasStripped;
      });
      if (idx !== -1) return idx;
    }

    // 2. Regex fallback
    if (regex) {
      const idx = cleanedHeaders.findIndex((h) => {
        if (excludeRegex && excludeRegex.test(h)) return false;
        return regex.test(h) || regex.test(sanitizeText(h));
      });
      if (idx !== -1) return idx;
    }

    return -1;
  };

  // SUBJECT column matching
  let subjectCol = findColIndexByAliases(
    [
      'বিষয়/টপিক',
      'বিষয়/টপিক',
      'বিষয় / টপিক',
      'বিষয় / টপিক',
      'বিষয়টপিক',
      'বিষয়টপিক',
      'বিষয়',
      'বিষয়',
      'টপিক',
      'টপিক্স',
      'বিষয়বস্তু',
      'বিষয়বস্তু',
      'বিভাগ',
      'সাবজেক্ট',
      'subject/topic',
      'subject / topic',
      'subjecttopic',
      'subject',
      'topic',
      'sub',
    ],
    /(?:বিষয়|বিষয়|টপিক|subject|topic)/i,
    /(?:প্রশ্ন|question|বিবরণ)/i // Don't mistakenly match question column
  );

  // QUESTION column matching
  const questionCol = findColIndexByAliases(
    [
      'প্রশ্ন বিবরণ',
      'প্রশ্নবিবরণ',
      'প্রশ্ন',
      'প্রশ্নসমূহ',
      'question',
      'question text',
      'questiontext',
      'questions',
      'qs',
      'q',
    ],
    /(?:প্রশ্ন|question)/i
  );

  // OPTION A
  const optACol = findColIndexByAliases(
    ['option a', 'optiona', 'opt a', 'opta', 'option-a', 'ক', 'অপশন ক', 'অপশন এ', 'choice a'],
    /(?:option\s*a|opt\s*a|^ক$|^a$)/i
  );

  // OPTION B
  const optBCol = findColIndexByAliases(
    ['option b', 'optionb', 'opt b', 'optb', 'option-b', 'খ', 'অপশন খ', 'অপশন বি', 'choice b'],
    /(?:option\s*b|opt\s*b|^খ$|^b$)/i
  );

  // OPTION C
  const optCCol = findColIndexByAliases(
    ['option c', 'optionc', 'opt c', 'optc', 'option-c', 'গ', 'অপশন গ', 'অপশন সি', 'choice c'],
    /(?:option\s*c|opt\s*c|^গ$|^c$)/i
  );

  // OPTION D
  const optDCol = findColIndexByAliases(
    ['option d', 'optiond', 'opt d', 'optd', 'option-d', 'ঘ', 'অপশন ঘ', 'অপশন ডি', 'choice d'],
    /(?:option\s*d|opt\s*d|^ঘ$|^d$)/i
  );

  // CORRECT ANSWER
  const ansCol = findColIndexByAliases(
    [
      'সঠিক উত্তর',
      'সঠিকউত্তর',
      'উত্তর',
      'সঠিক',
      'correct answer',
      'correctanswer',
      'answer',
      'ans',
      'correct',
      'correct option',
      'right answer',
    ],
    /(?:সঠিক|উত্তর|answer|ans)/i
  );

  // EXPLANATION
  const expCol = findColIndexByAliases(
    [
      'ব্যাখ্যা',
      'উত্তর ব্যাখ্যা',
      'সমাধান',
      'ব্যাখ্যা/সমাধান',
      'explanation',
      'explain',
      'solution',
      'notes',
      'note',
    ],
    /(?:ব্যাখ্যা|সমাধান|explanation|solution)/i
  );

  // FALLBACK: If Subject Column is still not found by header name:
  // Check if Column 0 is the Subject column (common in standard 8-column templates where Question is Col 1)
  if (subjectCol === -1) {
    if (questionCol === 1 && cleanedHeaders.length >= 7) {
      subjectCol = 0;
    } else {
      // Check first few data rows to see if any column looks like known subjects
      for (let c = 0; c < cleanedHeaders.length; c++) {
        if (c === questionCol || c === optACol || c === optBCol || c === optCCol || c === optDCol || c === ansCol || c === expCol) {
          continue;
        }
        const sampleMatches = dataRows.slice(0, 5).filter(r => looksLikeSubject(r[c]));
        if (sampleMatches.length >= 1) {
          subjectCol = c;
          break;
        }
      }
    }
    // If still -1 and questionCol is found and not at 0, default to column 0
    if (subjectCol === -1 && questionCol > 0) {
      subjectCol = 0;
    }
  }

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
  const existingDbQuestionTexts = existingExamQuestions.map(q => sanitizeText(q.text || ''));

  // Step 1: Pre-process non-empty rows & handle Excel merged cells carryover
  const parsedRows: Array<Omit<CsvQuestionRow, 'isValid' | 'errors' | 'isDuplicateInCsv' | 'isDuplicateInDb'>> = [];
  let rowSerialCounter = 1;
  let lastSeenSubject = fallbackSubject || '';

  for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
    const row = dataRows[rIdx];
    // Skip totally empty rows
    const isRowEmpty = row.every(cell => sanitizeText(cell).length === 0);
    if (isRowEmpty) continue;

    let rawSubject = subjectCol !== -1 && row[subjectCol] !== undefined ? sanitizeText(row[subjectCol]) : '';

    // Merge-forward / fill-down logic:
    // If a user merged cells in Excel, subsequent rows in CSV have an empty cell for subject.
    // Carry forward the previous row's subject so merged cells work seamlessly!
    if (!rawSubject && lastSeenSubject) {
      rawSubject = lastSeenSubject;
    } else if (rawSubject) {
      lastSeenSubject = rawSubject;
    } else if (fallbackSubject) {
      rawSubject = fallbackSubject;
    }

    const questionText = questionCol !== -1 && row[questionCol] !== undefined ? sanitizeText(row[questionCol]) : '';
    const optionA = optACol !== -1 && row[optACol] !== undefined ? sanitizeText(row[optACol]) : '';
    const optionB = optBCol !== -1 && row[optBCol] !== undefined ? sanitizeText(row[optBCol]) : '';
    const optionC = optCCol !== -1 && row[optCCol] !== undefined ? sanitizeText(row[optCCol]) : '';
    const optionD = optDCol !== -1 && row[optDCol] !== undefined ? sanitizeText(row[optDCol]) : '';
    const correctAnswerRaw = ansCol !== -1 && row[ansCol] !== undefined ? sanitizeText(row[ansCol]) : '';
    const explanation = expCol !== -1 && row[expCol] !== undefined ? sanitizeText(row[expCol]) : '';

    const { index: ansIdx, letter: ansLetter } = mapCorrectAnswer(correctAnswerRaw);

    allQuestionTexts.push(questionText);

    parsedRows.push({
      id: `csv-row-${rowSerialCounter}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      serial: rowSerialCounter,
      subject: rawSubject,
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
    detectedSubjectColumn: subjectCol !== -1 ? cleanedHeaders[subjectCol] : undefined,
    usedDelimiter: delimiter,
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
 * Bulk set subject for all rows or for rows with empty subjects
 */
export function bulkSetSubject(
  rows: CsvQuestionRow[],
  newSubject: string,
  onlyEmpty = false,
  existingExamQuestions: { text: string }[] = []
): { rows: CsvQuestionRow[]; validCount: number; invalidCount: number } {
  const updated = rows.map(r => {
    if (!onlyEmpty || !r.subject.trim()) {
      return { ...r, subject: newSubject.trim() };
    }
    return r;
  });
  return revalidateAllRows(updated, existingExamQuestions);
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
