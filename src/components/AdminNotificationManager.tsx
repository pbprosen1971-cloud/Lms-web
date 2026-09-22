import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Megaphone, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Radio, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Layers, 
  Eye, 
  RefreshCw 
} from 'lucide-react';
import { BroadcastNotification, BannerNoticeSettings } from '../types';
import { 
  sendBroadcastNotification, 
  subscribeToNotifications, 
  deleteNotification, 
  getFCMTokenCount,
  subscribeToBannerNotice,
  saveBannerNotice,
  sendLocalTestNotification,
  DEFAULT_BANNER_NOTICE 
} from '../services/notificationService';
import { formatBanglaDateTime } from '../lib/dateUtils';
import MedhaLogo from './MedhaLogo';

interface AdminNotificationManagerProps {
  currentUser?: { uid: string; email?: string } | null;
}

export const AdminNotificationManager: React.FC<AdminNotificationManagerProps> = ({
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'send_push' | 'notice_marquee' | 'history'>('send_push');

  // Push Notification Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('#featured-exams');
  const [tag, setTag] = useState('পরীক্ষার নোটিশ');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Device Tokens Count
  const [tokenCount, setTokenCount] = useState<number>(0);

  // Notifications History
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);

  // Banner Notice State
  const [bannerNotice, setBannerNotice] = useState<BannerNoticeSettings>(DEFAULT_BANNER_NOTICE);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [noticeSaveSuccess, setNoticeSaveSuccess] = useState(false);

  useEffect(() => {
    // Load device token count
    getFCMTokenCount().then(setTokenCount);

    // Subscribe to notifications history
    const unsubNotifs = subscribeToNotifications((list) => {
      setNotifications(list);
    });

    // Subscribe to banner notice
    const unsubNotice = subscribeToBannerNotice((data) => {
      setBannerNotice(data);
    });

    return () => {
      unsubNotifs();
      unsubNotice();
    };
  }, []);

  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [localTestStatus, setLocalTestStatus] = useState<string | null>(null);

  const handleRefreshCount = async () => {
    const count = await getFCMTokenCount();
    setTokenCount(count);
  };

  const handleTestNotification = async () => {
    setIsTestingLocal(true);
    setLocalTestStatus(null);
    try {
      const ok = await sendLocalTestNotification();
      if (ok) {
        setLocalTestStatus('টেস্ট নোটিফিকেশন সফলভাবে আপনার ডিভাইসে পাঠানো হয়েছে!');
      } else {
        setLocalTestStatus('ডিভাইসে নোটিফিকেশন পারমিশন দেওয়া নেই বা ব্রাউজারে ব্লক করা আছে।');
      }
    } catch (e: any) {
      setLocalTestStatus(e?.message || 'টেস্ট নোটিফিকেশন পাঠানো যায়নি।');
    } finally {
      setIsTestingLocal(false);
      setTimeout(() => setLocalTestStatus(null), 6000);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setSendError('অনুগ্রহ করে নোটিফিকেশনের শিরোনাম এবং বার্তা লিখুন।');
      return;
    }

    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const res = await sendBroadcastNotification({
        title: title.trim(),
        body: body.trim(),
        url: url.trim(),
        tag,
        sentBy: currentUser?.email || 'Admin'
      });

      if (res.success) {
        const devCount = res.recipientCount ?? tokenCount;
        const msg = res.fcmDelivered && res.fcmDelivered > 0
          ? `নোটিফিকেশন সফলভাবে ব্রডকাস্ট হয়েছে! (${res.fcmDelivered}টি ডিভাইসে পুশ এবং অন্যান্য সকল ডিভাইসে রিয়েল-টাইমে পৌঁছাবে)`
          : `নোটিফিকেশন ডাটাবেজে সংরক্ষিত হয়েছে এবং ${devCount > 0 ? devCount + 'টি নিবন্ধিত ডিভাইস সহ' : ''} সকল সক্রিয় ডিভাইসে রিয়েল-টাইমে ব্রডকাস্ট হয়েছে!`;
        setSendSuccess(msg);
        setTitle('');
        setBody('');
        setUrl('#featured-exams');
        handleRefreshCount();
      } else {
        setSendError(res.error || 'নোটিফিকেশন পাঠানো সম্ভব হয়নি।');
      }
    } catch (err: any) {
      setSendError(err?.message || 'নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteNotif = async (id?: string) => {
    if (!id) return;
    if (window.confirm('আপনি কি এই নোটিফিকেশনটি মুছে ফেলতে চান?')) {
      await deleteNotification(id);
    }
  };

  const handleSaveBannerNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotice(true);
    setNoticeSaveSuccess(false);

    try {
      const res = await saveBannerNotice(bannerNotice);
      if (res.success) {
        setNoticeSaveSuccess(true);
        setTimeout(() => setNoticeSaveSuccess(false), 3000);
      } else {
        alert(res.error || 'নোটিশ সংরক্ষণ করা যায়নি।');
      }
    } catch (err: any) {
      alert(err?.message || 'সমস্যা হয়েছে।');
    } finally {
      setIsSavingNotice(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Tab Navigation */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-emerald-200" />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                নোটিফিকেশন ও হোম পেজ নোটিশ কন্ট্রোল
              </h2>
            </div>
            <p className="text-sm text-emerald-100/90 max-w-xl">
              ওয়েবসাইট থেকে সরাসরি সকল পরীক্ষার্থীকে পুশ নোটিফিকেশন পাঠান এবং হোম পেজের হেডারের নিচে আধুনিক স্ক্রলিং নোটিশ পরিচালনা করুন।
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 self-start md:self-auto">
            <Radio className="h-4 w-4 text-emerald-300 animate-pulse" />
            <div className="text-xs">
              <span className="text-emerald-100">নিবন্ধিত ডিভাইস: </span>
              <strong className="text-white font-extrabold text-sm">{tokenCount} টি</strong>
            </div>
            <button
              onClick={handleRefreshCount}
              title="রিফ্রেশ করুন"
              className="p-1 hover:bg-white/20 rounded-lg transition-colors ml-1"
            >
              <RefreshCw className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('send_push')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'send_push'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>পুশ নোটিফিকেশন পাঠান</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notice_marquee')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'notice_marquee'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Megaphone className="h-4 w-4" />
          <span>হোম পেজ স্ক্রলিং নোটিশ (Marquee)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeSubTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>নোটিফিকেশন হিস্ট্রি ({notifications.length})</span>
        </button>
      </div>

      {/* TAB 1: SEND PUSH NOTIFICATION */}
      {activeSubTab === 'send_push' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                নতুন পুশ নোটিফিকেশন তৈরি করুন
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                এই বার্তাটি সকল নিবন্ধিত শিক্ষার্থী এবং ব্রাউজারে রিয়েল-টাইম পুশ নোটিফিকেশন হিসেবে পৌঁছে যাবে।
              </p>
            </div>

            {sendSuccess && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium animate-fadeIn">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{sendSuccess}</span>
              </div>
            )}

            {sendError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2 font-medium animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    নোটিফিকেশনের ধরন (Tag)
                  </label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="পরীক্ষার নোটিশ">পরীক্ষার নোটিশ (Exam Notice)</option>
                    <option value="ফলাফল প্রকাশ">ফলাফল প্রকাশ (Result Published)</option>
                    <option value="লাইভ পরীক্ষা">লাইভ পরীক্ষা শুরু (Live Exam)</option>
                    <option value="জরুরি বিজ্ঞপ্তি">জরুরি বিজ্ঞপ্তি (Urgent Alert)</option>
                    <option value="সাধারণ নোটিশ">সাধারণ নোটিশ (General Notice)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ক্লিক অ্যাকশন লিঙ্ক (Target URL)
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="#featured-exams বা নির্দিষ্ট লিঙ্ক"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নোটিফিকেশন শিরোনাম (Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: ৪৬তম বিসিএস স্পেশাল মডেল টেস্ট এখন লাইভ!"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বিস্তারিত বার্তা (Message Body) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="যেমন: আজকের পরীক্ষায় অংশগ্রহণ করে নিজের প্রস্তুতি যাচাই করুন এবং তাৎক্ষণিক লিডারবোর্ড রেজাল্ট দেখুন।"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Firebase Cloud Messaging ও রিয়েল-টাইম ব্রডকাস্ট চ্যানেলে পাঠানো হবে।
                </span>
                <button
                  type="submit"
                  disabled={isSending || !title.trim() || !body.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSending ? 'পাঠানো হচ্ছে...' : 'নোটিফিকেশন পাঠান'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Mobile Notification Preview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  লাইভ প্রিভিউ (Device Banner)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">এখনই</span>
              </div>

              {/* Notification Mockup Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                    <MedhaLogo className="w-full h-full" withBackground={true} />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    মেধা এক্সাম পোর্টাল
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold ml-auto">
                    {tag}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {title || 'নোটিফিকেশনের শিরোনাম এখানে দেখা যাবে'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 mt-0.5">
                      {body || 'বিস্তারিত বার্তার লেখা এখানে প্রদর্শিত হবে...'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs border border-emerald-500/20 bg-emerald-50 dark:bg-slate-800 flex items-center justify-center p-0.5">
                    <MedhaLogo className="w-full h-full" withBackground={true} />
                  </div>
                </div>
                {url && (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 pt-0.5">
                    <span>ক্লিক করুন: {url}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <p>• ব্রাউজারে নোটিফিকেশন এলাউ করা থাকলে ব্যাকগ্রাউন্ডেও যাবে।</p>
                <p>• ওয়েবসাইটে সক্রিয় সকল শিক্ষার্থীদের স্ক্রিনে তৎক্ষণাৎ অফিসিয়াল লোগো সহ পপআপ হবে।</p>
              </div>

              {/* Test Notification to Current Device */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTestingLocal}
                  className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isTestingLocal ? 'পাঠানো হচ্ছে...' : 'এই ডিভাইসে টেস্ট নোটিফিকেশন পাঠান'}</span>
                </button>
                {localTestStatus && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium text-center mt-2 animate-fadeIn">
                    {localTestStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Other Devices Delivery Guidance Box */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-4 text-xs space-y-2 text-emerald-900 dark:text-emerald-200">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <Radio className="h-3.5 w-3.5" />
                <span>অন্যান্য ডিভাইসে পৌঁছানোর নিয়ম:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-emerald-800/90 dark:text-emerald-200/90 list-disc list-inside">
                <li>
                  <strong>অনুমতি নিশ্চিত করুন:</strong> অন্য ডিভাইসের ব্রাউজারে (মোবাইল বা পিসি) অন্তত একবার সাইটে ঢুকে 'নোটিফিকেশন চালু করুন' বাটনে ক্লিক করে <strong>Allow</strong> করতে হবে।
                </li>
                <li>
                  <strong>রিয়েল-টাইম সিঙ্ক:</strong> সাইট মিনিমাইজ বা ব্যাকগ্রাউন্ড ট্যাবে থাকলেও আমাদের ফায়ারস্টোর ব্রডকাস্টার নতুন নোটিফিকেশন আসামাত্র স্ক্রিনে পপ-আপ দিয়ে দেয়।
                </li>
                <li>
                  <strong>ব্রাউজার সেটিংস:</strong> ফোনে Battery Saver মোড বা ব্রাউজারের Do Not Disturb চালু থাকলে নোটিফিকেশন আটকে যেতে পারে।
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOME PAGE HORIZONTAL SCROLLING NOTICE MARQUEE */}
      {activeSubTab === 'notice_marquee' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                হোম পেজ হেডার নোটিশ স্ক্রলার সেটিংস
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                হোম পেজে হেডারের নিচে আধুনিক ডিজাইনে টেক্সট অনুভূমিকভাবে (ডান থেকে বামে) স্ক্রল হবে।
              </p>
            </div>

            {noticeSaveSuccess && (
              <div className="p-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>সফলভাবে সেভ হয়েছে!</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSaveBannerNotice} className="space-y-5">
            {/* Toggle Notice Active */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  হোম পেজে নোটিশ স্ক্রলার চালু রাখুন
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  বন্ধ রাখলে হোম পেজের হেডারের নিচের নোটিশ বারটি স্বয়ংক্রিয়ভাবে লুকিয়ে থাকবে।
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bannerNotice.enabled}
                  onChange={(e) => setBannerNotice({ ...bannerNotice, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নোটিশ ব্যাজ শিরোনাম (Left Badge Text)
                </label>
                <input
                  type="text"
                  value={bannerNotice.badgeText}
                  onChange={(e) => setBannerNotice({ ...bannerNotice, badgeText: e.target.value })}
                  placeholder="যেমন: 📢 বিশেষ বিজ্ঞপ্তি"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  স্ক্রল স্পিড (Scroll Speed)
                </label>
                <select
                  value={bannerNotice.speed || 'normal'}
                  onChange={(e) => setBannerNotice({ ...bannerNotice, speed: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="slow">ধীর গতি (Slow - বড় লেখার জন্য উত্তম)</option>
                  <option value="normal">স্বাভাবিক গতি (Normal - স্ট্যান্ডার্ড)</option>
                  <option value="fast">দ্রুত গতি (Fast)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                স্ক্রলিং নোটিশের সম্পূর্ণ টেক্সট (Notice Text) <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={bannerNotice.text}
                onChange={(e) => setBannerNotice({ ...bannerNotice, text: e.target.value })}
                placeholder="যেমন: সকল পরীক্ষার্থীদের জন্য সুখবর! মেধা এক্সাম পোর্টালে যুক্ত হয়েছে বিসিএস ও প্রাইমারি নিয়োগ পরীক্ষার নতুন লাইভ মডেল টেস্ট..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium leading-relaxed focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                টেক্সটের উপর মাউস হোভার করলে স্ক্রলিং স্বয়ংক্রিয়ভাবে থেমে থাকবে যাতে সহজে পড়া যায়।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ঐচ্ছিক অ্যাকশন লিঙ্ক (Optional Link)
              </label>
              <input
                type="text"
                value={bannerNotice.linkUrl || ''}
                onChange={(e) => setBannerNotice({ ...bannerNotice, linkUrl: e.target.value })}
                placeholder="যেমন: #featured-exams বা কোনো স্পেসিফিক পেজের লিঙ্ক"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Real-time Preview in Admin */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                লাইভ নোটিশ কার্ড প্রিভিউ (হোম পেজে যেভাবে দেখাবে)
              </span>

              <div className="rounded-2xl bg-gradient-to-r from-emerald-50/95 via-teal-50/90 to-cyan-50/90 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-900/90 border border-emerald-300/80 dark:border-emerald-500/30 p-2 sm:p-2.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-xs select-none">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    <Megaphone className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{bannerNotice.badgeText || 'বিজ্ঞপ্তি'}</span>
                  </div>

                  <div className="flex-1 overflow-hidden relative marquee-container flex items-center min-w-0 h-6">
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-emerald-50/95 dark:from-slate-900 to-transparent z-10" />
                    <div className={`inline-block whitespace-nowrap font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm ${
                      bannerNotice.speed === 'slow' ? 'animate-marquee-slow' : bannerNotice.speed === 'fast' ? 'animate-marquee-fast' : 'animate-marquee-normal'
                    }`}>
                      <span>{bannerNotice.text}</span>
                    </div>
                    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-cyan-50/90 dark:from-slate-900 to-transparent z-10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSavingNotice}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingNotice ? 'সংরক্ষণ করা হচ্ছে...' : 'হোম পেজ নোটিশ আপডেট করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: NOTIFICATION HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              পূর্বে প্রেরিত নোটিফিকেশন সমূহ ({notifications.length})
            </h3>
            <span className="text-xs text-slate-400">সর্বশেষ প্রেরিত তালিকা</span>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              এখনও কোনো নোটিফিকেশন পাঠানো হয়নি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
              {notifications.map((notif) => (
                <div key={notif.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        {notif.tag || 'নোটিশ'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {notif.createdAt ? formatBanglaDateTime(notif.createdAt) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {notif.body}
                    </p>
                    {notif.url && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        লিঙ্ক: {notif.url}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] text-slate-400">
                      প্রাপক: <strong>{notif.recipientCount || 0}</strong>
                    </span>
                    <button
                      onClick={() => handleDeleteNotif(notif.id)}
                      title="মুছে ফেলুন"
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AdminNotificationManager;
