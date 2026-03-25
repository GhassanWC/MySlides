import * as htmlToImage from 'html-to-image';
import PptxGenJS from 'pptxgenjs';
import type { Presentation } from '../types/presentation';
import { sanitizeSlideHtml, sanitizeSlideCss } from './sanitizeHtml';

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100) || 'presentation';
}

/**
 * Downloads the presentation as a PowerPoint (.pptx) file.
 * Captures high-res images of the rendered HTML slides to preserve accurate design.
 */
export async function downloadPptx(
  presentation: Presentation,
  onProgress?: (msg: string) => void
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.title = presentation.title;
  pptx.author = 'MySlides';

  // Use a square PPTX layout 10x10 inches to match 1:1 internal design constraint without stretching
  pptx.defineLayout({ name: 'SQUARE', width: 10, height: 10 });
  pptx.layout = 'SQUARE';

  // Create an off-screen render container that stays within the viewport but is invisible to the user.
  // This prevents the browser from discarding layout computations for off-screen iframes.
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1000px',
    height: '1000px',
    zIndex: '-9999',
    opacity: '0.01',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);

  try {
    const slides = presentation.slides;
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (onProgress) onProgress(`Capturing slide ${i + 1} of ${slides.length}...`);

      const iframe = document.createElement('iframe');
      iframe.style.width = '1000px';
      iframe.style.height = '1000px';
      iframe.style.border = 'none';
      iframe.sandbox.add('allow-same-origin');

      container.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) continue;

      const safeHtml = sanitizeSlideHtml(slide.customHtml || '');
      const safeCss = sanitizeSlideCss(slide.customCss || '');

      doc.open();
      doc.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8">
            <base href="${window.location.origin}/">
            <style>
            body { 
                margin: 0; padding: 0; width: 1000px; height: 1000px; display: flex; 
                align-items: center; justify-content: center; box-sizing: border-box; 
                background: white; font-family: Inter, system-ui, sans-serif; 
            }
            * { box-sizing: inherit; }
            ${safeCss}
            </style>
            </head><body><div style="width:100%; height:100%; position:relative;">${safeHtml}</div></body></html>`
      );
      doc.close();

      // Ensure robust time for layout, fonts, and remote images to settle
      await new Promise(r => setTimeout(r, 1000));

      try {
        // high-quality scaled canvas capture natively from DOM
        const dataUrl = await htmlToImage.toPng(doc.body, {
          pixelRatio: 2,
          width: 1000,
          height: 1000,
          backgroundColor: '#ffffff',
          skipAutoScale: true,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          style: {
            transform: 'none',
            margin: '0',
            padding: '0'
          }
        });

        const pptSlide = pptx.addSlide();
        pptSlide.addImage({
          data: dataUrl,
          x: 0,
          y: 0,
          w: 10,
          h: 10,
        });
      } catch (captureErr) {
        console.error('Snapshot failed for slide', i, captureErr);
        // Graceful fallback representation if image capture severely fails
        const pptSlide = pptx.addSlide();
        pptSlide.addText(slide.title || 'Slide visual capture failed.', { x: 0.5, y: 0.5, w: 9, h: 2, fontSize: 24, align: 'center' });
      }

      container.removeChild(iframe);
    }

    if (onProgress) onProgress('Compiling PowerPoint file...');
    await pptx.writeFile({ fileName: `${sanitizeFilename(presentation.title)}.pptx` });

  } catch (error) {
    console.error('PPTX export error:', error);
    alert('Failed to generate export file. Check developer console.');
  } finally {
    document.body.removeChild(container);
    if (onProgress) onProgress(''); // Clear progress
  }
}
