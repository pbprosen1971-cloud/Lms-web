// Scripts for Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase App in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyA605aHyfXbYo2j667FyNte__41yrAPSgw",
  authDomain: "medha-exam.firebaseapp.com",
  projectId: "medha-exam",
  storageBucket: "medha-exam.firebasestorage.app",
  messagingSenderId: "580902736257",
  appId: "1:580902736257:web:47b11f4685fec25a331880"
});

const messaging = firebase.messaging();

// Background Push Notification Handler
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'মেধা এক্সাম নোটিফিকেশন';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'মেধা এক্সাম পোর্টালে নতুন আপডেট রয়েছে!',
    icon: payload.notification?.icon || payload.data?.icon || '/logo.svg',
    badge: '/logo.svg',
    tag: payload.data?.tag || 'medha-exam-notification',
    data: {
      url: payload.data?.url || payload.notification?.click_action || '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click Handler: open or focus the window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Native Web Push Fallback Handler (handles custom FCM payload structures)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.data?.title || data.title || 'মেধা এক্সাম নোটিফিকেশন';
    const body = data.notification?.body || data.data?.body || data.body || 'মেধা এক্সাম পোর্টালে নতুন বার্তা রয়েছে!';
    const icon = data.notification?.icon || data.data?.icon || '/logo.svg';
    const clickUrl = data.data?.url || data.notification?.click_action || data.url || '/';

    const options = {
      body,
      icon,
      badge: '/logo.svg',
      vibrate: [200, 100, 200],
      tag: (data.data && data.data.tag) || 'medha-notification',
      renotify: true,
      data: { url: clickUrl }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    try {
      const text = event.data.text();
      event.waitUntil(self.registration.showNotification('মেধা এক্সাম নোটিফিকেশন', {
        body: text,
        icon: '/logo.svg',
        badge: '/logo.svg',
        data: { url: '/' }
      }));
    } catch (e) {}
  }
});

// Immediate activation on update
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
