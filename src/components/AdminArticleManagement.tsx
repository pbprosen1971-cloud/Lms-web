/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ExternalLink,
  Calendar,
  Clock,
  Tag,
  Sparkles,
  Link2,
  Heading,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  X,
  Loader2,
  RefreshCw,
  BookOpen,
  Code,
  Minus,
} from 'lucide-react';
import { Article, UserProfile } from '../types';
import {
  subscribeToAllArticlesForAdmin,
  saveArticleToFirestore,
  deleteArticleFromFirestore,
  toggleArticlePublishStatus,
  generateSlug,
  calculateReadingTimeMinutes,
} from '../services/articleService';
import { uploadImageToCloudinary } from '../services/cloudinaryUploadService';
import ArticleContentRenderer from './ArticleContentRenderer';

interface AdminArticleManagementProps {
  currentUser?: UserProfile | null;
  setView?: (view: string) => void;
  onNavigateToArticle?: (slug: string) => void;
}

const ARTICLE_CATEGORIES = [
  'বিসিএস প্রস্তুতি',
  'ব্যাংক জব',
  'প্রাথমিক শিক্ষক নিয়োগ',
  'সাধারণ জ্ঞান ও সাম্প্রতিক',
  'ইংরেজি ও সাহিত্য',
  'বাংলা ব্যাকরণ',
  'গণিত শর্টকাট',
  'পড়ার কৌশল ও টিপস',
  'ক্যারিয়ার গাইডলাইন',
  'সাধারণ',
];

