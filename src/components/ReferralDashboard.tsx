/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, Share2, Users, Award, Sparkles, ExternalLink, MessageCircle } from 'lucide-react';
import { UserProfile, ReferralRecord } from '../types';
import { subscribeToReferralsForUser } from '../services/firestoreService';
import { formatSafeDisplay } from '../lib/dateUtils';

interface ReferralDashboardProps {
  user: UserProfile;
}

export default function ReferralDashboard({ user }: ReferralDashboardProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const referralCode = user.referralCode || 'MEDHA0000';
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/registration?ref=${referralCode}`
    : `https://medhaexam.web.app/registration?ref=${referralCode}`;

  useEffect(() => {
    const userId = user.id || user.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToReferralsForUser(userId, (records) => {
      setReferrals(records);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user.id, user.uid]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn("Copy link failed:", err);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.warn("Copy code failed:", err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `মেধা এক্সাম পোর্টালে অনলাইন পরীক্ষা দিয়ে নিজেকে যাচাই করুন! আমার রেফারেল লিংক ব্যবহার করে যোগ দিন: ${referralUrl}\nঅথবা রেফারেল কোড দিন: ${referralCode}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'মেধা এক্সাম - অনলাইন এক্সাম পোর্টাল',
          text: `মেধা এক্সামে পরীক্ষা দিয়ে দক্ষতা বৃদ্ধি করুন! আমার রেফারেল কোড: ${referralCode}`,
          url: referralUrl,
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  const totalReferrals = Math.max(user.referralCount || 0, referrals.length);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <span>রেফারেল ড্যাশবোর্ড (Refer & Earn)</span>
          </h3>
          <p className="text-xs text-slate-500">
            বন্ধুদের মেধা এক্সামে আমন্ত্রণ জানান এবং আকর্ষণীয় সুযোগ ও রিওয়ার্ড অর্জন করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleShareWhatsApp}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="হোয়াটসঅ্যাপে শেয়ার করুন"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>শেয়ার করুন</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Referral Code Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            আপনার রেফারেল কোড
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-black text-primary tracking-widest">
              {referralCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              title="কোড কপি করুন"
            >
              {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {copiedCode && (
            <span className="text-[10px] text-emerald-600 font-semibold block">কোড কপি হয়েছে!</span>
          )}
        </div>

        {/* Total Referrals Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            মোট সফল রেফারেল
          </span>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalReferrals}
            </span>
            <span className="text-xs text-slate-400 font-medium">জন শিক্ষার্থী</span>
          </div>
        </div>

        {/* Community Status Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            অ্যাম্বাসেডর ব্যাজ
          </span>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {totalReferrals >= 10 ? 'গোল্ড অ্যাম্বাসেডর' : totalReferrals >= 5 ? 'সিলভার অ্যাম্বাসেডর' : 'ব্রোঞ্জ লার্নার'}
              </span>
              <span className="text-[10px] text-slate-400">
                {totalReferrals >= 10 ? 'সর্বোচ্চ অগ্রাধিকার' : `পরবর্তী ব্যাজে আর ${Math.max(0, 5 - totalReferrals)}টি রেফার`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shareable Link Box */}
      <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
          <span>আপনার ব্যক্তিগত রেফারেল লিংক:</span>
          {copiedLink && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Check className="h-3 w-3" /> লিংক কপি হয়েছে!
            </span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralUrl}
            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 select-all focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>কপি করুন</span>
          </button>
        </div>
      </div>

      {/* Referred Students Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span>আপনার রেফারেল তালিকায় যুক্ত শিক্ষার্থীগণ ({referrals.length})</span>
        </h4>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            রেফারেল তালিকা লোড হচ্ছে...
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <Gift className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              এখনও কেউ আপনার রেফারেল লিংকে যোগ দেয়নি।
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              আপনার বন্ধুদের সাথে রেফারেল লিংক শেয়ার করুন। তারা অ্যাকাউন্ট খুললেই এখানে দেখতে পাবেন!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold">
                  <th className="p-3">ক্রমিক</th>
                  <th className="p-3">শিক্ষার্থীর নাম</th>
                  <th className="p-3">যোগদানের তারিখ</th>
                  <th className="p-3 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {referrals.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-slate-400">#{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                      {item.referredUserName}
                    </td>
                    <td className="p-3 text-slate-500">
                      {formatSafeDisplay(item.createdAt, '—')}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                        সফলভাবে যুক্ত
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
