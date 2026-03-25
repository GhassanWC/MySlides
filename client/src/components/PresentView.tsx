import { useEffect, useRef, useState, useCallback } from 'react';
import type { Presentation, Slide as SlideType, ContentBlock } from '../types/presentation';
import { THEMES, toContentBlocks } from '../types/presentation';
import { getSlideBackground, needsOverlay } from '../lib/slideBackground';
import { SlideChrome } from './SlideChrome';
import { HtmlSlideView } from './HtmlSlideView';
import { SpecSlideView } from './SpecSlideView';

interface PresentViewProps {
  presentation: Presentation;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function PresentView({
  presentation,
  currentIndex,
  onPrev,
  onNext,
  onExit,
}: PresentViewProps) {
  const slides = presentation.slides;
  const total = slides.length;
  const slide = slides[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < total - 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const theme = THEMES.find((t) => t.id === presentation.themeId) ?? THEMES[0];
  const bg = presentation.customColors?.bg ?? theme.bg;
  const text = presentation.customColors?.text ?? theme.text;
  const accent = presentation.customColors?.accent ?? theme.accent;
  const fontFamily = presentation.fontFamily || theme.fontFamily;

  const scheduleHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    scheduleHide();
    return () => clearTimeout(hideTimer.current);
  }, [scheduleHide]);

