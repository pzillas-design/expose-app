
import React, { useState, useEffect } from 'react';
import { X, Wallet } from 'lucide-react';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFunds: (amount: number) => void;
  currentBalance: number;
}

export const CreditModal: React.FC<CreditModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddFunds,
  currentBalance
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        setCustomAmount('');
        setSelectedPreset(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedPreset(null);
      const val = e.target.value;
      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
          setCustomAmount(val);
      }
  };

  const handleSelectPreset = (amount: number) => {
      setSelectedPreset(amount);
      setCustomAmount('');
  };

  const handleConfirm = () => {
      let finalAmount = 0;
      if (selectedPreset) {
          finalAmount = selectedPreset;
      } else if (customAmount) {
          finalAmount = parseFloat(customAmount);
      }

      if (finalAmount > 0) {
          onAddFunds(finalAmount);
          onClose();
      }
  };

  const isValid = selectedPreset !== null || (parseFloat(customAmount) > 0);

  return (
    <div 
        className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center animate-in fade-in duration-200"
        onClick={onClose}
    >
      <div 
        className="bg-[#09090b] border border-zinc-800 rounded-xl w-[380px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Unified with SettingsModal (No Border, p-6) */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <span className="text-lg font-medium text-white tracking-tight">Guthaben</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-8">
            
            {/* Minimalist Balance Display */}
            <div className="flex flex-col items-center justify-center py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Aktuell Verfügbar</span>
                <span className="text-5xl font-light text-white font-mono tracking-tighter">{currentBalance.toFixed(2)} €</span>
            </div>

            <div className="space-y-4">
                {/* Presets */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Aufladen</span>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => handleSelectPreset(10)}
                            className={`w-full py-3 px-4 rounded-lg border text-left transition-all ${
                                selectedPreset === 10 
                                ? 'bg-zinc-100 text-black border-zinc-100' 
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200'
                            }`}
                        >
                            <span className="text-xs font-bold uppercase tracking-wider">Starter Paket</span>
                            <span className="float-right font-mono text-xs">10.00 €</span>
                        </button>

                        <button 
                            onClick={() => handleSelectPreset(20)}
                            className={`w-full py-3 px-4 rounded-lg border text-left transition-all ${
                                selectedPreset === 20 
                                ? 'bg-zinc-100 text-black border-zinc-100' 
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200'
                            }`}
                        >
                            <span className="text-xs font-bold uppercase tracking-wider">Pro Paket</span>
                            <span className="float-right font-mono text-xs">20.00 €</span>
                        </button>
                    </div>
                </div>

                {/* Custom Input */}
                <div className="relative group pt-2">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none top-2">
                        <span className="text-zinc-500 font-mono text-xs">€</span>
                    </div>
                    <input 
                        type="text" 
                        value={customAmount}
                        onChange={handleCustomChange}
                        placeholder="Eigener Betrag"
                        className={`w-full bg-[#111] border rounded-lg pl-8 pr-4 py-3 text-xs text-white focus:outline-none transition-colors placeholder:text-zinc-700 font-mono ${
                            !selectedPreset && customAmount 
                            ? 'border-zinc-600' 
                            : 'border-zinc-800 focus:border-zinc-700'
                        }`}
                    />
                </div>
            </div>

            {/* Action */}
            <div className="space-y-3">
                <button 
                    onClick={handleConfirm}
                    disabled={!isValid}
                    className="w-full py-3.5 bg-white hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-black rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:translate-y-px"
                >
                    Zahlungspflichtig bestellen
                </button>

                <p className="text-center text-[9px] text-zinc-600">
                    Sichere Verarbeitung. Keine echte Abbuchung.
                </p>
            </div>

        </div>
      </div>
    </div>
  );
};
