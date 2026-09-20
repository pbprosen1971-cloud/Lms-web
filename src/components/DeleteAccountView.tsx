/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Mail,
  User,
  Info,
  HelpCircle
} from 'lucide-react';
import { submitAccountDeletionRequest, deleteAuthenticatedUserAccount } from '../services/accountDeletionService';
import { UserProfile } from '../types';

interface DeleteAccountViewProps {
  user: UserProfile | null;
  setView: (view: string) => void;
  onLogout?: () => void;
}

export default function DeleteAccountView({ user, setView, onLogout }: DeleteAccountViewProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // In-app direct deletion states for logged-in users
  const [showInstantModal, setShowInstantModal] = useState(false);
  const [instantDeleting, setInstantDeleting] = useState(false);
  const [instantSuccess, setInstantSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Delete Your Medha Exam Account — Medha Exam';
    window.scrollTo(0, 0);

    if (user) {
      if (user.email) setEmail(user.email);
      if (user.name) setName(user.name);
    }
  }, [user]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।');
      return;
    }

    if (!isConfirmed) {
      setError('অ্যাকাউন্ট ডিলিটের শর্তাবলীতে টিক চিহ্ন দিয়ে সম্মতি প্রদান করুন।');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAccountDeletionRequest({
        email: email.trim(),
        name: name.trim(),
        reason: reason.trim(),
        userId: user?.id
      });
      setSubmittedId(res.id);
    } catch (err: any) {
      setError(err?.message || 'অনুরোধ পাঠানো সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteInstantDeletion = async () => {
    if (!user) return;
    setInstantDeleting(true);
    setError(null);

    try {
      await deleteAuthenticatedUserAccount(user.id, user.email);
      setInstantSuccess(true);
      if (onLogout) {
        onLogout();
      }
    } catch (err: any) {
      setError(err?.message || 'অ্যাকাউন্ট ডিলিট করতে সমস্যা হয়েছে।');
      setShowInstantModal(false);
    } finally {
      setInstantDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমে ফিরে যান</span>
          </button>
          <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-full">
            Account Deletion Portal
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Delete Your Medha Exam Account
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Medha Exam users can request deletion of their account and associated personal data from this page.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
              <span>স্থায়ীভাবে মুছে ফেলার পূর্ব সতর্কতা:</span>
            </div>
            <p className="leading-relaxed">
              অ্যাকাউন্ট ডিলিট করলে আপনার নাম, ইমেইল, প্রোফাইল, সমস্ত পরীক্ষার ফলাফল ও স্কোর হিস্ট্রি, ডেইলি প্র্যাকটিস ডেটা, ভুল প্রশ্ন সংগ্রহাগার এবং রেফারেল বিবরণী স্থায়ীভাবে মুছে ফেলা হবে। এই পদক্ষেপটি অপরিবর্তনীয়।
            </p>
          </div>
        </div>

        {/* Instant deletion prompt for authenticated user */}
        {user && !instantSuccess && (
          <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                <span>আপনি বর্তমানে লগইন অবস্থায় রয়েছেন ({user.name})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                আপনি চাইলে অপেক্ষা না করে এখনই সরাসরি ১-ক্লিকে তাৎক্ষণিক আপনার অ্যাকাউন্ট ও সমস্ত ডেটা স্থায়ীভাবে ডিলিট করতে পারেন।
              </p>
            </div>
            <button
              onClick={() => setShowInstantModal(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>এখনই অ্যাকাউন্ট ডিলিট করুন</span>
            </button>
          </div>
        )}

        {/* Direct Deletion Success Confirmation */}
        {instantSuccess ? (
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              আপনার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              মেধা এক্সাম থেকে আপনার প্রোফাইল, ফলাফল এবং ব্যক্তিগত সকল ডেটা স্থায়ীভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে। আপনার ভবিষ্যতের যেকোনো প্রচেষ্টার জন্য শুভকামনা রইল।
            </p>
            <div className="pt-2">
              <button
                onClick={() => setView('home')}
                className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                হোম পেজে ফিরে যান
              </button>
            </div>
          </div>
        ) : submittedId ? (
          /* Public Web Request Success Card */
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              অ্যাকাউন্ট ডিলিট রিকোয়েস্ট গৃহীত হয়েছে!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              আপনার অনুরোধটি সুরক্ষিতভাবে সংরক্ষিত হয়েছে। রেফারেন্স ট্র্যাকিং আইডি:
            </p>
            <div className="inline-block px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-primary">
              REQ-{submittedId.slice(0, 10).toUpperCase()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              সাধারণত ৩ থেকে ৭ কার্যদিবসের মধ্যে স্বয়ংক্রিয়ভাবে অ্যাকাউন্ট ও সংশ্লিষ্ট ব্যক্তিগত ডেটা ভেরিফাই করে চিরতরে অপসারণ করা হবে।
            </p>
            <div className="pt-2">
              <button
                onClick={() => setView('home')}
                className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                হোমে ফিরে যান
              </button>
            </div>
          </div>
        ) : (
          /* Web Account Deletion Request Form */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>মুছে ফেলার অনুরোধ ফর্ম (Request Form)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                যেকোনো ব্যবহারকারী লগইন ছাড়াই নিচের ফর্মটি পূরণ করে অনুরোধ জমা দিতে পারেন।
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email address (নিবন্ধিত ইমেইল ঠিকানা) *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account name (অ্যাকাউন্টে ব্যবহৃত নাম)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Optional reason (মুছে ফেলার কারণ — ঐচ্ছিক)</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="কেন অ্যাকাউন্ট মুছে ফেলতে চাচ্ছেন তা সংক্ষেপে লিখতে পারেন..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 shrink-0"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-none font-medium">
                    I understand that deleting my account may permanently remove my account and associated data.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading || !isConfirmed || !email.trim()}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>অনুরোধ পাঠানো হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Request Account Deletion</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal for Instant Deletion Confirmation */}
        {showInstantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Are you sure you want to delete your Medha Exam account?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  অ্যাকাউন্ট ডিলিট করলে আপনার প্রোফাইল, সমস্ত পরীক্ষার ফলাফল, ভুল প্রশ্নের অনুশীলন ও ব্যক্তিগত হিস্ট্রি চিরতরে মুছে যাবে। এটি আর পুনরুদ্ধার করা সম্ভব নয়।
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={instantDeleting}
                  onClick={() => setShowInstantModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={instantDeleting}
                  onClick={handleExecuteInstantDeletion}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {instantDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>মুছে ফেলা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete My Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
