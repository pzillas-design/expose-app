
import React, { useRef, useState } from 'react';
import { ZoomOut, ZoomIn, Menu, Upload, Plus, Home, Sparkles, ImagePlus } from 'lucide-react';
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
  onUpload,
  onCreateNew,
  t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

      {/* 1. Home */}
      <div className="flex items-center px-0.5">
        <IconButton
          icon={<Home className="w-4 h-4" />}
          onClick={onHome}
          tooltip={t('back_to_boards')}
          className="w-8 h-8 flex items-center justify-center p-0"
        />
      </div>

      <div className={`w-px h-5 ${Theme.Colors.BorderSubtle} border-r mx-0.5`} />

      {/* 2. Credits (Balance) */}
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
            {credits.toFixed(2)} €
          </button>
        </Tooltip>
      </div>

      <div className={`w-px h-5 ${Theme.Colors.BorderSubtle} border-r mx-0.5`} />

      {/* 3. Zoom */}
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

      <div className={`w-px h-5 ${Theme.Colors.BorderSubtle} border-r mx-0.5`} />

      {/* 4. Create Menu */}
      <div className="relative">
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)} />
        )}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`
            w-8 h-8 flex items-center justify-center rounded-md transition-all
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            ${isMenuOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}
          `}
        >
          <div className="scale-90 transition-transform group-hover:scale-100">
            <Plus className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          </div>
        </button>

        {isMenuOpen && (
          <div className={`
            absolute top-full right-0 mt-2 min-w-[240px] z-50 p-1.5 
            ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} shadow-xl 
            flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right
          `}>
            <button
              onClick={() => { handleUploadClick(); setIsMenuOpen(false); }}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                hover:bg-zinc-100 dark:hover:bg-zinc-800
              `}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="flex flex-col">
                <span className={`${Typo.Body} font-medium`}>{t('upload_image') || 'Bild hochladen'}</span>
                <span className={`${Typo.Micro} text-zinc-500`}>{t('upload_image_desc') || 'Bearbeiten & Erweitern'}</span>
              </div>
            </button>

            <button
              onClick={() => { onCreateNew(); setIsMenuOpen(false); }}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                hover:bg-zinc-100 dark:hover:bg-zinc-800
              `}
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className={`${Typo.Body} font-medium`}>{t('generate_new') || 'Neues Bild generieren'}</span>
                <span className={`${Typo.Micro} text-zinc-500`}>{t('generate_new_desc') || 'Mit KI erstellen'}</span>
              </div>
            </button>
          </div>
        )}
      </div>


    </div>
  );
};
