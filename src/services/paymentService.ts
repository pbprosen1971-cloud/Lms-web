/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentMethodConfig, PaymentMethodType, PaymentRequest } from '../types';

export const DEFAULT_PAYMENT_CONFIGS: Record<PaymentMethodType, PaymentMethodConfig> = {
  bkash: {
    id: 'bkash',
    name: 'bKash',
    nameBn: 'বিকাশ',
    enabled: true,
    accountNumber: '01700000000',
    accountName: 'মেধা এক্সাম অফিসিয়াল',
    accountType: 'Personal (Send Money)',
    instruction: 'বিকাশ অ্যাপ বা *247# ডায়াল করে Send Money করুন। সফল ট্রানজেকশনের পর নিচে আপনার TrxID ও প্রেরক নম্বর লিখুন।',
    brandColor: '#D12053'
  },
  nagad: {
    id: 'nagad',
    name: 'Nagad',
    nameBn: 'নগদ',
    enabled: true,
    accountNumber: '01700000000',
    accountName: 'মেধা এক্সাম অফিসিয়াল',
    accountType: 'Personal (Send Money)',
    instruction: 'নগদ অ্যাপ বা *167# ডায়াল করে Send Money করুন। সফল লেনদেনের পর ট্রানজেকশন আইডি (TxnID) দিন।',
    brandColor: '#F26222'
  },
  upay: {
    id: 'upay',
    name: 'Upay',
    nameBn: 'উপায়',
    enabled: true,
    accountNumber: '01700000000',
    accountName: 'মেধা এক্সাম অফিসিয়াল',
    accountType: 'Personal (Send Money)',
    instruction: 'উপায় (Upay) অ্যাপ থেকে সেন্ড মানি করে TrxID ও প্রেরক নম্বর সাবমিট করুন।',
    brandColor: '#005EA6'
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    nameBn: 'রকেট',
    enabled: true,
    accountNumber: '01700000000',
    accountName: 'মেধা এক্সাম অফিসিয়াল',
    accountType: 'Personal (Send Money)',
    instruction: 'রকেট অ্যাপ বা *322# ডায়াল করে Send Money করুন এবং ট্রানজেকশন আইডি প্রদান করুন।',
    brandColor: '#8C3494'
  }
};

/**
 * Subscribe to Admin-configured Payment Methods from siteSettings/paymentMethods
 */
export function subscribePaymentMethods(
  callback: (methods: Record<PaymentMethodType, PaymentMethodConfig>) => void
): Unsubscribe {
  const docRef = doc(db, 'siteSettings', 'paymentMethods');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const merged: Record<PaymentMethodType, PaymentMethodConfig> = {
          bkash: { ...DEFAULT_PAYMENT_CONFIGS.bkash, ...(data.bkash || {}) },
          nagad: { ...DEFAULT_PAYMENT_CONFIGS.nagad, ...(data.nagad || {}) },
          upay: { ...DEFAULT_PAYMENT_CONFIGS.upay, ...(data.upay || {}) },
          rocket: { ...DEFAULT_PAYMENT_CONFIGS.rocket, ...(data.rocket || {}) }
        };
        try {
          localStorage.setItem('cached_payment_methods', JSON.stringify(merged));
        } catch (e) {}
        callback(merged);
      } else {
        // Fallback to defaults
        callback(DEFAULT_PAYMENT_CONFIGS);
      }
    },
    (err) => {
      console.warn("Error fetching siteSettings/paymentMethods:", err);
      try {
        const cached = localStorage.getItem('cached_payment_methods');
        if (cached) {
          callback(JSON.parse(cached));
          return;
        }
      } catch (e) {}
      callback(DEFAULT_PAYMENT_CONFIGS);
    }
  );
}

/**
 * Get current Payment Methods snapshot
 */
export async function getPaymentMethods(): Promise<Record<PaymentMethodType, PaymentMethodConfig>> {
  try {
    const docRef = doc(db, 'siteSettings', 'paymentMethods');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        bkash: { ...DEFAULT_PAYMENT_CONFIGS.bkash, ...(data.bkash || {}) },
        nagad: { ...DEFAULT_PAYMENT_CONFIGS.nagad, ...(data.nagad || {}) },
        upay: { ...DEFAULT_PAYMENT_CONFIGS.upay, ...(data.upay || {}) },
        rocket: { ...DEFAULT_PAYMENT_CONFIGS.rocket, ...(data.rocket || {}) }
      };
    }
  } catch (err) {
    console.warn("Error in getPaymentMethods:", err);
  }
  return DEFAULT_PAYMENT_CONFIGS;
}

/**
 * Save / Update Admin Payment Methods in Firestore
 */
export async function savePaymentMethods(
  methods: Record<PaymentMethodType, PaymentMethodConfig>
): Promise<void> {
  const docRef = doc(db, 'siteSettings', 'paymentMethods');
  const nowIso = new Date().toISOString();
  await setDoc(
    docRef,
    {
      ...methods,
      updatedAt: serverTimestamp(),
      lastUpdated: nowIso
    },
    { merge: true }
  );
  try {
    localStorage.setItem('cached_payment_methods', JSON.stringify(methods));
  } catch (e) {}
}

/**
 * Create a new user manual payment request
 */
