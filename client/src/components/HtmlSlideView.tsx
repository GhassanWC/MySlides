import { useRef, useEffect } from 'react';
import { sanitizeSlideHtml, sanitizeSlideCss } from '../lib/sanitizeHtml';

interface HtmlSlideViewProps {
  html: string;
  css: string;
  className?: string;
  style?: React.CSSProperties;
  animate?: boolean;
}

/**
 * (A) Renders a slide from AI-generated HTML and CSS in a sandboxed iframe.
 */
export function HtmlSlideView({ html, css, className, style, animate = false }: HtmlSlideViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;
    const safeHtml = sanitizeSlideHtml(html);
    const safeCss = sanitizeSlideCss(css);

    const animationScript = animate ? `
      <script>
        // Centralized animation orchestrator
        window.addEventListener('DOMContentLoaded', () => {
          const elements = document.querySelectorAll('[data-animate]');
          let autoStagger = 0;
          
          // Apply initial states
          elements.forEach(el => {
            el.style.opacity = '0';
            const anim = el.getAttribute('data-animate');
            if (anim === 'slide-right') {
                el.style.transform = 'translateX(-40px)';
            } else if (anim === 'scale-in') {
                el.style.transform = 'scale(0.8)';
            } else {
                // fade-up and default
                el.style.transform = 'translateY(40px)';
            }
          });

          // Trigger animations
          setTimeout(() => {
            elements.forEach((el) => {
              let delay = parseInt(el.getAttribute('data-delay') || '', 10);
              if (isNaN(delay)) {
                  delay = autoStagger * 120;
                  autoStagger++;
              }
              
              setTimeout(() => {
                 el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                 el.style.opacity = '1';
                 el.style.transform = 'translate(0, 0) scale(1)';
              }, delay);
            });
          }, 50); // Small initial delay to ensure render
        });
      </script>
    ` : '';

    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8">
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style>body{margin:0;padding:0;height:100vh;width:100vw;display:block;box-sizing:border-box;}*{box-sizing:inherit;}${safeCss}</style></head><body>${safeHtml}${animationScript}</body></html>`
    );
    doc.close();
  }, [html, css, animate]);

  return (
    <iframe
      ref={iframeRef}
      title="AI-generated slide"
      sandbox="allow-same-origin allow-scripts"
      className={className}
      style={{ border: 'none', width: '100%', height: '100%', display: 'block', ...style }}
    />
  );
}
