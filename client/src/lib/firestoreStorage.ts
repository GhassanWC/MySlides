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
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Presentation, ContentBlock, DesignSpec, TemplateOverrides } from '../types/presentation';
import { LAYOUTS, ANIMATIONS, BACKGROUND_STYLES } from '../types/presentation';

function normalizeContentBlock(c: unknown): ContentBlock {
  if (typeof c === 'string') return { text: c };
  if (c && typeof c === 'object' && 'text' in c) {
    const o = c as Record<string, unknown>;
    return {
      text: typeof o.text === 'string' ? o.text : '',
      bold: o.bold === true,
      italic: o.italic === true,
      underline: o.underline === true,
    };
  }
  return { text: '' };
}

const COLLECTION = 'presentations';
const MAX_PRESENTATIONS = 50;

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result;
}

function toFirestore(p: Presentation, userId: string): Record<string, unknown> {
  return {
    userId,
    title: p.title,
    slides: p.slides.map((s) =>
      stripUndefined({
        id: s.id,
        title: s.title,
        content: s.content.map((c) =>
          typeof c === 'string' ? { text: c } : { text: c.text, bold: c.bold, italic: c.italic, underline: c.underline }
        ),
        layout: s.layout,
        animation: s.animation ?? null,
        backgroundStyle: s.backgroundStyle ?? null,
        bgGradient: s.bgGradient ?? null,
        imageUrl: s.imageUrl ?? null,
        imagePrompt: s.imagePrompt ?? null,
        templateOverrides: s.templateOverrides ?? null,
        designSpec: s.designSpec ?? null,
        customHtml: s.customHtml ?? null,
        customCss: s.customCss ?? null,
      })
    ),
    themeId: p.themeId,
    fontFamily: p.fontFamily,
    customColors: p.customColors ?? null,
    slideDate: p.slideDate ?? null,
    slideTag: p.slideTag ?? null,
    chatHistory: p.chatHistory ?? null,
    updatedAt: p.updatedAt,
  };
}

function fromFirestore(id: string, data: Record<string, unknown>): Presentation {
  const slides = Array.isArray(data.slides) ? data.slides : [];
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled Presentation',
    slides: slides.map((s: unknown) => {
      const slide = s as Record<string, unknown>;
      const layout =
        typeof slide.layout === 'string' && LAYOUTS.some((l) => l.id === slide.layout)
          ? (slide.layout as Presentation['slides'][0]['layout'])
          : 'title-content';
      const animation =
        typeof slide.animation === 'string' && ANIMATIONS.some((a) => a.id === slide.animation)
          ? (slide.animation as Presentation['slides'][0]['animation'])
          : 'none';
      const backgroundStyle =
        typeof slide.backgroundStyle === 'string' && BACKGROUND_STYLES.some((b) => b.id === slide.backgroundStyle)
          ? (slide.backgroundStyle as Presentation['slides'][0]['backgroundStyle'])
          : 'solid';
      return {
        id: typeof slide.id === 'string' ? slide.id : `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title: typeof slide.title === 'string' ? slide.title : 'Untitled',
        content: Array.isArray(slide.content) ? slide.content.map(normalizeContentBlock) : [],
        layout,
        animation,
        backgroundStyle,
        bgGradient: typeof slide.bgGradient === 'string' ? slide.bgGradient : undefined,
        imageUrl: typeof slide.imageUrl === 'string' ? slide.imageUrl : undefined,
        imagePrompt: typeof slide.imagePrompt === 'string' ? slide.imagePrompt : undefined,
        templateOverrides: slide.templateOverrides && typeof slide.templateOverrides === 'object' ? (slide.templateOverrides as TemplateOverrides) : undefined,
        designSpec: slide.designSpec && typeof slide.designSpec === 'object' && Array.isArray((slide.designSpec as DesignSpec).blocks) ? (slide.designSpec as DesignSpec) : undefined,
        customHtml: typeof slide.customHtml === 'string' ? slide.customHtml : undefined,
        customCss: typeof slide.customCss === 'string' ? slide.customCss : undefined,
      };
    }),
    themeId: typeof data.themeId === 'string' ? data.themeId : 'default',
    fontFamily: typeof data.fontFamily === 'string' ? data.fontFamily : 'Inter',
    slideDate: typeof data.slideDate === 'string' ? data.slideDate : undefined,
    slideTag: typeof data.slideTag === 'string' ? data.slideTag : undefined,
    customColors:
      data.customColors && typeof data.customColors === 'object' && data.customColors !== null
        ? (data.customColors as { bg: string; text: string; accent: string })
        : undefined,
    chatHistory: Array.isArray(data.chatHistory) ? data.chatHistory : undefined,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

export async function loadPresentations(userId: string): Promise<Presentation[]> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(MAX_PRESENTATIONS)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
}

export async function savePresentation(p: Presentation, userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, p.id);
  await setDoc(ref, toFirestore(p, userId), { merge: true });
}

export async function getPresentation(id: string, userId: string): Promise<Presentation | null> {
  const ref = doc(db, COLLECTION, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Record<string, unknown>;
  if (data.userId !== userId) return null;
  return fromFirestore(snapshot.id, data);
}

export async function deletePresentation(id: string, userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data() as Record<string, unknown>).userId === userId) {
    await deleteDoc(ref);
  }
}
