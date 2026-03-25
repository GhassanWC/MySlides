import { useRef, useEffect } from 'react';
import { SlideElement } from '../types/asset';

interface SlideElementRendererProps {
  elements: SlideElement[];
  onUpdateElement: (id: string, updates: Partial<SlideElement>) => void;
  onDeleteElement: (id: string) => void;
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
}

export function SlideElementRenderer({
  elements,
  onUpdateElement,
  onDeleteElement,
  selectedId,
  onSelectElement
}: SlideElementRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const dragState = useRef<{
    id: string;
    mode: 'drag' | 'resize';
    handle?: string;
    startX: number;
    startY: number;
    startElX: number;
    startElY: number;
    startElW: number;
    startElH: number;
  } | null>(null);

  const startDrag = (e: React.PointerEvent, id: string, mode: 'drag' | 'resize', handle?: string) => {
    e.stopPropagation();
    onSelectElement(id);
    
    const el = elements.find(e => e.id === id);
    if (!el) return;

    dragState.current = {
      id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startElW: el.width,
      startElH: el.height
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || !containerRef.current) return;
    
    const state = dragState.current;
    // Prevent default selection during drag
    e.preventDefault();

    const bounds = containerRef.current.getBoundingClientRect();
    
    const dx = ((e.clientX - state.startX) / bounds.width) * 100;
    const dy = ((e.clientY - state.startY) / bounds.height) * 100;

    if (state.mode === 'drag') {
      onUpdateElement(state.id, {
        x: state.startElX + dx,
        y: state.startElY + dy
      });
    } else if (state.mode === 'resize' && state.handle) {
      let newW = state.startElW;
      let newH = state.startElH;
      let newX = state.startElX;
      let newY = state.startElY;

      if (state.handle.includes('e')) newW += dx;
      if (state.handle.includes('s')) newH += dy;
      if (state.handle.includes('w')) {
        newW -= dx;
        newX += dx;
      }
      if (state.handle.includes('n')) {
        newH -= dy;
        newY += dy;
      }
      
      onUpdateElement(state.id, {
        x: newX, y: newY,
        width: Math.max(2, newW),
        height: Math.max(2, newH)
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragState.current = null;
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // prevent delete when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (selectedId && (e.key === 'Backspace' || e.key === 'Delete')) {
        onDeleteElement(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, onDeleteElement]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-20 pointer-events-none"
    >
      {elements.map(el => (
        <div
          key={el.id}
          className={`absolute pointer-events-auto group ${selectedId === el.id ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white' : 'hover:ring-1 hover:ring-indigo-300'}`}
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.width}%`,
            height: `${el.height}%`,
            zIndex: (el.zIndex || 10) + (selectedId === el.id ? 10 : 0),
            cursor: dragState.current?.id === el.id && dragState.current.mode === 'drag' ? 'grabbing' : 'grab'
          }}
          onPointerDown={(e) => startDrag(e, el.id, 'drag')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img 
            src={el.url} 
            alt={el.type} 
            className="w-full h-full object-contain pointer-events-none drop-shadow-sm transition-transform" 
            draggable={false}
          />
          
          {selectedId === el.id && (
            <>
              <div 
                className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full -top-1.5 -left-1.5 cursor-nwse-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => startDrag(e, el.id, 'resize', 'nw')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <div 
                className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full -top-1.5 -right-1.5 cursor-nesw-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => startDrag(e, el.id, 'resize', 'ne')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <div 
                className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => startDrag(e, el.id, 'resize', 'sw')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <div 
                className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => startDrag(e, el.id, 'resize', 'se')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
