import React from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';

export const ImpressumPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className={`${Typo.H1} text-4xl md:text-5xl font-bold mb-12 ${Theme.Colors.TextHighlight}`}>
                    Impressum
                </h1>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            Angaben gemäß § 5 TMG
                        </h2>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            [Firmenname]<br />
                            [Straße und Hausnummer]<br />
                            [PLZ und Ort]<br />
                            [Land]
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            Kontakt
                        </h2>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            E-Mail: <a href="mailto:hello@expose.ae" className="text-blue-600 dark:text-blue-400 hover:underline">hello@expose.ae</a>
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            Vertreten durch
                        </h2>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            [Name des Geschäftsführers/Inhabers]
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            Umsatzsteuer-ID
                        </h2>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:<br />
                            [USt-IdNr.]
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            Haftungsausschluss
                        </h2>
                        <h3 className={`${Typo.H3} text-xl font-semibold mb-2 ${Theme.Colors.TextHighlight}`}>
                            Haftung für Inhalte
                        </h3>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400 mb-4`}>
                            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
                        </p>

                        <h3 className={`${Typo.H3} text-xl font-semibold mb-2 ${Theme.Colors.TextHighlight}`}>
                            Haftung für Links
                        </h3>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};
