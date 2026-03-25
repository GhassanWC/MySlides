import { SlideElement } from './asset';

/** Professional layout templates (7) */
export type SlideLayoutId =
  | 'title-only'
  | 'title-content'
  | 'two-column'
  | 'section-header'
  | 'quote'
  | 'image-left'
  | 'text-cards';

/** Animation presets (5) */
export type AnimationId = 'none' | 'fadeIn' | 'titleThenBullets' | 'slideFromRight' | 'scaleIn';

/** Background style types */
export type BackgroundStyleId = 'solid' | 'gradient' | 'image';

export const BACKGROUND_STYLES: { id: BackgroundStyleId; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image', label: 'Image' },
];

/** Content block with optional formatting (PowerPoint/Google Slides style) */
export interface ContentBlock {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/** (C) Template overrides: model-driven tweaks to layout appearance */
export interface TemplateOverrides {
  titleSize?: number; // px
  bodySize?: number;
  padding?: number;
  imagePosition?: 'left' | 'right' | 'background';
  accentBarHeight?: number;
  titleColor?: string;
}

/** (B) Rich design spec: positions, fonts, blocks for generic renderer - premium layout */
export interface DesignSpecBlock {
  type: 'title' | 'subtitle' | 'bullets' | 'text' | 'image' | 'quote' | 'stat' | 'agenda-item' | 'shape' | 'divider' | 'icon' | 'grid';
  content?: string;
  items?: string[];
  columns?: number;
  gap?: number;
  children?: DesignSpecBlock[];
  style?: {
    top?: number;
    left?: number;
    width?: number;
    height?: number;
    lineHeight?: number;
    letterSpacing?: number | string;
    padding?: number;
    backgroundFill?: string;
    borderRadius?: number;
    opacity?: number;
    zIndex?: number;
    fontSize?: number;
    color?: string;
    fontWeight?: number;
    textAlign?: string;
    position?: 'absolute' | 'relative' | 'static' | 'fixed' | 'sticky';
  };
}
export interface DesignSpec {
  layoutType?: string;
  narrativeIntent?: { message?: string; emotion?: string };
  safeMargins?: { top?: number; right?: number; bottom?: number; left?: number };
  grid?: { columns?: number; gutter?: number };
  primaryAnchor?: string;
  background?: {
    type: 'solid' | 'gradient' | 'image';
    color?: string;
    gradient?: string;
    imageUrl?: string;
    imagePrompt?: string;
  };
  blocks: DesignSpecBlock[];
}

/** (A) Model-generated HTML/CSS for a single slide */
export interface CustomSlideContent {
  html: string;
  css: string;
}

export interface Slide {
  id: string;
  title: string;
  /** Content blocks (bullets). Legacy: string[] is normalized to ContentBlock[] when loading. */
  content: (string | ContentBlock)[];
  layout: SlideLayoutId;
  animation?: AnimationId;
  backgroundStyle?: BackgroundStyleId;
  bgGradient?: string;
  imageUrl?: string;
  imagePrompt?: string;
  /** (C) Model-driven template overrides */
  templateOverrides?: TemplateOverrides;
  /** (B) Full design spec; when set, render with SpecSlideView */
  designSpec?: DesignSpec;
  /** (A) Model-generated HTML/CSS; when set, render with HtmlSlideView */
  customHtml?: string;
  customCss?: string;
  
  /** (D) Inserted visual elements (assets like images, shapes, icons) overlaying the slide */
  elements?: SlideElement[];
}

/** Normalize content to ContentBlock[] */
export function toContentBlocks(content: (string | ContentBlock)[]): ContentBlock[] {
  return content.map((c) =>
    typeof c === 'string' ? { text: c } : { text: c.text ?? '', bold: c.bold, italic: c.italic, underline: c.underline }
  );
}


export interface Theme {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  fontFamily: string;
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  themeId: string;
  fontFamily: string;
  customColors?: { bg: string; text: string; accent: string };
  /** Optional metadata shown in header/footer (genspark-style) */
  slideDate?: string;
  slideTag?: string;
  generatedByModel?: string;
  chatHistory?: { id: string; role: 'user' | 'assistant'; content: string }[];
  updatedAt: number;
}

export const LAYOUTS: { id: SlideLayoutId; label: string }[] = [
  { id: 'title-only', label: 'Title only' },
  { id: 'title-content', label: 'Title & content' },
  { id: 'two-column', label: 'Two column' },
  { id: 'text-cards', label: 'Text + cards' },
  { id: 'section-header', label: 'Section header' },
  { id: 'quote', label: 'Quote' },
  { id: 'image-left', label: 'Image left' },
];

export const ANIMATIONS: { id: AnimationId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'fadeIn', label: 'Fade in' },
  { id: 'titleThenBullets', label: 'Title then bullets' },
  { id: 'slideFromRight', label: 'Slide from right' },
  { id: 'scaleIn', label: 'Scale in' },
];

export const THEMES: Theme[] = [
  { id: 'default', name: 'Default', bg: '#ffffff', text: '#1f2937', accent: '#4f46e5', fontFamily: 'Inter' },
  { id: 'modern', name: 'Modern', bg: '#F9FAFB', text: '#5C647D', accent: '#2F365C', fontFamily: 'Inter' },
  { id: 'pro', name: 'Pro Web', bg: '#ffffff', text: '#1e293b', accent: '#6366f1', fontFamily: 'Inter' },
  { id: 'slate', name: 'Slate', bg: '#f8fafc', text: '#0f172a', accent: '#475569', fontFamily: 'Inter' },
  { id: 'indigo', name: 'Indigo', bg: '#eef2ff', text: '#312e81', accent: '#4f46e5', fontFamily: 'Inter' },
  { id: 'emerald', name: 'Emerald', bg: '#ecfdf5', text: '#064e3b', accent: '#059669', fontFamily: 'Inter' },
  { id: 'amber', name: 'Amber', bg: '#fffbeb', text: '#78350f', accent: '#d97706', fontFamily: 'Inter' },
  { id: 'rose', name: 'Rose', bg: '#fff1f2', text: '#881337', accent: '#e11d48', fontFamily: 'Inter' },
];

export const FONTS = [
  { id: 'Inter', name: 'Inter' },
  { id: 'Georgia', name: 'Georgia' },
  { id: 'system-ui', name: 'System UI' },
];

export const STORAGE_KEY = 'myslides_presentations';
export const MAX_LOCAL_PRESENTATIONS = 20;
