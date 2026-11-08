/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Share2,
  Check,
  BookOpen,
  Facebook,
  Copy,
  ChevronRight,
  Sparkles,
  Tag,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Article } from '../types';
import { getArticleBySlug, subscribeToPublishedArticles } from '../services/articleService';
import ArticleContentRenderer from './ArticleContentRenderer';
import { applySEO, BASE_SITE_URL } from '../utils/seo';

interface ArticleDetailViewProps {
  slug: string;
  onBack: () => void;
  onSelectRelatedArticle: (slug: string) => void;
  setView?: (view: string) => void;
}

export default function ArticleDetailView({
  slug,
  onBack,
  onSelectRelatedArticle,
  setView,
}: ArticleDetailViewProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fetch article data by slug
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const art = await getArticleBySlug(slug);
        if (!isMounted) return;

        setArticle(art);
        setLoading(false);

        if (art) {
          // Apply dynamic SEO for this specific article
          const canonical = `/article/${art.slug}`;
        const pageTitle = `${art.title} — Medha Exam`;
        const pageDesc = art.shortDescription || art.title;

        applySEO('articles', {
          title: pageTitle,
          description: pageDesc,
          canonicalPath: canonical,
          ogType: 'article',
          ogImage: art.bannerImage || undefined,
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            'mainEntityOfPage': {
              '@type': 'WebPage',
              '@id': `${BASE_SITE_URL}${canonical}`,
            },
            'headline': art.title,
            'description': pageDesc,
            'image': art.bannerImage ? [art.bannerImage] : undefined,
            'datePublished': art.publishedAt || art.createdAt,
            'dateModified': art.updatedAt || art.publishedAt || art.createdAt,
            'author': {
              '@type': 'Person',
              'name': art.authorName || 'মেধা এক্সাম টিম',
            },
            'publisher': {
              '@type': 'Organization',
              'name': 'Medha Exam',
              'logo': {
                '@type': 'ImageObject',
                'url': `${BASE_SITE_URL}/logo.png`,
              },
            },
          },
        });
      }
    } catch (err) {
      console.warn('Failed to load article details:', err);
      if (!isMounted) return;
      setArticle(null);
      setLoading(false);
    }
  }

  loadData();

    // Fetch related published articles
    const unsub = subscribeToPublishedArticles((all) => {
      if (!isMounted) return;
      const others = all.filter((a) => a.slug !== slug).slice(0, 3);
      setRelatedArticles(others);
    });

    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [slug]);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/article/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/article/${slug}` : `${BASE_SITE_URL}/article/${slug}`;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-20 px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-3">আর্টিকেল লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4">
        <div className="max-w-xl mx-auto text-center bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <BookOpen className="h-14 w-14 mx-auto text-slate-400 opacity-60 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">আর্টিকেলটি খুঁজে পাওয়া যায়নি</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            অনুরোধকৃত আর্টিকেলটি সরিয়ে নেওয়া হতে পারে অথবা এর লিংকটি ভুল হতে পারে।
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>সকল আর্টিকেলে ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb & Back */}
        <div className="flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => {
                if (setView) setView('home');
                window.history.pushState({}, '', '/');
              }}
              className="hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              হোম
            </button>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <button
              type="button"
              onClick={onBack}
              className="hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              আর্টিকেল
            </button>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-slate-900 dark:text-white font-semibold truncate">
              {article.title}
            </span>
          </nav>

          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>ফিরে যান</span>
          </button>
        </div>

        {/* Article Container Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-10 space-y-6">
          {/* Header Info */}
          <header className="space-y-4">
            {/* Category badge */}
            {article.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400">
                {article.category}
              </span>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {article.title}
            </h1>

            {/* Meta Row: Author, Date, Reading time & Share */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  <span>{article.authorName || 'মেধা এক্সাম টিম'}</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{formatBanglaDate(article.publishedAt || article.createdAt)}</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{article.readingTimeMinutes || 3} মিনিট পড়ার সময়</span>
                </span>
              </div>

              {/* Social Share Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold mr-1">শেয়ার করুন:</span>
                
                {/* Facebook Share */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="ফেসবুকে শেয়ার করুন"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#1877F2] hover:text-white transition-all cursor-pointer"
                >
                  <Facebook className="h-4 w-4" />
                </a>

                {/* WhatsApp Share */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' ' + currentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="হোয়াটসঅ্যাপে শেয়ার করুন"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#25D366] hover:text-white transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </a>

                {/* Telegram Share */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="টেলিগ্রামে শেয়ার করুন"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#229ED9] hover:text-white transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
                  </svg>
                </a>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="লিংক কপি করুন"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white transition-all cursor-pointer relative"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </header>

          {/* Banner Image */}
          {article.bannerImage && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 aspect-video max-h-[460px] w-full bg-slate-100 dark:bg-slate-800">
              <img
                src={article.bannerImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Short Description Lead Paragraph */}
          {article.shortDescription && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-l-4 border-primary text-slate-800 dark:text-slate-200 text-base sm:text-lg font-medium leading-relaxed italic">
              {article.shortDescription}
            </div>
          )}

          {/* Article Full Body */}
          <div className="pt-2">
            <ArticleContentRenderer content={article.content} />
          </div>

          {/* End of article notice */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="flex justify-center">
              <a
                href="https://www.facebook.com/medhaexam"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#1877F2]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                title="Our Official Facebook Page"
              >
                <Facebook className="h-4.5 w-4.5 fill-current" />
                <span>Our Official Facebook</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              মেধা এক্সাম পরিবারের সাথে থাকার জন্য ধন্যবাদ। নিয়মিত লাইভ মডেল টেস্ট ও প্র্যাকটিস করতে আমাদের সাথেই থাকুন।
            </p>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>সম্পর্কিত অন্যান্য আর্টিকেল</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {relatedArticles.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectRelatedArticle(rel.slug)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {rel.bannerImage && (
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={rel.bannerImage}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-primary">
                      {rel.category || 'সাধারণ'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                      {rel.title}
                    </h4>
                  </div>
                  <div className="pt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{rel.readingTimeMinutes || 3} মিনিট পড়া</span>
                    <span className="text-primary font-bold group-hover:translate-x-1 transition-transform">
                      পড়ুন →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
