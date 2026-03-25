import type { DesignSpec, DesignSpecBlock } from '../types/presentation';

interface SpecSlideViewProps {
  spec: DesignSpec;
  fontFamily?: string;
  className?: string;
  style?: React.CSSProperties;
}

function blockStyle(block: DesignSpecBlock): React.CSSProperties {
  const s = block.style ?? {};
  const style: React.CSSProperties = {
    position: 'absolute',
    fontFamily: 'inherit',
  };
  if (s.position) style.position = s.position;
  if (s.top != null) style.top = typeof s.top === 'number' ? `${s.top}%` : s.top;
  if (s.left != null) style.left = typeof s.left === 'number' ? `${s.left}%` : s.left;
  if (s.width != null) style.width = typeof s.width === 'number' ? `${s.width}%` : s.width;
  if (s.height != null) style.height = typeof s.height === 'number' ? `${s.height}%` : s.height;
  if (s.fontSize != null) style.fontSize = typeof s.fontSize === 'number' ? `${s.fontSize}px` : s.fontSize;
  if (s.color != null) style.color = String(s.color);
  if (s.fontWeight != null) style.fontWeight = typeof s.fontWeight === 'number' ? s.fontWeight : String(s.fontWeight);
  if (s.textAlign != null) style.textAlign = String(s.textAlign) as React.CSSProperties['textAlign'];
  if (s.lineHeight != null) style.lineHeight = typeof s.lineHeight === 'number' ? s.lineHeight : String(s.lineHeight);
  if (s.letterSpacing != null) style.letterSpacing = typeof s.letterSpacing === 'number' ? `${s.letterSpacing}px` : String(s.letterSpacing);
  if (s.padding != null) style.padding = typeof s.padding === 'number' ? `${s.padding}px` : s.padding;
  if (s.backgroundFill != null) style.backgroundColor = String(s.backgroundFill);
  if (s.borderRadius != null) style.borderRadius = typeof s.borderRadius === 'number' ? `${s.borderRadius}px` : s.borderRadius;
  if (s.opacity != null) style.opacity = typeof s.opacity === 'number' ? s.opacity : parseFloat(String(s.opacity));
  if (s.zIndex != null) style.zIndex = typeof s.zIndex === 'number' ? s.zIndex : parseInt(String(s.zIndex), 10);
  return style;
}

/**
 * (B) Renders a slide from a rich design spec (positions, blocks, background).
 */
export function SpecSlideView({ spec, fontFamily, className, style }: SpecSlideViewProps) {
  const bg = spec.background;
  const bgStyle: React.CSSProperties = { backgroundColor: '#f8fafc' };
  if (bg?.type === 'solid' && bg.color) bgStyle.backgroundColor = bg.color;
  if (bg?.type === 'gradient' && bg.gradient) bgStyle.background = bg.gradient;
  if (bg?.type === 'image' && bg.imageUrl) {
    bgStyle.backgroundImage = `url(${bg.imageUrl})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  const renderBlock = (block: DesignSpecBlock, i: number, prefix: string) => {
    const key = `${prefix}-${i}`;
    const s = blockStyle(block);
    if (block.type === 'title' || block.type === 'subtitle') {
      const Tag = block.type === 'title' ? 'h1' : 'h2';
      return (
        <Tag key={key} style={{ margin: 0, ...s }}>
          {block.content ?? ''}
        </Tag>
      );
    }
    if (block.type === 'quote') {
      return (
        <blockquote key={key} style={{ margin: 0, ...s }}>
          {block.content ?? ''}
        </blockquote>
      );
    }
    if (block.type === 'bullets' && block.items?.length) {
      return (
        <ul key={key} style={{ margin: 0, paddingLeft: '1.5em', ...s }}>
          {block.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    }
    if (block.type === 'image' && block.content) {
      return (
        <div
          key={key}
          style={{
            ...s,
            backgroundImage: `url(${block.content})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      );
    }
    if (block.type === 'icon') {
      return (
        <div key={key} style={{ margin: 0, ...s, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {block.content ?? ''}
        </div>
      );
    }
    if (block.type === 'grid') {
      return (
        <div
          key={key}
          style={{
            ...s,
            display: 'grid',
            gridTemplateColumns: `repeat(${block.columns ?? 2}, 1fr)`,
            gap: block.gap != null ? `${block.gap}px` : '16px',
            position: s.position, // Keep position info from blockStyle but grid manages children
          }}
        >
          {block.children?.map((child, j) => renderBlock({ ...child, style: { ...child.style, position: 'relative', top: 0, left: 0 } }, j, `${key}`))}
        </div>
      );
    }
    if (block.type === 'stat') {
      return (
        <div key={key} style={{ margin: 0, ...s }}>
          {block.content ?? ''}
        </div>
      );
    }
    if (block.type === 'agenda-item') {
      return (
        <div key={key} style={{ margin: 0, ...s }}>
          {block.content ?? ''}
        </div>
      );
    }
    if (block.type === 'shape') {
      return <div key={key} style={{ margin: 0, ...s }} aria-hidden />;
    }
    if (block.type === 'divider') {
      return (
        <div
          key={key}
          style={{
            margin: 0,
            ...s,
            backgroundColor: (s as React.CSSProperties).backgroundColor ?? (s as React.CSSProperties).color ?? 'rgba(0,0,0,0.15)',
          }}
          aria-hidden
        />
      );
    }
    return (
      <p key={key} style={{ margin: 0, ...s }}>
        {block.content ?? ''}
      </p>
    );
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: fontFamily ?? 'Inter',
        overflow: 'hidden',
        ...bgStyle,
        ...style,
      }}
    >
      {spec.blocks.map((block, i) => renderBlock(block, i, 'root'))}
    </div>
  );
}
