/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink, Quote, AlertTriangle } from 'lucide-react';

interface ArticleContentRendererProps {
  content: string;
  className?: string;
  depth?: number;
}

interface ParsedIframeEmbed {
  isValid: boolean;
  safeSrc?: string;
  externalUrl?: string;
  hostname?: string;
  provider: 'youtube' | 'facebook' | 'vimeo' | 'google' | 'unknown';
  isFacebookPostOrPage: boolean;
  width?: number;
  height?: number;
  title?: string;
  allow?: string;
  allowFullScreen: boolean;
  scrolling?: 'yes' | 'no' | 'auto';
}

const TRUSTED_YOUTUBE_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);

const TRUSTED_FACEBOOK_HOSTS = new Set([
  'www.facebook.com',
  'facebook.com',
  'web.facebook.com',
  'm.facebook.com',
]);

const TRUSTED_VIMEO_HOSTS = new Set(['player.vimeo.com']);
const TRUSTED_GOOGLE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

function parseIframeAttributes(tagHtml: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const openTagMatch = tagHtml.match(/<iframe\b([\s\S]*?)>/i);
  if (!openTagMatch) return attrs;

  const attrString = openTagMatch[1];
  const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? 'true';
    attrs[key] = val;
  }

  return attrs;
}

function validateAndNormalizeEmbed(rawIframeHtml: string): ParsedIframeEmbed {
  const attrs = parseIframeAttributes(rawIframeHtml);
  const rawSrc = (attrs.src || '').replace(/&amp;/g, '&').trim();

  const parsedWidth = attrs.width ? parseInt(attrs.width, 10) : undefined;
  const parsedHeight = attrs.height ? parseInt(attrs.height, 10) : undefined;
  const width = parsedWidth && !Number.isNaN(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined;
  const height = parsedHeight && !Number.isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined;

  if (!rawSrc) {
    return {
      isValid: false,
      provider: 'unknown',
      isFacebookPostOrPage: false,
      allowFullScreen: true,
    };
  }

  let url: URL;
  try {
    url = new URL(rawSrc);
  } catch {
    return {
      isValid: false,
      provider: 'unknown',
      isFacebookPostOrPage: false,
      allowFullScreen: true,
    };
  }

  if (url.protocol !== 'https:') {
    return {
      isValid: false,
      hostname: url.hostname,
      provider: 'unknown',
      isFacebookPostOrPage: false,
      allowFullScreen: true,
    };
  }

  const host = url.hostname.toLowerCase();

  // YouTube
  if (TRUSTED_YOUTUBE_HOSTS.has(host)) {
    let embedUrl = url.toString();
    if (host === 'youtu.be') {
      const videoId = url.pathname.replace(/^\//, '').split('/')[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (url.pathname === '/watch') {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (url.pathname.startsWith('/shorts/')) {
      const videoId = url.pathname.replace('/shorts/', '').split('/')[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    const normalizedUrl = new URL(embedUrl);
    if (!normalizedUrl.pathname.startsWith('/embed/')) {
      return {
        isValid: false,
        hostname: host,
        provider: 'youtube',
        isFacebookPostOrPage: false,
        allowFullScreen: true,
      };
    }

    const ytVideoId = normalizedUrl.pathname.replace('/embed/', '').split('/')[0];
    const ytExternalUrl = ytVideoId ? `https://www.youtube.com/watch?v=${ytVideoId}` : undefined;

    return {
      isValid: true,
      safeSrc: normalizedUrl.toString(),
      externalUrl: ytExternalUrl,
      hostname: host,
      provider: 'youtube',
      isFacebookPostOrPage: false,
      width,
      height,
      title: attrs.title || 'YouTube Video',
      allow:
        attrs.allow ||
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowFullScreen: attrs.allowfullscreen !== 'false',
    };
  }

  // Facebook Plugins (post.php, video.php, page.php, etc.)
  if (TRUSTED_FACEBOOK_HOSTS.has(host)) {
    if (!url.pathname.startsWith('/plugins/')) {
      return {
        isValid: false,
        hostname: host,
        provider: 'facebook',
        isFacebookPostOrPage: false,
        allowFullScreen: true,
      };
    }

    const isVideoPlugin = url.pathname.startsWith('/plugins/video.php');
    const isPortraitOrTall = Boolean(width && height && height >= width * 0.75);
    const rawHref = url.searchParams.get('href');
    let fbExternalUrl: string | undefined;
    if (rawHref) {
      try {
        const parsedHref = new URL(rawHref);
        if (parsedHref.protocol === 'https:') {
          fbExternalUrl = parsedHref.toString();
        }
      } catch {
        // Ignore invalid href param
      }
    }

    return {
      isValid: true,
      safeSrc: url.toString(),
      externalUrl: fbExternalUrl,
      hostname: host,
      provider: 'facebook',
      isFacebookPostOrPage: !isVideoPlugin || isPortraitOrTall,
      width,
      height,
      title: attrs.title || (isVideoPlugin ? 'Facebook Video' : 'Facebook Post'),
      allow:
        attrs.allow ||
        'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
      allowFullScreen: attrs.allowfullscreen !== 'false',
      scrolling: attrs.scrolling === 'yes' ? 'yes' : attrs.scrolling === 'auto' ? 'auto' : 'no',
    };
  }

  // Vimeo
  if (TRUSTED_VIMEO_HOSTS.has(host) && url.pathname.startsWith('/video/')) {
    const vimeoId = url.pathname.replace('/video/', '').split('/')[0];
    return {
      isValid: true,
      safeSrc: url.toString(),
      externalUrl: vimeoId ? `https://vimeo.com/${vimeoId}` : undefined,
      hostname: host,
      provider: 'vimeo',
      isFacebookPostOrPage: false,
      width,
      height,
      title: attrs.title || 'Vimeo Video',
      allow: attrs.allow || 'autoplay; fullscreen; picture-in-picture',
      allowFullScreen: attrs.allowfullscreen !== 'false',
    };
  }

  // Google Drive / Docs Preview
  if (TRUSTED_GOOGLE_HOSTS.has(host)) {
    return {
      isValid: true,
      safeSrc: url.toString(),
      hostname: host,
      provider: 'google',
      isFacebookPostOrPage: true,
      width,
      height,
      title: attrs.title || 'Embedded Document',
      allow: attrs.allow || 'autoplay',
      allowFullScreen: attrs.allowfullscreen !== 'false',
    };
  }

  return {
    isValid: false,
    hostname: host,
    provider: 'unknown',
    isFacebookPostOrPage: false,
    allowFullScreen: true,
  };
}

/**
 * Lightweight, secure, semantic Markdown & Rich Text parser for Medha Exam Articles.
 * Handles headings, tables, blockquotes, lists, links, images, trusted iframe embeds (YouTube/Facebook), and formatting.
 */
export default function ArticleContentRenderer({
  content,
  className = '',
  depth = 0,
}: ArticleContentRendererProps) {
  if (!content) {
    if (depth > 0) return null;
    return <div className="text-slate-400 italic py-4">কোনো কনটেন্ট যোগ করা হয়নি।</div>;
  }

  // Split content into blocks (paragraphs, headings, lists, tables, quotes, images, embeds)
  const blocks: React.ReactNode[] = [];
  const lines = content.split('\n');
  let i = 0;

  // Helper to parse inline styles (bold, italic, links, code)
  const parseInline = (text: string): React.ReactNode => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // A simple regex tokenizer for inline elements:
    // 1: links [text](url)
    // 2: bold **text**
    // 3: italic *text*
    // 4: inline code `code`
    const combinedRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Link: [text](url)
        const linkText = match[2];
        const linkUrl = match[3];
        parts.push(
          <a
            key={`link-${match.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-emerald-500 underline font-semibold transition-colors inline-flex items-center gap-0.5"
          >
            <span>{linkText}</span>
            <ExternalLink className="h-3 w-3 inline opacity-70" />
          </a>
        );
      } else if (match[4]) {
        // Bold: **text**
        parts.push(
          <strong key={`b-${match.index}`} className="font-bold text-slate-900 dark:text-white">
            {match[5]}
          </strong>
        );
      } else if (match[6]) {
        // Italic: *text*
        parts.push(
          <em key={`i-${match.index}`} className="italic text-slate-700 dark:text-slate-200">
            {match[7]}
          </em>
        );
      } else if (match[8]) {
        // Code: `code`
        parts.push(
          <code
            key={`c-${match.index}`}
            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-sm rounded border border-slate-200 dark:border-slate-700"
          >
            {match[9]}
          </code>
        );
      }

      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 1a. Text Alignment Blocks ([left], [center], [right], [justify])
    if (depth < 4) {
      const alignClassMap: Record<'left' | 'center' | 'right' | 'justify', string> = {
        left: 'text-left [&_h2]:justify-start [&_h3]:justify-start',
        center: 'text-center [&_h2]:justify-center [&_h3]:justify-center [&_li]:justify-center',
        right: 'text-right [&_h2]:justify-end [&_h3]:justify-end [&_li]:justify-end',
        justify: 'text-justify',
      };

      const singleAlignMatch = trimmed.match(/^\[(left|center|right|justify)\]([\s\S]*?)\[\/\1\]$/i);
      if (singleAlignMatch) {
        const align = singleAlignMatch[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify';
        const inner = singleAlignMatch[2].trim();
        blocks.push(
          <div key={`align-${i}`} className={alignClassMap[align]}>
            <ArticleContentRenderer content={inner} depth={depth + 1} className="space-y-1" />
          </div>
        );
        i++;
        continue;
      }

      const openAlignMatch = trimmed.match(/^\[(left|center|right|justify)\]$/i);
      if (openAlignMatch) {
        const align = openAlignMatch[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify';
        const closeTagRegex = new RegExp(`^\\[\\/${align}\\]$`, 'i');
        let endIdx = i + 1;
        const innerLines: string[] = [];
        let foundClose = false;

        while (endIdx < lines.length) {
          if (closeTagRegex.test(lines[endIdx].trim())) {
            foundClose = true;
            break;
          }
          innerLines.push(lines[endIdx]);
          endIdx++;
        }

        if (foundClose) {
          blocks.push(
            <div key={`align-${i}`} className={alignClassMap[align]}>
              <ArticleContentRenderer
                content={innerLines.join('\n')}
                depth={depth + 1}
                className="space-y-1"
              />
            </div>
          );
          i = endIdx + 1;
          continue;
        }
      }
    }

    // 1b. Trusted Iframe Embed (<iframe ...></iframe> single-line or multi-line)
    if (/^<iframe\b/i.test(trimmed)) {
      const embedLines: string[] = [rawLine];
      let endIdx = i;
      let combinedEmbed = rawLine;
      const maxLookahead = Math.min(lines.length, i + 30);

      while (
        !(/<\/iframe>/i.test(combinedEmbed) || /\/>\s*$/.test(combinedEmbed.trim())) &&
        endIdx + 1 < maxLookahead
      ) {
        endIdx++;
        embedLines.push(lines[endIdx]);
        combinedEmbed = embedLines.join('\n');
      }

      const isClosed = /<\/iframe>/i.test(combinedEmbed) || /\/>\s*$/.test(combinedEmbed.trim());
      if (isClosed) {
        const parsed = validateAndNormalizeEmbed(combinedEmbed);

        if (parsed.isValid && parsed.safeSrc) {
          if (parsed.provider === 'facebook') {
            const targetWidth = parsed.width ? Math.min(parsed.width, 640) : 500;
            const isLandscapeVideo =
              !parsed.isFacebookPostOrPage && parsed.width && parsed.height && parsed.width > parsed.height;
            const frameMaxWidth = isLandscapeVideo ? Math.min(parsed.width || 640, 720) : targetWidth;

            blocks.push(
              <div key={`embed-${i}`} className="my-8 flex justify-center w-full">
                <div
                  className="w-full rounded-[22px] overflow-hidden border-2 border-[#1877F2]/80 border-b-[6px] border-b-[#1256B8] ring-1 ring-[#1877F2]/25 bg-white dark:bg-slate-900 shadow-[0_22px_45px_-12px_rgba(24,119,242,0.38),0_10px_22px_-8px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_52px_-12px_rgba(24,119,242,0.46),0_12px_24px_-8px_rgba(15,23,42,0.2)]"
                  style={{ maxWidth: `${frameMaxWidth}px` }}
                >
                  {/* Facebook Brand Top Accent Bar & Header */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-[#EBF3FF] via-[#F7FAFF] to-[#EBF3FF] dark:from-[#0C1D38] dark:via-[#112648] dark:to-[#0C1D38] border-b border-[#1877F2]/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-[#1877F2] to-[#0A58CA] text-white shadow-[0_4px_10px_rgba(24,119,242,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] shrink-0">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                        </svg>
                      </span>
                      <div className="flex flex-col leading-tight truncate">
                        <span className="text-xs font-extrabold text-[#1877F2] dark:text-[#60A5FA] tracking-tight truncate">
                          {parsed.title === 'Facebook Video' ? 'Facebook Video' : 'Facebook Post'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          এম্বেড প্রিভিউ
                        </span>
                      </div>
                    </div>

                    {parsed.externalUrl && (
                      <a
                        href={parsed.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white dark:bg-[#1877F2]/20 dark:text-[#60A5FA] dark:hover:bg-[#1877F2] dark:hover:text-white border border-[#1877F2]/30 text-[11px] font-bold transition-colors shrink-0"
                      >
                        <span>ফেসবুকে দেখুন</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Facebook Iframe Surface */}
                  {isLandscapeVideo ? (
                    <div
                      className="w-full bg-black"
                      style={{
                        aspectRatio: `${parsed.width} / ${parsed.height}`,
                      }}
                    >
                      <iframe
                        src={parsed.safeSrc}
                        title={parsed.title}
                        className="w-full h-full border-0"
                        scrolling={parsed.scrolling || 'no'}
                        allow={parsed.allow}
                        allowFullScreen={parsed.allowFullScreen}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-white">
                      <iframe
                        src={parsed.safeSrc}
                        title={parsed.title}
                        style={{
                          width: '100%',
                          height: parsed.height ? `${parsed.height}px` : '580px',
                          border: 'none',
                          overflow: 'hidden',
                          display: 'block',
                        }}
                        scrolling={parsed.scrolling || 'no'}
                        allow={parsed.allow}
                        allowFullScreen={parsed.allowFullScreen}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          } else if (parsed.provider === 'google') {
            blocks.push(
              <div key={`embed-${i}`} className="my-8 flex justify-center w-full">
                <div className="w-full max-w-3xl overflow-hidden rounded-[22px] border-2 border-[#0F9D58]/75 border-b-[6px] border-b-[#0B7340] ring-1 ring-[#0F9D58]/20 bg-white dark:bg-slate-900 shadow-[0_22px_45px_-12px_rgba(15,157,88,0.30),0_10px_22px_-8px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-[#ECFDF5] via-[#F6FEFA] to-[#ECFDF5] dark:from-[#062619] dark:via-[#0A2E1F] dark:to-[#062619] border-b border-[#0F9D58]/20 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0F9D58] dark:text-emerald-400">
                      Google Document / Drive Preview
                    </span>
                  </div>
                  <iframe
                    src={parsed.safeSrc}
                    title={parsed.title}
                    style={{
                      width: '100%',
                      height: parsed.height ? `${Math.min(parsed.height, 800)}px` : '480px',
                      border: 'none',
                      display: 'block',
                    }}
                    allow={parsed.allow}
                    allowFullScreen={parsed.allowFullScreen}
                    loading="lazy"
                  />
                </div>
              </div>
            );
          } else if (parsed.provider === 'youtube') {
            const isVertical = Boolean(parsed.width && parsed.height && parsed.height > parsed.width);
            blocks.push(
              <div key={`embed-${i}`} className="my-8 flex justify-center w-full">
                <div
                  className={`w-full rounded-[22px] overflow-hidden border-2 border-[#FF0000]/80 border-b-[6px] border-b-[#B91C1C] ring-1 ring-[#FF0000]/25 bg-white dark:bg-slate-900 shadow-[0_22px_45px_-12px_rgba(255,0,0,0.34),0_10px_22px_-8px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_52px_-12px_rgba(255,0,0,0.42),0_12px_24px_-8px_rgba(15,23,42,0.24)] ${
                    isVertical ? 'max-w-sm' : 'max-w-3xl'
                  }`}
                >
                  {/* YouTube Brand Header */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-[#FFF0F1] via-[#FFF8F8] to-[#FFF0F1] dark:from-[#2B090C] dark:via-[#1C0A0D] dark:to-[#2B090C] border-b border-[#FF0000]/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-[#FF0000] to-[#C80000] text-white shadow-[0_4px_10px_rgba(255,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.35)] shrink-0">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </span>
                      <div className="flex flex-col leading-tight truncate">
                        <span className="text-xs font-extrabold text-[#DC2626] dark:text-[#FF4D4D] tracking-tight truncate">
                          {isVertical ? 'YouTube Shorts' : 'YouTube Video'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          ভিডিও প্রিভিউ
                        </span>
                      </div>
                    </div>

                    {parsed.externalUrl && (
                      <a
                        href={parsed.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF0000]/10 hover:bg-[#FF0000] text-[#DC2626] hover:text-white dark:bg-[#FF0000]/20 dark:text-[#FF6B6B] dark:hover:bg-[#FF0000] dark:hover:text-white border border-[#FF0000]/30 text-[11px] font-bold transition-colors shrink-0"
                      >
                        <span>YouTube-এ দেখুন</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* YouTube Video Frame */}
                  <div className={`w-full bg-black ${isVertical ? 'aspect-[9/16]' : 'aspect-video'}`}>
                    <iframe
                      src={parsed.safeSrc}
                      title={parsed.title}
                      className="w-full h-full border-0"
                      allow={parsed.allow}
                      allowFullScreen={parsed.allowFullScreen}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              </div>
            );
          } else {
            // Vimeo responsive embed with Vimeo cyan-blue 3D brand frame
            const isVertical = Boolean(parsed.width && parsed.height && parsed.height > parsed.width);
            blocks.push(
              <div key={`embed-${i}`} className="my-8 flex justify-center w-full">
                <div
                  className={`w-full rounded-[22px] overflow-hidden border-2 border-[#1AB7EA]/80 border-b-[6px] border-b-[#0E8BB5] ring-1 ring-[#1AB7EA]/25 bg-white dark:bg-slate-900 shadow-[0_22px_45px_-12px_rgba(26,183,234,0.34),0_10px_22px_-8px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 ${
                    isVertical ? 'max-w-sm' : 'max-w-3xl'
                  }`}
                >
                  <div className="px-4 py-2.5 bg-gradient-to-r from-[#ECFAFF] via-[#F7FDFF] to-[#ECFAFF] dark:from-[#082530] dark:via-[#0B2D3A] dark:to-[#082530] border-b border-[#1AB7EA]/20 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0284C7] dark:text-[#38BDF8]">
                      Vimeo Video
                    </span>
                    {parsed.externalUrl && (
                      <a
                        href={parsed.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1AB7EA]/10 hover:bg-[#1AB7EA] text-[#0284C7] hover:text-white border border-[#1AB7EA]/30 text-[11px] font-bold transition-colors shrink-0"
                      >
                        <span>দেখুন</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className={`w-full bg-black ${isVertical ? 'aspect-[9/16]' : 'aspect-video'}`}>
                    <iframe
                      src={parsed.safeSrc}
                      title={parsed.title}
                      className="w-full h-full border-0"
                      allow={parsed.allow}
                      allowFullScreen={parsed.allowFullScreen}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              </div>
            );
          }
        } else {
          blocks.push(
            <div
              key={`embed-blocked-${i}`}
              className="my-5 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2.5"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                নিরাপত্তাজনিত কারণে এই এম্বেড কোডটি প্রিভিউ করা হয়নি ({parsed.hostname || 'অজ্ঞাত উৎস'})। শুধুমাত্র অনুমোদিত HTTPS YouTube, Facebook, Vimeo বা Google Drive এম্বেড সমর্থিত।
              </span>
            </div>
          );
        }

        i = endIdx + 1;
        continue;
      }
    }

    // 2. Headings (# H1, ## H2, ### H3, #### H4)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        if (level === 1 || level === 2) {
          blocks.push(
            <h2
              key={`h-${i}`}
              className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-8 mb-4 tracking-tight border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5 flex items-center gap-2"
            >
              <span className="w-1.5 h-6 bg-primary rounded-full inline-block shrink-0" />
              <span>{parseInline(headingText)}</span>
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`h-${i}`}
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 flex items-center gap-2"
            >
              <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block shrink-0" />
              <span>{parseInline(headingText)}</span>
            </h3>
          );
        } else {
          blocks.push(
            <h4
              key={`h-${i}`}
              className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2"
            >
              {parseInline(headingText)}
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 3. Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      blocks.push(
        <hr key={`hr-${i}`} className="my-8 border-t border-slate-200 dark:border-slate-700" />
      );
      i++;
      continue;
    }

    // 4. Standalone Image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const altText = imgMatch[1];
      const imgUrl = imgMatch[2];
      blocks.push(
        <figure key={`img-${i}`} className="my-6 text-center">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 shadow-sm max-w-2xl mx-auto">
            <img
              src={imgUrl}
              alt={altText || 'Article illustration'}
              className="w-full h-auto object-contain max-h-[500px] mx-auto transition-transform duration-300 hover:scale-[1.01]"
              loading="lazy"
            />
          </div>
          {altText && (
            <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
              {altText}
            </figcaption>
          )}
        </figure>
      );
      i++;
      continue;
    }

    // 5. Blockquote (> quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <div
          key={`quote-${i}`}
          className="my-5 p-4 sm:p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-slate-800 dark:text-slate-200 flex items-start gap-3 shadow-xs"
        >
          <Quote className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5 opacity-80" />
          <div className="space-y-1.5 text-base sm:text-lg italic font-medium leading-relaxed">
            {quoteLines.map((ql, qidx) => (
              <p key={qidx}>{parseInline(ql)}</p>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // 6. Markdown Table: starts with | and next line has | --- |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Check if second line is separator
        const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(tableLines[1]);
        const startRow = isSeparator ? 2 : 1;
        const rowData = tableLines.slice(startRow).map((rowLine) =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        blocks.push(
          <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200 divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-xs uppercase font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  {headerCells.map((th, thIdx) => (
                    <th key={thIdx} className="px-4 py-3 font-semibold">
                      {parseInline(th)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60 bg-white dark:bg-slate-900/60">
                {rowData.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 leading-relaxed">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 7. Bullet Lists (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-4 space-y-2.5 pl-2 list-none">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Numbered Lists (1. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-4 space-y-2.5 pl-2 list-none counter-reset-item">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400 font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 9. Regular Paragraph
    blocks.push(
      <p
        key={`p-${i}`}
        className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed my-3 font-normal break-words"
      >
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`article-prose space-y-2 ${className}`}>{blocks}</div>;
}
