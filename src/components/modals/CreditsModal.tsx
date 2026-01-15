import React, { useState } from 'react';
import { Button, Typo, Theme, IconButton } from '@/components/ui/DesignSystem';
import { TranslationFunction } from '@/types';
import { X, Wallet, Loader2, Check } from 'lucide-react';

interface CreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onAddFunds: (amount: number) => Promise<void>;
    t: TranslationFunction;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({
    isOpen,
    onClose,
    currentBalance,
    onAddFunds,
    t
}) => {
    const [customAmount, setCustomAmount] = useState('');
    const [isTopUpExpanded, setIsTopUpExpanded] = useState(false);
    const [showMinError, setShowMinError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAddFundsConfirm = async () => {
        const finalAmount = parseFloat(customAmount);
        if (!finalAmount || finalAmount < 5) {
            setShowMinError(true);
            return;
        }
        setIsProcessing(true);
        try {
            await onAddFunds(finalAmount);
            setIsTopUpExpanded(false);
            setCustomAmount('');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] bg-zinc-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`
                    w-full max-w-md ${Theme.Colors.ModalBg} 
                    border ${Theme.Colors.Border} ${Theme.Geometry.RadiusLg} 
                    shadow-2xl flex flex-col animate-in zoom-in-95 duration-200
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-2">
                    <h2 className={`${Typo.H2} text-xl ${Theme.Colors.TextHighlight}`}>{t('balance') || 'Guthaben'}</h2>
                    <IconButton icon={<X className="w-5 h-5" />} onClick={onClose} />
                </div>

                <div className="p-8 flex flex-col gap-8">
                    {/* Balanced Display */}
                    <div className="text-center space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{t('current_balance') || 'Aktuelles Guthaben'}</span>
                        <div className="text-5xl font-mono font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                            {(currentBalance || 0).toFixed(2)}<span className="text-2xl text-zinc-300 dark:text-zinc-700 ml-2">€</span>
                        </div>
                    </div>

                    <div className="w-full">
                        {!isTopUpExpanded ? (
                            <Button
                                onClick={() => setIsTopUpExpanded(true)}
                                variant="primary"
                                className="w-full h-12"
                            >
                                {t('top_up') || 'Guthaben aufladen'}
                            </Button>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="relative group">
                                    <div className="flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-950 group-focus-within:border-zinc-400 dark:group-focus-within:border-zinc-600 transition-colors">
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                    setCustomAmount(val);
                                                    if (showMinError) setShowMinError(false);
                                                }
                                            }}
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-center text-3xl font-medium outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-700 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                                            autoFocus
                                        />
                                        <span className="text-zinc-400 ml-1 text-2xl font-light">€</span>
                                    </div>
                                    <button
                                        onClick={() => setIsTopUpExpanded(false)}
                                        className="absolute -top-2.5 -right-2.5 p-1.5 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-300 hover:text-black dark:hover:text-white transition-colors shadow-sm"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <Button
                                    onClick={handleAddFundsConfirm}
                                    className="w-full h-12"
                                    disabled={isProcessing}
                                    icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                >
                                    {isProcessing ? t('processing') : (customAmount ? `${t('checkout_pay')?.replace('{{amount}}', '') || 'Bezahlen'} ${parseFloat(customAmount).toFixed(2)} €` : t('checkout_btn') || 'Jetzt aufladen')}
                                </Button>

                                {showMinError && <p className="text-[10px] text-red-500 text-center font-medium">{t('checkout_min_amount') || 'Mindestbetrag ist 5.00 €'}</p>}
                            </div>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
};
