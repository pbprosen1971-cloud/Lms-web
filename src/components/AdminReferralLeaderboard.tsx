/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Gift, Trophy, Users, Search, Award, TrendingUp, Sparkles, RefreshCw, Crown } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReferralRecord, UserProfile } from '../types';
import { subscribeToAllReferrals } from '../services/firestoreService';
import { formatSafeDisplay } from '../lib/dateUtils';

interface AdminReferralLeaderboardProps {
  students?: UserProfile[];
}

export default function AdminReferralLeaderboard({ students = [] }: AdminReferralLeaderboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Realtime subscription to users collection
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((doc) => {
          uList.push({ id: doc.id, ...doc.data() } as UserProfile);
        });
        setUsers(uList);
        setLoading(false);
      },
      (err) => {
        console.warn("Error subscribing to users for leaderboard:", err);
        setLoading(false);
      }
    );

    const unsubscribeReferrals = subscribeToAllReferrals((records) => {
      setReferrals(records);
    });

    return () => {
      unsubscribeUsers();
      if (unsubscribeReferrals) unsubscribeReferrals();
    };
  }, []);

  // Compute leaderboard ranking
  const leaderboard = useMemo(() => {
    // Combine users state with passed students if any missing
    const userMap = new Map<string, UserProfile>();
    students.forEach((s) => {
      const key = s.id || s.uid;
      if (key) userMap.set(key, s);
    });
    users.forEach((u) => {
      const key = u.id || u.uid;
      if (key) userMap.set(key, u);
    });

    // Also count from actual referrals collection to ensure absolute data consistency
    const referralCountsByUserId = new Map<string, number>();
    referrals.forEach((r) => {
      if (r.referrerId) {
        const current = referralCountsByUserId.get(r.referrerId) || 0;
        referralCountsByUserId.set(r.referrerId, current + 1);
      }
    });

    const list = Array.from(userMap.values()).map((user) => {
      const uid = user.id || user.uid;
      const countFromReferrals = referralCountsByUserId.get(uid) || 0;
      const storedCount = Number(user.referralCount || 0);
      const effectiveCount = Math.max(storedCount, countFromReferrals);
      return {
        ...user,
        effectiveReferralCount: effectiveCount,
      };
    });

    // Filter by search query and sort by effective count descending
    return list
      .filter((u) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const name = (u.name || u.fullName || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const code = (u.referralCode || '').toLowerCase();
        return name.includes(q) || email.includes(q) || code.includes(q);
      })
      .sort((a, b) => b.effectiveReferralCount - a.effectiveReferralCount);
  }, [users, students, referrals, searchQuery]);

  const topReferrers = leaderboard.filter((u) => u.effectiveReferralCount > 0);
  const totalPlatformReferrals = referrals.length;
  const activeReferrersCount = topReferrers.length;
  const champion = topReferrers[0];

  return (
    <div className="space-y-8">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span>রেফারেল লিডারবোর্ড ও ট্র্যাকার (Referral Leaderboard)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            শিক্ষার্থীদের আমন্ত্রণ ও রেফারেল কার্যক্রমের লাইভ পর্যবেক্ষণ এবং সেরা রেফারার তালিকা।
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, ইমেইল বা কোড খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            মোট প্ল্যাটফর্ম রেফারেল
          </span>
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalPlatformReferrals}
            </span>
            <span className="text-xs text-slate-400">টি সফল জয়েনিং</span>
          </div>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            সক্রিয় রেফারার সংখ্যা
          </span>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {activeReferrersCount}
            </span>
            <span className="text-xs text-slate-400">জন শিক্ষার্থী</span>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/30 dark:to-slate-900/40 border border-amber-500/20 rounded-2xl space-y-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <Crown className="h-3.5 w-3.5" /> সর্বোচ্চ রেফারার (টপ স্কোরার)
          </span>
          {champion ? (
            <div>
              <span className="text-base font-black text-slate-900 dark:text-white line-clamp-1">
                {champion.name || champion.fullName}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                {champion.effectiveReferralCount} টি রেফার ({champion.referralCode || '—'})
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">এখনও কোনো রেফারেল হয়নি</span>
          )}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span>সেরা রেফারারদের র‍্যাংকিং তালিকা</span>
        </h4>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">তথ্য লোড হচ্ছে...</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            কোনো শিক্ষার্থী পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 font-bold">
                  <th className="p-3.5 text-center w-16">র‍্যাংক</th>
                  <th className="p-3.5">শিক্ষার্থীর নাম</th>
                  <th className="p-3.5">ইমেইল</th>
                  <th className="p-3.5 text-center">রেফারেল কোড</th>
                  <th className="p-3.5 text-center">মোট রেফারেল</th>
                  <th className="p-3.5 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((u, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1 && u.effectiveReferralCount > 0;
                  const isTop2 = rank === 2 && u.effectiveReferralCount > 0;
                  const isTop3 = rank === 3 && u.effectiveReferralCount > 0;

                  return (
                    <tr
                      key={u.id || u.uid || idx}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isTop1 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center font-bold">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white shadow-sm font-black text-xs">
                            🥇
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm font-black text-xs">
                            🥈
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/70 text-white shadow-sm font-black text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{rank}</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{u.name || u.fullName || 'নাম নেই'}</span>
                          {u.isPremium && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md font-bold">
                              PRO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-xs">{u.email || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                          {u.referralCode || '—'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-extrabold text-sm text-primary">
                          {u.effectiveReferralCount}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {u.effectiveReferralCount >= 10 ? (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg">
                            গোল্ড
                          </span>
                        ) : u.effectiveReferralCount >= 5 ? (
                          <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                            সিলভার
                          </span>
                        ) : u.effectiveReferralCount > 0 ? (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg">
                            ব্রোঞ্জ
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Referral Transactions Log */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span>সাম্প্রতিক রেফারেল কার্যকলাপের লগ (Recent Referrals Log)</span>
        </h4>

        {referrals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            এখনও কোনো রেফারেল ট্রানজেকশন হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 font-bold">
                  <th className="p-3">নতুন শিক্ষার্থী</th>
                  <th className="p-3">ইমেইল</th>
                  <th className="p-3">আমন্ত্রণকারী (Referrer Code)</th>
                  <th className="p-3">তারিখ ও সময়</th>
                  <th className="p-3 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {referrals.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {r.referredUserName}
                    </td>
                    <td className="p-3 font-mono text-slate-500">{r.referredUserEmail || '—'}</td>
                    <td className="p-3 font-mono font-bold text-primary">
                      {r.referrerCode}
                    </td>
                    <td className="p-3 text-slate-500">{formatSafeDisplay(r.createdAt, '—')}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                        সফল
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