export async function createPaymentRequest(data: {
  userId: string;
  userName: string;
  userEmail: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  packageId: string;
  packageTitle: string;
  packageDurationDays?: number;
  transactionId: string;
  senderNumber: string;
  note?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const cleanTrx = data.transactionId.trim().toUpperCase();
    const cleanSender = data.senderNumber.trim();

    if (!cleanTrx) {
      return { success: false, error: 'ট্রানজেকশন আইডি (TrxID) অবশ্যই প্রদান করতে হবে।' };
    }
    if (!cleanSender) {
      return { success: false, error: 'যে নম্বর থেকে টাকা পাঠিয়েছেন তা উল্লেখ করুন।' };
    }

    // 1. Check for duplicate Transaction ID
    try {
      const trxQuery = query(
        collection(db, 'paymentRequests'),
        where('transactionId', '==', cleanTrx)
      );
      const trxSnap = await getDocs(trxQuery);
      if (!trxSnap.empty) {
        return {
          success: false,
          error: 'এই ট্রানজেকশন আইডিটি (TrxID) ইতিপূর্বে সাবমিট করা হয়েছে। অনুগ্রহ করে সঠিক ও নতুন ট্রানজেকশন আইডি দিন।'
        };
      }
    } catch (checkErr) {
      console.warn("Duplicate TrxID check warning:", checkErr);
    }

    // 2. Insert new payment request
    const newDocRef = doc(collection(db, 'paymentRequests'));
    const nowIso = new Date().toISOString();

    const newRequest: PaymentRequest = {
      id: newDocRef.id,
      userId: data.userId,
      userName: data.userName || 'শিক্ষার্থী',
      userEmail: data.userEmail || '',
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      packageId: data.packageId,
      packageTitle: data.packageTitle,
      packageDurationDays: data.packageDurationDays || 30,
      transactionId: cleanTrx,
      senderNumber: cleanSender,
      note: (data.note || '').trim(),
      status: 'pending',
      adminNote: '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(newDocRef, newRequest);

    return { success: true, id: newDocRef.id };
  } catch (err: any) {
    console.error("Error creating payment request:", err);
    return {
      success: false,
      error: err?.message || 'পেমেন্ট রিকোয়েস্ট সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
    };
  }
}

/**
 * Subscribe to a specific user's payment requests (Scoped to userId)
 */
export function subscribeUserPaymentRequests(
  userId: string,
  callback: (requests: PaymentRequest[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'paymentRequests'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PaymentRequest[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as PaymentRequest;
        list.push({ ...item, id: d.id });
      });
      // Sort in-memory by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn(`Error listening to user paymentRequests (${userId}):`, err);
      callback([]);
    }
  );
}

/**
 * Subscribe to all payment requests for Admin View
 */
export function subscribeAllPaymentRequests(
  callback: (requests: PaymentRequest[]) => void
): Unsubscribe {
  const colRef = collection(db, 'paymentRequests');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PaymentRequest[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as PaymentRequest;
        list.push({ ...item, id: d.id });
      });
      // Sort in-memory by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn("Error listening to all paymentRequests (Admin):", err);
      callback([]);
    }
  );
}

/**
 * Admin action: Approve Payment Request and Activate Premium Membership
 */
export async function approvePaymentRequest(
  request: PaymentRequest,
  adminEmailOrName: string,
  adminNote?: string
): Promise<void> {
  const now = new Date();
  const durationDays = request.packageDurationDays || (
    request.packageId === '7_days' ? 7 :
    request.packageId === '30_days' ? 30 :
    request.packageId === '6_months' ? 180 : 30
  );
  const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const nowIso = now.toISOString();
  const expiryIso = expiry.toISOString();

  // 1. Update Payment Request status
  const reqRef = doc(db, 'paymentRequests', request.id);
  await updateDoc(reqRef, {
    status: 'approved',
    adminNote: adminNote !== undefined ? adminNote.trim() : (request.adminNote || ''),
    approvedAt: nowIso,
    approvedBy: adminEmailOrName || 'Admin',
    updatedAt: nowIso
  });

  // 2. Activate Premium on User in users/{userId}
  const userRef = doc(db, 'users', request.userId);
  await setDoc(
    userRef,
    {
      isPremium: true,
      isPremiumDate: nowIso,
      isPremiumExpiryDate: expiryIso,
      inPremiumDate: nowIso,
      inPremiumExpiryDate: expiryIso,
      updatedAt: nowIso
    },
    { merge: true }
  );
}

/**
 * Admin action: Reject Payment Request (Does NOT activate premium)
 */
export async function rejectPaymentRequest(
  request: PaymentRequest,
  adminEmailOrName: string,
  adminNote?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const reqRef = doc(db, 'paymentRequests', request.id);

  await updateDoc(reqRef, {
    status: 'rejected',
    adminNote: adminNote !== undefined ? adminNote.trim() : (request.adminNote || ''),
    rejectedAt: nowIso,
    rejectedBy: adminEmailOrName || 'Admin',
    updatedAt: nowIso
  });
}

/**
 * Admin action: Update Admin Note on a payment request
 */
export async function updatePaymentAdminNote(
  requestId: string,
  adminNote: string
): Promise<void> {
  const reqRef = doc(db, 'paymentRequests', requestId);
  const nowIso = new Date().toISOString();

  await updateDoc(reqRef, {
    adminNote: adminNote.trim(),
    updatedAt: nowIso
  });
}
