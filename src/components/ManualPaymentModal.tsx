/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Info,
  Smartphone,
  Hash,
  Send
} from 'lucide-react';
import { UserProfile, Exam, PaymentMethodConfig, PaymentMethodType, PaymentPlan } from '../types';
import { PaymentMethodLogo } from './PaymentLogos';
import {
  subscribePaymentMethods,
  createPaymentRequest,
  DEFAULT_PAYMENT_CONFIGS
} from '../services/paymentService';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: PaymentPlan;
  user: UserProfile | null;
  blockedExam?: Exam | null;
  onViewProfile?: () => void;
  onExamUnlock?: (exam: Exam) => void;
}

interface BrandTheme {
  primary: string;
  primaryDark: string;
  bgLight: string;
  bgLightDark: string;
  borderLight: string;
  ringLight: string;
  textLight: string;
  inputBg: string;
  inputBorder: string;
  inputFocusRing: string;
  boxBg: string;
  bannerBg: string;
  badgeBg: string;
}

const BRAND_THEMES: Record<PaymentMethodType, BrandTheme> = {
  bkash: {
    primary: '#E2136E',
    primaryDark: '#B80D57',
    bgLight: '#FFF0F5',
    bgLightDark: 'rgba(226, 19, 110, 0.15)',
    borderLight: '#FBCFE8',
    ringLight: 'rgba(226, 19, 110, 0.25)',
    textLight: '#BE185D',
    inputBg: 'rgba(226, 19, 110, 0.03)',
    inputBorder: 'rgba(226, 19, 110, 0.4)',
    inputFocusRing: 'rgba(226, 19, 110, 0.25)',
    boxBg: 'rgba(226, 19, 110, 0.05)',
    bannerBg: 'linear-gradient(135deg, rgba(226, 19, 110, 0.12) 0%, rgba(226, 19, 110, 0.03) 100%)',
    badgeBg: 'rgba(226, 19, 110, 0.1)',
  },
  nagad: {
    primary: '#F26222',
    primaryDark: '#D4480A',
    bgLight: '#FFF5F0',
    bgLightDark: 'rgba(242, 98, 34, 0.15)',
    borderLight: '#FFEDD5',
    ringLight: 'rgba(242, 98, 34, 0.25)',
    textLight: '#C2410C',
    inputBg: 'rgba(242, 98, 34, 0.03)',
    inputBorder: 'rgba(242, 98, 34, 0.4)',
    inputFocusRing: 'rgba(242, 98, 34, 0.25)',
    boxBg: 'rgba(242, 98, 34, 0.05)',
    bannerBg: 'linear-gradient(135deg, rgba(242, 98, 34, 0.12) 0%, rgba(242, 98, 34, 0.03) 100%)',
    badgeBg: 'rgba(242, 98, 34, 0.1)',
  },
  rocket: {
    primary: '#8C3494',
    primaryDark: '#6E1D75',
    bgLight: '#FAF5FF',
    bgLightDark: 'rgba(140, 52, 148, 0.15)',
    borderLight: '#F3E8FF',
    ringLight: 'rgba(140, 52, 148, 0.25)',
    textLight: '#7E22CE',
    inputBg: 'rgba(140, 52, 148, 0.03)',
    inputBorder: 'rgba(140, 52, 148, 0.4)',
    inputFocusRing: 'rgba(140, 52, 148, 0.25)',
    boxBg: 'rgba(140, 52, 148, 0.05)',
    bannerBg: 'linear-gradient(135deg, rgba(140, 52, 148, 0.12) 0%, rgba(140, 52, 148, 0.03) 100%)',
    badgeBg: 'rgba(140, 52, 148, 0.1)',
  },
  upay: {
    primary: '#0D56A3',
    primaryDark: '#073B72',
    bgLight: '#F0F7FF',
    bgLightDark: 'rgba(13, 86, 163, 0.15)',
    borderLight: '#BAE6FD',
    ringLight: 'rgba(13, 86, 163, 0.25)',
    textLight: '#0369A1',
    inputBg: 'rgba(13, 86, 163, 0.03)',
    inputBorder: 'rgba(13, 86, 163, 0.4)',
    inputFocusRing: 'rgba(13, 86, 163, 0.25)',
    boxBg: 'rgba(13, 86, 163, 0.05)',
    bannerBg: 'linear-gradient(135deg, rgba(13, 86, 163, 0.12) 0%, rgba(250, 207, 1, 0.07) 100%)',
    badgeBg: 'rgba(13, 86, 163, 0.1)',
  },
};

