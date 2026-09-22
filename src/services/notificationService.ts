import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BroadcastNotification, BannerNoticeSettings } from '../types';

// VAPID Public Key provided for Firebase Cloud Messaging
export const FCM_VAPID_KEY = 'BNHEPtN6xQGJFBxIEdzdNWKgnMwxf-tiziTNO1H51xNLXRf5qG6E21vGMsfc4FH2JzoU5CttO7BdyHRc22yzXvA';

let messagingInstance: Messaging | null = null;

/**
 * Initializes and retrieves Firebase Messaging instance safely
 */
export async function getMessagingSafely(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging();
      return messagingInstance;
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser environment:', err);
  }
  return null;
}

/**
 * Check if the browser supports notifications and service worker
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission and register FCM device token
 */
export async function requestAndSaveNotificationToken(
  currentUser?: { uid: string; email?: string } | null
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'আপনার ব্রাউজার পুশ নোটিফিকেশন সমর্থন করে না।' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'নোটিফিকেশনের অনুমতি প্রদান করা হয়নি।' };
    }

    // Register Firebase Messaging Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    const messaging = await getMessagingSafely();
    if (!messaging) {
      return { success: false, error: 'মেসেজিং সার্ভিস আরম্ভ করা সম্ভব হয়নি।' };
    }

    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      // Ensure safe document ID without forward slashes (which cause Firestore path errors)
      const safeTokenId = encodeURIComponent(token).replace(/%/g, '_');
      const tokenRef = doc(db, 'fcmTokens', safeTokenId);

      await setDoc(tokenRef, {
        token,
        tokenId: safeTokenId,
        userId: currentUser?.uid || 'guest',
        userEmail: currentUser?.email || 'unauthenticated',
        userAgent: navigator.userAgent,
        platform: navigator.platform || 'web',
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Cache locally
      try {
        localStorage.setItem('medha_fcm_token', token);
      } catch (e) {}

      return { success: true, token };
    }

    return { success: false, error: 'FCM টোকেন তৈরি করা যায়নি।' };
  } catch (err: any) {
    console.error('Error registering FCM token:', err);
    return { success: false, error: err?.message || 'নোটিফিকেশন সক্রিয় করতে সমস্যা হয়েছে।' };
  }
}

/**
 * Listen to foreground push notifications
 */
export async function setupForegroundMessageListener(
  onNotificationReceived: (payload: { title: string; body: string; url?: string }) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingSafely();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'মেধা এক্সাম নোটিফিকেশন';
    const body = payload.notification?.body || payload.data?.body || '';
    const url = payload.data?.url || payload.data?.click_action || (payload.notification as any)?.click_action || '/';

    // Show native browser notification if allowed and tab is focused/visible
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/logo.svg',
          data: { url }
        });
      } catch (e) {}
    }

    onNotificationReceived({ title, body, url });
  });
}

/**
 * Synchronize current device token on app startup or auth state change
 */
export async function syncCurrentDeviceToken(
  currentUser?: { uid: string; email?: string } | null
): Promise<void> {
  if (!isPushNotificationSupported()) return;
  if (getNotificationPermission() !== 'granted') return;

  try {
    await requestAndSaveNotificationToken(currentUser);
  } catch (err) {
    console.debug('FCM device token sync skipped:', err);
  }
}

/**
 * Send a broadcast notification from Admin Panel
 */
