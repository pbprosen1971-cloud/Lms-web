/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  FileText,
  Eye,
  Download,
  Lock,
  Crown,
  Sparkles,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  GraduationCap
} from 'lucide-react';
import { StudyMaterial, UserProfile } from '../types';
import {
  subscribeToStudyMaterials,
  buildDrivePreviewUrl,
  buildDriveDownloadUrl,
  buildDriveViewUrl,
  recordMaterialAccess
} from '../services/firestoreService';
import { PlexusHeroBackground } from './PlexusHeroBackground';

interface StudyMaterialsViewProps {
  user: UserProfile | null;
  setView: (view: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'সকল ক্যাটাগরি' },
  { id: 'Syllabus', label: 'সিলেবাস' },
  { id: 'Previous Questions', label: 'বিগত সালের প্রশ্ন' },
  { id: 'Notes', label: 'হ্যান্ডনোট ও সামারি' },
  { id: 'Suggestion', label: 'স্পেশাল সাজেশন' },
  { id: 'Job Preparation', label: 'জব প্রিপারেশন' },
  { id: 'Admission Preparation', label: 'ভর্তি প্রস্তুতি' },
  { id: 'Other', label: 'অন্যান্য' },
];

const DEFAULT_STUDY_MATERIALS: StudyMaterial[] = [
  {
    id: 'mat_bcs_syllabus',
    title: '৪৬তম ও ৪৭তম বিসিএস প্রিলিমিনারি পূর্ণাঙ্গ সিলেবাস ও বিষয়ভিত্তিক নির্দেশিকা',
    description: 'বাংলাদেশ সরকারি কর্ম কমিশন (BPSC) নির্ধারিত প্রিলিমিনারি পরীক্ষার ২০০ নম্বরের পূর্ণাঙ্গ সিলেবাস ও মানবন্টন নির্দেশিকা।',
    category: 'Syllabus',
    driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    accessType: 'free',
    status: 'published',
    displayOrder: 1,
    createdAt: '2026-09-10T10:00:00.000Z',
    createdBy: 'admin',
  },
  {
    id: 'mat_math_shortcuts',
    title: 'বিসিএস ও সরকারি চাকরি গণিত শর্টকাট টেকনিক ও পূর্ণাঙ্গ হ্যান্ডনোট',
    description: 'পাটিগণিত, বীজগণিত ও জ্যামিতির জটিল অঙ্কগুলো সহজে ১০-১৫ সেকেন্ডে সমাধানের প্রয়োজনীয় সূত্রাবলী ও ব্যাখ্যা।',
    category: 'Notes',
    driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    accessType: 'free',
    status: 'published',
    displayOrder: 2,
    createdAt: '2026-09-09T14:30:00.000Z',
    createdBy: 'admin',
  },
  {
    id: 'mat_premium_bulletin',
    title: 'স্পেশাল বিসিএস ও ব্যাংক প্রিলিমিনারি সাজেস্টিভ বুলেটিন ও সুপার নোট (২০২৬)',
    description: 'বিগত ১৫ বছরের প্রশ্ন বিশ্লেষণ এবং সাম্প্রতিক গুরুত্বপূর্ণ সাধারণ জ্ঞান ও আন্তর্জাতিক বিষয়ের শীর্ষ ১০০টি নিশ্চিত প্রশ্নের সুপার নোট।',
    category: 'Suggestion',
    driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    accessType: 'premium',
    status: 'published',
    displayOrder: 3,
    createdAt: '2026-09-11T04:00:00.000Z',
    createdBy: 'admin',
  },
  {
    id: 'mat_job_questions_5yr',
    title: 'বিগত ৫ বছরের বিভিন্ন মন্ত্রণালয় ও অধিদপ্তরের নিয়োগ পরীক্ষার প্রশ্ন সমাধান',
    description: 'খাদ্য অধিদপ্তর, সমাজসেবা, পরিসংখ্যান ও প্রাথমিক সহকারী শিক্ষক নিয়োগ পরীক্ষার ব্যাখ্যাসহ নির্ভুল সমাধান শিট।',
    category: 'Previous Questions',
    driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    accessType: 'premium',
    status: 'published',
    displayOrder: 4,
    createdAt: '2026-09-08T09:15:00.000Z',
    createdBy: 'admin',
  },
];


