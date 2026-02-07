import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

/**
 * Format relative time without "etwa" (German) or "about" (English)
 * 
 * @param date - Date to format (Date, string, or number timestamp)
 * @param lang - Language ('de' or 'en')
 * @returns Formatted string like "vor 2 Stunden" instead of "vor etwa 2 Stunden"
 */
export function formatRelativeTime(date: Date | string | number, lang: 'de' | 'en' = 'de'): string {
    const locale = lang === 'de' ? de : enUS;
    const formatted = formatDistanceToNow(new Date(date), { locale, addSuffix: true });

    // Remove "etwa" from German
    if (lang === 'de') {
        return formatted.replace(/etwa\s+/g, '');
    }

    // Remove "about" from English
    return formatted.replace(/about\s+/g, '');
}

/**
 * Calculate days until a date
 * 
 * @param date - Target date (Date, string, or number timestamp)
 * @returns Number of days until the date (negative if in the past)
 */
export function daysUntil(date: Date | string | number): number {
    const target = new Date(date);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Calculate days until board deletion (30 days after last activity)
 * 
 * @param lastActivityAt - Last activity timestamp (Date, string, or number)
 * @returns Number of days until deletion (0 if already expired)
 */
export function daysUntilBoardDeletion(lastActivityAt: Date | string | number): number {
    const lastActivity = new Date(lastActivityAt);
    const deleteAt = new Date(lastActivity.getTime() + 30 * 24 * 60 * 60 * 1000);
    const days = daysUntil(deleteAt);
    return Math.max(0, days);
}

/**
 * Check if board deletion countdown should be shown (< 7 days remaining)
 * 
 * @param lastActivityAt - Last activity timestamp (Date, string, or number)
 * @returns True if countdown should be shown
 */
export function shouldShowDeletionCountdown(lastActivityAt: Date | string | number): boolean {
    const daysLeft = daysUntilBoardDeletion(lastActivityAt);
    return daysLeft > 0 && daysLeft <= 7;
}
