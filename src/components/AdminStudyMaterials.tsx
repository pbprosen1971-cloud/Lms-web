/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  ExternalLink,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Crown,
  Search,
  ArrowUpDown,
  Filter,
  Link2
} from 'lucide-react';
import { StudyMaterial, StudyMaterialCategory, StudyMaterialAccessType, StudyMaterialStatus, UserProfile } from '../types';
import {
  subscribeToStudyMaterials,
  saveStudyMaterial,
  deleteStudyMaterial,
  updateStudyMaterialStatus,
  extractDriveFileId,
  buildDrivePreviewUrl,
  buildDriveViewUrl
} from '../services/firestoreService';
import { formatSafeDisplay } from '../lib/dateUtils';

interface AdminStudyMaterialsProps {
  currentUser?: UserProfile | null;
}

const CATEGORY_OPTIONS: { id: StudyMaterialCategory; label: string }[] = [
  { id: 'Syllabus', label: 'সিলেবাস (Syllabus)' },
  { id: 'Previous Questions', label: 'বিগত সালের প্রশ্ন (Previous Questions)' },
  { id: 'Notes', label: 'হ্যান্ডনোট ও সামারি (Notes)' },
  { id: 'Suggestion', label: 'স্পেশাল সাজেশন (Suggestion)' },
  { id: 'Job Preparation', label: 'জব প্রিপারেশন (Job Preparation)' },
  { id: 'Admission Preparation', label: 'ভর্তি প্রস্তুতি (Admission Preparation)' },
  { id: 'Other', label: 'অন্যান্য (Other)' },
];

