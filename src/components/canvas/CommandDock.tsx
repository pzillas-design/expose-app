
import React, { useRef } from 'react';
import { ZoomOut, ZoomIn, Menu, Upload, Plus, Home } from 'lucide-react';
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
  t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {/* 2. Credits */}
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

      {/* 4. Upload (Ghost Button) */}
      <div className="flex items-center px-0.5">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
        <button
          onClick={handleUploadClick}
          className="h-8 flex items-center gap-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all group"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
          <span className={`${Typo.Label} text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors uppercase !text-[10px] tracking-widest`}>Foto</span>
        </button>
      </div>

    </div>
  );
};
