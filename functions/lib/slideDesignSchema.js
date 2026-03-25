"use strict";
/**
 * MySlides Slide Design Schema (DSL)
 * Machine-readable schema that AI generates. Frontend renders it.
 * AI generates structure; the system guarantees beauty.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYOUT_TYPES = exports.TOPIC_CATEGORIES = exports.VISUAL_TONES = exports.SLIDE_TYPES = exports.BG_STYLES = exports.ANIMATIONS = exports.LAYOUTS = void 0;
exports.LAYOUTS = [
    'title-only',
    'title-content',
    'two-column',
    'text-cards',
    'section-header',
    'quote',
    'image-left',
];
exports.ANIMATIONS = ['none', 'fadeIn', 'titleThenBullets', 'slideFromRight', 'scaleIn'];
exports.BG_STYLES = ['solid', 'gradient', 'image'];
exports.SLIDE_TYPES = ['title', 'section', 'content', 'closing'];
exports.VISUAL_TONES = ['dark-tech', 'corporate-light', 'modern-minimal', 'executive'];
exports.TOPIC_CATEGORIES = ['tech', 'business', 'education', 'marketing', 'finance', 'general'];
/** Layout types for variety enforcement */
exports.LAYOUT_TYPES = [
    'title',
    'agenda',
    'section-divider',
    'split-layout',
    'image-led',
    'stats',
    'timeline-comparison',
    'closing',
];
