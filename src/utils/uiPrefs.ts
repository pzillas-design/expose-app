import React from 'react';

/**
 * Kleine Bedienvorlieben, die nur diesen Browser betreffen.
 *
 * Bewusst in localStorage und nicht im Profil: Ob Enter ausloest, haengt an
 * Tastatur und Gewohnheit, nicht am Konto — wer am Telefon und am Rechner
 * arbeitet, will das womoeglich unterschiedlich.
 *
 * Die Vorliebe wird an zwei Stellen gelesen (Eingabefeld und Einstellungen).
 * Damit die Einstellung sofort wirkt und nicht erst beim naechsten Laden,
 * meldet das Setzen eine Aenderung an alle Zuhoerer.
 */
const ENTER_GENERATES_KEY = 'expose:ui:enter-generates-v1';
const CHANGED_EVENT = 'expose:ui-prefs-changed';

/** Standard ist an — abschalten ist die Ausnahme, nicht die Regel. */
export const getEnterGenerates = (): boolean => {
    try {
        return window.localStorage.getItem(ENTER_GENERATES_KEY) !== '0';
    } catch (_) {
        return true;
    }
};

export const setEnterGenerates = (on: boolean): void => {
    try {
        window.localStorage.setItem(ENTER_GENERATES_KEY, on ? '1' : '0');
    } catch (_) { /* privater Modus: dann gilt der Standard */ }
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
};

export const useEnterGenerates = (): boolean => {
    const [value, setValue] = React.useState(getEnterGenerates);
    React.useEffect(() => {
        const onChange = () => setValue(getEnterGenerates());
        window.addEventListener(CHANGED_EVENT, onChange);
        // Auch auf Aenderungen aus einem anderen Tab hoeren.
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener(CHANGED_EVENT, onChange);
            window.removeEventListener('storage', onChange);
        };
    }, []);
    return value;
};
