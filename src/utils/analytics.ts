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
        send_to: `${AW_ID}/7576705149`,
    });
};

/** Bild erfolgreich generiert */
export const trackImageGenerated = () => {
    safeGtag('event', 'conversion', {
        send_to: `${AW_ID}/7576705152`,
        value: 1,
        currency: 'EUR',
    });
};

/** Credits gekauft */
export const trackCreditsPurchased = (value: number) => {
    safeGtag('event', 'conversion', {
        send_to: `${AW_ID}/7576705155`,
        value,
        currency: 'EUR',
    });
};
