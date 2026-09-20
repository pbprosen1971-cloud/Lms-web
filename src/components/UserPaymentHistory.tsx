/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { UserProfile, PaymentRequest, PaymentMethodType } from '../types';
import { PaymentMethodLogo } from './PaymentLogos';
import { subscribeUserPaymentRequests } from '../services/paymentService';
import { formatSafeDisplay } from '../lib/dateUtils';

interface UserPaymentHistoryProps {
  user: UserProfile;
  onNavigateToPlans?: () => void;
}

const METHOD_LABELS: Record<PaymentMethodType, { name: string; color: string; bg: string }> = {
  bkash: { name: 'বিকাশ (bKash)', color: 'text-[#D12053]', bg: 'bg-[#D12053]/10' },
  nagad: { name: 'নগদ (Nagad)', color: 'text-[#F26222]', bg: 'bg-[#F26222]/10' },
  upay: { name: 'উপায় (Upay)', color: 'text-[#005EA6]', bg: 'bg-[#005EA6]/10' },
  rocket: { name: 'রকেট (Rocket)', color: 'text-[#8C3494]', bg: 'bg-[#8C3494]/10' }
};

export default function UserPaymentHistory({
  user,
  onNavigateToPlans
}: UserPaymentHistoryProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  const uid = user.id || user.uid;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeUserPaymentRequests(uid, (list) => {
      setRequests(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const handleCopyTrx = (trx: string) => {
    navigator.clipboard.writeText(trx).then(() => {
      setCopiedTrx(trx);
      setTimeout(() => setCopiedTrx(null), 2000);
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
          <CreditCard className="h-4.5 w-4.5 text-amber-500" />
          <span>পেমেন্ট ও মেম্বারশিপ হিস্ট্রি (Payment History)</span>
        </h3>

        {onNavigateToPlans && (
          <button
            type="button"
            onClick={onNavigateToPlans}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>নতুন প্যাকেজ নিন</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
          পেমেন্ট তথ্য লোড হচ্ছে...
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
          <CreditCard className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">কোনো পেমেন্ট রিকোয়েস্ট নেই</h4>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            আপনি এখনও কোনো মেম্বারশিপ প্যাকেজের জন্য ম্যানুয়াল পেমেন্ট রিকোয়েস্ট পাঠাননি।
          </p>
          {onNavigateToPlans && (
            <button
              type="button"
              onClick={onNavigateToPlans}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              প্রিমিয়াম প্যাকেজ দেখুন
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const methodInfo = METHOD_LABELS[req.paymentMethod] || {
              name: req.paymentMethod,
              color: 'text-slate-700',
              bg: 'bg-slate-100'
            };

            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/70 transition-all space-y-3 shadow-2xs"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <PaymentMethodLogo methodKey={req.paymentMethod} className="h-4 w-auto object-contain" />
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {req.packageTitle || 'প্রিমিয়াম প্যাকেজ'}
                    </span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-xs">
                      ৳ {req.amount}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold text-[11px] rounded-full border border-amber-500/30">
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span>যাচাইাধীন (Pending)</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>অনুমোদিত (Approved)</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-extrabold text-[11px] rounded-full border border-rose-500/30">
                        <XCircle className="h-3 w-3" />
                        <span>বাতিল (Rejected)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs text-slate-600 dark:text-slate-400 pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white/70 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-400 font-medium">TrxID:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{req.transactionId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyTrx(req.transactionId)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="কপি করুন"
                      >
                        {copiedTrx === req.transactionId ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white/70 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-400 font-medium">প্রেরক:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">{req.senderNumber || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white/70 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-400 font-medium">তারিখ:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate">
                      {formatSafeDisplay(req.createdAt, '—')}
                    </span>
                  </div>
                </div>

                {/* Admin Note if provided */}
                {req.adminNote && (
                  <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">এডমিন মন্তব্য:</span> {req.adminNote}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
