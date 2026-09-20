/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { deleteUser, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface AccountDeletionRequestInput {
  email: string;
  name?: string;
  reason?: string;
  userId?: string;
}

export interface DeletionResult {
  success: boolean;
  message?: string;
  requiresReauth?: boolean;
}

/**
 * Submit an official account deletion request (Google Play Web Compliance).
 * Accessible publicly by any user with or without being signed in.
 */
export async function submitAccountDeletionRequest(
  input: AccountDeletionRequestInput
): Promise<{ success: boolean; id: string }> {
  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('দয়া করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।');
  }

  const payload = {
    email: cleanEmail,
    name: input.name?.trim() || '',
    reason: input.reason?.trim() || 'User requested via web portal',
    userId: input.userId || '',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    source: 'web_delete_account_page'
  };

  const docRef = await addDoc(collection(db, 'accountDeletionRequests'), payload);
  return { success: true, id: docRef.id };
}

/**
 * Perform direct in-app account and data deletion for the authenticated user.
 * Deletes user document, exam results, wrong questions, daily practice, and Auth account.
 */
export async function deleteAuthenticatedUserAccount(
  userId: string,
  userEmail?: string
): Promise<DeletionResult> {
  const currentUser: User | null = auth.currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('অ্যাকাউন্ট ডিলিট করার জন্য আপনাকে লগইন অবস্থায় থাকতে হবে।');
  }

  try {
    // 1. Delete user exam results
    try {
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, where('studentId', '==', userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not delete results batch:', err);
    }

    // 2. Delete wrong questions subcollection
    try {
      const wrongSubRef = collection(db, 'wrongQuestions', userId, 'questions');
      const wSnap = await getDocs(wrongSubRef);
      if (!wSnap.empty) {
        const batch = writeBatch(db);
        wSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'wrongQuestions', userId));
    } catch (err) {
      console.warn('Could not delete wrongQuestions:', err);
    }

    // 3. Delete daily practice records
    try {
      const dpRef = collection(db, 'dailyPractice');
      const dpQ = query(dpRef, where('userId', '==', userId));
      const dpSnap = await getDocs(dpQ);
      if (!dpSnap.empty) {
        const batch = writeBatch(db);
        dpSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn('Could not delete dailyPractice:', err);
    }

    // 4. Delete study material access history
    try {
      const matRef = collection(db, 'materialAccess');
      const matQ = query(matRef, where('userId', '==', userId));
      const matSnap = await getDocs(matQ);
      if (!matSnap.empty) {
        const batch = writeBatch(db);
        matSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn('Could not delete materialAccess:', err);
    }

    // 5. Anonymize/Clean referrals record
    try {
      const refRef = collection(db, 'referrals');
      const refQ = query(refRef, where('referredUserId', '==', userId));
      const refSnap = await getDocs(refQ);
      if (!refSnap.empty) {
        const batch = writeBatch(db);
        refSnap.docs.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Could not delete referrals:', err);
    }

    // 6. Anonymize paymentRequests for audit / anti-fraud preservation
    try {
      const prRef = collection(db, 'paymentRequests');
      const prQ = query(prRef, where('userId', '==', userId));
      const prSnap = await getDocs(prQ);
      if (!prSnap.empty) {
        const batch = writeBatch(db);
        prSnap.docs.forEach((d) => {
          batch.update(d.ref, {
            userName: 'Deleted User',
            userPhone: 'REDACTED',
            userEmail: 'deleted@medhaexam.com',
            status: 'account_deleted',
            deletedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Could not anonymize paymentRequests:', err);
    }

    // 7. Record an official completed deletion entry
    try {
      await addDoc(collection(db, 'accountDeletionRequests'), {
        email: userEmail || currentUser.email || 'unknown',
        userId: userId,
        status: 'completed',
        requestedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        source: 'in_app_instant_delete'
      });
    } catch (err) {
      console.warn('Could not log deletion record:', err);
    }

    // 8. Delete user profile document from users collection
    await deleteDoc(doc(db, 'users', userId));

    // 9. Delete Firebase Authentication User
    try {
      await deleteUser(currentUser);
    } catch (authErr: any) {
      if (authErr?.code === 'auth/requires-recent-login') {
        return {
          success: true,
          requiresReauth: true,
          message:
            'আপনার ফায়ারস্টোর ডাটাবেজ তথ্য স্থায়ীভাবে ডিলিট করা হয়েছে। তবে সিকিউরিটি পলিসির কারণে অথেনটিকেশন একাউন্ট পুরোপুরি রিমুভ করতে অনুগ্রহ করে একবার লগআউট করে পুনরায় লগইন করে কনফার্ম করুন।'
        };
      }
      console.warn('Firebase auth delete error:', authErr);
    }

    // Clear local stored user session
    try {
      localStorage.removeItem('active_user_session');
      localStorage.removeItem('pending_referral_code');
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    console.error('Account deletion error:', error);
    throw new Error(error?.message || 'অ্যাকাউন্ট ডিলিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
  }
}
