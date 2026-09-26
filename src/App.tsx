/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomeView from './components/HomeView';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ExamView from './components/ExamView';
import ResultView from './components/ResultView';
import ProfileView from './components/ProfileView';
import ReferralDashboard from './components/ReferralDashboard';
import AdminView from './components/AdminView';
import StudyMaterialsView from './components/StudyMaterialsView';
import DailyPracticeView from './components/DailyPracticeView';
import WrongQuestionView from './components/WrongQuestionView';
import SubmissionSuccessAnimation from './components/SubmissionSuccessAnimation';
import PrivacyPolicyView from './components/PrivacyPolicyView';
import TermsAndConditionsView from './components/TermsAndConditionsView';
import DeleteAccountView from './components/DeleteAccountView';
import NotificationPromptBanner from './components/NotificationPromptBanner';
import FaqSection from './components/FaqSection';
import { 
  syncCurrentDeviceToken, 
  setupGlobalRealtimeNotificationWatcher 
} from './services/notificationService';

import { Exam, ExamResult, MinistryQuestionBank, UserProfile, UpcomingExamSettings } from './types';
import { INITIAL_EXAMS, INITIAL_MINISTRY_BANKS } from './data';
import {
  subscribeToExams,
  saveExamToFirestore,
  deleteExamFromFirestore,
  deleteUpcomingExamFromFirestore,
  deleteUpcomingExamFromSiteSettings,
  saveResultToFirestore,
  subscribeToUpcomingExamSettings,
  saveUpcomingExamSettings,
  updateExamArchiveStatus,
  updateExamToUpcoming,
  safeTimestampToString,
  safeDateOnlyString,
  generateReferralCode,
} from './services/firestoreService';
import { isScheduledLiveTimeReached } from './lib/dateUtils';
import {
  syncResultToGoogleSheets,
  syncStudentToGoogleSheets,
  syncExamToGoogleSheets,
  startFirestoreRealtimeSheetsSync
} from './services/googleSheetsService';
import { isGoogleConnected } from './lib/googleAuth';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, onSnapshot, collection } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';

// Verify Connection to Firestore gracefully
async function testConnection() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'upcomingExam'));
  } catch (error) {
    // Gracefully handle initial offline/sync state without throwing false alarms
  }
}
testConnection();

const pathToView = (pathname: string): string => {
  const p = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (p === '/registration' || p === '/register') return 'register';
  if (p === '/login') return 'login';
  if (p === '/exam') return 'exam';
  if (p === '/result') return 'result';
  if (p === '/profile') return 'profile';
  if (p === '/admin') return 'admin';
  if (p === '/dashboard') return 'dashboard';
  if (p === '/daily-practice' || p === '/dailypractice' || p === '/daily') return 'daily-practice';
  if (p === '/wrong-questions' || p === '/wrong-question' || p === '/wrongquestions') return 'wrong-questions';
  if (p === '/study-materials' || p === '/study-material' || p === '/materials' || p === '/studymaterials') return 'study-materials';
  if (p === '/privacy-policy' || p === '/privacy') return 'privacy-policy';
  if (p === '/terms-and-conditions' || p === '/terms') return 'terms-and-conditions';
  if (p === '/delete-account' || p === '/deleteaccount') return 'delete-account';
  if (p === '/faq' || p === '/faqs') return 'faq';
  return 'home';
};