export default function ManualPaymentModal({
  isOpen,
  onClose,
  selectedPlan,
  user,
  blockedExam,
  onViewProfile,
  onExamUnlock
}: ManualPaymentModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<Record<PaymentMethodType, PaymentMethodConfig>>(DEFAULT_PAYMENT_CONFIGS);
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodType>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [senderError, setSenderError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [userNote, setUserNote] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedTrxId, setSubmittedTrxId] = useState('');

  // Reset fields whenever modal opens to ensure it starts empty
  useEffect(() => {
    if (isOpen) {
      setSenderNumber('');
      setSenderError('');
      setTransactionId('');
      setUserNote('');
      setErrorMessage('');
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Subscribe to Admin payment settings
  useEffect(() => {
    const unsubscribe = subscribePaymentMethods((methods) => {
      setPaymentMethods(methods);
      // If current method is disabled, select first enabled
      if (methods[selectedMethodId] && !methods[selectedMethodId].enabled) {
        const firstEnabled = (Object.keys(methods) as PaymentMethodType[]).find(
          (k) => methods[k]?.enabled
        );
        if (firstEnabled) setSelectedMethodId(firstEnabled);
      }
    });
    return () => unsubscribe();
  }, [selectedMethodId]);

  if (!isOpen) return null;

  const currentMethod = paymentMethods[selectedMethodId] || DEFAULT_PAYMENT_CONFIGS[selectedMethodId];
  const brand = BRAND_THEMES[selectedMethodId] || {
    primary: currentMethod?.brandColor || '#E2136E',
    primaryDark: '#B80D57',
    bgLight: '#FFF0F5',
    bgLightDark: 'rgba(226, 19, 110, 0.15)',
    borderLight: '#FBCFE8',
    ringLight: 'rgba(226, 19, 110, 0.25)',
    textLight: '#BE185D',
    inputBg: 'rgba(226, 19, 110, 0.03)',
    inputBorder: 'rgba(226, 19, 110, 0.4)',
    inputFocusRing: 'rgba(226, 19, 110, 0.25)',
    boxBg: 'rgba(226, 19, 110, 0.05)',
    bannerBg: 'linear-gradient(135deg, rgba(226, 19, 110, 0.12) 0%, rgba(226, 19, 110, 0.03) 100%)',
    badgeBg: 'rgba(226, 19, 110, 0.1)',
  };

  // Copy number to clipboard
  const handleCopyNumber = (num: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num).then(() => {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      setErrorMessage('পেমেন্ট রিকোয়েস্ট জমা দিতে অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    const cleanSender = senderNumber.trim();
    const cleanTrx = transactionId.trim().toUpperCase();

    if (!cleanSender) {
      const err = 'প্রেরক মোবাইল নম্বর (Sender Number) লিখুন।';
      setErrorMessage(err);
      setSenderError('মোবাইল নম্বর লিখুন');
      return;
    }
    if (cleanSender.length !== 11) {
      const err = cleanSender.length < 11
        ? 'মোবাইল নম্বরটি ১১ সংখ্যার কম হয়েছে। সঠিক ১১ ডিজিটের নম্বর দিন।'
        : 'মোবাইল নম্বরটি ১১ সংখ্যার বেশি হয়েছে। সঠিক ১১ ডিজিটের নম্বর দিন।';
      setErrorMessage(err);
      setSenderError(err);
      return;
    }

    if (!cleanTrx) {
      setErrorMessage('আপনার লেনদেনের ট্রানজেকশন আইডি (TrxID) প্রদান করুন।');
      return;
    }
    if (cleanTrx.length < 6) {
      setErrorMessage('ট্রানজেকশন আইডিটি অত্যন্ত ছোট মনে হচ্ছে। সঠিক TrxID লিখুন।');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createPaymentRequest({
        userId: user.id || user.uid,
        userName: user.fullName || user.name || (user.email ? user.email.split('@')[0] : 'শিক্ষার্থী'),
        userEmail: user.email || '',
        paymentMethod: selectedMethodId,
        amount: selectedPlan.price,
        packageId: selectedPlan.id,
        packageTitle: selectedPlan.title,
        packageDurationDays: selectedPlan.durationDays || (
          selectedPlan.id === '7_days' ? 7 :
          selectedPlan.id === '30_days' ? 30 :
          selectedPlan.id === '6_months' ? 180 : 30
        ),
        transactionId: cleanTrx,
        senderNumber: cleanSender,
        note: userNote
      });

      if (res.success) {
        setIsSuccess(true);
        setSubmittedTrxId(cleanTrx);
      } else {
        setErrorMessage(res.error || 'পেমেন্ট রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledMethods = (Object.keys(paymentMethods) as PaymentMethodType[]).filter(
    (k) => paymentMethods[k]?.enabled !== false
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="rounded-3xl w-full max-w-lg border shadow-2xl overflow-hidden relative my-auto transition-colors duration-300"
        style={{
          borderColor: brand.borderLight,
          backgroundColor: '#FFFFFF',
        }}
      >
        
        {/* Accent Bar */}
        <div
          className="h-2 w-full transition-colors duration-300"
          style={{
            backgroundColor: isSuccess
              ? '#10b981'
              : brand.primary
          }}
        />

        {/* Close Button */}
        {!isSubmitting && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
            title="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Top Header: Round Medha Exam Logo & Medha Exam Payment System */}
        <div className="pt-6 pb-3 px-6 flex flex-col items-center justify-center text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-md shadow-emerald-500/10 ring-4 ring-emerald-500/10 bg-white dark:bg-slate-800 flex items-center justify-center p-0.5">
            <img
              src="/logo.svg"
              alt="Medha Exam Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h2 className="mt-2.5 text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Medha Exam Payment System
          </h2>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {isSuccess ? (
            /* SUCCESS / PENDING CONFIRMATION STATE */
            <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 shadow-lg shadow-amber-500/10">
                <Clock className="h-9 w-9 text-amber-500 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold text-xs rounded-full border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  <span>যাচাইাধীন (Pending Verification)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  পেমেন্ট রিকোয়েস্ট সফলভাবে গৃহীত হয়েছে!
                </h3>
              </div>

              {/* Submitted Details Box */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">নির্বাচিত প্যাকেজ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPlan.title}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">পেমেন্ট মাধ্যম:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{currentMethod.nameBn || currentMethod.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">প্রেরিত পরিমাণ:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{selectedPlan.priceFormatted}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 dark:text-slate-400">Transaction ID (TrxID):</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                    {submittedTrxId}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-left flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1">
                  <p className="font-bold">পরবর্তী করণীয়:</p>
                  <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300/90">
                    আমাদের এডমিন টিম আপনার লেনদেন ও TrxID যাচাই করে দ্রুততম সময়ে মেম্বারশিপ সক্রিয় করবেন। সাধারণত ১০-৩০ মিনিটের মধ্যে ভেরিফিকেশন সম্পন্ন হয়। আপনি আপনার <strong>প্রোফাইল</strong> থেকে স্ট্যাটাস দেখতে পারবেন।
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {onViewProfile && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewProfile();
                    }}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>প্রোফাইলে স্ট্যাটাস দেখুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT & SUBMISSION FORM */
            <div className="space-y-5">
              
              {/* Header Info */}
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white text-center">
                  মেম্বারশিপ প্যাকেজ সাবস্ক্রাইব করুন
                </h3>

                {blockedExam && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <strong>পরীক্ষা আনলক:</strong> "{blockedExam.title}" পরীক্ষাটি শুরু করতে প্রিমিয়াম মেম্বারশিপ প্রয়োজন।
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Package Banner */}
              <div
                className="p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between"
                style={{
                  background: brand.bannerBg,
                  borderColor: brand.borderLight
                }}
              >
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">নির্বাচিত প্যাকেজ</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{selectedPlan.title}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">({selectedPlan.duration})</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">প্রদেয় পরিমাণ</span>
                  <span
                    className="text-2xl font-black transition-colors duration-300"
                    style={{ color: brand.primary }}
                  >
                    {selectedPlan.priceFormatted}
                  </span>
                </div>
              </div>

              {/* Payment Methods Selection Tabs */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>১. মোবাইল ব্যাংকিং মাধ্যম বেছে নিন:</span>
                </span>

                {enabledMethods.length === 0 ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
                    বর্তমানে কোনো পেমেন্ট মেথড সক্রিয় নেই। এডমিনের সাথে যোগাযোগ করুন।
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {enabledMethods.map((mKey) => {
                      const method = paymentMethods[mKey];
                      const isSelected = selectedMethodId === mKey;
                      const mBrand = BRAND_THEMES[mKey] || brand;

                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => {
                            setSelectedMethodId(mKey);
                            setErrorMessage('');
                          }}
                          style={
                            isSelected
                              ? {
                                  borderColor: mBrand.primary,
                                  backgroundColor: mBrand.bgLight,
                                  boxShadow: `0 4px 14px ${mBrand.ringLight}`,
                                }
                              : undefined
                          }
                          className={`p-2 rounded-2xl border-2 flex flex-col items-center justify-between min-h-[82px] transition-all cursor-pointer ${
                            isSelected
                              ? 'scale-102 ring-2 ring-offset-0'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="w-full h-10 flex items-center justify-center px-0.5 overflow-hidden">
                            <div className="h-8 max-h-8 w-full flex items-center justify-center bg-white rounded-lg px-1 py-0.5">
                              <PaymentMethodLogo methodKey={mKey} className="h-7 max-h-7.5 w-auto max-w-full object-contain" />
                            </div>
                          </div>
                          <span
                            style={isSelected ? { color: mBrand.primary } : undefined}
                            className={`text-[11px] font-extrabold ${
                              isSelected ? '' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {method.nameBn || method.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Method Details & Number Box */}
              {currentMethod && (
                <div
                  className="p-4 sm:p-5 rounded-2xl border transition-all duration-300 space-y-3.5"
                  style={{
                    backgroundColor: brand.bgLight,
                    borderColor: brand.borderLight
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 px-3 py-1.5 rounded-xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <PaymentMethodLogo methodKey={selectedMethodId} className="h-8 max-h-9 w-auto object-contain" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {currentMethod.nameBn || currentMethod.name} নম্বর ({currentMethod.accountType || 'Personal'})
                        </span>
                        <span
                          className="font-mono text-base sm:text-lg font-black tracking-wide block truncate"
                          style={{ color: brand.primary }}
                        >
                          {currentMethod.accountNumber || '01XXXXXXXXX'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyNumber(currentMethod.accountNumber)}
                      style={
                        copiedNumber
                          ? undefined
                          : {
                              borderColor: brand.borderLight,
                              color: brand.textLight,
                            }
                      }
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto ${
                        copiedNumber
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-white dark:bg-slate-800 border hover:bg-slate-50'
                      }`}
                    >
                      {copiedNumber ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" style={{ color: brand.primary }} />
                          <span>নম্বর কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  {currentMethod.accountName && (
                    <div
                      className="text-[11px] px-3 py-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/60"
                      style={{ borderColor: brand.borderLight }}
                    >
                      অ্যাকাউন্ট নাম:{' '}
                      <strong className="font-semibold" style={{ color: brand.primary }}>
                        {currentMethod.accountName}
                      </strong>
                    </div>
                  )}

                  <div
                    className="pt-2.5 border-t text-xs text-slate-600 dark:text-slate-300 space-y-1"
                    style={{ borderColor: brand.borderLight }}
                  >
                    <p className="font-semibold flex items-center gap-1.5 text-[11px]" style={{ color: brand.primary }}>
                      <Info className="h-3.5 w-3.5 shrink-0" style={{ color: brand.primary }} />
                      <span>পেমেন্ট নির্দেশনা:</span>
                    </p>
                    <p className="text-[11px] leading-relaxed pl-5 text-slate-600 dark:text-slate-300">
                      {currentMethod.instruction || 'উপরে দেওয়া নম্বরে Send Money করুন এবং সফল লেনদেনের পর নিচের ফর্মে আপনার TrxID সাবমিট করুন।'}
                    </p>
                  </div>
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>২. টাকা পাঠানোর তথ্য প্রদান করুন:</span>
                </span>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Responsive Form Fields Grid with Clean Spacing & Mobile Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-4">
                  {/* Sender Phone Number */}
                  <div className="w-full flex flex-col justify-between mb-3 sm:mb-0">
                    <div className="w-full">
                      <label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        প্রেরক মোবাইল নম্বর <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative w-full">
                        <Smartphone
                          className={`h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                            senderError ? 'text-rose-500' : 'text-slate-400'
                          }`}
                          style={!senderError ? { color: brand.primary } : undefined}
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Sender Number"
                          value={senderNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSenderNumber(val);
                            if (errorMessage) setErrorMessage('');
                            const trimmed = val.trim();
                            if (trimmed && trimmed.length > 11) {
                              setSenderError('মোবাইল নম্বরটি ১১ সংখ্যার বেশি হয়েছে (১১ ডিজিট হতে হবে)');
                            } else if (trimmed && trimmed.length === 11) {
                              setSenderError('');
                            }
                          }}
                          onBlur={() => {
                            const trimmed = senderNumber.trim();
                            if (trimmed && trimmed.length !== 11) {
                              setSenderError(
                                trimmed.length < 11
                                  ? 'মোবাইল নম্বরটি ১১ সংখ্যার কম হয়েছে (১১ ডিজিট হতে হবে)'
                                  : 'মোবাইল নম্বরটি ১১ সংখ্যার বেশি হয়েছে (১১ ডিজিট হতে হবে)'
                              );
                            } else if (!trimmed) {
                              setSenderError('');
                            }
                          }}
                          style={
                            senderError
                              ? undefined
                              : {
                                  backgroundColor: brand.inputBg,
                                  borderColor: brand.inputBorder,
                                }
                          }
                          className={`w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl border ${
                            senderError
                              ? 'border-rose-500 bg-rose-50/20 text-rose-900 dark:text-rose-200 focus:ring-rose-500/20 focus:border-rose-500'
                              : 'text-slate-900 dark:text-white transition-all shadow-2xs'
                          } text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2`}
                        />
                      </div>
                    </div>
                    <div className="mt-1.5 min-h-[22px] flex items-center">
                      {senderError ? (
                        <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 leading-snug">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 inline text-rose-500" />
                          <span>{senderError}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">যে নম্বর থেকে টাকা পাঠিয়েছেন</span>
                      )}
                    </div>
                  </div>

                  {/* Transaction ID */}
                  <div className="w-full flex flex-col justify-between mb-1 sm:mb-0">
                    <div className="w-full">
                      <label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        ট্রানজেকশন আইডি (TrxID) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative w-full">
                        <Hash
                          className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
                          style={{ color: brand.primary }}
                        />
                        <input
                          type="text"
                          required
                          placeholder="e.g. BKT9X29A"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                          style={{
                            backgroundColor: brand.inputBg,
                            borderColor: brand.inputBorder,
                          }}
                          className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white uppercase placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                    <div className="mt-1.5 min-h-[22px] flex items-center">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">সেন্ডমানি করে ম্যাসেজে প্রাপ্ত Transaction ID লিখুন</span>
                    </div>
                  </div>
                </div>

                {/* Optional Note */}
                <div className="w-full space-y-1.5 pt-1 mb-4">
                  <label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center mb-1.5">
                    <span>মন্তব্য / রেফারেন্স (ঐচ্ছিক)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="প্রয়োজনীয় কোনো তথ্য বা রেফারেন্স (যদি থাকে)"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    style={{
                      backgroundColor: brand.inputBg,
                      borderColor: brand.inputBorder,
                    }}
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs"
                  />
                </div>

                {/* Submit Action Button */}
                <div className="w-full pt-1 mb-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={
                      isSubmitting
                        ? undefined
                        : {
                            background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryDark} 100%)`,
                            boxShadow: `0 8px 20px ${brand.ringLight}`,
                          }
                    }
                    className={`w-full py-3.5 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSubmitting
                        ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                        : 'hover:opacity-95 hover:scale-[1.01]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>রিকোয়েস্ট সাবমিট হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>পেমেন্ট তথ্য সাবমিট করুন ({selectedPlan.priceFormatted})</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                  🔒 আপনার তথ্য সম্পূর্ণ সুরক্ষিত। ভেরিফিকেশনের পর প্রিমিয়াম মেম্বারশিপ সক্রিয় হবে।
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
