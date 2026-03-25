import { useState } from 'react';
import { SlideCard } from './SlideCard';
import type { Slide, Presentation } from '../types/presentation';

interface SlideCarouselProps {
  presentation: Presentation;
  onUpdateSlide: (index: number, updates: Partial<Slide>) => void;
  editingSlideIndex: number | null;
  onEditingSlideIndex: (index: number | null) => void;
}

export function SlideCarousel({
  presentation,
  onUpdateSlide,
  editingSlideIndex,
  onEditingSlideIndex,
}: SlideCarouselProps) {
  const [current, setCurrent] = useState(0);
  const slides = presentation.slides;

  if (!slides.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-500">
        No slides yet. Enter a prompt above to generate slides.
      </div>
    );
  }

  const slide = slides[current];
  const isEditing = editingSlideIndex === current;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrent((p) => Math.max(0, p - 1))}
            disabled={current === 0}
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous slide"
          >
            ←
          </button>
          <span className="text-sm font-medium text-gray-700">
            Slide {current + 1} of {slides.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrent((p) => Math.min(slides.length - 1, p + 1))}
            disabled={current === slides.length - 1}
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next slide"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={() => onEditingSlideIndex(isEditing ? null : current)}
          className="text-sm px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium"
        >
          {isEditing ? 'Done editing' : 'Edit slide'}
        </button>
      </div>

      <SlideCard
        slide={slide}
        themeId={presentation.themeId}
        fontFamily={presentation.fontFamily}
        customColors={presentation.customColors}
        isEditing={isEditing}
        onTitleChange={(title) => onUpdateSlide(current, { title })}
        onContentChange={(index, value) => {
          const content = [...slide.content];
          content[index] = value;
          onUpdateSlide(current, { content });
        }}
        onLayoutChange={(layout) => onUpdateSlide(current, { layout })}
        onAnimationChange={(animation) => onUpdateSlide(current, { animation })}
      />
    </div>
  );
}
