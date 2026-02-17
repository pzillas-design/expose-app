import { PromptTemplate } from "../types";

/**
 * Generates a clean URL-friendly slug from a title.
 */
export const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

/**
 * Encodes a prompt template into a sharing string.
 * Currently uses Base64 for data persistence in URL.
 */
export const encodeTemplateForSharing = (template: Partial<PromptTemplate>): string => {
    try {
        const data = {
            t: template.title,
            p: template.prompt,
            c: template.controls,
            l: template.lang
        };
        const json = JSON.stringify(data);
        return btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    } catch (e) {
        console.error("Encoding failed", e);
        return "";
    }
};

/**
 * Decodes a template sharing string back into a template object.
 */
export const decodeTemplateFromSharing = (encoded: string): Partial<PromptTemplate> | null => {
    try {
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(escape(atob(base64)));
        const data = JSON.parse(json);
        return {
            title: data.t,
            prompt: data.p,
            controls: data.c,
            lang: data.l
        };
    } catch (e) {
        console.error("Decoding failed", e);
        return null;
    }
};

/**
 * Gets the link for sharing a template.
 * Now supports slug-based URLs as the primary method.
 */
export const getTemplateShareUrl = (template: PromptTemplate): string => {
    if (template.slug) {
        return `${window.location.origin}/#${template.slug}`;
    }
    // Fallback to Base64 for unsaved or custom templates without a slug
    const encoded = encodeTemplateForSharing(template);
    return `${window.location.origin}?t=${encoded}`;
};

/**
 * WhatsApp Share Link
 */
export const getWhatsAppShareLink = (template: PromptTemplate, lang: 'de' | 'en'): string => {
    const url = getTemplateShareUrl(template);
    const text = lang === 'de'
        ? `Schau dir diese Prompt-Vorlage an: ${template.title}\n\n${url}`
        : `Check out this prompt template: ${template.title}\n\n${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

/**
 * Email Share Link
 */
export const getEmailShareLink = (template: PromptTemplate, lang: 'de' | 'en'): string => {
    const url = getTemplateShareUrl(template);
    const subject = lang === 'de'
        ? `Prompt-Vorlage geteilt: ${template.title}`
        : `Shared Prompt Template: ${template.title}`;
    const body = lang === 'de'
        ? `Hallo,\n\nich möchte diese Prompt-Vorlage mit dir teilen:\n\n${template.title}\n${url}\n\nNutze sie direkt in exposé.`
        : `Hi,\n\nI'd like to share this prompt template with you:\n\n${template.title}\n${url}\n\nYou can use it directly in exposé.`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
