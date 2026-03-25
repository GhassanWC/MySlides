import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generateSlides } from '../api/client';
import { type Presentation, type Slide } from '../types/presentation';
import {
  loadPresentations as loadPresentationsFirestore,
  savePresentation as savePresentationFirestore,
} from '../lib/firestoreStorage';

function newId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function slideId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function slidesFromApi(
  apiSlides: {
    title: string;
    content: string[];
    layout?: string;
    animation?: string;
    backgroundStyle?: string;
    bgGradient?: string;
    imageUrl?: string;
    imagePrompt?: string;
    templateOverrides?: Slide['templateOverrides'];
    designSpec?: Slide['designSpec'];
    customHtml?: string;
    customCss?: string;
  }[]
): Slide[] {
  const layoutSet = new Set(['title-only', 'title-content', 'two-column', 'text-cards', 'section-header', 'quote', 'image-left']);
  const animationSet = new Set(['none', 'fadeIn', 'titleThenBullets', 'slideFromRight', 'scaleIn']);
  const bgSet = new Set(['solid', 'gradient', 'image']);
  return apiSlides.map((s) => ({
    id: slideId(),
    title: s.title,
    content: Array.isArray(s.content) ? s.content : [],
    layout: s.layout && layoutSet.has(s.layout) ? (s.layout as Slide['layout']) : 'title-content',
    animation: s.animation && animationSet.has(s.animation) ? (s.animation as Slide['animation']) : 'none',
    backgroundStyle: s.backgroundStyle && bgSet.has(s.backgroundStyle) ? (s.backgroundStyle as Slide['backgroundStyle']) : 'solid',
    bgGradient: typeof s.bgGradient === 'string' ? s.bgGradient : undefined,
    imageUrl: typeof s.imageUrl === 'string' ? s.imageUrl : undefined,
    imagePrompt: typeof s.imagePrompt === 'string' ? s.imagePrompt : undefined,
    templateOverrides: s.templateOverrides,
    designSpec: s.designSpec,
    customHtml: typeof s.customHtml === 'string' ? s.customHtml : undefined,
    customCss: typeof s.customCss === 'string' ? s.customCss : undefined,
  }));
}

function themeToCustomColors(theme: { primaryColor?: string; secondaryColor?: string; backgroundStyle?: string } | undefined): { bg: string; text: string; accent: string } | undefined {
  if (!theme?.primaryColor || !theme?.secondaryColor) return undefined;
  const isDark = theme.backgroundStyle === 'dark-gradient';
  return {
    bg: isDark ? '#0f172a' : '#f8fafc',
    text: theme.secondaryColor,
    accent: theme.primaryColor,
  };
}

function themeToFont(theme: { fontTitle?: string; fontBody?: string } | undefined): string {
  const font = theme?.fontBody ?? theme?.fontTitle;
  if (font === 'Georgia' || font === 'system-ui') return font;
  return 'Inter';
}

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedList, setSavedList] = useState<Presentation[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setListLoading(true);
    loadPresentationsFirestore(userId)
      .then(setSavedList)
      .catch(() => setSavedList([]))
      .finally(() => setListLoading(false));
  }, [userId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = prompt.trim();
      if (!text || loading) return;
      setError(null);
      setLoading(true);
      try {
        const res = await generateSlides({ prompt: text, title: title.trim() || undefined, modelName });
        const slides = slidesFromApi(res.slides);
        const id = newId();
        const customColors = themeToCustomColors(res.theme);
        const fontFamily = themeToFont(res.theme);
        const presentation: Presentation = {
          id,
          title: title.trim() || (slides[0]?.title ?? 'Untitled Presentation'),
          slides,
          themeId: customColors ? 'default' : 'pro',
          fontFamily,
          customColors,
          slideDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          slideTag: 'presentation',
          generatedByModel: res.generatedByModel || modelName,
          updatedAt: Date.now(),
        };
        await savePresentationFirestore(presentation, userId);
        navigate(`/view/${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate slides.';
        const status = (err as Error & { status?: number }).status;
        const retryAfter = (err as Error & { retryAfter?: number }).retryAfter;
        if (status === 429) {
          setError(retryAfter ? `Rate limit exceeded. Try again in ${retryAfter}s.` : 'Too many requests. Please try again later.');
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [prompt, title, modelName, loading, userId, navigate]
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F8F9FF] to-[#FFFFFF] font-sans">
      {/* Workspace: single central prompt */}
      <section className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-3xl bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-50/50 p-8 sm:p-10 mx-auto transition-all">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-3 tracking-tight">
              Create beautiful AI-generated slides in seconds
            </h1>
            <p className="text-[#6B7280] text-sm sm:text-base max-w-lg mx-auto">
              Describe your topic, audience, and style. Our AI will generate a premium presentation instantly.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative bg-[#F8F9FF]/50 rounded-[16px] border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#6C63FF] focus-within:border-[#6C63FF] transition-shadow duration-200">
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Q4 Product Launch: 6 slides for executives. Dark tech theme, title slide with hero image, section dividers, key metrics..."
                rows={4}
                className="w-full min-h-[140px] px-5 py-4 resize-y border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-gray-400 text-[#1A1A1A] disabled:opacity-50 text-base"
                disabled={loading}
                aria-label="Describe your presentation"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white/50 border-t border-gray-100 backdrop-blur-sm">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional: Title"
                  className="flex-1 min-w-[120px] text-sm px-4 py-2 rounded-[12px] border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C63FF] focus:border-[#6C63FF] outline-none placeholder:text-gray-400 disabled:opacity-50 transition-shadow"
                  disabled={loading}
                  aria-label="Presentation title"
                />

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      disabled={loading}
                      style={{ appearance: 'none' }}
                      className="text-sm pl-9 pr-8 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-[#6C63FF] focus:border-[#6C63FF] disabled:opacity-50 shadow-sm cursor-pointer transition-colors outline-none font-medium text-gray-700"
                    >
                      <option value="gpt-4o-mini">OpenAI (GPT-4o Mini)</option>
                      <option value="gpt-4o">OpenAI (GPT-4o)</option>
                      <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_0_rgba(108,99,255,0.39)] hover:shadow-[0_6px_20px_rgba(108,99,255,0.23)] hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #6C63FF, #7B8CFF)' }}
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                        Generating
                      </>
                    ) : (
                      <>
                        Generate <span className="hidden sm:inline">slides</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-[12px] bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* My presentations */}
      <section className="max-w-7xl w-full mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">My Presentations</h2>
        </div>

        {listLoading ? (
          <div className="flex items-center gap-3 text-[#6B7280] py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-[#6C63FF]" />
            Loading your decks...
          </div>
        ) : savedList.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-[20px] border border-dashed border-gray-200">
            <p className="text-[#6B7280] text-sm">
              You haven't generated any presentations yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/view/${p.id}`)}
                className="text-left bg-white rounded-[16px] shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 group flex flex-col justify-between h-36"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-[#1A1A1A] text-lg leading-tight line-clamp-2 group-hover:text-[#6C63FF] transition-colors">
                      {p.title || 'Untitled'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                      {p.slides.length} slide{p.slides.length !== 1 ? 's' : ''}
                    </span>
                    {p.generatedByModel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                        {p.generatedByModel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B7280] mt-4 pt-4 border-t border-gray-50 group-hover:border-indigo-50/50">
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[#6C63FF] font-medium">
                    View
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
