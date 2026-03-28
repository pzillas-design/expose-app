import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const emailUser = 'hello';
    const emailDomain = 'expose.ae';
    const emailAddress = `${emailUser}@${emailDomain}`;

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">

            <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-12 sm:pt-44 pb-12 sm:pb-24">
                <article className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-7 prose-p:mb-5 prose-h1:mb-8 prose-h3:mt-10 prose-h3:mb-4 prose-h4:mt-6 prose-h4:mb-2">
                    <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Impressum</h1>

                    <h3>Angaben gemäß § 5 DDG</h3>
                    <p>
                        Michael Pzillas<br />
                        Lahnstraße 96<br />
                        60326 Frankfurt am Main<br /> Deutschland
                    </p>

                    <h3>Kontakt</h3>
                    <p>
                        E-Mail:{' '}
                        <a href={`mailto:${emailAddress}`}>
                            <span>{emailUser}</span>
                            <span>@</span>
                            <span>{emailDomain}</span>
                        </a>
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
                        Anbieter ist die Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA. Vercel verarbeitet technische Zugriffsdaten, insbesondere IP-Adresse, Zeitstempel, Geräte- und Browserinformationen sowie Logdaten, um die Website bereitzustellen und ihre Sicherheit und Stabilität zu gewährleisten.
                    </p>

                    <h4>Vercel Analytics und Speed Insights</h4>
                    <p>
                        Wir nutzen außerdem Vercel Analytics und Vercel Speed Insights, um Reichweite, Nutzung, Ladezeiten, technische Performance und Stabilität unseres Angebots auszuwerten und zu verbessern. Dabei werden insbesondere technische Nutzungs- und Ereignisdaten verarbeitet.
                    </p>

                    <h3>3. Allgemeine Hinweise und Pflichtinformationen</h3>
                    <h4>Datenschutz</h4>
                    <p>
                        Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                    </p>

                    <h3>Hinweis zur verantwortlichen Stelle</h3>
                    <p>
                        Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br /><br />
                        Michael Pzillas<br />
                        Lahnstraße 96<br />
                        60326 Frankfurt am Main<br /><br />
                        E-Mail:{' '}
                        <a href={`mailto:${emailAddress}`}>
                            <span>{emailUser}</span>
                            <span>@</span>
                            <span>{emailDomain}</span>
                        </a>
                    </p>

                    <h3>4. Welche Daten wir verarbeiten</h3>
                    <p>
                        Wir verarbeiten insbesondere Bestandsdaten Ihres Accounts, Kontaktdaten, Login-Daten, hochgeladene Bilder, generierte Bilder, Prompts, Referenzbilder, Anmerkungen, technische Nutzungsdaten, Zahlungsinformationen sowie Support- und Kommunikationsdaten, soweit dies für den Betrieb von Exposé erforderlich ist.
                    </p>

                    <h3>5. Zwecke und Rechtsgrundlagen der Verarbeitung</h3>
                    <p>
                        Wir verarbeiten personenbezogene Daten zur Bereitstellung der Plattform, zur Durchführung des Vertrags, zur Authentifizierung, zur Bildgenerierung und -bearbeitung, zur Zahlungsabwicklung, zur Missbrauchs- und Betrugsprävention, zur technischen Sicherheit sowie zur Verbesserung und Stabilisierung unseres Angebots. Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtungen) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und wirtschaftlichen Betrieb).
                    </p>

                    <h3>6. Eingesetzte Dienstleister</h3>
                    <h4>Supabase</h4>
                    <p>
                        Für Datenbank, Authentifizierung und Dateispeicherung nutzen wir Supabase. Dabei werden insbesondere Accountdaten, Metadaten, Bildpfade, Generierungsjobs und gespeicherte Inhalte verarbeitet.
                    </p>

                    <h4>Google</h4>
                    <p>
                        Für die KI-gestützte Bildgenerierung und Bildbearbeitung nutzen wir Modelle von Google. Dabei können Prompts, hochgeladene Bilder, Referenzbilder, Anmerkungsbilder und technische Request-Metadaten an Google übermittelt werden, soweit dies zur Ausführung der gewünschten Generierung oder Bearbeitung erforderlich ist.
                    </p>

                    <h4>Stripe</h4>
                    <p>
                        Für Zahlungen und Credit-Aufladungen nutzen wir Stripe. Dabei verarbeitet Stripe insbesondere Zahlungsdaten, Transaktionsdaten, Beträge und technische Sicherheitsinformationen. Zahlungsdaten werden nicht vollständig von uns selbst gespeichert.
                    </p>

                    <h4>Google Login</h4>
                    <p>
                        Wenn Sie sich über Google anmelden, erhalten wir die für den Login erforderlichen Kontodaten, insbesondere E-Mail-Adresse sowie ggf. weitere von Ihnen freigegebene Profildaten. Die Anmeldung über Google dient ausschließlich der Authentifizierung und der komfortablen Kontoerstellung bzw. Anmeldung.
                    </p>

                    <h3>7. Speicherdauer</h3>
                    <p>
                        Hochgeladene und generierte Bilder werden grundsätzlich nach 30 Tagen automatisch gelöscht. Davon unberührt bleiben Daten, die wir aus gesetzlichen Gründen länger aufbewahren müssen, sowie abrechnungs- und sicherheitsrelevante Protokolldaten, soweit deren weitere Speicherung erforderlich ist.
                    </p>

                    <h3>8. Internationale Datenübermittlungen</h3>
                    <p>
                        Bei der Nutzung einzelner Dienstleister kann eine Verarbeitung personenbezogener Daten in Drittländern, insbesondere in den USA, nicht ausgeschlossen werden. Soweit eine solche Übermittlung erfolgt, achten wir auf geeignete Garantien nach den datenschutzrechtlichen Vorgaben, etwa Standardvertragsklauseln oder andere zulässige Transfermechanismen.
                    </p>

                    <h3>9. Ihre Rechte</h3>
                    <p>
                        Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen bestimmte Verarbeitungen. Außerdem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
                    </p>

                    <h3>10. Kontakt in Datenschutzfragen</h3>
                    <p>
                        Bei Fragen zum Datenschutz, zur Löschung Ihrer Daten oder zur Geltendmachung Ihrer Rechte können Sie uns jederzeit unter{' '}
                        <a href={`mailto:${emailAddress}`}>
                            <span>{emailUser}</span>
                            <span>@</span>
                            <span>{emailDomain}</span>
                        </a>{' '}
                        kontaktieren.
                    </p>

                    <div className="my-16 border-t border-zinc-200 dark:border-zinc-800" />

                    <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Allgemeine Geschäftsbedingungen (AGB)</h1>

                    <h3>1. Geltungsbereich</h3>
                    <p>
                        Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) gelten für die Nutzung der Plattform „Exposé“ (nachfolgend „Plattform“), betrieben von Michael Pzillas, Lahnstraße 96, 60326 Frankfurt am Main (nachfolgend „Anbieter“).
                    </p>

                    <h3>2. Vertragsgegenstand und Leistungen</h3>
                    <p>
                        Exposé ist ein KI-gestützter Workspace zur Generierung und Bearbeitung von Bildern. Der Anbieter stellt den Nutzern Werkzeuge zur Verfügung, um mittels künstlicher Intelligenz visuelle Inhalte zu erstellen. Die Nutzung bestimmter Funktionen erfordert den Erwerb von „Credits“.
                    </p>

                    <h3>3. Registrierung und Account</h3>
                    <p>
                        Für die Nutzung der Plattform ist eine Registrierung erforderlich. Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und vor dem Zugriff durch Dritte zu schützen.
                    </p>

                    <h3>4. Credits und Zahlungsbedingungen</h3>
                    <p>
                        Die Generierung von Bildern verbraucht Credits. Credits können über die Plattform erworben werden. Erworbene Credits sind an den jeweiligen Account gebunden, nicht übertragbar und nicht in bar auszahlbar. Es gelten die jeweils in der Plattform angezeigten Preise und Konditionen.
                    </p>

                    <h3>5. Verfügbarkeit und Speicherdauer von Inhalten</h3>
                    <p>
                        Exposé ist kein unbegrenzter Archivdienst. Hochgeladene und generierte Bilder können nach 30 Tagen automatisch gelöscht werden. Nutzer sind daher selbst dafür verantwortlich, wichtige Inhalte rechtzeitig zu exportieren oder herunterzuladen.
                    </p>

                    <h3>6. Nutzungsrechte an generierten Inhalten</h3>
                    <p>
                        Anbieter räumt dem Nutzer an den mit der Plattform generierten Bildern die vollumfänglichen Nutzungsrechte ein, soweit dies technisch und rechtlich durch die zugrundeliegenden KI-Modelle möglich ist. Der Nutzer ist für die Einhaltung von Urheberrechten und anderen rechtlichen Bestimmungen bei der Verwendung der Bilder selbst verantwortlich.
                    </p>

                    <h3>7. Pflichten des Nutzers</h3>
                    <p>
                        Der Nutzer verpflichtet sich, die Plattform nicht missbräuchlich zu nutzen. Insbesondere ist es untersagt, rechtswidrige, beleidigende, diskriminierende, pornografische, gewaltverherrlichende oder sonst unzulässige Inhalte zu erzeugen, hochzuladen oder bearbeiten zu lassen. Ebenso unzulässig ist die Nutzung zur Täuschung, zum Betrug, zur Umgehung von Sicherheitsmechanismen oder zur Verletzung von Rechten Dritter.
                    </p>

                    <h3>8. KI-typische Einschränkungen</h3>
                    <p>
                        KI-generierte Ergebnisse können fehlerhaft, unvollständig oder ungeeignet sein und können durch Sicherheits- oder Inhaltsrichtlinien externer Modellanbieter blockiert werden. Der Anbieter schuldet keinen bestimmten kreativen oder wirtschaftlichen Erfolg und keine jederzeitige Verfügbarkeit einzelner KI-Funktionen.
                    </p>

                    <h3>9. Haftung und Gewährleistung</h3>
                    <p>
                        Der Anbieter übernimmt keine Gewähr für die ständige Verfügbarkeit der Plattform oder die Ergebnisse der KI-Generierung. Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt, sofern keine Verletzung von Leben, Körper oder Gesundheit vorliegt.
                    </p>

                    <h3>10. Widerrufsbelehrung</h3>
                    <p>
                        Da es sich bei den Leistungen um digitale Inhalte handelt, die sofort nach dem Erwerb bzw. der Generierung zur Verfügung stehen, erlischt das Widerrufsrecht des Nutzers vorzeitig, sobald er mit der Ausführung des Vertrags (z.B. Start einer Generierung) ausdrücklich einverstanden war.
                    </p>

                    <h3>11. Schlussbestimmungen</h3>
                    <p>
                        Es gilt das Recht der Bundesrepublik Deutschland. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
                    </p>

                    <div className="my-16 border-t border-zinc-200 dark:border-zinc-800" />

                    <h4>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h4>
                    <p>
                        Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
                    </p>
                </article>
            </main>

            <GlobalFooter
                t={t}
                onGalleryClick={() => {
                    if (!user) onSignIn?.();
                    else navigate('/');
                }}
            />
        </div>
    );
};
