
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
  onUpload?: (files: FileList) => void;
  t: TranslationFunction;
}

export const CommandDock: React.FC<CommandDockProps> = ({
  zoom,
  credits,
  onZoomChange,
  onOpenSettings,
  onOpenCredits,
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
    <div className={`flex items-center gap-1 p-1 ${Theme.Effects.Glass} border ${Theme.Colors.Border} ${Theme.Geometry.Radius}`}>

      {/* Zoom - Icons Only, No Text */}
      <div className="flex items-center gap-1 px-1">
        <IconButton icon={<ZoomOut className="w-3.5 h-3.5" />} onClick={() => onZoomChange(zoom / 1.2)} className="p-1.5" tooltip={t('zoom_out')} />
        <IconButton icon={<ZoomIn className="w-3.5 h-3.5" />} onClick={() => onZoomChange(zoom * 1.2)} className="p-1.5" tooltip={t('zoom_in')} />
      </div>

      <div className={`w-px h-4 ${Theme.Colors.BorderSubtle} border-r mx-1`} />

      {/* Credits Display */}
      <div className="flex items-center gap-1 px-2">
        <Tooltip text={t('manage_credits')}>
          <button
            onClick={onOpenCredits}
            className={`min-w-[3rem] text-center select-none transition-colors cursor-pointer hover:${Theme.Colors.TextHighlight} ${Typo.Mono}`}
          >
            {credits.toFixed(2)} €
          </button>
        </Tooltip>
      </div>

      <div className={`w-px h-4 ${Theme.Colors.BorderSubtle} border-r mx-1`} />

      {/* Upload (Far Right) */}
      <div className="flex items-center gap-1 px-1">
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
          className={`flex items-center gap-2 px-3 py-1.5 ${Theme.Colors.SurfaceSubtle} hover:${Theme.Colors.Surface} border ${Theme.Colors.Border} ${Theme.Geometry.Radius} transition-all group`}
        >
          <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
          <span className={`${Typo.Label} text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors uppercase !text-[10px] tracking-widest`}>Foto</span>
        </button>
      </div>

    </div>
  );
};
