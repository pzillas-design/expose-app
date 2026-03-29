import React, { useEffect, Suspense, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { RotateCw, Download, Info, Trash2, Loader2, Upload, ImageIcon } from 'lucide-react';
import { RoundIconButton, Theme, Typo } from '@/components/ui/DesignSystem';
import { useNanoController } from '@/hooks/useNanoController';
import { useGeminiLiveVoice, playVoiceSound } from '@/hooks/useGeminiLiveVoice';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AuthModal } from '@/components/modals/AuthModal';
import { CreationModal } from '@/components/modals/CreationModal';
import { VoiceUploadModal } from '@/components/modals/VoiceUploadModal';
import { CreditsModal } from '@/components/modals/CreditsModal';
import { FeedPage } from '@/components/pages/FeedPage';
import { DetailPage } from '@/components/pages/DetailPage';
import { CreatePage } from '@/components/pages/CreatePage';

// (rest of imports omitted for brevity in targetContent but I will replace the whole block)

// Lazy loaded pages
const HomePage = React.lazy(() => import('@/components/pages/HomePage').then(m => ({ default: m.HomePage })));
const ImpressumPage = React.lazy(() => import('@/components/pages/ImpressumPage').then(m => ({ default: m.ImpressumPage })));
const SettingsModal = React.lazy(() => import('@/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SharedTemplatePage = React.lazy(() => import('@/components/pages/SharedTemplatePage').then(m => ({ default: m.SharedTemplatePage })));
const HeroPlayground = React.lazy(() => import('@/components/pages/HeroPlayground').then(m => ({ default: m.HeroPlayground })));
const AdminDashboard = React.lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ImageInfoModal = React.lazy(() => import('@/components/canvas/ImageInfoModal').then(m => ({ default: m.ImageInfoModal })));
import { AdminRoute } from '@/components/admin/AdminRoute';
import { useItemDialog } from '@/components/ui/Dialog';

class ModalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error) { console.error('[SettingsModal] render error:', error); }
    render() { return this.state.hasError ? null : this.props.children; }
}

