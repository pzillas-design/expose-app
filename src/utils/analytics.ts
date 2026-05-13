// Google Ads Conversion Tracking
// Tag: AW-627992730

declare function gtag(...args: any[]): void;

const AW_ID = 'AW-627992730';

const safeGtag = (...args: any[]) => {
    if (typeof gtag === 'function') {
        gtag(...args);
    }
};

/** Registrierung abgeschlossen */
export const trackSignup = () => {
    safeGtag('event', 'conversion', {
        send_to: `${AW_ID}/ljknCP2w7ZwcEJrRuasC`,
    });
};

/** Bild erfolgreich generiert */
export const trackImageGenerated = () => {
    safeGtag('event', 'conversion', {
        send_to: `${AW_ID}/hSS0CICx7ZwcEJrRuasC`,
        value: 0.2,
        currency: 'EUR',
    });
};

/** Credits gekauft */
export const trackCreditsPurchased = (value: number) => {
    safeGtag('event', 'conversion', {
        send_to: `${AW_ID}/p1RRCIOx7ZwcEJrRuasC`,
        value,
        currency: 'EUR',
    });
};