export default function StudyMaterialsView({ user, setView }: StudyMaterialsViewProps) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'premium'>('all');

  // Preview Modal State
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);

  // Check if current user has active premium membership
  const isUserPremium = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.isPremium) {
      if (user.isPremiumExpiryDate) {
        const exp = new Date(user.isPremiumExpiryDate).getTime();
        if (!isNaN(exp) && exp < Date.now()) {
          return false;
        }
      }
      return true;
    }
    return false;
  }, [user]);

  // Realtime subscription to published materials
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToStudyMaterials((data) => {
      setMaterials(data && data.length > 0 ? data : DEFAULT_STUDY_MATERIALS);
      setLoading(false);
    }, true); // publishedOnly = true

    return () => unsub();
  }, []);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      // Category filter
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }
      // Access filter
      if (accessFilter !== 'all' && m.accessType !== accessFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchDesc = m.description?.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) {
          return false;
        }
      }
      return true;
    });
  }, [materials, selectedCategory, accessFilter, searchQuery]);

  // Handle PDF Preview Click
  const handlePreview = (m: StudyMaterial) => {
    // If premium, ensure user has active premium status
    if (m.accessType === 'premium' && !isUserPremium) {
      return;
    }

    setPreviewMaterial(m);

    // Record user access history if logged in
    if (user) {
      recordMaterialAccess(user.id || user.uid || '', {
        id: m.id,
        title: m.title,
        category: m.category,
        accessType: m.accessType,
        driveUrl: m.driveUrl,
        driveFileId: m.driveFileId,
      });
    }
  };

  // Handle PDF Download Click
  const handleDownload = (m: StudyMaterial) => {
    // If premium, ensure user has active premium status
    if (m.accessType === 'premium' && !isUserPremium) {
      return;
    }

    const downloadUrl = buildDriveDownloadUrl(m.driveFileId || m.driveUrl);
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');

    // Record user access history if logged in
    if (user) {
      recordMaterialAccess(user.id || user.uid || '', {
        id: m.id,
        title: m.title,
        category: m.category,
        accessType: m.accessType,
        driveUrl: m.driveUrl,
        driveFileId: m.driveFileId,
      });
    }
  };

  // Handle Become Premium click
  const handleBecomePremium = () => {
    if (!user) {
      setView('login');
    } else {
      setView('home');
      // Scroll to packages/pricing section on homeview
      setTimeout(() => {
        const pricingEl = document.getElementById('pricing') || document.getElementById('packages');
        if (pricingEl) {
          pricingEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 sm:p-10 text-white shadow-xl shadow-emerald-950/20">
        {/* Animated Plexus Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <PlexusHeroBackground opacity={0.88} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-emerald-950/50 dark:from-slate-950/95 dark:via-slate-950/70 dark:to-emerald-950/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold">
            <BookOpen className="h-4 w-4" />
            <span>ডিজিটাল স্টাডি লাইব্রেরি</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            স্টাডি ম্যাটেরিয়াল ও পিডিএফ রিসোর্স
          </h1>
          <p className="text-emerald-50 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl">
            বিসিএস, ব্যাংক, প্রাইমারি এবং বিভিন্ন মন্ত্রণালয় নিয়োগ পরীক্ষার সেরা সব হ্যান্ডনোট, পূর্ণাঙ্গ সিলেবাস, বিষয়ভিত্তিক সাজেশন ও বিগত সালের প্রশ্ন সমাধান এক প্ল্যাটফর্মে।
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium">
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> নিয়মিত হালনাগাদ
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> নির্ভুল ও প্রামাণ্য তথ্য
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> মোবাইল ও প্রিন্ট ফ্রেন্ডলি
            </span>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-4 opacity-15 hidden sm:block pointer-events-none">
          <GraduationCap className="h-48 w-48 text-white" />
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        
        {/* Top Controls: Search Input & Access Tabs */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পিডিএফের নাম বা বিষয় লিখে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Access Filter Tabs (All / Free / Premium) */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60 shrink-0 self-start md:self-center">
            <button
              onClick={() => setAccessFilter('all')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                accessFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সকল রিসোর্স ({materials.length})
            </button>
            <button
              onClick={() => setAccessFilter('free')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                accessFilter === 'free'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              <span>🆓</span> ফ্রি
            </button>
            <button
              onClick={() => setAccessFilter('premium')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                accessFilter === 'premium'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
              }`}
            >
              <Crown className="h-3.5 w-3.5" /> প্রিমিয়াম
            </button>
          </div>

        </div>

        {/* Category Filter Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 pl-1 pr-2">
            <Filter className="h-3.5 w-3.5" /> ফিল্টার:
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all duration-150 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Materials Grid / List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">স্টাডি ম্যাটেরিয়াল লোড হচ্ছে...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              কোনো স্টাডি ম্যাটেরিয়াল পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              আপনার ফিল্টার বা সার্চের সাথে মিলে এমন কোনো পিডিএফ পাওয়া যায়নি। অন্য ক্যাটাগরি নির্বাচন করুন।
            </p>
          </div>
          {(searchQuery || selectedCategory !== 'all' || accessFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setAccessFilter('all');
              }}
              className="px-4 py-2 bg-primary/10 text-primary dark:bg-primary/20 text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all"
            >
              সব ফিল্টার ক্লিয়ার করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((m) => {
            const isPremium = m.accessType === 'premium';
            const hasAccess = !isPremium || isUserPremium;

            return (
              <div
                key={m.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden group ${
                  isPremium
                    ? 'bg-gradient-to-b from-amber-500/[0.03] to-white dark:to-slate-900 border-amber-500/30 hover:border-amber-500/60 shadow-sm hover:shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-primary/50 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Top Accent Strip */}
                <div
                  className={`h-1.5 w-full ${
                    isPremium ? 'bg-amber-500' : 'bg-primary'
                  }`}
                />

                {/* Card Content */}
                <div className="p-5 sm:p-6 space-y-3.5 flex-1">
                  
                  {/* Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {m.category || 'সাধারণ'}
                    </span>

                    {isPremium ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Crown className="h-3 w-3" /> প্রিমিয়াম
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span>🆓</span> ফ্রি
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                </div>

                {/* Card Footer Actions */}
                <div className="p-5 pt-0 sm:p-6 sm:pt-0">
                  {hasAccess ? (
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => handlePreview(m)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all active:scale-[0.98]"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span>প্রিভিউ</span>
                      </button>

                      <button
                        onClick={() => handleDownload(m)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-xs shadow-primary/20 active:scale-[0.98]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>ডাউনলোড</span>
                      </button>
                    </div>
                  ) : (
                    /* Locked Premium UI for non-premium users */
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <Lock className="h-3.5 w-3.5" />
                        <span>প্রিমিয়াম কনটেন্ট</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                        এই PDFটি শুধুমাত্র Premium Members-এর জন্য।
                      </p>
                      <button
                        onClick={handleBecomePremium}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs shadow-amber-500/20 active:scale-[0.98]"
                      >
                        <Crown className="h-3.5 w-3.5" />
                        <span>প্রিমিয়াম মেম্বার হোন</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {previewMaterial.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">{previewMaterial.category}</span>
                    <span>•</span>
                    <span>{previewMaterial.accessType === 'premium' ? '👑 Premium' : '🆓 Free'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(previewMaterial)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
                  title="ডাউনলোড করুন"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ডাউনলোড</span>
                </button>

                <button
                  onClick={() => window.open(buildDriveViewUrl(previewMaterial.driveFileId || previewMaterial.driveUrl), '_blank', 'noopener,noreferrer')}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                  title="নতুন ট্যাবে খুলুন"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setPreviewMaterial(null)}
                  className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-all"
                  title="বন্ধ করুন"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Google Drive Embedded Preview */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
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