  useEffect(() => {
    const el = containerRef.current;
    if (el && el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => { });
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      scheduleHide();
      if (e.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        onExit();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (canNext) onNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        if (canPrev) onPrev();
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [canNext, canPrev, onExit, onNext, onPrev, scheduleHide]);

  if (!slide) return null;

  const progress = total > 1 ? ((currentIndex + 1) / total) * 100 : 100;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col cursor-none select-none"
      style={{ backgroundColor: bg }}
      onMouseMove={scheduleHide}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 3) {
          if (canPrev) onPrev();
        } else {
          if (canNext) onNext();
        }
        scheduleHide();
      }}
      role="presentation"
      aria-label="Presentation mode"
    >
      {/* Slide area: 16:9 aspect, fills the viewport */}
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ maxWidth: '100vw', maxHeight: '100vh' }}
        >
          {slide.customHtml ? (
            <PresentSlideWrapper slide={slide} presentation={presentation} currentIndex={currentIndex} totalSlides={total} bg={bg} text={text} accent={accent} fontFamily={fontFamily}>
              <HtmlSlideView html={slide.customHtml} css={slide.customCss ?? ''} style={{ width: '100%', height: '100%' }} animate={true} />
            </PresentSlideWrapper>
          ) : slide.designSpec ? (
            <PresentSlideWrapper slide={slide} presentation={presentation} currentIndex={currentIndex} totalSlides={total} bg={bg} text={text} accent={accent} fontFamily={fontFamily}>
              <SpecSlideView spec={slide.designSpec} fontFamily={fontFamily} style={{ width: '100%', height: '100%' }} />
            </PresentSlideWrapper>
          ) : (
            <PresentSlide
              slide={slide}
              presentation={presentation}
              currentIndex={currentIndex}
              totalSlides={total}
              bg={bg}
              text={text}
              accent={accent}
              fontFamily={fontFamily}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 z-10">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: accent }}
        />
      </div>

      {/* Controls overlay (auto-hides) */}
      <div
        className={`absolute inset-x-0 bottom-1 z-20 flex items-end justify-center pb-6 pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          className="pointer-events-auto flex items-center gap-4 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (canPrev) onPrev(); }}
            disabled={!canPrev}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Previous slide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          <span className="text-sm font-medium tabular-nums min-w-[60px] text-center">
            {currentIndex + 1} / {total}
          </span>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (canNext) onNext(); }}
            disabled={!canNext}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Next slide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>

          <div className="w-px h-5 bg-white/30" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
              onExit();
            }}
            className="text-sm font-medium px-3 py-1 rounded-full hover:bg-white/10 transition"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Wrapper for (A) HTML and (B) Spec slides: same card + chrome, custom body ---------- */
function PresentSlideWrapper({
  slide,
  presentation,
  currentIndex,
  totalSlides,
  bg,
  accent,
  fontFamily,
  children,
}: {
  slide: SlideType;
  presentation: Presentation;
  currentIndex: number;
  totalSlides: number;
  bg: string;
  text: string;
  accent: string;
  fontFamily: string;
  children: React.ReactNode;
}) {
  const useModernBg = presentation.themeId === 'modern' || presentation.themeId === 'pro' || (presentation.customColors?.bg === '#F9FAFB');
  const metaColor = useModernBg ? '#64748b' : (presentation.customColors?.text ?? '#1e293b');
  return (
    <div
      className="slide-card w-full h-full flex flex-col relative slide-modern-bg slide-pro-web"
      style={{
        ...getSlideBackground(slide, bg),
        fontFamily,
        aspectRatio: '16 / 9',
        maxWidth: '100%',
        maxHeight: '100%',
        ['--slide-accent' as string]: accent,
      }}
    >
      <div className="slide-accent-bar" style={{ backgroundColor: accent }} />
      <SlideChrome
        title={presentation.title}
        slideIndex={currentIndex}
        totalSlides={totalSlides}
        date={presentation.slideDate}
        tag={presentation.slideTag}
        textColor={metaColor}
        fontFamily={fontFamily}
      />
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ---------- Fullscreen slide renderer (layout + C template overrides) ---------- */

function PresentSlide({
  slide,
  presentation,
  currentIndex,
  totalSlides,
  bg,
  text,
  accent,
  fontFamily,
}: {
  slide: SlideType;
  presentation: Presentation;
  currentIndex: number;
  totalSlides: number;
  bg: string;
  text: string;
  accent: string;
  fontFamily: string;
}) {
  const animation = slide.animation ?? 'none';
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (animation === 'none' || !wrapperRef.current) return;
    const el = wrapperRef.current;
    const cls = `slide-anim-${animation}`;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    const t = setTimeout(() => el.classList.remove(cls), 2000);
    return () => clearTimeout(t);
  }, [animation, slide.id]);

  const hasImgOverlay = needsOverlay(slide);
  const slideText = hasImgOverlay ? '#ffffff' : text;
  const slideAccent = hasImgOverlay ? '#ffffff' : (slide.templateOverrides?.titleColor ?? accent);
  const o = slide.templateOverrides;
  const titleSizeBig = o?.titleSize ? Math.min(72, Math.max(24, o.titleSize)) : undefined;
  const titleSizeSmall = o?.titleSize ? Math.min(36, Math.max(18, Math.round((o.titleSize ?? 32) * 0.7))) : undefined;
  const bodySize = o?.bodySize ? Math.min(24, Math.max(12, o.bodySize)) : undefined;
  const padding = o?.padding != null ? Math.min(64, Math.max(16, o.padding)) : undefined;
  const accentBarH = o?.accentBarHeight != null ? Math.min(8, Math.max(2, o.accentBarHeight)) : 4;

  const titleEl = (big = false) => (
    <h2
      className={big ? 'slide-hero-title leading-tight' : 'slide-section-title leading-tight'}
      style={{
        color: slideAccent,
        fontSize: big
          ? (titleSizeBig ? `${titleSizeBig}px` : 'clamp(2rem, 5vw, 4rem)')
          : (titleSizeSmall ? `${titleSizeSmall}px` : 'clamp(1.5rem, 3.5vw, 2.75rem)'),
      }}
    >
      {slide.title || 'Untitled'}
    </h2>
  );

  const bulletEl = (blocks: ContentBlock[]) => (
    <ul className="space-y-3 list-disc list-inside" style={{ fontSize: bodySize ? `${bodySize}px` : 'clamp(1rem, 2vw, 1.5rem)', color: slideText }}>
      {blocks.map((block, i) => (
        <li key={i}>
          <span style={{ fontWeight: block.bold ? 'bold' : undefined, fontStyle: block.italic ? 'italic' : undefined, textDecoration: block.underline ? 'underline' : undefined }}>
            {block.text || ' '}
          </span>
        </li>
      ))}
    </ul>
  );

  const useModernBg = presentation.themeId === 'modern' || presentation.themeId === 'pro' || (presentation.customColors?.bg === '#F9FAFB');
  const useProWeb = true; /* professional web-page style for all slides */
  const metaColor = useModernBg ? '#64748b' : slideText;
  /* Muted accent for gradients (lighter variant) */
  const accentMuted = accent.startsWith('#') ? (() => {
    const hex = accent.slice(1);
    const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 80);
    const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 80);
    const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 80);
    return `rgb(${r},${g},${b})`;
  })() : '#a5b4fc';

  return (
    <div
      ref={wrapperRef}
      className={`slide-card w-full h-full flex flex-col relative ${useModernBg ? 'slide-modern-bg' : ''} ${useProWeb ? 'slide-pro-web' : ''}`}
      style={{
        ...getSlideBackground(slide, bg),
        color: slideText,
        fontFamily,
        aspectRatio: '16 / 9',
        maxWidth: '100%',
        maxHeight: '100%',
        ['--slide-accent' as string]: accent,
        ['--slide-accent-muted' as string]: accentMuted,
      }}
    >
      {useProWeb && <div className="slide-accent-bar" style={{ height: accentBarH, backgroundColor: accent }} />}
      <SlideChrome
        title={presentation.title}
        slideIndex={currentIndex}
        totalSlides={totalSlides}
        date={presentation.slideDate}
        tag={presentation.slideTag}
        textColor={metaColor}
        fontFamily={fontFamily}
      />
      {hasImgOverlay && <div className="absolute inset-0 bg-black/40" />}
      <div
        className="relative flex-1 flex flex-col"
        style={{
          paddingLeft: '6%',
          paddingRight: '6%',
          paddingTop: padding ?? 56,
          paddingBottom: padding ?? 56,
        }}
      >
        {slide.layout === 'title-only' && (
          <div className="flex-1 flex items-center justify-center text-center">
            {titleEl(true)}
          </div>
        )}

        {slide.layout === 'title-content' && (
          <>
            <div className="mb-[3%]">{titleEl(false)}</div>
            <div className="flex-1">{bulletEl(toContentBlocks(slide.content))}</div>
          </>
        )}

        {slide.layout === 'two-column' && (() => {
          const blocks = toContentBlocks(slide.content);
          const mid = Math.ceil(blocks.length / 2);
          const left = blocks.slice(0, mid);
          const right = blocks.slice(mid);
          const liEl = (block: ContentBlock, i: number) => (
            <li key={i}>
              <span style={{ fontWeight: block.bold ? 'bold' : undefined, fontStyle: block.italic ? 'italic' : undefined, textDecoration: block.underline ? 'underline' : undefined }}>{block.text || ' '}</span>
            </li>
          );
          return (
            <>
              <div className="mb-[3%]">{titleEl(false)}</div>
              <div className="grid grid-cols-2 gap-[4%] flex-1" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.35rem)' }}>
                <ul className="space-y-2 list-disc list-inside">{left.map(liEl)}</ul>
                <ul className="space-y-2 list-disc list-inside">{right.map(liEl)}</ul>
              </div>
            </>
          );
        })()}

        {slide.layout === 'section-header' && (
          <div className="flex-1 flex flex-col justify-center">
            {titleEl(true)}
            {toContentBlocks(slide.content)[0]?.text && (
              <p className="mt-4 opacity-85" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)' }}>
                {toContentBlocks(slide.content)[0].text}
              </p>
            )}
          </div>
        )}

        {slide.layout === 'quote' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center px-[4%]">
            <blockquote
              className="font-medium italic max-w-3xl mb-6"
              style={{ fontSize: 'clamp(1.25rem, 3vw, 2.25rem)', color: slideText }}
            >
              "{toContentBlocks(slide.content)[0]?.text || 'Quote'}"
            </blockquote>
            {toContentBlocks(slide.content)[1]?.text && (
              <cite className="opacity-75" style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.15rem)' }}>
                — {toContentBlocks(slide.content)[1].text}
              </cite>
            )}
          </div>
        )}

        {slide.layout === 'image-left' && (
          <div className="flex-1 flex flex-col">
            <div className="mb-[3%]">{titleEl(false)}</div>
            <div className="grid grid-cols-2 gap-[4%] flex-1 min-h-0">
              <div className="flex flex-col justify-center">
                {bulletEl(toContentBlocks(slide.content))}
              </div>
              <div
                className="rounded-lg overflow-hidden bg-cover bg-center"
                style={
                  slide.imageUrl
                    ? { backgroundImage: `url(${slide.imageUrl})` }
                    : { backgroundColor: 'rgba(255,255,255,0.1)' }
                }
              />
            </div>
          </div>
        )}

        {slide.layout === 'text-cards' && (() => {
          const blocks = toContentBlocks(slide.content);
          const subtitle = blocks[0]?.text ?? '';
          const body = blocks[1]?.text ?? '';
          const cards = blocks.slice(2, 6).map((b) => b.text);
          return (
            <div className="flex-1 grid grid-cols-2 gap-[6%] min-h-0">
              <div className="flex flex-col justify-center">
                <h2 className="font-bold mb-2" style={{ color: slideAccent, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontFamily: 'Georgia, serif' }}>
                  {slide.title || 'Untitled'}
                </h2>
                {subtitle && (
                  <h3 className="font-semibold mb-3 opacity-90" style={{ color: slideAccent, fontSize: 'clamp(1rem, 2vw, 1.35rem)' }}>
                    {subtitle}
                  </h3>
                )}
                {body && (
                  <p className="leading-relaxed" style={{ color: slideText, fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)' }}>
                    {body}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 content-start">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 shadow-md flex flex-col justify-center min-h-[80px]"
                    style={{ backgroundColor: slideAccent, color: '#ffffff' }}
                  >
                    <span className="text-xs opacity-70 mb-1 font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium">{cards[i] || 'Card content'}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
