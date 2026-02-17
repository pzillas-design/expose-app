import React, { useState } from 'react';
import { PromptTemplate, TranslationFunction } from '@/types';
import { Button, Theme, Typo, IconButton, Tooltip } from '@/components/ui/DesignSystem';
import { X, Copy, Mail, Check, MessageCircle } from 'lucide-react';
import { getWhatsAppShareLink, getEmailShareLink, getTemplateShareUrl } from '@/utils/shareUtils';
import { useToast } from '@/components/ui/Toast';

interface PresetShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: PromptTemplate;
    t: TranslationFunction;
    currentLang: 'de' | 'en';
}

export const PresetShareModal: React.FC<PresetShareModalProps> = ({
    isOpen,
    onClose,
    template,
    t,
    currentLang
}) => {
    const { showToast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const shareUrl = getTemplateShareUrl(template);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        showToast(currentLang === 'de' ? 'Link kopiert!' : 'Link copied!', 'success');
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        window.open(getWhatsAppShareLink(template, currentLang), '_blank');
    };

    const handleEmail = () => {
        window.location.href = getEmailShareLink(template, currentLang);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[110] bg-zinc-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`
                    w-full max-w-sm 
                    ${Theme.Colors.ModalBg} border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl flex flex-col overflow-hidden
                    animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className={`${Typo.H2} text-lg ${Theme.Colors.TextHighlight}`}>
                        {currentLang === 'de' ? 'Vorlage teilen' : 'Share Template'}
                    </h2>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="px-6 pb-8 pt-4 flex flex-col gap-6">
                    <div className={`p-4 ${Theme.Colors.PanelBg} border ${Theme.Colors.Border} ${Theme.Geometry.Radius} flex flex-col gap-1 items-center bg-zinc-50/50 dark:bg-white/5`}>
                        <Typo.Body className="font-medium text-zinc-900 dark:text-zinc-100">{template.title}</Typo.Body>
                        <Typo.Micro className="text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{currentLang === 'de' ? 'PROMPT VORLAGE' : 'PROMPT PRESET'}</Typo.Micro>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={handleWhatsApp}
                            className={`flex items-center gap-3 w-full p-4 ${Theme.Geometry.Radius} bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-all group`}
                        >
                            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-sm">
                                <MessageCircle className="w-5 h-5 fill-white" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-bold">WhatsApp</span>
                                <span className={`text-[11px] opacity-70`}>{currentLang === 'de' ? 'Senden an Freunde' : 'Send to friends'}</span>
                            </div>
                        </button>

                        <button
                            onClick={handleEmail}
                            className={`flex items-center gap-3 w-full p-4 ${Theme.Geometry.Radius} bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white transition-all`}
                        >
                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-bold">Email</span>
                                <span className={`text-[11px] opacity-70`}>{currentLang === 'de' ? 'Als Link verschicken' : 'Send as link'}</span>
                            </div>
                        </button>

                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-3 w-full p-4 ${Theme.Geometry.Radius} bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-all`}
                        >
                            <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center">
                                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-bold">{currentLang === 'de' ? 'Link kopieren' : 'Copy link'}</span>
                                <span className={`text-[11px] opacity-70`}>{currentLang === 'de' ? 'In die Zwischenablage' : 'To clipboard'}</span>
                            </div>
                        </button>
                    </div>

                    <Typo.Micro className="text-center text-zinc-400 dark:text-zinc-500 leading-relaxed">
                        {currentLang === 'de'
                            ? 'Jeder mit diesem Link kann deine Vorlage direkt in exposé importieren.'
                            : 'Anyone with this link can import your template directly into exposé.'}
                    </Typo.Micro>
                </div>
            </div>
        </div>
    );
};
