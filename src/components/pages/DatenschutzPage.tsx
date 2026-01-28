import React from 'react';
import { Typo, Theme } from '@/components/ui/DesignSystem';

export const DatenschutzPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className={`${Typo.H1} text-4xl md:text-5xl font-bold mb-12 ${Theme.Colors.TextHighlight}`}>
                    Datenschutzerklärung
                </h1>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            1. Datenschutz auf einen Blick
                        </h2>
                        <h3 className={`${Typo.H3} text-xl font-semibold mb-2 ${Theme.Colors.TextHighlight}`}>
                            Allgemeine Hinweise
                        </h3>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            2. Datenerfassung auf unserer Website
                        </h2>
                        <h3 className={`${Typo.H3} text-xl font-semibold mb-2 ${Theme.Colors.TextHighlight}`}>
                            Wer ist verantwortlich für die Datenerfassung?
                        </h3>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400 mb-4`}>
                            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                        </p>

                        <h3 className={`${Typo.H3} text-xl font-semibold mb-2 ${Theme.Colors.TextHighlight}`}>
                            Wie erfassen wir Ihre Daten?
                        </h3>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst.
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            3. Hosting und Content Delivery Networks (CDN)
                        </h2>
                        <h3 className={`${Typo.H3} text-xl font-semibold mb-2 ${Theme.Colors.TextHighlight}`}>
                            Externes Hosting
                        </h3>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            4. Ihre Rechte
                        </h2>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung, Sperrung oder Löschung dieser Daten zu verlangen.
                        </p>
                    </section>

                    <section>
                        <h2 className={`${Typo.H2} text-2xl font-bold mb-4 ${Theme.Colors.TextHighlight}`}>
                            5. Kontakt
                        </h2>
                        <p className={`${Typo.Body} text-zinc-600 dark:text-zinc-400`}>
                            Bei Fragen zum Datenschutz können Sie sich jederzeit unter folgender E-Mail-Adresse an uns wenden:<br />
                            <a href="mailto:hello@expose.ae" className="text-blue-600 dark:text-blue-400 hover:underline">hello@expose.ae</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};
