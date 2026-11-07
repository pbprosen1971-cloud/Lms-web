/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Search,
  User,
  ChevronRight,
  Filter,
  Share2,
  Copy,
  Check,
  Facebook,
  X,
} from 'lucide-react';
import { Article } from '../types';
import { subscribeToPublishedArticles } from '../services/articleService';
import { applySEO } from '../utils/seo';

interface ArticlesViewProps {
  onSelectArticle: (slug: string) => void;
  setView?: (view: string) => void;
}

const ITEMS_PER_PAGE = 9;

export default function ArticlesView({ onSelectArticle, setView }: ArticlesViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [activeShareSlug, setActiveShareSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Close share popover when clicking anywhere outside
  useEffect(() => {
    const handleDocClick = () => {
      setActiveShareSlug(null);
    };
    if (activeShareSlug) {
      window.addEventListener('click', handleDocClick);
      return () => window.removeEventListener('click', handleDocClick);
    }
  }, [activeShareSlug]);

  const getArticleShareUrl = (slug: string) => {
    const safeSlug = encodeURIComponent(slug);
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/article/${safeSlug}`;
    }
    return `https://medhaexam.site/article/${safeSlug}`;
  };

  const handleToggleShare = (e: React.MouseEvent, art: Article) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.innerWidth < 640) {
      navigator
        .share({
          title: art.title,
          text: art.shortDescription || art.title,
          url: getArticleShareUrl(art.slug),
        })
        .catch(() => {});
      return;
    }
    setActiveShareSlug((prev) => (prev === art.slug ? null : art.slug));
  };

  const handleCopyArticleLink = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const url = getArticleShareUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => {
      setCopiedSlug(null);
    }, 2500);
  };

  // Apply SEO on mount
  useEffect(() => {
    applySEO('articles', {
      title: 'আর্টিকেল ও গাইডলাইন — বিসিএস ও সরকারি চাকরির প্রস্তুতি | Medha Exam',
      description: 'বিসিএস, ব্যাংক ও সরকারি চাকরি পরীক্ষার সফল প্রস্তুতি, বিষয়ভিত্তিক শর্টকাট, পড়ার রুটিন ও ক্যারিয়ার গাইডলাইন বিষয়ক দরকারি আর্টিকেল পড়ুন।',
      canonicalPath: '/articles',
    });
  }, []);

  // Fetch published articles
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToPublishedArticles(
      (list) => {
        setArticles(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Extract unique categories from articles
  const categories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['all', ...Array.from(set)];
  }, [articles]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      if (selectedCategory !== 'all' && art.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchDesc = art.shortDescription.toLowerCase().includes(q);
        const matchCat = (art.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [articles, selectedCategory, searchQuery]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  const formatBanglaDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
      return d.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return d.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => {
              if (setView) setView('home');
              window.history.pushState({}, '', '/');
            }}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            হোম
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900 dark:text-white font-semibold">আর্টিকেল ও গাইডলাইন</span>
        </nav>

        {/* Clean Hero Header */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-300">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              চাকরি প্রস্তুতির সেরা <span className="text-primary">আর্টিকেল ও গাইডলাইন</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              বিসিএস, সরকারি ব্যাংক, শিক্ষক নিয়োগ ও মন্ত্রণালয় পরীক্ষার বিষয়ভিত্তিক কৌশল, গুরুত্বপূর্ণ নোট, রুটিন এবং ক্যারিয়ার বিষয়ক দিকনির্দেশনামূলক আর্টিকেল পড়ুন।
            </p>

            {/* Quick Search */}
            <div className="pt-2 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  placeholder="আর্টিকেলের বিষয় বা শিরোনাম খুঁজুন..."
                  className="w-full pl-12 pr-4 py-3 text-sm sm:text-base rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
                  >
                    ক্লিয়ার
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 pl-1">
              <Filter className="h-3.5 w-3.5" />
              <span>ক্যাটাগরি:</span>
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat === 'all' ? 'সকল আর্টিকেল' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Articles List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 animate-pulse shadow-xs"
              >
                <div className="aspect-video w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-primary flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">কোনো আর্টিকেল পাওয়া যায়নি</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `"${searchQuery}" দিয়ে কোনো আর্টিকেল খুঁজে পাওয়া যায়নি। অন্য কোনো বিষয় বা শব্দ দিয়ে চেষ্টা করুন।`
                : 'বর্তমানে কোনো আর্টিকেল প্রকাশিত হয়নি। খুব শীঘ্রই নতুন আর্টিকেল প্রকাশিত হবে।'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-all cursor-pointer"
              >
                সকল আর্টিকেল দেখুন
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {visibleArticles.map((art) => (
                <article
                  key={art.id}
                  onClick={() => onSelectArticle(art.slug)}
                  className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                >
                  {/* Banner Image */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    {art.bannerImage ? (
                      <img
                        src={art.bannerImage}
                        alt={art.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-emerald-600/10 via-teal-500/5 to-slate-800/10 p-6 text-center">
                        <BookOpen className="h-10 w-10 text-emerald-600/50 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          মেধা এক্সাম আর্টিকেল
                        </span>
                      </div>
                    )}

                    {/* Category Badge on top of image */}
                    {art.category && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 dark:bg-slate-900/95 text-emerald-700 dark:text-emerald-400 shadow-sm backdrop-blur-xs border border-white/20">
                          {art.category}
                        </span>
                      </div>
                    )}

                    {/* Reading Time Badge */}
                    <div className="absolute bottom-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                        <Clock className="h-3 w-3" />
                        <span>{art.readingTimeMinutes || 3} মিনিট</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      {/* Meta date */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{formatBanglaDate(art.publishedAt || art.createdAt)}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {art.title}
                      </h3>

                      {/* Short Description */}
                      {art.shortDescription && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {art.shortDescription}
                        </p>
                      )}
                    </div>

                    {/* Bottom Row */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      {/* Share Option */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => handleToggleShare(e, art)}
                          title="আর্টিকেল শেয়ার করুন"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5 text-primary" />
                          <span>শেয়ার করুন</span>
                        </button>

                        {/* Quick Share Menu Popup */}
                        {activeShareSlug === art.slug && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-full left-0 mb-2 z-30 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="px-2 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60 mb-1 flex items-center justify-between">
                              <span>শেয়ার করুন</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveShareSlug(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Copy link */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyArticleLink(e, art.slug)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                {copiedSlug === art.slug ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                                )}
                                <span className={copiedSlug === art.slug ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                                  {copiedSlug === art.slug ? 'লিংক কপি হয়েছে!' : 'লিংক কপি করুন'}
                                </span>
                              </span>
                            </button>

                            {/* Facebook */}
                            <a
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getArticleShareUrl(art.slug))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#1877F2]/10 text-slate-700 dark:text-slate-200 hover:text-[#1877F2] transition-colors"
                            >
                              <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
                              <span>ফেসবুক</span>
                            </a>

                            {/* WhatsApp */}
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(art.title + '\n' + getArticleShareUrl(art.slug))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#25D366]/10 text-slate-700 dark:text-slate-200 hover:text-[#25D366] transition-colors"
                            >
                              <svg className="w-3.5 h-3.5 fill-[#25D366]" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                              </svg>
                              <span>হোয়াটসঅ্যাপ</span>
                            </a>

                            {/* Native Share button if supported */}
                            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator
                                    .share({
                                      title: art.title,
                                      text: art.shortDescription || art.title,
                                      url: getArticleShareUrl(art.slug),
                                    })
                                    .catch(() => {});
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                <Share2 className="h-3.5 w-3.5 text-primary" />
                                <span>অন্যান্য অ্যাপে শেয়ার...</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 font-bold text-primary group-hover:translate-x-1 transition-transform">
                        <span>বিস্তারিত পড়ুন</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  className="px-6 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <span>আরও আর্টিকেল লোড করুন ({filteredArticles.length - visibleCount} টি বাকি)</span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