export default function AdminArticleManagement({
  currentUser,
  setView,
  onNavigateToArticle,
}: AdminArticleManagementProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [isSlugAuto, setIsSlugAuto] = useState<boolean>(true);
  const [formCategory, setFormCategory] = useState<string>('বিসিএস প্রস্তুতি');
  const [formShortDesc, setFormShortDesc] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formBannerImage, setFormBannerImage] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formPublishedAt, setFormPublishedAt] = useState<string>(() => new Date().toISOString().slice(0, 16));

  // Upload States
  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number>(0);
  const [isUploadingContentImg, setIsUploadingContentImg] = useState<boolean>(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const contentFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Table Generator Dialog State
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [tablePreset, setTablePreset] = useState<'syllabus' | 'routine' | 'results' | 'custom'>('syllabus');
  const [customCols, setCustomCols] = useState<number>(3);
  const [customRows, setCustomRows] = useState<number>(3);
  const [tableHeaders, setTableHeaders] = useState<string[]>(['বিষয়', 'নম্বর', 'মানবণ্টন']);
  const [tableRowsData, setTableRowsData] = useState<string[][]>([
    ['বাংলা', '৩৫', 'সাহিত্য ও ব্যাকরণ'],
    ['ইংরেজি', '৩৫', 'গ্রামার ও সাহিত্য'],
    ['বাংলাদেশ বিষয়াবলি', '৩০', 'ইতিহাস ও ভূগোল'],
  ]);
  const [selectedTextLines, setSelectedTextLines] = useState<string[]>([]);

  // Subscribe to articles
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllArticlesForAdmin(
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

  // Auto-clear feedback toast
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Handle title change and auto-slug
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (isSlugAuto) {
      setFormSlug(generateSlug(val));
    }
  };

  const handleOpenNewEditor = () => {
    setEditingArticleId(null);
    setFormTitle('');
    setFormSlug('');
    setIsSlugAuto(true);
    setFormCategory('বিসিএস প্রস্তুতি');
    setFormShortDesc('');
    setFormContent('');
    setFormBannerImage('');
    setFormStatus('published');
    setFormPublishedAt(new Date().toISOString().slice(0, 16));
    setEditorTab('write');
    setIsEditorOpen(true);
  };

  const handleEditArticle = (art: Article) => {
    setEditingArticleId(art.id);
    setFormTitle(art.title);
    setFormSlug(art.slug);
    setIsSlugAuto(false);
    setFormCategory(art.category || 'সাধারণ');
    setFormShortDesc(art.shortDescription);
    setFormContent(art.content);
    setFormBannerImage(art.bannerImage || '');
    setFormStatus(art.status);
    const pDate = art.publishedAt ? new Date(art.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
    setFormPublishedAt(pDate);
    setEditorTab('write');
    setIsEditorOpen(true);
  };

  // Banner image file select & Cloudinary upload
  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingBanner(true);
      setBannerUploadProgress(10);
      const fileName = `article_banner_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const result = await uploadImageToCloudinary(file, fileName, {
        preserveAspectRatio: true,
        maxWidth: 1280,
        maxHeight: 720,
        onProgress: (p) => setBannerUploadProgress(p),
      });

      setFormBannerImage(result.secureUrl);
      setFeedbackMsg({ text: 'ব্যানার ছবি সফলভাবে আপলোড হয়েছে!', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'ছবি আপলোড করতে ব্যর্থ হয়েছে।', type: 'error' });
    } finally {
      setIsUploadingBanner(false);
      setBannerUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  // In-content image upload & insert markdown
  const handleContentImgSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingContentImg(true);
      const fileName = `article_img_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const result = await uploadImageToCloudinary(file, fileName, {
        preserveAspectRatio: true,
        maxWidth: 1200,
        maxHeight: 900,
      });

      insertTextAtCursor(`\n![${file.name.replace(/\.[^.]+$/, '')}](${result.secureUrl})\n`);
      setFeedbackMsg({ text: 'ছবি সফলভাবে আপলোড ও আর্টিকেলে যুক্ত হয়েছে!', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'ছবি আপলোড করতে ব্যর্থ হয়েছে।', type: 'error' });
    } finally {
      setIsUploadingContentImg(false);
      if (e.target) e.target.value = '';
    }
  };

  // Track selection inside textarea to avoid losing highlighted text on button clicks
  const handleTextareaSelect = () => {
    if (textareaRef.current) {
      lastSelectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  // Apply rich markdown formatting preserving selected text
  const applyFormatting = (formatType: string, options?: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;

    // Fallback to last recorded selection if current is collapsed
    if (start === end && lastSelectionRef.current.start !== lastSelectionRef.current.end) {
      start = lastSelectionRef.current.start;
      end = lastSelectionRef.current.end;
    }

    const text = formContent;
    const selectedText = text.substring(start, end);
    const hasSelection = start !== end && selectedText.length > 0;

    let replacement = '';
    let selStartOffset = 0;
    let selEndOffset = 0;

    switch (formatType) {
      case 'bold': {
        if (hasSelection) {
          // Toggle bold if already bolded
          if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
            replacement = selectedText.slice(2, -2);
            selStartOffset = 0;
            selEndOffset = replacement.length;
          } else {
            replacement = `**${selectedText}**`;
            selStartOffset = 0;
            selEndOffset = replacement.length;
          }
        } else {
          replacement = '**বোল্ড টেক্সট**';
          selStartOffset = 2;
          selEndOffset = 13;
        }
        break;
      }
      case 'italic': {
        if (hasSelection) {
          if (
            selectedText.startsWith('*') &&
            selectedText.endsWith('*') &&
            selectedText.length >= 2 &&
            !selectedText.startsWith('**')
          ) {
            replacement = selectedText.slice(1, -1);
            selStartOffset = 0;
            selEndOffset = replacement.length;
          } else {
            replacement = `*${selectedText}*`;
            selStartOffset = 0;
            selEndOffset = replacement.length;
          }
        } else {
          replacement = '*ইটালিক টেক্সট*';
          selStartOffset = 1;
          selEndOffset = 13;
        }
        break;
      }
      case 'h2': {
        const needsLead = start > 0 && text[start - 1] !== '\n';
        const prefix = needsLead ? '\n## ' : '## ';
        if (hasSelection) {
          const cleaned = selectedText.replace(/^#{1,6}\s*/, '').trim();
          replacement = `${prefix}${cleaned}\n`;
          selStartOffset = prefix.length;
          selEndOffset = prefix.length + cleaned.length;
        } else {
          replacement = `${prefix}হেডিং ২\n`;
          selStartOffset = prefix.length;
          selEndOffset = prefix.length + 8;
        }
        break;
      }
      case 'h3': {
        const needsLead = start > 0 && text[start - 1] !== '\n';
        const prefix = needsLead ? '\n### ' : '### ';
        if (hasSelection) {
          const cleaned = selectedText.replace(/^#{1,6}\s*/, '').trim();
          replacement = `${prefix}${cleaned}\n`;
          selStartOffset = prefix.length;
          selEndOffset = prefix.length + cleaned.length;
        } else {
          replacement = `${prefix}সাবহেডিং ৩\n`;
          selStartOffset = prefix.length;
          selEndOffset = prefix.length + 11;
        }
        break;
      }
      case 'bullet': {
        const needsLead = start > 0 && text[start - 1] !== '\n';
        const lead = needsLead ? '\n' : '';
        if (hasSelection) {
          const lines = selectedText.split('\n');
          const formatted = lines
            .map((line) => {
              const trimmed = line.replace(/^[-*+]\s+/, '');
              return `- ${trimmed}`;
            })
            .join('\n');
          replacement = `${lead}${formatted}\n`;
          selStartOffset = lead.length;
          selEndOffset = replacement.length;
        } else {
          replacement = `${lead}- পয়েন্ট ১\n- পয়েন্ট ২\n`;
          selStartOffset = lead.length + 2;
          selEndOffset = lead.length + 9;
        }
        break;
      }
      case 'numbered': {
        const needsLead = start > 0 && text[start - 1] !== '\n';
        const lead = needsLead ? '\n' : '';
        if (hasSelection) {
          const lines = selectedText.split('\n');
          const formatted = lines
            .map((line, idx) => {
              const trimmed = line.replace(/^\d+[\.\)]\s+/, '');
              return `${idx + 1}. ${trimmed}`;
            })
            .join('\n');
          replacement = `${lead}${formatted}\n`;
          selStartOffset = lead.length;
          selEndOffset = replacement.length;
        } else {
          replacement = `${lead}1. প্রথম ধাপ\n2. দ্বিতীয় ধাপ\n`;
          selStartOffset = lead.length + 3;
          selEndOffset = lead.length + 12;
        }
        break;
      }
      case 'quote': {
        const needsLead = start > 0 && text[start - 1] !== '\n';
        const lead = needsLead ? '\n' : '';
        if (hasSelection) {
          const lines = selectedText.split('\n');
          const formatted = lines
            .map((line) => {
              const trimmed = line.replace(/^>\s*/, '');
              return `> ${trimmed}`;
            })
            .join('\n');
          replacement = `${lead}${formatted}\n`;
          selStartOffset = lead.length;
          selEndOffset = replacement.length;
        } else {
          replacement = `${lead}> বিশেষ উক্তি বা গুরুত্বপূর্ণ তথ্য এখানে লিখুন...\n`;
          selStartOffset = lead.length + 2;
          selEndOffset = lead.length + replacement.length - 1;
        }
        break;
      }
      case 'link': {
        if (hasSelection) {
          const trimmed = selectedText.trim();
          const isUrl = /^https?:\/\//i.test(trimmed);
          if (isUrl) {
            replacement = `[লিঙ্কের শিরোনাম](${trimmed})`;
            selStartOffset = 1;
            selEndOffset = 16;
          } else {
            replacement = `[${trimmed}](https://medhaexam.site)`;
            selStartOffset = trimmed.length + 3;
            selEndOffset = replacement.length - 1;
          }
        } else {
          replacement = '[লিঙ্কের শিরোনাম](https://medhaexam.site)';
          selStartOffset = 1;
          selEndOffset = 16;
        }
        break;
      }
      case 'code': {
        if (hasSelection) {
          if (selectedText.includes('\n')) {
            const needsLead = start > 0 && text[start - 1] !== '\n';
            const lead = needsLead ? '\n' : '';
            replacement = `${lead}\`\`\`\n${selectedText}\n\`\`\`\n`;
            selStartOffset = lead.length + 4;
            selEndOffset = lead.length + 4 + selectedText.length;
          } else {
            replacement = `\`${selectedText}\``;
            selStartOffset = 1;
            selEndOffset = 1 + selectedText.length;
          }
        } else {
          replacement = '`কোড বা কি-ওয়ার্ড`';
          selStartOffset = 1;
          selEndOffset = replacement.length - 1;
        }
        break;
      }
      case 'table': {
        if (options?.tableMarkdown) {
          const needsLead = start > 0 && text[start - 1] !== '\n';
          const lead = needsLead ? '\n' : '';
          replacement = `${lead}${options.tableMarkdown}\n`;
          selStartOffset = 0;
          selEndOffset = replacement.length;
        }
        break;
      }
      default:
        break;
    }

    if (replacement) {
      const updated = text.substring(0, start) + replacement + text.substring(end);
      setFormContent(updated);

      const newSelStart = start + selStartOffset;
      const newSelEnd = start + selEndOffset;
      lastSelectionRef.current = { start: newSelStart, end: newSelEnd };

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newSelStart, newSelEnd);
      }, 10);
    }
  };

  // Helper for raw insertion (e.g. uploaded image markdown)
  const insertTextAtCursor = (insertion: string, selectStartOffset?: number, selectEndOffset?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormContent((prev) => prev + insertion);
      return;
    }

    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    if (start === end && lastSelectionRef.current.start !== lastSelectionRef.current.end) {
      start = lastSelectionRef.current.start;
      end = lastSelectionRef.current.end;
    }

    const prev = formContent;
    const updated = prev.substring(0, start) + insertion + prev.substring(end);
    setFormContent(updated);

    const newPos = start + (selectStartOffset !== undefined ? selectStartOffset : insertion.length);
    const endPos = start + (selectEndOffset !== undefined ? selectEndOffset : insertion.length);
    lastSelectionRef.current = { start: newPos, end: endPos };

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, endPos);
    }, 20);
  };

  // Open Table Generator Modal and detect selected lines if any
  const handleOpenTableModal = () => {
    const textarea = textareaRef.current;
    let start = textarea ? textarea.selectionStart : 0;
    let end = textarea ? textarea.selectionEnd : 0;
    if (start === end && lastSelectionRef.current.start !== lastSelectionRef.current.end) {
      start = lastSelectionRef.current.start;
      end = lastSelectionRef.current.end;
    }
    const selected = textarea ? formContent.substring(start, end) : '';
    if (selected.trim()) {
      const rawLines = selected.split('\n').map((l) => l.trim()).filter(Boolean);
      setSelectedTextLines(rawLines);
    } else {
      setSelectedTextLines([]);
    }
    setIsTableModalOpen(true);
  };

  // Preset changer for table modal
  const handleApplyTablePreset = (preset: 'syllabus' | 'routine' | 'results' | 'custom') => {
    setTablePreset(preset);
    if (preset === 'syllabus') {
      setCustomCols(3);
      setCustomRows(3);
      setTableHeaders(['বিষয়', 'পূর্ণমান', 'মানবণ্টন']);
      setTableRowsData([
        ['বাংলা', '৩৫', 'সাহিত্য ও ব্যাকরণ'],
        ['ইংরেজি', '৩৫', 'গ্রামার ও সাহিত্য'],
        ['বাংলাদেশ বিষয়াবলি', '৩০', 'ইতিহাস ও ভূগোল'],
      ]);
    } else if (preset === 'routine') {
      setCustomCols(3);
      setCustomRows(3);
      setTableHeaders(['তারিখ ও বার', 'বিষয়', 'সময়']);
      setTableRowsData([
        ['১৫ মার্চ ২০২৬ (শুক্রবার)', 'বাংলা ও ইংরেজি', 'সকাল ১০:০০ - ১১:০০'],
        ['২২ মার্চ ২০২৬ (শুক্রবার)', 'গণিত ও বিজ্ঞান', 'সকাল ১০:০০ - ১১:০০'],
        ['২৯ মার্চ ২০২৬ (শুক্রবার)', 'সাধারণ জ্ঞান', 'সকাল ১০:০০ - ১১:০০'],
      ]);
    } else if (preset === 'results') {
      setCustomCols(5);
      setCustomRows(3);
      setTableHeaders(['মেধাক্রম', 'রোল', 'শিক্ষার্থীর নাম', 'প্রাপ্ত নম্বর', 'গ্রেড']);
      setTableRowsData([
        ['১ম', '১০০১', 'তানভীর হাসান', '৯৫', 'A+'],
        ['২য়', '১০০২', 'মোসাম্মৎ সাদিয়া', '৯২', 'A+'],
        ['৩য়', '১০০৩', 'আরিফ মাহমুদ', '৮৯', 'A'],
      ]);
    } else if (preset === 'custom') {
      const newHeaders = Array.from({ length: customCols }, (_, idx) => tableHeaders[idx] || `কলাম ${idx + 1}`);
      setTableHeaders(newHeaders);
    }
  };

  // Convert selected text in textarea to table rows
  const handleConvertSelectedToTable = () => {
    if (selectedTextLines.length === 0) return;
    const firstLine = selectedTextLines[0];
    let delimiter = '';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes('|')) delimiter = '|';
    else if (firstLine.includes(',')) delimiter = ',';

    let headers: string[] = [];
    let rows: string[][] = [];

    if (delimiter) {
      const parsedRows = selectedTextLines.map((line) =>
        line
          .split(delimiter)
          .map((cell) => cell.trim().replace(/^\||\|$/g, '').trim())
          .filter(Boolean)
      );
      const maxCols = Math.max(...parsedRows.map((r) => r.length), 2);
      headers = parsedRows[0] || Array.from({ length: maxCols }, (_, i) => `কলাম ${i + 1}`);
      rows = parsedRows.slice(1);
      if (rows.length === 0) {
        rows = [['তথ্য ১', 'তথ্য ২']];
      }
    } else {
      headers = ['ক্রম', 'বিবরণ'];
      rows = selectedTextLines.map((line, idx) => [`${idx + 1}`, line]);
    }

    setTableHeaders(headers);
    setTableRowsData(rows);
    setCustomCols(headers.length);
    setCustomRows(rows.length);
    setTablePreset('custom');
  };

  // Insert generated table into article
  const handleInsertTable = () => {
    const colCount = tableHeaders.length;
    const headerLine = `| ${tableHeaders.map((h) => h.trim() || 'কলাম').join(' | ')} |`;
    const separatorLine = `| ${tableHeaders.map(() => '---').join(' | ')} |`;
    const bodyLines = tableRowsData.map((row) => {
      const cells = Array.from({ length: colCount }, (_, idx) => (row[idx] || '').trim() || '-');
      return `| ${cells.join(' | ')} |`;
    });

    const tableMarkdown = `${headerLine}\n${separatorLine}\n${bodyLines.join('\n')}\n`;
    applyFormatting('table', { tableMarkdown });
    setIsTableModalOpen(false);
  };

  const handleSaveArticle = async (overrideStatus?: 'draft' | 'published') => {
    if (!formTitle.trim()) {
      setFeedbackMsg({ text: 'আর্টিকেলের শিরোনাম আবশ্যক।', type: 'error' });
      return;
    }

    const statusToSave = overrideStatus || formStatus;
    const readingTime = calculateReadingTimeMinutes(formContent);
    const finalSlug = (formSlug.trim() || generateSlug(formTitle)).toLowerCase();

    setIsSaving(true);
    try {
      await saveArticleToFirestore(
        {
          title: formTitle.trim(),
          slug: finalSlug,
          category: formCategory,
          shortDescription: formShortDesc.trim(),
          content: formContent,
          bannerImage: formBannerImage.trim(),
          status: statusToSave,
          publishedAt: new Date(formPublishedAt).toISOString(),
          authorName: currentUser?.name || 'মেধা এক্সাম টিম',
          authorId: currentUser?.id || currentUser?.studentId || 'admin',
          readingTimeMinutes: readingTime,
        },
        editingArticleId || undefined
      );

      setFeedbackMsg({
        text: editingArticleId ? 'আর্টিকেল সফলভাবে আপডেট করা হয়েছে!' : 'নতুন আর্টিকেল সফলভাবে তৈরি হয়েছে!',
        type: 'success',
      });
      setIsEditorOpen(false);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'আর্টিকেল সংরক্ষণ করতে ব্যর্থ হয়েছে।', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (art: Article) => {
    try {
      const nextStatus = await toggleArticlePublishStatus(art.id, art.status);
      setFeedbackMsg({
        text: nextStatus === 'published' ? 'আর্টিকেলটি এখন ওয়েবসাইটে প্রকাশিত।' : 'আর্টিকেলটি ড্রাফট করা হয়েছে।',
        type: 'success',
      });
    } catch (err: any) {
      setFeedbackMsg({ text: 'স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।', type: 'error' });
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteArticleFromFirestore(id);
      setDeleteConfirmId(null);
      setFeedbackMsg({ text: 'আর্টিকেল সফলভাবে মুছে ফেলা হয়েছে।', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: 'আর্টিকেল ডিলিট করতে ব্যর্থ হয়েছে।', type: 'error' });
    }
  };

  const filteredArticles = articles.filter((art) => {
    if (statusFilter !== 'all' && art.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = art.title.toLowerCase().includes(q);
      const matchDesc = art.shortDescription.toLowerCase().includes(q);
      const matchCat = (art.category || '').toLowerCase().includes(q);
      const matchSlug = art.slug.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat && !matchSlug) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>আর্টিকেল ম্যানেজমেন্ট</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400">
              {articles.length} টি আর্টিকেল
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            সরকারি চাকরি প্রস্তুতি, বিসিএস টিপস ও গাইডলাইন বিষয়ক আর্টিকেল তৈরি, এডিট ও প্রকাশ করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {setView && (
            <button
              type="button"
              onClick={() => {
                setView('articles');
                window.history.pushState({}, '', '/articles');
              }}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>পাবলিক পেজ দেখুন</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNewEditor}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 rounded-xl shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>নতুন আর্টিকেল লিখুন</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="শিরোনাম, ক্যাটাগরি বা স্লাগ দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            সব ({articles.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            প্রকাশিত ({articles.filter((a) => a.status === 'published').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ড্রাফট ({articles.filter((a) => a.status === 'draft').length})
          </button>
        </div>
      </div>

      {/* Articles Table / List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-xs sm:text-sm text-slate-500 mt-2">আর্টিকেল লোড হচ্ছে...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <BookOpen className="h-12 w-12 mx-auto text-slate-400 opacity-60 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">কোনো আর্টিকেল পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery ? 'আপনার সার্চের সাথে কোনো আর্টিকেল মেলেনি।' : 'এখনও কোনো আর্টিকেল তৈরি করা হয়নি। উপরের বাটন দিয়ে প্রথম আর্টিকেল লিখুন।'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenNewEditor}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-all cursor-pointer"
            >
              + প্রথম আর্টিকেল লিখুন
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm text-slate-800 dark:text-slate-200 divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">আর্টিকেল ও শিরোনাম</th>
                <th className="px-4 py-3.5 hidden md:table-cell">ক্যাটাগরি</th>
                <th className="px-4 py-3.5">স্ট্যাটাস</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">প্রকাশের তারিখ</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70 bg-white dark:bg-slate-800">
              {filteredArticles.map((art) => (
                <tr key={art.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  {/* Article Title & Thumbnail */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                        {art.bannerImage ? (
                          <img
                            src={art.bannerImage}
                            alt={art.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback on image error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <BookOpen className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-primary transition-colors">
                          {art.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">
                            /{art.slug}
                          </span>
                          <span>•</span>
                          <span>{art.readingTimeMinutes || 3} মিনিট পড়া</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {art.category || 'সাধারণ'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(art)}
                      title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                        art.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50'
                      }`}
                    >
                      {art.status === 'published' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>প্রকাশিত</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span>ড্রাফট</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-500 dark:text-slate-400">
                    {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }) : 'নির্ধারিত হয়নি'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToArticle) {
                            onNavigateToArticle(art.slug);
                          } else if (setView) {
                            window.history.pushState({}, '', `/article/${art.slug}`);
                            setView('article-detail');
                          }
                        }}
                        title="পাবলিক পেজে দেখুন"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleEditArticle(art)}
                        title="এডিট করুন"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(art.id)}
                        title="মুছে ফেলুন"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-center font-bold text-slate-900 dark:text-white text-base">
              আর্টিকেলটি মুছে ফেলতে চান?
            </h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              এই আর্টিকেলটি স্থায়ীভাবে মুছে ফেলা হবে এবং এর পাবলিক লিঙ্ক কাজ করবে না।
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleDeleteArticle(deleteConfirmId)}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full my-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingArticleId ? 'আর্টিকেল সম্পাদনা করুন' : 'নতুন আর্টিকেল লিখুন'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    আর্টিকেলের তথ্য, ব্যানার এবং কনটেন্ট সমৃদ্ধ ফরম্যাটিং সহ লিখুন।
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    আর্টিকেলের শিরোনাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="যেমন: ৪৭তম বিসিএস প্রিলিমিনারি প্রস্তুতির চূড়ান্ত কৌশল ও বুক লিস্ট"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium cursor-pointer"
                  >
                    {ARTICLE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: URL Slug */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    URL Slug (পাবলিক পেজের লিঙ্ক) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSlugAuto(false);
                      setFormSlug(generateSlug(formTitle));
                    }}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    টাইটেল থেকে তৈরি করুন
                  </button>
                </div>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
                  <span className="px-3 py-2 text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 select-none">
                    /article/
                  </span>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => {
                      setIsSlugAuto(false);
                      setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }}
                    placeholder="bcs-preparation-tips"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 dark:text-white bg-transparent focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Short Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  সংক্ষিপ্ত বিবরণ (Short Description / SEO Summary)
                </label>
                <textarea
                  rows={2}
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  placeholder="আর্টিকেলের মূল বিষয়বস্তুর সংক্ষেপ (কার্ড এবং সার্চ ইঞ্জিনে প্রদর্শনের জন্য)..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Row 4: Banner Image */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  কভার / ব্যানার ছবি (ঐচ্ছিক)
                </label>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={formBannerImage}
                    onChange={(e) => setFormBannerImage(e.target.value)}
                    placeholder="ছবির URL পেস্ট করুন অথবা আপলোড বাটনে ক্লিক করুন..."
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono text-xs"
                  />

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={handleBannerFileSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploadingBanner}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isUploadingBanner ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>আপলোড হচ্ছে ({bannerUploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-primary" />
                        <span>ছবি আপলোড (Cloudinary)</span>
                      </>
                    )}
                  </button>

                  {formBannerImage && (
                    <button
                      type="button"
                      onClick={() => setFormBannerImage('')}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="ছবি মুছে ফেলুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Banner Thumbnail Preview */}
                {formBannerImage && (
                  <div className="relative mt-2 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 aspect-video">
                    <img
                      src={formBannerImage}
                      alt="ব্যানার প্রিভিউ"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded">
                      ব্যানার প্রিভিউ
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: Content Editor Toolbar & Tabs */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>সম্পূর্ণ আর্টিকেল কনটেন্ট</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      (~{calculateReadingTimeMinutes(formContent)} মিনিট পড়া)
                    </span>
                  </label>

                  {/* Editor vs Preview Tab */}
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        editorTab === 'write'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      এডিটর
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        editorTab === 'preview'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      লাইভ প্রিভিউ
                    </button>
                  </div>
                </div>

                {/* Toolbar (Only visible on write tab) */}
                {editorTab === 'write' && (
                  <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('h2')}
                      title="হেডিং ২ (H2)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-0.5"
                    >
                      <Heading className="h-3.5 w-3.5" />
                      <span className="text-[11px]">H2</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('h3')}
                      title="সাবহেডিং ৩ (H3)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-0.5"
                    >
                      <Heading className="h-3.5 w-3.5" />
                      <span className="text-[11px]">H3</span>
                    </button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('bold')}
                      title="বোল্ড (Bold: **লেখা**)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('italic')}
                      title="ইটালিক (Italic: *লেখা*)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('code')}
                      title="কোড / হাইলাইট (`কোড`)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Code className="h-3.5 w-3.5" />
                    </button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('bullet')}
                      title="বুলেট তালিকা"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('numbered')}
                      title="নম্বরযুক্ত তালিকা"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('quote')}
                      title="উক্তি বা বিশেষ নোট (> নোট)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Quote className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleOpenTableModal}
                      title="উন্নত টেবিল টুল (কাস্টম ও প্রিসেট)"
                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-primary dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      <span className="text-[11px]">টেবিল বিল্ডার</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting('link')}
                      title="লিঙ্ক যুক্ত করুন [শিরোনাম](url)"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      <span className="text-[11px]">লিঙ্ক</span>
                    </button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    {/* Hidden content image file input */}
                    <input
                      type="file"
                      ref={contentFileInputRef}
                      onChange={handleContentImgSelect}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingContentImg}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => contentFileInputRef.current?.click()}
                      title="ছবি আপলোড ও ইনসার্ট (Cloudinary)"
                      className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-primary dark:text-emerald-400 rounded-md cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      {isUploadingContentImg ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                      )}
                      <span className="text-[11px]">ছবি যুক্ত করুন</span>
                    </button>
                  </div>
                )}

                {/* Editor or Preview View */}
                {editorTab === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    onSelect={handleTextareaSelect}
                    onKeyUp={handleTextareaSelect}
                    onMouseUp={handleTextareaSelect}
                    placeholder="এখানে আপনার সম্পূর্ণ আর্টিকেল লিখুন... (হেডিং, বোল্ড, ইটালিক, লিস্ট, টেবিল ও ছবি যুক্ত করতে উপরের টুলবার ব্যবহার করুন)"
                    className="w-full p-4 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono leading-relaxed"
                  />
                ) : (
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[280px]">
                    <ArticleContentRenderer content={formContent} />
                  </div>
                )}
              </div>

              {/* Row 6: Publication Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    প্রকাশের তারিখ ও সময়
                  </label>
                  <input
                    type="datetime-local"
                    value={formPublishedAt}
                    onChange={(e) => setFormPublishedAt(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    স্ট্যাটাস নির্বাচন
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        name="article_status"
                        checked={formStatus === 'published'}
                        onChange={() => setFormStatus('published')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-emerald-600 dark:text-emerald-400">প্রকাশিত (Published)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        name="article_status"
                        checked={formStatus === 'draft'}
                        onChange={() => setFormStatus('draft')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-amber-600 dark:text-amber-400">ড্রাফট (Draft)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/60 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
              >
                বাতিল
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveArticle('draft')}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-300/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  ড্রাফট হিসেবে সেভ
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveArticle()}
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 rounded-xl shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{formStatus === 'published' ? 'প্রকাশ করুন' : 'সংরক্ষণ করুন'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Generator Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <TableIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    স্মার্ট টেবিল বিল্ডার
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    আর্টিকেলের জন্য সুন্দর ও পরিপাটি টেবিল তৈরি করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* If user had selected text */}
              {selectedTextLines.length > 0 && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>নির্বাচিত টেক্সট শনাক্ত হয়েছে ({selectedTextLines.length} টি লাইন)</span>
                    </p>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                      আপনার মার্ক করা টেক্সটের লাইনগুলো সরাসরি টেবিলের সারিতে রূপান্তর করা যাবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConvertSelectedToTable}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    নির্বাচিত টেক্সট দিয়ে টেবিল সাজান
                  </button>
                </div>
              )}

              {/* Preset Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  টেবিল টেমপ্লেট নির্বাচন করুন
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTablePreset('syllabus')}
                    className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      tablePreset === 'syllabus'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🎓 সিলেবাস ও মানবণ্টন</div>
                    <div className="text-[11px] opacity-75">বিষয়, পূর্ণমান, মানবণ্টন</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTablePreset('routine')}
                    className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      tablePreset === 'routine'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm mb-0.5">📅 পরীক্ষার রুটিন</div>
                    <div className="text-[11px] opacity-75">তারিখ, বিষয়, সময়</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTablePreset('results')}
                    className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      tablePreset === 'results'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🏆 ফলাফল ও মেধাক্রম</div>
                    <div className="text-[11px] opacity-75">মেধাক্রম, রোল, নম্বর, গ্রেড</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTablePreset('custom')}
                    className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      tablePreset === 'custom'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm mb-0.5">⚙️ কাস্টম গ্রিড</div>
                    <div className="text-[11px] opacity-75">ইচ্ছামতো কলাম ও সারি</div>
                  </button>
                </div>
              </div>

              {/* Rows & Columns Counter controls */}
              <div className="flex flex-wrap items-center gap-6 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">কলাম সংখ্যা:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={tableHeaders.length <= 2}
                      onClick={() => {
                        const newCols = Math.max(2, tableHeaders.length - 1);
                        setCustomCols(newCols);
                        setTableHeaders((prev) => prev.slice(0, newCols));
                        setTableRowsData((prev) => prev.map((r) => r.slice(0, newCols)));
                        setTablePreset('custom');
                      }}
                      className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                      {tableHeaders.length}
                    </span>
                    <button
                      type="button"
                      disabled={tableHeaders.length >= 6}
                      onClick={() => {
                        const newCols = Math.min(6, tableHeaders.length + 1);
                        setCustomCols(newCols);
                        setTableHeaders((prev) => [...prev, `কলাম ${newCols}`]);
                        setTableRowsData((prev) => prev.map((r) => [...r, '']));
                        setTablePreset('custom');
                      }}
                      className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">সারি (Rows):</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={tableRowsData.length <= 1}
                      onClick={() => {
                        setTableRowsData((prev) => prev.slice(0, -1));
                        setCustomRows((prev) => Math.max(1, prev - 1));
                        setTablePreset('custom');
                      }}
                      className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                      {tableRowsData.length}
                    </span>
                    <button
                      type="button"
                      disabled={tableRowsData.length >= 10}
                      onClick={() => {
                        setTableRowsData((prev) => [
                          ...prev,
                          Array.from({ length: tableHeaders.length }, (_, idx) => `তথ্য ${idx + 1}`),
                        ]);
                        setCustomRows((prev) => Math.min(10, prev + 1));
                        setTablePreset('custom');
                      }}
                      className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Column Headers */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  কলাম শিরোনামসমূহ (Headers) সম্পাদনা করুন
                </label>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${tableHeaders.length}, minmax(0, 1fr))`,
                  }}
                >
                  {tableHeaders.map((header, hIdx) => (
                    <input
                      key={hIdx}
                      type="text"
                      value={header}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTableHeaders((prev) => {
                          const updated = [...prev];
                          updated[hIdx] = val;
                          return updated;
                        });
                        setTablePreset('custom');
                      }}
                      placeholder={`কলাম ${hIdx + 1}`}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary font-semibold"
                    />
                  ))}
                </div>
              </div>

              {/* Table Live Preview & In-place Cell Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    টেবিল লাইভ প্রিভিউ ও ডেটা এডিটর
                  </label>
                  <span className="text-[11px] text-slate-400">
                    সেলগুলোতে ক্লিক করে সরাসরি ডেটা লিখতে পারেন
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold uppercase">
                      <tr>
                        {tableHeaders.map((th, thIdx) => (
                          <th key={thIdx} className="px-3 py-2.5 font-bold">
                            {th || `কলাম ${thIdx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60 bg-white dark:bg-slate-900">
                      {tableRowsData.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          {tableHeaders.map((_, cIdx) => (
                            <td key={cIdx} className="p-1.5">
                              <input
                                type="text"
                                value={row[cIdx] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTableRowsData((prev) => {
                                    const next = prev.map((r, i) => (i === rIdx ? [...r] : r));
                                    next[rIdx][cIdx] = val;
                                    return next;
                                  });
                                }}
                                placeholder="তথ্য লিখুন..."
                                className="w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
              >
                বাতিল
              </button>

              <button
                type="button"
                onClick={handleInsertTable}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 rounded-xl shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>টেবিল যুক্ত করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