export async function sendBroadcastNotification(data: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  sentBy?: string;
}): Promise<{ 
  success: boolean; 
  id?: string; 
  recipientCount?: number; 
  fcmDelivered?: number;
  message?: string;
  error?: string 
}> {
  try {
    // 1. Get all registered device tokens from Firestore
    let tokens: string[] = [];
    try {
      const tokensSnap = await getDocs(collection(db, 'fcmTokens'));
      tokens = tokensSnap.docs
        .map(d => d.data().token)
        .filter((t): t is string => typeof t === 'string' && t.length > 10);
    } catch (e) {
      console.warn('Could not read fcmTokens from Firestore:', e);
    }

    const recipientCount = tokens.length;

    // 2. Save notification to Firestore broadcast collection
    const notifRef = await addDoc(collection(db, 'notifications'), {
      title: data.title.trim(),
      body: data.body.trim(),
      url: data.url?.trim() || '/',
      tag: data.tag || 'general',
      sentBy: data.sentBy || 'Admin',
      recipientCount,
      createdAt: new Date().toISOString()
    });

    // 3. Trigger backend server notification dispatcher with tokens
    let fcmDelivered = 0;
    let serverMessage = '';
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title.trim(),
          body: data.body.trim(),
          url: data.url?.trim() || '/',
          tag: data.tag || 'general',
          tokens
        })
      });
      if (response.ok) {
        const resData = await response.json();
        fcmDelivered = resData.deliveredToTokens || 0;
        serverMessage = resData.message || '';
      }
    } catch (e) {
      console.warn('Backend notification trigger completed with fallback:', e);
    }

    return { 
      success: true, 
      id: notifRef.id, 
      recipientCount, 
      fcmDelivered,
      message: serverMessage 
    };
  } catch (err: any) {
    console.error('Error sending broadcast notification:', err);
    return { success: false, error: err?.message || 'নোটিফিকেশন পাঠানো যায়নি।' };
  }
}

/**
 * Global real-time listener for incoming broadcast notifications.
 * Automatically displays native OS/browser push notification on all online devices
 * when a new notification document is saved in Firestore.
 */
let isGlobalWatcherActive = false;
export function setupGlobalRealtimeNotificationWatcher(
  onNewNotification?: (notif: BroadcastNotification) => void
): () => void {
  if (isGlobalWatcherActive) return () => {};
  isGlobalWatcherActive = true;

  const appStartTime = Date.now();
  const processedNotifIds = new Set<string>();

  const notifQuery = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  const unsubscribe = onSnapshot(
    notifQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          if (processedNotifIds.has(docId)) return;
          processedNotifIds.add(docId);

          const data = change.doc.data();
          const createdAtMs = data.createdAt ? new Date(data.createdAt).getTime() : 0;

          // Only trigger popup for fresh notifications created after app mounted (or within last 3 mins)
          if (createdAtMs > appStartTime - 180000) {
            const notifItem: BroadcastNotification = {
              id: docId,
              title: data.title || '',
              body: data.body || '',
              url: data.url || '/',
              tag: data.tag || 'general',
              icon: data.icon || '/logo.svg',
              sentBy: data.sentBy || '',
              recipientCount: data.recipientCount || 0,
              createdAt: data.createdAt || ''
            };

            // Trigger native browser notification if user gave permission
            if (
              typeof window !== 'undefined' && 
              'Notification' in window && 
              Notification.permission === 'granted'
            ) {
              try {
                const nativeNotif = new Notification(notifItem.title, {
                  body: notifItem.body,
                  icon: '/logo.svg',
                  badge: '/logo.svg',
                  tag: docId,
                  data: { url: notifItem.url }
                });

                nativeNotif.onclick = () => {
                  window.focus();
                  if (notifItem.url && notifItem.url !== '/') {
                    window.location.href = notifItem.url;
                  }
                };
              } catch (e) {
                // If direct instantiation fails, try Service Worker showNotification
                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                  navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(notifItem.title, {
                      body: notifItem.body,
                      icon: '/logo.svg',
                      badge: '/logo.svg',
                      tag: docId,
                      data: { url: notifItem.url }
                    });
                  }).catch(() => {});
                }
              }
            }

            if (onNewNotification) {
              onNewNotification(notifItem);
            }
          }
        }
      });
    },
    (err) => {
      console.warn('Realtime notification listener notice:', err);
    }
  );

  return () => {
    isGlobalWatcherActive = false;
    unsubscribe();
  };
}

/**
 * Send a quick test notification to current device
 */
