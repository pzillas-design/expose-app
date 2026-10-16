import React from 'react';
import { Repeat, Download, Info, Trash2, Maximize2, PanelRight, PanelBottom } from 'lucide-react';
import type { DropdownItem } from '@/components/ui/DropdownMenu';
import type { DetailLayout } from '@/utils/uiPrefs';

/**
 * Die Eintraege des Bildmenues — an EINER Stelle.
 *
 * Es gibt zwei Orte, an denen dieses Menue erscheint: im Blatt der
 * Detailansicht (Desktop) und in der Navigationsleiste (Handy). Beide zeigen
 * dasselbe. Haette jeder seine eigene Liste, liefen sie auseinander — das ist
 * in dieser Anwendung oft genug passiert, um es nicht noch einmal zu tun.
 */
export interface DetailMenuOptions {
    t: (key: string) => string;
    /** Ohne Prompt am Bild gibt es nichts zu wiederholen. */
    hasPrompt: boolean;
    /** Auf dem Handy gibt es nur eine Anordnung, also auch keinen Eintrag dafuer. */
    isMobile: boolean;
    isSideSheetVisible: boolean;
    detailLayout: DetailLayout;
    setDetailLayout: (l: DetailLayout) => void;
    onToggleSideSheet?: () => void;
    onRegenerate?: () => void;
    onDownload?: () => void;
    onInfo?: () => void;
    onDelete?: () => void;
    /** Der Sprachassistent, falls freigeschaltet — kommt von aussen, weil er global ist. */
    voiceItems?: DropdownItem[];
    /** Schliesst das Menue. Der Ansichtsmodus ruft das bewusst NICHT auf. */
    close: () => void;
}

export const buildDetailMenuItems = (o: DetailMenuOptions): DropdownItem[] => [
    /*
        Drei Gruppen, nach Art der Sache:

        1. Was man MIT DIESEM BILD tut — erzeugen, sichern, nachsehen.
        2. Wie man ARBEITET — Ansicht und Sprache. Das aendert nicht das Bild,
           sondern die Umgebung.
        3. Was sich nicht rueckgaengig machen laesst.
    */
    ...(o.hasPrompt ? [{
        label: o.t('generate_more') || 'Mehr generieren',
        icon: <Repeat className="w-4 h-4" />,
        onClick: () => { o.close(); o.onRegenerate?.(); },
    }] : []),
    { label: o.t('nav_download'), icon: <Download className="w-4 h-4" />, onClick: () => { o.close(); o.onDownload?.(); } },
    { label: o.t('nav_info'), icon: <Info className="w-4 h-4" />, onClick: () => { o.close(); o.onInfo?.(); } },

    // Die Eingabe-Anordnung: ein Eintrag, drei Zustaende. Das Menue bleibt beim
    // Klick OFFEN — bei einem Rundlauf aus drei Ansichten ist Zumachen nach
    // jedem Schritt das Gegenteil von hilfreich.
    ...(o.isMobile ? [] : [{
        label: !o.isSideSheetVisible
            ? (o.t('view_fullscreen') || 'Ansicht: Vollbild')
            : o.detailLayout === 'column'
                ? (o.t('view_columns') || 'Ansicht: Spalten')
                : (o.t('view_rows') || 'Ansicht: Zeilen'),
        icon: !o.isSideSheetVisible
            ? <Maximize2 className="w-4 h-4" />
            : o.detailLayout === 'column'
                ? <PanelRight className="w-4 h-4" />
                : <PanelBottom className="w-4 h-4" />,
        separator: true,
        onClick: () => {
            if (!o.isSideSheetVisible) { o.setDetailLayout('column'); o.onToggleSideSheet?.(); }
            else if (o.detailLayout === 'column') o.setDetailLayout('row');
            else o.onToggleSideSheet?.();
        },
    }]),
    ...(o.voiceItems ?? []).map(v => ({ ...v, onClick: () => { o.close(); v.onClick(); } })),

    { label: o.t('nav_delete'), icon: <Trash2 className="w-4 h-4" />, onClick: () => { o.close(); o.onDelete?.(); }, danger: true, separator: true },
];
