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

/**
 * Was im Blatt unten stehen soll.
 *
 * Zwei Schalter, beide aus dem Menue hinter den drei Punkten erreichbar. Sie
 * liegen hier und nicht am Bild: Es ist eine Vorliebe, wie man arbeitet, kein
 * Zustand eines einzelnen Bildes — wer die Vorschlaege einmal weghaben wollte,
 * will sie beim naechsten Bild auch nicht wiedersehen.
 *
 * Standard ist jeweils "zeigen": Was man noch nie gesehen hat, kann man nicht
 * vermissen, und ein leeres Blatt erklaert sich nicht von selbst.
 */
const HIDE_SUGGESTIONS_KEY = 'expose_hide_suggestions';
const HIDE_TEMPLATES_KEY = 'expose_hide_templates';

const readFlag = (key: string): boolean => {
    try { return window.localStorage.getItem(key) === '1'; } catch (_) { return false; }
};

const writeFlag = (key: string, on: boolean): void => {
    try { window.localStorage.setItem(key, on ? '1' : '0'); } catch (_) { /* privater Modus */ }
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
};

const useFlag = (key: string): boolean => {
    const [value, setValue] = React.useState(() => readFlag(key));
    React.useEffect(() => {
        const onChange = () => setValue(readFlag(key));
        window.addEventListener(CHANGED_EVENT, onChange);
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener(CHANGED_EVENT, onChange);
            window.removeEventListener('storage', onChange);
        };
    }, [key]);
    return value;
};

export const getHideSuggestions = (): boolean => readFlag(HIDE_SUGGESTIONS_KEY);
export const setHideSuggestions = (on: boolean): void => writeFlag(HIDE_SUGGESTIONS_KEY, on);
export const useHideSuggestions = (): boolean => useFlag(HIDE_SUGGESTIONS_KEY);

export const getHideTemplates = (): boolean => readFlag(HIDE_TEMPLATES_KEY);
export const setHideTemplates = (on: boolean): void => writeFlag(HIDE_TEMPLATES_KEY, on);
export const useHideTemplates = (): boolean => useFlag(HIDE_TEMPLATES_KEY);