const ProtectedRoute = ({ user, isAuthLoading, children, onAuthRequired }: { user: any, isAuthLoading: boolean, children: React.ReactNode, onAuthRequired: () => void }) => {
    const location = useLocation();
    useEffect(() => {
        if (!isAuthLoading && !user) {
            onAuthRequired();
        }
    }, [user, isAuthLoading, onAuthRequired]);

    if (isAuthLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-800" /></div>;
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};

export function App() {
    const { state, actions, langSetting, t } = useNanoController();
    const { confirm } = useItemDialog();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        user, isAuthLoading, isAuthModalOpen, authError, authEmail, authModalMode,
        allImages, isCanvasLoading, credits, userProfile
    } = state;

    const {
        setAuthModalMode, setIsAuthModalOpen, setAuthError, setAuthEmail,
        handleSignOut, handleCreateNew, handleDeleteImage, handleDownload, ensureValidSession,
        setQualityMode, setThemeMode, setLang, handleDeleteAccount, updateProfile
    } = actions;

    // Track whether last image selection was from a user action (arrows/thumbs) vs programmatic (generation)
    const isUserNavigationRef = React.useRef(false);

    const [isCreationModalOpen, setIsCreationModalOpen] = React.useState(false);
    const [isDetailExiting, setIsDetailExiting] = React.useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = React.useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
    const [infoImageId, setInfoImageId] = React.useState<string | null>(null);
    const [detailSidebarWidth, setDetailSidebarWidth] = React.useState(380);
    const [detailSideSheetVisible, setDetailSideSheetVisible] = React.useState(true);
    const [feedSideSheetVisible, setFeedSideSheetVisible] = React.useState(false);
    const [expandedGroupId, setExpandedGroupId] = React.useState<string | null>(null);
    const [voiceFocusIndex, setVoiceFocusIndex] = React.useState<number | null>(null);
    const [isVoiceUploadOpen, setIsVoiceUploadOpen] = React.useState(false);
    const [feedHeroProgress, setFeedHeroProgress] = React.useState(0);
    // createMode removed — Create page now always shows aspect ratio picker directly
    const voiceFeatureEnabled = true; // Enabled by default on this prototype branch

    const clickVoiceAction = React.useCallback(async (selector: string) => {
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const element = document.querySelector<HTMLElement>(selector);
            if (element) {
                element.click();
                return true;
            }
            await new Promise(resolve => window.setTimeout(resolve, 90));
        }
        return false;
    }, []);

    // Initial auth check / redirect logic
    useEffect(() => {
        if (!isAuthLoading && user && location.pathname === '/') {
            // Keep on home for now, or redirect to feed? 
            // The user said: "bild feed is jetz die startseite für angemeldete user"
            // So if logged in and on /, show feed.
        }
    }, [user, isAuthLoading, location.pathname]);

    // Single source of truth for route sync.
    // We use a ref to avoid the feedback loop: navigate → URL change → handleSelection → activeId change → navigate...
    const isNavigatingProgrammatically = React.useRef(false);
    const pathnameRef = React.useRef(location.pathname);
    // True once activeId has been set at least once — guards against premature redirect on page refresh
    // (on mount activeId=null before images load; we must not redirect to '/' in that window)
    const activeIdEverSetRef = React.useRef(false);
    React.useEffect(() => {
        if (state.activeId) activeIdEverSetRef.current = true;
    }, [state.activeId]);

    useEffect(() => {
        pathnameRef.current = location.pathname;
        // Route sync — no createMode to manage anymore
    }, [location.pathname, location.search]);

    // Logic to sync URL with App State (activeId and expandedGroupId)
    useEffect(() => {
        // Sync Stack expansion from URL
        if (location.pathname.startsWith('/stack/')) {
            const stackId = location.pathname.split('/').pop();
            if (stackId && stackId !== expandedGroupId) {
                setExpandedGroupId(stackId);
            }
        } else if (location.pathname === '/') {
            if (expandedGroupId) setExpandedGroupId(null);
        }

        // Sync Detail view from URL
        if (!location.pathname.startsWith('/image/')) {
            if (state.activeId && !isNavigatingProgrammatically.current) {
                actions.handleSelection(null, false, false);
            }
            return;
        }
        const urlId = location.pathname.split('/').pop();
        if (urlId && urlId !== state.activeId && !isNavigatingProgrammatically.current) {
            handleSelectImage(urlId);
        }
        isNavigatingProgrammatically.current = false;
        
        // Reset voice highlight on navigation
        setVoiceFocusIndex(null);
    }, [location.pathname, state.activeId, actions, expandedGroupId]);


    // Close SideSheet when navigating to a generating image via generation (not user arrow/thumb clicks)
    useEffect(() => {
        if (!state.activeId) return;
        const targetImg = allImages.find(i => i.id === state.activeId);
        if (targetImg?.isGenerating && !isUserNavigationRef.current) {
            setDetailSideSheetVisible(false);
        }
        isUserNavigationRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.activeId]);

    const handleSelectImage = (id: string) => {
        isUserNavigationRef.current = true; // Mark as user-initiated (preserve SideSheet state)
        actions.handleSelection(id, false, false);
        isNavigatingProgrammatically.current = true;
        const img = allImages.find(i => i.id === id);
        const isGenerated = !!(img?.generationPrompt || img?.parentId);
        const isMobile = window.innerWidth < 768;
        const alreadyInDetail = location.pathname.startsWith('/image/');
        if (isMobile) {
            // Mobile always shows sidesheet
            setDetailSideSheetVisible(true);
        } else if (!alreadyInDetail) {
            // Entering detail view fresh from grid: apply default rule (original=show, generated=hide)
            setDetailSideSheetVisible(!isGenerated);
        }
        // else: navigating within detail view — keep current sidesheet toggle state
        navigate(`/image/${id}`);
    };

    const handleBackToFeed = useCallback(() => {
        setIsDetailExiting(true);
        setTimeout(() => {
            setIsDetailExiting(false);
            if (expandedGroupId) {
                navigate(`/stack/${expandedGroupId}`);
            } else {
                navigate('/');
            }
        }, 180);
    }, [navigate, expandedGroupId]);

    // Detail-view delete: navigate to the adjacent image URL BEFORE removing the deleted image from state.
    // Without this, DetailPage's `!img → onBack()` fires and the 180ms timer navigates to grid,
    // overriding the correct navigation that App.tsx's activeId-sync effect would have done.
    const handleDetailDelete = React.useCallback(async (id: string) => {
        const flat = state.allImages;
        const currentIdx = flat.findIndex(i => i.id === id);
        const nextImg = flat[currentIdx + 1] || flat[currentIdx - 1];
        await actions.handleDeleteImage(id, false, () => {
            // Called after confirm but BEFORE setRows — navigate while img still exists
            isNavigatingProgrammatically.current = true;
            if (nextImg) {
                actions.selectAndSnap(nextImg.id);
                navigate(`/image/${nextImg.id}`, { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        });
    }, [state.allImages, actions, navigate]);

    // ── Global drag-and-drop ──────────────────────────────────────────────────
    const actionsRef = React.useRef(actions);
    React.useEffect(() => { actionsRef.current = actions; }, [actions]);
    const locationRef2 = React.useRef(location.pathname);
    React.useEffect(() => { locationRef2.current = location.pathname; }, [location.pathname]);

    // Which drop zone is the cursor over (detail view only)
    const [dragZone, setDragZone] = React.useState<'image' | 'sidesheet' | null>(null);
    const dragResetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        let counter = 0;

        const resetDrag = () => {
            counter = 0;
            actionsRef.current.setIsDragOver(false);
            setDragZone(null);
        };

        const onEnter = (e: DragEvent) => {
            if (!e.dataTransfer?.types.includes('Files')) return;
            counter++;
            actionsRef.current.setIsDragOver(true);
        };
        const onLeave = (e: DragEvent) => {
            counter = Math.max(0, counter - 1);
            if (counter === 0) resetDrag();
        };
        const onOver = (e: DragEvent) => {
            e.preventDefault();
            // Auto-reset if dragover stops firing (e.g. user drops outside app window)
            if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
            dragResetTimer.current = setTimeout(resetDrag, 400);
            // Track which zone cursor is over (only in detail view)
            if (locationRef2.current.startsWith('/image/')) {
                const sidesheetW = 380;
                setDragZone(e.clientX > window.innerWidth - sidesheetW ? 'sidesheet' : 'image');
            }
        };
        const onDrop = async (e: DragEvent) => {
            if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
            resetDrag();
            // FeedPage handles drops on its own container via React onDrop
            if (locationRef2.current === '/') return;
            // SideSheet marks handled drops to prevent double-upload
            if ((e as any).__sideSheetHandled) return;
            e.preventDefault();
            const files = (Array.from(e.dataTransfer?.files || []) as File[]).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;
            files.forEach(f => actionsRef.current.processFile(f));
        };
        document.addEventListener('dragenter', onEnter);
        document.addEventListener('dragleave', onLeave);
        document.addEventListener('dragover', onOver);
        document.addEventListener('drop', onDrop);
        return () => {
            document.removeEventListener('dragenter', onEnter);
            document.removeEventListener('dragleave', onLeave);
            document.removeEventListener('dragover', onOver);
            document.removeEventListener('drop', onDrop);
            if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
        };
    }, []); // intentionally empty: actionsRef + locationRef2 handle staleness

    // ── Global clipboard paste upload (Cmd+V / Ctrl+V) ───────────────────────
    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Only handle when user is logged in and on an app route
            if (!actionsRef.current?.processFile) return;
            const loc = locationRef2.current;
            if (loc !== '/' && !loc.startsWith('/image/') && loc !== '/create') return;

            const items = e.clipboardData?.items;
            if (!items) return;

            // Check if clipboard contains images
            const imageFiles: File[] = [];
            let hasText = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) imageFiles.push(file);
                }
                if (items[i].type === 'text/plain') hasText = true;
            }

            if (imageFiles.length === 0) return;

            // If focus is in a text field and clipboard also has text, let the
            // browser handle it normally (user likely wants to paste text)
            const tag = (e.target as HTMLElement)?.tagName;
            const isTextField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
            if (isTextField && hasText) return;

            // On detail view → add as reference image instead of uploading
            if (loc.startsWith('/image/')) {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('paste-reference-image', { detail: imageFiles[0] }));
                return;
            }

            // Image paste → treat as upload (works everywhere, including from text fields)
            e.preventDefault();
            if (imageFiles.length === 1) {
                // Single image → navigate to detail view (same as drop/upload button)
                actionsRef.current.processFile(imageFiles[0]).then((id: string | undefined) => {
                    if (id) {
                        isNavigatingProgrammatically.current = true;
                        navigate(`/image/${id}`);
                    }
                });
            } else {
                imageFiles.forEach(f => actionsRef.current.processFile(f));
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    // ── Global scroll progress for landing pages ──────────────────────────────
    const [globalScrollProgress, setGlobalScrollProgress] = React.useState(0);
    React.useEffect(() => {
        const handleScroll = () => {
            const HERO_SCROLL_DISTANCE = 120;
            const p = Math.min(window.scrollY / HERO_SCROLL_DISTANCE, 1);
            setGlobalScrollProgress(p);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getVoiceVisualContext = React.useCallback(() => {
        if (location.pathname.startsWith('/image/')) {
            const id = location.pathname.split('/').pop();
            const img = id ? allImages.find(i => i.id === id) : null;
            const thumb = img?.thumbSrc || img?.src;

            if (!img || !thumb) return null;

            return {
                contextKey: `detail:${img.id}:${img.updatedAt || img.createdAt || 0}`,
                summary: state.currentLang === 'de'
                    ? `Aktueller Kontext: Detailansicht eines Bildes. Titel: ${img.title || 'Unbenannt'}. ${img.generationPrompt ? `Prompt vorhanden.` : `Kein Prompt gespeichert.`}`
                    : `Current context: detail view for one image. Title: ${img.title || 'Untitled'}. ${img.generationPrompt ? 'A prompt is available.' : 'No prompt is stored.'}`,
                frames: [
                    {
                        id: img.id,
                        src: thumb,
                        label: img.title || 'detail-image'
                    }
                ]
            };
        }

        if (location.pathname === '/' || location.pathname === '') {
            const cols = state.gridColumns || 2;
            const displayImages = expandedGroupId
                ? state.rows.find((r: any) => r.id === expandedGroupId)?.items || []
                : state.isSelectMode
                    ? state.rows.flatMap((r: any) => r.items)
                    : state.rows.map((r: any) => r.items[0]).filter(Boolean) as any[];

            const itemsText = displayImages.slice(0, 20).map((img: any, i: number) => {
                const row = Math.floor(i / cols) + 1;
                const col = (i % cols) + 1;
                return `[${i + 1}] Reihe ${row}, Bild ${col}: ${img.title || 'Unbenannt'}`;
            }).join('\n');

            return {
                contextKey: `grid:${expandedGroupId || 'root'}:${state.isSelectMode ? 'select' : 'normal'}:${displayImages.length}:${cols}`,
                summary: state.currentLang === 'de'
                    ? `Aktueller Kontext: Galerie-Ansicht (${expandedGroupId ? 'Stapel geöffnet' : 'Hauptübersicht'}). Es sind ${cols} Bilder pro Reihe nebeneinander. Hier sind die ersten sichtbaren Bilder:\n${itemsText}`
                    : `Current context: gallery view (${expandedGroupId ? 'stack expanded' : 'main overview'}). There are ${cols} images per row. Here are the first visible images:\n${itemsText}`,
                frames: displayImages.slice(0, 4).map((img: any) => ({
                    id: img.id,
                    src: img.thumbSrc || img.src,
                    label: img.title || 'grid-image'
                }))
            };
        }

        return null;
    }, [allImages, detailSideSheetVisible, expandedGroupId, feedSideSheetVisible, location.pathname, state.currentLang, state.gridColumns, state.isSelectMode, state.rows, state.selectedIds]);

    const voice = useGeminiLiveVoice({
        enabled: voiceFeatureEnabled && !!user,
        lang: state.currentLang,
        getAppContext: () => {
            const isDetail = location.pathname.startsWith('/image/');
            const isStack = location.pathname.startsWith('/stack/');
            const isGallery = location.pathname === '/';
            const isCreate = location.pathname === '/create';

            const displayImages = isStack && expandedGroupId 
                ? allImages.filter(i => i.groupId === expandedGroupId)
                : allImages.filter(i => !i.groupId || i.id === i.groupId);

            return {
                route: isDetail ? 'detail' : (isCreate ? 'create' : 'grid'),
                viewLevel: (isDetail ? 'detail' : (isStack ? 'stack' : (isGallery ? 'gallery' : 'other'))) as any,
                isSelectMode: !!state.isSelectMode,
                imageCount: displayImages.length,
                images: (isGallery || isStack) ? displayImages.map((img, idx) => ({
                    id: img.id,
                    timestamp: img.timestamp,
                    prompt: img.generationPrompt || undefined
                })).slice(0, 48) : undefined,
                detailHasPrompt: (() => {
                    if (!isDetail) return false;
                    const id = location.pathname.split('/').pop();
                    const img = id ? allImages.find(i => i.id === id) : null;
                    return !!img?.generationPrompt;
                })(),
                canOpenPresets: isDetail,
                canAddReferenceImage: isDetail || isCreate,
                canAnnotateImage: isDetail
            };
        },
        getVisualContext: getVoiceVisualContext,
        openGallery: async () => {
            setExpandedGroupId(null);
            navigate('/');
            return { ok: true, message: state.currentLang === 'de' ? 'Galerie geöffnet.' : 'Opened the gallery.' };
        },
        openCreate: async () => {
            navigate('/create');
            return { ok: true, message: state.currentLang === 'de' ? 'Generieren geöffnet.' : 'Opened create.' };
        },
        openCreateNew: async () => {
            navigate('/create');
            return { ok: true, message: state.currentLang === 'de' ? 'Neues Bild erstellen.' : 'Create a new image.' };
        },
        openUpload: async () => {
            setIsVoiceUploadOpen(true);
            return { ok: true, message: state.currentLang === 'de' ? 'Upload-Fenster wird angezeigt. Der Nutzer kann jetzt eine Datei auswählen.' : 'Upload window shown. User can now pick a file.' };
        },
        openSettings: async () => {
            setIsSettingsModalOpen(true);
            actions.refreshImageCount?.();
            return { ok: true, message: state.currentLang === 'de' ? 'Einstellungen geöffnet.' : 'Opened settings.' };
        },
        enterMultiSelect: async () => {
            if (location.pathname !== '/') {
                navigate('/');
                await new Promise(resolve => window.setTimeout(resolve, 120));
            }
            if (!state.isSelectMode) {
                actions.setIsSelectMode(true);
                setExpandedGroupId(null);
            }
            return { ok: true, message: state.currentLang === 'de' ? 'Mehrfachauswahl aktiviert.' : 'Enabled multi-select.' };
        },
        leaveMultiSelect: async () => {
            if (state.isSelectMode) {
                actions.setIsSelectMode(false);
                actions.deselectAll();
                setFeedSideSheetVisible(false);
            }
            return { ok: true, message: state.currentLang === 'de' ? 'Mehrfachauswahl beendet.' : 'Exited multi-select.' };
        },
        repeatCurrentImage: async () => {
            if (!location.pathname.startsWith('/image/')) {
                return { ok: false, message: state.currentLang === 'de' ? 'Öffne zuerst ein Bild im Detail.' : 'Open an image detail first.' };
            }
            const id = location.pathname.split('/').pop();
            const img = id ? allImages.find(i => i.id === id) : null;
            if (!id || !img?.generationPrompt) {
                return { ok: false, message: state.currentLang === 'de' ? 'Für dieses Bild sind keine Varianten verfügbar.' : 'More variations are not available for this image.' };
            }
            actions.handleGenerateMore(id);
            return { ok: true, message: state.currentLang === 'de' ? 'Weitere Varianten gestartet.' : 'Started more variations.' };
        },
        showDetailPanel: async () => {
            if (location.pathname.startsWith('/image/')) {
                setDetailSideSheetVisible(true);
                return { ok: true, message: state.currentLang === 'de' ? 'Bearbeitungsleiste geöffnet.' : 'Opened the image panel.' };
            }
            if (state.isSelectMode) {
                setFeedSideSheetVisible(true);
                return { ok: true, message: state.currentLang === 'de' ? 'Auswahlleiste geöffnet.' : 'Opened the selection panel.' };
            }
            return { ok: false, message: state.currentLang === 'de' ? 'Hier gibt es keine Seitenleiste.' : 'There is no panel here.' };
        },
        hideDetailPanel: async () => {
            if (location.pathname.startsWith('/image/')) {
                setDetailSideSheetVisible(false);
                return { ok: true, message: state.currentLang === 'de' ? 'Bearbeitungsleiste ausgeblendet.' : 'Hid the image panel.' };
            }
            if (state.isSelectMode) {
                setFeedSideSheetVisible(false);
                return { ok: true, message: state.currentLang === 'de' ? 'Auswahlleiste ausgeblendet.' : 'Hid the selection panel.' };
            }
            return { ok: false, message: state.currentLang === 'de' ? 'Hier gibt es keine Seitenleiste.' : 'There is no panel here.' };
        },
        openPresets: async () => {
            if (location.pathname.startsWith('/image/')) {
                setDetailSideSheetVisible(true);
            }
            const clicked = await clickVoiceAction('[data-voice-action="open-presets-manager"]');
            return clicked
                ? { ok: true, message: state.currentLang === 'de' ? 'Vorlagen geöffnet.' : 'Opened presets.' }
                : { ok: false, message: state.currentLang === 'de' ? 'Ich finde die Vorlagen hier gerade nicht.' : 'I cannot find presets here right now.' };
        },
        openReferenceImagePicker: async () => {
            if (location.pathname.startsWith('/image/')) {
                setDetailSideSheetVisible(true);
            }
            const clicked = await clickVoiceAction('[data-voice-action="open-reference-image-picker"]');
            return clicked
                ? { ok: true, message: state.currentLang === 'de' ? 'Referenzbild-Auswahl geöffnet.' : 'Opened the reference image picker.' }
                : { ok: false, message: state.currentLang === 'de' ? 'Ich finde die Referenzbild-Funktion hier gerade nicht.' : 'I cannot find the reference image picker here right now.' };
        },
        startAnnotationMode: async () => {
            if (location.pathname.startsWith('/image/')) {
                setDetailSideSheetVisible(true);
            }
            const clicked = await clickVoiceAction('[data-voice-action="toggle-annotation-mode"]');
            return clicked
                ? { ok: true, message: state.currentLang === 'de' ? 'Anmerkungen aktiviert.' : 'Enabled annotations.' }
                : { ok: false, message: state.currentLang === 'de' ? 'Ich finde die Anmerkungsfunktion hier gerade nicht.' : 'I cannot find annotations here right now.' };
        },
        setPromptText: async (text: string) => {
            // Auto-show sidesheet so the user can see the prompt
            if (location.pathname.startsWith('/image/') && !detailSideSheetVisible) {
                setDetailSideSheetVisible(true);
                await new Promise(resolve => window.setTimeout(resolve, 200));
            }
            const clicked = await clickVoiceAction('[data-voice-action="focus-prompt"]');
            // Find the prompt textarea and set its value
            const textarea = document.querySelector<HTMLTextAreaElement>('[data-voice-action="prompt-input"]');
            if (textarea) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(textarea, text);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                return { ok: true, message: state.currentLang === 'de' ? `Prompt gesetzt: "${text}"` : `Prompt set: "${text}"` };
            }
            return { ok: false, message: state.currentLang === 'de' ? 'Prompt-Feld nicht gefunden.' : 'Prompt field not found.' };
        },
        triggerGeneration: async () => {
            const clicked = await clickVoiceAction('[data-voice-action="generate-button"]');
            return clicked
                ? { ok: true, message: state.currentLang === 'de' ? 'Generierung wurde GESTARTET. Das Bild ist noch NICHT fertig — das dauert 10-60 Sekunden. Sage dem Nutzer nur dass es jetzt generiert wird, NICHT dass es fertig ist.' : 'Generation was STARTED. The image is NOT finished yet — it takes 10-60 seconds. Only tell the user it is generating, NOT that it is done.' }
                : { ok: false, message: state.currentLang === 'de' ? 'Generieren-Button nicht gefunden.' : 'Generate button not found.' };
        },
        nextImage: async () => {
            if (!location.pathname.startsWith('/image/')) {
                return { ok: false, message: state.currentLang === 'de' ? 'Öffne zuerst ein Bild.' : 'Open an image first.' };
            }
            const currentId = location.pathname.split('/').pop();
            
            // Context-aware flat list: if we are in a stack, cycle only within that stack
            let flat: any[] = [];
            if (expandedGroupId) {
                const row = state.rows.find((r: any) => r.id === expandedGroupId);
                flat = row ? row.items : [];
            } else {
                // Not in a stack context (entered from gallery)
                // In this case, we navigate through all root items (covers or single images)
                flat = state.rows.map((r: any) => r.items[0]).filter(Boolean);
            }
            
            if (flat.length === 0) flat = allImages; // Fallback to all if something is wrong

            const idx = flat.findIndex(img => img.id === currentId);
            if (idx === -1) {
                // Current image not in current list? Fallback to global
                const gIdx = allImages.findIndex(img => img.id === currentId);
                const next = allImages[(gIdx + 1) % allImages.length];
                handleSelectImage(next.id);
                return { ok: true, message: state.currentLang === 'de' ? 'Nächstes Bild (global).' : 'Next image (global).' };
            }

            const next = flat[(idx + 1) % flat.length];
            handleSelectImage(next.id);
            return { ok: true, message: state.currentLang === 'de' ? 'Nächstes Bild.' : 'Next image.' };
        },
        previousImage: async () => {
            if (!location.pathname.startsWith('/image/')) {
                return { ok: false, message: state.currentLang === 'de' ? 'Öffne zuerst ein Bild.' : 'Open an image first.' };
            }
            const currentId = location.pathname.split('/').pop();

            // Context-aware flat list
            let flat: any[] = [];
            if (expandedGroupId) {
                const row = state.rows.find((r: any) => r.id === expandedGroupId);
                flat = row ? row.items : [];
            } else {
                flat = state.rows.map((r: any) => r.items[0]).filter(Boolean);
            }
            
            if (flat.length === 0) flat = allImages;

            const idx = flat.findIndex(img => img.id === currentId);
            if (idx === -1) {
                const gIdx = allImages.findIndex(img => img.id === currentId);
                const prev = allImages[(gIdx - 1 + allImages.length) % allImages.length];
                handleSelectImage(prev.id);
                return { ok: true, message: state.currentLang === 'de' ? 'Vorheriges Bild (global).' : 'Previous image (global).' };
            }

            const prev = flat[(idx - 1 + flat.length) % flat.length];
            handleSelectImage(prev.id);
            return { ok: true, message: state.currentLang === 'de' ? 'Vorheriges Bild.' : 'Previous image.' };
        },
        goBack: async () => {
            // L3 (Detail) -> L2 (Stack) if belongs to one, or L1 (Gallery)
            if (location.pathname.startsWith('/image/')) {
                const currentId = location.pathname.split('/').pop();
                const row = state.rows.find((r: any) => r.items.some((i: any) => i.id === currentId));
                
                if (row && row.items.length > 1) {
                    navigate(`/stack/${row.id}`);
                    return { ok: true, message: state.currentLang === 'de' ? 'Zurück zum Stapel.' : 'Back to stack.' };
                }
                
                navigate('/');
                return { ok: true, message: state.currentLang === 'de' ? 'Zurück zur Galerie.' : 'Back to gallery.' };
            }

            if (location.pathname === '/create') {
                navigate('/');
                return { ok: true, message: state.currentLang === 'de' ? 'Zurück zur Galerie.' : 'Back to gallery.' };
            }

            // L2 (Stack) -> L1 (Gallery)
            if (location.pathname.startsWith('/stack/') || (location.pathname === '/' && expandedGroupId)) {
                navigate('/');
                return { ok: true, message: state.currentLang === 'de' ? 'Zurück zur Galerie.' : 'Back to gallery.' };
            }

            return { ok: false, message: state.currentLang === 'de' ? 'Bereits in der Galerie.' : 'Already in the gallery.' };
        },
        openStack: async () => {
            if (location.pathname.startsWith('/image/')) {
                const currentId = location.pathname.split('/').pop();
                const row = state.rows.find((r: any) => r.items.some((i: any) => i.id === currentId));
                if (row && row.items.length > 1) {
                    navigate(`/stack/${row.id}`);
                    return { ok: true, message: state.currentLang === 'de' ? `Stapel mit ${row.items.length} Bildern geöffnet.` : `Opened stack with ${row.items.length} images.` };
                }
                return { ok: false, message: state.currentLang === 'de' ? 'Dieses Bild hat keinen Stapel.' : 'This image has no stack.' };
            }
            return { ok: false, message: state.currentLang === 'de' ? 'Öffne zuerst ein Bild.' : 'Open an image first.' };
        },
        stopVoiceMode: () => {
            // Will be called by the hook itself to trigger stop
        },
        setAspectRatio: async (ratio: string) => {
            const validRatios = ['16:9', '4:3', '1:1', '3:4', '9:16'];
            if (!validRatios.includes(ratio)) {
                return { ok: false, message: state.currentLang === 'de' ? `Ungültiges Format. Verfügbar: ${validRatios.join(', ')}` : `Invalid ratio. Available: ${validRatios.join(', ')}` };
            }
            if (location.pathname !== '/create') {
                navigate('/create');
                await new Promise(resolve => window.setTimeout(resolve, 300));
            }
            const clicked = await clickVoiceAction(`[data-voice-action="ratio-${ratio}"]`);
            return clicked
                ? { ok: true, message: state.currentLang === 'de' ? `Format ${ratio} ausgewählt.` : `Selected ${ratio} ratio.` }
                : { ok: false, message: state.currentLang === 'de' ? 'Format konnte nicht gesetzt werden.' : 'Could not set aspect ratio.' };
        },
        createVariables: async (controls: Array<{ label: string; options: string[] }>) => {
            if (!controls || controls.length === 0) {
                return { ok: false, message: state.currentLang === 'de' ? 'Keine Variablen angegeben.' : 'No variables provided.' };
            }
            window.dispatchEvent(new CustomEvent('expose:set-voice-variables', {
                detail: { controls }
            }));
            const labels = controls.map(c => c.label).join(', ');
            return { ok: true, message: state.currentLang === 'de' ? `Variablen erstellt: ${labels}. Der Nutzer sieht sie jetzt als Chips und kann Optionen auswählen.` : `Variables created: ${labels}. The user can now see and select options.` };
        },
        selectVariableOption: async (label: string, option: string) => {
            if (!label || !option) {
                return { ok: false, message: state.currentLang === 'de' ? 'Label und Option benötigt.' : 'Label and option required.' };
            }
            window.dispatchEvent(new CustomEvent('expose:toggle-voice-variable', {
                detail: { label, option }
            }));
            return { ok: true, message: state.currentLang === 'de' ? `Option "${option}" bei "${label}" umgeschaltet.` : `Toggled "${option}" in "${label}".` };
        },
        setQuality: async (quality: string) => {
            const map: Record<string, string> = { '1k': 'nb2-1k', '2k': 'nb2-2k', '4k': 'nb2-4k' };
            const mode = map[quality.toLowerCase()];
            if (!mode) {
                return { ok: false, message: state.currentLang === 'de' ? 'Ungültige Qualität. Verfügbar: 1K, 2K, 4K.' : 'Invalid quality. Available: 1K, 2K, 4K.' };
            }
            actions.setQualityMode(mode as any);
            return { ok: true, message: state.currentLang === 'de' ? `Qualität auf ${quality.toUpperCase()} gesetzt.` : `Quality set to ${quality.toUpperCase()}.` };
        },
        selectImageByIndex: async (index: number) => {
            const idx = index - 1; // 1-based to 0-based
            const displayImages = expandedGroupId
                ? state.rows.find((r: any) => r.id === expandedGroupId)?.items || []
                : state.isSelectMode
                    ? state.rows.flatMap((r: any) => r.items)
                    : state.rows.map((r: any) => r.items[0]).filter(Boolean) as any[];

            const img = displayImages[idx];
            if (!img) return { ok: false, message: state.currentLang === 'de' ? `Bild an Index ${index} nicht gefunden.` : `Image at index ${index} not found.` };

            const gc = (expandedGroupId || state.isSelectMode) ? 1 : (state.rows.find((r: any) => r.items[0]?.id === img.id)?.items.length ?? 1);
            if (gc > 1) {
                const row = state.rows.find((r: any) => r.items[0]?.id === img.id);
                if (row) {
                    setExpandedGroupId(row.id);
                    return { ok: true, message: state.currentLang === 'de' ? `Stapel "${img.title || 'Unbenannt'}" geöffnet.` : `Opened stack "${img.title || 'Untitled'}".` };
                }
            }

            handleSelectImage(img.id);
            return { ok: true, message: state.currentLang === 'de' ? `Bild "${img.title || 'Unbenannt'}" geöffnet.` : `Opened image "${img.title || 'Untitled'}".` };
        },
        selectImageByPosition: async (rowIdx: number, columnIdx: number) => {
            const cols = state.gridColumns || 2;
            const index = (rowIdx - 1) * cols + (columnIdx - 1) + 1;
            
            const displayImages = expandedGroupId
                ? state.rows.find((r: any) => r.id === expandedGroupId)?.items || []
                : state.isSelectMode
                    ? state.rows.flatMap((r: any) => r.items)
                    : state.rows.map((r: any) => r.items[0]).filter(Boolean) as any[];

            const img = displayImages[index - 1];
            if (!img) return { ok: false, message: state.currentLang === 'de' ? `Position (Reihe ${rowIdx}, Bild ${columnIdx}) existiert nicht.` : `Position (Row ${rowIdx}, Image ${columnIdx}) does not exist.` };

            const gc = (expandedGroupId || state.isSelectMode) ? 1 : (state.rows.find((r: any) => r.items[0]?.id === img.id)?.items.length ?? 1);
            if (gc > 1) {
                const row = state.rows.find((r: any) => r.items[0]?.id === img.id);
                if (row) {
                    setExpandedGroupId(row.id);
                    return { ok: true, message: state.currentLang === 'de' ? `Stapel "${img.title || 'Unbenannt'}" geöffnet.` : `Opened stack "${img.title || 'Untitled'}".` };
                }
            }

            handleSelectImage(img.id);
            return { ok: true, message: state.currentLang === 'de' ? `Bild "${img.title || 'Unbenannt'}" geöffnet.` : `Opened image "${img.title || 'Untitled'}".` };
        },
        highlightImage: async (index: number) => {
            if (index < 1) return { ok: false, message: 'Invalid index.' };
            setVoiceFocusIndex(index - 1);
            return { ok: true, message: `Highlighted image ${index}.` };
        },
        toggleImageSelection: async (index: number) => {
            const isStack = location.pathname.startsWith('/stack/');
            const displayImages = isStack && expandedGroupId 
                ? allImages.filter(i => i.groupId === expandedGroupId)
                : allImages.filter(i => !i.groupId || i.id === i.groupId);

            const img = displayImages[index - 1];
            if (!img) return { ok: false, message: `Image at index ${index} not found.` };
            
            if (!state.isSelectMode) {
                actions.setIsSelectMode(true);
            }
            setFeedSideSheetVisible(true);
            actions.handleSelection(img.id);
            return { ok: true, message: `${state.selectedIds.includes(img.id) ? 'Deselected' : 'Selected'} ${img.id}.` };
        }
    });

    // Play "tong" notification sound when a generation completes while voice mode is active
    useEffect(() => {
        const handler = () => {
            if (voice.isActive) playVoiceSound('voice-start');
        };
        window.addEventListener('expose:generation-complete', handler);
        return () => window.removeEventListener('expose:generation-complete', handler);
    }, [voice.isActive]);

    // Keyboard shortcut: V to toggle voice mode (only when no text field is focused)
    useEffect(() => {
        if (!voiceFeatureEnabled || !user) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'v' && e.key !== 'V') return;
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            // Don't trigger when typing in a text field
            const tag = (e.target as HTMLElement)?.tagName;
            const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                (e.target as HTMLElement)?.isContentEditable;
            if (isEditable) return;
            e.preventDefault();
            if (voice.isActive) voice.stop();
            else void voice.start();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [voiceFeatureEnabled, user, voice]);

    const isAppLayout = user && (location.pathname === '/' || location.pathname.startsWith('/image/') || location.pathname === '/create');
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isPublicLanding = !user && (location.pathname === '/' || location.pathname === '/about' || location.pathname === '/impressum');
    
    // Pages that should have an expandable Hero header
    const expandableRoutes = ['/', '/about', '/impressum'];
    const isExpandableRoute = expandableRoutes.includes(location.pathname);

    const outerContainerClasses = isAppLayout
        ? "h-[100dvh] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col overflow-hidden"
        : "min-h-[100dvh] bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-[Inter,system-ui,-apple-system,sans-serif] selection:bg-orange-500 selection:text-white flex flex-col";

    const mainContainerClasses = isAppLayout
        ? "flex-1 flex flex-col overflow-hidden pt-14"
        : "flex-1 flex flex-col";

    const showGlobalNavbar = !isAdminRoute;

    return (
        <div className={outerContainerClasses}>

            {showGlobalNavbar && (
                <AppNavbar
                    user={user}
                    userProfile={userProfile}
                    isPublic={!user}
                    credits={credits || 0}
                    onCreate={() => navigate('/create')}
                    onSignIn={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                    }}
                    onStartApp={() => {
                        if (user) { navigate('/'); return; }
                        setAuthModalMode('signup');
                        setIsAuthModalOpen(true);
                    }}
                    onOpenCredits={() => setIsCreditsModalOpen(true)}
                    onToggleSettings={() => { setIsSettingsModalOpen(true); actions.refreshImageCount?.(); }}
                    onSignOut={handleSignOut}
                    onSelectMode={() => {
                        actions.setIsSelectMode(true);
                        setExpandedGroupId(null);
                    }}
                    isSelectMode={state.isSelectMode}
                    onCancelSelectMode={() => {
                        actions.setIsSelectMode(false);
                        actions.deselectAll();
                        setFeedSideSheetVisible(false);
                    }}
                    onDeleteSelected={async () => {
                        const count = state.selectedIds?.length || 0;
                        const confirmed = await confirm({
                            title: t('delete') || 'Löschen',
                            description: state.currentLang === 'de'
                                ? `Möchtest du wirklich ${count} Bild${count !== 1 ? 'er' : ''} löschen?`
                                : `Delete ${count} image${count !== 1 ? 's' : ''}?`,
                            confirmLabel: t('delete') || 'LÖSCHEN',
                            cancelLabel: t('cancel') || 'ABBRECHEN',
                            variant: 'danger'
                        });
                        if (!confirmed) return;
                        state.selectedIds.forEach((id: string) => actions.handleDeleteImage(id, true));
                        actions.setIsSelectMode(false);
                        actions.deselectAll();
                    }}
                    onDownloadSelected={() => {
                        if (state.selectedIds?.length) actions.handleDownload(state.selectedIds);
                    }}
                    onGenerateMoreSelected={() => {
                        state.selectedIds.forEach((id: string) => actions.handleGenerateMore(id));
                    }}
                    onGenerateMoreDetail={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) actions.handleGenerateMore(id);
                        }
                    }}
                    selectedCount={state.selectedIds?.length || 0}
                    t={t}
                    lang={state.currentLang}
                    mode={location.pathname === '/create' ? 'create' : location.pathname.startsWith('/image/') ? 'detail' : 'grid'}
                    rightInset={location.pathname.startsWith('/image/') ? detailSidebarWidth : 0}
                    hasImages={allImages.length > 0}
                    imageCount={allImages.length}
                    detailInfo={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            const img = allImages.find(i => i.id === id);
                            if (img) return img.title || 'Untitled';
                        }
                        return undefined;
                    })()}
                    groupInfo={(() => {
                        if (expandedGroupId) {
                            const row = state.rows.find((r: any) => r.id === expandedGroupId);
                            const root = row?.items?.find((item: any) => !item.parentId) || row?.items?.[0];
                            return root?.title || row?.title || undefined;
                        }
                        return undefined;
                    })()}
                    detailActions={null}
                    detailHasPrompt={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            const img = allImages.find(i => i.id === id);
                            return !!(img?.generationPrompt);
                        }
                        return false;
                    })()}
                    detailIsNew={(() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            return !!(id && state.unseenIds?.has(id));
                        }
                        return false;
                    })()}
                    isGroupDrillDown={!!expandedGroupId}
                    onCloseGroup={() => navigate('/')}
                    onBack={handleBackToFeed}
                    onDetailRename={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) setInfoImageId(id);
                        }
                    }}
                    onDetailDownload={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) actions.handleDownload(id);
                        }
                    }}
                    onDetailDelete={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) handleDetailDelete(id);
                        }
                    }}
                    onDetailInfo={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) setInfoImageId(id);
                        }
                    }}
                    onDetailRegenerate={() => {
                        if (location.pathname.startsWith('/image/')) {
                            const id = location.pathname.split('/').pop();
                            if (id) actions.handleGenerateMore(id);
                        }
                    }}
                    isSideSheetVisible={detailSideSheetVisible}
                    isFeedSideSheetVisible={feedSideSheetVisible}
                    onToggleSideSheet={() => setDetailSideSheetVisible(v => !v)}
                    onToggleFeedSideSheet={() => setFeedSideSheetVisible(v => !v)}
                    generatingImages={allImages.filter(i => i.isGenerating && (i.generationPrompt || i.parentId))}
                    onNavigateToImage={(id) => { handleSelectImage(id); }}
                    onGenerateMoreById={(id) => actions.handleGenerateMore(id)}
                    heroProgress={isExpandableRoute
                        ? (location.pathname === '/' && user ? feedHeroProgress : globalScrollProgress)
                        : undefined}
                    onHeroUploadClick={() => { (document.getElementById('feed-upload-input') as HTMLInputElement | null)?.click(); }}
                    voiceFeatureEnabled={voiceFeatureEnabled}
                    voiceModeActive={voice.isActive}
                    voiceModeState={voice.state}
                    voiceLevel={voice.level}
                    onStartVoiceMode={() => { void voice.start(); }}
                    onStopVoiceMode={voice.stop}
                />
            )}


            {/* Drag-drop overlay — two zones in detail view, single card elsewhere */}
            {state.isDragOver && location.pathname !== '/' && (() => {
                const isDetail = location.pathname.startsWith('/image/');
                const lang = state.currentLang;
                if (isDetail) {
                    const sidesheetW = detailSidebarWidth;
                    return (
                        <div className="fixed inset-0 z-[100] pointer-events-none">
                            <div className="absolute inset-0 bg-black/30" />
                            {/* Left zone: Upload */}
                            <div
                                className="absolute inset-y-0 left-0 flex items-center justify-center"
                                style={{ right: sidesheetW }}
                            >
                                <div className={`flex flex-col items-center gap-3 px-8 py-6 ${Theme.Colors.ModalBg} border ${Theme.Geometry.RadiusXl} transition-all duration-150 ${dragZone === 'image' ? 'scale-[1.06] border-orange-400 dark:border-orange-500' : Theme.Colors.Border}`}>
                                    <Upload className={`transition-all duration-150 ${dragZone === 'image' ? 'w-8 h-8 text-orange-500' : 'w-6 h-6 text-zinc-400 dark:text-zinc-500'}`} />
                                    <p className={`${Typo.Body} text-sm ${dragZone === 'image' ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                        {lang === 'de' ? 'Hier ablegen zum Hochladen' : 'Drop here to upload'}
                                    </p>
                                </div>
                            </div>
                            {/* Right zone: Reference image */}
                            <div
                                className="absolute inset-y-0 right-0 flex items-center justify-center"
                                style={{ width: sidesheetW }}
                            >
                                <div className={`flex flex-col items-center gap-3 px-8 py-6 ${Theme.Colors.ModalBg} border ${Theme.Geometry.RadiusXl} transition-all duration-150 ${dragZone === 'sidesheet' ? 'scale-[1.06] border-orange-400 dark:border-orange-500' : Theme.Colors.Border}`}>
                                    <ImageIcon className={`transition-all duration-150 ${dragZone === 'sidesheet' ? 'w-8 h-8 text-orange-500' : 'w-6 h-6 text-zinc-400 dark:text-zinc-500'}`} />
                                    <p className={`${Typo.Body} text-sm text-center ${dragZone === 'sidesheet' ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                        {lang === 'de' ? 'Als Referenz hinzufügen' : 'Add as reference'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/50" />
                        <div className={`relative flex flex-col items-center gap-3 px-10 py-8 ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusXl}`}>
                            <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            <p className={`${Typo.Body} text-sm text-zinc-600 dark:text-zinc-400`}>
                                {lang === 'de' ? 'Dateien hier ablegen' : 'Drop files here'}
                            </p>
                        </div>
                    </div>
                );
            })()}

            <main className={mainContainerClasses}>
                <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-white dark:bg-black"><Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-800" /></div>}>
                    <Routes>
                        <Route path="/" element={
                            user ? (
                                <FeedPage
                                    images={state.allImages}
                                    rows={state.rows}
                                    isLoading={state.isCanvasLoading}
                                    hasMore={state.hasMore}
                                    onLoadMore={actions.handleLoadMore}
                                    onSelectImage={handleSelectImage}
                                    onCreateNew={handleCreateNew}
                                    onUpload={actions.handleFileDrop}
                                    isFetchingMore={state.isFetchingMore}
                                    isSelectMode={state.isSelectMode}
                                    isSelectionSideSheetOpen={feedSideSheetVisible}
                                    selectedIds={state.selectedIds}
                                    onToggleSelect={(id, isRange) => {
                                        if (!state.isSelectMode) {
                                            actions.selectAndSnap(id);
                                            return;
                                        }
                                        if (isRange) {
                                            actions.handleSelection(id, false, true);
                                        } else {
                                            const isCurrentlySelected = state.selectedIds.includes(id);
                                            const willBeZero = isCurrentlySelected && state.selectedIds.length === 1;
                                            actions.handleSelection(id, true, false);
                                            if (willBeZero) {
                                                actions.setIsSelectMode(false);
                                            }
                                        }
                                    }}
                                    expandedGroupId={expandedGroupId}
                                    onExpandedGroupChange={(id) => id ? navigate(`/stack/${id}`) : navigate("/")}
                                    lastViewedId={state.activeId}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                    onScrollProgress={setFeedHeroProgress}
                                    voiceFocusIndex={voiceFocusIndex}
                                />
                            ) : (
                                <HomePage
                                    user={user}
                                    userProfile={userProfile}
                                    credits={credits}
                                    t={t}
                                    lang={state.currentLang}
                                    onSignIn={() => {
                                        setAuthModalMode('signin');
                                        setIsAuthModalOpen(true);
                                    }}
                                    onGetStarted={() => {
                                        setAuthModalMode('signup');
                                        setIsAuthModalOpen(true);
                                    }}
                                />
                            )
                        } />

                        <Route path="/stack/:id" element={
                            <ProtectedRoute user={user} isAuthLoading={isAuthLoading} onAuthRequired={() => {
                                setAuthModalMode('signin');
                                setIsAuthModalOpen(true);
                            }}>
                                <FeedPage
                                    images={state.allImages.filter(img => img.groupId === expandedGroupId)}
                                    rows={state.rows.filter(r => r.id === expandedGroupId)}
                                    isLoading={state.isCanvasLoading}
                                    hasMore={false}
                                    onSelectImage={handleSelectImage}
                                    onCreateNew={handleCreateNew}
                                    onUpload={actions.handleFileDrop}
                                    onLoadMore={() => { }}
                                    isFetchingMore={state.isFetchingMore}
                                    isSelectMode={state.isSelectMode}
                                    isSelectionSideSheetOpen={feedSideSheetVisible}
                                    selectedIds={state.selectedIds}
                                    onToggleSelect={(id, isRange) => {
                                        if (!state.isSelectMode) {
                                            actions.selectAndSnap(id);
                                            return;
                                        }
                                        actions.handleSelection(id, true, isRange);
                                    }}
                                    expandedGroupId={expandedGroupId}
                                    onExpandedGroupChange={(id) => id ? navigate(`/stack/${id}`) : navigate("/")}
                                    lastViewedId={state.activeId}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                    onScrollProgress={setFeedHeroProgress}
                                    voiceFocusIndex={voiceFocusIndex}
                                />
                            </ProtectedRoute>
                        } />

                        <Route path="/about" element={
                            <HomePage
                                user={user}
                                userProfile={userProfile}
                                credits={credits}
                                t={t}
                                lang={state.currentLang}
                                onSignIn={() => {
                                    setAuthModalMode('signin');
                                    setIsAuthModalOpen(true);
                                }}
                                onGetStarted={() => {
                                    if (user) {
                                        navigate('/');
                                        return;
                                    }
                                    setAuthModalMode('signup');
                                    setIsAuthModalOpen(true);
                                }}
                            />
                        } />

                        <Route path="/image/:id" element={
                            <ProtectedRoute user={user} isAuthLoading={isAuthLoading} onAuthRequired={() => {
                                setAuthModalMode('signin');
                                setIsAuthModalOpen(true);
                            }}>
                                <DetailPage
                                    images={allImages}
                                    selectedId={location.pathname.split('/').pop() || ''}
                                    onBack={handleBackToFeed}
                                    onSelectImage={handleSelectImage}
                                    onDelete={handleDetailDelete}
                                    onDownload={handleDownload}
                                    onInfo={(id) => setInfoImageId(id)}
                                    onSidebarWidthChange={setDetailSidebarWidth}
                                    isSideSheetVisible={detailSideSheetVisible}
                                    onSideSheetVisibleChange={setDetailSideSheetVisible}
                                    isExiting={isDetailExiting}
                                    hasMore={state.hasMore}
                                    onLoadMore={actions.handleLoadMore}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                />
                            </ProtectedRoute>
                        } />

                        <Route path="/create" element={
                            <ProtectedRoute user={user} isAuthLoading={isAuthLoading} onAuthRequired={() => {
                                setAuthModalMode('signin');
                                setIsAuthModalOpen(true);
                            }}>
                                <CreatePage
                                    onCreateNew={handleCreateNew}
                                    onBack={() => navigate('/')}
                                    state={state}
                                    actions={actions}
                                    t={t}
                                />
                            </ProtectedRoute>
                        } />

                        <Route path="/admin/:tab?" element={
                            <AdminRoute user={user} userProfile={userProfile} isAuthLoading={isAuthLoading}>
                                <AdminDashboard
                                    user={user}
                                    userProfile={userProfile}
                                    credits={credits}
                                    onCreateBoard={() => setIsCreationModalOpen(true)}
                                    t={t}
                                />
                            </AdminRoute>
                        } />

                        <Route path="/impressum" element={<ImpressumPage
                            user={user}
                            userProfile={userProfile}
                            credits={credits}
                            t={t}
                            onCreateNew={() => setIsCreationModalOpen(true)}
                            onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                        />} />
                        <Route path="/legal" element={<Navigate to="/impressum" replace />} />
                        <Route path="/s/:slug" element={
                            <SharedTemplatePage
                                user={user}
                                userProfile={userProfile}
                                credits={credits || 0}
                                onCreateBoard={() => navigate('/create')}
                                onSignIn={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
                                t={t}
                            />
                        } />

                        {/* Dev playground — delete when done */}
                        <Route path="/playground" element={<React.Suspense fallback={null}><HeroPlayground /></React.Suspense>} />

                        {/* Legacy Redirects */}
                        <Route path="/projects/*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </main>

            {/* Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                error={authError}
                onClearError={() => setAuthError(null)}
                email={authEmail}
                onEmailChange={setAuthEmail}
                mode={authModalMode}
                onModeChange={setAuthModalMode}
                t={t}
            />

            <CreationModal
                isOpen={isCreationModalOpen}
                onClose={() => setIsCreationModalOpen(false)}
                onGenerate={handleCreateNew}
                t={t}
            />

            <CreditsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                currentBalance={credits || 0}
                onAddFunds={actions.handleAddFunds}
                t={t}
            />

            <ModalErrorBoundary>
                <Suspense fallback={null}>
                    {isSettingsModalOpen && user && (
                        <SettingsModal
                            isOpen={isSettingsModalOpen}
                            onClose={() => setIsSettingsModalOpen(false)}
                            qualityMode={state.qualityMode}
                            onQualityModeChange={setQualityMode}
                            currentBalance={credits || 0}
                            onAddFunds={actions.handleAddFunds}
                            themeMode={state.themeMode}
                            onThemeChange={setThemeMode}
                            lang={langSetting}
                            onLangChange={setLang}
                            user={user}
                            userProfile={userProfile}
                            onSignOut={() => {
                                setIsSettingsModalOpen(false);
                                handleSignOut();
                            }}
                            onDeleteAccount={handleDeleteAccount}
                            updateProfile={updateProfile}
                            t={t}
                            currentLang={state.currentLang}
                            imageCount={state.imageCount}
                            imageLimit={state.imageLimit}
                            storageAutoDelete={state.storageAutoDelete}
                            onStorageAutoDeleteChange={actions.handleStorageAutoDeleteChange}
                            onChangePassword={() => {
                                setIsSettingsModalOpen(false);
                                setAuthModalMode('update-password');
                                setIsAuthModalOpen(true);
                            }}
                        />
                    )}
                </Suspense>
                <Suspense fallback={null}>
                    {infoImageId && (() => {
                        const infoImg = allImages.find(i => i.id === infoImageId);
                        return infoImg ? (
                            <ImageInfoModal
                                image={infoImg}
                                onClose={() => setInfoImageId(null)}
                                onUpdateImageTitle={actions.handleUpdateImageTitle}
                                onGenerateMore={(id) => { actions.handleGenerateMore(id); setInfoImageId(null); }}
                                t={t}
                                currentLang={langSetting as 'de' | 'en'}
                            />
                        ) : null;
                    })()}
                </Suspense>
            </ModalErrorBoundary>

            <VoiceUploadModal
                isOpen={isVoiceUploadOpen}
                onClose={() => setIsVoiceUploadOpen(false)}
                onUpload={async (files) => {
                    setIsVoiceUploadOpen(false);
                    const arr = Array.from(files);
                    if (arr.length === 1) {
                        const id = await actions.processFile(arr[0]);
                        if (id) {
                            setDetailSideSheetVisible(true);
                            isNavigatingProgrammatically.current = true;
                            navigate(`/image/${id}`);
                        }
                    } else {
                        arr.forEach(f => actions.processFile(f));
                    }
                }}
                lang={langSetting as 'de' | 'en'}
            />
        </div>
    );
}
