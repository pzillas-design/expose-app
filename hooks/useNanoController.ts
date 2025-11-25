
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { CanvasImage, ImageRow, AnnotationObject } from '../types';
import { editImageWithGemini } from '../services/geminiService';
import { generateMaskFromAnnotations } from '../utils/maskGenerator';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const GENERATION_COST = 0.50;

export const useNanoController = () => {
  // --- Data State ---
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [credits, setCredits] = useState<number>(() => {
      const saved = localStorage.getItem('nano_credits');
      return saved ? parseFloat(saved) : 10.00;
  });

  // --- Editor State (Global for SideSheet) ---
  const [activeTab, setActiveTab] = useState<'prompt' | 'brush' | 'objects'>('prompt');
  const [brushSize, setBrushSize] = useState(150);

  // --- UI State ---
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  
  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const focusCheckRafRef = useRef<number | null>(null);
  const zoomAnimFrameRef = useRef<number | null>(null);
  const lastRequestedIdRef = useRef<string | null>(null);
  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<number | null>(null);
  
  // Derived
  const allImages = rows.flatMap(r => r.items);
  const selectedImage = allImages.find(img => img.id === selectedId) || null;

  // --- Helpers ---
  const generateId = () => Math.random().toString(36).substring(2, 9);
  
  useEffect(() => { 
      localStorage.setItem('nano_credits', credits.toFixed(2)); 
  }, [credits]);
  
  const handleAddFunds = (amount: number) => setCredits(prev => prev + amount);

  useEffect(() => {
     if (!isAutoScrollingRef.current) lastRequestedIdRef.current = selectedId;
  }, [selectedId]);

  const selectAndSnap = useCallback((id: string) => {
      isAutoScrollingRef.current = true;
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
      // This timeout prevents handleScroll from firing while the smooth scroll animation runs
      autoScrollTimeoutRef.current = window.setTimeout(() => { isAutoScrollingRef.current = false; }, 800);
      lastRequestedIdRef.current = id;
      setSelectedId(id);
  }, []);

  // --- Zoom Logic ---
  const smoothZoomTo = useCallback((target: number) => {
      const clampedTarget = Math.min(Math.max(target, MIN_ZOOM), MAX_ZOOM);
      const startZoom = zoom;
      const startTime = performance.now();
      const duration = 300;
      if (zoomAnimFrameRef.current) cancelAnimationFrame(zoomAnimFrameRef.current);
      const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const nextZoom = startZoom + (clampedTarget - startZoom) * ease;
          setZoom(nextZoom);
          if (progress < 1) zoomAnimFrameRef.current = requestAnimationFrame(animate);
          else { setZoom(clampedTarget); zoomAnimFrameRef.current = null; }
      };
      zoomAnimFrameRef.current = requestAnimationFrame(animate);
  }, [zoom]);

  const handleTabChange = (newTab: 'prompt' | 'brush' | 'objects') => {
      setActiveTab(newTab);
      if (newTab === 'brush' || newTab === 'objects') {
          if (selectedImage) {
              const sidebarWidth = 360;
              const availableWidth = Math.max(window.innerWidth - sidebarWidth, 100);
              const availableHeight = Math.max(window.innerHeight, 100);

              const scaleX = availableWidth / selectedImage.width;
              const scaleY = availableHeight / selectedImage.height;

              const fitZoom = Math.min(scaleX, scaleY) * 0.9;
              
              smoothZoomTo(fitZoom);
          } else {
              smoothZoomTo(1.0);
          }
      } else if (newTab === 'prompt') {
          smoothZoomTo(1.0);
      }
  };

  // --- Scroll Logic ---
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isAutoScrollingRef.current) return;
    const container = scrollContainerRef.current;
    if (focusCheckRafRef.current) cancelAnimationFrame(focusCheckRafRef.current);

    focusCheckRafRef.current = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const viewportCenterX = containerRect.left + (containerRect.width / 2);
        const viewportCenterY = containerRect.top + (containerRect.height / 2);
        const rowElements = container.querySelectorAll('[data-row-id]');
        let closestRow: Element | null = null;
        let minRowDist = Infinity;
        rowElements.forEach((rowEl) => {
            const rect = rowEl.getBoundingClientRect();
            const dist = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
            if (dist < minRowDist) { minRowDist = dist; closestRow = rowEl; }
        });
        if (!closestRow) return;
        const imagesInRow = closestRow.querySelectorAll('[data-image-id]');
        let closestImageId: string | null = null;
        let minImgDist = Infinity;
        imagesInRow.forEach((img) => {
            const rect = img.getBoundingClientRect();
            const dist = Math.abs((rect.left + rect.width / 2) - viewportCenterX);
            if (dist < minImgDist) { minImgDist = dist; closestImageId = img.getAttribute('data-image-id'); }
        });
        
        if (closestImageId && selectedId !== closestImageId) {
            setSelectedId(closestImageId);
        }
    });
  }, [selectedId]);

  // This is the single source of truth for scrolling to a selected image.
  // It only scrolls if the selection was "programmatic" (e.g., a click),
  // not when it's the result of a manual scroll.
  useLayoutEffect(() => {
    if (selectedId && isAutoScrollingRef.current) {
        // Delay to allow DOM to update, especially for new items
        setTimeout(() => {
            const el = document.querySelector(`[data-image-id="${selectedId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }, 50);
    }
  }, [selectedId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault(); e.stopPropagation();
            if (zoomAnimFrameRef.current) { cancelAnimationFrame(zoomAnimFrameRef.current); zoomAnimFrameRef.current = null; }
            const delta = -e.deltaY;
            setZoom(z => Math.min(Math.max(z * Math.exp(delta * 0.008), MIN_ZOOM), MAX_ZOOM));
        }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // --- Navigation & File Handling ---
  const moveSelection = useCallback((direction: -1 | 1) => {
      if (allImages.length === 0) return;
      const currentId = lastRequestedIdRef.current || selectedId; 
      let nextIndex = 0;
      if (currentId) {
          const currentIndex = allImages.findIndex(img => img.id === currentId);
          if (currentIndex !== -1) nextIndex = currentIndex + direction;
      }
      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex >= allImages.length) nextIndex = allImages.length - 1;
      selectAndSnap(allImages[nextIndex].id);
  }, [allImages, selectedId, selectAndSnap]);

  const moveRowSelection = useCallback((direction: -1 | 1) => {
      const currentId = lastRequestedIdRef.current || selectedId;
      if (!currentId) { if (rows.length > 0 && rows[0].items.length > 0) selectAndSnap(rows[0].items[0].id); return; }
      let rowIndex = -1, colIndex = -1;
      for (let r = 0; r < rows.length; r++) {
          const index = rows[r].items.findIndex(item => item.id === currentId);
          if (index !== -1) { rowIndex = r; colIndex = index; break; }
      }
      if (rowIndex === -1) return;
      const targetRowIndex = rowIndex + direction;
      if (targetRowIndex >= 0 && targetRowIndex < rows.length) {
          const targetRow = rows[targetRowIndex];
          if (targetRow.items.length === 0) return;
          const targetColIndex = Math.min(colIndex, targetRow.items.length - 1);
          selectAndSnap(targetRow.items[targetColIndex].id);
      }
  }, [rows, selectedId, selectAndSnap]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let w = img.width, h = img.height;
                const maxDim = 500; 
                if (w > maxDim || h > maxDim) { const ratio = w / h; if (w > h) { w = maxDim; h = maxDim / ratio; } else { h = maxDim; w = maxDim * ratio; } }
                const baseName = file.name.replace(/\.[^/.]+$/, "");
                const newImage: CanvasImage = {
                    id: generateId(),
                    src: event.target!.result as string,
                    width: w, height: h,
                    title: baseName, baseName: baseName,
                    version: 1, isGenerating: false, originalSrc: event.target!.result as string
                };
                setRows(prev => [...prev, { id: generateId(), title: baseName, items: [newImage] }]);
                selectAndSnap(newImage.id);
            };
        }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    files.forEach((file, index) => processFile(file));
  };

  const handleDeleteImage = (id: string) => {
      setRows(prev => {
          const newRows = prev.map(row => ({
              ...row,
              items: row.items.filter(item => item.id !== id)
          })).filter(row => row.items.length > 0);
          
          if (newRows.length === 0) setSelectedId(null);
          return newRows;
      });
      if (selectedId === id) setSelectedId(null);
  };

  const handleUpdateAnnotations = (id: string, newAnnotations: AnnotationObject[]) => {
      setRows(prev => prev.map(row => ({
          ...row,
          items: row.items.map(item => item.id === id ? { ...item, annotations: newAnnotations } : item)
      })));
  };

  // --- Core Generation Logic ---
  const performGeneration = async (sourceImage: CanvasImage, prompt: string) => {
      if (credits < GENERATION_COST) { setIsCreditModalOpen(true); return; }
      
      const rowIndex = rows.findIndex(row => row.items.some(item => item.id === sourceImage.id));
      if (rowIndex === -1) return;
      
      const row = rows[rowIndex];
      const sourceIndex = row.items.findIndex(item => item.id === sourceImage.id);
      
      setCredits(prev => prev - GENERATION_COST);

      const maskDataUrl = await generateMaskFromAnnotations(sourceImage);

      const baseName = sourceImage.baseName || sourceImage.title;
      const newVersion = (sourceImage.version || 1) + 1;
      const newId = generateId();
      
      const placeholder: CanvasImage = {
          ...sourceImage,
          id: newId,
          title: `${baseName}_v${newVersion}`,
          version: newVersion,
          isGenerating: true,
          generationStartTime: Date.now(),
          maskSrc: undefined,
          annotations: [], 
          parentId: sourceImage.id,
          generationPrompt: prompt,
      };

      // Add placeholder
      setRows(prev => {
          const newRows = [...prev];
          const currentRow = newRows[rowIndex];
          const newItems = [...currentRow.items];
          newItems.splice(sourceIndex + 1, 0, placeholder); 
          newRows[rowIndex] = { ...currentRow, items: newItems };
          return newRows;
      });
      
      // Focus on new item
      selectAndSnap(newId);

      try {
          const newSrc = await editImageWithGemini(sourceImage.src, prompt, maskDataUrl || undefined);
          setRows(prev => {
              const newRows = [...prev];
              const currentRow = newRows[rowIndex];
              const updated = currentRow.items.map(i => i.id === newId ? { ...i, src: newSrc, isGenerating: false } : i);
              newRows[rowIndex] = { ...currentRow, items: updated };
              return newRows;
          });
      } catch (error) {
          alert("Generation failed.");
          setRows(prev => {
              const newRows = [...prev];
              newRows[rowIndex] = { ...newRows[rowIndex], items: newRows[rowIndex].items.filter(i => i.id !== newId) };
              return newRows;
          });
          selectAndSnap(sourceImage.id); // Go back to source if failed
      }
  };

  const handleGenerate = (prompt: string) => {
      if (!selectedImage) return;
      performGeneration(selectedImage, prompt);
  };

  const handleGenerateMore = (id: string) => {
      const item = allImages.find(i => i.id === id);
      if (!item || !item.parentId) return;
      
      const parent = allImages.find(i => i.id === item.parentId);
      if (!parent) return;

      // Generate a new variation using the parent as source, but current item's prompt
      const promptToUse = item.generationPrompt || "";
      performGeneration(parent, promptToUse);
  };

  const handleNavigateParent = (id: string) => {
      const item = allImages.find(i => i.id === id);
      if (item && item.parentId) {
          selectAndSnap(item.parentId);
      }
  };

  // --- Keyboard ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveRowSelection(-1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); moveRowSelection(1); }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); smoothZoomTo(zoom * 1.2); }
        if (e.key === '-' || e.key === '_') { e.preventDefault(); smoothZoomTo(zoom / 1.2); }
        if (e.key === '0') { e.preventDefault(); smoothZoomTo(1); }
        if (e.key === 'Delete' && selectedId) { handleDeleteImage(selectedId); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveSelection, moveRowSelection, smoothZoomTo, zoom, selectedId, handleDeleteImage]);

  return {
    state: {
      rows,
      setRows,
      selectedId,
      zoom,
      credits,
      activeTab,
      brushSize,
      isDragOver,
      isSettingsOpen,
      isCreditModalOpen,
      selectedImage,
      allImages
    },
    actions: {
      setZoom,
      smoothZoomTo,
      handleScroll,
      handleFileDrop,
      processFile,
      selectAndSnap,
      moveSelection,
      handleAddFunds,
      setBrushSize,
      handleTabChange,
      handleGenerate,
      handleGenerateMore,
      handleNavigateParent,
      handleUpdateAnnotations,
      handleDeleteImage,
      setIsSettingsOpen,
      setIsCreditModalOpen,
      setIsDragOver
    },
    refs: {
      scrollContainerRef
    }
  };
};