const viewToPath = (view: string): string => {
  switch (view) {
    case 'register':
      return '/registration';
    case 'login':
      return '/login';
    case 'exam':
      return '/exam';
    case 'result':
      return '/result';
    case 'profile':
      return '/profile';
    case 'admin':
      return '/admin';
    case 'dashboard':
      return '/dashboard';
    case 'daily-practice':
      return '/daily-practice';
    case 'wrong-questions':
      return '/wrong-questions';
    case 'study-materials':
      return '/study-materials';
    case 'privacy-policy':
      return '/privacy-policy';
    case 'terms-and-conditions':
      return '/terms-and-conditions';
    case 'delete-account':
      return '/delete-account';
    case 'faq':
      return '/faq';
    case 'home':
    default:
      return '/';
  }
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Global States
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        localStorage.setItem('pending_referral_code', ref.trim().toUpperCase());
      }
      return pathToView(window.location.pathname);
    } catch {
      return 'home';
    }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_mode');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

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

  // Subtle Success Animation on Firestore Submission
  const [showSubmitSuccess, setShowSubmitSuccess] = useState<boolean>(false);
  const [submittedExamTitle, setSubmittedExamTitle] = useState<string>('');

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

              const userEmail = (firebaseUser.email || '').toLowerCase().trim();
              const isFounderProsenjit = userEmail === 'pbprosen1971@gmail.com' || userEmail === 'prosenjit@medha.com';
              const providerDisplayName = firebaseUser.providerData?.find(p => p.displayName)?.displayName || '';
              const authDisplayName = firebaseUser.displayName || providerDisplayName;
              
              const rawStoredName = data.name || data.fullName || data.displayName || '';
              let resolvedName = '';

              if (rawStoredName && rawStoredName !== 'Prosenjit Biswas') {
                resolvedName = rawStoredName;
              } else if (isFounderProsenjit) {
                resolvedName = rawStoredName || authDisplayName || 'Prosenjit Biswas';
              } else if (authDisplayName && authDisplayName !== 'Prosenjit Biswas') {
                resolvedName = authDisplayName;
              } else if (rawStoredName && rawStoredName !== 'Prosenjit Biswas') {
                resolvedName = rawStoredName;
              } else if (firebaseUser.email) {
                resolvedName = firebaseUser.email.split('@')[0];
              } else {
                resolvedName = 'শিক্ষার্থী';
              }

              // Auto-repair Firestore user document if corrupted with "Prosenjit Biswas"
              if (
                (data.name === 'Prosenjit Biswas' || data.fullName === 'Prosenjit Biswas' || data.displayName === 'Prosenjit Biswas') &&
                !isFounderProsenjit &&
                resolvedName &&
                resolvedName !== 'Prosenjit Biswas'
              ) {
                try {
                  await setDoc(doc(db, 'users', firebaseUser.uid), {
                    name: resolvedName,
                    fullName: resolvedName,
                    displayName: resolvedName,
                  }, { merge: true });
                } catch (repairErr) {
                  console.warn("Auto-repair user name in Firestore failed:", repairErr);
                }
              }

              profileData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: resolvedName,
                fullName: resolvedName,
                displayName: resolvedName,
                email: String(data.email || firebaseUser.email || ''),
                phone: String(data.phone || ''),
                photoURL: String(data.photoURL || data.avatar || firebaseUser.photoURL || ''),
                avatar: String(data.avatar || data.photoURL || firebaseUser.photoURL || ''),
                role: isAdminEmail ? 'admin' : ((data.role === 'admin' ? 'admin' : 'student') as 'admin' | 'student'),
                accountStatus: (data.accountStatus === 'blocked' ? 'blocked' : 'active') as 'active' | 'blocked',
                createdAt: safeTimestampToString(data.createdAt, nowIso),
                lastLogin: nowIso,
                institution: String(data.institution || (isAdminEmail ? 'মেধা এক্সাম এডমিন সেল' : '')),
                joinedDate: safeDateOnlyString(data.joinedDate || data.createdAt, new Date().toLocaleDateString('bn-BD')),
                earnedCertificates: Array.isArray(data.earnedCertificates) ? data.earnedCertificates : [],
                isPremium: isPrem,
                isPremiumDate: safeTimestampToString(isPremDate, ''),
                isPremiumExpiryDate: safeTimestampToString(isPremExpiryDate, ''),
                inPremiumDate: safeTimestampToString(isPremDate, ''),
                inPremiumExpiryDate: safeTimestampToString(isPremExpiryDate, ''),
                referralCode: data.referralCode || '',
                referralCount: Number(data.referralCount || 0),
                referredBy: data.referredBy || '',
                referredAt: safeTimestampToString(data.referredAt, ''),
              };

              // Auto-generate referral code if not present yet
              if (!profileData.referralCode) {
                const generatedCode = generateReferralCode(resolvedName);
                profileData.referralCode = generatedCode;
                setDoc(doc(db, 'users', firebaseUser.uid), {
                  referralCode: generatedCode,
                  referralCount: Number(data.referralCount || 0)
                }, { merge: true }).catch(() => {});
              }
            } else {
              // Initial profile creation if doc doesn't exist yet in Firestore
              const providerDisplayName = firebaseUser.providerData?.find(p => p.displayName)?.displayName || '';
              const defaultName = firebaseUser.displayName || providerDisplayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'শিক্ষার্থী');
              const displayName = isAdminEmail ? 'Prosenjit' : defaultName;
              const generatedCode = generateReferralCode(displayName);
              profileData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                studentId: isAdminEmail ? '2JDRuYTnWuXwQFVAefh1GP1gWcy1' : firebaseUser.uid,
                name: displayName,
                fullName: displayName,
                displayName: displayName,
                email: firebaseUser.email || '',
                phone: isAdminEmail ? '০১৪৫৪৪৫৪৫' : '',
                photoURL: firebaseUser.photoURL || '',
                avatar: firebaseUser.photoURL || '',
                role: isAdminEmail ? 'admin' : 'student',
                accountStatus: 'active',
                createdAt: isAdminEmail ? '2026-08-05T17:05:59.331Z' : nowIso,
                registrationDate: isAdminEmail ? '2026-08-05T17:05:59.331Z' : nowIso,
                lastLogin: nowIso,
                institution: isAdminEmail ? 'ঢাকা কলেজ' : '',
                batch: isAdminEmail ? 'ঢাকা কলেজ' : '',
                joinedDate: isAdminEmail ? '2026-08-05' : new Date().toLocaleDateString('bn-BD'),
                earnedCertificates: [],
                isPremium: isAdminEmail ? true : false,
                isPremiumDate: isAdminEmail ? '2026-08-05' : '',
                isPremiumExpiryDate: isAdminEmail ? '2099-12-31' : '',
                inPremiumDate: isAdminEmail ? '2026-08-05' : '',
                inPremiumExpiryDate: isAdminEmail ? '2099-12-31' : '',
                referralCode: generatedCode,
                referralCount: 0,
                referredBy: '',
                referredAt: '',
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
        const saved = localStorage.getItem('active_user_session');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.email?.toLowerCase() === 'medha@admin.com' || parsed.role === 'admin')) {
              setUser(parsed);
              return;
            }
          } catch (e) {}
        }
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

  // Sync FCM token when user profile is loaded or on mount
  useEffect(() => {
    syncCurrentDeviceToken(user).catch(() => {});
  }, [user]);

  // Global Realtime Notification Watcher across all open devices
  useEffect(() => {
    const unsub = setupGlobalRealtimeNotificationWatcher((newNotif) => {
      console.log('[Realtime Broadcast Received]:', newNotif.title);
    });
    return () => unsub();
  }, []);

  // Live listener for Exam Results collection in Firestore (Realtime DB sync)
  useEffect(() => {
    const resultsRef = collection(db, 'results');
    const unsubscribeResults = onSnapshot(resultsRef, (snapshot) => {
      const firestoreResults: ExamResult[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestoreResults.push({
          ...data,
          id: docSnap.id || data.id,
          userId: String(data.userId || data.studentId || 'guest'),
          studentId: String(data.studentId || data.userId || 'guest'),
          studentName: String(data.studentName || 'ইউজার'),
          studentEmail: String(data.studentEmail || ''),
          examId: String(data.examId || ''),
          examTitle: String(data.examTitle || ''),
          subject: String(data.subject || ''),
          score: Number(data.score || 0),
          totalMarks: Number(data.totalMarks || 0),
          percentage: Number(data.percentage || 0),
          totalQuestions: Number(data.totalQuestions || 0),
          correctAnswers: Number(data.correctAnswers || 0),
          wrongAnswers: Number(data.wrongAnswers || 0),
          skippedAnswers: Number(data.skippedAnswers || 0),
          unansweredQuestions: Number(data.unansweredQuestions || 0),
          submittedAt: safeTimestampToString(data.submittedAt || data.createdAt, new Date().toISOString()),
          dateTaken: safeDateOnlyString(data.dateTaken || data.submittedAt || data.createdAt, new Date().toLocaleDateString('bn-BD')),
          timeSpentSeconds: Number(data.timeSpentSeconds || 0),
          subjectPerformance: data.subjectPerformance || {},
        } as ExamResult);
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

  // Payment Return Redirect Listener
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

  // 2. Real-time Subscription to Exams Collection in Firestore
  useEffect(() => {
    const normalizeExamSubject = (exam: Exam): Exam => {
      const raw = exam.subject?.trim();
      if (raw === 'GK' || raw === 'সাধারণ জ্ঞান') {
        const isIntl = !!(exam.title && (exam.title.includes('বিশ্ব') || exam.title.includes('আন্তর্জাতিক') || exam.title.toLowerCase().includes('international')));
        const newSubject = isIntl ? 'আন্তর্জাতিক সাধারন জ্ঞান' : 'বাংলাদেশ বিষয়াবলি -GK';
        const updated: Exam = {
          ...exam,
          subject: newSubject,
          questions: (exam.questions || []).map(q => ({
            ...q,
            subject: (q.subject === 'GK' || q.subject === 'সাধারণ জ্ঞান') ? newSubject : (q.subject || newSubject)
          }))
        };
        saveExamToFirestore(updated, exam.createdBy || 'system-admin').catch(() => {});
        return updated;
      }
      return exam;
    };

    const unsubscribeExams = subscribeToExams((firestoreExams) => {
      if (firestoreExams.length > 0) {
        setExams(firestoreExams.map(normalizeExamSubject));
      } else {
        console.log("Seeding initial exams into Firestore database...");
        INITIAL_EXAMS.forEach((exam) => {
          saveExamToFirestore(exam, 'system-admin').catch(console.warn);
        });
        setExams(INITIAL_EXAMS.map(normalizeExamSubject));
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

  // Keep a ref to the latest exams for periodic background checks without causing infinite effect loops
  const examsRef = React.useRef(exams);
  useEffect(() => {
    examsRef.current = exams;
  }, [exams]);

  // Periodic check (every 30 seconds):
  // 1. Auto-transition upcoming exams to 'live' ONLY when an explicit scheduled live time (with hours & minutes) has arrived.
  // 2. Auto-transition live exams to 'archive' when archiveTime has passed.
  useEffect(() => {
    const checkScheduledTransitions = async () => {
      const currentExams = examsRef.current;
      const now = new Date();

      for (const exam of currentExams) {
        // 1. If upcoming, check if explicit scheduled time set by admin has arrived (hours and minutes)
        if (exam.status === 'upcoming' && exam.isPublished !== false) {
          if (isScheduledLiveTimeReached(exam.startTime, (exam as any).examDateTime)) {
            try {
              await updateExamArchiveStatus(exam.id, 'live');
            } catch (err) {
              console.warn(`Error auto-transitioning exam ${exam.id} to live:`, err);
            }
          }
        }

        // 2. If live or scheduled, check if archiveTime has arrived
        if (exam.status !== 'archive' && exam.archiveTime) {
          const archDate = parseExamDate(exam.archiveTime);
          if (archDate && now >= archDate) {
            try {
              await updateExamArchiveStatus(exam.id, 'archive');
            } catch (err) {
              console.warn(`Error auto-archiving exam ${exam.id}:`, err);
            }
          }
        }
      }
    };

    const intervalTimer = setInterval(checkScheduledTransitions, 30000);
    return () => clearInterval(intervalTimer);
  }, []);

  // Global automatic Firestore -> Google Sheets real-time synchronization
  useEffect(() => {
    if (isGoogleConnected()) {
      const stop = startFirestoreRealtimeSheetsSync();
      return () => stop();
    }
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
          studentName: 'আরিফ হোসেন',
          studentEmail: 'arif@student.com',
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
          userId: 'student-2',
          studentId: 'student-2',
          studentName: 'তানজিলা রহমান',
          studentEmail: 'tanjila@student.com',
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
          userId: 'student-3',
          studentId: 'student-3',
          studentName: 'সাকিব আহমেদ',
          studentEmail: 'sakib@student.com',
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
        await setDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile, { merge: true });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
        } catch (e) {
          console.warn("Firestore save failed, proceeding with local profile update only.", e);
        }
      }
    }

    // Automatically sync student profile to Google Sheets
    try {
      syncStudentToGoogleSheets(updatedProfile).catch((err) => {
        console.warn("Google Sheets auto-sync for student caught:", err);
      });
    } catch (e) {}
  };

  const handleCreateExam = async (newExam: Exam) => {
    setExams(prev => {
      const exists = prev.some(e => e.id === newExam.id);
      if (exists) {
        return prev.map(e => e.id === newExam.id ? newExam : e);
      }
      return [newExam, ...prev];
    });
    try {
      await saveExamToFirestore(newExam, user?.uid || user?.id || 'admin');
    } catch (err) {
      console.warn("Failed to save exam to Firestore:", err);
    }

    // Automatically sync exam to Google Sheets
    try {
      syncExamToGoogleSheets(newExam).catch((err) => {
        console.warn("Google Sheets auto-sync for exam caught:", err);
      });
    } catch (e) {}
  };

  const handleUpdateExam = async (updatedExam: Exam) => {
    setExams(prev => prev.map(e => e.id === updatedExam.id ? updatedExam : e));
    try {
      await saveExamToFirestore(updatedExam, user?.uid || user?.id || 'admin');
    } catch (err) {
      console.warn("Failed to update exam in Firestore:", err);
    }

    // Automatically sync updated exam to Google Sheets
    try {
      syncExamToGoogleSheets(updatedExam).catch((err) => {
        console.warn("Google Sheets auto-sync for exam caught:", err);
      });
    } catch (e) {}
  };

  const handleDeleteExam = async (examId: string, examTitle?: string) => {
    const cleanTitle = (examTitle || '').trim().toLowerCase();
    setExams(prev => prev.filter(e => e.id !== examId && (!cleanTitle || e.title.trim().toLowerCase() !== cleanTitle)));
    setUpcomingExamSettings(prev => {
      if (!prev) return null;
      const isMatch = (it: any) => {
        if (!it) return false;
        if (examId && (it.examId === examId || it.id === examId)) return true;
        if (cleanTitle && it.title && it.title.trim().toLowerCase() === cleanTitle) return true;
        return false;
      };
      const items = Array.isArray(prev.items) ? prev.items.filter(it => !isMatch(it)) : [];
      if (items.length > 0) {
        const nextPrimary = items.find(it => it.isPublished !== false) || items[0];
        return {
          ...prev,
          ...nextPrimary,
          items,
        };
      }
      return null;
    });
    try {
      await deleteExamFromFirestore(examId);
      if (cleanTitle) {
        await deleteUpcomingExamFromFirestore(examId, cleanTitle);
        await deleteUpcomingExamFromSiteSettings(examId, cleanTitle);
      }
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
      // Subtle checkmark pop and celebration flare animation on successful Firestore save
      setSubmittedExamTitle(newResult.examTitle || '');
      setShowSubmitSuccess(true);
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

  // Synchronize React Router URL with App view and enforce Route Protection
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('pending_referral_code', ref.trim().toUpperCase());
    }

    const examIdParam = searchParams.get('examId');
    if (examIdParam && !selectedExam && exams.length > 0) {
      const foundExam = exams.find(e => e.id === examIdParam);
      if (foundExam) {
        setSelectedExam(foundExam);
      }
    }

    const matchedView = pathToView(location.pathname);

    // Protected Route: /profile requires authenticated user
    if (matchedView === 'profile' && !user) {
      setCurrentView('login');
      navigate('/login', { replace: true });
      return;
    }

    // Protected Route: /daily-practice requires authenticated user
    if (matchedView === 'daily-practice' && !user) {
      setCurrentView('login');
      navigate('/login', { replace: true });
      return;
    }

    // Protected Route: /wrong-questions requires authenticated user
    if (matchedView === 'wrong-questions' && !user) {
      setCurrentView('login');
      navigate('/login', { replace: true });
      return;
    }

    // Protected Route: /admin requires admin privileges
    if (matchedView === 'admin') {
      const isAdmin = user?.role === 'admin' && user?.email?.toLowerCase() === 'medha@admin.com';
      if (!isAdmin) {
        setCurrentView('home');
        navigate('/', { replace: true });
        return;
      }
    }

    // Route Guard: /exam requires selected exam
    if (matchedView === 'exam' && !selectedExam) {
      setCurrentView('home');
      navigate('/', { replace: true });
      return;
    }

    // Route Guard: /result requires selected result
    if (matchedView === 'result' && !selectedResult) {
      if (user) {
        setCurrentView('profile');
        navigate('/profile', { replace: true });
      } else {
        setCurrentView('home');
        navigate('/', { replace: true });
      }
      return;
    }

    setCurrentView(matchedView);
  }, [location.pathname, location.search, user, selectedExam, selectedResult, exams, navigate]);

  // Automatically scroll to the top on every page/view or route change
  useEffect(() => {
    // If navigating to a specific in-page anchor hash (e.g. #live-exams), scroll smoothly to that element
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    // Otherwise immediately scroll window and document to the top (0, 0)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentView, location.pathname]);

  const setView = (nextView: string) => {
    setCurrentView(nextView);
    const targetPath = viewToPath(nextView);
    if (location.pathname !== targetPath) {
      if (nextView === 'register') {
        const storedRef = localStorage.getItem('pending_referral_code');
        if (storedRef && !location.search.includes('ref=')) {
          navigate(`/registration?ref=${encodeURIComponent(storedRef)}`);
          return;
        }
      }
      navigate(targetPath);
    }
    // Instant scroll to top when changing view
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
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
      case 'daily-practice':
        return user ? (
          <DailyPracticeView
            user={user}
            exams={exams}
            setView={setView}
          />
        ) : (
          <LoginView onLoginSuccess={handleLoginSuccess} setView={setView} />
        );
      case 'wrong-questions':
        return user ? (
          <WrongQuestionView
            user={user}
            setView={setView}
            onExamSubmit={handleExamSubmit}
          />
        ) : (
          <LoginView onLoginSuccess={handleLoginSuccess} setView={setView} />
        );
      case 'study-materials':
        return (
          <StudyMaterialsView user={user} setView={setView} />
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
          <ResultView result={selectedResult} setView={setView} user={user} exams={exams} />
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
      case 'referral':
        return user ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🎁 রেফারেল ও রিওয়ার্ড ড্যাশবোর্ড</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  বন্ধুদের সাথে আপনার রেফারেল কোড শেয়ার করে আকর্ষণীয় বোনাস ও রিওয়ার্ড উপভোগ করুন।
                </p>
              </div>
              <button
                onClick={() => setView('home')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                ← হোমে ফিরুন
              </button>
            </div>
            <ReferralDashboard user={user} />
          </div>
        ) : (
          <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-sm border border-amber-500/20">
              🎁
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">মেধা এক্সাম রেফারেল প্রোগ্রাম</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                আপনার রেফারেল কোড, অর্জিত পয়েন্ট এবং রেফারেল লিস্ট দেখার জন্য অনুগ্রহ করে লগইন করুন।
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setView('login')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                লগইন করুন
              </button>
              <button
                onClick={() => setView('register')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all cursor-pointer"
              >
                নতুন অ্যাকাউন্ট তৈরি করুন
              </button>
            </div>
          </div>
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
      case 'privacy-policy':
        return <PrivacyPolicyView setView={setView} />;
      case 'terms-and-conditions':
        return <TermsAndConditionsView setView={setView} />;
      case 'delete-account':
        return <DeleteAccountView user={user} setView={setView} onLogout={handleLogout} />;
      case 'faq':
        return <FaqSection isStandAlone={true} setView={setView} />;
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
      {/* Subtle Success Celebration Animation on Firestore Submit */}
      <SubmissionSuccessAnimation
        show={showSubmitSuccess}
        onClose={() => setShowSubmitSuccess(false)}
        examTitle={submittedExamTitle}
      />

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

      {/* Floating 1-Tap Notification Permission Prompt for unregistered devices */}
      <NotificationPromptBanner user={user} />
    </div>
  );
}
