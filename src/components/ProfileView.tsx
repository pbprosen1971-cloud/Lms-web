/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, Phone, GraduationCap, Mail, Award, Calendar, ChevronRight, CheckCircle2, ShieldAlert, Check, Edit2, Trash2, Image, Crown, Sparkles, ShieldCheck } from 'lucide-react';
import { UserProfile, ExamResult } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatSafeDisplay, safeTimestampToString } from '../lib/dateUtils';

interface ProfileViewProps {
  user: UserProfile;
  results: ExamResult[];
  onUpdateUser: (updatedUser: UserProfile) => void;
  setView: (view: string) => void;
  setSelectedResult: (result: ExamResult) => void;
}

export default function ProfileView({
  user,
  results,
  onUpdateUser,
  setView,
  setSelectedResult,
}: ProfileViewProps) {
  const [phone, setPhone] = useState(user.phone || '');
  const [institution, setInstitution] = useState(user.institution || '');
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    setName(user.name);
    setPhone(user.phone || '');
    setInstitution(user.institution || '');
    setAvatar(user.avatar || '');
  }, [user]);

  // Filter exam results for this specific user
  const userResults = useMemo(() => {
    return results.filter(
      (r) =>
        r.studentId === user.id ||
        (r.studentEmail && user.email && r.studentEmail.toLowerCase() === user.email.toLowerCase())
    );
  }, [results, user.id, user.email]);

  // Extract Certificates: Exams taken with percentage score >= 80%
  const computedCertificates = useMemo(() => {
    return userResults
      .filter((r) => (r.score / r.totalQuestions) >= 0.8)
      .map((r) => ({
        id: `cert-${r.id}`,
        examTitle: r.examTitle,
        issueDate: r.dateTaken,
        score: r.score,
        totalQuestions: r.totalQuestions,
        credentialId: `MEDHA-CERT-${r.id.substring(4, 9).toUpperCase()}`,
        rawResult: r,
      }));
  }, [userResults]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      name,
      fullName: name,
      phone,
      institution,
      avatar,
    };

    const targetUid = user.id || user.uid;
    if (targetUid) {
      try {
        await setDoc(doc(db, 'users', targetUid), {
          name,
          fullName: name,
          phone,
          institution,
          avatar,
        }, { merge: true });
      } catch (err) {
        console.warn("Error updating user profile in Firestore:", err);
      }
    }

    onUpdateUser(updated);
    setIsEditing(false);
    setSuccessMsg('তথ্যগুলো সফলভাবে আপডেট করা হয়েছে এবং ফায়ারবেসে সংরক্ষিত হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleViewCert = (result: ExamResult) => {
    setSelectedResult(result);
    setView('result');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-brand-bg dark:bg-slate-900 text-slate-800 dark:text-slate-100 theme-transition">
      
      {/* 1. Header with Avatar Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-6">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/10 shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-emerald-500/10 text-slate-500 dark:text-slate-400 shadow-lg">
            <User className="h-10 w-10" />
          </div>
        )}
        
        <div className="space-y-1 text-center md:text-left flex-grow">
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {user.name}
            </h1>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary dark:bg-primary/20 text-xs font-semibold rounded-full capitalize">
              {user.role === 'admin' ? 'এডমিন' : 'শিক্ষার্থী'}
            </span>
            {user.isPremium ? (
              <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-xs rounded-full shadow-md shadow-amber-500/20 flex items-center gap-1.5 animate-pulse">
                <Crown className="h-3.5 w-3.5 fill-current" />
                <span>প্রিমিয়াম মেম্বার</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-full">
                ফ্রি ইউজার
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            শিক্ষা প্রতিষ্ঠান: {user.institution || 'শিক্ষা প্রতিষ্ঠানের তথ্য নেই'}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <span>নিবন্ধনের তারিখ: {formatSafeDisplay(user.joinedDate, '—')}</span>
            {user.isPremium && user.isPremiumDate && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                প্রিমিয়াম শুরু: {formatSafeDisplay(user.isPremiumDate, '—')}
              </span>
            )}
            {user.isPremium && user.isPremiumExpiryDate && (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                মেয়াদের শেষ তারিখ: {formatSafeDisplay(user.isPremiumExpiryDate, '—')}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5"
        >
          <Edit2 className="h-4 w-4" /> {isEditing ? 'সম্পাদনা বন্ধ করুন' : 'প্রোফাইল সম্পাদন'}
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Side-By-Side Grid for Information Forms & Certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Personal Details Panel - Left Column */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <User className="h-4.5 w-4.5 text-primary" />
            ব্যক্তিগত তথ্যাবলী
          </h3>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">নাম</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">শিক্ষা প্রতিষ্ঠান</label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ফোন নম্বর</label>
                <input
                  type="text"
                  value={phone}
                  placeholder="ফোন নম্বর লিখুন (যেমন: 01700000000)"
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Image className="h-4 w-4 text-primary" />
                  প্রোফাইল ছবি (Profile Picture)
                </label>
                
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Preview"
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-750 text-slate-500 dark:text-slate-400">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold mb-1">প্রোফাইল ছবির স্থিতি</span>
                    {avatar ? (
                      <button
                        type="button"
                        onClick={() => setAvatar('')}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> ছবি মুছে ফেলুন
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">কোন ছবি নেই (ডিফল্ট)</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">ছবির সরাসরি ইউআরএল (Image URL):</span>
                  <input
                    type="url"
                    value={avatar}
                    placeholder="https://example.com/image.jpg"
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">অথবা নিচের যেকোনো একটি ডেমো এভাটার বেছে নিন:</span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { name: 'Boy 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' },
                      { name: 'Girl 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120' },
                      { name: 'Boy 2', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120' },
                      { name: 'Girl 2', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120' },
                      { name: 'Scholar 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120' },
                      { name: 'Scholar 2', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120' },
                    ].map((av, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAvatar(av.url)}
                        className={`aspect-square rounded-full overflow-hidden border-2 transition-all ${
                          avatar === av.url ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                        }`}
                        title={av.name}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                পরিবর্তন সংরক্ষণ করুন
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">ইমেইল ঠিকানা</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">ফোন নম্বর</span>
                  {user.phone ? (
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{user.phone}</span>
                  ) : (
                    <span className="font-medium text-slate-400 dark:text-slate-500 text-xs italic">
                      - (ফোন নম্বর যুক্ত করা হয়নি)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <GraduationCap className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">শিক্ষা প্রতিষ্ঠান</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{user.institution || 'তথ্য নেই'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <Crown className={`h-4.5 w-4.5 ${user.isPremium ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">সাবস্ক্রিপশন স্ট্যাটাস</span>
                  {user.isPremium ? (
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      👑 প্রিমিয়াম মেম্বারশিপ (সকল এক্সক্লুসিভ ফিচার আনলকড)
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      ফ্রি একাউন্ট (সীমিত কুইজ এক্সেস)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Certificates Panel - Right Column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <Award className="h-4.5 w-4.5 text-amber-500" />
            অর্জিত কৃতিত্বের সার্টিফিকেটস
          </h3>

          {computedCertificates.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 p-6 space-y-2">
              <Award className="h-8 w-8 text-slate-300" />
              <h4 className="font-bold text-xs">কোনো সার্টিফিকেট অর্জিত হয়নি</h4>
              <p className="text-[11px] text-slate-400 max-w-xs">পরীক্ষায় ৮০% বা তার বেশি স্কোর অর্জন করলে আপনি একটি কৃতিত্বের সার্টিফিকেট পাবেন।</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
              {computedCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs sm:text-sm line-clamp-1">{cert.examTitle}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>আইডি: {cert.credentialId}</span>
                      <span>•</span>
                      <span>তারিখ: {formatSafeDisplay(cert.issueDate, '—')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewCert(cert.rawResult)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-sm"
                  >
                    সার্টিফিকেট
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. Detailed Tabular Exam History Log */}
      <div className="bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Calendar className="h-4.5 w-4.5 text-primary" />
          সম্পূর্ণ পরীক্ষার ইতিহাস (Exam History)
        </h3>

        {userResults.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            আপনি এখনও কোনো পরীক্ষায় অংশ নেননি।
          </div>
        ) : (
          <div className="overflow-x-auto select-none rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold">
                  <th className="p-3">পরীক্ষার শিরোনাম</th>
                  <th className="p-3">বিষয়</th>
                  <th className="p-3 text-center">সঠিক / ভুল</th>
                  <th className="p-3 text-center">প্রাপ্ত নম্বর</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {userResults.map((hist) => {
                  const percent = Math.round((hist.score / hist.totalQuestions) * 100);
                  return (
                    <tr key={hist.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-800 dark:text-white max-w-[200px] sm:max-w-[300px] truncate">
                        {hist.examTitle}
                      </td>
                      <td className="p-3 text-slate-500 font-medium">{hist.subject}</td>
                      <td className="p-3 text-center">
                        <span className="text-emerald-600 font-semibold">{hist.correctAnswers}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-rose-600 font-semibold">{hist.wrongAnswers}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-primary">
                        {hist.score} / {hist.totalQuestions} ({percent}%)
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleViewCert(hist)}
                          className="px-2.5 py-1.5 bg-primary/10 text-primary dark:bg-primary/20 text-xs font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors duration-200"
                        >
                          বিশ্লেষণ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
