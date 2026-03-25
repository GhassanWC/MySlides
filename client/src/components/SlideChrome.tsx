/**
 * Consistent header/footer for every slide (genspark-style modern web design).
 * All slides follow the same pattern.
 */

interface SlideChromeProps {
  title: string;
  slideIndex: number;
  totalSlides: number;
  date?: string;
  tag?: string;
  textColor?: string;
  fontFamily?: string;
}

export function SlideChrome({
  title,
  slideIndex,
  totalSlides,
  date,
  tag,
  textColor = '#9CA3AF',
  fontFamily = 'Inter',
}: SlideChromeProps) {
  const metaDate = date ?? new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const metaTag = tag ? `#${tag.replace(/^#/, '')}` : '';

  return (
    <>
      {/* Header */}
      <header
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-[5%] py-3 text-[11px] font-medium"
        style={{ color: textColor, fontFamily }}
      >
        <span>{title}</span>
        <span>{metaDate}</span>
        <span>{metaTag}</span>
      </header>

      {/* Footer: slide number + short deck label (no full repetition) */}
      <footer
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-[5%] py-3 text-[11px] font-medium"
        style={{ color: textColor, fontFamily }}
      >
        <span className="tabular-nums">
          {slideIndex + 1}/{totalSlides}
        </span>
        <span className="truncate max-w-[40%]">{title}</span>
      </footer>
    </>
  );
}
