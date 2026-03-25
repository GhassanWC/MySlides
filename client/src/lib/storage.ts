import type { Presentation } from '../types/presentation';
import { STORAGE_KEY, MAX_LOCAL_PRESENTATIONS } from '../types/presentation';

function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function loadPresentations(): Presentation[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function savePresentations(list: Presentation[]): void {
  const trimmed = list.slice(-MAX_LOCAL_PRESENTATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function savePresentation(p: Presentation): void {
  const list = loadPresentations();
  const idx = list.findIndex((x) => x.id === p.id);
  const updated = { ...p, updatedAt: Date.now() };
  const next = idx >= 0 ? list.map((x, i) => (i === idx ? updated : x)) : [updated, ...list].slice(0, MAX_LOCAL_PRESENTATIONS);
  savePresentations(next);
}

export function getPresentation(id: string): Presentation | undefined {
  return loadPresentations().find((p) => p.id === id);
}

export function deletePresentation(id: string): void {
  savePresentations(loadPresentations().filter((p) => p.id !== id));
}
