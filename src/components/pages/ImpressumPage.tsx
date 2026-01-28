import React from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo } from '@/components/ui/DesignSystem';

interface ImpressumPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    t: TranslationFunction;
}

export const ImpressumPage: React.FC<ImpressumPageProps> = ({ user, userProfile, credits, onCreateBoard, t }) => {
    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={credits}
                onCreateBoard={onCreateBoard}
                t={t}
            />

            <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 sm:py-24">
                <article className="prose prose-zinc dark:prose-invert max-w-none">
                    <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Impressum</h1>

                    <h3>Angaben gemäß § 5 TMG</h3>
                    <p>
                        Expose GmbH<br />
                        Musterstraße 123<br />
                        10115 Berlin<br />
                        Deutschland
                    </p>

                    <h3>Vertreten durch</h3>
                    <p>Max Mustermann (Geschäftsführer)</p>

                    <h3>Kontakt</h3>
                    <p>
                        Telefon: +49 (0) 30 12345678<br />
                        E-Mail: kontakt@expose.ae
                    </p>

                    <h3>Registereintrag</h3>
                    <p>
                        Eintragung im Handelsregister.<br />
                        Registergericht: Amtsgericht Berlin-Charlottenburg<br />
                        Registernummer: HRB 123456
                    </p>

                    <h3>Umsatzsteuer-ID</h3>
                    <p>
                        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                        DE 123 456 789
                    </p>

                    <h3>Streitschlichtung</h3>
                    <p>
                        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr.<br />
                        Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>
                    <p>
                        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                </article>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
