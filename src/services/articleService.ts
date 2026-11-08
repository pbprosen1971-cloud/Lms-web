/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Article } from '../types';

export const ARTICLES_COLLECTION = 'articles';

/**
 * Generate a clean, SEO-friendly slug from title.
 * Converts spaces, punctuation to hyphens, cleans accents, and keeps alphanumeric / Bengali characters.
 */
export function generateSlug(title: string): string {
  if (!title) return '';
  const trimmed = title.trim().toLowerCase();
  
  // Replace Bengali punctuation, English punctuation, and multiple spaces
  const cleaned = trimmed
    .replace(/[\s\t\n]+/g, '-')
    .replace(/[।!?,.:;'"“”‘’`~@#$%^&*()_+=\[\]{}|\\/<>]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (cleaned.length > 0) {
    return cleaned;
  }
  
  // Fallback to random slug if string consisted only of symbols
  return `article-${Date.now().toString(36)}`;
}

/**
 * Calculates estimated reading time in minutes based on content length.
 * Average reading speed: ~180-200 words per minute for Bengali/English mixed text.
 */
export function calculateReadingTimeMinutes(content: string): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 180);
  return Math.max(1, minutes);
}

/**
 * Subscribes to all published articles for public view (latest first).
 */
export function subscribeToPublishedArticles(
  callback: (articles: Article[]) => void,
  onError?: (error: Error) => void
): () => void {
  const articlesRef = collection(db, ARTICLES_COLLECTION);
  // Order by publishedAt or createdAt desc
  const q = query(
    articlesRef,
    where('status', '==', 'published')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const articles: Article[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          slug: data.slug || d.id,
          shortDescription: data.shortDescription || '',
          content: data.content || '',
          bannerImage: data.bannerImage || '',
          category: data.category || 'সাধারণ',
          tags: Array.isArray(data.tags) ? data.tags : [],
          status: data.status || 'published',
          authorId: data.authorId || '',
          authorName: data.authorName || 'মেধা এক্সাম টিম',
          publishedAt: data.publishedAt || data.createdAt || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          readingTimeMinutes: data.readingTimeMinutes || calculateReadingTimeMinutes(data.content || ''),
          viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
        };
      });

      // Sort client-side by publishedAt descending to avoid missing composite index requirement in Firestore
      articles.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      callback(articles);
    },
    (err) => {
      console.error('Error subscribing to published articles:', err);
      handleFirestoreError(err, OperationType.LIST, ARTICLES_COLLECTION);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to all articles (both draft and published) for Admin panel.
 */
export function subscribeToAllArticlesForAdmin(
  callback: (articles: Article[]) => void,
  onError?: (error: Error) => void
): () => void {
  const articlesRef = collection(db, ARTICLES_COLLECTION);

  return onSnapshot(
    articlesRef,
    (snapshot) => {
      const articles: Article[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          slug: data.slug || d.id,
          shortDescription: data.shortDescription || '',
          content: data.content || '',
          bannerImage: data.bannerImage || '',
          category: data.category || 'সাধারণ',
          tags: Array.isArray(data.tags) ? data.tags : [],
          status: data.status || 'draft',
          authorId: data.authorId || '',
          authorName: data.authorName || 'মেধা এক্সাম এডমিন',
          publishedAt: data.publishedAt || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          readingTimeMinutes: data.readingTimeMinutes || calculateReadingTimeMinutes(data.content || ''),
          viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
        };
      });

      // Sort latest first
      articles.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      callback(articles);
    },
    (err) => {
      console.error('Error subscribing to all articles for admin:', err);
      handleFirestoreError(err, OperationType.LIST, ARTICLES_COLLECTION);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches a single article by its slug from Firestore.
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim();

  try {
    // 1. Try querying by 'slug' field
    const articlesRef = collection(db, ARTICLES_COLLECTION);
    const q = query(articlesRef, where('slug', '==', cleanSlug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        slug: data.slug || d.id,
        shortDescription: data.shortDescription || '',
        content: data.content || '',
        bannerImage: data.bannerImage || '',
        category: data.category || 'সাধারণ',
        tags: Array.isArray(data.tags) ? data.tags : [],
        status: data.status || 'published',
        authorId: data.authorId || '',
        authorName: data.authorName || 'মেধা এক্সাম টিম',
        publishedAt: data.publishedAt || data.createdAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        readingTimeMinutes: data.readingTimeMinutes || calculateReadingTimeMinutes(data.content || ''),
        viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
      };
    }

    // 2. Fallback: try by document ID directly in case slug equals document ID
    const directDoc = await getDoc(doc(db, ARTICLES_COLLECTION, cleanSlug));
    if (directDoc.exists()) {
      const data = directDoc.data();
      return {
        id: directDoc.id,
        title: data.title || '',
        slug: data.slug || directDoc.id,
        shortDescription: data.shortDescription || '',
        content: data.content || '',
        bannerImage: data.bannerImage || '',
        category: data.category || 'সাধারণ',
        tags: Array.isArray(data.tags) ? data.tags : [],
        status: data.status || 'published',
        authorId: data.authorId || '',
        authorName: data.authorName || 'মেধা এক্সাম টিম',
        publishedAt: data.publishedAt || data.createdAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        readingTimeMinutes: data.readingTimeMinutes || calculateReadingTimeMinutes(data.content || ''),
        viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
      };
    }

    return null;
  } catch (err) {
    console.warn('Error fetching article by slug:', err);
    return null;
  }
}

/**
 * Saves or updates an article in Firestore.
 */
export async function saveArticleToFirestore(
  articleData: Partial<Article>,
  existingId?: string
): Promise<string> {
  const docId = existingId || articleData.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let finalSlug = (articleData.slug || '').trim();
  if (!finalSlug && articleData.title) {
    finalSlug = generateSlug(articleData.title);
  }
  if (!finalSlug) {
    finalSlug = docId;
  }

  const readingTime = calculateReadingTimeMinutes(articleData.content || '');

  const payload: Record<string, any> = {
    title: articleData.title?.trim() || 'শিরোনামহীন আর্টিকেল',
    slug: finalSlug,
    shortDescription: articleData.shortDescription?.trim() || '',
    content: articleData.content || '',
    bannerImage: articleData.bannerImage || '',
    category: articleData.category || 'সাধারণ',
    tags: Array.isArray(articleData.tags) ? articleData.tags : [],
    status: articleData.status || 'draft',
    authorId: articleData.authorId || '',
    authorName: articleData.authorName || 'মেধা এক্সাম এডমিন',
    readingTimeMinutes: readingTime,
    updatedAt: now,
  };

  if (!existingId) {
    payload.createdAt = now;
    payload.viewsCount = 0;
  }

  // If status is published and publishedAt is not set, set it now
  if (payload.status === 'published') {
    payload.publishedAt = articleData.publishedAt || now;
  } else if (articleData.publishedAt) {
    payload.publishedAt = articleData.publishedAt;
  }

  try {
    await setDoc(doc(db, ARTICLES_COLLECTION, docId), payload, { merge: true });
    return docId;
  } catch (err) {
    console.error('Error saving article to Firestore:', err);
    handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `${ARTICLES_COLLECTION}/${docId}`);
    throw err;
  }
}

/**
 * Deletes an article document from Firestore.
 */
export async function deleteArticleFromFirestore(articleId: string): Promise<void> {
  if (!articleId) return;
  try {
    await deleteDoc(doc(db, ARTICLES_COLLECTION, articleId));
  } catch (err) {
    console.error('Error deleting article from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, `${ARTICLES_COLLECTION}/${articleId}`);
    throw err;
  }
}

/**
 * Toggles an article's status between 'published' and 'draft'.
 */
export async function toggleArticlePublishStatus(
  articleId: string,
  currentStatus: 'draft' | 'published'
): Promise<'draft' | 'published'> {
  const newStatus: 'draft' | 'published' = currentStatus === 'published' ? 'draft' : 'published';
  const now = new Date().toISOString();
  
  const updatePayload: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'published') {
    updatePayload.publishedAt = now;
  }

  try {
    await setDoc(doc(db, ARTICLES_COLLECTION, articleId), updatePayload, { merge: true });
    return newStatus;
  } catch (err) {
    console.error('Error toggling article publish status:', err);
    handleFirestoreError(err, OperationType.UPDATE, `${ARTICLES_COLLECTION}/${articleId}`);
    throw err;
  }
}
