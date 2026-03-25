import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type Presentation } from '../types/presentation';
import { HtmlSlideView } from '../components/HtmlSlideView';
import { editSlides } from '../api/client';
import { getPresentation as getPresentationFirestore, savePresentation as savePresentationFirestore } from '../lib/firestoreStorage';
import { downloadPdf } from '../lib/exportPdf';
import { downloadPptx } from '../lib/exportPptx';
import { AssetLibraryPanel } from '../components/AssetLibraryPanel';
import { SlideElementRenderer } from '../components/SlideElementRenderer';
import { Asset, SlideElement } from '../types/asset';
import { fetchAssets } from '../lib/assetService';

export function Viewer() {
    const { id } = useParams<{ id: string }>();
    const { user, logout } = useAuth();
    const userId = user?.id ?? '';
    const navigate = useNavigate();
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);

    // Chat AI State
    const [chatInput, setChatInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
    const [undoStack, setUndoStack] = useState<Presentation[]>([]);
    const [targetMode, setTargetMode] = useState<'slide' | 'deck'>('slide');

    // Right Panel State
    const [activeRightPanel, setActiveRightPanel] = useState<'chat' | 'assets'>('chat');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    // Resize State
    const [chatWidth, setChatWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 280 && newWidth <= 800) {
                setChatWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.body.style.userSelect = '';
        }

        return () => {
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        if (!id || !userId) return;
        setLoading(true);
        getPresentationFirestore(id, userId)
            .then((p) => {
                if (p) {
                    setPresentation(p);
                    if (p.chatHistory) setChatHistory(p.chatHistory);
                }
                else navigate('/', { replace: true });
            })
            .catch(() => navigate('/', { replace: true }))
            .finally(() => setLoading(false));
    }, [id, userId, navigate]);

    if (loading || !presentation) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    const slides = presentation.slides;
    const slide = slides[current];

    const handleSendEdit = async (customRequest?: string) => {
        const text = (customRequest || chatInput).trim();
        if (!text || isEditing || !presentation) return;

        setIsEditing(true);
        setChatInput('');
        
        const newUserMsg = { id: Date.now().toString(), role: 'user' as const, content: text };
        const updatedChatHistory = [...chatHistory, newUserMsg];
        setChatHistory(updatedChatHistory);

        try {
            const availableAssets = await fetchAssets(userId);
            const targetSlideId = targetMode === 'slide' ? slide?.id : undefined;
            const res = await editSlides({
                request: text,
                currentSlides: presentation.slides.map(s => ({ id: s.id, html: s.customHtml, css: s.customCss, elements: s.elements })),
                selectedSlideId: targetSlideId,
                availableAssets,
                modelName: presentation.generatedByModel // keep using original model or fallback
            });

            const newPresentation = { ...presentation };
            let newSlides = [...newPresentation.slides];

            res.changes.forEach((change: any) => {
                if (change.type === 'delete') {
                    newSlides = newSlides.filter(s => s.id !== change.slideId);
                } else if (change.type === 'update') {
                    const idx = newSlides.findIndex(s => s.id === change.slideId);
                    if (idx !== -1) {
                        newSlides[idx] = { 
                            ...newSlides[idx], 
                            customHtml: change.html || newSlides[idx].customHtml, 
                            customCss: change.css || newSlides[idx].customCss,
                            ...(change.elements !== undefined ? { elements: change.elements } : {})
                        };
                    }
                } else if (change.type === 'insert_after') {
                    const idx = newSlides.findIndex(s => s.id === change.afterSlideId);
                    const insert = {
                        id: change.newSlide.id,
                        title: change.newSlide.title || 'New Slide',
                        content: [], layout: 'title-content' as const,
                        customHtml: change.newSlide.html, customCss: change.newSlide.css,
                        elements: change.newSlide.elements
                    };
                    if (idx !== -1) {
                        newSlides.splice(idx + 1, 0, insert);
                    } else {
                        newSlides.push(insert);
                    }
                } else if (change.type === 'insert_before') {
                    const idx = newSlides.findIndex(s => s.id === change.beforeSlideId);
                    const insert = {
                        id: change.newSlide.id,
                        title: change.newSlide.title || 'New Slide',
                        content: [], layout: 'title-content' as const,
                        customHtml: change.newSlide.html, customCss: change.newSlide.css,
                        elements: change.newSlide.elements
                    };
                    if (idx !== -1) {
                        newSlides.splice(idx, 0, insert);
                    } else {
                        newSlides.unshift(insert);
                    }
                }
            });

            newPresentation.slides = newSlides;
            newPresentation.updatedAt = Date.now();

            // Save to undo stack and update state
            setUndoStack(prev => [...prev.slice(-4), presentation]); // Keep last 5 states
            setPresentation(newPresentation);

            // Adjust current index if out of bounds
            if (current >= newSlides.length) {
                setCurrent(Math.max(0, newSlides.length - 1));
            }

            const newAsstMsg = { id: Date.now().toString(), role: 'assistant' as const, content: res.summary || 'Updated your slides successfully.' };
            const finalChat = [...updatedChatHistory, newAsstMsg];
            
            newPresentation.chatHistory = finalChat;
            setChatHistory(finalChat);

            // Background save to firestore
            savePresentationFirestore(newPresentation, userId).catch(console.error);

        } catch (error) {
            console.error(error);
            const errAsstMsg = { id: Date.now().toString(), role: 'assistant' as const, content: "Sorry, I couldn't process your request right now. Please try again." };
            const finalChat = [...updatedChatHistory, errAsstMsg];
            
            const p = { ...presentation, chatHistory: finalChat };
            setPresentation(p);
            setChatHistory(finalChat);
            savePresentationFirestore(p, userId).catch(console.error);
        } finally {
            setIsEditing(false);
        }
    };

    const updateSlideElements = (slideId: string, elements: SlideElement[]) => {
        if (!presentation) return;
        const newSlides = [...presentation.slides];
        const idx = newSlides.findIndex(s => s.id === slideId);
        if (idx !== -1) {
            newSlides[idx] = { ...newSlides[idx], elements };
            const newPresentation = { ...presentation, slides: newSlides, updatedAt: Date.now() };
            setPresentation(newPresentation);
            savePresentationFirestore(newPresentation, userId).catch(console.error);
        }
    };

    const handleInsertAsset = (asset: Asset) => {
        if (!slide) return;
        const newElement: SlideElement = {
            id: Date.now().toString(),
            assetId: asset.id,
            type: asset.type,
            url: asset.fileUrl,
            x: 35,
            y: 35,
            width: 30,
            height: 30,
        };
        const existing = slide.elements || [];
        updateSlideElements(slide.id, [...existing, newElement]);
        setSelectedElementId(newElement.id);
    };

    const handleUpdateElement = (elId: string, updates: Partial<SlideElement>) => {
        if (!slide) return;
        const existing = slide.elements || [];
        const updated = existing.map(el => el.id === elId ? { ...el, ...updates } : el);
        updateSlideElements(slide.id, updated);
    };

    const handleDeleteElement = (elId: string) => {
        if (!slide) return;
        const existing = slide.elements || [];
        const updated = existing.filter(el => el.id !== elId);
        updateSlideElements(slide.id, updated);
        if (selectedElementId === elId) setSelectedElementId(null);
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const previousState = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        
        const undoMsg = { id: Date.now().toString(), role: 'assistant' as const, content: "Undid the last change." };
        const newHistory = [...chatHistory, undoMsg];
        
        const newPresentation = { ...previousState, chatHistory: newHistory };
        setPresentation(newPresentation);
        setChatHistory(newHistory);
        savePresentationFirestore(newPresentation, userId).catch(console.error);
    };

    const handleDownloadPptx = async () => {
        if (!presentation || isExporting) return;
        setIsExporting(true);
        setExportProgress('Starting export...');
        try {
            await downloadPptx(presentation, (msg) => setExportProgress(msg));
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#F8F9FF] font-sans overflow-hidden">
            {/* Top Toolbar */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2 relative group cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#7B8CFF] flex items-center justify-center text-white font-bold shadow-sm">
                            M
                        </div>
                        <Link to="/" className="font-bold text-lg text-[#1A1A1A] hover:text-[#6C63FF] transition-colors shrink-0 tracking-tight">
                            MySlides
                        </Link>
                    </div>
                    <div className="w-px h-5 bg-gray-200 mx-2" />
                    <span className="text-[#1A1A1A] font-medium truncate max-w-sm">{presentation.title || 'Untitled'}</span>
                    {presentation.generatedByModel && (
                        <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-1 shrink-0 border border-gray-200">
                            {presentation.generatedByModel}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleDownloadPptx}
                        disabled={isExporting}
                        className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-[12px] text-sm text-[#1A1A1A] font-medium transition-colors shadow-sm flex items-center gap-2 relative overflow-hidden disabled:opacity-80"
                    >
                        {isExporting ? (
                            <>
                                <div className="absolute inset-0 bg-indigo-50/50" />
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 relative z-10" />
                                <span className="relative z-10 text-indigo-700">{exportProgress || 'Exporting...'}</span>
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                PowerPoint
                            </>
                        )}
                    </button>
                    <button type="button" onClick={() => downloadPdf(presentation)} className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-[12px] text-sm text-[#1A1A1A] font-medium transition-colors shadow-sm flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        PDF
                    </button>
                    <div className="w-px h-5 bg-gray-200 mx-2" />
                    <button
                        type="button"
                        onClick={() => navigate(`/present/${presentation.id}`)}
                        className="px-5 py-2 text-white rounded-[12px] text-sm font-semibold shadow-[0_4px_14px_0_rgba(108,99,255,0.39)] hover:shadow-[0_6px_20px_rgba(108,99,255,0.23)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #6C63FF, #7B8CFF)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        Present
                    </button>
                    <div className="ml-2 relative group cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-[#6B7280] font-medium text-sm hover:bg-gray-200 transition-colors">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[12px] shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm text-[#1A1A1A] truncate">{user?.email}</p>
                            </div>
                            <button onClick={() => logout()} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 text-sm font-medium transition-colors">
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main area */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Left panel (Thumbnails) */}
                <div className="w-64 bg-white/50 backdrop-blur-sm border-r border-gray-200 overflow-y-auto shrink-0 p-4 space-y-4 shadow-[inset_-10px_0_20px_-10px_rgba(0,0,0,0.02)]">
                    {slides.map((s, i) => {
                        const isActive = i === current;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setCurrent(i)}
                                className={`w-full group text-left rounded-[16px] overflow-hidden border-2 transition-all duration-200 focus:outline-none 
                                ${isActive ? 'border-[#6C63FF] shadow-md bg-indigo-50/30 ring-4 ring-indigo-500/10' : 'border-transparent bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5'}`}
                            >
                                <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50/50">
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-[#6C63FF]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                        Slide {i + 1}
                                    </span>
                                </div>
                                <div className="aspect-square w-full relative bg-white overflow-hidden">
                                    <div style={{ width: '800px', height: '800px', transform: 'scale(0.25)', transformOrigin: 'top left', pointerEvents: 'none' }}>
                                        {s.customHtml ? (
                                            <div className="w-full h-full relative">
                                                <HtmlSlideView html={s.customHtml} css={s.customCss ?? ''} style={{ width: '100%', height: '100%' }} />
                                                {s.elements && s.elements.length > 0 && (
                                                    <SlideElementRenderer
                                                        elements={s.elements}
                                                        onUpdateElement={() => {}}
                                                        onDeleteElement={() => {}}
                                                        selectedId={null}
                                                        onSelectElement={() => {}}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xl font-bold">Empty</div>
                                        )}
                                    </div>
                                    <div className={`absolute inset-0 ring-1 ring-inset ring-black/5 pointer-events-none transition-colors ${isActive ? 'bg-indigo-500/5' : 'group-hover:bg-black/2'}`} />
                                </div>
                            </button>
                        );
                    })}
                    {slides.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-400">No slides</p>
                        </div>
                    )}
                </div>

                {/* Center Canvas */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-transparent overflow-hidden">
                    {slide ? (
                        <div key={`canvas-${current}-${slide.id}`} className="w-full h-full flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                            <div
                                className="w-full relative bg-white overflow-hidden rounded-[8px] transition-all"
                                style={{
                                    maxWidth: '85vh',
                                    maxHeight: '85vh',
                                    aspectRatio: '1/1',
                                    boxShadow: '0 40px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
                                }}
                                onClick={() => setSelectedElementId(null)}
                            >
                                {slide.customHtml ? (
                                    <>
                                        <HtmlSlideView html={slide.customHtml} css={slide.customCss ?? ''} style={{ width: '100%', height: '100%', display: 'block' }} />
                                        {slide.elements && (
                                            <SlideElementRenderer
                                                elements={slide.elements}
                                                onUpdateElement={handleUpdateElement}
                                                onDeleteElement={handleDeleteElement}
                                                selectedId={selectedElementId}
                                                onSelectElement={setSelectedElementId}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 font-bold">No Content</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center gap-3">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                            <span>Nothing to display</span>
                        </div>
                    )}
                </div>

                {/* Right Edge Chat Editor Panel */}
                <div
                    style={{ width: chatWidth }}
                    className={`bg-white border-l border-gray-200 shrink-0 flex flex-col shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.04)] z-10 relative ${isResizing ? '' : 'transition-all duration-300'}`}
                >
                    {/* Drag Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#6C63FF] z-50 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                    />

                    <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 shrink-0 bg-gray-50/50">
                        <div className="flex bg-gray-200/50 p-1 rounded-[10px]">
                            <button 
                                onClick={() => setActiveRightPanel('chat')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${activeRightPanel === 'chat' ? 'bg-white shadow-sm text-[#6C63FF]' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                AI Editor
                            </button>
                            <button 
                                onClick={() => setActiveRightPanel('assets')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${activeRightPanel === 'assets' ? 'bg-white shadow-sm text-[#6C63FF]' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                Assets
                            </button>
                        </div>
                        {undoStack.length > 0 && activeRightPanel === 'chat' && (
                            <button onClick={handleUndo} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Undo recent edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                            </button>
                        )}
                    </div>

                    {activeRightPanel === 'assets' ? (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <AssetLibraryPanel onInsertAsset={handleInsertAsset} />
                        </div>
                    ) : (
                    <>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-sm bg-white">
                        {chatHistory.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8 space-y-4 px-2">
                                <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                                <p className="font-semibold text-gray-800 text-base">How can I help?</p>
                                <p className="text-xs text-gray-500 leading-relaxed">Ask the AI to redesign the layout, rewrite text, add visual sections, or restyle themes entirely.</p>
                            </div>
                        ) : (
                            chatHistory.map(msg => (
                                <div key={msg.id} className={`flex gap-3 max-w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-gray-100 border-gray-200' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}>
                                        {msg.role === 'user' ? (
                                            <span className="text-xs font-semibold text-gray-600">{user?.email?.[0].toUpperCase() || 'U'}</span>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                        )}
                                    </div>
                                    <div className={`flex flex-col mt-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                        <div className={`text-[13px] ${msg.role === 'user' ? 'px-4 py-2.5 bg-gray-100 text-gray-900 rounded-2xl rounded-tr-none' : 'text-gray-800 leading-relaxed'}`}>
                                            {msg.content}
                                        </div>
                                        {msg.role === 'assistant' && (
                                            <div className="flex items-center gap-1.5 mt-2 px-1">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                                                <span className="text-[11px] font-medium text-gray-400">Applied changes</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isEditing && (
                            <div className="flex gap-3 max-w-full">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-indigo-50 border-indigo-100 shadow-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 animate-pulse"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="py-2.5 text-sm text-gray-500 font-medium flex items-center gap-1.5 opacity-70">
                                        Generating
                                        <div className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" />
                                        <div className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                                        <div className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-white space-y-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 border-t border-gray-100">
                        {/* Target Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setTargetMode('slide')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${targetMode === 'slide' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                This Slide
                            </button>
                            <button onClick={() => setTargetMode('deck')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${targetMode === 'deck' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                Entire Deck
                            </button>
                        </div>

                        {/* Quick actions row */}
                        <div className="flex flex-wrap gap-2 w-full pb-1">
                            {['Make modern', 'Shorten text', 'Add visuals', 'Change theme'].map(act => (
                                <button key={act} onClick={() => handleSendEdit(act)} disabled={isEditing} className="text-[11px] font-medium bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-50 flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis shadow-sm">
                                    {act}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleSendEdit(); }} className="relative mt-2">
                            <div className="relative bg-[#F4F4F5] rounded-[16px] border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-colors duration-200 flex items-center overflow-hidden">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    disabled={isEditing}
                                    placeholder="Message AI Editor..."
                                    className="w-full bg-transparent border-0 text-[13px] py-3 pl-4 pr-12 focus:ring-0 focus:outline-none placeholder:text-gray-500 text-[#1A1A1A] disabled:opacity-50"
                                    aria-label="Edit your slides"
                                />
                                <button
                                    type="submit"
                                    disabled={isEditing || !chatInput.trim()}
                                    className="absolute right-2 p-1.5 text-white bg-black rounded-[10px] hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-100 transition shadow-sm"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </form>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
