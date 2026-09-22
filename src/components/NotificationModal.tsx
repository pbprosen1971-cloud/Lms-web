import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle, X, ExternalLink, ShieldCheck, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { BroadcastNotification } from '../types';
import { 
  subscribeToNotifications, 
  requestAndSaveNotificationToken, 
  getNotificationPermission,
  isPushNotificationSupported 
} from '../services/notificationService';
import { formatBanglaDateTime } from '../lib/dateUtils';
import MedhaLogo from './MedhaLogo';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { uid: string; email?: string } | null;
  onNavigate?: (url: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeMessage, setSubscribeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setSubscribeMessage(null);
    try {
      const res = await requestAndSaveNotificationToken(currentUser);
      if (res.success) {
        setPermission('granted');
        setSubscribeMessage({
          type: 'success',
          text: 'অভিনন্দন! পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে।'
        });
      } else {
        setSubscribeMessage({
          type: 'error',
          text: res.error || 'নোটিফিকেশন সক্রিয় করা সম্ভব হয়নি।'
        });
      }
    } catch (err: any) {
      setSubscribeMessage({
        type: 'error',
        text: err?.message || 'সমস্যা হয়েছে, অনুগ্রহ করে ব্রাউজার পারমিশন চেক করুন।'
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleItemClick = (item: BroadcastNotification) => {
    if (item.url) {
      if (item.url.startsWith('#')) {
        const el = document.querySelector(item.url);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        onClose();
      } else if (onNavigate) {
        onNavigate(item.url);
        onClose();
      } else {
        window.location.href = item.url;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-emerald-600/25 shrink-0 flex items-center justify-center">
              <MedhaLogo className="w-full h-full" withBackground={true} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                নোটিফিকেশন সেন্টার
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                পরীক্ষা, ফলাফল ও গুরুত্বপূর্ণ আপডেট
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Push Notification Permission Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
          {permission === 'granted' ? (
            <div className="flex items-center justify-between gap-3 text-xs bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>পুশ নোটিফিকেশন সক্রিয় রয়েছে (ডিভাইস নিবন্ধিত)</span>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                Active
              </span>
            </div>
          ) : permission === 'denied' ? (
            <div className="flex items-start gap-2.5 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">নোটিফিকেশন ব্লক করা রয়েছে</p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                  ব্রাউজার সাইট সেটিংস থেকে নোটিফিকেশন Allow বা অনুমতি দিন।
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    নতুন পরীক্ষার নোটিফিকেশন পান সবার আগে
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ব্রাউজারে সরাসরি পুশ নোটিফিকেশন রিসিভ করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isSubscribing}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all shrink-0 disabled:opacity-50"
                >
                  {isSubscribing ? 'চালু হচ্ছে...' : 'অনুমতি দিন'}
                </button>
              </div>
              {subscribeMessage && (
                <p className={`text-[11px] font-medium ${subscribeMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {subscribeMessage.text}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Notification List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                কোনো নতুন নোটিফিকেশন নেই
              </p>
              <p className="text-xs text-slate-400">
                নতুন পরীক্ষা বা আপডেট এলে এখানে দেখা যাবে।
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="pt-3 first:pt-0 cursor-pointer group transition-colors"
              >
                <div className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-xs border border-emerald-500/20 bg-emerald-50 dark:bg-slate-800 flex items-center justify-center p-0.5 mt-0.5">
                    <MedhaLogo className="w-full h-full" withBackground={true} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                        {item.createdAt ? formatBanglaDateTime(item.createdAt) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.body}
                    </p>
                    {item.url && item.url !== '/' && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                        <span>বিস্তারিত দেখুন</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>মোট {notifications.length} টি নোটিফিকেশন</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotificationModal;
