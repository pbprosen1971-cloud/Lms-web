/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  AlertCircle,
  Copy,
  Save,
  MessageSquare,
  ShieldCheck,
  User,
  Phone,
  Hash,
  Send,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  PaymentRequest,
  PaymentMethodConfig,
  PaymentMethodType,
  UserProfile
} from '../types';
import { PaymentMethodLogo } from './PaymentLogos';
import {
  subscribeAllPaymentRequests,
  subscribePaymentMethods,
  savePaymentMethods,
  approvePaymentRequest,
  rejectPaymentRequest,
  updatePaymentAdminNote,
  DEFAULT_PAYMENT_CONFIGS
} from '../services/paymentService';
import { formatSafeDisplay } from '../lib/dateUtils';

interface AdminPaymentManagementProps {
  currentUser: UserProfile;
}

const METHOD_DETAILS: Record<PaymentMethodType, { name: string; color: string; bg: string }> = {
  bkash: { name: 'বিকাশ', color: 'text-[#D12053]', bg: 'bg-[#D12053]/10' },
  nagad: { name: 'নগদ', color: 'text-[#F26222]', bg: 'bg-[#F26222]/10' },
  upay: { name: 'উপায়', color: 'text-[#005EA6]', bg: 'bg-[#005EA6]/10' },
  rocket: { name: 'রকেট', color: 'text-[#8C3494]', bg: 'bg-[#8C3494]/10' }
};

