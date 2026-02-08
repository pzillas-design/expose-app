import React from 'react';
import { AppNavbar } from '../layout/AppNavbar';
import { GlobalFooter } from '../layout/GlobalFooter';
import { TranslationFunction } from '@/types';
import { Theme, Typo } from '@/components/ui/DesignSystem';

interface DatenschutzPageProps {
    user: any;
    userProfile: any;
    credits: number;
    onCreateBoard: () => void;
    onSignIn?: () => void;
    t: TranslationFunction;
}

export const DatenschutzPage: React.FC<DatenschutzPageProps> = ({ user, userProfile, credits, onCreateBoard, onSignIn, t }) => {
    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
            <AppNavbar
                user={user}
                userProfile={userProfile}
                credits={credits}
                onCreateBoard={onCreateBoard}
                onSignIn={onSignIn}
                t={t}
            />

            <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 sm:py-24">
                <article className="prose prose-zinc dark:prose-invert max-w-none">
                    <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Datenschutzerklärung</h1>

                    <h3>1. Datenschutz auf einen Blick</h3>
                    <h4>Allgemeine Hinweise</h4>
                    <p>
                        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                    </p>

                    <h4>Datenerfassung auf dieser Website</h4>
                    <p>
                        <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
                        Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                    </p>

                    <h3>2. Hosting und Content Delivery Networks (CDN)</h3>
                    <p>
                        Wir hosten die Inhalte unserer Website bei folgenden Anbietern:
                    </p>
                    <h4>Vercel</h4>
                    <p>
                        Anbieter ist die Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA. Wenn Sie unsere Website besuchen, erfasst Vercel verschiedene Logfiles inklusive Ihrer IP-Adressen.
                    </p>

                    <h3>3. Allgemeine Hinweise und Pflichtinformationen</h3>
                    <h4>Datenschutz</h4>
                    <p>
                        Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                    </p>

                    <h4>Hinweis zur verantwortlichen Stelle</h4>
                    <p>
                        Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br /><br />
                        Expose GmbH<br />
                        Musterstraße 123<br />
                        10115 Berlin<br /><br />
                        Telefon: +49 (0) 30 12345678<br />
                        E-Mail: kontakt@expose.ae
                    </p>

                    {/* Placeholder for more content */}
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 my-8">
                        Hier folgen weitere gesetzlich vorgeschriebene Abschnitte (Widerruf, Beschwerderecht, SSL-Verschlüsselung, etc.). Dieser Text ist ein Platzhalter.
                    </div>
                </article>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
