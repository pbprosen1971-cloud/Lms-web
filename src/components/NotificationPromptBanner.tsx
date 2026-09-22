import React, { useState, useEffect } from 'react';
import { Bell, X, Check, ShieldCheck } from 'lucide-react';
import { 
  isPushNotificationSupported, 
  getNotificationPermission, 
  requestAndSaveNotificationToken 
} from '../services/notificationService';
import MedhaLogo from './MedhaLogo';
import { UserProfile } from '../types';

interface NotificationPromptBannerProps {
  user: UserProfile | null;
}

export const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = ({ user }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    // Only show if push is supported and permission is 'default' (not yet decided)
    if (!isPushNotificationSupported()) return;

    const currentPermission = getNotificationPermission();
    if (currentPermission !== 'default') return;

    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem('medha_notif_prompt_dismissed');
      if (dismissed === 'true') return;
    } catch (e) {}

    // Slight delay so it doesn't interrupt immediate initial page rendering
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('medha_notif_prompt_dismissed', 'true');
    } catch (e) {}
  };

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const res = await requestAndSaveNotificationToken(user);
      if (res.success) {
        setSuccessMessage(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 2200);
      } else {
        handleDismiss();
      }
    } catch (e) {
      handleDismiss();
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      id="notification-prompt-banner"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-fadeIn transition-all duration-300 pointer-events-auto"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-4 shadow-xl shadow-emerald-950/15 space-y-3">
        {successMessage ? (
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 py-1 font-bold text-xs">
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span>ধন্যবাদ! এই ডিভাইসে নোটিফিকেশন সক্রিয় করা হয়েছে।</span>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-emerald-500/20 bg-emerald-50 dark:bg-slate-800 flex items-center justify-center p-0.5 shrink-0 mt-0.5">
                <MedhaLogo className="w-full h-full" withBackground={true} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    পরীক্ষার নোটিফিকেশন পেতে চান?
                  </h4>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                  লাইভ পরীক্ষা, নতুন রুটিন ও রেজাল্ট প্রকাশের সাথে সাথে নোটিফিকেশন পেতে চালু করুন।
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                পরে
              </button>
              <button
                onClick={handleEnable}
                disabled={isSubscribing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>{isSubscribing ? 'চালু হচ্ছে...' : 'অনুমতি দিন (Allow)'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationPromptBanner;
