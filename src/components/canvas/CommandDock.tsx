
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ZoomOut, ZoomIn, Menu, Upload, Plus, Home, Sparkles, Pencil } from 'lucide-react';
import { IconButton, Typo, Theme, Tooltip } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';

interface CommandDockProps {
  zoom: number;
  credits: number;
  onZoomChange: (targetZoom: number) => void;
  onNavigate?: (direction: -1 | 1) => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onHome: () => void;
  onAnnotate: () => void;
  isAnnotationMode: boolean;
  onUpload?: (files: FileList) => void;
  onCreateNew: () => void;
  t: TranslationFunction;
}

export const CommandDock: React.FC<CommandDockProps> = ({
  zoom,
  credits,
  onZoomChange,
  onOpenSettings,
  onOpenCredits,
  onHome,
  onAnnotate,
  isAnnotationMode,
  onUpload,
  onCreateNew,
  t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onUpload) {
      onUpload(e.target.files);
    }
    // Reset input so same file can be selected again
    if (e.target) e.target.value = '';
  };

  return (
    <div className={`flex items-center gap-1.5 p-1.5 ${Theme.Effects.Glass} border ${Theme.Colors.Border} ${Theme.Geometry.Radius}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
      />

      {/* 1. Home */}
      <div className="flex items-center px-0.5">
        <Tooltip text={t('home')}>
          <Link
            to="/projects"
            onClick={(e) => {
              // Only prevent default if NOT using modifier keys (Cmd/Ctrl)
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                onHome();
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white"
          >
            <svg viewBox="0 0 256 256" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M40,216H216V120a8,8,0,0,0-2.34-5.66l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,40,120Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="20"
              />
            </svg>
          </Link>
        </Tooltip>
      </div>



      <div className={`w-px h-5 border-r border-zinc-200 dark:border-zinc-700 mx-0.5`} />

      {/* 2. Zoom */}
      <div className="flex items-center gap-0.5 px-0.5">
        <IconButton
          icon={<ZoomOut className="w-3.5 h-3.5" />}
          onClick={() => onZoomChange(zoom / 1.2)}
          className="w-8 h-8 flex items-center justify-center p-0"
          tooltip={t('zoom_out')}
        />
        <IconButton
          icon={<ZoomIn className="w-3.5 h-3.5" />}
          onClick={() => onZoomChange(zoom * 1.2)}
          className="w-8 h-8 flex items-center justify-center p-0"
          tooltip={t('zoom_in')}
        />
      </div>

      {/* 3. Credits (Balance) */}
      <div className="flex items-center px-0.5">
        <Tooltip text={t('manage_credits')}>
          <button
            onClick={onOpenCredits}
            className={`
              h-8 px-3 flex items-center justify-center rounded-md transition-all select-none
              hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white
              ${Typo.Mono}
            `}
          >
            {(credits || 0).toFixed(2)} €
          </button>
        </Tooltip>
      </div>

      {/* 4. Create Menu */}
      <div className="relative" ref={menuRef}>
        <Tooltip text={t('create_new') || 'Neu'}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`
              w-8 h-8 flex items-center justify-center rounded-md transition-all
              hover:bg-zinc-100 dark:hover:bg-zinc-800
              ${isMenuOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}
            `}
          >
            <div className="w-5 h-5 bg-black dark:bg-white rounded flex items-center justify-center shadow-sm">
              <Plus className="w-3.5 h-3.5 text-white dark:text-black" />
            </div>
          </button>
        </Tooltip>

        {isMenuOpen && (
          <div className={`
            absolute top-full left-0 mt-2 min-w-[200px] z-50 py-1
            bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 
            rounded-lg shadow-md ring-1 ring-black/5
            flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left
          `}>
            <button
              onClick={() => { handleUploadClick(); setIsMenuOpen(false); }}
              className={`
                flex items-center gap-3 px-4 py-2.5 
                hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors group w-full
              `}
            >
              <Upload className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
              <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-medium`}>
                {t('upload_image_edit') || 'Bild hochladen und bearbeiten'}
              </span>
            </button>

            <button
              onClick={() => { onCreateNew(); setIsMenuOpen(false); }}
              className={`
                flex items-center gap-3 px-4 py-2.5 
                hover:bg-black/5 dark:hover:bg-white/10 text-left transition-colors group w-full
              `}
            >
              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
              <span className={`${Typo.Body} text-zinc-600 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white font-medium`}>
                {t('generate_new') || 'Neues Bild generieren'}
              </span>
            </button>
          </div>
        )}
      </div>


    </div>
  );
};