export default function AdminStudyMaterials({ currentUser }: AdminStudyMaterialsProps) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'hidden'>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'premium'>('all');

  // Form Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<StudyMaterialCategory>('Job Preparation');
  const [driveUrl, setDriveUrl] = useState('');
  const [accessType, setAccessType] = useState<StudyMaterialAccessType>('free');
  const [status, setStatus] = useState<StudyMaterialStatus>('published');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // Extracted drive file ID (live)
  const liveDriveFileId = useMemo(() => {
    return extractDriveFileId(driveUrl);
  }, [driveUrl]);

  // Preview Modal State
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);

  // Realtime subscription to ALL materials (including drafts and hidden)
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToStudyMaterials((data) => {
      setMaterials(data);
      setLoading(false);
    }, false); // publishedOnly = false

    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setTitle('');
    setDescription('');
    setCategory('Job Preparation');
    setDriveUrl('');
    setAccessType('free');
    setStatus('published');
    setDisplayOrder(materials.length + 1);
    setThumbnailUrl('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: StudyMaterial) => {
    setEditingMaterial(m);
    setTitle(m.title);
    setDescription(m.description || '');
    setCategory(m.category);
    setDriveUrl(m.driveUrl);
    setAccessType(m.accessType);
    setStatus(m.status);
    setDisplayOrder(m.displayOrder ?? 0);
    setThumbnailUrl(m.thumbnailUrl || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedUrl = driveUrl.trim();

    if (!trimmedTitle) {
      setFormError('পিডিএফ বা স্টাডি ম্যাটেরিয়ালের শিরোনাম প্রদান করুন।');
      return;
    }

    if (!trimmedUrl) {
      setFormError('গুগল ড্রাইভ পিডিএফ লিঙ্ক প্রদান করুন।');
      return;
    }

    const fileId = extractDriveFileId(trimmedUrl);
    if (!fileId && !trimmedUrl.startsWith('http')) {
      setFormError('সঠিক গুগল ড্রাইভ লিঙ্ক প্রদান করুন (যেমন: https://drive.google.com/file/d/.../view)');
      return;
    }

    setSaving(true);
    try {
      await saveStudyMaterial(
        {
          id: editingMaterial ? editingMaterial.id : undefined,
          title: trimmedTitle,
          description: description.trim(),
          category,
          driveUrl: trimmedUrl,
          driveFileId: fileId,
          accessType,
          status,
          displayOrder: Number(displayOrder) || 0,
          thumbnailUrl: thumbnailUrl.trim(),
        },
        currentUser?.id || currentUser?.uid || 'admin'
      );

      setIsModalOpen(false);
      showToast(editingMaterial ? 'ম্যাটেরিয়াল সফলভাবে আপডেট করা হয়েছে!' : 'নতুন পিডিএফ ম্যাটেরিয়াল সফলভাবে যুক্ত হয়েছে!');
    } catch (err: any) {
      console.error("Save material error:", err);
      setFormError(err?.message || 'ম্যাটেরিয়াল সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${itemTitle}" ম্যাটেরিয়ালটি মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      await deleteStudyMaterial(id);
      showToast('ম্যাটেরিয়ালটি সফলভাবে ডিলিট করা হয়েছে!');
    } catch (err) {
      console.error("Delete error:", err);
      alert('ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  const handleToggleStatus = async (m: StudyMaterial) => {
    const nextStatus: StudyMaterialStatus = m.status === 'published' ? 'hidden' : 'published';
    try {
      await updateStudyMaterialStatus(m.id, nextStatus);
      showToast(`স্ট্যাটাস পরিবর্তন করা হয়েছে: ${nextStatus === 'published' ? 'Published' : 'Hidden'}`);
    } catch (err) {
      console.error("Status toggle error:", err);
    }
  };

  // Filter materials for admin view
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (accessFilter !== 'all' && m.accessType !== accessFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [materials, statusFilter, accessFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            স্টাডি ম্যাটেরিয়াল ও পিডিএফ ব্যবস্থাপনা
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            গুগল ড্রাইভে হোস্টকৃত পিডিএফ হ্যান্ডনোট, সিলেবাস ও সাজেশন নিয়ন্ত্রণ করুন (ফ্রি ও প্রিমিয়াম)।
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4 w-4" />
          নতুন PDF যুক্ত করুন
        </button>
      </div>

      {/* Search & Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পিডিএফ শিরোনাম দিয়ে সার্চ করুন..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">ফিল্টার:</span>

          {/* Access Filter */}
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold focus:outline-none"
          >
            <option value="all">সকল অ্যাক্সেস</option>
            <option value="free">🆓 শুধুমাত্র ফ্রি (Free)</option>
            <option value="premium">👑 শুধুমাত্র প্রিমিয়াম (Premium)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold focus:outline-none"
          >
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="published">🌐 Published</option>
            <option value="draft">📝 Draft</option>
            <option value="hidden">🔒 Hidden</option>
          </select>
        </div>

      </div>

      {/* Materials Table / List */}
      {loading ? (
        <div className="p-12 text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-slate-500">ম্যাটেরিয়াল লোড হচ্ছে...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/40 space-y-3">
          <FileText className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            কোনো স্টাডি ম্যাটেরিয়াল পাওয়া যায়নি।
          </p>
          <p className="text-xs text-slate-500">
            "নতুন PDF যুক্ত করুন" বাটনে ক্লিক করে প্রথম পিডিএফ রিসোর্স যুক্ত করুন।
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-800">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                <th className="p-3.5 w-12 text-center">ক্রম</th>
                <th className="p-3.5">শিরোনাম ও ক্যাটাগরি</th>
                <th className="p-3.5 text-center">অ্যাক্সেস টাইপ</th>
                <th className="p-3.5 text-center">স্ট্যাটাস</th>
                <th className="p-3.5">তারিখ</th>
                <th className="p-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredMaterials.map((m, idx) => (
                <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-3.5 text-center text-slate-400 font-semibold">
                    {m.displayOrder ?? idx + 1}
                  </td>

                  <td className="p-3.5 max-w-[280px] sm:max-w-md">
                    <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                      {m.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {m.category}
                      </span>
                      {m.driveFileId ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-mono text-[10px]">
                          <Check className="h-3 w-3" /> Drive ID: {m.driveFileId.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Direct Link</span>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 text-center">
                    {m.accessType === 'premium' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Crown className="h-3 w-3" /> PREMIUM
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span>🆓</span> FREE
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleToggleStatus(m)}
                      title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        m.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : m.status === 'draft'
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      {m.status === 'published' ? (
                        <>
                          <Globe className="h-2.5 w-2.5" /> Published
                        </>
                      ) : m.status === 'draft' ? (
                        'Draft'
                      ) : (
                        <>
                          <Lock className="h-2.5 w-2.5" /> Hidden
                        </>
                      )}
                    </button>
                  </td>

                  <td className="p-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {formatSafeDisplay(m.createdAt, '—')}
                  </td>

                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Preview */}
                      <button
                        onClick={() => setPreviewMaterial(m)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                        title="প্রিভিউ দেখুন"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 transition-colors"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(m.id, m.title)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingMaterial ? 'স্টাডি ম্যাটেরিয়াল সম্পাদনা' : 'নতুন স্টাডি ম্যাটেরিয়াল যুক্ত করুন'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
              
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 flex items-center gap-2 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>পিডিএফ শিরোনাম (Title) <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: ৪৬তম বিসিএস প্রিলিমিনারি পূর্ণাঙ্গ সিলেবাস"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Category & Access Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    ক্যাটাগরি (Category) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StudyMaterialCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-semibold"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Access Type Toggle (FREE vs PREMIUM) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    অ্যাক্সেস টাইপ (Access Type) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessType('free')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        accessType === 'free'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>🆓</span> FREE
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessType('premium')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        accessType === 'premium'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Crown className="h-3.5 w-3.5" /> PREMIUM
                    </button>
                  </div>
                </div>

              </div>

              {/* Google Drive PDF Link */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Google Drive PDF লিঙ্ক <span className="text-rose-500">*</span></span>
                  {liveDriveFileId && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" /> File ID সনাক্ত হয়েছে
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    required
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1a2B3c.../view?usp=sharing"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  ড্রাইভের ফাইলটির শেয়ার পারমিশন অবশ্যই <strong>"Anyone with the link can view"</strong> করে রাখবেন।
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  বিবরণ (Description)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="পিডিএফ সম্পর্কিত সংক্ষেপ বিবরণ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Status & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Status */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    স্ট্যাটাস (Status)
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StudyMaterialStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-semibold"
                  >
                    <option value="published">🌐 Published (সবার জন্য দৃশ্যমান)</option>
                    <option value="draft">📝 Draft (ড্রাফট হিসেবে সংরক্ষিত)</option>
                    <option value="hidden">🔒 Hidden (লুকানো)</option>
                  </select>
                </div>

                {/* Display Order */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    ক্রম নম্বর (Display Order)
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

              </div>

              {/* Optional Thumbnail URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  থাম্বনেইল / কভার ছবি লিঙ্ক (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs"
                />
              </div>

              {/* Live Preview Test Link */}
              {liveDriveFileId && (
                <div className="pt-2">
                  <a
                    href={buildDriveViewUrl(liveDriveFileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    ড্রাইভ লিঙ্কটি টেস্ট করে দেখুন (নতুন ট্যাবে খুলবে)
                  </a>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <span>সংরক্ষণ করুন</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Admin Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-md">
                  প্রিভিউ: {previewMaterial.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={buildDriveViewUrl(previewMaterial.driveFileId || previewMaterial.driveUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  নতুন ট্যাবে
                </a>
                <button
                  onClick={() => setPreviewMaterial(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950">
              <iframe
                src={buildDrivePreviewUrl(previewMaterial.driveFileId || previewMaterial.driveUrl)}
                title={previewMaterial.title}
                className="w-full h-full border-0"
                allow="autoplay"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
