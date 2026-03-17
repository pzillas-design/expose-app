/**
 * creditToastGuard — prevents the "credits added" success toast from firing
 * when credits increase due to an internal refund rather than a real Stripe top-up.
 *
 * Usage:
 *   suppressCreditToast(3000)   // before updating profiles.credits for a refund
 *   isCreditToastSuppressed()   // checked in useAuth before showing the toast
 */

let _suppressUntil = 0;

export function suppressCreditToast(ms = 3000): void {
    _suppressUntil = Date.now() + ms;
}

export function isCreditToastSuppressed(): boolean {
    return Date.now() < _suppressUntil;
}
