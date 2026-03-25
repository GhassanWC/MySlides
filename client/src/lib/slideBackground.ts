import type { Slide } from '../types/presentation';

export interface SlideBgStyle {
  backgroundColor?: string;
  background?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
}

export function getSlideBackground(slide: Slide, fallbackBg: string): SlideBgStyle {
  const bgStyle = slide.backgroundStyle ?? 'solid';
  if (bgStyle === 'gradient' && slide.bgGradient) {
    return { background: slide.bgGradient };
  }
  if (bgStyle === 'image' && slide.imageUrl) {
    return {
      backgroundImage: `url(${slide.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: fallbackBg };
}

export function needsOverlay(slide: Slide): boolean {
  return slide.backgroundStyle === 'image' && !!slide.imageUrl;
}
