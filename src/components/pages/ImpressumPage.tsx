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
    onSignIn?: () => void;
    t: TranslationFunction;
}

export const ImpressumPage: React.FC<ImpressumPageProps> = ({ user, userProfile, credits, onCreateBoard, onSignIn, t }) => {
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

            <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-12 sm:pt-44 pb-12 sm:pb-24">
                <article className="prose prose-zinc dark:prose-invert max-w-none">
                    <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Impressum</h1>

                    <h3>Angaben gemäß § 5 TMG</h3>
                    <p>
                        Michael Pzillas<br />
                        Lahnstraße 96<br />
                        60326 Frankfurt am Main<br /> Deutschland
                    </p>

                    <h3>Kontakt</h3>
                    <p>
                        E-Mail: pzillas2@gmail.com
                    </p>

                    <h3>Umsatzsteuer-ID</h3>
                    <p>
                        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                        DE366389646
                    </p>

                    <h3>Streitschlichtung</h3>
                    <p>
                        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 ml-1">
                            https://ec.europa.eu/consumers/odr
                        </a>.<br />
                        Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>
                    <p>
                        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>

                    <div className="my-16 border-t border-zinc-200 dark:border-zinc-800" />

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
                        Michael Pzillas<br />
                        Lahnstraße 96<br />
                        60326 Frankfurt am Main<br /><br />
                        E-Mail: pzillas2@gmail.com
                    </p>

                    <h4>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h4>
                    <p>
                        Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
                    </p>
                </article>
            </main>

            <GlobalFooter t={t} />
        </div>
    );
};
