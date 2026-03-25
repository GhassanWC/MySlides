import { useRef, useEffect } from 'react';
import type { Slide as SlideType } from '../types/presentation';
import { THEMES, LAYOUTS, ANIMATIONS, toContentBlocks } from '../types/presentation';
import { getSlideBackground } from '../lib/slideBackground';
import { SpecSlideView } from './SpecSlideView';

interface SlideCardProps {
  slide: SlideType;
  themeId: string;
  fontFamily: string;
  customColors?: { bg: string; text: string; accent: string };
  isEditing: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (index: number, value: string) => void;
  onLayoutChange: (layout: SlideType['layout']) => void;
  onAnimationChange?: (animation: NonNullable<SlideType['animation']>) => void;
}

const anim = (id: NonNullable<SlideType['animation']>) => `slide-anim-${id}`;

export function SlideCard({
  slide,
  themeId,
  fontFamily,
  customColors,
  isEditing,
  onTitleChange,
  onContentChange,
  onLayoutChange,
  onAnimationChange,
}: SlideCardProps) {
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const bg = customColors?.bg ?? theme.bg;
  const text = customColors?.text ?? theme.text;
  const accent = customColors?.accent ?? theme.accent;
  const animation = slide.animation ?? 'none';
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (animation === 'none' || !wrapperRef.current) return;
    const el = wrapperRef.current;
    el.classList.add(anim(animation));
    const t = setTimeout(() => el.classList.remove(anim(animation)), 1200);
    return () => clearTimeout(t);
  }, [animation, slide.id]);

  const contentBlock = (blocks: { text: string }[]) => (
    <ul className="space-y-2 list-disc list-inside">
      {blocks.map((block, i) => (
        <li key={i}>
          {isEditing ? (
            <input
              type="text"
              value={block.text}
              onChange={(e) => onContentChange(i, e.target.value)}
              className="w-full bg-transparent border-b border-dashed border-current/30 focus:border-current outline-none py-0.5 text-base"
              style={{ color: text }}
            />
          ) : (
            <span>{block.text || ' '}</span>
          )}
        </li>
      ))}
    </ul>
  );

  const titleEditable = (big = false) =>
    isEditing ? (
      <input
        type="text"
        value={slide.title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full bg-transparent border-b-2 border-dashed border-current/30 focus:border-current outline-none py-1"
        style={{ color: text, fontSize: big ? '2rem' : '1.5rem' }}
        placeholder="Slide title"
      />
    ) : (
      <h2 className="font-bold" style={{ color: accent, fontSize: big ? '2rem' : '1.5rem' }}>
        {slide.title || 'Untitled'}
      </h2>
    );

  const isProTheme = themeId === 'pro' || themeId === 'modern';
  const slideBg = getSlideBackground(slide, bg);

  if (slide.designSpec && slide.designSpec.blocks?.length > 0) {
    return (
      <div
        ref={wrapperRef}
        className="rounded-xl shadow-lg overflow-hidden border border-gray-200 min-h-[320px] flex flex-col slide-card relative"
        style={{ color: text, fontFamily: fontFamily || theme.fontFamily }}
      >
        {isProTheme && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl z-10" style={{ backgroundColor: accent }} />}
        <div className="flex-1 min-h-0 relative">
          <SpecSlideView
            spec={slide.designSpec}
            fontFamily={fontFamily || theme.fontFamily}
            className="absolute inset-0"
          />
        </div>
        {isEditing && (
          <div className="px-4 py-2 border-t border-black/10 text-xs text-gray-500">
            AI-designed slide • Edit in Present mode
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="rounded-xl shadow-lg overflow-hidden border border-gray-200 min-h-[320px] flex flex-col slide-card relative"
      style={{
        ...slideBg,
        color: text,
        fontFamily: fontFamily || theme.fontFamily,
      }}
    >
      {isProTheme && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl z-10" style={{ backgroundColor: accent }} />}
      <div className="p-6 flex-1 flex flex-col">
        {/* title-only: centered big title */}
        {slide.layout === 'title-only' && (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="max-w-2xl">{titleEditable(true)}</div>
          </div>
        )}

        {/* title-content: classic title + bullets */}
        {slide.layout === 'title-content' && (
          <>
            <div className="mb-4">{titleEditable(false)}</div>
            <div className="flex-1">{contentBlock(toContentBlocks(slide.content))}</div>
          </>
        )}

        {/* two-column: title + two columns */}
        {slide.layout === 'two-column' && (() => {
          const blocks = toContentBlocks(slide.content);
          const mid = Math.ceil(blocks.length / 2);
          const left = blocks.slice(0, mid);
          const right = blocks.slice(mid);
          return (
            <>
              <div className="mb-4">{titleEditable(false)}</div>
              <div className="grid grid-cols-2 gap-6 flex-1">
                <div className="space-y-2">
                  {left.map((block, i) => (
                    <div key={i}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={block.text}
                          onChange={(e) => onContentChange(i, e.target.value)}
                          className="w-full bg-transparent border-b border-dashed border-current/30 focus:border-current outline-none py-0.5 text-sm"
                          style={{ color: text }}
                        />
                      ) : (
                        <span className="text-sm">• {block.text || ' '}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {right.map((block, i) => {
                    const idx = mid + i;
                    return (
                      <div key={idx}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={block.text}
                            onChange={(e) => onContentChange(idx, e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-current/30 focus:border-current outline-none py-0.5 text-sm"
                            style={{ color: text }}
                          />
                        ) : (
                          <span className="text-sm">• {block.text || ' '}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* section-header: large section title, optional subtitle */}
        {slide.layout === 'section-header' && (() => {
          const blocks = toContentBlocks(slide.content);
          const subtitle = blocks[0]?.text ?? '';
          return (
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-2">{titleEditable(true)}</div>
              {(subtitle || isEditing) && (
                <div className="text-lg opacity-90">
                  {isEditing ? (
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => onContentChange(0, e.target.value)}
                      className="w-full bg-transparent border-b border-dashed border-current/30 focus:border-current outline-none py-1"
                      style={{ color: text }}
                      placeholder="Subtitle"
                    />
                  ) : (
                    <p>{subtitle}</p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* quote: centered quote + optional attribution */}
        {slide.layout === 'quote' && (() => {
          const blocks = toContentBlocks(slide.content);
          const quote = blocks[0]?.text ?? '';
          const attribution = blocks[1]?.text ?? '';
          return (
            <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
              <blockquote className="text-xl md:text-2xl font-medium italic max-w2xl mb-4" style={{ color: text }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={quote}
                    onChange={(e) => onContentChange(0, e.target.value)}
                    className="w-full bg-transparent border-b border-dashed border-current/30 focus:border-current outline-none py-1 text-center"
                    style={{ color: text }}
                    placeholder="Quote text"
                  />
                ) : (
                  <>"{quote || 'Quote'}"</>
                )}
              </blockquote>
              {(attribution || isEditing) && (
                <cite className="text-sm opacity-80">
                  {isEditing ? (
                    <input
                      type="text"
                      value={attribution}
                      onChange={(e) => onContentChange(1, e.target.value)}
                      className="w-full bg-transparent border-b border-dashed border-current/30 focus:border-current outline-none py-0.5 text-center"
                      style={{ color: text }}
                      placeholder="Attribution"
                    />
                  ) : (
                    <>— {attribution}</>
                  )}
                </cite>
              )}
            </div>
          );
        })()}
      </div>

      {isEditing && (
        <div className="px-4 py-2 border-t border-black/10 flex flex-wrap gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium opacity-75">Layout</span>
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLayoutChange(l.id)}
                className={`text-xs px-2 py-1 rounded ${slide.layout === l.id ? 'ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  backgroundColor: slide.layout === l.id ? accent : 'transparent',
                  color: slide.layout === l.id ? bg : text,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          {onAnimationChange && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium opacity-75">Animation</span>
              {ANIMATIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAnimationChange(a.id)}
                  className={`text-xs px-2 py-1 rounded ${(slide.animation ?? 'none') === a.id ? 'ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    backgroundColor: (slide.animation ?? 'none') === a.id ? accent : 'transparent',
                    color: (slide.animation ?? 'none') === a.id ? bg : text,
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
