/**
 * MySlides Slide Design Schema (DSL)
 * Machine-readable schema that AI generates. Frontend renders it.
 * AI generates structure; the system guarantees beauty.
 */

export const LAYOUTS = [
  'title-only',
  'title-content',
  'two-column',
  'text-cards',
  'section-header',
  'quote',
  'image-left',
] as const;

export const ANIMATIONS = ['none', 'fadeIn', 'titleThenBullets', 'slideFromRight', 'scaleIn'] as const;

export const BG_STYLES = ['solid', 'gradient', 'image'] as const;

export const SLIDE_TYPES = ['title', 'section', 'content', 'closing'] as const;

export const VISUAL_TONES = ['dark-tech', 'corporate-light', 'modern-minimal', 'executive'] as const;

export const TOPIC_CATEGORIES = ['tech', 'business', 'education', 'marketing', 'finance', 'general'] as const;

export interface AISlideTheme {
  primaryColor: string;
  secondaryColor: string;
  fontTitle: string;
  fontBody: string;
  backgroundStyle: 'solid' | 'dark-gradient' | 'light-gradient';
}

export interface AISlide {
  type: (typeof SLIDE_TYPES)[number];
  layout: (typeof LAYOUTS)[number];
  title: string;
  content: string[];
  /** For two-column / image-left: left column content */
  leftContent?: string[];
  /** For two-column / image-left: right column content */
  rightContent?: string[];
  subtitle?: string;
  backgroundStyle: (typeof BG_STYLES)[number];
  bgGradient?: string;
  imagePrompt?: string;
  animation: (typeof ANIMATIONS)[number];
}

export interface AIDesignPlan {
  topicCategory: (typeof TOPIC_CATEGORIES)[number];
  visualTone: (typeof VISUAL_TONES)[number];
  rationale: string;
}

export interface AIPresentationOutput {
  designPlan: AIDesignPlan;
  theme: AISlideTheme;
  slides: AISlide[];
}

/** (C) Template overrides from AI */
export interface AITemplateOverrides {
  titleSize?: number;
  bodySize?: number;
  padding?: number;
  imagePosition?: 'left' | 'right' | 'background';
  accentBarHeight?: number;
  titleColor?: string;
}

/** Layout types for variety enforcement */
export const LAYOUT_TYPES = [
  'title',
  'agenda',
  'section-divider',
  'split-layout',
  'image-led',
  'stats',
  'timeline-comparison',
  'closing',
] as const;

/** (B) Design spec block for generic renderer - premium layout support */
export interface AIDesignSpecBlock {
  type: 'title' | 'subtitle' | 'bullets' | 'text' | 'image' | 'quote' | 'stat' | 'agenda-item' | 'shape' | 'divider';
  content?: string;
  items?: string[];
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
  };
}
export interface AIDesignSpec {
  layoutType?: (typeof LAYOUT_TYPES)[number];
  narrativeIntent?: { message?: string; emotion?: string };
  safeMargins?: { top?: number; right?: number; bottom?: number; left?: number };
  grid?: { columns?: number; gutter?: number };
  primaryAnchor?: 'top-left' | 'top-center' | 'center' | 'bottom-right' | string;
  background?: {
    type: 'solid' | 'gradient' | 'image';
    color?: string;
    gradient?: string;
    imageUrl?: string;
    imagePrompt?: string;
  };
  blocks: AIDesignSpecBlock[];
}

/** (A) Model-generated HTML/CSS */
export interface AICustomSlideContent {
  html: string;
  css: string;
}

/** Internal format after parsing (matches client Slide minus id) */
export interface SlideData {
  title: string;
  content: string[];
  layout: (typeof LAYOUTS)[number];
  animation: (typeof ANIMATIONS)[number];
  backgroundStyle: (typeof BG_STYLES)[number];
  bgGradient?: string;
  imageUrl?: string;
  imagePrompt?: string;
  templateOverrides?: AITemplateOverrides;
  designSpec?: AIDesignSpec;
  customHtml?: string;
  customCss?: string;
}
