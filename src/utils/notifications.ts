/**
 * Browser Notification Utilities
 * Handles browser notifications for completed image generations
 */

const NOTIFICATION_STORAGE_KEY = 'expose_notifications_enabled';

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
    return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!isNotificationSupported()) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) {
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
    }
}

/**
 * Check if notifications are enabled in user settings
 */
export function areNotificationsEnabled(): boolean {
    if (!isNotificationSupported()) {
        return false;
    }

    const enabled = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return enabled === 'true';
}

/**
 * Set notification preference in user settings
 */
export function setNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, enabled.toString());
}

/**
 * Check if the current tab is active (visible to user)
 */
export function isTabActive(): boolean {
    return document.visibilityState === 'visible';
}

/**
 * Send a notification when image generation completes
 */
export function sendGenerationCompleteNotification(
    imageName?: string,
    prompt?: string
): void {
    // Check if notifications are enabled and supported
    if (!areNotificationsEnabled() || !isNotificationSupported()) {
        return;
    }

    // Check permission
    if (Notification.permission !== 'granted') {
        return;
    }

    // Don't send notification if tab is already active
    if (isTabActive()) {
        return;
    }

    // Create notification
    const title = '✨ Image Generated!';
    const body = prompt
        ? `Your image is ready: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`
        : 'Your image generation is complete!';

    const notification = new Notification(title, {
        body,
        icon: '/logo.svg', // Use your app logo
        badge: '/logo.svg',
        tag: 'generation-complete', // Replace previous notifications
        requireInteraction: false,
        silent: false
    });

    // Focus the tab when notification is clicked
    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
        notification.close();
    }, 5000);
}
