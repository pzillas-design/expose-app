
import React from 'react';
import { ImageItem } from './components/ImageItem';
import { CommandDock } from './components/CommandDock';
import { SettingsModal } from './components/SettingsModal';
import { CreditModal } from './components/CreditModal';
import { SideSheet } from './components/SideSheet';
import { useNanoController } from './hooks/useNanoController';
import { Plus } from 'lucide-react';

export function App() {
  const { state, actions, refs } = useNanoController();
  const { 
    rows, selectedId, zoom, credits, activeTab, brushSize, isDragOver, 
    isSettingsOpen, isCreditModalOpen, selectedImage 
  } = state;
  const {
    smoothZoomTo, handleScroll, handleFileDrop, processFile, selectAndSnap,
    moveSelection, handleAddFunds, setBrushSize, handleTabChange, handleGenerate,
    handleGenerateMore, handleNavigateParent,
    handleUpdateAnnotations, handleDeleteImage, setIsSettingsOpen, setIsCreditModalOpen, setIsDragOver
  } = actions;

  return (
    <div className="flex h-screen w-screen bg-[#111] overflow-hidden text-zinc-300 font-sans selection:bg-white selection:text-black">
      
      {/* Command Dock */}
      <div className="fixed top-6 left-6 z-50">
          <CommandDock 
             zoom={zoom} 
             credits={credits} 
             onZoomChange={smoothZoomTo} 
             onNavigate={moveSelection} 
             onOpenSettings={() => setIsSettingsOpen(true)} 
             onOpenCreditModal={() => setIsCreditModalOpen(true)} 
          />
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={refs.scrollContainerRef}
        className="flex-1 relative h-full overflow-auto snap-both snap-mandatory no-scrollbar bg-[#111] overscroll-none"
        onScroll={handleScroll}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
      >
        <div 
            className="min-w-full min-h-full w-max h-max flex flex-col items-start z-10 relative will-change-transform"
            style={{ 
                padding: '50vh 50vw',
                backgroundImage: `radial-gradient(#333 1px, transparent 1px)`,
                backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                backgroundPosition: 'center',
                gap: `${6 * zoom}rem`, 
            }}
        >
            {rows.map((row) => (
                <div key={row.id} data-row-id={row.id} className="flex flex-col gap-4 shrink-0">
                    <input 
                        value={row.title} 
                        onChange={(e) => {
                            // Quick implementation for title edit
                            state.setRows(p => p.map(r => r.id === row.id ? {...r, title: e.target.value} : r))
                        }} 
                        className="bg-transparent text-xs font-medium uppercase tracking-[0.2em] text-zinc-600 focus:text-white outline-none border-none w-96 ml-1" 
                    />
                    <div className="flex items-center" style={{ gap: `${3 * zoom}rem` }}>
                        {row.items.map((img) => (
                            <ImageItem
                                key={img.id}
                                image={img}
                                zoom={zoom}
                                isSelected={selectedId === img.id}
                                onMouseDown={(e, id) => { e.stopPropagation(); selectAndSnap(id); }}
                                onRetry={handleGenerateMore}
                                onChangePrompt={handleNavigateParent}
                                // Pass Editor State
                                editorState={{ activeTab, brushSize }}
                                onUpdateAnnotations={handleUpdateAnnotations}
                            />
                        ))}
                    </div>
                </div>
            ))}
            {/* Upload Placeholder (New Row) */}
            {rows.length > 0 && (
                <div className="ml-1 mt-16 flex flex-col items-center justify-center p-8 opacity-60 hover:opacity-100 transition-all">
                    <label className="flex items-center gap-2 cursor-pointer group p-2">
                         <Plus className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                         <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">Upload Image</span>
                         <input type="file" accept="image/*" className="hidden" multiple onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((f) => processFile(f as File)); }} />
                    </label>
                </div>
            )}
        </div>
        {/* Empty State */}
        {rows.length === 0 && !isDragOver && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <label className="pointer-events-auto flex items-center gap-3 cursor-pointer group p-6 hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-300 transition-colors">Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" multiple onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((f) => processFile(f as File)); }} />
                </label>
             </div>
        )}
      </div>

      {/* Right Side Sheet (Persistent) */}
      <SideSheet 
          selectedImage={selectedImage}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onGenerate={handleGenerate}
          onUpdateAnnotations={handleUpdateAnnotations}
          onDeleteImage={handleDeleteImage}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreditModal isOpen={isCreditModalOpen} onClose={() => setIsCreditModalOpen(false)} onAddFunds={handleAddFunds} currentBalance={credits} />
    </div>
  );
}
