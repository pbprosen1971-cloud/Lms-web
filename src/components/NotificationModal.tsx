import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  CheckCircle, 
  X, 
  ExternalLink, 
  AlertCircle, 
  Sparkles, 
  CheckCheck, 
  ChevronLeft, 
  ChevronRight, 
  Radio, 
  Award, 
  Inbox,
  Filter
} from 'lucide-react';
import { BroadcastNotification } from '../types';
import { 
  subscribeToNotifications, 
  requestAndSaveNotificationToken, 
  getNotificationPermission 
} from '../services/notificationService';
import { formatBanglaDateTime, toBengaliDigits } from '../lib/dateUtils';
import MedhaLogo from './MedhaLogo';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { uid: string; email?: string } | null;
  onNavigate?: (url: string) => void;
}

const READ_STORAGE_KEY = 'medha_read_notifications';

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
  
  // Categorization & Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'exam' | 'result' | 'unread'>('all');
  
  // Pagination state (4 items per page so user isn't overwhelmed)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 4;

  // Read status tracking
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(READ_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined') {
      setPermission(getNotificationPermission());
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  // Save read status to localStorage and dispatch event for Navbar badge sync
  const markAsRead = (id?: string) => {
    if (!id || readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('medha_notifications_read_updated'));
    } catch {}
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id).filter((id): id is string => Boolean(id));
    const merged = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(merged);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event('medha_notifications_read_updated'));
    } catch {}
  };

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
    markAsRead(item.id);
    if (item.url && item.url.trim()) {
      const cleanUrl = item.url.trim();
      if (cleanUrl.startsWith('#') || cleanUrl.startsWith('/#')) {
        const hash = cleanUrl.startsWith('/#') ? cleanUrl.slice(1) : cleanUrl;
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.hash = hash;
        }
        onClose();
      } else if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      } else if (onNavigate) {
        onNavigate(cleanUrl);
        onClose();
      } else {
        window.location.href = cleanUrl;
      }
    }
  };

  // Notification categorization logic
  const isExam = (item: BroadcastNotification) => {
    const text = `${item.title} ${item.body} ${item.tag || ''}`.toLowerCase();
    return text.includes('পরীক্ষা') || text.includes('exam') || text.includes('লাইভ') || text.includes('bcs') || text.includes('ব্যাংক') || text.includes('প্রাইমারি');
  };

  const isResult = (item: BroadcastNotification) => {
    const text = `${item.title} ${item.body} ${item.tag || ''}`.toLowerCase();
    return text.includes('ফলাফল') || text.includes('result') || text.includes('মেরিট') || text.includes('রোল') || text.includes('কৃতকার্য') || text.includes('পাস');
  };

  // Counts
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.id && !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const examCount = useMemo(() => {
    return notifications.filter(isExam).length;
  }, [notifications]);

  const resultCount = useMemo(() => {
    return notifications.filter(n => !isExam(n) && (isResult(n) || n.tag === 'result')).length;
  }, [notifications]);

  // Filtered notifications based on tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'exam':
        return notifications.filter(isExam);
      case 'result':
        return notifications.filter(n => !isExam(n) && (isResult(n) || n.tag === 'result'));
      case 'unread':
        return notifications.filter(n => n.id && !readIds.includes(n.id));
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, activeTab, readIds]);

  // Reset to page 1 whenever tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-hidden transition-all duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[82vh] overflow-hidden my-auto animate-scaleUp text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Stays crisp and accessible at the top */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-emerald-600/20 shrink-0 flex items-center justify-center ring-1 ring-emerald-500/20">
              <MedhaLogo className="w-full h-full" withBackground={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="notification-center-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  নোটিফিকেশন সেন্টার
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-xs">
                    {toBengaliDigits(unreadCount)} নতুন
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                লাইভ পরীক্ষা, চাকরি পরীক্ষার ফলাফল ও নোটিশ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                title="সবগুলো পঠিত হিসেবে চিহ্নিত করুন"
                className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>সব পঠিত</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notification center"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Push Notification Permission Box (Compact & Non-intrusive) */}
        {permission !== 'granted' && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
            {permission === 'denied' ? (
              <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 rounded-xl p-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">নোটিফিকেশন ব্লক করা রয়েছে</p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                    ব্রাউজার সাইট সেটিংস থেকে নোটিফিকেশন Allow বা অনুমতি দিন।
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      লাইভ পরীক্ষার নোটিফিকেশন পান সবার আগে
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ব্রাউজারে সরাসরি পুশ নোটিফিকেশন রিসিভ করুন
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={isSubscribing}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs transition-all shrink-0 disabled:opacity-50"
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
        )}

        {/* Tab Filters - Eliminates all notifications appearing in one unorganized dump */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>সকল</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {toBengaliDigits(notifications.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exam')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'exam'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-current" />
            <span>লাইভ পরীক্ষা</span>
            {examCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'exam' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {toBengaliDigits(examCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('result')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'result'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-current" />
            <span>ফলাফল ও অন্যান্য</span>
            {resultCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'result' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {toBengaliDigits(resultCount)}
              </span>
            )}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <span>অপঠিত</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'unread' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
              }`}>
                {toBengaliDigits(unreadCount)}
              </span>
            </button>
          )}

          {/* Mobile "Mark all as read" shortcut inside tabs row */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="sm:hidden ml-auto text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 px-2 py-1"
            >
              সব পঠিত
            </button>
          )}
        </div>

        {/* Notification List Body - Properly bounded and scrollable without viewport leakage */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-2.5">
          {paginatedItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Inbox className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {activeTab === 'unread'
                  ? 'সব নোটিফিকেশন পড়া সম্পন্ন হয়েছে!'
                  : 'এই ক্যাটাগরিতে কোনো নোটিফিকেশন নেই'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                নতুন লাইভ পরীক্ষা বা গুরুত্বপূর্ণ বিজ্ঞপ্তি প্রকাশিত হলে সাথে সাথে এখানে পাবেন।
              </p>
              {activeTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  সকল নোটিফিকেশন দেখুন
                </button>
              )}
            </div>
          ) : (
            paginatedItems.map((item) => {
              const isItemUnread = item.id ? !readIds.includes(item.id) : false;
              const isExamItem = isExam(item);
              const isResultItem = isResult(item);

              return (
                <div
                  key={item.id || item.title + item.createdAt}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isItemUnread
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs hover:border-emerald-500'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Visual Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 mt-0.5 ${
                      isExamItem 
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' 
                        : isResultItem
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isExamItem ? (
                        <Radio className="w-5 h-5" />
                      ) : isResultItem ? (
                        <Award className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs sm:text-sm font-bold leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${
                            isItemUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {item.title}
                          </h4>
                          {isItemUnread && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              নতুন
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap pt-0.5">
                          {item.createdAt ? formatBanglaDateTime(item.createdAt) : ''}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                        {item.body}
                      </p>

                      {/* Optional Interactive Link Action */}
                      {item.url && item.url !== '/' && (
                        <div className="pt-1.5 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                          <span>
                            {isExamItem ? 'লাইভ পরীক্ষায় অংশ নিন' : isResultItem ? 'ফলাফল দেখুন' : 'বিস্তারিত দেখুন'}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar - Directly solves "সব নোটিফেকশান একসাথে দেখা যায়" */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              পৃষ্ঠা {toBengaliDigits(currentPage)} এর {toBengaliDigits(totalPages)}
              <span className="hidden sm:inline"> (মোট {toBengaliDigits(filteredNotifications.length)}টি)</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Show first, last, and pages near current
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  Math.abs(pageNum - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {toBengaliDigits(pageNum)}
                    </button>
                  );
                }
                if (
                  (pageNum === 2 && currentPage > 3) ||
                  (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  return (
                    <span key={pageNum} className="text-slate-400 text-xs px-0.5">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>সর্বমোট {toBengaliDigits(notifications.length)} টি নোটিফিকেশন</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors active:scale-95"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default NotificationModal;
