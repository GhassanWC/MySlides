import { auth } from '../lib/firebase';

export interface GenerateSlidesTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontTitle?: string;
  fontBody?: string;
  backgroundStyle?: string;
}

import type { TemplateOverrides, DesignSpec } from '../types/presentation';

export interface GenerateSlidesResponse {
  theme?: GenerateSlidesTheme;
  slides: {
    title: string;
    content: string[];
    layout?: string;
    animation?: string;
    backgroundStyle?: string;
    bgGradient?: string;
    imageUrl?: string;
    imagePrompt?: string;
    templateOverrides?: TemplateOverrides;
    designSpec?: DesignSpec;
    customHtml?: string;
    customCss?: string;
  }[];
  generatedByModel?: string;
}

function getGenerateSlidesUrl(): string {
  const REGION = 'us-central1';
  // if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  //   const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-myslides';
  //   return `http://localhost:5001/${projectId}/${REGION}/generateSlidesHttp`;
  // }
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase project ID is not configured.');
  return `https://${REGION}-${projectId}.cloudfunctions.net/generateSlidesHttp`;
}

export interface GenerateSlidesOptions {
  prompt: string;
  title?: string;
  modelName?: string;
}

export async function generateSlides(
  promptOrOptions: string | GenerateSlidesOptions
): Promise<GenerateSlidesResponse> {
  const options =
    typeof promptOrOptions === 'string'
      ? { prompt: promptOrOptions, title: undefined, modelName: 'gpt-4o-mini' }
      : promptOrOptions;
  const { prompt, title, modelName } = options;

  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to generate slides.');
  const token = await user.getIdToken();
  const url = getGenerateSlidesUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt: prompt.trim(), title: title?.trim() || undefined, modelName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error ?? 'Failed to generate slides.') as Error & { status?: number; retryAfter?: number };
    e.status = res.status;
    e.retryAfter = data.retryAfter;
    throw e;
  }
  if (!data || !Array.isArray(data.slides)) {
    throw new Error('Invalid response from server.');
  }
  return {
    theme: data.theme && typeof data.theme === 'object' ? data.theme : undefined,
    slides: data.slides,
    generatedByModel: data.generatedByModel,
  };
}

export interface EditSlidesOptions {
  request: string;
  currentSlides: any[];
  selectedSlideId?: string;
  availableAssets?: any[];
  modelName?: string;
}

export interface EditSlidesResponse {
  action: string;
  summary: string;
  changes: any[];
}

function getEditSlidesUrl(): string {
  const REGION = 'us-central1';
  // if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  //   const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-myslides';
  //   return `http://localhost:5001/${projectId}/${REGION}/editSlidesHttp`;
  // }
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase project ID is not configured.');
  return `https://${REGION}-${projectId}.cloudfunctions.net/editSlidesHttp`;
}

export async function editSlides(options: EditSlidesOptions): Promise<EditSlidesResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to edit slides.');
  const token = await user.getIdToken();
  const url = getEditSlidesUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error ?? 'Failed to edit slides.') as Error & { status?: number; retryAfter?: number };
    e.status = res.status;
    e.retryAfter = data.retryAfter;
    throw e;
  }
  return data as EditSlidesResponse;
}
