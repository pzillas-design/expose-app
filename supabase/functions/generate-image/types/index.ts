/**
 * Type definitions for generate-image Edge Function
 */

export interface GenerationPayload {
    newId: string;
    sourceImage: any;
    prompt: string;
    qualityMode: string;
    maskDataUrl?: string;
    modelName?: string;
    board_id?: string;
    attachments?: string[];
    aspectRatio?: string;
}

export interface GenerationConfig {
    imageConfig: {
        mimeType?: string;
        imageSize?: string;
        aspectRatio?: string;
    };
}

// Sale prices per image, ~75% margin against fal.ai costs.
// Nano Banana has no quality knob — flat per resolution.
// fal costs: NB2 $0.06/0.08/0.12/0.16 · NB Pro $0.15/0.15/0.30.
// NB Pro and GPT render 0.5K at 1K internally, so 0.5K costs us the same as 1K
// and is priced the same — otherwise it would be sold below cost. Must stay in
// sync with src/types.ts (NB2_PRICES_USD / NB_PRO_PRICES_USD / GPT_PRICES_USD).
// Verkaufspreise. Die Staffel bildet die Qualität ab, nicht nur die Kosten:
// GPT 2.5 Flare liegt in der Arena vor 2.1 (1481 zu 1428) und kostet deshalb
// mehr; Nano Banana Pro liegt darunter und darf nicht das teuerste sein.
// Alle Beträge auf 0 oder 5 Cent gerundet.
export const COSTS: Record<string, number> = {
    'fast': 0.00,
    // Sonderfall: liegt unter 2.1, der Preis darf das nicht verschweigen.
    'pro-05k': 0.50,
    'pro-1k': 0.50,
    'pro-2k': 0.50,
    'pro-4k': 1.00,
    // Abgekündigt (Google schaltet das Modell am 29.10.2026 ab), nicht mehr
    // wählbar. Werte bleiben, bis der Zweig entfällt.
    'nb2-05k': 0.15,
    'nb2-1k': 0.18,
    'nb2-2k': 0.50,
    'nb2-4k': 0.65,
    // Standard. 2K unverändert — die meistgenutzte Stufe, Kunden zahlen sie
    // seit Monaten. 1K von 0,18 auf 0,24: Der Sprung auf 0,50 war bei nur
    // 50 % Mehrkosten nicht erklärbar.
    'nb21-05k': 0.24,
    'nb21-1k': 0.24,
    'nb21-2k': 0.50,
    'nb21-4k': 0.65,
    // Sparstufe. 0,18 statt 0,12 — genug Abstand nach unten, ohne die
    // Standardstufe zu untergraben.
    'sd-05k': 0.18,
    'sd-1k': 0.18,
    'sd-2k': 0.18,
};

// EINKAUFSPREISE (was fal/OpenAI uns je Bild berechnet) — Gegenstück zu COSTS.
// Wird bei jedem Job in generation_jobs.api_cost geschrieben, damit die echte
// Marge messbar ist statt nur der Verkaufspreis.
//
// Quelle: die oben dokumentierten fal-Preise. Bei Tarifänderungen von fal MUSS
// diese Matrix nachgezogen werden — sonst rechnet die Auswertung still falsch.
// Stand: 09/2026.
export const API_COSTS: Record<string, number> = {
    'fast': 0.00,
    // NB Pro rendert 0.5K intern als 1K — gleicher Einkaufspreis.
    'pro-05k': 0.15,
    'pro-1k': 0.15,
    'pro-2k': 0.15,
    'pro-4k': 0.30,
    'nb2-05k': 0.06,
    'nb2-1k': 0.08,
    'nb2-2k': 0.12,
    'nb2-4k': 0.16,
    // 2.1 kostet laut Gemini-Preisliste etwa die Hälfte von NB2.
    // 0.5K entfällt und wird auf 1K gehoben.
    'nb21-05k': 0.0336,
    'nb21-1k': 0.0336,
    'nb21-2k': 0.0504,
    'nb21-4k': 0.0756,
    // fal: 0,027 \$ je Bild, gleich für 1K, 1.5K und 2K.
    'sd-05k': 0.027,
    'sd-1k': 0.027,
    'sd-2k': 0.027,
};

// GPT Image 2: nur die high-Werte sind von fal dokumentiert. low/medium sind
// aus der Zielmarge (75 %) abgeleitet und daher SCHÄTZUNGEN — bei der nächsten
// fal-Rechnung gegenprüfen und ersetzen.
// GPT Image 2.5 Flare, Preise von fals Modellseite (Stand 10.09.2026), je
// 1024x1024: low 0,00588 / medium 0,01317 / high 0,05268 / max 0,21072.
// Wir fahren 'high' als einzige Stufe. Die 2K- und 4K-Werte sind aus dem
// 1K-Preis hochgerechnet — fal listet nur 1024er und 3840x2160 vollständig.
export const GPT_API_COSTS: Record<string, Record<string, number>> = {
    'nb2-05k': { low: 0.0059, medium: 0.0132, high: 0.0527 },
    'nb2-1k':  { low: 0.0059, medium: 0.0132, high: 0.0527 },
    'nb2-2k':  { low: 0.0080, medium: 0.0220, high: 0.0900 },
    'nb2-4k':  { low: 0.0111, medium: 0.0380, high: 0.1600 },
};

// GPT Image 2 is the only model where quality affects price
// (fal bills low/medium/high differently: e.g. high $0.21 at 1K, $0.40 at 4K).
// Premiumstufe: bestes Modell im Angebot, daher über 2.1. Wir fahren nur
// 'high', die anderen Spalten sind gleichgesetzt statt tote Werte zu halten.
export const GPT_COSTS: Record<string, Record<string, number>> = {
    'nb2-05k': { low: 0.30, medium: 0.30, high: 0.30 },
    'nb2-1k': { low: 0.30, medium: 0.30, high: 0.30 },
    'nb2-2k': { low: 0.65, medium: 0.65, high: 0.65 },
    'nb2-4k': { low: 0.85, medium: 0.85, high: 0.85 },
};
