import React, { useState } from 'react';
import { Button, Theme } from '@/components/ui/DesignSystem';
import { Modal } from '@/components/ui/Modal';
import { TranslationFunction } from '@/types';
import { X, Loader2, Plus } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

interface CreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onAddFunds: (amount: number) => Promise<void>;
    isReduced?: boolean;
    t: TranslationFunction;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({
    isOpen,
    onClose,
    currentBalance,
    onAddFunds,
    isReduced = false,
    t
}) => {
    const [customAmount, setCustomAmount] = useState('');
    const [isTopUpExpanded, setIsTopUpExpanded] = useState(false);
    const [showMinError, setShowMinError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Animate the balance counter
    const animatedBalance = useAnimatedCounter(currentBalance ?? 0, 800);

    // Reset state when modal is closed
    React.useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setIsTopUpExpanded(false);
                setCustomAmount('');
                setShowMinError(false);
            }, 300); // Wait for close animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleAddFundsConfirm = async () => {
        const finalAmount = parseFloat(customAmount.replace(',', '.'));
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('balance') || 'Guthaben'}>
            <div className={`p-8 flex flex-col transition-all duration-500 ease-in-out ${isTopUpExpanded ? 'gap-2' : 'gap-8'}`}>
                <div className={`text-center space-y-2 transition-all duration-500 ease-in-out ${isTopUpExpanded ? 'py-1' : 'py-6'}`}>
                    <div className={`font-mono font-medium tracking-tight text-zinc-900 dark:text-zinc-100 transition-all duration-500 ease-in-out`}
                        style={{ fontSize: isTopUpExpanded ? '1.5rem' : '3.75rem', lineHeight: isTopUpExpanded ? '2rem' : '1' }}>
                        {animatedBalance.toFixed(2)}<span className="text-zinc-300 dark:text-zinc-700 ml-2 transition-all duration-500 ease-in-out"
                            style={{ fontSize: isTopUpExpanded ? '1.25rem' : '3rem' }}>€</span>
                    </div>
                </div>

                <div className="w-full">
                    {!isReduced && (!isTopUpExpanded ? (
                        <Button
                            onClick={() => setIsTopUpExpanded(true)}
                            variant="primary"
                            className="w-full h-12"
                        >
                            {t('top_up') || 'Guthaben aufladen'}
                        </Button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="py-2">
                                <div className="flex items-center justify-center gap-1 py-2 bg-transparent transition-colors">
                                    <Plus className="w-10 h-10 text-zinc-300 dark:text-zinc-700 font-light shrink-0" />
                                    <div className="relative flex items-baseline">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={customAmount}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(',', '.');
                                                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                    setCustomAmount(e.target.value);
                                                    const numericVal = parseFloat(val);
                                                    if (val !== '' && !isNaN(numericVal) && numericVal < 5) {
                                                        setShowMinError(true);
                                                    } else {
                                                        setShowMinError(false);
                                                    }
                                                }
                                            }}
                                            placeholder="0"
                                            style={{ width: `${customAmount.length || 1}ch` }}
                                            className="bg-transparent text-center text-5xl font-mono font-medium outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-700 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                                            autoFocus
                                        />
                                        <span className="text-zinc-300 dark:text-zinc-700 text-5xl font-mono ml-1 shrink-0">€</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {showMinError && <p className="text-[10px] text-red-500 text-center font-medium animate-in fade-in slide-in-from-bottom-1">{t('checkout_min_amount') || 'Mindestbetrag ist 5.00 €'}</p>}
                                <Button
                                    onClick={handleAddFundsConfirm}
                                    className="w-full h-12"
                                    disabled={isProcessing}
                                    icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                                >
                                    {isProcessing ? t('processing') : (customAmount ? `${t('checkout_pay') || 'Pay Now'}: ${customAmount.replace('.', ',')} €` : t('checkout_btn') || 'Top Up')}
                                </Button>
                            </div>
                        </div>
                    )
                    )}
                </div>
            </div>
        </Modal>
    );
};