export async function sendLocalTestNotification(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('মেধা এক্সাম টেস্ট নোটিফিকেশন', {
        body: 'অভিনন্দন! আপনার ডিভাইসে মেধা এক্সামের নোটিফিকেশন সিস্টেম সফলভাবে কাজ করছে।',
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: 'medha-test-notification',
        vibrate: [200, 100, 200],
        data: { url: '/' }
      } as any);
      return true;
    } else {
      new Notification('মেধা এক্সাম টেস্ট নোটিফিকেশন', {
        body: 'অভিনন্দন! আপনার ডিভাইসে মেধা এক্সামের নোটিফিকেশন সিস্টেম সফলভাবে কাজ করছে।',
        icon: '/logo.svg',
        tag: 'medha-test-notification'
      });
      return true;
    }
  } catch (e) {
    console.error('Error sending test notification:', e);
    return false;
  }
}


/**
 * Subscribe to real-time broadcast notifications
 */
export function subscribeToNotifications(
  callback: (notifications: BroadcastNotification[]) => void
): () => void {
  const notifQuery = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    notifQuery,
    (snapshot) => {
      const list: BroadcastNotification[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || '',
          body: data.body || '',
          url: data.url || '/',
          tag: data.tag || 'general',
          icon: data.icon || '',
          sentBy: data.sentBy || '',
          recipientCount: data.recipientCount || 0,
          createdAt: data.createdAt || ''
        });
      });
      callback(list);
    },
    (err) => {
      console.warn('Error subscribing to notifications:', err);
    }
  );
}

/**
 * Delete a notification from history
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'notifications', id));
    return true;
  } catch (e) {
    console.error('Error deleting notification:', e);
    return false;
  }
}

/**
 * Get total registered FCM tokens count
 */
export async function getFCMTokenCount(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'fcmTokens'));
    return snap.size;
  } catch (e) {
    return 0;
  }
}

// =========================================================================
// BANNER NOTICE (HORIZONTAL SCROLLING MARQUEE TICKER) SERVICE
// =========================================================================

export const DEFAULT_BANNER_NOTICE: BannerNoticeSettings = {
  enabled: true,
  badgeText: '📢 বিশেষ বিজ্ঞপ্তি',
  text: 'সকল পরীক্ষার্থীদের জন্য সুখবর! মেধা এক্সাম পোর্টালে যুক্ত হয়েছে বিসিএস ও প্রাইমারি নিয়োগ পরীক্ষার নতুন লাইভ মডেল টেস্ট। রিয়েল-টাইম পরীক্ষায় অংশ নিন এবং নিজের মেধা যাচাই করুন!',
  linkUrl: '#featured-exams',
  speed: 'normal'
};

/**
 * Subscribe to banner notice settings in Firestore
 */
export function subscribeToBannerNotice(
  callback: (settings: BannerNoticeSettings) => void
): () => void {
  const docRef = doc(db, 'siteSettings', 'bannerNotice');

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as BannerNoticeSettings;
        const resolved: BannerNoticeSettings = {
          enabled: data.enabled !== false,
          badgeText: data.badgeText || DEFAULT_BANNER_NOTICE.badgeText,
          text: data.text || DEFAULT_BANNER_NOTICE.text,
          linkUrl: data.linkUrl || '',
          speed: data.speed || 'normal',
          updatedAt: data.updatedAt || ''
        };
        try {
          localStorage.setItem('medha_banner_notice', JSON.stringify(resolved));
        } catch (e) {}
        callback(resolved);
      } else {
        // Fallback to cached or default
        const cached = localStorage.getItem('medha_banner_notice');
        if (cached) {
          try {
            callback(JSON.parse(cached));
            return;
          } catch (e) {}
        }
        callback(DEFAULT_BANNER_NOTICE);
      }
    },
    (err) => {
      console.warn('Error subscribing to banner notice:', err);
      const cached = localStorage.getItem('medha_banner_notice');
      if (cached) {
        try {
          callback(JSON.parse(cached));
          return;
        } catch (e) {}
      }
      callback(DEFAULT_BANNER_NOTICE);
    }
  );
}

/**
 * Save banner notice settings from Admin
 */
export async function saveBannerNotice(
  settings: BannerNoticeSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'siteSettings', 'bannerNotice');
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    try {
      localStorage.setItem('medha_banner_notice', JSON.stringify(payload));
    } catch (e) {}
    return { success: true };
  } catch (err: any) {
    console.error('Error saving banner notice:', err);
    return { success: false, error: err?.message || 'নোটিশ সংরক্ষণ করা যায়নি।' };
  }
}
