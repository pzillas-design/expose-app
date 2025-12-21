
import React from 'react';
import { Theme, Button, Typo, Card } from './components/ui/DesignSystem';
import { AlertTriangle, Trash2, X, Info, AlertCircle, ShieldAlert } from 'lucide-react';

export const DialogGallery = () => {
    return (
        <div className={`min-h-screen ${Theme.Colors.CanvasBg} p-12 overflow-auto`}>
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className={Typo.Display}>Dialog Gallery</h1>
                    <p className={`${Typo.Body} text-zinc-500 mt-2`}>V8 variations of the confirmation dialog coded specifically for comparison.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24">

                    {/* Variant 1: The Minimalist (Apple-like) */}
                    <Card className="p-0 overflow-hidden shadow-xl border-zinc-200">
                        <div className="p-8 text-center flex flex-col items-center">
                            <h3 className={`${Typo.H1} mb-2`}>Bild löschen?</h3>
                            <p className={`${Typo.Body} text-zinc-400 mb-8 px-4`}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
                            <div className="flex gap-3 w-full">
                                <Button variant="secondary" className="flex-1">Abbrechen</Button>
                                <Button variant="danger" className="flex-1">Löschen</Button>
                            </div>
                        </div>
                    </Card>

                    {/* Variant 2: The "Safety First" (With Icon) */}
                    <Card className="p-0 overflow-hidden shadow-xl">
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                                <Trash2 size={20} />
                            </div>
                            <h3 className={`${Typo.H1} mb-2`}>Endgültig löschen?</h3>
                            <p className={`${Typo.Body} text-zinc-400 mb-8`}>Das Bild wird sofort von unseren Servern entfernt.</p>
                            <div className="flex gap-3 w-full">
                                <Button variant="secondary" className="flex-1">Nein</Button>
                                <Button variant="danger" className="flex-1">Ja, weg damit</Button>
                            </div>
                        </div>
                    </Card>

                    {/* Variant 3: The "Modern Bold" (Stacked Buttons) */}
                    <Card className="p-0 overflow-hidden shadow-xl">
                        <div className="p-10 flex flex-col">
                            <h3 className="text-xl font-bold tracking-tight mb-2">Sicher?</h3>
                            <p className={`${Typo.Body} text-zinc-500 mb-10`}>Du bist dabei, ein wertvolles Bild zu löschen. Willst du wirklich fortfahren?</p>
                            <div className="flex flex-col gap-2">
                                <Button variant="danger" className="w-full">Ja, Bild löschen</Button>
                                <Button variant="ghost" className="w-full text-zinc-400">Abbrechen</Button>
                            </div>
                        </div>
                    </Card>

                    {/* Variant 4: The "Subtle Border" (Technical) */}
                    <Card className="p-0 overflow-hidden shadow-xl border-t-4 border-t-red-500">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldAlert className="text-red-500" size={18} />
                                <span className={Typo.Label}>Kritische Aktion</span>
                            </div>
                            <h3 className={`${Typo.H2} mb-4`}>Möchtest du das Bild wirklich entfernen?</h3>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost">Abbrechen</Button>
                                <Button variant="danger" className="px-8">Löschen</Button>
                            </div>
                        </div>
                    </Card>

                    {/* Variant 5: The "Side Icon" (Compact) */}
                    <Card className="p-0 overflow-hidden shadow-xl">
                        <div className="p-6 flex gap-5">
                            <div className="mt-1 w-10 h-10 shrink-0 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 className={`${Typo.H2} mb-1`}>Bild entfernen</h3>
                                <p className="text-[11px] text-zinc-500 mb-6">Diese Aktion ist permanent.</p>
                                <div className="flex gap-2">
                                    <Button variant="danger" className="px-4 py-2 text-[11px]">Löschen</Button>
                                    <Button variant="secondary" className="px-4 py-2 text-[11px]">Abbrechen</Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Variant 6: Ultra Minimal (No Header) */}
                    <Card className="p-8 flex flex-col items-center justify-center shadow-xl">
                        <p className="text-zinc-600 text-sm font-medium mb-8">Bild wirklich löschen?</p>
                        <div className="flex gap-8">
                            <button className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-red-500 transition-colors">Bestätigen</button>
                            <button className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-black transition-colors">Abbrechen</button>
                        </div>
                    </Card>

                    {/* Variant 7: Floating Cards Visual */}
                    <div className="relative group">
                        <Card className="p-8 shadow-2xl relative z-10 bg-white dark:bg-zinc-900 translate-y-0 group-hover:-translate-y-1 transition-transform duration-300">
                            <div className="text-center">
                                <h3 className={Typo.H1}>Bestätigung</h3>
                                <div className="h-px w-12 bg-zinc-200 mx-auto my-4" />
                                <p className={Typo.Body}>Möchtest du das Bild endgültig aus deiner Galerie entfernen?</p>
                                <div className="mt-8 flex flex-col gap-2">
                                    <Button variant="primary" className="bg-red-600 hover:bg-red-700 border-none">Löschen</Button>
                                    <Button variant="secondary">Abbrechen</Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Variant 8: Clean List Style */}
                    <Card className="p-0 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className={Typo.H2}>Löschvorgang bestätigen</h3>
                        </div>
                        <div className="p-6">
                            <p className={Typo.Body}>Durch das Bestätigen wird das Bild mit der ID #4829 unwiderruflich gelöscht.</p>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-2">
                            <Button variant="ghost" className="text-xs">Abbrechen</Button>
                            <Button variant="danger" className="text-xs">Löschen</Button>
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
};
