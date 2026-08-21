/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomeView from './components/HomeView';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ExamView from './components/ExamView';
import ResultView from './components/ResultView';
import ProfileView from './components/ProfileView';
import AdminView from './components/AdminView';

import { Exam, ExamResult, MinistryQuestionBank, UserProfile, UpcomingExamSettings } from './types';
import { INITIAL_EXAMS, INITIAL_MINISTRY_BANKS } from './data';
import {
  subscribeToExams,
  saveExamToFirestore,
  deleteExamFromFirestore,
  saveResultToFirestore,
  subscribeToUpcomingExamSettings,
  saveUpcomingExamSettings
} from './services/firestoreService';
import { syncResultToGoogleSheets } from './services/googleSheetsService';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, onSnapshot, collection } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';

// Verify Connection to Firestore as per Firebase Integration Skill (CRITICAL CONSTRAINT)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export default function App() {
  // Global States
  const [currentView, setView] = useState<string>('home');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('active_user_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [ministryBanks, setMinistryBanks] = useState<MinistryQuestionBank[]>([]);
  const [upcomingExamSettings, setUpcomingExamSettings] = useState<UpcomingExamSettings | null>(null);

  // Selection states
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Subscribe to Firebase Auth State Changes and real-time user document listener
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        const isAdminEmail = firebaseUser.email?.toLowerCase() === 'medha@admin.com';

        // Enforce Firebase Auth Email Verification (except for admin medha@admin.com)
        const isPasswordProvider = firebaseUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider && !firebaseUser.emailVerified && !isAdminEmail) {
          await signOut(auth);
          setUser(null);
          localStorage.removeItem('active_user_session');
          return;
        }

        try {
          // Listen to user document in real-time
          unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
            const nowIso = new Date().toISOString();
            let profileData: UserProfile;

            if (docSnap.exists()) {
              const data = docSnap.data();
              let isPrem = !!data.isPremium;
              let isPremDate = data.isPremiumDate || data.inPremiumDate || data['inpremium date'] || '';
              let isPremExpiryDate = data.isPremiumExpiryDate || data.inPremiumExpiryDate || data['inpremium expiry date'] || '';

              // Auto-check premium expiration
              if (isPrem && isPremExpiryDate) {
                const expTime = new Date(isPremExpiryDate).getTime();
                if (!isNaN(expTime) && expTime < Date.now()) {
                  isPrem = false;
                  isPremDate = '';
                  isPremExpiryDate = '';
                  try {
                    await setDoc(doc(db, 'users', firebaseUser.uid), {
                      isPremium: false,
                      isPremiumDate: '',
                      isPremiumExpiryDate: '',
                      inPremiumDate: '',
                      inPremiumExpiryDate: '',
                    }, { merge: true });
                  } catch (e) {
                    console.warn("Failed to update expired premium in Firestore:", e);
                  }
                }
              }

              profileData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: data.fullName || data.name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'ইউজার'),
                fullName: data.fullName || data.name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'ইউজার'),
                email: data.email || firebaseUser.email || '',
                phone: data.phone || '',
                photoURL: data.photoURL || data.avatar || firebaseUser.photoURL || '',
                avatar: data.avatar || data.photoURL || firebaseUser.photoURL || '',
                role: isAdminEmail ? 'admin' : (data.role || 'student'),
                accountStatus: data.accountStatus || 'active',
                createdAt: data.createdAt || nowIso,
                lastLogin: nowIso,
                institution: data.institution || (isAdminEmail ? 'মেধা এক্সাম এডমিন সেল' : ''),
                joinedDate: data.joinedDate || new Date().toLocaleDateString('bn-BD'),
                earnedCertificates: data.earnedCertificates || [],
                isPremium: isPrem,
                isPremiumDate: isPremDate,
                isPremiumExpiryDate: isPremExpiryDate,
                inPremiumDate: isPremDate,
                inPremiumExpiryDate: isPremExpiryDate,
              };
            } else {
              // Initial profile creation if doc doesn't exist yet in Firestore
              const defaultName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'ইউজার');
              const displayName = isAdminEmail ? 'মুহাম্মদ আশরাফুল ইসলাম' : defaultName;
              profileData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: displayName,
                fullName: displayName,
                email: firebaseUser.email || '',
                phone: isAdminEmail ? '+৮৮০ ১৭০০-১১২২৩৪' : '',
                photoURL: firebaseUser.photoURL || '',
                avatar: firebaseUser.photoURL || '',
                role: isAdminEmail ? 'admin' : 'student',
                accountStatus: 'active',
                createdAt: nowIso,
                lastLogin: nowIso,
                institution: isAdminEmail ? 'মেধা এক্সাম এডমিন সেল' : '',
                joinedDate: new Date().toLocaleDateString('bn-BD'),
                earnedCertificates: [],
                isPremium: false,
                isPremiumDate: '',
                isPremiumExpiryDate: '',
                inPremiumDate: '',
                inPremiumExpiryDate: '',
              };
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), profileData, { merge: true });
              } catch (e) {
                console.warn("Failed to create initial user profile in Firestore", e);
              }
            }

            setUser(profileData);
            localStorage.setItem('active_user_session', JSON.stringify(profileData));
          }, (error) => {
            try {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            } catch (e) {
              console.warn("onSnapshot user doc error:", e);
            }
          });
        } catch (error) {
          console.error("Error in onAuthStateChanged flow:", error);
        }
      } else {
        setUser(null);
        localStorage.removeItem('active_user_session');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  // Live listener for Exam Results collection in Firestore (Realtime DB sync)
  useEffect(() => {
    const resultsRef = collection(db, 'results');
    const unsubscribeResults = onSnapshot(resultsRef, (snapshot) => {
      const firestoreResults: ExamResult[] = [];
      snapshot.forEach((docSnap) => {
        firestoreResults.push(docSnap.data() as ExamResult);
      });

      if (firestoreResults.length > 0) {
        setResults((prevResults) => {
          const map = new Map<string, ExamResult>();
          // 1. Add local/preset results first
          prevResults.forEach((r) => map.set(r.id, r));
          // 2. Override/Add real Firestore results
          firestoreResults.forEach((r) => map.set(r.id, r));
          const merged = Array.from(map.values());
          merged.sort((a, b) => b.id.localeCompare(a.id));
          localStorage.setItem('exam_results_sheet', JSON.stringify(merged));
          return merged;
        });
      }
    }, (err) => {
      console.warn("Exam results live snapshot error:", err);
    });

    return () => unsubscribeResults();
  }, []);

  // Live listener for active logged-in user profile in Firestore
  useEffect(() => {
    if (!user?.id) return;
    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const liveData = snap.data() as UserProfile;
        if (liveData && typeof liveData.isPremium === 'boolean' && liveData.isPremium !== user.isPremium) {
          const updated = { ...user, ...liveData };
          setUser(updated);
          localStorage.setItem('active_user_session', JSON.stringify(updated));
        }
      }
    }, (err) => {
      console.warn("User profile live snapshot error:", err);
    });
    return () => unsubscribe();
  }, [user?.id, user?.isPremium]);

  // ZiniPay Payment Return Redirect Listener
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      if (user) {
        const updated = { ...user, isPremium: true };
        setUser(updated);
        localStorage.setItem('active_user_session', JSON.stringify(updated));
        if (auth.currentUser) {
          setDoc(doc(db, 'users', auth.currentUser.uid), { isPremium: true }, { merge: true }).catch(() => {});
        }
      } else {
        const guestSession = localStorage.getItem('active_user_session');
        if (guestSession) {
          try {
            const parsed = JSON.parse(guestSession);
            parsed.isPremium = true;
            setUser(parsed);
            localStorage.setItem('active_user_session', JSON.stringify(parsed));
          } catch (e) {}
        }
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // 1. Theme Configuration
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  // 2. Real-time Subscription to Exams Collection in Firestore
  useEffect(() => {
    const unsubscribeExams = subscribeToExams((firestoreExams) => {
      if (firestoreExams.length > 0) {
        setExams(firestoreExams);
      } else {
        console.log("Seeding initial exams into Firestore database...");
        INITIAL_EXAMS.forEach((exam) => {
          saveExamToFirestore(exam, 'system-admin').catch(console.warn);
        });
        setExams(INITIAL_EXAMS);
      }
    });

    return () => unsubscribeExams();
  }, []);

  // 2.5 Real-time Subscription to Upcoming Exam Site Settings in Firestore (siteSettings/upcomingExam)
  useEffect(() => {
    const unsubscribeUpcoming = subscribeToUpcomingExamSettings((settings) => {
      setUpcomingExamSettings(settings);
    });
    return () => unsubscribeUpcoming();
  }, []);

  useEffect(() => {
    // Load or initialize Ministry Question Banks
    const savedBanks = localStorage.getItem('ministry_question_banks');
    if (savedBanks) {
      try {
        setMinistryBanks(JSON.parse(savedBanks));
      } catch (e) {
        setMinistryBanks(INITIAL_MINISTRY_BANKS);
      }
    } else {
      setMinistryBanks(INITIAL_MINISTRY_BANKS);
      localStorage.setItem('ministry_question_banks', JSON.stringify(INITIAL_MINISTRY_BANKS));
    }

    // Load or initialize user profile session
    const savedUser = localStorage.getItem('active_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {}
    }

    // Load or initialize results log
    const savedResults = localStorage.getItem('exam_results_sheet');
    if (savedResults) {
      try {
        setResults(JSON.parse(savedResults));
      } catch (e) {
        setResults([]);
      }
    } else {
      // Pre-load some realistic student results for outstanding visual presentation right away!
      const initialResults: ExamResult[] = [
        {
          id: 'res-pre-1',
          examId: 'exam-1',
          examTitle: '৪৫তম বিসিএস প্রিলিমিনারি মডেল টেস্ট - বাংলা সাহিত্য ও ব্যাকরণ',
          subject: 'BCS',
          userId: 'student-1',
          studentId: 'student-1',
          studentName: 'Prosenjit Biswas',
          studentEmail: 'prosenjit@medha.com',
          score: 7,
          totalMarks: 10,
          percentage: 70,
          totalQuestions: 10,
          correctAnswers: 7,
          wrongAnswers: 3,
          skippedAnswers: 0,
          unansweredQuestions: 0,
          submittedAt: new Date().toISOString(),
          dateTaken: '২০২৬-০৭-১৫',
          timeSpentSeconds: 380,
          subjectPerformance: {
            'বাংলা ব্যাকরণ': { correct: 3, total: 4 },
            'বাংলা সাহিত্য': { correct: 3, total: 5 },
            'সাধারণ জ্ঞান ও শিল্প': { correct: 1, total: 1 }
          }
        },
        {
          id: 'res-pre-2',
          examId: 'exam-2',
          examTitle: 'English Grammar Masterclass - Right Form of Verbs',
          subject: 'ইংরেজি',
          userId: 'student-1',
          studentId: 'student-1',
          studentName: 'Prosenjit Biswas',
          studentEmail: 'prosenjit@medha.com',
          score: 8,
          totalMarks: 8,
          percentage: 100,
          totalQuestions: 8,
          correctAnswers: 8,
          wrongAnswers: 0,
          skippedAnswers: 0,
          unansweredQuestions: 0,
          submittedAt: new Date().toISOString(),
          dateTaken: '২০২৬-০৭-১৮',
          timeSpentSeconds: 240,
          subjectPerformance: {
            'English Grammar': { correct: 4, total: 4 },
            'Vocabulary': { correct: 1, total: 1 },
            'Prepositions': { correct: 1, total: 1 },
            'Conjunctions': { correct: 1, total: 1 },
            'Voice Change': { correct: 1, total: 1 }
          }
        },
        {
          id: 'res-pre-3',
          examId: 'exam-3',
          examTitle: 'প্রাথমিক বিদ্যালয় সহকারী শিক্ষক নিয়োগ প্রস্তুতি - গণিত',
          subject: 'গণিত',
          userId: 'student-1',
          studentId: 'student-1',
          studentName: 'Prosenjit Biswas',
          studentEmail: 'prosenjit@medha.com',
          score: 4,
          totalMarks: 6,
          percentage: 67,
          totalQuestions: 6,
          correctAnswers: 4,
          wrongAnswers: 2,
          skippedAnswers: 0,
          unansweredQuestions: 0,
          submittedAt: new Date().toISOString(),
          dateTaken: '২০২৬-০৭-১৯',
          timeSpentSeconds: 420,
          subjectPerformance: {
            'বীজগণিত': { correct: 1, total: 2 },
            'সরল মুনাফা': { correct: 1, total: 1 },
            'জ্যামিতি': { correct: 1, total: 1 },
            'দশমিক ভগ্নাংশ': { correct: 1, total: 1 },
            'ঐকিক নিয়ম': { correct: 0, total: 1 }
          }
        }
      ];
      setResults(initialResults);
      localStorage.setItem('exam_results_sheet', JSON.stringify(initialResults));
    }
  }, []);

  // Helper to parse date strings safely
  const parseExamDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const direct = new Date(dateStr);
    if (!isNaN(direct.getTime())) return direct;

    // Convert Bangla numerals if present
    const bnDigits: Record<string, string> = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    const engStr = dateStr.replace(/[০-৯]/g, m => bnDigits[m] || m);
    const fallback = new Date(engStr);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
  };

  // 3. Auto-transition exams: 'upcoming' -> 'live' when startTime arrives, and 'live'/'upcoming' -> 'archive' when archiveTime passes
  useEffect(() => {
    if (exams.length === 0) return;

    const checkExamStatuses = () => {
      const now = new Date();
      let hasChanges = false;
      
      const updated = exams.map(exam => {
        let targetStatus = exam.status;

        // 1. Check if archiveTime has passed
        if (exam.status !== 'archive' && exam.archiveTime) {
          const archDate = parseExamDate(exam.archiveTime);
          if (archDate && now >= archDate) {
            targetStatus = 'archive';
          }
        }

        // 2. If not archived, check if upcoming exam's scheduled startTime has arrived or passed
        if (targetStatus === 'upcoming' && exam.startTime) {
          const startDate = parseExamDate(exam.startTime);
          if (startDate && now >= startDate) {
            targetStatus = 'live';
          }
        }

        if (targetStatus !== exam.status) {
          hasChanges = true;
          return { ...exam, status: targetStatus as 'live' | 'upcoming' | 'archive' };
        }
        return exam;
      });

      if (hasChanges) {
        setExams(updated);
        localStorage.setItem('master_exams', JSON.stringify(updated));
      }
    };

    // Run check immediately
    checkExamStatuses();

    // Check periodically for real-time updates (every 3 seconds)
    const interval = setInterval(checkExamStatuses, 3000);
    return () => clearInterval(interval);
  }, [exams]);

  // 4. User update & storage sync
  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('active_user_session', JSON.stringify(profile));
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error("Sign out error", e);
    }
    setUser(null);
    localStorage.removeItem('active_user_session');
    setView('home');
  };

  const handleUpdateUser = async (updatedProfile: UserProfile) => {
    setUser(updatedProfile);
    localStorage.setItem('active_user_session', JSON.stringify(updatedProfile));
    
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
        } catch (e) {
          console.warn("Firestore save failed, proceeding with local profile update only.", e);
        }
      }
    }
  };

  const handleCreateExam = async (newExam: Exam) => {
    setExams(prev => [newExam, ...prev]);
    try {
      await saveExamToFirestore(newExam, user?.uid || user?.id || 'admin');
    } catch (err) {
      console.warn("Failed to save exam to Firestore:", err);
    }
  };

  const handleUpdateExam = async (updatedExam: Exam) => {
    setExams(prev => prev.map(e => e.id === updatedExam.id ? updatedExam : e));
    try {
      await saveExamToFirestore(updatedExam, user?.uid || user?.id || 'admin');
    } catch (err) {
      console.warn("Failed to update exam in Firestore:", err);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setExams(prev => prev.filter(e => e.id !== examId));
    try {
      await deleteExamFromFirestore(examId);
    } catch (err) {
      console.warn("Failed to delete exam from Firestore:", err);
    }
  };

  const handleSaveMinistryBank = (newBank: MinistryQuestionBank) => {
    setMinistryBanks(prev => {
      const existingIdx = prev.findIndex(b => b.id === newBank.id);
      let updated: MinistryQuestionBank[];
      if (existingIdx >= 0) {
        updated = prev.map(b => b.id === newBank.id ? newBank : b);
      } else {
        updated = [newBank, ...prev];
      }
      localStorage.setItem('ministry_question_banks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteMinistryBank = (bankId: string) => {
    setMinistryBanks(prev => {
      const updated = prev.filter(b => b.id !== bankId);
      localStorage.setItem('ministry_question_banks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleExamSubmit = async (newResult: ExamResult) => {
    const updated = [newResult, ...results];
    setResults(updated);
    setSelectedResult(newResult);

    try {
      await saveResultToFirestore(newResult);
    } catch (err) {
      console.warn("Firestore save for results failed, running locally.", err);
    }

    // Automatic Result Reporting to Google Sheets (Non-blocking background sync)
    try {
      syncResultToGoogleSheets(newResult).catch((sheetErr) => {
        console.warn("Google Sheets auto-sync queued for later retry:", sheetErr);
      });
    } catch (e) {
      console.warn("Google Sheets sync attempt caught:", e);
    }
  };

  const handleSaveUpcomingExamSettings = async (settings: UpcomingExamSettings) => {
    setUpcomingExamSettings(settings);
    try {
      await saveUpcomingExamSettings(settings, user?.uid || user?.id || 'admin');
    } catch (err) {
      console.warn("Failed to save upcoming exam settings to Firestore:", err);
    }
  };

  // Render current view content
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            exams={exams}
            setView={setView}
            setSelectedExam={setSelectedExam}
            user={user}
            onUpdateUser={handleUpdateUser}
            ministryBanks={ministryBanks}
            upcomingExamSettings={upcomingExamSettings}
          />
        );
      case 'login':
      case 'register':
        return (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            setView={setView}
            initialIsRegistering={currentView === 'register'}
          />
        );
      case 'dashboard':
        return user ? (
          <DashboardView
            user={user}
            exams={exams}
            results={results}
            setView={setView}
            setSelectedExam={setSelectedExam}
            setSelectedResult={setSelectedResult}
          />
        ) : (
          <LoginView onLoginSuccess={handleLoginSuccess} setView={setView} />
        );
      case 'exam':
        return selectedExam ? (
          <ExamView
            exam={selectedExam}
            user={user}
            onExamSubmit={handleExamSubmit}
            setView={setView}
          />
        ) : (
          <HomeView
            exams={exams}
            setView={setView}
            setSelectedExam={setSelectedExam}
            user={user}
            ministryBanks={ministryBanks}
            upcomingExamSettings={upcomingExamSettings}
          />
        );
      case 'result':
        return selectedResult ? (
          <ResultView result={selectedResult} setView={setView} user={user} />
        ) : (
          <HomeView
            exams={exams}
            setView={setView}
            setSelectedExam={setSelectedExam}
            user={user}
            ministryBanks={ministryBanks}
            upcomingExamSettings={upcomingExamSettings}
          />
        );
      case 'profile':
        return user ? (
          <ProfileView
            user={user}
            results={results}
            onUpdateUser={handleUpdateUser}
            setView={setView}
            setSelectedResult={setSelectedResult}
          />
        ) : (
          <LoginView onLoginSuccess={handleLoginSuccess} setView={setView} />
        );
      case 'admin':
        return user?.role === 'admin' && user?.email?.toLowerCase() === 'medha@admin.com' ? (
          <AdminView
            exams={exams}
            results={results}
            onCreateExam={handleCreateExam}
            onUpdateExam={handleUpdateExam}
            onDeleteExam={handleDeleteExam}
            ministryBanks={ministryBanks}
            onSaveMinistryBank={handleSaveMinistryBank}
            onDeleteMinistryBank={handleDeleteMinistryBank}
            setView={setView}
            onUpdateUser={handleUpdateUser}
            currentUser={user}
            upcomingExamSettings={upcomingExamSettings}
            onSaveUpcomingExamSettings={handleSaveUpcomingExamSettings}
          />
        ) : (
          <HomeView
            exams={exams}
            setView={setView}
            setSelectedExam={setSelectedExam}
            user={user}
            ministryBanks={ministryBanks}
            upcomingExamSettings={upcomingExamSettings}
          />
        );
      default:
        return (
          <HomeView
            exams={exams}
            setView={setView}
            setSelectedExam={setSelectedExam}
            user={user}
            ministryBanks={ministryBanks}
            upcomingExamSettings={upcomingExamSettings}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 theme-transition flex flex-col justify-between">
      {/* Dynamic Navigation */}
      <Navbar
        currentView={currentView}
        setView={setView}
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Main Container Content */}
      <main className="flex-grow">{renderView()}</main>

      {/* Global Student Footer */}
      <Footer setView={setView} setSelectedExam={setSelectedExam} exams={exams} />
    </div>
  );
}
