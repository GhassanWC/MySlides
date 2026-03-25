import { jsPDF } from 'jspdf';
import type { Presentation } from '../types/presentation';
import { THEMES, toContentBlocks } from '../types/presentation';

export function downloadPdf(presentation: Presentation): void {
  const theme = THEMES.find((t) => t.id === presentation.themeId) ?? THEMES[0];
  const bg = presentation.customColors?.bg ?? theme.bg;
  const text = presentation.customColors?.text ?? theme.text;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  presentation.slides.forEach((slide, index) => {
    if (index > 0) doc.addPage([pageWidth, pageHeight], 'landscape');
    const [br, bg_, bb] = hexToRgb(bg);
    doc.setFillColor(br, bg_, bb);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    const [tr, tg, tb] = hexToRgb(text);
    doc.setTextColor(tr, tg, tb);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(slide.title || 'Untitled', contentWidth);
    doc.text(titleLines, margin, margin + 24);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    let y = margin + 60;
    const blocks = toContentBlocks(slide.content);
    for (const block of blocks) {
      const lines = doc.splitTextToSize(block.text, contentWidth);
      for (const l of lines) {
        if (y > pageHeight - margin) break;
        doc.text(l, margin, y);
        y += 18;
      }
      y += 4;
    }
  });

  doc.save(`${sanitizeFilename(presentation.title)}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100) || 'presentation';
}
