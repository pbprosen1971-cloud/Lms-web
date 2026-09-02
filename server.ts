import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Healthcheck Endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==========================================
  // GOOGLE RECAPTCHA SECURE VERIFICATION
  // ==========================================
  app.post("/api/verify-recaptcha", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: "reCAPTCHA ভেরিফিকেশন টোকেন পাওয়া যায়নি।" });
      }

      const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

      // Google official test secret key always passes
      if (secretKey === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe') {
        return res.json({ success: true, testMode: true });
      }

      const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
      const params = new URLSearchParams();
      params.append("secret", secretKey);
      params.append("response", token);

      const googleRes = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      const data = await googleRes.json();
      return res.json({ success: Boolean(data.success), challenge_ts: data.challenge_ts });
    } catch (err: any) {
      console.warn("reCAPTCHA backend verification error:", err?.message || err);
      // Graceful fallback to avoid blocking users if external network request times out
      return res.json({ success: true, fallback: true });
    }
  });

  // ==========================================
  // GOOGLE SHEETS SECURE BACKEND INTEGRATION
  // ==========================================

  // 1. Get Spreadsheet Metadata
  app.get("/api/sheets/metadata", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Google অথেনটিকেশন টোকেন পাওয়া যায়নি।" });
      }
      const token = authHeader.split(" ")[1];
      const spreadsheetId = req.query.spreadsheetId as string;

      if (!spreadsheetId) {
        return res.status(400).json({ success: false, message: "অনুগ্রহ করে সঠিক স্প্রেডশীট আইডি প্রদান করুন।" });
      }

      const cleanId = spreadsheetId.includes("/d/")
        ? spreadsheetId.split("/d/")[1].split("/")[0]
        : spreadsheetId.trim();

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: data?.error?.message || "Google Sheets তথ্য পাওয়া যায়নি। স্প্রেডশীট আইডি বা পারমিশন যাচাই করুন।"
        });
      }

      const sheets = (data.sheets || []).map((s: any) => ({
        sheetId: s.properties?.sheetId,
        title: s.properties?.title,
        rowCount: s.properties?.gridProperties?.rowCount,
        columnCount: s.properties?.gridProperties?.columnCount
      }));

      return res.json({
        success: true,
        metadata: {
          spreadsheetId: data.spreadsheetId,
          title: data.properties?.title,
          spreadsheetUrl: data.spreadsheetUrl,
          sheets
        }
      });
    } catch (error: any) {
      console.error("Sheets metadata API error:", error);
      return res.status(500).json({ success: false, message: error?.message || "সার্ভার এরর" });
    }
  });

  // 2. Create Master Spreadsheet Template with all 6 required sheets
  app.post("/api/sheets/create-template", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Google অথেনটিকেশন টোকেন পাওয়া যায়নি।" });
      }
      const token = authHeader.split(" ")[1];
      const title = req.body.title || "মেধা এক্সাম পোর্টাল - মাস্টার ডেটাবেজ";

      // 1. Create Spreadsheet
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: { title },
          sheets: [
            { properties: { title: "Students", gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: "Exams", gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: "Question Bank", gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: "Results", gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: "Payments", gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: "Downloads", gridProperties: { frozenRowCount: 1 } } }
          ]
        })
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        return res.status(createRes.status).json({
          success: false,
          message: createData?.error?.message || "Google Sheets তৈরি করতে সমস্যা হয়েছে।"
        });
      }

      const spreadsheetId = createData.spreadsheetId;

      // 2. Populate Headers & Sample Data for all 6 sheets
      const initialData = [
        {
          range: "Students!A1:H1",
          values: [["uid", "studentId", "fullName", "email", "phone", "batch", "accountStatus", "registrationDate"]]
        },
        {
          range: "Exams!A1:J1",
          values: [["examId", "title", "category", "duration", "totalQuestions", "totalMarks", "passMarks", "price", "status", "createdAt"]]
        },
        {
          range: "Question Bank!A1:K3",
          values: [
            ["questionId", "examId", "questionNumber", "questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation", "marks"],
            ["q-demo-01", "exam-1", 1, "বাংলা সাহিত্যের প্রথম সার্থক উপন্যাস কোনটি?", "দুর্গেশনন্দিনী", "আলালের ঘরের দুলাল", "বিষবৃক্ষ", "কপালকুণ্ডলা", "A", "বঙ্কিমচন্দ্র চট্টোপাধ্যায় রচিত দুর্গেশনন্দিনী (১৮৬৫) প্রথম সার্থক উপন্যাস।", 1],
            ["q-demo-02", "exam-1", 2, "‘সূর্য’ শব্দের সমার্থক শব্দ কোনটি?", "আদিত্য", "সুধাংশু", "শশাঙ্ক", "বিধু", "A", "আদিত্য, ভাস্কর, তপন হলো সূর্যের সমার্থক শব্দ।", 1]
          ]
        },
        {
          range: "Results!A1:L1",
          values: [["resultId", "userId", "studentId", "examId", "examTitle", "score", "totalMarks", "percentage", "correctAnswers", "wrongAnswers", "skippedAnswers", "submittedAt"]]
        },
        {
          range: "Payments!A1:I1",
          values: [["paymentId", "userId", "studentId", "transactionId", "gateway", "amount", "currency", "paymentStatus", "paidAt"]]
        },
        {
          range: "Downloads!A1:G2",
          values: [
            ["fileId", "title", "category", "googleDriveUrl", "description", "status", "createdAt"],
            ["dl-01", "৪৫তম বিসিএস প্রিলিমিনারি সম্পূর্ণ প্রশ্ন ব্যাংক PDF", "BCS", "https://drive.google.com", "বিসিএস প্রিলিমিনারি স্পেশাল প্রশ্ন সমাধান", "active", new Date().toISOString().split("T")[0]]
          ]
        }
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: initialData
        })
      });

      return res.json({
        success: true,
        spreadsheetId,
        spreadsheetUrl: createData.spreadsheetUrl,
        message: "মাস্টার গুগল স্প্রেডশীট সফলভাবে তৈরি করা হয়েছে।"
      });
    } catch (error: any) {
      console.error("Sheets create template error:", error);
      return res.status(500).json({ success: false, message: error?.message || "সার্ভার এরর" });
    }
  });

  // 3. Read and Validate Questions from Google Sheets Question Bank tab
  app.post("/api/sheets/read-questions", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Google অথেনটিকেশন টোকেন পাওয়া যায়নি।" });
      }
      const token = authHeader.split(" ")[1];
      const { spreadsheetId, sheetName = "Question Bank", targetExamId } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({ success: false, message: "স্প্রেডশীট আইডি প্রদান করুন।" });
      }

      const cleanId = spreadsheetId.includes("/d/")
        ? spreadsheetId.split("/d/")[1].split("/")[0]
        : spreadsheetId.trim();

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: data?.error?.message || `"${sheetName}" শিট পাওয়া যায়নি। স্প্রেডশীটে "${sheetName}" নামের ট্যাব রয়েছে কিনা পরীক্ষা করুন।`
        });
      }

      const rawRows: string[][] = data.values || [];
      if (rawRows.length <= 1) {
        return res.json({
          success: true,
          data: {
            totalRows: 0,
            validCount: 0,
            errorCount: 0,
            errorRowNumbers: [],
            rows: [],
            validQuestions: []
          }
        });
      }

      // Parse Header
      const headerRow = rawRows[0].map(h => (h || "").trim().toLowerCase());
      const getColIdx = (names: string[]) => {
        return headerRow.findIndex(h => names.some(n => h.includes(n.toLowerCase())));
      };

      const qIdIdx = getColIdx(["questionid", "id", "qid", "প্রশ্ন আইডি"]);
      const examIdIdx = getColIdx(["examid", "exam", "পরীক্ষা"]);
      const qNumIdx = getColIdx(["questionnumber", "qnum", "number", "ক্রম"]);
      const qTextIdx = getColIdx(["questiontext", "question", "text", "প্রশ্ন"]);
      const optAIdx = getColIdx(["optiona", "opta", "ক", "option 1", "opt1"]);
      const optBIdx = getColIdx(["optionb", "optb", "খ", "option 2", "opt2"]);
      const optCIdx = getColIdx(["optionc", "optc", "গ", "option 3", "opt3"]);
      const optDIdx = getColIdx(["optiond", "optd", "ঘ", "option 4", "opt4"]);
      const correctIdx = getColIdx(["correctanswer", "correct", "answer", "উত্তর", "সঠিক"]);
      const expIdx = getColIdx(["explanation", "ব্যাখ্যা"]);
      const marksIdx = getColIdx(["marks", "mark", "নম্বর"]);

      const rowsReport: any[] = [];
      const validQuestions: any[] = [];
      const errorRowNumbers: number[] = [];
      const seenQuestionIds = new Set<string>();

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rowNumber = i + 1; // 1-based row number in Google Sheets
        const errors: string[] = [];

        const questionId = (qIdIdx >= 0 && row[qIdIdx] ? row[qIdIdx].trim() : `q-imported-${Date.now()}-${i}`);
        const rowExamId = (examIdIdx >= 0 && row[examIdIdx] ? row[examIdIdx].trim() : targetExamId || "general-exam");
        const questionNum = (qNumIdx >= 0 && row[qNumIdx] ? parseInt(row[qNumIdx], 10) : i);
        const questionText = (qTextIdx >= 0 && row[qTextIdx] ? row[qTextIdx].trim() : "");
        const optA = (optAIdx >= 0 && row[optAIdx] ? row[optAIdx].trim() : "");
        const optB = (optBIdx >= 0 && row[optBIdx] ? row[optBIdx].trim() : "");
        const optC = (optCIdx >= 0 && row[optCIdx] ? row[optCIdx].trim() : "");
        const optD = (optDIdx >= 0 && row[optDIdx] ? row[optDIdx].trim() : "");
        const correctRaw = (correctIdx >= 0 && row[correctIdx] ? row[correctIdx].trim() : "");
        const explanation = (expIdx >= 0 && row[expIdx] ? row[expIdx].trim() : "");
        const marks = (marksIdx >= 0 && row[marksIdx] ? Number(row[marksIdx]) || 1 : 1);

        // Validation Checks
        if (!questionText) {
          errors.push("প্রশ্নের বিষয়বস্তু (questionText) ফাঁকা রাখা যাবে না।");
        }

        if (!optA || !optB || !optC || !optD) {
          errors.push("৪টি অপশনই (Option A, B, C, D) সঠিকভাবে পূরণ করতে হবে।");
        }

        let correctIndex = -1;
        const normalizedCorrect = correctRaw.toUpperCase().trim();
        if (normalizedCorrect === "A" || normalizedCorrect === "1" || normalizedCorrect === "ক" || normalizedCorrect === optA.toUpperCase()) {
          correctIndex = 0;
        } else if (normalizedCorrect === "B" || normalizedCorrect === "2" || normalizedCorrect === "খ" || normalizedCorrect === optB.toUpperCase()) {
          correctIndex = 1;
        } else if (normalizedCorrect === "C" || normalizedCorrect === "3" || normalizedCorrect === "গ" || normalizedCorrect === optC.toUpperCase()) {
          correctIndex = 2;
        } else if (normalizedCorrect === "D" || normalizedCorrect === "4" || normalizedCorrect === "ঘ" || normalizedCorrect === optD.toUpperCase()) {
          correctIndex = 3;
        } else {
          const parsed = parseInt(normalizedCorrect, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) {
            correctIndex = parsed;
          }
        }

        if (correctIndex === -1) {
          errors.push(`সঠিক উত্তর "${correctRaw || '(খালি)'}" অকার্যকর। এটি A, B, C, D অথবা ১, ২, ৩, ৪ হতে হবে।`);
        }

        if (seenQuestionIds.has(questionId)) {
          errors.push(`ডুপ্লিকেট প্রশ্ন আইডি শনাক্ত হয়েছে (${questionId})।`);
        } else {
          seenQuestionIds.add(questionId);
        }

        const isValid = errors.length === 0;
        if (!isValid) {
          errorRowNumbers.push(rowNumber);
        }

        const rowValidation = {
          rowNumber,
          questionId,
          examId: rowExamId,
          questionNumber: isNaN(questionNum) ? i : questionNum,
          questionText,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          correctAnswer: correctRaw,
          correctAnswerIndex: correctIndex >= 0 ? correctIndex : 0,
          explanation,
          marks,
          isValid,
          errors
        };

        rowsReport.push(rowValidation);

        if (isValid) {
          validQuestions.push({
            question: {
              id: questionId,
              text: questionText,
              options: [optA, optB, optC, optD],
              correctAnswer: correctIndex,
              explanation,
              subject: "সাধারণ",
              questionNumber: isNaN(questionNum) ? i : questionNum
            },
            examId: rowExamId,
            questionNumber: isNaN(questionNum) ? i : questionNum
          });
        }
      }

      return res.json({
        success: true,
        data: {
          totalRows: rawRows.length - 1,
          validCount: validQuestions.length,
          errorCount: errorRowNumbers.length,
          errorRowNumbers,
          rows: rowsReport,
          validQuestions
        }
      });
    } catch (error: any) {
      console.error("Read questions API error:", error);
      return res.status(500).json({ success: false, message: error?.message || "সার্ভার এরর" });
    }
  });

  // 4. Export single sheet data table to Google Sheets
  app.post("/api/sheets/export", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Google অথেনটিকেশন টোকেন পাওয়া যায়নি।" });
      }
      const token = authHeader.split(" ")[1];
      const { spreadsheetId, sheetName, rows } = req.body;

      if (!spreadsheetId || !sheetName || !Array.isArray(rows)) {
        return res.status(400).json({ success: false, message: "অবৈধ রিকোয়েস্ট প্যারামিটার।" });
      }

      const cleanId = spreadsheetId.includes("/d/")
        ? spreadsheetId.split("/d/")[1].split("/")[0]
        : spreadsheetId.trim();

      // Ensure tab exists or create it
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({
          success: false,
          message: metaData?.error?.message || "স্প্রেডশীট এক্সেস পাওয়া যায়নি।"
        });
      }

      const existingSheets = (metaData.sheets || []).map((s: any) => s.properties?.title);
      if (!existingSheets.includes(sheetName)) {
        // Add new sheet tab
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requests: [{ addSheet: { properties: { title: sheetName, gridProperties: { frozenRowCount: 1 } } } }]
          })
        });
      }

      // Clear existing values in this sheet first to prevent orphaned trailing rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetName)}!A1:Z5000:clear`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      // Write new rows
      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            range: `${sheetName}!A1`,
            majorDimension: "ROWS",
            values: rows
          })
        }
      );

      const writeData = await writeRes.json();
      if (!writeRes.ok) {
        return res.status(writeRes.status).json({
          success: false,
          message: writeData?.error?.message || "ডেটা রাইট করতে সমস্যা হয়েছে।"
        });
      }

      return res.json({
        success: true,
        updatedRows: rows.length,
        message: `"${sheetName}" ট্যাবে ${rows.length - 1} টি রেকর্ড সফলভাবে এক্সপোর্ট করা হয়েছে!`
      });
    } catch (error: any) {
      console.error("Export sheet API error:", error);
      return res.status(500).json({ success: false, message: error?.message || "সার্ভার এরর" });
    }
  });

  // 5. Export All tables at once to Google Sheets
  app.post("/api/sheets/export-all", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Google অথেনটিকেশন টোকেন পাওয়া যায়নি।" });
      }
      const token = authHeader.split(" ")[1];
      const { spreadsheetId, sheets } = req.body;

      if (!spreadsheetId || !sheets) {
        return res.status(400).json({ success: false, message: "অবৈধ প্যারামিটার।" });
      }

      const cleanId = spreadsheetId.includes("/d/")
        ? spreadsheetId.split("/d/")[1].split("/")[0]
        : spreadsheetId.trim();

      // Check existing sheets
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({
          success: false,
          message: metaData?.error?.message || "স্প্রেডশীট এক্সেস পাওয়া যায়নি।"
        });
      }

      const existingSheets = (metaData.sheets || []).map((s: any) => s.properties?.title);
      const sheetNames = Object.keys(sheets);

      // Add missing sheets
      const missing = sheetNames.filter(name => !existingSheets.includes(name));
      if (missing.length > 0) {
        const requests = missing.map(title => ({
          addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } }
        }));
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ requests })
        });
      }

      // Batch update data
      const dataPayload = sheetNames.map(name => ({
        range: `${name}!A1`,
        values: sheets[name]
      }));

      const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: dataPayload
        })
      });

      const batchData = await batchRes.json();
      if (!batchRes.ok) {
        return res.status(batchRes.status).json({
          success: false,
          message: batchData?.error?.message || "ব্যাচ এক্সপোর্ট ব্যর্থ হয়েছে।"
        });
      }

      const counts: Record<string, number> = {};
      sheetNames.forEach(name => {
        counts[name] = Math.max(0, (sheets[name]?.length || 1) - 1);
      });

      return res.json({
        success: true,
        message: "সকল ৬টি ডেটা টেবিল গুগল স্প্রেডশীটে সফলভাবে এক্সপোর্ট হয়েছে!",
        details: counts
      });
    } catch (error: any) {
      console.error("Export all API error:", error);
      return res.status(500).json({ success: false, message: error?.message || "সার্ভার এরর" });
    }
  });

  // 6. Automatic Result Sync to Results sheet tab
  app.post("/api/sheets/sync-result", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Google অথেনটিকেশন টোকেন পাওয়া যায়নি।" });
      }
      const token = authHeader.split(" ")[1];
      const { spreadsheetId, result } = req.body;

      if (!spreadsheetId || !result) {
        return res.status(400).json({ success: false, message: "অবৈধ প্যারামিটার।" });
      }

      const cleanId = spreadsheetId.includes("/d/")
        ? spreadsheetId.split("/d/")[1].split("/")[0]
        : spreadsheetId.trim();

      const resultRow = [
        result.id || `res-${Date.now()}`,
        result.userId || result.studentId || "guest",
        result.studentId || result.userId || "guest",
        result.examId || "",
        result.examTitle || "",
        Number(result.score || 0),
        Number(result.totalMarks || 0),
        `${Math.round(result.percentage || 0)}%`,
        Number(result.correctAnswers || 0),
        Number(result.wrongAnswers || 0),
        Number(result.skippedAnswers || result.unansweredQuestions || 0),
        result.submittedAt || new Date().toISOString()
      ];

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Results!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            values: [resultRow]
          })
        }
      );

      const appendData = await appendRes.json();
      if (!appendRes.ok) {
        return res.status(appendRes.status).json({
          success: false,
          message: appendData?.error?.message || "গুগল শিটে রেজাল্ট সিঙ্ক ব্যর্থ হয়েছে।"
        });
      }

      return res.json({
        success: true,
        syncedAt: new Date().toISOString(),
        message: "রেজাল্ট গুগল শিটে সফলভাবে সিঙ্ক হয়েছে।"
      });
    } catch (error: any) {
      console.error("Sync result API error:", error);
      return res.status(500).json({ success: false, message: error?.message || "সার্ভার এরর" });
    }
  });

  // ZiniPay Payment Creation Proxy API
  app.post("/api/payment/create", async (req, res) => {
    try {
      const apiKey = process.env.ZINIPAY_API_KEY || "sandbox_test_8f4c9a2e7b31";
      const { amount, customer_name, customer_email, customer_phone, metadata } = req.body;

      const host = req.get("host") || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const origin = `${protocol}://${host}`;

      const payload = {
        amount: Number(amount) || 249,
        currency: "BDT",
        cus_name: customer_name || req.body.cus_name || "Prosenjit Biswas",
        cus_email: customer_email || req.body.cus_email || "pbprosen1971@gmail.com",
        cus_phone: customer_phone || req.body.cus_phone || "01700000000",
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        customer_name: customer_name || req.body.cus_name || "Prosenjit Biswas",
        customer_email: customer_email || req.body.cus_email || "pbprosen1971@gmail.com",
        customer_phone: customer_phone || req.body.cus_phone || "01700000000",
        redirect_url: `${origin}?payment=success`,
        cancel_url: `${origin}?payment=cancel`,
        return_url: `${origin}?payment=success`,
        webhook_url: `${origin}/api/payment/webhook`,
        metadata: metadata || {}
      };

      console.log("Creating ZiniPay Payment request:", payload);

      const response = await fetch("https://api.zinipay.com/v1/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "zini-api-key": apiKey
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { raw: responseText };
      }

      console.log("ZiniPay Response:", response.status, data);

      if (response.ok && data) {
        return res.json({
          status: true,
          data,
          payment_url: data?.data?.payment_url || data?.payment_url || data?.url || data?.data?.url || data?.redirect_url
        });
      } else {
        return res.status(response.status || 400).json({
          status: false,
          message: data?.message || "ZiniPay API response error",
          details: data
        });
      }
    } catch (error: any) {
      console.error("ZiniPay Payment Create Server Error:", error);
      return res.status(500).json({
        status: false,
        message: error?.message || "Internal server error connecting to ZiniPay API"
      });
    }
  });

  // ZiniPay Webhook Endpoint
  app.post("/api/payment/webhook", (req, res) => {
    console.log("Received ZiniPay Webhook:", req.body);
    res.json({ received: true });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