export default function AdminPaymentManagement({ currentUser }: AdminPaymentManagementProps) {
  const [subTab, setSubTab] = useState<'requests' | 'settings'>('requests');
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [methods, setMethods] = useState<Record<PaymentMethodType, PaymentMethodConfig>>(DEFAULT_PAYMENT_CONFIGS);
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Actions
  const [selectedReqForAction, setSelectedReqForAction] = useState<{
    request: PaymentRequest;
    action: 'approve' | 'reject' | 'note';
  } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionError, setActionError] = useState('');

  // Settings Save State
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  // Subscribe to all payment requests
  useEffect(() => {
    const unsub = subscribeAllPaymentRequests((list) => {
      setRequests(list);
      setLoadingRequests(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to payment method configs
  useEffect(() => {
    const unsub = subscribePaymentMethods((m) => {
      setMethods(m);
      setLoadingMethods(false);
    });
    return () => unsub();
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTrx = req.transactionId?.toLowerCase().includes(q);
        const matchSender = req.senderNumber?.includes(q);
        const matchUser = req.userName?.toLowerCase().includes(q) || req.userEmail?.toLowerCase().includes(q);
        const matchPkg = req.packageTitle?.toLowerCase().includes(q);
        return matchTrx || matchSender || matchUser || matchPkg;
      }

      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'pending').length;
  }, [requests]);

  const handleCopyTrx = (trx: string) => {
    navigator.clipboard.writeText(trx).then(() => {
      setCopiedTrx(trx);
      setTimeout(() => setCopiedTrx(null), 2000);
    });
  };

  // Perform approve / reject / note actions
  const handleConfirmAction = async () => {
    if (!selectedReqForAction) return;
    setActionProcessing(true);
    setActionError('');

    const { request, action } = selectedReqForAction;
    const adminIdentifier = currentUser.email || currentUser.name || 'Admin';

    try {
      if (action === 'approve') {
        await approvePaymentRequest(request, adminIdentifier, actionNote);
      } else if (action === 'reject') {
        await rejectPaymentRequest(request, adminIdentifier, actionNote);
      } else if (action === 'note') {
        await updatePaymentAdminNote(request.id, actionNote);
      }

      setSelectedReqForAction(null);
      setActionNote('');
    } catch (err: any) {
      console.error("Action error:", err);
      setActionError(err?.message || 'অপারেশন সম্পন্ন করতে সমস্যা হয়েছে।');
    } finally {
      setActionProcessing(false);
    }
  };

  // Save Payment Method settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(false);

    try {
      await savePaymentMethods(methods);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save payment methods:", err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateMethodField = (
    methodId: PaymentMethodType,
    field: keyof PaymentMethodConfig,
    value: any
  ) => {
    setMethods((prev) => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Sub-Navigation */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <CreditCard className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              ম্যানুয়াল পেমেন্ট ও মেম্বারশিপ ব্যবস্থাপনা
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            শিক্ষার্থীদের মোবাইল ব্যাংকিং পেমেন্ট রিকোয়েস্ট যাচাই, প্রিমিয়াম অ্যাক্টিভেশন ও বিকাশ/নগদ নম্বর কনফিগারেশন।
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'requests'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4 text-amber-500" />
            <span>পেমেন্ট রিকোয়েস্ট</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'settings'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4 text-primary" />
            <span>মেথড সেটিংস (নম্বর কনফিগ)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: PAYMENT REQUESTS MANAGEMENT                   */}
      {/* ======================================================== */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'pending', label: 'যাচাইাধীন (Pending)', count: pendingCount, color: 'text-amber-600 bg-amber-500/10' },
                { id: 'approved', label: 'অনুমোদিত (Approved)', count: requests.filter((r) => r.status === 'approved').length, color: 'text-emerald-600 bg-emerald-500/10' },
                { id: 'rejected', label: 'বাতিল (Rejected)', count: requests.filter((r) => r.status === 'rejected').length, color: 'text-rose-600 bg-rose-500/10' },
                { id: 'all', label: 'সকল রিকোয়েস্ট', count: requests.length, color: 'text-slate-600 bg-slate-100 dark:bg-slate-700' },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${tab.color}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="TrxID, প্রেরক নম্বর, শিক্ষার্থী খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Requests Table / Cards */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loadingRequests ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                পেমেন্ট রিকোয়েস্ট লোড হচ্ছে...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-bold text-slate-600 dark:text-slate-400">কোনো পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি</p>
                <p className="text-[11px] text-slate-400">ফিল্টার বা সার্চ পরিবর্তন করে দেখুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3.5 pl-5">শিক্ষার্থী</th>
                      <th className="p-3.5">প্যাকেজ ও পরিমাণ</th>
                      <th className="p-3.5">পেমেন্ট মাধ্যম</th>
                      <th className="p-3.5">TrxID ও প্রেরক নম্বর</th>
                      <th className="p-3.5">তারিখ ও সময়</th>
                      <th className="p-3.5">স্ট্যাটাস</th>
                      <th className="p-3.5 text-right pr-5">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRequests.map((req) => {
                      const method = METHOD_DETAILS[req.paymentMethod] || {
                        name: req.paymentMethod,
                        color: 'text-slate-700',
                        bg: 'bg-slate-100'
                      };

                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';
                      const isRejected = req.status === 'rejected';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                          
                          {/* Student Info */}
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{req.userName || 'শিক্ষার্থী'}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">{req.userEmail || '—'}</div>
                            {req.note && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                                "{req.note}"
                              </div>
                            )}
                          </td>

                          {/* Package & Amount */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{req.packageTitle}</div>
                            <div className="font-black text-amber-600 dark:text-amber-400 text-sm">৳ {req.amount}</div>
                          </td>

                          {/* Method */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-6 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                                <PaymentMethodLogo methodKey={req.paymentMethod} className="h-4 w-auto object-contain" />
                              </div>
                              <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                {method.name}
                              </span>
                            </div>
                          </td>

                          {/* TrxID & Sender Number */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white">
                              <span>{req.transactionId}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyTrx(req.transactionId)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                title="কপি করুন"
                              >
                                {copiedTrx === req.transactionId ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{req.senderNumber || '—'}</span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="p-3.5 text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                            {formatSafeDisplay(req.createdAt, '—')}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold text-[11px] rounded-full border border-amber-500/30">
                                <Clock className="h-3 w-3 animate-pulse" />
                                <span>যাচাইাধীন</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] rounded-full border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>অনুমোদিত</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-extrabold text-[11px] rounded-full border border-rose-500/30">
                                <XCircle className="h-3 w-3" />
                                <span>বাতিল</span>
                              </span>
                            )}

                            {req.adminNote && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 max-w-[160px] truncate" title={req.adminNote}>
                                নোট: {req.adminNote}
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReqForAction({ request: req, action: 'approve' });
                                      setActionNote(req.adminNote || 'পেমেন্ট সফলভাবে ভেরিফাই করা হয়েছে।');
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReqForAction({ request: req, action: 'reject' });
                                      setActionNote(req.adminNote || 'ট্রানজেকশন আইডি বা টাকা পাঠানোর তথ্য সঠিক পাওয়া যায়নি।');
                                    }}
                                    className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReqForAction({ request: req, action: 'note' });
                                    setActionNote(req.adminNote || '');
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{req.adminNote ? 'নোট এডিট' : 'নোট দিন'}</span>
                                </button>
                              )}
                            </div>
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
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: PAYMENT METHODS CONFIGURATION                 */}
      {/* ======================================================== */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-primary" />
              <span>মোবাইল ব্যাংকিং অ্যাকাউন্ট ও পেমেন্ট নির্দেশনা কনফিগারেশন</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              এখানে দেওয়া অ্যাকাউন্ট নম্বর ও নির্দেশনাসমূহ শিক্ষার্থীরা প্যাকেজ সাবস্ক্রাইব করার সময় দেখতে পাবে। আপনি যেকোনো মেথড চালু বা বন্ধ রাখতে পারেন।
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>পেমেন্ট মেথড সেটিংস সফলভাবে আপডেট ও সংরক্ষিত হয়েছে!</span>
            </div>
          )}

          {/* Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(['bkash', 'nagad', 'upay', 'rocket'] as PaymentMethodType[]).map((mKey) => {
              const cfg = methods[mKey] || DEFAULT_PAYMENT_CONFIGS[mKey];
              const details = METHOD_DETAILS[mKey];

              return (
                <div
                  key={mKey}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border-2 p-5 shadow-sm space-y-4 transition-all ${
                    cfg.enabled
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-200/50 dark:border-slate-800 opacity-70 bg-slate-50/50 dark:bg-slate-900/30'
                  }`}
                >
                  {/* Card Header & Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/80">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 px-2 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <PaymentMethodLogo methodKey={mKey} className="h-6 w-auto object-contain" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {cfg.nameBn} ({cfg.name})
                        </h4>
                        <span className={`text-[10px] font-bold ${cfg.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {cfg.enabled ? '● সক্রিয় (Active)' : '○ নিষ্ক্রিয় (Disabled)'}
                        </span>
                      </div>
                    </div>

                    {/* Enable / Disable Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => updateMethodField(mKey, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Form Inputs for this method */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Account Number */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                          অ্যাকাউন্ট নম্বর <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={cfg.accountNumber || ''}
                          onChange={(e) => updateMethodField(mKey, 'accountNumber', e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      {/* Account Type */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                          অ্যাকাউন্টের ধরন
                        </label>
                        <input
                          type="text"
                          value={cfg.accountType || ''}
                          onChange={(e) => updateMethodField(mKey, 'accountType', e.target.value)}
                          placeholder="Personal (Send Money)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Account Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        অ্যাকাউন্টের নাম / হোল্ডার
                      </label>
                      <input
                        type="text"
                        value={cfg.accountName || ''}
                        onChange={(e) => updateMethodField(mKey, 'accountName', e.target.value)}
                        placeholder="মেধা এক্সাম অফিসিয়াল"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    {/* Instruction Textarea */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        পেমেন্ট নির্দেশনা (Instructions)
                      </label>
                      <textarea
                        rows={2}
                        value={cfg.instruction || ''}
                        onChange={(e) => updateMethodField(mKey, 'instruction', e.target.value)}
                        placeholder="অ্যাপ বা ইউএসএসডি দিয়ে টাকা পাঠানোর নির্দেশনা লিখুন..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={settingsSaving}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {settingsSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>পেমেন্ট সেটিংস সংরক্ষণ করুন (Save Settings)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* APPROVE / REJECT / NOTE ACTION CONFIRMATION MODAL        */}
      {/* ======================================================== */}
      {selectedReqForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl text-white ${
                  selectedReqForAction.action === 'approve' ? 'bg-emerald-600' :
                  selectedReqForAction.action === 'reject' ? 'bg-rose-600' : 'bg-primary'
                }`}>
                  {selectedReqForAction.action === 'approve' ? <Check className="h-5 w-5" /> :
                   selectedReqForAction.action === 'reject' ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedReqForAction.action === 'approve' && 'পেমেন্ট অনুমোদন ও প্রিমিয়াম সক্রিয়করণ'}
                  {selectedReqForAction.action === 'reject' && 'পেমেন্ট রিকোয়েস্ট বাতিল'}
                  {selectedReqForAction.action === 'note' && 'এডমিন নোট হালনাগাদ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqForAction(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Request Summary */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">শিক্ষার্থী:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReqForAction.request.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">প্যাকেজ:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {selectedReqForAction.request.packageTitle} (৳ {selectedReqForAction.request.amount})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মাধ্যম ও নম্বর:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedReqForAction.request.paymentMethod.toUpperCase()} — {selectedReqForAction.request.senderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TrxID:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  {selectedReqForAction.request.transactionId}
                </span>
              </div>
            </div>

            {selectedReqForAction.action === 'approve' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>অটোমেটিক প্রিমিয়াম সক্রিয়করণ:</strong> Approve বাটনে ক্লিক করলে শিক্ষার্থীর অ্যাকাউন্টে সাথে সাথে প্রিমিয়াম মেম্বারশিপ এবং মেয়াদ যুক্ত হয়ে যাবে।
                </div>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Note input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                এডমিন নোট (Admin Note - শিক্ষার্থী দেখতে পাবে):
              </label>
              <textarea
                rows={2}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="শিক্ষার্থীর জন্য কোনো বার্তা বা মন্তব্য..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReqForAction(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={handleConfirmAction}
                className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  selectedReqForAction.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                    : selectedReqForAction.action === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {actionProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {selectedReqForAction.action === 'approve' && 'অনুমোদন ও প্রিমিয়াম চালু করুন'}
                  {selectedReqForAction.action === 'reject' && 'বাতিল নিশ্চিত করুন'}
                  {selectedReqForAction.action === 'note' && 'নোট সংরক্ষণ করুন'}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
